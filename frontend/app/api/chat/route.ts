import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context, systemPrompt, history } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const upstream = await fetch(`${BACKEND_URL}/theory/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        context: context ?? '',
        system_prompt: systemPrompt ?? '',
        history: (history ?? []).map((msg: { role: string; content: string }) => ({
          role: msg.role,
          content: msg.content,
        })),
      }),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      let detail = text;
      try {
        const j = JSON.parse(text);
        detail = typeof j.detail === 'string' ? j.detail : text;
      } catch {
        /* keep raw */
      }
      return NextResponse.json(
        { error: 'Chat backend error', details: detail },
        { status: upstream.status >= 400 ? upstream.status : 502 }
      );
    }

    const data = JSON.parse(text) as {
      response: string;
      success?: boolean;
      suggested_follow_up_questions?: string[];
      related_concepts?: string[];
      citations?: string[];
    };
    return NextResponse.json({
      response: data.response,
      success: data.success ?? true,
      suggested_follow_up_questions: data.suggested_follow_up_questions ?? [],
      related_concepts: data.related_concepts ?? [],
      citations: data.citations ?? [],
    });
  } catch (error) {
    console.error('[chat] proxy error:', error);
    return NextResponse.json(
      {
        error: 'Failed to reach chat backend',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
