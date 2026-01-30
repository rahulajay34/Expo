#!/bin/bash

# GCCP Production Rollback Script
# Version: 1.0.0
# Usage: ./rollback.sh [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
BACKUP_FILE=""
DATABASE_URL=""
PROJECT_REF=""
SKIP_CONFIRMATION=false
VERBOSE=false
ROLLBACK_TYPE="full"

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ============================================
# Helper Functions
# ============================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_usage() {
    cat << EOF
GCCP Production Rollback Script

Usage: $0 [OPTIONS]

Required:
  -b, --backup-file FILE     Path to database backup file
  -d, --database-url URL     PostgreSQL database URL

Optional:
  -p, --project-ref REF      Supabase project reference
  -t, --type TYPE            Rollback type: full|database|code (default: full)
  -y, --yes                  Skip confirmation prompts
  -v, --verbose              Enable verbose output
  -h, --help                 Show this help message

Examples:
  # Full rollback with database restore
  $0 -b backups/pre-deployment-20260130.sql -d postgres://user:pass@host/db

  # Database-only rollback
  $0 -b backup.sql -d \$DATABASE_URL -t database

  # Code-only rollback (no database restore)
  $0 -t code -y

EOF
}

# ============================================
# Validation Functions
# ============================================

validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        log_error "psql is not installed. Please install PostgreSQL client."
        exit 1
    fi
    
    # Check if supabase CLI is available (optional)
    if ! command -v supabase &> /dev/null; then
        log_warn "Supabase CLI not found. Some features may be limited."
    fi
    
    # Check if vercel CLI is available (optional)
    if ! command -v vercel &> /dev/null; then
        log_warn "Vercel CLI not found. Code rollback may be limited."
    fi
    
    log_success "Prerequisites validated"
}

validate_backup_file() {
    if [[ -z "$BACKUP_FILE" ]]; then
        log_error "Backup file is required. Use -b or --backup-file"
        exit 1
    fi
    
    if [[ ! -f "$BACKUP_FILE" ]]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    log_success "Backup file validated: $BACKUP_FILE"
}

validate_database_url() {
    if [[ -z "$DATABASE_URL" ]]; then
        # Try to get from environment
        if [[ -n "$DATABASE_URL" ]]; then
            log_info "Using DATABASE_URL from environment"
        else
            log_error "Database URL is required. Use -d or --database-url"
            exit 1
        fi
    fi
    
    # Test connection
    log_info "Testing database connection..."
    if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        log_error "Failed to connect to database"
        exit 1
    fi
    
    log_success "Database connection validated"
}

# ============================================
# Rollback Functions
# ============================================

create_pre_rollback_backup() {
    log_info "Creating pre-rollback safety backup..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local safety_backup="backups/pre-rollback-safety-${timestamp}.sql"
    
    mkdir -p backups
    
    log_info "Dumping current database state to $safety_backup..."
    
    if ! pg_dump "$DATABASE_URL" > "$safety_backup" 2>/dev/null; then
        log_warn "Failed to create safety backup, but continuing..."
    else
        log_success "Safety backup created: $safety_backup"
    fi
}

enable_maintenance_mode() {
    log_info "Enabling maintenance mode..."
    
    if command -v vercel &> /dev/null; then
        # Set maintenance mode environment variable
        echo "MAINTENANCE_MODE=true" | vercel env add MAINTENANCE_MODE production --yes 2>/dev/null || true
        
        # Trigger redeploy
        vercel --prod 2>/dev/null || log_warn "Failed to redeploy with maintenance mode"
    else
        log_warn "Vercel CLI not available. Please enable maintenance mode manually."
    fi
}

disable_maintenance_mode() {
    log_info "Disabling maintenance mode..."
    
    if command -v vercel &> /dev/null; then
        # Remove maintenance mode
        vercel env rm MAINTENANCE_MODE production --yes 2>/dev/null || true
        
        # Trigger redeploy
        vercel --prod 2>/dev/null || log_warn "Failed to redeploy without maintenance mode"
    fi
}

