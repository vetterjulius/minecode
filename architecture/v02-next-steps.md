# Architecture Roadmap: v0.2 Next Steps

This document outlines the refined roadmap and next steps for the **v0.2 release** of the Minecode composition engine, focusing on real-world applicability, modular code generation, and strong developer foundations.

---

## 1. High-Fidelity "Real-World" SaaS Application
Instead of basic capability demonstrations, v0.2 will focus on composing a complete, production-ready SaaS application with a concrete business case (e.g., a multi-tenant helpdesk, customer CRM, or collaborative document workspace).
- **Real Business Case:** The composed application will demonstrate full end-to-end user workflows, real pricing tier enforcement, billing lifecycle event-handling, and complex multi-tenant query isolation.
- **Expanded Built-in Features:** To support this, we will implement additional real-world features including:
  - `storage` - File upload and storage management.
  - `notifications` - Multi-channel alerts (Email, SMS, Webhooks).
  - `search` - Full-text search and indexing capabilities.
  - `audit-logging` - Transparent, tamper-evident security and activity trails.

---

## 2. Modular & Decoupled Stack Adapter Architecture
As the feature registry grows, a monolithic Stack Adapter becomes unsustainable and difficult to maintain. v0.2 will revolutionize the stack compiler architecture by modularizing code generation:
- **Feature-to-Code Mapping:** Establish a formal, explicit connection between feature contracts and their code generation templates.
- **Sub-Adapters & Generators:** Divide the large monolithic `NextJsSupabaseAdapter` into clean, registerable **Feature-Specific Code Generators** (e.g., `AuthGenerator`, `BillingGenerator`).
- **Template Orchestration:** The core Stack Adapter will act as a coordinator, matching resolved plan artifacts directly to their registered code generation sub-modules, preventing monolithic creep and making feature expansion clean and isolated.

---

## 3. Advanced Custom Code Integration & Extension Points
The "Real-World" SaaS example will serve as the ultimate proving ground for custom logic injection:
- **Clean Extensibility Boundaries:** Provide first-class support for inserting custom frontend pages, custom API endpoints, and custom database schema rules through robust contribution hooks.
- **Deeper Extension Handlers:** Improve the generation of `/extensions` and `/config` directories to provide type-safe interfaces where developers can hook in custom business logic without touching or overwriting the main compiled engine paths.
- **Dynamic Migrations:** Support combining raw SQL migrations with custom typescript-based migration runner scripts for complex schema upgrade patterns.
