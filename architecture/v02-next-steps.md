# Architecture Roadmap: v0.2 Next Steps

This document outlines the planned architectural improvements, feature enhancements, and roadmap items for the **v0.2 release** of the Minecode composition engine.

---

## 1. Multi-Stack Adapter Ecosystem
While v0.1 focuses exclusively on the `nextjs-supabase` stack, v0.2 will introduce support for alternative frontend and backend architectures:
- **Next.js with Prisma & PostgreSQL:** A self-hosted/traditional database and ORM alternative to Supabase client generators.
- **SvelteKit & Supabase / Tailwind:** Providing a modern alternative frontend framework while keeping the backend capabilities.
- **Python / Django REST Framework / SQLite:** A lightweight, backend-heavy stack suitable for rapid scripting or microservices.

---

## 2. Remote & Federated Feature Registries
To shift from a strictly local filesystem feature setup to a distributed ecosystem, v0.2 will implement:
- **Remote Registry Protocols:** Downloading and caching features dynamically from secure online endpoints (over HTTPS/CDN).
- **Federated Features:** Allowing developers to import features directly from external GitHub repositories or npm packages.
- **Minecode Registry CLI commands:** Add commands like `minecode feature publish` and `minecode feature install <id>`.

---

## 3. AST-Based Code Merging & Code Roundtripping
Currently, generated code must be separated from custom developer extensions to prevent overwrite issues. v0.2 will introduce:
- **Abstract Syntax Tree (AST) Merging:** Smarter template compilers (using tools like `magicast` or `esbuild` AST parsing) to merge custom changes directly back into generated files without breaking existing logic.
- **Bi-directional Roundtripping:** Synching changes made to physical components or databases back into the `app.yaml` blueprint and feature schemas.

---

## 4. Visual Composition Dashboard & Web UI
To make system composition accessible to non-engineers and to provide a superior developer experience:
- **Interactive Drag-and-Drop Editor:** A web-based visual interface to compose blueprints, manage organization and RBAC settings, and visualize feature dependency graphs.
- **Live Preview Sandbox:** A hot-reloading preview showing the compiled layout and mock endpoints of the composed app in real-time.

---

## 5. Precise Live Database Migration Diffs
Improve migrations from topological file copies to dynamic schema delta engines:
- **Live Database Inspection:** Connect directly to a development database to inspect its actual catalog state.
- **Schema Diffing:** Compare the blueprint's entities with the physical database, generating exact and minimal up/down SQL migration scripts.

---

## 6. Runtime Hot Reloading & Virtual Feature Isolation
Support dynamic changes without requiring a full code regeneration:
- **Feature Flags & Hot Loading:** Loading and configuring feature behaviors (such as enabling a payment gateway or changing authentication parameters) at runtime.
- **Logical Feature Isolation:** Virtualizing feature dependencies so they run in isolated micro-environments or namespaces within the generated app.