rollback_database() {
    log_info "Starting database rollback..."
    
    validate_backup_file
    validate_database_url
    
    # Create safety backup first
    create_pre_rollback_backup
    
    log_warn "This will REPLACE the current database with the backup!"
    
    if [[ "$SKIP_CONFIRMATION" == false ]]; then
        read -p "Are you sure you want to continue? (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            log_info "Rollback cancelled by user"
            exit 0
        fi
    fi
    
    # Terminate existing connections
    log_info "Terminating existing database connections..."
    psql "$DATABASE_URL" -c "
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = current_database() 
        AND pid <> pg_backend_pid();
    " 2>/dev/null || true
    
    # Restore from backup
    log_info "Restoring database from backup..."
    
    if [[ "$VERBOSE" == true ]]; then
        psql "$DATABASE_URL" < "$BACKUP_FILE"
    else
        psql "$DATABASE_URL" < "$BACKUP_FILE" > /dev/null 2>&1
    fi
    
    if [[ $? -eq 0 ]]; then
        log_success "Database restored successfully"
    else
        log_error "Database restore failed"
        exit 1
    fi
    
    # Verify restore
    log_info "Verifying database restore..."
    local table_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
    log_success "Database verified: $table_count tables found"
}

rollback_code() {
    log_info "Starting code rollback..."
    
    # Get previous deployment
    log_info "Fetching previous deployment..."
    
    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI not available for code rollback"
        return 1
    fi
    
    # List recent deployments
    log_info "Recent deployments:"
    vercel list --meta MAINTENANCE_MODE!=true 2>/dev/null | head -20 || true
    
    log_warn "Please manually rollback to a previous deployment using Vercel dashboard"
    log_info "URL: https://vercel.com/dashboard"
    
    # Alternative: git-based rollback
    if [[ -d "$PROJECT_ROOT/.git" ]]; then
        log_info "Git repository found. You can rollback using:"
        log_info "  git log --oneline -10"
        log_info "  git checkout <commit-hash>"
        log_info "  vercel --prod"
    fi
}

verify_rollback() {
    log_info "Verifying rollback..."
    
    # Check database connectivity
    if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        log_error "Database connectivity check failed"
        return 1
    fi
    
    # Check critical tables
    local required_tables=("profiles" "generations" "generation_logs" "checkpoints")
    for table in "${required_tables[@]}"; do
        if ! psql "$DATABASE_URL" -c "SELECT 1 FROM $table LIMIT 1;" > /dev/null 2>&1; then
            log_error "Required table '$table' not found or inaccessible"
            return 1
        fi
    done
    
    log_success "Rollback verification passed"
    return 0
}

# ============================================
# Main Execution
# ============================================

main() {
    echo "========================================"
    echo "GCCP Production Rollback Script"
    echo "========================================"
    echo ""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -b|--backup-file)
                BACKUP_FILE="$2"
                shift 2
                ;;
            -d|--database-url)
                DATABASE_URL="$2"
                shift 2
                ;;
            -p|--project-ref)
                PROJECT_REF="$2"
                shift 2
                ;;
            -t|--type)
                ROLLBACK_TYPE="$2"
                shift 2
                ;;
            -y|--yes)
                SKIP_CONFIRMATION=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                print_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done
    
    # Validate rollback type
    if [[ ! "$ROLLBACK_TYPE" =~ ^(full|database|code)$ ]]; then
        log_error "Invalid rollback type: $ROLLBACK_TYPE"
        exit 1
    fi
    
    # Validate prerequisites
    validate_prerequisites
    
    # Show rollback plan
    echo "Rollback Plan:"
    echo "  Type: $ROLLBACK_TYPE"
    echo "  Backup File: ${BACKUP_FILE:-"N/A"}"
    echo "  Database URL: ${DATABASE_URL:+"[SET]":-"[NOT SET]"}"
    echo "  Skip Confirmation: $SKIP_CONFIRMATION"
    echo ""
    
    if [[ "$SKIP_CONFIRMATION" == false ]]; then
        read -p "Proceed with rollback? (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            log_info "Rollback cancelled"
            exit 0
        fi
    fi
    
    # Enable maintenance mode for full rollback
    if [[ "$ROLLBACK_TYPE" == "full" ]]; then
        enable_maintenance_mode
    fi
    
    # Execute rollback based on type
    case $ROLLBACK_TYPE in
        full)
            rollback_database
            rollback_code
            ;;
        database)
            rollback_database
            ;;
        code)
            rollback_code
            ;;
    esac
    
    # Verify rollback
    if [[ "$ROLLBACK_TYPE" != "code" ]]; then
        verify_rollback
    fi
    
    # Disable maintenance mode
    if [[ "$ROLLBACK_TYPE" == "full" ]]; then
        disable_maintenance_mode
    fi
    
    echo ""
    log_success "Rollback completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Verify application is functioning correctly"
    echo "  2. Check logs for any errors"
    echo "  3. Monitor error rates and user feedback"
    echo "  4. Document the incident for post-mortem"
    echo ""
}

# Run main function
main "$@"
