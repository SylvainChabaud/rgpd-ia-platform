/**
 * patterns.ts — Regex patterns for PII detection
 *
 * RGPD Compliance:
 * - Art. 32 (Pseudonymization): Pattern-based PII detection
 * - Art. 25 (Privacy by Design): Comprehensive coverage of PII types
 *
 * Performance:
 * - Compiled patterns (singleton)
 * - Optimized for <15ms detection time
 * - Single-pass regex matching
 */

import type { PiiType } from "@/domain/anonymization";

/**
 * Regex pattern for detecting email addresses (RFC 5322 simplified)
 *
 * Matches: jean.dupont@example.com, user+tag@domain.co.uk
 * Does NOT match: invalid@, @domain.com, user@
 */
export const EMAIL_PATTERN =
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

/**
 * Regex pattern for detecting French phone numbers
 *
 * Formats supported:
 * - +33 6 12 34 56 78
 * - 06 12 34 56 78
 * - 06.12.34.56.78
 * - 06-12-34-56-78
 * - 0612345678
 */
export const PHONE_PATTERN = /(?:\+33\s?[1-9]|0[1-9])(?:[\s.-]?\d{2}){4}\b/g;

/**
 * Regex pattern for detecting capitalized person names
 *
 * Matches: Jean Dupont, Marie-Claire Martin
 * Does NOT match: PARIS, HTTP, single words, verbs like "Contacter"
 *
 * Note: This is a basic heuristic. For higher accuracy, consider NER libraries.
 * Pattern: 2-4 capitalized words (2-20 chars each) separated by space or hyphen
 * Must NOT be preceded by lowercase letter (avoid matching verbs like "Contacter Jean")
 */
export const PERSON_PATTERN =
  /\b[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]{1,19}(?:[-\s][A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]{1,19}){1,3}\b/g;

/**
 * Regex pattern for detecting French addresses
 *
 * Matches: 123 rue de la Paix, 75001 Paris
 * Pattern: number + street type + name, postal code + city
 */
export const ADDRESS_PATTERN =
  /\b\d{1,4}\s+(?:rue|avenue|boulevard|place|allée|impasse|chemin)\s+[A-Za-zÀ-ÿ\s'-]+,?\s*\d{5}\s+[A-Za-zÀ-ÿ\s'-]+\b/gi;

/**
 * Regex pattern for detecting French Social Security Numbers
 *
 * Format: 1 YY MM DD DDD CCC KK
 * - 1 digit: sex (1=male, 2=female)
 * - 2 digits: year of birth
 * - 2 digits: month of birth
 * - 2 digits: department code
 * - 3 digits: commune code
 * - 3 digits: birth order
 * - 2 digits: key
 *
 * Matches: 1 89 05 75 123 456 78, 289057512345678
 */
export const SSN_PATTERN = /\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2,3}\b/g;

/**
 * Regex pattern for detecting IBAN bank account numbers
 *
 * Format: FR76 1234 5678 90AB CDEF GHIJ K12
 * - 2 letters: country code
 * - 2 digits: check digits
 * - Up to 30 alphanumeric characters
 *
 * Matches: FR76 1234 5678 90AB, DE89 3704 0044 0532 0130 00
 */
export const IBAN_PATTERN = /\b[A-Z]{2}\d{2}\s?(?:\d{4}\s?){2,7}[A-Z0-9]{0,4}\b/g;

/**
 * Compiled pattern registry
 *
 * Singleton pattern for performance (patterns compiled once)
 */
export const PII_PATTERNS: Record<PiiType, RegExp> = {
  EMAIL: EMAIL_PATTERN,
  PHONE: PHONE_PATTERN,
  PERSON: PERSON_PATTERN,
  ADDRESS: ADDRESS_PATTERN,
  SSN: SSN_PATTERN,
  IBAN: IBAN_PATTERN,
};

/**
 * Whitelist of common false positives to exclude
 *
 * These patterns are NOT considered PII even if they match
 */
export const PERSON_WHITELIST = new Set([
  "Paris",
  "Lyon",
  "Marseille",
  "HTTP",
  "HTTPS",
  "REST",
  "API",
  "JSON",
  "XML",
  "SQL",
  "RGPD",
  "GDPR",
  "CNIL",
  "Inc",
  "Ltd",
  "LLC",
  "Mr",
  "Mrs",
  "Ms",
  "Dr",
]);

/**
 * Helper function to check if a detected name is whitelisted
 *
 * @param name - Detected name to check
 * @returns true if whitelisted (NOT PII), false if likely PII
 */
export function isWhitelistedName(name: string): boolean {
  return PERSON_WHITELIST.has(name.trim());
}
