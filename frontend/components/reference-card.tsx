'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Square, Star } from 'lucide-react';
import { SCALES_REGISTRY } from '@/lib/scales-data';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const SECTION_GRADIENT: Record<string, string> = {
  // Scale categories
  major_scales: 'from-purple-500 to-indigo-600',
  natural_minor_scales: 'from-indigo-600 to-blue-800',
  harmonic_minor_scales: 'from-violet-500 to-fuchsia-800',
  melodic_minor_scales: 'from-fuchsia-500 to-pink-700',
  chromatic_scales: 'from-emerald-500 to-teal-700',
  major_pentatonic_scales: 'from-purple-500 to-blue-600',
  minor_pentatonic_scales: 'from-indigo-500 to-teal-700',
  blues_scales: 'from-blue-600 to-purple-800',
  whole_tone_scales: 'from-amber-500 to-pink-600',
  diminished_scales: 'from-rose-500 to-purple-800',
  bebop_scales: 'from-purple-600 to-pink-700',
  
  // Modes categories
  ionian_mode: 'from-purple-500 to-indigo-500',
  dorian_mode: 'from-indigo-500 to-blue-600',
  phrygian_mode: 'from-blue-600 to-teal-600',
  lydian_mode: 'from-teal-600 to-emerald-600',
  mixolydian_mode: 'from-emerald-600 to-amber-600',
  aeolian_mode: 'from-amber-600 to-orange-600',
  locrian_mode: 'from-orange-600 to-rose-600',
  
  // Arpeggios categories
  major_arpeggios: 'from-rose-500 to-orange-600',
  minor_arpeggios: 'from-red-500 to-pink-700',
  diminished_arpeggios: 'from-purple-500 to-indigo-800',
  augmented_arpeggios: 'from-amber-500 to-red-600',
  dominant_seventh_arpeggios: 'from-pink-500 to-purple-600',
  major_seventh_arpeggios: 'from-rose-500 to-violet-600',
  minor_seventh_arpeggios: 'from-purple-600 to-blue-700',
  
  // Chords categories
  major_chords: 'from-violet-500 to-rose-600',
  minor_chords: 'from-fuchsia-500 to-indigo-600',
  diminished_chords: 'from-indigo-600 to-pink-700',
  augmented_chords: 'from-orange-500 to-rose-700',
  suspended_chords: 'from-teal-500 to-blue-600',
  dominant_seventh_chords: 'from-pink-500 to-purple-700',
  major_seventh_chords: 'from-rose-500 to-violet-600',
  minor_seventh_chords: 'from-purple-600 to-blue-700',
  half_diminished_chords: 'from-indigo-500 to-rose-500',
  fully_diminished_chords: 'from-red-500 to-purple-800',
  sixth_chords: 'from-amber-500 to-violet-600',
  ninth_chords: 'from-cyan-500 to-indigo-600',
  eleventh_chords: 'from-emerald-500 to-blue-600',
  thirteenth_chords: 'from-fuchsia-500 to-indigo-600',
  altered_chords: 'from-orange-500 to-pink-700',
  
  // Intervals categories
  interval_unison: 'from-slate-500 to-slate-700',
  interval_minor_second: 'from-red-400 to-red-600',
  interval_major_second: 'from-orange-400 to-orange-600',
  interval_minor_third: 'from-amber-400 to-amber-600',
  interval_major_third: 'from-yellow-400 to-yellow-600',
  interval_perfect_fourth: 'from-green-400 to-green-600',
  interval_tritone: 'from-emerald-600 to-teal-700',
  interval_perfect_fifth: 'from-blue-400 to-blue-600',
  interval_minor_sixth: 'from-indigo-400 to-indigo-600',
  interval_major_sixth: 'from-purple-400 to-purple-600',
  interval_minor_seventh: 'from-fuchsia-400 to-fuchsia-600',
  interval_major_seventh: 'from-pink-400 to-pink-600',
  interval_octave: 'from-rose-500 to-rose-700',
  
  // Theory & Notation categories
  circle_of_fifths: 'from-purple-600 to-indigo-700',
  key_signatures: 'from-indigo-700 to-blue-700',
  time_signatures: 'from-blue-700 to-teal-700',
  scale_degrees: 'from-teal-700 to-emerald-700',
  chord_functions: 'from-emerald-700 to-amber-700',
  harmonic_progressions: 'from-amber-700 to-orange-700',
  cadences: 'from-orange-700 to-red-700',
  modes_theory: 'from-purple-700 to-fuchsia-700',
  voice_leading: 'from-fuchsia-700 to-rose-700',
  
  notation_clefs: 'from-violet-600 to-fuchsia-700',
  notation_dynamics: 'from-fuchsia-600 to-rose-700',
  notation_articulations: 'from-rose-600 to-orange-600',
  notation_tempo_markings: 'from-orange-600 to-amber-700',
  notation_repeats: 'from-amber-600 to-yellow-600',
  notation_endings: 'from-yellow-600 to-green-600',
  notation_pedal_markings: 'from-green-600 to-teal-600',
  notation_ornaments: 'from-teal-600 to-cyan-600',
  notation_slurs: 'from-cyan-600 to-blue-600',
  notation_ties: 'from-blue-600 to-indigo-600',
  notation_tuplets: 'from-indigo-600 to-purple-600',

};

