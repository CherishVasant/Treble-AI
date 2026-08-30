'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useChat } from '@/context/chat-context';

// ── SVG icons ─────────────────────────────────────────────────────────────────

const PianoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="2" y="3" width="20" height="18" rx="2" />
    <path d="M6 3v10M10 3v10M14 3v10M18 3v10M2 13h20" />
  </svg>
);

const BookIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const MusicIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

// ── Nav items config ───────────────────────────────────────────────────────────

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  sessionKey?: 'practice' | 'theory';
}

const NAV_ITEMS: NavItem[] = [
  { path: '/practice-studio', label: 'Practice Studio', icon: <PianoIcon />, sessionKey: 'practice' },
  { path: '/theory-tutor',    label: 'Theory Tutor',    icon: <BookIcon />,  sessionKey: 'theory'   },
  { path: '/music-library',   label: 'Music Library',   icon: <MusicIcon />                          },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function Navbar() {
  const pathname = usePathname();
  const { lastActiveTheorySessionId, lastActivePracticeSessionId } = useChat();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const getHref = (item: NavItem) => {
    if (!isMounted) return item.path;
    if (item.sessionKey === 'practice' && lastActivePracticeSessionId)
      return `/practice-studio?sessionId=${lastActivePracticeSessionId}`;
    if (item.sessionKey === 'theory' && lastActiveTheorySessionId)
      return `/theory-tutor?sessionId=${lastActiveTheorySessionId}`;
    return item.path;
  };

  return (
    // Transparent container — only contributes height to the flex column layout.
    // The visual pill floats inside it via its own shadow/border/backdrop.
    <nav className="h-14 relative z-50 flex items-center justify-center pointer-events-none">

      {/* ── Floating island pill ── */}
      <div className="pointer-events-auto flex items-center gap-0.5 px-1.5 py-1.5 rounded-2xl border border-border/30 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/50">
        {NAV_ITEMS.map((item, i) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <React.Fragment key={item.path}>
              {/* Separator between items */}
              {i > 0 && (
                <div className="w-px h-[18px] bg-border/40 flex-shrink-0 mx-0.5" />
              )}
              <Link
                href={getHref(item)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap select-none ${
                  isActive
                    ? 'bg-gradient-primary text-white shadow-glow'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/65'
                }`}
              >
                <span className={isActive ? 'text-white' : ''}>{item.icon}</span>
                {/* Label: hidden on very small screens, shown sm+ */}
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Mobile sidebar toggle — floats at right edge ── */}
      <button
        onClick={() => window.dispatchEvent(new Event('treble_sidebar_toggle'))}
        className="pointer-events-auto md:hidden absolute right-4 p-2 rounded-lg bg-card/70 backdrop-blur-sm border border-border/30 hover:bg-card/90 transition-colors text-foreground focus:outline-none shadow-md"
        aria-label="Toggle Navigation Menu"
      >
        <Menu className="w-4 h-4" />
      </button>
    </nav>
  );
}
