/**
 * Shared TypeScript types for API responses
 *
 * RGPD Compliance:
 * - All types contain only P1 (public) metadata
 * - NO email, NO passwords, NO P2/P3 sensitive data
 */

import type { UserScope } from '@/shared/actorScope';

/**
 * Tenant entity (P1 data only)
 */
export interface Tenant {
  id: string
  name: string
  slug: string
  createdAt: string
  deletedAt?: string | null
  suspendedAt?: string | null
  suspensionReason?: string | null
  suspendedBy?: string | null
}

/**
 * User entity (P1 data only)
 *
 * RGPD: NO email (P2 data) - use displayName only
 */
export interface User {
  id: string
  displayName: string
  tenantId: string | null
  scope: UserScope
  role: string
  createdAt: string
  dataSuspended?: boolean
  dataSuspendedAt?: string | null
}

/**
 * Audit Event entity (P1 data only)
 */
export interface AuditEvent {
  id: string
  eventType: string
  actorId: string | null
  tenantId: string | null
  targetId: string | null
  createdAt: string
}

/**
 * Global Platform Statistics (P1 aggregates only)
 * LOT 11.3 - Dashboard
 */
export interface GlobalStats {
  stats: {
    tenants: {
      active: number
      suspended: number
      total: number
    }
    users: {
      active: number
      suspended: number
      total: number
    }
    aiJobs: {
      success: number
      failed: number
      total: number
      month: string
    }
    rgpd: {
      exports: {
        pending: number
        completed: number
        total: number
      }
      deletions: {
        pending: number
        completed: number
        total: number
      }
    }
    incidents: {
      unresolved: number
      resolved: number
      total: number
    }
  }
}

/**
 * Global stats (P1 aggregated data)
 */
export interface GlobalStats {
  totalTenants: number
  totalUsers: number
  activeJobs: number
  totalEvents: number
}

/**
 * Tenant stats (P1 aggregated data)
 */
export interface TenantStats {
  usersCount: number
  aiJobsCount: number
  storageUsed: number
}

// ============================================
// Request/Response Types
// ============================================

/**
 * Login Request
 */
export interface LoginRequest {
  email: string
  password: string
}

/**
 * Login Response
 */
export interface LoginResponse {
  token: string
  user: {
    id: string
    displayName: string
    scope: UserScope
    role: string
    tenantId: string | null
  }
}

/**
 * Create Tenant Input
 */
export interface CreateTenantInput {
  name: string
  slug: string
}

/**
 * Update Tenant Input
 */
export interface UpdateTenantInput {
  name?: string
}

/**
 * Create User Input (Tenant Admin)
 */
export interface CreateUserInput {
  email: string
  displayName: string
  tenantId: string
  role: string
  password: string
}

/**
 * Update User Input
 */
export interface UpdateUserInput {
  displayName?: string
  role?: string
}

/**
 * Pagination params
 */
export interface PaginationParams {
  limit?: number
  offset?: number
}

/**
 * List Tenants Response
 */
export interface ListTenantsResponse {
  tenants: Tenant[]
}

/**
 * List Users Response
 */
export interface ListUsersResponse {
  users: User[]
}

/**
 * List Audit Events Response
 */
export interface ListAuditEventsResponse {
  events: AuditEvent[]
}
