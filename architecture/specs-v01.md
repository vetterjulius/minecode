Technische Spezifikation v0.1

Deklaratives AI-First Software Composition System

---

1. Ziel von v0.1

Ziel

Eine erste funktionierende Version des Systems, die:

- aus einem Application Blueprint eine lauffähige Next.js-Anwendung erzeugen kann
- Features aus einer Registry laden kann
- Feature-Abhängigkeiten auflösen kann
- Features validieren kann
- MCP als Schnittstelle für KI-Agenten bereitstellt
- Custom Extensions sauber trennt
- Feature-Versionen dokumentiert

---

2. Nicht-Ziele von v0.1

Folgende Dinge werden bewusst nicht gebaut:

- Multi-Stack-Unterstützung
- Runtime Feature Loading
- automatische Migration beliebiger bestehender Apps
- vollständig autonome Feature-Erstellung durch KI
- visuelle Oberfläche
- Community Marketplace
- komplexe AST-basierte Code Transformation

---

3. Technischer Stack

Composition Engine

Empfehlung:

TypeScript / Node.js

Begründung:

- gleicher Stack wie Zielanwendungen
- gute Integration mit Next.js
- gute YAML-Unterstützung
- einfache CLI-Erstellung

---

Storage

v0.1:

Filesystem-basiert.

Später:

- Datenbank
- Registry Server
- Package Registry

---

Kommunikation

MCP Server:

TypeScript MCP Server

---

Zielanwendung

Generated Apps:

Next.js
TypeScript
Supabase
PostgreSQL
Tailwind
shadcn/ui

---

4. Repository-Struktur

composition-engine/

├── apps/
│   ├── cli/
│   └── mcp-server/
│
├── packages/
│   ├── core/
│   ├── registry/
│   ├── resolver/
│   ├── composer/
│   ├── generator/
│   └── schemas/
│
├── features/
│   ├── builtin/
│   └── experimental/
│
├── stacks/
│   └── nextjs-supabase/
│
└── examples/
    └── b2b-saas/

---

5. Kernkomponenten

5.1 Core Package

Verantwortlich für:

- zentrale Typen
- Interfaces
- Feature Model

Beispiel:

interface Feature {
  id: string;
  version: string;
  metadata: FeatureMetadata;
  contract: Contract;
  dependencies: Dependency[];
}

---

6. Feature Registry

Aufgabe

Die Registry verwaltet Features.

v0.1:

Filesystem Registry.

Beispiel:

features/

builtin/

  authentication/

    feature.yaml
    contract.yaml
    dependencies.yaml
    modules/
    migrations/
    tests/

---

7. Feature Schema

feature.yaml

Beispiel:

id: authentication

version: 1.0.0

type:
  - business

stack:
  - nextjs-supabase

description:
  "User authentication capability"

maintainer:
  type: builtin

---

8. Contract Schema

Beispiel:

provides:

  entities:
    - User

  permissions:
    - user.read
    - user.update

  events:
    - user.created

  extension_points:
    - after_login


requires:

  features:
    - database

---

9. Dependency Schema

Beispiel:

dependencies:

  - feature:
      id: database
      version:
        "^1.0"

  - feature:
      id: email
      optional: true

---

10. Application Blueprint

Ziel

Beschreibung einer Anwendung.

Datei:

app.yaml

Beispiel:

application:

  name:
    project-manager


stack:

  id:
    nextjs-supabase


features:

  authentication:
    version:
      "^1.0"

    config:
      providers:
        - email


  organizations:

    config:
      invitations:
        true


  billing:

    config:
      provider:
        stripe

---

11. Resolver

Aufgaben

Der Resolver erzeugt einen Feature Graph.

Input:

features:
 - billing
 - organizations

Output:

Billing

requires

Organizations

requires

Authentication
Database

---

Resolver Regeln

Der Resolver prüft:

- existiert Feature?
- Version kompatibel?
- Dependency vorhanden?
- Konflikte?
- Stack kompatibel?

---

12. Feature Graph

Internes Modell:

interface FeatureNode {

  featureId: string;

  version: string;

  dependencies:
    FeatureNode[];

}

