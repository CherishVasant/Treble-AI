'use client';

import dynamic from 'next/dynamic';
import { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/page-header';
import SheetMusicViewer, { type SheetPreviewKind } from '@/components/sheet-music-viewer';
import type { MusicPlayerRef } from '@/components/music-player';
import PianoKeyboard from '@/components/piano-keyboard';
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
    notes?: any[];
    // Enriched analysis fields
    key_analysis?: any;
    chord_list?: any[];
    roman_numerals?: any[];
    cadences?: any[];
    intervals?: any;
    rhythm?: any;
    phrases?: number[];
    motifs?: any[];
    difficulty?: any;
    fingerings?: any;
  } | null;
};

import { useChat } from '@/context/chat-context';

const SYSTEM_PROMPT = `You are Treble, your AI music learning companion inside TrebleAI. Always refer to yourself as Treble. If the user asks 'Who are you?', you must respond exactly with: 'I'm Treble, your AI music learning companion inside TrebleAI.' You are a professional music coach and tutor.

You have access to a detailed, algorithmically generated deterministic music analysis report for the active piece. Use this report as your absolute source of truth. DO NOT recalculate keys, chords, intervals, cadences, or fingerings yourself. Use the provided details (difficulty score/factors, chord lists, Roman numerals, cadences, rhythm stats, phrase boundaries, and fingering suggestions) to explain concepts, answer theoretical or practical questions, teach the user, and offer structured practice advice.`;

function getChatContext(uploadedFileData: any, processedMetadata: any): string {
  if (!uploadedFileData) return 'No sheet music image or PDF loaded yet';
  
  const base = `Current practice file: ${uploadedFileData.name}. `;
  if (!processedMetadata?.musicalInfo) {
    if (processedMetadata?.metadata?.timeSignature) {
      return base + `Time signature (if known): ${processedMetadata.metadata.timeSignature}.`;
    }
    return base;
  }

  const info = processedMetadata.musicalInfo;
  return base + `Here is the detailed deterministic music analysis report for this piece:
  - Title: ${info.title || uploadedFileData.name}
  - Composer: ${info.composer || 'Unknown'}
  - Key Signature: ${info.key_signature || 'Unknown'}
  - Time Signature: ${info.time_signature || 'Unknown'}
  - Tempo: ${info.tempo || 'Unknown'}
  - Total Measures: ${info.total_measures || 'Unknown'}
  - Parts: ${JSON.stringify(info.parts || [])}
  - Key/Scale Analysis: ${JSON.stringify(info.key_analysis || {})}
  - Chords Detected (first 50): ${JSON.stringify((info.chord_list || []).slice(0, 50))}
  - Roman Numeral Progression (first 50): ${JSON.stringify((info.roman_numerals || []).slice(0, 50))}
  - Cadences Detected: ${JSON.stringify(info.cadences || [])}
  - Melodic Interval Stats: ${JSON.stringify(info.intervals || {})}
  - Rhythm Analysis: ${JSON.stringify(info.rhythm || {})}
  - Phrase Boundaries (measures): ${JSON.stringify(info.phrases || [])}
  - Melodic Motifs: ${JSON.stringify(info.motifs || [])}
  - Difficulty Analysis: ${JSON.stringify(info.difficulty || {})}
  - Fingering Suggestions: ${JSON.stringify(info.fingerings || {})}`;
}

function PracticeStudioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('sessionId') || '';

  const { practiceSessions, loadingSessions, sendChatMessage, updatePracticeSessionAssets, initializePracticeSession, setLastActiveSession } = useChat();

  const activeSessionIdRef = useRef(sessionId);
  useEffect(() => {
    activeSessionIdRef.current = sessionId;
    setLastActiveSession('practice', sessionId);
  }, [sessionId, setLastActiveSession]);

  const activeSession = practiceSessions.find(s => s.id === sessionId);
  const messages = activeSession ? activeSession.messages : [];
  const uploadedFileData = activeSession ? (activeSession.uploadedFileData || null) : null;
  const processedMetadata = activeSession ? (activeSession.processedMetadata || null) : null;
  const isLoading = loadingSessions[sessionId] || false;

  const [isConverting, setIsConverting] = useState(false);

  // Sync state between player and sheet music viewer
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  // Looping & measure selections
  const [loopStartMeasure, setLoopStartMeasure] = useState<number>(1);
  const [loopEndMeasure, setLoopEndMeasure] = useState<number>(8);
  const [isLooping, setIsLooping] = useState(false);
  const [showPiano, setShowPiano] = useState(true);

  const playerRef = useRef<MusicPlayerRef>(null);

  // Sync piano highlights with current audio playback timing
  const activeMidiNotes = useMemo(() => {
    const notes = processedMetadata?.musicalInfo?.notes;
    if (!notes || !Array.isArray(notes)) return [];
    
    // Find all notes/pitches that are playing at the current time
    const active = notes.filter((n: any) => {
      return currentTime >= n.start && currentTime < (n.start + n.duration);
    });
    
    return active.map((n: any) => n.midi);
  }, [processedMetadata?.musicalInfo?.notes, currentTime]);

  // Reset playback status when switching sessions
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    setDuration(0);
    setIsLooping(false);
    setLoopStartMeasure(1);
    setLoopEndMeasure(8);
  }, [sessionId]);

  const handleFileUpload = (file: { id: string; name: string }) => {
    const nextFile = file.id ? file : null;
    const currentSessionId = activeSessionIdRef.current;
    if (currentSessionId) {
      updatePracticeSessionAssets(currentSessionId, nextFile, processedMetadata);
    } else {
      const newId = initializePracticeSession(nextFile, processedMetadata);
      activeSessionIdRef.current = newId;
      router.replace(`/practice-studio?sessionId=${newId}`, { scroll: false });
    }
  };

  const handleMetadataUpdate = (meta: any) => {
    const nextMeta = meta ? { ...processedMetadata, ...meta } : null;
    const currentSessionId = activeSessionIdRef.current;
    if (currentSessionId) {
      updatePracticeSessionAssets(currentSessionId, uploadedFileData, nextMeta);
    } else {
      const newId = initializePracticeSession(uploadedFileData, nextMeta);
      activeSessionIdRef.current = newId;
      router.replace(`/practice-studio?sessionId=${newId}`, { scroll: false });
    }
  };

  // Backfill missing note timings for older sessions
  useEffect(() => {
    if (!sessionId || !processedMetadata || !uploadedFileData) return;
    
    // Check if notes are missing from musicalInfo
    const hasNotes = processedMetadata.musicalInfo?.notes && Array.isArray(processedMetadata.musicalInfo.notes);
    const hasAudio = Boolean(processedMetadata.audioUrl);
    const jobId = processedMetadata.jobId;
    
    if (hasAudio && !hasNotes && jobId) {
      console.log('[PracticeStudio] Notes missing. Backfilling from server for job:', jobId);
      
      fetch(`/api/convert-sheet/result?jobId=${jobId}&fileId=${uploadedFileData.id}`, { cache: 'no-store' })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Failed to load notes');
        })
        .then(resultData => {
          if (resultData?.musicalInfo?.notes) {
            console.log('[PracticeStudio] Notes successfully backfilled.');
            handleMetadataUpdate(resultData);
          }
        })
        .catch(err => {
          console.warn('[PracticeStudio] Failed to backfill notes:', err);
        });
    }
  }, [sessionId, processedMetadata, uploadedFileData]);

  const handleSendMessage = async (messageText: string) => {
    const systemPrompt = SYSTEM_PROMPT;
    const chatContext = getChatContext(uploadedFileData, processedMetadata);

    const currentSessionId = activeSessionIdRef.current;
    const newSessionId = await sendChatMessage(currentSessionId || null, messageText, {
      type: 'practice',
      apiPath: '/api/chat',
      context: chatContext,
      systemPrompt,
      uploadedFileData,
      processedMetadata
    });

    if (!currentSessionId && newSessionId) {
      activeSessionIdRef.current = newSessionId;
      router.replace(`/practice-studio?sessionId=${newSessionId}`, { scroll: false });
    }
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

  const chatContext = useMemo(() => getChatContext(uploadedFileData, processedMetadata), [uploadedFileData, processedMetadata]);
  const systemPrompt = SYSTEM_PROMPT;

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
              conversionState={processedMetadata?.conversionState}
              onFileUpload={handleFileUpload}
              onProcessing={handleMetadataUpdate}
              onConvertingChange={setIsConverting}
            />
          </div>
        </div>
      </div>

      {/* Row 2: Interactive Piano Keyboard */}
      <div className="w-full bg-card/25 rounded-xl border border-border/30 overflow-hidden flex flex-col transition-all duration-300">
        <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between bg-card/10">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="18" rx="2" />
              <path d="M6 3v12" />
              <path d="M10 3v12" />
              <path d="M14 3v12" />
              <path d="M18 3v12" />
              <path d="M2 15h20" />
            </svg>
            <h2 className="text-lg font-semibold text-foreground">Piano Visualization</h2>
            {showPiano && activeMidiNotes.length > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-semibold animate-pulse">
                {activeMidiNotes.length} {activeMidiNotes.length === 1 ? 'Note' : 'Notes'} Active
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold">
              Show Piano
            </span>
            <button
              onClick={() => setShowPiano(!showPiano)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showPiano ? 'bg-primary' : 'bg-muted'}`}
              role="switch"
              aria-checked={showPiano}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showPiano ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>

        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showPiano ? 'max-h-[300px] opacity-100 p-6' : 'max-h-0 opacity-0 p-0 border-0'}`}>
          <PianoKeyboard
            activeMidiNotes={activeMidiNotes}
          />
        </div>
      </div>

      {/* Row 2.5: Deterministic Score Analysis Dashboard */}
      {processedMetadata?.musicalInfo?.difficulty && (
        <div className="w-full bg-card/25 rounded-xl border border-border/30 overflow-hidden flex flex-col transition-all duration-300 animate-fade-in">
          <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between bg-card/10">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <h2 className="text-lg font-semibold text-foreground">Score Analysis & Theory Insights</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                Deterministic Report
              </span>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Difficulty */}
            <div className="glass rounded-xl p-5 border border-border/35 flex flex-col justify-between hover:border-primary/20 transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Difficulty</span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                    processedMetadata.musicalInfo.difficulty.difficulty_category === 'Beginner' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : processedMetadata.musicalInfo.difficulty.difficulty_category === 'Intermediate'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {processedMetadata.musicalInfo.difficulty.difficulty_category}
                  </span>
                </div>
                <div className="text-3xl font-extrabold text-foreground mb-2">
                  {processedMetadata.musicalInfo.difficulty.difficulty_score} <span className="text-sm font-medium text-muted-foreground">/ 10</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 mt-2 list-disc list-inside">
                  {(processedMetadata.musicalInfo.difficulty.contributing_factors || []).slice(0, 3).map((f: string, idx: number) => (
                    <li key={idx} className="line-clamp-1">{f}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Card 2: Key & Tonal Center */}
            <div className="glass rounded-xl p-5 border border-border/35 flex flex-col justify-between hover:border-primary/20 transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Key & Modality</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                    {processedMetadata.musicalInfo.key_analysis?.mode || 'Tonal'}
                  </span>
                </div>
                <div className="text-2xl font-extrabold text-foreground mb-1 truncate">
                  {processedMetadata.musicalInfo.key_analysis?.tonal_center || 'C Major'}
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                  Relative: <span className="text-foreground font-semibold">{processedMetadata.musicalInfo.key_analysis?.relative_key || 'A Minor'}</span>
                </div>
                {processedMetadata.musicalInfo.key_analysis?.modal_interpretations?.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Modal Matches</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(processedMetadata.musicalInfo.key_analysis.modal_interpretations || []).slice(0, 2).map((m: any, idx: number) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-muted/50 text-foreground font-medium border border-border/40 truncate max-w-full">
                          {m.mode} ({m.similarity}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Harmony & Cadences */}
            <div className="glass rounded-xl p-5 border border-border/35 flex flex-col justify-between hover:border-primary/20 transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Harmony</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
                    {processedMetadata.musicalInfo.chord_list?.length || 0} Chords
                  </span>
                </div>
                <div className="text-xs font-semibold text-foreground mb-2 block">
                  Cadences Detected:
                </div>
                {processedMetadata.musicalInfo.cadences?.length > 0 ? (
                  <div className="space-y-1.5 max-h-[80px] overflow-y-auto pr-1">
                    {(processedMetadata.musicalInfo.cadences || []).slice(0, 3).map((cad: any, idx: number) => (
                      <div key={idx} className="text-[10px] flex items-center justify-between bg-muted/30 p-1.5 rounded border border-border/10">
                        <span className="font-medium text-foreground truncate max-w-[100px]">{cad.type}</span>
                        <span className="text-[9px] text-muted-foreground font-semibold bg-muted px-1.5 py-0.5 rounded">{cad.progression} (M.{cad.measure})</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">No formal cadences detected</span>
                )}
              </div>
            </div>

            {/* Card 4: Fingering & Rhythm */}
            <div className="glass rounded-xl p-5 border border-border/35 flex flex-col justify-between hover:border-primary/20 transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fingering & Rhythm</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                    {processedMetadata.musicalInfo.rhythm?.syncopations_detected || 0} Sync
                  </span>
                </div>
                <div className="text-xs space-y-2 text-muted-foreground">
                  <div>
                    <span className="font-semibold text-foreground block text-[10px] mb-0.5">Scale Fingering (RH / LH):</span>
                    <span className="text-[10px] font-mono bg-muted/65 px-2 py-1 rounded block border border-border/20">
                      {processedMetadata.musicalInfo.fingerings?.scale_fingerings?.right_hand} / {processedMetadata.musicalInfo.fingerings?.scale_fingerings?.left_hand}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground block text-[10px] mb-0.5">Melodic Suggestion (first 20 notes):</span>
                    <span className="text-[10px] font-mono bg-muted/65 px-2 py-1 rounded block border border-border/20 truncate">
                      {processedMetadata.musicalInfo.fingerings?.melodic_passage_fingering_suggestion || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Row 3: Sheet Music Viewer */}
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
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
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
