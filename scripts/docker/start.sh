#!/bin/bash
# ============================================================================
# Start RGPD-IA Platform - Production
# LOT 6.0 - Stack IA Docker RGPD-ready
# ============================================================================
#
# USAGE:
#   ./scripts/docker/start.sh [OPTIONS]
#
# OPTIONS:
#   --build    Force rebuild images
#   --dev      Use docker-compose.dev.yml instead
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
FORCE_BUILD=false
DEV_MODE=false
COMPOSE_FILE="docker-compose.yml"

# Parse arguments
for arg in "$@"; do
    case $arg in
        --build)
            FORCE_BUILD=true
            shift
            ;;
        --dev)
            DEV_MODE=true
            COMPOSE_FILE="docker-compose.dev.yml"
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $arg${NC}"
            echo "Usage: $0 [--build] [--dev]"
            exit 1
            ;;
    esac
done

echo "============================================================================"
echo "RGPD-IA Platform - Starting Docker Stack"
echo "============================================================================"
echo ""
echo -e "${BLUE}Mode: ${NC}$([ "$DEV_MODE" = true ] && echo "Development" || echo "Production")"
echo -e "${BLUE}Compose file: ${NC}$COMPOSE_FILE"
echo ""

cd "$PROJECT_ROOT"

# Pre-flight checks
echo "Running pre-flight checks..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running${NC}"
    echo "  Please start Docker and try again"
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker is running"

# Check if .env exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${RED}✗ .env file not found${NC}"
    echo "  Run: ./scripts/docker/init-secrets.sh"
    exit 1
fi
echo -e "${GREEN}✓${NC} .env file exists"

# Check if secrets exist (production only)
if [ "$DEV_MODE" = false ]; then
    if [ ! -d "$PROJECT_ROOT/secrets" ] || [ ! -f "$PROJECT_ROOT/secrets/db_password.txt" ]; then
        echo -e "${RED}✗ Secrets not initialized${NC}"
        echo "  Run: ./scripts/docker/init-secrets.sh"
        exit 1
    fi
    echo -e "${GREEN}✓${NC} Secrets directory exists"
fi

# Check if compose file exists
if [ ! -f "$PROJECT_ROOT/$COMPOSE_FILE" ]; then
    echo -e "${RED}✗ $COMPOSE_FILE not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} $COMPOSE_FILE exists"

echo ""
echo "============================================================================"

# Stop any running containers
echo "Stopping any running containers..."
docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || true
echo ""

# Build images if requested
if [ "$FORCE_BUILD" = true ]; then
    echo "Building Docker images (this may take a few minutes)..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    echo -e "${GREEN}✓${NC} Images built successfully"
    echo ""
fi

# Start services
echo "Starting services..."
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be healthy
echo ""
echo "Waiting for services to be healthy..."
echo ""

MAX_WAIT=120
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $MAX_WAIT ]; do
    # Check health status
    UNHEALTHY=$(docker-compose -f "$COMPOSE_FILE" ps | grep -E "(starting|unhealthy)" | wc -l || echo "0")

    if [ "$UNHEALTHY" -eq 0 ]; then
        echo -e "${GREEN}✓ All services are healthy${NC}"
        break
    fi

    echo -n "."
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

echo ""

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo -e "${YELLOW}⚠ Some services may still be starting${NC}"
    echo "  Check status: docker-compose ps"
fi

# Display running services
echo ""
echo "============================================================================"
echo "Running Services"
echo "============================================================================"
docker-compose -f "$COMPOSE_FILE" ps
echo ""

# Show logs command
echo -e "${BLUE}View logs:${NC}        docker-compose -f $COMPOSE_FILE logs -f"
echo -e "${BLUE}Stop services:${NC}    ./scripts/docker/stop.sh"
echo -e "${BLUE}Check health:${NC}     ./scripts/docker/health-check.sh"
echo ""

# Production-specific info
if [ "$DEV_MODE" = false ]; then
    echo -e "${GREEN}✓ Production stack started successfully${NC}"
    echo ""
    echo -e "${YELLOW}IMPORTANT:${NC}"
    echo "  - Access via HTTPS only (HTTP redirects to HTTPS)"
    echo "  - Default: https://localhost (self-signed cert warning expected)"
    echo "  - For production: configure real domain in nginx/conf.d/default.conf"
    echo "  - Run Let's Encrypt: certbot --nginx -d yourdomain.com"
else
    echo -e "${GREEN}✓ Development stack started successfully${NC}"
    echo ""
    echo "  - App: http://localhost:3000"
    echo "  - DB: postgresql://localhost:5432/rgpd_platform"
fi

echo ""
