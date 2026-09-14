# Peer-to-peer authentication and authorization

Review page: [Supplychain Graph — Initial authentication handshake (POC)](https://hello.atlassian.net/wiki/spaces/~ibuchanan/pages/7737805342/Supplychain+Graph+Initial+authentication+handshake+POC) — handshake sequence and security-critical requirements shared for review.

## Status

Draft for design review — 2026-09-08. Not approved for implementation.

This specification captures the requested happy path, labels its assumptions,
and records security decisions still requiring agreement. Requirements are not
claims about protections already implemented. Proposed defaults are not agreed
policy. This is a design specification, not an operator setup guide.

**Prior decision reopened — 2026-09-08:** the user explicitly reopened the V1
restriction on app-managed authentication. The original native 3LO / `apiRoute`
choice assumed cross-site use; the user subsequently learned that Forge
`apiRoute` intentionally cannot be used between two Atlassian sites. This is a
user-reported platform finding, not independently verified in this document.
Do not retain that mechanism as the assumed solution for peer transport.

**Protocol and library selected — 2026-09-08:** use OPAQUE for peer bootstrap
with `@cloudflare/opaque-ts`, avoiding the previously proposed WASM wrapper.
The user approved this design direction; Forge compatibility, the selected
package's exact OPAQUE revision/ciphersuite, and the detailed application
protocol still require verification. Selection is not evidence of completed
security/legal approval or permission to implement/deploy the unfinished flow.
Native Atlassian login remains the user identity boundary; OPAQUE supplies the
cryptographic handshake, not the app's consent and authorization lifecycle.

## Initial-handshake design completion criteria

**User-defined stopping point — 2026-09-08:** sufficient shared understanding to
produce:

- A Mermaid sequence diagram of the initial authentication flow, showing Toby,
  Tina, their authenticated browser interactions, both Forge installations, local
  authority checks, OPAQUE registration/exchange, bilateral confirmation, protected
  endpoint exchange, and the activation boundary. Distinguish public navigation
  and bootstrap addresses from private operational endpoints, and identify what
  information actually crosses each trust boundary.
- A concise bullet list of **important non-functional requirements critical to
  the security of that flow**, not a general feature backlog. Cover identity and
  consent binding, secret handling, protocol/context validation, freshness/replay,
  expiry, partial-failure safety, and abuse/disclosure controls for enabled paths.

Do not expand renewal or generalized delegation to satisfy these deliverables.
A diagram must not disguise unresolved bootstrap addressing or identity binding
as a generic “secure exchange” arrow. Keep platform/library feasibility claims
explicitly separate from agreed behavior. Remaining grilling questions should
resolve only decisions needed for this initial-handshake description and its
security-critical boundaries; no implementation is authorized by these criteria.

## Proof-of-concept scope boundary

**User decision — 2026-09-08:** implement initial relationship establishment and
an agreed finite end time. On expiry, deny business exchange without relying on
a scheduled cleanup job. Preserve the one-year default, editable end date, and
earlier revocation. There is no renewal flow in this POC.

Renewal remains **in sight, not in scope**: retain the future bilateral-approval
direction as design context only. Do not build renewal UI, APIs, proposal state,
confirmation flows, reminders, scheduling, or automatic extensions, and do not
block initial-handshake implementation on renewal decisions. Normal renewal
without repeated OPAQUE was proposed but never approved; leave it undecided.
Expiry is terminal for the POC relationship; any later re-establishment flow is
separate future work, not an implicit expiry bypass.

## Problem Statement

The demonstration exchanges graph projections and events directly between Forge
installations, but relies on an operator-run script to establish Pairings and
supply peer endpoints. This proves data movement, not peer-to-peer trust setup.

Administrators need to establish, inspect, renew, and revoke a narrowly scoped
cross-site relationship without an intermediary script, shared control plane,
or manual handling of opaque credentials. Unexpected or unverifiable states
must not authorize setup, disclosure, or data exchange.

## Solution

Provide a bilateral, time-boxed setup flow through the app on each site. Each
site verifies its own administrator's authority. Invitations disclose minimal
context and confer no authority. Each installation retains its own consent,
credential material, authorization state, and audit evidence. Operational
traffic travels directly between authenticated, authorized peers.

### Actors and terminology

| Name | Meaning |
| --- | --- |
| Toby | Works on Green Site; initiates setup as a Green administrator. |
| Tina | Works on Blue Site; receives the invitation and approves as a Blue administrator. |
| Green Site | Initiating site in this walkthrough. |
| Blue Site | Invited site in this walkthrough. |

**Confirmed membership decision — 2026-09-08:** Toby requires an administrator
account on Green only; he does not need an account on Blue. Tina visits and
authenticates on both Green and Blue: she acts as the named invitation recipient
on Green and as an administrator on Blue. Tina does not need Green administrator
rights. Presence as a user is not permission to administer that site. Retain
Tina's two-site authentication until an alternative bootstrap has been verified;
it does not by itself prove the identity of the Blue installation.

Site colors do not determine data-flow direction or manufacturer/supplier role;
existing demo scripts use a different color convention.

**Confirmed scope decision — 2026-09-08:** the OPAQUE handshake establishes a
reusable **Site relationship** for an **Authorization lease**, not one Epic
Pairing. Each **Pairing** still connects exactly one Source Epic and one Paired
Epic and requires separate authorization. Authentication of a peer never implies
access to all Epics or permission for every operation.

- Perform the setup ceremony per Site relationship and lease, not per Epic.
  Renewal mechanics remain to be specified.
- Revoking or expiring the Site relationship denies exchange for all its Pairings
  locally, subject to the separately documented remote propagation limits.
- Revoking one Pairing denies exchange for that Pairing only; other authorized
  Pairings may continue under the active relationship.
- For Pairing-scoped operations, both the Site relationship/lease and the specific
  Pairing authorization must permit the operation at use time. Relationship setup
  and management operations have their own narrow administrative permissions.
- A **Site relationship invitation** proposes site trust. It is distinct from
  the existing **Invitation** to pair two Epics. Unqualified invitation references
  in the authentication walkthrough mean Site relationship invitations.
- A **Pairing reference** remains non-secret correlation, never an authenticator.
  Site setup likewise uses non-secret correlation; identifiers for different
  purposes must not be interchangeable. **Local readiness** does not prove peer
  readiness.

These resolved terms are recorded in the domain glossary. **Directional grant**
remains a provisional term for permission to perform an explicit set of
operations against a named peer installation within an agreed scope. Who may
approve individual Pairings and the directional allowlists remain open.

### Pairing delegation: proof-of-concept scope and proposed evolution

**Confirmed proof-of-concept scope — 2026-09-08:** Epic Pairing can remain between
Toby and Tina for now. Delegation is expected to matter to customers but is not
required to complete this authentication proof of concept.

**User proposal for review, not yet approved:** the local Epic assignee requests
pairing with a connected site; the app sends a minimal authenticated invitation
event; the receiving site's administrator uses local Automation to create or
select an Epic, assign a delegate, and potentially accept the Pairing. Avoid a
separate human handshake UI for each Pairing. This is distinct from OPAQUE site
relationship setup, which remains bilateral administrator-controlled.

**Guardrail disposition — 2026-09-08:** the user requested that the following
control points be retained, but explicitly did not commit to implementing all of
them at once. This is a staged design backlog, not a single POC delivery checklist.
The POC remains limited to Toby and Tina; generalized delegation is deferred.

Control points to preserve as scope expands:

- **Actor correction — 2026-09-08:** Tina configures Automation on Blue. The
  receiving-rule example is therefore Green -> Blue: Blue's local rule handles
  an invitation from Green and creates/selects a Blue Epic and routes it locally.
  In the reverse direction, Green's locally authorized rule handles the request.
  Neither administrator gains control of Automation on the opposite site.
- Assignee is not inherently authority to share externally. Check initiating
  identity and current assignment server-side, plus native Epic access and an
  explicit administrator-approved project/peer sharing policy. Self-assignment
  must not silently bypass that policy. Distinguish the human initiator from the
  Automation execution actor. Define what reassignment does to pending requests.
- Assignment routes work; it does not itself constitute Pairing acceptance.
  A local Automation rule may implement delegated acceptance only under explicit
  authority. Binding an Epic and accepting must be deliberate app operations,
  with checks and audit evidence, not inferred from an issue-created event or
  successful webhook delivery. Until acceptance completes, no package sharing.
- Add a narrowly scoped pre-Pairing invitation event admitted under an active
  Site relationship and its invitation permission. The existing lean-event
  receiver requires an active Pairing and only handles queued-work events; do
  not weaken that gate for ordinary events to allow invitations.
- Peer input must not select local assignees, projects, arbitrary JQL, endpoint
  URLs, or actions without local validation/policy. An authenticated partner is
  still untrusted input to the receiving site's potentially powerful rule actor.
- Preserve stable invitation identity, expiry, decline/cancel semantics, local
  status, idempotent acceptance, and explicit acceptance acknowledgement. Retries
  and Automation loops must not create duplicate Epics/Pairings. Epic creation
  can succeed before binding fails; specify reconciliation rather than treating
  a webhook success as transaction completion. A disabled/missing rule leaves
  the invitation pending until expiry, not silently accepted.
- Bound invitations and rule execution per relationship to contain spam, resource
  cost, and loops. Keep invitation payloads minimal; no Source Epic content may
  leak through an invitation before Pairing authorization.
- A newly created local Epic is an explicit evolution of the older V1 requirement
  to select an existing counterpart. After creation, bind its actual identity;
  do not infer a counterpart from naming conventions.

Recommended separation for review: receive invitation -> local Automation routes
or creates work -> an authorized local decision binds/permits the counterpart ->
authenticated peer evidence communicates that decision. No separate human-facing
Accept Pairing UI is mandated. The status-category proposal below is a possible
native Jira expression of the local decision.

#### Suggested delivery stages (not yet an agreed implementation plan)

| Stage | Scope and controls |
| --- | --- |
| Auth POC | Toby and Tina, explicitly limited Epics/sites, selected OPAQUE bootstrap. Preserve authentication, bounded leases, exact peer/Pairing binding, validation, replay rejection, and fail-closed behavior for every enabled operation. Do not enable unrestricted invitation-driven Automation and call it secure while its controls are deferred. |
| Workflow-driven Pairing pilot | Add invitation admission under the Site relationship, locally controlled rule routing, bound counterpart identity, workflow eligibility, authenticated lifecycle evidence, stable invitation IDs, expiry, and retry/partial-creation handling for the enabled path. Manual reconciliation can be explicit in a controlled pilot; it must not activate an ambiguous Pairing. |
| Broader delegated use | Generalize initiator/project/peer policies, accountable rule execution, reassignment semantics, abuse controls, operator status and recovery tools. Review these controls before enabling the corresponding multi-user/untrusted-peer capabilities. |

Deferring a capability can defer the controls specific to it. It does not make
unknown authorization state safe or convert this POC into a production-ready
security implementation. Exact deliverables and sequencing remain to be agreed.

### Proposed workflow gate: Jira status category

**User proposal — 2026-09-08; semantics still under discussion:** a Pairing may
exchange business data only while the relevant Jira Epic's status category is
`In Progress`. Tina can use normal Jira workflow configuration rather than a
custom approval UI. The app does not prescribe particular status names.

Example Blue workflow:

| Local status (example name) | Jira category | Proposed meaning for exchange |
| --- | --- | --- |
| Acknowledge | To Do | Pending local review; no business exchange. The name itself is not acceptance. |
| In Progress / Accepted | In Progress | Eligible for exchange under an explicitly configured policy, provided all other auth/Pairing checks pass. |
| Cancelled | Done | Ineligible for exchange; category alone cannot distinguish cancellation from successful completion. |

Tina can configure a transition from `Acknowledge` to `Cancelled`, or an authorized
transition into an `In Progress` category status. Assignee/workflow permissions
and rule configuration determine who can make that decision; OPAQUE does not.

Distinguish three separate facts:

1. **Site trust:** the relationship is authenticated, unrevoked, and within lease.
2. **Pairing authorization:** the exact two Epics and permitted operations are
   bound under local policy. Merely finding an Epic already In Progress cannot
   establish a new Pairing or authorize another site's access.
3. **Workflow eligibility:** the designated Epic(s) are currently in the allowed
   category. Leaving it stops eligibility but need not erase the Pairing binding.

Proposed rule: exchange requires site trust AND Pairing authorization AND workflow
eligibility AND the operation's other prerequisites. `In Progress` is a necessary
gate under the current hypothesis, not a replacement for trust or scope checks.

**Working hypothesis — 2026-09-08; customer validation required:** both the Source
Epic and the Paired Epic must be in the `In Progress` category for business
exchange. The user favors this model but explicitly does not yet commit to it as
product policy. Do not encode it as an OPAQUE requirement or an immutable domain
invariant. Leave the glossary's activation semantics unchanged for now.

#### Decision dependencies and validation boundary

- **Can proceed independently:** OPAQUE/bootstrap identity binding, secret storage,
  relationship scope, leases/revocation, invitation privacy, signed request
  validation, and separation of relationship trust from individual Pairing
  authorization. None requires choosing Jira category policy.
- **Preserve now:** workflow eligibility cannot create trust or widen Pairing
  scope. Ineligibility is distinct from revocation. Lifecycle/control traffic
  must be distinguished from business-data traffic. Changing workflow policy
  must not invalidate the cryptographic handshake or silently widen existing
  approvals; approval of a changed sharing policy is a separate concern.
- **Defer final semantics until validation:** both-versus-one-side eligibility,
  whether category re-entry resumes exchange, completed-versus-cancelled outcomes,
  final-result delivery, early planning exchange, and visibility of previously
  indexed content. Customer scenarios should drive these choices.
- **Decide before implementing workflow-gated exchange:** how each side obtains
  authenticated remote eligibility evidence, its maximum acceptable age, event
  ordering and recovery, what happens during partitions, and how in-flight/queued
  operations respond to category changes. These are not prerequisites for a
  bootstrap-only POC, but cannot be left implicit in an end-to-end safety claim.
- **Minimal implementation boundary, if this hypothesis is prototyped:** keep the
  category predicate in the existing Pairing eligibility decision, separate from
  cryptographic verification. Return a clear not-eligible/unknown outcome without
  deleting the binding or keys. Use two-site cases to test both In Progress,
  either side To Do/Done, and unknown/stale evidence. Do not build a configurable
  policy engine or extra framework merely to preserve this hypothesis.

Customer validation should cover pairing before work starts, independently timed
work on the two sites, one side finishing first, cancellation, and reopening.
An immediate global stop cannot be inferred from asynchronously delivered Jira
status changes; any guarantee must state its observation and freshness bounds.

**Acknowledgement does not require a second human action.** A permitted Jira
transition may trigger the app/Automation to send authenticated evidence of
eligibility and the bound Epic identity automatically. Alternatively the peer
could obtain authenticated current state through a defined query protocol. In
both cases, the remote side needs verifiable evidence; a successful delivery to
Automation, a status label in an unsigned event, or an assumed transition is not
such evidence. The mechanism is not selected yet.

Control points and trade-offs to retain:

- Workflow categories express work progress, not inherently external-sharing
  consent. Opt the relevant project/workflow into this interpretation; an
  ordinary transition or rule edit must not accidentally widen sharing scope.
- `Done` includes completed and cancelled statuses. Use explicit status/outcome
  evidence if the partner needs the distinction; category alone supports only
  the eligibility gate. Likewise blocked/on-hold statuses may still be categorized
  In Progress, so this coarse gate may not represent every desired pause.
- Decide whether returning to In Progress resumes a still-authorized Pairing or
  requires renewed consent. Reopening must never revive an expired lease or a
  revoked relationship/Pairing. Initial Epics already In Progress also need an
  explicit binding/approval policy, not inference from a missed transition.
- If both Epics must be In Progress, one site's backlog/completion stops both
  sites' business exchange and may prevent early planning context. If only Blue
  gates acceptance, Green's independent outbound authorization still applies.
- Transition events can be missed, delayed, duplicated, or arrive out of order.
  Validate current local state before effects; define bounded freshness and
  ordering for remote evidence, and fail closed when required evidence is stale
  or unavailable. Short JWT validity alone does not prove current Jira state.
- Lifecycle/control messages (decline, category exit, revocation, acknowledgement)
  need narrow permissions outside the business-data gate, or a Done transition
  could prevent its own stop notification. Revoked credentials must not regain
  business authority merely to deliver control messages; define that path
  separately. Completion/final-result payload policy remains open.
- Stopping new exchange is separate from visibility of already-indexed graph
  content. Do not silently reinterpret the existing soft-disconnect policy as
  deletion or visibility removal on every status-category transition.

Reference: [Atlassian statusCategory and statusCategoryChangedDate JQL guide](https://support.atlassian.com/jira/kb/how-to-search-using-statuscategory-statuscategorychangeddate-function-with-jql/),
read 2026-09-08. It confirms the three categories and category filtering; it does
not establish an authorization or cross-site acknowledgement protocol. The
existing glossary's administrator Acceptance / Pairing activation definitions
remain unchanged until the replacement lifecycle semantics are agreed.

### Invitation delivery and destination nomination

**User decision — 2026-09-08:** Toby knows Tina, not her Blue site. The app
produces an invitation URL for Toby to deliver out of band (email, Teams/Slack,
QR code over a call, or another channel of his choice). Delivery integrations,
channel verification, and delivery receipts are not the app's responsibility.
The URL is navigation/correlation, not a credential; sharing this link is the
explicit exception to avoiding manual handling of opaque values. No secret or
operational endpoint is included in it.

The invitation does not require Toby to supply Blue's URL or installation ID.
Tina nominates the destination through her authenticated interaction with the
app on that site. Bind the resulting destination to the immutable setup context
before granting peer access; never treat an unverified URL parameter as proof of
an installation's identity or local administrator authority.

**Approved destination-consent decision — 2026-09-08:** Tina nominates Blue;
Toby must then explicitly approve that site on Green before the relationship can
activate. The initial invitation authorizes participation in setup, not delegation
of the final site choice. Green verifies Toby's current local administrator
authority when he approves. His approval must bind the nominated site identity,
setup attempt/version, agreed scope, and expiry; changing the nomination or
approved terms invalidates that approval. A claimed site name or URL alone is
not verified peer identity.

No active business grant or operational endpoint disclosure is permitted merely
because nomination or OPAQUE key establishment succeeded. Provisional protocol
state may exist for verification without implying activation. **Approved ordering — 2026-09-08:** Tina completes her authenticated steps on
both sites, nominates Blue, and completes OPAQUE before Toby reviews the
nomination. Toby's explicit Green-side approval is the final human action.
The apps then exchange protected operational endpoints and complete authenticated
bilateral activation confirmation. OPAQUE-derived keys remain provisional and
restricted to setup until the approval and required confirmations are complete.
Rejection or setup expiry invalidates the attempt and its provisional credentials;
cleanup failure must not leave them usable. OPAQUE completion alone does not
constitute independent platform attestation of Blue's identity.

One destination is sufficient for the POC, not a long-term cap on Tina's sites
or relationships. Single-use invitation consumption remains the proposed safety
rule, separate from future support for multiple independent relationships.
**Approved recipient binding — 2026-09-08:** Toby selects Tina's existing Green
user account when generating the invitation. Green stores its stable account ID
with the invitation and checks the authenticated caller against it server-side
for every recipient setup mutation, including nomination and OPAQUE registration.
Display names, email strings, URL parameters, and possession of the link are not
substitutes for that identity check. Another user receiving a forwarded link
cannot assume Tina's role. Out-of-band delivery is not authentication. Tina gains
no general administrative rights on Green.

### Happy-path assumptions and safety obligations

Each assumption needs a concrete detection mechanism and recovery flow before
implementation is ready. The fallback column specifies the minimum safe outcome,
not a completed recovery design.

| ID | Happy assumption | Required verification / safe fallback |
| --- | --- | --- |
| H1 | The intended app is installed and enabled on both sites, in compatible environments and protocol versions. | Establish trustworthy installation identity and environment binding; a claimed site URL is insufficient. Missing or unverifiable installation blocks setup. |
| H2 | Toby is a currently authorized Green administrator; Tina is a currently authorized Blue administrator. | Verify authority server-side from native identity/context at privileged transitions. Client-supplied role flags are not evidence; denied or unavailable checks block the transition. |
| H3 | Toby has usable Green access; Tina has usable Green and Blue access. Toby needs no Blue account. | Resolve actual account identities and required site access, not display names or email alone. Missing required access must lead to native provisioning/access processes, never automatic privilege elevation. |
| H4 | Tina receives the intended invitation out of band and authenticates as the intended recipient. | Bind server-side invitation state to the recipient under the agreed recipient policy. Bind the destination once nominated and authorized, not at invitation creation. Possession or forwarding of the link alone must not permit acceptance. |
| H5 | Each person is interacting with the genuine site/app and the intended counterpart. | Establish trusted navigation and native identity verification. A pairing reference, user-entered callback URL, or shared phrase alone cannot prove installation identity. |
| H6 | Both administrators approve the same scope, direction, lease, and protocol context. | Bind approvals to the same immutable setup attempt/version. A scope change invalidates prior consent. |
| H7 | An authenticated bootstrap mechanism can establish peer trust without an intermediary script or exposing operational endpoints. | Resolve the bootstrap protocol before claiming this path executable; if peer identity/key provenance is unverified, remain pending. |
| H8 | If shared-secret authentication is selected, both installations securely obtain suitable matching key material. | Require authenticated key establishment and bilateral key confirmation. Mismatch or uncertain provenance blocks activation; never fall back to URL secrecy. |
| H9 | Both sites can durably store secrets and enforce one-use transitions and replay protection under concurrency. | Verify storage capabilities; storage failure or ambiguous consumption blocks authorization. |
| H10 | Setup completes within deadlines and clocks remain within the agreed skew allowance. | Use server time and bounded skew. Expired, implausibly future-dated, or missing timestamps fail closed. |
| H11 | Both peers remain reachable long enough to finish authenticated confirmation. | Partial success does not authorize business traffic. Specify bounded retry and recovery from lost acknowledgements. |
| H12 | Required local graph connections and approved business scope are ready for the operation. | Check operation-specific prerequisites separately from auth; an active lease does not create graph permissions or authorize publication. |
| H13 | No revocation, uninstall, role/access change, or key compromise occurs during the happy path. | Recheck mutable authorization state at use; define invalidation and notification behavior before rollout. |

### Happy-path sequence (proposed, not a finished protocol)

| Step | Expected behavior | Assumptions and explicit boundary |
| --- | --- | --- |
| 1. Initiate | Toby signs into Green, selects Tina's existing Green account, and starts setup without knowing her destination site. Green verifies his local admin authority and stores the selected recipient's stable account ID with a bounded pending attempt. | H1–H6. This invites nomination; Toby must approve the nominated site afterward. No active grant, operational endpoint disclosure, or business-data transfer. |
| 2. Invite | The app produces a navigation URL for Toby to deliver to Tina out of band. It carries only non-secret setup correlation and minimal approved display context. | H4–H5. The app does not send invitations or verify the chosen delivery channel. Exact disclosure allowlist remains open. No webtrigger URLs, credentials, JWTs, or Epic content. The reference is time-boxed and single-use for setup, not a bearer credential. |
| 3. Authenticate recipient | Tina follows trusted app navigation and authenticates using native Atlassian identity. Green permits only the narrowly scoped recipient step, not Green administration. Blue independently checks her Blue admin authority. | H1–H5. Account/site binding mechanism remains to be specified. Neither site trusts a browser assertion about authority on the other. |
| 4. Nominate | Tina nominates Blue and approves its participation as Blue administrator, binding her approval to the proposed destination, scope, and lease. | H6. No active business authorization; Toby has not yet approved the destination. |
| 5. Establish provisional keys | Tina finishes her steps on both sites. The installations complete OPAQUE via `@cloudflare/opaque-ts` using her locally entered phrase; keys are derived, not sent between sites. | H7–H9. Keys authorize setup only. Exact identity/context binding, bootstrap addressing, and Forge compatibility still require verification. |
| 5a. Final human approval | Toby reviews the OPAQUE-backed nomination in Green and explicitly approves the same destination, scope, and lease. Green rechecks his current administrator authority. | H6. This is the final human action, not permission to skip automated endpoint validation and activation confirmation. Rejection or setup expiry invalidates provisional authority. |
| 6. Confirm | Both installations verify peer identity, approval scope, freshness, and possession of the required credentials, and durably record confirmation. | H6–H11. One local acceptance is not proof of completed bilateral authorization. Define the protocol for partial completion and lost responses. |
| 7. Complete setup | Only after the required confirmations may operational endpoints be disclosed to the authenticated peer and stored server-side. They are never displayed to people or logged. | H7–H11. Bootstrap addressing must be distinct from withheld operational endpoints; do not use those endpoints to justify their own authentication. |
| 8. Exchange | Each outbound operation gets fresh authentication evidence; the receiving site validates it and its current local grant/lease before applying any side effect. | H9–H13. Apply equally to graph-bound payload delivery, events, callbacks, and lifecycle calls. |
| 9. End | Either administrator can revoke locally; expiration stops new exchange without waiting for a scheduled job. The POC has no renewal flow. | H10, H13. No extension or grace period. Future renewal is out of scope. Remote revocation propagation and graph visibility have separate guarantees below. |

## User Stories

1. As Toby, I want to start setup from Green, so that no operator script has to establish trust.
2. As Toby, I want to generate an invitation URL for Tina and deliver it myself without knowing her site, so that relationship setup follows the business contact rather than requiring prior technical site knowledge.
3. As Tina, I want to authenticate through Atlassian, so that the app does not replace my account login.
4. As Tina, I want to participate without Green administrator rights, so that cross-site setup does not require unnecessary privileges.
5. As Toby, I want to complete setup without a Blue account, so that each site's administrator controls its own consent without unnecessary cross-site provisioning.
6. As either administrator, I want to review the exact peer identity, scope, directions, and expiry before approval, so that consent is informed and bounded.
7. As either administrator, I want invitations to disclose minimal information, so that forwarded links do not leak endpoints or work data.
8. As either administrator, I want the app to handle opaque credentials, so that I do not copy, paste, write down, or store them myself.
9. As either administrator, I want missing installation or account access detected safely, so that setup cannot proceed on unverified assumptions.
10. As either administrator, I want partial setup to remain inactive, so that a timeout or storage failure cannot accidentally grant access.
11. As either administrator, I want separate narrow permissions in each direction, so that cooperation does not imply unrestricted cross-site access.
12. As either administrator, I want a visible finite lease that stops exchange at the agreed end time, so that authorization does not persist indefinitely. Renewal is future work, not part of this POC.
13. As either administrator, I want unilateral revocation to take effect locally immediately, so that partner unavailability cannot prevent my site from stopping exchange.
14. As a receiving installation, I want to reject forged, modified, expired, replayed, or out-of-scope requests before side effects, so that events and graph delivery enforce the same boundary.
15. As a sending installation, I want to retry a failed operation without duplicating its effect, so that security does not require abandoning reliable delivery.
16. As either administrator, I want safe local audit evidence, so that I can distinguish incomplete, expired, revoked, and active setup without exposing secrets.
17. As either administrator, I want ambiguous or unexpected states to block exchange and offer a safe restart path, so that recovery never bypasses authentication.
18. As a site user, I want graph visibility to respect the approved sharing and disconnect policy, so that transport authentication is not mistaken for content authorization.

## Implementation Decisions

### Required security properties

- No application-owned central broker, Forge Remote coordinator, external
  credential-seeding script, or shared customer-state store for setup or runtime
  exchange. Native Atlassian identity and platform services remain allowed.
- Fail closed on unknown state, protocol version, identity, grant, key, lease,
  storage result, or invalid input. No fallback to the development seed path.
- Validate all trust-boundary envelopes and payloads using Zod, including
  schema versions, length limits, required claims, and permitted fields. Schema
  validity is not proof of authenticity. Bound request size before parsing.
- Expected domain and integration failures return typed `Result` values using
  the repository's established error convention. A failure must not leave an
  authorized transition or business effect behind.
- Use platform-managed secret storage, not ordinary KVS records, logs, source
  control, browser storage, URLs, or graph objects. The requested API is
  `storage.getSecret()`; this repo uses `@forge/kvs`, so verify its supported
  secret read/write/delete equivalents before implementation. Exact Forge API
  and concurrency guarantees have not been validated in this draft.
- Never log invitation links, operational endpoint URLs, authorization headers,
  JWTs, passphrases, signing keys, or secret-derived authenticators. Keep local,
  non-content audit evidence of actor, attempt/grant identity, transition,
  timestamp, outcome, and safe reason; no central journal.

### Candidate shared-secret / JWT profile — approval required

If shared-secret authentication is approved:

- HMAC-SHA256 provides message authenticity and integrity, e.g.
  `crypto.createHmac('sha256', secret)`. Pin JWT verification to HS256; reject
  `none`, algorithm substitution, unsupported key identifiers, and untrusted
  key-discovery locations. Prefer maintained JOSE verification over a custom
  JWT parser/verifier.
- For direct MAC comparison, decode and validate encodings and equal buffer
  lengths before `crypto.timingSafeEqual(a, b)`. Do not compare signatures with
  ordinary string equality. This does not make the entire endpoint constant-time.
- Require and validate `iss`, `aud`, `iat`, `nbf`, `exp`, and unpredictable `jti`.
  Bind identity to site, app, installation/environment, grant, direction, and key
  version. Claims supplied by a sender are untrusted until verified and matched
  against receiver-owned authorization state.
- Limit token lifetime to at most five minutes; reject issue times older than
  five minutes and future times beyond a narrowly bounded skew. Require coherent
  timestamps and never extend a token beyond its grant lease.
- Persistently and atomically consume the nonce/`jti` in receiver scope before
  business effects. Retain replay evidence through the entire acceptance window,
  including allowed skew. An in-memory set or non-atomic read-then-write is not
  sufficient across concurrent Forge invocations.
- Bind the signature to HTTP method, intended destination/path, and a digest of
  the exact request-body bytes, as well as operation scope. Otherwise a valid
  JWT could authenticate a substituted body. Specify byte-level encoding before
  implementation; reject ambiguous authentication headers.
- Use HTTPS. A signed JWT is readable, not encrypted; it must not carry secret
  keys or confidential endpoint URLs. Never send the signing key itself as a
  request credential. Separate credentials by relationship/direction and bind
  their use to a purpose; the derivation and rotation scheme remain undecided.
- MAC possession identifies a holder of the shared key, not uniquely one site:
  both holders can produce signatures. Do not claim third-party non-repudiation
  or treat HMAC possession as proof of a genuine Forge installation.

### Passphrase proposal and bootstrap blockers

The original hash-as-key idea is superseded by the selected OPAQUE bootstrap.
Retain the following rationale and unresolved integration constraints:

- A fast hash does not increase passphrase entropy. Captured HMAC/JWT evidence
  can enable offline guessing of a weak phrase. A password KDF raises guessing
  cost but does not fix unauthenticated key establishment or weak phrases.
- The derived hash is itself a signing secret and must be protected accordingly;
  exchanging the hash would still be exchanging a secret.
- **Clarified by the user — 2026-09-08:** browser-to-same-site submission over
  HTTPS is permitted. The concern is cross-site transfer: long-lived peer signing
  keys must not be transmitted between sites. A phrase may be entered separately
  into each site's authenticated app. This clarification permits evaluating a
  password-authenticated key exchange; it does not approve hash-as-key.
- Candidate alternatives are native platform grants or a vetted authenticated
  key-agreement protocol. No home-grown exchange, encryption, or PAKE design.
- A bootstrap route can receive unauthenticated attempts only if it discloses
  no protected state and grants no authority without independent native proof.
  Its addressing, abuse limits, trusted app identity, and recipient binding are
  unresolved. Withholding operational URLs is defense in depth, not auth.

### Bootstrap transport and exchange contents

**Approved transport — 2026-09-08:** use a dedicated Green bootstrap webtrigger,
separate from operational endpoints. Disclose it during Tina's authenticated
setup, not in Toby's initial invitation. Knowledge of its URL grants no authority.
It handles bounded setup traffic only, never business events or package ingestion.

**Concrete exchange proposal; wire schema and library APIs not yet verified:**

- Green performs OPAQUE registration locally under Tina's recipient-bound native
  session. Neither the plaintext phrase nor the registration record needs to be
  transferred from Blue to Green. Blue later acts as the OPAQUE login client.
- Blue POSTs the library's first client login message (often called KE1 /
  CredentialRequest), plus non-secret invitation correlation, protocol/envelope
  version, and setup-attempt context. Green returns its server login message
  (KE2 / CredentialResponse) and attempt correlation. These are initially
  unauthenticated inputs, not verified peer claims.
- Blue validates KE2 using the library and sends its final client login message
  (KE3 / CredentialFinalization). Green validates KE3 before treating the exchange
  as successful. The library manages blinding, ephemeral keys, nonces, proofs,
  and session-key derivation; do not construct or reinterpret its cryptographic
  payload. Exact names/serialization depend on the selected package revision.
- Both sides derive provisional setup keys locally. Native-context-derived site
  and installation/environment IDs, intended recipient, role/direction, attempt,
  scope, and expiry must be bound through supported OPAQUE identity/context
  inputs and/or an authenticated application transcript confirmation. Specify
  deterministic encoding and native evidence checks; peer-supplied claims alone
  do not prove platform identity. Do not assume library API support until checked.
- Blue supplies its nomination and approval as an authenticated, confidential
  setup message bound to that transcript. Include actual destination identity
  and proposed terms; no operational endpoint yet. Green exposes the resulting
  nomination only to authorized local reviewers. Toby approves in Green's native
  UI; his browser never posts an approval directly as trusted peer evidence.
- After Toby's approval, protected setup messages communicate the identical
  approved terms and exchange operational endpoints. Bind them to the attempt,
  transcript, destination, and final consent version. Require authenticated
  endpoint/key-possession confirmation before authorizing business operations;
  merely declaring an arbitrary destination is insufficient. Exact endpoint
  validation and partial-activation behavior remain to be specified.

**Approved single-endpoint transport — 2026-09-08:** Green exposes the sole
bootstrap webtrigger. Blue initiates all bootstrap HTTPS requests and obtains
responses on those requests, including bounded, authenticated polling for Toby's
decision. There is no Blue bootstrap callback endpoint. This restriction concerns
bootstrap only; each site's operational endpoint remains separate.

Once provisional key establishment has succeeded, unauthenticated callers cannot
read nomination/approval state. Each poll uses fresh replay-protected
authentication within the setup deadline. No request stays open while waiting
for a human. Persist only the protected state needed across invocations; stop
polling on completion, rejection, or expiry. Poll scheduling, cadence, and
resumption must respect Forge execution limits and remain implementation details
to verify, not claims of working background execution.

Distinguish the short-lived OPAQUE exchange from the bounded period awaiting
Toby's human approval after that exchange. Do not keep ephemeral login state or
one authentication token alive for the entire human wait. Human approval and
activation must finish within the agreed seven-day deadline measured from
invitation creation; completing OPAQUE does not start another seven-day window.

Outer application messages require bounded sizes, strict schemas, version and
phase validation, attempt/expiry binding, and safe retry correlation. Initial
OPAQUE admission has no established MAC key: use single-use/short-lived protocol
state and bounded attempts rather than pretending an initial JWT authenticates
it. Later messages use independently derived purpose-specific keys and fresh
replay-protected proofs. Never transmit phrases or long-lived signing keys;
never place them or authentication tokens in URLs. Separate protocol retries
from business side effects and do not interpret a lost response as success.

### Selected bootstrap: one-time OPAQUE pairing

**Accepted protocol/library choice; detailed flow remains a draft.** Use OPAQUE
via `@cloudflare/opaque-ts`, rather than hashing a passphrase into a signing key.
RFC 9807 is the standard reference, not a verified conformance claim for the
selected package: check its exact protocol revision before pinning a version.
Tina authenticates the bootstrap by entering one pairing phrase locally on both
sites; secure platform randomness supplies protocol nonces and cryptographic
key material. Human-chosen text is not needed as a source of cryptographic
entropy. The JWT/JWE profile below remains proposed application integration.

#### Walkthrough

1. Toby creates the recipient-bound invitation and approves its Green scope.
   Tina opens the genuine Green app as the named recipient. Green verifies
   identity and the still-pending invitation server-side.
2. Tina chooses a one-time pairing phrase in Green. The Green backend executes
   the library's OPAQUE registration steps locally for this invitation (both
   client and server registration roles can run locally). Store the registration
   record and server secret material in secret storage; do not persist the
   plaintext phrase or expose remote registration/record replacement. This is
   registration for a Site relationship, not an Epic Pairing or a new Atlassian
   user password.
