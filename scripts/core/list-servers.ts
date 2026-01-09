#!/usr/bin/env bun

/**
 * List all configured SSH servers
 * Usage: bun run scripts/core/list-servers.ts [--json]
 */

import { configLoader } from '../../lib/config-loader.js';
import { SecureCredentials } from '../../lib/security.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ServerInfo {
  name: string;
  host: string;
  user: string;
  port: number;
  authMethod: 'key' | 'password';
  defaultDir?: string;
  description?: string;
  hasSudoPassword: boolean;
}

async function listServers(outputJson = false) {
  try {
    // Load server configurations
    const envPath = path.join(__dirname, '../../.env');
    const servers = await configLoader.load({ envPath });

    if (servers.size === 0) {
      if (outputJson) {
        console.log(JSON.stringify({ success: true, servers: [], count: 0 }, null, 2));
      } else {
        console.log('No servers configured.');
        console.log('\nTo add servers, edit .env file with format:');
        console.log('SSH_SERVER_NAME_HOST=hostname');
        console.log('SSH_SERVER_NAME_USER=username');
        console.log('SSH_SERVER_NAME_KEYPATH=~/.ssh/id_rsa');
      }
      return;
    }

    const serverList: ServerInfo[] = [];

    for (const [name, config] of servers) {
      serverList.push({
        name,
        host: config.host,
        user: config.user,
        port: config.port || 22,
        authMethod: config.keypath ? 'key' : 'password',
        defaultDir: config.default_dir,
        description: config.description,
        hasSudoPassword: !!config.sudo_password
      });
    }

    if (outputJson) {
      console.log(JSON.stringify({
        success: true,
        servers: serverList,
        count: serverList.length
      }, null, 2));
    } else {
      console.log('📋 Configured SSH Servers\n');
      console.log('━'.repeat(80));
      
      serverList.forEach((server, index) => {
        console.log(`\n${index + 1}. ${server.name}`);
        console.log(`   Host: ${server.user}@${server.host}:${server.port}`);
        console.log(`   Auth: ${server.authMethod === 'key' ? '🔑 SSH Key' : '🔒 Password'}`);
        
        if (server.defaultDir) {
          console.log(`   Default Dir: ${server.defaultDir}`);
        }
        
        if (server.hasSudoPassword) {
          console.log(`   Sudo: ✅ Configured`);
        }
        
        if (server.description) {
          console.log(`   Description: ${server.description}`);
        }
      });

      console.log('\n' + '━'.repeat(80));
      console.log(`Total: ${serverList.length} server(s) configured`);
      
      // Security warnings
      const warnings = SecureCredentials.validateEnvFile(envPath);
      if (warnings.length > 0) {
        console.log('\n⚠️  Security Warnings:');
        warnings.forEach(w => console.log(`   ${w}`));
      }
    }
  } catch (error) {
    if (outputJson) {
      console.error(JSON.stringify({
        success: false,
        error: error.message
      }, null, 2));
    } else {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const outputJson = args.includes('--json');

listServers(outputJson);
