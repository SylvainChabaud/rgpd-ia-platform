'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { useState } from 'react'
import { CookieBannerProvider } from '@/lib/contexts/CookieBannerContext'
import { CookieConsentBanner } from '@/components/legal/CookieConsentBanner'

/**
 * Providers wrapper for the entire application
 *
 * Includes:
 * - TanStack Query (data fetching & caching)
 * - next-themes (dark mode support)
 * - Sonner (toast notifications)
 * - CookieBannerProvider (cookie consent management)
 *
 * RGPD Compliance:
 * - No user data stored in providers
 * - QueryClient configured with minimal cache time
 * - Cookie consent managed via CookieBannerContext (Art. 7 RGPD, ePrivacy 5.3)
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
        <CookieBannerProvider>
          {children}
          <CookieConsentBanner />
        </CookieBannerProvider>
        <Toaster position="top-right" richColors closeButton />
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
