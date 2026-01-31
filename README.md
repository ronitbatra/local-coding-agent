# local-coding-agent

A **CLI-first local coding agent** that can safely propose/apply diffs, run allowlisted commands, and iterate using a local model backend (Ollama first).

## Goal

Ship a commoditized, local-first coding agent (Claude Code / Cursor-style) that can safely read + modify files, run commands, and iterate — without a subscription.

## Project Structure

```
local-coding-agent/
  packages/
    core/          # The engine (no UI)
      src/
        runtime/   # AgentRunner, EventBus, SessionStore
        policy/    # Policy schema + validation
        tools/     # Filesystem, patch, git, shell, search tools
        context/   # Context gathering + chunking
        prompts/   # System prompts + output formats
        model/     # LLM interface + adapters (Ollama)
        util/      # Logger, errors, paths
    cli/           # CLI wrapper
      src/
        commands/  # init, ask, apply, test, undo, status, doctor
        ui/        # Diff viewer + prompts
  fixtures/        # Test repositories for integration tests
  bench/           # Benchmark suites ("Claude Code feel" checks)
  docs/            # Architecture, policy, security docs
  scripts/         # Release + smoke test scripts
```

## Architecture

- **Core Engine** (`packages/core`): The product — no UI dependencies. Contains runtime, policy enforcement, tools, and model adapters.
- **CLI** (`packages/cli`): Thin wrapper around the core engine.
- **Model Adapters**: Pluggable providers (Ollama first, llama.cpp/vLLM later).
- **Tools**: Small, auditable, policy-gated capabilities.

See [docs/architecture.md](docs/architecture.md) for more details.

## Safety Model

Default to **Safe Assist** mode:
- Read + propose diffs only
- User confirms apply
- Commands suggested, not executed

The model **never writes files directly**; only proposes patches in unified diff format.

## Development

### Prerequisites

- Node.js >= 18.0.0
- npm (or compatible package manager)

### Setup

```bash
npm install
npm run build
```

### Commands

- `npm run build` - Build all packages
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run smoke` - Run smoke tests
- `npm run dev` - Run CLI in development mode

## Milestones

See [tasks.md](tasks.md) for the complete milestone breakdown. Currently working on **Milestone 0** (Repo Bootstrap + Dev Ergonomics).

## License

MIT License - see [LICENSE](LICENSE) file.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
