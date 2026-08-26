import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function POST(request: NextRequest) {
  try {
    const { fileId, blobUrl, originalName, clientSessionId } = await request.json();

    if (!fileId || typeof fileId !== 'string') {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    if (!blobUrl || typeof blobUrl !== 'string') {
      return NextResponse.json(
        { error: 'Original file no longer available. Please re-upload the sheet music to convert.' },
        { status: 400 }
      );
    }

    // Fetch the file from Vercel Blob (works across serverless invocations)
    const fileResponse = await fetch(blobUrl);
    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: 'Could not retrieve uploaded file. Please re-upload.' },
        { status: 404 }
      );
    }

    // Derive filename: prefer the user's original name, fall back to blob URL basename.
    const blobPathname = new URL(blobUrl).pathname;
    const blobFilename = blobPathname.split('/').pop() || 'upload.bin';
    const filename = (originalName && typeof originalName === 'string') ? originalName : blobFilename;
    const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';

    const fileBuffer = await fileResponse.arrayBuffer();

    const formData = new FormData();
    formData.append(
      'file',
      new Blob([fileBuffer], { type: contentType }),
      filename
    );
    // Pass the blob URL and original filename as extra form fields so the backend
    // can store them — enables re-conversion after a server restart.
    formData.append('blob_url', blobUrl);
    if (originalName) {
      formData.append('original_name', originalName);
    }
    // Forward the client-generated session UUID so the backend session ID is
    // known before the response arrives — avoids frontend session-ID migration.
    if (clientSessionId) {
      formData.append('client_session_id', clientSessionId);
    }

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
