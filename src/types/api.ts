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
  actorDisplayName: string | null
  tenantId: string | null
  tenantName: string | null
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
 * Tenant stats (P1 aggregated data)
 * LOT 12.0 - Dashboard Tenant Admin
 */
export interface TenantStats {
  usersCount: number
  aiJobsCount: number
  storageUsed: number
}

/**
 * Tenant Dashboard Stats (P1 aggregated data)
 * LOT 12.0 - Dashboard Tenant Admin
 *
 * RGPD: Aggregates only, no individual records
 */
export interface TenantDashboardStats {
  users: {
    active: number
    suspended: number
    total: number
  }
  aiJobs: {
    success: number
    failed: number
    total: number
    month: string // YYYY-MM format
  }
  consents: {
    granted: number
    revoked: number
    pending: number
  }
  rgpd: {
    exports: {
      pending: number
      completed: number
    }
    deletions: {
      pending: number
      completed: number
    }
  }
  storage: {
    usedBytes: number // Estimated storage in bytes
  }
}

/**
 * Tenant Stats API Response
 * LOT 12.0
 */
export interface TenantStatsResponse {
  stats: TenantDashboardStats
  tenantName: string // P1 data - organization name (not personal data)
}

/**
 * Activity Event for Tenant Dashboard (P1 data + displayName)
 * LOT 12.0 - Dashboard Tenant Admin
 *
 * RGPD: Event types, IDs + displayName (NO email)
 * Consistent with /portal/users which also shows displayName only
 */
export interface ActivityEvent {
  id: string
  type: string
  actorId: string | null
  targetId: string | null
  /** Actor display name - NO email (RGPD compliant) */
  actorDisplayName?: string | null
  /** Target display name - NO email (RGPD compliant) */
  targetDisplayName?: string | null
  createdAt: string
  metadata?: Record<string, string | number | boolean | null>
}

/**
 * Tenant Activity API Response
 * LOT 12.0
 */
export interface TenantActivityResponse {
  events: ActivityEvent[]
  total: number
}

/**
 * Tenant AI Jobs Stats (time series)
 * LOT 12.0 - Dashboard charts
 */
export interface TenantAIJobsStatsResponse {
  stats: Array<{
    date: string
    success: number
    failed: number
    total: number
  }>
  days: number
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
 *
 * RGPD Compliance: Art. 7
 * - CGU acceptance status included for frontend to enforce consent
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
  cgu: {
    accepted: boolean
    versionId: string | null
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

// ============================================
// RGPD Request Types (LOT 12.3)
// ============================================

/**
 * RGPD Request type constants
 */
export type RgpdRequestType = 'EXPORT' | 'DELETE';

/**
 * RGPD Request status constants
 */
export type RgpdRequestStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

/**
 * RGPD Request list item (P1 data + displayName)
 * LOT 12.3 - Tenant Admin RGPD Management
 *
 * RGPD: NO email (P2 data) - displayName only for identification
 * Consistent with /portal/users which also shows displayName only
 */
export interface RgpdRequestListItem {
  id: string;
  userId: string;
  /** User display name (P1 equivalent in admin context) - NO email */
  userDisplayName: string;
  type: RgpdRequestType;
  status: RgpdRequestStatus;
  createdAt: string;
  scheduledPurgeAt?: string | null;
  completedAt?: string | null;
}

/**
 * RGPD Requests List Response
 * LOT 12.3
 */
export interface RgpdRequestsListResponse {
  requests: RgpdRequestListItem[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * RGPD Exports List Response
 * LOT 12.3
 */
export interface RgpdExportsListResponse {
  exports: Omit<RgpdRequestListItem, 'type'>[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * RGPD Deletions List Response
 * LOT 12.3
 */
export interface RgpdDeletionsListResponse {
  deletions: Omit<RgpdRequestListItem, 'type'>[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * RGPD Request filter params
 * LOT 12.3
 */
export interface RgpdRequestParams {
  limit?: number;
  offset?: number;
  status?: RgpdRequestStatus;
}

/**
 * RGPD Stats Response (for KPI widgets)
 * LOT 12.3 - Tenant Admin RGPD Management
 *
 * RGPD: P1 aggregated counts only
 */
export interface RgpdStatsResponse {
  stats: {
    exports: {
      pending: number;
      completed: number;
    };
    deletions: {
      pending: number;
      completed: number;
    };
    suspensions: {
      active: number;
      total: number;
    };
    oppositions: {
      pending: number;
      reviewed: number;
      total: number;
    };
    contests: {
      pending: number;
      resolved: number;
      total: number;
    };
  };
}

/**
 * RGPD Suspension list item (Art. 18)
 * LOT 12.3
 */
export interface RgpdSuspensionListItem {
  id: string;
  userId: string;
  /** User display name - NO email (RGPD compliant) */
  userDisplayName: string;
  reason: string;
  status: string;
  createdAt: string;
  liftedAt?: string | null;
}

/**
 * RGPD Opposition list item (Art. 21)
 * LOT 12.3
 */
export interface RgpdOppositionListItem {
  id: string;
  userId: string;
  /** User display name - NO email (RGPD compliant) */
  userDisplayName: string;
  treatmentType: string;
  reason: string;
  status: string;
  adminResponse?: string | null;
  reviewedBy?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

/**
 * RGPD Contest/Dispute list item (Art. 22)
 * LOT 12.3
 */
export interface RgpdContestListItem {
  id: string;
  userId: string;
  /** User display name - NO email (RGPD compliant) */
  userDisplayName: string;
  aiJobId: string;
  reason: string;
  status: string;
  adminResponse?: string | null;
  reviewedBy?: string | null;
  hasAttachment: boolean;
  createdAt: string;
  reviewedAt?: string | null;
  resolvedAt?: string | null;
}
