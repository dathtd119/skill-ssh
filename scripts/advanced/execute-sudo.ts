#!/usr/bin/env bun

/**
 * Execute command with sudo privileges on remote SSH server
 * Usage: bun run scripts/advanced/execute-sudo.ts -s <server> -c <command> [-p <password>] [--cwd <dir>]
 */

import { parseArgs } from 'util';
import SSHManager from '../../lib/ssh-manager.js';
import { configLoader } from '../../lib/config-loader.js';
import { SecureCredentials } from '../../lib/security.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SudoOptions {
  server: string;
  command: string;
  password?: string;
  cwd?: string;
  timeout?: number;
  json?: boolean;
}

async function executeSudo(options: SudoOptions) {
  const { server, command, password, cwd, timeout = 30000, json = false } = options;

  try {
    // Load server config
    const envPath = path.join(__dirname, '../../.env');
    const servers = await configLoader.load({ envPath });
    const serverConfig = servers.get(server.toLowerCase());

    if (!serverConfig) {
      throw new Error(`Server "${server}" not found. Run 'bun run scripts/core/list-servers.ts' to see available servers.`);
    }

    // Determine sudo password (priority: runtime > env config > none)
    const sudoPassword = password || serverConfig.sudo_password;

    // Build sudo command
    const sudoCommand = SecureCredentials.buildSudoCommand(command, sudoPassword);

    if (!json) {
      if (sudoPassword) {
        console.log('🔐 Using sudo with configured password');
      } else {
        console.log('⚠️  No sudo password provided - will use NOPASSWD or prompt');
      }
    }

    // Connect to server
    const ssh = new SSHManager(serverConfig);
    await ssh.connect();

    // Determine working directory
    const workingDir = cwd || serverConfig.default_dir;

    // Execute sudo command
    const result = await ssh.execCommand(sudoCommand, {
      cwd: workingDir,
      timeout,
      rawCommand: true  // Don't wrap with cd, we already handle it in sudo command if needed
    });

    // Close connection
    ssh.dispose();

    // Check for common sudo errors
    const stderrLower = result.stderr.toLowerCase();
    if (stderrLower.includes('incorrect password') || stderrLower.includes('authentication failure')) {
      throw new Error('Sudo authentication failed - incorrect password');
    }
    if (stderrLower.includes('not in the sudoers file')) {
      throw new Error(`User ${serverConfig.user} is not in sudoers file`);
    }

    // Output result
    if (json) {
      console.log(JSON.stringify({
        success: result.code === 0,
        server,
        command,
        workingDir,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.code,
        sudoMode: sudoPassword ? 'password' : 'nopasswd'
      }, null, 2));
    } else {
      if (result.code === 0) {
        console.log('✅ Sudo command executed successfully\n');
      } else {
        console.log('❌ Sudo command failed\n');
      }
      
      console.log(`Server: ${server}`);
      console.log(`Command: sudo ${command}`);
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
    password: { type: 'string', short: 'p' },
    cwd: { type: 'string' },
    timeout: { type: 'string', default: '30000' },
    json: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false }
  },
  strict: false
});

if (values.help) {
  console.log(`
Usage: bun run scripts/advanced/execute-sudo.ts -s <server> -c <command> [options]

Execute commands with sudo privileges on remote server.

Sudo Password Modes:
  1. Pre-configured: Set SSH_SERVER_NAME_SUDO_PASSWORD in .env
  2. Runtime: Pass --password flag (for one-time use)
  3. NOPASSWD: Configure server sudoers (most secure for automation)

Options:
  -s, --server <name>     Server name from .env configuration (required)
  -c, --command <cmd>     Command to execute with sudo (required)
  -p, --password <pass>   Sudo password (optional, overrides .env)
  --cwd <directory>       Working directory (optional)
  --timeout <ms>          Command timeout in milliseconds (default: 30000)
  --json                  Output result as JSON
  -h, --help              Show this help message

Examples:
  # Using pre-configured sudo password from .env
  bun run scripts/advanced/execute-sudo.ts -s prod -c "systemctl restart nginx"

  # Using runtime sudo password
  bun run scripts/advanced/execute-sudo.ts -s prod -c "apt update" -p "mypass"

  # NOPASSWD mode (no password needed)
  bun run scripts/advanced/execute-sudo.ts -s prod -c "docker ps"

  # With working directory
  bun run scripts/advanced/execute-sudo.ts -s prod -c "chown www-data:www-data ." --cwd /var/www

Security Best Practices:
  ✅ Configure NOPASSWD in sudoers for automated scripts (most secure)
  ✅ Use pre-configured password in .env for deployments
  ⚠️  Runtime password is least secure (visible in process list)
`);
  process.exit(0);
}

if (!values.server || !values.command) {
  console.error('Error: --server and --command are required');
  console.error('Run with --help for usage information');
  process.exit(1);
}

executeSudo({
  server: values.server,
  command: values.command,
  password: values.password,
  cwd: values.cwd,
  timeout: parseInt(values.timeout || '30000'),
  json: values.json
});
