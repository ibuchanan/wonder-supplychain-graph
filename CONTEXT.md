# Supplychain Graph Context

## Ubiquitous language

- **Pairing**: the bilateral relationship between exactly one Source Epic and one
  Paired Epic.
- **Pairing reference**: a non-secret, single-use setup correlation reference;
  it is never an authenticator or authorization credential.
- **Invitation**: a pending proposal to establish a Pairing through a pairing
  reference.
- **Acceptance**: the supplier administrator's explicit decision to activate a
  pending Invitation.
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
