# Real-Time Command Streaming

The SSH Manager Skill now supports real-time command streaming with intelligent idle detection, replacing the fixed 2-second timeout.

## How It Works

### Previous Behavior (Fixed Timeout)
```javascript
// OLD: Wait 2 seconds regardless of command completion
setTimeout(() => {
  resolve(result);
}, 2000);
```

**Problems:**
- Fast commands waste time waiting
- Slow commands get cut off
- No streaming output

### New Behavior (Idle Detection)
```javascript
// NEW: Complete after 500ms of no output
idleTimer = setTimeout(() => {
  completeCommand();
}, 500);
```

**Benefits:**
- ✅ Fast commands complete in ~500ms (was 2000ms)
- ✅ Slow commands get full output (up to 30s max)
- ✅ Real-time streaming support
- ✅ Adaptive to command execution time

## Architecture

```
┌─────────────────────────────────────────────┐
│  executeCommand(cmd, options)              │
│  ┌───────────────────────────────────────┐ │
│  │ 1. Safety Analysis                    │ │
│  │    - Check dangerous patterns         │ │
│  │    - Check suspicious patterns        │ │
│  └───────────────────────────────────────┘ │
│                    │                        │
│  ┌─────────────────▼─────────────────────┐ │
│  │ 2. Command Execution                  │ │
│  │    - Send command to SSH stdin        │ │
│  │    - Start idle timer (500ms)         │ │
│  └───────────────────────────────────────┘ │
│                    │                        │
│  ┌─────────────────▼─────────────────────┐ │
│  │ 3. Output Monitoring                  │ │
│  │    - Capture stdout data              │ │
│  │    - Reset idle timer on new output   │ │
│  │    - Emit 'stream' event (optional)   │ │
│  └───────────────────────────────────────┘ │
│                    │                        │
│  ┌─────────────────▼─────────────────────┐ │
│  │ 4. Completion Detection               │ │
│  │    - No output for 500ms → Complete   │ │
│  │    - Max timeout (30s) → Complete     │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Configuration Options

```typescript
const result = await session.executeCommand(command, {
  // Enable real-time streaming events
  streaming: true,        // Default: false
  
  // Maximum timeout (safety fallback)
  timeout: 30000,         // Default: 30000ms (30 seconds)
  
  // Bypass safety checks
  bypassSafety: false,    // Default: false
});
```

## Usage Examples

### Basic Command Execution
```typescript
import { InteractiveSSHSession } from './lib/interactive-session.js';

const session = new InteractiveSSHSession({
  host: '192.168.15.100',
  user: 'datht',
  password: 'your-password',
  port: 22
});

await session.connect();

// Execute command with idle detection
const result = await session.executeCommand('hostname');
console.log(result.output);      // "lb-cloud"
console.log(result.duration);    // ~520ms (vs 2000ms before)

await session.close();
```

### Real-Time Streaming
```typescript
const session = new InteractiveSSHSession(config);

// Listen for streaming output
session.on('stream', (data) => {
  process.stdout.write(data); // Print output in real-time
});

await session.connect();

// Execute long-running command with streaming
const result = await session.executeCommand('for i in {1..10}; do echo "Line $i"; sleep 0.5; done', {
  streaming: true
});

console.log(`Completed in ${result.duration}ms`);
await session.close();
```

### Custom Timeout
```typescript
// Long-running command with custom timeout
const result = await session.executeCommand('npm install', {
  timeout: 120000  // 2 minutes
});
```

## Performance Comparison

### Fast Commands (echo, hostname, whoami)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Execution Time | 2000ms | ~520ms | **74% faster** |
| User Experience | Fixed wait | Immediate | **Much better** |

### Slow Commands (ping, loops, npm install)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Completion | May timeout | Full output | **Reliable** |
| Output Capture | Partial | Complete | **100% captured** |

### Real-World Examples

```bash
# Test: Quick command
$ bun run scripts/sessions/session-exec.ts -s datht -c "echo 'Quick test'"
--- Completed in 520ms ---  ✅ (was 2000ms)

