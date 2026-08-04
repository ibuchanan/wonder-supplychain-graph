# Supplychain Graph — Epic Backbone

## Purpose

This is an **epic map**, not a delivery roadmap or a pre-populated Jira backlog.

The horizontal backbone names the enduring customer capabilities of Supplychain Graph. Each vertical iteration adds a thin, testable slice across the capabilities needed to prove or extend customer value. Later planning should add stories, acceptance criteria, UX detail, and technical tasks underneath these epics—without changing the backbone unless the product boundary changes.

The V1 boundary remains:

> A manufacturer publishes the current, read-only view of one Jira delivery Epic and its direct children to a supplier's paired Jira Epic, through a governed, peer-to-peer relationship.

## Mapping rules

1. **Name epics by customer capability, not by a Forge module or implementation layer.** For example, “Publish a governed package” is an epic; “Teamwork Graph connector” is an implementation concern within multiple epics.
2. **Build vertical slices.** A useful slice traverses administration, peer protocol, domain state, and user-visible outcome where needed. Do not schedule all APIs first, then all backend, then all UI.
3. **API-first is a non-negotiable delivery discipline.** Every change to a peer-facing route or payload starts with a reviewed versioned contract and a consumer simulation before Forge implementation begins.
4. **Keep the V1 proof of value narrow.** Read-only snapshots, current version only, fixed schema, Epic plus direct children, and one dense Epic panel are deliberate constraints.
5. **Do not turn the pairing reference into custom auth.** Platform-native installation context, 3LO, `apiRoute`, custom scopes, and pairing-state validation provide security.
6. **Treat later-phase capabilities as expansion points, not hidden V1 scope.** In particular: named connection membership, structured supplier responses, richer content, version history, richer UX, and bilateral pause/resume.

---

## Vendored reference implementations

The repository vendors the upstream `forge-teamwork-graph-examples` collection under `vendor/forge-teamwork-graph-examples/`. These are **reference implementations**, not production dependencies or the source of truth for current Forge behavior. Use them to accelerate pattern discovery, then validate all module syntax, permissions, limits, and security assumptions against current Forge documentation before implementation.

| Vendored example | What it demonstrates | Backbone use | Do not inherit blindly |
| --- | --- | --- | --- |
| `forge-twg-ingestion-gdrive-example` | `graph:connector` manifest wiring; connection validation/change callbacks; KVS secret lifecycle; root/child task orchestration; task-status updates; object/user/group ingestion. | Primary implementation reference for **Epic 3**, **Epic 5**, and operational parts of **Epic 6**: resumable ingestion, task state, connector lifecycle, and cleanup. | Its API-key form, webtrigger routing, sample data fallback, logging, and Google-specific schema are not Supplychain Graph design. Replace them with peer 3LO/`apiRoute`, fixed work-package schema, append-only audit events, and candidate visibility rules. |
| `forge-twg-ingestion-highspot-example` | A more structured connector with connection configuration, paged orchestration, root/child tasks, task metadata, object ingestion, failure classification, and test coverage. | Secondary reference for **Epic 3**, **Epic 5**, and **Epic 6**: idempotent/paged task orchestration, retryable vs terminal failure handling, per-connection task cleanup, and test seams. | Its Basic-Auth credential model, Highspot domain model, page-size configuration, and webtrigger are not part of the V1 peer protocol. Do not use it as a substitute for mutual 3LO grants or the API-first contract. |
| `forge-twg-smartlink-gdrive-example` | `graph:smartLink` URL patterns, resolver wiring, external OAuth provider configuration, and remote access to a third-party evidence system. | Future reference for **Epic 0**’s `EvidenceReference` port and later work-package expansion to Smart Links, attachments, or external records. | Smart Links are not a V1 payload type. Start by modelling them as provenance-preserving references with explicit access modes; do not copy external OAuth/client configuration or imply cross-tenant content replication. |
| `forge-twg-dashboards` | Native Forge UI Kit resources, frontend-to-resolver separation, graph/Cypher read queries, and rendering data from multiple work systems. | Reference for **Epic 4** and **Epic 5**: read-model shaping, resolver boundaries, constrained graph queries, and eventually richer package/discovery views. | It is a dashboard/widget app, not an Epic issue panel. Do not introduce a dashboard or broaden V1 scope; its broad multi-source query model must not bypass current-snapshot authorization or lifecycle suppression. |
| `forge-rovo-agent` | Rovo action/function wiring; constrained Cypher-over-GraphQL queries; normalization/extractors; evidence-only/anti-fabrication presentation discipline. | Future reference for **Epic 5** and later Rovo-assisted package discovery/explanation. Its extractor/query organization may inform Graph read adapters. | A Rovo agent is not in V1. Do not surface raw ARIs, let generated output invent cross-tenant facts, or make Rovo a source of authorization/audit decisions. |

