/**
 * Legal Pages Layout
 * Shared layout for all legal pages (CGU, Politique de confidentialité, etc.)
 *
 * RGPD Compliance:
 * - Art. 13-14: Information des personnes concernées
 * - Pages publicly accessible (no authentication required)
 * - Consistent header for navigation
 *
 * LOT 13.0 - Layout consistency
 */

import { LegalHeader } from './_components/LegalHeader'

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <LegalHeader />
      {children}
    </>
  )
}
