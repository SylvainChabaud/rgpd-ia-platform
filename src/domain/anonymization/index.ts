/**
 * Domain layer exports for PII anonymization
 *
 * Pure domain layer with NO infrastructure dependencies
 * Following BOUNDARIES.md architecture constraints
 */

export type { PiiType, PiiEntity, PiiDetectionResult } from "./PiiEntity";
export { createPiiDetectionResult } from "./PiiEntity";

export type {
  PiiMapping,
  PiiMaskingResult,
  PiiRedactionContext,
} from "./PiiMapping";
export { createPiiMaskingResult, createPiiRedactionContext } from "./PiiMapping";
