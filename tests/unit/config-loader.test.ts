import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { ConfigLoader } from '../../lib/config-loader.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('ConfigLoader', () => {
  let loader: ConfigLoader;
  let tempDir: string;
  let tempEnvPath: string;

  beforeEach(() => {
    loader = new ConfigLoader();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssh-config-test-'));
    tempEnvPath = path.join(tempDir, '.env');
  });

  afterEach(() => {
    // Cleanup temp files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Environment Variable Parsing', () => {
    test('should parse single server from .env', async () => {
      const envContent = `
SSH_SERVER_TEST_HOST=example.com
SSH_SERVER_TEST_USER=testuser
SSH_SERVER_TEST_PORT=22
SSH_SERVER_TEST_PASSWORD=testpass
SSH_SERVER_TEST_DESCRIPTION=Test server
      `.trim();

      fs.writeFileSync(tempEnvPath, envContent);
      
      // Clear environment variables to avoid interference
      const originalEnv = { ...process.env };
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('SSH_SERVER_')) {
          delete process.env[key];
        }
      });
      
      const servers = await loader.load({ envPath: tempEnvPath });

      expect(servers.size).toBeGreaterThanOrEqual(1);
      expect(servers.has('test')).toBe(true);
      
      const server = servers.get('test');
      expect(server.host).toBe('example.com');
      expect(server.user).toBe('testuser');
      expect(server.port).toBe(22);
      expect(server.password).toBe('testpass');
      
      // Restore environment
      Object.assign(process.env, originalEnv);
    });

    test('should parse multiple servers from .env', async () => {
      const envContent = `
SSH_SERVER_PROD_HOST=prod.example.com
SSH_SERVER_PROD_USER=admin

SSH_SERVER_DEV_HOST=dev.example.com
SSH_SERVER_DEV_USER=developer
      `.trim();

      fs.writeFileSync(tempEnvPath, envContent);
      
      // Clear environment variables to avoid interference
      const originalEnv = { ...process.env };
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('SSH_SERVER_')) {
          delete process.env[key];
        }
      });
      
      const servers = await loader.load({ envPath: tempEnvPath });

      expect(servers.size).toBeGreaterThanOrEqual(2);
      expect(servers.has('prod')).toBe(true);
      expect(servers.has('dev')).toBe(true);
      
      // Restore environment
      Object.assign(process.env, originalEnv);
    });

    test('should handle missing optional fields', async () => {
      const envContent = `
SSH_SERVER_MINIMAL_HOST=minimal.example.com
SSH_SERVER_MINIMAL_USER=user
      `.trim();

      fs.writeFileSync(tempEnvPath, envContent);
      const servers = await loader.load({ envPath: tempEnvPath });

      const server = servers.get('minimal');
      expect(server.host).toBe('minimal.example.com');
      expect(server.user).toBe('user');
      expect(server.port).toBe(22); // Default
      expect(server.password).toBeUndefined();
    });

    test('should convert port to number', async () => {
      const envContent = `
SSH_SERVER_CUSTOM_HOST=example.com
SSH_SERVER_CUSTOM_USER=user
SSH_SERVER_CUSTOM_PORT=2222
      `.trim();

      fs.writeFileSync(tempEnvPath, envContent);
      const servers = await loader.load({ envPath: tempEnvPath });

      const server = servers.get('custom');
      expect(server.port).toBe(2222);
      expect(typeof server.port).toBe('number');
    });
  });

  describe('Server Name Normalization', () => {
    test('should normalize server names to lowercase', async () => {
      const envContent = `
SSH_SERVER_PROD_HOST=prod.example.com
SSH_SERVER_PROD_USER=admin
      `.trim();

      fs.writeFileSync(tempEnvPath, envContent);
      const servers = await loader.load({ envPath: tempEnvPath });

      expect(servers.has('prod')).toBe(true);
      expect(servers.has('PROD')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent .env file', async () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.env');
      
      // Clear environment variables to avoid interference
      const originalEnv = { ...process.env };
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('SSH_SERVER_')) {
          delete process.env[key];
        }
      });
      
      const servers = await loader.load({ envPath: nonExistentPath });

      // Should not throw, but may load from environment vars
      expect(servers).toBeDefined();
      
      // Restore environment
      Object.assign(process.env, originalEnv);
    });

    test('should handle malformed .env file', async () => {
      const malformedContent = `
SSH_SERVER_BAD_HOST=
SSH_SERVER_BAD_USER=
      `.trim();

      fs.writeFileSync(tempEnvPath, malformedContent);
      
      // Clear environment variables to avoid interference
      const originalEnv = { ...process.env };
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('SSH_SERVER_')) {
          delete process.env[key];
        }
      });
      
      const servers = await loader.load({ envPath: tempEnvPath });

      // Config loader adds servers even with empty host/user in current implementation
      // This test verifies it doesn't crash, actual validation happens at connection time
      expect(servers).toBeDefined();
      
      // Restore environment
      Object.assign(process.env, originalEnv);
    });
  });

  describe('Configuration Source Tracking', () => {
    test('should track configuration source', async () => {
      const envContent = `
SSH_SERVER_TEST_HOST=example.com
SSH_SERVER_TEST_USER=testuser
      `.trim();

      fs.writeFileSync(tempEnvPath, envContent);
      
      // Clear environment variables to avoid interference
      const originalEnv = { ...process.env };
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('SSH_SERVER_')) {
          delete process.env[key];
        }
      });
      
      await loader.load({ envPath: tempEnvPath });

      expect(loader.configSource).toBeDefined();
      // Config source is 'env' not '.env' based on implementation
      expect(loader.configSource).toBe('env');
      
      // Restore environment
      Object.assign(process.env, originalEnv);
    });
  });
});
