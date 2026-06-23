'use client';

import dynamic from 'next/dynamic';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/page-header';
import type { Message } from '@/components/ai-chat';

const AIChat = dynamic(() => import('@/components/ai-chat'), {
  ssr: false,
  loading: () => (
    <div className="min-h-96 lg:min-h-[600px] rounded-xl border border-border/30 bg-card/20 animate-pulse" />
  ),
});

function TheoryTutorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('sessionId') || '';
  
  const [messages, setMessages] = useState<Message[]>([]);

  const suggestedPrompts = [
    'What are the notes in a C major scale?',
    'Explain different types of chords',
    'How do intervals work in music?',
    'What is harmonic progression?',
    'Teach me about time signatures',
    'Explain music notation symbols',
  ];

  useEffect(() => {
    if (sessionId) {
      try {
        const sessionsRaw = localStorage.getItem('treble_theory_sessions');
        const sessions = sessionsRaw ? JSON.parse(sessionsRaw) : [];
        const session = sessions.find((s: any) => s.id === sessionId);
        if (session) {
          setMessages(session.messages || []);
        } else {
          setMessages([]);
        }
      } catch (e) {
        console.error('Failed to load theory session:', e);
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [sessionId]);

  useEffect(() => {
    const handleNewChat = () => {
      setMessages([]);
    };
    window.addEventListener('treble_new_chat_theory', handleNewChat);
    return () => {
      window.removeEventListener('treble_new_chat_theory', handleNewChat);
    };
  }, []);

  const handleNewMessages = (newMessages: Message[]) => {
    setMessages(newMessages);

    try {
      const sessionsRaw = localStorage.getItem('treble_theory_sessions');
      let sessions = sessionsRaw ? JSON.parse(sessionsRaw) : [];
      
      let activeId = sessionId;
      let isNew = false;
      
      if (!activeId) {
        activeId = `theory_session_${Date.now()}`;
        isNew = true;
      }
      
      const firstUserMsg = newMessages.find(m => m.role === 'user');
      const title = firstUserMsg 
        ? (firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : ''))
        : 'Theory Chat';

      const sessionObj = {
        id: activeId,
        title,
        timestamp: new Date().toISOString(),
        messages: newMessages
      };

      if (isNew) {
        sessions.unshift(sessionObj);
      } else {
        const index = sessions.findIndex((s: any) => s.id === activeId);
        if (index !== -1) {
          sessions[index] = {
            ...sessions[index],
            messages: newMessages,
            timestamp: new Date().toISOString()
          };
        } else {
          sessions.unshift(sessionObj);
        }
      }

      localStorage.setItem('treble_theory_sessions', JSON.stringify(sessions));
      window.dispatchEvent(new Event('treble_sessions_updated'));

      if (isNew) {
        router.replace(`/theory-tutor?sessionId=${activeId}`, { scroll: false });
      }
    } catch (e) {
      console.error('Failed to save theory session:', e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 flex-1 w-full flex flex-col">
      {/* Animated Background Elements (contained within page) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 right-0 w-96 h-96 rounded-full bg-gradient-primary/5 blur-3xl animate-float" />
        <div className="absolute bottom-20 left-0 w-96 h-96 rounded-full bg-secondary/5 blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        <AIChat
          title={undefined}
          apiPath="/api/theory-chat"
          suggestedPrompts={suggestedPrompts}
          context=""
          systemPrompt="You are Treble, your AI music learning companion inside TrebleAI. Always refer to yourself as Treble. If the user asks 'Who are you?', you must respond exactly with: 'I'm Treble, your AI music learning companion inside TrebleAI.' You are an expert music theory tutor with deep knowledge of all aspects of music theory. Your role is to help students understand scales and modes, chords and progressions, intervals and harmony, rhythm and time signatures, music notation, classical and modern music theory, and practical applications for musicians. Be thorough but accessible. Use examples when helpful. Encourage learning and practice."
          messages={messages}
          onNewMessages={handleNewMessages}
          className="h-[650px] max-h-[calc(100vh-250px)] min-h-[450px]"
        />
      </div>
    </div>
  );
}

export default function TheoryTutorPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Unified Page Header */}
      <PageHeader
        title="Theory Tutor"
        description="Ask music theory questions and receive detailed explanations from your AI tutor."
      />
      <Suspense fallback={
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <div className="min-h-96 lg:min-h-[600px] rounded-xl border border-border/30 bg-card/20 animate-pulse" />
        </div>
      }>
        <TheoryTutorContent />
      </Suspense>
    </div>
  );
}
