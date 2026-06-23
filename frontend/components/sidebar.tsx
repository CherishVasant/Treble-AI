'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { Music, Star, BookOpen, ChevronRight, Settings, Plus, Search, MessageSquare, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const CATEGORY_GROUPS = [
  {
    name: 'Scales',
    items: [
      { slug: 'major_scales', label: 'Major Scales' },
      { slug: 'natural_minor_scales', label: 'Natural Minor Scales' },
      { slug: 'harmonic_minor_scales', label: 'Harmonic Minor Scales' },
      { slug: 'melodic_minor_scales', label: 'Melodic Minor Scales' },
      { slug: 'chromatic_scales', label: 'Chromatic Scales' },
      { slug: 'major_pentatonic_scales', label: 'Major Pentatonic' },
      { slug: 'minor_pentatonic_scales', label: 'Minor Pentatonic' },
      { slug: 'blues_scales', label: 'Blues Scales' },
      { slug: 'whole_tone_scales', label: 'Whole Tone Scales' },
      { slug: 'diminished_scales', label: 'Diminished Scales' },
      { slug: 'bebop_scales', label: 'Bebop Scales' },
    ]
  },
  {
    name: 'Modes',
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
    name: 'Arpeggios',
    items: [
      { slug: 'major_arpeggios', label: 'Major Arpeggios' },
      { slug: 'minor_arpeggios', label: 'Minor Arpeggios' },
      { slug: 'diminished_arpeggios', label: 'Diminished' },
      { slug: 'augmented_arpeggios', label: 'Augmented' },
      { slug: 'dominant_seventh_arpeggios', label: 'Dominant 7th' },
      { slug: 'major_seventh_arpeggios', label: 'Major 7th' },
      { slug: 'minor_seventh_arpeggios', label: 'Minor 7th' },
    ]
  },
  {
    name: 'Chords',
    items: [
      { slug: 'major_chords', label: 'Major Chords' },
      { slug: 'minor_chords', label: 'Minor Chords' },
      { slug: 'diminished_chords', label: 'Diminished Chords' },
      { slug: 'augmented_chords', label: 'Augmented Chords' },
      { slug: 'suspended_chords', label: 'Suspended Chords' },
      { slug: 'dominant_seventh_chords', label: 'Dominant 7th Chords' },
      { slug: 'major_seventh_chords', label: 'Major 7th Chords' },
      { slug: 'minor_seventh_chords', label: 'Minor 7th Chords' },
      { slug: 'half_diminished_chords', label: 'Half-Diminished' },
      { slug: 'fully_diminished_chords', label: 'Fully Diminished' },
      { slug: 'sixth_chords', label: 'Sixth Chords' },
      { slug: 'ninth_chords', label: 'Ninth Chords' },
      { slug: 'eleventh_chords', label: 'Eleventh Chords' },
      { slug: 'thirteenth_chords', label: 'Thirteenth Chords' },
      { slug: 'altered_chords', label: 'Altered Chords' },
    ]
  },
  {
    name: 'Intervals',
    items: [
      { slug: 'interval_unison', label: 'Unison' },
      { slug: 'interval_minor_second', label: 'Minor Second' },
      { slug: 'interval_major_second', label: 'Major Second' },
      { slug: 'interval_minor_third', label: 'Minor Third' },
      { slug: 'interval_major_third', label: 'Major Third' },
      { slug: 'interval_perfect_fourth', label: 'Perfect Fourth' },
      { slug: 'interval_tritone', label: 'Tritone' },
      { slug: 'interval_perfect_fifth', label: 'Perfect Fifth' },
      { slug: 'interval_minor_sixth', label: 'Minor Sixth' },
      { slug: 'interval_major_sixth', label: 'Major Sixth' },
      { slug: 'interval_minor_seventh', label: 'Minor Seventh' },
      { slug: 'interval_major_seventh', label: 'Major Seventh' },
      { slug: 'interval_octave', label: 'Octave' },
    ]
  },
  {
    name: 'Music Theory',
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
  },
  {
    name: 'Notation',
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
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isOpen, setIsOpen] = useState(false);
  
  // Page specific data states
  const [practiceSessions, setPracticeSessions] = useState<any[]>([]);
  const [theorySessions, setTheorySessions] = useState<any[]>([]);
  const [theorySearch, setTheorySearch] = useState('');
  
  // Music Library Specific states
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [savedCardsCount, setSavedCardsCount] = useState(0);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    'Modes': true,
    'Arpeggios': true,
    'Chords': true,
    'Intervals': true,
    'Music Theory': true,
    'Notation': true,
  });

  const activeCategory = pathname === '/music-library' ? (searchParams.get('category') || 'major_scales') : '';
  const currentSessionId = searchParams.get('sessionId') || '';

  // Synchronize responsive drawer listeners
  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    const handleClose = () => setIsOpen(false);
    
    window.addEventListener('treble_sidebar_toggle', handleToggle);
    window.addEventListener('treble_sidebar_close', handleClose);
    return () => {
      window.removeEventListener('treble_sidebar_toggle', handleToggle);
      window.removeEventListener('treble_sidebar_close', handleClose);
    };
  }, []);

  // Close drawer on path change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname, searchParams]);

  // Load Sessions and Books from localStorage
  const loadData = () => {
    try {
      // Practice Studio sessions
      const practice = localStorage.getItem('treble_practice_sessions');
      if (practice) setPracticeSessions(JSON.parse(practice));
      else setPracticeSessions([]);

      // Theory Tutor sessions
      const theory = localStorage.getItem('treble_theory_sessions');
      if (theory) setTheorySessions(JSON.parse(theory));
      else setTheorySessions([]);

      // Bookmarks counts
      const favs = localStorage.getItem('treble_favorites');
      if (favs) setFavoritesCount((JSON.parse(favs) as string[]).length);
      else setFavoritesCount(0);

      const saved = localStorage.getItem('treble_custom_references');
      if (saved) setSavedCardsCount((JSON.parse(saved) as any[]).length);
      else setSavedCardsCount(0);
    } catch (e) {
      console.error('Failed to load sessions in sidebar:', e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('treble_sessions_updated', loadData);
    window.addEventListener('treble_recents_updated', loadData);
    return () => {
      window.removeEventListener('treble_sessions_updated', loadData);
      window.removeEventListener('treble_recents_updated', loadData);
    };
  }, []);

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const getLinkClass = (path: string) => {
    const isActive = pathname === path;
    return isActive
      ? 'flex items-center gap-2.5 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold shadow-sm text-sm'
      : 'flex items-center gap-2.5 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/45 border border-transparent transition-all text-sm';
  };

  // Group practice sessions by date: Today vs Yesterday vs Older
  const groupedPracticeSessions = useMemo(() => {
    const today: any[] = [];
    const yesterday: any[] = [];
    const older: any[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    practiceSessions.forEach(session => {
      const time = new Date(session.timestamp).getTime();
      if (time >= startOfToday) {
        today.push(session);
      } else if (time >= startOfYesterday) {
        yesterday.push(session);
      } else {
        older.push(session);
      }
    });

    return { today, yesterday, older };
  }, [practiceSessions]);

  // Group theory sessions filtered by search query
  const filteredTheorySessions = useMemo(() => {
    const q = theorySearch.trim().toLowerCase();
    if (!q) return theorySessions;
    return theorySessions.filter(s =>
      s.title.toLowerCase().includes(q) ||
      (s.messages || []).some((m: any) => m.content.toLowerCase().includes(q))
    );
  }, [theorySessions, theorySearch]);

  const handleNewChatPractice = () => {
    router.push('/practice-studio');
    window.dispatchEvent(new Event('treble_new_chat_practice'));
  };

  const handleNewChatTheory = () => {
    router.push('/theory-tutor');
    window.dispatchEvent(new Event('treble_new_chat_theory'));
  };

  const renderContextualSection = () => {
    if (pathname === '/practice-studio') {
      return (
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <Button
            onClick={handleNewChatPractice}
            className="w-full bg-gradient-primary hover:shadow-glow text-white text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 h-9 shrink-0 shadow-glow"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {groupedPracticeSessions.today.length > 0 && (
              <div className="space-y-1">
                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Today's Chats</h5>
                {groupedPracticeSessions.today.map(session => (
                  <button
                    key={session.id}
                    onClick={() => router.push(`/practice-studio?sessionId=${session.id}`)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-xs truncate transition-all duration-200 ${
                      currentSessionId === session.id
                        ? 'bg-primary/10 text-primary font-semibold border border-primary/15'
                        : 'text-muted-foreground hover:bg-card/45 hover:text-foreground'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{session.title}</span>
                  </button>
                ))}
              </div>
            )}

            {groupedPracticeSessions.yesterday.length > 0 && (
              <div className="space-y-1">
                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Yesterday</h5>
                {groupedPracticeSessions.yesterday.map(session => (
                  <button
                    key={session.id}
                    onClick={() => router.push(`/practice-studio?sessionId=${session.id}`)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-xs truncate transition-all duration-200 ${
                      currentSessionId === session.id
                        ? 'bg-primary/10 text-primary font-semibold border border-primary/15'
                        : 'text-muted-foreground hover:bg-card/45 hover:text-foreground'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{session.title}</span>
                  </button>
                ))}
              </div>
            )}

            {groupedPracticeSessions.older.length > 0 && (
              <div className="space-y-1">
                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Older</h5>
                {groupedPracticeSessions.older.map(session => (
                  <button
                    key={session.id}
                    onClick={() => router.push(`/practice-studio?sessionId=${session.id}`)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-xs truncate transition-all duration-200 ${
                      currentSessionId === session.id
                        ? 'bg-primary/10 text-primary font-semibold border border-primary/15'
                        : 'text-muted-foreground hover:bg-card/45 hover:text-foreground'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{session.title}</span>
                  </button>
                ))}
              </div>
            )}

            {practiceSessions.length === 0 && (
              <div className="text-center py-6 px-3 border border-dashed border-border/20 rounded-xl">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  No practice chats yet. Upload sheet music to begin.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (pathname === '/theory-tutor') {
      return (
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <Button
            onClick={handleNewChatTheory}
            className="w-full bg-gradient-primary hover:shadow-glow text-white text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 h-9 shrink-0 shadow-glow"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>

          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search history..."
              value={theorySearch}
              onChange={(e) => setTheorySearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-card border border-border/30 text-foreground placeholder:text-muted-foreground rounded-lg focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Conversations</h5>
            {filteredTheorySessions.map(session => (
              <button
                key={session.id}
                onClick={() => router.push(`/theory-tutor?sessionId=${session.id}`)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-xs truncate transition-all duration-200 ${
                  currentSessionId === session.id
                    ? 'bg-primary/10 text-primary font-semibold border border-primary/15'
                    : 'text-muted-foreground hover:bg-card/45 hover:text-foreground'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{session.title}</span>
              </button>
            ))}

            {filteredTheorySessions.length === 0 && (
              <div className="text-center py-6 px-3 border border-dashed border-border/20 rounded-xl">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {theorySearch ? 'No matching chats found.' : 'Ask Treble a theory question to begin.'}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (pathname === '/music-library') {
      return (
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* Favorites & Saved Cards quick actions */}
          <div className="space-y-1 shrink-0">
            <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Saved & Bookmarks</h5>
            <button
              onClick={() => router.push('/music-library?category=favorites')}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left text-xs transition-all duration-200 ${
                activeCategory === 'favorites'
                  ? 'bg-primary/10 text-primary font-semibold border border-primary/15 shadow-sm'
                  : 'text-muted-foreground hover:bg-card/40 hover:text-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" />
                Favorites
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/20 text-muted-foreground">
                {favoritesCount}
              </span>
            </button>

            <button
              onClick={() => router.push('/music-library?category=saved_cards')}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left text-xs transition-all duration-200 ${
                activeCategory === 'saved_cards'
                  ? 'bg-primary/10 text-primary font-semibold border border-primary/15 shadow-sm'
                  : 'text-muted-foreground hover:bg-card/40 hover:text-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                Saved AI Cards
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/20 text-muted-foreground">
                {savedCardsCount}
              </span>
            </button>
          </div>

          {/* Categories List tree */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3">Catalog Categories</h5>
            <div className="space-y-2">
              {CATEGORY_GROUPS.map((group) => {
                const isCollapsed = collapsedGroups[group.name];
                
                return (
                  <div key={group.name} className="space-y-0.5">
                    <button
                      onClick={() => toggleGroupCollapse(group.name)}
                      className="w-full flex items-center justify-between px-3 py-1 text-xs font-bold text-foreground/85 hover:text-foreground text-left"
                    >
                      <span>{group.name}</span>
                      <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${!isCollapsed ? 'rotate-90' : ''}`} />
                    </button>
                    
                    {!isCollapsed && (
                      <div className="pl-2 border-l border-border/20 ml-3.5 space-y-0.5 animate-fade-in">
                        {group.items.map((item) => {
                          const isActive = activeCategory === item.slug;

                          return (
                            <button
                              key={item.slug}
                              onClick={() => router.push(`/music-library?category=${item.slug}`)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-all duration-200 ${
                                isActive
                                  ? 'bg-primary/10 text-primary font-semibold border border-primary/15'
                                  : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
                              }`}
                            >
                              <span className="truncate">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Default dashboard / landing contextual list
    return (
      <div className="space-y-4">
        <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1">Favorites</h5>
        <button
          onClick={() => router.push('/music-library?category=favorites')}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left text-xs text-muted-foreground hover:bg-card/40 hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" />
            My Bookmarks
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/20 text-muted-foreground font-semibold">
            {favoritesCount}
          </span>
        </button>
      </div>
    );
  };

  const handleSettingsClick = () => {
    toast.success('TrebleAI settings loaded successfully!');
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-4 bg-card/45 border-r border-border/30 backdrop-blur-md relative">
      {/* Drawer close button on mobile */}
      {isOpen && (
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-lg bg-card/65 border border-border/30 text-foreground md:hidden hover:bg-card transition-colors z-50"
          aria-label="Close Sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Top Section Logo & Main Nav */}
      <div className="space-y-6 shrink-0">
        <Link href="/" className="flex items-center gap-2 group border-b border-border/20 pb-4 md:pb-0 md:border-b-0 block">
          <div className="p-2 bg-gradient-primary rounded-lg group-hover:shadow-glow transition-shadow shrink-0">
            <Music className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent truncate">
            TrebleAI
          </span>
        </Link>

        {/* Global Pages list */}
        <div className="space-y-1 md:hidden">
          <Link href="/practice-studio" className={getLinkClass('/practice-studio')}>
            Practice Studio
          </Link>
          <Link href="/theory-tutor" className={getLinkClass('/theory-tutor')}>
            Theory Tutor
          </Link>
          <Link href="/music-library" className={getLinkClass('/music-library')}>
            Music Library
          </Link>
        </div>
      </div>

      <div className="my-4 border-t border-border/25 w-full shrink-0" />

      {/* Dynamic Contextual Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {renderContextualSection()}
      </div>

      <div className="my-4 border-t border-border/25 w-full shrink-0" />

      {/* Settings Footer */}
      <div className="shrink-0">
        <button
          onClick={handleSettingsClick}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/45 transition-all text-sm font-semibold"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop permanent docked sidebar */}
      <aside className="hidden md:block w-64 h-screen fixed top-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar sliding overlay drawer */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Overlay backdrop */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
          />
          {/* Sliding container drawer */}
          <aside className="relative w-72 h-full z-10 animate-slide-right flex flex-col">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
