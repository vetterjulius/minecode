Architekturkonzept: Deklaratives AI-First Software Composition System

1. Zusammenfassung / Vision

Grundidee

Das System ist kein klassisches Template-System und kein KI-Codegenerator.

Die Kernidee:

«Software-Anwendungen werden nicht primär durch KI generiert, sondern deklarativ aus wiederverwendbaren Software-Fähigkeiten zusammengesetzt. Die KI dient als intelligente Schnittstelle, um Anforderungen in eine standardisierte Beschreibung zu überführen.»

Das Ziel:

- drastische Reduktion von KI-Tokens
- Wiederverwendung von bewährtem Architekturwissen
- deterministischere Software-Erzeugung
- bessere Softwarequalität durch eingebaute Best Practices
- Austauschbarkeit des verwendeten KI-Agenten
- Möglichkeit zur Nutzung durch Menschen ohne KI
- Erweiterbarkeit durch eigene Features

---

2. Grundprinzipien

2.1 AI First, aber nicht AI abhängig

Entscheidung:

- Das System wird AI First entwickelt.
- Es besitzt aber keinen eigenen verpflichtenden Agenten.
- Der verwendete Agent ist austauschbar.

Unterstützte Nutzer:

- KI-Agenten
- Entwickler
- CLI-Nutzer
- perspektivisch grafische Oberflächen

Die KI ist nur eine Eingabeschnittstelle.

Die eigentliche Intelligenz liegt in:

- Feature Registry
- Knowledge Layer
- Contracts
- Resolver
- Composition Engine

---

2.2 Kein klassisches Templatesystem

Der Begriff "Template" ist zu einschränkend.

Das System basiert nicht auf:

- Datei-Kopieren
- String-Replacements
- Prompt-Sammlungen
- Boilerplate Templates

Stattdessen:

- Features
- Capabilities
- Contracts
- Dependency Resolution
- Composition
- Code Generation

---

2.3 Compiler-Modell

Das System funktioniert ähnlich wie ein Compiler.

Pipeline:

User Intent
    |
    v
AI / Menschliche Interpretation
    |
    v
Application Blueprint
    |
    v
Feature Resolution
    |
    v
Feature Graph
    |
    v
Composition
    |
    v
Code Generation
    |
    v
Normales Softwareprojekt

Die erzeugte Anwendung ist danach ein normales Projekt.

Kein Runtime-Zwang.

---

3. Zielbild Architektur

                    User / AI Agent / CLI
                              |
                              v
                         MCP Layer
                              |
          +-------------------+-------------------+
          |                                       |
          v                                       v
  Knowledge Layer                         Feature Registry
          |                                       |
          +-------------------+-------------------+
                              |
                              v
                    Application Blueprint
                              |
                              v
                    Dependency Resolver
                              |
                              v
                       Feature Graph
                              |
        +---------------------+---------------------+
        |                     |                     |
        v                     v                     v
 Business Features    Infrastructure Features    Extensions
        |
        v
 Primitive Modules
        |
        v
 Composition Engine
        |
        v
 Generated Application

---

4. Technologie-Strategie

4.1 Start-Stack

Entscheidung:

Zunächst nur ein Stack.

Empfohlen:

Frontend:
- Next.js
- TypeScript
- Tailwind
- shadcn/ui

Backend:
- Next.js Server Actions
- Route Handlers

Database:
- PostgreSQL
- Supabase

Authentication:
- Supabase Auth

Deployment:
- Vercel + Supabase

---

4.2 Multi-Stack-Unterstützung

Nicht Teil von v1.

Langfristig möglich:

Feature
    |
    v
Stack Adapter

Next.js
Django
Laravel
Spring
...

Wichtig:

Die Feature-Abstraktion sollte heute bereits nicht unnötig an konkrete Dateien gekoppelt sein.

---

5. Feature-Modell

5.1 Feature-Hierarchie

Vier Ebenen:

Starter Templates
        |
        v
Business Features
        |
        v
Infrastructure Features
        |
        v
Primitive Modules

---

6. Starter Templates (Ebene C)

Starter Templates sind vorkonfigurierte Feature-Sammlungen.

Beispiele:

- B2B SaaS
- Marketplace
- CRM
- Internal Tool

Sie enthalten keine eigene Magie.

