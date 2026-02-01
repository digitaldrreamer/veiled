# Contributing to Veiled

Thank you for your interest in contributing to Veiled! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/veiled/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)
   - Relevant logs or error messages

### Suggesting Features

1. Check if the feature has already been suggested
2. Open an issue with:
   - Clear description of the feature
   - Use case and motivation
   - Potential implementation approach (if you have ideas)

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following our coding standards
4. **Write or update tests** as needed
5. **Update documentation** if you've changed APIs or behavior
6. **Commit your changes** with clear, descriptive messages:
   ```bash
   git commit -m "Add feature: description of what you did"
   ```
7. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
8. **Open a Pull Request** with:
   - Clear title and description
   - Reference to related issues (if any)
   - Screenshots or examples (for UI changes)

## Development Setup

See the main [README.md](./README.md) for setup instructions.

### Quick Start

```bash
# Clone your fork
git clone https://github.com/yourusername/veiled.git
cd veiled

# Install dependencies
bun install

# Build all packages
bun run build

# Run tests
bun test
```

## Coding Standards

### TypeScript/JavaScript

- Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use TypeScript for type safety
- Write self-documenting code with clear variable names
- Add JSDoc comments for public APIs

### Rust

- Follow [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Use `cargo fmt` and `cargo clippy` before committing
- Document public functions and structs

### Noir

- Follow Noir best practices
- Comment complex circuit logic
- Test circuits thoroughly before submitting

### Git Commit Messages

- Use clear, descriptive messages
- Start with a verb in imperative mood: "Add", "Fix", "Update", etc.
- Reference issues when applicable: "Fix #123: description"

Example:
```
Add NFT ownership proof circuit

Implements the nft_ownership.nr circuit that allows users to prove
they own an NFT from a collection without revealing which specific NFT.

Fixes #45
```

## Testing

### Before Submitting

- All tests must pass: `bun test`
- New features should include tests
- Circuit changes should include circuit tests
- SDK changes should include integration tests

### Test Structure

- **Unit tests**: Test individual functions and methods
- **Integration tests**: Test component interactions
- **Circuit tests**: Test ZK circuit correctness
- **E2E tests**: Test complete user flows (where applicable)

## Documentation

### Code Documentation

- Document public APIs with JSDoc/TSDoc
- Add inline comments for complex logic
- Keep README files up to date

### Pull Request Documentation

- Update relevant README files
- Add examples if introducing new features
- Update API documentation if changing interfaces

## Project Structure

- `packages/circuit/` - Noir ZK circuits
- `packages/anchor/` - Solana on-chain program
- `packages/core/` - TypeScript SDK
- `apps/demo/` - Demo application
- `apps/web/` - Landing page
- `scripts/` - Utility scripts

## Areas for Contribution

### High Priority

- Circuit optimizations (proof generation speed)
- Additional proof types (new use cases)
- SDK improvements (better error handling, more examples)
- Documentation improvements
- Test coverage

### Medium Priority

- Framework integrations (React hooks, Svelte stores)
- Wallet adapter improvements
- Performance optimizations
- Security audits and reviews

### Low Priority

- UI/UX improvements to demo app
- Additional examples
- Blog posts and tutorials

## Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, your PR will be merged
4. Thank you for contributing! 🎉

## Questions?

- Open an issue for questions about implementation
- Check existing issues and discussions
- Join our Discord (coming soon)

---

Thank you for helping make Veiled better! 🙏
