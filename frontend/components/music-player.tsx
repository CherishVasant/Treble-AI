'use client';

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Loader2, Upload, Check, AlertCircle, X, Music, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface MusicPlayerRef {
  seekTo: (time: number) => void;
  play: () => void;
  pause: () => void;
}

interface MusicPlayerProps {
  audioUrl?: string;
  title?: string;
  composer?: string;
  isConverting?: boolean;
  className?: string;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onIsPlayingChange?: (isPlaying: boolean) => void;
  // Upload/Conversion callbacks
  onFileUpload?: (file: { id: string; name: string }) => void;
  onMetadataUpdate?: (metadata: any) => void;
  onConvertingChange?: (converting: boolean) => void;
  fileId?: string;
  // Looping props
  isLooping?: boolean;
  loopStartMeasure?: number;
  loopEndMeasure?: number;
  onLoopToggle?: () => void;
  onLoopStartChange?: (measure: number) => void;
  onLoopEndChange?: (measure: number) => void;
  secondsPerMeasure?: number;
  measuresMap?: any[];
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

const MusicPlayer = forwardRef<MusicPlayerRef, MusicPlayerProps>(({
  audioUrl,
  title = 'No music loaded',
  composer = 'Unknown',
  isConverting = false,
  className = '',
  onTimeUpdate,
  onDurationChange,
  onIsPlayingChange,
  onFileUpload,
  onMetadataUpdate,
  onConvertingChange,
  fileId,
  isLooping = false,
  loopStartMeasure = 1,
  loopEndMeasure = 8,
  onLoopToggle,
  onLoopStartChange,
  onLoopEndChange,
  secondsPerMeasure = 2.0,
  measuresMap = [],
}, ref) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const isSeekingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // Uploader & Stepper State
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activeFile, setActiveFile] = useState<{ id: string; name: string; size: number } | null>(null);
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

  const volumeRef = useRef(volume);
  const playbackSpeedRef = useRef(playbackSpeed);
  volumeRef.current = volume;
  playbackSpeedRef.current = playbackSpeed;

  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onDurationChangeRef = useRef(onDurationChange);
  const onIsPlayingChangeRef = useRef(onIsPlayingChange);

  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  currentTimeRef.current = currentTime;
  durationRef.current = duration;

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  useEffect(() => {
    onDurationChangeRef.current = onDurationChange;
  }, [onDurationChange]);

  useEffect(() => {
    onIsPlayingChangeRef.current = onIsPlayingChange;
  }, [onIsPlayingChange]);

  const hasAudio = Boolean(audioUrl);

  const syncDuration = useCallback((audio: HTMLAudioElement) => {
    if (Number.isFinite(audio.duration) && audio.duration > 0 && Math.abs(durationRef.current - audio.duration) >= 0.01) {
      durationRef.current = audio.duration;
      setDuration(audio.duration);
    }
  }, []);
  
  // Helper to compute start and end times in seconds from measuresMap
  const getPlayRangeTimes = useCallback(() => {
    let startTime = (loopStartMeasure - 1) * secondsPerMeasure;
    let endTime = loopEndMeasure * secondsPerMeasure;

    if (Array.isArray(measuresMap) && measuresMap.length > 0) {
      const startEntry = measuresMap.find((m: any) => m.measure_number === loopStartMeasure);
      if (startEntry) {
        startTime = startEntry.start_time;
      }
      const endEntry = measuresMap.find((m: any) => m.measure_number === loopEndMeasure);
      if (endEntry) {
        endTime = endEntry.end_time;
      }
    }

    return { startTime, endTime };
  }, [loopStartMeasure, loopEndMeasure, secondsPerMeasure, measuresMap]);

