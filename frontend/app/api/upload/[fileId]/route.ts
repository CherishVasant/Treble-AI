import { readFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

const STORE = path.join(process.cwd(), '.upload-store');

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params;
  if (!fileId || fileId.includes('..') || fileId.includes('/') || fileId.includes('\\')) {
    return NextResponse.json({ error: 'Invalid file id' }, { status: 400 });
  }

  const metaPath = path.join(STORE, `${fileId}.meta.json`);
  const binPath = path.join(STORE, `${fileId}.bin`);

  try {
    // Try local temporary upload store first (e.g. during immediate upload preview)
    const metaRaw = await readFile(metaPath, 'utf-8');
    const meta = JSON.parse(metaRaw) as { mimeType?: string; originalName?: string };
    const buf = await readFile(binPath);
    const contentType = meta.mimeType && meta.mimeType.length > 0 ? meta.mimeType : 'application/octet-stream';

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(meta.originalName ?? 'file')}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    // Fallback: proxy to Python backend to retrieve the persisted original score file
    return proxyToBackend(request, `/result/${encodeURIComponent(fileId)}/original`);
  }
}
