# Direct Blue-to-Green Lean Event POC

**Status:** Proposed implementation scope  
**Parent design:** [`event-streaming.md`](./event-streaming.md)  
**Scope:** One deliberately naïve, cross-tenant event path from the existing Blue Jira Automation Action to Green Jira Automation.  

---

## 1. Goal

Demonstrate that a Blue-site Jira Automation Action can emit a **lean CloudEvent** to a Green-site Forge webtrigger and that Green can cause a local Jira Automation rule to react.

The end-to-end demonstration is:

```text
Blue Jira Automation Action
  -> Blue Forge action
  -> Green Forge webtrigger
  -> Green Jira Automation Incoming webhook
  -> comment on Green's paired Epic
```

This POC validates the **signal transport and local handoff only**. It does not implement the production event-engine architecture described in the parent design.

## 2. Success criteria

The POC is successful when all of the following are true:

1. Running the existing **Publish work package** Automation Action on Blue emits one valid CloudEvents 1.0 event.
2. The event reaches Green through a Forge webtrigger.
3. Green rejects malformed events and events that do not match its active local pairing.
4. For an accepted event, Green forwards an identifier-only event copy to a configured Green Jira Automation Incoming webhook.
5. The Green Automation rule adds a comment to its paired Epic containing the event identifier, type, pairing identifier, and Blue issue key.
6. No issue summary, description, comment content, user identity, or other human-readable source content crosses the site boundary.
7. Tests cover the contract, failure paths, tenant-local configuration, and Forge manifest wiring.

## 3. Scope

### In scope

- An action-specific CloudEvent emitted by Blue after the existing work-package command reaches its `queued` outcome.
- Direct synchronous HTTP delivery from Blue to Green.
- A Green webtrigger that validates the event against Green-local pairing state.
- Green forwarding accepted events to a Green-local Jira Automation Incoming webhook.
- Development-only configuration seeded by the existing local dev coordinator/harness.
- A documented Green Automation rule that comments on the paired Epic.
- Unit and architecture/wiring tests.

### Explicitly out of scope

- A pairing handshake, discovery protocol, tenant registration, or self-service configuration UI.
- Authentication, request signing, or authorization beyond possession of Forge webtrigger capability URLs and Green's local pairing validation.
- AWS API Gateway, EventBridge, SQS, Kinesis, Firehose, queues, or other event infrastructure.
- An outbox, retries, replay, dead-letter queue, receipt store, deduplication ledger, ordering guarantee, or exactly-once processing.
- Jira issue-update subscriptions or general product-event ingestion.
- A Teamwork Graph query or retrieval of Teamwork Graph document content.
- A new graph document identity scheme.
- A production-grade observability, alerting, or operational runbook.

## 4. Domain terms

| Term | Meaning in this POC |
| --- | --- |
| **Blue** | The source Jira/Forge installation that runs the existing Publish work package Automation Action. |
| **Green** | The destination Jira/Forge installation that receives the event and activates its own Automation rule. |
| **Lean event** | A CloudEvents 1.0 signal containing identifiers and field keys only; it contains no replicated issue content. |
| **Pairing** | Existing development-seeded tenant-local configuration that associates a Blue source Epic with a Green paired Epic. |
| **Document locator** | The pair `(pairingId, issueKey)`. It is sufficient to correlate a future Teamwork Graph context lookup without carrying document content or inventing a graph document ID. |
| **Automation handoff** | Green's forward of a validated CloudEvent to its local Jira Automation Incoming webhook. |

## 5. Event contract

### 5.1 Event meaning

The event represents a successful invocation of the app's work-package queueing command. It does **not** claim that Jira observed an issue update and therefore must not use the product-event type `avi:jira:updated:issue`.

Event type:

```text
scg:work-package:queued
```

### 5.2 Blue-to-Green CloudEvent

```json
{
  "specversion": "1.0",
  "id": "<UUID>",
  "type": "scg:work-package:queued",
  "source": "ari:cloud:jira::site/<blue-site-id>",
  "subject": "issue/<BLUE-EPIC-KEY>",
  "time": "2026-08-22T14:30:00.000Z",
  "datacontenttype": "application/json",
  "data": {
    "pairingId": "<non-secret-pairing-id>",
    "issueKey": "<BLUE-EPIC-KEY>",
    "updatedFields": []
  }
}
```

