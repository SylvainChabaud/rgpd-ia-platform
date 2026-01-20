'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Settings } from 'lucide-react';
import { COOKIE_MESSAGES } from '@/lib/constants/ui/ui-labels';

/**
 * Component: Cookie Consent Banner
 *
 * RGPD compliance:
 * - ePrivacy Directive 2002/58/CE Art. 5.3
 * - Necessary cookies (JWT, CSRF) always enabled
 * - Analytics/Marketing require explicit opt-in
 * - TTL 12 months (CNIL standard)
 * - Preferences saved in DB + localStorage fallback
 *
 * Labels centralized in @/lib/constants/ui/ui-labels.ts
 *
 * LOT 10.3 - Cookie Consent Banner
 */

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

function applyPreferences(prefs: CookiePreferences) {
  // Block/unblock scripts based on preferences.

  // Analytics (Plausible)
  if (prefs.analytics) {
    loadAnalyticsScript();
  } else {
    blockAnalyticsScript();
  }

  // Marketing
  if (prefs.marketing) {
    loadMarketingScript();
  } else {
    blockMarketingScript();
  }
}

function loadAnalyticsScript() {
  // Load Plausible Analytics only when consent is given.
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
  // TODO: Load marketing scripts if applicable.
  // Marketing scripts will be loaded here when configured
}

function blockMarketingScript() {
  // TODO: Block marketing scripts if applicable.
  // Marketing scripts will be blocked here when configured
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() ?? null;
  }
  return null;
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const checkExistingConsent = useCallback(async () => {
    try {
      // Récupérer cookie_consent_id depuis cookie
      const consentId = getCookie('cookie_consent_id');

      // Appeler API pour vérifier si consentement existe
      const params = new URLSearchParams();
      if (consentId) {
        params.set('anonymousId', consentId);
      }
      // Note: Si user authentifié, ajouter userId depuis contexte auth

      const response = await fetch(`/api/consents/cookies?${params.toString()}`);

      if (response.status === 404) {
        // Pas de consentement, afficher banner
        setVisible(true);
      } else if (response.ok) {
        // Consentement existe, le charger
        const data = await response.json();
        if (data.consent && !data.isExpired) {
          // Consentement valide, appliquer préférences
          applyPreferences(data.consent);
        } else {
          // Consentement expiré, afficher banner
          setVisible(true);
        }
      } else {
        // Erreur, afficher banner par sécurité
        setVisible(true);
      }
    } catch {
      // En cas d'erreur, afficher banner par sécurité
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    void checkExistingConsent();
  }, [checkExistingConsent]);

  async function saveConsent(prefs: CookiePreferences) {
    setIsLoading(true);

    try {
      const response = await fetch('/api/consents/cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analytics: prefs.analytics,
          marketing: prefs.marketing,
          // Note: Si user authentifié, ajouter userId depuis contexte auth
        }),
      });

      if (response.ok) {
        await response.json();

        // Sauvegarder en localStorage comme fallback
        localStorage.setItem('cookie_consent', JSON.stringify({
          ...prefs,
          savedAt: new Date().toISOString(),
        }));

        // Appliquer préférences (charger/bloquer scripts)
        applyPreferences(prefs);

        // Fermer banner
        setVisible(false);
        setShowSettings(false);
      } else {
        alert(COOKIE_MESSAGES.SAVE_ERROR);
      }
    } catch {
      alert(COOKIE_MESSAGES.NETWORK_ERROR);
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

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl p-6 z-50 animate-slide-up">
      <div className="max-w-7xl mx-auto">
        {!showSettings ? (
          // Bannière simplifiée
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-start gap-3">
                <span className="text-3xl">🍪</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Nous utilisons des cookies
                  </h3>
                  <p className="text-sm text-gray-600">
                    Pour améliorer votre expérience, nous utilisons des cookies nécessaires au
                    fonctionnement du site et, si vous l&apos;acceptez, des cookies analytiques pour
                    mesurer l&apos;audience de manière anonyme.
                    {' '}
                    <a href="/politique-confidentialite" className="text-blue-600 hover:underline">
                      En savoir plus
                    </a>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                disabled={isLoading}
              >
                <Settings className="w-4 h-4" />
                Personnaliser
              </button>
              <button
                onClick={rejectAll}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                Refuser tout
              </button>
              <button
                onClick={acceptAll}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                disabled={isLoading}
              >
                {isLoading ? 'Enregistrement...' : 'Accepter tout'}
              </button>
            </div>
          </div>
        ) : (
          // Panneau de personnalisation
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Paramètres des cookies
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Fermer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Cookies nécessaires */}
              <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">Cookies nécessaires</h4>
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                      Toujours actifs
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Requis pour le fonctionnement du site (authentification, sécurité CSRF).
                    Ces cookies ne peuvent pas être désactivés.
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Exemples : JWT session, CSRF token
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="mt-1 w-5 h-5"
                  aria-label="Cookies nécessaires (toujours actifs)"
                />
              </div>

              {/* Cookies analytics */}
              <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Cookies analytics</h4>
                  <p className="text-sm text-gray-600">
                    Nous permettent de mesurer l&apos;audience du site de manière anonyme
                    (Plausible Analytics, privacy-first).
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Aucune donnée personnelle collectée • Conformité RGPD • Hébergement UE
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                  className="mt-1 w-5 h-5 accent-blue-600 cursor-pointer"
                  aria-label="Activer les cookies analytics"
                />
              </div>

              {/* Cookies marketing */}
              <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Cookies marketing</h4>
                  <p className="text-sm text-gray-600">
                    Permettent d&apos;afficher des publicités personnalisées adaptées à vos intérêts.
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Partagés avec des tiers • Suivi publicitaire
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                  className="mt-1 w-5 h-5 accent-blue-600 cursor-pointer"
                  aria-label="Activer les cookies marketing"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={saveCustom}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                disabled={isLoading}
              >
                {isLoading ? 'Enregistrement...' : 'Enregistrer mes choix'}
              </button>
              <a
                href="/politique-confidentialite"
                className="px-6 py-2 text-blue-600 hover:underline"
              >
                Politique de confidentialité
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
