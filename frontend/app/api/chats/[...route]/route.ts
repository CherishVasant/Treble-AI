import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Render's free tier sleeps after 15 min idle and can take 15-30 s to wake.
// Without this, Vercel's 10-s default cuts the session-list fetch before
// Render finishes booting, leaving practiceSessions empty and breaking
// sidebar navigation and chat switching.
export const maxDuration = 60;

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
