/**
 * Gateway LLM configuration
 *
 * Conformité :
 * - BOUNDARIES.md : Gateway unique obligatoire
 * - LLM_USAGE_POLICY.md : Local first
 * - LOT 3.0 : Provider local POC
 */

/**
 * AI Provider constants
 */
export const AI_PROVIDER_TYPE = {
  STUB: "stub",
  OLLAMA: "ollama",
} as const;

export type ProviderType = (typeof AI_PROVIDER_TYPE)[keyof typeof AI_PROVIDER_TYPE];

/**
 * Active provider
 * Default: stub (safe fallback)
 * POC: ollama (local inference)
 */
export const AI_PROVIDER: ProviderType =
  (process.env.AI_PROVIDER as ProviderType) || AI_PROVIDER_TYPE.STUB;

/**
 * Ollama configuration (LOT 3.0 POC)
 * Local only, no external egress
 */
export const OLLAMA_CONFIG = {
  url: process.env.OLLAMA_URL || "http://localhost:11434",
  model: process.env.OLLAMA_MODEL || "tinyllama",
  timeout: Number.parseInt(process.env.OLLAMA_TIMEOUT || "30000", 10),
} as const;

/**
 * Validate configuration on load
 */
const validProviders = Object.values(AI_PROVIDER_TYPE);
if (!validProviders.includes(AI_PROVIDER)) {
  throw new Error(`Invalid AI_PROVIDER: ${AI_PROVIDER}. Must be one of: ${validProviders.join(", ")}.`);
}
