import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const subpath = path.join('/');
  return proxyToBackend(request, `/auth/${subpath}`, { method: 'POST' });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const subpath = path.join('/');
  return proxyToBackend(request, `/auth/${subpath}`, { method: 'GET' });
}
