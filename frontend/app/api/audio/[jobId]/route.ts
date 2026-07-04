import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params;
    if (!jobId || jobId.includes('..') || jobId.includes('/') || jobId.includes('\\')) {
      return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
    }

    const clientHeaders = new Headers();
    const range = request.headers.get('range');
    if (range) {
      clientHeaders.set('Range', range);
    }

    const upstream = await fetch(`${BACKEND_URL}/result/${encodeURIComponent(jobId)}/audio`, {
      headers: clientHeaders,
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json(
        { error: 'Audio not found', details: text },
        { status: upstream.status }
      );
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', upstream.headers.get('content-type') || 'audio/wav');
    responseHeaders.set('Cache-Control', 'private, max-age=3600');
    
    if (upstream.headers.has('accept-ranges')) {
      responseHeaders.set('Accept-Ranges', upstream.headers.get('accept-ranges')!);
    }
    if (upstream.headers.has('content-range')) {
      responseHeaders.set('Content-Range', upstream.headers.get('content-range')!);
    }
    if (upstream.headers.has('content-length')) {
      responseHeaders.set('Content-Length', upstream.headers.get('content-length')!);
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    return new NextResponse(buf, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[audio] proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch audio' }, { status: 502 });
  }
}
