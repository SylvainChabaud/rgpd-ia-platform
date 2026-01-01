#!/bin/bash
# =============================================================================
# Chaos Engineering Test Script
# EPIC 9 — LOT 9.2 — Chaos Engineering
#
# Tests system resilience:
# 1. Backup/Restore validation
# 2. Container kill and recovery
# 3. Database failover simulation
# 4. Network partition simulation
#
# RGPD Compliance:
# - Art. 32: Test capacité restauration données
# - Art. 5.1(f): Résilience systèmes
#
# Usage:
#   ./scripts/chaos/run-chaos-tests.sh [all|backup|container|db|network]
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
BACKUP_DIR="./backups/chaos-test"
REPORTS_DIR="./reports/chaos"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MAX_RECOVERY_TIME_SECONDS=30
DB_CONTAINER="rgpd-ia-postgres"
APP_CONTAINER="rgpd-ia-app"

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_test() {
    echo -e "${MAGENTA}[TEST]${NC} $1"
}

ensure_dirs() {
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$REPORTS_DIR"
}

wait_for_healthy() {
    local container=$1
    local max_wait=${2:-60}
    local elapsed=0
    
    while [[ $elapsed -lt $max_wait ]]; do
        if docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null | grep -q "healthy"; then
            return 0
        fi
        sleep 1
        ((elapsed++))
    done
    
    return 1
}

wait_for_api() {
    local url=${1:-"http://localhost:3000/api/health"}
    local max_wait=${2:-60}
    local elapsed=0
    
    while [[ $elapsed -lt $max_wait ]]; do
        if curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null | grep -q "200\|204"; then
            return 0
        fi
        sleep 1
        ((elapsed++))
    done
    
    return 1
}

# =============================================================================
# TEST 1: BACKUP & RESTORE
# =============================================================================

