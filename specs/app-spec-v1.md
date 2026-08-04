# UI & Design Specification: Supplychain Graph V1

## 1. Strategy & Scope

### Product intent
Supplychain Graph is a peer-to-peer, cross-tenant collaboration bridge for a manufacturer and supplier that are both using Jira. It makes a deliberately bounded, current view of a manufacturer delivery Epic available in the supplier tenant without turning the product into general Jira synchronization.

### V1 user outcome
A supplier user who can access the supplier's paired Epic can confidently see the **currently authorized manufacturer package**—its provenance, publication version, delivery-status summary, and direct child work items—while a manufacturer can reliably publish that view through an existing Jira workflow transition.

### Posture and placement
- **Posture:** Auxiliary.
- **Primary placement:** One Forge Jira Epic panel, shown only on Epics.
- **Discovery:** Authorized current snapshot objects are also discoverable in Teamwork Graph-powered Search/Rovo during an active connection.
- **Administration:** Site/app administrators configure pairings through an app configuration flow; this is not a second end-user panel.

### In scope
- Manufacturer-initiated, supplier-accepted bilateral pairing.
- One Forge app installed independently in both Jira tenants.
- A first-class peer relationship represented by **paired existing Jira Epics**.
- Read-only, versioned snapshots from a manufacturer source Epic to a supplier paired Epic.
- Source Epic plus direct children only.
- Fixed, minimal Jira field schema.
- Publication driven by a manufacturer-configured Jira Automation transition and a Forge Automation action.
- Native Forge `apiRoute` peer endpoints, with mutual narrow 3LO grants.
- Teamwork Graph connector ingestion and Search/Rovo discoverability of the current authorized snapshot only.
- Local, administrator-visible audit journals correlated across tenants.
- Candidate cancellation, asynchronous delivery, retries, and a visible publication state machine.

### Explicitly out of scope for V1
- Bidirectional Jira synchronization.
- Supplier structured responses, delivery commitments, risk declarations, or returned progress.
- Cross-tenant comments, attachments, issue history, user/watchers, assignee/reporter information, arbitrary custom fields, estimates, sprint data, components, labels, or issue-link payloads.
- Subtasks, arbitrary descendants, initiatives, or linked/dependent issue content.
- Named connection membership, explicit cross-company teams, delegated connection-owner roles, or app-managed pause/resume/disconnect states.
- A global dashboard, modal detail view, separate snapshot page, child-issue panels, or progressive-disclosure UX.
- A central Forge Remote coordinator, shared customer-data store, or custom authentication system.
- Cross-site hard-delete propagation.
- Product-level publication-expiry timeouts.
- Isolated Cloud support while `apiRoute` remains unavailable there.

## 2. Domain Model and Ubiquitous Language

| Term | Meaning |
| --- | --- |
| **Source Epic** | The manufacturer-owned Jira Epic whose approved subset is published. |
| **Paired Epic** | The supplier-owned, pre-existing Jira Epic bound to the Source Epic. It represents the supplier's internal delivery work. |
| **Pairing** | The bilateral relationship between exactly one Source Epic and one Paired Epic. |
| **Snapshot** | An immutable candidate or published representation of the fixed-schema Source Epic and its direct children. |
| **Current snapshot** | The latest successfully published snapshot. It is the only snapshot indexed for graph/search discovery. |
| **Candidate snapshot** | A queued or in-flight new version that is not yet visible to supplier users or Search/Rovo. |
| **Pairing reference** | A non-secret, single-use setup correlation link/code. It is not an authentication or authorization credential. |
| **Connection health** | The operational health of authorization, peer delivery, ingestion, indexing, and current publication. |
| **Delivery status** | The source work's progress, derived from Jira `statusCategory`; it is distinct from connection health. |

## 3. Roles and Authority

### Site/app administrator
Each tenant's Jira site/app administrator is the V1 connection administrator. Only this role may:
- initiate or accept a pairing;
- select/confirm its local Epic;
- complete native 3LO authorization for peer API routes;
- inspect pairing configuration and API authorization health; and
- stop participation by uninstalling the app.

### Manufacturer Automation connection user
The named user configured for the Jira Automation action is the publishing authority. At publish time the app verifies that the user still has access to the Source Epic and remains permitted to publish for that pairing.

### Epic viewer
Any user who can access the relevant local Epic may see the panel and its currently authorized snapshot content. V1 intentionally relies on local paired-Epic access as the authorization boundary.

## 4. Bilateral Pairing Flow

