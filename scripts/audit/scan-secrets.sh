#!/usr/bin/env bash
# RGPD Platform - Secret Scanner (LOT 1.0 gate)
# Detects hardcoded secrets, API keys, tokens, and sensitive patterns

set -euo pipefail

echo "[scan-secrets] Scanning codebase for hardcoded secrets..."

# Patterns to detect
PATTERNS=(
  # API Keys
  'sk-[A-Za-z0-9]{20,}'
  'pk-[A-Za-z0-9]{20,}'
  # JWT tokens
  'eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}'
  # Generic secrets
  '(password|passwd|pwd)\s*[:=]\s*["\x27][^"\x27]{8,}'
  '(api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*["\x27][^"\x27]{8,}'
  '(access[_-]?token|access_key)\s*[:=]\s*["\x27][^"\x27]{20,}'
  # Database URLs with credentials
  'postgres://[^:]+:[^@]{8,}@'
  'mysql://[^:]+:[^@]{8,}@'
  # AWS keys
  'AKIA[0-9A-Z]{16}'
  # Private keys
  '-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----'
)

VIOLATIONS=0

for PATTERN in "${PATTERNS[@]}"; do
  if git grep -E "$PATTERN" -- \
    ':!.git' \
    ':!node_modules' \
    ':!scripts/audit/scan-secrets.sh' \
    ':!*.lock' \
    ':!package-lock.json' \
    ':!yarn.lock' \
    ':!pnpm-lock.yaml' \
    2>/dev/null; then
    echo "❌ VIOLATION: Secret pattern detected: $PATTERN"
    ((VIOLATIONS++))
  fi
done

if [ $VIOLATIONS -gt 0 ]; then
  echo ""
  echo "❌ BLOCKER: $VIOLATIONS secret pattern(s) detected"
  echo "Action required: Remove hardcoded secrets and use environment variables"
  exit 1
fi

echo "✅ OK: No hardcoded secrets detected"
exit 0
