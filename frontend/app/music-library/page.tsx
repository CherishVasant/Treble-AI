'use client';

import { useEffect, useMemo, useState, Suspense, useRef } from 'react';
import { Search, ChevronRight, Star, Home, Play, Square, Info } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import ReferenceCard from '@/components/reference-card';
import { toast } from 'sonner';
import PageHeader from '@/components/ui/page-header';
import { SCALES_REGISTRY } from '@/lib/scales-data';

type ReferenceEntry = {
  id: string | number;
  title: string;
  description?: string | null;
  formula?: string | null;
  notes?: string[];
  intervals?: string[];
  categorySlug?: string;
};

type ReferenceSection = {
  slug: string;
  title: string;
  description?: string | null;
  entries: ReferenceEntry[];
};

const MUSIC_LIBRARY_GROUPS = [
  {
    name: 'Scales',
    defaultSlug: 'major_scales',
    slugs: ['major_scales', 'natural_minor_scales', 'harmonic_minor_scales', 'melodic_minor_scales', 'chromatic_scales', 'major_pentatonic_scales', 'minor_pentatonic_scales', 'blues_scales', 'whole_tone_scales', 'diminished_scales', 'bebop_scales'],
    items: [
      { slug: 'major_scales', label: 'Major' },
      { slug: 'natural_minor_scales', label: 'Natural Minor' },
      { slug: 'harmonic_minor_scales', label: 'Harmonic Minor' },
      { slug: 'melodic_minor_scales', label: 'Melodic Minor' },
      { slug: 'major_pentatonic_scales', label: 'Major Pentatonic' },
      { slug: 'minor_pentatonic_scales', label: 'Minor Pentatonic' },
      { slug: 'blues_scales', label: 'Blues' },
      { slug: 'chromatic_scales', label: 'Chromatic' },
      { slug: 'whole_tone_scales', label: 'Whole Tone' },
      { slug: 'diminished_scales', label: 'Diminished' },
      { slug: 'bebop_scales', label: 'Bebop' }
    ]
  },
  {
    name: 'Modes',
    defaultSlug: 'ionian_mode',
    slugs: ['ionian_mode', 'dorian_mode', 'phrygian_mode', 'lydian_mode', 'mixolydian_mode', 'aeolian_mode', 'locrian_mode'],
    items: [
      { slug: 'ionian_mode', label: 'Ionian' },
      { slug: 'dorian_mode', label: 'Dorian' },
      { slug: 'phrygian_mode', label: 'Phrygian' },
      { slug: 'lydian_mode', label: 'Lydian' },
      { slug: 'mixolydian_mode', label: 'Mixolydian' },
      { slug: 'aeolian_mode', label: 'Aeolian' },
      { slug: 'locrian_mode', label: 'Locrian' },
    ]
  },
  {
    name: 'Chords',
    defaultSlug: 'major_chords',
    slugs: ['major_chords', 'minor_chords', 'diminished_chords', 'augmented_chords', 'suspended_chords', 'dominant_seventh_chords', 'major_seventh_chords', 'minor_seventh_chords', 'half_diminished_chords', 'fully_diminished_chords', 'sixth_chords', 'ninth_chords', 'eleventh_chords', 'thirteenth_chords', 'altered_chords'],
    items: [
      { slug: 'major_chords', label: 'Major' },
      { slug: 'minor_chords', label: 'Minor' },
      { slug: 'diminished_chords', label: 'Diminished' },
      { slug: 'augmented_chords', label: 'Augmented' },
      { slug: 'suspended_chords', label: 'Suspended' },
      { slug: 'dominant_seventh_chords', label: 'Dominant 7th' },
      { slug: 'major_seventh_chords', label: 'Major 7th' },
      { slug: 'minor_seventh_chords', label: 'Minor 7th' },
      { slug: 'half_diminished_chords', label: 'Half-Diminished' },
      { slug: 'fully_diminished_chords', label: 'Fully Diminished' },
      { slug: 'sixth_chords', label: 'Sixth' },
      { slug: 'ninth_chords', label: 'Ninth' },
      { slug: 'eleventh_chords', label: 'Eleventh' },
      { slug: 'thirteenth_chords', label: 'Thirteenth' },
      { slug: 'altered_chords', label: 'Altered' },
    ]
  },
  {
    name: 'Arpeggios',
    defaultSlug: 'major_arpeggios',
    slugs: ['major_arpeggios', 'minor_arpeggios', 'diminished_arpeggios', 'augmented_arpeggios', 'dominant_seventh_arpeggios', 'major_seventh_arpeggios', 'minor_seventh_arpeggios'],
    items: [
      { slug: 'major_arpeggios', label: 'Major' },
      { slug: 'minor_arpeggios', label: 'Minor' },
      { slug: 'diminished_arpeggios', label: 'Diminished' },
      { slug: 'augmented_arpeggios', label: 'Augmented' },
      { slug: 'dominant_seventh_arpeggios', label: 'Dominant 7th' },
      { slug: 'major_seventh_arpeggios', label: 'Major 7th' },
      { slug: 'minor_seventh_arpeggios', label: 'Minor 7th' },
    ]
  },
  {
    name: 'Intervals',
    defaultSlug: 'interval_unison',
    slugs: ['interval_unison', 'interval_minor_second', 'interval_major_second', 'interval_minor_third', 'interval_major_third', 'interval_perfect_fourth', 'interval_tritone', 'interval_perfect_fifth', 'interval_minor_sixth', 'interval_major_sixth', 'interval_minor_seventh', 'interval_major_seventh', 'interval_octave'],
    items: [
      { slug: 'interval_unison', label: 'Unison' },
      { slug: 'interval_minor_second', label: 'Minor 2nd' },
      { slug: 'interval_major_second', label: 'Major 2nd' },
      { slug: 'interval_minor_third', label: 'Minor 3rd' },
      { slug: 'interval_major_third', label: 'Major 3rd' },
      { slug: 'interval_perfect_fourth', label: 'Perfect 4th' },
      { slug: 'interval_tritone', label: 'Tritone' },
      { slug: 'interval_perfect_fifth', label: 'Perfect 5th' },
      { slug: 'interval_minor_sixth', label: 'Minor 6th' },
      { slug: 'interval_major_sixth', label: 'Major 6th' },
      { slug: 'interval_minor_seventh', label: 'Minor 7th' },
      { slug: 'interval_major_seventh', label: 'Major 7th' },
      { slug: 'interval_octave', label: 'Octave' },
    ]
  },
  {
    name: 'Notation',
    defaultSlug: 'notation_clefs',
    slugs: ['notation_clefs', 'notation_dynamics', 'notation_articulations', 'notation_tempo_markings', 'notation_repeats', 'notation_endings', 'notation_pedal_markings', 'notation_ornaments', 'notation_slurs', 'notation_ties', 'notation_tuplets'],
    items: [
      { slug: 'notation_clefs', label: 'Clefs' },
      { slug: 'notation_dynamics', label: 'Dynamics' },
      { slug: 'notation_articulations', label: 'Articulations' },
      { slug: 'notation_tempo_markings', label: 'Tempo Markings' },
      { slug: 'notation_repeats', label: 'Repeats' },
      { slug: 'notation_endings', label: 'Endings' },
      { slug: 'notation_pedal_markings', label: 'Pedal Markings' },
      { slug: 'notation_ornaments', label: 'Ornaments' },
      { slug: 'notation_slurs', label: 'Slurs' },
      { slug: 'notation_ties', label: 'Ties' },
      { slug: 'notation_tuplets', label: 'Tuplets' },
    ]
  },
  {
    name: 'Music History',
    defaultSlug: 'circle_of_fifths',
    slugs: ['circle_of_fifths', 'key_signatures', 'time_signatures', 'scale_degrees', 'chord_functions', 'harmonic_progressions', 'cadences', 'modes_theory', 'voice_leading'],
    items: [
      { slug: 'circle_of_fifths', label: 'Circle of Fifths' },
      { slug: 'key_signatures', label: 'Key Signatures' },
      { slug: 'time_signatures', label: 'Time Signatures' },
      { slug: 'scale_degrees', label: 'Scale Degrees' },
      { slug: 'chord_functions', label: 'Chord Functions' },
      { slug: 'harmonic_progressions', label: 'Harmonic Progressions' },
      { slug: 'cadences', label: 'Cadences' },
      { slug: 'modes_theory', label: 'Modes' },
      { slug: 'voice_leading', label: 'Voice Leading' },
    ]
  }
];

