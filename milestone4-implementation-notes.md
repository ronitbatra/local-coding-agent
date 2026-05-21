# Milestone 4 Implementation Notes

## Scope

Milestone 4 from `tasks.md` is now implemented:

- session store with durable JSONL event logs per run
- event schema for:
  - `plan`
  - `tool_call`
  - `tool_result`
  - `patch_proposed`
  - `patch_applied`
  - `command_started`
  - `command_output`
  - `done`
  - `error`
- `agent status` now includes the last completed run summary
- `agent replay <session>` now renders stored events in human and JSON form
- session metadata is marked `aborted` on `SIGINT`

## Plan Followed

1. Read the project docs and root markdown files to reconstruct Milestones 0 through 3 and confirm the intended Milestone 4 behavior.
2. Inspect the current CLI/runtime flow to find the existing `EventBus`, `SessionStore`, `.agent/sessions`, and `status` integration points.
3. Implement session persistence in `packages/core`, then wire session lifecycle into all CLI command handlers so every command run is logged consistently.
4. Add `replay`, enrich `status`, and back the feature with tests before writing these notes.

## Main Changes

### 1. Core session/event runtime

Implemented durable session logging in:

- `packages/core/src/runtime/EventBus.ts`
- `packages/core/src/runtime/SessionStore.ts`

Key decisions:

- event records are stored as newline-delimited JSON in `.agent/sessions/<session>.jsonl`
- each session also has a sidecar metadata file `.meta.json`
- session IDs include timestamp, pid, and a random suffix to avoid collisions during fast test runs
- event validation is lightweight but explicit enough to support replay and schema tests

### 2. CLI session lifecycle

Added CLI-level session orchestration in:

- `packages/cli/src/lib/session.ts`
- `packages/cli/src/lib/commandHelpers.ts`
- `packages/cli/src/lib/runtime.ts`

Behavior:

- every command starts a session before handler execution
- a `command_started` event is written immediately
- successful commands log `command_output` plus `done`
- failed commands log `error`
- `SIGINT` writes an abort/error trail and marks the session metadata as `aborted`

This keeps Milestone 4 scoped to reproducibility and observability without waiting for the future agent loop.

### 3. Command-level event coverage

Updated command handling in:

- `packages/cli/src/commands/shared.ts`

Notable events:

- `apply` logs `patch_proposed` and `patch_applied`
- `test` logs the selected command and the current “deferred until Milestone 7” output
- `status` excludes its own in-flight session so the summary shows the previous completed run instead of the status command itself

### 4. Replay command

Added:

- `packages/cli/src/commands/replay.ts`

Registered in:

- `packages/cli/src/app.ts`

`agent replay <session>` now reads the stored session log and prints ordered events for human output, while `--json` returns the stored metadata and event list structurally.

### 5. Status summary

Extended:

- `packages/cli/src/lib/agentFs.ts`
- `packages/cli/src/commands/status.ts`

`agent status` now reports:

- last session ID
- last command
- last result status
- last summary
- last event count

## Tests Added / Updated

### Core

Added:

- `packages/core/test/unit/sessionStore.test.ts`

Coverage:

- event schema validation
- durable session storage
- replay ordering
- aborted session metadata

### CLI

Updated:

- `packages/cli/test/unit/commands.test.ts`

Coverage:

- `replay` command registration and help output
- session logs written for command runs
- replay output ordering
- patch lifecycle events recorded for `apply`
- `status` last-run summary

## Verification

Ran successfully:

- `npm run build`
- `npm test`
- `npm run lint`

## Notes

- The root `tsconfig.json` now explicitly sets `"types": ["node"]` to avoid broken ambient type discovery from duplicate local `@types/*` folders in this workspace.
- Milestone 4 intentionally logs command/session behavior at the CLI boundary. That keeps the implementation simple now and still gives Milestones 5 to 7 a clear place to add richer tool and model events later.
