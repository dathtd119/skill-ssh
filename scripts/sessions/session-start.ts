#!/usr/bin/env bun

/**
 * Start an interactive SSH session with command filtering
 * Usage: bun run scripts/sessions/session-start.ts -s <server> [--unsafe]
 */

import { parseArgs } from 'util';
import { configLoader } from '../../lib/config-loader.js';
import InteractiveSSHSession from '../../lib/interactive-session.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SessionOptions {
  server: string;
  unsafe?: boolean;
  json?: boolean;
}

async function startSession(options: SessionOptions) {
  const { server, unsafe = false, json = false } = options;

  try {
    // Load server config
    const envPath = path.join(__dirname, '../../.env');
    const servers = await configLoader.load({ envPath });
    const serverConfig = servers.get(server.toLowerCase());

    if (!serverConfig) {
      throw new Error(`Server "${server}" not found.`);
    }

    // Create session
    const session = new InteractiveSSHSession(serverConfig);
    
    // Disable safety if requested
    if (unsafe) {
      session.blockDangerousCommands = false;
      if (!json) {
        console.log('⚠️  WARNING: Safety checks disabled!');
      }
    }

    // Setup event listeners
    session.on('connected', () => {
      if (!json) {
        console.log('✅ SSH session connected');
        console.log(`Session ID: ${session.sessionId}`);
        console.log(`Server: ${serverConfig.user}@${serverConfig.host}`);
        console.log('');
        console.log('🛡️  Security features:');
        console.log('  - Dangerous command blocking: ' + (session.blockDangerousCommands ? 'ENABLED' : 'DISABLED'));
        console.log('  - Command history tracking: ENABLED');
        console.log('  - Output monitoring: ENABLED');
        console.log('');
      }
    });

    session.on('output', (data) => {
      if (!json) {
        process.stdout.write(data);
      }
    });

    session.on('error', (data) => {
      if (!json) {
        process.stderr.write(data);
      }
    });

    session.on('blocked', ({ command, analysis }) => {
      console.error(`\n🚫 BLOCKED: ${command}`);
      console.error(`Reason: ${analysis.blockedReason}`);
      console.error('Warnings:', analysis.warnings);
      console.error('');
    });

    session.on('warning', ({ command, analysis }) => {
      console.warn(`\n⚠️  WARNING: ${command}`);
      console.warn('Suspicious patterns detected:', analysis.warnings);
      console.warn('');
    });

    // Connect
    if (!json) {
      console.log(`🔌 Connecting to ${serverConfig.host}...`);
    }
    
    await session.connect();

    if (json) {
      console.log(JSON.stringify({
        success: true,
        sessionId: session.sessionId,
        server: `${serverConfig.user}@${serverConfig.host}`,
        safetyEnabled: session.blockDangerousCommands
      }, null, 2));
    } else {
      console.log('Type commands to execute. Press Ctrl+D or type "exit" to quit.');
      console.log('─'.repeat(60));
    }

    // Interactive mode
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let inputBuffer = '';

    process.stdin.on('data', async (key) => {
      const char = key.toString();

      // Handle Ctrl+C
      if (char === '\u0003') {
        console.log('\nClosing session...');
        await session.close();
        process.exit(0);
      }

      // Handle Ctrl+D
      if (char === '\u0004') {
        console.log('\nClosing session...');
        await session.close();
        process.exit(0);
      }

      // Handle backspace
      if (char === '\u007F') {
        if (inputBuffer.length > 0) {
          inputBuffer = inputBuffer.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }

      // Handle enter
      if (char === '\r' || char === '\n') {
        process.stdout.write('\n');
        
        if (inputBuffer.trim()) {
          try {
            await session.executeCommand(inputBuffer.trim());
          } catch (error) {
            console.error(`Error: ${error.message}`);
          }
        }
        
        inputBuffer = '';
        return;
      }

      // Regular character
      inputBuffer += char;
      process.stdout.write(char);
    });

    // Handle session close
    session.on('close', (code) => {
      console.log(`\nSession closed with code ${code}`);
      process.exit(code);
    });

  } catch (error) {
    if (json) {
      console.error(JSON.stringify({
        success: false,
        error: error.message
      }, null, 2));
    } else {
      console.error(`❌ Error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Parse CLI arguments
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    server: { type: 'string', short: 's' },
    unsafe: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false }
  },
  strict: false
});

if (values.help) {
  console.log(`
Usage: bun run scripts/sessions/session-start.ts -s <server> [options]

Start an interactive SSH session with command filtering and monitoring.

Security Features:
  - Dangerous command blocking (rm -rf /, dd, mkfs, fork bombs, etc.)
  - Suspicious pattern detection (sudo rm, chmod 777, etc.)
  - Command history tracking
  - Real-time output monitoring

Options:
  -s, --server <name>     Server name from .env configuration (required)
  --unsafe                Disable dangerous command blocking (use with caution!)
  --json                  Output as JSON
  -h, --help              Show this help message

Examples:
  # Start safe session
  bun run scripts/sessions/session-start.ts -s prod

  # Start session with safety disabled (dangerous!)
  bun run scripts/sessions/session-start.ts -s dev --unsafe

Blocked Commands:
  - rm -rf /
  - dd if=... of=/dev/sd*
  - mkfs (format filesystem)
  - Fork bombs
  - chmod -R 777 /
  - curl/wget | sh

Suspicious Patterns (warnings):
  - sudo rm
  - chmod 777
  - Redirects to /dev/null
  - base64 decode
`);
  process.exit(0);
}

if (!values.server) {
  console.error('Error: --server is required');
  console.error('Run with --help for usage information');
  process.exit(1);
}

startSession({
  server: values.server,
  unsafe: values.unsafe,
  json: values.json
});
