import { NextRequest, NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';
import { proxyToBackend } from '@/lib/backend-proxy';

// Reference scale/chord/arpeggio audio is synthesized once from the backend
// and then permanently cached in Vercel Blob so subsequent requests return
// instantly from the CDN edge rather than re-running FluidSynth.

function blobKey(notes: string): string {
  // Normalise: trim, lowercase, canonical separator
  const normalised = notes.trim().toLowerCase().replace(/\s+/g, '');
  return `reference-audio/${normalised}.wav`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const notes = searchParams.get('notes');

  if (!notes) {
    return NextResponse.json(
      { error: 'Missing notes query parameter' },
      { status: 400 }
    );
  }

  const key = blobKey(notes);

  // 1. Check Vercel Blob first — instant CDN response if already cached
  try {
    const existing = await head(key);
    if (existing?.url) {
      // Redirect to Blob CDN URL — browser caches for 1 week (Blob default)
      return NextResponse.redirect(existing.url, { status: 302 });
    }
  } catch {
    // Not found in Blob — fall through to generate
  }

  // 2. Generate via backend (FluidSynth + bundled SF2)
  const backendResponse = await proxyToBackend(
    request,
    `/reference/scale-audio?notes=${encodeURIComponent(notes)}`
  );

  if (!backendResponse.ok) {
    return backendResponse; // Surface backend error as-is
  }

  // 3. Read audio bytes
  const audioBytes = await backendResponse.arrayBuffer();

  // 4. Upload to Vercel Blob for future requests (fire-and-forget on failure)
  try {
    await put(key, audioBytes, {
      access: 'public',
      contentType: 'audio/wav',
      addRandomSuffix: false,    // deterministic path so head() finds it next time
      cacheControlMaxAge: 604800, // 1 week browser cache
    });
  } catch (blobErr) {
    console.warn('[reference/audio] Blob upload failed (non-fatal):', blobErr);
    // Continue — still return the audio bytes to the caller even if caching fails
  }

  // 5. Stream audio back to the caller for this first request
  return new NextResponse(audioBytes, {
    status: 200,
    headers: {
      'Content-Type': 'audio/wav',
      'Cache-Control': 'public, max-age=604800',
    },
  });
}
