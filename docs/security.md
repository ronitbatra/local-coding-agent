# Security

## Path Validation

All file paths are normalized and validated to ensure they are within the allowed repository root. This prevents:
- Reading files outside the repo (`../secrets`)
- Symlink escapes
- Unicode normalization attacks

## Command Sandboxing

Commands are:
- Allowlisted (only run if in `commandAllowlist`)
- Executed in repo root directory
- Timeout-protected
- Output-truncated

## Patch Validation

Patches are validated before application:
- All paths must be within repo root
- Binary modifications are rejected unless explicitly allowed
- Total size and file count are capped

## Default Safety

The agent defaults to **Safe Assist** mode:
- Read-only by default
- Requires confirmation for all destructive operations
- Never executes commands without explicit allowlisting
