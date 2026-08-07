# Starter peer-to-peer Jira bridge

## Status

Proposed scope for the first demonstrable cross-tenant connector iteration.

## Goal

Demonstrate one selected Jira Epic moving directly from a source Forge app
installation to a paired destination Forge app installation. The destination
must publish the Epic as one discoverable Teamwork Graph document.

The demonstration proves the cross-tenant boundary. It does not attempt to
implement the full Supplychain Graph V1 workflow.

## User outcome

A user can:

1. create a native Teamwork Graph connection on the destination site;
2. seed an agreed development Pairing in each test tenant from a terminal;
3. trigger publication for that Pairing from a terminal;
4. find the resulting document in the destination site's Search or Rovo; and
5. follow its canonical URL back to the source Jira Epic.

## In scope

### Local readiness

Local readiness describes only prerequisites that the current tenant can verify.
It makes no claim that the peer tenant is reachable, configured, or ready.

- A **source tenant** is locally ready when it has an active local Pairing with
  a peer delivery endpoint.
- A **destination tenant** is locally ready when it has an active local Pairing
  and an active Teamwork Graph connection.

The Jira issue panel is a read-only readiness surface. It shows one of these
states for its local role:

- **Unconfigured:** a required local prerequisite is absent;
- **Waiting for pairing:** the local Pairing is absent;
- **Ready for starter publication or delivery:** its local prerequisites exist;
- **Delivery failed:** a safe error summary with log-based troubleshooting.

Peer reachability is established only when a delivery request runs.

The panel does not seed Pairings, publish Epics, display simulated package
content, or expose peer delivery URLs.

### Development Pairing seed

Deploy two development-only webtriggers, one for each tenant installation.

A seed handler:

- runs only when `DEMO_PAIRING_SEED_ENABLED` is enabled;
- validates a small seed request;
- creates or idempotently updates one active local Pairing in KVS; and
- emits a structured Forge log event.

The destination seed handler also derives the active graph `connectionId` from
local KVS and rejects a seed request when that connection is absent. The source
seed handler does not require a graph connection.

The seed handler does not perform role lookup, persistent audit-journal writes,
or invitation workflow processing.

The source tenant's Pairing stores the destination delivery-webtrigger URL. The
destination tenant does not store its own delivery URL. This URL is a
non-displayable development capability: never show it in UI or logs, and never
commit it to source control.

### Source publication

A source-side development webtrigger accepts only:

```json
{ "pairingId": "demo-pairing-001" }
```

The source handler:

1. loads the active local Pairing from KVS;
2. derives the allowed Source Epic and destination delivery URL from that
   Pairing;
3. reads the Source Epic from local Jira as the Forge app;
4. creates one starter document snapshot; and
5. sends that snapshot directly to the destination delivery webtrigger.

The terminal or test harness triggers source publication. It never reads the
Epic or relays Epic content between tenants.

### Destination delivery and graph ingestion

The destination delivery handler:

1. derives its active graph `connectionId` from KVS;
2. loads and validates its active local Pairing;
3. validates the incoming starter-document payload;
4. sets one graph document using the Connector SDK; and
5. emits a structured log event with the shared correlation ID and delivery
   outcome.

The handler does not create a candidate, receipt state, current package,
idempotency record, or local package version.

### Starter document

The connector uses exactly one graph type:

```yaml
objectTypes:
  - atlassian:document
```

For one Source Epic, the destination publishes exactly one workspace-visible
document with:

- **ID:** `pairingId:sourceIssueId`;
- **display name:** the Source Epic key and summary;
- **content:** plain text containing the Source Epic key and summary only;
- **canonical URL:** the source Jira Epic URL;
- **created and updated times:** source Jira timestamps;
- **update sequence:** `Date.parse(fields.updated)`;
- **visibility:** `EVERYONE` for the controlled development demo.

The starter document does not parse Jira ADF descriptions. It does not publish
child issues, attachments, comments, statuses, owners, custom fields,
containers, parent-child links, or associations.

### Synchronization and observability

The connector declares:

```yaml
capabilities:
  replicatesPermissions: false
  syncFidelity: upsert
  supportsIncrementalSync: false
```

Publication is manually triggered and performs a full selected-record sync.

Teamwork Graph object identity and source-derived update sequence numbers
provide replay safety. A correlation ID joins source and destination structured
logs, but is not a persistent delivery workflow or idempotency key.

### Peer transport

Use v2 Forge webtrigger URLs for the development peer transport. The source
runtime may call the destination through a narrowly scoped backend egress rule
for `*.webtrigger.atlassian.app`.

This is a development-only transport choice. It is not the future production
peer authorization model.

### Terminal harness

Create one repository-owned development harness that:

1. loads generated source and destination webtrigger URLs from local
   environment variables;
2. seeds the destination Pairing;
3. seeds the source Pairing with the destination delivery URL;
4. invokes source publication with the Pairing ID; and
5. verifies the returned delivery outcome, document ID, source Epic key, update
   sequence, and object count.

The harness must not contain site identifiers, generated URLs, Pairing data, or
secrets in Git.

## Acceptance criteria

1. A destination administrator can create a native graph connection and the app
   records its active `connectionId`.
2. The issue panel reports Unconfigured until that connection exists.
3. A development seed handler rejects requests when the runtime seed gate is
   disabled. The destination seed handler also rejects requests when no active
   graph connection exists.
4. Seeding both tenants creates matching active local Pairings, and only the
   source record contains the destination delivery URL.
5. A source publication request with a known `pairingId` reads only the Epic
   named by the local Pairing.
6. The source Forge runtime delivers one document payload directly to the
   destination Forge runtime.
7. The destination accepts a matching active Pairing and writes exactly one
   `atlassian:document` to Teamwork Graph.
8. The document ID is stable across repeated publication of the same Source
   Epic through the same Pairing.
9. Repeating an unchanged publication does not create a second graph object.
10. A stale document update cannot replace a newer update sequence.
11. The document is searchable in the destination site, and its canonical URL
    opens the Source Epic for a user with normal source-system access.
12. The issue panel reports Ready only when the current tenant's required local
    prerequisites for its role exist.
13. Source and destination logs contain the same correlation ID and no delivery
    URL or secret values.

## Explicitly out of scope

- invitation, acceptance, pairing-reference, and mutual-grant UX;
- production peer authentication or authorization;
- role checks on development webtriggers;
- connector configuration forms and credential validation;
- per-user or per-group permission replication;
- Rovo comment actions and originating-Epic comments;
- `atlassian:work-item` projections;
- child issue, hierarchy, container, or association ingestion;
- Jira ADF-to-plain-text conversion;
- async queues, retries, delivery candidates, persisted idempotency, and local
  receipt state;
- webhooks, incremental sync, scheduled synchronization, and reconciliation;
- source deletion, Pairing revocation, object deletion, and `mirror` fidelity;
- a persisted or administrator-visible audit journal.

## Known limitations and reset

This scope is safe only for controlled, non-sensitive, workspace-visible
development data.

With `upsert`, a removed Source Epic or Pairing can leave its last document in
Teamwork Graph. The supported clean reset is to delete and recreate the native
graph connection, then seed the Pairing again.

## Evolution after the demonstration

The next changes should be chosen by demonstrated need, not pre-built now:

1. add ADF-to-plain-text projection for richer retrieval;
2. add an authenticated peer transport and bilateral authorization model;
3. add explicit deletion or `mirror` fidelity;
4. add actual invitation and acceptance UI;
5. add fine-grained source-permission replication;
6. add child work items and graph associations; and
7. add asynchronous delivery, retry, reconciliation, and durable audit
   evidence.
