'use client';

import { useMemo } from 'react';

interface PianoKeyboardProps {
  activeMidiNotes?: number[];
  noteLabelsEnabled?: boolean;
  octaveMarkersEnabled?: boolean;
  onNoteClick?: (midiNumber: number) => void;
  // Future-proofing props for scales / hands / chord modes
  leftHandMidiNotes?: number[];
  rightHandMidiNotes?: number[];
  className?: string;
}

const isBlackKey = (midi: number): boolean => {
  const noteInOctave = midi % 12;
  return [1, 3, 6, 8, 10].includes(noteInOctave); // C# (1), D# (3), F# (6), G# (8), A# (10)
};

const getNoteName = (midi: number): string => {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return names[midi % 12];
};

const getOctave = (midi: number): number => {
  return Math.floor(midi / 12) - 1; // 60 is C4, 48 is C3
};

export default function PianoKeyboard({
  activeMidiNotes = [],
  noteLabelsEnabled = true,
  octaveMarkersEnabled = true,
  onNoteClick,
  leftHandMidiNotes = [],
  rightHandMidiNotes = [],
  className = '',
}: PianoKeyboardProps) {
  // Generate white keys list in range C3 (48) to C6 (84)
  const whiteKeys = useMemo(() => {
    const keys: number[] = [];
    for (let m = 48; m <= 84; m++) {
      if (!isBlackKey(m)) {
        keys.push(m);
      }
    }
    return keys;
  }, []);

  // Set of all currently active MIDI notes (union of main active, left-hand, and right-hand for compatibility)
  const activeSet = useMemo(() => {
    return new Set([
      ...activeMidiNotes,
      ...leftHandMidiNotes,
      ...rightHandMidiNotes
    ]);
  }, [activeMidiNotes, leftHandMidiNotes, rightHandMidiNotes]);

  return (
    <div className={`w-full ${className}`}>
      {/* Keyboard Outer Scroll Wrapper for responsiveness */}
      <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted/30 scrollbar-track-transparent">
        <div className="flex justify-start min-w-[700px] md:min-w-fit px-4 py-2 select-none overflow-visible">
          {whiteKeys.map((midi) => {
            const isWhiteActive = activeSet.has(midi);
            
            // Check if there is a black key immediately to the right
            const blackMidi = midi + 1;
            const hasBlackKey = isBlackKey(blackMidi) && blackMidi <= 84;
            const isBlackActive = activeSet.has(blackMidi);
            
            const isCKey = getNoteName(midi) === 'C';
            
            // Future check if note belongs to specific hands (e.g. left hand blue, right hand green, etc.)
            // Currently, we default to the bright glowing yellow as requested by user.
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
                {/* White Key Shape */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onNoteClick?.(midi)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onNoteClick?.(midi);
                    }
                  }}
                  aria-label={`Play ${getNoteName(midi)}${getOctave(midi)}`}
                  className={`w-full h-36 sm:h-44 md:h-48 rounded-b-lg border-l border-r border-b transition-all duration-100 cursor-pointer select-none focus:outline-none flex flex-col justify-end pb-3 items-center relative ${whiteKeyHighlightClass}`}
                >
                  {/* Note Name Label inside white key */}
                  {noteLabelsEnabled && (
                    <span className="text-[10px] font-bold tracking-tight select-none pointer-events-none transition-opacity duration-150">
                      {getNoteName(midi)}
                    </span>
                  )}
                </div>

                {/* Black Key (positioned absolutely relative to slot container, sibling to white key) */}
                {hasBlackKey && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNoteClick?.(blackMidi);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        onNoteClick?.(blackMidi);
                      }
                    }}
                    aria-label={`Play ${getNoteName(blackMidi)}${getOctave(blackMidi)}`}
                    className={`absolute top-0 right-0 translate-x-1/2 w-[60%] h-[60%] z-20 rounded-b border-l border-r border-b transition-all duration-100 cursor-pointer select-none focus:outline-none ${blackKeyHighlightClass}`}
                  />
                )}

                {/* Octave Markers centered under the C white keys */}
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
