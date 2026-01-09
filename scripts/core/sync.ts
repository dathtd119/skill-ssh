#!/usr/bin/env bun

/**
 * Synchronize files between local and remote using rsync
 * Usage: bun run scripts/core/sync.ts -s <server> --source <path> --dest <path>
 */

import { parseArgs } from 'util';
import { configLoader } from '../../lib/config-loader.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SyncOptions {
  server: string;
  source: string;
  dest: string;
  exclude?: string[];
  dryRun?: boolean;
  delete?: boolean;
  compress?: boolean;
  json?: boolean;
}

async function syncFiles(options: SyncOptions) {
  const { server, source, dest, exclude = [], dryRun = false, delete: deleteFiles = false, compress = true, json = false } = options;

  try {
    // Load server config
    const envPath = path.join(__dirname, '../../.env');
    const servers = await configLoader.load({ envPath });
    const serverConfig = servers.get(server.toLowerCase());

    if (!serverConfig) {
      throw new Error(`Server "${server}" not found. Run 'bun run scripts/core/list-servers.ts' to see available servers.`);
    }

    // Parse source and destination
    const isLocalSource = source.startsWith('local:');
    const isRemoteSource = source.startsWith('remote:');
    const isLocalDest = dest.startsWith('local:');
    const isRemoteDest = dest.startsWith('remote:');

    // Validate direction
    if ((isLocalSource && isLocalDest) || (isRemoteSource && isRemoteDest)) {
      throw new Error('Source and destination must be different (one local, one remote). Use prefixes: local: or remote:');
    }

    const cleanSource = source.replace(/^(local:|remote:)/, '');
    const cleanDest = dest.replace(/^(local:|remote:)/, '');
    const direction = (isLocalSource || (!isLocalSource && !isRemoteSource)) ? 'push' : 'pull';

    // Build rsync command
    const rsyncOptions = compress ? ['-avz'] : ['-av'];
    
    if (deleteFiles) rsyncOptions.push('--delete');
    if (dryRun) rsyncOptions.push('--dry-run');
    
    exclude.forEach(pattern => {
      rsyncOptions.push('--exclude', pattern);
    });

    // Build SSH options
    const sshOptions = [];
    if (serverConfig.keypath) {
      const keyPath = serverConfig.keypath.replace('~', process.env.HOME || '~');
      sshOptions.push('-i', keyPath);
    }
    if (serverConfig.port && serverConfig.port !== 22) {
      sshOptions.push('-p', String(serverConfig.port));
    }

    // Build rsync command
    let rsyncCommand: string;
    let rsyncArgs: string[] = [];

    if (serverConfig.password) {
      // Use sshpass for password auth
      rsyncCommand = 'sshpass';
      rsyncArgs.push('-p', serverConfig.password, 'rsync');
      rsyncArgs.push(...rsyncOptions);
      rsyncArgs.push('-e', `ssh ${sshOptions.join(' ')}`);
    } else {
      // Direct rsync for key auth
      rsyncCommand = 'rsync';
      rsyncArgs.push(...rsyncOptions);
      rsyncArgs.push('-e', `ssh ${sshOptions.join(' ')}`);
    }

    // Add source and destination
    if (direction === 'push') {
      rsyncArgs.push(cleanSource);
      rsyncArgs.push(`${serverConfig.user}@${serverConfig.host}:${cleanDest}`);
    } else {
      rsyncArgs.push(`${serverConfig.user}@${serverConfig.host}:${cleanSource}`);
      rsyncArgs.push(cleanDest);
    }

    if (!json) {
      console.log(`🔄 Starting rsync ${direction}...`);
      console.log(`Server: ${server}`);
      console.log(`Direction: ${direction === 'push' ? 'Local → Remote' : 'Remote → Local'}`);
      if (dryRun) console.log('Mode: DRY RUN (no changes will be made)');
    }

    // Execute rsync
    const result = await new Promise<{ code: number; output: string }>((resolve, reject) => {
      const process = spawn(rsyncCommand, rsyncArgs);
      let output = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        resolve({ code: code || 0, output });
      });

      process.on('error', (err) => {
        reject(new Error(`Failed to start rsync: ${err.message}`));
      });
    });

    if (result.code !== 0) {
      throw new Error(`Rsync failed with exit code ${result.code}\n${result.output}`);
    }

    // Parse output for stats
    const filesMatch = result.output.match(/Number of files transferred: (\d+)/);
    const sizeMatch = result.output.match(/Total transferred file size: ([\d,]+) bytes/);
    
    const stats = {
      filesTransferred: filesMatch ? parseInt(filesMatch[1]) : 0,
      totalSize: sizeMatch ? parseInt(sizeMatch[1].replace(/,/g, '')) : 0
    };

    if (json) {
      console.log(JSON.stringify({
        success: true,
        server,
        direction,
        source: cleanSource,
        dest: cleanDest,
        stats,
        dryRun
      }, null, 2));
    } else {
      console.log(dryRun ? '\n🔍 Dry run completed' : '\n✅ Sync completed successfully');
      console.log(`Files transferred: ${stats.filesTransferred}`);
      if (stats.totalSize > 0) {
        const sizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);
        console.log(`Total size: ${sizeMB} MB`);
      }
    }

    process.exit(0);
  } catch (error) {
    if (json) {
      console.error(JSON.stringify({
        success: false,
        error: error.message
      }, null, 2));
    } else {
      console.error(`❌ Sync error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Parse CLI arguments
const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    server: { type: 'string', short: 's' },
    source: { type: 'string' },
    dest: { type: 'string' },
    exclude: { type: 'string', multiple: true },
    'dry-run': { type: 'boolean', default: false },
    delete: { type: 'boolean', default: false },
    compress: { type: 'boolean', default: true },
    json: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false }
  },
  strict: false,
  allowPositionals: true
});

if (values.help) {
  console.log(`
Usage: bun run scripts/core/sync.ts -s <server> --source <path> --dest <path> [options]

Synchronize files/directories between local and remote using rsync.

Options:
  -s, --server <name>     Server name from .env configuration (required)
  --source <path>         Source path with prefix (required)
                          - local:./path for local path
                          - remote:/path for remote path
  --dest <path>           Destination path with prefix (required)
  --exclude <pattern>     Exclude pattern (can be repeated)
  --dry-run               Preview changes without applying them
  --delete                Delete files in dest not in source
  --compress              Compress during transfer (default: true)
  --json                  Output result as JSON
  -h, --help              Show this help message

Examples:
  # Push local to remote
  bun run scripts/core/sync.ts -s prod \
    --source local:./build \
    --dest remote:/var/www/html

  # Pull remote to local
  bun run scripts/core/sync.ts -s prod \
    --source remote:/var/log \
    --dest local:./logs

  # With exclusions
  bun run scripts/core/sync.ts -s prod \
    --source local:./app \
    --dest remote:/var/www/app \
    --exclude "node_modules" \
    --exclude "*.log" \
    --exclude ".git"

  # Dry run (preview only)
  bun run scripts/core/sync.ts -s prod \
    --source local:./build \
    --dest remote:/var/www \
    --dry-run

  # Mirror (delete extra files)
  bun run scripts/core/sync.ts -s prod \
    --source local:./dist \
    --dest remote:/var/www/static \
    --delete

Requirements:
  - rsync must be installed on both local and remote systems
  - sshpass requir
