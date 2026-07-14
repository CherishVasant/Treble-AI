'use client';

import AuthLandingPage from '@/components/auth-landing-page';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/practice-studio');
    }
  }, [isAuthenticated, isLoading, router]);

  return <AuthLandingPage />;
}
