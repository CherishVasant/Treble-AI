'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Check, Loader2, Music, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SheetMusicUploaderProps {
  fileId?: string;
  fileName?: string;
  hasAudio?: boolean;
  /** Pre-generated UUID for the practice session — passed to backend so
   *  session IDs are stable before the convert response arrives. */
  sessionId?: string;
  /** Vercel Blob URL for the original uploaded file — stored in the DB as
   *  session.blob_url and needed when the user re-converts a loaded session. */
  fileBlobUrl?: string | null;
  conversionState?: {
    jobId?: string;
    steps?: Record<string, 'pending' | 'processing' | 'completed' | 'failed'>;
    error?: string | null;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
  } | null;
  onFileUpload?: (file: { id: string; name: string }) => void;
  onProcessing?: (metadata: any) => void;
  onConvertingChange?: (converting: boolean) => void;
  /** Compact strip mode — renders a single horizontal row instead of the full
   *  card. Used inside the Studio layout's right panel. */
  compact?: boolean;
}

function extFromName(filename: string): string {
  const m = filename.match(/\.([^.]+)$/);
  return m ? m[1].toLowerCase() : '';
}

const IMAGE_EXT = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'heic', 'avif', 'svg'
]);

function isVisualScoreFile(file: File): boolean {
  const ext = extFromName(file.name);
  if (ext === 'pdf') return true;
  if (IMAGE_EXT.has(ext)) return true;
  return false;
}

