# Design Notes: Binding Events to Teamwork Graph Projections

**Status:** Design direction captured; not implementation scope  
**Related specifications:**

- [`event-streaming.md`](./event-streaming.md)
- [`event-streaming-poc-implementation.md`](./event-streaming-poc-implementation.md)
- [`app-spec-v1.md`](./app-spec-v1.md)

---

## 1. Purpose

This note captures the intended relationship between **coarse-grained cross-tenant events** and **Teamwork Graph (TWG) projections**.

It deliberately does **not** specify the next implementation that evolves the current direct `DocumentObject` delivery into a typed work-item delivery. That evolution is a necessary convergence step, but its protocol, payload, and rollout are not decided here.

The direct Blue-to-Green webtrigger POC remains independently useful and is not blocked by this note.

## 2. Core model

A cross-tenant event is a **signal**, not a resource replication payload.

```text
Blue publishes a coarse-grained signal
  → Green validates its local pairing
  → Green Forge resolves the relevant local TWG projection
  → Green Forge applies a future local binding policy
  → Green updates or transitions a local Jira resource
  → Green Jira Automation reacts to that local Jira state
```

The event tells Green **that a resource may need attention**. The projection is the resource context that Green resolves locally. Jira Automation is not the Teamwork Graph client.

## 3. Definitions

| Term | Meaning |
| --- | --- |
| **Signal** | A lean CloudEvent that identifies a publication/change without carrying shared resource content. |
| **Projection** | A resource representation indexed into Teamwork Graph for discovery and, subject to API support, local query. |
| **Context resolution** | Green Forge’s local lookup of a projection identified by an accepted event. |
| **Binding** | The future application of an accepted projected resource to an already-configured Green Jira resource and its local workflow/configuration. |
| **Canonical shared schema** | The explicit, versioned set of source resource fields that may be indexed and considered for binding. It is not an arbitrary field bag or parsed prose. |
| **Green-local binding policy** | Green’s decision about whether, where, and how accepted shared fields affect Green Jira state. It does not give Green ownership of Blue’s source data. |

## 4. Event versus context boundary

### 4.1 Event contents

The direct-event POC uses an action-specific CloudEvent:

```text
scg:work-package:queued
```

Its intended resource locator is:

```text
(pairingId, issueKey)
```

The event must remain lean. It must not contain:

- issue summary, description, comments, or arbitrary document body;
- user or account identity data;
- Green issue keys or Green configuration;
- Teamwork Graph document content;
- webhook URLs or other bearer capabilities.

### 4.2 Context contents

If Green needs source-resource content, Green Forge obtains it from Green’s local TWG projection after validating the event and its pairing.

This preserves the separation:

| Concern | Event | Projection/context |
| --- | --- | --- |
| Purpose | Notify | Describe the resource |
| Payload | Identifiers and event metadata | Authorized resource fields/content |
| Cross-tenant data volume | Minimal | Resolved locally in Green |
| Consumer | Green receiver/Forge | Green Forge binding logic |
| Jira Automation role | Triggered by a local outcome | Not the direct graph reader |

## 5. Authority boundary

The prior discussion used “Green-owned” imprecisely. The intended division is:

| Concern | Authority |
| --- | --- |
| What Blue publishes | Blue, constrained by a bilateral/shared protocol and sharing policy |
| Canonical shared resource schema | Shared protocol, versioned explicitly |
| Whether Green accepts a signal | Green, using its active local pairing |
| Whether Green resolves the linked projection | Green Forge, after local validation |
| Where accepted data is applied in Jira | Green, because it owns its local projects, issue types, workflows, and custom fields |
| Whether a local Jira transition is allowed | Green-local policy and Jira permissions |

Blue must not be able to select a Green custom-field ID, transition ID, project, or workflow merely by sending a source value. Conversely, Green’s local mapping choice does not make Green the owner of Blue’s source content.

Pairing is bilateral, but local Jira application is always Green’s responsibility.

## 6. Jira Automation boundary

Native Jira Automation cannot directly import or execute the Forge `@forge/teamwork-graph` connector SDK, and it has no native smart value that dereferences a TWG document/object reference.

Jira Automation can:

- receive an incoming webhook payload;
- access Jira/Automation context and webhook smart values;
- call HTTP endpoints;
- invoke Forge-provided Automation Actions.

Therefore the intended future shape is **not** “Automation reads TWG.” It is:

```text
Automation or receiver activates Green Forge
  → Green Forge resolves graph context
  → Green Forge produces/applies a narrow local Jira outcome
  → Automation reacts to local Jira state when needed
```

Raw projection/document content should not become a general Automation webhook payload.

## 7. Supported Teamwork Graph read path: EAP constraints

Current Forge documentation describes a Teamwork Graph GraphQL/Cypher query API available from Forge backend code, including an application identity call of the form:

```ts
api.asApp().requestTeamworkGraph(query, variables)
```

This corrects the narrower observation that the installed `@forge/teamwork-graph` connector package exposes ingestion writes/deletes but no public read client. The connector SDK and the Teamwork Graph query API are distinct surfaces.

