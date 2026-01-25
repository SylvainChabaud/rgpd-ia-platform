'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CONTEXT_ERRORS } from '@/shared/frontend/errors';

/**
 * Context: Cookie Banner State Management
 *
 * SECURITY: Type-safe React Context instead of CustomEvent (DOM)
 * LOT 13.0 - Authentification & Layout User
 *
 * Usage:
 * - CookieConsentBanner listens to `isBannerOpen` and `showSettings`
 * - UserFooter calls `openBanner()` to open with settings panel
 */

interface CookieBannerContextValue {
  /** Whether the banner is visible */
  isBannerOpen: boolean;
  /** Whether to show settings panel directly */
  showSettings: boolean;
  /** Open the banner (optionally with settings panel) */
  openBanner: (withSettings?: boolean) => void;
  /** Close the banner */
  closeBanner: () => void;
  /** Set settings panel visibility */
  setShowSettings: (show: boolean) => void;
}

const CookieBannerContext = createContext<CookieBannerContextValue | null>(null);

export function CookieBannerProvider({ children }: { children: ReactNode }) {
  const [isBannerOpen, setIsBannerOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const openBanner = useCallback((withSettings = false) => {
    setIsBannerOpen(true);
    setShowSettings(withSettings);
  }, []);

  const closeBanner = useCallback(() => {
    setIsBannerOpen(false);
    setShowSettings(false);
  }, []);

  const value: CookieBannerContextValue = {
    isBannerOpen,
    showSettings,
    openBanner,
    closeBanner,
    setShowSettings,
  };

  return (
    <CookieBannerContext.Provider value={value}>
      {children}
    </CookieBannerContext.Provider>
  );
}

/**
 * Hook to access cookie banner context
 * @throws Error if used outside CookieBannerProvider
 */
export function useCookieBanner(): CookieBannerContextValue {
  const context = useContext(CookieBannerContext);
  if (!context) {
    throw new Error(CONTEXT_ERRORS.COOKIE_BANNER_OUTSIDE_PROVIDER);
  }
  return context;
}
