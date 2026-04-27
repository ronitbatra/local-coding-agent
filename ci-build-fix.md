# CI Build Fix

## Problem

CI was failing during `npm run build` with `TS6305` errors in `packages/cli`:

- `packages/cli` imports from `@local-agent/core`
- `packages/cli/tsconfig.json` already declares a project reference to `../core`
- the root build script used `npm run build --workspaces`

That workspace build path did not guarantee that `packages/core` would build before `packages/cli`. In a clean CI checkout, `packages/core/dist/index.d.ts` did not exist yet when the CLI build started, so TypeScript failed with:

- `Output file .../packages/core/dist/index.d.ts has not been built from source file .../packages/core/src/index.ts`

This could be masked locally if `packages/core/dist` or TypeScript incremental build metadata already existed from an earlier build.

## Changes Made

### 1. Switched the root build to a TypeScript solution build

Updated the root `build` script in `package.json`:

```json
"build": "tsc -b tsconfig.build.json"
```

This makes TypeScript follow project references directly instead of relying on npm workspace execution order.

### 2. Added a root solution config

Created `tsconfig.build.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/cli" }
  ]
}
```

This ensures `core` builds before `cli`.

### 3. Updated package build scripts to use build mode

Changed both workspace package build scripts:

- `packages/core/package.json`
- `packages/cli/package.json`

From:

```json
"build": "tsc"
```

To:

```json
"build": "tsc -b"
```

This keeps each package aligned with TypeScript project references and incremental build behavior.

### 4. Cleaned TypeScript incremental artifacts

Updated `clean` scripts to remove:

- `dist`
- `tsconfig.tsbuildinfo`
- root `tsconfig.build.tsbuildinfo`

This prevents stale incremental state from hiding build-order problems locally.

## Files Changed

- `package.json`
- `tsconfig.build.json`
- `packages/core/package.json`
- `packages/cli/package.json`

## Why This Fix Works

The root cause was not bad source code in Milestone 2. The issue was that the build pipeline relied on npm workspace ordering for packages that already had a TypeScript dependency relationship.

Using `tsc -b` with a solution config fixes that by letting TypeScript:

- understand the dependency graph
- build referenced projects in the correct order
- emit declarations before dependent packages compile

## Verification

The fix was verified with a cold local build:

1. reinstall dependencies with `npm ci`
2. remove prior build artifacts
3. run `npm run build`

Result: the build completed successfully from a clean state.
