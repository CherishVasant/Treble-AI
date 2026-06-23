import { readFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const STORE = path.join(process.cwd(), '.upload-store');

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await context.params;
    if (!fileId || fileId.includes('..') || fileId.includes('/') || fileId.includes('\\')) {
      return NextResponse.json({ error: 'Invalid file id' }, { status: 400 });
    }

    const metaPath = path.join(STORE, `${fileId}.meta.json`);
    const binPath = path.join(STORE, `${fileId}.bin`);

    const metaRaw = await readFile(metaPath, 'utf-8');
    const meta = JSON.parse(metaRaw) as { mimeType?: string; originalName?: string };

    const buf = await readFile(binPath);

    const contentType =
      meta.mimeType && meta.mimeType.length > 0 ? meta.mimeType : 'application/octet-stream';

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(meta.originalName ?? 'file')}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
