'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Square, Star, BookOpen } from 'lucide-react';
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
  
  saved_cards: 'from-purple-600 to-fuchsia-700'
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
  onFavoriteToggle,
}: ReferenceCardProps) {
  const gradient = SECTION_GRADIENT[sectionSlug] ?? 'from-primary to-secondary';
  
  const [isFavorited, setIsFavorited] = useState(false);
  const [isPlayingScale, setIsPlayingScale] = useState(false);
  
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
  const isScale = sectionSlug.includes('scales') || sectionSlug.includes('mode');
  const scaleInfo = isScale ? SCALES_REGISTRY[title] : null;

  const playScaleAudio = () => {
    if (isPlayingScale) {
      stopScaleAudio();
      return;
    }

    const scale = scaleInfo || SCALES_REGISTRY[title];
    if (!scale) return;

    logInteraction();
    setIsPlayingScale(true);

    try {
      const notesToPlay = title.includes('Melodic Minor')
        ? scale.playNotes
        : [...scale.playNotes, ...[...scale.playNotes].reverse().slice(1)];

      const queryNotes = notesToPlay.join(',');
      const audioUrl = `/api/reference/audio?notes=${encodeURIComponent(queryNotes)}`;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.play().catch((err) => {
        console.error('[ReferenceCard] playback error:', err);
        setIsPlayingScale(false);
      });

      audio.onended = () => {
        setIsPlayingScale(false);
      };

      audio.onerror = () => {
        setIsPlayingScale(false);
      };
    } catch (e) {
      console.error(e);
      setIsPlayingScale(false);
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
  };



  const activeNotes = scaleInfo?.notes || notes;

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
          <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider">
            {categoryLabel || sectionSlug.replace(/_/g, ' ')}
          </p>
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

          {/* Scale Specific Stats */}
          {scaleInfo && (
            <div className="grid grid-cols-2 gap-2 bg-black/15 p-2 rounded-lg border border-border/20 text-xs">
              <div>
                <span className="text-[9px] font-bold text-muted-foreground block uppercase">
                  Key Signature
                </span>
                <span className="font-semibold text-foreground">{scaleInfo.keySignature}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-muted-foreground block uppercase">
                  Relative Minor
                </span>
                <span className="font-semibold text-foreground/80">{scaleInfo.relativeMinor}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-muted-foreground block uppercase">
                  RH Fingering
                </span>
                <span className="font-mono text-primary font-semibold">{scaleInfo.rightHandFingering}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-muted-foreground block uppercase">
                  LH Fingering
                </span>
                <span className="font-mono text-primary font-semibold">{scaleInfo.leftHandFingering}</span>
              </div>
              {scaleInfo.enharmonicEquivalent && (
                <div className="col-span-2 border-t border-border/10 pt-1.5 mt-0.5">
                  <span className="text-[9px] font-bold text-muted-foreground block uppercase">
                    Enharmonic Equivalent
                  </span>
                  <span className="font-semibold text-primary/95">{scaleInfo.enharmonicEquivalent}</span>
                </div>
              )}
            </div>
          )}

          {/* Scale Degrees */}
          {scaleInfo && (
            <div>
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Scale Degrees
              </h4>
              <div className="flex flex-wrap gap-1">
                {scaleInfo.degrees.map((deg, dIdx) => (
                  <span
                    key={dIdx}
                    className="inline-flex flex-col items-center justify-center p-1 px-2 rounded bg-card/65 border border-border/20 text-[10px] font-medium"
                    title={scaleInfo.degreeNames[dIdx]}
                  >
                    <span className="font-mono font-bold text-primary">{deg}</span>
                    <span className="text-[8px] text-muted-foreground scale-95 mt-0.5">
                      {scaleInfo.degreeNames[dIdx].slice(0, 5)}
                    </span>
                  </span>
                ))}
              </div>
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

          {/* Playback Controls (Scales only) */}
          {(scaleInfo || title.includes('Scale')) && (
            <div className="pt-1">
              <Button
                onClick={playScaleAudio}
                className="w-full h-8 text-xs font-semibold bg-gradient-primary hover:shadow-glow text-white"
                size="sm"
              >
                {isPlayingScale ? (
                  <>
                    <Square className="w-3.5 h-3.5 mr-1.5 fill-white" />
                    Stop Playback
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 mr-1.5 fill-white" />
                    Play Scale
                  </>
                )}
              </Button>
            </div>
          )}



          {/* Intervals */}
          {!isScale && intervals.length > 0 && (
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

        {/* Display related items for Scales */}
        {scaleInfo && (
          <div className="pt-2 border-t border-border/25 text-[10px] space-y-1.5">
            <div>
              <span className="font-bold text-muted-foreground block uppercase text-[8px]">Related Chords</span>
              <span className="text-foreground/75 font-medium">{scaleInfo.relatedChords.join(', ')}</span>
            </div>
            <div>
              <span className="font-bold text-muted-foreground block uppercase text-[8px]">Related Arpeggios</span>
              <span className="text-foreground/75 font-medium">{scaleInfo.relatedArpeggios.join(', ')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
