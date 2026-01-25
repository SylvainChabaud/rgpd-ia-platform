'use client';

import { useState, useEffect } from 'react';
import { X, Settings, Cookie, Shield, BarChart3, Megaphone, Check } from 'lucide-react';
import { toast } from 'sonner';
import { COOKIE_MESSAGES } from '@/lib/constants/ui/ui-labels';
import { useCookieBanner } from '@/lib/contexts/CookieBannerContext';
import { LEGAL_ROUTES, API_CONSENT_ROUTES } from '@/lib/constants/routes';
import { COOKIE_NAMES, STORAGE_KEYS } from '@/lib/constants/cookies';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';

/**
 * Component: Cookie Consent Modal
 *
 * RGPD compliance:
 * - ePrivacy Directive 2002/58/CE Art. 5.3
 * - Necessary cookies (JWT, CSRF) always enabled
 * - Analytics/Marketing require explicit opt-in
 * - TTL 12 months (CNIL standard)
 * - Preferences saved in DB + localStorage fallback
 *
 * LOT 10.3 - Cookie Consent Banner (Modal Design)
 */

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

function applyPreferences(prefs: CookiePreferences) {
  if (prefs.analytics) {
    loadAnalyticsScript();
  } else {
    blockAnalyticsScript();
  }

  if (prefs.marketing) {
    loadMarketingScript();
  } else {
    blockMarketingScript();
  }
}

function loadAnalyticsScript() {
  if (typeof window !== 'undefined' && !document.getElementById('plausible-script')) {
    const script = document.createElement('script');
    script.id = 'plausible-script';
    script.src = 'https://plausible.io/js/script.js';
    script.defer = true;
    script.dataset.domain = window.location.hostname;
    document.head.appendChild(script);
  }
}

function blockAnalyticsScript() {
  const script = document.getElementById('plausible-script');
  if (script) {
    script.remove();
  }
}

function loadMarketingScript() {
  // Marketing scripts will be loaded here when configured
}

function blockMarketingScript() {
  // Marketing scripts will be blocked here when configured
}

