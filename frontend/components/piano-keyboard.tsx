'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
// Loads per-note MP3 samples from a hosted CDN (FluidR3_GM via gleitz/midi-js-soundfonts)
// and plays them using the Web Audio API.  Falls back to a synthesized triangle-wave
// oscillator for any note whose sample fails to load.

// Set NEXT_PUBLIC_SOUNDFONT_BASE_URL in Vercel env vars to point to your own
// Vercel Blob store; leave unset to use the public gleitz CDN.
const SOUNDFONT_BASE =
  (typeof process !== 'undefined' &&
   process.env.NEXT_PUBLIC_SOUNDFONT_BASE_URL) ||
  'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3';

// Flat note names used by the gleitz soundfont filenames
const _FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function _midiToSfName(midi: number): string {
  const oct = Math.floor(midi / 12) - 1;
  return `${_FLAT_NAMES[midi % 12]}${oct}`;
}

// Module-level singletons: shared across all renders of this component
let _sfCtx: AudioContext | null = null;
const _sfCache = new Map<number, AudioBuffer | null>(); // null = failed
const _sfLoading = new Set<number>();                   // in-flight fetches

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

  // If already in-flight, wait for that fetch to settle
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

    const url = `${SOUNDFONT_BASE}/${_midiToSfName(midi)}.mp3`;
    const resp = await fetch(url, { cache: 'force-cache' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buf = await ctx.decodeAudioData(await resp.arrayBuffer());
    _sfCache.set(midi, buf);
    return buf;
  } catch {
    _sfCache.set(midi, null);
    return null;
  } finally {
    _sfLoading.delete(midi);
  }
}

/** Pre-fetch note samples in the background so first-click is instant. */
function _preWarm(midis: number[]): void {
  for (const m of midis) {
    _loadSfNote(m).catch(() => { /* ignore */ });
  }
}

/** Play a note using a soundfont sample; fall back to triangle-wave oscillator. */
async function playSoundfontNote(midi: number): Promise<void> {
  // Eagerly resume the AudioContext on user gesture (needed for Chrome autoplay policy)
  const ctx = _getSfCtx();
  if (ctx && ctx.state === 'suspended') {
    try { await ctx.resume(); } catch { /* ignore */ }
  }

  const buf = await _loadSfNote(midi);
  if (buf && ctx && ctx.state !== 'closed') {
    try {
      const src   = ctx.createBufferSource();
      const gain  = ctx.createGain();
      src.buffer  = buf;
      // Gentle volume + long decay so the sound rings out naturally
      gain.gain.setValueAtTime(0.65, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.0);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      src.stop(ctx.currentTime + 3.0);
      return;
    } catch { /* fall through to oscillator */ }
  }

  // Oscillator fallback (no network, blocked CDN, or decode failure)
  _playOscillator(midi);
}

