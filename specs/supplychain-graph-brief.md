**Instructions**

This document takes inspiration from the practice of “Market Requirements Document” (MRD) and is not a spec. It is meant to explore the value we can deliver, not what or how to build it. Tell us what’s valuable.

**The gap:** In manufacturing and other business-to-business relationships, suppliers and providers often operate in separate Atlassian Cloud organizations. Cross-tenant collaboration currently relies on complex middleware such as Exalate or OpsHub. These integrations can break when APIs or customer configurations change; recovery and reconciliation are time-consuming and introduce delays into contractual work. The core concern is the third party between two Atlassian tenants. Without middleware, there is no lightweight, secure, native path to bridge tenant boundaries while respecting each organization’s permission model.

**Product thesis:** Atlassian can bridge this gap with **Forge and the Teamwork Graph (TWG)** to enable secure, permission-aware collaboration across tenant boundaries without requiring a third-party vendor in between.

# Vision Statement

For cloud-connected** manufacturing organizations** working in a contract-bounded supplier/provider relationship, **Supplychain Graph** is a **Forge** starter-pack app that connects 2 sites from different orgs. The connection allows governed workflows across usual Atlassian Cloud tenant boundaries.

Unlike traditional ALM middleware or fragile in-house synchronization code, it provides an opinionated, permission-aware collaboration layer: each organization remains authoritative for its own data, users explicitly authorize the connection, and only the minimum information needed for an approved workflow crosses the tenant boundary. The goal is not to merge organizations or replicate entire projects, but to make cross-company work reliable, observable, and governed.

## Story form

A **Supplier Systems Engineer** at a manufacturer coordinates with a supplier’s hardware and software engineers early. The 2 orgs collaborate during product requirements, interface definition, and technical-design reviews, before either organization commits to building parts or manufacturing anything. Today, they exchange specifications, architecture diagrams, interface contracts, prototypes, and review feedback through email, shared drives, and spreadsheets. The “state of the art” is fragile middleware across separate Atlassian organizations. Even in this “best case”, ownership, decisions, dependencies, and permission boundaries are difficult to track, so compatibility is a moving target that requires constant tweaking in production, if not full-on remediation & reconciliation.

With **Supplychain Graph**, the authorized engineer opens a governed cross-organization channel for the specific product or component. Across the channel, the manufacturer and supplier collaborate in the systems they already use: the manufacturer shares the customer requirements, project context, and design decisions needed for the work, while the supplier contributes technical proposals, evidence, and updates. Shared discussions, decisions, and changes remain traceable before they become expensive to build or rework.

The Jira administrator establishes a governed point-to-point connection with a specific supplier without deploying and maintaining a separate middleware estate. Using Atlassian’s Teamwork Graph, the administrator preserves relationships between people, work items, evidence, decisions, and source tenants while each organization remains authoritative for its own data and permissions. Each request and action carries its initiating identity, consented scope, source and destination, approval state, and outcome, giving the administrator a native audit trail and straightforward revocation and review controls. This operating model is stronger than ALM middleware, where teams typically maintain mappings, credentials, permissions, and audit context in a separate system that can drift as APIs and workflows change. When the connection is interrupted, Supplychain Graph surfaces the conflict and supports controlled reconciliation instead of silently losing updates.

## Target market

The near-term target is organizations that already use Atlassian Cloud and regularly collaborate with external suppliers, customers, or service providers across company boundaries.

- Automotive and industrial manufacturers coordinating supplier quality, engineering, and warranty work.
- Hardware, semiconductor, and embedded-product companies coordinating defects and release dependencies.
- Technology companies working with implementation partners or managed service providers.
- Regulated industries that need evidence of authorization, data minimization, and cross-company accountability.

The best early customers have recurring cross-tenant work, strong Jira adoption on both sides, and a high cost when status, evidence, or ownership becomes inconsistent.

### Demand indicators

