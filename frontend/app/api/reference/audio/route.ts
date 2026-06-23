import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const notes = searchParams.get('notes');

  if (!notes) {
    return NextResponse.json(
      { error: 'Missing notes query parameter' },
      { status: 400 }
    );
  }

  try {
    const upstreamUrl = `${BACKEND_URL}/reference/scale-audio?notes=${encodeURIComponent(notes)}`;
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json(
        { error: 'Upstream scale synthesis error', details: text },
        { status: upstream.status >= 400 ? upstream.status : 502 }
      );
    }

    const audioBuffer = await upstream.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': 'inline; filename="scale.wav"',
      },
    });
  } catch (error) {
    console.error('[reference-audio] proxy error:', error);
    return NextResponse.json(
      {
        error: 'Failed to reach scale synthesis backend',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
