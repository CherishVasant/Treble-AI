'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Music, Menu, X, Search, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useChat } from '@/context/chat-context';

// Static catalog of terms for header typeahead search suggestions
const SEARCHABLE_ITEMS = [
  // Scales
  { title: 'C Major Scale', category: 'Scales', slug: 'major_scales' },
  { title: 'G Major Scale', category: 'Scales', slug: 'major_scales' },
  { title: 'D Major Scale', category: 'Scales', slug: 'major_scales' },
  { title: 'F Major Scale', category: 'Scales', slug: 'major_scales' },
  { title: 'A Natural Minor Scale', category: 'Scales', slug: 'natural_minor_scales' },
  { title: 'E Natural Minor Scale', category: 'Scales', slug: 'natural_minor_scales' },
  { title: 'D Natural Minor Scale', category: 'Scales', slug: 'natural_minor_scales' },
  { title: 'A Harmonic Minor Scale', category: 'Scales', slug: 'harmonic_minor_scales' },
  { title: 'D Harmonic Minor Scale', category: 'Scales', slug: 'harmonic_minor_scales' },
  { title: 'A Melodic Minor Scale', category: 'Scales', slug: 'melodic_minor_scales' },
  { title: 'C Melodic Minor Scale', category: 'Scales', slug: 'melodic_minor_scales' },
  { title: 'Chromatic Scale', category: 'Scales', slug: 'chromatic_scales' },
  { title: 'C Whole Tone Scale', category: 'Scales', slug: 'whole_tone_scales' },
  { title: 'C Diminished Scale', category: 'Scales', slug: 'diminished_scales' },
  { title: 'C Bebop Dominant Scale', category: 'Scales', slug: 'bebop_scales' },

  // Modes
  { title: 'C Ionian', category: 'Modes', slug: 'ionian_mode' },
  { title: 'D Dorian', category: 'Modes', slug: 'dorian_mode' },
  { title: 'E Phrygian', category: 'Modes', slug: 'phrygian_mode' },
  { title: 'F Lydian', category: 'Modes', slug: 'lydian_mode' },
  { title: 'G Mixolydian', category: 'Modes', slug: 'mixolydian_mode' },
  { title: 'A Aeolian', category: 'Modes', slug: 'aeolian_mode' },
  { title: 'B Locrian', category: 'Modes', slug: 'locrian_mode' },

  // Chords
  { title: 'C Major Triad', category: 'Chords', slug: 'major_chords' },
  { title: 'A Minor Triad', category: 'Chords', slug: 'minor_chords' },
  { title: 'B Diminished Triad', category: 'Chords', slug: 'diminished_chords' },
  { title: 'C Augmented Triad', category: 'Chords', slug: 'augmented_chords' },
  { title: 'C Suspended 4th (Csus4)', category: 'Chords', slug: 'suspended_chords' },
  { title: 'G Dominant 7th', category: 'Chords', slug: 'dominant_seventh_chords' },
  { title: 'C Major 7th', category: 'Chords', slug: 'major_seventh_chords' },
  { title: 'A Minor 7th', category: 'Chords', slug: 'minor_seventh_chords' },
  { title: 'B Half-Diminished 7th (Bø7)', category: 'Chords', slug: 'half_diminished_chords' },
  { title: 'B Fully Diminished 7th (B°7)', category: 'Chords', slug: 'fully_diminished_chords' },
  { title: 'C Major 6th (C6)', category: 'Chords', slug: 'sixth_chords' },
  { title: 'C Dominant 9th (C9)', category: 'Chords', slug: 'ninth_chords' },
  { title: 'C Dominant 11th (C11)', category: 'Chords', slug: 'eleventh_chords' },
  { title: 'C Dominant 13th (C13)', category: 'Chords', slug: 'thirteenth_chords' },
  { title: 'C Altered Dominant (C7alt)', category: 'Chords', slug: 'altered_chords' },

  // Arpeggios
  { title: 'C Major Arpeggio', category: 'Arpeggios', slug: 'major_arpeggios' },
  { title: 'A Minor Arpeggio', category: 'Arpeggios', slug: 'minor_arpeggios' },
  { title: 'B Diminished Arpeggio', category: 'Arpeggios', slug: 'diminished_arpeggios' },
  { title: 'C Augmented Arpeggio', category: 'Arpeggios', slug: 'augmented_arpeggios' },
  { title: 'G Dominant 7th Arpeggio', category: 'Arpeggios', slug: 'dominant_seventh_arpeggios' },
  { title: 'C Major 7th Arpeggio', category: 'Arpeggios', slug: 'major_seventh_arpeggios' },
  { title: 'A Minor 7th Arpeggio', category: 'Arpeggios', slug: 'minor_seventh_arpeggios' },

  // Intervals
  { title: 'Perfect Unison (P1)', category: 'Intervals', slug: 'interval_unison' },
  { title: 'Minor Second (m2)', category: 'Intervals', slug: 'interval_minor_second' },
  { title: 'Major Second (M2)', category: 'Intervals', slug: 'interval_major_second' },
  { title: 'Minor Third (m3)', category: 'Intervals', slug: 'interval_minor_third' },
  { title: 'Major Third (M3)', category: 'Intervals', slug: 'interval_major_third' },
  { title: 'Perfect Fourth (P4)', category: 'Intervals', slug: 'interval_perfect_fourth' },
  { title: 'Tritone (d5/A4)', category: 'Intervals', slug: 'interval_tritone' },
  { title: 'Perfect Fifth (P5)', category: 'Intervals', slug: 'interval_perfect_fifth' },
  { title: 'Minor Sixth (m6)', category: 'Intervals', slug: 'interval_minor_sixth' },
  { title: 'Major Sixth (M6)', category: 'Intervals', slug: 'interval_major_sixth' },
  { title: 'Minor Seventh (m7)', category: 'Intervals', slug: 'interval_minor_seventh' },
  { title: 'Major Seventh (M7)', category: 'Intervals', slug: 'interval_major_seventh' },
  { title: 'Perfect Octave (P8)', category: 'Intervals', slug: 'interval_octave' },

  // Theory
  { title: 'Circle of Fifths', category: 'Music Theory', slug: 'circle_of_fifths' },
  { title: 'Key Signatures', category: 'Music Theory', slug: 'key_signatures' },
  { title: 'Time Signatures', category: 'Music Theory', slug: 'time_signatures' },
  { title: 'Scale Degrees', category: 'Music Theory', slug: 'scale_degrees' },
  { title: 'Chord Functions', category: 'Music Theory', slug: 'chord_functions' },
  { title: 'Harmonic Progressions', category: 'Music Theory', slug: 'harmonic_progressions' },
  { title: 'Cadences', category: 'Music Theory', slug: 'cadences' },
  { title: 'Voice Leading', category: 'Music Theory', slug: 'voice_leading' },

  // Notation
  { title: 'Clefs (Treble & Bass)', category: 'Notation', slug: 'notation_clefs' },
  { title: 'Dynamic Volume Markings', category: 'Notation', slug: 'notation_dynamics' },
  { title: 'Articulations (Staccato & Legato)', category: 'Notation', slug: 'notation_articulations' },
  { title: 'Tempo markings', category: 'Notation', slug: 'notation_tempo_markings' },
  { title: 'Repeats and Signs', category: 'Notation', slug: 'notation_repeats' },
  { title: 'First and Second Endings', category: 'Notation', slug: 'notation_endings' },
  { title: 'Sustain Pedal Markings', category: 'Notation', slug: 'notation_pedal_markings' },
  { title: 'Trills and Mordents', category: 'Notation', slug: 'notation_ornaments' },
  { title: 'Slurs vs Ties', category: 'Notation', slug: 'notation_slurs' },
  { title: 'Ties', category: 'Notation', slug: 'notation_ties' },
  { title: 'Triplets and Tuplets', category: 'Notation', slug: 'notation_tuplets' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { lastActiveTheorySessionId, lastActivePracticeSessionId } = useChat();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Global header search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const getLinkClass = (path: string) => {
    const isActive = pathname.startsWith(path);
    return isActive
      ? 'px-3 py-1.5 rounded-lg bg-gradient-primary text-white font-semibold shadow-glow border border-primary/20 transition-all duration-200 text-sm'
      : 'px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/85 border border-transparent hover:border-border/30 transition-all duration-200 text-sm';
  };

  const getMobileLinkClass = (path: string) => {
    const isActive = pathname.startsWith(path);
    return isActive
      ? 'block px-4 py-3 rounded-lg bg-gradient-primary text-white font-semibold shadow-glow border border-primary/20 transition-all duration-200'
      : 'block px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/85 border border-transparent hover:border-border/30 transition-all duration-200';
  };

  // Close search suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered search list
  const filteredSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return SEARCHABLE_ITEMS.filter((item) =>
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/music-library?q=${encodeURIComponent(searchQuery.trim())}`);
    setIsFocused(false);
    setSearchQuery('');
  };

  const handleSuggestionClick = (title: string) => {
    router.push(`/music-library?q=${encodeURIComponent(title)}`);
    setIsFocused(false);
    setSearchQuery('');
  };

  return (
    <nav className="glass sticky top-0 z-50 border-b border-border/30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Search */}
          <div className="flex items-center gap-6 flex-1">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
              <div className="p-2 bg-gradient-primary rounded-lg group-hover:shadow-glow transition-shadow">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                TrebleAI
              </span>
            </Link>

            {/* Global Search Component in Application Header */}
            <div ref={searchContainerRef} className="flex-1 max-w-xs relative hidden sm:block">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search scales, chords, terms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-card/45 border border-border/40 text-foreground placeholder:text-muted-foreground rounded-lg focus:outline-none focus:border-primary/50 focus:bg-card/75 focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </form>

              {/* Suggestions Dropdown */}
              {isFocused && searchQuery.trim() && (
                <div className="absolute top-full left-0 w-full mt-1.5 bg-card border border-border/40 rounded-lg shadow-glow overflow-hidden z-50 animate-fade-in py-1">
                  {filteredSuggestions.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-muted-foreground text-center">
                      No terms found. Hit Enter to search anyway.
                    </div>
                  ) : (
                    filteredSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(item.title)}
                        className="w-full px-4 py-2 hover:bg-primary/10 text-left text-xs text-foreground flex items-center justify-between group transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground/90 group-hover:text-primary transition-colors">
                            {item.title}
                          </span>
                          <span className="text-[9px] text-muted-foreground mt-0.5">
                            {item.category}
                          </span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6 flex-shrink-0">
            <Link
              href={isMounted && lastActivePracticeSessionId ? `/practice-studio?sessionId=${lastActivePracticeSessionId}` : "/practice-studio"}
              className={`relative py-1 text-sm font-semibold transition-colors duration-300 ${
                pathname.startsWith('/practice-studio')
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Practice Studio
              <span
                className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full transition-all duration-300 origin-left ${
                  pathname.startsWith('/practice-studio') ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                }`}
              />
            </Link>
            <Link
              href={isMounted && lastActiveTheorySessionId ? `/theory-tutor?sessionId=${lastActiveTheorySessionId}` : "/theory-tutor"}
              className={`relative py-1 text-sm font-semibold transition-colors duration-300 ${
                pathname.startsWith('/theory-tutor')
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Theory Tutor
              <span
                className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full transition-all duration-300 origin-left ${
                  pathname.startsWith('/theory-tutor') ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                }`}
              />
            </Link>
            <Link
              href="/music-library"
              className={`relative py-1 text-sm font-semibold transition-colors duration-300 ${
                pathname.startsWith('/music-library')
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Music Library
              <span
                className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full transition-all duration-300 origin-left ${
                  pathname.startsWith('/music-library') ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                }`}
              />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => window.dispatchEvent(new Event('treble_sidebar_toggle'))}
            className="md:hidden p-2 rounded-lg hover:bg-card/60 transition-colors text-foreground focus:outline-none flex-shrink-0"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
