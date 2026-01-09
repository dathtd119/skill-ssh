#!/usr/bin/env bun

/**
 * Upload file to remote SSH server
 * Usage: bun run scripts/core/upload.ts -s <server> -l <local-path> -r <remote-path>
 */

import { parseArgs } from 'util';
import SSHManager from '../../lib/ssh-manager.js';
import { configLoader } from '../../lib/config-loader.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UploadOptions {
  server: string;
  local: string;
  remote: string;
  json?: boolean;
}

async function uploadFile(options: UploadOptions) {
  const { server, local, remote, json = false } = options;

  try {
    // Check if local file exists
    if (!fs.existsSync(local)) {
      throw new Error(`Local file does not exist: ${local}`);
    }

    // Get file stats
    const stats = fs.statSync(local);
    const sizeKB = (stats.size / 1024).toFixed(2);

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

    if (!json) {
      console.log(`📤 Uploading ${local} to ${server}:${remote}...`);
    }

    const startTime = Date.now();

    // Upload file
    await ssh.putFile(local, remote);

    const duration = Date.now() - startTime;

    // Close connection
    ssh.dispose();

    // Output result
    if (json) {
      console.log(JSON.stringify({
        success: true,
        server,
        local,
        remote,
        size: stats.size,
        sizeFormatted: `${sizeKB} KB`,
        duration: `${duration}ms`
      }, null, 2));
    } else {
      console.log('✅ File uploaded successfully\n');
      console.log(`Server: ${server}`);
      console.log(`Local: ${local}`);
      console.log(`Remote: ${remote}`);
      console.log(`Size: ${sizeKB} KB`);
      console.log(`Duration: ${duration}ms`);
    }

    process.exit(0);
  } catch (error) {
    if (json) {
      console.error(JSON.stringify({
        success: false,
        error: error.message
      }, null, 2));
    } else {
      console.error(`❌ Upload error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Parse CLI arguments
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    server: { type: 'string', short: 's' },
    local: { type: 'string', short: 'l' },
    remote: { type: 'string', short: 'r' },
    json: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false }
  },
  strict: false
});

if (values.help) {
  console.log(`
Usage: bun run scripts/core/upload.ts -s <server> -l <local-path> -r <remote-path>

Upload file from local system to remote server via SFTP.

Options:
  -s, --server <name>     Server name from .env configuration (required)
  -l, --local <path>      Local file path (required)
  -r, --remote <path>     Remote destination path (required)
  --json                  Output result as JSON
  -h, --help              Show this help message

Examples:
  # Upload configuration file
  bun run scripts/core/upload.ts -s prod -l ./config.json -r /etc/app/config.json

  # Upload to home directory
  bun run scripts/core/upload.ts -s prod -l ./script.sh -r ~/scripts/script.sh

  # Upload with spaces in path
  bun run scripts/core/upload.ts -s prod -l "./My File.txt" -r "/tmp/My File.txt"

Notes:
  - Overwrites existing files without confirmation
  - Creates parent directories if they don't exist
  - Preserves file modification time
  - For directory uploads, use the 'sync' tool instead
`);
  process.exit(0);
}

if (!values.server || !values.local || !values.remote) {
  console.error('Error: --server, --local, and --remote are required');
  console.error('Run with --help for usage information');
  process.exit(1);
}

uploadFile({
  server: values.server,
  local: values.local,
  remote: values.remote,
  json: values.json
});
