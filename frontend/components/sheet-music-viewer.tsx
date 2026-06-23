'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Music2, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type SheetPreviewKind = 'pdf' | 'image';

interface SheetMusicViewerProps {
  xmlData?: string;
  musicXmlUrl?: string;
  fileId?: string;
  previewUrl?: string;
  previewKind?: SheetPreviewKind;
  className?: string;
  currentTime?: number;
  isPlaying?: boolean;
  secondsPerMeasure?: number;
  onMeasureClick?: (measure: number) => void;
  loopStartMeasure?: number;
  loopEndMeasure?: number;
  isLooping?: boolean;
  onLoopToggle?: () => void;
  onLoopStartChange?: (val: number) => void;
  onLoopEndChange?: (val: number) => void;
}

export default function SheetMusicViewer({
  xmlData,
  musicXmlUrl,
  fileId,
  previewUrl,
  previewKind,
  className = '',
  currentTime = 0,
  isPlaying = false,
  secondsPerMeasure = 2,
  onMeasureClick,
  loopStartMeasure = 1,
  loopEndMeasure = 8,
  isLooping = false,
  onLoopToggle,
  onLoopStartChange,
  onLoopEndChange,
}: SheetMusicViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [osmdFailed, setOsmdFailed] = useState(false);
  const osmdRef = useRef<any>(null);

  // Reset fallback state when xml inputs change
  useEffect(() => {
    setOsmdFailed(false);
  }, [xmlData, musicXmlUrl]);

  // Viewer options
  const [zoom, setZoom] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const showOsmd = Boolean((xmlData || musicXmlUrl) && !osmdFailed);
  const showRasterOrPdf = Boolean(previewUrl && previewKind && !showOsmd);

  // Initialize and load sheet music
  useEffect(() => {
    if (!showOsmd) return;
    if (!xmlData && !musicXmlUrl) return;

    const initializeOSMD = async () => {
      setLoading(true);
      setError(null);

      try {
        const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay');

        if (!containerRef.current) {
          throw new Error('Container not found');
        }

        containerRef.current.innerHTML = '';

        const osmd = new OpenSheetMusicDisplay(containerRef.current, {
          backend: 'canvas',
          autoResize: true,
        });

        try {
          if (xmlData) {
            await osmd.load(xmlData);
          } else if (musicXmlUrl) {
            const response = await fetch(musicXmlUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch MusicXML: ${response.statusText}`);
            }
            const xmlText = await response.text();
            await osmd.load(xmlText);
          }

          osmd.Zoom = zoom;
          osmd.render();
          osmdRef.current = osmd;
        } catch (loadError) {
          console.error('[SheetMusicViewer] OSMD load error:', loadError);
          throw new Error('Failed to load sheet music XML');
        }
      } catch (err) {
        console.error('[SheetMusicViewer] OSMD init error:', err);
        setOsmdFailed(true);
        setError(err instanceof Error ? err.message : 'Failed to initialize sheet music viewer');
      } finally {
        setLoading(false);
      }
    };

    initializeOSMD();
  }, [xmlData, musicXmlUrl, showOsmd]);

  // Handle zoom changes
  useEffect(() => {
    if (osmdRef.current) {
      try {
        osmdRef.current.Zoom = zoom;
        osmdRef.current.render();
      } catch (err) {
        console.warn('[SheetMusicViewer] Zoom render error:', err);
      }
    }
  }, [zoom]);

  // Sync cursor highlight with currentTime
  useEffect(() => {
    if (!osmdRef.current || secondsPerMeasure <= 0) return;

    const activeMeasure = Math.floor(currentTime / secondsPerMeasure) + 1;
    const maxMeasure = osmdRef.current.Sheet?.SourceMeasures?.length || 100;
    const clampedMeasure = Math.max(1, Math.min(activeMeasure, maxMeasure));

    try {
      if (isPlaying) {
        osmdRef.current.cursor.show();
        osmdRef.current.cursor.goToMeasure(clampedMeasure);
      }
    } catch (e) {
      console.warn('[SheetMusicViewer] Cursor sync error:', e);
    }
  }, [currentTime, isPlaying, secondsPerMeasure]);

  // Hide cursor when paused
  useEffect(() => {
    if (!isPlaying && osmdRef.current) {
      try {
        osmdRef.current.cursor.hide();
      } catch (e) {}
    }
  }, [isPlaying]);

  const activeMeasure = secondsPerMeasure > 0 ? Math.floor(currentTime / secondsPerMeasure) + 1 : 1;

  const empty = !showRasterOrPdf && !showOsmd && !loading && !error;

  const contentLayout = (
    <div className="relative min-h-[400px] flex-1 flex flex-col bg-background/40">
      {loading && showOsmd && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading sheet music rendering...</p>
          </div>
        </div>
      )}

      {error && showOsmd && (
        <div className="p-6 text-center flex-1 flex flex-col items-center justify-center">
          <div className="inline-block p-4 rounded-lg bg-red-500/10 border border-red-500/30 mb-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Try converting again or uploading another file
          </p>
        </div>
      )}

      {empty && (
        <div className="p-12 flex flex-col items-center justify-center text-center flex-1 min-h-[350px]">
          <div className="p-4 rounded-lg bg-primary/10 mb-4">
            <Music2 className="w-8 h-8 text-primary mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No score loaded</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Upload a PDF or image of your sheet music from the score panel below to view it here.
          </p>
        </div>
      )}

      {showRasterOrPdf && previewUrl && previewKind === 'image' && (
        <div className="p-4 flex justify-center bg-black/20 overflow-auto flex-1 max-h-[720px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Uploaded sheet music"
            className="max-w-full h-auto object-contain rounded-md shadow-sm"
          />
        </div>
      )}

      {showRasterOrPdf && previewUrl && previewKind === 'pdf' && (
        <div className="w-full flex-1 bg-black/20" style={{ minHeight: 'min(70vh, 600px)' }}>
          <iframe
            title="PDF sheet music"
            src={previewUrl}
            className="w-full h-full min-h-[600px] border-0 bg-background"
          />
        </div>
      )}

      {showOsmd && (
        <div
          ref={containerRef}
          className={`w-full overflow-auto p-4 flex-1 ${!loading && !error ? 'bg-white rounded-lg' : ''}`}
        />
      )}
    </div>
  );

  return (
    <>
      <div
        className={`rounded-xl bg-card/30 border border-border/30 overflow-hidden flex flex-col ${isFullscreen ? 'hidden' : className}`}
      >
        {/* Header Controls Bar */}
        <div className="px-6 py-4 border-b border-border/30 flex flex-wrap items-center justify-between gap-4 bg-card/10">
          <div className="flex items-center gap-3">
            <Music2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Score Viewer</h2>
            {showOsmd && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Measure {activeMeasure}
              </span>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-4">
            {/* Loop controls */}
            {showOsmd && (
              <div className="flex items-center gap-2 border-r border-border/30 pr-4">
                <Button
                  size="sm"
                  variant={isLooping ? 'default' : 'outline'}
                  onClick={onLoopToggle}
                  className={`h-8 gap-1.5 ${isLooping ? 'bg-gradient-primary text-white border-transparent' : 'border-border/50 text-muted-foreground'}`}
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isLooping ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
                  Loop
                </Button>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    value={loopStartMeasure}
                    onChange={(e) => onLoopStartChange?.(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 h-8 px-1 text-center bg-card/50 border border-border/30 rounded text-xs text-foreground focus:outline-none focus:border-primary"
                    title="Loop Start Measure"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input
                    type="number"
                    min={loopStartMeasure}
                    value={loopEndMeasure}
                    onChange={(e) => onLoopEndChange?.(Math.max(loopStartMeasure, parseInt(e.target.value) || loopStartMeasure))}
                    className="w-12 h-8 px-1 text-center bg-card/50 border border-border/30 rounded text-xs text-foreground focus:outline-none focus:border-primary"
                    title="Loop End Measure"
                  />
                </div>
              </div>
            )}

            {/* Zoom controls */}
            {showOsmd && (
              <div className="flex items-center gap-1.5 border-r border-border/30 pr-4">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.15))}
                  className="w-8 h-8 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs font-mono w-10 text-center text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setZoom((prev) => Math.min(2.0, prev + 0.15))}
                  className="w-8 h-8 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            )}

            <Button
              size="icon"
              variant="outline"
              onClick={() => setIsFullscreen(true)}
              className="w-8 h-8 rounded-lg border-border/40 hover:bg-card text-muted-foreground hover:text-foreground"
              title="Fullscreen Mode"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {contentLayout}
      </div>

      {/* Fullscreen Overlay Mode */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-background/98 p-6 flex flex-col animate-fade-in">
          <div className="flex items-center justify-between border-b border-border/30 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <Music2 className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Score Viewer (Fullscreen)</h2>
              {showOsmd && (
                <span className="text-sm px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Measure {activeMeasure}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              {showOsmd && (
                <div className="flex items-center gap-2 border-r border-border/30 pr-4">
                  <Button
                    size="sm"
                    variant={isLooping ? 'default' : 'outline'}
                    onClick={onLoopToggle}
                    className={`h-8 gap-1.5 ${isLooping ? 'bg-gradient-primary text-white' : ''}`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Loop Playback
                  </Button>
                  <input
                    type="number"
                    min={1}
                    value={loopStartMeasure}
                    onChange={(e) => onLoopStartChange?.(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 h-8 bg-card border border-border/30 rounded text-center text-xs text-foreground focus:outline-none"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input
                    type="number"
                    min={loopStartMeasure}
                    value={loopEndMeasure}
                    onChange={(e) => onLoopEndChange?.(Math.max(loopStartMeasure, parseInt(e.target.value) || loopStartMeasure))}
                    className="w-12 h-8 bg-card border border-border/30 rounded text-center text-xs text-foreground focus:outline-none"
                  />
                </div>
              )}

              {showOsmd && (
                <div className="flex items-center gap-1.5 border-r border-border/30 pr-4">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.15))}
                    className="w-8 h-8"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-mono w-10 text-center text-muted-foreground">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setZoom((prev) => Math.min(2.0, prev + 0.15))}
                    className="w-8 h-8"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="gap-2 border-border/50"
              >
                <Minimize2 className="w-4 h-4" />
                Exit Fullscreen
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto rounded-xl border border-border/30 bg-card/10 flex">
            {contentLayout}
          </div>
        </div>
      )}
    </>
  );
}
