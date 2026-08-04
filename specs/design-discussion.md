# Supplychain Graph — Design Discussion Transcript

> Raw-text record of the product-design discussion that led to the V1 specification. Tool output and system messages are omitted.

## Initial brief

**User**

> https://hello.atlassian.net/wiki/spaces/~ibuchanan/pages/7482052953/Supplychain+Graph+a+supplier-provider+cross-tenant+bridge
>
> https://developer.atlassian.com/platform/forge/manifest-reference/modules/teamwork-graph-connector/
>
> Use the `to-spec` skill and `grill-with-docs` to help me flush out a design spec for building the Supplychain Graph product in the first link. It will be based on the TWG Forge module linked in the 2nd.

**Assistant**

> I’ll ground the design in the existing Supplychain Graph brief and the current Forge connector module, then pressure-test the key product and tenancy decisions before drafting the spec.

## Decision 1 — V1 collaboration contract

**Assistant**

> **Recommended answer:** Build V1 as a **governed, asynchronous work-package exchange**, not a bidirectional Jira synchronization product.
>
> A manufacturer publishes a narrowly scoped package—requirements, interface constraints, selected issue context, and approved evidence—to one supplier. The supplier contributes a proposal, evidence, or status response. Each side remains authoritative for its own Jira projects and internal workflows.
>
> **Choose one:**
>
> 1. **Recommended — Governed work-package exchange:** approved requirements/context out; supplier proposal/evidence/status back.
> 2. **Bidirectional issue synchronization:** selected Jira issues, comments, attachments, and status transitions mirror between tenants.
> 3. **Evidence-only collaboration:** exchange documents, design reviews, and approvals, with no issue-level workflow.

**User**

> Governed work-package exchange is closer to the idea I want, yes.

## Decision 2 — Partner authorization

**Assistant**

> **Recommended answer:** Require a **bilateral administrator handshake**.
>
> 1. A manufacturer admin creates a pending connection and defines the initial scope.
> 2. The supplier admin receives a one-time invitation and reviews the requested relationship, permitted work-package types, data classes, retention policy, and named connection owners.
> 3. The connection becomes active only after the supplier accepts.
> 4. Either tenant can pause or revoke it immediately; revocation stops future exchange and initiates the defined cleanup/retention process.

**User**

> It's certainly a bilateral handshake. But I do think the manufacturer initiates the handshake, perhaps inviting the supplier to install the app and complete the handshake.

**Assistant**

> Recorded model: **manufacturer-initiated, supplier-accepted bilateral handshake**. The manufacturer invites a supplier to install/configure Supplychain Graph, proposes the connection scope, and the connection activates only after a supplier administrator completes acceptance.

## Decision 3 — Sharing unit

**Assistant**

> **Recommended answer:** Make **Work Package** a first-class Supplychain Graph object, rather than equating it to a Jira project, Epic, or issue.

**User**

> In V1, we want to scope this down to just Jira. Jira project (ie space) is too big, leading to batch sizes that are too big. Jira Epic (and children) seems right sized.

**Assistant**

> V1 constraint recorded: the sharing boundary is a **manufacturer Epic plus its descendants**, rather than an entire Jira project.

## Decision 4 — Local counterpart

**Assistant**

> **Recommended answer:** Model every active exchange as a **paired-Epic relationship**:
>
> - The manufacturer initiates with its **source Epic** and selected descendants.
> - During acceptance, the supplier selects an **existing supplier Epic** that represents its internal delivery work.
> - Supplychain Graph stores the pairing and exchanges only the approved work-package data and responses; it does **not** mirror either Epic’s full issue state, hierarchy, or workflow.

**User**

> Yes, paired epics seems right. This matches the model established by JPD (high-level planning & ideas) + JSW (the so called "delivery epic").

**Assistant**

> Domain framing recorded:
>
> - JPD remains the manufacturer’s high-level planning and idea context.
> - JSW delivery Epics are the operative, cross-tenant collaboration boundary.
> - Supplychain Graph pairs delivery Epics without trying to merge either tenant’s planning or delivery model.

## Decision 5 — Exchange protocol

**Assistant**

> **Recommended answer:** Exchange a **curated, versioned Jira work-package snapshot** plus **structured supplier responses**—not arbitrary Jira synchronization.

**User**

> I think the customer will want structured responses, but I'm ok if we scope down V1 to just read-only snapshot. We'll get feedback and use that to inform the structured responses.

**Assistant**

> V1 exchange protocol recorded: **read-only, curated, versioned snapshots**. Structured supplier responses are a future increment informed by customer feedback.

