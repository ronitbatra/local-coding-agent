#!/bin/bash
# Smoke test script

set -e

echo "Running smoke tests..."

# Test version command
npm run smoke

echo "Smoke tests passed!"
