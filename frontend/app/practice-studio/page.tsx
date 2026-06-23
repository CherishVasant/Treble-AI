'use client';

import dynamic from 'next/dynamic';
import { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/page-header';
import SheetMusicViewer, { type SheetPreviewKind } from '@/components/sheet-music-viewer';
import type { MusicPlayerRef } from '@/components/music-player';
import type { Message } from '@/components/ai-chat';

const MusicPlayer = dynamic(() => import('@/components/music-player'), {
  ssr: false,
  loading: () => (
    <div className="glass rounded-xl p-6 border border-border/30 min-h-[180px] animate-pulse bg-card/20" />
  ),
});

const AIChat = dynamic(() => import('@/components/ai-chat'), {
  ssr: false,
  loading: () => (
    <div className="min-h-96 rounded-xl border border-border/30 bg-card/20 animate-pulse" />
  ),
});

const SheetMusicUploader = dynamic(() => import('@/components/sheet-music-uploader'), {
  ssr: false,
  loading: () => (
    <div className="p-8 rounded-xl border border-dashed border-border/30 min-h-[200px] animate-pulse bg-card/20" />
  ),
});

type ProcessedMeta = {
  metadata?: {
    title?: string;
    composer?: string;
    timeSignature?: string;
    tempo?: number | string;
  };
  previewUrl?: string;
  previewKind?: SheetPreviewKind;
  xmlData?: string;
  musicXmlUrl?: string;
  audioUrl?: string | null;
  musicalInfo?: {
    title?: string;
    composer?: string;
    key_signature?: string;
    time_signature?: string;
    tempo?: string;
    total_measures?: number;
    parts?: Array<{ name: string; measures_count: number }>;
    note_summary?: string;
  } | null;
};

function PracticeStudioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('sessionId') || '';

  // Local state representing session attributes
  const [uploadedFileData, setUploadedFileData] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [processedMetadata, setProcessedMetadata] = useState<ProcessedMeta | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConverting, setIsConverting] = useState(false);

  // Sync state between player and sheet music viewer
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  // Looping & measure selections
  const [loopStartMeasure, setLoopStartMeasure] = useState<number>(1);
  const [loopEndMeasure, setLoopEndMeasure] = useState<number>(8);
  const [isLooping, setIsLooping] = useState(false);

  const playerRef = useRef<MusicPlayerRef>(null);

  // Refs to avoid stale state in asynchronous event handlers
  const sessionRef = useRef(sessionId);
  const uploadedFileRef = useRef(uploadedFileData);
  const processedMetaRef = useRef(processedMetadata);
  const messagesRef = useRef(messages);

  useEffect(() => {
    sessionRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    uploadedFileRef.current = uploadedFileData;
  }, [uploadedFileData]);

  useEffect(() => {
    processedMetaRef.current = processedMetadata;
  }, [processedMetadata]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Load session from localStorage on sessionId change
  useEffect(() => {
    if (sessionId) {
      try {
        const sessionsRaw = localStorage.getItem('treble_practice_sessions');
        const sessions = sessionsRaw ? JSON.parse(sessionsRaw) : [];
        const session = sessions.find((s: any) => s.id === sessionId);
        if (session) {
          setUploadedFileData(session.uploadedFileData || null);
          setProcessedMetadata(session.processedMetadata || null);
          setMessages(session.messages || []);
          uploadedFileRef.current = session.uploadedFileData || null;
          processedMetaRef.current = session.processedMetadata || null;
          messagesRef.current = session.messages || [];
        } else {
          // Fallback if session ID is invalid/not found
          setUploadedFileData(null);
          setProcessedMetadata(null);
          setMessages([]);
          uploadedFileRef.current = null;
          processedMetaRef.current = null;
          messagesRef.current = [];
        }
      } catch (e) {
        console.error('Failed to load practice session:', e);
      }
    } else {
      // Clear values when starting new session
      setUploadedFileData(null);
      setProcessedMetadata(null);
      setMessages([]);
      uploadedFileRef.current = null;
      processedMetaRef.current = null;
      messagesRef.current = [];
    }
    // Reset playback status when switching sessions
    setCurrentTime(0);
    setIsPlaying(false);
    setDuration(0);
    setIsLooping(false);
    setLoopStartMeasure(1);
    setLoopEndMeasure(8);
  }, [sessionId]);

  // Handle sidebar new chat trigger
  useEffect(() => {
    const handleNewChat = () => {
      setUploadedFileData(null);
      setProcessedMetadata(null);
      setMessages([]);
      setIsConverting(false);
      setCurrentTime(0);
      setIsPlaying(false);
      setDuration(0);
      setLoopStartMeasure(1);
      setLoopEndMeasure(8);
      setIsLooping(false);
      uploadedFileRef.current = null;
      processedMetaRef.current = null;
      messagesRef.current = [];
      sessionRef.current = '';
    };
    window.addEventListener('treble_new_chat_practice', handleNewChat);
    return () => {
      window.removeEventListener('treble_new_chat_practice', handleNewChat);
    };
  }, []);

  // Helper to save current states to localStorage
  const savePracticeSession = (
    activeId: string,
    currentFile: typeof uploadedFileData,
    currentMeta: typeof processedMetadata,
    currentMsgs: Message[]
  ) => {
    try {
      const sessionsRaw = localStorage.getItem('treble_practice_sessions');
      let sessions = sessionsRaw ? JSON.parse(sessionsRaw) : [];
      
      let targetId = sessionRef.current || activeId;
      let isNew = false;
      
      if (!targetId) {
        targetId = `practice_session_${Date.now()}`;
        sessionRef.current = targetId;
        isNew = true;
      }
      
      const title = currentFile?.name || 'New Practice Session';
      
      const sessionObj = {
        id: targetId,
        title,
        timestamp: new Date().toISOString(),
        uploadedFileData: currentFile,
        processedMetadata: currentMeta,
        messages: currentMsgs
      };

      if (isNew) {
        sessions.unshift(sessionObj);
      } else {
        const index = sessions.findIndex((s: any) => s.id === targetId);
        if (index !== -1) {
          sessions[index] = {
            ...sessions[index],
            uploadedFileData: currentFile,
            processedMetadata: currentMeta,
            messages: currentMsgs,
            timestamp: new Date().toISOString()
          };
        } else {
          sessions.unshift(sessionObj);
        }
      }

      localStorage.setItem('treble_practice_sessions', JSON.stringify(sessions));
      window.dispatchEvent(new Event('treble_sessions_updated'));

      if (isNew) {
        router.replace(`/practice-studio?sessionId=${targetId}`, { scroll: false });
      }
    } catch (e) {
      console.error('Failed to save practice session:', e);
    }
  };

  const handleFileUpload = (file: { id: string; name: string }) => {
    const nextFile = file.id ? file : null;
    uploadedFileRef.current = nextFile;
    setUploadedFileData(nextFile);
    savePracticeSession(sessionRef.current, nextFile, processedMetaRef.current, messagesRef.current);
  };

  const handleMetadataUpdate = (meta: any) => {
    const nextMeta = meta ? { ...processedMetaRef.current, ...meta } : null;
    processedMetaRef.current = nextMeta;
    setProcessedMetadata(nextMeta);
    savePracticeSession(sessionRef.current, uploadedFileRef.current, nextMeta, messagesRef.current);
  };

  const handleNewMessages = (newMessages: Message[]) => {
    messagesRef.current = newMessages;
    setMessages(newMessages);
    savePracticeSession(sessionRef.current, uploadedFileRef.current, processedMetaRef.current, newMessages);
  };

  // Parse tempo and time signature from metadata or musicalInfo to compute measure timings
  const musicalTempo = useMemo(() => {
    if (processedMetadata?.musicalInfo?.tempo) {
      const val = parseFloat(processedMetadata.musicalInfo.tempo);
      if (!isNaN(val) && val > 0) return val;
    }
    if (processedMetadata?.metadata?.tempo) {
      const val = typeof processedMetadata.metadata.tempo === 'number'
        ? processedMetadata.metadata.tempo
        : parseFloat(processedMetadata.metadata.tempo);
      if (!isNaN(val) && val > 0) return val;
    }
    return 120; // Default tempo
  }, [processedMetadata]);

  const timeSignature = useMemo(() => {
    const sig = processedMetadata?.musicalInfo?.time_signature ||
                processedMetadata?.metadata?.timeSignature ||
                '4/4';
    const [num, den] = sig.split('/').map(Number);
    return {
      numerator: num || 4,
      denominator: den || 4,
    };
  }, [processedMetadata]);

  // Seconds per measure = (60 / tempo) * beatsPerMeasure
  const secondsPerMeasure = useMemo(() => {
    const beatsPerMeasure = timeSignature.numerator;
    const secondsPerBeat = 60 / musicalTempo;
    return secondsPerBeat * beatsPerMeasure;
  }, [musicalTempo, timeSignature]);

  // Handle playback looping
  useEffect(() => {
    if (!isLooping || duration <= 0) return;

    const startTime = (loopStartMeasure - 1) * secondsPerMeasure;
    const endTime = loopEndMeasure * secondsPerMeasure;

    if (currentTime >= endTime) {
      playerRef.current?.seekTo(startTime);
    }
  }, [currentTime, isLooping, loopStartMeasure, loopEndMeasure, secondsPerMeasure, duration]);

  const suggestedPrompts = [
    'Quiz me on this sheet music',
    'Test my rhythm reading skills',
    'Analyze mistakes in this score',
    'Help me practice this piece',
    'Check my note recognition',
    'Create a performance exercise',
  ];

  const chatContext = uploadedFileData
    ? `Current practice file: ${uploadedFileData.name}. ` +
      (processedMetadata?.musicalInfo
        ? `Here is the parsed sheet music data extracted from the MusicXML representation of this piece:
- Title: ${processedMetadata.musicalInfo.title || uploadedFileData.name}
- Composer: ${processedMetadata.musicalInfo.composer || 'Unknown'}
- Key Signature: ${processedMetadata.musicalInfo.key_signature || 'Unknown'}
- Time Signature: ${processedMetadata.musicalInfo.time_signature || 'Unknown'}
- Tempo: ${processedMetadata.musicalInfo.tempo || 'Unknown'}
- Total Measures: ${processedMetadata.musicalInfo.total_measures || 'Unknown'}
- Parts/Tracks: ${JSON.stringify(processedMetadata.musicalInfo.parts || [])}
- Note Sequence (first 100 notes/chords): ${processedMetadata.musicalInfo.note_summary || 'None'}`
        : processedMetadata?.metadata?.timeSignature
          ? `Time signature (if known): ${processedMetadata.metadata.timeSignature}.`
          : '')
    : 'No sheet music image or PDF loaded yet';

  const systemPrompt = `You are Treble, your AI music learning companion inside TrebleAI. Always refer to yourself as Treble. If the user asks 'Who are you?', you must respond exactly with: 'I'm Treble, your AI music learning companion inside TrebleAI.' You are a professional music coach. You have access to the parsed sheet music data of the current piece. Always answer relative to this loaded score. Use the provided sheet music context (title, composer, key, time signature, tempo, measures, notes) to give highly specific, accurate guidance. If the user asks about the scale, chords, structure, or notes, refer to the parsed context. If no sheet music is loaded yet, encourage the user to upload one to begin analysis.`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
      
      {/* Row 1: Playback controls & PDF Upload Box side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
        <div className="lg:col-span-2">
          <MusicPlayer
            ref={playerRef}
            title={uploadedFileData?.name || 'No music loaded'}
            composer={processedMetadata?.metadata?.composer || 'Unknown'}
            audioUrl={processedMetadata?.audioUrl ?? undefined}
            isConverting={isConverting}
            onTimeUpdate={setCurrentTime}
            onIsPlayingChange={setIsPlaying}
            onDurationChange={setDuration}
            fileId={uploadedFileData?.id}
            className="w-full"
          />
        </div>

        <div className="lg:col-span-1">
          <div className="bg-card/25 p-5 rounded-xl border border-border/30 shadow-sm flex flex-col justify-center animate-fade-in">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
              Score Upload
            </h4>
            <SheetMusicUploader
              fileId={uploadedFileData?.id}
              fileName={uploadedFileData?.name}
              hasAudio={Boolean(processedMetadata?.audioUrl)}
              onFileUpload={handleFileUpload}
              onProcessing={handleMetadataUpdate}
              onConvertingChange={setIsConverting}
            />
          </div>
        </div>
      </div>

      {/* Row 2: Score Viewer */}
      <div className="w-full">
        <SheetMusicViewer
          xmlData={processedMetadata?.xmlData}
          musicXmlUrl={processedMetadata?.musicXmlUrl}
          fileId={uploadedFileData?.id}
          previewUrl={processedMetadata?.previewUrl}
          previewKind={processedMetadata?.previewKind}
          currentTime={currentTime}
          isPlaying={isPlaying}
          secondsPerMeasure={secondsPerMeasure}
          onMeasureClick={(measure) => {
            const targetTime = (measure - 1) * secondsPerMeasure;
            playerRef.current?.seekTo(targetTime);
          }}
          loopStartMeasure={loopStartMeasure}
          loopEndMeasure={loopEndMeasure}
          isLooping={isLooping}
          onLoopToggle={() => setIsLooping(!isLooping)}
          onLoopStartChange={setLoopStartMeasure}
          onLoopEndChange={setLoopEndMeasure}
          className="h-[600px] lg:h-[650px] min-h-[500px] w-full"
        />
      </div>

      {/* Row 3: Practice Chat (moved down and big) */}
      <div className="w-full">
        <AIChat
          title="Treble"
          apiPath="/api/chat"
          welcomeTitle="Hello, I am Treble."
          welcomeSubtitle="I can help you improve your performance, analyze uploaded sheet music, answer practical music questions, and guide your practice sessions. What would you like to work on today?"
          suggestedPrompts={suggestedPrompts}
          context={chatContext}
          systemPrompt={systemPrompt}
          messages={messages}
          onNewMessages={handleNewMessages}
          className="h-[600px] lg:h-[650px] min-h-[500px] w-full"
        />
      </div>

    </div>
  );
}

export default function PracticeStudioPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Unified Page Header */}
      <PageHeader
        title="Practice Studio"
        description="Upload sheet music, listen to playback, and receive AI-powered practice guidance."
      />
      <Suspense fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <div className="glass rounded-xl p-6 border border-border/30 min-h-[180px] animate-pulse bg-card/20 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 min-h-96 rounded-xl border border-border/30 bg-card/20 animate-pulse" />
            <div className="lg:col-span-1 min-h-96 rounded-xl border border-border/30 bg-card/20 animate-pulse" />
          </div>
        </div>
      }>
        <PracticeStudioContent />
      </Suspense>
    </div>
  );
}
