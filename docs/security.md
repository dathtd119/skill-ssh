# Security Guide - SSH Manager Skill

Comprehensive security best practices for managing SSH credentials and operations.

## 🔐 Authentication Methods

### SSH Key Authentication (Recommended)

**Why SSH Keys?**
- More secure than passwords
- Cannot be brute-forced
- Can be revoked without changing passwords
- Supports automation without storing passwords

**Setup:**

```bash
# 1. Generate SSH key pair (if you don't have one)
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 2. Copy public key to server
ssh-copy-id -i ~/.ssh/id_rsa.pub user@server

# 3. Configure in .env
SSH_SERVER_PROD_KEYPATH=~/.ssh/id_rsa

# 4. Secure the private key
chmod 600 ~/.ssh/id_rsa
```

### Password Authentication

**When to use:**
- Temporary access
- Server doesn't support key auth
- Testing/development environments

**Security measures:**

```bash
# In .env
SSH_SERVER_DEV_PASSWORD=complex_password_here

# Secure the .env file
chmod 600 .env

# Never commit to git
echo ".env" >> .gitignore
```

**Password Requirements:**
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Unique per server
- Rotate every 90 days

## 🛡️ Sudo Password Management

### Option 1: NOPASSWD (Most Secure for Automation)

**Configure server sudoers:**

```bash
# On remote server
sudo visudo

# Add line (replace username):
username ALL=(ALL) NOPASSWD: ALL

# Or limit to specific commands:
username ALL=(ALL) NOPASSWD: /usr/bin/systemctl, /usr/bin/docker
```

**Benefits:**
- No password stored anywhere
- No password transmitted
- Audit trail via system logs
- Easy to revoke (remove from sudoers)

**In .env:**
```bash
# No sudo password needed
# Leave SSH_SERVER_PROD_SUDO_PASSWORD empty or omit
```

### Option 2: Pre-configured Password (For Automation)

**Use when:**
- Cannot modify sudoers
- Need sudo for multiple commands
- Running scheduled tasks

**In .env:**
```bash
SSH_SERVER_PROD_SUDO_PASSWORD=sudo_password_here
```

**Security considerations:**
- Password stored in plain text
- Must secure .env file (chmod 600)
- Rotate password regularly
- Use different password than SSH password

### Option 3: Runtime Password (Manual Operations)

**Use when:**
- One-time sudo operation
- Different users need different sudo passwords
- Interactive operations

**Usage:**
```bash
bun run sudo -s prod -c "apt update" -p "runtime_password"
```

**Security considerations:**
- Visible in process list during execution
- Visible in shell history
- Not suitable for automation
- Use for manual operations only

## 🔒 .env File Security

### File Permissions

```bash
# Set restrictive permissions (owner read/write only)
chmod 600 .env

# Verify permissions
ls -la .env
# Should show: -rw------- (600)

# On shared systems, also check directory permissions
chmod 700 $(dirname .env)
```

### Git Protection

```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore

# Verify it's ignored
git check-ignore .env
# Should output: .env

# Remove from git if accidentally committed
git rm --cached .env
git commit -m "Remove .env from version control"
```

### Backup Strategy

```bash
# Create encrypted backup
gpg -c .env
# Creates .env.gpg (encrypted)

# Store encrypted backup securely
mv .env.gpg ~/secure-backups/

# Restore when needed
gpg .env.gpg
# Decrypts to .env
```

### Environment Separation

```bash
# Use different .env files per environment
.env.production
.env.staging
.env.development

# Load specific environment
cp .env.production .env  # When deploying to production
chmod 600 .env
```

## 🚨 Common Security Mistakes

### ❌ DON'T Do This

```bash
# DON'T commit .env to git
git add .env
git commit -m "Add configuration"  # NEVER!

# DON'T share .env via chat/email
cat .env | mail admin@example.com  # NEVER!

# DON'T use weak permissions
chmod 644 .env  # WRONG! Anyone can read it

# DON'T use the same password everywhere
SSH_SERVER_PROD_PASSWORD=same123
SSH_SERVER_PROD_SUDO_PASSWORD=same123  # WRONG!

# DON'T log passwords
console.log('Password:', password)  # NEVER!

# DON'T hardcode credentials in scripts
const password = 'hardcoded123'  # NEVER!
```