### How the examples relate to Epic 0

Epic 0 defines the application-owned contracts; the vendored apps supply examples of outer adapters that may implement those contracts:

- `WorkPackageSource`: Jira becomes the V1 adapter; later Smart Link/attachment/external-source adapters can draw on the Smart Link and connector examples.
- `PeerTransport`: Supplychain Graph’s `apiRoute`/mutual-3LO transport is new; no vendor example replaces its OpenAPI contract.
- `PackageProjection`: the connector examples inform Teamwork Graph ingestion mechanics, while the dashboard and agent examples inform constrained graph reads.
- `AuditJournal`: none of the examples defines Supplychain Graph’s append-only audit contract. That remains an application-owned Epic 0 design, intentionally reusable in spirit with Gimbal rather than copied from vendor code.

### Reference-use rules

1. Read the relevant example’s README, manifest, and focused source before borrowing a pattern; do not vendor-copy an entire app or manifest.
2. Treat vendor manifests, external domains, OAuth client identifiers, app IDs, scopes, sample data, webtriggers, and credential storage as example-specific—not reusable defaults.
3. Keep the pure collaboration core independent of all vendor code. Vendor patterns belong in adapters only.
4. Preserve V1’s explicit boundaries: peer-to-peer transport, mutual narrow 3LO grants, no custom auth, fixed Jira schema, current snapshot only, and no candidate discoverability.
5. When implementation starts, record which vendor file informed a specific adapter or technical decision in that epic’s story/ADR/test documentation.

---

## Jira tracking

| Backbone epic | Jira Epic |
| --- | --- |
| Epic 0 — Define the collaboration contract and architectural seams | `SCG-9` |
| Epic 1 — Establish a trusted pairing | `SCG-11` |
| Epic 2 — Publish a governed work package | `SCG-12` |
| Epic 3 — Receive and preserve the current package | `SCG-13` |
| Epic 4 — Use the package in delivery work | `SCG-14` |
| Epic 5 — Discover the authorized package | `SCG-10` |
| Epic 6 — Operate the relationship safely | `SCG-15` |

## Backbone at a glance

| # | Epic | Customer capability | V1 outcome |
| --- | --- | --- | --- |
| 0 | **Define the collaboration contract and architectural seams** | Both tenants can rely on a stable, reviewable collaboration boundary that can grow beyond Jira-only snapshots. | Domain/event and append-only audit contracts, versioned peer API, mock/simulation, compatibility rules, and narrow ports/scopes exist before implementation. |
| 1 | **Establish a trusted pairing** | Manufacturer and supplier administrators form a governed relationship between two existing delivery Epics. | Manufacturer-initiated, supplier-accepted pairing with two mutual narrow 3LO grants. |
| 2 | **Publish a governed work package** | A manufacturer publishes an authorized Source Epic snapshot as part of normal delivery work. | Configured Jira Automation transition starts validated, asynchronous snapshot delivery. |
| 3 | **Receive and preserve the current package** | A supplier installation accepts only valid, authorized snapshots and keeps one trusted current version. | Candidate state, idempotent receipt, fixed schema, current-version replacement, and candidate-only cancellation. |
| 4 | **Use the package in delivery work** | Users can understand the current shared package on the relevant local Epic. | One dense, Epic-only, role-aware panel with health, provenance, source progress, and direct children. |
| 5 | **Discover the authorized package** | Authorized users can find the current package through Teamwork Graph-powered discovery. | Current snapshot only is indexed/searchable; candidates and superseded versions are not. |
| 6 | **Operate the relationship safely** | Administrators can understand, recover, and stop cross-tenant collaboration safely. | Local audit journals, clear delivery states, correlation IDs, lifecycle suppression, and uninstall handling. |

---

## Epic 0 — Define the collaboration contract and architectural seams

### Customer question
“How can each company trust the collaboration boundary—and how can the app grow from a Jira-only snapshot to governed multi-system work packages without rewriting its core?”

### Capability statement
Define the versioned collaboration contract before implementation: the pure domain vocabulary and state transitions, append-only audit-event semantics, peer API, and ports through which Jira, Teamwork Graph, storage, Smart Links, attachments, and future systems participate.

