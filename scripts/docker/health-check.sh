#!/bin/bash
# ============================================================================
# Health Check - RGPD-IA Platform
# LOT 6.0 - Stack IA Docker RGPD-ready
# ============================================================================
#
# USAGE:
#   ./scripts/docker/health-check.sh [--dev]
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
echo "RGPD-IA Platform - Health Check"
echo "============================================================================"
echo ""

cd "$PROJECT_ROOT"

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker is running"

# Check if stack is running
RUNNING=$(docker-compose -f "$COMPOSE_FILE" ps -q | wc -l)
if [ "$RUNNING" -eq 0 ]; then
    echo -e "${RED}✗ No services running${NC}"
    echo "  Start: ./scripts/docker/start.sh"
    exit 1
fi
echo -e "${GREEN}✓${NC} Services are running"

echo ""
echo "============================================================================"
echo "Service Status"
echo "============================================================================"
echo ""

# Check each service
SERVICES=("db" "app")
if [ "$DEV_MODE" = false ]; then
    SERVICES+=("reverse-proxy" "ollama")
else
    SERVICES+=("ollama")
fi

ALL_HEALTHY=true

for service in "${SERVICES[@]}"; do
    HEALTH=$(docker-compose -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep -oE "\(healthy\)|\(unhealthy\)|\(starting\)" || echo "(unknown)")

    case $HEALTH in
        *healthy*)
            echo -e "  ${GREEN}✓${NC} $service: healthy"
            ;;
        *starting*)
            echo -e "  ${YELLOW}⏳${NC} $service: starting"
            ALL_HEALTHY=false
            ;;
        *unhealthy*)
            echo -e "  ${RED}✗${NC} $service: unhealthy"
            ALL_HEALTHY=false
            ;;
        *)
            echo -e "  ${YELLOW}?${NC} $service: unknown"
            ALL_HEALTHY=false
            ;;
    esac
done

echo ""

# Test endpoints
if [ "$ALL_HEALTHY" = true ]; then
    echo "============================================================================"
    echo "Endpoint Tests"
    echo "============================================================================"
    echo ""

    if [ "$DEV_MODE" = false ]; then
        # Production: test via reverse-proxy
        if curl -sSf -k https://localhost/health > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓${NC} HTTPS health check: OK"
        else
            echo -e "  ${RED}✗${NC} HTTPS health check: FAILED"
            ALL_HEALTHY=false
        fi
    else
        # Development: test direct app
        if curl -sSf http://localhost:3000/api/health > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓${NC} HTTP health check: OK"
        else
            echo -e "  ${RED}✗${NC} HTTP health check: FAILED"
            ALL_HEALTHY=false
        fi
    fi

    echo ""
fi

# Summary
echo "============================================================================"
if [ "$ALL_HEALTHY" = true ]; then
    echo -e "${GREEN}✓ All systems operational${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Some issues detected${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  - View logs: docker-compose -f $COMPOSE_FILE logs -f"
    echo "  - Restart: ./scripts/docker/stop.sh && ./scripts/docker/start.sh"
    exit 1
fi
