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

async function doFetch(url: string, cookie: string, signal: AbortSignal) {
  return fetch(url, {
    method: 'GET',
    headers: cookie ? { Cookie: cookie } : {},
    cache: 'no-store',
    signal,
  });
}

async function parseResponse(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const raw = await res.text();
    try {
      return { body: JSON.parse(raw), json: true };
    } catch {
      return { body: { error: 'Backend returned invalid JSON', details: raw.slice(0, 200) }, json: true };
    }
  }
  return { body: await res.text(), json: false };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);

  const statusUrl = `${BACKEND_URL}/result/${encodeURIComponent(jobId)}/status`;
  const refreshUrl = `${BACKEND_URL}/auth/refresh`;
  let cookie = request.headers.get('cookie') || '';
  let refreshSetCookies: string[] = [];

  try {
    let res = await doFetch(statusUrl, cookie, controller.signal);

    // If auth is required and the token has expired, try to refresh once.
    // (The /result/{id}/status endpoint is now auth-free on the backend, but
    //  this fallback protects against any future regression or middleware change.)
    if (res.status === 401) {
      try {
        const refreshRes = await fetch(refreshUrl, {
          method: 'POST',
          headers: cookie ? { Cookie: cookie } : {},
          cache: 'no-store',
        });
        if (refreshRes.ok) {
          refreshSetCookies = refreshRes.headers.getSetCookie();
          // Merge new tokens into the cookie string for the retry.
          const newPairs = refreshSetCookies.map(c => c.split(';')[0]).join('; ');
          cookie = [cookie, newPairs].filter(Boolean).join('; ');
          res = await doFetch(statusUrl, cookie, controller.signal);
        }
      } catch {
        // Refresh failed — pass the 401 through so the caller knows.
      }
    }

    clearTimeout(timer);

    const { body, json } = await parseResponse(res);
    const nextRes = json
      ? NextResponse.json(body, { status: res.status })
      : new NextResponse(body as string, {
          status: res.status,
          headers: { 'Content-Type': res.headers.get('content-type') || 'text/plain' },
        });

    if (refreshSetCookies.length > 0) {
      refreshSetCookies.forEach(c => nextRes.headers.append('Set-Cookie', c));
    }

    return nextRes;
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

    return NextResponse.json(
      { error: 'Failed to reach backend', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 502 }
    );
  }
}
