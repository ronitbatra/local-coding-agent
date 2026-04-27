/**
 * CLI commands unit tests
 */

import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createProgram } from '../../src/app';
import type { CliRuntime } from '../../src/lib/runtime';

interface BufferedRuntime extends CliRuntime {
  exitCode: number | undefined;
  stdout: string[];
  stderr: string[];
}

async function createTempRepo(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'agent-cli-'));
  await writeFile(
    path.join(directory, 'package.json'),
    '{"name":"fixture","version":"1.0.0"}\n',
    'utf8'
  );
  return directory;
}

async function initializeRepo(cwd: string): Promise<void> {
  await mkdir(path.join(cwd, '.agent', 'patches'), { recursive: true });
  await mkdir(path.join(cwd, '.agent', 'sessions'), { recursive: true });
}

async function writePolicy(
  cwd: string,
  overrides: Record<string, unknown> = {},
  safeModeOverrides: Record<string, unknown> = {}
): Promise<void> {
  const policy = {
    allowedRepoRoots: [cwd],
    commandAllowlist: [],
    maxFileSize: 1024 * 1024,
    maxPatchSize: 100 * 1024,
    maxFilesChanged: 50,
    safeMode: {
      readOnly: false,
      confirmApply: true,
      confirmCommands: true,
      ...safeModeOverrides,
    },
    ...overrides,
  };

  await writeFile(
    path.join(cwd, '.agent', 'policy.json'),
    `${JSON.stringify(policy, null, 2)}\n`,
    'utf8'
  );
}

async function writeState(cwd: string, state: Record<string, unknown>): Promise<void> {
  await writeFile(
    path.join(cwd, '.agent', 'state.json'),
    `${JSON.stringify(state, null, 2)}\n`,
    'utf8'
  );
}

function createBufferedRuntime(cwd: string, isInteractive = false): BufferedRuntime {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const runtime: BufferedRuntime = {
    cwd,
    exitCode: undefined,
    stdout,
    stderr,
    io: {
      stdout: (message: string) => {
        stdout.push(message);
      },
      stderr: (message: string) => {
        stderr.push(message);
      },
      input: process.stdin,
      output: process.stdout,
      isInteractive,
    },
    setExitCode: (code: number) => {
      runtime.exitCode = code;
    },
  };

  return runtime;
}

async function parseCommand(args: string[], cwd: string): Promise<BufferedRuntime> {
  const runtime = createBufferedRuntime(cwd);
  const program = createProgram(runtime);
  await program.parseAsync(args, { from: 'user' });
  return runtime;
}