### 5.3 Contract rules

- `specversion` must equal `"1.0"`.
- `id`, `source`, `subject`, `time`, `data.pairingId`, and `data.issueKey` must be non-empty strings.
- `type` must equal `"scg:work-package:queued"`.
- `datacontenttype` must equal `"application/json"`.
- `time` must be a valid ISO-8601 timestamp.
- `subject` must be `issue/<data.issueKey>`.
- `updatedFields` must be an empty array for this action-originated event. The action has not observed or performed a Jira field mutation.
- The event must not contain issue summary, description, comments, reporter, assignee, email address, account ID, destination issue key, document content, or webhook URLs.

### 5.4 Document locator

The POC carries `data.pairingId` and `data.issueKey`, not an exact graph document ID.

The current Automation Action does not have the source issue's immutable numeric Jira ID, while the existing starter-delivery graph document identity depends on that ID. Adding a Jira read solely to manufacture a graph document ID would couple this transport POC to the current projection implementation.

A later Green-local context layer may resolve the `(pairingId, issueKey)` locator into a Teamwork Graph document. That later lookup must remain local to Green.

## 6. Runtime design

### 6.1 Blue emission

The existing `Publish work package` Automation Action remains the user-facing trigger.

After its normal command reaches `queued`:

1. Blue reads its active source pairing from tenant-local KVS.
2. Blue creates the lean event from the pairing ID, configured Blue site ARI, source Epic key, clock time, and a UUID.
3. Blue POSTs the event once to the Green event URL seeded in the source pairing.
4. Blue surfaces a non-success receiver response as an Automation Action failure.

Blue must not send an event if it cannot find an active configured source pairing.

### 6.2 Green receipt and validation

Green exposes a dedicated Forge webtrigger for lean events.

On receipt, Green:

1. parses JSON as untrusted input;
2. validates the CloudEvent contract;
3. reads its own destination pairing configuration from tenant-local KVS;
4. verifies that the configured active pairing ID and source Epic key match the event;
5. forwards the validated event to Green's configured Jira Automation Incoming webhook;
6. returns a small success response only after Jira Automation accepts the webhook request.

Green returns a client error for malformed events and a conflict-style error for unavailable or mismatched pairings. It returns a gateway-style error when forwarding to Jira Automation fails.

### 6.3 Green Automation forward

Green forwards the accepted event with one Green-local enrichment:

```json
{
  "...CloudEvent fields...": "...",
  "data": {
    "pairingId": "<pairing-id>",
    "issueKey": "BLUE-101",
    "updatedFields": [],
    "pairedEpicKey": "GREEN-42"
  }
}
```

`pairedEpicKey` is added only after Green validates the event. Blue never receives it, and it is not included in the Blue-to-Green event contract.

## 7. Green Jira Automation rule

The demo environment must contain a manually configured Green Jira Automation rule:

1. **Trigger:** Incoming webhook.
2. **Condition:** event type equals `scg:work-package:queued`.
3. **Action:** add a comment to `{{webhookData.data.pairedEpicKey}}`.
4. **Comment contents:** include only:
   - `{{webhookData.id}}`
   - `{{webhookData.type}}`
   - `{{webhookData.data.pairingId}}`
   - `{{webhookData.data.issueKey}}`

Example rendered comment:

```text
SCG event received: id=<event-id>, type=scg:work-package:queued,
pairing=<pairing-id>, source issue=BLUE-101.
```

The rule must not copy source issue content into the Green comment.

## 8. Development-only configuration

The development coordinator remains the only party that knows all capability URLs. It creates or supplies values locally and seeds each installation separately.

### Blue source pairing seed

| Value | Purpose |
| --- | --- |
| `pairingId` | Non-secret correlation and validation ID. |
| `sourceEpicKey` | Blue Epic that the pairing permits. |
| `sourceSiteAri` | CloudEvent `source` value. |
| `peerEventUrl` | Green's dedicated lean-event Forge webtrigger URL. |

### Green destination pairing seed

