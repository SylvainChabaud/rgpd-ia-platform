/**
 * Unit Tests: CookieBannerContext
 * LOT 13.0 - Authentification & Layout User
 *
 * RGPD Compliance:
 * - Art. 7: Cookie consent state management
 * - ePrivacy Directive: Cookie settings accessibility
 * - SECURITY: Type-safe React Context (no DOM events)
 */

import { render, screen, act } from '@testing-library/react'
import { CookieBannerProvider, useCookieBanner } from '@/lib/contexts/CookieBannerContext'
import { CONTEXT_ERRORS } from '@/shared/frontend/errors'

// Test component to access context
function TestConsumer() {
  const { isBannerOpen, showSettings, openBanner, closeBanner, setShowSettings } = useCookieBanner()

  return (
    <div>
      <span data-testid="is-open">{isBannerOpen ? 'open' : 'closed'}</span>
      <span data-testid="show-settings">{showSettings ? 'settings' : 'banner'}</span>
      <button data-testid="open-banner" onClick={() => openBanner()}>Open</button>
      <button data-testid="open-settings" onClick={() => openBanner(true)}>Open Settings</button>
      <button data-testid="close-banner" onClick={closeBanner}>Close</button>
      <button data-testid="toggle-settings" onClick={() => setShowSettings(true)}>Toggle Settings</button>
    </div>
  )
}

describe('CookieBannerContext - Unit Tests', () => {
  describe('Provider', () => {
    it('should render children', () => {
      render(
        <CookieBannerProvider>
          <div data-testid="child">Child Content</div>
        </CookieBannerProvider>
      )

      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('should provide context to descendants', () => {
      render(
        <CookieBannerProvider>
          <TestConsumer />
        </CookieBannerProvider>
      )

      expect(screen.getByTestId('is-open')).toHaveTextContent('closed')
    })
  })

  describe('Initial State', () => {
    it('should have isBannerOpen as false initially', () => {
      render(
        <CookieBannerProvider>
          <TestConsumer />
        </CookieBannerProvider>
      )

      expect(screen.getByTestId('is-open')).toHaveTextContent('closed')
    })

    it('should have showSettings as false initially', () => {
      render(
        <CookieBannerProvider>
          <TestConsumer />
        </CookieBannerProvider>
      )

      expect(screen.getByTestId('show-settings')).toHaveTextContent('banner')
    })
  })

  describe('openBanner()', () => {
    it('should open banner without settings panel', () => {
      render(
        <CookieBannerProvider>
          <TestConsumer />
        </CookieBannerProvider>
      )

      act(() => {
        screen.getByTestId('open-banner').click()
      })

      expect(screen.getByTestId('is-open')).toHaveTextContent('open')
      expect(screen.getByTestId('show-settings')).toHaveTextContent('banner')
    })

    it('should open banner with settings panel when withSettings=true', () => {
      render(
        <CookieBannerProvider>
          <TestConsumer />
        </CookieBannerProvider>
      )

      act(() => {
        screen.getByTestId('open-settings').click()
      })

      expect(screen.getByTestId('is-open')).toHaveTextContent('open')
      expect(screen.getByTestId('show-settings')).toHaveTextContent('settings')
    })
  })

  describe('closeBanner()', () => {
    it('should close banner and reset showSettings', () => {
      render(
        <CookieBannerProvider>
          <TestConsumer />
        </CookieBannerProvider>
      )

      // Open with settings first
      act(() => {
        screen.getByTestId('open-settings').click()
      })

      expect(screen.getByTestId('is-open')).toHaveTextContent('open')
      expect(screen.getByTestId('show-settings')).toHaveTextContent('settings')

      // Then close
      act(() => {
        screen.getByTestId('close-banner').click()
      })

      expect(screen.getByTestId('is-open')).toHaveTextContent('closed')
      expect(screen.getByTestId('show-settings')).toHaveTextContent('banner')
    })
  })

  describe('setShowSettings()', () => {
    it('should update showSettings state', () => {
      render(
        <CookieBannerProvider>
          <TestConsumer />
        </CookieBannerProvider>
      )

      act(() => {
        screen.getByTestId('toggle-settings').click()
      })

      expect(screen.getByTestId('show-settings')).toHaveTextContent('settings')
    })
  })

  describe('useCookieBanner hook outside provider', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestConsumer />)
      }).toThrow(CONTEXT_ERRORS.COOKIE_BANNER_OUTSIDE_PROVIDER)

      consoleSpy.mockRestore()
    })
  })

  describe('SECURITY: Type-safe Context', () => {
    it('should NOT use DOM CustomEvent for communication', () => {
      // This test verifies that we use React Context instead of DOM events
      // The CookieBannerContext uses useState and callbacks, not dispatchEvent

      render(
        <CookieBannerProvider>
          <TestConsumer />
        </CookieBannerProvider>
      )

      // Create a spy on window.dispatchEvent
      const dispatchSpy = jest.spyOn(window, 'dispatchEvent')

      act(() => {
        screen.getByTestId('open-settings').click()
      })

      // Should NOT have dispatched any DOM events
      expect(dispatchSpy).not.toHaveBeenCalled()

      dispatchSpy.mockRestore()
    })
  })
})
