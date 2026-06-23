'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { Search, ChevronRight, Star, Home } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import ReferenceCard from '@/components/reference-card';
import PageHeader from '@/components/ui/page-header';

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
  const [savedCards, setSavedCards] = useState<ReferenceEntry[]>([]);

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

      const saved = localStorage.getItem('treble_custom_references');
      if (saved) setSavedCards(JSON.parse(saved));
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
      const allEntries = [
        ...sections.flatMap((s) => s.entries.map((e) => ({ ...e, categorySlug: s.slug }))),
        ...savedCards.map((sc) => ({ ...sc, categorySlug: 'saved_cards' })),
      ];
      const matched = allEntries.filter((ent) => favorites.includes(ent.title));
      return {
        slug: 'favorites',
        title: 'Favorites',
        description: 'Your starred reference items. Items are saved locally in your browser.',
        entries: matched,
      };
    }
    if (activeCategory === 'saved_cards') {
      return {
        slug: 'saved_cards',
        title: 'Saved Cards',
        description: 'Explanations and theory guides you have saved directly from your Theory Tutor chats.',
        entries: savedCards,
      };
    }
    return sections.find((s) => s.slug === activeCategory);
  }, [sections, activeCategory, favorites, savedCards]);

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
    if (activeCategory === 'saved_cards') {
      return ['Music Library', 'Bookmarks', 'Saved Cards'];
    }
    
    // Find the category labels dynamically
    const categoryGroups = [
      { name: 'Scales', slugs: ['major_scales', 'natural_minor_scales', 'harmonic_minor_scales', 'melodic_minor_scales', 'chromatic_scales', 'major_pentatonic_scales', 'minor_pentatonic_scales', 'blues_scales', 'whole_tone_scales', 'diminished_scales', 'bebop_scales'] },
      { name: 'Modes', slugs: ['ionian_mode', 'dorian_mode', 'phrygian_mode', 'lydian_mode', 'mixolydian_mode', 'aeolian_mode', 'locrian_mode'] },
      { name: 'Arpeggios', slugs: ['major_arpeggios', 'minor_arpeggios', 'diminished_arpeggios', 'augmented_arpeggios', 'dominant_seventh_arpeggios', 'major_seventh_arpeggios', 'minor_seventh_arpeggios'] },
      { name: 'Chords', slugs: ['major_chords', 'minor_chords', 'diminished_chords', 'augmented_chords', 'suspended_chords', 'dominant_seventh_chords', 'major_seventh_chords', 'minor_seventh_chords', 'half_diminished_chords', 'fully_diminished_chords', 'sixth_chords', 'ninth_chords', 'eleventh_chords', 'thirteenth_chords', 'altered_chords'] },
      { name: 'Intervals', slugs: ['interval_unison', 'interval_minor_second', 'interval_major_second', 'interval_minor_third', 'interval_major_third', 'interval_perfect_fourth', 'interval_tritone', 'interval_perfect_fifth', 'interval_minor_sixth', 'interval_major_sixth', 'interval_minor_seventh', 'interval_major_seventh', 'interval_octave'] },
      { name: 'Music Theory', slugs: ['circle_of_fifths', 'key_signatures', 'time_signatures', 'scale_degrees', 'chord_functions', 'harmonic_progressions', 'cadences', 'modes_theory', 'voice_leading'] },
      { name: 'Notation', slugs: ['notation_clefs', 'notation_dynamics', 'notation_articulations', 'notation_tempo_markings', 'notation_repeats', 'notation_endings', 'notation_pedal_markings', 'notation_ornaments', 'notation_slurs', 'notation_ties', 'notation_tuplets'] }
    ];

    const group = categoryGroups.find(g => g.slugs.includes(activeCategory));
    const title = activeSection?.title || activeCategory.replace(/_/g, ' ');
    if (group) {
      return ['Music Library', group.name, title];
    }
    return ['Music Library', 'Catalog', title];
  }, [activeCategory, activeSection]);

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

    // Search custom saved cards
    const customMatches = savedCards.filter((card) => {
      const inTitle = card.title.toLowerCase().includes(q);
      const inDesc = (card.description ?? '').toLowerCase().includes(q);
      return inTitle || inDesc;
    });

    if (customMatches.length > 0) {
      results.push({
        sectionTitle: 'Saved Tutor Answers',
        slug: 'saved_cards',
        entries: customMatches,
      });
    }

    return results;
  }, [sections, savedCards, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  // Filtered list of cards for active section (non-global mode)
  const filteredEntries = useMemo(() => {
    if (!activeSection) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeSection.entries;

    // Local filter when queries are entered within section
    if (activeCategory === 'favorites' || activeCategory === 'saved_cards') {
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

        {/* Interactive Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card/25 p-3 rounded-xl border border-border/30 shadow-inner">
          <Home className="w-3.5 h-3.5 text-primary shrink-0" />
          {breadcrumbPath.map((node, nIdx) => (
            <div key={nIdx} className="flex items-center gap-2">
              {nIdx > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/60" />}
              <span
                className={`font-medium ${
                  nIdx === breadcrumbPath.length - 1
                    ? 'text-foreground font-semibold'
                    : 'hover:text-foreground cursor-pointer transition-colors'
                }`}
                onClick={() => {
                  if (nIdx === 0) router.push('/music-library?category=major_scales');
                  else if (node === 'Favorites') router.push('/music-library?category=favorites');
                  else if (node === 'Saved Cards') router.push('/music-library?category=saved_cards');
                }}
              >
                {node}
              </span>
            </div>
          ))}
          {isSearching && (
            <>
              <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
              <span className="text-primary font-semibold">Search Matches</span>
            </>
          )}
        </div>

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
                  globalSearchResults.map((gSec) => (
                    <div key={gSec.slug} className="space-y-3.5">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-l-2 border-primary pl-2">
                        {gSec.sectionTitle}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                            onFavoriteToggle={loadLocalStorageData}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Standard single active category card grid */
              <div className="space-y-6">
                <div className="pb-3 border-b border-border/25 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {activeSection?.title || 'Catalog'}
                    </h2>
                    {activeSection?.description && (
                      <p className="text-muted-foreground mt-1 text-xs sm:text-sm leading-relaxed max-w-4xl">
                        {activeSection.description}
                      </p>
                    )}
                  </div>
                  {sharedFormula && (
                    <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-2 text-xs font-mono font-bold text-primary w-fit h-fit shrink-0">
                      Pattern: {sharedFormula}
                    </div>
                  )}
                </div>

                {filteredEntries.length === 0 ? (
                  <div className="text-center py-16 bg-card/10 rounded-xl border border-dashed border-border/30">
                    <p className="text-muted-foreground text-sm mb-3">No reference items in this category.</p>
                    {activeCategory === 'favorites' && (
                      <p className="text-xs text-muted-foreground">Star items in the library to see them listed here.</p>
                    )}
                    {activeCategory === 'saved_cards' && (
                      <p className="text-xs text-muted-foreground">Save items in your chats with the Theory Tutor to see them here.</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                        onFavoriteToggle={loadLocalStorageData}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