| Value | Purpose |
| --- | --- |
| `pairingId` | Matches the Blue event. |
| `sourceEpicKey` | Validates the Blue signal subject. |
| `pairedEpicKey` | Local Green target for the demonstration rule. |
| `automationWebhookUrl` | Green Jira Automation Incoming webhook capability URL. |

Expected local secret/configuration names:

```text
SCG_SOURCE_SITE_ARI
SCG_DESTINATION_EVENT_URL
SCG_DESTINATION_AUTOMATION_WEBHOOK_URL
```

These values are development harness inputs. The runtime must not return or log either webhook URL.

## 9. Reliability and error semantics

This POC intentionally provides **at-most-once, synchronous delivery**:

- Blue makes one direct POST to Green.
- Green makes one direct POST to Jira Automation.
- Any failure is returned synchronously to the caller of the Blue Automation Action.
- No automatic retry occurs.
- No receipt, outbox, queue, replay, or deduplication state is persisted.
- Re-running the Automation Action creates another attempt.

The implementation must include a nearby `ponytail:` comment documenting this ceiling and naming an outbox/retry/receipt path as the future upgrade when reliability becomes required.

## 10. Security and privacy constraints

This is a deliberately incomplete development POC, not a production security design.

Required safeguards that still apply:

- Treat all HTTP bodies as untrusted input.
- Validate the event contract before Green forwards it.
- Verify the event matches Green's active local pairing.
- Do not include source issue content or human/identity data in the event.
- Do not log body content, Automation webhook URLs, or Forge webtrigger URLs.
- Keep Green pairing details out of Blue's event.
- Declare only the required backend egress host for Jira Automation in `manifest.yml`.

Known POC limitations:

- Forge webtrigger URLs are bearer capabilities.
- The event has no signature or caller identity proof.
- A Green Automation webhook URL is also a capability.

Production work must replace this configuration-only trust model with authenticated, tenant-isolated transport and explicit authorization.

## 11. Implementation boundaries

Expected implementation areas:

| Area | Intended change |
| --- | --- |
| `src/collaboration/` | Pure lean-event contract, Blue sender, and Green webtrigger receiver. |
| `src/publication/forge-automation-action.ts` | Emit after the existing queued work-package outcome. |
| `src/pairing/` | Extend development seed/state shapes with only the local values above. |
| `src/index.ts` | Export Green receiver handler. |
| `manifest.yml` | Declare the receiver webtrigger, handler, and Automation egress allowlist. |
| `scripts/` and `secretspec.toml` | Supply and seed POC-only configuration. |
| `test/` | Contract, source, receiver, seed, manifest, and handler-wiring coverage. |
| `docs/` | Setup and demo instructions for the Blue Automation Action and Green rule. |

## 12. Acceptance checks

### Automated

- A valid action-specific event is built deterministically given UUID and clock inputs.
- Invalid JSON and every invalid required field are rejected by Green.
- Green rejects an inactive pairing, a different pairing ID, and a different source issue key.
- Blue sends only lean fields and no source content.
- Green forwards only after validation and includes `pairedEpicKey` only in the Green-local forwarded copy.
- Blue reports Green failures; Green reports Jira Automation forwarding failures.
- Seeded webhook URLs do not appear in success responses or structured logs.
- Manifest and `src/index.ts` handler wiring are valid.

### Manual demo

1. Deploy the same app to Blue and Green development sites.
2. Create the Green Jira Automation Incoming-webhook rule described above.
3. Generate the Green event webtrigger URL and provide the Green Automation webhook URL to the local development coordinator.
4. Seed Blue and Green pairings with the POC configuration.
5. Run the Blue **Publish work package** Automation Action for the configured Blue Epic.
6. Confirm the Green paired Epic receives the identifier-only comment.
7. Confirm Forge logs contain safe correlation metadata only.

## 13. Deferred follow-up increments

1. Green-local Teamwork Graph context resolution from `(pairingId, issueKey)`.
2. Authenticated cross-tenant event delivery and authorization.
3. Durable outbox, retries, receipts, idempotency, and replay.
4. AWS ingestion and fan-out infrastructure from the parent architecture.
5. Actual Jira issue-update event emission with non-empty changed field keys.
6. Administrative setup, key rotation, lifecycle deactivation, and observability.