### Why this is an epic
The peer API is only one boundary in the product. Supplychain Graph needs a stable collaboration model that keeps authoritative systems authoritative, maintains only lean operational projections, and makes lifecycle decisions/provenance auditable. This same architectural discipline overlaps with Gimbal’s needs, especially append-only auditability and governed integration growth.

Epic 0 defines contracts and adapter rules; it does not build a generic integration framework or require every future adapter to exist in V1.

### V1 contract scope

#### Domain and event contract
Define the canonical terms and state transitions for Pairing, Source Epic, Paired Epic, Snapshot Candidate, Current Snapshot, publication, failure, cancellation, and discoverability suppression.

The pure core emits immutable, non-content facts such as:

- `PairingAccepted`;
- `SnapshotCandidateCreated`;
- `SnapshotPreflightRejected`;
- `SnapshotPublished`;
- `SnapshotFailed`;
- `SnapshotCancelled`; and
- `PeerUnavailable`.

#### Append-only audit contract
Define a versioned `AuditEvent` schema and an `AuditJournal` port. Events contain aggregate identity, event type/schema version, correlation ID, idempotency key, actor/tenant context, supplied timestamp, safe outcome/reason code, and provenance references. They do not contain secrets or copied work-package content.

#### Peer API contract
Initial route families should cover only:

- pairing invitation receipt and supplier acceptance;
- snapshot candidate receipt;
- candidate cancellation;
- narrow acknowledgements/status where required; and
- peer-unavailable/lifecycle signalling.

Every request includes a protocol version, correlation ID, idempotency key, and the minimum pairing identity required for validation. No route accepts Jira content outside the fixed V1 schema.

#### Ports and adapters contract
Define narrow, application-owned ports rather than leaking Forge/Jira/network I/O into the core:

- `WorkPackageSource` — normalizes a source system into a `SourcePackage`;
- `AuditJournal` — appends immutable audit events;
- `PeerTransport` — sends/receives protocol commands and receipts;
- `PackageProjection` — publishes or suppresses tenant-local projections; and
- `EvidenceReference` — represents future Jira issue, Smart Link, attachment, or external-record evidence with provenance and an explicit access mode.

Jira REST, Jira Automation, Forge `apiRoute`, Teamwork Graph, local storage, issue panels, Smart Links, attachments, and future PLM/ALM/MES/ERP systems are outer adapters. The core accepts values and commands, returns decisions/events, and never performs I/O.

### API-first and contract-first definition of done

- A versioned OpenAPI 3.1 contract exists, e.g. `specs/peer-api.openapi.yaml`.
- The domain-state/event vocabulary and append-only audit-event schema are documented and reviewed.
- Route names, methods, status codes, failure semantics, schemas, custom scopes, and compatibility policy are reviewed.
- A mock/simulation proves both manufacturer and supplier consumer flows before Forge endpoint implementation.
- Contract tests are shared by the caller and receiver implementations.
- The pure core is testable with values/events only; adapters are thin shells around I/O.
- Breaking changes require a new versioned capability or an explicit migration plan.

### First thin slice
A mock manufacturer submits a minimal pairing invitation to a mock supplier; the mock supplier accepts or rejects it with a correlated, idempotent response. The collaboration core returns a pairing decision plus append-only audit events. No Jira content is exchanged and no real HTTP/storage adapter is required for the core test.

### Important non-goals
- No custom authentication.
- No general-purpose remote API or generic integration framework.
- No shared runtime library with Gimbal before real common implementation needs emerge; share contracts and conventions first.
- No open-ended data schema or custom-field mapping.

---

## Epic 1 — Establish a trusted pairing

### Customer question
“How do two companies explicitly agree that these two delivery Epics may collaborate?”

### Capability statement
Let a manufacturer site administrator initiate a relationship and a supplier site administrator accept it, bind an existing supplier Epic, and establish peer authorization.

### V1 behavior

1. Manufacturer site administrator starts from a Source Epic.
2. The app generates a non-secret pairing reference to share through existing channels.
3. Supplier site administrator opens the pairing flow, installs/configures the app if needed, and sees only minimal pre-authorization context.
4. Supplier selects an existing Paired Epic.
5. Both sides establish two separate, mutual, narrow 3LO grants for the required peer routes.
6. Supplier accepts; both installations record the pairing locally with a shared correlation ID.

### First thin slice
Two local admin setup flows can establish a test pairing between two known Epics. The result is visible as an active pairing state in each local installation, but publishing is not yet required.

### Later meat

- Delegated connection owners.
- Project-level administration.
- Named cross-company membership/teams.
- Reusable supplier organization profiles.
- Bilateral pause/resume consent flags.

