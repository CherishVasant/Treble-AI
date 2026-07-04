'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Copy, Check, ChevronRight, Info, User, Music } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggested_follow_up_questions?: string[];
  related_concepts?: string[];
  citations?: string[];
  agent_steps?: string[];
}

interface AIChatProps {
  title?: string;
  /** POST endpoint for chat (default: /api/chat). Theory Assistant uses /api/theory-chat. */
  apiPath?: string;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  suggestedPrompts?: string[];
  context?: string;
  systemPrompt?: string;
  messages?: Message[];
  onNewMessages?: (messages: Message[]) => void;
  onSendMessage?: (text: string) => Promise<void> | void;
  isLoading?: boolean;
  className?: string;
}

interface AgentActivityPanelProps {
  steps: string[];
  isExpanded: boolean;
  onToggle: () => void;
  isLoading?: boolean;
  currentStepIndex?: number;
}

function AgentActivityPanel({
  steps,
  isExpanded,
  onToggle,
  isLoading = false,
  currentStepIndex = 0,
}: AgentActivityPanelProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="border border-border/20 rounded-lg bg-background/40 overflow-hidden text-xs max-w-full my-1 transition-all">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-1.5 flex items-center justify-between font-semibold text-muted-foreground/80 hover:text-foreground hover:bg-card/30 transition-colors hover:scale-100 active:scale-100"
      >
        <span className="flex items-center gap-1.5">
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
          Agent Activity
        </span>
        {isLoading && <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />}
      </button>

      {isExpanded && (
        <div className="px-4 py-2 border-t border-border/10 bg-card/10 space-y-1.5 animate-slide-up">
          {steps.map((step, idx) => {
            let state: 'completed' | 'loading' | 'pending' = 'completed';
            if (isLoading) {
              if (idx < currentStepIndex) state = 'completed';
              else if (idx === currentStepIndex) state = 'loading';
              else state = 'pending';
            }

            return (
              <div key={idx} className="flex items-center gap-2 text-[11px] text-muted-foreground/80 transition-all duration-300">
                {state === 'completed' && (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                {state === 'loading' && (
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                )}
                {state === 'pending' && (
                  <div className="w-3.5 h-3.5 rounded-full border border-border/40 shrink-0" />
                )}
                <span
                  className={
                    state === 'completed'
                      ? 'text-foreground/80'
                      : state === 'loading'
                        ? 'text-primary font-semibold animate-pulse'
                        : 'text-muted-foreground/30'
                  }
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AIChat({
  title = 'Treble',
  apiPath = '/api/chat',
  welcomeTitle = "Hello, I'm Treble.",
  welcomeSubtitle = "I can help you understand music theory, analyze sheet music, explain scales, identify chord progressions, and suggest ways to practice more effectively.\n\nHow can I help you today?",
  suggestedPrompts = [
    'Explain what this chord progression is',
    'What scale is this piece in?',
    'How do I improve my sight reading?',
  ],
  context = '',
  systemPrompt = "You are Treble, your AI music learning companion inside TrebleAI. Always refer to yourself as Treble. If the user asks 'Who are you?', you must respond exactly with: 'I'm Treble, your AI music learning companion inside TrebleAI.'",
  messages: externalMessages,
  onNewMessages,
  onSendMessage,
  isLoading = false,
  className = '',
}: AIChatProps) {
  const [internalMessages, setInternalMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [agentActivityExpanded, setAgentActivityExpanded] = useState<Record<string, boolean>>({});
  const [isLoadingExpanded, setIsLoadingExpanded] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setLoadingStepIndex(0);
      interval = setInterval(() => {
        setLoadingStepIndex(prev => (prev < 3 ? prev + 1 : prev));
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading]);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = externalMessages !== undefined ? externalMessages : internalMessages;

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  });

  const setMessages = (updateFn: (prev: Message[]) => Message[]) => {
    if (externalMessages !== undefined) {
      onNewMessages?.(updateFn(messagesRef.current));
    } else {
      setInternalMessages(updateFn);
    }
  };

  // Auto-scroll to bottom inside container
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, loading]);

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    if (onSendMessage) {
      setInput('');
      await onSendMessage(messageText);
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(() => updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // Call the API
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          context,
          systemPrompt,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const detail =
          typeof data.details === 'string'
            ? data.details
            : typeof data.error === 'string'
              ? data.error
              : 'Failed to get response';
        throw new Error(detail);
      }

      // Add assistant message with metadata
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

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('[Treble Chat] error:', error);
      const detail =
        error instanceof Error && error.message !== 'Failed to get response'
          ? error.message
          : null;
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: detail
          ? `Sorry, I could not respond: ${detail}`
          : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied response to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shouldShowActivity = (steps?: string[]) => {
    if (!steps || steps.length === 0) return false;
    return steps.some(step =>
      step.includes('Searching') || step.includes('Analyzing')
    );
  };

  return (
    <div className={`flex flex-col h-full bg-card/10 rounded-xl border border-border/30 overflow-hidden shadow-glow/10 ${className}`}>
      {/* Header */}
      {title && (
        <div className="px-6 py-4 border-b border-border/30 bg-card/25 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">{title}</h2>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto my-auto py-4">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-foreground mb-3">{welcomeTitle}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{welcomeSubtitle}</p>
            </div>

            {/* Suggested Prompts */}
            {suggestedPrompts.length > 0 && (
              <div className="w-full">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Try asking:</p>
                <div className="space-y-2">
                  {suggestedPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestedPrompt(prompt)}
                      className="w-full px-4 py-2.5 text-left text-xs text-foreground/80 rounded-xl bg-card/30 hover:bg-card/70 transition-all duration-200 border border-border/20 hover:border-primary/30 flex items-center justify-between group"
                    >
                      <span className="truncate">{prompt}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 animate-fade-in ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow ${
                    message.role === 'user'
                      ? 'bg-primary'
                      : 'bg-gradient-primary'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Music className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className="max-w-[85%] flex flex-col space-y-2">
                  <div
                    className={`px-4 py-3.5 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-primary text-white rounded-tr-none'
                        : 'bg-card text-foreground rounded-tl-none border border-border/30'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {shouldShowActivity(message.agent_steps) && (
                          <AgentActivityPanel
                            steps={message.agent_steps!}
                            isExpanded={agentActivityExpanded[message.id] || false}
                            onToggle={() => setAgentActivityExpanded(prev => ({
                              ...prev,
                              [message.id]: !prev[message.id]
                            }))}
                          />
                        )}
                        <div className="prose-chat">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code: ({ node, inline, className, children, ...props } : any) => {
                                return inline ? (
                                  <code className="bg-muted/70 px-1 py-0.5 rounded text-xs font-mono font-semibold" {...props}>{children}</code>
                                ) : (
                                  <pre className="bg-background/85 p-3 rounded-xl border border-border/30 my-1 overflow-x-auto text-xs font-mono">
                                    <code className={className} {...props}>{children}</code>
                                  </pre>
                                );
                              }
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Action Controls (Assistant only) */}
                  {message.role === 'assistant' && (
                    <div className="flex flex-col gap-3 pt-1 px-1">
                      {/* Controls Row */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyText(message.content, message.id)}
                          className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1 hover:bg-card/65 rounded-lg border border-border/10"
                        >
                          {copiedId === message.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy Response
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Display Citations */}
                      {message.citations && message.citations.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-card/25 border border-border/20 text-[11px] text-muted-foreground flex flex-col gap-1">
                          <span className="font-bold flex items-center gap-1 text-[10px] text-foreground/80 uppercase tracking-wider">
                            <Info className="w-3 h-3 text-primary" /> Sources & Citations
                          </span>
                          <ul className="list-disc pl-4 space-y-0.5 mt-1 font-medium">
                            {message.citations.map((cite, cIdx) => (
                              <li key={cIdx}>{cite}</li>
                            ))}
                          </ul>
                        </div>
                      )}



                      {/* Display Suggested Follow-Ups */}
                      {message.suggested_follow_up_questions && message.suggested_follow_up_questions.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Follow-Up Questions:</p>
                          <div className="flex flex-col gap-1">
                            {message.suggested_follow_up_questions.map((question, qIdx) => (
                              <button
                                key={qIdx}
                                onClick={() => handleSuggestedPrompt(question)}
                                className="text-left text-xs text-primary hover:underline hover:text-primary/95 flex items-center gap-1 font-medium bg-card/20 hover:bg-card/50 px-3 py-1.5 rounded-lg border border-border/20 w-fit"
                              >
                                <ChevronRight className="w-3 h-3 shrink-0" />
                                {question}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {(loading || isLoading) && (
              <div className="flex gap-3 animate-fade-in">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Music className="w-4 h-4 text-white" />
                </div>
                <div className="max-w-[85%] w-full flex flex-col space-y-2">
                  <div className="px-4 py-3.5 rounded-2xl bg-card text-foreground rounded-bl-none border border-border/30">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 items-center">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-xs font-medium animate-pulse text-muted-foreground">Treble is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-border/30 bg-card/25">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Ask Treble about music theory, scales, chords, practice strategies..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(input);
              }
            }}
            disabled={loading || isLoading}
            className="flex-1 bg-input border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 rounded-xl"
          />
          <Button
            onClick={() => handleSendMessage(input)}
            disabled={loading || isLoading || !input.trim()}
            className="bg-gradient-primary hover:shadow-glow text-white rounded-xl shadow-glow"
            size="icon"
          >
            {loading || isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
