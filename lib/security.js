/**
 * Security utilities for credential handling
 */

import fs from 'fs';
import path from 'path';

export class SecureCredentials {
  /**
   * Mask password for logging (show first/last char only)
   */
  static maskPassword(password) {
    if (!password) return 'none';
    if (password.length <= 4) return '****';
    return password[0] + '*'.repeat(password.length - 2) + password[password.length - 1];
  }

  /**
   * Sanitize config object for safe logging
   */
  static sanitizeForLog(config) {
    const safe = { ...config };
    
    if (safe.password) {
      safe.password = this.maskPassword(safe.password);
    }
    
    if (safe.sudo_password) {
      safe.sudo_password = this.maskPassword(safe.sudo_password);
    }
    
    return safe;
  }

  /**
   * Validate .env file security
   */
  static validateEnvFile(envPath) {
    const warnings = [];

    // Check if file exists
    if (!fs.existsSync(envPath)) {
      warnings.push('⚠️  .env file not found. Copy .env.example to .env');
      return warnings;
    }

    // Check file permissions (Unix-like systems)
    if (process.platform !== 'win32') {
      try {
        const stats = fs.statSync(envPath);
        const mode = (stats.mode & parseInt('777', 8)).toString(8);
        
        if (mode !== '600') {
          warnings.push(`⚠️  Insecure .env permissions (${mode}). Run: chmod 600 .env`);
        }
      } catch (err) {
        warnings.push('⚠️  Could not check .env permissions');
      }
    }

    // Check if .gitignore exists and contains .env
    const gitignorePath = path.join(path.dirname(envPath), '.gitignore');
    
    if (!fs.existsSync(gitignorePath)) {
      warnings.push('⚠️  No .gitignore found. Create one to protect .env!');
    } else {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
      if (!gitignoreContent.split('\n').some(line => line.trim() === '.env')) {
        warnings.push('⚠️  .env not in .gitignore! Add it to prevent credential leaks.');
      }
    }

    return warnings;
  }

  /**
   * Build sudo command with password injection
   */
  static buildSudoCommand(command, sudoPassword) {
    if (sudoPassword) {
      // Escape single quotes in command
      const escapedCommand = command.replace(/'/g, "'\''");
      // Use -S to read password from stdin, redirect stderr to avoid showing prompt
      return `echo "${sudoPassword}" | sudo -S sh -c '${escapedCommand}' 2>&1 | grep -v '\[sudo\] password'`;
    } else {
      // No password - either NOPASSWD configured or will prompt
      const escapedCommand = command.replace(/'/g, "'\''");
      return `sudo sh -c '${escapedCommand}'`;
    }
  }

  /**
   * Check if a path requires sudo access
   */
  static requiresSudo(remotePath) {
    const sudoPaths = [
      '/etc/',
      '/var/',
      '/usr/',
      '/opt/',
      '/srv/',
      '/root/'
    ];

    return sudoPaths.some(p => remotePath.startsWith(p));
  }

  /**
   * Get suggested ownership for common paths
   */
  static getSuggestedOwnership(remotePath) {
    if (remotePath.startsWith('/etc/')) {
      return { owner: 'root:root', permissions: '644' };
    }
    
    if (remotePath.startsWith('/var/www/')) {
      return { owner: 'www-data:www-data', permissions: '644' };
    }
    
    if (remotePath.includes('/nginx/') || remotePath.includes('/apache/')) {
      return { owner: 'root:root', permissions: '644' };
    }
    
    return { owner: null, permissions: '644' };
  }
}

export default SecureCredentials;
