/**
 * useAudit Hooks Tests - LOT 11.3
 * Tests for audit-related React Query hooks
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGlobalStats, useAIJobsStats, getAuditExportUrl } from '@/lib/api/hooks/useAudit';
import { ReactNode } from 'react';

// Create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return Wrapper;
}

// Mock fetch globally
global.fetch = jest.fn();

describe('useGlobalStats Hook', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('should fetch global stats successfully', async () => {
    const mockStats = {
      stats: {
        tenants: { active: 10, suspended: 2, total: 12 },
        users: { active: 50, suspended: 5, total: 55 },
        aiJobs: { success: 100, failed: 10, total: 110, month: '2026-01' },
        rgpd: {
          exports: { pending: 2, completed: 10, total: 12 },
          deletions: { pending: 1, completed: 5, total: 6 },
        },
        incidents: { unresolved: 3, resolved: 7, total: 10 },
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    });

    const { result } = renderHook(() => useGlobalStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockStats);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/stats/global'),
      expect.any(Object)
    );
  });

  it('should handle fetch errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useGlobalStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});

describe('useAIJobsStats Hook', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('should fetch AI jobs stats with default 30 days', async () => {
    const mockData = {
      stats: [
        { date: '2026-01-01', success: 10, failed: 2, total: 12 },
        { date: '2026-01-02', success: 15, failed: 1, total: 16 },
      ],
      days: 30,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useAIJobsStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/stats/ai-jobs?days=30'),
      expect.any(Object)
    );
  });
});

describe('getAuditExportUrl Helper', () => {
  it('should generate correct export URL without filters', () => {
    const url = getAuditExportUrl();

    expect(url).toContain('/api/audit/export');
    expect(url).toContain('format=csv');
  });

  it('should include eventType filter', () => {
    const url = getAuditExportUrl({ eventType: 'user.login' });

    expect(url).toContain('eventType=user.login');
  });

  it('should include all filters', () => {
    const url = getAuditExportUrl({
      eventType: 'user.login',
      tenantId: 'tenant-123',
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-01-09T23:59:59Z',
    });

    expect(url).toContain('eventType=user.login');
    expect(url).toContain('tenantId=tenant-123');
    // URLSearchParams encodes colons as %3A
    expect(url).toContain('startDate=2026-01-01T00%3A00%3A00Z');
    expect(url).toContain('endDate=2026-01-09T23%3A59%3A59Z');
  });
});
