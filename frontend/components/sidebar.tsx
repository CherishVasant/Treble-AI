'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { Music, Star, BookOpen, ChevronRight, Settings, Plus, Search, MessageSquare, Menu, X, Trash2, Loader2, Edit2, Check, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useChat } from '@/context/chat-context';
import { useAuth } from '@/context/auth-context';

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

const MUSIC_LIBRARY_GROUPS = [
  {
    name: 'Scales',
    defaultSlug: 'major_scales',
    slugs: ['major_scales', 'natural_minor_scales', 'harmonic_minor_scales', 'melodic_minor_scales', 'chromatic_scales', 'major_pentatonic_scales', 'minor_pentatonic_scales', 'blues_scales', 'whole_tone_scales', 'diminished_scales', 'bebop_scales']
  },
  {
    name: 'Modes',
    defaultSlug: 'ionian_mode',
    slugs: ['ionian_mode', 'dorian_mode', 'phrygian_mode', 'lydian_mode', 'mixolydian_mode', 'aeolian_mode', 'locrian_mode']
  },
  {
    name: 'Chords',
    defaultSlug: 'major_chords',
    slugs: ['major_chords', 'minor_chords', 'diminished_chords', 'augmented_chords', 'suspended_chords', 'dominant_seventh_chords', 'major_seventh_chords', 'minor_seventh_chords', 'half_diminished_chords', 'fully_diminished_chords', 'sixth_chords', 'ninth_chords', 'eleventh_chords', 'thirteenth_chords', 'altered_chords']
  },
  {
    name: 'Arpeggios',
    defaultSlug: 'major_arpeggios',
    slugs: ['major_arpeggios', 'minor_arpeggios', 'diminished_arpeggios', 'augmented_arpeggios', 'dominant_seventh_arpeggios', 'major_seventh_arpeggios', 'minor_seventh_arpeggios']
  },
  {
    name: 'Intervals',
    defaultSlug: 'interval_unison',
    slugs: ['interval_unison', 'interval_minor_second', 'interval_major_second', 'interval_minor_third', 'interval_major_third', 'interval_perfect_fourth', 'interval_tritone', 'interval_perfect_fifth', 'interval_minor_sixth', 'interval_major_sixth', 'interval_minor_seventh', 'interval_major_seventh', 'interval_octave']
  },
  {
    name: 'Notation',
    defaultSlug: 'notation_clefs',
    slugs: ['notation_clefs', 'notation_dynamics', 'notation_articulations', 'notation_tempo_markings', 'notation_repeats', 'notation_endings', 'notation_pedal_markings', 'notation_ornaments', 'notation_slurs', 'notation_ties', 'notation_tuplets']
  },
  {
    name: 'Music History',
    defaultSlug: 'circle_of_fifths',
    slugs: ['circle_of_fifths', 'key_signatures', 'time_signatures', 'scale_degrees', 'chord_functions', 'harmonic_progressions', 'cadences', 'modes_theory', 'voice_leading']
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const { 
    theorySessions, 
    practiceSessions, 
    clearAllSessions, 
    lastActiveTheorySessionId, 
    lastActivePracticeSessionId,
    renameSession,
    deleteSession 
  } = useChat();
  const { logout, user } = useAuth();
  
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [theorySearch, setTheorySearch] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleStartRename = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingSessionId(id);
    setEditTitle(currentTitle);
  };

  const handleSaveRename = async (e: React.MouseEvent | React.KeyboardEvent, type: 'theory' | 'practice', id: string) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;
    const ok = await renameSession(type, id, editTitle.trim());
    if (ok) {
      setEditingSessionId(null);
    }
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };

  const handleDeleteSession = async (e: React.MouseEvent, type: 'theory' | 'practice', id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      const ok = await deleteSession(type, id);
      if (ok && currentSessionId === id) {
        router.push(type === 'theory' ? '/theory-tutor' : '/practice-studio');
      }
    }
  };

  const renderSessionRow = (session: any, type: 'theory' | 'practice') => {
    const isActive = currentSessionId === session.id;
    const isEditing = editingSessionId === session.id;
    
    if (isEditing) {
      return (
        <div key={session.id} className="w-full flex items-center gap-1.5 px-2 py-1 bg-card/65 border border-border/40 rounded-lg">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveRename(e, type, session.id);
              if (e.key === 'Escape') handleCancelRename(e as any);
            }}
            autoFocus
            className="flex-1 min-w-0 bg-transparent text-xs text-foreground focus:outline-none"
          />
          <button
            onClick={(e) => handleSaveRename(e, type, session.id)}
            className="p-0.5 text-green-400 hover:text-green-300 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCancelRename}
            className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }
    
    const clickUrl = type === 'theory'
      ? `/theory-tutor?sessionId=${session.id}`
      : `/practice-studio?sessionId=${session.id}`;
      
    return (
      <div
        key={session.id}
        onClick={() => router.push(clickUrl)}
        className={`group relative w-full flex items-center justify-between rounded-lg text-left text-xs truncate transition-all duration-200 border cursor-pointer ${
          isActive
            ? 'bg-primary/10 text-foreground font-bold border-primary/20 border-l-2 border-l-primary pl-2.5 pr-3 py-1.5 shadow-sm'
            : 'text-muted-foreground hover:bg-card/45 hover:text-foreground border-transparent px-3 py-1.5'
        }`}
      >
        <div className="flex items-center gap-2 truncate flex-1 mr-8">
          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{session.title}</span>
        </div>
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-card/85 via-card/75 to-transparent pl-3 py-0.5">
          <button
            onClick={(e) => handleStartRename(e, session.id, session.title)}
            className="text-muted-foreground hover:text-primary transition-colors p-0.5"
            title="Rename"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => handleDeleteSession(e, type, session.id)}
            className="text-muted-foreground hover:text-red-400 transition-colors p-0.5"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };
  
  // Music Library Specific states
  const [favoritesCount, setFavoritesCount] = useState(0);
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

  // Load Bookmarks from localStorage
  const loadFavorites = () => {
    try {
      const favs = localStorage.getItem('treble_favorites');
      if (favs) setFavoritesCount((JSON.parse(favs) as string[]).length);
      else setFavoritesCount(0);
    } catch (e) {
      console.error('Failed to load favorites in sidebar:', e);
    }
  };

  useEffect(() => {
    loadFavorites();
    window.addEventListener('treble_recents_updated', loadFavorites);
    return () => {
      window.removeEventListener('treble_recents_updated', loadFavorites);
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

  const handleClearAllChats = () => {
    if (pathname === '/practice-studio') {
      clearAllSessions('practice');
      router.push('/practice-studio');
      toast.success('Cleared all practice chats.');
    } else if (pathname === '/theory-tutor') {
      clearAllSessions('theory');
      router.push('/theory-tutor');
      toast.success('Cleared all theory chats.');
    }
    setShowClearConfirm(false);
  };

  const renderContextualSection = () => {
    if (!isMounted) {
      return (
        <div className="flex-1 flex items-center justify-center p-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
        </div>
      );
    }

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
                {groupedPracticeSessions.today.map(session => renderSessionRow(session, 'practice'))}
              </div>
            )}

            {groupedPracticeSessions.yesterday.length > 0 && (
              <div className="space-y-1">
                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Yesterday</h5>
                {groupedPracticeSessions.yesterday.map(session => renderSessionRow(session, 'practice'))}
              </div>
            )}

            {groupedPracticeSessions.older.length > 0 && (
              <div className="space-y-1">
                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Older</h5>
                {groupedPracticeSessions.older.map(session => renderSessionRow(session, 'practice'))}
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
            {filteredTheorySessions.map(session => renderSessionRow(session, 'theory'))}

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
            <h5 className="text-[10px] font-bold text-muted-foreground tracking-wider px-3 mb-1.5">Saved & Bookmarks</h5>
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
          </div>

          {/* Categories List tree */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <h5 className="text-[10px] font-bold text-muted-foreground tracking-wider px-3">Catalog Categories</h5>
            <div className="space-y-1">
              {MUSIC_LIBRARY_GROUPS.map((group) => {
                const isActive = group.slugs.includes(activeCategory);
                
                return (
                  <button
                    key={group.name}
                    onClick={() => router.push(`/music-library?category=${group.defaultSlug}`)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-all duration-200 ${
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold border border-primary/15'
                        : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
                    }`}
                  >
                    <span>{group.name}</span>
                  </button>
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
          <Link 
            href={isMounted && lastActivePracticeSessionId ? `/practice-studio?sessionId=${lastActivePracticeSessionId}` : "/practice-studio"} 
            className={getLinkClass('/practice-studio')}
          >
            Practice Studio
          </Link>
          <Link 
            href={isMounted && lastActiveTheorySessionId ? `/theory-tutor?sessionId=${lastActiveTheorySessionId}` : "/theory-tutor"} 
            className={getLinkClass('/theory-tutor')}
          >
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
      <div className="shrink-0 space-y-1">
        {(pathname === '/practice-studio' || pathname === '/theory-tutor') && (
          <button
            onClick={() => setShowClearConfirm(true)}
            suppressHydrationWarning={true}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-400/80 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all text-sm font-semibold mb-1"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Chats
          </button>
        )}

        {user && (
          <div className="px-3 py-1.5 flex items-center justify-between text-xs text-muted-foreground/80 font-medium">
            <span className="truncate">Active: <b className="text-foreground">{user.username}</b></span>
          </div>
        )}

        <button
          onClick={handleSettingsClick}
          suppressHydrationWarning={true}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/45 transition-all text-sm font-semibold"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>

        <button
          onClick={logout}
          suppressHydrationWarning={true}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm font-semibold hover:border-transparent"
        >
          <LogOut className="w-4 h-4" />
          Log Out
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

      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border/40 p-6 rounded-xl max-w-sm w-full mx-4 shadow-glow/20 space-y-4 animate-scale-in">
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-foreground">Clear Chat History</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to delete all conversations? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <Button
                variant="ghost"
                onClick={() => setShowClearConfirm(false)}
                className="hover:bg-card/75 border border-border/10 text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleClearAllChats}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold shadow-md"
              >
                Delete All
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
