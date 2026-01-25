'use client';

/**
 * Back Button - Uses browser history with fallback
 *
 * For legal pages that are accessible from multiple entry points
 * (login, authenticated app, direct links)
 *
 * If no history exists (direct access), navigates to home page
 */

import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  const handleBack = useCallback(() => {
    const currentPath = pathname;

    // Try to go back
    router.back();

    // After a short delay, check if we're still on the same page
    // If so, it means there was no history - navigate to home
    setTimeout(() => {
      if (window.location.pathname === currentPath) {
        router.push('/');
      }
    }, 100);
  }, [router, pathname]);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2"
      onClick={handleBack}
    >
      <ArrowLeft className="h-4 w-4" />
      Retour
    </Button>
  );
}
