#!/usr/bin/env bun

/**
 * Download file from remote SSH server
 * Usage: bun run scripts/core/download.ts -s <server> -r <remote-path> -l <local-path>
 */

import { parseArgs } from 'util';
import SSHManager from '../../lib/ssh-manager.js';
import { configLoader } from '../../lib/config-loader.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DownloadOptions {
  server: string;
  remote: string;
  local: string;
  json?: boolean;
}

async function downloadFile(options: DownloadOptions) {
  const { server, remote, local, json = false } = options;

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

    if (!json) {
      console.log(`📥 Downloading ${server}:${remote} to ${local}...`);
    }

    const startTime = Date.now();

    // Download file
    await ssh.getFile(local, remote);

    const duration = Date.now() - startTime;

    // Close connection
    ssh.dispose();

    // Get downloaded file stats
    const stats = fs.statSync(local);
    const sizeKB = (stats.size / 1024).toFixed(2);

    // Output result
    if (json) {
      console.log(JSON.stringify({
        success: true,
        server,
        remote,
        local,
        size: stats.size,
        sizeFormatted: `${sizeKB} KB`,
        duration: `${duration}ms`
      }, null, 2));
    } else {
      console.log('✅ File downloaded successfully\n');
      console.log(`Server: ${server}`);
      console.log(`Remote: ${remote}`);
      console.log(`Local: ${local}`);
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
      console.error(`❌ Download error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Parse CLI arguments
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    server: { type: 'string', short: 's' },
    remote: { type: 'string', short: 'r' },
    local: { type: 'string', short: 'l' },
    json: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false }
  },
  strict: false
});

if (values.help) {
  console.log(`
Usage: bun run scripts/core/download.ts -s <server> -r <remote-path> -l <local-path>

Download file from remote server to local system via SFTP.

Options:
  -s, --server <name>     Server name from .env configuration (required)
  -r, --remote <path>     Remote file path (required)
  -l, --local <path>      Local destination path (required)
  --json                  Output result as JSON
  -h, --help              Show this help message

Examples:
  # Download log file
  bun run scripts/core/download.ts -s prod -r /var/log/nginx/error.log -l ./logs/error.log

  # Download from home directory
  bun run scripts/core/download.ts -s prod -r ~/backup.tar.gz -l ./backups/prod-backup.tar.gz

  # Download database dump
  bun run scripts/core/download.ts -s prod -r /backup/db.sql.gz -l ./db-backups/

  # JSON output for automation
  bun run scripts/core/download.ts -s prod -r /tmp/status.json -l ./status.json --json

Notes:
  - Overwrites existing local files without confirmation
  - Creates parent directories if they don't exist
  - Preserves file modification time
  - For directory downloads, use the 'sync' tool instead
`);
  process.exit(0);
}

if (!values.server || !values.remote || !values.local) {
  console.error('Error: --server, --remote, and --local are required');
  console.error('Run with --help for usage information');
  process.exit(1);
}

downloadFile({
  server: values.server,
  remote: values.remote,
  local: values.local,
  json: values.json
});
