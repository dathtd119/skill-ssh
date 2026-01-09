# SSH Manager Skill - Production Ready

Powerful SSH server management for AI assistants (Claude, ChatGPT, Gemini, etc.) with configurable command safety, real-time streaming, and automated testing.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/dathtd119/skill-ssh)
[![Tests](https://img.shields.io/badge/tests-39%20passing-brightgreen.svg)](https://github.com/dathtd119/skill-ssh)

---

## 🚀 Quick Start

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
bun run scripts/core/list-servers.ts
```

---

## ✨ Features

- ✅ **SSH Session Management** - Password & SSH key authentication
- ✅ **Command Execution** - Real-time streaming with intelligent idle detection (500ms)
- ✅ **Configurable Safety Patterns** - Block dangerous commands with 11+ built-in patterns
- ✅ **File Operations** - Upload, download, and rsync synchronization
- ✅ **Pattern Management CLI** - Add, test, and manage command safety patterns
- ✅ **Automated Testing** - 39 tests with 100% pass rate
- ✅ **Comprehensive Documentation** - 5 detailed guides

---

## 📋 Command Safety

### 🚫 Dangerous Patterns (Blocked by Default)

| Pattern | Description | Example |
|---------|-------------|---------|
| `rm -rf /` | Root filesystem deletion | Critical |
| `mkfs.*` | Format operations | Critical |
| `dd if=... of=/dev/sd*` | Disk write operations | Critical |
| `shutdown\|reboot` | System shutdown | High |
| `curl ... \| sh` | Pipe to shell | High |
| And 6 more... | Customizable | Various |

### ⚠️ Suspicious Patterns (Warnings Only)

| Pattern | Description | Severity |
|---------|-------------|----------|
| `sudo rm` | Sudo with deletion | Medium |
| `chmod 777` | Insecure permissions | Medium |
| `> /dev/null 2>&1` | Hidden output | Low |
| And 4 more... | Customizable | Various |

### ✅ Whitelisted Patterns (Safe Overrides)

- `rm -rf /home/user/*` - User directory operations
- `rm -rf /tmp/*` - Temp directory cleanup

---

## 🎯 Usage

### Basic Commands

```bash
# List configured servers
bun run scripts/core/list-servers.ts

# Execute command
bun run scripts/sessions/session-exec.ts -s prod -c "hostname"

# Execute with real-time streaming
bun run scripts/sessions/session-exec.ts -s prod -c "npm install"

# Upload file
bun run scripts/core/upload.ts -s prod -l ./local.txt -r /tmp/remote.txt

# Download file
bun run scripts/core/download.ts -s prod -r /var/log/app.log -l ./app.log

# Sync directories
bun run scripts/core/sync.ts -s prod --source ./local --dest /remote
```

### Pattern Management

```bash
# View pattern statistics
bun run scripts/patterns/manage-patterns.ts stats

# Test command safety
bun run scripts/patterns/manage-patterns.ts test "rm -rf /"

# Add custom dangerous pattern
bun run scripts/patterns/manage-patterns.ts add \
  --type dangerous \
  --name "docker_remove_all" \
  --pattern "^docker\\s+rm.*--all" \
  --description "Remove all Docker containers" \
  --severity high

# List all dangerous patterns
bun run scripts/patterns/manage-patterns.ts list dangerous

# Export patterns
bun run scripts/patterns/manage-patterns.ts export my-patterns.json
```

### Testing

```bash
# Run all tests
bun test

# Run specific test suites
bun test tests/unit
bun test tests/integration

# Watch mode
bun test --watch
```

---

## ⚙️ Configuration

### Server Setup (`.env`)

```env
# Production Server
SSH_SERVER_PROD_HOST=192.168.1.100
SSH_SERVER_PROD_USER=admin
SSH_SERVER_PROD_PASSWORD=your_password
SSH_SERVER_PROD_PORT=22
SSH_SERVER_PROD_DEFAULT_DIR=/home/admin

# Development Server
SSH_SERVER_DEV_HOST=192.168.1.101
SSH_SERVER_DEV_USER=developer
SSH_SERVER_DEV_KEYPATH=~/.ssh/id_rsa
SSH_SERVER_DEV_PORT=22
```

### Pattern Configuration (`config/command-patterns.json`)

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
        "enabled": true,
        "examples": ["rm -rf /"]
      }
    ]
  },
  "settings": {
    "block_dangerous_by_default": true,
    "warn_on_suspicious": true,
    "case_sensitive": false,
    "allow_whitelist_override": true
  }
}
```

---

## 📊 Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Quick commands | ~520ms | 74% faster than fixed timeout |
| Long commands | Up to 30s | Reliable completion |
| Pattern matching | <1ms | Per command analysis |
| Connection | ~1s | Includes authentication |
| Test suite | 8.4s | 39 tests |

---

## 📁 Project Structure

```
ssh-manager-skill/
├── config/
│   └── command-patterns.json       # Safety patterns configuration
├── docs/
│   ├── PATTERNS.md                 # Pattern configuration guide
│   ├── SECURITY.md                 # Security best practices
│   ├── SESSIONS.md                 # Session management guide
│   ├── STREAMING.md                # Real-time streaming guide
│   └── TESTING.md                  # Testing documentation
├── lib/
│   ├── command-pattern-loader.js   # Pattern management system
│   ├── config-loader.js            # Configuration loader
│   ├── interactive-session.js      # SSH sessions with streaming
│   ├── logger.js                   # Logging system
│   ├── security.js                 # Security utilities
│   └── ssh-manager.js              # Core SSH client
├── scripts/
│   ├── core/                       # Core operations
│   ├── patterns/                   # Pattern management CLI
│   └── sessions/                   # Session management
├── tests/
│   ├── unit/                       # Unit tests (29 tests)
│   └── integration/                # Integration tests (10 tests)
├── .env                            # Server configuration (gitignored)
├── .env.example                    # Configuration template
├── CHANGELOG.md                    # Version history
├── LICENSE                         # MIT License
├── package.json                    # Dependencies (v1.0.0)
├── README.md                       # This file
└── SKILL.md                        # Claude Code skill interface
```

---

## 📚 Documentation

- **[PATTERNS.md](docs/PATTERNS.md)** - Complete pattern configuration guide
- **[STREAMING.md](docs/STREAMING.md)** - Real-time streaming architecture
- **[TESTING.md](docs/TESTING.md)** - Testing guide and best practices
- **[SECURITY.md](docs/SECURITY.md)** - Security implementation details
- **[SESSIONS.md](docs/SESSIONS.md)** - Session management guide
- **[CHANGELOG.md](CHANGELOG.md)** - Version history

---

## 🔒 Security

### Important Security Notes

⚠️ **Credential Management**
- Keep `.env` file secure (chmod 600)
- Never commit `.env` to version control
- Use SSH keys instead of passwords when possible
- Add `.env` to `.gitignore` (already included)

⚠️ **Command Safety**
- Review pattern configurations regularly
- Don't disable `block_dangerous_by_default`
- Test custom patterns in development first
- Monitor blocked command logs

⚠️ **Sudo Operations**
Three modes available:
1. **NOPASSWD** (recommended) - Configure in server's sudoers
2. **Pre-configured** - Set `SUDO_PASSWORD` in `.env`
3. **Runtime** - Pass password with `-p` flag

---

## 🧪 Testing

```bash
# All tests (39 tests)
bun test

# Unit tests only (29 tests)
bun test tests/unit

# Integration tests only (10 tests)
bun test tests/integration

# Watch mode for development
bun test --watch
```

**Test Coverage:**
- 21 command analysis tests
- 8 configuration loading tests
- 10 live SSH connection tests
- 100% pass rate

---

## 🛠️ Common Use Cases

### 1. Block Dangerous Operations

```bash
# Add pattern to block Docker force removal
bun run scripts/patterns/manage-patterns.ts add \
  --type dangerous \
  --name "docker_force_rm" \
  --pattern "^docker\\s+rm.*-f" \
  --description "Force remove Docker containers" \
  --severity high

# Test it
bun run scripts/patterns/manage-patterns.ts test "docker rm -f container_id"
```

### 2. Whitelist Safe Commands

```bash
# Whitelist safe Docker cleanup
bun run scripts/patterns/manage-patterns.ts add \
  --type whitelisted \
  --name "safe_docker_prune" \
  --pattern "^docker\\s+system\\s+prune" \
  --description "Safe Docker cleanup"

# Test it
bun run scripts/patterns/manage-patterns.ts test "docker system prune"
```

### 3. Execute Long-Running Commands

```bash
# With real-time streaming
bun run scripts/sessions/session-exec.ts -s prod -c "npm install" 

# Build processes
bun run scripts/sessions/session-exec.ts -s prod -c "docker build ."

# Long operations
bun run scripts/sessions/session-exec.ts -s prod -c "rsync -av /large/directory /backup/"
```

---

## 🐛 Troubleshooting

### Connection Issues

```bash
# Test direct SSH connection
ssh user@host

# Check .env configuration
cat .env | grep SSH_SERVER_

# Verify server is accessible
ping host
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

# Check SSH server is accessible
ssh user@192.168.15.100

# Run specific failing test
bun test tests/unit/command-analysis.test.ts
```

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass (`bun test`)
6. Update documentation
7. Commit changes (`git commit -m 'Add amazing feature'`)
8. Push to branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🗺️ Roadmap

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

## 📞 Support

- **Documentation**: See `docs/` directory
- **Issues**: [GitHub Issues](https://github.com/dathtd119/skill-ssh/issues)
- **Discussions**: [GitHub Discussions](https://github.com/dathtd119/skill-ssh/discussions)

---

## 🙏 Acknowledgments

- Built for AI assistants with skill support (Claude Code, ChatGPT, Gemini, etc.)
- Uses [ssh2](https://github.com/mscdex/ssh2) for SSH connections
- Tested with [Bun](https://bun.sh) runtime

---

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/dathtd119/skill-ssh?style=social)
![GitHub forks](https://img.shields.io/github/forks/dathtd119/skill-ssh?style=social)
![GitHub issues](https://img.shields.io/github/issues/dathtd119/skill-ssh)
![GitHub license](https://img.shields.io/github/license/dathtd119/skill-ssh)

---

<div align="center">

**Built with ❤️ for AI Assistants**

[Report Bug](https://github.com/dathtd119/skill-ssh/issues) · [Request Feature](https://github.com/dathtd119/skill-ssh/issues) · [Documentation](docs/)

</div>
