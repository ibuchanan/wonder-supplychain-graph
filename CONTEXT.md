# Supplychain Graph Context

## Ubiquitous language

Two different things are called a connection, at two different levels, and they
must never be confused: a **PeerCX** crosses a tenant boundary and carries peer
authority, while a **GraphCX** is local product configuration and carries none.
Both keep the word connection; neither may be shortened to a bare `connection`
or `cx` in prose or in code.

- **PeerCX**: Peer Connection. The bilaterally approved trust relationship
  between two sites, reusable across separately authorized Pairings. It does not
  grant access to all work on either site. Revoking it stops exchange for all
  its Pairings. Written `PeerCx` in code identifiers, `peerCx` in camelCase,
  and `peer-cx` in file names, storage keys, wire operations, and audit event
  types. Never shortened to a bare `cx`. The administrator-facing word for one
  is simply "connection", lower case.
- **GraphCX**: Graph Connection. A Teamwork Graph datasource connection,
  configured in the product and reported through the `graph:connector`
  connection-change callback. It carries no peer authority and crosses no tenant
  boundary, so it is never interchangeable with a PeerCX.
- **PeerCX status**: derived on read, never stored: `invited`, `proposed`,
  `confirming`, `active`, `expired`, `declined`, `invalidated`, `revoked`.
  Computed from whichever setup or agreement record exists for a counterpart,
  which is why a PeerCX reads as `expired` without anything being written when
  its lease passes.
- **Authorization lease**: the finite period during which a PeerCX may authorize
  exchange, unless revoked earlier. An active lease does not replace the
  separate authorization required for each Pairing.
- **Invitation**: the first stage of a PeerCX's life, not a separate entity: a
  recipient-bound offer to a named peer administrator on another site, carrying
  a setup deadline. Distinct from a Pairing request, which pairs two Epics.
- **Invitation reference**: a non-secret, single-use setup correlation reference
  addressing one Invitation. It is never an authenticator or authorization
  credential.
- **UI safe label**: an optional human-readable label for a PeerCX, safe to show
  a peer administrator before authorization. It names the connection, never
  either site.
- **Activation proposal**: what the approving site returns to an authenticated
  poll after its administrator approves a nomination. It names the approved
  counterpart identity, PeerCX ID, terms version, and agreement end instant, and
  never an endpoint URL.
- **Bilateral confirmation**: the exchange that activates both local records. A
  site activates only after the matching confirmation it can verify: the
  approver on the confirmation it receives, the nominator on the authenticated
  success response.
- **Pairing**: the bilateral relationship between exactly one Source Epic and one
  Paired Epic. Each Pairing requires its own authorization within an active
  PeerCX; revoking one Pairing does not revoke other Pairings. A Pairing never
  inherits authority from an active PeerCX: an empty or absent operation
  allowlist authorizes nothing.
- **Local readiness**: the state in which the current tenant has the local
  prerequisites for its role. A source tenant needs an active Pairing and peer
  delivery endpoint. A destination tenant also needs an active GraphCX. Local
  readiness makes no claim about peer-tenant state.
- **Pairing reference**: a non-secret, single-use setup correlation reference;
  it is never an authenticator or authorization credential.
- **Pairing request**: a pending proposal to establish a Pairing, reached
  through a Pairing reference and accepted by the counterpart administrator. In
  v1 its peer capabilities are `pairing.request.receive` and
  `pairing.request.accept`. Distinct from an Invitation, which is site-level.
- **Outbound pairing**: the manufacturer-local pending record created when a
  Pairing reference is issued and awaiting supplier acceptance.
- **Inbound pairing**: the supplier-local pending record created from a received
  Pairing reference before the supplier binds its existing Paired Epic.
- **Acceptance**: the supplier administrator's explicit decision to activate a
  pending Pairing request.
- **Pairing activation**: the manufacturer-local application of a supplier
  Acceptance, which changes its Outbound pairing from pending to active.
- **Correlation ID**: the shared opaque identifier joining both tenants' records
  of one collaboration operation.
- **Idempotency key**: an opaque identifier that makes repeated delivery of one
  peer operation safe.
- **Audit event**: immutable, tenant-local, non-content evidence of a
  collaboration operation. There is no central audit ledger.
- **Source Epic**: the manufacturer-owned Epic whose approved subset may be
  published.