- Teams manually exchange Jira exports, spreadsheets, email updates, or screenshots to coordinate shared work.
- Existing integrations require specialist maintenance whenever APIs, workflows, or customer configurations change.
- Customers need selective sharing rather than a full copy of another organization’s project data.
- Security and legal teams require explicit consent, revocable access, least-privilege scopes, and auditability.

### Competitive landscape

- **ALM middleware:** Exalate, OpsHub, and similar products can connect systems but add operational cost, configuration burden, and another party in the data path.
- **Custom integrations:** In-house services can fit a local process but are fragile, expensive to maintain, and difficult to standardize across customers.
- **Manual coordination:** Email, spreadsheets, exports, and meetings are easy to start but create stale data, duplicated effort, and weak traceability.
- **Full enterprise suites:** These may provide broad governance but are often too heavyweight for a focused cross-company workflow.

### Timing

Cloud customers increasingly collaborate across organizational boundaries while demanding stronger security and governance. Forge provides a governed extensibility model, and TWG provides relationship-aware context across Atlassian work. Together, they create an opportunity to make cross-tenant collaboration a platform capability rather than a bespoke integration project.

## Our position

This is not a new System of Work, a replacement for Jira, or a generic data synchronization platform. It is a focused collaboration layer for Atlassian Cloud customers. Each tenant remains authoritative for its own issues, workflows, identities, and permissions. Supplychain Graph coordinates an explicitly approved interaction and maintains the context needed to make that interaction reliable.

The app should default to data minimization: share only approved fields and evidence, preserve source links, avoid copying data that is not needed, and make the lifecycle of a connection visible. Forge enforces the application workflow and security boundary, while TWG preserves relationship context where supported. Consequential changes remain subject to human review and the source tenant’s authorization.

### Success factors

- **Native-feeling experience:** installation and authorization should be straightforward for both organizations.
- **Permission fidelity:** the bridge must never broaden access beyond what the source tenant permits.
- **Resilience:** retries, idempotency, clear failure states, and reconciliation must be designed in from the start.
- **Opinionated configuration:** provide reusable connection and workflow patterns instead of requiring customers to build every mapping from scratch.
- **Trusted automation:** distinguish retrieved facts, proposed actions, and approved changes; keep people accountable for consequential decisions.
- **Enterprise readiness:** provide audit events, connection ownership, revocation, data retention controls, and clear operational boundaries.

### Differentiation

- **Teamwork Graph as the relationship layer:** TWG connects people, work, and context across Atlassian, preserving the relationships that make cross-tenant collaboration meaningful rather than reducing it to a flat data copy.
- **Forge-native security and tenancy:** Forge provides Atlassian-hosted compute, authentication, identity, scaling, tenancy isolation, and data-egress controls so the app can enforce each organization’s permissions and keep data boundaries explicit.
- **Governed workflow orchestration:** Forge functions, triggers, APIs, and built-in storage support consented workflows, selective sharing, delivery state, audit history, retries, and reconciliation without requiring customers to operate a separate middleware estate.
- **Native experiences with low operational overhead:** Forge UI Kit and Custom UI enable an Atlassian-consistent experience, while managed development, staging, and production environments simplify deployment and ongoing operations.
- **Reusable extension model:** The starter app packages proven Forge and TWG patterns—authorization, relationship-aware context, permission filtering, workflow state, and auditability—so customers and partners can extend the solution without rebuilding the platform foundation.

## Mutual Success Factors

- **Activation:** two organizations establish an authorized connection and complete a real workflow.
- **Reliability:** updates are delivered, retried, and reconciled with clear outcomes.
- **Time saved:**teams reduce the time spent translating, duplicating, and reconciling cross-company work.
- **Faster delivery:** because partners can act more quickly and not wait for reconciliation
- **Governance:** every shared action is attributable, reviewable, and revocable.
- **Adoption:** customers expand from one pilot workflow to additional supplier or provider relationships.

## What next?

1. Discuss high-value cross-tenant workflows and security constraints with design partners.
2. Deepen (in documentation) a pros/cons analysis of ALM Middleware.
3. Prototype one end-to-end journey: connection request → approved scope → issue or evidence exchange → review → audit.