describe('CLI commands', () => {
  it('registers all milestone 1 commands', () => {
    const program = createProgram(createBufferedRuntime(process.cwd()));

    expect(program.commands.map((command) => command.name())).toEqual([
      'init',
      'ask',
      'apply',
      'test',
      'undo',
      'status',
      'doctor',
    ]);
  });

  it('parses happy-path arguments for each command', async () => {
    const cwd = await createTempRepo();

    await expect(parseCommand(['init'], cwd)).resolves.toMatchObject({ exitCode: 0 });
    await expect(parseCommand(['ask', 'add tests', '--dry-run'], cwd)).resolves.toMatchObject({
      exitCode: 0,
    });
    await expect(parseCommand(['apply', '--yes'], cwd)).resolves.toMatchObject({ exitCode: 1 });
    await expect(parseCommand(['test'], cwd)).resolves.toMatchObject({ exitCode: 1 });
    await expect(parseCommand(['undo'], cwd)).resolves.toMatchObject({ exitCode: 1 });
    await expect(parseCommand(['status', '--json'], cwd)).resolves.toMatchObject({ exitCode: 0 });
    await expect(parseCommand(['doctor'], cwd)).resolves.toMatchObject({ exitCode: 0 });
  });

  it('rejects invalid ask invocation without a task', async () => {
    const cwd = await createTempRepo();
    const runtime = createBufferedRuntime(cwd);
    const program = createProgram(runtime);
    program.exitOverride();

    await expect(program.parseAsync(['ask'], { from: 'user' })).rejects.toBeDefined();
  });

  it('matches the help output snapshot', () => {
    const program = createProgram(createBufferedRuntime(process.cwd()));

    expect(program.helpInformation()).toMatchInlineSnapshot(`
      "Usage: agent [options] [command]

      Local coding agent - CLI-first assistant

      Options:
        -V, --version         output the version number
        -h, --help            display help for command

      Commands:
        init [options]        Initialize agent configuration in current repository
        ask [options] <task>  Ask the agent to perform a coding task
        apply [options]       Apply the last proposed patch
        test [options]        Run allowlisted test commands
        undo [options]        Rollback the last applied patch
        status [options]      Show agent status and last run summary
        doctor [options]      Check system requirements (git, ripgrep, ollama, etc.)
        help [command]        display help for command
      "
    `);
  });

  it('matches the status human output snapshot', async () => {
    const cwd = await createTempRepo();
    await parseCommand(['init'], cwd);
    const runtime = await parseCommand(['status'], cwd);
    const normalizedOutput = runtime.stdout.join('\n').replaceAll(cwd, 'TMP_DIR');

    expect(normalizedOutput).toMatchInlineSnapshot(`
      "Agent Status
      Repo root: TMP_DIR
      Initialized: yes
      Agent dir: TMP_DIR/.agent
      Policy file: present
      Sessions dir: present
      Patches dir: present
      Pending patch: none
      Last applied patch: none"
    `);
  });

  it('creates the .agent scaffold during init', async () => {
    const cwd = await createTempRepo();

    await parseCommand(['init'], cwd);

    const policy = JSON.parse(await readFile(path.join(cwd, '.agent', 'policy.json'), 'utf8'));
    expect(policy.allowedRepoRoots).toEqual([cwd]);
  });

  it('returns a clear non-zero error when apply runs without a queued patch', async () => {
    const cwd = await createTempRepo();
    await parseCommand(['init'], cwd);

    const runtime = await parseCommand(['apply'], cwd);

    expect(runtime.exitCode).toBe(1);
    expect(runtime.stderr.join('\n')).toContain('No patch is currently queued.');
  });

  it('blocks apply in read-only mode', async () => {
    const cwd = await createTempRepo();
    await initializeRepo(cwd);
    await writePolicy(cwd, {}, { readOnly: true });
    await writeFile(path.join(cwd, '.agent', 'patches', 'last-proposed.patch'), '123\n', 'utf8');
    await writeState(cwd, {
      lastProposedPatchPath: path.join(cwd, '.agent', 'patches', 'last-proposed.patch'),
      lastAppliedPatchPath: null,
    });

    const runtime = await parseCommand(['apply', '--yes'], cwd);

    expect(runtime.exitCode).toBe(1);
    expect(runtime.stderr.join('\n')).toContain('safeMode.readOnly');
  });

  it('blocks apply when the queued patch exceeds maxPatchSize', async () => {
    const cwd = await createTempRepo();
    await initializeRepo(cwd);
    await writePolicy(cwd, { maxPatchSize: 4 });
    const patchPath = path.join(cwd, '.agent', 'patches', 'last-proposed.patch');
    await writeFile(patchPath, '12345\n', 'utf8');
    await writeState(cwd, {
      lastProposedPatchPath: patchPath,
      lastAppliedPatchPath: null,
    });

    const runtime = await parseCommand(['apply', '--yes'], cwd);

    expect(runtime.exitCode).toBe(1);
    expect(runtime.stderr.join('\n')).toContain('exceeds maxPatchSize');
  });

  it('requires explicit confirmation for apply in non-interactive mode', async () => {
    const cwd = await createTempRepo();
    await initializeRepo(cwd);
    await writePolicy(cwd);
    await writeFile(path.join(cwd, '.agent', 'patches', 'last-proposed.patch'), '123\n', 'utf8');
    await writeState(cwd, {
      lastProposedPatchPath: path.join(cwd, '.agent', 'patches', 'last-proposed.patch'),
      lastAppliedPatchPath: null,
    });

    const runtime = await parseCommand(['apply'], cwd);

    expect(runtime.exitCode).toBe(1);
    expect(runtime.stderr.join('\n')).toContain('Re-run with --yes');
  });

  it('applies the queued patch and clears the pending state', async () => {
    const cwd = await createTempRepo();
    await initializeRepo(cwd);
    await writePolicy(cwd, {}, { confirmApply: false });
    await writeFile(path.join(cwd, 'README.md'), 'before\n', 'utf8');
    const patchPath = path.join(cwd, '.agent', 'patches', 'last-proposed.patch');
    await writeFile(
      patchPath,
      ['--- a/README.md', '+++ b/README.md', '@@ -1,1 +1,1 @@', '-before', '+after', ''].join('\n'),
      'utf8'
    );
    await writeState(cwd, {
      lastProposedPatchPath: patchPath,
      lastAppliedPatchPath: null,
    });

    const runtime = await parseCommand(['apply'], cwd);

    expect(runtime.exitCode).toBe(0);
    expect(await readFile(path.join(cwd, 'README.md'), 'utf8')).toBe('after\n');
    expect(runtime.stdout.join('\n')).toContain('Applied patch touching 1 file(s).');

    const state = JSON.parse(await readFile(path.join(cwd, '.agent', 'state.json'), 'utf8'));
    expect(state.lastProposedPatchPath).toBeNull();
    expect(state.lastAppliedPatchPath).toContain('last-applied.patch');
  });

  it('undoes the last applied patch and restores the previous content', async () => {
    const cwd = await createTempRepo();
    await initializeRepo(cwd);
    await writePolicy(cwd, {}, { confirmApply: false });
    await writeFile(path.join(cwd, 'README.md'), 'before\n', 'utf8');
    const patchPath = path.join(cwd, '.agent', 'patches', 'last-proposed.patch');
    await writeFile(
      patchPath,
      ['--- a/README.md', '+++ b/README.md', '@@ -1,1 +1,1 @@', '-before', '+after', ''].join('\n'),
      'utf8'
    );
    await writeState(cwd, {
      lastProposedPatchPath: patchPath,
      lastAppliedPatchPath: null,
    });

    await parseCommand(['apply'], cwd);
    const runtime = await parseCommand(['undo'], cwd);

    expect(runtime.exitCode).toBe(0);
    expect(await readFile(path.join(cwd, 'README.md'), 'utf8')).toBe('before\n');
    expect(runtime.stdout.join('\n')).toContain('Rolled back the last applied patch.');
  });

  it('denies test command execution when nothing is allowlisted', async () => {
    const cwd = await createTempRepo();
    await parseCommand(['init'], cwd);

    const runtime = await parseCommand(['test'], cwd);

    expect(runtime.exitCode).toBe(1);
    expect(runtime.stderr.join('\n')).toContain('No allowlisted test command');
  });

  it('requires explicit confirmation for allowlisted test commands in non-interactive mode', async () => {
    const cwd = await createTempRepo();
    await initializeRepo(cwd);
    await writePolicy(cwd, { commandAllowlist: ['npm test'] });
    await writeState(cwd, {
      lastProposedPatchPath: null,
      lastAppliedPatchPath: null,
    });

    const runtime = await parseCommand(['test'], cwd);

    expect(runtime.exitCode).toBe(1);
    expect(runtime.stderr.join('\n')).toContain('Re-run with --yes');
  });

  it('allows non-interactive test routing when --yes is explicit', async () => {
    const cwd = await createTempRepo();
    await initializeRepo(cwd);
    await writePolicy(cwd, { commandAllowlist: ['npm test'] });
    await writeState(cwd, {
      lastProposedPatchPath: null,
      lastAppliedPatchPath: null,
    });

    const runtime = await parseCommand(['test', '--yes'], cwd);

    expect(runtime.exitCode).toBe(0);
    expect(runtime.stdout.join('\n')).toContain('Selected test command: npm test');
  });

  it('reports --no-apply intent in ask output', async () => {
    const cwd = await createTempRepo();
    await parseCommand(['init'], cwd);

    const runtime = await parseCommand(['ask', 'update docs', '--no-apply'], cwd);

    expect(runtime.exitCode).toBe(0);
    expect(runtime.stdout.join('\n')).toContain('Apply: disabled via --no-apply');
  });
});
