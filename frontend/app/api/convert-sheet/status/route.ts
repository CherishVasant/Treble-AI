import { NextRequest, NextResponse } from 'next/server';

// 5-minute ceiling so Vercel never kills this function before we can
// return a useful response.  Individual fetch calls are capped at
// RENDER_TIMEOUT_MS so we don't hang for the full duration.
export const maxDuration = 300;

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000';

// How long we wait for Render before returning a retryable 503.
// Render's free-tier cold-start takes 15-30 s; 25 s lets a single poll
// absorb a cold-start without burning the whole maxDuration budget.
const RENDER_TIMEOUT_MS = 25_000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);

  try {
    const cookie = request.headers.get('cookie') || '';
    const res = await fetch(
      `${BACKEND_URL}/result/${encodeURIComponent(jobId)}/status`,
      {
        method: 'GET',
        headers: cookie ? { Cookie: cookie } : {},
        cache: 'no-store',
        signal: controller.signal,
      }
    );
    clearTimeout(timer);

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const rawText = await res.text();
      let body: unknown;
      try {
        body = JSON.parse(rawText);
      } catch {
        body = { error: 'Backend returned invalid JSON', details: rawText.slice(0, 200) };
      }
      return NextResponse.json(body, { status: res.status });
    }

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { 'Content-Type': contentType || 'text/plain' },
    });
  } catch (err: any) {
    clearTimeout(timer);

    if (err.name === 'AbortError') {
      // Render is still waking up — return a retryable 503 so the frontend
      // increments its error counter and polls again rather than seeing a 504.
      return NextResponse.json(
        { error: 'Backend is warming up, retrying…', retryable: true },
        { status: 503 }
      );
    }

    // Network-level failure (DNS, connection refused, etc.)
    return NextResponse.json(
      { error: 'Failed to reach backend', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 502 }
    );
  }
}
