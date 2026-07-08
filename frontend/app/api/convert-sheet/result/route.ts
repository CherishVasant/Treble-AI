import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { proxyToBackend } from '@/lib/backend-proxy';

const STORE = path.join(process.cwd(), '.upload-store');

type FileMeta = {
  originalName: string;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const fileId = searchParams.get('fileId');

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    let baseTitle = 'Score';
    if (fileId) {
      try {
        const metaPath = path.join(STORE, `${fileId}.meta.json`);
        const metaRaw = await readFile(metaPath, 'utf-8');
        const meta = JSON.parse(metaRaw) as FileMeta;
        baseTitle = (meta.originalName || 'Score').replace(/\.[^.]+$/, '');
      } catch (err) {
        console.warn('[convert-sheet/result] Could not read file metadata:', err);
      }
    }

    const infoResponse = await proxyToBackend(request, `/result/${jobId}/musical-info`, {
      method: 'GET'
    });

    let musicalInfo = null;
    if (infoResponse.ok) {
      musicalInfo = await infoResponse.json();
    }

    return NextResponse.json({
      jobId,
      audioUrl: `/api/audio/${jobId}`,
      musicXmlUrl: `/api/musicxml/${jobId}`,
      musicalInfo,
      metadata: {
        title: musicalInfo?.title || baseTitle,
        composer: musicalInfo?.composer || 'Unknown',
        timeSignature: musicalInfo?.time_signature || undefined,
        tempo: musicalInfo?.tempo || undefined,
      },
      message: 'Conversion complete',
    }, {
      headers: {
        'Set-Cookie': infoResponse.headers.get('Set-Cookie') || ''
      }
    });
  } catch (error) {
    console.error('[convert-sheet/result] error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve conversion results',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