/** Triangle-wave oscillator fallback — no network required. */
function _playOscillator(midiNumber: number): void {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC() as AudioContext;
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

// The visible window is 4 octaves (49 white keys).  The full keyboard spans
// MIDI 24 (C2) to MIDI 107 (B7).  The user can shift the window by ±1 octave
// using the left/right arrow buttons.
const MIDI_MIN = 24;  // C2
const MIDI_MAX = 107; // B7
const VISIBLE_OCTAVES = 4;
const VISIBLE_MIDI_SPAN = VISIBLE_OCTAVES * 12; // 48 semitones

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
  // `octaveShift` is measured in octaves (12 semitones each).
  // 0 → window starts at C2 (MIDI 24); 1 → starts at C3 (MIDI 36); …
  const [octaveShift, setOctaveShift] = useState(1); // default: C3–C7

  // Pre-warm the middle two octaves (C3–C5) on first mount so the soundfont
  // samples are already cached by the time the user touches a key.
  useEffect(() => {
    const warm: number[] = [];
    for (let m = 48; m <= 72; m++) warm.push(m); // C3 to C5
    _preWarm(warm);
  }, []);

  const windowStart = MIDI_MIN + octaveShift * 12;
  const windowEnd = windowStart + VISIBLE_MIDI_SPAN;

  const canShiftLeft  = windowStart > MIDI_MIN;
  const canShiftRight = windowEnd < MIDI_MAX;

  // Pre-warm newly visible notes when the user shifts the octave window
  useEffect(() => {
    const warm: number[] = [];
    for (let m = windowStart; m <= windowEnd; m++) warm.push(m);
    _preWarm(warm);
  }, [windowStart, windowEnd]);

  const whiteKeys = useMemo(() => {
    const keys: number[] = [];
    for (let m = windowStart; m <= windowEnd; m++) {
      if (!isBlackKey(m)) keys.push(m);
    }
    return keys;
  }, [windowStart, windowEnd]);

  const activeSet = useMemo(() => {
    return new Set([
      ...activeMidiNotes,
      ...leftHandMidiNotes,
      ...rightHandMidiNotes,
    ]);
  }, [activeMidiNotes, leftHandMidiNotes, rightHandMidiNotes]);

  const handleKeyPress = useCallback((midi: number) => {
    // Play via soundfont (async, falls back to oscillator automatically)
    playSoundfontNote(midi).catch(() => { /* ignore */ });
    // Notify parent (for chatbot input)
    if (onNotePlay) {
      const noteName = `${getNoteName(midi)}${getOctave(midi)}`;
      onNotePlay(midi, noteName);
    }
    // Legacy click callback
    onNoteClick?.(midi);
  }, [onNoteClick, onNotePlay]);

  return (
    <div className={`w-full ${className}`}>
      {/* Octave shift controls */}
      <div className="flex items-center justify-between px-4 mb-2">
        <button
          onClick={() => setOctaveShift(s => Math.max(0, s - 1))}
          disabled={!canShiftLeft}
          aria-label="Shift keyboard left one octave"
          className="p-1.5 rounded-lg border border-border/30 text-muted-foreground hover:text-foreground hover:bg-card/45 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[10px] text-muted-foreground font-semibold tracking-wider select-none">
          C{getOctave(windowStart)}–C{getOctave(windowEnd)} &nbsp;·&nbsp; Click keys to play
        </span>
        <button
          onClick={() => setOctaveShift(s => s + 1)}
          disabled={!canShiftRight}
          aria-label="Shift keyboard right one octave"
          className="p-1.5 rounded-lg border border-border/30 text-muted-foreground hover:text-foreground hover:bg-card/45 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Keyboard */}
      <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted/30 scrollbar-track-transparent">
        <div className="flex justify-start min-w-[700px] md:min-w-fit px-4 py-2 select-none overflow-visible">
          {whiteKeys.map((midi) => {
            const isWhiteActive = activeSet.has(midi);

            const blackMidi = midi + 1;
            const hasBlackKey = isBlackKey(blackMidi) && blackMidi <= windowEnd;
            const isBlackActive = activeSet.has(blackMidi);

            const isCKey = getNoteName(midi) === 'C';

            const whiteKeyHighlightClass = isWhiteActive
              ? 'bg-[#FFD700] text-black shadow-[0_0_15px_#FFD700_inset,0_0_20px_#FFD700] border-transparent font-extrabold scale-[0.98]'
              : 'bg-[#f8fafc] text-slate-700 hover:bg-slate-100 active:scale-[0.99] border-slate-300';

            const blackKeyHighlightClass = isBlackActive
              ? 'bg-[#FFD700] shadow-[0_0_12px_#FFD700_inset,0_0_15px_#FFD700] border-transparent scale-[0.97]'
              : 'bg-[#0f172a] hover:bg-[#1e293b] active:scale-[0.98] border-black';

            return (
              <div
                key={midi}
                className="flex flex-col items-center flex-1 min-w-[28px] sm:min-w-[36px] md:min-w-[42px] max-w-[56px] relative overflow-visible"
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
                  className={`w-full h-36 sm:h-44 md:h-48 rounded-b-lg border-l border-r border-b transition-all duration-100 cursor-pointer select-none focus:outline-none flex flex-col justify-end pb-3 items-center relative ${whiteKeyHighlightClass}`}
                >
                  {noteLabelsEnabled && (
                    <span className="text-[10px] font-bold tracking-tight select-none pointer-events-none transition-opacity duration-150">
                      {getNoteName(midi)}
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

                {/* Octave Markers */}
                {octaveMarkersEnabled && isCKey && (
                  <span className="mt-2 text-[10px] sm:text-xs font-bold text-muted-foreground/80 animate-fade-in select-none pointer-events-none">
                    C{getOctave(midi)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