### ✅ DO This Instead

```bash
# DO use SSH keys
SSH_SERVER_PROD_KEYPATH=~/.ssh/id_rsa

# DO secure .env file
chmod 600 .env

# DO use password manager for backups
# Store encrypted .env.gpg in password manager

# DO use different passwords
SSH_SERVER_PROD_PASSWORD=ComplexPass1!
SSH_SERVER_PROD_SUDO_PASSWORD=DifferentPass2@

# DO use credential masking
const masked = SecureCredentials.maskPassword(password)
console.log('Password:', masked)  # Output: C*********3

# DO use environment variables
const password = process.env.SSH_PASSWORD
```

## 🔍 Security Auditing

### Automated Checks

The skill automatically validates security:

```bash
# Run any script - automatic validation
bun run list

# Output includes warnings:
# ⚠️  Security Warnings:
#   ⚠️  Insecure .env permissions (644). Run: chmod 600 .env
#   ⚠️  .env not in .gitignore! Add it to prevent credential leaks.
```

### Manual Audit Checklist

```bash
# 1. Check .env permissions
ls -la .env
# Expected: -rw------- (600)

# 2. Verify .gitignore
git check-ignore .env
# Expected: .env

# 3. Check for committed secrets
git log --all --full-history -- .env
# Expected: no results

# 4. Scan for hardcoded credentials
grep -r "password.*=" scripts/ lib/
# Expected: no results

# 5. Verify SSH key permissions
ls -la ~/.ssh/id_rsa
# Expected: -rw------- (600)
```

## 🔐 Advanced Security

### SSH Key with Passphrase

```bash
# Generate key with passphrase
ssh-keygen -t ed25519 -C "your_email@example.com"
# Enter passphrase when prompted

# Use ssh-agent to cache passphrase
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Configure in .env
SSH_SERVER_PROD_KEYPATH=~/.ssh/id_ed25519
```

### Certificate-Based Authentication

```bash
# Generate certificate (requires CA)
ssh-keygen -s ca_key -I user_id -n username -V +52w user_key.pub

# Configure in .env
SSH_SERVER_PROD_KEYPATH=~/.ssh/user_key-cert.pub
```

### Multi-Factor Authentication

```bash
# If server requires MFA, use interactive mode
# Cannot automate commands requiring MFA prompts
# Consider using jump hosts with MFA for automation
```

### Jump Host Configuration

```bash
# For servers behind bastion/jump host
# Configure SSH config (~/.ssh/config):
Host prod
  HostName internal.server.com
  User admin
  ProxyJump bastion.example.com
  IdentityFile ~/.ssh/prod_key

# In .env, use config alias
SSH_SERVER_PROD_HOST=prod  # Uses SSH config
SSH_SERVER_PROD_USER=admin
SSH_SERVER_PROD_KEYPATH=~/.ssh/prod_key
```

## 📋 Security Compliance

### SOC 2 / ISO 27001 Recommendations

1. **Credential Rotation**
   - SSH passwords: Every 90 days
   - Sudo passwords: Every 90 days
   - SSH keys: Every 365 days

2. **Access Logging**
   - All operations logged via system logger
   - Review logs regularly
   - Set up alerts for failed authentications

3. **Least Privilege**
   - Use NOPASSWD with specific commands only
   - Create separate users per application
   - Don't use root user

4. **Audit Trail**
   - Enable server-side SSH logging
   - Use `logger` for important operations
   - Keep logs for minimum 90 days

### PCI DSS Recommendations

1. **Network Segmentation**
   - Use jump hosts for production access
   - Separate credentials per environment
   - No direct access to production

2. **Encryption**
   - Use SSH protocol version 2 only
   - Disable weak ciphers
   - Use strong key exchange algorithms

3. **Access Control**
   - Implement role-based access
   - Regular access reviews
   - Immediate revocation on termination

## 🆘 Incident Response

### Credential Compromise

If credentials are compromised:

```bash
# 1. Immediately rotate credentials
# Generate new SSH key
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_new

# 2. Update server
