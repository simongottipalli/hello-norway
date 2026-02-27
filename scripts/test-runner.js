#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function parseArgs() {
  const args = process.argv.slice(2);

  const flags = {
    unit: args.includes('--unit'),
    e2e: args.includes('--e2e'),
    watch: args.includes('--watch'),
    ui: args.includes('--ui'),
    coverage: args.includes('--coverage'),
    parallel: args.includes('--parallel'),
    headed: args.includes('--headed'),
    debug: args.includes('--debug'),
    help: args.includes('--help') || args.includes('-h'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  };

  if (!flags.unit && !flags.e2e) {
    flags.unit = true;
    flags.e2e = true;
  }

  return flags;
}

function showHelp() {
  log('\n📋 Unified Test Runner\n', colors.bright);
  log('Usage: npm test [-- options]\n');
  log('Options:', colors.cyan);
  log('  --unit              Run unit/integration tests (Vitest)');
  log('  --e2e               Run end-to-end tests (Playwright)');
  log('  --watch             Run in watch mode');
  log('  --ui                Run with interactive UI');
  log('  --coverage          Generate coverage report (unit tests only)');
  log('  --parallel          Run unit and E2E tests in parallel');
  log('  --headed            Show browser during E2E tests');
  log('  --debug             Run in debug mode');
  log('  --verbose, -v       Verbose output');
  log('  --help, -h          Show this help message\n');
  log('Examples:', colors.yellow);
  log('  npm test                      # Run all tests');
  log('  npm test -- --unit            # Run only unit tests');
  log('  npm test -- --e2e             # Run only E2E tests');
  log('  npm test -- --unit --watch    # Watch unit tests');
  log('  npm test -- --e2e --headed    # E2E with visible browser');
  log('  npm test -- --coverage        # Unit tests with coverage');
  log('  npm test -- --parallel        # Run all tests in parallel\n');
}

function runCommand(command, args, label) {
  return new Promise((resolve, reject) => {
    log(`\n${colors.bright}${colors.blue}▶ Running ${label}...${colors.reset}\n`);

    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(`\n${colors.green}✓ ${label} passed${colors.reset}\n`);
        resolve({ success: true, label });
      } else {
        log(`\n${colors.red}✗ ${label} failed with exit code ${code}${colors.reset}\n`);
        resolve({ success: false, label, code });
      }
    });

    child.on('error', (error) => {
      log(`\n${colors.red}✗ ${label} error: ${error.message}${colors.reset}\n`);
      reject(error);
    });
  });
}

function runParallel(commands) {
  return Promise.all(commands.map(({ command, args, label }) => {
    return runCommand(command, args, label);
  }));
}

async function main() {
  const flags = parseArgs();

  if (flags.help) {
    showHelp();
    process.exit(0);
  }

  log(`\n${colors.bright}${colors.cyan}🧪 Hello Norway Test Suite${colors.reset}\n`);

  const results = [];

  try {
    if (flags.parallel && flags.unit && flags.e2e) {
      log('Running tests in parallel mode...\n', colors.yellow);

      const commands = [];

      if (flags.unit) {
        const unitArgs = ['run'];
        if (flags.coverage) unitArgs.push('--coverage');
        if (flags.verbose) unitArgs.push('--reporter=verbose');
        commands.push({
          command: 'npx',
          args: ['vitest', ...unitArgs],
          label: 'Unit Tests',
        });
      }

      if (flags.e2e) {
        const e2eArgs = [];
        if (flags.headed) e2eArgs.push('--headed');
        if (flags.debug) e2eArgs.push('--debug');
        commands.push({
          command: 'npx',
          args: ['playwright', 'test', ...e2eArgs],
          label: 'E2E Tests',
        });
      }

      const parallelResults = await runParallel(commands);
      results.push(...parallelResults);

    } else {
      if (flags.unit) {
        const unitArgs = [];

        if (flags.watch) {
          unitArgs.push('vitest');
        } else {
          unitArgs.push('vitest', 'run');
        }

        if (flags.coverage) unitArgs.push('--coverage');
        if (flags.ui) unitArgs.push('--ui');
        if (flags.verbose) unitArgs.push('--reporter=verbose');

        const result = await runCommand('npx', unitArgs, 'Unit Tests');
        results.push(result);
      }

      if (flags.e2e && !flags.watch) {
        const e2eArgs = ['playwright', 'test'];

        if (flags.ui) e2eArgs.push('--ui');
        if (flags.headed) e2eArgs.push('--headed');
        if (flags.debug) e2eArgs.push('--debug');

        const result = await runCommand('npx', e2eArgs, 'E2E Tests');
        results.push(result);
      } else if (flags.e2e && flags.watch) {
        log(`\n${colors.yellow}⚠ Watch mode is not supported for E2E tests. Use --ui instead.${colors.reset}\n`);
      }
    }

    log(`\n${colors.bright}═══════════════════════════════════════${colors.reset}`);
    log(`${colors.bright}           TEST SUMMARY${colors.reset}`);
    log(`${colors.bright}═══════════════════════════════════════${colors.reset}\n`);

    const allPassed = results.every(r => r.success);

    results.forEach(({ success, label }) => {
      const icon = success ? '✓' : '✗';
      const color = success ? colors.green : colors.red;
      log(`  ${color}${icon} ${label}${colors.reset}`);
    });

    log('');

    if (allPassed) {
      log(`${colors.green}${colors.bright}All tests passed! 🎉${colors.reset}\n`);
      process.exit(0);
    } else {
      log(`${colors.red}${colors.bright}Some tests failed.${colors.reset}\n`);
      process.exit(1);
    }

  } catch (error) {
    log(`\n${colors.red}Error running tests: ${error.message}${colors.reset}\n`);
    process.exit(1);
  }
}

main();
