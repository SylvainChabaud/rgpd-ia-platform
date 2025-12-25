#!/bin/bash
# ============================================================================
# Security Check - RGPD-IA Platform
# LOT 6.0 - Stack IA Docker RGPD-ready
# ============================================================================
#
# USAGE:
#   ./scripts/docker/security-check.sh [--dev]
#
# CHECKS:
#   1. Port exposure (only 80/443 for production)
#   2. Network isolation (internal networks)
#   3. Secrets in images (scan for hardcoded secrets)
#   4. Secrets in git (scan repository)
#   5. Container user (non-root)
#
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default options
DEV_MODE=false
COMPOSE_FILE="docker-compose.yml"

# Parse arguments
if [ "${1:-}" = "--dev" ]; then
    DEV_MODE=true
    COMPOSE_FILE="docker-compose.dev.yml"
fi

echo "============================================================================"
echo "RGPD-IA Platform - Security Check"
echo "============================================================================"
echo ""
echo "Mode: $([ "$DEV_MODE" = true ] && echo "Development" || echo "Production")"
echo ""

cd "$PROJECT_ROOT"

PASSED=0
FAILED=0
WARNINGS=0

# ============================================================================
# CHECK 1: Port Exposure
# ============================================================================
echo "============================================================================"
echo "[1/6] Port Exposure Check"
echo "============================================================================"
echo ""

if [ "$DEV_MODE" = false ]; then
    # Production: only 80/443 should be exposed
    EXPOSED_PORTS=$(docker-compose -f "$COMPOSE_FILE" ps 2>/dev/null | grep -oE "0\.0\.0\.0:[0-9]+" | cut -d: -f2 | sort -u || echo "")

    if [ -z "$EXPOSED_PORTS" ]; then
        # No containers running
        echo -e "${YELLOW}⚠ No running containers - cannot check ports${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        UNEXPECTED_PORTS=$(echo "$EXPOSED_PORTS" | grep -vE "^(80|443)$" || true)

        if [ -z "$UNEXPECTED_PORTS" ]; then
            echo -e "${GREEN}✓ PASS: Only 80/443 exposed${NC}"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}✗ FAIL: Unexpected ports exposed:${NC}"
            echo "$UNEXPECTED_PORTS" | sed 's/^/    /'
            FAILED=$((FAILED + 1))
        fi
    fi
else
    # Development: 3000 and optionally 5432 are allowed
    echo -e "${BLUE}ℹ DEV MODE: Port check skipped${NC}"
fi

echo ""

# ============================================================================
# CHECK 2: Network Isolation
# ============================================================================
echo "============================================================================"
echo "[2/6] Network Isolation Check"
echo "============================================================================"
echo ""

if [ "$DEV_MODE" = false ]; then
    # Check that rgpd_backend and rgpd_data are internal
    BACKEND_INTERNAL=$(docker network inspect rgpd-ia-platform_rgpd_backend 2>/dev/null | grep '"Internal"' | grep -c "true" || echo "0")
    DATA_INTERNAL=$(docker network inspect rgpd-ia-platform_rgpd_data 2>/dev/null | grep '"Internal"' | grep -c "true" || echo "0")

    if [ "$BACKEND_INTERNAL" -eq 1 ] && [ "$DATA_INTERNAL" -eq 1 ]; then
        echo -e "${GREEN}✓ PASS: Backend and data networks are internal${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL: Networks not properly isolated${NC}"
        [ "$BACKEND_INTERNAL" -eq 0 ] && echo "    - rgpd_backend is NOT internal"
        [ "$DATA_INTERNAL" -eq 0 ] && echo "    - rgpd_data is NOT internal"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${BLUE}ℹ DEV MODE: Network isolation check skipped${NC}"
fi

echo ""

# ============================================================================
# CHECK 3: Secrets in Images
# ============================================================================
echo "============================================================================"
echo "[3/6] Secrets in Docker Images"
echo "============================================================================"
echo ""

# Check app image for common secret patterns
APP_IMAGE=$(docker-compose -f "$COMPOSE_FILE" images -q app 2>/dev/null || echo "")

