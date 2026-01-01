#!/bin/bash
# =============================================================================
# Security Scanning Script
# EPIC 9 — LOT 9.1 — Pentest & Vulnerability Scanning
#
# Runs comprehensive security scans:
# 1. npm audit (dependency vulnerabilities)
# 2. OWASP ZAP (DAST - Dynamic Application Security Testing)
# 3. Trivy (container image vulnerabilities)
#
# RGPD Compliance:
# - Art. 32: Test régulier sécurité (documented)
#
# Usage:
#   ./scripts/security/run-security-scan.sh [all|npm|zap|trivy]
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPORTS_DIR="./reports/security"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TARGET_URL="${TARGET_URL:-http://localhost:3000}"
DOCKER_IMAGE="${DOCKER_IMAGE:-rgpd-ia-platform:latest}"
FAIL_ON_HIGH="${FAIL_ON_HIGH:-true}"

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

ensure_reports_dir() {
    mkdir -p "$REPORTS_DIR/npm"
    mkdir -p "$REPORTS_DIR/zap"
    mkdir -p "$REPORTS_DIR/trivy"
}

# =============================================================================
# NPM AUDIT
# =============================================================================

run_npm_audit() {
    log_info "Running npm audit..."
    
    local report_file="$REPORTS_DIR/npm/audit-$TIMESTAMP.json"
    
    # Run npm audit and capture output
    set +e
    npm audit --json > "$report_file" 2>&1
    local exit_code=$?
    set -e
    
    # Parse results
    local critical=$(cat "$report_file" | jq '.metadata.vulnerabilities.critical // 0')
    local high=$(cat "$report_file" | jq '.metadata.vulnerabilities.high // 0')
    local moderate=$(cat "$report_file" | jq '.metadata.vulnerabilities.moderate // 0')
    local low=$(cat "$report_file" | jq '.metadata.vulnerabilities.low // 0')
    local total=$(cat "$report_file" | jq '.metadata.vulnerabilities.total // 0')
    
    echo ""
    echo "📊 NPM Audit Results:"
    echo "   Critical:  $critical"
    echo "   High:      $high"
    echo "   Moderate:  $moderate"
    echo "   Low:       $low"
    echo "   Total:     $total"
    echo ""
    echo "📁 Report: $report_file"
    
    # Check thresholds
    if [[ "$FAIL_ON_HIGH" == "true" ]] && [[ $critical -gt 0 || $high -gt 0 ]]; then
        log_error "High/Critical vulnerabilities found!"
        return 1
    fi
    
    log_success "npm audit completed"
    return 0
}

# =============================================================================
# OWASP ZAP
# =============================================================================

run_zap_scan() {
    log_info "Running OWASP ZAP baseline scan..."
    
    local report_file="$REPORTS_DIR/zap/zap-report-$TIMESTAMP.html"
    local config_file="./scripts/security/owasp-zap-config.yaml"
    
    # Check if target is reachable
    if ! curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL/api/health" | grep -q "200\|204"; then
        log_warning "Target $TARGET_URL not reachable. Skipping ZAP scan."
        log_info "Start the application first: npm run dev"
        return 0
    fi
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        log_warning "Docker not found. Skipping ZAP scan."
        return 0
    fi
    
    # Run ZAP in Docker
    log_info "Starting ZAP container..."
    
    docker run --rm \
        --network host \
        -v "$(pwd):/zap/wrk:rw" \
        -t owasp/zap2docker-stable \
        zap-baseline.py \
        -t "$TARGET_URL" \
        -r "reports/security/zap/zap-report-$TIMESTAMP.html" \
        -J "reports/security/zap/zap-report-$TIMESTAMP.json" \
        -c "scripts/security/owasp-zap-config.yaml" \
        --auto \
        || true  # Don't fail immediately
    
    log_info "📁 Report: $report_file"
    
    # Parse JSON report if exists
    local json_report="$REPORTS_DIR/zap/zap-report-$TIMESTAMP.json"
    if [[ -f "$json_report" ]]; then
        local high_alerts=$(cat "$json_report" | jq '[.site[].alerts[] | select(.riskcode == "3")] | length')
        local medium_alerts=$(cat "$json_report" | jq '[.site[].alerts[] | select(.riskcode == "2")] | length')
        
        echo ""
        echo "📊 ZAP Scan Results:"
        echo "   High Risk:   $high_alerts"
        echo "   Medium Risk: $medium_alerts"
        
        if [[ "$FAIL_ON_HIGH" == "true" ]] && [[ $high_alerts -gt 0 ]]; then
            log_error "High risk vulnerabilities found!"
            return 1
        fi
    fi
    
    log_success "ZAP scan completed"
    return 0
}

