#!/usr/bin/env bun

/**
 * Pattern Management CLI
 * Manage dangerous and suspicious command patterns
 * Usage: bun run scripts/patterns/manage-patterns.ts <command> [options]
 */

import { parseArgs } from 'util';
import { patternLoader } from '../../lib/command-pattern-loader.js';
import fs from 'fs';
import path from 'path';

const COMMANDS = {
  list: 'List all patterns',
  add: 'Add a new pattern',
  remove: 'Remove a pattern',
  test: 'Test a command against patterns',
  stats: 'Show pattern statistics',
  export: 'Export patterns to file',
  import: 'Import patterns from file'
};

function showHelp() {
  console.log(`
📋 Pattern Management CLI

Usage: bun run scripts/patterns/manage-patterns.ts <command> [options]

Commands:
  list [type]              List patterns (dangerous|suspicious|whitelisted|all)
  add                      Add a new pattern interactively
  test <command>           Test a command against current patterns
  stats                    Show pattern statistics
  export <file>            Export patterns to JSON file
  import <file>            Import patterns from JSON file

Options:
  --type <type>            Pattern type (dangerous|suspicious|whitelisted)
  --name <name>            Pattern name
  --pattern <regex>        Regular expression pattern
  --description <desc>     Pattern description
  --severity <level>       Severity (critical|high|medium|low)
  --enabled                Enable pattern (default: true)
  --json                   Output as JSON

Examples:
  # List all dangerous patterns
  bun run scripts/patterns/manage-patterns.ts list dangerous

  # Test a command
  bun run scripts/patterns/manage-patterns.ts test "rm -rf /tmp/test"

  # Add a custom pattern
  bun run scripts/patterns/manage-patterns.ts add \\
    --type dangerous \\
    --name "shutdown_system" \\
    --pattern "^shutdown|^reboot" \\
    --description "System shutdown/reboot" \\
    --severity high

  # Show statistics
  bun run scripts/patterns/manage-patterns.ts stats

  # Export to file
  bun run scripts/patterns/manage-patterns.ts export my-patterns.json
`);
}

function listPatterns(type = 'all', options = {}) {
  const patterns = {
    dangerous: patternLoader.dangerousPatterns,
    suspicious: patternLoader.suspiciousPatterns,
    whitelisted: patternLoader.whitelistedPatterns
  };

  if (options.json) {
    if (type === 'all') {
      console.log(JSON.stringify(patterns, null, 2));
    } else {
      console.log(JSON.stringify(patterns[type] || [], null, 2));
    }
    return;
  }

  const types = type === 'all' ? ['dangerous', 'suspicious', 'whitelisted'] : [type];

  for (const t of types) {
    if (!patterns[t]) {
      console.error(`❌ Invalid type: ${t}`);
      continue;
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`${t.toUpperCase()} PATTERNS (${patterns[t].length})`);
    console.log(`${'='.repeat(80)}\n`);

    patterns[t].forEach((pattern, index) => {
      console.log(`${index + 1}. ${pattern.name}`);
      console.log(`   Description: ${pattern.description}`);
      console.log(`   Severity: ${getSeverityEmoji(pattern.severity)} ${pattern.severity}`);
      console.log(`   Pattern: ${pattern.regex.source}`);
      if (pattern.examples && pattern.examples.length > 0) {
        console.log(`   Examples: ${pattern.examples.join(', ')}`);
      }
      console.log('');
    });
  }
}

function getSeverityEmoji(severity) {
  const emojiMap = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢'
  };
  return emojiMap[severity] || '⚪';
}

function testCommand(command, options = {}) {
  console.log(`\n🔍 Testing command: "${command}"\n`);

  const dangerous = patternLoader.isDangerous(command);
  const suspicious = patternLoader.isSuspicious(command);
  const whitelisted = patternLoader.isWhitelisted(command);

  if (options.json) {
    console.log(JSON.stringify({ dangerous, suspicious, whitelisted }, null, 2));
    return;
  }

  console.log(`Whitelisted: ${whitelisted ? '✅ YES' : '❌ NO'}`);
  console.log(`Dangerous: ${dangerous.dangerous ? '🚫 YES' : '✅ NO'}`);
  console.log(`Suspicious: ${suspicious.suspicious ? '⚠️  YES' : '✅ NO'}`);

  if (dangerous.dangerous && dangerous.matches.length > 0) {
    console.log('\n🚫 DANGEROUS MATCHES:');
    dangerous.matches.forEach(match => {
      console.log(`  ${getSeverityEmoji(match.severity)} ${match.name}: ${match.description}`);
    });
  }

  if (suspicious.suspicious && suspicious.matches.length > 0) {
    console.log('\n⚠️  SUSPICIOUS MATCHES:');
    suspicious.matches.forEach(match => {
      console.log(`  ${getSeverityEmoji(match.severity)} ${match.name}: ${match.description}`);
    });
  }

  if (whitelisted) {
    console.log('\n✅ Command is WHITELISTED (will not be blocked)');
  } else if (dangerous.dangerous) {
    console.log('\n🚫 Command will be BLOCKED');
  } else if (suspicious.suspicious) {
    console.log('\n⚠️  Command will show WARNING');
  } else {
    console.log('\n✅ Command is SAFE');
  }
}

