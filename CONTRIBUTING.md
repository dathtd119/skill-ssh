# Contributing to SSH Manager Skill

Thank you for considering contributing to SSH Manager Skill! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pattern Contribution](#pattern-contribution)

---

## Code of Conduct

### Our Standards

- **Be respectful** - Treat everyone with respect and kindness
- **Be inclusive** - Welcome contributions from everyone
- **Be constructive** - Provide helpful feedback
- **Be collaborative** - Work together towards common goals

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling or insulting/derogatory comments
- Public or private harassment
- Publishing others' private information without permission

---

## How Can I Contribute?

### Reporting Bugs

1. **Check existing issues** - Search to avoid duplicates
2. **Use bug report template** - Fill out all sections
3. **Include details** - Environment, steps to reproduce, error messages
4. **Remove sensitive data** - Never include passwords or credentials

### Suggesting Features

1. **Check roadmap** - See if it's already planned
2. **Use feature request template** - Explain use case and benefits
3. **Consider alternatives** - Discuss different approaches
4. **Be specific** - Provide concrete examples

### Submitting Command Patterns

1. **Use pattern submission template**
2. **Test thoroughly** - Ensure no false positives
3. **Document well** - Clear description and examples
4. **Follow pattern format** - Use existing patterns as reference

### Improving Documentation

1. **Fix typos and errors**
2. **Add examples and clarifications**
3. **Update outdated information**
4. **Improve readability**

---

## Development Setup

### Prerequisites

```bash
# Required
- Node.js >= 18 or Bun >= 1.0
- Git
- SSH access to a test server (for integration tests)

# Recommended
- VS Code with TypeScript extension
- Terminal with Bash/Zsh
```

### Installation

```bash
# 1. Fork and clone repository
git clone https://github.com/YOUR_USERNAME/skill-ssh.git
cd skill-ssh

# 2. Install dependencies
npm install

# 3. Copy .env.example to .env
cp .env.example .env
chmod 600 .env

# 4. Configure test server in .env
# Edit .env with your SSH test server details

# 5. Run tests to verify setup
bun test
```

### Project Structure

```
skill-ssh/
├── config/              # Configuration files
│   └── command-patterns.json
├── docs/                # Documentation
├── lib/                 # Core library modules
│   ├── interactive-session.js
│   ├── command-pattern-loader.js
│   └── ...
├── scripts/             # Executable scripts
│   ├── core/           # Core operations
│   ├── patterns/       # Pattern management
│   └── sessions/       # Session management
└── tests/              # Test suites
    ├── unit/           # Unit tests
    └── integration/    # Integration tests
```

---

## Pull Request Process

### Before Submitting

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes**
   - Follow coding standards
   - Add tests for new features
   - Update documentation

3. **Run tests**
   ```bash
   bun test
   ```

4. **Check code quality**
   ```bash
   # No linter configured yet, but ensure:
   # - No syntax errors
   # - Consistent formatting
   # - Clear variable names
   ```

### Submitting Pull Request

1. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: Add new feature"
   # or
   git commit -m "fix: Fix bug in X"
   ```

2. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create Pull Request on GitHub**
   - Use descriptive title
   - Fill out PR template
   - Reference related issues
   - Add screenshots if applicable

### Commit Message Format

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test additions or fixes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Maintenance tasks

**Examples:**
```
feat: Add parallel command execution
fix: Resolve connection timeout issue
docs: Update pattern configuration guide
test: Add tests for pattern matching
```

### PR Review Process

1. **Automated checks** - Tests must pass
2. **Code review** - Maintainer will review
3. **Feedback** - Address requested changes
4. **Approval** - Maintainer approves
5. **Merge** - PR is merged to main

---

## Coding Standards

### JavaScript/TypeScript

```javascript
// ✅ Good
function executeCommand(command, options) {
  const { timeout = 30000, stream = true } = options;
  
  if (!command) {
    throw new Error('Command is required');
  }
  
  return sshClient.exec(command, { timeout, stream });
}

// ❌ Bad
function exec(c,o) {
  return sshClient.exec(c,o);
}
```

### Code Style

1. **Naming Conventions**
   - Variables: `camelCase`
   - Constants: `UPPER_SNAKE_CASE`
   - Functions: `camelCase`
   - Classes: `PascalCase`
   - Files: `kebab-case.js`

2. **Comments**
   - Use comments for complex logic
   - Avoid obvious comments
   - Keep comments up-to-date

3. **Error Handling**
   ```javascript
   // Always handle errors
   try {
     await executeCommand(cmd);
   } catch (error) {
     logger.error('Command execution failed:', error);
     throw error;
   }
   ```

4. **Async/Await**
   ```javascript
   // Prefer async/await over callbacks
   async function uploadFile(local, remote) {
     try {
       await sshClient.upload(local, remote);
       logger.info('Upload successful');
     } catch (error) {
       logger.error('Upload failed:', error);
       throw error;
     }
   }
   ```

### Security Best Practices

1. **Never log passwords**
   ```javascript
   // ✅ Good
   logger.info('Connecting to server:', { host, user });
   
   // ❌ Bad
   logger.info('Connecting:', { host, user, password });
   ```

2. **Validate inputs**
   ```javascript
   function sanitizeCommand(command) {
     if (typeof command !== 'string') {
       throw new Error('Command must be a string');
     }
     return command.trim();
   }
   ```

3. **Use environment variables**
   ```javascript
   // ✅ Good
   const host = process.env.SSH_HOST;
   
   // ❌ Bad
   const host = '192.168.1.100';
   ```

---

## Testing Guidelines

### Writing Tests

```typescript
import { describe, it, expect } from 'bun:test';

describe('Pattern Matching', () => {
  it('should block dangerous rm -rf / command', () => {
    const result = analyzeCommand('rm -rf /');
    expect(result.isDangerous).toBe(true);
    expect(result.severity).toBe('critical');
  });
  
  it('should allow safe commands', () => {
    const result = analyzeCommand('ls -la');
    expect(result.isDangerous).toBe(false);
  });
});
```

### Test Coverage

- **Unit tests** - Test individual functions
- **Integration tests** - Test end-to-end workflows
- **Edge cases** - Test boundary conditions
- **Error handling** - Test error scenarios

### Running Tests

```bash
# All tests
bun test

# Specific test file
bun test tests/unit/command-analysis.test.ts

# Watch mode
bun test --watch

# Coverage (if configured)
bun test --coverage
```

### Test Requirements

- All new features must have tests
- Bug fixes should include regression tests
- Tests must pass before PR is merged
- Maintain or improve test coverage

---

## Pattern Contribution

### Pattern Format

```json
{
  "name": "pattern_name",
  "pattern": "^regex_pattern$",
  "description": "Clear description",
  "severity": "critical|high|medium|low",
  "enabled": true,
  "examples": ["example 1", "example 2"],
  "false_positives": ["safe command that might match"]
}
```

### Testing Patterns

```bash
# Test a pattern against commands
bun run scripts/patterns/manage-patterns.ts test "your command"

# Add pattern via CLI
bun run scripts/patterns/manage-patterns.ts add \
  --type dangerous \
  --name "your_pattern" \
  --pattern "^regex" \
  --description "Description" \
  --severity high
```

### Pattern Guidelines

1. **Be specific** - Avoid overly broad patterns
2. **Test thoroughly** - Check for false positives
3. **Document well** - Clear description and examples
4. **Consider context** - Some commands are safe in certain contexts
5. **Provide alternatives** - Suggest safer alternatives if possible

---

## Questions?

- **Documentation:** Check `docs/` directory
- **Issues:** [GitHub Issues](https://github.com/dathtd119/skill-ssh/issues)
- **Discussions:** [GitHub Discussions](https://github.com/dathtd119/skill-ssh/discussions)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to SSH Manager Skill!** 🎉
