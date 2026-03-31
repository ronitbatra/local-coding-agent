/**
 * CLI commands unit tests
 */

import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
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

function createBufferedRuntime(cwd: string): BufferedRuntime {
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
    await expect(parseCommand(['test'], cwd)).resolves.toMatchObject({ exitCode: 0 });
    await expect(parseCommand(['undo'], cwd)).resolves.toMatchObject({ exitCode: 0 });
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
      Pending patch: none"
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
});
