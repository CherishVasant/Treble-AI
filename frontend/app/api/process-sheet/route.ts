import { readFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const STORE = path.join(process.cwd(), '.upload-store');

type FileMeta = {
  originalName: string;
  mimeType: string;
  ext: string;
  size?: number;
};

function previewKindFromMeta(meta: FileMeta): 'pdf' | 'image' | null {
  const ext = (meta.ext || '').toLowerCase();
  if (ext === 'pdf' || meta.mimeType === 'application/pdf') return 'pdf';
  if (meta.mimeType.startsWith('image/')) return 'image';
  if (
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'heic', 'avif', 'svg'].includes(
      ext
    )
  ) {
    return 'image';
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { fileId } = await request.json();

    if (!fileId || typeof fileId !== 'string') {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    const metaPath = path.join(STORE, `${fileId}.meta.json`);
    let metaRaw: string;
    try {
      metaRaw = await readFile(metaPath, 'utf-8');
    } catch {
      return NextResponse.json({ error: 'Upload not found or expired' }, { status: 404 });
    }

    const meta = JSON.parse(metaRaw) as FileMeta;
    const kind = previewKindFromMeta(meta);

    if (!kind) {
      return NextResponse.json(
        { error: 'This file type is not supported for the practice viewer.' },
        { status: 400 }
      );
    }

    const baseTitle = (meta.originalName || 'Score').replace(/\.[^.]+$/, '');

    const metadata = {
      title: baseTitle,
      composer: 'Unknown',
      timeSignature: undefined as string | undefined,
      tempo: undefined as number | undefined,
    };

    const previewUrl = `/api/upload/${fileId}`;

    return NextResponse.json({
      fileId,
      metadata,
      previewKind: kind,
      previewUrl,
      audioUrl: null,
      message: 'File ready for viewing',
    });
  } catch (error) {
    console.error('[process-sheet] error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process upload',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
