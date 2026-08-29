'use client';

import { useMemo, useEffect, useCallback, useRef } from 'react';

interface PianoKeyboardProps {
  activeMidiNotes?: number[];
  noteLabelsEnabled?: boolean;
  octaveMarkersEnabled?: boolean;
  onNoteClick?: (midiNumber: number) => void;
  /** Called when the user taps a key; receives MIDI number + note name (e.g. "C4") */
  onNotePlay?: (midiNumber: number, noteName: string) => void;
  leftHandMidiNotes?: number[];
  rightHandMidiNotes?: number[];
  className?: string;
}

const isBlackKey = (midi: number): boolean => {
  const noteInOctave = midi % 12;
  return [1, 3, 6, 8, 10].includes(noteInOctave);
};

const getNoteName = (midi: number): string => {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return names[midi % 12];
};

const getOctave = (midi: number): number => {
  return Math.floor(midi / 12) - 1;
};

// ─── Soundfont playback ──────────────────────────────────────────────────────
// Primary: high-quality MusyngKite piano from public CDN (no backend required)
// Fallback: backend FluidSynth WAV → oscillator

const CDN_BASE = 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/acoustic_grand_piano-mp3/';
const CDN_NOTE_NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];

function _midiToCdnNote(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const name = CDN_NOTE_NAMES[midi % 12];
  return `${name}${octave}`;
}

let _sfCtx: AudioContext | null = null;
const _sfCache = new Map<number, AudioBuffer | null>();
const _sfLoading = new Set<number>();

function _getSfCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (_sfCtx && _sfCtx.state !== 'closed') return _sfCtx;
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    _sfCtx = new AC() as AudioContext;
    return _sfCtx;
  } catch {
    return null;
  }
}

async function _loadSfNote(midi: number): Promise<AudioBuffer | null> {
  if (_sfCache.has(midi)) return _sfCache.get(midi)!;
  if (_sfLoading.has(midi)) {
    return new Promise(resolve => {
      const t = setInterval(() => {
        if (!_sfLoading.has(midi)) {
          clearInterval(t);
          resolve(_sfCache.get(midi) ?? null);
        }
      }, 30);
    });
  }
  _sfLoading.add(midi);
  try {
    const ctx = _getSfCtx();
    if (!ctx) { _sfCache.set(midi, null); return null; }

    // 1. Try CDN soundfont first (always reliable, high quality)
    const cdnNote = _midiToCdnNote(midi);
    try {
      const resp = await fetch(`${CDN_BASE}${cdnNote}.mp3`);
      if (resp.ok) {
        const buf = await ctx.decodeAudioData(await resp.arrayBuffer());
        _sfCache.set(midi, buf);
        return buf;
      }
    } catch { /* CDN failed, try backend */ }

    // 2. Fallback: backend FluidSynth WAV
    try {
      const resp = await fetch(`/api/piano-note/${midi}`, { cache: 'force-cache' });
      if (resp.ok) {
        const buf = await ctx.decodeAudioData(await resp.arrayBuffer());
        _sfCache.set(midi, buf);
        return buf;
      }
    } catch { /* backend failed too */ }

    _sfCache.set(midi, null);
    return null;
  } finally {
    _sfLoading.delete(midi);
  }
}

function _preWarm(midis: number[]): void {
  for (const m of midis) {
    _loadSfNote(m).catch(() => { /* ignore */ });
  }
}

async function playSoundfontNote(midi: number): Promise<void> {
  const ctx = _getSfCtx();
  if (ctx && ctx.state === 'suspended') {
    try { await ctx.resume(); } catch { /* ignore */ }
  }
  const buf = await _loadSfNote(midi);
  if (buf && ctx && ctx.state !== 'closed') {
    try {
      const src  = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buf;
      gain.gain.setValueAtTime(0.8, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.5);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      src.stop(ctx.currentTime + 3.5);
      return;
    } catch { /* fall through */ }
  }
  // Last resort: oscillator (sounds artificial but is always available)
  _playOscillator(midi);
}

function _playOscillator(midiNumber: number): void {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx  = new AC() as AudioContext;
    const freq = 440 * Math.pow(2, (midiNumber - 69) / 12);
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.8);
    osc.onended = () => { try { ctx.close(); } catch {} };
  } catch { /* Web Audio unavailable */ }
}

// Full standard piano range: C1 (MIDI 24) → C8 (MIDI 108)
const MIDI_MIN = 24;   // C1
const MIDI_MAX = 108;  // C8
const MIDI_C4  = 60;   // C4 — always centered on mount

