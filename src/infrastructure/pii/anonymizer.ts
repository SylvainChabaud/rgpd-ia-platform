/**
 * anonymizer.ts — IP address anonymization (RGPD Art. 32)
 *
 * RGPD Compliance:
 * - Art. 32 (Pseudonymization): IP address anonymization
 * - Art. 5.1.e (Retention): Automatic anonymization after retention period
 * - CNIL Recommendation: Last octet zeroing for IPv4, /64 prefix for IPv6
 *
 * IP Anonymization Strategy:
 * - IPv4: Zero last octet (192.168.1.42 → 192.168.1.0)
 * - IPv6: Zero last 64 bits (2001:db8::1 → 2001:db8::)
 *
 * Use case: Daily cron job to anonymize IP addresses in audit logs
 */

/**
 * IPv4 pattern (simple validation)
 */
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/**
 * IPv6 pattern (simplified)
 */
const IPV6_PATTERN = /^([0-9a-fA-F:]+)$/;

/**
 * Anonymizes an IPv4 address by zeroing the last octet
 *
 * @param ip - IPv4 address (e.g., "192.168.1.42")
 * @returns Anonymized IPv4 address (e.g., "192.168.1.0")
 *
 * CNIL Recommendation: Last octet zeroing is sufficient for pseudonymization
 *
 * @example
 * anonymizeIPv4("192.168.1.42") → "192.168.1.0"
 * anonymizeIPv4("10.0.0.1") → "10.0.0.0"
 */
export function anonymizeIPv4(ip: string): string {
  const match = ip.match(IPV4_PATTERN);
  if (!match) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }

  const [, octet1, octet2, octet3, octet4] = match;

  // Validate octets are in range 0-255
  const octets = [octet1, octet2, octet3, octet4];
  for (const octet of octets) {
    const num = parseInt(octet, 10);
    if (num < 0 || num > 255) {
      throw new Error(`Invalid IPv4 address: ${ip}`);
    }
  }

  return `${octet1}.${octet2}.${octet3}.0`;
}

/**
 * Anonymizes an IPv6 address by zeroing the last 64 bits
 *
 * @param ip - IPv6 address (e.g., "2001:db8::1")
 * @returns Anonymized IPv6 address (e.g., "2001:db8::")
 *
 * CNIL Recommendation: Keep only /64 prefix for pseudonymization
 *
 * @example
 * anonymizeIPv6("2001:db8::1") → "2001:db8::"
 * anonymizeIPv6("2001:0db8:0000:0000:0000:0000:0000:0001") → "2001:db8::"
 */
export function anonymizeIPv6(ip: string): string {
  if (!IPV6_PATTERN.test(ip)) {
    throw new Error(`Invalid IPv6 address: ${ip}`);
  }

  // Normalize IPv6 address (expand :: notation)
  const normalized = normalizeIPv6(ip);

  // Split into 8 groups of 16 bits
  const groups = normalized.split(":");

  if (groups.length !== 8) {
    throw new Error(`Invalid IPv6 address: ${ip}`);
  }

  // Keep first 4 groups (64 bits), zero last 4 groups
  // Simplify groups by removing leading zeros
  const simplifiedGroups = groups.slice(0, 4).map((g) => {
    const simplified = g.replace(/^0+/, "");
    return simplified === "" ? "0" : simplified;
  });

  return `${simplifiedGroups.join(":")}::`;
}

/**
 * Normalizes an IPv6 address by expanding :: notation
 *
 * @param ip - IPv6 address
 * @returns Fully expanded IPv6 address
 *
 * @example
 * normalizeIPv6("2001:db8::1") → "2001:0db8:0000:0000:0000:0000:0000:0001"
 */
function normalizeIPv6(ip: string): string {
  // Handle :: notation
  if (ip.includes("::")) {
    const [left, right] = ip.split("::");
    const leftGroups = left ? left.split(":") : [];
    const rightGroups = right ? right.split(":") : [];
    const missingGroups = 8 - leftGroups.length - rightGroups.length;

    const expandedGroups = [
      ...leftGroups.map((g) => g.padStart(4, "0")),
      ...Array(missingGroups).fill("0000"),
      ...rightGroups.map((g) => g.padStart(4, "0")),
    ];

    return expandedGroups.join(":");
  }

  // Already expanded
  return ip
    .split(":")
    .map((g) => g.padStart(4, "0"))
    .join(":");
}

/**
 * Anonymizes an IP address (auto-detects IPv4 or IPv6)
 *
 * @param ip - IP address
 * @returns Anonymized IP address
 *
 * @throws Error if IP address is invalid
 *
 * @example
 * anonymizeIP("192.168.1.42") → "192.168.1.0"
 * anonymizeIP("2001:db8::1") → "2001:db8::"
 */
export function anonymizeIP(ip: string): string {
  if (IPV4_PATTERN.test(ip)) {
    return anonymizeIPv4(ip);
  }

  if (IPV6_PATTERN.test(ip)) {
    return anonymizeIPv6(ip);
  }

  throw new Error(`Invalid IP address: ${ip}`);
}

/**
 * Checks if an IP address is already anonymized
 *
 * @param ip - IP address
 * @returns true if anonymized, false otherwise
 *
 * @example
 * isAnonymized("192.168.1.0") → true
 * isAnonymized("192.168.1.42") → false
 * isAnonymized("2001:db8::") → true
 * isAnonymized("2001:db8::1") → false
 */
export function isAnonymized(ip: string): boolean {
  if (IPV4_PATTERN.test(ip)) {
    return ip.endsWith(".0");
  }

  if (IPV6_PATTERN.test(ip)) {
    const normalized = normalizeIPv6(ip);
    const groups = normalized.split(":");
    // Check if last 4 groups are all zeros
    return groups.slice(4).every((g) => g === "0000");
  }

  return false;
}
