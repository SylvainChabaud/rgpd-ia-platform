'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Cookie } from 'lucide-react'
import { LEGAL_ROUTES } from '@/lib/constants/routes'
import { USER_FOOTER_LABELS } from '@/lib/constants/ui/ui-labels'
import { useCookieBanner } from '@/lib/contexts/CookieBannerContext'

/**
 * User Footer Component
 * LOT 13.0 - Authentification & Layout User
 *
 * RGPD Compliance:
 * - Art. 13/14: Privacy policy link required
 * - Art. 7: Cookie preference link required
 * - ePrivacy Directive: Manage cookies option
 *
 * Features:
 * - Legal page links (Privacy Policy, Terms, RGPD Info)
 * - "Manage cookies" button (dispatches event to reopen banner)
 * - Copyright notice
 */
export function UserFooter() {
  const { openBanner } = useCookieBanner();

  /**
   * Open the Cookie Consent Banner settings panel
   * Uses React Context (type-safe) instead of DOM CustomEvent
   */
  const handleManageCookies = () => {
    openBanner(true); // true = show settings panel directly
  }

  return (
    <footer className="border-t bg-muted/40">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Legal Links */}
          <nav className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <Link
              href={LEGAL_ROUTES.PRIVACY_POLICY}
              className="hover:text-foreground hover:underline transition-colors"
            >
              {USER_FOOTER_LABELS.PRIVACY}
            </Link>
            <span className="hidden sm:inline text-muted-foreground/50">|</span>
            <Link
              href={LEGAL_ROUTES.TERMS_OF_SERVICE}
              className="hover:text-foreground hover:underline transition-colors"
            >
              {USER_FOOTER_LABELS.TERMS}
            </Link>
            <span className="hidden sm:inline text-muted-foreground/50">|</span>
            <Link
              href={LEGAL_ROUTES.RGPD_INFO}
              className="hover:text-foreground hover:underline transition-colors"
            >
              {USER_FOOTER_LABELS.RGPD_INFO}
            </Link>
            <span className="hidden sm:inline text-muted-foreground/50">|</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-muted-foreground hover:text-foreground"
              onClick={handleManageCookies}
            >
              <Cookie className="mr-1 h-3 w-3" />
              {USER_FOOTER_LABELS.MANAGE_COOKIES}
            </Button>
          </nav>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            {USER_FOOTER_LABELS.COPYRIGHT}
          </p>
        </div>
      </div>
    </footer>
  )
}