function showStats(options = {}) {
  const stats = patternLoader.getStats();

  if (options.json) {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  console.log('\n📊 Pattern Statistics\n');
  console.log(`${'='.repeat(60)}\n`);

  console.log('🚫 DANGEROUS PATTERNS:');
  console.log(`   Total: ${stats.dangerous.total}`);
  console.log(`   🔴 Critical: ${stats.dangerous.critical}`);
  console.log(`   🟠 High: ${stats.dangerous.high}`);
  console.log('');

  console.log('⚠️  SUSPICIOUS PATTERNS:');
  console.log(`   Total: ${stats.suspicious.total}`);
  console.log(`   🟠 High: ${stats.suspicious.high}`);
  console.log(`   🟡 Medium: ${stats.suspicious.medium}`);
  console.log(`   🟢 Low: ${stats.suspicious.low}`);
  console.log('');

  console.log('✅ WHITELISTED PATTERNS:');
  console.log(`   Total: ${stats.whitelisted.total}`);
  console.log('');

  console.log('⚙️  SETTINGS:');
  console.log(`   Block dangerous by default: ${stats.settings.block_dangerous_by_default ? 'YES' : 'NO'}`);
  console.log(`   Warn on suspicious: ${stats.settings.warn_on_suspicious ? 'YES' : 'NO'}`);
  console.log(`   Log blocked commands: ${stats.settings.log_blocked_commands ? 'YES' : 'NO'}`);
  console.log(`   Case sensitive: ${stats.settings.case_sensitive ? 'YES' : 'NO'}`);
  console.log(`   Allow whitelist override: ${stats.settings.allow_whitelist_override ? 'YES' : 'NO'}`);
}

function addPattern(options) {
  if (!options.type || !options.name || !options.pattern || !options.description) {
    console.error('❌ Missing required options: --type, --name, --pattern, --description');
    process.exit(1);
  }

  const patternConfig = {
    name: options.name,
    pattern: options.pattern,
    description: options.description,
    severity: options.severity || 'medium',
    enabled: options.enabled !== false,
    examples: []
  };

  const success = patternLoader.addPattern(options.type, patternConfig);

  if (success) {
    console.log(`✅ Added ${options.type} pattern: ${options.name}`);
    
    // Save to config file
    const saved = patternLoader.save();
    if (saved) {
      console.log('✅ Saved to configuration file');
    } else {
      console.warn('⚠️  Added to runtime but failed to save to file');
    }
  } else {
    console.error('❌ Failed to add pattern');
    process.exit(1);
  }
}

function exportPatterns(filePath, options = {}) {
  try {
    const stats = patternLoader.getStats();
    const data = {
      dangerous: patternLoader.dangerousPatterns.map(p => ({
        name: p.name,
        pattern: p.regex.source,
        description: p.description,
        severity: p.severity,
        examples: p.examples
      })),
      suspicious: patternLoader.suspiciousPatterns.map(p => ({
        name: p.name,
        pattern: p.regex.source,
        description: p.description,
        severity: p.severity,
        examples: p.examples
      })),
      whitelisted: patternLoader.whitelistedPatterns.map(p => ({
        name: p.name,
        pattern: p.regex.source,
        description: p.description,
        examples: p.examples
      })),
      settings: stats.settings
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Exported patterns to: ${filePath}`);
  } catch (error) {
    console.error(`❌ Export failed: ${error.message}`);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
  showHelp();
  process.exit(0);
}

const command = args[0];
const { values } = parseArgs({
  args: args.slice(1),
  options: {
    type: { type: 'string' },
    name: { type: 'string' },
    pattern: { type: 'string' },
    description: { type: 'string' },
    severity: { type: 'string' },
    enabled: { type: 'boolean', default: true },
    json: { type: 'boolean', default: false }
  },
  strict: false,
  allowPositionals: true
});

switch (command) {
  case 'list':
    listPatterns(values.type || args[1] || 'all', values);
    break;
  
  case 'test':
    if (args.length < 2) {
      console.error('❌ Usage: test <command>');
      process.exit(1);
    }
    testCommand(args.slice(1).join(' '), values);
    break;
  
  case 'stats':
    showStats(values);
    break;
  
  case 'add':
    addPattern(values);
    break;
  
  case 'export':
    if (args.length < 2) {
      console.error('❌ Usage: export <file>');
      process.exit(1);
    }
    exportPatterns(args[1], values);
    break;
  
  default:
    console.error(`❌ Unknown command: ${command}`);
    console.log('Run with --help for usage information');
    process.exit(1);
}
