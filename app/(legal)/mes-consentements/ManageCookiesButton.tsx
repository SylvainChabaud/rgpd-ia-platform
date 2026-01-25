'use client';

/**
 * Client Component: Manage Cookies Button
 *
 * Opens the cookie consent banner via CookieBannerContext
 *
 * RGPD: Art. 7 (Consent withdrawal must be as easy as giving consent)
 * ePrivacy: Art. 5.3 (Cookie consent management)
 */

import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useCookieBanner } from '@/lib/contexts/CookieBannerContext';

export function ManageCookiesButton() {
  const { openBanner } = useCookieBanner();

  const handleClick = () => {
    // Open banner with settings panel visible
    openBanner(true);
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      className="w-full gap-2"
    >
      <Settings className="h-4 w-4" />
      Gérer mes cookies
    </Button>
  );
}
