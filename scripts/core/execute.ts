#!/usr/bin/env bun

/**
 * Execute command on remote SSH server
 * Usage: bun run scripts/core/execute.ts -s <server> -c <command> [--cwd <dir>] [--timeout <ms>]
 */

import { parseArgs } from 'util';
import SSHManager from '../../lib/ssh-manager.js';
import { configLoader } from '../../lib/config-loader.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ExecuteOptions {
  server: string;
  command: string;
  cwd?: string;
  timeout?: number;
  json?: boolean;
}

async function executeCommand(options: ExecuteOptions) {
  const { server, command, cwd, timeout = 30000, json = false } = options;

  try {
    // Load server config
    const envPath = path.join(__dirname, '../../.env');
    const servers = await configLoader.load({ envPath });
    const serverConfig = servers.get(server.toLowerCase());

    if (!serverConfig) {
      throw new Error(`Server "${server}" not found. Run 'bun run scripts/core/list-servers.ts' to see available servers.`);
    }

    // Connect to server
    const ssh = new SSHManager(serverConfig);
    await ssh.connect();

    // Determine working directory
    const workingDir = cwd || serverConfig.default_dir;
    
    // Execute command
    const result = await ssh.execCommand(command, {
      cwd: workingDir,
      timeout
    });

    // Close connection
    ssh.dispose();

    // Output result
    if (json) {
      console.log(JSON.stringify({
        success: result.code === 0,
        server,
        command,
        workingDir,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.code
      }, null, 2));
    } else {
      if (result.code === 0) {
        console.log('✅ Command executed successfully\n');
      } else {
        console.log('❌ Command failed\n');
      }
      
      console.log(`Server: ${server}`);
      console.log(`Command: ${command}`);
      if (workingDir) {
        console.log(`Directory: ${workingDir}`);
      }
      console.log(`Exit Code: ${result.code}\n`);
      
      if (result.stdout) {
        console.log('📤 Output:');
        console.log(result.stdout);
      }
      
      if (result.stderr) {
        console.log('\n⚠️  Errors:');
        console.log(result.stderr);
      }
    }

    process.exit(result.code);
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
    command: { type: 'string', short: 'c' },
    cwd: { type: 'string' },
    timeout: { type: 'string', default: '30000' },
    json: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false }
  },
  strict: false
});

if (values.help) {
  console.log(`
Usage: bun run scripts/core/execute.ts -s <server> -c <command> [options]

Options:
  -s, --server <name>     Server name from .env configuration (required)
  -c, --command <cmd>     Command to execute (required)
  --cwd <directory>       Working directory (optional, uses server default if set)
  --timeout <ms>          Command timeout in milliseconds (default: 30000)
  --json                  Output result as JSON
  -h, --help              Show this help message

Examples:
  bun run scripts/core/execute.ts -s prod -c "ls -la"
  bun run scripts/core/execute.ts -s prod -c "git pull" --cwd /var/www/app
  bun run scripts/core/execute.ts -s staging -c "docker ps" --json
`);
  process.exit(0);
}

if (!values.server || !values.command) {
  console.error('Error: --server and --command are required');
  console.error('Run with --help for usage information');
  process.exit(1);
}

executeCommand({
  server: values.server,
  command: values.command,
  cwd: values.cwd,
  timeout: parseInt(values.timeout || '30000'),
  json: values.json
});
