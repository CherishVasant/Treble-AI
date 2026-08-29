'use client';

import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { ChatProvider } from '@/context/chat-context';
import { SidebarProvider, useSidebar } from '@/context/sidebar-context';
import Sidebar from '@/components/sidebar';
import Navbar from '@/components/navbar';
import AuthLandingPage from '@/components/auth-landing-page';
import { Loader2, Music } from 'lucide-react';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { collapsed, layoutMode } = useSidebar();
  const pathname = usePathname();
  // In Studio mode on Practice Studio, <main> must clip overflow so the grid
  // can fill the remaining viewport height without the page scrolling.
  const isStudioActive = layoutMode === 'studio' && pathname.startsWith('/practice-studio');

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
        <div className="p-4 bg-gradient-primary rounded-2xl shadow-glow animate-pulse">
          <Music className="w-12 h-12 text-white" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground font-semibold text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Syncing your studio...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthLandingPage />;
  }

  return (
    <>
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      {/* Dynamic left padding matches sidebar width (w-14=56px collapsed, w-64=256px expanded) */}
      {/* In Studio mode the outer wrapper is h-screen (not min-h-screen) so the flex grid can fill exactly the viewport */}
      <div className={`flex flex-col transition-all duration-300 ${collapsed ? 'md:pl-14' : 'md:pl-64'} ${isStudioActive ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
        <Navbar />
        <main className={`flex-1${isStudioActive ? ' overflow-hidden flex flex-col min-h-0' : ''}`}>
          {children}
        </main>
      </div>
    </>
  );
}

function AppLayoutWithSidebar({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SidebarProvider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ChatProvider>
        <AppLayoutWithSidebar>{children}</AppLayoutWithSidebar>
      </ChatProvider>
    </AuthProvider>
  );
}
