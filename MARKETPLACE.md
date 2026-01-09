# SSH Manager Skill - Claude Skill Marketplace Submission

## Skill Information

### Basic Details
- **Name:** SSH Manager Skill
- **Version:** 1.0.0
- **Category:** DevOps & Infrastructure
- **License:** MIT
- **Repository:** https://github.com/dathtd119/skill-ssh

### Short Description (50 characters)
Remote SSH server management with safety controls

### Long Description (500 characters)
Production-ready SSH server management for AI assistants. Features configurable command safety patterns that block dangerous operations, real-time streaming with intelligent idle detection, and comprehensive testing. Supports password and SSH key authentication, file operations (upload/download/rsync), and includes a CLI for pattern management. Perfect for DevOps automation, server administration, and safe remote command execution.

### Tags
- ssh
- devops
- automation
- server-management
- remote-execution
- security
- file-transfer
- infrastructure
- sysadmin
- command-safety

---

## Features Highlight

### 🛡️ Command Safety System
- **11 dangerous patterns** blocked by default (rm -rf /, mkfs, dd, fork bombs, etc.)
- **7 suspicious patterns** with warnings (sudo rm, chmod 777, hidden output)
- **2 whitelist patterns** for safe overrides
- **Configurable severity levels** (critical, high, medium, low)

### ⚡ Real-Time Streaming
- **Intelligent idle detection** (500ms timeout)
- **74% faster** than fixed timeouts for quick commands
- **Adaptive completion** up to 30s for long-running operations
- **Event-driven architecture** for responsive output

### 🧪 Production Ready
- **39 automated tests** (100% pass rate)
- **Unit + Integration tests** covering all major features
- **Comprehensive documentation** (8 detailed guides)
- **Battle-tested** on real production servers

### 🔧 Core Capabilities
- **SSH authentication:** Password & SSH key support
- **File operations:** Upload, download, rsync synchronization
- **Pattern management:** CLI tool for adding/testing/managing patterns
- **Multi-server support:** Manage multiple servers via .env configuration
- **Session management:** Interactive and non-interactive modes

---

## Installation

### Prerequisites
- Node.js >= 18 or Bun >= 1.0
- SSH access to remote servers

### Quick Start

```bash
# Clone repository
git clone https://github.com/dathtd119/skill-ssh.git
cd skill-ssh

# Install dependencies
npm install

# Configure servers
cp .env.example .env
chmod 600 .env
# Edit .env with your server details

# Verify installation
bun test
```

---

## Usage Examples

### Example 1: Execute Safe Commands

```bash
# List configured servers
bun run scripts/core/list-servers.ts

# Execute command on server
bun run scripts/sessions/session-exec.ts -s prod -c "hostname"

# This will be BLOCKED (dangerous pattern)
bun run scripts/sessions/session-exec.ts -s prod -c "rm -rf /"
# Output: ❌ Command blocked: Dangerous pattern detected
```

### Example 2: Pattern Management

```bash
# View pattern statistics
bun run scripts/patterns/manage-patterns.ts stats

# Test command safety
bun run scripts/patterns/manage-patterns.ts test "docker rm -f container"

# Add custom dangerous pattern
bun run scripts/patterns/manage-patterns.ts add \
  --type dangerous \
  --name "kubernetes_delete_all" \
  --pattern "^kubectl\\s+delete.*--all" \
  --description "Delete all Kubernetes resources" \
  --severity critical
```

### Example 3: File Operations

```bash
# Upload file
bun run scripts/core/upload.ts -s prod -l ./local.txt -r /tmp/remote.txt

# Download file
bun run scripts/core/download.ts -s prod -r /var/log/app.log -l ./app.log

# Sync directories
bun run scripts/core/sync.ts -s prod --source ./local --dest /remote
```

### Example 4: Long-Running Commands

```bash
# Real-time streaming for build processes
bun run scripts/sessions/session-exec.ts -s prod -c "npm install"

# Docker builds with live output
bun run scripts/sessions/session-exec.ts -s prod -c "docker build -t myapp ."

# Large file transfers
bun run scripts/sessions/session-exec.ts -s prod -c "rsync -av /large/dir /backup/"
```

---

## Configuration

### Server Configuration (.env)

```env
# Production Server
SSH_SERVER_PROD_HOST=192.168.1.100
SSH_SERVER_PROD_USER=admin
SSH_SERVER_PROD_PASSWORD=your_password
SSH_SERVER_PROD_PORT=22

# Development Server (SSH Key)
SSH_SERVER_DEV_HOST=192.168.1.101
SSH_SERVER_DEV_USER=developer
SSH_SERVER_DEV_KEYPATH=~/.ssh/id_rsa
SSH_SERVER_DEV_PORT=22
```

### Pattern Configuration (config/command-patterns.json)

```json
{
  "version": "1.0.0",
  "dangerous_patterns": {
    "patterns": [
      {
        "name": "delete_root_filesystem",
        "pattern": "^rm\\s+-rf\\s+\\/$",
        "description": "Delete root filesystem",
        "severity": "critical",
        "enabled": true
      }
    ]
  },
  "settings": {
    "block_dangerous_by_default": true,
    "warn_on_suspicious": true,
    "allow_whitelist_override": true
  }
}
```

---

## Security Best Practices

### ⚠️ Credential Management
- ✅ Keep `.env` file secure (chmod 600)
- ✅ Never commit credentials to version control
- ✅ Use SSH keys instead of passwords when possible
- ✅ Add `.env` to `.gitignore` (already included)

