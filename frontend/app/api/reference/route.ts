import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000';

export async function GET() {
  try {
    const upstream = await fetch(`${BACKEND_URL}/reference/library`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'Reference backend error', details: text },
        { status: upstream.status >= 400 ? upstream.status : 502 }
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[reference] proxy error:', error);
    return NextResponse.json(
      {
        error: 'Failed to reach reference backend',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
