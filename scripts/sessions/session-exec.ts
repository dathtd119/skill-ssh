#!/usr/bin/env bun

/**
 * Execute command in background session with safety checks
 * Usage: bun run scripts/sessions/session-exec.ts -s <server> -c <command>
 */

import { parseArgs } from 'util';
import { configLoader } from '../../lib/config-loader.js';
import InteractiveSSHSession from '../../lib/interactive-session.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function executeInSession(options) {
  const { server, command, unsafe = false, json = false } = options;

  try {
    const envPath = path.join(__dirname, '../../.env');
    const servers = await configLoader.load({ envPath });
    const serverConfig = servers.get(server.toLowerCase());

    if (!serverConfig) {
      throw new Error(`Server "${server}" not found.`);
    }

    const session = new InteractiveSSHSession(serverConfig);
    
    if (unsafe) {
      session.blockDangerousCommands = false;
    }

    if (!json) {
      console.log(`Connecting to ${server}...`);
    }

    await session.connect();

    if (!json) {
      console.log('Analyzing command safety...');
    }

    const result = await session.executeCommand(command, { bypassSafety: unsafe });

    await session.close();

    if (json) {
      console.log(JSON.stringify({
        success: true,
        server,
        command: result.command,
        output: result.output,
        duration: result.duration,
        analysis: result.analysis
      }, null, 2));
    } else {
      console.log('\n--- Command Analysis ---');
      console.log(`Safe: ${result.analysis.safe ? '✅' : '❌'}`);
      console.log(`Dangerous: ${result.analysis.dangerous ? '🚫 YES' : 'No'}`);
      console.log(`Suspicious: ${result.analysis.suspicious ? '⚠️  YES' : 'No'}`);
      
      if (result.analysis.warnings.length > 0) {
        console.log('\nWarnings:');
        result.analysis.warnings.forEach(w => console.log(`  - ${w}`));
      }

      console.log('\n--- Output ---');
      console.log(result.output);
      
      console.log(`\n--- Completed in ${result.duration}ms ---`);
    }

    process.exit(0);
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

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    server: { type: 'string', short: 's' },
    command: { type: 'string', short: 'c' },
    unsafe: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false }
  },
  strict: false
});

if (values.help) {
  console.log(`
Usage: bun run scripts/sessions/session-exec.ts -s <server> -c <command> [options]

Execute command with safety analysis and blocking.

Options:
  -s, --server <name>     Server name (required)
  -c, --command <cmd>     Command to execute (required)
  --unsafe                Bypass safety checks (dangerous!)
  --json                  Output as JSON
  -h, --help              Show help

Examples:
  bun run scripts/sessions/session-exec.ts -s datht -c "ls -la"
  bun run scripts/sessions/session-exec.ts -s datht -c "sudo systemctl status nginx"
  bun run scripts/sessions/session-exec.ts -s datht -c "rm -rf /" --unsafe
`);
  process.exit(0);
}

if (!values.server || !values.command) {
  console.error('Error: --server and --command are required');
  process.exit(1);
}

executeInSession(values);