## Decision 6 — View authorization

**Assistant**

> **Recommended answer:** Use **explicit, named connection membership** with roles—not tenant-wide access and not automatic replication of Jira permission schemes.

**User**

> Option 2 seems simple enough. But I think some kind of "named connection membership" or explicit team formation is important longer run. Please make sure this get represented in out-of-scope for V1 and for later phase.

**Assistant**

> V1 authorization recorded: **destination-Epic access is the authorization boundary**. A supplier user may view an inbound manufacturer snapshot only when they can access the supplier’s paired Jira Epic. Named connection membership/explicit teams are out of scope for V1 and future-phase candidates.

## Decision 7 — Publication trigger

**Assistant**

> **Recommended answer:** Require an explicit **Publish snapshot** action by a manufacturer-authorized user.

**User**

> Yes, ideally publishing is integrated into the natural flow of work. For example, as a workflow transition. So that it's regular without being artificial as a scheduling.

**Assistant**

> Publication is intentional but workflow-native: a configured Source-Epic transition is the publication signal.

## Decision 8 — Workflow configuration

**Assistant**

> **Recommended answer:** Make the **publication transition configurable per connection**, rather than hard-coding a status such as “Ready for Supplier Review.”

**User**

> Yes, configurable publish transition. For implementation, that's probably just an Automation action, which is what would make it configurable for the manufacturer.

**Assistant**

> V1 integration recorded: manufacturer-configured Jira Automation rule → Supplychain Graph **Publish Epic snapshot** action → validated, immutable partner snapshot.

## Decision 9 — Automation authority

**Assistant**

> **Recommended answer:** Use the **named Automation connection user**—the accountable user configured for the rule—and re-check that user’s current authority at execution time.

**User**

> For V1, Named Automation connection user is good enough.

**Assistant**

> V1 publishing authority recorded: the named Automation connection user, with runtime validation of Jira access and connection-level publication authority.

## Lifecycle discussion

**Assistant**

> **Recommended answer:** Use immediate access revocation and payload deletion while retaining minimal non-content audit metadata.

**User**

> There are a few factors to consider here:
>
> * We shouldn't overpromise on the data retention. Atlassian's own underlying policy deletes after 60 days to allow for reactivation. https://support.atlassian.com/security-and-access-policies/docs/track-storage-and-move-data-across-products/
> * I'd rather not have any code responsible for propagating deletes, especially across a site boundary. I'd rather some form of "soft delete" letting customers do hard deletes manually.
> * I do agree disconnection stops future publications. And should prevent access to any cross-site references, including things indexed in the Search index.
>
> Does that cover enough on "hard revoke", quarantine, and archive?

**Assistant**

> The V1 lifecycle was changed to a **soft-disconnect model**:
>
> - stop future publications;
> - suppress cross-tenant access, references, and Search/Rovo discoverability;
> - retain only minimal local state/audit evidence needed for native lifecycle and support;
> - do not propagate hard deletions into the partner Jira site; and
> - do not promise a separate Supplychain Graph deletion SLA.

## Decision 11 — Discovery surface

**Assistant**

> **Recommended answer:** Make the supplier’s paired Jira Epic the primary surface, via a lightweight **issue/Epic panel**, while also allowing authorized snapshot objects to participate in Teamwork Graph/Rovo discovery during an active connection.

**User**

> Yes, I like the panel + graph/search.

**Assistant**

> V1 discovery recorded: a role-aware Jira Epic panel plus authorized Teamwork Graph/Rovo discovery.

## Decision 12 — Panel purpose

**Assistant**

> **Recommended answer:** Treat it as an **auxiliary, contextual panel** with a role-aware view—not a dashboard and not a second Jira workflow.

**User**

> yes, health & provenance. Maybe to distinguish from health, there's also status (how much of the work is done). Long-term, I like the idea of distinct panels for manufacturer vs supplier. Short-term for V1, I only want to build 1 app, with 1 panel.

**Assistant**

> Recorded:
>
> - one Forge app, one Jira Epic panel, two contextual modes;
> - the same panel detects source-Epic versus supplier-Epic context;
> - **connection health** is distinct from **delivery status**.

## Decision 13 — Delivery status

**Assistant**

> **Recommended answer:** Show a **publisher-reported snapshot progress summary**, derived at publication time from the manufacturer Epic and its included children.

**User**

> Derived based on `statusCategory` to reduce coupling to configuration.

**Assistant**

> V1 delivery status is derived from Jira `statusCategory`: To Do, In Progress, and Done. It is clearly labelled as source snapshot progress.