3. Tina navigates to the genuine Blue app, authenticates as its administrator,
   reviews the intended Green/Blue relationship, and enters the same phrase.
   No phrase is transported from Green to Blue. A non-secret invitation reference
   and dedicated bootstrap address can travel automatically; neither is an
   operational endpoint or sufficient authority to approve anything.
4. Blue acts as the OPAQUE client; Green acts as the OPAQUE server. Exchange the
   library's login messages (CredentialRequest, CredentialResponse,
   CredentialFinalization). Use fresh secure randomness and the exact supported
   protocol/ciphersuite, with persisted, short-lived, single-use server state.
   Wrong phrases fail. Rate-limit guesses without letting a leaked reference
   create an indefinite lockout or revoke an active Pairing.
5. Bind identities and setup context using the library's supported identifiers
   and context facilities: app/protocol, site and installation/environment IDs,
   invitation, role/direction, and approved scope/lease. Define a deterministic
   encoding before implementation. Each side checks these against its local
   native context and approved proposal, not merely peer-supplied strings.
6. Both sides derive the matching session key locally. Follow the protocol's
   completion requirements, then authenticate bilateral application confirmations
   covering the identical setup transcript. Use standard HKDF-SHA256 with distinct
   purpose/direction labels for application keys; never use a raw phrase/hash as
   the JWT key or reuse one key across encryption and signing purposes.
