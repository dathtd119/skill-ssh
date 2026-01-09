#!/usr/bin/env bash

# SSH Manager Skill - Slash Command Handler
# Routes /ssh commands to appropriate TypeScript scripts

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Help function
show_help() {
    cat << EOF
${GREEN}SSH Manager Skill${NC} - Manage remote SSH servers from Claude Code

${BLUE}Usage:${NC}
  /ssh <command> [options]

${BLUE}Core Commands:${NC}
  list                              List all configured servers
  exec -s <server> -c <command>     Execute command on remote server
  upload -s <server> -l <local> -r <remote>  Upload file to server
  download -s <server> -r <remote> -l <local> Download file from server
  sync -s <server> --source <path> --dest <path>  Sync files with rsync

${BLUE}Advanced Commands:${NC}
  sudo -s <server> -c <command>     Execute command with sudo
  health -s <server>                Check server health

${BLUE}Examples:${NC}
  /ssh list
  /ssh exec -s prod -c "docker ps"
  /ssh sudo -s prod -c "systemctl restart nginx"
  /ssh upload -s prod -l config.json -r /etc/app/config.json
  /ssh download -s prod -r /var/log/app.log -l ./logs/
  /ssh sync -s prod --source local:./build --dest remote:/var/www
  /ssh health -s prod

${BLUE}Options:${NC}
  -h, --help                        Show this help message
  --json                            Output as JSON (for automation)

${BLUE}Documentation:${NC}
  View detailed docs: cat $SCRIPT_DIR/SKILL.md
  Security guide: cat $SCRIPT_DIR/docs/security.md
  Core tools: cat $SCRIPT_DIR/docs/core-tools.md

${BLUE}Setup:${NC}
  1. Configure servers in .env file
  2. Run: chmod 600 .env
  3. Test: /ssh list

For more information, see: $SCRIPT_DIR/README.md
EOF
}

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: Bun runtime not found${NC}"
    echo "Install bun: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Check if .env exists
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Copy .env.example to .env and configure your servers:"
    echo "  cp $SCRIPT_DIR/.env.example $SCRIPT_DIR/.env"
    echo "  nano $SCRIPT_DIR/.env"
    echo "  chmod 600 $SCRIPT_DIR/.env"
fi

# Parse command
COMMAND="${1:-help}"
shift || true

# Route to appropriate script
case "$COMMAND" in
    list)
        exec bun run "$SCRIPT_DIR/scripts/core/list-servers.ts" "$@"
        ;;
    
    exec|execute)
        exec bun run "$SCRIPT_DIR/scripts/core/execute.ts" "$@"
        ;;
    
    upload)
        exec bun run "$SCRIPT_DIR/scripts/core/upload.ts" "$@"
        ;;
    
    download)
        exec bun run "$SCRIPT_DIR/scripts/core/download.ts" "$@"
        ;;
    
    sync)
        exec bun run "$SCRIPT_DIR/scripts/core/sync.ts" "$@"
        ;;
    
    sudo)
        exec bun run "$SCRIPT_DIR/scripts/advanced/execute-sudo.ts" "$@"
        ;;
    
    health|health-check)
        exec bun run "$SCRIPT_DIR/scripts/monitoring/health-check.ts" "$@"
        ;;
    
    help|-h|--help)
        show_help
        exit 0
        ;;
    
    *)
        echo -e "${RED}Error: Unknown command '${COMMAND}'${NC}"
        echo "Run '/ssh help' to see available commands"
        exit 1
        ;;
esac
    
    session|session-start)
        exec bun run "$SCRIPT_DIR/scripts/sessions/session-start.ts" "$@"
        ;;
    
    session-exec)
        exec bun run "$SCRIPT_DIR/scripts/sessions/session-exec.ts" "$@"
        ;;