## Decision 14 — Hierarchy depth

**Assistant**

> **Recommended answer:** Publish the **Epic and its direct child work items only** in V1.

**User**

> Agreed, Epic + direct children only

**Assistant**

> V1 package hierarchy recorded: source Epic + direct children only. Subtasks, broader hierarchy, linked issues, and dependency targets are out of scope.

## Decision 15 — Snapshot schema

**Assistant**

> **Recommended answer:** Use a **fixed, minimal field schema** in V1.

**User**

> Yes, fixed minimal schema for V1

**Assistant**

> Fixed schema recorded. Included fields are Epic/child key, summary, description, issue type, priority, and `statusCategory`, plus snapshot provenance/version metadata. Comments, attachments, histories, people, sprint/estimate/component/label/link data, and arbitrary custom fields are excluded.

## Decision 16 — Package size

**Assistant**

> Proposed a hard validation limit for oversize packages.

**User**

> What does "too large to publish" mean? What kinds of underlying platform limits would make an Epic too large?

**Assistant**

> With current graph ingestion batching/rate limits and Forge asynchronous processing, an Epic with many direct children is not inherently invalid. The hard size limit was withdrawn.
>
> Revised recommendation: no arbitrary product child-count cap. Use paged source reads, asynchronous batched ingestion, idempotency, retries, and safe rendering. Establish any operational thresholds only after realistic benchmark testing.

**User**

> Yes.

## Decision 17 — Failure model

**Assistant**

> **Recommended answer:** Split failure handling into **synchronous preflight** and **asynchronous delivery**.

**User**

> Right, synchronous (and relatively fast) preflight and async delivery, with a clear state machine around it. For V1, no timeouts, so we might need a cancel action. Later we might put timeouts in place.

**Assistant**

> Snapshot state machine recorded:
>
> `Draft → Preflight failed | Queued → Publishing → Published | Failed | Cancelled`
>
> No product-level expiry timeout exists in V1. The implementation remains resumable/idempotent and respects platform execution limits.

## Decision 18 — Cancellation

**Assistant**

> **Recommended answer:** Cancellation affects **only the in-flight candidate snapshot** and preserves the last successfully published snapshot.

**User**

> Cancel candidate only.

**Assistant**

> Candidate-only cancellation recorded: stop the candidate, prevent its discoverability, retain prior Published snapshot, and record actor/time/reason locally.

## Decision 19 — Pause/resume

**Assistant**

> **Recommended answer:** Use independent, bilateral consent flags for pause and reactivation.

**User**

> Long-term the bilateral consent flags are a good idea. The connection should be bilateral. However, I don't think we need this extra state in V1. In V1, if either side wants to stop the connection, they uninstall the app.

**Assistant**

> V1 has no app-managed pause/resume/disconnect state. Uninstall is the customer-facing termination control. Bilateral consent flags are future scope.

## Peer-to-peer architecture discussion

**Assistant**

> A Forge Remote control plane was proposed to coordinate pairing/lifecycle state, while keeping snapshots tenant-local.

**User**

> The customer signal is strong that this should be "peer to peer", without a Forge Remote in the middle. That technical architecture reflects the business domain boundary.
>
> We can have direct app-instance callbacks but I'd rather use apiRoute in V1. It carries over some need for same use across instances in the short term. But I prefer the stronger auth model and more structured endpoint design.

**Assistant**

> Architecture recorded: peer-to-peer. Each tenant runs the same Forge app and exposes a small, versioned `apiRoute` surface. There is no Forge Remote coordinator and no shared customer-data store.

## Decision 20 — Preview dependency

**Assistant**

> `apiRoute` was identified as a Preview Forge capability and therefore a release risk.

**User**

> V1 is effectively a "proof of value" experiment. We can accept the risk of faster pace of change for Preview. Forge policy does allow Preview modules in production. It's likely the module will be GA before this app is ready to go to production anyway.

**Assistant**

> V1 accepts `apiRoute` Preview as a proof-of-value dependency. Its current release phase, scope contract, support, and production readiness must be revalidated before production release.

## Decision 21 — Per-pairing peer API authorization

**Assistant**

> `apiRoute` needs native 3LO OAuth authorization and custom scopes; it does not automatically trust another Forge installation that happens to run the same app.
>
> **Recommended answer:** Supplier-admin 3LO consent during pairing, using narrow per-connection scopes and platform-native secret storage.

**User**

> Yes, supplier-admin 3LO consent during pairing

**Assistant**

> Supplier-admin 3LO consent is part of the bilateral pairing flow. It is distinct from the manufacturer Automation connection user, which remains the business publication authority.

