import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Render's free tier can take 15-30 s to wake from idle.
// Give the proxy enough headroom so Vercel doesn't kill it first.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }

  return proxyToBackend(request, `/result/${encodeURIComponent(jobId)}/status`);
}
