import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// LLM calls can take well over 10s — extend Vercel's default timeout.
// Hobby plan supports up to 60s; Pro supports up to 300s.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  return proxyToBackend(request, '/theory/chat');
}
