#!/bin/bash
# Release script

set -e

echo "Building packages..."
npm run build

echo "Running tests..."
npm test

echo "Release complete!"
