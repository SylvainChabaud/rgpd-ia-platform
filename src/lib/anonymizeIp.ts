/**
 * IP Address Anonymization
 *
 * RGPD Art. 32 - Security measures
 *
 * IP addresses are personal data (PII). This function anonymizes them
 * before storage/logging by masking the last octet.
 *
 * Examples:
 * - 192.168.1.42 → 192.168.1.0
 * - 10.0.0.1 → 10.0.0.0
 * - IPv6 → undefined (not stored)
 */

/**
 * Anonymize IPv4 address by masking the last octet
 *
 * @param ip - Raw IP address (may include X-Forwarded-For chain)
 * @returns Anonymized IP or undefined if invalid/IPv6
 */
export function anonymizeIp(ip: string | null): string | undefined {
  if (!ip) return undefined;

  // X-Forwarded-For may contain comma-separated list, take first
  const firstIp = ip.split(',')[0].trim();

  // IPv4 validation and masking
  const ipv4Parts = firstIp.split('.');
  if (ipv4Parts.length === 4) {
    // Validate all parts are valid octets
    const isValid = ipv4Parts.every((part) => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255;
    });

    if (isValid) {
      // Mask last octet
      ipv4Parts[3] = '0';
      return ipv4Parts.join('.');
    }
  }

  // IPv6 or invalid format → do not store
  return undefined;
}
