/**
 * Interactive SSH Session Manager
 * Manages background SSH sessions with stdin/stdout monitoring and command filtering
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { patternLoader } from './command-pattern-loader.js';

export class InteractiveSSHSession extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.sshProcess = null;
    this.connected = false;
    this.sessionId = `ssh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.commandHistory = [];
    this.outputBuffer = [];
    this.blockDangerousCommands = true;
    this.requireConfirmation = true;
    this.startTime = Date.now();
  }

  /**
   * Start the SSH session in background
   */
  async connect() {
    return new Promise((resolve, reject) => {
      const sshArgs = [
        this.config.user + '@' + this.config.host,
        '-p', String(this.config.port || 22),
      ];

      // Add SSH key if specified
      if (this.config.keypath) {
        const keyPath = this.config.keypath.replace('~', process.env.HOME || '~');
        sshArgs.push('-i', keyPath);
      }

      // Add options for persistent connection
      sshArgs.push(
        '-o', 'ServerAliveInterval=60',
        '-o', 'ServerAliveCountMax=3',
        '-o', 'StrictHostKeyChecking=accept-new'
      );

      // Spawn SSH process
      this.sshProcess = spawn('ssh', sshArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          TERM: 'xterm-256color'
        }
      });

      // Handle stdout
      this.sshProcess.stdout.on('data', (data) => {
        const output = data.toString();
        this.outputBuffer.push({
          type: 'stdout',
          data: output,
          timestamp: Date.now()
        });
        this.emit('output', output);
      });

      // Handle stderr (includes connection messages, not just errors)
      this.sshProcess.stderr.on('data', (data) => {
        const output = data.toString();
        this.outputBuffer.push({
          type: 'stderr',
          data: output,
          timestamp: Date.now()
        });
        // Don't emit as unhandled error - just log to buffer
        // Most stderr output is informational (SSH warnings, command errors, etc.)
      });

      // Handle process exit
      this.sshProcess.on('close', (code) => {
        this.connected = false;
        this.emit('close', code);
      });

      // Handle process error
      this.sshProcess.on('error', (err) => {
        reject(err);
      });

      // Wait for connection
      const connectionTimeout = setTimeout(() => {
        reject(new Error('SSH connection timeout'));
      }, 10000);

      // Handle password authentication first
      let passwordSent = false;
      if (this.config.password) {
        const passwordHandler = (data) => {
          const output = data.toString();
          if (output.toLowerCase().includes('password:') && !passwordSent) {
            passwordSent = true;
            this.sshProcess.stdin.write(this.config.password + '\n');
          }
        };
        this.sshProcess.stderr.on('data', passwordHandler);
      }

      // Listen for successful connection - check both stdout and stderr
      const checkConnection = (data) => {
        const output = data.toString();
        // Look for shell prompt or successful login indicators
        if (output.includes('$') || output.includes('#') || output.includes('>') || 
            output.includes('Last login') || output.includes('Welcome')) {
          clearTimeout(connectionTimeout);
          this.connected = true;
          this.sshProcess.stdout.removeListener('data', checkConnection);
          this.sshProcess.stderr.removeListener('data', checkConnectionStderr);
          this.emit('connected');
          resolve();
        }
      };

      const checkConnectionStderr = (data) => {
        const output = data.toString();
        // Check stderr for login success messages
        if (output.includes('Last login') || output.includes('Welcome')) {
          clearTimeout(connectionTimeout);
          this.connected = true;
          this.sshProcess.stdout.removeListener('data', checkConnection);
          this.sshProcess.stderr.removeListener('data', checkConnectionStderr);
          this.emit('connected');
          resolve();
        }
      };

      this.sshProcess.stdout.on('data', checkConnection);
      this.sshProcess.stderr.on('data', checkConnectionStderr);
    });
  }

  /**
   * Check if command is dangerous
   */
  isDangerousCommand(command) {
    const result = patternLoader.isDangerous(command);
    return result.dangerous;
  }

  /**
   * Check if command is suspicious
   */
  isSuspiciousCommand(command) {
    const result = patternLoader.isSuspicious(command);
    return result.suspicious;
  }

  /**
   * Get detailed pattern matches for a command
   */
  getPatternMatches(command) {
    return {
      dangerous: patternLoader.isDangerous(command),
      suspicious: patternLoader.isSuspicious(command),
      whitelisted: patternLoader.isWhitelisted(command)
    };
  }

  /**
   * Analyze command safety
   */
  analyzeCommand(command) {
    const matches = this.getPatternMatches(command);
    
    const analysis = {
      command,
      safe: true,
      dangerous: false,
      suspicious: false,
      whitelisted: matches.whitelisted,
      warnings: [],
      blockedReason: null,
      matchedPatterns: {
        dangerous: [],
        suspicious: []
      }
    };

    // Check for dangerous commands
    if (matches.dangerous.dangerous && !matches.whitelisted) {
      analysis.dangerous = true;
      analysis.safe = false;
      analysis.blockedReason = 'Potentially destructive command detected';
      
      matches.dangerous.matches.forEach(pattern => {
        analysis.warnings.push(`[${pattern.severity.toUpperCase()}] ${pattern.description}`);
        analysis.matchedPatterns.dangerous.push({
          name: pattern.name,
          description: pattern.description,
          severity: pattern.severity
        });
      });
    }

    // Check for suspicious commands
    if (matches.suspicious.suspicious) {
      analysis.suspicious = true;
      
      matches.suspicious.matches.forEach(pattern => {
        analysis.warnings.push(`[${pattern.severity.toUpperCase()}] ${pattern.description}`);
        analysis.matchedPatterns.suspicious.push({
          name: pattern.name,
          description: pattern.description,
          severity: pattern.severity
        });
      });
    }

    return analysis;
  }

  /**
   * Execute command in the session with safety checks
   */
  async executeCommand(command, options = {}) {
    if (!this.connected) {
      throw new Error('SSH session not connected');
    }

    const {
      bypassSafety = false,
      requireConfirmation = this.requireConfirmation
    } = options;

    // Analyze command safety
    const analysis = this.analyzeCommand(command);

    // Block dangerous commands unless bypassed
    if (analysis.dangerous && this.blockDangerousCommands && !bypassSafety) {
      this.emit('blocked', { command, analysis });
      throw new Error(`Command blocked: ${analysis.blockedReason}`);
    }

    // Emit warning for suspicious commands
    if (analysis.suspicious) {
      this.emit('warning', { command, analysis });
    }

    // Log command
    this.commandHistory.push({
      command,
      timestamp: Date.now(),
      analysis,
      executed: true
    });

    // Execute command with streaming support
    return new Promise((resolve, reject) => {
      let output = '';
      const startTime = Date.now();
      let commandCompleted = false;
      let idleTimer = null;

      const outputHandler = (data) => {
        output += data;
        
        // Emit streaming event for real-time output
        if (options.streaming) {
          this.emit('stream', data);
        }

        // Reset idle timer on new output
        if (idleTimer) {
          clearTimeout(idleTimer);
        }

        // Set idle timer - complete after 500ms of no output
        idleTimer = setTimeout(() => {
          if (!commandCompleted) {
            completeCommand();
          }
        }, 500);
      };

      const completeCommand = () => {
        if (commandCompleted) return;
        commandCompleted = true;

        if (idleTimer) {
          clearTimeout(idleTimer);
        }
        this.removeListener('output', outputHandler);
        
        const result = {
          command,
          output,
          duration: Date.now() - startTime,
          analysis
        };

        this.emit('executed', result);
        resolve(result);
      };

      this.on('output', outputHandler);

      // Send command
      this.sshProcess.stdin.write(command + '\n');

      // Maximum timeout as safety fallback (30 seconds)
      const maxTimeout = setTimeout(() => {
        if (!commandCompleted) {
          completeCommand();
        }
      }, options.timeout || 30000);
    });
  }

  /**
   * Send raw input to stdin
   */
  sendInput(data) {
    if (!this.connected) {
      throw new Error('SSH session not connected');
    }
    this.sshProcess.stdin.write(data);
  }

  /**
   * Get command history
   */
  getHistory(limit = 50) {
    return this.commandHistory.slice(-limit);
  }

  /**
   * Get output buffer
   */
  getOutput(limit = 100) {
    return this.outputBuffer.slice(-limit);
  }

  /**
   * Close the session
   */
  async close() {
    if (this.sshProcess) {
      this.sshProcess.stdin.write('exit\n');
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this.sshProcess.kill('SIGTERM');
          resolve();
        }, 2000);

        this.sshProcess.on('close', () => {
          clearTimeout(timeout);
          this.connected = false;
          resolve();
        });
      });
    }
  }

  /**
   * Get session status
   */
  getStatus() {
    return {
      sessionId: this.sessionId,
      connected: this.connected,
      server: `${this.config.user}@${this.config.host}:${this.config.port || 22}`,
      uptime: this.connected ? Date.now() - this.startTime : 0,
      commandCount: this.commandHistory.length,
      blockedCommands: this.commandHistory.filter(h => h.analysis?.dangerous && !h.executed).length,
      suspiciousCommands: this.commandHistory.filter(h => h.analysis?.suspicious).length
    };
  }
}

export default InteractiveSSHSession;
