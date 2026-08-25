import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

const IMAGE_EXT = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'heic', 'avif', 'svg',
]);

function extFromName(filename: string): string {
  const m = filename.match(/\.([^.]+)$/);
  return m ? m[1].toLowerCase() : '';
}

function isVisualScoreAllowed(file: File): boolean {
  const ext = extFromName(file.name);
  if (ext === 'pdf') return true;
  if (file.type === 'application/pdf') return true;
  if (file.type.startsWith('image/')) return true;
  if (IMAGE_EXT.has(ext)) return true;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!isVisualScoreAllowed(file)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use PDF or an image (JPEG, PNG, WebP, GIF, TIFF, HEIC, SVG, etc.).' },
        { status: 400 }
      );
    }

    const fileId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const ext = extFromName(file.name);
    const mimeType =
      file.type && file.type.length > 0
        ? file.type
        : ext === 'pdf'
          ? 'application/pdf'
          : 'application/octet-stream';

    // Upload to Vercel Blob — survives across serverless invocations
    const blob = await put(`uploads/${fileId}.${ext || 'bin'}`, file, {
      access: 'public',
      contentType: mimeType,
    });

    const meta = {
      originalName: file.name,
      mimeType,
      ext,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      fileId,
      blobUrl: blob.url,
      meta,
      message: 'File uploaded successfully',
      file: {
        id: fileId,
        name: file.name,
        size: file.size,
        type: mimeType,
        uploadedAt: meta.uploadedAt,
      },
    });
  } catch (error) {
    console.error('[upload] error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
