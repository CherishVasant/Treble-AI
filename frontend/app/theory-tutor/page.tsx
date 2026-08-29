'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Message } from '@/components/ai-chat';

const AIChat = dynamic(() => import('@/components/ai-chat'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 rounded-xl border border-border/30 bg-card/20 animate-pulse min-h-[400px]" />
  ),
});

import { useChat } from '@/context/chat-context';

function TheoryTutorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('sessionId') || '';

  const { theorySessions, loadingSessions, sendChatMessage, setLastActiveSession } = useChat();

  const activeSessionIdRef = useRef(sessionId);
  useEffect(() => {
    activeSessionIdRef.current = sessionId;
    setLastActiveSession('theory', sessionId);
  }, [sessionId, setLastActiveSession]);

  const activeSession = theorySessions.find(s => s.id === sessionId);
  const messages = activeSession ? activeSession.messages : [];
  const isLoading = loadingSessions[sessionId] || false;

  const suggestedPrompts = [
    'What are the notes in a C major scale?',
    'Explain different types of chords',
    'How do intervals work in music?',
    'What is harmonic progression?',
    'Teach me about time signatures',
    'Explain music notation symbols',
  ];

  const handleSendMessage = async (messageText: string) => {
    const currentSessionId = activeSessionIdRef.current;
    const newSessionId = await sendChatMessage(currentSessionId || null, messageText, {
      type: 'theory',
      apiPath: '/api/theory-chat',
      systemPrompt: "You are Treble, your AI music learning companion inside TrebleAI. Always refer to yourself as Treble. If the user asks 'Who are you?', you must respond exactly with: 'I'm Treble, your AI music learning companion inside TrebleAI.' You are an expert music theory tutor with deep knowledge of all aspects of music theory. Your role is to help students understand scales and modes, chords and progressions, intervals and harmony, rhythm and time signatures, music notation, classical and modern music theory, and practical applications for musicians. Be thorough but accessible. Use examples when helpful. Encourage learning and practice."
    });

    if (!currentSessionId && newSessionId) {
      activeSessionIdRef.current = newSessionId;
      router.replace(`/theory-tutor?sessionId=${newSessionId}`, { scroll: false });
    }
  };

  return (
    /* Fill all available height, no outer scroll */
    <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 lg:px-8 py-4 w-full max-w-5xl mx-auto relative">
      {/* Decorative blobs (contained, non-scrollable) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 right-0 w-96 h-96 rounded-full bg-gradient-primary/5 blur-3xl animate-float" />
        <div className="absolute bottom-20 left-0 w-96 h-96 rounded-full bg-secondary/5 blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      {/* Chat panel fills remaining space; its inner messages area scrolls */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        <AIChat
          title={undefined}
          apiPath="/api/theory-chat"
          suggestedPrompts={suggestedPrompts}
          context=""
          systemPrompt="You are Treble, your AI music learning companion inside TrebleAI. Always refer to yourself as Treble. If the user asks 'Who are you?', you must respond exactly with: 'I'm Treble, your AI music learning companion inside TrebleAI.' You are an expert music theory tutor with deep knowledge of all aspects of music theory. Your role is to help students understand scales and modes, chords and progressions, intervals and harmony, rhythm and time signatures, music notation, classical and modern music theory, and practical applications for musicians. Be thorough but accessible. Use examples when helpful. Encourage learning and practice."
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          className="flex-1 min-h-0"
        />
      </div>
    </div>
  );
}

export default function TheoryTutorPage() {
  return (
    /* Take exactly the viewport height minus the navbar (h-14 = 3.5rem), no outer scroll */
    <div className="h-[calc(100vh-3.5rem)] bg-background flex flex-col overflow-hidden">
      <Suspense fallback={
        <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-4 w-full max-w-5xl mx-auto">
          <div className="flex-1 rounded-xl border border-border/30 bg-card/20 animate-pulse" />
        </div>
      }>
        <TheoryTutorContent />
      </Suspense>
    </div>
  );
}
