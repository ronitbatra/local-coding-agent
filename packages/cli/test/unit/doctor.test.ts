import { describe, expect, it } from 'vitest';
import { type DoctorDependencies, runDoctorChecks } from '../../src/lib/doctor';

function createDependencies(
  overrides: Partial<DoctorDependencies> = {}
): Partial<DoctorDependencies> {
  const model = {
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434',
    model: 'qwen2.5-coder:14b',
    temperature: 0.2,
    contextLimit: 8_192,
  };

  return {
    execBinary: async () => ({ stdout: 'ok\n', stderr: '' }),
    checkAccess: async () => undefined,
    pathExists: () => true,
    resolveRepoRoot: () => '/repo',
    getAgentPaths: () => ({
      agentDir: '/repo/.agent',
      modelPath: '/repo/.agent/model.json',
    }),
    loadModelConfig: async () => model,
    createAdapter: () => ({
      checkServer: async () => true,
      listModels: async () => [model.model],
    }),
    ...overrides,
  };
}

describe('doctor diagnostics', () => {
  it('fails when ollama server is unavailable', async () => {
    const report = await runDoctorChecks(
      '/repo',
      createDependencies({
        createAdapter: () => ({
          checkServer: async () => false,
          listModels: async () => [],
        }),
      })
    );

    expect(report.ok).toBe(false);
    expect(report.failed).toBe(1);
    expect(report.checks.find((check) => check.id === 'ollama_server')?.status).toBe('fail');
  });

  it('fails when configured model is missing', async () => {
    const report = await runDoctorChecks(
      '/repo',
      createDependencies({
        createAdapter: () => ({
          checkServer: async () => true,
          listModels: async () => ['codellama:7b'],
        }),
      })
    );

    expect(report.ok).toBe(false);
    expect(report.checks.find((check) => check.id === 'ollama_model')?.status).toBe('fail');
  });

  it('passes when ollama server and model are configured', async () => {
    const report = await runDoctorChecks('/repo', createDependencies());

    expect(report.ok).toBe(true);
    expect(report.failed).toBe(0);
    expect(report.checks.find((check) => check.id === 'ollama_server')?.status).toBe('pass');
    expect(report.checks.find((check) => check.id === 'ollama_model')?.status).toBe('pass');
  });
});
