# SSH Manager Skill

**Remote SSH server management for AI assistants (Claude, ChatGPT, Gemini, etc.)**

Version: 1.0.0

## Quick Commands

```bash
# List servers
bun run scripts/core/list-servers.ts

# Execute command
bun run scripts/sessions/session-exec.ts -s <server> -c "command"

# Manage patterns
bun run scripts/patterns/manage-patterns.ts stats
```

## Features

- SSH session management with password & key authentication
- Command execution with configurable safety patterns
- Real-time streaming (500ms idle detection)
- File transfer (upload, download, rsync)
- Pattern management CLI
- 39 automated tests (100% pass rate)

## Safety Patterns

### Dangerous (Blocked)
- `rm -rf /` - Root deletion
- `mkfs.*` - Format operations
- `shutdown|reboot` - System shutdown
- `dd if=... of=/dev/sd*` - Disk operations
- `curl ... | sh` - Pipe to shell
- Plus 5 more configurable patterns

### Suspicious (Warnings)
- `sudo rm` - Sudo with deletion
- `chmod 777` - Insecure permissions
- `> /dev/null 2>&1` - Hidden output
- Plus 4 more configurable patterns

### Whitelisted (Safe)
- `rm -rf /home/user/*` - User directory operations
- `rm -rf /tmp/*` - Temp cleanup

## Installation

```bash
npm install
cp .env.example .env
chmod 600 .env
```

Configure in `.env`:
```env
SSH_SERVER_PROD_HOST=192.168.1.100
SSH_SERVER_PROD_USER=admin
SSH_SERVER_PROD_PASSWORD=password
SSH_SERVER_PROD_PORT=22
```

## Usage

### Execute Commands
```bash
# Safe
bun run scripts/sessions/session-exec.ts -s prod -c "hostname"

# Blocked
bun run scripts/sessions/session-exec.ts -s prod -c "rm -rf /"

# Bypass
bun run scripts/sessions/session-exec.ts -s prod -c "command" --unsafe
```

### Pattern Management
```bash
# Stats
bun run scripts/patterns/manage-patterns.ts stats

# Test
bun run scripts/patterns/manage-patterns.ts test "rm -rf /"

# Add
bun run scripts/patterns/manage-patterns.ts add \
  --type dangerous \
  --name "custom" \
  --pattern "^regex" \
  --description "What it blocks" \
  --severity high
```

### Testing
```bash
bun test                    # All
bun test tests/unit         # Unit only
bun test tests/integration  # Integration only
```

## Documentation

- [PATTERNS.md](docs/PATTERNS.md) - Pattern configuration
- [STREAMING.md](docs/STREAMING.md) - Real-time streaming
- [TESTING.md](docs/TESTING.md) - Testing guide
- [SECURITY.md](docs/SECURITY.md) - Security practices
- [SESSIONS.md](docs/SESSIONS.md) - Session management
- [CHANGELOG.md](CHANGELOG.md) - Version history

## Performance

- Quick commands: ~520ms
- Long commands: Up to 30s
- Pattern matching: <1ms
- Test suite: 8.4s (39 tests)

## Security

⚠️ Keep `.env` secure (chmod 600)  
⚠️ Never commit credentials  
⚠️ Use SSH keys when possible  
⚠️ Review patterns regularly  

## Configuration Files

- `.env` - SSH server credentials
- `config/command-patterns.json` - Safety patterns
- `package.json` - Dependencies

## Project Structure

```
ssh-skill/
├── config/              # Pattern configuration
├── docs/                # Documentation
├── lib/                 # Core libraries
├── scripts/             # Executable scripts
│   ├── core/           # Core operations
│   ├── patterns/       # Pattern management
│   └── sessions/       # Session management
└── tests/              # Test suites
```

## License

MIT