interface ReferenceCardProps {
  title: string;
  sectionSlug: string;
  categoryLabel?: string;
  notes?: string[];
  intervals?: string[];
  description?: string;
  formula?: string;
  image?: string;
  rightHandFingering?: string;
  leftHandFingering?: string;
  onFavoriteToggle?: () => void;
}

export default function ReferenceCard({
  title,
  sectionSlug,
  categoryLabel,
  notes = [],
  intervals = [],
  description,
  formula,
  image,
  rightHandFingering,
  leftHandFingering,
  onFavoriteToggle,
}: ReferenceCardProps) {
  const gradient = SECTION_GRADIENT[sectionSlug] ?? 'from-primary to-secondary';
  
  const [isFavorited, setIsFavorited] = useState(false);
  const [isPlayingScale, setIsPlayingScale] = useState(false);
  const [currentPlayingNoteIndex, setCurrentPlayingNoteIndex] = useState<number | null>(null);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playTimerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check initial favorites status
  useEffect(() => {
    try {
      const favs = localStorage.getItem('treble_favorites');
      if (favs) {
        const list = JSON.parse(favs) as string[];
        setIsFavorited(list.includes(title));
      }
    } catch (e) {}
  }, [title]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch (e) {}
      }
      if (playTimerRef.current) {
        clearTimeout(playTimerRef.current);
      }
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch (e) {}
      }
    };
  }, []);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const favs = localStorage.getItem('treble_favorites');
      let list = favs ? JSON.parse(favs) as string[] : [];
      
      if (isFavorited) {
        list = list.filter((t) => t !== title);
        toast.success(`Removed "${title}" from favorites`);
      } else {
        list.push(title);
        toast.success(`Saved "${title}" to favorites`);
      }
      localStorage.setItem('treble_favorites', JSON.stringify(list));
      setIsFavorited(!isFavorited);
      
      // Log interaction to recently viewed
      logInteraction();

      if (onFavoriteToggle) {
        onFavoriteToggle();
      }
      
      // Dispatch event to update sidebar
      window.dispatchEvent(new Event('treble_recents_updated'));
    } catch (e) {
      console.error(e);
    }
  };

  const logInteraction = () => {
    try {
      const stored = localStorage.getItem('treble_recently_viewed');
      let list = stored ? JSON.parse(stored) : [];
      
      // Remove existing to place on top
      list = list.filter((item: any) => item.title !== title);
      list.unshift({
        title,
        sectionSlug,
        categoryLabel: categoryLabel || sectionSlug.replace(/_/g, ' ')
      });
      
      list = list.slice(0, 10);
      localStorage.setItem('treble_recently_viewed', JSON.stringify(list));
      
      window.dispatchEvent(new Event('treble_recents_updated'));
    } catch (e) {}
  };

  // Scale data lookup
  const isScale = sectionSlug.includes('scales') || sectionSlug.includes('mode') || sectionSlug.includes('arpeggios') || sectionSlug.includes('chords');
  
  // Normalization helper
  const normalizeNoteName = (n: string) => {
    return n.trim()
            .replace('Db', 'C#')
            .replace('Eb', 'D#')
            .replace('Gb', 'F#')
            .replace('Ab', 'G#')
            .replace('Bb', 'A#')
            .replace('Cb', 'B')
            .replace('Fb', 'E')
            .replace('E#', 'F')
            .replace('B#', 'C')
            .replace('♮', '')
            .replace('♯', '#')
            .replace('♭', 'b')
            .replace('𝄪', '##');
  };

  const getPitchValue = (noteName: string) => {
    const name = noteName.replace(/[0-9#b♮♯♭]/g, '');
    const order = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    return order.indexOf(name);
  };

  const generatePlayNotes = (notesList: string[]) => {
    let octave = 4;
    const result: string[] = [];
    let lastVal = -1;
    
    notesList.forEach((note) => {
      const val = getPitchValue(note);
      if (lastVal !== -1 && val <= lastVal) {
        octave++;
      }
      result.push(`${note}${octave}`);
      lastVal = val;
    });
    
    if (notesList.length > 0 && notesList[0] !== notesList[notesList.length - 1]) {
      const root = notesList[0];
      const val = getPitchValue(root);
      if (val <= lastVal) {
        octave++;
      }
      result.push(`${root}${octave}`);
    }
    
    return result;
  };

  const getDegreesAndNames = (notesList: string[]) => {
    const degrees: string[] = [];
    const degreeNames: string[] = [];
    const standardNames = ['Tonic', 'Supertonic', 'Mediant', 'Subdominant', 'Dominant', 'Submediant', 'Leading Tone'];
    
    notesList.forEach((_, idx) => {
      const degNum = idx + 1;
      if (idx === notesList.length - 1 && notesList[idx] === notesList[0]) {
        degrees.push('1');
        degreeNames.push('Tonic');
      } else {
        degrees.push(degNum.toString());
        degreeNames.push(standardNames[idx % 7] || 'Degree');
      }
    });
    return { degrees, degreeNames };
  };

  let scaleInfo = isScale ? SCALES_REGISTRY[title] : null;

  if (isScale && !scaleInfo) {
    const defaultNotes = notes.length > 0 ? notes : [title.split(' ')[0]];
    const generatedPlayNotes = generatePlayNotes(defaultNotes);
    const { degrees: gDeg, degreeNames: gNames } = getDegreesAndNames(defaultNotes);
    scaleInfo = {
      name: title,
      keySignature: 'N/A',
      notes: defaultNotes,
      relativeMinor: 'N/A',
      formula: formula || 'W-W-H-W-W-W-H',
      degrees: gDeg,
      degreeNames: gNames,
      rightHandFingering: rightHandFingering || '1-2-3-1-2-3-4-5',
      leftHandFingering: leftHandFingering || '5-4-3-2-1-3-2-1',
      difficulty: 'Intermediate',
      relatedChords: [],
      relatedArpeggios: [],
      playNotes: generatedPlayNotes
    };
  }

  const safeScaleInfo = scaleInfo ? {
    name: scaleInfo.name || title,
    keySignature: scaleInfo.keySignature || 'N/A',
    notes: scaleInfo.notes || notes,
    relativeMinor: scaleInfo.relativeMinor || 'N/A',
    formula: scaleInfo.formula || formula || '',
    degrees: scaleInfo.degrees || [],
    degreeNames: scaleInfo.degreeNames || [],
    rightHandFingering: scaleInfo.rightHandFingering || rightHandFingering || '1-2-3-1-2-3-4-5',
    leftHandFingering: scaleInfo.leftHandFingering || leftHandFingering || '5-4-3-2-1-3-2-1',
    difficulty: scaleInfo.difficulty || 'Intermediate',
    relatedChords: scaleInfo.relatedChords || [],
    relatedArpeggios: scaleInfo.relatedArpeggios || [],
    playNotes: scaleInfo.playNotes || []
  } : null;

  const playScaleAudio = () => {
    if (isPlayingScale) {
      stopScaleAudio();
      return;
    }

    if (!safeScaleInfo) return;

    logInteraction();
    setIsPlayingScale(true);
    setCurrentPlayingNoteIndex(0);

    try {
      const notesToPlay = title.includes('Melodic Minor')
        ? safeScaleInfo.playNotes
        : [...safeScaleInfo.playNotes, ...[...safeScaleInfo.playNotes].reverse().slice(1)];

      const queryNotes = notesToPlay.join(',');
      const audioUrl = `/api/reference/audio?notes=${encodeURIComponent(queryNotes)}`;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.play().catch((err) => {
        console.error('[ReferenceCard] playback error:', err);
        setIsPlayingScale(false);
        setCurrentPlayingNoteIndex(null);
      });

      audio.ontimeupdate = () => {
        const idx = Math.floor(audio.currentTime / 0.4);
        if (idx >= 0 && idx < notesToPlay.length) {
          setCurrentPlayingNoteIndex(idx);
        } else {
          setCurrentPlayingNoteIndex(null);
        }
      };

      audio.onended = () => {
        setIsPlayingScale(false);
        setCurrentPlayingNoteIndex(null);
      };

      audio.onerror = () => {
        setIsPlayingScale(false);
        setCurrentPlayingNoteIndex(null);
      };
    } catch (e) {
      console.error(e);
      setIsPlayingScale(false);
      setCurrentPlayingNoteIndex(null);
    }
  };

  const stopScaleAudio = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current = null;
      } catch (e) {}
    }
    setIsPlayingScale(false);
    setCurrentPlayingNoteIndex(null);
  };

  const activeNotes = safeScaleInfo?.notes || notes;

  if (isScale && safeScaleInfo) {
    const scaleNotesList = safeScaleInfo.notes.includes(safeScaleInfo.notes[0]) && safeScaleInfo.notes.lastIndexOf(safeScaleInfo.notes[0]) > 0
      ? safeScaleInfo.notes
      : [...safeScaleInfo.notes, safeScaleInfo.notes[0]];

    const cleanedFormula = safeScaleInfo.formula.split('-').join(' - ');

    const degreesList = safeScaleInfo.degrees.length === scaleNotesList.length
      ? safeScaleInfo.degrees
      : [...safeScaleInfo.degrees, '1'];

    const degreeNamesList = safeScaleInfo.degreeNames.length === scaleNotesList.length
      ? safeScaleInfo.degreeNames
      : [...safeScaleInfo.degreeNames, 'Tonic'];

    const getScaleType = () => {
      const lower = title.toLowerCase();
      if (lower.includes('pentatonic')) return 'Pentatonic';
      if (lower.includes('blues')) return 'Blues';
      if (lower.includes('whole tone')) return 'Whole Tone';
      if (lower.includes('diminished')) return 'Diminished';
      if (lower.includes('bebop')) return 'Bebop';
      if (lower.includes('chromatic')) return 'Chromatic';
      return 'Diatonic';
    };

    const getScaleCharacter = () => {
      const lower = title.toLowerCase();
      if (lower.includes('harmonic minor')) return 'Exotic, Mystical, Tension';
      if (lower.includes('melodic minor')) return 'Expressive, Classical, Elegant';
      if (lower.includes('minor')) return 'Sad, Dark, Serious';
      if (lower.includes('major')) return 'Bright, Clear, Stable';
      if (lower.includes('blues')) return 'Expressive, Soulful, Gritty';
      if (lower.includes('whole tone')) return 'Dreamy, Floating, Suspended';
      if (lower.includes('diminished')) return 'Tense, Symmetrical, Suspense';
      return 'Mysterious, Evocative, Unique';
    };

    const difficultyColors = {
      Beginner: 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400',
      Intermediate: 'bg-amber-950/20 border-amber-500/40 text-amber-400',
      Advanced: 'bg-rose-950/20 border-rose-500/40 text-rose-400',
    };

    const isKeyActive = (keyNote: string, altNote?: string) => {
      const activePlayNotes = safeScaleInfo.playNotes.map(n => normalizeNoteName(n));
      const normKey = normalizeNoteName(keyNote);
      const normAlt = altNote ? normalizeNoteName(altNote) : '';
      return activePlayNotes.includes(normKey) || (normAlt && activePlayNotes.includes(normAlt));
    };

    const isKeyPlaying = (keyNote: string, altNote?: string) => {
      if (currentPlayingNoteIndex === null) return false;
      const notesToPlay = title.includes('Melodic Minor')
        ? safeScaleInfo.playNotes
        : [...safeScaleInfo.playNotes, ...[...safeScaleInfo.playNotes].reverse().slice(1)];
        
      if (currentPlayingNoteIndex >= notesToPlay.length) return false;
      const currentNote = normalizeNoteName(notesToPlay[currentPlayingNoteIndex]);
      const normKey = normalizeNoteName(keyNote);
      const normAlt = altNote ? normalizeNoteName(altNote) : '';
      return currentNote === normKey || (normAlt && currentNote === normAlt);
    };

    const relativeTitle = safeScaleInfo.relativeMinor.toLowerCase().includes('major') ? 'Relative Major' : 'Relative Minor';

    const WHITE_KEYS = [
      { note: 'C4', label: 'C4' },
      { note: 'D4' },
      { note: 'E4' },
      { note: 'F4' },
      { note: 'G4' },
      { note: 'A4' },
      { note: 'B4' },
      { note: 'C5', label: 'C5' },
      { note: 'D5' },
      { note: 'E5' },
      { note: 'F5' },
      { note: 'G5' },
      { note: 'A5' },
      { note: 'B5' },
      { note: 'C6', label: 'C6' }
    ];

    const BLACK_KEYS = [
      { note: 'C#4', altNote: 'Db4', index: 0 },
      { note: 'D#4', altNote: 'Eb4', index: 1 },
      { note: 'F#4', altNote: 'Gb4', index: 3 },
      { note: 'G#4', altNote: 'Ab4', index: 4 },
      { note: 'A#4', altNote: 'Bb4', index: 5 },
      { note: 'C#5', altNote: 'Db5', index: 7 },
      { note: 'D#5', altNote: 'Eb5', index: 8 },
      { note: 'F#5', altNote: 'Gb5', index: 10 },
      { note: 'G#5', altNote: 'Ab5', index: 11 },
      { note: 'A#5', altNote: 'Bb5', index: 12 }
    ];

    const renderCompactFingering = (rightFingers: string[], leftFingers: string[]) => {
      return (
        <div className="glass p-4 rounded-xl border border-border/25 flex flex-col space-y-3">
          <div className="flex flex-col space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground tracking-widest">Right Hand Fingering</span>
            <div className="flex flex-wrap gap-3 text-sm font-semibold text-purple-300 font-mono">
              {rightFingers.map((f, i) => (
                <span key={i} className="w-4 text-center">{f}</span>
              ))}
            </div>
          </div>
          <div className="border-t border-border/15 my-2" />
          <div className="flex flex-col space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground tracking-widest">Left Hand Fingering</span>
            <div className="flex flex-wrap gap-3 text-sm font-semibold text-purple-300 font-mono">
              {leftFingers.map((f, i) => (
                <span key={i} className="w-4 text-center">{f}</span>
              ))}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div
        onClick={logInteraction}
        className="bg-[#0b0c11] border border-border/30 rounded-3xl p-6 relative flex flex-col space-y-5 overflow-hidden shadow-glow/5 hover:border-primary/40 hover:shadow-glow transition-all duration-300 group select-none"
      >
        {/* Radial top glow */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-purple-500/10 via-transparent to-transparent pointer-events-none z-0" />

        {/* 1. Header Section */}
        <div className="relative flex justify-between items-start z-10">
          <div>
            <h3 className="text-3xl font-extrabold text-white tracking-tight mb-0.5">
              {safeScaleInfo.name}
            </h3>
          </div>
          
          {/* Controls: Play & Bookmark */}
          <div className="flex items-center gap-2">
            {/* Play Button */}
            <button
              onClick={playScaleAudio}
              className="p-2.5 rounded-xl bg-gradient-primary hover:shadow-glow flex items-center justify-center text-white transition-all hover:scale-105 shrink-0"
              title={isPlayingScale ? 'Stop scale' : 'Play scale'}
            >
              {isPlayingScale ? (
                <Square className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white translate-x-0.5" />
              )}
            </button>

            {/* Star Bookmark Button */}
            <button
              onClick={handleFavorite}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors shrink-0"
              title={isFavorited ? 'Remove bookmark' : 'Bookmark card'}
            >
              <Star className={`w-4 h-4 ${isFavorited ? 'fill-purple-400 text-purple-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* 3. Virtual Piano Keyboard Section */}
        <div className="relative z-10 flex flex-col">
          <div className="w-full bg-[#07080c] border border-border/40 p-4 rounded-2xl relative flex flex-col space-y-2">
            <div className="relative h-28 w-full rounded-xl overflow-hidden border border-black/60 bg-[#16171e] select-none">
              {/* White keys container */}
              <div className="absolute inset-0 flex">
                {WHITE_KEYS.map((key) => {
                  const active = isKeyActive(key.note);
                  const playing = isKeyPlaying(key.note);
                  return (
                    <div
                      key={key.note}
                      className={`relative flex-1 border-r border-black/10 last:border-0 h-full transition-all duration-150 flex flex-col justify-end pb-3 items-center ${
                        playing
                          ? 'bg-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.8)] z-10 text-white'
                          : active
                          ? 'bg-[#f3efff] border-b-4 border-b-purple-500'
                          : 'bg-white hover:bg-neutral-100 text-neutral-800'
                      }`}
                      style={{ borderRadius: '0 0 4px 4px' }}
                    >
                      {active && (
                        <div className={`w-2 h-2 rounded-full transition-all duration-150 ${playing ? 'bg-white scale-125 shadow-[0_0_6px_white]' : 'bg-purple-300/85'}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Black keys container */}
              {BLACK_KEYS.map((key) => {
                const active = isKeyActive(key.note, key.altNote);
                const playing = isKeyPlaying(key.note, key.altNote);
                const leftPos = `calc((${key.index + 1} * 100% / 15) - 1.9%)`;
                return (
                  <div
                    key={key.note}
                    className={`absolute top-0 h-[60%] w-[3.8%] transition-all duration-150 border border-black/80 shadow-md ${
                      playing
                        ? 'bg-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.8)] z-30 text-white'
                        : active
                        ? 'bg-[#2a1b4d] border border-purple-500/50 border-b-4 border-b-purple-400 z-25'
                        : 'bg-[#181920] hover:bg-neutral-800 z-20'
                    }`}
                    style={{
                      left: leftPos,
                      borderRadius: '0 0 3px 3px'
                    }}
                  >
                    {active && (
                      <div className={`absolute bottom-1.5 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-all duration-150 ${playing ? 'bg-white scale-125 shadow-[0_0_6px_white]' : 'bg-purple-300'}`} />
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Key Labels */}
            <div className="relative flex text-[9px] font-mono text-muted-foreground/60 select-none">
              {WHITE_KEYS.map((key, idx) => (
                <div key={idx} className="flex-1 text-center font-bold">
                  {key.label ? key.label : ''}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Notes, Key Signature, Relative Minor AND Compact Fingering Section side-by-side */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Notes, Key Signature, Relative Minor info section */}
          <div className="glass p-5 rounded-2xl border border-border/25 flex flex-col justify-between space-y-4">
            <div>
              <h4 className="text-xs font-bold text-muted-foreground tracking-wide mb-1.5">
                Notes
              </h4>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-base font-bold text-foreground select-none">
                {scaleNotesList.map((n, idx) => (
                  <span key={idx} className="text-purple-300">{n}</span>
                ))}
              </div>
            </div>

            <div className="border-t border-border/15 pt-3 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground block">
                  Key Signature
                </span>
                <span className="font-bold text-foreground mt-0.5 block">{safeScaleInfo.keySignature}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground block">
                  {relativeTitle}
                </span>
                <span className="font-bold text-foreground mt-0.5 block">
                  {safeScaleInfo.relativeMinor.replace(' (Relative Major)', '').replace(' Natural Minor', ' Minor')}
                </span>
              </div>
            </div>
          </div>

          {/* Compact Fingering Section */}
          <div>
            {renderCompactFingering(
              safeScaleInfo.rightHandFingering.split('-'),
              safeScaleInfo.leftHandFingering.split('-')
            )}
          </div>
        </div>

        {/* 6. Related section */}
        <div className="relative z-10 border-t border-border/25 pt-4 grid grid-cols-2 gap-4">
          {/* Related Chords */}
          <div className="flex flex-col space-y-1 border-r border-border/15 pr-2">
            <span className="text-[10px] font-bold text-muted-foreground">Related Chords</span>
            <div className="flex flex-col space-y-0.5 text-xs text-white/80 select-none">
              {safeScaleInfo.relatedChords.length > 0 ? (
                safeScaleInfo.relatedChords.slice(0, 3).map((chord, idx) => (
                  <span key={idx} className="font-semibold truncate">{chord}</span>
                ))
              ) : (
                <span className="text-muted-foreground italic text-[10px]">No chord data</span>
              )}
            </div>
          </div>

          {/* Related Arpeggios */}
          <div className="flex flex-col space-y-1 pl-2">
            <span className="text-[10px] font-bold text-muted-foreground">Related Arpeggios</span>
            <div className="flex flex-col space-y-0.5 text-xs text-white/80 select-none">
              {safeScaleInfo.relatedArpeggios.length > 0 ? (
                safeScaleInfo.relatedArpeggios.slice(0, 3).map((arpeggio, idx) => (
                  <span key={idx} className="font-semibold truncate">{arpeggio}</span>
                ))
              ) : (
                <span className="text-muted-foreground italic text-[10px]">No arpeggio data</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback / Original reference card layout for non-scales (Chords, Intervals, Notation, etc)
  return (
    <div
      onClick={logInteraction}
      className="glass rounded-xl overflow-hidden border border-border/30 hover:border-primary/50 hover:shadow-glow transition-all duration-300 flex flex-col h-full group"
    >
      {/* Header section */}
      <div className={`bg-gradient-to-r ${gradient} p-4 relative`}>
        <div className="pr-8">
          <h3 className="font-bold text-white text-base truncate mb-0.5" title={title}>
            {title}
          </h3>
        </div>
        
        {/* Star Button */}
        <button
          onClick={handleFavorite}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-black/25 hover:bg-black/45 border border-white/10 text-white transition-colors"
          title={isFavorited ? 'Remove bookmark' : 'Bookmark card'}
        >
          <Star className={`w-3.5 h-3.5 ${isFavorited ? 'fill-yellow-400 text-yellow-400' : ''}`} />
        </button>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3.5">
          {description && (
            <div>
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Description
              </h4>
              <p className="text-xs text-foreground/90 leading-relaxed">
                {description}
              </p>
            </div>
          )}

          {/* Formula */}
          {formula && (
            <div>
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Pattern/Formula
              </h4>
              <p className="text-[10px] font-mono bg-card/60 rounded px-2 py-1 text-primary border border-border/20 inline-block">
                {formula}
              </p>
            </div>
          )}

          {/* Notes display */}
          {activeNotes.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Notes
              </h4>
              <div className="flex flex-wrap gap-1">
                {activeNotes.map((note, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center justify-center min-w-[2.25rem] h-8 px-2 rounded-lg bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary shadow-sm"
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Intervals */}
          {intervals.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Interval Structure
              </h4>
              <div className="flex flex-wrap gap-1">
                {intervals.map((interval, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center justify-center px-2 py-1 rounded bg-card/65 border border-border/20 text-[10px] text-foreground/80 font-medium"
                  >
                    {interval}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {image && (
          <div className="pt-3 border-t border-border/20 mt-3">
            <div className="w-full h-24 rounded-lg bg-card/40 border border-border/20 flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={title}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