const CHROMATIC_SCALE_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const getIntervalNote = (root: string, semitones: number): string => {
  const rootIndex = CHROMATIC_SCALE_NOTES.indexOf(root);
  if (rootIndex === -1) return root;
  const targetIndex = (rootIndex + semitones) % 12;
  return CHROMATIC_SCALE_NOTES[targetIndex];
};

const INTERVALS_LIST = [
  { slug: 'interval_unison', name: 'Perfect Unison', abbr: 'P1', semitones: 0, quality: 'Perfect Consonance', desc: 'The replication of the same pitch. Zero step difference.' },
  { slug: 'interval_minor_second', name: 'Minor Second', abbr: 'm2', semitones: 1, quality: 'Dissonant', desc: 'A sharp, tense clash. Half-step difference. Basis of chromaticism.' },
  { slug: 'interval_major_second', name: 'Major Second', abbr: 'M2', semitones: 2, quality: 'Dissonant', desc: 'A whole-step step-wise motion. Mild tension.' },
  { slug: 'interval_minor_third', name: 'Minor Third', abbr: 'm3', semitones: 3, quality: 'Imperfect Consonance', desc: 'The core defining interval of minor triads. Sad or dark color.' },
  { slug: 'interval_major_third', name: 'Major Third', abbr: 'M3', semitones: 4, quality: 'Imperfect Consonance', desc: 'The core defining interval of major triads. Bright and stable.' },
  { slug: 'interval_perfect_fourth', name: 'Perfect Fourth', abbr: 'P4', semitones: 5, quality: 'Perfect Consonance / Dissonant', desc: 'A hollow, floating sound. Perfect consonance in harmony, but historically treated as dissonant in two-voice writing.' },
  { slug: 'interval_tritone', name: 'Tritone', abbr: 'd5/A4', semitones: 6, quality: 'Highly Dissonant', desc: 'The "Diabolus in Musica". Splits the octave exactly in half. Creates strong harmonic pull.' },
  { slug: 'interval_perfect_fifth', name: 'Perfect Fifth', abbr: 'P5', semitones: 7, quality: 'Perfect Consonance', desc: 'The second most consonant interval after the octave. Highly stable and resonant.' },
  { slug: 'interval_minor_sixth', name: 'Minor Sixth', abbr: 'm6', semitones: 8, quality: 'Imperfect Consonance', desc: 'An emotional, melancholic color. Often used to resolve to a perfect fifth.' },
  { slug: 'interval_major_sixth', name: 'Major Sixth', abbr: 'M6', semitones: 9, quality: 'Imperfect Consonance', desc: 'A warm, sweet sounding consonance. Common in vocal duets.' },
  { slug: 'interval_minor_seventh', name: 'Minor Seventh', abbr: 'm7', semitones: 10, quality: 'Dissonant', desc: 'A mellow dissonance. Foundation of dominant seventh and minor seventh chords.' },
  { slug: 'interval_major_seventh', name: 'Major Seventh', abbr: 'M7', semitones: 11, quality: 'Dissonant', desc: 'A highly tense clash that resolves strongly upward to the octave.' },
  { slug: 'interval_octave', name: 'Perfect Octave', abbr: 'P8', semitones: 12, quality: 'Perfect Consonance', desc: 'Double the frequency of the root note. Absolute stability.' }
];

