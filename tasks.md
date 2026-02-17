# tasks.md — Local Claude Code / Cursor‑Like Agent (Local‑First) Scope + Benchmarks

> Goal: ship a **CLI-first local coding agent** that can safely propose/apply diffs, run allowlisted commands, and iterate using a local model backend (Ollama first).  
> Each section includes **benchmarks/tests** to verify it works “up to that point.”

---

## Milestone 0 — Repo Bootstrap + Dev Ergonomics
### Tasks
- [x] Create repo skeleton (`packages/` or `src/`), license, contributing, release notes
- [x] Add formatter/linter (Biome/ESLint+Prettier or Ruff/Black)
- [x] Add unit test runner (Vitest/Jest or Pytest)
- [ ] Add CI pipeline (GitHub Actions) for lint + tests on macOS/Linux
- [ ] Add basic logging utility + log levels

### Benchmarks / Tests
- **CI green:** lint + unit tests pass on macOS + Linux
- **Smoke:** `agent --version` prints version and exits 0
- **Perf baseline:** `agent --help` < 200ms cold start on M2 Max (informational; track over time)

---

## Milestone 1 — CLI UX + Command Routing (No AI Yet)
### Tasks
- [ ] CLI command structure
  - [ ] `agent init`
  - [ ] `agent ask "<task>"`
  - [ ] `agent apply`
  - [ ] `agent test`
  - [ ] `agent undo`
  - [ ] `agent status`
- [ ] Config discovery (repo root detection, `.agent/` folder creation)
- [ ] Structured output format (human-readable + optional `--json`)

### Benchmarks / Tests
- **Unit:** argument parsing for each command (happy path + invalid args)
- **Integration:** in temp repo, `agent init` creates `.agent/` with policy + session dirs
- **Golden output:** snapshot test for `--help` and `status` output
- **Failure behavior:** `agent apply` before any patch returns exit code ≠0 with clear message

---

## Milestone 2 — Policy + Safety Guardrails (No AI Yet)
### Tasks
- [ ] Define `policy.json` schema:
  - [ ] allowed repo roots / path allowlist (default: current repo)
  - [ ] command allowlist (default: none)
  - [ ] max file size to read
  - [ ] max patch size / max files changed
  - [ ] safe mode toggles (read-only, confirm apply, confirm commands)
- [ ] Policy enforcement layer (single gate before tool execution)
- [ ] Confirmation prompts (TTY) + non-interactive behavior (`--yes` / `--no-apply`)

### Benchmarks / Tests
- **Unit:** policy schema validation (valid/invalid)
- **Security:** deny reads outside repo root (e.g., `../secrets`)
- **Security:** deny running commands not allowlisted
- **UX:** safe mode requires confirmation before apply/command
- **Regression:** fuzz test path normalization (symlinks, `..`, unicode) to prevent escapes

---

## Milestone 3 — Filesystem Tools + Patch Pipeline (No AI Yet)
### Tasks
- [ ] Tool implementations:
  - [ ] `list_files(glob)`
  - [ ] `read_file(path, range?)`
  - [ ] `search_code(query)` (ripgrep)
  - [ ] `git_status`, `git_diff`
- [ ] Unified diff validator:
  - [ ] ensure paths within repo + policy
  - [ ] reject binary modifications unless explicitly allowed
  - [ ] cap total hunks/files/bytes
- [ ] Patch application:
  - [ ] apply unified diff
  - [ ] record patch metadata (files changed, timestamps)
  - [ ] support dry-run
- [ ] Rollback:
  - [ ] `agent undo` reverts last applied patch (use git if available; otherwise stored reverse diff)

### Benchmarks / Tests
- **Unit:** diff parser/validator rejects malformed diffs
- **Integration:** apply patch to create file + modify file + delete file; verify fs state
- **Integration:** `undo` restores repo exactly (byte-for-byte)
- **Git integration:** if git repo present, verify `git diff` equals patch preview after apply
- **Perf:** apply a patch touching 50 small files < 2s on M2 Max

---

## Milestone 4 — Session State + Reproducibility (Still No AI)
### Tasks
- [ ] Session store (JSONL event log per run)
- [ ] Event schema:
  - [ ] `plan`, `tool_call`, `tool_result`, `patch_proposed`, `patch_applied`, `command_started`, `command_output`, `done`, `error`
- [ ] `agent status` displays last run summary
- [ ] `agent replay <session>` renders events (human + json)

### Benchmarks / Tests
- **Unit:** event schema validation
- **Integration:** running any command writes a session log
- **Repro:** `replay` reproduces identical event ordering + key fields
- **Durability:** handle abrupt termination (SIGINT) and mark session as aborted

---

## Milestone 5 — Model Adapter: Ollama (First AI)
### Tasks
- [ ] Ollama client:
  - [ ] detect server availability
  - [ ] list models (optional)
  - [ ] chat/completions call
  - [ ] streaming support (optional but recommended)
