# Local Claude Code / Cursor‑Like Agent — Project Notes

## Goal
Build a **commoditized, local‑first coding agent** (Claude Code / Cursor‑style) that can **safely read + modify files**, run commands, and iterate — without a subscription.

---

## Key Insight
This is not “self‑hosting Claude.”  
Claude models cannot run locally, but we *can* build a Claude Code–style product that runs locally using:

- **Ollama / llama.cpp / vLLM** (local inference)
- Patch‑based file editing
- Repo context + retrieval
- Safe agent loop + UX

---

## Recommended Local Backend: Ollama

### Why Ollama is the most realistic
- Works great on Apple Silicon
- Handles quantized models automatically
- Simple local API (`localhost:11434`)
- Standard ecosystem support (Continue.dev, agents, etc.)

Install:
```bash
brew install ollama
ollama serve
```

---

## Model Feasibility by Hardware

### 32GB M2 Max (your laptop)
- Can run **14B–32B quantized models** comfortably
- 70B models generally too large unless very low quantization
- Sweet spot: **Qwen2.5‑Coder 14B** daily, **32B** max quality

Recommended:
```bash
ollama pull qwen2.5-coder:14b
ollama pull qwen2.5-coder:32b
```

Context guidance:
- 8k–16k context is stable
- 32k context may become memory heavy

---

### 8GB M1 MacBook Air (mass‑market baseline)
- Comfortable: **3B–4B models**
- Possible but tight: **7B Q4** with low context
- Not realistic: **14B+**, **30B+**, or 70B

Design implication:
- Product must work well on small models + retrieval, not brute force context.

---

## About Qwen3‑Coder‑30B‑A3B
- Total parameters: ~30B (MoE)
- Active params per pass: ~3B
- Still requires large weights in memory → only feasible on 32GB+ with quantization

---

## Product Architecture (4 Layers)

### 1. Core Runtime (Engine)
The actual product — no UI.
- Repo scan + context gather
- Tool execution
- Patch application
- Safety enforcement
- Session logging

Event‑driven design:
- plan
- patch_proposed
- patch_applied
- command_output
- done/error

---

### 2. Model Adapter Layer (BYOM)
Strict interface so models can swap:
- Ollama first
- llama.cpp second
- Remote Claude/OpenAI optional later

```ts
interface LLM {
  complete(prompt, tools, context): Response
}
```

---

### 3. Tooling Layer (Capabilities)
Small auditable tools gated by policy:

Must‑have:
- search_code (ripgrep)
- read_file
- list_files
- propose_patch
- apply_patch
- run_command (allowlist)
- git_diff / git_status

---

### 4. Thin Clients
Ship CLI first, then editor/desktop.

Clients never touch FS directly — they call runtime.

---

## Safety Modes

### Safe Assist (default)
- Read + propose diffs only
- User confirms apply
- Commands suggested, not executed

### Autopilot (opt‑in)
- Can apply patches + run tests in allowlist
- Full step log + rollback

### CI Fixer (future)
- Fix failing tests automatically, open PR

---

## UX Contract: Diffs Are the Currency
Model never edits files directly.

Always output:
1. PLAN
2. PATCH (unified diff)
3. COMMAND (optional)
4. DONE

---

## MVP Spec (2–4 weeks)

CLI commands:
```bash
agent init
agent ask "Add tests for auth middleware"
agent apply
agent test
agent undo
```

Minimal storage:
- `.agent/policy.json`
- session logs (JSONL)
- optional index later

---

## Retrieval Strategy

### v1 (ship fast)
- ripgrep search
- targeted file reads
- strict context cap

### v2 (upgrade)
- embeddings
- tree‑sitter symbol map
- dependency graph

---

## Key Product Positioning
Compete on:
- Ownership
- Cost
- Determinism
- Hackability

Not on:
- Best model
- Best autocomplete

---

## Recommended Next Step
Decide:
- CLI‑first vs Desktop‑first
- TypeScript vs Python implementation

Then build:
1. Policy + tool gating
2. Patch pipeline
3. Agent loop
4. Ollama adapter
5. CLI UX
