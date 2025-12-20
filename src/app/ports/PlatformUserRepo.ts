export interface PlatformUserRepo {
  existsSuperAdmin(): Promise<boolean>;
  createSuperAdmin(input: { id: string; emailHash: string; displayName: string; passwordHash: string }): Promise<void>;
}
