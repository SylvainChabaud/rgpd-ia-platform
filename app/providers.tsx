'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { useState } from 'react'

/**
 * Providers wrapper for the entire application
 *
 * Includes:
 * - TanStack Query (data fetching & caching)
 * - next-themes (dark mode support)
 * - Sonner (toast notifications)
 *
 * RGPD Compliance:
 * - No user data stored in providers
 * - QueryClient configured with minimal cache time
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data freshness: 1 minute
            staleTime: 60 * 1000,
            // Retry failed requests once
            retry: 1,
            // Don't refetch on window focus (reduces unnecessary API calls)
            refetchOnWindowFocus: false,
          },
          mutations: {
            // Retry mutations once on failure
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster position="top-right" richColors closeButton />
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
