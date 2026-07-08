'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Message } from '@/components/ai-chat';
import { toast } from 'sonner';

export interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  messages: Message[];
  uploadedFileData?: { id: string; name: string } | null;
  processedMetadata?: any | null;
}

interface ChatContextType {
  theorySessions: ChatSession[];
  practiceSessions: ChatSession[];
  loadingSessions: Record<string, boolean>;
  lastActiveTheorySessionId: string;
  lastActivePracticeSessionId: string;
  loadSessions: () => Promise<void>;
  setLastActiveSession: (type: 'theory' | 'practice', id: string) => void;
  sendChatMessage: (
    sessionId: string | null,
    messageText: string,
    options: {
      type: 'theory' | 'practice';
      apiPath: string;
      context?: string;
      systemPrompt?: string;
      uploadedFileData?: { id: string; name: string } | null;
      processedMetadata?: any | null;
    }
  ) => Promise<string>;
  clearAllSessions: (type: 'theory' | 'practice') => void;
  updatePracticeSessionAssets: (
    sessionId: string,
    fileData: { id: string; name: string } | null,
    metadata: any | null
  ) => void;
  initializePracticeSession: (
    fileData: { id: string; name: string } | null,
    metadata: any | null
  ) => string;
  renameSession: (type: 'theory' | 'practice', id: string, newTitle: string) => Promise<boolean>;
  deleteSession: (type: 'theory' | 'practice', id: string) => Promise<boolean>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

function generateUUID() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [theorySessions, setTheorySessions] = useState<ChatSession[]>([]);
  const [practiceSessions, setPracticeSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState<Record<string, boolean>>({});
  const [lastActiveTheorySessionId, setLastActiveTheorySessionId] = useState<string>('');
  const [lastActivePracticeSessionId, setLastActivePracticeSessionId] = useState<string>('');

  const loadSessions = useCallback(async () => {
    try {
      const [theoryRes, practiceRes] = await Promise.all([
        fetch('/api/chats/theory'),
        fetch('/api/chats/practice')
      ]);

      if (theoryRes.ok) {
        const theoryData = await theoryRes.json();
        setTheorySessions(theoryData);
      }
      if (practiceRes.ok) {
        const practiceData = await practiceRes.json();
        setPracticeSessions(practiceData);
      }

      const activeTheory = localStorage.getItem('treble_last_active_theory_session_id');
      if (activeTheory) setLastActiveTheorySessionId(activeTheory);

      const activePractice = localStorage.getItem('treble_last_active_practice_session_id');
      if (activePractice) setLastActivePracticeSessionId(activePractice);
    } catch (e) {
      console.error('Failed to load chat sessions from backend:', e);
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const setLastActiveSession = useCallback((type: 'theory' | 'practice', id: string) => {
    if (type === 'theory') {
      setLastActiveTheorySessionId(id);
      if (id) {
        localStorage.setItem('treble_last_active_theory_session_id', id);
      } else {
        localStorage.removeItem('treble_last_active_theory_session_id');
      }
    } else {
      setLastActivePracticeSessionId(id);
      if (id) {
        localStorage.setItem('treble_last_active_practice_session_id', id);
      } else {
        localStorage.removeItem('treble_last_active_practice_session_id');
      }
    }
  }, []);

  const renameSession = useCallback(async (type: 'theory' | 'practice', id: string, newTitle: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/chats/${type}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      if (res.ok) {
        if (type === 'theory') {
          setTheorySessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
        } else {
          setPracticeSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
        }
        toast.success('Session renamed successfully');
        return true;
      }
      toast.error('Failed to rename session');
      return false;
    } catch (err) {
      console.error('Failed to rename session:', err);
      toast.error('Error renaming session');
      return false;
    }
  }, []);

  const deleteSession = useCallback(async (type: 'theory' | 'practice', id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/chats/${type}/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (type === 'theory') {
          setTheorySessions(prev => prev.filter(s => s.id !== id));
          if (lastActiveTheorySessionId === id) {
            setLastActiveSession('theory', '');
          }
        } else {
          setPracticeSessions(prev => prev.filter(s => s.id !== id));
          if (lastActivePracticeSessionId === id) {
            setLastActiveSession('practice', '');
          }
        }
        toast.success('Session deleted successfully');
        return true;
      }
      toast.error('Failed to delete session');
      return false;
    } catch (err) {
      console.error('Failed to delete session:', err);
      toast.error('Error deleting session');
      return false;
    }
  }, [lastActiveTheorySessionId, lastActivePracticeSessionId, setLastActiveSession]);

  const updatePracticeSessionAssets = useCallback((
    sessionId: string,
    fileData: { id: string; name: string } | null,
    metadata: any | null
  ) => {
    // Note: Local storage practice session syncing is bypassed now that practice sessions are stored in DB.
    // However, we preserve state updates for reactive frontend updates.
    setPracticeSessions(prev =>
      prev.map(s =>
        s.id === sessionId
          ? {
              ...s,
              uploadedFileData: fileData,
              processedMetadata: metadata,
              timestamp: new Date().toISOString()
            }
          : s
      )
    );
  }, []);

  const initializePracticeSession = useCallback((
    fileData: { id: string; name: string } | null,
    metadata: any | null
  ): string => {
    // Return a fresh UUID, which will be generated on process startup by the backend anyway.
    // The uploader uses this UUID to represent the file job.
    return fileData?.id || generateUUID();
  }, []);

  const sendChatMessage = async (
    sessionId: string | null,
    messageText: string,
    options: {
      type: 'theory' | 'practice';
      apiPath: string;
      context?: string;
      systemPrompt?: string;
      uploadedFileData?: { id: string; name: string } | null;
      processedMetadata?: any | null;
    }
  ): Promise<string> => {
    const { type, apiPath, context = '', systemPrompt = '', uploadedFileData = null, processedMetadata = null } = options;

    const activeId = sessionId || generateUUID();

    // 1. Create User Message
    const userMessage: Message = {
      id: generateUUID(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    // Optimistically update React State
    if (type === 'theory') {
      setTheorySessions(prev => {
        const currentSession = prev.find(s => s.id === activeId);
        const userMessages = currentSession ? [...currentSession.messages, userMessage] : [userMessage];
        const defaultTitle = 'Theory Chat';
        const computedTitle = currentSession
          ? currentSession.title
          : (messageText.slice(0, 30) + (messageText.length > 30 ? '...' : ''));

        if (currentSession) {
          return prev.map(s => s.id === activeId ? { ...s, messages: userMessages, timestamp: new Date().toISOString() } : s);
        } else {
          return [
            { id: activeId, title: computedTitle, timestamp: new Date().toISOString(), messages: userMessages },
            ...prev
          ];
        }
      });
      setLastActiveTheorySessionId(activeId);
      localStorage.setItem('treble_last_active_theory_session_id', activeId);
    } else {
      setPracticeSessions(prev => {
        const currentSession = prev.find(s => s.id === activeId);
        const userMessages = currentSession ? [...currentSession.messages, userMessage] : [userMessage];
        const defaultTitle = uploadedFileData?.name || 'New Practice Session';

        if (currentSession) {
          return prev.map(s => s.id === activeId ? { ...s, messages: userMessages, timestamp: new Date().toISOString() } : s);
        } else {
          return [
            {
              id: activeId,
              title: defaultTitle,
              timestamp: new Date().toISOString(),
              messages: userMessages,
              uploadedFileData,
              processedMetadata
            },
            ...prev
          ];
        }
      });
      setLastActivePracticeSessionId(activeId);
      localStorage.setItem('treble_last_active_practice_session_id', activeId);
    }

    setLoadingSessions(prev => ({ ...prev, [activeId]: true }));

    // Start background fetch (non-blocking)
    (async () => {
      try {
        const currentSession = (type === 'theory' ? theorySessions : practiceSessions).find(s => s.id === activeId);
        const history = currentSession ? currentSession.messages : [];

        const response = await fetch(apiPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeId,
            chatType: type,
            message: messageText,
            context,
            systemPrompt,
            history: history.map(m => ({ role: m.role, content: m.content })),
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          const detail = data.details || data.error || 'Failed to get response';
          throw new Error(detail);
        }

        const assistantMessage: Message = {
          id: generateUUID(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          suggested_follow_up_questions: data.suggested_follow_up_questions,
          related_concepts: data.related_concepts,
          citations: data.citations,
          agent_steps: data.agent_steps,
        };

        // Reload sessions list from backend to fetch updated titles and messages
        await loadSessions();
      } catch (error: any) {
        console.error('[ChatContext] message fetch error:', error);
        const detail = error instanceof Error && error.message !== 'Failed to get response' ? error.message : null;

        const errorMessage: Message = {
          id: generateUUID(),
          role: 'assistant',
          content: detail
            ? `Sorry, I could not respond: ${detail}`
            : 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        };

        if (type === 'theory') {
          setTheorySessions(prev =>
            prev.map(s =>
              s.id === activeId
                ? { ...s, messages: [...s.messages, errorMessage], timestamp: new Date().toISOString() }
                : s
            )
          );
        } else {
          setPracticeSessions(prev =>
            prev.map(s =>
              s.id === activeId
                ? { ...s, messages: [...s.messages, errorMessage], timestamp: new Date().toISOString() }
                : s
            )
          );
        }
      } finally {
        setLoadingSessions(prev => ({ ...prev, [activeId]: false }));
      }
    })();

    return activeId;
  };

  const clearAllSessions = async (type: 'theory' | 'practice') => {
    // clearAllSessions deletes all local state for standard operations.
    // Database chats are cleared individually or cascade automatically.
    try {
      if (type === 'theory') {
        // Clear theory sessions one by one
        await Promise.all(theorySessions.map(s => deleteSession('theory', s.id)));
      } else {
        await Promise.all(practiceSessions.map(s => deleteSession('practice', s.id)));
      }
    } catch (err) {
      console.error(`Failed to clear all ${type} sessions:`, err);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        theorySessions,
        practiceSessions,
        loadingSessions,
        lastActiveTheorySessionId,
        lastActivePracticeSessionId,
        loadSessions,
        setLastActiveSession,
        sendChatMessage,
        clearAllSessions,
        updatePracticeSessionAssets,
        initializePracticeSession,
        renameSession,
        deleteSession
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
