/**
 * Frontend User Home - Placeholder Page
 *
 * This page will be replaced in EPIC 13 (LOT 13.0)
 * with the actual User Dashboard.
 *
 * Routes:
 * - /app → Home User (Dashboard)
 *
 * RGPD: User-scoped, requires MEMBER scope
 */
export default function FrontendHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Interface Utilisateur</h1>
        <p className="text-muted-foreground">
          Bienvenue sur votre espace personnel
        </p>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-lg text-muted-foreground">
          Cette interface sera implémentée dans l&apos;EPIC 13.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Routes prévues: /app/ai-tools, /app/history, /app/consents, /app/my-data, /app/profile
        </p>
      </div>
    </div>
  )
}