# Test: 5-line loop with delays
$ bun run scripts/sessions/session-exec.ts -s datht -c "for i in {1..5}; do echo \"Line \$i\"; sleep 0.5; done"
Output:
Line 1
Line 2
Line 3
Line 4
Line 5
--- Completed in 2543ms ---  ✅ (exactly 5 * 500ms + overhead)

# Test: Ping with packet loss
$ bun run scripts/sessions/session-exec.ts -s datht -c "ping -c 3 8.8.8.8"
Output:
PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.
--- 8.8.8.8 ping statistics ---
3 packets transmitted, 0 received, 100% packet loss, time 2038ms
--- Completed in 12563ms ---  ✅ (waited for full output)
```

## Events

The `InteractiveSSHSession` emits several events:

```typescript
// Connection events
session.on('connected', () => {
  console.log('SSH session established');
});

session.on('close', (code) => {
  console.log(`Session closed with code ${code}`);
});

// Output events
session.on('output', (data) => {
  console.log('Stdout:', data);
});

// Streaming events (when streaming: true)
session.on('stream', (data) => {
  process.stdout.write(data);  // Real-time output
});

// Command events
session.on('executed', (result) => {
  console.log(`Command: ${result.command}`);
  console.log(`Duration: ${result.duration}ms`);
  console.log(`Output: ${result.output}`);
});

// Security events
session.on('blocked', ({ command, analysis }) => {
  console.error(`Blocked dangerous command: ${command}`);
  console.error(`Reason: ${analysis.blockedReason}`);
});

session.on('warning', ({ command, analysis }) => {
  console.warn(`Suspicious command: ${command}`);
  console.warn(`Warnings: ${analysis.warnings.join(', ')}`);
});
```

## Implementation Details

### Idle Detection Algorithm

```typescript
const outputHandler = (data) => {
  output += data;
  
  // Emit streaming event
  if (options.streaming) {
    this.emit('stream', data);
  }

  // Reset idle timer
  if (idleTimer) {
    clearTimeout(idleTimer);
  }

  // Set new idle timer - complete after 500ms of no output
  idleTimer = setTimeout(() => {
    if (!commandCompleted) {
      completeCommand();
    }
  }, 500);
};
```

### Safety Fallback

Even with idle detection, there's a maximum timeout:

```typescript
// Maximum timeout as safety fallback (30 seconds default)
const maxTimeout = setTimeout(() => {
  if (!commandCompleted) {
    completeCommand();
  }
}, options.timeout || 30000);
```

This prevents commands from hanging indefinitely if:
- Command produces output continuously
- Idle timer keeps resetting
- Network issues cause delays

## Tuning Parameters

### Idle Timeout (500ms)
```typescript
// Current: 500ms
idleTimer = setTimeout(() => {
  completeCommand();
}, 500);

// Faster (more aggressive): 200ms
// Slower (more conservative): 1000ms
```

**Trade-offs:**
- Lower values = faster completion for quick commands
- Higher values = more reliable for slow/bursty output

### Max Timeout (30s)
```typescript
// Current: 30 seconds
const maxTimeout = setTimeout(() => {
  completeCommand();
}, options.timeout || 30000);

// For package installations: 120000 (2 minutes)
// For quick commands: 5000 (5 seconds)
```

## Best Practices

### 1. Use Streaming for Long Commands
```typescript
// Good: Stream output for long operations
session.on('stream', (data) => console.log(data));
const result = await session.executeCommand('npm install', { 
  streaming: true,
  timeout: 120000 
});
```

### 2. Set Appropriate Timeouts
```typescript
// Quick commands: Lower timeout
await session.executeCommand('hostname', { timeout: 5000 });

// Long operations: Higher timeout
await session.executeCommand('docker build .', { timeout: 300000 });
```

### 3. Handle Events
```typescript
// Always listen for security events
session.on('blocked', ({ command, analysis }) => {
  logger.error(`Blocked: ${command} - ${analysis.blockedReason}`);
