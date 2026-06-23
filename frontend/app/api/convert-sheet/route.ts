import { readFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const STORE = path.join(process.cwd(), '.upload-store');
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000';

type FileMeta = {
  originalName: string;
  mimeType: string;
  ext: string;
};

export async function POST(request: NextRequest) {
  try {
    const { fileId } = await request.json();

    if (!fileId || typeof fileId !== 'string') {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    const metaPath = path.join(STORE, `${fileId}.meta.json`);
    const binPath = path.join(STORE, `${fileId}.bin`);

    let metaRaw: string;
    try {
      metaRaw = await readFile(metaPath, 'utf-8');
    } catch {
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

    const upstream = await fetch(`${BACKEND_URL}/process`, {
      method: 'POST',
      body: formData,
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      let detail = text.trim() || `Backend returned ${upstream.status}`;
      try {
        const j = JSON.parse(text) as { detail?: unknown; error?: unknown; details?: unknown };
        if (typeof j.detail === 'string') detail = j.detail;
        else if (typeof j.details === 'string') detail = j.details;
        else if (typeof j.error === 'string') detail = j.error;
      } catch {
        if (detail === 'Internal Server Error') {
          detail =
            'The conversion backend crashed. Ensure the backend is running and dependencies are installed (pip install -r backend/requirements.txt).';
        }
      }
      return NextResponse.json(
        { error: 'Conversion failed', details: detail },
        { status: upstream.status >= 400 ? upstream.status : 502 }
      );
    }

    const data = JSON.parse(text) as { job_id: string };

    return NextResponse.json({
      jobId: data.job_id,
      status: 'processing',
      message: 'Conversion started in background',
    });
  } catch (error) {
    console.error('[convert-sheet] error:', error);
    return NextResponse.json(
      {
        error: 'Failed to convert sheet music',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
