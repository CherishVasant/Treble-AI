import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// One-time seeding route: uploads all pre-generated scale WAVs from
// backend/output/scales/ to Vercel Blob so they're served from the CDN.
// Requires BLOB_READ_WRITE_TOKEN to be set on Render.
//
// Call once after deploying:
//   POST https://<your-vercel-app>.vercel.app/api/reference/seed-blob

export const maxDuration = 300; // may take a few minutes for 58 files

export async function POST(request: NextRequest) {
  return proxyToBackend(request, '/reference/seed-blob');
}