---

13. Composition Engine

Aufgabe:

Features zu einer Anwendung zusammensetzen.

Sie erzeugt:

- Dateien
- Migrationen
- Konfiguration
- Extension Points

---

14. Module System

Ein Feature besteht aus Modulen.

Beispiel:

authentication/

modules/

database/
  users.sql

backend/
  auth.ts

frontend/
  login-page.tsx

tests/
  auth.test.ts

---

15. Stack Adapter

Verantwortlich für Mapping.

Beispiel:

Feature sagt:

provides:

 api:
   authentication

Adapter entscheidet:

Next.js:

app/api/auth/*

---

16. Generator

v0.1:

Template-basierter Generator intern erlaubt.

Aber:

Öffentliches Modell bleibt Feature-basiert.

---

Beispiel:

Feature Module

↓

Generator Adapter

↓

Dateien

---

17. Extension System

Generated Projekt:

my-app/

generated/

extensions/

config/

Regel:

generated/
nicht manuell bearbeiten

---

18. Extension Contracts

Beispiel:

Feature definiert:

extension_points:

 - name:
     pricing_rules

   type:
     function

Extension:

export function pricingRules(input) {

}

---

19. MCP Server

Ziel

KI-Agenten Zugriff geben.

---

Tools v0.1

Feature Discovery

list_features()

---

Feature Details

get_feature(id)

---

Suche

search_features(query)

---

Blueprint Validierung

validate_blueprint(app.yaml)

---

Composition

compose_application(app.yaml)

---

20. CLI

Beispiele:

compose init

compose validate

compose build

compose feature list

compose feature inspect authentication

---

21. Erste Built-in Features

Pflicht für v0.1

Authentication

Enthält:

- Login
- Session Handling
- User Entity
- Password Reset

---

Organizations

Enthält:

- Tenants
- Memberships
- Invitations

---

RBAC

Enthält:

- Roles
- Permissions
- Middleware

---

Database

Enthält:

- Schema Management
- Migration Framework

---

CRUD Engine

Enthält:

- Standard CRUD Pattern
- Validation
- Forms
- Tables

---

Billing

Enthält:

- Stripe Adapter
- Subscription Model
- Webhooks

---

22. Beispiel Build Ablauf

Input:

features:

- organizations
- billing

Resolver:

organizations

+
authentication

+
database


billing

+
stripe


Composer:

create:

database migrations

API routes

React components

tests

config

Output:

Next.js Application

---

23. Validierung

Jedes Feature muss bestehen:

Schema Validation

- YAML korrekt
- Contracts korrekt

Dependency Validation

- Dependencies vorhanden

Build Validation

- Beispiel-App baut

Test Validation

- Tests erfolgreich

---

24. Versionierung

Feature:

authentication@1.0.0

App:

app.lock.yaml

Beispiel:

features:

 authentication:
   resolved:
     1.0.3

---

25. Entwicklungsreihenfolge

Phase 1

Core:

- Feature Model
- Registry
- Resolver

Phase 2

Generator:

- Next.js Adapter
- erstes Feature

Phase 3

MCP:

- Agent Integration

Phase 4

Weitere Features:

- Organizations
- Billing
- CRUD

---

26. Erfolgskriterium v0.1

Das System ist erfolgreich, wenn:

Ein Benutzer sagt:

«"Erzeuge eine B2B SaaS mit Login, Teams und Billing."»

und daraus automatisch entsteht:

- funktionierendes Next.js Projekt
- Datenbank Migrationen
- UI
- APIs
- Tests
- Erweiterungspunkte

während die KI nur:

- Anforderungen interpretiert
- Features auswählt
- Konfiguration erzeugt

und nicht den Großteil des Codes schreibt.

---

Zusammenfassung

v0.1 baut keinen KI-Programmierer.

v0.1 baut den ersten Compiler für deklarative Software-Fähigkeiten.

Die wichtigsten Artefakte sind:

1. Feature Registry
2. Feature Contracts
3. Dependency Resolver
4. Composition Engine
5. MCP Interface
6. Next.js Generator

Alles andere kann später darauf aufbauen.
