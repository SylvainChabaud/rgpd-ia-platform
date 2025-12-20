export type ActorScope = "SYSTEM" | "PLATFORM" | "TENANT";

export type RequestContext = Readonly<{
  /**
   * Propriété canonique (nouveau nom)
   */
  scope: ActorScope;

  /**
   * Alias de compatibilité (ancien nom attendu par certains use-cases)
   * Ne pas supprimer : évite des patches dispersés.
   */
  actorScope: ActorScope;

  tenantId?: string; // UUID
  actorId?: string; // UUID
  roles: string[];
  requestId: string; // correlation id (P1)
}>;

export const systemContext = (): RequestContext => ({
  scope: "SYSTEM",
  actorScope: "SYSTEM",
  roles: ["SYSTEM"],
  requestId: "system",
});

export const platformContext = (actorId: string): RequestContext => ({
  scope: "PLATFORM",
  actorScope: "PLATFORM",
  actorId,
  roles: ["SUPERADMIN"], // ou ["PLATFORM_ADMIN"] selon ta convention
  requestId: "cli",
});
