import { redirect } from 'next/navigation'

/**
 * Tenant Admin Portal - Root Page
 * LOT 12.0 - Dashboard Tenant Admin
 *
 * Redirects to /portal/dashboard
 *
 * Routes:
 * - /portal → redirects to /portal/dashboard
 *
 * RGPD: Tenant-scoped, requires TENANT scope
 */
export default function TenantPortalPage() {
  redirect('/portal/dashboard')
}