if [ -z "$APP_IMAGE" ]; then
    echo -e "${YELLOW}⚠ App image not found - build first${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    # Export image and scan for secrets
    TEMP_TAR="/tmp/rgpd-app-image.tar"
    docker save "$APP_IMAGE" -o "$TEMP_TAR" 2>/dev/null

    SECRET_PATTERNS="(password|secret|token|api_key|private_key).*=.*[a-zA-Z0-9]{16,}"
    FOUND_SECRETS=$(tar -xOf "$TEMP_TAR" --wildcards '*/layer.tar' 2>/dev/null | \
                    tar -xOf - --wildcards '*.env' 2>/dev/null | \
                    grep -iE "$SECRET_PATTERNS" || true)

    rm -f "$TEMP_TAR"

    if [ -z "$FOUND_SECRETS" ]; then
        echo -e "${GREEN}✓ PASS: No hardcoded secrets found in image${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL: Possible secrets found in image:${NC}"
        echo "$FOUND_SECRETS" | head -5 | sed 's/^/    /'
        FAILED=$((FAILED + 1))
    fi
fi

echo ""

# ============================================================================
# CHECK 4: Secrets in Git Repository
# ============================================================================
echo "============================================================================"
echo "[4/6] Secrets in Git Repository"
echo "============================================================================"
echo ""

# Use existing scan-secrets.sh if available
if [ -f "$PROJECT_ROOT/scripts/audit/scan-secrets.sh" ]; then
    if bash "$PROJECT_ROOT/scripts/audit/scan-secrets.sh" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS: No secrets found in git repository${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL: Secrets detected in git repository${NC}"
        echo "    Run: bash scripts/audit/scan-secrets.sh"
        FAILED=$((FAILED + 1))
    fi
else
    # Fallback: basic grep check
    SECRETS_FOUND=$(git grep -iE "(password|secret|token|api_key).*=.*['\"][a-zA-Z0-9]{16,}" -- '*.env' '*.js' '*.ts' '*.yml' 2>/dev/null | grep -v ".env.example" || true)

    if [ -z "$SECRETS_FOUND" ]; then
        echo -e "${GREEN}✓ PASS: No obvious secrets in tracked files${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL: Possible secrets in tracked files${NC}"
        FAILED=$((FAILED + 1))
    fi
fi

echo ""

# ============================================================================
# CHECK 5: .gitignore Configuration
# ============================================================================
echo "============================================================================"
echo "[5/6] .gitignore Configuration"
echo "============================================================================"
echo ""

GITIGNORE_OK=true

# Check that secrets/ is ignored
if ! grep -q "^secrets/" "$PROJECT_ROOT/.gitignore" 2>/dev/null; then
    echo -e "${RED}✗ secrets/ not in .gitignore${NC}"
    GITIGNORE_OK=false
fi

# Check that .env is ignored
if ! grep -q "^\.env$" "$PROJECT_ROOT/.gitignore" 2>/dev/null; then
    echo -e "${RED}✗ .env not in .gitignore${NC}"
    GITIGNORE_OK=false
fi

if $GITIGNORE_OK; then
    echo -e "${GREEN}✓ PASS: .gitignore properly configured${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL: .gitignore incomplete${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""

# ============================================================================
# CHECK 6: Container User (Non-Root)
# ============================================================================
echo "============================================================================"
echo "[6/6] Container User Check"
echo "============================================================================"
echo ""

# Check app container runs as non-root
APP_CONTAINER=$(docker-compose -f "$COMPOSE_FILE" ps -q app 2>/dev/null || echo "")

if [ -z "$APP_CONTAINER" ]; then
    echo -e "${YELLOW}⚠ App container not running${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    APP_USER=$(docker inspect "$APP_CONTAINER" --format='{{.Config.User}}' 2>/dev/null || echo "")

    if [ "$APP_USER" = "nextjs" ] || [ "$APP_USER" = "1001" ]; then
        echo -e "${GREEN}✓ PASS: App runs as non-root user (nextjs:1001)${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL: App runs as root or unknown user${NC}"
        echo "    Current user: $APP_USER"
        FAILED=$((FAILED + 1))
    fi
fi

echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "============================================================================"
echo "Security Check Summary"
echo "============================================================================"
echo ""
echo -e "  ${GREEN}Passed:${NC}   $PASSED"
echo -e "  ${RED}Failed:${NC}   $FAILED"
echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All security checks passed${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Security checks failed${NC}"
    echo ""
    echo "Please fix the issues above before deploying to production."
    exit 1
fi
