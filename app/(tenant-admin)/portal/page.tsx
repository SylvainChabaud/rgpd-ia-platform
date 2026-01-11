/**
 * Tenant Admin Portal - Placeholder Page
 *
 * This page will be replaced in EPIC 12 (LOT 12.0)
 * with the actual Tenant Dashboard.
 *
 * Routes:
 * - /portal → Dashboard Tenant Admin
 *
 * RGPD: Tenant-scoped, requires TENANT scope
 */
export default function TenantPortalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Portail Tenant Admin</h1>
        <p className="text-muted-foreground">
          Interface d&apos;administration pour les tenants
        </p>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-lg text-muted-foreground">
          Cette interface sera implémentée dans l&apos;EPIC 12.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Routes prévues: /portal/dashboard, /portal/users, /portal/consents, /portal/rgpd
        </p>
      </div>
    </div>
  )
}
