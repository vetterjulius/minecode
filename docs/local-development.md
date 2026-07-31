# Local Development Guide

Welcome to the **Minecode** monorepo! This guide explains how to set up, build, test, and develop on this project locally.

## Prerequisites

Ensure you have the following installed on your system:

- **Node.js** (v20 or higher is recommended)
- **pnpm** (v10 or higher)

## Getting Started

1. **Clone the repository:**

   ```bash
   git clone https://github.com/vetterjulius/minecode.git
   cd minecode
   ```

2. **Install dependencies:**
   We use `pnpm` workspaces. Install all dependencies across the monorepo by running:
   ```bash
   pnpm install
   ```

## Development Workflow

### Building the Entire Monorepo

Since we use **TypeScript Project References**, the compiler resolves package dependencies automatically in the correct order:

```bash
pnpm build
```

To clean previous build outputs, run:

```bash
pnpm -r clean
```

### Running Tests and Coverage

We use **Vitest** for unit and integration testing. Tests are located in `tests/` directories within their respective package or app.

- **Run all tests once:**
  ```bash
  pnpm test
  ```
- **Run tests in watch mode:**
  ```bash
  pnpm test:watch
  ```
- **Generate test coverage report:**
  ```bash
  pnpm test:coverage
  ```
  The coverage reports will be output to the terminal, and an interactive HTML report will be generated under `coverage/`.

### Linting and Formatting

We use **ESLint (Flat Config)** and **Prettier** to enforce code quality and stylistic standards.

- **Run linting checks:**
  ```bash
  pnpm lint
  ```
- **Automatically fix lint issues:**
  ```bash
  pnpm lint:fix
  ```
- **Verify code formatting:**
  ```bash
  pnpm format:check
  ```
- **Automatically format code:**
  ```bash
  pnpm format
  ```

## Editor & IDE Integration

Because this project uses TypeScript Project References, editors like **VS Code** or **WebStorm** will automatically pick up type definitions across packages if configured.

- Ensure your editor is using the workspace version of TypeScript.
- The root `tsconfig.json` acts as the entry point pointing to all sub-packages, enabling seamless cross-package navigation (Go to Definition).
