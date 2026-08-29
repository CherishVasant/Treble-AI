import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Audio is synthesised by the Render backend from the bundled GeneralUser-GS SF2.
// The backend checks Vercel Blob first (permanent CDN cache) — instant redirect if
// the file was already seeded — and only runs FluidSynth on the first-ever request
// for a given note combination.  After synthesis the file is uploaded to Blob so
// all future requests skip synthesis entirely.
//
// To pre-seed all 58 scale WAVs at once, call:
//   POST /reference/seed-blob     (requires BLOB_READ_WRITE_TOKEN on Render)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const notes = searchParams.get('notes');

  if (!notes) {
    const { NextResponse } = await import('next/server');
    return NextResponse.json(
      { error: 'Missing notes query parameter' },
      { status: 400 }
    );
  }

  return proxyToBackend(request, `/reference/scale-audio?notes=${encodeURIComponent(notes)}`);
}
