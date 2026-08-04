# Minecode v0.1 Known Limitations

This document outlines the known technical and architectural limitations of the Minecode composition system as of version 0.1.

## 1. Single Stack Adapter Support

Currently, the system only supports the `nextjs-supabase` stack adapter. Generating applications using alternative frameworks (such as Vue, Svelte, Django, or databases like MongoDB or MySQL) is not supported in this release.

## 2. Local-Only File-System Registry

The feature discovery and loading processes are restricted to local file-system registries. Features must be physically present in the registry directory (such as `composition-engine/features/`). There is no support for:

- Remote registry servers.
- Package manager integration (e.g., fetching features via npm or GitHub packages).
- Community marketplaces or online feature stores.

## 3. Local-Only Interface & Tooling

The developer workflows (CLI and MCP) are entirely local. There is no cloud-hosted dashboard, online compiler, or centralized deployment/orchestration interface available.

## 4. Static-Only Conflict Verification

Conflict detection (such as duplicate capabilities or incompatible features) is performed statically during the composition phase. There is no runtime isolation or containerization for features within the generated application. All integrated features run inside the same Next.js and Supabase environment, sharing database connections and environment variables.

## 5. Merging & Code Transformation Scope

The generator uses a deterministic file registry and pre-defined templates to compose the target application. It does not include:

- AST (Abstract Syntax Tree) parsing or code transformation of arbitrary files.
- Arbitrary custom code merging inside generated file blocks (custom code must instead reside cleanly in designated directories like `extensions/` or be contribution points connected to `extensionPoints`).

## 6. Database Migration Constraints

Database migration generation is template-driven. It merges migrations in a static topological order and outputs them sequentially. The system does not support:

- Live database schema diffing.
- Automatic database migration rollback script generation.
- Schema synchronization from a running database back into the feature declarations.

## 7. Limited First-Party Feature Library

The system currently provides five standard, pre-packaged built-in features:

- `database`
- `authentication`
- `organizations`
- `rbac`
- `billing`

Adding other capabilities requires developers to scaffold and develop custom features from scratch.