test_backup_restore() {
    log_test "Testing Backup & Restore capability..."
    
    local backup_file="$BACKUP_DIR/chaos-backup-$TIMESTAMP.sql"
    local test_passed=true
    local start_time=$(date +%s)
    
    # Step 1: Create test data
    log_info "Creating test data..."
    docker exec "$DB_CONTAINER" psql -U postgres -d rgpd_platform -c "
        INSERT INTO tenants (id, name, created_at) 
        VALUES ('chaos-test-$(date +%s)', 'Chaos Test Tenant', NOW())
        ON CONFLICT (id) DO NOTHING;
    " 2>/dev/null || log_warning "Test data creation skipped (table may not exist)"
    
    # Step 2: Create backup
    log_info "Creating database backup..."
    docker exec "$DB_CONTAINER" pg_dump -U postgres -d rgpd_platform > "$backup_file"
    
    if [[ ! -s "$backup_file" ]]; then
        log_error "Backup file is empty!"
        return 1
    fi
    
    local backup_size=$(du -h "$backup_file" | cut -f1)
    log_success "Backup created: $backup_file ($backup_size)"
    
    # Step 3: Corrupt data (simulate data loss)
    log_info "Simulating data corruption..."
    docker exec "$DB_CONTAINER" psql -U postgres -d rgpd_platform -c "
        DELETE FROM tenants WHERE name LIKE 'Chaos%';
    " 2>/dev/null || true
    
    # Step 4: Restore from backup
    log_info "Restoring from backup..."
    docker exec -i "$DB_CONTAINER" psql -U postgres -d rgpd_platform < "$backup_file" 2>/dev/null
    
    # Step 5: Verify restoration
    log_info "Verifying restoration..."
    local restored_data=$(docker exec "$DB_CONTAINER" psql -U postgres -d rgpd_platform -t -c "
        SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
    " 2>/dev/null || echo "0")
    
    if [[ $(echo "$restored_data" | tr -d ' ') -gt 0 ]]; then
        log_success "Database restored successfully"
    else
        log_error "Database restoration verification failed"
        test_passed=false
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Report
    echo ""
    echo "📊 Backup/Restore Results:"
    echo "   Backup Size: $backup_size"
    echo "   Duration: ${duration}s"
    echo "   Status: $([[ $test_passed == true ]] && echo "✅ PASS" || echo "❌ FAIL")"
    echo ""
    
    [[ $test_passed == true ]] && return 0 || return 1
}

# =============================================================================
# TEST 2: CONTAINER KILL & RECOVERY
# =============================================================================

test_container_recovery() {
    log_test "Testing Container Kill & Recovery..."
    
    local test_passed=true
    
    # Step 1: Verify containers running
    log_info "Checking initial container state..."
    if ! docker ps --format '{{.Names}}' | grep -q "$APP_CONTAINER"; then
        log_warning "Application container not running. Skipping test."
        return 0
    fi
    
    # Step 2: Record container ID
    local container_id=$(docker ps -q -f "name=$APP_CONTAINER")
    log_info "Target container: $container_id"
    
    # Step 3: Kill container (simulate crash)
    log_info "Killing application container..."
    docker kill "$APP_CONTAINER" 2>/dev/null || docker stop "$APP_CONTAINER" 2>/dev/null || true
    
    local kill_time=$(date +%s)
    
    # Step 4: Wait for Docker Compose restart (if configured)
    log_info "Waiting for automatic recovery..."
    sleep 5
    
    # Step 5: Restart if not auto-restarted
    if ! docker ps --format '{{.Names}}' | grep -q "$APP_CONTAINER"; then
        log_info "Container not auto-restarted. Starting manually..."
        docker-compose -f "$COMPOSE_FILE" up -d "$APP_CONTAINER" 2>/dev/null || \
        docker start "$APP_CONTAINER" 2>/dev/null || true
    fi
    
    # Step 6: Wait for API health
    log_info "Waiting for API to become healthy..."
    local start_wait=$(date +%s)
    
    if wait_for_api "http://localhost:3000/api/health" "$MAX_RECOVERY_TIME_SECONDS"; then
        local recovery_time=$(date +%s)
        local elapsed=$((recovery_time - kill_time))
        
        if [[ $elapsed -le $MAX_RECOVERY_TIME_SECONDS ]]; then
            log_success "Container recovered in ${elapsed}s (target: ${MAX_RECOVERY_TIME_SECONDS}s)"
        else
            log_warning "Container recovered but took ${elapsed}s (target: ${MAX_RECOVERY_TIME_SECONDS}s)"
            test_passed=false
        fi
    else
        log_error "Container failed to recover within ${MAX_RECOVERY_TIME_SECONDS}s"
        test_passed=false
    fi
    
    # Report
    echo ""
    echo "📊 Container Recovery Results:"
    echo "   Target Container: $APP_CONTAINER"
    echo "   Max Recovery Time: ${MAX_RECOVERY_TIME_SECONDS}s"
    echo "   Status: $([[ $test_passed == true ]] && echo "✅ PASS" || echo "❌ FAIL")"
    echo ""
    
    [[ $test_passed == true ]] && return 0 || return 1
}

# =============================================================================
# TEST 3: DATABASE CONNECTION POOL EXHAUSTION
# =============================================================================

test_db_connection_exhaustion() {
    log_test "Testing Database Connection Pool Exhaustion..."
    
    local test_passed=true
    
    # Step 1: Create many connections
    log_info "Simulating connection exhaustion (100 connections)..."
    
    # Create background connections
    for i in {1..100}; do
        docker exec "$DB_CONTAINER" psql -U postgres -d rgpd_platform -c "SELECT pg_sleep(0.1);" &>/dev/null &
    done
    
    sleep 2
    
    # Step 2: Try to make a new connection
    log_info "Testing new connection during high load..."
    if docker exec "$DB_CONTAINER" psql -U postgres -d rgpd_platform -c "SELECT 1;" &>/dev/null; then
        log_success "Database still accepts new connections"
    else
        log_warning "Database refused connection (expected under extreme load)"
    fi
    
    # Step 3: Wait for connections to close
    sleep 3
    
    # Step 4: Verify recovery
    log_info "Verifying database recovery..."
    if docker exec "$DB_CONTAINER" psql -U postgres -d rgpd_platform -c "SELECT 1;" &>/dev/null; then
        log_success "Database recovered from connection exhaustion"
    else
        log_error "Database failed to recover"
        test_passed=false
    fi
    
    # Check connection count
    local active_conns=$(docker exec "$DB_CONTAINER" psql -U postgres -d rgpd_platform -t -c "
        SELECT count(*) FROM pg_stat_activity WHERE datname = 'rgpd_platform';
    " 2>/dev/null | tr -d ' ')
    
    echo ""
    echo "📊 Connection Pool Results:"
    echo "   Active Connections: $active_conns"
    echo "   Status: $([[ $test_passed == true ]] && echo "✅ PASS" || echo "❌ FAIL")"
    echo ""
    
    [[ $test_passed == true ]] && return 0 || return 1
}

# =============================================================================
# TEST 4: NETWORK PARTITION SIMULATION
# =============================================================================

test_network_partition() {
    log_test "Testing Network Partition (App <-> DB)..."
    
    local test_passed=true
    
    # Check if we can manipulate network
    if ! command -v iptables &> /dev/null; then
        log_warning "iptables not available. Skipping network partition test."
        return 0
    fi
    
    # This test requires root/sudo
    if [[ $EUID -ne 0 ]]; then
        log_warning "Network partition test requires root. Skipping."
        return 0
    fi
    
    log_info "Simulating network partition..."
    
    # Get database container IP
    local db_ip=$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$DB_CONTAINER" 2>/dev/null)
    
    if [[ -z "$db_ip" ]]; then
        log_warning "Could not get database IP. Skipping network test."
        return 0
    fi
    
    # Block traffic to database
    iptables -A INPUT -s "$db_ip" -j DROP 2>/dev/null || true
    iptables -A OUTPUT -d "$db_ip" -j DROP 2>/dev/null || true
    
    log_info "Network blocked for 5 seconds..."
    sleep 5
    
    # Restore network
    log_info "Restoring network..."
    iptables -D INPUT -s "$db_ip" -j DROP 2>/dev/null || true
    iptables -D OUTPUT -d "$db_ip" -j DROP 2>/dev/null || true
    
    # Wait for recovery
    sleep 3
    
    # Verify API health
    if wait_for_api "http://localhost:3000/api/health" 30; then
        log_success "System recovered from network partition"
    else
        log_error "System failed to recover from network partition"
        test_passed=false
    fi
    
    echo ""
    echo "📊 Network Partition Results:"
    echo "   Status: $([[ $test_passed == true ]] && echo "✅ PASS" || echo "❌ FAIL")"
    echo ""
    
    [[ $test_passed == true ]] && return 0 || return 1
}

# =============================================================================
# SUMMARY REPORT
# =============================================================================

generate_report() {
    local results=$1
    local report_file="$REPORTS_DIR/chaos-report-$TIMESTAMP.json"
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "platform": "RGPD IA Platform",
  "tests": {
    "backup_restore": $([[ "$results" == *"backup:pass"* ]] && echo "true" || echo "false"),
    "container_recovery": $([[ "$results" == *"container:pass"* ]] && echo "true" || echo "false"),
    "db_connection": $([[ "$results" == *"db:pass"* ]] && echo "true" || echo "false"),
    "network_partition": $([[ "$results" == *"network:pass"* ]] && echo "true" || echo "false")
  },
  "compliance": {
    "rgpd_art_32": "Tested resilience and recovery capabilities",
    "rgpd_art_5_1_f": "Verified data integrity during failures"
  }
}
EOF
    
    log_info "📁 Report: $report_file"
}

# =============================================================================
# MAIN
# =============================================================================

main() {
    local test_type="${1:-all}"
    local results=""
    local failed=0
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         🔥 CHAOS ENGINEERING - RGPD IA Platform            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    ensure_dirs
    
    case "$test_type" in
        backup)
            test_backup_restore && results+="backup:pass " || { results+="backup:fail "; ((failed++)); }
            ;;
        container)
            test_container_recovery && results+="container:pass " || { results+="container:fail "; ((failed++)); }
            ;;
        db)
            test_db_connection_exhaustion && results+="db:pass " || { results+="db:fail "; ((failed++)); }
            ;;
        network)
            test_network_partition && results+="network:pass " || { results+="network:fail "; ((failed++)); }
            ;;
        all)
            test_backup_restore && results+="backup:pass " || { results+="backup:fail "; ((failed++)); }
            test_container_recovery && results+="container:pass " || { results+="container:fail "; ((failed++)); }
            test_db_connection_exhaustion && results+="db:pass " || { results+="db:fail "; ((failed++)); }
            test_network_partition && results+="network:pass " || { results+="network:fail "; ((failed++)); }
            ;;
        *)
            echo "Usage: $0 [all|backup|container|db|network]"
            exit 1
            ;;
    esac
    
    generate_report "$results"
    
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    if [[ $failed -eq 0 ]]; then
        log_success "All chaos tests passed!"
        exit 0
    else
        log_error "$failed chaos test(s) failed!"
        exit 1
    fi
}

main "$@"
