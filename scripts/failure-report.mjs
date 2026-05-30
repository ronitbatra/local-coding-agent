#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

function includesAny(message, candidates) {
  return candidates.some((candidate) => message.includes(candidate));
}

function classifyFromMessage(message) {
  if (
    includesAny(message, [
      'Timed out connecting to Ollama',
      'Unable to reach Ollama',
      'Ollama request failed',
    ])
  ) {
    return 'llm_timeout_or_http_error';
  }

  if (
    includesAny(message, ['Model output was not valid JSON', 'Model output must be a JSON object'])
  ) {
    return 'json_parse_failed';
  }

  if (
    includesAny(message, [
      'Model output field',
      'tool_calls[',
      'unsupported keys',
      'must be an array',
      'must be a boolean',
      'must be a non-empty string',
    ])
  ) {
    return 'schema_failed';
  }

  if (
    includesAny(message, [
      'PATCH must start with a unified diff header',
      'PATCH must not be an empty string',
      'PATCH must be raw unified diff text without markdown fences',
    ])
  ) {
    return 'patch_contract_failed';
  }

  if (
    includesAny(message, [
      'PATCH is not valid unified diff text',
      'Invalid diff line prefix',
      'Unified diff did not contain any file entries',
      'Invalid hunk header',
      'Encountered +++ header before --- header',
      'Diff file "',
      'Binary patches are not supported',
    ])
  ) {
    return 'diff_parse_failed';
  }

  if (
    includesAny(message, [
      'Hunk for "',
      'Patch size ',
      'Patch changes ',
      'Binary patches are not allowed',
      'Patch does not contain any hunks',
      'Diff contains a file entry with an empty path',
      'outside allowedRepoRoots',
    ])
  ) {
    return 'diff_validation_failed';
  }

  return 'unknown_failure';
}

function collectCategory(event) {
  if (!event || event.type !== 'error') {
    return null;
  }

  const details = event?.data?.details;
  const structuredCategory =
    details && typeof details === 'object'
      ? (details?.failure?.category ?? details?.category)
      : null;
  if (typeof structuredCategory === 'string' && structuredCategory.length > 0) {
    return structuredCategory;
  }

  const message = typeof event?.data?.message === 'string' ? event.data.message : '';
  return classifyFromMessage(message);
}

async function readSessionErrorEvents(sessionsDir) {
  let entries;
  try {
    entries = await readdir(sessionsDir);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
  const logFiles = entries.filter((entry) => entry.endsWith('.jsonl'));
  const categories = [];

  for (const fileName of logFiles) {
    const fullPath = path.join(sessionsDir, fileName);
    const content = await readFile(fullPath, 'utf8');
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        const category = collectCategory(event);
        if (category) {
          categories.push(category);
        }
      } catch {
        categories.push('unknown_failure');
      }
    }
  }

  return categories;
}

function printSummary(sessionsDir, categories) {
  const counts = new Map();
  for (const category of categories) {
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  console.log(`Failure Category Report`);
  console.log(`Sessions dir: ${sessionsDir}`);
  console.log(`Total error events: ${categories.length}`);

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [category, count] of sorted) {
    console.log(`- ${category}: ${count}`);
  }
}

async function main() {
  const sessionsDirArg = process.argv[2] ?? '.agent/sessions';
  const sessionsDir = path.resolve(process.cwd(), sessionsDirArg);
  const categories = await readSessionErrorEvents(sessionsDir);
  printSummary(sessionsDir, categories);
}

main().catch((error) => {
  console.error(
    `Unable to generate failure report: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exitCode = 1;
});