1. A manufacturer site administrator opens the Source Epic and initiates a pairing.
2. The app creates a non-secret pairing reference containing only opaque correlation and minimal setup context.
3. The manufacturer shares that reference through an existing business channel. V1 does not send email and does not provide a central broker.
4. A supplier site administrator opens the reference, installs/configures the same app if necessary, and sees only minimal pre-authorization context: manufacturer/site display name, app/environment identity, neutral reference identifier, and the high-level purpose of the pairing.
5. The supplier administrator selects an existing supplier Jira Epic as the Paired Epic.
6. Both administrators complete two separate, narrowly scoped native 3LO authorizations for Forge `apiRoute` calls:
   - manufacturer-to-supplier snapshot/candidate and lifecycle operations;
   - supplier-to-manufacturer acceptance and lifecycle operations.
7. The supplier explicitly accepts. Both installations record local acceptance events under the same correlation ID.
8. The pairing becomes active and awaits its first publication.

### Pairing-reference guardrails
- The reference grants no access by itself.
- It must not contain or reveal Jira issue content, OAuth tokens, custom scopes, shared secrets, or source-Epic key/title/description.
- Supplychain Graph must not build a custom auth mechanism: no passwords, API keys, bespoke JWT validation, user provisioning, identity proofing, or custom authorization server.
- Authentication and authorization remain native to Atlassian/Forge: app installation/admin context, 3LO, `apiRoute`, custom scopes, and pairing-state validation.

## 5. Publication and Delivery

### Workflow integration
The manufacturer configures a Jira Automation rule to invoke the Supplychain Graph **Publish Epic snapshot** action when a chosen Source-Epic workflow transition occurs. The transition is configurable per pairing; V1 does not require a standardized Jira status name.

### Publication authority
The Automation connection user is the accountable publisher. The app performs a synchronous preflight to verify:
- active pairing and valid mutual API grants;
- source/target relationship consistency;
- current Source-Epic access for the Automation connection user;
- fixed-schema eligibility and policy compliance; and
- source data can be read.

### Delivery model
After preflight succeeds, the Automation action queues asynchronous delivery. The current snapshot remains visible while a newer candidate is being delivered.

**Snapshot state machine**

```text
Draft
  └─> Preflight failed
  └─> Queued
        └─> Publishing
              └─> Published
              └─> Failed
              └─> Cancelled
```

- **Queued / Publishing:** candidate is not visible to supplier users, Search/Rovo, or cross-site references.
- **Published:** all required delivery, ingestion, and visibility checks succeeded; the new version becomes the single current snapshot.
- **Failed:** bounded retries have ended or a terminal error occurred; the prior Published snapshot remains current.
- **Cancelled:** an authorized site administrator or publisher stopped the candidate; the prior Published snapshot remains current.

### No product-level expiry in V1
A candidate does not expire merely because elapsed time passes. It remains queued/publishing until it succeeds, terminally fails, or is cancelled. The engineering implementation must still use resumable, idempotent background work and respect Forge platform execution limits.

### Cancellation
Cancellation is candidate-only:
- it stops remaining work for the candidate;
- keeps the last Published snapshot accessible;
- prevents the candidate from becoming searchable/discoverable;
- cleans up provisional cross-tenant references created for that candidate where feasible; and
- records actor, time, reason, and correlation ID locally.

### Size and batching
V1 has **no arbitrary Epic child-count cap**. It must page Jira reads, batch graph writes, retry idempotently, and render safely. Any later operational threshold must be established by benchmark evidence, not a product rule. Publication is rejected only when the request is invalid, unauthorized, unrepresentable, or cannot complete after bounded retries.

## 6. Fixed V1 Snapshot Schema

### Included Epic fields
- Jira key
- summary
- description
- issue type
- priority
- `statusCategory`
- publication version and timestamp

### Included direct-child fields
- Jira key
- summary
- description
- issue type
- priority
- `statusCategory`

### Snapshot metadata
- source tenant/site identity
- source-Epic identity
- paired-Epic identity
- publisher identity
- snapshot version and publication time
- correlation ID and non-content delivery state

### Excluded data
Comments, attachments, issue history, watchers, assignee/reporter data, sprint data, estimates, labels, components, issue-link content, arbitrary custom fields, subtasks, linked/dependency targets, and all hierarchy outside the Source Epic plus direct children.

## 7. Graph/Search Representation

- The Teamwork Graph connector creates/updates tenant-local, provenance-labeled objects representing the current shared Source Epic and included direct child work items.
- Relationships represent containment and the local paired-Epic association where supported by the connector model.
- Only the latest successfully Published version is indexed and discoverable.
- Superseded versions are suppressed from Search/Rovo; their historical evidence remains in local audit/panel history.
- Candidate snapshots must not become discoverable before they are Published.
- On app uninstall or unavailable-peer lifecycle signal, cross-site references and Search/Rovo discoverability are suppressed; V1 does not propagate hard deletion into the partner Jira site.

