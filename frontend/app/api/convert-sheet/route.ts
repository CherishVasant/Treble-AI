import { readFile } from 'fs/promises';
import path from 'path';
import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

const STORE = path.join(process.cwd(), '.upload-store');

type FileMeta = {
  originalName: string;
  mimeType: string;
  ext: string;
};

export async function POST(request: NextRequest) {
  try {
    const { fileId } = await request.json();

    if (!fileId || typeof fileId !== 'string') {
      const { NextResponse } = await import('next/server');
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    const metaPath = path.join(STORE, `${fileId}.meta.json`);
    const binPath = path.join(STORE, `${fileId}.bin`);

    let metaRaw: string;
    try {
      metaRaw = await readFile(metaPath, 'utf-8');
    } catch {
      const { NextResponse } = await import('next/server');
      return NextResponse.json({ error: 'Upload not found or expired' }, { status: 404 });
    }

    const meta = JSON.parse(metaRaw) as FileMeta;
    const buf = await readFile(binPath);

    const formData = new FormData();
    formData.append(
      'file',
      new Blob([buf], { type: meta.mimeType || 'application/octet-stream' }),
      meta.originalName || 'upload.bin'
    );

    return proxyToBackend(request, '/process', {
      method: 'POST',
      body: formData,
      isMultipart: true
    });
  } catch (error) {
    console.error('[convert-sheet] proxy error:', error);
    const { NextResponse } = await import('next/server');
    return NextResponse.json(
      {
        error: 'Failed to convert sheet music',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