### ⚠️ Command Safety
- ✅ Review pattern configurations regularly
- ✅ Don't disable `block_dangerous_by_default`
- ✅ Test custom patterns in development first
- ✅ Monitor blocked command logs

### ⚠️ Sudo Operations
Three modes available:
1. **NOPASSWD** (recommended) - Configure in server's sudoers
2. **Pre-configured** - Set `SUDO_PASSWORD` in `.env`
3. **Runtime** - Pass password with `-p` flag

---

## Performance Metrics

| Operation | Time | Notes |
|-----------|------|-------|
| Quick commands | ~520ms | 74% faster than fixed timeout |
| Long commands | Up to 30s | Reliable completion |
| Pattern matching | <1ms | Per command analysis |
| Connection | ~1s | Includes authentication |
| Test suite | 8.4s | 39 tests |

---

## Documentation

- **[README.md](README.md)** - Main documentation with quick start
- **[PATTERNS.md](docs/PATTERNS.md)** - Complete pattern configuration guide
- **[STREAMING.md](docs/STREAMING.md)** - Real-time streaming architecture
- **[TESTING.md](docs/TESTING.md)** - Testing guide and best practices
- **[SECURITY.md](docs/SECURITY.md)** - Security implementation details
- **[SESSIONS.md](docs/SESSIONS.md)** - Session management guide
- **[CHANGELOG.md](CHANGELOG.md)** - Version history

---

## Testing

```bash
# Run all tests (39 tests)
bun test

# Unit tests only (29 tests)
bun test tests/unit

# Integration tests only (10 tests)
bun test tests/integration

# Watch mode for development
bun test --watch
```

**Test Coverage:**
- 21 command analysis tests (pattern matching)
- 8 configuration loading tests
- 10 live SSH connection tests
- 100% pass rate

---

## Troubleshooting

### Connection Issues
```bash
# Test direct SSH connection
ssh user@host

# Verify server is accessible
ping host

# Check .env configuration
cat .env | grep SSH_SERVER_
```

### Pattern Not Working
```bash
# Test pattern against command
bun run scripts/patterns/manage-patterns.ts test "your command"

# View all patterns
bun run scripts/patterns/manage-patterns.ts list all

# Check pattern config syntax
cat config/command-patterns.json | json_pp
```

### Tests Failing
```bash
# Reinstall dependencies
rm -rf node_modules
npm install

# Run specific failing test
bun test tests/unit/command-analysis.test.ts
```

---

## Roadmap

### v1.1.0 (Planned)
- [ ] Connection pooling for reusable connections
- [ ] Parallel command execution
- [ ] Enhanced sudo support
- [ ] Session persistence across restarts

### v1.2.0 (Planned)
- [ ] Multi-server orchestration (run on multiple servers)
- [ ] Web UI for pattern management
- [ ] Audit log export (JSON/CSV)
- [ ] More pattern examples (Docker, K8s, databases)

### v2.0.0 (Future)
- [ ] Role-based access control
- [ ] Command replay/recording
- [ ] Pattern sharing marketplace
- [ ] Plugin system for custom commands
- [ ] GraphQL API

---

## Support

- **Documentation:** See `docs/` directory
- **Issues:** [GitHub Issues](https://github.com/dathtd119/skill-ssh/issues)
- **Discussions:** [GitHub Discussions](https://github.com/dathtd119/skill-ssh/discussions)
- **Repository:** https://github.com/dathtd119/skill-ssh

---

## License

MIT License - see [LICENSE](LICENSE) file for details

---

## Author

**Dat H. Tran** (dathtd119@gmail.com)

---

## Acknowledgments

- Compatible with Claude Code, ChatGPT, Gemini, and other AI assistants with skill support
- Uses [ssh2](https://github.com/mscdex/ssh2) for SSH connections
- Tested with [Bun](https://bun.sh) runtime

---

## Technical Stack

- **Runtime:** Bun (Node.js compatible)
- **Language:** TypeScript/JavaScript
- **SSH Library:** ssh2 v1.17.0
- **Testing:** Vitest
- **Config:** dotenv, @iarna/toml
- **Validation:** Zod

---

## Why Choose SSH Manager Skill?

### For DevOps Engineers
- ✅ **Safe automation** - Prevents destructive commands
- ✅ **Real-time feedback** - Stream output as it happens
- ✅ **Multi-server support** - Manage entire infrastructure
- ✅ **Audit trail** - Track all executed commands

### For System Administrators
- ✅ **Configurable safety** - Customize patterns for your environment
- ✅ **Battle-tested** - 39 automated tests ensure reliability
- ✅ **Production ready** - Used on real servers
- ✅ **Comprehensive docs** - 8 detailed guides

### For AI Assistant Users
- ✅ **LLM-agnostic** - Works with Claude, ChatGPT, Gemini, etc.
- ✅ **Easy integration** - Simple skill invocation
- ✅ **Well-documented** - Clear examples and usage patterns
- ✅ **Open source** - MIT License, community-driven

---

## Quick Links

- 🏠 [Homepage](https://github.com/dathtd119/skill-ssh)
- 📦 [Releases](https://github.com/dathtd119/skill-ssh/releases)
- 📝 [Changelog](https://github.com/dathtd119/skill-ssh/blob/main/CHANGELOG.md)
- 🐛 [Report Bug](https://github.com/dathtd119/skill-ssh/issues)
- 💡 [Request Feature](https://github.com/dathtd119/skill-ssh/issues)
- 📖 [Documentation](https://github.com/dathtd119/skill-ssh/tree/main/docs)

---

**Version:** 1.0.0  
**Release Date:** 2026-01-09  
**Status:** Production Ready ✅
