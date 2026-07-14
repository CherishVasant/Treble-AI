import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  const { route } = await context.params;
  const path = `/chats/${route.join('/')}`;
  return proxyToBackend(request, path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  const { route } = await context.params;
  const path = `/chats/${route.join('/')}`;
  return proxyToBackend(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  const { route } = await context.params;
  const path = `/chats/${route.join('/')}`;
  return proxyToBackend(request, path);
}
