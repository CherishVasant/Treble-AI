import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params;
    if (!jobId || jobId.includes('..') || jobId.includes('/') || jobId.includes('\\')) {
      return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
    }

    const upstream = await fetch(`${BACKEND_URL}/result/${encodeURIComponent(jobId)}/musicxml`);
    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json(
        { error: 'MusicXML not found', details: text },
        { status: upstream.status }
      );
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.recordare.musicxml+xml',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[musicxml] proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch MusicXML' }, { status: 502 });
  }
}
