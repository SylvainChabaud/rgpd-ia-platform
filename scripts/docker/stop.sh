#!/bin/bash
# ============================================================================
# Stop RGPD-IA Platform - Production/Development
# LOT 6.0 - Stack IA Docker RGPD-ready
# ============================================================================
#
# USAGE:
#   ./scripts/docker/stop.sh [OPTIONS]
#
# OPTIONS:
#   --dev      Stop docker-compose.dev.yml stack
#   --clean    Remove volumes (⚠ deletes all data)
#
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default options
DEV_MODE=false
CLEAN_VOLUMES=false
COMPOSE_FILE="docker-compose.yml"

# Parse arguments
for arg in "$@"; do
    case $arg in
        --dev)
            DEV_MODE=true
            COMPOSE_FILE="docker-compose.dev.yml"
            shift
            ;;
        --clean)
            CLEAN_VOLUMES=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $arg${NC}"
            echo "Usage: $0 [--dev] [--clean]"
            exit 1
            ;;
    esac
done

echo "============================================================================"
echo "RGPD-IA Platform - Stopping Docker Stack"
echo "============================================================================"
echo ""
echo "Mode: $([ "$DEV_MODE" = true ] && echo "Development" || echo "Production")"
echo "Compose file: $COMPOSE_FILE"
echo ""

cd "$PROJECT_ROOT"

# Warn about volume deletion
if [ "$CLEAN_VOLUMES" = true ]; then
    echo -e "${RED}⚠ WARNING: --clean flag will DELETE ALL DATA (database, models)${NC}"
    read -p "Are you sure? (yes/NO): " -r
    if [[ ! $REPLY =~ ^yes$ ]]; then
        echo -e "${YELLOW}Aborted${NC}"
        exit 0
    fi
    echo ""
fi

# Stop services
echo "Stopping services..."
if [ "$CLEAN_VOLUMES" = true ]; then
    docker-compose -f "$COMPOSE_FILE" down -v
    echo -e "${YELLOW}✓ Services stopped and volumes removed${NC}"
else
    docker-compose -f "$COMPOSE_FILE" down
    echo -e "${GREEN}✓ Services stopped (volumes preserved)${NC}"
fi

echo ""
echo "============================================================================"

# Check for orphaned containers
ORPHANS=$(docker ps -a --filter "name=rgpd-platform" --format "{{.Names}}" | wc -l)
if [ "$ORPHANS" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found orphaned containers:${NC}"
    docker ps -a --filter "name=rgpd-platform" --format "  - {{.Names}} ({{.Status}})"
    echo ""
    echo "  Clean up: docker rm \$(docker ps -a --filter \"name=rgpd-platform\" -q)"
fi

echo ""
echo -e "${GREEN}Stack stopped successfully${NC}"
echo ""
