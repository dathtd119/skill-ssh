# Changelog

## [1.0.0] - 2026-01-09 - Initial Release

**AI Assistant Compatibility:** Claude Code, ChatGPT, Gemini, and other LLM assistants with skill support

### Features

#### Core SSH Functionality
- Password-based authentication
- SSH key-based authentication  
- Command execution with real-time streaming
- File upload and download
- Rsync bidirectional synchronization
- Multi-server configuration via .env
- Session state management
- Connection timeout handling

#### Command Safety System
- **10 dangerous patterns** (blocked by default)
  - Root filesystem deletion
  - Disk write operations
  - Filesystem formatting
  - Fork bombs
  - Recursive chmod 777 on root
  - Curl/wget pipe to shell
  - System binaries deletion
  - Boot partition deletion
  - MBR overwrite
  - System shutdown commands

- **7 suspicious patterns** (warnings only)
  - Sudo with rm
  - chmod 777
  - Output redirection to /dev/null
  - Base64 decode operations
  - Firewall disable
  - Passwords in command line
  - Nohup background processes

- **2 whitelist patterns** (override blocking)
  - User home directory operations
  - Temp directory cleanup

#### Pattern Management
- JSON-based configuration (`config/command-patterns.json`)
- Runtime pattern addition and modification
- Pattern severity levels (critical, high, medium, low)
- CLI tool for pattern management
- Export/import functionality
- Pattern statistics and reporting

#### Real-Time Streaming
- Intelligent idle detection (500ms timeout)
- Adaptive command completion (up to 30s)
- 74% faster than fixed timeouts for quick commands
- Event-driven output streaming
- Streaming support for long-running commands

#### Testing
- 39 automated tests (100% pass rate)
- 21 unit tests (command analysis, config loading)
- 10 integration tests (live SSH connections)
- 8 config loader tests
- Bun test runner integration

#### Documentation
- Complete README with quick start
- Pattern configuration guide (PATTERNS.md)
- Real-time streaming guide (STREAMING.md)
- Testing documentation (TESTING.md)
- Security best practices (SECURITY.md)
- Session management guide (SESSIONS.md)

#### CLI Tools
- `manage-patterns.ts` - Pattern management (list, test, stats, add, export, import)
- `list-servers.ts` - Server configuration listing
- `execute.ts` - Direct command execution
- `session-exec.ts` - Session-based execution with safety
- `upload.ts` / `download.ts` - File transfer
- `sync.ts` - Rsync operations

### Performance

- Command execution: 520ms (quick) to 30s (long)
- Pattern analysis: <1ms per command
- Connection establishment: ~1s
- Test suite execution: 8.4s

### Security

- Configurable command blocking
- Audit logging for blocked commands
- Credential masking in logs
- Severity-based pattern enforcement
- Whitelist override capability

### Technical Stack

- Runtime: Bun (Node.js compatible)
- Language: TypeScript/JavaScript
- SSH Library: ssh2
- Testing: Bun test
- Config: dotenv, @iarna/toml
- Validation: Zod

### Configuration Files

- `.env` - SSH server credentials (gitignored)
- `config/command-patterns.json` - Command safety patterns
- `package.json` - Project dependencies
- `tsconfig.json` - TypeScript configuration

---

## Installation

```bash
# Install dependencies
npm install

# Configure servers
cp .env.example .env
chmod 600 .env
# Edit .env with your server details

# Verify
bun test
bun run scripts/core/list-servers.ts
```

## Quick Start

```bash
# Execute command
bun run scripts/sessions/session-exec.ts -s prod -c "hostname"

# Manage patterns
bun run scripts/patterns/manage-patterns.ts stats

# Run tests
bun test
```

---

## Known Limitations

1. Bun install may hang on Windows (use `npm install`)
2. Sudo operations require NOPASSWD or pre-configured password
3. Commands execute serially (parallel execution planned for v0.1.0)

---

## Roadmap

### v0.1.0 (Planned)
- Connection pooling
- Parallel command execution
- Enhanced sudo support
- Session persistence

### v0.2.0 (Planned)
- Multi-server orchestration
- Web UI for pattern management
- Audit log export
- Plugin system

---

## License

MIT License

---

**Version**: 1.0.0  
**Release Date**: 2026-01-09  
**Status**: Production Ready