const CIRCLE_SECTORS = [
  {
    major: 'C',
    minor: 'A',
    accidentals: '0 Sharps/Flats',
    accidentalCount: 0,
    type: 'neutral',
    majorNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    minorNotes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    majorChords: ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
    minorChords: ['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G'],
    playNotesMajor: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
    playNotesMinor: ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'],
    characterMajor: 'Bright, Clear, Open',
    characterMinor: 'Serious, Melancholic, Pure'
  },
  {
    major: 'G',
    minor: 'E',
    accidentals: '1 Sharp (F#)',
    accidentalCount: 1,
    type: 'sharp',
    majorNotes: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
    minorNotes: ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
    majorChords: ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'],
    minorChords: ['Em', 'F#dim', 'G', 'Am', 'Bm', 'C', 'D'],
    playNotesMajor: ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5'],
    playNotesMinor: ['E4', 'F#4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'],
    characterMajor: 'Warm, Peaceful, Pastoral',
    characterMinor: 'Grief-stricken, Nostalgic'
  },
  {
    major: 'D',
    minor: 'B',
    accidentals: '2 Sharps (F#, C#)',
    accidentalCount: 2,
    type: 'sharp',
    majorNotes: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
    minorNotes: ['B', 'C#', 'D', 'E', 'F#', 'G', 'A'],
    majorChords: ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'],
    minorChords: ['Bm', 'C#dim', 'D', 'Em', 'F#m', 'G', 'A'],
    playNotesMajor: ['D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5', 'D5'],
    playNotesMinor: ['B3', 'C#4', 'D4', 'E4', 'F#4', 'G4', 'A4', 'B4'],
    characterMajor: 'Triumphant, Joyful, Festive',
    characterMinor: 'Dark, Resigned, Thoughtful'
  },
  {
    major: 'A',
    minor: 'F#',
    accidentals: '3 Sharps (F#, C#, G#)',
    accidentalCount: 3,
    type: 'sharp',
    majorNotes: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
    minorNotes: ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E'],
    majorChords: ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#dim'],
    minorChords: ['F#m', 'G#dim', 'A', 'Bm', 'C#m', 'D', 'E'],
    playNotesMajor: ['A4', 'B4', 'C#5', 'D5', 'E5', 'F#5', 'G#5', 'A5'],
    playNotesMinor: ['F#4', 'G#4', 'A4', 'B4', 'C#5', 'D5', 'E5', 'F#5'],
    characterMajor: 'Brilliant, Joyous, Youthful',
    characterMinor: 'Gloomy, Passionate, Melancholic'
  },
  {
    major: 'E',
    minor: 'C#',
    accidentals: '4 Sharps (F#, C#, G#, D#)',
    accidentalCount: 4,
    type: 'sharp',
    majorNotes: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
    minorNotes: ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B'],
    majorChords: ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#dim'],
    minorChords: ['C#m', 'D#dim', 'E', 'F#m', 'G#m', 'A', 'B'],
    playNotesMajor: ['E4', 'F#4', 'G#4', 'A4', 'B4', 'C#5', 'D#5', 'E5'],
    playNotesMinor: ['C#4', 'D#4', 'E4', 'F#4', 'G#4', 'A4', 'B4', 'C#5'],
    characterMajor: 'Luminous, Majestic, Bright',
    characterMinor: 'Anxious, Deeply Mournful'
  },
  {
    major: 'B',
    minor: 'G#',
    accidentals: '5 Sharps (F#, C#, G#, D#, A#)',
    accidentalCount: 5,
    type: 'sharp',
    majorNotes: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
    minorNotes: ['G#', 'A#', 'B', 'C#', 'D#', 'E', 'F#'],
    majorChords: ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m', 'A#dim'],
    minorChords: ['G#m', 'A#dim', 'B', 'C#m', 'D#m', 'E', 'F#'],
    playNotesMajor: ['B3', 'C#4', 'D#4', 'E4', 'F#4', 'G#4', 'A#4', 'B4'],
    playNotesMinor: ['G#4', 'A#4', 'B4', 'C#5', 'D#5', 'E5', 'F#5', 'G#5'],
    characterMajor: 'Noble, Clear, Shimmering',
    characterMinor: 'Regretful, Soft, Serious'
  },
  {
    major: 'F#',
    minor: 'D#',
    accidentals: '6 Sharps (F#, C#, G#, D#, A#, E#)',
    accidentalCount: 6,
    type: 'sharp',
    majorNotes: ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'],
    minorNotes: ['D#', 'E#', 'F#', 'G#', 'A#', 'B', 'C#'],
    majorChords: ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'E#dim'],
    minorChords: ['D#m', 'E#dim', 'F#', 'G#m', 'A#m', 'B', 'C#'],
    playNotesMajor: ['F#4', 'G#4', 'A#4', 'B4', 'C#5', 'D#5', 'E#5', 'F#5'],
    playNotesMinor: ['D#4', 'E#4', 'F#4', 'G#4', 'A#4', 'B4', 'C#5', 'D#5'],
    characterMajor: 'Brilliant, Triumphant, Complex',
    characterMinor: 'Brooding, Dark, Mystical'
  },
  {
    major: 'Db',
    minor: 'Bb',
    accidentals: '5 Flats (Bb, Eb, Ab, Db, Gb)',
    accidentalCount: 5,
    type: 'flat',
    majorNotes: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'],
    minorNotes: ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'Ab'],
    majorChords: ['Db', 'Ebm', 'Fm', 'Gb', 'Ab', 'Bbm', 'Cdim'],
    minorChords: ['Bbm', 'Cdim', 'Db', 'Ebm', 'Fm', 'Gb', 'Ab'],
    playNotesMajor: ['C#4', 'D#4', 'F4', 'F#4', 'G#4', 'A#4', 'C5', 'C#5'],
    playNotesMinor: ['A#3', 'C4', 'C#4', 'D#4', 'F4', 'F#4', 'G#4', 'A#4'],
    characterMajor: 'Warm, Soft, Comforting',
    characterMinor: 'Melancholic, Sweet, Quiet'
  },
  {
    major: 'Ab',
    minor: 'F',
    accidentals: '4 Flats (Bb, Eb, Ab, Db)',
    accidentalCount: 4,
    type: 'flat',
    majorNotes: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
    minorNotes: ['F', 'G', 'Ab', 'Bb', 'C', 'Db', 'Eb'],
    majorChords: ['Ab', 'Bbm', 'Cm', 'Db', 'Eb', 'F', 'Gdim'],
    minorChords: ['Fm', 'Gdim', 'Ab', 'Bbm', 'Cm', 'Db', 'Eb'],
    playNotesMajor: ['G#4', 'A#4', 'C5', 'C#5', 'D#5', 'F5', 'G5', 'G#5'],
    playNotesMinor: ['F4', 'G4', 'G#4', 'A#4', 'C5', 'C#5', 'D#5', 'F5'],
    characterMajor: 'Noble, Deep, Dignified',
    characterMinor: 'Dark, Somber, Mournful'
  },
  {
    major: 'Eb',
    minor: 'C',
    accidentals: '3 Flats (Bb, Eb, Ab)',
    accidentalCount: 3,
    type: 'flat',
    majorNotes: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
    minorNotes: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],
    majorChords: ['Eb', 'Fm', 'Gm', 'Ab', 'Bb', 'Cm', 'Ddim'],
    minorChords: ['Cm', 'Ddim', 'Eb', 'Fm', 'Gm', 'Ab', 'Bb'],
    playNotesMajor: ['D#4', 'F4', 'G4', 'G#4', 'A#4', 'C5', 'D5', 'D#5'],
    playNotesMinor: ['C4', 'D4', 'D#4', 'F4', 'G4', 'G#4', 'A#4', 'C5'],
    characterMajor: 'Solemn, Heroic, Devotional',
    characterMinor: 'Lamenting, Heavy, Sad'
  },
  {
    major: 'Bb',
    minor: 'G',
    accidentals: '2 Flats (Bb, Eb)',
    accidentalCount: 2,
    type: 'flat',
    majorNotes: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
    minorNotes: ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'F'],
    majorChords: ['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'Adim'],
    minorChords: ['Gm', 'Adim', 'Bb', 'Cm', 'Dm', 'Eb', 'F'],
    playNotesMajor: ['A#3', 'C4', 'D4', 'D#4', 'F4', 'G4', 'A4', 'A#4'],
    playNotesMinor: ['G4', 'A4', 'A#4', 'C5', 'D5', 'D#5', 'F5', 'G5'],
    characterMajor: 'Cheerful, Open, Bright',
    characterMinor: 'Tense, Quietly Tragic'
  },
  {
    major: 'F',
    minor: 'D',
    accidentals: '1 Flat (Bb)',
    accidentalCount: 1,
    type: 'flat',
    majorNotes: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
    minorNotes: ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'],
    majorChords: ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim'],
    minorChords: ['Dm', 'Edim', 'F', 'Gm', 'Am', 'Bb', 'C'],
    playNotesMajor: ['F4', 'G4', 'A4', 'A#4', 'C5', 'D5', 'E5', 'F5'],
    playNotesMinor: ['D4', 'E4', 'F4', 'G4', 'A4', 'A#4', 'C5', 'D5'],
    characterMajor: 'Pastoral, Calm, Contemplative',
    characterMinor: 'Melodramatic, Serious'
  }
];

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function describeSector(x: number, y: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
  const p1 = polarToCartesian(x, y, outerRadius, startAngle);
  const p2 = polarToCartesian(x, y, outerRadius, endAngle);
  const p3 = polarToCartesian(x, y, innerRadius, endAngle);
  const p4 = polarToCartesian(x, y, innerRadius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  
  return [
    'M', p1.x, p1.y,
    'A', outerRadius, outerRadius, 0, largeArc, 1, p2.x, p2.y,
    'L', p3.x, p3.y,
    'A', innerRadius, innerRadius, 0, largeArc, 0, p4.x, p4.y,
    'Z'
  ].join(' ');
}

export default function MusicLibraryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Loading Music Library...</p>
      </div>
    }>
      <MusicLibraryContent />
    </Suspense>
  );
}

function MusicLibraryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('major_scales');
  const [sections, setSections] = useState<ReferenceSection[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Local storage items state
  const [favorites, setFavorites] = useState<string[]>([]);

  // Streamlined UI States
  const [selectedCircleSector, setSelectedCircleSector] = useState(0);
  const [selectedCircleKeyMode, setSelectedCircleKeyMode] = useState<'major' | 'minor'>('major');
  const [circlePlayingNoteIdx, setCirclePlayingNoteIdx] = useState<number | null>(null);
  const [isPlayingCircleAudio, setIsPlayingCircleAudio] = useState(false);
  const circleAudioRef = useRef<HTMLAudioElement | null>(null);

  const [intervalRoot, setIntervalRoot] = useState('C');
  const [playingIntervalSlug, setPlayingIntervalSlug] = useState<string | null>(null);
  const intervalAudioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (circleAudioRef.current) {
        try { circleAudioRef.current.pause(); } catch (e) {}
      }
      if (intervalAudioRef.current) {
        try { intervalAudioRef.current.pause(); } catch (e) {}
      }
    };
  }, []);

  // Sync category and search query from URL params
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) {
      setActiveCategory(cat);
    }
  }, [searchParams]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  const loadLocalStorageData = () => {
    try {
      const favs = localStorage.getItem('treble_favorites');
      if (favs) setFavorites(JSON.parse(favs));
    } catch (e) {
      console.error('Failed to load local storage lists:', e);
    }
  };

  useEffect(() => {
    loadLocalStorageData();

    // Listen for custom events when cards update favorites/recents
    window.addEventListener('treble_recents_updated', loadLocalStorageData);
    return () => {
      window.removeEventListener('treble_recents_updated', loadLocalStorageData);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch('/api/reference', { cache: 'no-store' });
        const text = await res.text();
        if (!res.ok) {
          throw new Error(text || `Request failed (${res.status})`);
        }
        const data = JSON.parse(text) as { sections?: ReferenceSection[] };
        if (!cancelled) {
          setSections(data.sections ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Could not load Music Library');
          setSections([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const playCircleScale = () => {
    if (isPlayingCircleAudio) {
      stopCircleScale();
      return;
    }
    const sector = CIRCLE_SECTORS[selectedCircleSector];
    const notes = selectedCircleKeyMode === 'major' ? sector.playNotesMajor : sector.playNotesMinor;
    
    const notesToPlay = [...notes, ...[...notes].reverse().slice(1)];
    const queryNotes = notesToPlay.join(',');
    const audioUrl = `/api/reference/audio?notes=${encodeURIComponent(queryNotes)}`;
    
    setIsPlayingCircleAudio(true);
    setCirclePlayingNoteIdx(0);
    
    const audio = new Audio(audioUrl);
    circleAudioRef.current = audio;
    
    audio.play().catch(err => {
      console.error('Circle audio play error:', err);
      setIsPlayingCircleAudio(false);
      setCirclePlayingNoteIdx(null);
    });
    
    audio.ontimeupdate = () => {
      const idx = Math.floor(audio.currentTime / 0.4);
      if (idx >= 0 && idx < notesToPlay.length) {
        setCirclePlayingNoteIdx(idx);
      } else {
        setCirclePlayingNoteIdx(null);
      }
    };
    
    audio.onended = () => {
      setIsPlayingCircleAudio(false);
      setCirclePlayingNoteIdx(null);
    };
    
    audio.onerror = () => {
      setIsPlayingCircleAudio(false);
      setCirclePlayingNoteIdx(null);
    };
  };

  const stopCircleScale = () => {
    if (circleAudioRef.current) {
      try {
        circleAudioRef.current.pause();
      } catch(e) {}
      circleAudioRef.current = null;
    }
    setIsPlayingCircleAudio(false);
    setCirclePlayingNoteIdx(null);
  };

  const playIntervalAudio = (slug: string, semitones: number) => {
    if (playingIntervalSlug) {
      stopIntervalAudio();
      if (playingIntervalSlug === slug) return;
    }
    setPlayingIntervalSlug(slug);
    
    const target = getIntervalNote(intervalRoot, semitones);
    const rootIdx = CHROMATIC_SCALE_NOTES.indexOf(intervalRoot);
    const targetIdx = CHROMATIC_SCALE_NOTES.indexOf(target);
    const rootOctave = 4;
    const targetOctave = targetIdx < rootIdx || semitones === 12 ? 5 : 4;
    
    const notesToPlay = [`${intervalRoot}${rootOctave}`, `${target}${targetOctave}`];
    const queryNotes = notesToPlay.join(',');
    const audioUrl = `/api/reference/audio?notes=${encodeURIComponent(queryNotes)}`;
    
    const audio = new Audio(audioUrl);
    intervalAudioRef.current = audio;
    
    audio.play().catch(err => {
      console.error('Interval play error:', err);
      setPlayingIntervalSlug(null);
    });
    
    audio.onended = () => {
      setPlayingIntervalSlug(null);
    };
    
    audio.onerror = () => {
      setPlayingIntervalSlug(null);
    };
  };

  const stopIntervalAudio = () => {
    if (intervalAudioRef.current) {
      try {
        intervalAudioRef.current.pause();
      } catch(e) {}
      intervalAudioRef.current = null;
    }
    setPlayingIntervalSlug(null);
  };

  // Find active section or custom bookmarks category
  const activeSection = useMemo(() => {
    if (activeCategory === 'favorites') {
      const allEntries = sections.flatMap((s) => s.entries.map((e) => ({ ...e, categorySlug: s.slug })));
      const matched = allEntries.filter((ent) => favorites.includes(ent.title));
      return {
        slug: 'favorites',
        title: 'Favorites',
        description: 'Your starred reference items. Items are saved locally in your browser.',
        entries: matched,
      };
    }
    return sections.find((s) => s.slug === activeCategory);
  }, [sections, activeCategory, favorites]);

  // Check if all entries in the active section share the exact same formula
  const sharedFormula = useMemo(() => {
    if (!activeSection || !activeSection.entries || activeSection.entries.length === 0) return null;
    const formulas = activeSection.entries.map((e) => e.formula).filter(Boolean);
    if (formulas.length === 0) return null;
    const uniqueFormulas = Array.from(new Set(formulas));
    const allHaveFormula = activeSection.entries.every((e) => e.formula);
    if (uniqueFormulas.length === 1 && allHaveFormula) {
      return uniqueFormulas[0];
    }
    return null;
  }, [activeSection]);

  // Compute active category paths for breadcrumbs
  const breadcrumbPath = useMemo(() => {
    if (activeCategory === 'favorites') {
      return ['Music Library', 'Bookmarks', 'Favorites'];
    }
    
    // Find the category labels dynamically
    const categoryGroups = [
      { name: 'Scales', slugs: ['major_scales', 'natural_minor_scales', 'harmonic_minor_scales', 'melodic_minor_scales', 'chromatic_scales', 'major_pentatonic_scales', 'minor_pentatonic_scales', 'blues_scales', 'whole_tone_scales', 'diminished_scales', 'bebop_scales'] },
      { name: 'Modes', slugs: ['ionian_mode', 'dorian_mode', 'phrygian_mode', 'lydian_mode', 'mixolydian_mode', 'aeolian_mode', 'locrian_mode'] },
      { name: 'Arpeggios', slugs: ['major_arpeggios', 'minor_arpeggios', 'diminished_arpeggios', 'augmented_arpeggios', 'dominant_seventh_arpeggios', 'major_seventh_arpeggios', 'minor_seventh_arpeggios'] },
      { name: 'Chords', slugs: ['major_chords', 'minor_chords', 'diminished_chords', 'augmented_chords', 'suspended_chords', 'dominant_seventh_chords', 'major_seventh_chords', 'minor_seventh_chords', 'half_diminished_chords', 'fully_diminished_chords', 'sixth_chords', 'ninth_chords', 'eleventh_chords', 'thirteenth_chords', 'altered_chords'] },
      { name: 'Intervals', slugs: ['interval_unison', 'interval_minor_second', 'interval_major_second', 'interval_minor_third', 'interval_major_third', 'interval_perfect_fourth', 'interval_tritone', 'interval_perfect_fifth', 'interval_minor_sixth', 'interval_major_sixth', 'interval_minor_seventh', 'interval_major_seventh', 'interval_octave'] },
      { name: 'Music History', slugs: ['circle_of_fifths', 'key_signatures', 'time_signatures', 'scale_degrees', 'chord_functions', 'harmonic_progressions', 'cadences', 'modes_theory', 'voice_leading'] },
      { name: 'Notation', slugs: ['notation_clefs', 'notation_dynamics', 'notation_articulations', 'notation_tempo_markings', 'notation_repeats', 'notation_endings', 'notation_pedal_markings', 'notation_ornaments', 'notation_slurs', 'notation_ties', 'notation_tuplets'] }
    ];

    const group = categoryGroups.find(g => g.slugs.includes(activeCategory));
    const title = activeSection?.title || activeCategory.replace(/_/g, ' ');
    if (group) {
      return ['Music Library', group.name, title];
    }
    return ['Music Library', 'Catalog', title];
  }, [activeCategory, activeSection]);

  const activeGroup = useMemo(() => {
    return MUSIC_LIBRARY_GROUPS.find(g => g.slugs.includes(activeCategory));
  }, [activeCategory]);

  const activeSubcategoryLabel = useMemo(() => {
    if (activeGroup) {
      const item = activeGroup.items.find(i => i.slug === activeCategory);
      if (item) {
        const suffix = activeGroup.name === 'Scales' ? 'Scales' : 
                       activeGroup.name === 'Modes' ? 'Mode' : 
                       activeGroup.name === 'Chords' ? 'Chords' : 
                       activeGroup.name === 'Arpeggios' ? 'Arpeggios' : '';
        
        if (item.label.endsWith(suffix) || !suffix) {
          return item.label;
        }
        return `${item.label} ${suffix}`;
      }
    }
    return activeSection?.title || activeCategory.replace(/_/g, ' ');
  }, [activeCategory, activeGroup, activeSection]);

  const commonScaleInfo = useMemo(() => {
    const isScaleOrMode = activeCategory.includes('scales') || activeCategory.includes('mode');
    if (!isScaleOrMode || searchQuery.trim().length > 0 || activeCategory === 'favorites') return null;

    if (!activeSection || !activeSection.entries || activeSection.entries.length === 0) return null;
    
    const firstTitle = activeSection.entries[0].title;
    const info = SCALES_REGISTRY[firstTitle];
    if (!info) return null;

    return {
      formula: info.formula,
      degrees: info.degrees.join(' - '),
      degreeNames: info.degreeNames,
      type: firstTitle.toLowerCase().includes('pentatonic') ? 'Pentatonic' :
            firstTitle.toLowerCase().includes('blues') ? 'Blues' :
            firstTitle.toLowerCase().includes('whole tone') ? 'Whole Tone' :
            firstTitle.toLowerCase().includes('diminished') ? 'Diminished' :
            firstTitle.toLowerCase().includes('bebop') ? 'Bebop' :
            firstTitle.toLowerCase().includes('chromatic') ? 'Chromatic' : 'Diatonic',
      character: firstTitle.toLowerCase().includes('harmonic minor') ? 'Exotic, Mystical, Tension' :
                 firstTitle.toLowerCase().includes('melodic minor') ? 'Expressive, Classical, Elegant' :
                 firstTitle.toLowerCase().includes('minor') ? 'Sad, Dark, Serious' :
                 firstTitle.toLowerCase().includes('major') ? 'Bright, Clear, Stable' :
                 firstTitle.toLowerCase().includes('blues') ? 'Expressive, Soulful, Gritty' :
                 firstTitle.toLowerCase().includes('whole tone') ? 'Dreamy, Floating, Suspended' :
                 firstTitle.toLowerCase().includes('diminished') ? 'Tense, Symmetrical, Suspense' : 'Mysterious, Evocative, Unique'
    };
  }, [activeCategory, activeSection, searchQuery]);

  // Global search filtering helper
  const filterSectionEntries = (section: ReferenceSection, query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return section.entries;
    return section.entries.filter((item) => {
      const inTitle = item.title.toLowerCase().includes(q);
      const inDesc = (item.description ?? '').toLowerCase().includes(q);
      const inFormula = (item.formula ?? '').toLowerCase().includes(q);
      const inNotes = (item.notes ?? []).some((n) => n.toLowerCase().includes(q));
      return inTitle || inDesc || inFormula || inNotes;
    });
  };

  const cleanDescription = (desc: string | null | undefined): string => {
    if (!desc) return '';
    return desc
      .replace(/, following the [A-Z-♯♭♭𝄪\s-]+ pattern/i, '')
      .replace(/, constructed using the [A-Z-♯♭♭𝄪\s-]+ pattern/i, '')
      .replace(/\. constructed using the [A-Z-♯♭♭𝄪\s-]+ pattern/i, '')
      .replace(/, constructed using [a-z0-9\s,-]+ pattern/i, '')
      .replace(/, built on [a-z0-9\s,-]+/i, '')
      .trim();
  };

  // Search matches grouped globally across all sections
  const globalSearchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: Array<{ sectionTitle: string; slug: string; entries: ReferenceEntry[] }> = [];

    // Search API database sections
    sections.forEach((sec) => {
      const matches = filterSectionEntries(sec, q);
      if (matches.length > 0) {
        results.push({
          sectionTitle: sec.title,
          slug: sec.slug,
          entries: matches,
        });
      }
    });

    return results;
  }, [sections, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  // Filtered list of cards for active section (non-global mode)
  const filteredEntries = useMemo(() => {
    if (!activeSection) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeSection.entries;

    // Local filter when queries are entered within section
    if (activeCategory === 'favorites') {
      return activeSection.entries.filter(ent =>
        ent.title.toLowerCase().includes(q) ||
        (ent.description ?? '').toLowerCase().includes(q)
      );
    }

    return filterSectionEntries(activeSection as ReferenceSection, searchQuery);
  }, [activeSection, searchQuery, activeCategory]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    const params = new URLSearchParams(window.location.search);
    if (val) {
      params.set('q', val);
    } else {
      params.delete('q');
    }
    router.replace(`/music-library?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Standard Header */}
      <PageHeader
        title="Music Library"
        description="Browse scales, chords, arpeggios, symbols, and theory references."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Search toolbar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search scales, chords, arpeggios, notation terminology..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-11 pr-4 py-6 bg-card border-border/40 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 rounded-xl"
          />
        </div>

        {/* Horizontal Sub-Navigation Tabs */}
        {!isSearching &&
          activeCategory !== 'favorites' &&
          activeGroup &&
          activeGroup.name !== 'Intervals' &&
          activeGroup.name !== 'Notation' &&
          activeGroup.name !== 'Music History' && (
          <div className="flex flex-wrap gap-2">
            {activeGroup.items.map((item) => {
              const isActive = item.slug === activeCategory;
              return (
                <button
                  key={item.slug}
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    params.set('category', item.slug);
                    router.replace(`/music-library?${params.toString()}`);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                    isActive
                      ? 'bg-primary/10 text-primary border-primary/20 shadow-glow/5'
                      : 'bg-card border-border/40 text-muted-foreground hover:text-foreground hover:bg-card/85'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Selected Active Category Heading & Subtitle Section */}
        {!isSearching && (activeGroup || activeSection) && (
          <div className="space-y-1.5 py-1">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {activeGroup?.name === 'Intervals' ? 'Musical Intervals' :
               activeGroup?.name === 'Notation' ? 'Musical Notation Reference' :
               activeGroup?.name === 'Music History' ? 'Music Theory & Core Concepts' :
               activeSubcategoryLabel}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-4xl">
              {activeGroup?.name === 'Intervals' ? 'Explore the acoustic distance between notes, their mathematical semitone counts, harmonic colors, and consonance qualities.' :
               activeGroup?.name === 'Notation' ? 'A reference catalog of sheet music symbols, dynamics, expressions, clefs, and structural indicators.' :
               activeGroup?.name === 'Music History' ? 'Master the core structures of music, from the interactive Circle of Fifths to scales, degrees, cadences, and voice-leading patterns.' :
               activeSection ? cleanDescription(activeSection.description) : ''}
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Loading library catalogs...</p>
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-6 text-sm text-foreground">
            <h3 className="font-semibold text-red-400 mb-1">Could not connect to Database</h3>
            <p className="text-muted-foreground">{loadError}</p>
          </div>
        )}

        {!loading && !loadError && (
          <div className="space-y-8 animate-fade-in">
            {/* Global search results grouping view */}
            {isSearching ? (
              <div className="space-y-6">
                <div className="pb-3 border-b border-border/25">
                  <h2 className="text-xl font-bold text-foreground">Global Search Results</h2>
                  <p className="text-xs text-primary font-semibold mt-1">
                    Found matching items across {globalSearchResults.length} sections
                  </p>
                </div>

                {globalSearchResults.length === 0 ? (
                  <div className="text-center py-16 bg-card/10 rounded-xl border border-dashed border-border/30">
                    <p className="text-muted-foreground text-sm">No entries found matching &quot;{searchQuery}&quot;.</p>
                  </div>
                ) : (
                  globalSearchResults.map((gSec) => {
                    const isScaleSec = gSec.slug.includes('scales') || gSec.slug.includes('mode') || gSec.slug.includes('arpeggios') || gSec.slug.includes('chords');
                    return (
                      <div key={gSec.slug} className="space-y-3.5">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-l-2 border-primary pl-2">
                          {gSec.sectionTitle}
                        </h3>
                        <div className={isScaleSec ? "grid grid-cols-1 xl:grid-cols-2 gap-6" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"}>
                          {gSec.entries.map((item) => (
                          <ReferenceCard
                            key={item.id}
                            title={item.title}
                            sectionSlug={gSec.slug}
                            categoryLabel={gSec.sectionTitle}
                            notes={item.notes}
                            intervals={item.intervals}
                            description={item.description ?? undefined}
                            formula={item.formula ?? undefined}
                            rightHandFingering={(item as any).rightHandFingering}
                            leftHandFingering={(item as any).leftHandFingering}
                            onFavoriteToggle={loadLocalStorageData}
                          />
                        ))}
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            ) : activeGroup?.name === 'Intervals' ? (
              /* Unified Intervals transposing view */
              <div className="space-y-6">
                <div className="bg-card/45 backdrop-blur-md border border-border/15 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Transpose Root Note</h3>
                    <p className="text-xs text-muted-foreground">Select a root note to dynamically transpose all interval examples.</p>
                  </div>
                  <div className="flex flex-wrap gap-1 bg-[#111219]/60 p-1 rounded-xl border border-border/15 max-w-max">
                    {CHROMATIC_SCALE_NOTES.map((note) => (
                      <button
                        key={note}
                        onClick={() => setIntervalRoot(note)}
                        className={`w-9 h-9 rounded-lg text-xs font-bold transition-all duration-200 ${
                          intervalRoot === note
                            ? 'bg-primary text-white shadow-glow'
                            : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                        }`}
                      >
                        {note}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {INTERVALS_LIST.map((interval) => {
                    const target = getIntervalNote(intervalRoot, interval.semitones);
                    const isPlaying = playingIntervalSlug === interval.slug;
                    
                    const qualityColors: Record<string, string> = {
                      'Perfect Consonance': 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                      'Imperfect Consonance': 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                      'Dissonant': 'bg-rose-500/10 border-rose-500/20 text-rose-400',
                      'Perfect Consonance / Dissonant': 'bg-teal-500/10 border-teal-500/20 text-teal-400',
                      'Highly Dissonant': 'bg-red-500/10 border-red-500/20 text-red-400'
                    };
                    const colorClass = qualityColors[interval.quality] || 'bg-slate-500/10 border-slate-500/20 text-slate-400';

                    return (
                      <div
                        key={interval.slug}
                        className="glass border border-border/20 rounded-2xl p-5 bg-card/45 backdrop-blur-md relative flex flex-col justify-between hover:border-primary/30 transition-all duration-300 group"
                      >
                        <div className="space-y-4">
                          {/* Header */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-white tracking-tight">{interval.name}</h3>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-primary/10 border border-primary/25 text-primary">
                                  {interval.abbr}
                                </span>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${colorClass}`}>
                                {interval.quality}
                              </span>
                            </div>
                            
                            <button
                              onClick={() => playIntervalAudio(interval.slug, interval.semitones)}
                              className={`p-2.5 rounded-xl border transition-all duration-200 ${
                                isPlaying
                                  ? 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25'
                                  : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 hover:scale-105'
                              }`}
                              title={isPlaying ? "Stop audio" : "Play interval melodic audio"}
                            >
                              {isPlaying ? <Square className="w-4 h-4 fill-red-400" /> : <Play className="w-4 h-4 fill-primary" />}
                            </button>
                          </div>

                          {/* Notes rendering */}
                          <div className="bg-[#07080c]/50 border border-border/10 rounded-xl p-4 text-center">
                            <span className="text-xs text-muted-foreground block mb-1">Diatonic Pair</span>
                            <div className="flex items-center justify-center gap-3 text-2xl font-mono font-black tracking-wider text-white">
                              <span className="text-primary font-bold">{intervalRoot}</span>
                              <span className="text-muted-foreground/45 text-lg">➔</span>
                              <span className="text-purple-400 font-bold">{target}</span>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground border-b border-border/10 pb-1.5">
                              <span>Distance:</span>
                              <span className="font-semibold text-white">{interval.semitones} Semitones</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                              {interval.desc}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : activeGroup?.name === 'Notation' ? (
              /* Unified Notation reference view */
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {sections
                    .filter((s) => s.slug.startsWith('notation_'))
                    .flatMap((s) =>
                      s.entries.map((ent) => ({
                        ...ent,
                        sectionSlug: s.slug,
                        sectionTitle: s.title,
                      }))
                    )
                    .map((item) => (
                      <div
                        key={item.id}
                        className="glass border border-border/20 rounded-2xl p-5 bg-card/45 backdrop-blur-md relative flex flex-col justify-between hover:border-primary/30 transition-all duration-300"
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md">
                              {item.sectionTitle}
                            </span>
                            <button
                              onClick={() => {
                                try {
                                  const favs = localStorage.getItem('treble_favorites');
                                  let list = favs ? JSON.parse(favs) as string[] : [];
                                  const isFav = list.includes(item.title);
                                  if (isFav) {
                                    list = list.filter((t) => t !== item.title);
                                    toast.success(`Removed "${item.title}" from favorites`);
                                  } else {
                                    list.push(item.title);
                                    toast.success(`Saved "${item.title}" to favorites`);
                                  }
                                  localStorage.setItem('treble_favorites', JSON.stringify(list));
                                  loadLocalStorageData();
                                } catch (e) {}
                              }}
                              className="text-muted-foreground hover:text-yellow-400 transition-colors"
                              title="Favorite this card"
                            >
                              <Star className={`w-4 h-4 ${favorites.includes(item.title) ? 'text-yellow-400 fill-yellow-400' : ''}`} />
                            </button>
                          </div>
                          <h3 className="text-lg font-bold text-white tracking-tight">{item.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : activeGroup?.name === 'Music History' ? (
              /* Interactive Circle of Fifths view */
              <div className="space-y-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Circle SVG */}
                  <div className="lg:col-span-5 flex flex-col items-center justify-center bg-card/15 border border-border/15 p-6 rounded-3xl backdrop-blur-md">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Circle of Fifths</span>
                    <div className="relative w-full max-w-[340px] aspect-square flex items-center justify-center">
                      <svg
                        viewBox="0 0 400 400"
                        className="w-full h-full drop-shadow-lg overflow-visible"
                      >
                        {/* Center radial line markers for reference */}
                        <circle cx="200" cy="200" r="175" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                        <circle cx="200" cy="200" r="130" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                        <circle cx="200" cy="200" r="85" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

                        {/* Sector Wedges */}
                        {CIRCLE_SECTORS.map((sector, i) => {
                          const startAngle = i * 30 - 15;
                          const endAngle = i * 30 + 15;
                          
                          const isMajorSelected = selectedCircleSector === i && selectedCircleKeyMode === 'major';
                          const isMinorSelected = selectedCircleSector === i && selectedCircleKeyMode === 'minor';

                          // Major slice (outer ring)
                          const majorPath = describeSector(200, 200, 130, 175, startAngle, endAngle);
                          // Minor slice (inner ring)
                          const minorPath = describeSector(200, 200, 85, 130, startAngle, endAngle);

                          // Text positions
                          const majorTextPos = polarToCartesian(200, 200, 152, i * 30);
                          const minorTextPos = polarToCartesian(200, 200, 107, i * 30);
                          const outerAccidentalPos = polarToCartesian(200, 200, 195, i * 30);

                          return (
                            <g key={i} className="transition-all duration-300">
                              {/* Major slice path */}
                              <path
                                d={majorPath}
                                onClick={() => {
                                  setSelectedCircleSector(i);
                                  setSelectedCircleKeyMode('major');
                                  stopCircleScale();
                                }}
                                className={`transition-all duration-200 cursor-pointer ${
                                  isMajorSelected
                                    ? 'fill-primary/30 stroke-primary stroke-[2px]'
                                    : 'fill-blue-500/[0.04] stroke-border/10 hover:fill-blue-500/[0.12] hover:stroke-border/30'
                                }`}
                              />
                              
                              {/* Minor slice path */}
                              <path
                                d={minorPath}
                                onClick={() => {
                                  setSelectedCircleSector(i);
                                  setSelectedCircleKeyMode('minor');
                                  stopCircleScale();
                                }}
                                className={`transition-all duration-200 cursor-pointer ${
                                  isMinorSelected
                                    ? 'fill-purple-500/35 stroke-purple-400 stroke-[2px]'
                                    : 'fill-purple-500/[0.02] stroke-border/10 hover:fill-purple-500/[0.1] hover:stroke-border/30'
                                }`}
                              />

                              {/* Major Label text */}
                              <text
                                x={majorTextPos.x}
                                y={majorTextPos.y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className={`font-black text-sm select-none pointer-events-none transition-colors duration-200 ${
                                  isMajorSelected ? 'fill-blue-400' : 'fill-white'
                                }`}
                              >
                                {sector.major}
                              </text>

                              {/* Minor Label text */}
                              <text
                                x={minorTextPos.x}
                                y={minorTextPos.y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className={`font-bold text-xs select-none pointer-events-none transition-colors duration-200 ${
                                  isMinorSelected ? 'fill-purple-400' : 'fill-muted-foreground'
                                }`}
                              >
                                {sector.minor}
                              </text>

                              {/* Accidental count outer indicator */}
                              <text
                                x={outerAccidentalPos.x}
                                y={outerAccidentalPos.y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="text-[9px] font-mono fill-muted-foreground select-none pointer-events-none"
                              >
                                {sector.accidentals.split(' ')[0]}{sector.type === 'sharp' ? '♯' : sector.type === 'flat' ? '♭' : ''}
                              </text>
                            </g>
                          );
                        })}

                        {/* Center core mask */}
                        <circle
                          cx="200"
                          cy="200"
                          r="84"
                          className="fill-background/95 stroke-border/15"
                        />
                        
                        {/* Center details inside SVG */}
                        <text
                          x="200"
                          y="188"
                          textAnchor="middle"
                          className="text-[10px] font-bold fill-muted-foreground uppercase tracking-widest select-none"
                        >
                          Selected
                        </text>
                        <text
                          x="200"
                          y="215"
                          textAnchor="middle"
                          className="text-2xl font-black fill-white select-none"
                        >
                          {selectedCircleKeyMode === 'major'
                            ? `${CIRCLE_SECTORS[selectedCircleSector].major} Maj`
                            : `${CIRCLE_SECTORS[selectedCircleSector].minor} Min`}
                        </text>
                        <text
                          x="200"
                          y="238"
                          textAnchor="middle"
                          className="text-[9px] font-mono fill-primary select-none font-bold"
                        >
                          {CIRCLE_SECTORS[selectedCircleSector].accidentals.split(' ')[0]}{CIRCLE_SECTORS[selectedCircleSector].type === 'sharp' ? ' Sharp' : CIRCLE_SECTORS[selectedCircleSector].type === 'flat' ? ' Flat' : ''}
                        </text>
                      </svg>
                    </div>
                  </div>

                  {/* Sector Details Panel */}
                  <div className="lg:col-span-7 space-y-4">
                    {(() => {
                      const sector = CIRCLE_SECTORS[selectedCircleSector];
                      const isMajor = selectedCircleKeyMode === 'major';
                      const keyName = isMajor ? `${sector.major} Major` : `${sector.minor} Minor`;
                      const relativeKey = isMajor ? `${sector.minor} Minor` : `${sector.major} Major`;
                      const notesList = isMajor ? sector.majorNotes : sector.minorNotes;
                      const chordsList = isMajor ? sector.majorChords : sector.minorChords;
                      const character = isMajor ? sector.characterMajor : sector.characterMinor;

                      // Check note playing state
                      const isNoteIndexPlaying = (idx: number) => {
                        if (circlePlayingNoteIdx === null) return false;
                        const scaleLen = 8;
                        const displayLen = 7;
                        if (circlePlayingNoteIdx < scaleLen) {
                          return circlePlayingNoteIdx % displayLen === idx;
                        } else {
                          const descIdx = 14 - circlePlayingNoteIdx;
                          return descIdx % displayLen === idx;
                        }
                      };

                      return (
                        <div className="glass border border-border/20 rounded-3xl p-6 bg-card/45 backdrop-blur-md relative flex flex-col space-y-6">
                          {/* Heading */}
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/10 pb-5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-black text-white tracking-tight">{keyName}</h2>
                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                                  isMajor 
                                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                                    : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                                }`}>
                                  {isMajor ? 'Major Key' : 'Minor Key'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5 text-muted-foreground" />
                                Characteristic: <span className="text-white font-medium italic">{character}</span>
                              </p>
                            </div>
                            
                            <button
                              onClick={playCircleScale}
                              className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all duration-200 ${
                                isPlayingCircleAudio
                                  ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                                  : 'bg-primary border-primary/20 text-white hover:bg-primary/85 shadow-glow'
                              }`}
                            >
                              {isPlayingCircleAudio ? (
                                <>
                                  <Square className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                                  Stop Scale
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5 fill-white text-white" />
                                  Play Scale
                                </>
                              )}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Key signature info */}
                            <div className="space-y-3.5">
                              <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Key Signature</span>
                                <p className="text-sm font-semibold text-white bg-[#07080c]/50 border border-border/10 p-3 rounded-xl">
                                  {sector.accidentals}
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Relative Key</span>
                                <p className="text-sm font-semibold text-purple-300 bg-[#07080c]/50 border border-border/10 p-3 rounded-xl">
                                  {relativeKey}
                                </p>
                              </div>
                            </div>

                            {/* Scale notes */}
                            <div className="space-y-3">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Scale Notes</span>
                              <div className="flex flex-wrap gap-2">
                                {notesList.map((n, idx) => {
                                  const isPlaying = isNoteIndexPlaying(idx);
                                  return (
                                    <div
                                      key={idx}
                                      className={`w-10 h-10 rounded-xl border flex flex-col items-center justify-center transition-all duration-200 ${
                                        isPlaying
                                          ? 'bg-primary/25 border-primary text-white font-black scale-110 shadow-glow'
                                          : 'bg-[#111219]/60 border-border/15 text-muted-foreground'
                                      }`}
                                    >
                                      <span className="text-xs font-black">{n}</span>
                                      <span className="text-[8px] font-semibold text-muted-foreground/60">{idx + 1}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Diatonic Chords list */}
                          <div className="space-y-3 pt-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Diatonic Chords (Triads)</span>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                              {chordsList.map((chord, idx) => {
                                const romanLabelsMajor = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
                                const romanLabelsMinor = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
                                const roman = isMajor ? romanLabelsMajor[idx] : romanLabelsMinor[idx];
                                return (
                                  <div
                                    key={idx}
                                    className="bg-[#111219]/40 border border-border/15 p-2 rounded-xl text-center flex flex-col items-center justify-center"
                                  >
                                    <span className="text-[9px] font-black text-muted-foreground block mb-0.5">{roman}</span>
                                    <span className="text-xs font-extrabold text-white truncate max-w-full">{chord}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="border-t border-border/15 pt-8">
                  <h2 className="text-xl font-black text-white mb-5 tracking-tight border-l-2 border-primary pl-3">
                    Core Theory Reference Sheets
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {sections
                      .filter((s) => s.slug !== 'circle_of_fifths' && [
                        'key_signatures',
                        'time_signatures',
                        'scale_degrees',
                        'chord_functions',
                        'harmonic_progressions',
                        'cadences',
                        'modes_theory',
                        'voice_leading'
                      ].includes(s.slug))
                      .flatMap((s) =>
                        s.entries.map((ent) => ({
                          ...ent,
                          sectionSlug: s.slug,
                          sectionTitle: s.title,
                        }))
                      )
                      .map((item) => (
                        <div
                          key={item.id}
                          className="glass border border-border/20 rounded-2xl p-5 bg-card/45 backdrop-blur-md relative flex flex-col justify-between hover:border-primary/30 transition-all duration-300"
                        >
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md">
                                {item.sectionTitle}
                              </span>
                              <button
                                onClick={() => {
                                  try {
                                    const favs = localStorage.getItem('treble_favorites');
                                    let list = favs ? JSON.parse(favs) as string[] : [];
                                    const isFav = list.includes(item.title);
                                    if (isFav) {
                                      list = list.filter((t) => t !== item.title);
                                      toast.success(`Removed "${item.title}" from favorites`);
                                    } else {
                                      list.push(item.title);
                                      toast.success(`Saved "${item.title}" to favorites`);
                                    }
                                    localStorage.setItem('treble_favorites', JSON.stringify(list));
                                    loadLocalStorageData();
                                  } catch (e) {}
                                }}
                                className="text-muted-foreground hover:text-yellow-400 transition-colors"
                                title="Favorite this card"
                              >
                                <Star className={`w-4 h-4 ${favorites.includes(item.title) ? 'text-yellow-400 fill-yellow-400' : ''}`} />
                              </button>
                            </div>
                            <h3 className="text-lg font-bold text-white tracking-tight">{item.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Standard single active category card grid */
              <div className="space-y-6">

                {commonScaleInfo && (
                  <div className="glass border border-border/25 rounded-3xl p-6 relative flex flex-col space-y-4 shadow-glow/5 bg-card/45 backdrop-blur-md">
                    {/* Top row */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">Scale Family Reference</h3>
                        <p className="text-xs text-muted-foreground">Shared properties across all keys in this family.</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <div className="bg-[#111219]/60 border border-border/20 px-3 py-1.5 rounded-xl flex items-center gap-2">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="font-semibold text-white">{commonScaleInfo.type}</span>
                        </div>
                        <div className="bg-[#111219]/60 border border-border/20 px-3 py-1.5 rounded-xl flex items-center gap-2">
                          <span className="text-muted-foreground">Character:</span>
                          <span className="font-semibold text-white">{commonScaleInfo.character}</span>
                        </div>
                      </div>
                    </div>

                    {/* Formula & Degrees */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/15 pt-4">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground">Formula</span>
                        <p className="text-sm font-mono text-purple-300 tracking-wider bg-[#07080c]/50 p-2.5 rounded-xl border border-border/15">
                          {commonScaleInfo.formula.split('-').join(' - ')}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground">Scale Degrees</span>
                        <p className="text-sm font-mono text-purple-300 tracking-wider bg-[#07080c]/50 p-2.5 rounded-xl border border-border/15">
                          {commonScaleInfo.degrees}
                        </p>
                      </div>
                    </div>

                    {/* Degree Names */}
                    {commonScaleInfo.degreeNames && commonScaleInfo.degreeNames.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground">Degree Names</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                          {commonScaleInfo.degreeNames.map((name, i) => (
                            <div key={i} className="bg-[#111219]/40 border border-border/15 py-2 px-3 rounded-xl text-center text-xs font-medium text-foreground truncate" title={name}>
                              <span className="text-[10px] text-muted-foreground block mb-0.5">{i + 1}</span>
                              {name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {filteredEntries.length === 0 ? (
                  <div className="text-center py-16 bg-card/10 rounded-xl border border-dashed border-border/30">
                    <p className="text-muted-foreground text-sm mb-3">No reference items in this category.</p>
                    {activeCategory === 'favorites' && (
                      <p className="text-xs text-muted-foreground">Star items in the library to see them listed here.</p>
                    )}
                  </div>
                ) : (
                  (() => {
                    const isScaleCat = activeCategory.includes('scales') || 
                                       activeCategory.includes('mode') || 
                                       activeCategory.includes('arpeggios') || 
                                       activeCategory.includes('chords') || 
                                       (activeCategory === 'favorites' && filteredEntries.some((e) => {
                                          const slug = e.categorySlug || '';
                                          return slug.includes('scales') || slug.includes('mode') || slug.includes('arpeggios') || slug.includes('chords');
                                       }));
                    return (
                      <div className={isScaleCat ? "grid grid-cols-1 xl:grid-cols-2 gap-6" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"}>
                        {filteredEntries.map((item) => (
                          <ReferenceCard
                            key={item.id}
                            title={item.title}
                            sectionSlug={item.categorySlug || activeCategory}
                            categoryLabel={activeSection?.title}
                            notes={item.notes}
                            intervals={item.intervals}
                            description={item.description ?? undefined}
                            formula={sharedFormula ? undefined : (item.formula ?? undefined)}
                            rightHandFingering={(item as any).rightHandFingering}
                            leftHandFingering={(item as any).leftHandFingering}
                            onFavoriteToggle={loadLocalStorageData}
                          />
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
