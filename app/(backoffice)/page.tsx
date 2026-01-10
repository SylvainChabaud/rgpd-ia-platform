/**
 * Backoffice Root Page - Redirects to enhanced dashboard
 * LOT 11.3 - Dashboard with charts and monitoring
 */

import { redirect } from 'next/navigation'

export default function BackofficeRootPage() {
  // Redirect to enhanced dashboard
  redirect('/dashboard')
}
