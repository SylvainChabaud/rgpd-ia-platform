/**
 * LLM Latency Benchmark (LOT 3.0 POC)
 *
 * Conformité stricte :
 * - RGPD_TESTING.md : Données fictives uniquement
 * - DATA_CLASSIFICATION.md : P0 uniquement (données publiques/fictives)
 * - LLM_USAGE_POLICY.md : Pas de stockage prompts/outputs
 *
 * Usage :
 * - Dev local : AI_PROVIDER=ollama tsx scripts/bench-llm.ts
 * - Stub : AI_PROVIDER=stub tsx scripts/bench-llm.ts
 *
 * IMPORTANT :
 * - NO REAL DATA : fictitious prompts only
 * - NO STORAGE : results printed to console only
 * - POC only : minimal bench (latency p50/p95/p99)
 */

import { invokeLLM } from "@/ai/gateway/invokeLLM";

/**
 * Fictitious prompts (P0 - public, non-personal data)
 * AUCUNE donnée réelle, personnelle ou sensible
 */
const FICTITIOUS_PROMPTS = [
  "Résume ce texte : Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.",
  "Catégorise ce document : Contrat type ABC pour fourniture de services génériques.",
  "Extrait les champs structurés de : Nom entreprise: ACME Corp, Secteur: Technologie, Pays: France",
  "Reformule : La solution technique proposée permet d'optimiser les performances applicatives.",
  "Détecte le type : Document administratif standard sans données sensibles.",
  "Normalise : Le processus métier suit les étapes suivantes : validation, traitement, archivage.",
  "Suggère des améliorations pour : Interface utilisateur simple avec trois boutons d'action.",
  "Classe cette demande : Demande d'information générale sur les fonctionnalités disponibles.",
  "Identifie les entités dans : La société EXAMPLE SAS basée à Paris propose des services informatiques.",
  "Résume en 3 points : Article technique sur les architectures microservices et leurs avantages.",
];

/**
 * Calculate percentile
 */
function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index];
}

/**
 * Format duration (ms)
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Run benchmark
 */
async function runBench(): Promise<void> {
  console.log("=== LLM Latency Benchmark (LOT 3.0 POC) ===");
  console.log(`Provider: ${process.env.AI_PROVIDER || "stub"}`);
  console.log(`Prompts: ${FICTITIOUS_PROMPTS.length} fictitious prompts`);
  console.log("");

  const latencies: number[] = [];
  const tokenCounts: Array<{ input: number; output: number }> = [];

  for (const [index, prompt] of FICTITIOUS_PROMPTS.entries()) {
    console.log(`[${index + 1}/${FICTITIOUS_PROMPTS.length}] Invoking LLM...`);

    const startTime = performance.now();

    try {
      const result = await invokeLLM({
        purpose: "bench-latency",
        tenantId: "bench-tenant-id",
        policy: "bench-policy",
        text: prompt,
      });

      const endTime = performance.now();
      const latency = endTime - startTime;

      latencies.push(latency);

      if (result.usage) {
        tokenCounts.push({
          input: result.usage.inputTokens,
          output: result.usage.outputTokens,
        });
      }

      console.log(`  ✓ Latency: ${formatDuration(latency)}`);
      console.log(
        `  ✓ Tokens: ${result.usage?.inputTokens || 0} in / ${result.usage?.outputTokens || 0} out`
      );
      console.log("");
    } catch (error) {
      console.error(`  ✗ Error: ${error}`);
      console.log("");
    }
  }

  // Calculate statistics
  if (latencies.length === 0) {
    console.error("No successful invocations. Cannot compute statistics.");
    process.exit(1);
  }

  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const min = Math.min(...latencies);
  const max = Math.max(...latencies);
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  console.log("=== Benchmark Results ===");
  console.log(`Successful invocations: ${latencies.length}/${FICTITIOUS_PROMPTS.length}`);
  console.log("");
  console.log("Latency statistics:");
  console.log(`  Min:  ${formatDuration(min)}`);
  console.log(`  P50:  ${formatDuration(p50)}`);
  console.log(`  Avg:  ${formatDuration(avg)}`);
  console.log(`  P95:  ${formatDuration(p95)}`);
  console.log(`  P99:  ${formatDuration(p99)}`);
  console.log(`  Max:  ${formatDuration(max)}`);
  console.log("");

  if (tokenCounts.length > 0) {
    const totalInputTokens = tokenCounts.reduce((a, b) => a + b.input, 0);
    const totalOutputTokens = tokenCounts.reduce((a, b) => a + b.output, 0);
    const avgInputTokens = totalInputTokens / tokenCounts.length;
    const avgOutputTokens = totalOutputTokens / tokenCounts.length;

    console.log("Token statistics:");
    console.log(`  Total input tokens:  ${totalInputTokens}`);
    console.log(`  Total output tokens: ${totalOutputTokens}`);
    console.log(`  Avg input tokens:    ${Math.round(avgInputTokens)}`);
    console.log(`  Avg output tokens:   ${Math.round(avgOutputTokens)}`);
  }

  console.log("");
  console.log("✓ Benchmark completed");
}

// Run benchmark
runBench().catch((error) => {
  console.error("Benchmark failed:", error);
  process.exit(1);
});
