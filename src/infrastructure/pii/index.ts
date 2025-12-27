/**
 * Infrastructure PII module exports
 *
 * Provides PII detection, masking, and restoration capabilities
 * Following BOUNDARIES.md architecture constraints
 */

// Patterns
export { PII_PATTERNS, PERSON_WHITELIST, isWhitelistedName } from "./patterns";

// Detection
export { detectPII, detectPIIByType, containsPII } from "./detector";

// Masking and restoration
export {
  maskPII,
  restorePII,
  validateMaskedText,
  getPIISummary,
} from "./masker";

// IP Anonymization (LOT 8.1)
export {
  anonymizeIPv4,
  anonymizeIPv6,
  anonymizeIP,
  isAnonymized,
} from "./anonymizer";

// PII Log Scanner (LOT 8.2)
export {
  scanLogLine,
  scanLogLines,
  parseLogFile,
  type LogLine,
  type PiiLeakResult,
  type PiiScanResult,
} from "./scanner";