- **Snapshot**: an immutable representation of the fixed-schema Source Epic and
  its direct children. It is what a source site sends, carried on the
  `snapshot.candidate.receive` operation.
- **Current package**: the latest successfully published Snapshot, as the
  destination stores it. It is the only version indexed for Teamwork Graph and
  Search/Rovo discovery. In code it is `CurrentPackage`, and a Snapshot is
  literally `Omit<CurrentPackage, "correlationId">`.
- **Candidate snapshot**: a queued or in-flight new version that is not yet
  visible to destination users or Search/Rovo. In code it is `SnapshotCandidate`,
  with state `queued`, `cancelled`, or `failed`.
- **CX health**: the operational health of the whole path: PeerCX
  authorization, peer delivery, GraphCX ingestion, indexing, and current
  publication. It spans both connection kinds, which is why it is not named for
  either.
- **Delivery status**: the source work's progress, derived from Jira
  `statusCategory`. Distinct from CX health: it describes the work, not the
  plumbing.
- **Starter projection**: one workspace-visible `atlassian:document` that
  represents the selected Source Epic only. It has no child issues or graph
  associations. Its first content is limited to the Source Epic key and summary;
  it does not yet flatten Jira descriptions from ADF.
- **Starter delivery**: a direct request from the source Forge runtime to the
  destination Forge runtime. The terminal triggers and verifies the flow but
  does not relay Epic content.
- **Peer delivery endpoint**: the destination's development webtrigger URL. It
  is stored only in the source tenant's local Pairing and is never displayed or
  logged.
- **Paired Epic**: the supplier-owned existing Epic that represents supplier
  delivery work.

## PeerCX lifecycle

A PeerCX status is presentation, derived on read from the records that exist for
a counterpart. No record stores it, which is why the same PeerCX can be reported
as `expired` without anything having been written when its lease passed.
`derivePeerCxStatus` in `src/pairing/peer-cx-status.ts` is the one place this
mapping lives.

| Status | Derived from |
| --- | --- |
| `invited` | An Invitation exists and has not been acted on. |
| `proposed` | The counterpart has been nominated and awaits their approval. |
| `confirming` | The counterpart approved; bilateral confirmation is outstanding. |
| `active` | The agreement is recorded and its lease has not passed. |
| `expired` | The agreement is recorded and its lease has passed. |
| `declined` | The counterpart rejected the nomination. |
| `invalidated` | The nomination was invalidated before confirmation. |
| `revoked` | An administrator revoked the agreement locally. |

Revocation is reported ahead of the lease, because revoking is a decision an
administrator made and expiring is not. A confirmed nomination with no agreement
written yet reports `confirming` rather than `active`, because the agreement
record is what authorizes exchange. `expired` is reported at the exact lease end
instant, matching `evaluatePeerCxAuthorization`, which authorizes only while the
lease end is strictly after now.

## Naming in code

`PeerCX` and `GraphCX` in prose, including comments and this glossary. In code,
`PeerCx` and `GraphCx` in type and compound identifier names, `peerCx` and
`graphCx` in camelCase positions, and `peer-cx` and `graph-cx` in file names,
storage keys, wire operation names, and audit event types. The qualifier is
always spelled out, so no identifier is ever a bare `cx`, `pcx`, or `gcx`.

Three platform boundaries keep the platform's own spelling rather than ours,
each marked with a comment where it is read or written: the `graph:connector`
payload field in `read-graph-cx-change-request.ts`, the Forge Graph API request
field in `ingest-package-projection.ts`, and the manifest's `onConnectionChange`
callback key.

## Naming in the admin UI

The administrator-facing word is **connection**, lower case: a Jira site
administrator has no reason to learn `PeerCX`. PeerCX and GraphCX are the
precise domain terms, used in code, in specifications, and in logs, where the
distinction between the two has to be unambiguous. Where a screen needs to name
one specifically, it says Teamwork Graph connection for a GraphCX.

## Unsettled vocabulary

**Snapshot, package, and content overlap and have not been reconciled.** A
Snapshot is `Omit<CurrentPackage, "correlationId">`, `CurrentPackage.content` is
a `SnapshotContent`, the manifest's action is named "Publish work package", and
the wire operation is `snapshot.candidate.receive`. One thing therefore answers
to three names depending on which side of the wire and which layer is looking at
it. This is the same class of ambiguity that PeerCX and GraphCX resolved, and it
needs the same kind of decision before the vocabulary hardens further.