Beispiel:

starter:
  name: b2b_saas

features:
  - authentication
  - organizations
  - billing
  - dashboard

---

7. Business Features (Ebene B)

Dies ist die Hauptabstraktion für Menschen und KI.

Beispiele:

- Authentication
- Organizations
- Billing
- Notifications
- File Management
- CRM
- Search

Ein Feature beschreibt eine Fähigkeit.

Beispiel:

feature:
  name: organizations

provides:
  - multi_tenancy
  - memberships
  - roles

requires:
  - authentication

---

8. Infrastructure Features

Nicht direkt sichtbar für Nutzer.

Beispiele:

- Permission Engine
- Tenant Context
- Navigation System
- Event System
- Audit Logging

Sie ermöglichen Business Features.

Beispiel:

Organizations

benötigt:

- Tenant Context
- Permission Engine
- Navigation Slots

---

9. Primitive Modules

Die kleinsten technischen Bausteine.

Beispiele:

- Datenbanktabellen
- API Routes
- React Komponenten
- Middleware
- Tests
- Migrationen

---

10. Feature Contracts

Ein Feature besitzt einen stabilen Vertrag.

Ein Contract beschreibt:

- Was wird bereitgestellt?
- Was wird benötigt?
- Welche Events existieren?
- Welche Permissions gibt es?
- Welche Extension Points existieren?

Beispiel:

feature:
  name: billing

contract:

  provides:
    entities:
      - Subscription

    events:
      - subscription.created
      - subscription.cancelled

    permissions:
      - billing.manage

  extension_points:
    - pricing_rules
    - invoice_generation

---

11. Feature-Komposition

Features dürfen andere Features enthalten.

Beispiel:

Billing

├── Subscription Management
├── Payment Provider
├── Invoice Engine
├── Customer Portal
└── Webhooks

Vorteil:

- Wiederverwendung
- weniger Duplikation
- kleinere Bausteine

---

12. Feature-konfiguration vs Custom Code

Grundregel:

«YAML beschreibt bekannte Variationen. Code beschreibt neues Verhalten.»

---

YAML geeignet:

Beispiele:

billing:
  trial_days: 14

authentication:
  providers:
    - google

---

Custom Code notwendig:

Beispiel:

extensions/
    billing/
        approval_workflow.ts

für:

- individuelle Geschäftslogik
- komplexe Regeln
- Spezialfälle

---

13. Extension System

Features dürfen nicht direkt Dateien anderer Features verändern.

Stattdessen:

Contribution-Modell.

Beispiel:

Nicht:

billing verändert sidebar.tsx

Sondern:

dashboard:
  sidebar:
    contributes:
      - billing

Features registrieren Beiträge.

Beispiele:

- Sidebar Items
- Settings Pages
- Events
- Hooks
- Permissions

---

14. Feature Registry

Die Registry ist der Kern des Systems.

Ein Feature besteht aus:

feature/

├── feature.yaml
├── contract.yaml
├── knowledge.yaml
├── config.schema.yaml
├── dependencies.yaml
├── modules/
├── migrations/
├── tests/
├── docs/
├── prompts/
└── examples/

---

15. Knowledge Layer

Die Registry enthält nicht nur Code.

Sie enthält Architekturwissen.

Beispiele:

- Best Practices
- Entscheidungsbäume
- Empfehlungen
- typische Fragen

Beispiel:

Authentication

Empfohlen bei B2B:
→ Organizations hinzufügen

Fragen:
- OAuth?
- MFA?
- Magic Links?

Best Practices:
- Rate Limiting
- Password Reset
- RLS

---

16. MCP Rolle

MCP ist keine reine Prompt-Schnittstelle.

MCP ist eine Architektur-API.

Mögliche Funktionen:

list_features()

search_features()

get_feature_schema()

get_feature_knowledge()

resolve_dependencies()

validate_blueprint()

validate_feature()

publish_feature()

---

17. Application Blueprint

Der Blueprint ist die Intermediate Representation.

Beispiel:

application:

features:

  authentication:
    provider:
      supabase

  organizations:
    invitations:
      enabled: true

  billing:
    provider:
      stripe

Der Blueprint beschreibt nicht Dateien.

Er beschreibt Fähigkeiten.

---

18. Dependency Resolver

