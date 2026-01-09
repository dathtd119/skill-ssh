# Interactive SSH Session Management

Advanced SSH session management with real-time command filtering, monitoring, and security controls for IT Operations.

## Features

### 🛡️ Security & Safety
- **Dangerous Command Blocking** - Automatically blocks destructive commands
- **Suspicious Pattern Detection** - Warns about risky operations
- **Command History Tracking** - Full audit trail
- **Real-time Monitoring** - stdin/stdout capture and analysis

### 🔍 Command Filtering

#### Blocked Commands (Dangerous)
These commands are automatically blocked unless `--unsafe` is used:

```bash
rm -rf /                    # Delete root filesystem
dd if=... of=/dev/sd*       # Write directly to disk
mkfs.*                      # Format filesystem
:(){ :|:& };:              # Fork bomb
chmod -R 777 /             # Dangerous permissions on root
curl ... | sh              # Pipe remote code to shell
wget ... | sh              # Pipe remote code to shell
```

#### Warned Commands (Suspicious)
These commands trigger warnings but are not blocked:

```bash
sudo rm                     # Sudo with rm
chmod 777                   # World-writable permissions
> /dev/null 2>&1           # Hidden output redirection
base64 ... | decode        # Potential obfuscation
```

## Usage

### Start Interactive Session

```bash
# Start safe session
./ssh.sh session -s datht

# Start with safety disabled (dangerous!)
./ssh.sh session -s datht --unsafe
```

**Interactive Mode:**
```
🔌 Connecting to 192.168.15.100...
✅ SSH session connected
Session ID: ssh_1736425678_abc123xyz
Server: datht@192.168.15.100

🛡️  Security features:
  - Dangerous command blocking: ENABLED
  - Command history tracking: ENABLED
  - Output monitoring: ENABLED

Type commands to execute. Press Ctrl+D or type "exit" to quit.
────────────────────────────────────────────────────────────
$ ls -la
total 48
drwxr-xr-x  5 datht datht 4096 Jan  9 16:00 .
drwxr-xr-x  3 root  root  4096 Jan  1 00:00 ..
-rw-r--r--  1 datht datht  220 Jan  1 00:00 .bash_logout
...

$ rm -rf /
🚫 BLOCKED: rm -rf /
Reason: Potentially destructive command detected
Warnings: ['Matches dangerous pattern: /^rm\s+-rf\s+\/$/']

$ sudo systemctl status nginx
⚠️  WARNING: sudo systemctl status nginx
Suspicious patterns detected: ['Suspicious pattern: /sudo\s+rm/']
● nginx.service - A high performance web server
   Loaded: loaded (/lib/systemd/system/nginx.service; enabled)
   Active: active (running) since ...
```

### Execute Single Command with Analysis

```bash
# Safe command
./ssh.sh session-exec -s datht -c "ls -la"

# Output:
Connecting to datht...
Analyzing command safety...

--- Command Analysis ---
Safe: ✅
Dangerous: No
Suspicious: No

--- Output ---
total 48
drwxr-xr-x  5 datht datht 4096 Jan  9 16:00 .
...

--- Completed in 234ms ---
```

```bash
# Dangerous command (blocked)
./ssh.sh session-exec -s datht -c "rm -rf /"

# Output:
❌ Error: Command blocked: Potentially destructive command detected
```

```bash
# Bypass safety (requires --unsafe flag)
./ssh.sh session-exec -s datht -c "rm -rf /" --unsafe

# ⚠️  This will actually execute!
```

### JSON Output for Automation

```bash
./ssh.sh session-exec -s datht -c "hostname" --json
```

```json
{
  "success": true,
  "server": "datht",
  "command": "hostname",
  "output": "test-server\n",
  "duration": 156,
  "analysis": {
    "command": "hostname",
    "safe": true,
    "dangerous": false,
    "suspicious": false,
    "warnings": [],
    "blockedReason": null
  }
}
```

## Architecture

### Background SSH Session

