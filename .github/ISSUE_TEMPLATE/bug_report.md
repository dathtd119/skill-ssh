---
name: Bug Report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''

---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Run command '...'
2. With configuration '...'
3. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Error Messages**
```
Paste any error messages here
```

**Environment:**
 - OS: [e.g. Windows 10, Ubuntu 22.04, macOS 14]
 - Runtime: [e.g. Bun 1.0.0, Node.js 20.11.0]
 - Skill Version: [e.g. 1.0.0]
 - AI Assistant: [e.g. Claude Code, ChatGPT, Gemini]

**SSH Server Details:**
 - SSH Server OS: [e.g. Ubuntu 22.04]
 - Authentication Method: [e.g. password, SSH key]
 - SSH Port: [e.g. 22]

**Configuration Files:**
```env
# Paste relevant .env configuration (REMOVE PASSWORDS!)
SSH_SERVER_PROD_HOST=192.168.1.100
SSH_SERVER_PROD_USER=admin
# DO NOT paste passwords or sensitive data
```

**Logs:**
```
Paste relevant log output here
```

**Additional context**
Add any other context about the problem here.

**Attempted Solutions:**
- [ ] Checked SSH connection works directly (ssh user@host)
- [ ] Verified .env configuration is correct
- [ ] Ran tests with `bun test`
- [ ] Checked documentation in docs/ folder
- [ ] Searched existing issues
