/**
 * CookieConsentBanner Component Tests - LOT 10.3
 *
 * RGPD Compliance:
 * - ePrivacy Directive 2002/58/CE Art. 5.3
 * - Necessary cookies always enabled
 * - Analytics/Marketing require explicit opt-in
 * - TTL 12 months (CNIL standard)
 *
 * Test Pattern:
 * - [COOKIE-XXX] for consent banner tests
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CookieConsentBanner } from '@/components/legal/CookieConsentBanner';

// =============================================================================
// MOCKS
// =============================================================================

// Mock fetch with immediate response
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};
const mockSetItem = jest.fn((key: string, value: string) => {
  mockLocalStorage[key] = value;
});

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
    setItem: mockSetItem,
    removeItem: jest.fn((key: string) => {
      delete mockLocalStorage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
    }),
  },
  writable: true,
});

// Mock document.cookie
let mockCookie = '';
Object.defineProperty(document, 'cookie', {
  get: () => mockCookie,
  set: (value: string) => {
    mockCookie = value;
  },
  configurable: true,
});

// Mock console.error to suppress expected errors
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

// =============================================================================
// HELPERS
// =============================================================================

function setupFetchFor404(): void {
  mockFetch.mockResolvedValue({
    ok: false,
    status: 404,
    json: () => Promise.resolve({}),
  });
}

function setupFetchForValidConsent(): void {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      consent: { necessary: true, analytics: true, marketing: false },
      isExpired: false,
    }),
  });
}

function setupFetchForExpiredConsent(): void {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      consent: { necessary: true, analytics: true, marketing: false },
      isExpired: true,
    }),
  });
}

function _setupFetchForSaveSuccess(): void {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ id: 'consent-123' }),
  });
}

function _setupFetchForSaveFailure(): void {
  mockFetch.mockResolvedValue({
    ok: false,
    status: 500,
    json: () => Promise.resolve({ error: 'Server error' }),
  });
}

async function renderAndWaitForBanner(): Promise<void> {
  // Re-attach fetch mock (in case it was cleared by beforeEach)
  global.fetch = mockFetch;
  setupFetchFor404();
  render(<CookieConsentBanner />);
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /Nous utilisons des cookies/i })).toBeInTheDocument();
  }, { timeout: 3000 });
}

// =============================================================================
// TESTS
// =============================================================================

describe('CookieConsentBanner - Display Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock on global (in case it was cleared)
    global.fetch = mockFetch;
    mockCookie = '';
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
  });

  it('[COOKIE-001] should show banner when no consent exists (404)', async () => {
    setupFetchFor404();
    render(<CookieConsentBanner />);

    // Wait for banner to appear - look for any of the banner elements
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Nous utilisons des cookies/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('[COOKIE-002] should hide banner when valid consent exists', async () => {
    setupFetchForValidConsent();
    render(<CookieConsentBanner />);

    // Wait for fetch and component update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(screen.queryByRole('heading', { name: /Nous utilisons des cookies/i })).not.toBeInTheDocument();
  });

  it('[COOKIE-003] should show banner when consent is expired', async () => {
    global.fetch = mockFetch;
    setupFetchForExpiredConsent();
    render(<CookieConsentBanner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Nous utilisons des cookies/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('[COOKIE-004] should show banner on fetch error', async () => {
    global.fetch = mockFetch;
    mockFetch.mockRejectedValue(new Error('Network error'));
    render(<CookieConsentBanner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Nous utilisons des cookies/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

describe('CookieConsentBanner - User Interactions', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
    mockCookie = '';
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
  });

  it('[COOKIE-010] should have "Accepter tout" button', async () => {
    await renderAndWaitForBanner();
    expect(screen.getByRole('button', { name: /Accepter tout/i })).toBeInTheDocument();
  });

  it('[COOKIE-011] should have "Refuser tout" button', async () => {
    await renderAndWaitForBanner();
    expect(screen.getByRole('button', { name: /Refuser tout/i })).toBeInTheDocument();
  });

  it('[COOKIE-012] should have "Personnaliser" button', async () => {
    await renderAndWaitForBanner();
    expect(screen.getByRole('button', { name: /Personnaliser/i })).toBeInTheDocument();
  });

  it('[COOKIE-013] should call API on "Accepter tout"', async () => {
    await renderAndWaitForBanner();

    // Setup mock for save
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'consent-123' }),
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Accepter tout/i }));
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/consents/cookies',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('[COOKIE-014] should call API on "Refuser tout"', async () => {
    await renderAndWaitForBanner();

    // Setup mock for save
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'consent-123' }),
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Refuser tout/i }));
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/consents/cookies',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('[COOKIE-015] should open settings panel on "Personnaliser" click', async () => {
    await renderAndWaitForBanner();

    fireEvent.click(screen.getByRole('button', { name: /Personnaliser/i }));

    await waitFor(() => {
      expect(screen.getByText(/Paramètres des cookies/i)).toBeInTheDocument();
    });
  });
});

describe('CookieConsentBanner - Settings Panel', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
    mockCookie = '';
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
  });

  it('[COOKIE-020] should display necessary cookies as always active', async () => {
    await renderAndWaitForBanner();
    fireEvent.click(screen.getByRole('button', { name: /Personnaliser/i }));

    await waitFor(() => {
      expect(screen.getByText(/Cookies nécessaires/i)).toBeInTheDocument();
      expect(screen.getByText(/Toujours actifs/i)).toBeInTheDocument();
    });
  });

  it('[COOKIE-021] should have disabled checkbox for necessary cookies', async () => {
    await renderAndWaitForBanner();
    fireEvent.click(screen.getByRole('button', { name: /Personnaliser/i }));

    await waitFor(() => {
      const necessaryCheckbox = screen.getByLabelText(/Cookies nécessaires/i);
      expect(necessaryCheckbox).toBeDisabled();
      expect(necessaryCheckbox).toBeChecked();
    });
  });

  it('[COOKIE-022] should display analytics cookies option', async () => {
    await renderAndWaitForBanner();
    fireEvent.click(screen.getByRole('button', { name: /Personnaliser/i }));

    await waitFor(() => {
      expect(screen.getByText(/Cookies analytics/i)).toBeInTheDocument();
      expect(screen.getByText(/Plausible Analytics/i)).toBeInTheDocument();
    });
  });

  it('[COOKIE-023] should display marketing cookies option', async () => {
    await renderAndWaitForBanner();
    fireEvent.click(screen.getByRole('button', { name: /Personnaliser/i }));

    await waitFor(() => {
      expect(screen.getByText(/Cookies marketing/i)).toBeInTheDocument();
    });
  });

  it('[COOKIE-024] should toggle analytics checkbox', async () => {
    const user = userEvent.setup();
    await renderAndWaitForBanner();

    await user.click(screen.getByRole('button', { name: /Personnaliser/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Activer les cookies analytics/i)).toBeInTheDocument();
    });

    const analyticsCheckbox = screen.getByLabelText(/Activer les cookies analytics/i);
    expect(analyticsCheckbox).not.toBeChecked();

    await user.click(analyticsCheckbox);
    expect(analyticsCheckbox).toBeChecked();
  });

  it('[COOKIE-025] should save custom preferences', async () => {
    const user = userEvent.setup();
    await renderAndWaitForBanner();

    await user.click(screen.getByRole('button', { name: /Personnaliser/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Activer les cookies analytics/i)).toBeInTheDocument();
    });

    // Enable analytics only
    const analyticsCheckbox = screen.getByLabelText(/Activer les cookies analytics/i);
    await user.click(analyticsCheckbox);

    // Mock the save consent API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'consent-456' }),
    });

    await user.click(screen.getByRole('button', { name: /Enregistrer mes choix/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/consents/cookies',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('[COOKIE-026] should close settings panel with X button', async () => {
    const user = userEvent.setup();
    await renderAndWaitForBanner();

    await user.click(screen.getByRole('button', { name: /Personnaliser/i }));

    await waitFor(() => {
      expect(screen.getByText(/Paramètres des cookies/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Fermer/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Paramètres des cookies/i)).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Nous utilisons des cookies/i })).toBeInTheDocument();
    });
  });
});

describe('CookieConsentBanner - RGPD Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
    mockCookie = '';
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
  });

  it('[COOKIE-RGPD-001] should link to privacy policy', async () => {
    await renderAndWaitForBanner();
    const privacyLink = screen.getByRole('link', { name: /En savoir plus/i });
    expect(privacyLink).toHaveAttribute('href', '/politique-confidentialite');
  });

  it('[COOKIE-RGPD-002] should save consent to localStorage as fallback', async () => {
    await renderAndWaitForBanner();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'consent-123' }),
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Accepter tout/i }));
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    // Verify localStorage was updated (using the mocked getItem to check value)
    const savedConsent = localStorage.getItem('cookie_consent');
    expect(savedConsent).not.toBeNull();
    expect(savedConsent).toContain('"analytics":true');
  });

  it('[COOKIE-RGPD-003] should have equal prominence for Accept/Reject buttons', async () => {
    await renderAndWaitForBanner();

    const acceptButton = screen.getByRole('button', { name: /Accepter tout/i });
    const rejectButton = screen.getByRole('button', { name: /Refuser tout/i });

    // Both buttons should be visible
    expect(acceptButton).toBeVisible();
    expect(rejectButton).toBeVisible();
  });

  it('[COOKIE-RGPD-004] should explain purpose of each cookie category', async () => {
    await renderAndWaitForBanner();
    fireEvent.click(screen.getByRole('button', { name: /Personnaliser/i }));

    await waitFor(() => {
      // Necessary cookies explanation
      expect(screen.getByText(/authentification, sécurité CSRF/i)).toBeInTheDocument();

      // Analytics cookies explanation
      expect(screen.getByText(/mesurer l'audience/i)).toBeInTheDocument();

      // Marketing cookies explanation
      expect(screen.getByText(/publicités personnalisées/i)).toBeInTheDocument();
    });
  });
});

describe('CookieConsentBanner - Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
    mockCookie = '';
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
    window.alert = jest.fn();
  });

  it('[COOKIE-ERR-001] should show error on save failure', async () => {
    await renderAndWaitForBanner();

    // Mock failed save
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Accepter tout/i }));
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining('Erreur')
    );
  });

  it('[COOKIE-ERR-002] should show error on network failure', async () => {
    await renderAndWaitForBanner();

    // Mock network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Accepter tout/i }));
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining('réseau')
    );
  });
});
