# Milestone 7 Implementation Notes

## Scope

Milestone 7 (Apply + Test Loop / Autopilot-lite) has been implemented with:

- optional iterative ask loop (`--autopilot`)
- real allowlisted command execution with timeout/output truncation
- command discovery from repo shape + policy allowlist
- test execution wired into `agent test`
- failure-stop behavior for autopilot after two failing test runs

## Plan Followed

1. Implement safe command execution primitive in core.
2. Improve test command discovery while preserving policy allowlist constraints.
3. Replace milestone placeholder behavior in `agent test` with real execution.
4. Add optional autopilot flow to `agent ask` that applies patch + runs tests + one corrective retry.
5. Add/update tests and run verification.

## Changes Made

### 1. Core command runner

Implemented [runCommand.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/core/src/tools/shell/runCommand.ts):

- policy allowlist enforcement before execution
- pinned working directory to repo root
- timeout handling (`SIGTERM`, then `SIGKILL`)
- output truncation cap
- structured result:
  - `exitCode`
  - `stdout`
  - `stderr`
  - `timedOut`
  - `truncated`

Exported via [index.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/core/src/index.ts).

### 2. Test command discovery

Updated [policy.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/cli/src/lib/policy.ts):

- added `discoverTestCommand(repoRoot, policy)`
- detects likely test ecosystem from files:
  - `package.json` → `npm/pnpm/yarn/vitest`
  - `pytest.ini`/`pyproject.toml`/`requirements.txt` → `pytest`
  - `go.mod` → `go test ./...`
- still requires allowlisting (safety preserved)
- falls back to first allowlisted command

### 3. Real `agent test` execution

Updated [shared.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/cli/src/commands/shared.ts):

- replaced “deferred until Milestone 7” behavior
- `handleTest` now:
  - resolves command via discovery
  - enforces policy + confirmation
  - executes via `RunCommandTool`
  - emits command session events
  - returns success on pass, non-zero on failure/timeout

### 4. Optional autopilot ask loop

Updated [ask.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/cli/src/commands/ask.ts):

- new `--autopilot` flag
- new `--yes` flag for prompt bypass in autopilot mode

Updated [shared.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/cli/src/commands/shared.ts):

- extracted helpers:
  - queue patch
  - apply queued patch
  - execute allowlisted command
- `handleAsk` now supports:
  - normal proposal mode (existing behavior)
  - autopilot mode (opt-in):
    1. run model loop
    2. validate + apply patch
    3. run discovered allowlisted test command
    4. if failing, feed command output back for one corrective patch attempt
    5. stop after second failure with clear summary and keep latest diff applied

This matches the “stability stop” milestone requirement.

## Tests Added/Updated

### Core

Added [runCommandTool.test.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/core/test/unit/runCommandTool.test.ts):

- allowlisted command execution success
- deny non-allowlisted command
- timeout behavior

### CLI

Updated [commands.test.ts](/Users/sampark/Desktop/CS/Projects/local-coding-agent/packages/cli/test/unit/commands.test.ts):

- updated `agent test` expectations for real execution
- added autopilot integration test for apply + test flow

## Verification Status

Passed:

- `npm run lint`
- `npm run build`

Blocked locally:

- `npm test` is currently blocked by a local dependency extraction issue after `npm ci`:
  - `ERR_MODULE_NOT_FOUND` for `signal-exit/dist/mjs/index.js`
  - this is an environment/package-install problem in local `node_modules`, not a TypeScript compile failure in the code changes

## Notes

- Autopilot is opt-in via `--autopilot`; default ask behavior remains proposal-oriented.
- Command execution remains policy-gated and repo-root scoped.