## Decision 22 — Mutual grants

**Assistant**

> **Recommended answer:** Require two separately authorized but mutual directional grants:
>
> - manufacturer → supplier: snapshot candidate and lifecycle operations;
> - supplier → manufacturer: acceptance and lifecycle operations.

**User**

> Yes, two seperate-but-mutual & narrow grants

**Assistant**

> V1 uses two separate, mutual, narrow 3LO grants for each paired-Epic relationship.

## Decision 23 — Pairing invitation UX

**Assistant**

> **Recommended answer:** Use a **single-use pairing link or code** that the manufacturer connection owner copies into an existing business channel.

**User**

> Yes, the UX/UI of copyable single-use pairing link/code is correct. But we have to be careful not to design/build a real auth mechanism. That has to be out of scope for legal reasons.

**Assistant**

> The link/code was renamed and constrained as a **pairing reference**:
>
> - it is not an authentication credential, bearer token, shared secret, or authorization mechanism;
> - Supplychain Graph must not build custom authentication—no passwords, API keys, bespoke JWT validation, identity proofing, custom authorization server, or user provisioning;
> - native Atlassian/Forge installation context, 3LO, `apiRoute`, custom scopes, and pairing-state validation remain the security mechanism.

## Decision 24 — Pre-authorization disclosure

**Assistant**

> **Recommended answer:** Show only non-sensitive pairing context before both native 3LO grants and supplier acceptance complete.

**User**

> Yes, minimal context.

**Assistant**

> Before authorization/acceptance, the supplier may see only manufacturer/site display name, app/environment identity, a neutral reference ID, and the high-level pairing purpose. No source Epic key/title/description/children/status/content is exposed.

## Decision 25 — Pairing administration

**Assistant**

> **Recommended answer:** Restrict V1 pairing administration to **Jira site/app administrators** in each tenant.

**User**

> Agreed, site admins only

**Assistant**

> Site/app administrators are the only V1 pairing administrators. Delegated connection owners and project-level administration are future scope.

## Decision 26 — Audit evidence

**Assistant**

> **Recommended answer:** Keep **independent local audit journals** in each tenant, joined only by shared correlation IDs.

**User**

> Agreed, local journals with shared correlation

**Assistant**

> Each tenant retains a local, administrator-visible, non-content audit journal. Peer calls carry correlation IDs and idempotency keys. No central ledger and no replicated audit store exist in V1.

## Decision 27 — Graph/Search versioning

**Assistant**

> **Recommended answer:** Index **only the currently published snapshot** for a paired Epic.

**User**

> Agreed, current snapshot only.

**Assistant**

> Teamwork Graph/Search/Rovo indexes only the current successful snapshot. Historical evidence remains in local audit/panel history and is not generally searchable.

## Decision 28 — Panel placement

**Assistant**

> **Recommended answer:** Show the panel on **Epics only**.

**User**

> Agreed, Epics only

**Assistant**

> The V1 panel is Epic-only. Direct children are published/indexed package content but do not receive child-level panels.

## Decision 29 — Panel density

**Assistant**

> **Recommended answer:** Use inline progressive disclosure for child work items.

**User**

> V1 doesn't need progressive disclosure. Overloading 1 UI panel will help force more design discussion for future iterations.

**Assistant**

> The V1 panel model was changed to an intentionally **flat, dense, continuous panel**:
>
> - health, provenance, source status, and the entire current fixed-schema direct-child list appear in one panel;
> - no expand/collapse, modal, secondary page, global dashboard, or child panel;
> - internal fetching may remain safe/efficient, but the user-visible model remains one flat surface.

**User**

> Yes

## Specification synthesis

**Assistant**

> The resulting specification captures:
>
> - peer-to-peer bilateral Forge app, installed in both Jira tenants;
> - manufacturer-initiated, supplier-accepted pairing of existing Jira Epics;
> - mutual narrow 3LO `apiRoute` grants, no custom authentication, and no Forge Remote coordinator;
> - configurable Jira Automation transition for publication;
> - async, stateful candidate delivery with cancellation and no arbitrary Epic-size cap;
> - read-only fixed-schema snapshots of a source Epic plus direct children;
> - current-snapshot-only Teamwork Graph/Search/Rovo representation;
> - one dense, Epic-only health/provenance/status/content panel;
> - local journals with shared correlation IDs;
> - uninstall-driven V1 termination, reference/search suppression, and no cross-site hard-delete propagation; and
> - technical validation gates before implementation.

The full synthesized design is recorded separately in the V1 specification document.
