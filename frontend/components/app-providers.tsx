'use client';

import React, { Suspense } from 'react';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { ChatProvider } from '@/context/chat-context';
import Sidebar from '@/components/sidebar';
import Navbar from '@/components/navbar';
import AuthLandingPage from '@/components/auth-landing-page';
import { Loader2, Music } from 'lucide-react';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

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
      <div className="flex flex-col min-h-screen md:pl-64">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ChatProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </ChatProvider>
    </AuthProvider>
  );
}
