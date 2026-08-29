import { NextRequest, NextResponse } from 'next/server';

// Piano note samples are synthesized on-demand from the bundled GeneralUser-GS SF2
// by the Render backend, then cached on disk for subsequent requests.
// This proxy forwards the request so the browser never needs the backend URL directly.

export const maxDuration = 30; // FluidSynth note synthesis can take a few seconds

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000';

export async function GET(
  _request: NextRequest,
  { params }: { params: { midi: string } }
) {
  const midi = parseInt(params.midi, 10);
  if (isNaN(midi) || midi < 21 || midi > 108) {
    return NextResponse.json({ error: 'Invalid MIDI number (21–108)' }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/piano-note/${midi}`, {
      cache: 'force-cache', // Vercel edge cache; backend also caches on disk
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Note not available' },
        { status: res.status }
      );
    }

    const audioBuffer = await res.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'public, max-age=604800, immutable', // 1 week
      },
    });
  } catch (err) {
    console.error('[piano-note] proxy error:', err);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