- [ ] Minimal “tool calling” protocol via strict JSON output
- [ ] Prompt templates (system + run prompt)
- [ ] Local model selection config (`model`, `temperature`, `context_limit`)

### Benchmarks / Tests
- **Contract test:** mock Ollama HTTP server; verify request shape + retry/backoff
- **Integration (optional gated):** if `OLLAMA_TESTS=1`, hit local Ollama and ensure response parses
- **Robustness:** invalid model name yields actionable error
- **Latency baseline:** small prompt returns first token < 2s on M2 Max with 14B model (track only)

---

## Milestone 6 — Agent Loop v1 (Plan → Retrieve → Patch → Stop)
### Tasks
- [ ] Implement loop (single-iteration first):
  - [ ] create plan
  - [ ] retrieve minimal context (search + targeted reads)
  - [ ] request PATCH from model
  - [ ] present diff to user
- [ ] Output contract enforcement:
  - [ ] PLAN (short)
  - [ ] PATCH (unified diff only)
  - [ ] COMMANDS (optional)
  - [ ] DONE
- [ ] “Small diffs” strategy: encourage 1–5 files per step

### Benchmarks / Tests
- **Unit:** parser extracts plan/patch/commands reliably
- **Unit:** reject outputs that include prose in PATCH section
- **Integration:** on a toy repo, ask “add a README line” → model proposes patch; validator passes
- **Determinism:** same prompt+repo yields patch within tolerance (snapshot-based, allow minor differences)

---

## Milestone 7 — Apply + Test Loop (Autopilot-lite)
### Tasks
- [ ] Add optional iterative loop:
  - [ ] propose patch → apply (if allowed) → run tests (if allowed) → feed output → fix
- [ ] Test command discovery:
  - [ ] detect common commands (`npm test`, `pnpm test`, `pytest`, `go test ./...`)
  - [ ] allow user to set explicit command in policy
- [ ] Command sandboxing:
  - [ ] working directory pinned to repo root
  - [ ] timeout + output truncation
  - [ ] no network flag (best-effort) (optional)

### Benchmarks / Tests
- **Integration:** failing unit test repo fixture:
  - ask “fix tests” → agent applies patch → `agent test` passes
- **Safety:** command not allowlisted never runs
- **Stability:** if tests fail twice, agent stops with summary and leaves diff visible
- **Timeout:** long-running command is killed and recorded as timeout

---

## Milestone 8 — Quality + Trust UX
### Tasks
- [ ] Diff viewer in terminal (colored + paging) or plain mode
- [ ] “Explain this patch” (optional) using local model
- [ ] `--dry-run` and `--no-apply` flags
- [ ] Clear rollback messaging
- [ ] Telemetry OFF by default (if any; ideally none)

### Benchmarks / Tests
- **Golden tests:** diff output is stable across runs (no ANSI in `--plain`)
- **UX:** apply confirmation prompt text includes file count + risk summary
- **Safety regression:** cannot apply patch if validator fails, even with `--yes`

---

## Milestone 9 — Packaging + Distribution
### Tasks
- [ ] Single binary build (pkg / bun / pyinstaller) OR `npm i -g` package
- [ ] Auto-update strategy (optional)
- [ ] `agent doctor` command:
  - [ ] checks git, ripgrep, ollama server, model exists, permissions

### Benchmarks / Tests
- **Install test:** fresh machine install script succeeds
- **Doctor:** returns non-zero if Ollama missing; returns zero when configured
- **Compatibility:** macOS Apple Silicon is required target; Linux optional

---

## Bench Suite (Ongoing) — “Does it feel like Claude Code?”
Create a `bench/` folder with repeatable fixtures.

### Benchmarks
- **B1: Simple edit** — add function docstring in 1 file (pass if patch applies cleanly)
- **B2: Multi-file refactor** — rename function across 3 files (pass if compiles/tests)
- **B3: Fix failing test** — repo fixture with 1 failing test (pass if green)
- **B4: Add test** — add one unit test with correct assertions
- **B5: Safety escape** — attempt to read `/etc/hosts` or `~/.ssh` (must be blocked)

### Scoring (track over time)
- Success rate (% passes)
- Avg iterations to success
- Tokens/time per run (optional)
- Max memory pressure incidents (manual for now)

---

## Definition of Done (MVP)
- [ ] `agent init` creates policy + session directory
- [ ] `agent ask` produces a **valid unified diff** for a small change
- [ ] `agent apply` applies the diff safely and logs the session
- [ ] `agent test` runs allowlisted tests and logs output
- [ ] `agent undo` rolls back last patch
- [ ] All unit/integration tests pass in CI

---

## Notes / Constraints
- Default to **Safe Assist** mode.
- The model **never writes files directly**; only proposes patches.
- Keep context small; rely on retrieval (especially for 8GB machines).
- Ollama is the default provider; keep adapters pluggable.

