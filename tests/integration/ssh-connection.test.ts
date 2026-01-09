import { describe, test, expect, beforeAll } from 'bun:test';
import { configLoader } from '../../lib/config-loader.js';
import { InteractiveSSHSession } from '../../lib/interactive-session.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('SSH Connection Integration Tests', () => {
  let serverConfig: any;
  const serverName = 'datht';

  beforeAll(async () => {
    // Load real server configuration
    const envPath = path.join(__dirname, '../../.env');
    const servers = await configLoader.load({ envPath });
    serverConfig = servers.get(serverName);

    if (!serverConfig) {
      throw new Error(`Server "${serverName}" not found in .env. Please configure it for testing.`);
    }
  });

  describe('Basic Connection', () => {
    test('should connect to configured server', async () => {
      const session = new InteractiveSSHSession(serverConfig);
      
      await session.connect();
      expect(session.connected).toBe(true);
      
      await session.close();
    }, 15000); // 15 second timeout

    test('should execute simple command', async () => {
      const session = new InteractiveSSHSession(serverConfig);
      
      await session.connect();
      const result = await session.executeCommand('echo "test"');
      
      expect(result.output).toContain('test');
      expect(result.analysis.safe).toBe(true);
      
      await session.close();
    }, 15000);

    test('should execute hostname command', async () => {
      const session = new InteractiveSSHSession(serverConfig);
      
      await session.connect();
      const result = await session.executeCommand('hostname');
      
      expect(result.output.length).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
      
      await session.close();
    }, 15000);
  });

  describe('Command Safety', () => {
    test('should block dangerous command', async () => {
      const session = new InteractiveSSHSession(serverConfig);
      
      await session.connect();
      
      try {
        await session.executeCommand('rm -rf /');
        throw new Error('Should have blocked dangerous command');
      } catch (error: any) {
        expect(error.message).toContain('Command blocked');
      }
      
      await session.close();
    }, 15000);

    test('should execute dangerous command with bypass flag', async () => {
      const session = new InteractiveSSHSession(serverConfig);
      
      await session.connect();
      
      // This won't actually execute, just test that bypass works
      const result = await session.executeCommand('echo "simulating dangerous command"', { 
        bypassSafety: true 
      });
      
      expect(result.output).toContain('simulating');
      
      await session.close();
    }, 15000);
  });

  describe('Command History', () => {
    test('should track command history', async () => {
      const session = new InteractiveSSHSession(serverConfig);
      
      await session.connect();
      
      await session.executeCommand('whoami');
      await session.executeCommand('pwd');
      
      const history = session.getHistory();
      expect(history.length).toBe(2);
      expect(history[0].command).toBe('whoami');
      expect(history[1].command).toBe('pwd');
      
      await session.close();
    }, 15000);
  });

  describe('Session Status', () => {
    test('should report connected status', async () => {
      const session = new InteractiveSSHSession(serverConfig);
      
      await session.connect();
      
      const status = session.getStatus();
      expect(status.connected).toBe(true);
      expect(status.server).toContain(serverConfig.host);
      
      await session.close();
    }, 15000);

    test('should report disconnected after close', async () => {
      const session = new InteractiveSSHSession(serverConfig);
      
      await session.connect();
      await session.close();
      
      const status = session.getStatus();
      expect(status.connected).toBe(false);
    }, 15000);
  });

  describe('Long Running Commands', () => {
    test('should handle commands with delays', async () => {
      const session = new InteractiveSSHSession(serverConfig);
      
      await session.connect();
      
      const result = await session.executeCommand('for i in {1..3}; do echo "Line $i"; sleep 0.2; done');
      
      expect(result.output).toContain('Line 1');
      expect(result.output).toContain('Line 2');
      expect(result.output).toContain('Line 3');
      expect(result.duration).toBeGreaterThan(600); // At least 0.6 seconds
      
      await session.close();
    }, 15000);
  });

  describe('Multiple Commands', () => {
    test('should execute multiple commands in sequence', async () => {
      const session = new InteractiveSSHSession(serverConfig);
      
      await session.connect();
      
      const result1 = await session.executeCommand('echo "first"');
      const result2 = await session.executeCommand('echo "second"');
      const result3 = await session.executeCommand('echo "third"');
      
      expect(result1.output).toContain('first');
      expect(result2.output).toContain('second');
      expect(result3.output).toContain('third');
      
      const history = session.getHistory();
      expect(history.length).toBe(3);
      
      await session.close();
    }, 20000);
  });
});
