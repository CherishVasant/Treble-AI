import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params;
  if (!jobId || jobId.includes('..') || jobId.includes('/') || jobId.includes('\\')) {
    return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
  }

  return proxyToBackend(request, `/result/${encodeURIComponent(jobId)}/musicxml`);
}