7. Once bootstrap authentication and bilateral consent are complete, exchange
   operational endpoints in authenticated encryption using a maintained JWE
   implementation (`dir` / `A256GCM`) and separately derived, direction-specific
   setup encryption keys, over HTTPS. Bind messages to the confirmed transcript;
   this prevents a transparent bootstrap relay from reading endpoint metadata.
   Signing alone would not provide that confidentiality. Pin destinations
   server-side. Only activate business exchange after
   each required confirmation and endpoint validation succeeds. Setup messages
   cannot authorize business data. Handle lost acknowledgements explicitly.
8. Sign operational JWTs with the derived directional HS256 keys using a maintained
   JOSE library. Apply the existing freshness, replay, body/method/destination,
   scope, and lease rules. Keep keys in secret storage; never transmit them.
   Invalidate the one-time registration record after completion/expiry and remove
   provisional secrets when safe. No automatic re-pairing with the old phrase.

#### What this does and does not establish

- This uses an existing cryptographic protocol, but the invitation, authorization,
  transcript binding, endpoint exchange, and crash recovery are still an app
  protocol requiring review. OPAQUE is not a turnkey Forge pairing SDK.
- Under its security assumptions, OPAQUE avoids exposing the phrase and prevents
  passive transcripts from being a simple offline password-testing oracle. It
  does not eliminate online guessing, phishing, or risks from compromised stored
  records/backends. Use a unique phrase with adequate strength and bounded attempts.
