'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Check, Loader2, Music, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SheetMusicUploaderProps {
  fileId?: string;
  fileName?: string;
  hasAudio?: boolean;
  conversionState?: {
    jobId?: string;
    steps?: Record<string, 'pending' | 'processing' | 'completed' | 'failed'>;
    error?: string | null;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
  } | null;
  onFileUpload?: (file: { id: string; name: string }) => void;
  onProcessing?: (metadata: any) => void;
  onConvertingChange?: (converting: boolean) => void;
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
  conversionState,
  onFileUpload,
  onProcessing,
  onConvertingChange,
}: SheetMusicUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [activeFile, setActiveFile] = useState<{ id: string; name: string; size: number } | null>(null);
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
        setActiveFile({ id: fileId, name: fileName || 'Loaded Score', size: 0 });
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
  }, [fileId, fileName, hasAudio, conversionState]);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

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

      // 2. Process / Preview Generation
      const processResponse = await fetch('/api/process-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: uploadData.fileId }),
      });

      if (!processResponse.ok) {
        const errBody = await processResponse.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to prepare score preview');
      }

      const processData = await processResponse.json();
      const fileRecord = { id: uploadData.fileId, name: file.name, size: file.size };
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
        body: JSON.stringify({ fileId: activeFile.id }),
      });

      const convertData = await convertResponse.json();

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

  function startStatusPolling(jobId: string) {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/convert-sheet/status?jobId=${jobId}`, {
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error('Failed to query conversion status');
        }

        const data = await response.json();
        setConversionSteps(data.steps);

        if (data.status === 'completed') {
          clearInterval(pollingIntervalRef.current!);
          pollingIntervalRef.current = null;
          fetchConversionResults(jobId);
        } else if (data.status === 'failed') {
          clearInterval(pollingIntervalRef.current!);
          pollingIntervalRef.current = null;
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
        console.error('[SheetMusicUploader] status polling error:', error);
        clearInterval(pollingIntervalRef.current!);
        pollingIntervalRef.current = null;
        setConversionError(error.message || 'Status polling failed');
        onConvertingChange?.(false);
        setIsConvertingLocal(false);
        onProcessing?.({
          conversionState: {
            jobId,
            steps: conversionSteps,
            error: error.message || 'Status polling failed',
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
        throw new Error('Failed to retrieve finalized conversion assets.');
      }

      const resultData = await res.json();
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
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
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
