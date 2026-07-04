'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Message } from '@/components/ai-chat';

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
  loadSessions: () => void;
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
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [theorySessions, setTheorySessions] = useState<ChatSession[]>([]);
  const [practiceSessions, setPracticeSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState<Record<string, boolean>>({});
  const [lastActiveTheorySessionId, setLastActiveTheorySessionId] = useState<string>('');
  const [lastActivePracticeSessionId, setLastActivePracticeSessionId] = useState<string>('');

  const loadSessions = useCallback(() => {
    try {
      const theory = localStorage.getItem('treble_theory_sessions');
      if (theory) setTheorySessions(JSON.parse(theory));
      else setTheorySessions([]);

      const practice = localStorage.getItem('treble_practice_sessions');
      if (practice) setPracticeSessions(JSON.parse(practice));
      else setPracticeSessions([]);

      const activeTheory = localStorage.getItem('treble_last_active_theory_session_id');
      if (activeTheory) setLastActiveTheorySessionId(activeTheory);
      else setLastActiveTheorySessionId('');

      const activePractice = localStorage.getItem('treble_last_active_practice_session_id');
      if (activePractice) setLastActivePracticeSessionId(activePractice);
      else setLastActivePracticeSessionId('');
    } catch (e) {
      console.error('Failed to load chat sessions from localStorage:', e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSessions();
    
    // Listen for storage updates
    window.addEventListener('treble_sessions_updated', loadSessions);
    return () => {
      window.removeEventListener('treble_sessions_updated', loadSessions);
    };
  }, [loadSessions]);

  const setLastActiveSession = useCallback((type: 'theory' | 'practice', id: string) => {
    try {
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
    } catch (e) {
      console.error('Failed to save last active session to localStorage:', e);
    }
  }, []);

  const updatePracticeSessionAssets = useCallback((
    sessionId: string,
    fileData: { id: string; name: string } | null,
    metadata: any | null
  ) => {
    const type = 'practice';
    try {
      const sessionsRaw = localStorage.getItem(`treble_${type}_sessions`);
      let currentSessions: ChatSession[] = sessionsRaw ? JSON.parse(sessionsRaw) : [];
      const idx = currentSessions.findIndex(s => s.id === sessionId);
      if (idx !== -1) {
        currentSessions[idx] = {
          ...currentSessions[idx],
          uploadedFileData: fileData,
          processedMetadata: metadata,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(`treble_${type}_sessions`, JSON.stringify(currentSessions));
        setPracticeSessions(currentSessions);
        window.dispatchEvent(new Event('treble_sessions_updated'));
      }
    } catch (e) {
      console.error('Failed to update practice session assets:', e);
    }
  }, []);

  const initializePracticeSession = useCallback((
    fileData: { id: string; name: string } | null,
    metadata: any | null
  ): string => {
    const type = 'practice';
    const activeId = `practice_session_${Date.now()}`;
    const computedTitle = fileData?.name || 'New Practice Session';
    
    const newSession: ChatSession = {
      id: activeId,
      title: computedTitle,
      timestamp: new Date().toISOString(),
      messages: [],
      uploadedFileData: fileData,
      processedMetadata: metadata
    };

    try {
      const sessionsRaw = localStorage.getItem(`treble_${type}_sessions`);
      let currentSessions: ChatSession[] = sessionsRaw ? JSON.parse(sessionsRaw) : [];
      currentSessions.unshift(newSession);
      localStorage.setItem(`treble_${type}_sessions`, JSON.stringify(currentSessions));
      setPracticeSessions(currentSessions);
      
      // Also update last active practice session
      setLastActivePracticeSessionId(activeId);
      localStorage.setItem('treble_last_active_practice_session_id', activeId);

      window.dispatchEvent(new Event('treble_sessions_updated'));
      window.dispatchEvent(new Event('treble_recents_updated'));
    } catch (e) {
      console.error('Failed to initialize practice session:', e);
    }

    return activeId;
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
    
    let activeId = sessionId;
    let isNew = false;
    if (!activeId) {
      activeId = `${type}_session_${Date.now()}`;
      isNew = true;
    }

    // 1. Create User Message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    // Load current sessions of specified type
    const sessionsRaw = localStorage.getItem(`treble_${type}_sessions`);
    let currentSessions: ChatSession[] = sessionsRaw ? JSON.parse(sessionsRaw) : [];
    let currentSession = currentSessions.find(s => s.id === activeId);

    let updatedMessages: Message[] = [];
    if (currentSession) {
      updatedMessages = [...currentSession.messages, userMessage];
    } else {
      updatedMessages = [userMessage];
    }

    const firstUserMsg = updatedMessages.find(m => m.role === 'user');
    const defaultTitle = type === 'theory' ? 'Theory Chat' : 'New Practice Session';
    const computedTitle = type === 'practice' && uploadedFileData?.name
      ? uploadedFileData.name
      : (firstUserMsg
          ? (firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : ''))
          : defaultTitle);

    const updatedSession: ChatSession = {
      id: activeId,
      title: computedTitle,
      timestamp: new Date().toISOString(),
      messages: updatedMessages,
      ...(type === 'practice' ? { uploadedFileData, processedMetadata } : {})
    };

    if (isNew) {
      currentSessions.unshift(updatedSession);
    } else {
      const idx = currentSessions.findIndex(s => s.id === activeId);
      if (idx !== -1) {
        currentSessions[idx] = {
          ...currentSessions[idx],
          title: computedTitle,
          messages: updatedMessages,
          timestamp: new Date().toISOString(),
          ...(type === 'practice' ? { uploadedFileData, processedMetadata } : {})
        };
      } else {
        currentSessions.unshift(updatedSession);
      }
    }

    // Save user message state immediately
    localStorage.setItem(`treble_${type}_sessions`, JSON.stringify(currentSessions));
    if (type === 'theory') {
      setTheorySessions(currentSessions);
      setLastActiveTheorySessionId(activeId);
      localStorage.setItem('treble_last_active_theory_session_id', activeId);
    } else {
      setPracticeSessions(currentSessions);
      setLastActivePracticeSessionId(activeId);
      localStorage.setItem('treble_last_active_practice_session_id', activeId);
    }
    setLoadingSessions(prev => ({ ...prev, [activeId!]: true }));

    // Dispatch update events for components/sidebar
    window.dispatchEvent(new Event('treble_sessions_updated'));

    // Start background fetch (non-blocking)
    (async () => {
      try {
        const history = currentSession ? currentSession.messages : [];
        const response = await fetch(apiPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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

        // 3. Create Assistant Message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          suggested_follow_up_questions: data.suggested_follow_up_questions,
          related_concepts: data.related_concepts,
          citations: data.citations,
          agent_steps: data.agent_steps,
        };

        // Reload fresh sessions to ensure no write clashes
        const sessionsFreshRaw = localStorage.getItem(`treble_${type}_sessions`);
        let freshSessions: ChatSession[] = sessionsFreshRaw ? JSON.parse(sessionsFreshRaw) : [];
        const freshIdx = freshSessions.findIndex(s => s.id === activeId);

        if (freshIdx !== -1) {
          const freshMsgs = [...freshSessions[freshIdx].messages, assistantMessage];
          freshSessions[freshIdx] = {
            ...freshSessions[freshIdx],
            messages: freshMsgs,
            timestamp: new Date().toISOString()
          };
        }

        localStorage.setItem(`treble_${type}_sessions`, JSON.stringify(freshSessions));
        if (type === 'theory') {
          setTheorySessions(freshSessions);
        } else {
          setPracticeSessions(freshSessions);
        }
      } catch (error: any) {
        console.error('[ChatContext] message fetch error:', error);
        const detail = error instanceof Error && error.message !== 'Failed to get response' ? error.message : null;
        
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: detail
            ? `Sorry, I could not respond: ${detail}`
            : 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        };

        const sessionsFreshRaw = localStorage.getItem(`treble_${type}_sessions`);
        let freshSessions: ChatSession[] = sessionsFreshRaw ? JSON.parse(sessionsFreshRaw) : [];
        const freshIdx = freshSessions.findIndex(s => s.id === activeId);

        if (freshIdx !== -1) {
          const freshMsgs = [...freshSessions[freshIdx].messages, errorMessage];
          freshSessions[freshIdx] = {
            ...freshSessions[freshIdx],
            messages: freshMsgs,
            timestamp: new Date().toISOString()
          };
        }

        localStorage.setItem(`treble_${type}_sessions`, JSON.stringify(freshSessions));
        if (type === 'theory') {
          setTheorySessions(freshSessions);
        } else {
          setPracticeSessions(freshSessions);
        }
      } finally {
        setLoadingSessions(prev => ({ ...prev, [activeId!]: false }));
        window.dispatchEvent(new Event('treble_sessions_updated'));
        window.dispatchEvent(new Event('treble_recents_updated'));
      }
    })();

    return activeId;
  };

  const clearAllSessions = (type: 'theory' | 'practice') => {
    try {
      localStorage.removeItem(`treble_${type}_sessions`);
      localStorage.removeItem(`treble_last_active_${type}_session_id`);
      if (type === 'theory') {
        setTheorySessions([]);
        setLastActiveTheorySessionId('');
      } else {
        setPracticeSessions([]);
        setLastActivePracticeSessionId('');
      }
      window.dispatchEvent(new Event('treble_sessions_updated'));
      window.dispatchEvent(new Event('treble_recents_updated'));
    } catch (err) {
      console.error(`Failed to clear ${type} sessions:`, err);
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