- A URL thief without the phrase cannot complete the exchange. A transparent
  relay can still relay messages; it must not be able to change the bound peer,
  scope, endpoints, or derive the session key. Reject substituted destinations
  and never trust an unauthenticated key or claimed installation ID.
- The phrase is the human-assisted trust bridge. Tina must enter it only into
  the genuine app on the intended sites. OPAQUE proves participation by the
  registered credential holder, not native Forge installation attestation or a
  specific person's identity. The native sessions, protected local registration,
  local context checks, and app code remain part of the trust model.
- Both backends see the phrase transiently in this proposed local-submission
  design, which the user allows. This is not a claim of end-to-end password
  secrecy from those backends. Avoid logging and persistence; do not promise
  reliable zeroization of JavaScript strings.
- A phrase-free alternative is locally generated asymmetric keys with ES256 JWTs,
  but it still needs an authenticated public-key bootstrap. JOSE alone does not
  solve that. Do not replace the phrase with blind trust in a supplied public key.

#### Libraries and feasibility gates

- [OPAQUE standard, RFC 9807](https://www.rfc-editor.org/rfc/rfc9807.html).
- **Selected implementation:** `@cloudflare/opaque-ts`. The user prefers this
  TypeScript implementation to avoid Forge WASM difficulties. Confirm its exact
  protocol revision, ciphersuite, maintenance/security posture, dependencies,
  identifier/context support, and session-key APIs before implementation. Do not
  assume OPAQUE implementations or draft revisions interoperate. The documentation
  search did not return this package; its APIs and Forge compatibility are not
  independently verified here.
- [`opaque-ke`](https://docs.rs/opaque-ke/latest/opaque_ke/) was the earlier
  documentation reference for protocol roles and key derivation, not the selected
  dependency. Its API examples must not be treated as `opaque-ts` API evidence.
- The earlier `@serenity-kit/opaque` WASM-wrapper candidate is not selected.
- [`jose`](https://github.com/panva/jose) supplies JWT/JWS and key-management
  building blocks, not PAKE. Its documentation confirms asymmetric key generation
  and JWK handling as well as JWT tooling. Use pinned trusted verification keys,
  not acceptance of arbitrary embedded public keys.
- Before implementation is considered viable, demonstrate the selected package's
  bundling/runtime compatibility, secure randomness, secret persistence, atomic
  attempt handling, and cross-invocation handshake state in Forge. No dependency
  has been added; this is verification of the selected approach, not a return to
  choosing a WASM wrapper.
- Forge docs describe installation-bearing FITs for Remote invocations; the
  lookup does not establish that arbitrary cross-site webtrigger calls receive
  equivalent platform attestation. Do not assume FIT support for this transport.

### Design critique: membership and exposed URLs

These are review findings and alternatives, not a selected replacement protocol.

- **Accepted simplification:** Toby needs no Blue account. Retain Tina's
  two-site authentication until an alternative bootstrap has been verified.
- Tina need not be a Green member as a matter of cryptographic principle. She
  could approve only on Blue, with Toby confirming the resulting proposal on
  Green. However, this is secure only with independently authenticated binding
  of peer installation identity, endpoint, setup attempt, and key material.
  Two local approvals or a successful callback challenge alone do not provide
  that binding. Native platform proof, or a vetted authenticated exchange with
  an independent verification step, must supply it. Availability on Forge is
  not yet established. Removing membership may increase protocol complexity.
- Even Tina authenticating on both sites does not itself bind a supplied
  endpoint/public key to a genuine Blue installation. Never treat it as a
  complete bootstrap proof or rely on claims posted by the browser.
- A leaked invitation/navigation URL should disclose only its approved minimal
  context and permit no activation, rejection, or reference consumption on GET.
  Email scanners and link previews must not consume invitations. Require native
  authentication, recipient binding, explicit consent, and CSRF/login-flow
  protections for state-changing steps.
- A leaked operational webtrigger URL must not authorize any operation. With
  complete auth it still exposes an abuse surface: invocation cost, rate-limit
  exhaustion, traffic flooding, and response/timing-based enumeration. Bound
  request sizes, rate-limit at supported boundaries, use safe errors, and verify
  authorization before business effects. Availability cannot be guaranteed merely
  by rejecting signatures in the handler.
- A URL containing a bearer token or authorization code is a different threat:
  accidental history, referrer, analytics, or log disclosure may enable theft or
  a redemption race. Do not place operational JWTs or secrets in URLs. Any native
  authorization code flow must use its prescribed state, redirect, and PKCE
  protections where supported; opaque values are handled by software, not people.
- A malicious actor who substitutes bootstrap endpoint/key material can become
  the authorized peer if setup lacks independent identity binding. Fresh nonces,
  HMACs, and short expiry then authenticate the attacker correctly; they do not
  repair the compromised trust root. Bind both sites, installations/environments,
  recipient, scope, directions, key material, and endpoint identity to the
  authenticated setup transcript. Constrain destinations and redirects; an
  allowed Forge hostname or endpoint reachability alone is not tenant identity.
- URL knowledge alone is not active network MITM. HTTPS with valid certificate
  verification protects transport, not phishing, malicious consent, compromised
  browsers/accounts, or a substituted setup destination. Do not claim protection
  against an attacker controlling an administrator session or site backend.
- Worst case for a broken bootstrap: attacker-controlled persistent peer access
  for the lease, approved-scope data exfiltration, forged events/publications,
  and induced Automation effects. If scope checks are also broken, impact can
  extend to the app's effective permissions. Revocation cannot recover already
  disclosed data or undo every downstream action.
- Worst case for URL disclosure with correct auth: approved metadata leakage
  and attempted denial of service, not peer authorization. For a stolen valid
  signed request, replay defenses limit reuse but an attacker may race the
  legitimate request; exact body/method/destination binding prevents alteration,
  not that race.

### Time boxes (proposals for review)

**User scenario — 2026-09-08:** Toby invites on Friday morning in San Francisco;
Tina's Sydney workday has ended and she starts setup on Monday morning locally;
Toby returns from a long weekend and approves Tuesday morning in San Francisco.
Invitation-to-approval is approximately 96 elapsed hours if Toby acts at the same
local time on both days (95 or 97 across a daylight-saving change). This is a
routine scheduling scenario, not an absolute worst-case bound. A 24-hour overall
window is insufficient. **Approved setup deadline — 2026-09-08:** seven elapsed
days from invitation creation to completed setup, with a fixed expiry and no
automatic extension. Polling and partial progress do not reset it; longer absences
require a new invitation. Individual OPAQUE exchanges and request proofs remain
limited to five minutes, capped by the overall setup deadline.

Human response time and cryptographic proof lifetime are separate. A longer
pending window does not lengthen OPAQUE attempts or individual JWT validity.
Toby must authenticate and pass current authorization checks when he returns;
the app must not preserve an authenticated browser session for the whole wait.
Pending state can be durable without retaining plaintext phrases or granting
business access. Polling cadence must avoid unnecessary load over multi-day waits.

| Item | Proposed bound | Required expiry behavior |
| --- | --- | --- |
| Overall invitation/setup window, including human approval | Agreed: 7 elapsed days from invitation creation to completed setup. | Fixed absolute expiry; neither polling nor partial progress extends it. No activation afterward; a fresh invitation requires authority checks. |
| Human wait after recipient authentication / OPAQUE completion | Within the same overall setup deadline; no separate 15-minute human-response requirement. | Protect provisional keys/state while pending. Fresh request proofs for every interaction; no business authority or indefinitely open invocation. |
| Single bootstrap proof/challenge | At most 5 minutes, single-use, capped by setup deadline | Reject reuse or late completion. |
| Operational JWT / request freshness | At most 5 minutes | Reject expired/old requests even when the lease remains active. |
| Permitted clock skew | At most 30 seconds; does not extend the lease or five-minute maximum request age | Reject beyond the allowance. |
| Authorization lease | One calendar year from activation by default, with an editable agreement end date approved by both sites. No renewal in the POC; future renewal requires explicit bilateral approval. | Deny at request and queued-effect execution time; no reliance on cleanup scheduling. A longer lease never extends request-token validity or prevents earlier revocation. |
| Retries and replay evidence | Bound retries by the relevant deadline; retain nonce evidence through its last acceptable verification time | Fresh JWT/nonce for a retry; stable business idempotency key. |

The seven-day overall setup deadline and five-minute individual OPAQUE/request
limits are agreed. Poll scheduling, clock skew, and relationship-lease calendar
edge cases still require specification; renewal mechanics are outside POC scope. The annual lease default and
editable agreement end date are agreed. No phase may remain implicitly authorized
because its expiry cleanup failed.

**Lease direction — 2026-09-08:** the user wants the Site relationship lease to
coincide with business arrangements: at least quarterly in normal use, probably
annually, rather than the earlier 30-day proposal. This is a preferred business
cadence, not a mandatory minimum duration that would prevent a shorter agreement.

**Approved lease policy — 2026-09-08:** propose an explicit agreement end date
at setup, defaulting to one calendar year from activation, with both sites
approving the same expiry instant. The end date is editable to align with a
quarter-end or other business arrangement rather than restricted to fixed
quarterly/annual choices. Define timezone, end-of-day, leap-year, and activation
reference semantics before implementation; a delayed activation must not silently
extend an already approved expiry. Either site can revoke earlier.

#### Future renewal — explicitly outside POC scope

The following records agreed future direction and suggested safety constraints,
not POC requirements or implementation acceptance criteria. Further renewal
protocol decisions are deferred until after initial-handshake work.

**Future bilateral-approval direction — 2026-09-08:** renewal requires explicit approval by
an authorized administrator on each site. Both approvals may complete before
the current lease expires, permitting uninterrupted exchange once the agreed
renewal is durably confirmed. There is no automatic or unilateral renewal.

Both approvals must refer to the same relationship, renewal proposal/version,
scope, and new expiry. A pending proposal or one site's approval does not extend
the current lease. Until completion, the existing lease continues under its
original terms; if it expires first, business exchange stops with no implicit
grace period. A delayed renewal cannot override revocation or restore compromised
credentials. Post-expiry renewal/re-establishment, confirmation failure recovery,
and reminder scheduling remain to be designed.

#### Three independent lifetimes

| Lifetime | Purpose | Agreed boundary | Still to decide |
| --- | --- | --- | --- |
| Site relationship authorization lease | Bounds bilateral business consent. | One-calendar-year default with an editable, mutually approved agreement end date; revocable earlier. Renewal requires explicit bilateral administrator approval and can complete before expiry. Expiry denies new business exchange across its Pairings. | Renewal protocol/recovery, reminders, and exact calendar semantics. |
| Peer signing-key lifetime and rotation | Limits credential exposure independently of business consent. | Rotation is separate from lease renewal: it neither extends the lease nor widens scope, and need not itself require renewed business approval. Store keys in secret storage; do not transmit long-lived peer signing keys between sites. | Rotation interval, authenticated rekey mechanism, key-version overlap/retirement, partial failure, and compromise recovery. No interval or automatic rotation mechanism is approved yet. |
| Individual request JWT lifetime | Bounds use of a particular authentication proof. | At most five minutes, and never beyond the authorization lease; require freshness, replay protection, and current authorization checks. A fresh token does not revive a revoked/expired grant or make stale workflow evidence current. | Final clock-skew allowance and treatment of in-flight tokens during key retirement. |

These are separate deadlines, not one shared TTL. Lease renewal must not
implicitly reset a key's lifetime; rotation must not renew the lease; issuing
fresh JWTs must not extend either. If a key is expired or retired, deny its use
rather than falling back to the longer relationship lease. Renewed business
consent cannot rehabilitate a compromised key. In compromise recovery, a proof
made only with the suspected key is insufficient to establish replacement trust.

### Unsafe states and recovery obligations

The eventual protocol must enumerate states and transitions. Minimum rules:

- Pending, expired, revoked, failed, and unknown attempts cannot authorize
  business traffic. Acceptance alone cannot bypass bilateral confirmation.
- A replayed/forwarded invitation, account mismatch, changed scope, or stale
  approval cannot activate a Pairing. Do not leak whether a recipient exists to
  an unauthenticated caller.
- Interrupted setup, conflicting concurrent completions, missing secrets, or
  lost acknowledgements remain pending or blocked. Resume only from verifiable
  durable evidence within deadlines; otherwise invalidate and start anew.
- Reject unauthorized traffic without automatically revoking a healthy Pairing:
  an attacker must not be able to revoke it by sending a malformed request.
- Separate replay rejection from business idempotency. A retry uses fresh auth
  but the same operation key; define durable effect/receipt semantics so a crash
  cannot cause duplicate effects or permanently lose an accepted operation.
- Check mutable local authorization immediately before side effects, including
  queued work, and define races with revocation. Do not let work authorized only
  at enqueue time run after the lease has ended.
- Revocation immediately blocks local send/receive authorization. Notify the
  peer via authenticated, bounded delivery, but do not promise simultaneous
  remote revocation during a partition. Remote observation bounds and in-flight
  work policy are open decisions; a short JWT alone does not solve this.
- Uninstall/reinstall, loss of admin access, installation replacement, rotation,
  and suspected compromise need explicit invalidation/renewal policies. An old
  installation identity must not silently regain a former lease.
- Stopping transport does not remove already indexed graph content. Preserve
  the existing soft-disconnect intent for cross-site visibility, but separately
  validate the platform mechanism and convergence time. No new hard-delete SLA
  or cross-site Jira deletion propagation is promised.
- Disable/remove development credential-seeding and unauthenticated mutation
  paths in any deployment claiming this authenticated flow; they must not remain
  an alternate way to activate or overwrite Pairings.

## Testing Decisions

Proposed seams, pending user confirmation:

1. Prefer the highest behavioral seam: drive setup through the same app command
   boundaries and direct peer request receivers used in production, using two
   isolated tenant stores, controlled identities, transport, and clock. Assert
   visible authorization outcomes and absence/presence of effects rather than
   helper calls or storage layout.
2. Reuse the pure pairing-command state transition boundary for exhaustive
   authorization/deadline tests. The current initiation, acceptance, activation,
   and audit-result tests provide prior art, but their caller-supplied authority
   flags do not prove a real administrator check.
3. Extend existing delivery and lean-event receiver tests to prove that invalid
   auth cannot call graph ingestion or Automation. Include authenticated outbound
   requests and callback handling, not just inbound validation.
4. Use a real two-site Forge integration check for native identity/admin checks,
   secret isolation, trusted bootstrap, endpoint handling, clock behavior, and
   atomic concurrency/replay guarantees. Mocks cannot prove these capabilities.

Acceptance coverage must include:

- Toby/Green and Tina/Blue complete setup without a terminal broker, manual opaque
  credential handling, opposite-site admin rights, or pre-completion endpoint disclosure.
- Each H1–H13 assumption is independently false or unverifiable; setup/effects
  remain unauthorized and a safe recovery outcome is observable.
- Wrong signature/algorithm/issuer/audience/environment/grant/direction,
  mismatched key, modified method/path/body, malformed Zod payloads, missing or
  inconsistent claims, boundary expiry times, future timestamps, and oversize input.
- Duplicate JWTs racing on separate invocations produce at most one admission;
  failure of replay storage blocks effects. Retry/crash tests cover business
  idempotency independently of nonce consumption.
- Partial key storage, interrupted confirmation, stale consent, simultaneous
  attempts, revocation races, lease expiry during queued work, and native access
  removal never create an unauthorized path.
- Logs, UI, URLs, graph objects, and ordinary storage contain no secret material
  or unintended endpoint disclosure; initial invitation content matches its allowlist.
- An auth lease does not widen graph visibility, publication authority, or Epic
  scope. Demo seed paths cannot bypass authenticated setup.

## Out of Scope

- Lease renewal, extensions, renewal reminders/scheduling, and post-expiry
  re-establishment flows for the POC. The retained future renewal notes are not
  implementation requirements or a reason to delay initial-handshake work.
- Implementing or deploying an authentication mechanism before design approval.
- Replacing Atlassian user authentication, user provisioning, or granting users
  administrative access on the opposite site.
- A centralized broker, custom identity provider, or bespoke cryptographic protocol.
- Expanding Pairing business scope, data payloads, or graph ACLs implicitly.
- Broad historical graph cleanup or partner Jira hard deletion.
- Claiming security readiness from the happy path alone. Failure/recovery
  protocols, platform verification, and appropriate security/legal review remain
  prerequisites, not optional future hardening.

## Further Notes

### Decisions to resolve through grilling

Work through one decision at a time, in dependency order:

1. **Resolved:** the user reopened the earlier restriction on app-managed peer
   authentication because the assumed cross-site `apiRoute` mechanism is not
   supported. Security/legal approval remains a separate gate.
2. **Protocol/library resolved:** OPAQUE via `@cloudflare/opaque-ts`, with Tina's
   authenticated local phrase entry on both sites. Detailed native identity,
   transcript binding, bootstrap addressing, and runtime verification remain open.
3. **Resolved:** browser-to-same-site passphrase submission over HTTPS is allowed;
   long-lived peer signing keys must not be transmitted between sites. The user
   is open to an existing protocol/library instead of a simple passphrase hash.
4. **Relationship scope resolved:** OPAQUE establishes a leased Site relationship
   reusable across separately authorized Epic Pairings. Relationship revocation
   stops all its Pairings; Pairing revocation affects only that Pairing. Pairing
   approval authority and directional operation allowlists remain open.
5. What recipient/account evidence, invitation delivery, minimal disclosure,
   and approval steps are required, including Tina's limited actions on Green?
6. What protocol safely completes bilateral confirmation and exchanges endpoints
   without circular trust or unsafe partial activation?
7. Which time boxes, renewal/access-change policies, revocation observation
   bounds, and in-flight operation semantics are acceptable?
8. Do the proposed behavioral test seams match expectations, and what two-site
   evidence is required before this can be considered safe?

### Local evidence and prior decisions

- [Domain glossary](../CONTEXT.md): Pairing scope, non-secret pairing references,
  local readiness, and private peer delivery endpoints.
- [Design discussion](design-discussion.md), decisions 21–26: native 3LO,
  two mutual narrow grants, legal exclusion of custom authentication, minimal
  pre-authorization disclosure, local administrators, and local audit journals.
- [V1 specification](app-spec-v1.md): existing product authorization baseline.
- [Starter bridge specification](starter-peer-to-peer-jira-bridge.md): explicitly
  development-only seed and transport, with production auth deferred.
- Current demo harness seeds active local state and passes endpoints between
  sites. Current starter and lean-event receivers check payload/local pairing
  state but do not establish cryptographic sender authenticity.

This draft records explicit revisions to prior authentication decisions and
updates the domain glossary with the agreed Site relationship/Pairing distinction.
It does not rewrite historical specifications or change code. No Jira issue or
external publication is created by this local specification task.
