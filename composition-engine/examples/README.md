# Minecode Reference Examples

This directory contains reference applications and examples built using the Minecode composition engine.

## Directory Structure

- `b2b-saas/`: Our primary B2B SaaS reference application. It contains a fully end-to-end generated project composed of database primitives, multi-tenant organizations, Stripe billing integrations, authentication flow (including logins, signouts, password resets), and role-based access control.

## Usage

These examples serve both as integration test benchmarks and as guides for building application blueprints using Minecode. Do not edit the generated subfolders or files directly inside the examples unless explicitly writing documentation (e.g., this README) or configuring custom extensions inside the `extensions/` directory. Instead, customize the underlying compiler templates and blueprints (`app.yaml`) and regenerate them.
