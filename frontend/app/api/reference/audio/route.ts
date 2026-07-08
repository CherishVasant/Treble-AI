import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const notes = searchParams.get('notes');

  if (!notes) {
    return NextResponse.json(
      { error: 'Missing notes query parameter' },
      { status: 400 }
    );
  }

  return proxyToBackend(request, `/reference/scale-audio?notes=${encodeURIComponent(notes)}`);
}
