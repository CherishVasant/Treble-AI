import { NextRequest, NextResponse } from 'next/server';

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
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'heic', 'avif', 'svg'].includes(ext)
  ) {
    return 'image';
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, blobUrl, meta } = body as {
      fileId?: string;
      blobUrl?: string;
      meta?: FileMeta;
    };

    if (!fileId || typeof fileId !== 'string') {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    // Meta was sent directly from the upload response — no disk read needed
    if (!meta) {
      return NextResponse.json({ error: 'File metadata missing. Please re-upload.' }, { status: 400 });
    }

    const kind = previewKindFromMeta(meta);
    if (!kind) {
      return NextResponse.json(
        { error: 'This file type is not supported for the practice viewer.' },
        { status: 400 }
      );
    }

    const baseTitle = (meta.originalName || 'Score').replace(/\.[^.]+$/, '');

    // Use the Vercel Blob URL as the preview URL so it loads directly from CDN
    const previewUrl = blobUrl || `/api/upload/${fileId}`;

    return NextResponse.json({
      fileId,
      blobUrl,
      metadata: {
        title: baseTitle,
        composer: 'Unknown',
        timeSignature: undefined as string | undefined,
        tempo: undefined as number | undefined,
      },
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
