import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Content-Security-Policy configuration
 *
 * PRODUCTION: Hardened CSP (OWASP A05:2021)
 * - No 'unsafe-inline' or 'unsafe-eval' (XSS protection)
 * - Strict source restrictions
 *
 * DEVELOPMENT: Relaxed for hot-reload/devtools
 * - 'unsafe-inline' and 'unsafe-eval' required for Next.js HMR
 */
// Plausible Analytics (privacy-first, RGPD-compliant)
// Only loaded when user consents to analytics cookies
const PLAUSIBLE_DOMAIN = 'https://plausible.io';

const cspPolicy = isProduction
  ? [
      "default-src 'self'",
      `script-src 'self' ${PLAUSIBLE_DOMAIN}`, // Allow Plausible script
      "style-src 'self' 'unsafe-inline'", // Inline styles needed for Next.js
      "img-src 'self' data:",           // Restricted to self + data URIs
      "font-src 'self'",
      `connect-src 'self' ${PLAUSIBLE_DOMAIN}`, // Allow Plausible API calls
      "frame-ancestors 'none'",          // Clickjacking protection
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",               // Block plugins (Flash, etc.)
      "upgrade-insecure-requests",       // Force HTTPS
    ].join('; ')
  : [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${PLAUSIBLE_DOMAIN}`, // Required for Next.js dev + Plausible
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",     // More permissive for dev
      "font-src 'self'",
      `connect-src 'self' ws: wss: ${PLAUSIBLE_DOMAIN}`, // WebSocket for HMR + Plausible
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');

const nextConfig: NextConfig = {
  // Production optimization - standalone output for Docker
  output: 'standalone',

  // Security headers (EPIC 2 - hardening)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          // SECURITY: Content-Security-Policy (OWASP A05:2021)
          // Production: Hardened | Development: Relaxed for HMR
          {
            key: 'Content-Security-Policy',
            value: cspPolicy
          }
        ]
      }
    ];
  }
};

export default nextConfig;
