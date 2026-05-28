# Milestone 6 Implementation Notes

## Scope

Milestone 6 (Agent Loop v1) is implemented with a single-iteration flow:

- create plan
- retrieve minimal context
- request patch from model
- validate output contract
- stop and return patch proposal

This milestone does not auto-apply patches; it feeds the existing `agent apply` flow.

## Plan Followed

1. Implement the core `AgentRunner` as a single-pass loop with event emission.
2. Implement retrieval in `gatherContext` using ripgrep + targeted file reads.
3. Enforce strict patch output contract so prose in PATCH is rejected.
4. Integrate `agent ask` with `AgentRunner`.
5. Add tests for loop behavior, output enforcement, and integration with patch validation.
6. Run lint/build/tests and document the results.

## Changes Made

### 1. Agent loop implementation

Implemented [AgentRunner.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/core/src/runtime/AgentRunner.ts):

- added a real single-iteration runtime:
  - emits `tool_call` and `tool_result` for retrieval
  - builds prompt from gathered context
  - calls LLM once
  - parses strict structured output
  - validates patch contract
  - emits `plan` and `patch_proposed`
- returns structured run result:
  - parsed output
  - raw model output
  - prompt
  - gathered context
  - proposed patch file count

### 2. Retrieval implementation

Implemented [gather.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/core/src/context/gather.ts):

- uses `rg` to find relevant matches
- groups hits by file
- reads a bounded set of top files
- truncates file content for prompt safety (line and character caps)
- degrades safely to empty context if ripgrep is unavailable or errors

### 3. Output contract enforcement

Extended [formats.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/core/src/prompts/formats.ts):

- added `validatePatchOutputContract(patch)`
- rejects:
  - empty patch strings
  - markdown fences in patch
  - prose before unified diff headers
  - invalid unified diff structure

This enforces the Milestone 6 requirement that PATCH must be extractable/valid and not mixed with prose.

### 4. CLI ask integration with loop

Updated [shared.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/cli/src/commands/shared.ts) and [ask.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/cli/src/commands/ask.ts):

- `handleAsk` now accepts `runtime` and uses `AgentRunner`
- session log events from the loop are persisted via the existing session store
- model patch output is parsed and policy-validated before queueing
- queued patch still writes to `.agent/patches/last-proposed.patch` and updates `.agent/state.json`

### 5. Core exports

Updated [index.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/core/src/index.ts) to export context modules used by the new loop.

## Tests Added/Updated

### New tests

- [agentRunner.test.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/core/test/unit/agentRunner.test.ts)
  - single-iteration flow success
  - event ordering coverage
  - rejection of prose in patch section
  - deterministic behavior for identical input/context with deterministic LLM

### Updated tests

- [formats.test.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/core/test/unit/formats.test.ts)
  - added explicit prose-before-patch rejection test
- [commands.test.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/cli/test/unit/commands.test.ts)
  - validates queued ask patch passes unified diff parser and policy validator
  - verifies ask fails when model emits prose in patch field

## Verification

Passed:

- `npm run lint`
- `npm run build`
- `npm test`

Notes:

- Commander still prints `missing required argument 'task'` in one invalid-args test path; this is expected and tests still pass.
