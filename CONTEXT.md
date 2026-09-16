# Supplychain Graph Context

## Ubiquitous language

- **PeerCX**: Peer Connection. The bilaterally approved trust relationship
  between two sites, reusable across separately authorized Pairings. It does not
  grant access to all work on either site. Revoking it stops exchange for all
  its Pairings. Never shortened to a bare `connection` or `cx`.
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