  const syncCurrentTime = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || isSeekingRef.current) return;
    
    let newTime = audio.currentTime;
    
    // Play Range Limit Enforcement (Synchronous and lag-free)
    const { endTime } = getPlayRangeTimes();
    const effectiveEndTime = Math.max(0, endTime - 0.05); // Stop 50ms early to avoid next measure buffer trigger
    
    if (newTime >= effectiveEndTime && !audio.paused) {
      audio.pause();
      audio.currentTime = effectiveEndTime;
      newTime = effectiveEndTime;
    }

    if (Math.abs(currentTimeRef.current - newTime) >= 0.01) {
      currentTimeRef.current = newTime;
      setCurrentTime(newTime);
      onTimeUpdateRef.current?.(newTime);
    }

    if (Number.isFinite(audio.duration) && audio.duration > 0 && Math.abs(durationRef.current - audio.duration) >= 0.01) {
      durationRef.current = audio.duration;
      setDuration(audio.duration);
      onDurationChangeRef.current?.(audio.duration);
    }
  }, [getPlayRangeTimes]);

  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      seekTo(time);
    },
    play: () => {
      audioRef.current?.play().catch((err) => console.error('[MusicPlayer] Play error:', err));
    },
    pause: () => {
      audioRef.current?.pause();
    },
  }));

  // Trigger callbacks using stable refs to prevent render loops
  useEffect(() => {
    onIsPlayingChangeRef.current?.(isPlaying);
  }, [isPlaying]);

  // Handle active file ID sync from parent
  useEffect(() => {
    if (fileId && (!activeFile || activeFile.id !== fileId)) {
      setActiveFile({ id: fileId, name: title, size: 0 });
      setConversionSteps({
        upload: 'completed',
        omr: audioUrl ? 'completed' : 'pending',
        musicxml: audioUrl ? 'completed' : 'pending',
        midi: audioUrl ? 'completed' : 'pending',
        audio: audioUrl ? 'completed' : 'pending',
        analysis: audioUrl ? 'completed' : 'pending'
      });
      setConversionError(null);
    } else if (!fileId) {
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
  }, [fileId, title, audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) {
      setIsPlaying(false);
      currentTimeRef.current = 0;
      durationRef.current = 0;
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    setIsPlaying(false);
    currentTimeRef.current = 0;
    durationRef.current = 0;
    setCurrentTime(0);
    setDuration(0);

    const handleDuration = () => syncDuration(audio);
    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.volume = volumeRef.current / 100;
    audio.playbackRate = playbackSpeedRef.current;

    audio.addEventListener('loadedmetadata', handleDuration);
    audio.addEventListener('durationchange', handleDuration);
    audio.addEventListener('loadeddata', handleDuration);
    audio.addEventListener('canplay', handleDuration);
    audio.addEventListener('timeupdate', syncCurrentTime);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    audio.load();

    syncDuration(audio);

    return () => {
      audio.removeEventListener('loadedmetadata', handleDuration);
      audio.removeEventListener('durationchange', handleDuration);
      audio.removeEventListener('loadeddata', handleDuration);
      audio.removeEventListener('canplay', handleDuration);
      audio.removeEventListener('timeupdate', syncCurrentTime);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioUrl, syncCurrentTime, syncDuration]);

  useEffect(() => {
    if (!isPlaying) return;

    let frame = 0;
    const tick = () => {
      syncCurrentTime();
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, syncCurrentTime]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  const handlePlayPause = () => {
    if (!hasAudio || isConverting) return;

    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      const { startTime, endTime } = getPlayRangeTimes();
      const effectiveEndTime = Math.max(0, endTime - 0.05);
      
      // If playhead is outside the range, jump to the start of the range before playing
      if (audio.currentTime < startTime || audio.currentTime >= effectiveEndTime) {
        audio.currentTime = startTime;
        currentTimeRef.current = startTime;
        setCurrentTime(startTime);
        onTimeUpdateRef.current?.(startTime);
      }

      audio.play().catch((err) => {
        console.error('[MusicPlayer] Playback error:', err);
      });
    }
  };

  const seekTo = (time: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(time)) return;

    const maxTime = duration > 0 ? duration : audio.duration;
    const clamped = Math.max(0, Math.min(time, maxTime || 0));
    audio.currentTime = clamped;
    currentTimeRef.current = clamped;
    setCurrentTime(clamped);
  };

  const handleSeekInput = (e: React.FormEvent<HTMLInputElement>) => {
    seekTo(parseFloat(e.currentTarget.value));
  };

  const handleSeekStart = () => {
    isSeekingRef.current = true;
  };

  const handleSeekEnd = (e: React.SyntheticEvent<HTMLInputElement>) => {
    seekTo(parseFloat(e.currentTarget.value));
    isSeekingRef.current = false;
  };

  const handleVolumeInput = (e: React.FormEvent<HTMLInputElement>) => {
    const vol = Math.min(100, Math.max(0, parseInt(e.currentTarget.value, 10) || 0));
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol / 100;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Uploader Drag and Drop Handlers
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

    // Set initial file record
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

      // 1. Upload File
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

      // 2. Process Score (Preview Generation)
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
      setConversionSteps(prev => ({ ...prev, upload: 'completed' }));

      onFileUpload?.(fileRecord);
      onMetadataUpdate?.(processData);
    } catch (error: any) {
      console.error('[MusicPlayer] upload error:', error);
      setConversionError(error.message || 'File upload failed');
      setConversionSteps(prev => ({ ...prev, upload: 'failed' }));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Convert File (Poll Background Stepper)
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
      console.error('[MusicPlayer] conversion trigger error:', error);
      setConversionError(error.message || 'Failed to start conversion');
      setConversionSteps(prev => ({ ...prev, omr: 'failed' }));
      onConvertingChange?.(false);
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
        
        // Update steps state
        setConversionSteps(data.steps);

        if (data.status === 'completed') {
          // Polling finished successfully!
          clearInterval(pollingIntervalRef.current!);
          pollingIntervalRef.current = null;
          
          // Fetch final result metadata/urls
          fetchConversionResults(jobId);
        } else if (data.status === 'failed') {
          // Polling finished with error
          clearInterval(pollingIntervalRef.current!);
          pollingIntervalRef.current = null;
          setConversionError(data.error || 'Conversion pipeline failed');
          onConvertingChange?.(false);
        }
      } catch (error: any) {
        console.error('[MusicPlayer] status polling error:', error);
        clearInterval(pollingIntervalRef.current!);
        pollingIntervalRef.current = null;
        setConversionError(error.message || 'Status polling failed');
        onConvertingChange?.(false);
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
      onMetadataUpdate?.(resultData);
      toast.success('Conversion complete! Playback is now ready.');
    } catch (error: any) {
      console.error('[MusicPlayer] result retrieval error:', error);
      setConversionError(error.message || 'Failed to load converted assets');
    } finally {
      onConvertingChange?.(false);
    }
  };

  const clearActiveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveFile(null);
    onFileUpload?.({ id: '', name: '' });
    onMetadataUpdate?.(null);
    setConversionSteps({
      upload: 'pending',
      omr: 'pending',
      musicxml: 'pending',
      midi: 'pending',
      audio: 'pending',
      analysis: 'pending'
    });
    setConversionError(null);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    onConvertingChange?.(false);
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  // Stepper Visual Nodes Config
  const stepsList = [
    { key: 'upload', label: 'Upload' },
    { key: 'omr', label: 'OMR' },
    { key: 'musicxml', label: 'XML' },
    { key: 'midi', label: 'MIDI' },
    { key: 'audio', label: 'Audio' },
    { key: 'analysis', label: 'Analysis' }
  ];

  return (
    <div className={`glass rounded-xl p-4 border border-border/30 relative flex flex-col justify-between ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="auto" className="hidden" />

      {/* Seek Progress Bar */}
      <div className="mb-4 space-y-2">
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 100}
          step={0.1}
          value={duration > 0 ? currentTime : 0}
          onInput={handleSeekInput}
          onChange={handleSeekInput}
          onPointerDown={handleSeekStart}
          onPointerUp={handleSeekEnd}
          onPointerCancel={handleSeekEnd}
          onKeyUp={handleSeekEnd}
          disabled={!hasAudio || isConverting || duration <= 0}
          aria-label="Seek playback position"
          className="music-player-seek music-player-seek--progress w-full cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ '--range-progress': `${progressPercent}%` } as React.CSSProperties}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Control Buttons row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Play/Pause Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            disabled={!hasAudio || isConverting}
            className="p-3 rounded-lg bg-gradient-primary hover:shadow-glow text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>
        </div>

        {/* Loop controls (Play Range) */}
        {hasAudio && (
          <div className="flex items-center gap-2 border-l border-r border-border/20 px-4">
            <span className="text-xs text-muted-foreground font-semibold">Measure:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                value={loopStartMeasure}
                onChange={(e) => onLoopStartChange?.(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 h-8 px-1.5 text-center bg-card/50 border border-border/30 rounded text-xs text-foreground focus:outline-none focus:border-primary font-semibold"
                title="Start Measure"
              />
              <span className="text-xs text-muted-foreground font-semibold">to</span>
              <input
                type="number"
                min={loopStartMeasure}
                value={loopEndMeasure}
                onChange={(e) => onLoopEndChange?.(Math.max(loopStartMeasure, parseInt(e.target.value) || loopStartMeasure))}
                className="w-12 h-8 px-1.5 text-center bg-card/50 border border-border/30 rounded text-xs text-foreground focus:outline-none focus:border-primary font-semibold"
                title="End Measure"
              />
            </div>
          </div>
        )}

        {/* Speed Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-semibold">Speed:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            disabled={!hasAudio || isConverting}
            className="bg-card border border-border/30 rounded px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-40 font-semibold"
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-2 min-w-[7.5rem]">
          <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={volume}
            onInput={handleVolumeInput}
            onChange={handleVolumeInput}
            disabled={!hasAudio || isConverting}
            aria-label="Volume"
            aria-valuetext={`${volume} percent`}
            className="music-player-seek music-player-seek--volume w-full min-w-[5rem] cursor-pointer disabled:opacity-40"
            style={{ '--range-progress': `${volume}%` } as React.CSSProperties}
          />
        </div>
      </div>
    </div>
  );
});

MusicPlayer.displayName = 'MusicPlayer';

export default MusicPlayer;
