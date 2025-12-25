#!/bin/bash
# ============================================================================
# Initialize Docker Secrets - Production Setup
# LOT 6.0 - Stack IA Docker RGPD-ready
# ============================================================================
#
# USAGE:
#   ./scripts/docker/init-secrets.sh
#
# SECURITY:
#   - Generates cryptographically secure secrets
#   - Stores in secrets/ directory (git-ignored)
#   - Sets restrictive permissions (600)
#
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SECRETS_DIR="$PROJECT_ROOT/secrets"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================================================"
echo "RGPD-IA Platform - Docker Secrets Initialization"
echo "============================================================================"
echo ""

# Check if secrets directory exists
if [ -d "$SECRETS_DIR" ]; then
    echo -e "${YELLOW}WARNING: secrets/ directory already exists${NC}"
    read -p "Do you want to regenerate all secrets? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Aborted. Existing secrets preserved.${NC}"
        exit 0
    fi
    echo -e "${YELLOW}Regenerating all secrets...${NC}"
    rm -rf "$SECRETS_DIR"
fi

# Create secrets directory
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

echo -e "${GREEN}Creating secrets directory: $SECRETS_DIR${NC}"
echo ""

# Generate secrets
echo "Generating cryptographic secrets..."
echo ""

# Database password
echo -n "  [1/4] Generating db_password..."
openssl rand -hex 32 > "$SECRETS_DIR/db_password.txt"
chmod 600 "$SECRETS_DIR/db_password.txt"
echo -e " ${GREEN}✓${NC}"

# Session secret
echo -n "  [2/4] Generating session_secret..."
openssl rand -hex 32 > "$SECRETS_DIR/session_secret.txt"
chmod 600 "$SECRETS_DIR/session_secret.txt"
echo -e " ${GREEN}✓${NC}"

# JWT secret
echo -n "  [3/4] Generating jwt_secret..."
openssl rand -hex 32 > "$SECRETS_DIR/jwt_secret.txt"
chmod 600 "$SECRETS_DIR/jwt_secret.txt"
echo -e " ${GREEN}✓${NC}"

# Bootstrap platform secret
echo -n "  [4/4] Generating bootstrap_platform_secret..."
openssl rand -hex 32 > "$SECRETS_DIR/bootstrap_platform_secret.txt"
chmod 600 "$SECRETS_DIR/bootstrap_platform_secret.txt"
echo -e " ${GREEN}✓${NC}"

echo ""
echo -e "${GREEN}✓ All secrets generated successfully${NC}"
echo ""

# Create .env file if it doesn't exist
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "Creating .env file from .env.example..."
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"

    # Update DB_PASSWORD in .env
    DB_PASSWORD=$(cat "$SECRETS_DIR/db_password.txt")
    sed -i.bak "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" "$PROJECT_ROOT/.env"
    rm "$PROJECT_ROOT/.env.bak" 2>/dev/null || true

    echo -e "${GREEN}✓ .env file created and configured${NC}"
    echo -e "${YELLOW}⚠ Please review and update .env with your configuration${NC}"
else
    echo -e "${YELLOW}⚠ .env file already exists - not overwriting${NC}"
    echo -e "${YELLOW}  Update DB_PASSWORD manually if needed${NC}"
fi

echo ""
echo "============================================================================"
echo "SECURITY CHECKLIST"
echo "============================================================================"
echo ""
echo "  [✓] Secrets generated with openssl (cryptographically secure)"
echo "  [✓] Secrets directory permissions: 700 (owner only)"
echo "  [✓] Secret files permissions: 600 (owner read/write only)"
echo "  [ ] Verify secrets/ is in .gitignore"
echo "  [ ] Verify .env is in .gitignore"
echo "  [ ] Update .env with production values (DB_USER, DOMAIN, etc.)"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "  1. Review .env file: vi .env"
echo "  2. Verify secrets: ls -la secrets/"
echo "  3. Run security check: ./scripts/docker/security-check.sh"
echo "  4. Start stack: ./scripts/docker/start.sh"
echo ""