/**
 * Safe cookie parsing (anti-ReDoS)
 * SECURITY: Using simple split, no regex
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const cookieHeader = document.cookie;
  if (!cookieHeader) return null;

  for (const cookie of cookieHeader.split(';')) {
    const [key, ...valueParts] = cookie.trim().split('=');
    if (key === name) {
      return decodeURIComponent(valueParts.join('='));
    }
  }
  return null;
}

export function CookieConsentBanner() {
  const {
    isBannerOpen,
    showSettings,
    openBanner,
    closeBanner,
    setShowSettings,
  } = useCookieBanner();

  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Check existing consent on mount
   * Runs once - openBanner is stable from context
   */
  useEffect(() => {
    const checkExistingConsent = async () => {
      try {
        // For anonymous users, check if we have a consent cookie first
        // For authenticated users, the API will use the auth token
        const consentId = getCookie(COOKIE_NAMES.CONSENT_ID);

        // Always call API - it works for both authenticated users (via auth token)
        // and anonymous users (via cookie_consent_id cookie)
        const response = await fetch(API_CONSENT_ROUTES.COOKIES, {
          credentials: 'include', // Ensure cookies are sent (auth + consent)
        });

        if (response.status === 404) {
          // Consent not found - show banner
          // For anonymous users without a consent cookie, this is expected
          openBanner();
        } else if (response.ok) {
          // API returns consent object directly (not wrapped in { consent: ... })
          const consent = await response.json();
          const isExpired = consent.expiresAt && new Date(consent.expiresAt) < new Date();

          if (!isExpired) {
            applyPreferences({
              necessary: true,
              analytics: consent.analytics,
              marketing: consent.marketing,
            });
            // Don't show banner - consent is valid

            // For anonymous users, ensure cookie is set (in case it was cleared)
            if (consent.anonymousId && !consentId) {
              const maxAge = 365 * 24 * 60 * 60;
              document.cookie = `${COOKIE_NAMES.CONSENT_ID}=${encodeURIComponent(consent.anonymousId)}; path=/; max-age=${maxAge}; SameSite=Lax`;
            }
          } else {
            // Consent expired - show banner
            openBanner();
          }
        } else {
          // Error fetching - show banner
          openBanner();
        }
      } catch {
        // Network error - show banner
        openBanner();
      }
    };

    void checkExistingConsent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveConsent(prefs: CookiePreferences) {
    setIsLoading(true);

    try {
      const response = await fetch(API_CONSENT_ROUTES.COOKIES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analytics: prefs.analytics,
          marketing: prefs.marketing,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Set the consent ID cookie so we can retrieve it on next visit
        // TTL: 12 months (same as consent)
        if (data.anonymousId) {
          const maxAge = 365 * 24 * 60 * 60; // 1 year in seconds
          document.cookie = `${COOKIE_NAMES.CONSENT_ID}=${encodeURIComponent(data.anonymousId)}; path=/; max-age=${maxAge}; SameSite=Lax`;
        }

        localStorage.setItem(STORAGE_KEYS.COOKIE_CONSENT, JSON.stringify({
          ...prefs,
          savedAt: new Date().toISOString(),
        }));

        applyPreferences(prefs);
        closeBanner();
        toast.success('Préférences enregistrées');
      } else {
        toast.error(COOKIE_MESSAGES.SAVE_ERROR);
      }
    } catch {
      toast.error(COOKIE_MESSAGES.NETWORK_ERROR);
    } finally {
      setIsLoading(false);
    }
  }

  function acceptAll() {
    saveConsent({ necessary: true, analytics: true, marketing: true });
  }

  function rejectAll() {
    saveConsent({ necessary: true, analytics: false, marketing: false });
  }

  function saveCustom() {
    saveConsent(preferences);
  }

  if (!isBannerOpen) return null;

  return (
    <>
      {/* Backdrop - no click handler: user must make a choice */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200 pointer-events-none"
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
          {!showSettings ? (
            // Simple view
            <>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Cookie className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Gestion des cookies</CardTitle>
                    <CardDescription>
                      Conformité RGPD & ePrivacy
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Nous utilisons des cookies pour assurer le bon fonctionnement du site.
                  Avec votre consentement, nous utilisons également des cookies analytiques
                  pour améliorer nos services.
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <Shield className="h-5 w-5 mx-auto text-green-600 dark:text-green-400 mb-1" />
                    <p className="text-xs font-medium text-green-700 dark:text-green-300">Nécessaires</p>
                    <p className="text-[10px] text-green-600 dark:text-green-400">Toujours actifs</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <BarChart3 className="h-5 w-5 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Analytics</p>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400">Optionnels</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                    <Megaphone className="h-5 w-5 mx-auto text-orange-600 dark:text-orange-400 mb-1" />
                    <p className="text-xs font-medium text-orange-700 dark:text-orange-300">Marketing</p>
                    <p className="text-[10px] text-orange-600 dark:text-orange-400">Optionnels</p>
                  </div>
                </div>

                <Link
                  href={LEGAL_ROUTES.PRIVACY_POLICY}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  onClick={() => closeBanner()}
                >
                  En savoir plus sur notre politique de confidentialité →
                </Link>
              </CardContent>

              <CardFooter className="flex flex-col gap-2 pt-2">
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={rejectAll}
                    disabled={isLoading}
                  >
                    Refuser tout
                  </Button>
                  <Button
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    onClick={acceptAll}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Enregistrement...' : 'Accepter tout'}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => setShowSettings(true)}
                  disabled={isLoading}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Personnaliser mes choix
                </Button>
              </CardFooter>
            </>
          ) : (
            // Settings view
            <>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Paramètres des cookies</CardTitle>
                      <CardDescription>
                        Personnalisez vos préférences
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(false)}
                    className="text-muted-foreground"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Necessary cookies */}
                <div className="flex items-start justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex gap-3">
                    <Shield className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-green-800 dark:text-green-200">Cookies nécessaires</h4>
                        <span className="text-[10px] bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full font-medium">
                          Toujours actifs
                        </span>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Authentification, sécurité CSRF. Indispensables au fonctionnement.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>

                {/* Analytics cookies */}
                <div className="flex items-start justify-between p-4 bg-muted/50 rounded-lg border">
                  <div className="flex gap-3">
                    <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold mb-1">Cookies analytics</h4>
                      <p className="text-sm text-muted-foreground">
                        Mesure d&apos;audience anonymisée via Plausible (privacy-first, hébergé UE).
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.analytics}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, analytics: checked })}
                    aria-label="Activer les cookies analytics"
                  />
                </div>

                {/* Marketing cookies */}
                <div className="flex items-start justify-between p-4 bg-muted/50 rounded-lg border">
                  <div className="flex gap-3">
                    <Megaphone className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold mb-1">Cookies marketing</h4>
                      <p className="text-sm text-muted-foreground">
                        Publicités personnalisées. Partagés avec des tiers.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.marketing}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, marketing: checked })}
                    aria-label="Activer les cookies marketing"
                  />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-2 pt-2">
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={saveCustom}
                  disabled={isLoading}
                >
                  {isLoading ? 'Enregistrement...' : 'Enregistrer mes choix'}
                </Button>
                <Link
                  href={LEGAL_ROUTES.PRIVACY_POLICY}
                  className="text-xs text-muted-foreground hover:text-primary text-center"
                  onClick={() => closeBanner()}
                >
                  Politique de confidentialité
                </Link>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
