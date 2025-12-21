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

  /**
   * Allows SYSTEM context only for bootstrap-only flows.
   */
  bootstrapMode?: boolean;

  tenantId?: string; // UUID
  actorId?: string; // UUID
  roles: string[];
  requestId: string; // correlation id (P1)
}>;

export const systemContext = (
  options?: Readonly<{ bootstrapMode?: boolean }>
): RequestContext => ({
  scope: "SYSTEM",
  actorScope: "SYSTEM",
  bootstrapMode: options?.bootstrapMode === true,
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