### 7.1 Near-term release posture

The intended near-term read capability is:

> **EAP, test-organization-only.** Green Forge may query a local TWG projection as the app to learn and validate the context pattern.

Known documented constraints to retain in all follow-up scope:

- Teamwork Graph API access is EAP and subject to change.
- The relevant graph read scopes must be declared (for this Jira-oriented app, `read:graph:jira` is expected; confirm exact scope requirements against current API documentation during implementation).
- Apps using the Teamwork Graph API and custom connector capabilities cannot currently be deployed to production or distributed under the documented EAP limitation.
- Only connector object types that map to supported/queryable API types can be read.

No production launch, distribution, or stable API guarantee may be inferred from an EAP context-read proof.

## 8. Current-state evidence and gap

The repository has two prototypes that must converge eventually, but neither should be treated as the finished binding system.

### 8.1 Working direct starter delivery

`starter.delivery` currently performs:

```text
Blue source Epic fields
  (id, key, summary, URL, timestamps)
  → Green webtrigger validates pairing
  → Green writes one DocumentObject
       displayName = "<source key>: <summary>"
       text body   = same value
```

It is valuable because the direct cross-tenant transport and local pairing validation work. It is insufficient as a binding resource because it is summary-only and does not update a Green Jira issue.

### 8.2 Existing package projection prototype

The package projection has richer in-memory domain data:

- summary and description;
- issue type and status category;
- priority;
- root/child role;
- pairing-scoped identity;
- package version and publication time;
- source/provenance details.

It indexes `atlassian:work-item` objects, but its current graph projection flattens several domain values into prose description and exposes only the standard graph fields it writes: display name, description, status, subtype, URL, timestamps, and pairing metadata.

It is not yet connected to the working direct peer-delivery flow.

### 8.3 Consequence

Do not yet design field/workflow mappings around either:

- parsing the starter document body; or
- parsing package provenance text from a work-item description.

Neither is a stable typed binding contract.

## 9. Agreed direction

The following design directions are agreed, but not all are implementation-ready:

1. **No third resource-exchange path.** Future work should converge the working direct delivery and richer projection experiments rather than add another independent protocol.
2. **Direct transport remains the spine.** The existing Blue → Green webtrigger, local pairing validation, and scoped identity are worth preserving.
3. **One root resource per event.** When context resolution is introduced, it should use a pairing-scoped, bounded point lookup for one root resource—not a child-package batch or arbitrary graph traversal.
4. **Configured paired Epic is the intended local landing resource.** The first binding direction updates/transitions the existing Green paired Epic; it does not create a new local issue or introduce a new cross-site identity model.
5. **Typed resource fields, not prose parsing.** The eventual binding schema should use verified queryable typed fields. The current `ExternalWorkItem` query model is the candidate to validate for core fields such as external ID, name, description, status, subtype, URL, timestamps, project/team, and selected people fields.
6. **EAP read proof is prerequisite evidence.** A Green Forge `asApp()` query of the same projection written by direct delivery must be demonstrated in a test organization before workflow/custom-field binding is specified.

## 10. Decisions intentionally deferred

The following are explicitly **not decided** by this note:

- The exact DocumentObject → WorkItemObject evolution, payload version, and migration/compatibility approach.
- The precise object-type/API mapping and GraphQL query shape to use for SCG’s connector data.
- The exact shared typed schema beyond the verified standard work-item field set.
- Whether/how priority, role, package version, or provenance acquire a supported typed query representation.
- The EAP proof packaging (dedicated harness/action versus another test-only path).
- Green binding configuration format, custom-field allowlist, transforms, status-to-transition mapping, and audit semantics.
- Any local Jira field update, workflow transition, or Jira Automation rule behavior beyond the current POC comment proof.
- Production-compatible fallback architecture after or without the EAP API.

## 11. Required planning sequence

Do not resume local Jira binding design until the following prerequisite is complete:

1. converge direct delivery and the typed root projection without creating a third path;
2. write one identifiable root projection through the direct path;
3. query that exact projection from Green Forge using the EAP Teamwork Graph API as the app in a test organization;
4. verify the returned type and fields are suitable for a proposed canonical shared schema.

Only then should a subsequent specification decide what allowed typed source values bind to which Green Jira fields/workflow actions.

## 12. Questions for the prerequisite spike

The next planning/implementation session should answer with executable evidence:

1. Does the direct connector object map to the intended queryable API type for EAP reads?
2. Which pairing-scoped identifier can be used as a safe, deterministic point-query predicate?
3. Which fields actually round-trip through ingestion and query without prose parsing?
4. Which GraphQL query and required scopes work from Green `api.asApp()` in a test organization?
5. How does Green prove the queried object is both pairing-authorized and the resource named by the event?
6. What is the smallest safe failure behavior when the projection is not yet queryable, stale, or mismatched?

---

## 13. Non-goal reminder

This note does not turn Jira Automation into a Teamwork Graph client, does not broaden the direct-event POC payload, and does not authorize any local Jira mutation. It records the boundary that will let those later steps be designed from evidence rather than from the current summary-only document prototype.