export default function PianoKeyboard({
  activeMidiNotes = [],
  noteLabelsEnabled = true,
  octaveMarkersEnabled = true,
  onNoteClick,
  onNotePlay,
  leftHandMidiNotes = [],
  rightHandMidiNotes = [],
  className = '',
}: PianoKeyboardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const c4Ref    = useRef<HTMLDivElement>(null);

  // Pre-warm C3–C5 on mount so first-click is instant
  useEffect(() => {
    const warm: number[] = [];
    for (let m = 48; m <= 72; m++) warm.push(m);
    _preWarm(warm);
  }, []);

  // Center the view on C4 after the keyboard renders
  useEffect(() => {
    const container = scrollRef.current;
    const c4El      = c4Ref.current;
    if (!container || !c4El) return;

    // Use requestAnimationFrame so layout is complete before we measure
    const raf = requestAnimationFrame(() => {
      const containerW = container.clientWidth;
      const c4Left     = c4El.offsetLeft;
      const c4Width    = c4El.offsetWidth;
      container.scrollLeft = c4Left - containerW / 2 + c4Width / 2;
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const whiteKeys = useMemo(() => {
    const keys: number[] = [];
    for (let m = MIDI_MIN; m <= MIDI_MAX; m++) {
      if (!isBlackKey(m)) keys.push(m);
    }
    return keys;
  }, []);

  const activeSet = useMemo(() => {
    return new Set([
      ...activeMidiNotes,
      ...leftHandMidiNotes,
      ...rightHandMidiNotes,
    ]);
  }, [activeMidiNotes, leftHandMidiNotes, rightHandMidiNotes]);

  const handleKeyPress = useCallback((midi: number) => {
    playSoundfontNote(midi).catch(() => { /* ignore */ });
    if (onNotePlay) {
      const noteName = `${getNoteName(midi)}${getOctave(midi)}`;
      onNotePlay(midi, noteName);
    }
    onNoteClick?.(midi);
  }, [onNoteClick, onNotePlay]);

  return (
    <div className={`w-full ${className}`}>
      {/* Label row */}
      <div className="flex items-center justify-center px-4 mb-2">
        <span className="text-[10px] text-muted-foreground font-semibold tracking-wider select-none">
          C1 – C8 &nbsp;·&nbsp; C4 centered &nbsp;·&nbsp; Click keys to play
        </span>
      </div>

      {/* Scrollable keyboard — C4 is always scrolled into centre on mount */}
      <div
        ref={scrollRef}
        className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted/30 scrollbar-track-transparent"
      >
        <div className="flex justify-start px-4 py-2 select-none overflow-visible">
          {whiteKeys.map((midi) => {
            const isWhiteActive = activeSet.has(midi);

            const blackMidi    = midi + 1;
            const hasBlackKey  = isBlackKey(blackMidi) && blackMidi <= MIDI_MAX;
            const isBlackActive = activeSet.has(blackMidi);

            const isCKey = getNoteName(midi) === 'C';
            const isC4   = midi === MIDI_C4;

            const whiteKeyHighlightClass = isWhiteActive
              ? 'bg-[#FFD700] text-black shadow-[0_0_15px_#FFD700_inset,0_0_20px_#FFD700] border-transparent font-extrabold scale-[0.98]'
              : 'bg-[#f8fafc] text-slate-700 hover:bg-slate-100 active:scale-[0.99] border-slate-300';

            const blackKeyHighlightClass = isBlackActive
              ? 'bg-[#FFD700] shadow-[0_0_12px_#FFD700_inset,0_0_15px_#FFD700] border-transparent scale-[0.97]'
              : 'bg-[#0f172a] hover:bg-[#1e293b] active:scale-[0.98] border-black';

            return (
              <div
                key={midi}
                ref={isC4 ? c4Ref : undefined}
                className="flex flex-col items-center flex-shrink-0 w-[32px] sm:w-[36px] md:w-[40px] relative overflow-visible"
              >
                {/* White Key */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleKeyPress(midi)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleKeyPress(midi);
                  }}
                  aria-label={`Play ${getNoteName(midi)}${getOctave(midi)}`}
                  className={`w-full h-36 sm:h-44 md:h-48 rounded-b-lg border-l border-r border-b transition-all duration-100 cursor-pointer select-none focus:outline-none flex flex-col justify-end pb-2 items-center relative ${whiteKeyHighlightClass}`}
                >
                  {/* Show C-octave label on the key itself; C4 is bold */}
                  {isCKey && (
                    <span
                      className={`text-[8px] sm:text-[9px] font-bold tracking-tight select-none pointer-events-none leading-none ${
                        isC4 ? 'text-primary' : 'text-slate-500'
                      } ${isWhiteActive ? 'text-black' : ''}`}
                    >
                      C{getOctave(midi)}
                    </span>
                  )}
                </div>

                {/* Black Key */}
                {hasBlackKey && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); handleKeyPress(blackMidi); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        handleKeyPress(blackMidi);
                      }
                    }}
                    aria-label={`Play ${getNoteName(blackMidi)}${getOctave(blackMidi)}`}
                    className={`absolute top-0 right-0 translate-x-1/2 w-[60%] h-[60%] z-20 rounded-b border-l border-r border-b transition-all duration-100 cursor-pointer select-none focus:outline-none ${blackKeyHighlightClass}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