export default function SheetMusicUploader({
  fileId,
  fileName,
  hasAudio = false,
  sessionId,
  fileBlobUrl,
  conversionState,
  onFileUpload,
  onProcessing,
  onConvertingChange,
  compact = false,
}: SheetMusicUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [activeFile, setActiveFile] = useState<{ id: string; name: string; size: number; blobUrl?: string } | null>(null);
  const [isConvertingLocal, setIsConvertingLocal] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [conversionSteps, setConversionSteps] = useState<Record<string, 'pending' | 'processing' | 'completed' | 'failed'>>({
    upload: 'pending',
    omr: 'pending',
    musicxml: 'pending',
    midi: 'pending',
    audio: 'pending',
    analysis: 'pending'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Time-based polling resilience: we track WHEN consecutive errors started
  // rather than just counting them.  Render's free tier restarts (OOM kill or
  // dyno cycle) can take 30-60 s.  A count-based limit can be exhausted in
  // seconds when TCP connections are refused immediately.  Instead we allow
  // up to POLLING_ERROR_TIMEOUT_MS of consecutive errors before giving up.
  const pollingErrorCountRef = useRef(0);
  // Timestamp (ms) when the first error in the current consecutive run started.
  // null means no errors are currently running.
  const pollingErrorStartRef = useRef<number | null>(null);
  // 3 minutes — covers OOM-restart + DB reconnect + cache init time.
  const POLLING_ERROR_TIMEOUT_MS = 3 * 60 * 1000;
  // Track the current sessionId synchronously (updated on every render, before
  // effects) so the poll callback can detect navigation to another session and
  // self-cancel rather than writing stale data into the wrong session.
  const currentSessionIdRef = useRef(sessionId);
  currentSessionIdRef.current = sessionId;

  // localStorage key for persisting the active jobId so the polling can resume
  // even after a full page refresh or cross-route navigation.
  const jobLsKey = sessionId ? `treble_conv_job_${sessionId}` : null;

  // Sync state from parent session when loading
  useEffect(() => {
    if (conversionState) {
      if (fileId) {
        setActiveFile({ id: fileId, name: fileName || 'Loaded Score', size: 0 });
      } else {
        setActiveFile(null);
      }
      if (conversionState.steps) {
        setConversionSteps(conversionState.steps);
      }
      setConversionError(conversionState.error || null);
      const isProcessing = conversionState.status === 'processing';
      setIsConvertingLocal(isProcessing);
      onConvertingChange?.(isProcessing);

      // Start/Resume status polling if needed
      if (isProcessing && conversionState.jobId) {
        if (!pollingIntervalRef.current) {
          startStatusPolling(conversionState.jobId);
        }
      } else {
        if (!isProcessing && pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    } else {
      if (fileId) {
        // Preserve fileBlobUrl so re-convert can fetch the original file from
        // Vercel Blob without requiring a fresh upload by the user.
        setActiveFile({ id: fileId, name: fileName || 'Loaded Score', size: 0, blobUrl: fileBlobUrl || undefined });
        setConversionSteps({
          upload: 'completed',
          omr: hasAudio ? 'completed' : 'pending',
          musicxml: hasAudio ? 'completed' : 'pending',
          midi: hasAudio ? 'completed' : 'pending',
          audio: hasAudio ? 'completed' : 'pending',
          analysis: hasAudio ? 'completed' : 'pending'
        });
        setConversionError(null);
        setIsConvertingLocal(false);
        onConvertingChange?.(false);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      } else {
        setActiveFile(null);
        setConversionSteps({
          upload: 'pending',
          omr: 'pending',
          musicxml: 'pending',
          midi: 'pending',
          audio: 'pending',
          analysis: 'pending'
        });
        setConversionError(null);
        setIsConvertingLocal(false);
        onConvertingChange?.(false);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }
  }, [fileId, fileName, hasAudio, fileBlobUrl, conversionState]);

  // Cleanup polling interval on unmount (don't remove localStorage — polling may
  // resume when the user navigates back to this session).
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // On mount (or when sessionId changes), resume polling from localStorage if
  // the context doesn't already have a pending conversionState.  This handles
  // full page refreshes or cross-route navigations where React state is lost.
  useEffect(() => {
    if (!jobLsKey || pollingIntervalRef.current) return;
    // If context already knows about an in-flight conversion, the main effect
    // (above) handles restart — don't double-start here.
    if (conversionState?.status === 'processing') return;
    try {
      const savedJobId = localStorage.getItem(jobLsKey);
      if (savedJobId) {
        console.log('[SheetMusicUploader] resuming polling from localStorage, jobId:', savedJobId);
        setIsConvertingLocal(true);
        onConvertingChange?.(true);
        startStatusPolling(savedJobId);
      }
    } catch { /* localStorage unavailable */ }
  // Only run on sessionId changes, not on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFiles = async (files: FileList) => {
    const file = files[0];

    if (!isVisualScoreFile(file)) {
      toast.error('Please upload a PDF or an image file (JPEG, PNG, WebP, etc.).');
      return;
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsConvertingLocal(false);
    onConvertingChange?.(false);

    const tempId = Date.now().toString();
    setActiveFile({ id: tempId, name: file.name, size: file.size });
    setConversionSteps({
      upload: 'processing',
      omr: 'pending',
      musicxml: 'pending',
      midi: 'pending',
      audio: 'pending',
      analysis: 'pending'
    });
    setConversionError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // 1. Upload
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errBody = await uploadResponse.json().catch(() => ({}));
        throw new Error(errBody.error || 'Upload failed');
      }

      const uploadData = await uploadResponse.json();
      setConversionSteps(prev => ({ ...prev, upload: 'completed', omr: 'pending' }));

      // 2. Process / Preview Generation — pass blobUrl + meta so the server doesn't need disk access
      const processResponse = await fetch('/api/process-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: uploadData.fileId,
          blobUrl: uploadData.blobUrl,
          meta: uploadData.meta,
        }),
      });

      if (!processResponse.ok) {
        const errBody = await processResponse.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to prepare score preview');
      }

      const processData = await processResponse.json();
      const fileRecord = { id: uploadData.fileId, name: file.name, size: file.size, blobUrl: uploadData.blobUrl };
      setActiveFile(fileRecord);
      
      onFileUpload?.(fileRecord);
      onProcessing?.(processData);
    } catch (error: any) {
      console.error('[SheetMusicUploader] upload error:', error);
      setConversionError(error.message || 'File upload failed');
      setConversionSteps(prev => ({ ...prev, upload: 'failed' }));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConvert = async () => {
    if (!activeFile || activeFile.id.startsWith('temp_')) return;

    setConversionError(null);
    const initialSteps = {
      upload: 'completed' as const,
      omr: 'processing' as const,
      musicxml: 'pending' as const,
      midi: 'pending' as const,
      audio: 'pending' as const,
      analysis: 'pending' as const
    };
    setConversionSteps(initialSteps);
    onConvertingChange?.(true);
    setIsConvertingLocal(true);

    try {
      const convertResponse = await fetch('/api/convert-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: activeFile.id,
          blobUrl: activeFile.blobUrl,
          // Pass the user's original filename so the backend stores it instead
          // of the Vercel Blob generated ID (file_1234_abc.png).
          originalName: activeFile.name,
          // Forward the pre-generated UUID so backend uses the same session ID
          // the frontend already knows about — no post-convert migration needed.
          clientSessionId: sessionId,
        }),
      });

      // Guard against non-JSON responses (Vercel/Render platform errors, timeouts).
      // Without this, JSON.parse on "An error occurred..." becomes the visible error message.
      let convertData: any = {};
      const convertCT = convertResponse.headers.get('content-type') || '';
      if (convertCT.includes('application/json')) {
        try {
          convertData = await convertResponse.json();
        } catch {
          throw new Error('Server returned an unreadable response. The pipeline may be warming up — please try again in a moment.');
        }
      } else if (!convertResponse.ok) {
        // Non-JSON error response (platform 502/504 etc.)
        const rawText = await convertResponse.text().catch(() => '');
        throw new Error(
          rawText.replace(/<[^>]+>/g, '').trim().slice(0, 180) ||
          `Conversion request failed (HTTP ${convertResponse.status})`
        );
      }

      if (!convertResponse.ok) {
        throw new Error(convertData.details || convertData.error || 'Conversion start failed');
      }

      const jobId = convertData.jobId;
      onProcessing?.({
        conversionState: {
          jobId,
          steps: initialSteps,
          error: null,
          status: 'processing'
        }
      });
      startStatusPolling(jobId);
    } catch (error: any) {
      console.error('[SheetMusicUploader] convert error:', error);
      const failedSteps = {
        upload: 'completed' as const,
        omr: 'failed' as const,
        musicxml: 'pending' as const,
        midi: 'pending' as const,
        audio: 'pending' as const,
        analysis: 'pending' as const
      };
      setConversionError(error.message || 'Failed to start conversion');
      setConversionSteps(failedSteps);
      onConvertingChange?.(false);
      setIsConvertingLocal(false);
      onProcessing?.({
        conversionState: {
          steps: failedSteps,
          error: error.message || 'Failed to start conversion',
          status: 'failed'
        }
      });
    }
  };

  function stopPolling(clearLs = true) {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (clearLs && jobLsKey) {
      try { localStorage.removeItem(jobLsKey); } catch {}
    }
  }

  function startStatusPolling(jobId: string) {
    stopPolling(false);
    // Persist the jobId so polling can resume after page navigation/refresh.
    if (jobLsKey) {
      try { localStorage.setItem(jobLsKey, jobId); } catch {}
    }
    // Reset error tracking for this new polling session.
    pollingErrorCountRef.current = 0;
    pollingErrorStartRef.current = null;
    // Snapshot the session this poll belongs to.  If the user navigates to a
    // different session while conversion is still running, currentSessionIdRef
    // will be updated on the next render and the mismatch check below will
    // self-cancel the stale interval so it cannot write into the wrong session.
    const pollingForSessionId = currentSessionIdRef.current;

    pollingIntervalRef.current = setInterval(async () => {
      // Abort if the user has navigated away to a different session.
      if (currentSessionIdRef.current !== pollingForSessionId) {
        clearInterval(pollingIntervalRef.current!);
        pollingIntervalRef.current = null;
        return;
      }
      try {
        const response = await fetch(`/api/convert-sheet/status?jobId=${jobId}`, {
          cache: 'no-store'
        });

        // 404 means the job was lost (Render OOM restart erased in-memory state).
        // This is NOT a transient network error — fail immediately so the user
        // knows to retry rather than waiting 3 minutes.
        if (response.status === 404) {
          stopPolling();
          const failedSteps = { ...conversionSteps };
          setConversionError('The server restarted during conversion. Please try converting again.');
          onConvertingChange?.(false);
          setIsConvertingLocal(false);
          onProcessing?.({
            conversionState: {
              jobId,
              steps: failedSteps,
              error: 'The server restarted during conversion. Please try again.',
              status: 'failed'
            }
          });
          return;
        }

        if (!response.ok) {
          throw new Error(`Status check returned ${response.status}`);
        }

        // Successful response — reset error tracking.
        pollingErrorCountRef.current = 0;
        pollingErrorStartRef.current = null;

        const data = await response.json();
        setConversionSteps(data.steps);

        if (data.status === 'completed') {
          stopPolling();
          fetchConversionResults(jobId);
        } else if (data.status === 'failed') {
          stopPolling();
          setConversionError(data.error || 'Conversion pipeline failed');
          onConvertingChange?.(false);
          setIsConvertingLocal(false);
          onProcessing?.({
            conversionState: {
              jobId,
              steps: data.steps,
              error: data.error || 'Conversion pipeline failed',
              status: 'failed'
            }
          });
        } else {
          onProcessing?.({
            conversionState: {
              jobId,
              steps: data.steps,
              error: null,
              status: 'processing'
            }
          });
        }
      } catch (error: any) {
        pollingErrorCountRef.current += 1;
        // Record when consecutive errors first started.
        if (pollingErrorStartRef.current === null) {
          pollingErrorStartRef.current = Date.now();
        }
        const elapsedMs = Date.now() - pollingErrorStartRef.current;
        console.warn(
          `[SheetMusicUploader] status poll error #${pollingErrorCountRef.current} ` +
          `(${Math.round(elapsedMs / 1000)}s elapsed):`,
          error.message
        );

        if (elapsedMs < POLLING_ERROR_TIMEOUT_MS) {
          // Within the tolerance window — keep polling.
          // Render OOM restarts take 30-60 s; POLLING_ERROR_TIMEOUT_MS (3 min) covers them.
          return;
        }

        // Errors have been continuous for too long — give up.
        console.error('[SheetMusicUploader] polling stopped: errors exceeded timeout');
        stopPolling();
        setConversionError('Could not reach the server after several attempts. Please wait and try again.');
        onConvertingChange?.(false);
        setIsConvertingLocal(false);
        onProcessing?.({
          conversionState: {
            jobId,
            steps: conversionSteps,
            error: 'Could not reach the server after several attempts.',
            status: 'failed'
          }
        });
      }
    }, 1500);
  }

  async function fetchConversionResults(jobId: string) {
    try {
      const res = await fetch(`/api/convert-sheet/result?jobId=${jobId}&fileId=${activeFile?.id}`, {
        cache: 'no-store'
      });

      if (!res.ok) {
        // Try to extract a meaningful message from the JSON error body if present
        const errCT = res.headers.get('content-type') || '';
        if (errCT.includes('application/json')) {
          try {
            const errBody = await res.json();
            throw new Error(errBody.details || errBody.error || 'Failed to retrieve finalized conversion assets.');
          } catch (jsonErr: any) {
            // If the JSON itself is malformed, fall through to the generic message
            if (!(jsonErr instanceof SyntaxError)) throw jsonErr;
          }
        }
        throw new Error('Failed to retrieve finalized conversion assets.');
      }

      // Guard against a 200 with a non-JSON body (edge case: Render returns an
      // error page but with status 200 on platform-level failures).
      const resultCT = res.headers.get('content-type') || '';
      if (!resultCT.includes('application/json')) {
        throw new Error('Server returned an unexpected response format. Please try converting again.');
      }

      let resultData: any;
      try {
        resultData = await res.json();
      } catch {
        throw new Error('Server returned an unreadable response. Please try converting again.');
      }
      onProcessing?.({
        ...resultData,
        conversionState: {
          jobId,
          steps: {
            upload: 'completed',
            omr: 'completed',
            musicxml: 'completed',
            midi: 'completed',
            audio: 'completed',
            analysis: 'completed'
          },
          error: null,
          status: 'completed'
        }
      });
      toast.success('Conversion complete! Playback is now ready.');
    } catch (error: any) {
      console.error('[SheetMusicUploader] result retrieval error:', error);
      setConversionError(error.message || 'Failed to load converted assets');
      onProcessing?.({
        conversionState: {
          jobId,
          steps: {
            upload: 'completed',
            omr: 'completed',
            musicxml: 'completed',
            midi: 'completed',
            audio: 'completed',
            analysis: 'completed'
          },
          error: error.message || 'Failed to load converted assets',
          status: 'failed'
        }
      });
    } finally {
      onConvertingChange?.(false);
      setIsConvertingLocal(false);
      // Clear the persisted jobId now that conversion is finished (success or fail).
      if (jobLsKey) {
        try { localStorage.removeItem(jobLsKey); } catch {}
      }
    }
  }

  const handleRemoveFile = () => {
    setActiveFile(null);
    setConversionError(null);
    setConversionSteps({
      upload: 'pending',
      omr: 'pending',
      musicxml: 'pending',
      midi: 'pending',
      audio: 'pending',
      analysis: 'pending'
    });
    stopPolling(); // also clears localStorage
    onFileUpload?.({ id: '', name: '' });
    onProcessing?.(null);
    onConvertingChange?.(false);
    setIsConvertingLocal(false);
  };

  const getStepStatus = (stepKey: 'upload' | 'omr' | 'midi') => {
    if (stepKey === 'upload') {
      return conversionSteps.upload || 'pending';
    }
    if (stepKey === 'omr') {
      const omr = conversionSteps.omr || 'pending';
      const mxml = conversionSteps.musicxml || 'pending';
      if (omr === 'failed' || mxml === 'failed') return 'failed';
      if (omr === 'completed' && mxml === 'completed') return 'completed';
      if (omr === 'processing' || mxml === 'processing' || (omr === 'completed' && mxml === 'pending')) return 'processing';
      return 'pending';
    }
    if (stepKey === 'midi') {
      const midi = conversionSteps.midi || 'pending';
      const audio = conversionSteps.audio || 'pending';
      const analysis = conversionSteps.analysis || 'pending';
      if (midi === 'failed' || audio === 'failed' || analysis === 'failed') return 'failed';
      if (midi === 'completed' && audio === 'completed' && analysis === 'completed') return 'completed';
      if (midi === 'processing' || audio === 'processing' || analysis === 'processing' || 
          (midi === 'completed' && (audio !== 'completed' || analysis !== 'completed'))) return 'processing';
      return 'pending';
    }
    return 'pending';
  };

  const renderStepNode = (stepKey: 'upload' | 'omr' | 'midi', num: number, label: string) => {
    const status = getStepStatus(stepKey);
    return (
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative">
          {status === 'completed' && (
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 flex items-center justify-center bg-card shadow-glow/10 scale-100 transition-all duration-300">
              <Check className="w-3.5 h-3.5" />
            </div>
          )}
          {status === 'processing' && (
            <div className="w-7 h-7 rounded-full bg-primary/20 text-primary border border-primary/35 flex items-center justify-center bg-card shadow-glow/20 scale-105 transition-all duration-300">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
          )}
          {status === 'pending' && (
            <div className="w-7 h-7 rounded-full bg-muted/10 text-muted-foreground border border-border/30 flex items-center justify-center bg-card text-[11px] font-mono font-bold transition-all duration-300">
              {num}
            </div>
          )}
          {status === 'failed' && (
            <div className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 border border-red-500/35 flex items-center justify-center bg-card transition-all duration-300">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
        <span
          className={`text-xs font-semibold whitespace-nowrap transition-colors duration-300 ${
            status === 'completed'
              ? 'text-foreground/80'
              : status === 'processing'
                ? 'text-primary font-bold'
                : status === 'failed'
                  ? 'text-red-400 font-semibold'
                  : 'text-muted-foreground/60'
          }`}
        >
          {label}
        </span>
      </div>
    );
  };

  const renderConnectorLine = (fromKey: 'upload' | 'omr', toKey: 'omr' | 'midi') => {
    const fromStatus = getStepStatus(fromKey);
    const toStatus = getStepStatus(toKey);
    const isCompleted = fromStatus === 'completed';
    const isProcessing = toStatus === 'processing';
    
    return (
      <div 
        className={`w-6 sm:w-10 h-0.5 rounded transition-all duration-500 flex-shrink-0 ${
          isCompleted 
            ? 'bg-emerald-500/50' 
            : isProcessing 
              ? 'bg-gradient-to-r from-emerald-500/30 to-primary/50 animate-pulse' 
              : 'bg-border/20'
        }`}
      />
    );
  };

  const getConvertButtonState = () => {
    if (!activeFile) {
      return {
        label: 'Convert to Audio',
        disabled: true,
        icon: <Music className="w-4 h-4" />,
      };
    }
    const isUploading = conversionSteps.upload === 'processing';
    const isUploadFailed = conversionSteps.upload === 'failed';
    const isProcessing =
      isConvertingLocal ||
      conversionSteps.omr === 'processing' ||
      conversionSteps.musicxml === 'processing' ||
      conversionSteps.midi === 'processing' ||
      conversionSteps.audio === 'processing' ||
      conversionSteps.analysis === 'processing';
    const isCompleted = conversionSteps.analysis === 'completed' && !conversionError;
    const isFailed =
      Boolean(conversionError) ||
      conversionSteps.omr === 'failed' ||
      conversionSteps.musicxml === 'failed' ||
      conversionSteps.midi === 'failed' ||
      conversionSteps.audio === 'failed' ||
      conversionSteps.analysis === 'failed';

    if (isUploading) {
      return {
        label: 'Uploading File...',
        disabled: true,
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
      };
    }
    if (isUploadFailed) {
      return {
        label: 'Upload Failed',
        disabled: true,
        icon: <AlertCircle className="w-4 h-4" />,
      };
    }
    if (isProcessing) {
      return {
        label: 'Converting...',
        disabled: true,
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
      };
    }
    if (isCompleted) {
      return {
        label: 'Re-convert to Audio',
        disabled: false,
        icon: <Music className="w-4 h-4" />,
      };
    }
    if (isFailed) {
      return {
        label: 'Retry Conversion',
        disabled: false,
        icon: <AlertCircle className="w-4 h-4" />,
      };
    }
    return {
      label: 'Convert to Audio',
      disabled: false,
      icon: <Music className="w-4 h-4" />,
    };
  };

  const btnState = getConvertButtonState();

  // ── Compact strip (Studio right panel) ─────────────────────────────────────
  if (compact) {
    const isConverting = isConvertingLocal;
    const isFullyDone = !isConverting && !conversionError && conversionSteps.analysis === 'completed';
    const hasFailed   = !isConverting && Boolean(conversionError);
    const needsConvert = !isConverting && !isFullyDone && activeFile && conversionSteps.upload === 'completed';

    return (
      <div className="w-full flex items-center gap-2 px-3 py-2 border-b border-border/20 bg-card/20 min-h-[44px]">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.heic,.avif,.svg,application/pdf,image/*"
          className="hidden"
        />

        {!activeFile ? (
          /* No file yet — show upload button */
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold border border-primary/20 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Sheet Music
          </button>
        ) : (
          <>
            {/* File name pill */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
              <Music className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs text-foreground truncate font-medium" title={activeFile.name}>
                {activeFile.name}
              </span>
            </div>

            {/* Status badge */}
            {isConverting && (
              <span className="flex items-center gap-1 text-xs text-primary shrink-0">
                <Loader2 className="w-3 h-3 animate-spin" />
                Converting…
              </span>
            )}
            {hasFailed && (
              <span className="flex items-center gap-1 text-xs text-red-400 shrink-0">
                <AlertCircle className="w-3 h-3" />
                Error
              </span>
            )}
            {isFullyDone && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 shrink-0">
                <Check className="w-3 h-3" />
                Ready
              </span>
            )}

            {/* Action: Convert / Retry / Re-convert */}
            {(needsConvert || hasFailed || isFullyDone) && (
              <button
                type="button"
                onClick={handleConvert}
                disabled={isConverting}
                className="text-xs text-primary/80 hover:text-primary font-semibold shrink-0 disabled:opacity-40 transition-colors px-1.5"
              >
                {hasFailed ? 'Retry' : isFullyDone ? 'Re-convert' : 'Convert'}
              </button>
            )}

            {/* Change file */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isConverting}
              className="text-xs text-muted-foreground hover:text-foreground font-medium shrink-0 disabled:opacity-40 transition-colors"
            >
              Change
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-4 rounded-xl bg-card/25 border border-border/30 shadow-sm animate-fade-in relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.heic,.avif,.svg,application/pdf,image/*"
          className="hidden"
        />

        {/* Left side: Upload Button & File Details */}
        <div className="flex flex-wrap items-center gap-4">
          {!activeFile ? (
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-primary hover:shadow-glow text-white font-semibold flex items-center gap-2 px-5 py-2.5 h-11 transition-all duration-200"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Sheet Music</span>
            </Button>
          ) : (
            <div className="flex items-center gap-3 bg-card/50 px-4 py-2 rounded-lg border border-border/20">
              <div className="p-2 rounded bg-primary/10 text-primary">
                <Music className="w-4 h-4" />
              </div>
              <div className="min-w-0 max-w-[200px] sm:max-w-[300px]">
                <h5 className="text-xs font-semibold text-foreground truncate" title={activeFile.name}>
                  {activeFile.name}
                </h5>
                <p className="text-[10px] text-muted-foreground">
                  {activeFile.size > 0 ? `${(activeFile.size / 1024).toFixed(1)} KB` : 'Loaded score'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                disabled={isConvertingLocal}
                className="p-1 hover:bg-card/85 rounded-lg transition-colors flex-shrink-0 disabled:opacity-40"
                aria-label="Remove File"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-red-400" />
              </button>
            </div>
          )}

          {/* Action Button (only shown when a file is loaded) */}
          {activeFile && (
            <Button
              type="button"
              onClick={handleConvert}
              disabled={btnState.disabled}
              className="bg-gradient-primary hover:shadow-glow text-white font-semibold flex items-center gap-2 px-4 py-2.5 h-11 transition-all duration-200 disabled:opacity-50"
            >
              {btnState.icon}
              <span>{btnState.label}</span>
            </Button>
          )}
        </div>

        {/* Right side: Horizontal Progress Stepper */}
        <div className="flex items-center gap-4 overflow-x-auto py-1 scrollbar-none">
          {/* Step 1: File Upload */}
          {renderStepNode('upload', 1, 'File Upload')}
          {renderConnectorLine('upload', 'omr')}

          {/* Step 2: OMR Processing */}
          {renderStepNode('omr', 2, 'OMR Processing')}
          {renderConnectorLine('omr', 'midi')}

          {/* Step 3: MIDI & Audio */}
          {renderStepNode('midi', 3, 'MIDI & Audio')}
        </div>
      </div>

      {/* Error message inline underneath if failed */}
      {conversionError && (
        <div className="w-full text-xs text-red-400 flex items-center gap-2 bg-red-500/5 p-3 rounded-lg border border-red-500/15">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{conversionError}</span>
        </div>
      )}
    </div>
  );
}
