# Technical Specification v0.2: Decoupled Composition & Real-World SaaS

This specification defines the technical architecture, target goals, and implementation requirements for **Minecode v0.2**.

---

## 1. Primary Objectives
The primary focus of v0.2 is scaling the composition engine to support a complex, real-world multi-tenant SaaS application while refactoring the monolithic code generation adapter into a highly modular and extensible system.

---

## 2. Real-World B2B SaaS Application (Target App)
Instead of basic isolated capability demonstrations, v0.2 targets the composition of a comprehensive, production-ready SaaS product (e.g., an Enterprise Ticketing and Customer Support Hub).
- **Core Requirements:**
  - Multi-tenant data segregation.
  - Full support for nested roles and fine-grained RBAC permission checks.
  - End-to-end billing lifecycle integration with automated tier features enforcement.
  - Custom React components/routes working seamlessly alongside generated elements.

---

## 3. Modular Stack Adapter Architecture
To prevent the `NextJsSupabaseAdapter` from becoming an unmaintainable monolith, v0.2 refactors the compilation layer into registered, feature-specific sub-generators.

### Architecture Plan
The core `NextJsSupabaseAdapter` will act as a coordinator rather than an implementation class. It will dispatch composition plan elements to individual registered generators:

```
                  +--------------------------+
                  |  NextJsSupabaseAdapter   |
                  +------------+-------------+
                               |
       +-----------------------+-----------------------+
       |                       |                       |
+------v------+         +------v------+         +------v------+
| DatabaseGen |         |   AuthGen   |         |  BillingGen | ...
+-------------+         +-------------+         +-------------+
```

### Generator Registry
The main adapter will expose a registry to attach custom generators:
- **`DatabaseGenerator`:** Compiles relational models, triggers indexes, and builds static TS types.
- **`AuthGenerator`:** Generates authentication page templates, reset-password flows, and session middleware.
- **`BillingGenerator`:** Generates checkout checkout routers, webhook endpoints, and client-side subscription settings.
- **`RbacGenerator`:** Compiles roles and permissions checks, embedding them directly into API handlers and frontend layouts.

---

## 4. New First-Party Features
Four new production-quality built-in features will be designed and added to the filesystem registry under `composition-engine/features/builtin/`:

### 4.1 Storage Feature (`storage`)
- **Contract:** Declares files bucket creation, file upload size constraints, and allowed MIME types.
- **Generator Integration:** Compiles file upload API routes and client-side uploader components.

### 4.2 Notifications Feature (`notifications`)
- **Contract:** Declares delivery channels (Email, Slack webhooks, SMS) and templates.
- **Generator Integration:** Generates event listener hooks and integrations with third-party providers (e.g., Resend, Twilio).

### 4.3 Search Feature (`search`)
- **Contract:** Declares searchable tables, indexed text fields, and relevance rankings.
- **Generator Integration:** Generates database functions (PG Trgm/TSVector) and search UI searchbars.

### 4.4 Audit Logging Feature (`audit-logging`)
- **Contract:** Declares logged events, actor profiles, and database logging tables.
- **Generator Integration:** Inserts logging middleware into target API route handlers and compiles a secure dashboard layout.

---

## 5. Custom Code Integration & Roundtripping
Ensure developers can customize 100% of the generated application without losing custom logic upon subsequent code compositions.
- **Extensions Boundaries:** Formalize directories (`/extensions`, `/config`) as protected custom namespaces.
- **Contribution Points:** Enable developers to hook custom typescript classes or files into `extensionPoints` defined in feature contracts.