## 8. Single Epic Panel Specification

### Panel behavior
The one Epic panel uses the same app/module in both tenants and determines its local role from the paired-Epic relationship.

#### Manufacturer view
The panel displays:
- supplier pairing identity and state;
- configured Automation publication transition;
- connection health;
- current snapshot version, publication time, and publisher;
- candidate state and failures/cancellation when applicable;
- derived source delivery status;
- the full current fixed-schema list of direct child items; and
- a concise local audit timeline.

The panel does not add a separate general-purpose publish button; publishing is initiated through the configured Jira Automation workflow transition.

#### Supplier view
The panel displays:
- manufacturer/source provenance;
- connection health;
- current snapshot version and publication time;
- derived source delivery status;
- the full current fixed-schema list of direct child items; and
- a concise local audit timeline.

### Flat V1 interaction model
The panel is intentionally one dense, continuous surface. It has no progressive disclosure, modal detail view, global page, secondary panel, or child-issue panels. This is a deliberate proof-of-value constraint intended to surface which navigation, filtering, comparison, and response interactions future customers actually need.

### Hero information hierarchy
1. **Trust and availability:** active/current vs publishing/failed/unavailable.
2. **Provenance:** who published what, from which Source Epic, and when.
3. **Delivery status:** source `statusCategory` counts and optional derived completion percentage.
4. **Current package content:** Source Epic fields and all direct child items.
5. **Audit:** concise local event trail with shared correlation IDs.

### Delivery-status calculation
Delivery status is derived at publication time from Jira `statusCategory` only:
- To Do
- In Progress
- Done

The panel may show category counts and a completion percentage. It must label the result as **source snapshot progress** and must not portray it as supplier progress, connection health, risk, forecast, or a joint commitment.

## 9. State Matrix

| State | Manufacturer Epic panel | Supplier Epic panel | Search/Rovo behavior |
| --- | --- | --- | --- |
| **Ideal** | Active pairing, healthy grants, latest Published snapshot, full fixed-schema content, provenance, derived source progress, and audit events. | Same current snapshot/provenance/content under the supplier Paired Epic. | Current authorized snapshot discoverable. |
| **Empty** | Unpaired Epic: site admin sees an initiate-pairing path; ordinary users see that the Epic is not shared. | Unpaired Epic: show no inbound package and direct a site admin to use a pairing reference. | Nothing indexed. |
| **Loading** | Show a compact loading/skeleton state while local pairing, latest snapshot, and audit summary are fetched. | Same. | Not applicable in panel; no candidate should become searchable. |
| **Publishing** | Show candidate version/state and last Published version. Explain that the new package is not yet visible to supplier users. | Continue showing last Published version; do not expose candidate content. | Last Published version only. |
| **Error** | Clearly distinguish preflight error, API-grant/authentication error, peer delivery error, graph-ingestion error, and terminal failure. Show correlation ID and owner-oriented recovery guidance. | Show inbound-unavailable/connection-health message without leaking manufacturer internals. | Current Published version remains if it exists; otherwise nothing indexed. |
| **Cancelled** | Show candidate cancellation and retained prior current version, if any. | Continue showing prior current version, if any. | Prior current version only. |
| **Uninstalled / peer unavailable** | Suppress partner references and tell local users the partner connection is unavailable. | Equivalent behavior. | Suppress cross-site discovery. |

## 10. Peer API and Authorization Design

### Peer-to-peer boundary
- There is no Forge Remote control plane and no shared central customer-data store.
- Each tenant independently runs the same Forge app and retains local app state, local audit history, and local tenant-specific graph objects.
- The peer relationship is realized through direct calls to the partner installation's Forge `apiRoute` endpoints.

### Intended peer endpoints
Versioned API routes should be deliberately small, for example:
- invitation receipt/acceptance;
- snapshot candidate receipt;
- candidate cancellation;
- lifecycle/unavailability signal; and
- narrowly scoped status/acknowledgement operations.

### Scope design
Use a small, durable set of developer-defined custom scopes. Scope names are a compatibility commitment and must be chosen before registration. Separate read/write/lifecycle responsibilities rather than issuing a broad peer-administration scope.

### Required request checks
Every peer endpoint must validate:
- native 3LO authorization and required custom scope;
- expected counterpart installation identity;
- active/accepted local pairing;
- route-specific operation eligibility;
- correlation ID;
- idempotency key; and
- fixed-schema payload validation.

No peer endpoint may rely on the pairing reference as an authenticator.

## 11. Lifecycle, Retention, and Deactivation

### V1 stop control
V1 has no app-managed pause/resume/disconnect state. If either organization wishes to stop participating, it uninstalls the app.