```
┌─────────────────────────────────────────┐
│   TypeScript Script (Bun Runtime)      │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  InteractiveSSHSession            │ │
│  │                                   │ │
│  │  - Command Analysis               │ │
│  │  - Safety Filters                 │ │
│  │  - History Tracking               │ │
│  └───────────┬───────────────────────┘ │
│              │                          │
│  ┌───────────▼───────────────────────┐ │
│  │  SSH Process (spawn)              │ │
│  │                                   │ │
│  │  stdin  ──→  Command Input        │ │
│  │  stdout ←──  Output Capture       │ │
│  │  stderr ←──  Error Capture        │ │
│  └───────────┬───────────────────────┘ │
│              │                          │
└──────────────┼──────────────────────────┘
               │
               ▼
     ┌──────────────────┐
     │  Remote Server   │
     │  192.168.15.100  │
     └──────────────────┘
```

### Event-Driven Monitoring

```javascript
session.on('connected', () => {
  console.log('Session ready');
});

session.on('output', (data) => {
  // Capture stdout
  logToFile(data);
});

session.on('blocked', ({ command, analysis }) => {
  // Command was blocked
  alertAdmin(command);
});

session.on('warning', ({ command, analysis }) => {
  // Suspicious pattern detected
  logWarning(command);
});

session.on('executed', (result) => {
  // Command completed
  auditLog(result);
});
```

## IT Operations Use Cases

### 1. Safe Production Access

```bash
# Start session with all safety checks
./ssh.sh session -s production

# Operators can work safely - dangerous commands are blocked
$ ls /var/www
$ tail -f /var/log/nginx/access.log
$ systemctl status nginx

# Destructive commands are blocked
$ rm -rf /var/www/*
🚫 BLOCKED: rm -rf /var/www/*
```

### 2. Audit Trail

All commands are logged with analysis:

```javascript
{
  command: "sudo systemctl restart nginx",
  timestamp: 1736425678000,
  analysis: {
    safe: true,
    dangerous: false,
    suspicious: true,
    warnings: ["Suspicious pattern: /sudo\s+/"]
  },
  executed: true
}
```

### 3. Automated Safety Checks

```bash
# Run command with automatic safety analysis
./ssh.sh session-exec -s prod -c "deploy-script.sh" --json

# Parse JSON to check if command was safe
{
  "success": true,
  "analysis": {
    "safe": true,
    "dangerous": false
  }
}
```

### 4. Training Environment

```bash
# New operators practice with safety enabled
./ssh.sh session -s training

# Mistakes are caught:
$ chmod 777 /etc
⚠️  WARNING: chmod 777 /etc
Suspicious patterns detected: ['chmod 777']
```

## Configuration

### Customize Dangerous Patterns

Edit `lib/interactive-session.js`:

```javascript
const DANGEROUS_COMMANDS = [
  /^rm\s+-rf\s+\/$/,           // rm -rf /
  /^dd\s+if=.*of=\/dev\/sd/,   // dd to disk
  /^mkfs/,                      // format filesystem
  
  // Add your own:
  /^DROP\s+DATABASE/i,          // SQL drop database
  /^DELETE\s+FROM.*WHERE\s+1=1/i, // Delete all records
];
```

### Customize Suspicious Patterns

```javascript
const SUSPICIOUS_PATTERNS = [
  /sudo\s+rm/,
  /chmod\s+777/,
  
  // Add your own:
  /curl.*githubusercontent/,    // Download from GitHub
  /npm\s+install.*-g/,         // Global npm install
];
```

## Security Best Practices

### ✅ Do This
- Always use SSH keys when possible
- Keep safety checks enabled in production
- Review command history regularly
- Use `--unsafe` only when absolutely necessary
- Test dangerous commands in dev environment first

### ❌ Don't Do This
- Don't disable safety in production
- Don't share sessions with `--unsafe` flag
- Don't ignore warning messages
- Don't bypass safety without understanding risks

## Advanced Features

### Command History Export

```bash
# Get last 50 commands with analysis
session.getHistory(50)
```

### Output Buffer Access

```bash
# Get last 100 output chunks
session.getOutput(100)
```

### Custom Event Handlers

```javascript
const session = new InteractiveSSHSession(config);

session.on('blocked', ({ command, analysis }) => {
  // Send alert to Slack
  sendSlackAlert(`Blocked command: ${command}`);
  
  // Log to SIEM
  logToSIEM({
    event: 'command_blocked',
    command,
    user: config.user,
    server: config.host,
    analysis
  });
});
```

## Troubleshooting

### Connection Issues

```bash
# Test basic SSH connectivity
ssh datht@192.168.15.100

# Check .env configuration
cat ssh-skill/.env | grep DATHT
```

### Commands Not Executing

```bash
# Check if session is connected
sess