---

## Epic 2 — Publish a governed work package

### Customer question
“How do I publish the right delivery scope to a supplier as part of regular work, without accidentally sharing live backlog churn?”

### Capability statement
Turn a configured Source-Epic workflow transition into a deliberate, validated request to publish a read-only work-package snapshot.

### V1 behavior

- A manufacturer configures a Jira Automation rule and selects the Source-Epic transition that represents “ready to share.”
- The named Automation connection user is the accountable publisher.
- Synchronous preflight verifies pairing state, source access, authority, schema eligibility, and peer authorization.
- A valid request creates a snapshot candidate and queues asynchronous delivery.

### First thin slice
A configured Automation transition creates a candidate for one paired Source Epic, using a small fixed source payload. The manufacturer sees `Queued` or `Preflight failed` with a correlation ID.

### Later meat

- Publishing policy/templates by supplier or project.
- Publisher approval/review checkpoint.
- Configurable standard-field allowlists.
- Scheduled publication where customer evidence justifies it.

---

## Epic 3 — Receive and preserve the current package

### Customer question
“How do we safely receive a partner’s package without partial, duplicated, or stale data being treated as current?”

### Capability statement
Validate, receive, and atomically promote a fixed-schema candidate snapshot into the single current authorized package for a pairing.

### V1 behavior

- The supplier peer endpoint validates native authorization, scope, counterpart installation identity, pairing state, request version, correlation ID, idempotency key, and schema.
- Snapshot content is strictly Source Epic plus direct child items and the fixed V1 fields.
- Delivery runs asynchronously and idempotently.
- `Queued` and `Publishing` candidates are not visible to supplier users or Search/Rovo.
- A successful candidate becomes `Published` and replaces the current snapshot.
- A terminal `Failed` or `Cancelled` candidate preserves the previous Published snapshot.
- An authorized actor can cancel an in-flight candidate only.

### First thin slice
The supplier receives a minimal fixed-schema candidate from the manufacturer, records it locally, and promotes it to `Published` only after all receipt checks succeed.

### Later meat

- Structured supplier responses and dispositions.
- Supplier progress, joint delivery health, target dates, and blockers.
- Richer evidence/attachments after governance review.
- Historical version comparison.

---

## Epic 4 — Use the package in delivery work

### Customer question
“Can I understand what is currently shared, whether I can trust it, and how its source work is progressing without leaving my delivery Epic?”

### Capability statement
Render the current authorized package in one Jira Epic panel, using role-aware manufacturer and supplier context.

### V1 behavior

- The panel appears on Epics only.
- The same module detects whether the local Epic is the Source Epic or Paired Epic.
- The panel makes health and provenance primary: pairing state, current version, publication time, publisher/source identity, and delivery/ingestion state.
- Source progress is derived from Jira `statusCategory` counts for the Source Epic and direct children; it is explicitly not supplier progress or connection health.
- The V1 panel intentionally renders a flat, dense current package: Epic fields and all direct-child fields, with no modal, global page, progressive disclosure, child panel, or separate dashboard.

### First thin slice
After a snapshot is Published, an authorized supplier user opening the Paired Epic sees source provenance, version/time, `statusCategory` progress, and the fixed-schema content in the single panel.

### Later meat

- Filtering, pagination/virtualization UX, drill-in, comparison, and focused child views.
- Separate manufacturer/supplier experience modules if evidence supports them.
- Supplier response entry points.
- Global portfolio/dashboard views.

---

## Epic 5 — Discover the authorized package

### Customer question
“Can authorized people find the latest partner package through the tools they already use for work discovery?”

### Capability statement
Index the current authorized package in Teamwork Graph so that it participates in appropriate Search/Rovo discovery without exposing candidates or history.

### V1 behavior

- Ingest tenant-local graph objects for the current Source-Epic snapshot and direct child items.
- Carry provenance and current snapshot version metadata.
- Update stable graph objects when a newer snapshot is Published.
- Suppress candidate and superseded snapshots from Search/Rovo.
- Suppress cross-site references and discoverability when the relationship is no longer available locally.

### First thin slice
A Published package becomes discoverable through the intended Teamwork Graph-powered surface for an authorized user in the supplier tenant; an in-flight candidate does not.

### Later meat

- Historical version search/filtering.
- Richer graph relationships and dependency views.
- Broader evidence source types after governance review.

---

## Epic 6 — Operate the relationship safely

### Customer question
“When something fails or either party stops participation, can administrators understand what happened and prevent stale cross-tenant access?”

