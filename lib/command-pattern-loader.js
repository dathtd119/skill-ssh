/**
 * Command Pattern Loader
 * Loads and manages dangerous/suspicious command patterns from configuration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CommandPatternLoader {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(__dirname, '../config/command-patterns.json');
    this.patterns = null;
    this.dangerousPatterns = [];
    this.suspiciousPatterns = [];
    this.whitelistedPatterns = [];
    this.settings = {};
  }

  /**
   * Load patterns from configuration file
   */
  load() {
    try {
      if (!fs.existsSync(this.configPath)) {
        logger.warn(`Pattern config not found: ${this.configPath}, using defaults`);
        this.loadDefaults();
        return;
      }

      const configContent = fs.readFileSync(this.configPath, 'utf-8');
      this.patterns = JSON.parse(configContent);

      // Load dangerous patterns
      this.dangerousPatterns = this.compilePatterns(
        this.patterns.dangerous_patterns.patterns,
        this.patterns.custom_patterns?.dangerous || []
      );

      // Load suspicious patterns
      this.suspiciousPatterns = this.compilePatterns(
        this.patterns.suspicious_patterns.patterns,
        this.patterns.custom_patterns?.suspicious || []
      );

      // Load whitelisted patterns
      this.whitelistedPatterns = this.compilePatterns(
        this.patterns.whitelisted_patterns.patterns,
        this.patterns.custom_patterns?.whitelisted || []
      );

      // Load settings
      this.settings = this.patterns.settings || {};

      logger.info(`Loaded command patterns: ${this.dangerousPatterns.length} dangerous, ${this.suspiciousPatterns.length} suspicious, ${this.whitelistedPatterns.length} whitelisted`);
    } catch (error) {
      logger.error(`Failed to load pattern config: ${error.message}`);
      this.loadDefaults();
    }
  }

  /**
   * Compile pattern objects to regex arrays
   */
  compilePatterns(defaultPatterns, customPatterns) {
    const allPatterns = [...defaultPatterns, ...customPatterns];
    const compiled = [];

    for (const pattern of allPatterns) {
      if (!pattern.enabled) continue;

      try {
        const flags = this.settings.case_sensitive ? '' : 'i';
        compiled.push({
          name: pattern.name,
          regex: new RegExp(pattern.pattern, flags),
          description: pattern.description,
          severity: pattern.severity,
          examples: pattern.examples || []
        });
      } catch (error) {
        logger.warn(`Invalid pattern '${pattern.name}': ${error.message}`);
      }
    }

    return compiled;
  }

  /**
   * Load default patterns (fallback)
   */
  loadDefaults() {
    this.dangerousPatterns = [
      {
        name: 'delete_root_filesystem',
        regex: /^rm\s+-rf\s+\/$/,
        description: 'Delete root filesystem',
        severity: 'critical'
      },
      {
        name: 'disk_write_operations',
        regex: /^dd\s+if=.*of=\/dev\/sd/,
        description: 'Direct disk write operations',
        severity: 'critical'
      },
      {
        name: 'format_filesystem',
        regex: /^mkfs/,
        description: 'Format filesystem commands',
        severity: 'critical'
      },
      {
        name: 'fork_bomb',
        regex: /^:(){ :|:& };:/,
        description: 'Fork bomb',
        severity: 'critical'
      },
      {
        name: 'chmod_777_root',
        regex: /^chmod\s+-R\s+777\s+\//,
        description: 'Recursive chmod 777 on root',
        severity: 'critical'
      },
      {
        name: 'curl_pipe_to_shell',
        regex: /^curl.*\|\s*sh/,
        description: 'Download and execute via curl',
        severity: 'high'
      },
      {
        name: 'wget_pipe_to_shell',
        regex: /^wget.*\|\s*sh/,
        description: 'Download and execute via wget',
        severity: 'high'
      }
    ];

    this.suspiciousPatterns = [
      {
        name: 'sudo_with_rm',
        regex: /sudo\s+rm/,
        description: 'Using sudo with rm',
        severity: 'medium'
      },
      {
        name: 'chmod_777',
        regex: /chmod\s+777/,
        description: 'World-writable permissions',
        severity: 'medium'
      },
      {
        name: 'redirect_to_dev_null',
        regex: />\s*\/dev\/null\s+2>&1/,
        description: 'Hiding command output',
        severity: 'low'
      },
      {
        name: 'base64_decode',
        regex: /base64.*decode/,
        description: 'Base64 decoding',
        severity: 'low'
      }
    ];

    this.whitelistedPatterns = [];
    this.settings = {
      block_dangerous_by_default: true,
      warn_on_suspicious: true,
      log_blocked_commands: true,
      case_sensitive: false,
      allow_whitelist_override: true
    };

    logger.info('Loaded default command patterns');
  }

  /**
   * Check if command matches whitelist
   */
  isWhitelisted(command) {
    if (!this.settings.allow_whitelist_override) {
      return false;
    }

    for (const pattern of this.whitelistedPatterns) {
      if (pattern.regex.test(command)) {
        logger.info(`Command whitelisted: ${pattern.name}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Check if command is dangerous
   */
  isDangerous(command) {
    // Check whitelist first
    if (this.isWhitelisted(command)) {
      return { dangerous: false, matches: [] };
    }

    const matches = [];
    for (const pattern of this.dangerousPatterns) {
      if (pattern.regex.test(command)) {
        matches.push(pattern);
      }
    }

    return {
      dangerous: matches.length > 0,
      matches
    };
  }

  /**
   * Check if command is suspicious
   */
  isSuspicious(command) {
    const matches = [];
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.regex.test(command)) {
        matches.push(pattern);
      }
    }

    return {
      suspicious: matches.length > 0,
      matches
    };
  }

  /**
   * Add custom pattern at runtime
   */
  addPattern(type, patternConfig) {
    try {
      const flags = this.settings.case_sensitive ? '' : 'i';
      const compiledPattern = {
        name: patternConfig.name,
        regex: new RegExp(patternConfig.pattern, flags),
        description: patternConfig.description,
        severity: patternConfig.severity || 'medium',
        examples: patternConfig.examples || []
      };

      switch (type) {
        case 'dangerous':
          this.dangerousPatterns.push(compiledPattern);
          break;
        case 'suspicious':
          this.suspiciousPatterns.push(compiledPattern);
          break;
        case 'whitelisted':
          this.whitelistedPatterns.push(compiledPattern);
          break;
        default:
          throw new Error(`Invalid pattern type: ${type}`);
      }

      logger.info(`Added custom ${type} pattern: ${patternConfig.name}`);
      return true;
    } catch (error) {
      logger.error(`Failed to add pattern: ${error.message}`);
      return false;
    }
  }

  /**
   * Save current patterns to config file
   */
  save() {
    try {
      // Convert compiled patterns back to config format
      const config = {
        version: this.patterns?.version || '1.0.0',
        dangerous_patterns: {
          description: 'Commands that will be BLOCKED by default',
          patterns: this.dangerousPatterns.map(p => ({
            name: p.name,
            pattern: p.regex.source,
            description: p.description,
            severity: p.severity,
            enabled: true,
            examples: p.examples
          }))
        },
        suspicious_patterns: {
          description: 'Commands that trigger WARNINGS',
          patterns: this.suspiciousPatterns.map(p => ({
            name: p.name,
            pattern: p.regex.source,
            description: p.description,
            severity: p.severity,
            enabled: true,
            examples: p.examples
          }))
        },
        whitelisted_patterns: {
          description: 'Patterns that should NEVER be blocked',
          patterns: this.whitelistedPatterns.map(p => ({
            name: p.name,
            pattern: p.regex.source,
            description: p.description,
            enabled: true,
            examples: p.examples
          }))
        },
        custom_patterns: {
          description: 'User-defined custom patterns',
          dangerous: [],
          suspicious: [],
          whitelisted: []
        },
        settings: this.settings
      };

      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      logger.info(`Saved patterns to ${this.configPath}`);
      return true;
    } catch (error) {
      logger.error(`Failed to save patterns: ${error.message}`);
      return false;
    }
  }

  /**
   * Get pattern statistics
   */
  getStats() {
    return {
      dangerous: {
        total: this.dangerousPatterns.length,
        critical: this.dangerousPatterns.filter(p => p.severity === 'critical').length,
        high: this.dangerousPatterns.filter(p => p.severity === 'high').length
      },
      suspicious: {
        total: this.suspiciousPatterns.length,
        high: this.suspiciousPatterns.filter(p => p.severity === 'high').length,
        medium: this.suspiciousPatterns.filter(p => p.severity === 'medium').length,
        low: this.suspiciousPatterns.filter(p => p.severity === 'low').length
      },
      whitelisted: {
        total: this.whitelistedPatterns.length
      },
      settings: this.settings
    };
  }
}

// Singleton instance
export const patternLoader = new CommandPatternLoader();
patternLoader.load();

export default patternLoader;
