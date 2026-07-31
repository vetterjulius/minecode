# Minecode

Modular AI-first software architecture system made up of building blocks that just need to be combined and enhanced with custom code.

## Vision and Architecture

Minecode is not a template system or a simple code generator. It is a **compiler for declarative software capabilities**. It translates standard high-level application descriptions (blueprints) into fully composed, normal, production-ready software projects with well-defined boundaries.

For detailed concepts and technical designs:

- Read our [Architecture Concept](architecture/architecture-concept.md)
- Explore the [Technical Specification v0.1](architecture/specs-v01.md)

## Repository Structure

Minecode is structured as a TypeScript/Node.js monorepo containing the engine packages, user interfaces, feature registry, and starter stacks.

For a detailed breakdown of the packages, their responsibilities, and expected dependencies:

- See the [Monorepo Architecture and Package Boundaries](docs/monorepo-structure.md)

## Getting Started

To set up, build, test, and develop on Minecode locally:

- Follow the [Local Development Guide](docs/local-development.md)

### Quick Commands

Make sure you have [pnpm](https://pnpm.io/) (v10+) installed.

```bash
# Install dependencies
pnpm install

# Build all packages and applications in the correct order
pnpm build

# Run unit and integration tests across the entire monorepo
pnpm test

# Run tests and generate coverage report
pnpm test:coverage

# Run formatting checks
pnpm format:check

# Run linter
pnpm lint
```

## Engineering and Quality Standards

All contributions to Minecode must adhere to our strict engineering guidelines and principles:

- Review the [Engineering Principles](engineering/engineering-principles.md)
- Follow the [Coding Guidelines](engineering/coding-guidelines.md)
- Ensure your changes meet the [v0.1 Definition of Done](engineering/definition-of-done.md)
