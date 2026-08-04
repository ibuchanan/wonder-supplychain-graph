# Supplychain Graph Context

## Ubiquitous language

- **Pairing**: the bilateral relationship between exactly one Source Epic and one
  Paired Epic.
- **Pairing reference**: a non-secret, single-use setup correlation reference;
  it is never an authenticator or authorization credential.
- **Invitation**: a pending proposal to establish a Pairing through a pairing
  reference.
- **Outbound pairing**: the manufacturer-local pending record created when a
  Pairing reference is issued and awaiting supplier acceptance.
- **Inbound pairing**: the supplier-local pending record created from a received
  Pairing reference before the supplier binds its existing Paired Epic.
- **Acceptance**: the supplier administrator's explicit decision to activate a
  pending Invitation.
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
- **Paired Epic**: the supplier-owned existing Epic that represents supplier
  delivery work.
