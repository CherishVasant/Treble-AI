'use client';

import { useMemo, useState, useRef, useCallback } from 'react';
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

/** Play a piano-like tone via Web Audio API */
function playMidiNote(midiNumber: number): void {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const frequency = 440 * Math.pow(2, (midiNumber - 69) / 12);

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Triangle wave sounds more piano-like than a plain sine
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Envelope: quick attack, then exponential decay to silence
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 1.8);

    // Close the context after playback to free resources
    oscillator.onended = () => { try { ctx.close(); } catch {} };
  } catch {
    // Web Audio unavailable in this environment — silently skip
  }
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

  const windowStart = MIDI_MIN + octaveShift * 12;
  const windowEnd = windowStart + VISIBLE_MIDI_SPAN;

  const canShiftLeft  = windowStart > MIDI_MIN;
  const canShiftRight = windowEnd < MIDI_MAX;

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
    // Play the note
    playMidiNote(midi);
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
