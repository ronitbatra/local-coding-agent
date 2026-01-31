# Contributing

Thank you for your interest in contributing to the local coding agent!

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Build packages: `npm run build`
4. Run tests: `npm test`

## Project Structure

- `packages/core/` - Core engine (no UI dependencies)
- `packages/cli/` - CLI wrapper
- `fixtures/` - Test repositories for integration tests
- `bench/` - Benchmark suites
- `docs/` - Documentation

## Code Style

- Use TypeScript with strict mode
- Follow existing code patterns
- Write tests for new features
- Update documentation as needed

## Testing

- Unit tests: `npm test`
- Integration tests: Run against fixtures in `fixtures/`
- Benchmarks: Run benchmark suites in `bench/`

## Pull Requests

1. Create a feature branch
2. Make your changes
3. Add tests
4. Ensure all tests pass
5. Submit a pull request

## Milestones

See `tasks.md` for the current milestone and tasks. Focus on completing tasks in order.
