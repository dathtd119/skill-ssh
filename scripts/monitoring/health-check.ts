#!/usr/bin/env bun

/**
 * Perform health check on remote SSH server
 * Usage: bun run scripts/monitoring/health-check.ts -s <server> [--detailed]
 */

import { parseArgs } from 'util';
import SSHManager from '../../lib/ssh-manager.js';
import { configLoader } from '../../lib/config-loader.js';
import {
  buildCPUCheckCommand,
  buildMemoryCheckCommand,
  buildDiskCheckCommand,
  buildUptimeCommand,
  parseCPUUsage,
  parseMemoryUsage,
  parseDiskUsage,
  determineOverallHealth
} from '../../lib/health-monitor.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface HealthCheckOptions {
  server: string;
  detailed?: boolean;
  json?: boolean;
}

async function healthCheck(options: HealthCheckOptions) {
  const { server, detailed = false, json = false } = options;

  try {
    // Load server config
    const envPath = path.join(__dirname, '../../.env');
    const servers = await configLoader.load({ envPath });
    const serverConfig = servers.get(server.toLowerCase());

    if (!serverConfig) {
      throw new Error(`Server "${server}" not found.`);
    }

    // Connect to server
    const ssh = new SSHManager(serverConfig);
    await ssh.connect();

    if (!json) {
      console.log(`🏥 Health Check: ${server}\n`);
    }

    // Collect health metrics
    const metrics: any = {};

    // CPU Usage
    const cpuResult = await ssh.execCommand(buildCPUCheckCommand());
    metrics.cpu = parseCPUUsage(cpuResult.stdout);

    // Memory Usage
    const memResult = await ssh.execCommand(buildMemoryCheckCommand());
    metrics.memory = parseMemoryUsage(memResult.stdout);

    // Disk Usage
    const diskResult = await ssh.execCommand(buildDiskCheckCommand());
    metrics.disk = parseDiskUsage(diskResult.stdout);

    // Uptime
    const uptimeResult = await ssh.execCommand(buildUptimeCommand());
    metrics.uptime = uptimeResult.stdout.trim();

    // Determine overall health
    const overallHealth = determineOverallHealth(metrics);

    ssh.dispose();

    // Output results
    if (json) {
      console.log(JSON.stringify({
        success: true,
        server,
        health: overallHealth,
        metrics
      }, null, 2));
    } else {
      const healthIcon = overallHealth === 'healthy' ? '✅' : overallHealth === 'warning' ? '⚠️' : '❌';
      console.log(`${healthIcon} Overall Health: ${overallHealth.toUpperCase()}\n`);
      
      console.log('📊 Metrics:');
      console.log(`   CPU Usage: ${metrics.cpu.usage}%`);
      console.log(`   Memory Usage: ${metrics.memory.usedPercent}% (${metrics.memory.used} / ${metrics.memory.total})`);
      console.log(`   Disk Usage: ${metrics.disk.usedPercent}% (${metrics.disk.used} / ${metrics.disk.total})`);
      console.log(`   Uptime: ${metrics.uptime}`);

      if (detailed) {
        console.log('\n📋 Detailed Information:');
        console.log(`   Load Average: ${metrics.cpu.loadAverage || 'N/A'}`);
        console.log(`   Free Memory: ${metrics.memory.free}`);
        console.log(`   Available Disk: ${metrics.disk.available}`);
      }

      if (overallHealth !== 'healthy') {
        console.log('\n⚠️  Warnings:');
        if (metrics.cpu.usage > 80) console.log('   - High CPU usage detected');
        if (metrics.memory.usedPercent > 80) console.log('   - High memory usage detected');
        if (metrics.disk.usedPercent > 80) console.log('   - Low disk space');
      }
    }

    process.exit(overallHealth === 'healthy' ? 0 : 1);
  } catch (error) {
    if (json) {
      console.error(JSON.stringify({
        success: false,
        error: error.message
      }, null, 2));
    } else {
      console.error(`❌ Health check failed: ${error.message}`);
    }
    process.exit(1);
  }
}

// Parse CLI arguments
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    server: { type: 'string', short: 's' },
    detailed: { type: 'boolean', short: 'd', default: false },
    json: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false }
  },
  strict: false
});

if (values.help) {
  console.log(`
Usage: bun run scripts/monitoring/health-check.ts -s <server> [options]

Perform comprehensive health check on remote server.

Checks:
  - CPU usage
  - Memory usage
  - Disk usage
  - System uptime
  - Overall health status

Options:
  -s, --server <name>     Server name from .env configuration (required)
  -d, --detailed          Show detailed health information
  --json                  Output result as JSON
  -h, --help              Show this help message

Examples:
  # Quick health check
  bun run scripts/monitoring/health-check.ts -s prod

  # Detailed health check
  bun run scripts/monitoring/health-check.ts -s prod --detailed

  # JSON output for monitoring
  bun run scripts/monitoring/health-check.ts -s prod --json

Health Status:
  - healthy: All metrics within normal range
  - warning: One or more metrics elevated (60-80%)
  - critical: One or more metrics in danger zone (>80%)

Exit Codes:
  0 - Healthy
  1 - Warning or Critical
`);
  process.exit(0);
}

if (!values.server) {
  console.error('Error: --server is required');
  console.error('Run with --help for usage information');
  process.exit(1);
}

healthCheck({
  server: values.server,
  detailed: values.detailed,
  json: values.json
});
