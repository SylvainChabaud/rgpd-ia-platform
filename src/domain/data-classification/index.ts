/**
 * Data Classification Domain Module
 *
 * Exports classification types, validation logic, and enforcement functions
 */

export {
  DataClassification,
  SensitiveDataCategory,
  P3DataStorageForbiddenError,
  P2EncryptionRequiredError,
  createClassifiedData,
  validateClassification,
  enforceClassificationRules,
} from "./DataClassification";

export type {
  ClassifiedData,
  ClassificationValidationResult,
} from "./DataClassification";
