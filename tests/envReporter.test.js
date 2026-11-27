const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const report = require('../env-sync-checker/lib/reporter.js');

const CLI = path.join(__dirname, '..', 'env-sync-checker', 'env-check.js');

const parsed = (overrides = {}) => ({ variables: {}, duplicates: [], emptyKeys: [], ...overrides });

// Runs report() and returns what it printed, one entry per line.
const capture = (t, env, example, comparison) => {
  const log = t.mock.method(console, 'log', () => {});
  report(env, example, comparison);
  return log.mock.calls.map((call) => call.arguments.join(' '));
};

test('report lists matched variables and their count', (t) => {
  const lines = capture(t, parsed(), parsed(), {
    matchedKeys: ['PORT', 'DB_URL'],
    missingKeys: [],
    extraKeys: []
  });

  assert.deepEqual(lines, [
    'Matched Variables:',
    '✔ PORT',
    '✔ DB_URL',
    '',
    'Summary:',
    '2 Matched'
  ]);
});

test('report lists variables that are missing from or extra in .env.example', (t) => {
  const lines = capture(t, parsed(), parsed(), {
    matchedKeys: [],
    missingKeys: ['API_KEY'],
    extraKeys: ['DEBUG', 'LOG_LEVEL']
  });

  assert.deepEqual(lines, [
    '❌ Missing in .env.example:',
    '- API_KEY',
    '',
    '⚠ Extra in .env.example:',
    '- DEBUG',
    '- LOG_LEVEL',
    '',
    'Summary:',
    '1 Missing',
    '2 Extra'
  ]);
});

test('report lists duplicate keys and empty keys for both files', (t) => {
  const lines = capture(
    t,
    parsed({ duplicates: ['PORT'], emptyKeys: [3] }),
    parsed({ duplicates: ['DB_URL'], emptyKeys: [5, 8] }),
    { matchedKeys: [], missingKeys: [], extraKeys: [] }
  );

  assert.deepEqual(lines, [
    '⚠ Duplicates in .env:',
    '- PORT',
    '',
    '⚠ Duplicates in .env.example:',
    '- DB_URL',
    '',
    '⚠ Empty Keys in .env:',
    'Line 3',
    '',
    '⚠ Empty Keys in .env.example:',
    'Line 5',
    'Line 8',
    '',
    'Summary:',
    '1 Duplicates in .env',
    '1 Duplicates in .env.example',
    '1 Empty Keys in .env',
    '2 Empty Keys in .env.example'
  ]);
});

test('report prints only the summary heading when there is nothing to report', (t) => {
  const lines = capture(t, parsed(), parsed(), { matchedKeys: [], missingKeys: [], extraKeys: [] });

  assert.deepEqual(lines, ['Summary:']);
});

// Writes the two env files to a temporary folder and runs the CLI on them.
const runCli = (t, envContent, exampleContent) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-check-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const envPath = path.join(dir, '.env');
  const examplePath = path.join(dir, '.env.example');
  fs.writeFileSync(envPath, envContent);
  fs.writeFileSync(examplePath, exampleContent);

  return spawnSync(process.execPath, [CLI, '--env', envPath, '--example', examplePath], {
    encoding: 'utf8'
  });
};

test('env-check exits with 0 when both files have the same variables', (t) => {
  const result = runCli(t, 'PORT=3000\nDB_URL=postgres://localhost\n', 'PORT=\nDB_URL=\n');

  assert.equal(result.status, 0);
  assert.match(result.stdout, /2 Matched/);
});

test('env-check exits with 1 and names the variable missing from .env.example', (t) => {
  const result = runCli(t, 'PORT=3000\nAPI_KEY=secret\n', 'PORT=\n');

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Missing in \.env\.example:\n- API_KEY/);
});

test('env-check exits with 1 when a file does not exist', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-check-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const missingPath = path.join(dir, '.env');

  const result = spawnSync(process.execPath, [CLI, '--env', missingPath, '--example', missingPath], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 1);
  assert.match(result.stdout, /file not found/);
});
