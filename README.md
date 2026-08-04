# Minecode

Modular AI-first software architecture system made up of building blocks that just need to be combined and enhanced with custom code.

## Vision and Architecture

Minecode is not a template system or a simple code generator. It is a **compiler for declarative software capabilities**. It translates standard high-level application descriptions (blueprints) into fully composed, normal, production-ready software projects with well-defined boundaries.

For detailed concepts and technical designs:

- Read our [Architecture Concept](architecture/architecture-concept.md)
- Explore the [Technical Specification v0.1](architecture/specs-v01.md)
- Review the [v0.1 Known Limitations](docs/known-limitations.md)
- Read the [v0.2 Next Steps Roadmap](architecture/v02-next-steps.md)

## Repository Structure

Minecode is structured as a TypeScript/Node.js monorepo containing the engine packages, user interfaces, feature registry, and starter stacks.

For a detailed breakdown of the packages, their responsibilities, and expected dependencies:

- See the [Monorepo Architecture and Package Boundaries](docs/monorepo-structure.md)

## Getting Started

To set up, build, test, and develop on Minecode locally:

- Follow the [Local Development Guide](docs/local-development.md)
- Learn how to add features by reading the [Developer Guide: Adding Features](docs/adding-features.md)

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

## CLI Developer Interface

Minecode provides a developer-friendly command-line interface via the `@minecode/cli` package, exposing all core composition engine capabilities to human developers without requiring MCP.

Once built (`pnpm build`), you can run the CLI from the repository root:

```bash
node composition-engine/apps/cli/dist/main.js [command] [options]
```

### CLI Commands

- **Initialize a blueprint (`init`)**:
  Initializes a new `app.yaml` blueprint file in the current directory with explanatory comments.

  ```bash
  node composition-engine/apps/cli/dist/main.js init
  ```

- **Validate a blueprint (`validate`)**:
  Validates a blueprint file (defaults to `app.yaml`) for correctness, version limits, dependencies, and capability conflicts.

  ```bash
  node composition-engine/apps/cli/dist/main.js validate [blueprintPath]
  ```

- **Build / Compose an application (`build`)**:
  Processes and compiles a blueprint file (defaults to `app.yaml`) and physically writes the generated source files to the output directory (defaults to `./app`).

  ```bash
  node composition-engine/apps/cli/dist/main.js build [blueprintPath] --out-dir [path]
  ```

- **List available registry features (`feature list`)**:
  Lists all available features in the registry in a clean tabular view.

  ```bash
  node composition-engine/apps/cli/dist/main.js feature list
  ```

- **Inspect a registry feature (`feature inspect`)**:
  Shows detailed information, dependencies, contract declarations, and the full JSON configuration schema of a specific feature.
  ```bash
  node composition-engine/apps/cli/dist/main.js feature inspect <feature-id>
  ```

## Engineering and Quality Standards

All contributions to Minecode must adhere to our strict engineering guidelines and principles:

- Review the [Engineering Principles](engineering/engineering-principles.md)
- Follow the [Coding Guidelines](engineering/coding-guidelines.md)
- Ensure your changes meet the [v0.1 Definition of Done](engineering/definition-of-done.md)
