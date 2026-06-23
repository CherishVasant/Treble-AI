'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Check, Loader2, Music, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SheetMusicUploaderProps {
  fileId?: string;
  fileName?: string;
  hasAudio?: boolean;
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
    }
  }, [fileId, fileName, hasAudio]);

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
    setConversionSteps(prev => ({
      ...prev,
      omr: 'processing',
      musicxml: 'pending',
      midi: 'pending',
      audio: 'pending',
      analysis: 'pending'
    }));
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
      startStatusPolling(jobId);
    } catch (error: any) {
      console.error('[SheetMusicUploader] convert error:', error);
      setConversionError(error.message || 'Failed to start conversion');
      setConversionSteps(prev => ({ ...prev, omr: 'failed' }));
      onConvertingChange?.(false);
      setIsConvertingLocal(false);
    }
  };

  const startStatusPolling = (jobId: string) => {
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
        }
      } catch (error: any) {
        console.error('[SheetMusicUploader] status polling error:', error);
        clearInterval(pollingIntervalRef.current!);
        pollingIntervalRef.current = null;
        setConversionError(error.message || 'Status polling failed');
        onConvertingChange?.(false);
        setIsConvertingLocal(false);
      }
    }, 1500);
  };

  const fetchConversionResults = async (jobId: string) => {
    try {
      const res = await fetch(`/api/convert-sheet/result?jobId=${jobId}&fileId=${activeFile?.id}`, {
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve finalized conversion assets.');
      }

      const resultData = await res.json();
      onProcessing?.(resultData);
      toast.success('Conversion complete! Playback is now ready.');
    } catch (error: any) {
      console.error('[SheetMusicUploader] result retrieval error:', error);
      setConversionError(error.message || 'Failed to load converted assets');
    } finally {
      onConvertingChange?.(false);
      setIsConvertingLocal(false);
    }
  };

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

  const stepsList = [
    { key: 'upload', label: activeFile ? 'File Upload' : 'Waiting for file' },
    { key: 'omr', label: 'OMR Processing' },
    { key: 'musicxml', label: 'MusicXML Processing' },
    { key: 'midi', label: 'Analysis' },
    { key: 'audio', label: 'Playback Generation' },
    { key: 'analysis', label: 'Complete' }
  ];

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
    <div className="space-y-4">
      {/* Upload Dropzone Area (Always visible) */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`p-6 rounded-xl border-2 border-dashed text-center transition-all duration-300 ${
          dragActive
            ? 'border-primary bg-primary/5 shadow-glow'
            : 'border-border/30 bg-card/25 hover:border-border/60 hover:bg-card/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.heic,.avif,.svg,application/pdf,image/*"
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-3 rounded-lg bg-gradient-primary/10 border border-primary/20 shadow-glow">
            <Upload className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Drop score file</h3>
            <p className="text-xs text-muted-foreground mt-1">
              or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-primary hover:underline font-medium"
              >
                browse files
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Stepper and Action Button Details (Always visible) */}
      <div className="p-4 rounded-xl bg-card/40 border border-border/30 animate-slide-up shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full pointer-events-none" />

        {/* Active File Details Header */}
        {activeFile ? (
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0 flex-1">
              <h5 className="text-sm font-semibold text-foreground truncate" title={activeFile.name}>
                {activeFile.name}
              </h5>
              <p className="text-[11px] text-muted-foreground">
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
              <X className="w-4 h-4 text-muted-foreground hover:text-red-400" />
            </button>
          </div>
        ) : (
          <div className="mb-4">
            <h5 className="text-sm font-semibold text-muted-foreground/60 italic">
              No score file loaded
            </h5>
          </div>
        )}

        {/* Stepper progress stages */}
        <div className="space-y-3 border-t border-border/20 pt-4">
          <h6 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Processing Progress
          </h6>
          <div className="relative pl-1 space-y-4">
            {/* Vertical timeline connector line linking all step circles */}
            <div className="absolute left-[9px] top-2.5 bottom-2.5 w-[2px] bg-border/20 rounded" />
            
            {stepsList.map((step, idx) => {
              const stepStatus = conversionSteps[step.key] || 'pending';

              return (
                <div key={step.key} className="flex items-center gap-3 text-xs relative z-10 transition-all duration-300">
                  <div className="flex-shrink-0 relative">
                    {stepStatus === 'completed' && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center bg-card shadow-glow/10 scale-100 transition-all duration-300 animate-[scale-in_0.2s_ease-out]">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    {stepStatus === 'processing' && (
                      <div className="w-5 h-5 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center bg-card shadow-glow/20 scale-110 transition-all duration-300 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                      </div>
                    )}
                    {stepStatus === 'pending' && (
                      <div className="w-5 h-5 rounded-full bg-muted/10 text-muted border border-border/30 flex items-center justify-center bg-card text-[10px] font-mono font-bold transition-all duration-300">
                        {idx + 1}
                      </div>
                    )}
                    {stepStatus === 'failed' && (
                      <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center bg-card transition-all duration-300">
                        <AlertCircle className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <span
                    className={`font-medium transition-colors duration-300 ${
                      stepStatus === 'completed'
                        ? 'text-foreground/80'
                        : stepStatus === 'processing'
                          ? 'text-primary animate-pulse font-semibold'
                          : stepStatus === 'failed'
                            ? 'text-red-400 font-semibold'
                            : 'text-muted-foreground/60'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Trigger Convert Button (Always rendered) */}
        <div className="mt-4">
          <Button
            type="button"
            onClick={handleConvert}
            disabled={btnState.disabled}
            className="w-full bg-gradient-primary hover:shadow-glow text-white font-semibold transition-all duration-200 py-2.5 h-10 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {btnState.icon}
            {btnState.label}
          </Button>
        </div>

        {conversionError && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Conversion Failed</span>
                {conversionError}
              </div>
            </div>
            <Button
              type="button"
              onClick={handleConvert}
              variant="ghost"
              className="w-full border border-red-500/30 text-[10px] h-7 bg-red-500/5 hover:bg-red-500/25 text-red-400 font-bold"
            >
              Retry Conversion
            </Button>
          </div>
        )}

        {conversionSteps.analysis === 'completed' && !isConvertingLocal && activeFile && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 flex items-center gap-1.5 font-semibold">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            Score converted! Audio is ready for playback.
          </div>
        )}
      </div>
    </div>
  );
}