### Capability statement
Provide local operational visibility, recovery, and safe lifecycle behavior without a central control plane or cross-site hard-delete implementation.

### V1 behavior

- Local, administrator-visible, non-content audit journals record invitation, authorization, pairing, preflight, delivery, publishing, failure, cancellation, graph visibility, and lifecycle events.
- Corresponding peer operations are joined with shared correlation IDs and idempotency keys.
- State is visible as `Preflight failed`, `Queued`, `Publishing`, `Published`, `Failed`, or `Cancelled`.
- No product-level delivery expiry exists in V1; background work is resumable/idempotent within platform execution constraints.
- If either organization stops participating, it uninstalls the app. The local app suppresses local publishing, cross-site references, and Search/Rovo discovery; it sends a best-effort peer-unavailable signal where lifecycle timing permits.
- The product does not promise a separate hard-delete SLA or propagate hard deletes into partner Jira.

### First thin slice
An intentionally invalid publication produces an administrator-visible preflight failure with correlation ID and recovery guidance; no supplier content or graph object becomes visible.

### Later meat

- Bilateral pause/resume lifecycle state.
- Configurable delivery expiry/timeout policies.
- Reconciliation tools for peers with missing acknowledgements.
- Support/export workflows for audit evidence.

---

## Suggested iteration slices

These are **learning increments**, not commitments to a calendar. Each slice should leave a demonstrable outcome and generate evidence for the next slice.

| Iteration | User-visible learning goal | Thin vertical slice | Epics touched |
| --- | --- | --- | --- |
| **0 — Protocol proof** | Can the peer architecture be designed and simulated safely? | Publish an OpenAPI 3.1 draft; mock invitation, acceptance, snapshot candidate, cancellation, and lifecycle outcomes; validate mutual 3LO/API-route feasibility. | 0 |
| **1 — Pair two Epics** | Can two site admins complete a bilateral, peer-to-peer pairing without custom auth? | Manufacturer initiates, supplier selects an existing Epic and accepts, both local installations record active pairing. | 0, 1, 6 |
| **2 — Publish and receive a minimal package** | Can a configured Source-Epic transition deliver a small, valid read-only candidate to a partner and promote it safely? | Automation preflight → async candidate → authenticated peer receipt → Published/Failed result. | 0, 1, 2, 3, 6 |
| **3 — Make it usable in Jira** | Can supplier users understand the current shared package in their delivery Epic? | Epic-only dense panel renders the current package, provenance, health, and source `statusCategory` progress. | 3, 4 |
| **4 — Make it discoverable and operational** | Can authorized users discover only the current package, and can admins recover from normal failure modes? | Graph indexing/search visibility, candidate non-discoverability, audit journal, cancellation, retry/terminal failure handling. | 3, 5, 6 |
| **5 — Proof-of-value hardening** | Is the narrow workflow reliable enough for design partners to use and evaluate? | Load/permission/lifecycle validation; uninstall suppression; documentation; evidence capture for next-iteration decisions. | 0–6 |

## Sequencing constraints

1. **Do not implement peer endpoints before the corresponding OpenAPI contract and mock behavior are reviewed.**
2. **Do not expose panel content before candidate/current visibility semantics are proven.**
3. **Do not index the graph before authorization and lifecycle-suppression semantics are validated.**
4. **Do not broaden the schema before design-partner evidence identifies a specific missing field or response type.**
5. **Do not add a second surface to compensate for a V1 panel limitation; capture the observed limitation as evidence for the next epic-map slice.**

## Definition of a good story under this backbone

A story is ready to add beneath an epic when it names:

- the actor and local tenant context;
- the customer outcome it changes;
- the relevant peer contract operation or an explicit statement that none is involved;
- the current/pending lifecycle state affected;
- authorization/visibility expectations;
- observable success and failure outcomes; and
- the evidence it will produce for the next iteration.

Example story shape:

> As a manufacturer Automation connection user, when I move a paired Source Epic through its configured publish transition, I want preflight to create an asynchronous candidate with a correlation ID, so that I know the supplier will receive only an authorized snapshot and can diagnose a failure without exposing a partial package.

## Backbone review triggers

Revisit the backbone—not merely its stories—if any of these assumptions changes:

- the product stops being peer-to-peer;
- a non-Jira source becomes part of the core package;
- supplier responses become a V1 requirement;
- connection membership becomes required for safe access;
- the shared package stops being an Epic plus direct children; or
- `apiRoute`/3LO feasibility requires a materially different trust or transport model.
