# Policy Configuration

The agent uses a `policy.json` file in `.agent/` directory to enforce safety guardrails.

## Schema

```json
{
  "allowedRepoRoots": [],
  "commandAllowlist": [],
  "maxFileSize": 1048576,
  "maxPatchSize": 102400,
  "maxFilesChanged": 50,
  "safeMode": {
    "readOnly": false,
    "confirmApply": true,
    "confirmCommands": true
  }
}
```

## Fields

- `allowedRepoRoots`: List of allowed repository root paths (default: current repo)
- `commandAllowlist`: List of allowed commands (default: none)
- `maxFileSize`: Maximum file size to read in bytes (default: 1MB)
- `maxPatchSize`: Maximum patch size in bytes (default: 100KB)
- `maxFilesChanged`: Maximum number of files that can be changed in one patch (default: 50)
- `safeMode.readOnly`: If true, only read files, never apply patches
- `safeMode.confirmApply`: If true, require confirmation before applying patches
- `safeMode.confirmCommands`: If true, require confirmation before running commands