### On local uninstall
- stop local publishing and receipt work;
- suppress local cross-site references and Teamwork Graph/Search/Rovo discovery;
- make a best-effort authenticated peer unavailable signal where platform lifecycle timing permits;
- avoid cross-site hard-delete propagation; and
- rely on native Atlassian/app-retention policies for underlying lifecycle rather than promising a separate Supplychain Graph deletion SLA.

### Retention posture
Do not promise that a soft-deleted/disconnected record is hard-deleted after a fixed number of days. Preserve only minimum local state needed for operational support, native lifecycle behavior, and non-content audit evidence.

## 12. Auditability

Each tenant retains its own administrator-visible, non-content audit journal. Every event includes a shared correlation ID; peer requests also include an idempotency key.

Record, without secrets or Jira-content payloads:
- invitation created/redeemed;
- authorization grant established/rejected/invalid;
- pairing accepted;
- publication preflight/queue/delivery/indexing outcome;
- cancellation;
- graph discoverability suppression;
- local uninstall/lifecycle handling; and
- received peer lifecycle signal.

There is no central audit ledger and no replicated audit-event store in V1.

## 13. Security, Privacy, and Legal Guardrails

- Treat all source Jira content as partner-shared only after explicit bilateral acceptance and successful native authorization.
- Enforce the fixed minimal schema; never provide arbitrary field mapping in V1.
- Do not create custom authentication or authorization mechanisms.
- Store any platform-supported OAuth refresh material only in Forge secret storage; never return it to a frontend or place it in logs/audit events.
- Do not log snapshot descriptions or issue content in operational/audit events.
- Keep scopes, API routes, and requested Jira permissions minimal.
- Use user-context authorization wherever applicable; if app-context Jira reads are needed for asynchronous publication, explicitly verify the publishing authority and Source-Epic access.
- `apiRoute` is a Preview dependency for this proof of value. Validate its current behavior, availability, custom-scope contract, and production readiness immediately before implementation/release.

## 14. Validation Gates Before Feature Implementation

The proof of value should not proceed past architecture validation until it demonstrates:

1. **Mutual 3LO feasibility:** a Forge installation can securely obtain, store, refresh, and use the two per-pairing native 3LO grants required to call a counterpart installation's `apiRoute` endpoints—without custom auth.
2. **Peer lifecycle behavior:** uninstall/lifecycle constraints and best-effort peer unavailable signaling are understood; the local and partner search-suppression guarantee is stated accurately.
3. **Connector authorization behavior:** current snapshot objects can be ingested with correct tenant-local visibility based on access to the supplier Paired Epic and are suppressed on lifecycle failure/uninstall.
4. **Atomic visibility behavior:** candidates cannot become discoverable before successful delivery/ingestion; prior Published snapshots remain visible during candidate processing and after candidate failure/cancellation.
5. **Load behavior:** realistic Epics with direct children and long descriptions can be paged, batched, ingested, and rendered without arbitrary product caps.
6. **Scope/manifest validation:** current `apiRoute`, Teamwork Graph connector, Jira Automation action, lifecycle, storage, and required permissions are verified against current Forge documentation before manifest implementation.

## 15. Future-Phase Candidates

- Explicit named connection membership and cross-company teams.
- Delegated connection owners and project-level pairing administration.
- Bilateral pause/resume consent flags, with Active effective only when both tenants consent.
- Supplier structured responses: accepted, needs clarification, blocked, proposal submitted, target date, and child-item dispositions.
- Supplier progress and joint delivery health.
- Selected attachments, evidence, comments, or richer data categories after governance review.
- Configurable standard-field allowlists and carefully governed custom-field mapping.
- Historical snapshot browsing, comparison, and version-filtered search.
- Focused child-item UX, filtering, navigation, dashboard/global surfaces, or modals—driven by evidence that the deliberate V1 flat-panel constraint is inadequate.
- Product-level delivery-expiry/timeout policies.
- Revisit `apiRoute` release status and platform support before production launch.

## 16. V1 Success Measures

- A manufacturer site administrator and supplier site administrator complete a bilateral pairing without a central coordinator or custom authentication.
- A configured Jira Automation transition publishes a manufacturer Source Epic snapshot to the accepted supplier Paired Epic.
- A supplier user with access to the Paired Epic can see the exact current authorized package, provenance, and source `statusCategory` progress in one Epic panel.
- A newer candidate does not replace the current snapshot until all delivery/indexing work succeeds.
- Candidate failure or cancellation preserves the last current snapshot.
- Search/Rovo returns only the current authorized snapshot while the connection is active.
- App uninstall suppresses local cross-site references/search visibility and does not promise cross-site hard-delete propagation.
- Local administrators can trace the complete lifecycle using local journals joined by correlation ID.