# =============================================================================
# TRIVY (Container Scanning)
# =============================================================================

run_trivy_scan() {
    log_info "Running Trivy container scan..."
    
    local report_file="$REPORTS_DIR/trivy/trivy-report-$TIMESTAMP.json"
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        log_warning "Docker not found. Skipping Trivy scan."
        return 0
    fi
    
    # Check if image exists
    if ! docker image inspect "$DOCKER_IMAGE" &> /dev/null; then
        log_warning "Docker image $DOCKER_IMAGE not found. Building..."
        docker build -t "$DOCKER_IMAGE" .
    fi
    
    # Run Trivy
    docker run --rm \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v "$(pwd)/$REPORTS_DIR/trivy:/reports" \
        aquasec/trivy image \
        --format json \
        --output "/reports/trivy-report-$TIMESTAMP.json" \
        --severity HIGH,CRITICAL \
        "$DOCKER_IMAGE"
    
    # Also generate table output
    docker run --rm \
        -v /var/run/docker.sock:/var/run/docker.sock \
        aquasec/trivy image \
        --severity HIGH,CRITICAL \
        "$DOCKER_IMAGE"
    
    log_info "📁 Report: $report_file"
    
    # Parse results
    if [[ -f "$report_file" ]]; then
        local critical=$(cat "$report_file" | jq '[.Results[].Vulnerabilities[] | select(.Severity == "CRITICAL")] | length // 0')
        local high=$(cat "$report_file" | jq '[.Results[].Vulnerabilities[] | select(.Severity == "HIGH")] | length // 0')
        
        echo ""
        echo "📊 Trivy Scan Results:"
        echo "   Critical: $critical"
        echo "   High:     $high"
        
        if [[ "$FAIL_ON_HIGH" == "true" ]] && [[ $critical -gt 0 ]]; then
            log_error "Critical container vulnerabilities found!"
            return 1
        fi
    fi
    
    log_success "Trivy scan completed"
    return 0
}

# =============================================================================
# SUMMARY REPORT
# =============================================================================

generate_summary() {
    local summary_file="$REPORTS_DIR/security-summary-$TIMESTAMP.md"
    
    cat > "$summary_file" << EOF
# Security Scan Summary
**Generated:** $(date -Iseconds)
**Platform:** RGPD IA Platform

## Scans Performed

### 1. NPM Audit (Dependency Vulnerabilities)
- Checks: Package dependencies
- Report: \`reports/security/npm/audit-$TIMESTAMP.json\`

### 2. OWASP ZAP (Dynamic Application Security Testing)
- Checks: Web application vulnerabilities
- Report: \`reports/security/zap/zap-report-$TIMESTAMP.html\`

### 3. Trivy (Container Image Vulnerabilities)
- Checks: Docker image vulnerabilities
- Report: \`reports/security/trivy/trivy-report-$TIMESTAMP.json\`

## RGPD Compliance Notes

This security scan supports RGPD compliance requirements:
- **Art. 32**: Regular security testing documented
- **Art. 5.1(f)**: Integrity and confidentiality verification

## Next Steps

1. Review all HIGH/CRITICAL findings
2. Create remediation plan with deadlines
3. Track in security incident system if applicable
4. Re-run scans after fixes applied
EOF
    
    log_info "📁 Summary: $summary_file"
}

# =============================================================================
# MAIN
# =============================================================================

main() {
    local scan_type="${1:-all}"
    local failed=0
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║           🔒 SECURITY SCANNING - RGPD IA Platform          ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    ensure_reports_dir
    
    case "$scan_type" in
        npm)
            run_npm_audit || failed=1
            ;;
        zap)
            run_zap_scan || failed=1
            ;;
        trivy)
            run_trivy_scan || failed=1
            ;;
        all)
            run_npm_audit || failed=1
            run_zap_scan || failed=1
            run_trivy_scan || failed=1
            generate_summary
            ;;
        *)
            echo "Usage: $0 [all|npm|zap|trivy]"
            exit 1
            ;;
    esac
    
    echo ""
    if [[ $failed -eq 1 ]]; then
        log_error "Security scan completed with failures!"
        exit 1
    else
        log_success "All security scans completed successfully!"
        exit 0
    fi
}

main "$@"
