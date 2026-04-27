# Milestone 3 Implementation Notes

## Scope Implemented

Milestone 3 from `tasks.md` is now implemented across `packages/core` and `packages/cli`.

Delivered areas:

- filesystem tools:
  - `list_files(glob)`
  - `read_file(path, range?)`
  - `search_code(query)` via `ripgrep`
  - `git_status`
  - `git_diff`
- unified diff pipeline:
  - parse unified diff text
  - validate file paths and policy constraints
  - reject binary patch formats
  - enforce patch size and file-count limits
- patch application:
  - apply create / modify / delete patches directly in the filesystem
  - support `dryRun`
  - record patch metadata and reverse patch data
- rollback:
  - prefer `git apply -R` when possible
  - fall back to stored reverse patch application when needed
- CLI integration:
  - `agent apply` now performs real patch application
  - `agent undo` now performs real rollback
  - `.agent` state now tracks pending and last-applied patch state

## Key Files

- Core tool implementations:
  - `packages/core/src/tools/fs/listFiles.ts`
  - `packages/core/src/tools/fs/readFile.ts`
  - `packages/core/src/tools/search/ripgrep.ts`
  - `packages/core/src/tools/git/status.ts`
  - `packages/core/src/tools/git/diff.ts`
- Patch pipeline:
  - `packages/core/src/tools/patch/parseUnifiedDiff.ts`
  - `packages/core/src/tools/patch/validateDiff.ts`
  - `packages/core/src/tools/patch/applyDiff.ts`
  - `packages/core/src/tools/patch/rollback.ts`
- CLI integration:
  - `packages/cli/src/commands/shared.ts`
  - `packages/cli/src/lib/agentFs.ts`
- Exports:
  - `packages/core/src/index.ts`
- Tests:
  - `packages/core/test/unit/patchPipeline.test.ts`
  - `packages/cli/test/unit/commands.test.ts`

## Design Choices

### 1. Manual patch application instead of shelling out to `patch`

Patch apply is implemented in TypeScript rather than relying on the system `patch` utility.

Reasons:

- deterministic behavior in tests
- fewer platform assumptions
- easier policy integration
- easier to generate reverse metadata while applying

Tradeoff:

- current implementation is intentionally conservative and only supports the subset of unified diff behavior needed for MVP
- more advanced patch shapes may need extra handling later

### 2. Rollback prefers git, but does not require git

`rollbackLastPatch()` first tries `git apply -R` against the saved applied patch if the repo is a git worktree.

If that is not available or fails, rollback falls back to the saved reverse patch generated at apply time.

This matches the milestone requirement:

- use git if available
- otherwise use stored reverse diff

### 3. Reverse patch is generated during apply

When a patch is applied, metadata is stored under `.agent/patches/`:

- `last-applied.patch`
- `last-applied.reverse.patch`
- `last-applied.json`

This keeps undo decoupled from future session/event systems and allows rollback even outside git.

### 4. Policy enforcement happens before patch apply and inside tools

The implementation leans on Milestone 2 policy primitives:

- patch size limits
- file count limits
- repo-root confinement
- `safeMode.readOnly`
- confirmation flow in CLI

This means Milestone 3 does not bypass the safety model.

## Problems Encountered

### 1. CI/build setup from earlier work affected local confidence

This was not a Milestone 3 logic bug, but it mattered while iterating:

- stale build artifacts and `tsbuildinfo` can hide dependency-order issues
- solution-style TypeScript builds are now required for reliable cold builds

Implication:

- when debugging future milestones, trust clean `lint/build/test` runs more than warm local state

### 2. Biome formatting and import ordering were strict

Several implementation passes compiled fine but failed lint due to:

- import ordering
- line wrapping
- JSON formatting

Implication:

- use `npm run lint:fix` or `npm run format` before assuming a patch is done

### 3. Unified diff parsing had subtle EOF and separator issues

The main parser bugs were:

- treating the final trailing newline as an invalid diff line
- treating blank lines between file sections in reverse patches as invalid

Important detail:

