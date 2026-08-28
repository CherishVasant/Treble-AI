'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
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
  measuresMap?: any[];
}

const getFractionRealValue = (fraction: any): number => {
  if (!fraction) return 0;
  if (typeof fraction.RealValue === 'number') return fraction.RealValue;
  if (typeof fraction.realValue === 'number') return fraction.realValue;
  if (typeof fraction === 'number') return fraction;
  return 0;
};

/**
 * OSMD's cursor has two visibility bugs we must fix after every show()/update():
 * 
 * 1. Z-INDEX: OSMD sets cursor z-index to -1 by default (wantedZIndex).
 *    adjustToBackgroundColor() resets it on every show() call.
 *    Fix: force z-index to 5 after every show().
 * 
 * 2. HEIGHT COLLAPSE: cursor.update() recalculates the cursor height from
 *    the staff line bounding box (10 * staffHeight * zoom). After cursor.next()
 *    advances, the ParentMusicSystem can return degenerate staff heights,
 *    causing the cursor <img> to render at 1px tall.
 *    Fix: capture the first valid height and enforce it as a minimum.
 */
const forceCursorVisible = (cursor: any) => {
  const el = cursor?.cursorElement;
  if (!el) return;
  
  // Fix z-index
  el.style.zIndex = '5';
  
  // Fix Tailwind height: auto override by copying the dynamically calculated HTML attributes to inline styles
  const attrHeight = el.getAttribute('height');
  const attrWidth = el.getAttribute('width');
  
  if (attrHeight) {
    el.style.height = attrHeight + 'px';
  }
  if (attrWidth) {
    el.style.width = attrWidth + 'px';
  }
};


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
  measuresMap = [],
}: SheetMusicViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [osmdFailed, setOsmdFailed] = useState(false);
  const osmdRef = useRef<any>(null);
  const timelineRef = useRef<number[]>([]);
  // Pre-built lookup table: cursorTimestamps[step] = OSMD timestamp (whole notes)
  // for the cursor position reached after `step` cursor.next() calls.
  // Binary search lets us find the last step ≤ targetTimestamp in O(log N),
  // which prevents the off-by-one where the old while-loop advanced one note
  // too far (stopping at the FIRST position ≥ target instead of the LAST ≤ target).
  const cursorTimestampsRef = useRef<number[]>([]);
  const cursorStepRef = useRef<number>(0);


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

    let active = true;

    const initializeOSMD = async () => {
      setLoading(true);
      setError(null);

      try {
        const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay');

        if (!containerRef.current) {
          throw new Error('Container not found');
        }

        if (!active) return;
        containerRef.current.innerHTML = '';

        const osmd = new OpenSheetMusicDisplay(containerRef.current, {
          backend: 'svg',
          autoResize: true,
          cursorsOptions: [{
            color: '#3b82f6', // Premium blue highlight
            alpha: 0.5,       // Visible overlay opacity
            type: 0,          // Standard highlighting current notes
            follow: true
          }]
        });

        // Tell OSMD a background color is set so adjustToBackgroundColor()
        // uses z-index: 1 instead of the default -1 that hides cursors.
        try {
          const osmdAny = osmd as any;
          if (osmdAny.drawingParameters?.Rules) {
            osmdAny.drawingParameters.Rules.PageBackgroundColor = '#ffffff';
          } else if (osmdAny.rules) {
            osmdAny.rules.PageBackgroundColor = '#ffffff';
          }
        } catch (_) { /* best effort */ }

        try {
          if (xmlData) {
            try {
              await osmd.load(xmlData);
            } catch (err) {
              console.error('[SheetMusicViewer] Error parsing inline XML:', err);
              throw new Error('Invalid MusicXML structure or failed to parse notation file.');
            }
          } else if (musicXmlUrl) {
            let response: Response;
            try {
              response = await fetch(musicXmlUrl);
            } catch (fetchErr) {
              throw new Error('Failed to download notation file.');
            }

            if (!response.ok) {
              throw new Error(`Failed to fetch MusicXML: ${response.statusText} (${response.status})`);
            }
            
            let arrayBuffer: ArrayBuffer;
            try {
              arrayBuffer = await response.arrayBuffer();
            } catch (bufErr) {
              throw new Error('Failed to read notation file data.');
            }

            const uint8Array = new Uint8Array(arrayBuffer);
            if (uint8Array.length === 0) {
              throw new Error('Notation file is empty.');
            }
            
            const isMxl = uint8Array.length >= 4 &&
                          uint8Array[0] === 0x50 && // 'P'
                          uint8Array[1] === 0x4B && // 'K'
                          uint8Array[2] === 0x03 &&
                          uint8Array[3] === 0x04;
                          
            try {
              if (isMxl) {
                await osmd.load(new Blob([uint8Array]));
              } else {
                const decoder = new TextDecoder('utf-8');
                const xmlText = decoder.decode(uint8Array);
                
                // Quick validation of XML content
                if (!xmlText.trim().startsWith('<')) {
                  throw new Error('Unsupported file format');
                }
                
                await osmd.load(xmlText);
              }
            } catch (loadError: any) {
              console.error('[SheetMusicViewer] OSMD load error:', loadError);
              const errMsg = loadError?.message || '';
              if (isMxl) {
                if (errMsg.includes('corrupted') || errMsg.includes('missing') || errMsg.includes('zip') || errMsg.includes('bytes')) {
                  throw new Error('Corrupted MXL archive or invalid zip file.');
                }
                throw new Error('OpenSheetMusicDisplay: Invalid MXL file structure.');
              } else {
                if (errMsg.includes('parse') || errMsg.includes('XML')) {
                  throw new Error('Invalid MusicXML structure.');
                }
                throw new Error('Failed to parse notation file.');
              }
            }
          }

          if (!active) return;
          osmd.Zoom = zoom;
          osmd.render();
          osmdRef.current = osmd;

          try {
            osmd.enableOrDisableCursors(true);
          } catch (cursorErr) {
            console.warn('[SheetMusicViewer] Failed to enable cursors:', cursorErr);
          }

          // Build repeat measure timeline
          const measures = osmd.Sheet?.SourceMeasures || [];
          const tl: number[] = [];
          let idx = 0;
          let lastRepeatStart = 0;
          const repeatEndsSeen = new Set<number>();
          const maxSteps = measures.length * 5;
          let steps = 0;

          while (idx < measures.length && steps < maxSteps) {
            steps++;
            const m = measures[idx];
            const isRepeatStart = m.beginsWithLineRepetition?.() || m.beginsWithWordRepetition?.();
            if (isRepeatStart) {
              lastRepeatStart = idx;
            }

            tl.push(idx);

            const isRepeatEnd = m.endsWithLineRepetition?.() || m.endsWithWordRepetition?.();
            if (isRepeatEnd && !repeatEndsSeen.has(idx)) {
              repeatEndsSeen.add(idx);
              idx = lastRepeatStart;
            } else {
              idx++;
            }
          }

          if (tl.length === 0) {
            for (let k = 0; k < measures.length; k++) {
              tl.push(k);
            }
          }
          timelineRef.current = tl;

          try {
            osmd.cursor.show();
            forceCursorVisible(osmd.cursor);
            osmd.cursor.reset();
          } catch (e) {
            console.warn('[SheetMusicViewer] Initial cursor show failed:', e);
          }

          // Build cursor position → timestamp lookup table.
          // We iterate through every cursor step once here so the sync effect
          // can binary-search for the LAST step ≤ targetTimestamp instead of
          // the old while-loop that stopped at the FIRST step ≥ target
          // (which put the cursor one note ahead of the audio for the entire
          // duration of every note).
          const cursorTimestamps: number[] = [];
          try {
            osmd.cursor.reset();
            let buildIter = osmd.cursor.iterator || osmd.cursor.Iterator;
            while (buildIter && !(buildIter.endReached || buildIter.EndReached)) {
              cursorTimestamps.push(getFractionRealValue(buildIter.currentTimeStamp));
              osmd.cursor.next();
              buildIter = osmd.cursor.iterator || osmd.cursor.Iterator;
            }
            osmd.cursor.reset();
          } catch (buildErr) {
            console.warn('[SheetMusicViewer] Could not build cursor timestamp table:', buildErr);
          }
          cursorTimestampsRef.current = cursorTimestamps;
          cursorStepRef.current = 0;
        } catch (loadError: any) {
          console.error('[SheetMusicViewer] OSMD load pipeline error:', loadError);
          throw loadError;
        }
      } catch (err: any) {
        console.error('[SheetMusicViewer] OSMD init error:', err);
        if (active) {
          setOsmdFailed(true);
          setError(err instanceof Error ? err.message : 'Failed to initialize sheet music viewer');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    initializeOSMD();

    return () => {
      active = false;
      osmdRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
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

  // Sync cursor highlight with currentTime (Continuous Note-Level Tracking)
  // === DIAGNOSTIC VERSION ===
  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd || !osmd.cursor) return;

    const tl = timelineRef.current;
    const measures = osmd.Sheet?.SourceMeasures || [];
    if (measures.length === 0) return;

    let writtenIndex = 0;
    let fractionalMeasure = 0;

    if (Array.isArray(measuresMap) && measuresMap.length > 0) {
      let foundIndex = -1;
      for (let i = 0; i < measuresMap.length; i++) {
        if (currentTime >= measuresMap[i].start_time) {
          foundIndex = i;
        }
      }
      const idx = foundIndex !== -1 ? foundIndex : 0;
      const mEntry = measuresMap[idx];

      // Use the OSMD repeat-aware timeline (timelineRef) so the cursor correctly
      // follows repeats: tl[idx] maps sequential playback position → source measure index.
      // Fall back to (measure_number - 1) when the timeline is shorter than measuresMap
      // (e.g. OSMD and the backend disagree on repeat structure).
      if (tl.length > idx) {
        writtenIndex = Math.max(0, Math.min(measures.length - 1, tl[idx]));
      } else {
        writtenIndex = Math.max(0, Math.min(measures.length - 1, mEntry.measure_number - 1));
      }

      const start = mEntry.start_time;
      const end = mEntry.end_time;
      fractionalMeasure = end > start
        ? Math.max(0, Math.min(1, (currentTime - start) / (end - start)))
        : 0;
    } else {
      if (secondsPerMeasure <= 0) return;
      const elapsedMeasures = Math.floor(currentTime / secondsPerMeasure);
      writtenIndex = tl.length > 0
        ? (tl[Math.min(elapsedMeasures, tl.length - 1)] ?? elapsedMeasures)
        : elapsedMeasures;
      writtenIndex = Math.max(0, Math.min(measures.length - 1, writtenIndex));
      fractionalMeasure = (currentTime / secondsPerMeasure) % 1;
    }

    const measure = measures[writtenIndex];
    if (!measure) return;

    try {
      const measureStart = getFractionRealValue(measure.AbsoluteTimestamp);
      
      const nextMeasure = measures[writtenIndex + 1];
      const nextStart = nextMeasure 
        ? getFractionRealValue(nextMeasure.AbsoluteTimestamp) 
        : (measureStart + 1.0);
        
      const measureDuration = nextStart - measureStart;
      
      // Target timestamp in whole notes since beginning of sheet
      const targetTimestamp = measureStart + (fractionalMeasure * measureDuration);
      
      const cursor = osmd.cursor;
      const timestamps = cursorTimestampsRef.current;

      if (timestamps.length > 0) {
        // Binary search: find the LAST cursor step whose timestamp ≤ targetTimestamp.
        // This is the note currently sounding, not the next one.
        // The old while-loop stopped at the FIRST step ≥ target — one note too far.
        let lo = 0, hi = timestamps.length - 1, targetStep = 0;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          if (timestamps[mid] <= targetTimestamp) {
            targetStep = mid;
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }

        // If we need to move backward, reset and replay from the start.
        if (targetStep < cursorStepRef.current) {
          cursor.reset();
          cursorStepRef.current = 0;
        }

        // Advance incrementally from current step to targetStep.
        let stepsMoved = 0;
        while (cursorStepRef.current < targetStep && stepsMoved < 5000) {
          const iter = cursor.iterator || cursor.Iterator;
          if (!iter || iter.endReached || iter.EndReached) break;
          cursor.next();
          cursorStepRef.current++;
          stepsMoved++;
        }
      } else {
        // Fallback when the timestamp table could not be built (rare).
        // Uses the old approach — may be one note ahead.
        let iterator = cursor.iterator || cursor.Iterator;
        if (!iterator) {
          cursor.show();
          forceCursorVisible(cursor);
          return;
        }
        const beforeRealValue = getFractionRealValue(iterator.currentTimeStamp);
        if (targetTimestamp < beforeRealValue) {
          cursor.reset();
          iterator = cursor.iterator || cursor.Iterator;
          if (!iterator) { cursor.show(); forceCursorVisible(cursor); return; }
        }
        let currentRealValue = getFractionRealValue(iterator.currentTimeStamp);
        let steps = 0;
        while (steps < 5000) {
          const endReached = iterator.endReached || iterator.EndReached || false;
          if (endReached) break;
          if (currentRealValue >= targetTimestamp) break;
          cursor.next(); steps++;
          const nv = getFractionRealValue(iterator.currentTimeStamp);
          if (nv === currentRealValue) break;
          currentRealValue = nv;
        }
      }

      cursor.show();
      forceCursorVisible(cursor);
    } catch (e) {
      console.warn('[SheetMusicViewer] Cursor note-level sync error:', e);
    }
  }, [currentTime, secondsPerMeasure, measuresMap]);

  const activeMeasure = useMemo(() => {
    if (Array.isArray(measuresMap) && measuresMap.length > 0) {
      let foundIndex = -1;
      for (let i = 0; i < measuresMap.length; i++) {
        if (currentTime >= measuresMap[i].start_time) {
          foundIndex = i;
        }
      }
      const idx = foundIndex !== -1 ? foundIndex : 0;
      return measuresMap[idx].measure_number;
    }

    if (secondsPerMeasure <= 0) return 1;
    const tl = timelineRef.current;
    const elapsedMeasures = Math.floor(currentTime / secondsPerMeasure);
    const physicalIndex = tl.length > 0
      ? (tl[Math.min(elapsedMeasures, tl.length - 1)] ?? elapsedMeasures)
      : elapsedMeasures;
    return physicalIndex + 1;
  }, [currentTime, secondsPerMeasure, measuresMap]);

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
          className={`w-full overflow-auto p-4 flex-1 relative ${!loading && !error ? 'bg-white rounded-lg' : ''}`}
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
            <h2 className="text-lg font-semibold text-foreground">Sheet Music Viewer</h2>
            {showOsmd && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Measure {activeMeasure}
              </span>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-4">

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
              <h2 className="text-xl font-bold text-foreground">Sheet Music Viewer (Fullscreen)</h2>
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
