'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { Search, ChevronRight, Star, Home } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import ReferenceCard from '@/components/reference-card';
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
        {!isSearching && activeCategory !== 'favorites' && activeGroup && (
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
        {!isSearching && activeSection && (
          <div className="space-y-1.5 py-1">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {activeSubcategoryLabel}
            </h1>
            {activeSection.description && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-4xl">
                {cleanDescription(activeSection.description)}
              </p>
            )}
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
