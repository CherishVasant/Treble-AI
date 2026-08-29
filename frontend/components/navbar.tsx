'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useChat } from '@/context/chat-context';

const PAGE_LABELS: Record<string, string> = {
  '/practice-studio': 'Practice Studio',
  '/theory-tutor': 'Theory Tutor',
  '/music-library': 'Music Library',
};

export default function Navbar() {
  const pathname = usePathname();
  const { lastActiveTheorySessionId, lastActivePracticeSessionId } = useChat();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  // Derive current page label from pathname
  const pageLabel = Object.entries(PAGE_LABELS).find(([path]) =>
    pathname.startsWith(path)
  )?.[1] ?? '';

  return (
    <nav className="glass sticky top-0 z-50 border-b border-border/30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">

          {/* Left: current page name */}
          <div className="flex items-center min-w-0">
            {pageLabel ? (
              <span className="text-base font-bold text-foreground truncate">{pageLabel}</span>
            ) : (
              <span className="text-base font-bold text-muted-foreground">TrebleAI</span>
            )}
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6 flex-shrink-0">
            <Link
              href={isMounted && lastActivePracticeSessionId ? `/practice-studio?sessionId=${lastActivePracticeSessionId}` : '/practice-studio'}
              className={`relative py-1 text-sm font-semibold transition-colors duration-300 ${
                pathname.startsWith('/practice-studio')
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Practice Studio
              <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full transition-all duration-300 origin-left ${
                pathname.startsWith('/practice-studio') ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
              }`} />
            </Link>

            <Link
              href={isMounted && lastActiveTheorySessionId ? `/theory-tutor?sessionId=${lastActiveTheorySessionId}` : '/theory-tutor'}
              className={`relative py-1 text-sm font-semibold transition-colors duration-300 ${
                pathname.startsWith('/theory-tutor')
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Theory Tutor
              <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full transition-all duration-300 origin-left ${
                pathname.startsWith('/theory-tutor') ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
              }`} />
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
              <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full transition-all duration-300 origin-left ${
                pathname.startsWith('/music-library') ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
              }`} />
            </Link>
          </div>

          {/* Mobile: hamburger opens sidebar drawer */}
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