Der Resolver arbeitet deterministisch.

Aufgaben:

- Dependencies auflösen
- Konflikte erkennen
- Versionen verwalten
- kompatible Module finden
- fehlende Features erkennen

Beispiel:

Billing

benötigt

Organizations

benötigt

Authentication

---

19. Feature-Versionierung

Features funktionieren wie Packages.

Beispiel:

app.lock.yaml

features:

 authentication:
   version: 2.1.0

 billing:
   version: 1.3.5

---

Updates:

- explizit
- migrationsbasiert
- niemals automatisch alles überschreiben

---

20. Generated Code Ownership

Drei Kategorien:

Managed Code

generated/

- Engine besitzt ihn
- darf überschrieben werden

Extension Code

extensions/

- Entwickler besitzt ihn
- bleibt erhalten

Project Glue

config/

- verbindet Features

---

21. Feature Trust Levels

Erweiterbarkeit ist vorgesehen.

Ebenen:

Builtin

Verified

Company

Community

Experimental

Alle Features benutzen denselben Contract.

Unterschied:

- Herkunft
- Verantwortung
- Vertrauen

---

22. Eigene Features

Eigene Features sind möglich.

Beispiel:

company-registry/

insurance-premium-engine
risk-scoring
compliance-workflow

Ein Unternehmen kann eigenes Architekturwissen speichern.

---

23. Experimental AI Features

Möglich über explizite Aktivierung.

Beispiel:

generation:

 allow_new_features:
   true

 experimental:
   true

Nicht Standard.

---

24. Feature Development Kit

Für Feature-Autoren.

Mögliche CLI:

compose feature create

compose feature validate

compose feature test

compose feature publish

Ziel:

- einheitliche Qualität
- automatische Checks
- weniger Chaos

---

25. Feature Quality Standards

Built-in Features sollten enthalten:

- Contract
- Dependencies
- Config Schema
- Migrationen
- Tests
- Dokumentation
- Upgrade-Pfade
- Extension Points
- Security Best Practices

---

26. Beispielablauf

User:

«"Erstelle eine B2B SaaS mit Teams, Rollen, Dateien und Stripe Billing."»

Agent erzeugt:

Intent

→ authentication
→ organizations
→ RBAC
→ storage
→ billing

Resolver:

Organizations
 benötigt:
 Authentication

Billing
 benötigt:
 Organizations

Composer erzeugt:

Database
API
UI
Tests
Migrationen

Individuelle Logik:

extensions/

---

27. Offene Fragen / noch nicht entschieden

27.1 Exakte Blueprint-Syntax

Noch offen:

- YAML Format
- JSON
- eigene DSL

---

27.2 Interne Datenmodelle

Noch offen:

Beispiele:

Feature
FeatureVersion
Contract
Module
Dependency
Migration
ExtensionPoint

---

27.3 Umfang von v1

Empfohlene erste Features:

1. Authentication
2. Organizations
3. RBAC
4. CRUD Resource Engine
5. File Storage
6. Billing
7. Notifications
8. Dashboard

---

27.4 Feature Authoring Details

Noch offen:

- Wie streng ist die Validierung?
- Wie sieht das Publishing aus?
- Welche Tests sind verpflichtend?

---

27.5 Code Generation Technik

Noch offen:

- klassische Templates intern?
- AST-basierte Generierung?
- Hybrid?

Entscheidung:

Extern nicht als Template-System modellieren.

---

28. Wichtigste Architekturprinzipien

1. KI beschreibt, Engine entscheidet.
2. Features statt Dateien.
3. Contracts statt direkte Kopplung.
4. Declarative Configuration statt Code für bekannte Varianten.
5. Custom Code nur für echte Individualität.
6. Registry enthält Architekturwissen.
7. Features sind versioniert.
8. Generated Apps bleiben normale Projekte.
9. Erweiterbarkeit ohne Verwässerung des Cores.
10. Qualität kommt durch standardisierte Feature-Struktur.

---

Fazit

Das System ist kein KI-Codegenerator.

Es ist eine Plattform, die Softwarearchitektur modularisiert.

Die KI ersetzt nicht Software Engineering.

Sie navigiert durch eine kodifizierte Sammlung von Software-Engineering-Wissen und erzeugt daraus reproduzierbare Anwendungen.
