# Milestone 5 Implementation Notes

## Scope

This milestone adds the first AI integration layer using Ollama:

- real Ollama adapter (availability checks, model listing, chat completion, streaming path)
- strict JSON tool-calling/output contract parser
- prompt templates for strict JSON output
- local model selection config (`.agent/model.json`)
- CLI `ask` integration with Ollama-backed response handling and patch queueing

## Plan Followed

1. Review all root/docs markdown files and map Milestone 5 requirements to current code.
2. Implement core model primitives first (`OllamaAdapter`, model config, strict output parser, prompt contract).
3. Integrate model config + adapter into CLI `ask` flow and write proposed patches to existing patch queue path.
4. Add contract and regression tests, then run lint/build/tests.

## What Changed

### 1. Ollama adapter implementation

Implemented in [ollama.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/core/src/model/adapters/ollama.ts):

- `checkServer()` via `GET /api/tags`
- `listModels()` via `GET /api/tags`
- `complete()` via `POST /api/chat`
- `stream()` via streamed `/api/chat` JSONL chunks
- retry/backoff for transient failures
- timeout handling with actionable errors when `ollama serve` is unavailable
- actionable “model not found” error including `ollama pull <model>`

### 2. Model config support

Added [config.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/core/src/model/config.ts):

- `ModelConfig` interface
- `DEFAULT_MODEL_CONFIG`
- `normalizeModelConfig()`

Then wired this into CLI agent scaffolding:

- [agentFs.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/cli/src/lib/agentFs.ts) now creates `.agent/model.json` during `agent init`
- [model.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/cli/src/lib/model.ts) loads and validates model config

### 3. Strict JSON tool-calling contract

Implemented in [formats.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/core/src/prompts/formats.ts):

- strict parser for:
  - `plan: string`
  - `patch: string | null`
  - `commands: string[]`
  - `done: boolean`
  - `tool_calls: { tool: string; args: object }[]`
- rejects unknown keys and malformed fields
- supports fenced JSON cleanup

### 4. Prompt updates for strict JSON mode

Updated:

- [system.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/core/src/prompts/system.ts)
- [templates.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/core/src/prompts/templates.ts)

Both now enforce “JSON only” response instructions and the exact output schema.

### 5. `ask` command now uses Ollama

Updated [shared.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/cli/src/commands/shared.ts):

- loads model config
- checks Ollama server availability
- builds run prompt + system prompt
- calls Ollama adapter completion
- parses strict JSON contract
- if `patch` is present, writes it to `.agent/patches/last-proposed.patch` and updates `.agent/state.json`
- returns structured model results in command output

Also updated status/init output to include model config file visibility.

## Tests Added/Updated

### Core tests

- [formats.test.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/core/test/unit/formats.test.ts)
  - validates strict JSON parsing behavior
- [ollamaAdapter.test.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/core/test/unit/ollamaAdapter.test.ts)
  - verifies request shape
  - verifies retry behavior
  - verifies model-not-found error clarity
  - includes optional real Ollama integration test gated by `OLLAMA_TESTS=1`

### CLI tests

Updated [commands.test.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/cli/test/unit/commands.test.ts):

- stubs `fetch` for deterministic `ask` behavior
- updates `status` snapshot for model config line
- verifies `ask` output content under strict JSON response
- verifies patch queue state update when model returns a patch

## Verification

Passed:

- `npm run lint`
- `npm run build`
- `npm test`

Notes:

- the existing Commander invalid-args test still emits `missing required argument 'task'` during tests; this is expected and does not fail the suite.
