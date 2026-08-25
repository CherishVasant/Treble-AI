import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function POST(request: NextRequest) {
  try {
    const { fileId, blobUrl } = await request.json();

    if (!fileId || typeof fileId !== 'string') {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    if (!blobUrl || typeof blobUrl !== 'string') {
      return NextResponse.json({ error: 'blobUrl is required' }, { status: 400 });
    }

    // Fetch the file from Vercel Blob (works across serverless invocations)
    const fileResponse = await fetch(blobUrl);
    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: 'Could not retrieve uploaded file. Please re-upload.' },
        { status: 404 }
      );
    }

    // Derive the original filename from the blob URL path
    const blobPathname = new URL(blobUrl).pathname;
    const blobFilename = blobPathname.split('/').pop() || 'upload.bin';
    const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';

    const fileBuffer = await fileResponse.arrayBuffer();

    const formData = new FormData();
    formData.append(
      'file',
      new Blob([fileBuffer], { type: contentType }),
      blobFilename
    );

    return proxyToBackend(request, '/process', {
      method: 'POST',
      body: formData,
      isMultipart: true,
    });
  } catch (error) {
    console.error('[convert-sheet] proxy error:', error);
    return NextResponse.json(
      {
        error: 'Failed to convert sheet music',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
