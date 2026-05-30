# Running the Local Coding Agent

This guide is an exact step-by-step setup for running the agent from scratch.

## 1. Prerequisites

Install these first:

- Node.js 18+ (recommended: Node 20+)
- npm (comes with Node)
- `git`
- `ripgrep` (`rg`)
- Ollama

### macOS install commands

```bash
brew install node git ripgrep ollama
```

### Linux install commands (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y nodejs npm git ripgrep curl
curl -fsSL https://ollama.com/install.sh | sh
```

## 2. Clone and install project

```bash
git clone <YOUR_REPO_URL>
cd local-coding-agent
npm install
```

## 3. Build and test

```bash
npm run build
npm test
```

## 4. Start Ollama and download a model

Start the Ollama server:

```bash
ollama serve
```

In another terminal, pull the default model used by this project:

```bash
ollama pull qwen2.5-coder:14b
```

## 5. Run the CLI in dev mode

From the repo root:

```bash
npm run dev -- init
```

This creates `.agent/` config in your current repo.

## 6. Verify environment health

```bash
npm run dev -- doctor
```

Expected:

- exit code `0` when environment is ready
- non-zero if something is missing (with actionable message)

## 7. Core commands

```bash
npm run dev -- ask "add a short line to README"
npm run dev -- apply --yes
npm run dev -- test --yes
npm run dev -- status
npm run dev -- undo
```

## 8. Optional: build installable packages

Create package tarballs:

```bash
npm run package:all
```

Install globally from generated tarballs:

```bash
npm install -g ./dist-packages/local-agent-core-0.1.0.tgz ./dist-packages/local-agent-cli-0.1.0.tgz
```

Then run:

```bash
agent --help
agent doctor
```

## 9. Common issues

### `agent doctor` fails with Ollama unavailable

Fix:

```bash
ollama serve
```

### `agent doctor` fails with model missing

Fix:

```bash
ollama pull qwen2.5-coder:14b
```

### Build/test/lint issues after dependency changes

```bash
npm install
npm run build
npm test
npm run lint
```
