# Architecture

## Overview

The local coding agent is built with a modular architecture:

- **Core Engine** (`packages/core`): The product - no UI dependencies
- **CLI** (`packages/cli`): Thin wrapper around the core
- **Model Adapters**: Pluggable providers (Ollama first)
- **Tools**: Small, auditable, policy-gated capabilities

## Event-Driven Design

The engine uses an event bus to decouple execution from UI:

- `plan` - Agent creates a plan
- `tool_call` - Tool is invoked
- `tool_result` - Tool returns result
- `patch_proposed` - Patch is proposed
- `patch_applied` - Patch is applied
- `command_started` - Command execution starts
- `command_output` - Command produces output
- `done` - Task completed
- `error` - Error occurred

## Safety Model

Default to **Safe Assist** mode:
- Read + propose diffs only
- User confirms apply
- Commands suggested, not executed

## Patch-Based Editing

The model never writes files directly. Always outputs:
1. PLAN
2. PATCH (unified diff)
3. COMMANDS (optional)
4. DONE