- raw empty lines in a unified diff are separators
- actual blank content lines in hunks are still prefixed with `' '`, `'+'`, or `'-'`

This is why the parser now ignores raw empty lines safely.

### 4. Exact byte restoration required careful newline handling

Undo initially restored content textually but dropped a trailing newline in one case.

The fix was to normalize file serialization so:

- empty files stay empty
- non-empty files are written with a trailing newline by default
- if the internal line array already ends with `''`, that structure is preserved

Implication:

- if later milestones need exact preservation of “no trailing newline at EOF”, this area will need to become more precise

### 5. CLI tests needed real queued patch files

Some existing CLI tests only stored a patch path in `.agent/state.json` without writing the file itself.

Once `agent apply` became real, those tests started failing at the new existence check before they reached the policy/confirmation assertions.

Implication:

- future tests should model realistic on-disk state, not just state-file pointers

## Current Constraints / Known Limitations

These are important for future milestones.

### Patch format support is limited

Current parser/apply behavior is focused on standard text unified diffs:

- create file
- modify file
- delete file
- multi-file patches
- normal hunk headers

Not fully supported or intentionally rejected:

- binary patches
- rename-only metadata as a first-class operation
- copy detection metadata
- fuzzy patch application
- complex patch edge cases from every git diff variant

If Milestone 6 starts consuming model-generated diffs, the model output contract should stay narrow and predictable.

### Newline fidelity is not fully lossless

The implementation is correct for the current tests, but it does not yet model every newline edge case exactly:

- `\ No newline at end of file` is ignored rather than fully preserved semantically

If exact git-compatible patch fidelity becomes a requirement, this part should be upgraded.

### `list_files` globbing is simple

The current glob support is lightweight:

- `*`
- `**`
- `?`

It is not a full minimatch implementation.

If future retrieval depends heavily on advanced glob semantics, this tool should be replaced or extended.

### `search_code` depends on `rg`

`search_code` uses `rg` and returns failure if ripgrep is unavailable.

That is acceptable for current architecture because the project already positions `ripgrep` as a core capability, but Milestone 9 `doctor` should explicitly validate this dependency.

### Undo currently assumes a single last-applied patch

The state model only tracks one patch for rollback:

- pending patch
- last applied patch

There is no rollback stack yet.

That is consistent with the milestone, but if later agent loops apply multiple steps automatically, undo semantics will need to expand.

## Useful Context For Later Milestones

### Milestone 4

Session/event logging should probably absorb patch metadata rather than duplicate it.

Good integration points:

- when patch is proposed
- when patch validation fails
- when patch is applied
- when rollback succeeds/fails

The current `.agent/patches/last-applied.json` can either remain as operational state or become a projection of session events.

### Milestone 5 and 6

The model output contract should stay strict.

The current patch layer works best when the model produces:

- plain unified diff
- no extra prose inside patch body
- standard `---` / `+++` / `@@` structure

If the model starts emitting decorative text in the patch section, parsing will fail by design.

### Milestone 7

Autopilot-style multi-step apply/test/fix loops will need stronger state handling:

- multiple applied patches
- iteration history
- rollback boundaries
- command output attached to patch/application attempts

The current Milestone 3 state model is enough for one-step apply/undo, not for multi-iteration autonomous repair.

### Milestone 8

Diff viewer improvements should probably consume the same parsed diff structure rather than reparsing ad hoc in the CLI.

If patch explanation is added, the parsed diff metadata already provides:

- file count
- change type
- per-file hunk structure

## Verification Status

At the end of implementation:

- `npm run lint` passes
- `npm run build` passes
- `npm test` passes

Note:

- the CLI test suite still prints Commander’s `missing required argument 'task'` line during the invalid-args test
- this is expected from the existing test approach and does not fail the suite

## Recommended Follow-Up

Before or during Milestone 4+, these would be worthwhile refinements:

- preserve EOF newline semantics exactly, including `\ No newline at end of file`
- make patch validation distinguish malformed diff errors from policy violations more cleanly
- consider centralizing patch metadata/state in the future session store
- decide whether rename support is needed before model-driven patch generation ramps up
