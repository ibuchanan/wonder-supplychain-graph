# Run the direct Blue-to-Green lean-event POC

Use this development-only guide to demonstrate one identifier-only event from a
Blue Jira Automation Action to a Green Jira Automation comment. It is not a
pairing, authentication, or production-operating design.

## What you need

Prepare these values locally; capability URLs must never be committed, pasted
into tickets, or added as Forge variables:

| Value | Used by |
| --- | --- |
| `SCG_SOURCE_SITE`, `SCG_DESTINATION_SITE` | Forge deployment and webtrigger creation |
| `SCG_SOURCE_SITE_ARI` | Blue CloudEvent `source` |
| `SCG_SOURCE_EPIC_KEY` | The Blue Epic that may emit the event |
| `SCG_PAIRED_EPIC_KEY` | The Green Epic that receives the comment |
| `SCG_PAIRING_ID` | Shared non-secret pairing correlation ID |
| `SCG_SOURCE_SEED_URL`, `SCG_DESTINATION_SEED_URL` | Independent local pairing seeds |
| `SCG_DESTINATION_EVENT_URL` | Blue-to-Green event capability |
| `SCG_DESTINATION_AUTOMATION_WEBHOOK_URL` | Green-local Automation capability |
| `SCG_DESTINATION_DELIVERY_URL` | Existing starter-delivery seed compatibility only; the lean-event flow does not use it |

## Deploy the development app

1. Configure the source and destination site hostnames plus `FORGE_PRODUCT` and
   `FORGE_ENVIRONMENT` in local SecretSpec configuration.
2. Enable the development-only seed endpoints on both installations:

   ```sh
   forge variables set --environment development DEMO_PAIRING_SEED_ENABLED true
   ```

3. Deploy and upgrade both installations so the webtrigger and Automation Action
   modules are present:

   ```sh
   bun run forge:deploy
   bun run forge:upgrade
   ```

4. Retrieve the source/destination seed URLs and Green lean-event URL into your
   local environment only:

   ```sh
   bun run demo:starter-delivery:webtriggers
   ```

   The helper prints real development capabilities. Copy them directly into your
   local SecretSpec environment and do not retain the terminal output. Create
   Green's Jira Automation Incoming-webhook rule and store its generated URL only
   as `SCG_DESTINATION_AUTOMATION_WEBHOOK_URL` in that same local environment.

## Configure Green Jira Automation

On Green, create a rule with an **Incoming webhook** trigger. Add a condition
that `{{webhookData.type}}` equals `scg:work-package:queued`, then add a comment
to `{{webhookData.data.pairedEpicKey}}` containing only:

```text
SCG event received: id={{webhookData.id}}, type={{webhookData.type}}, pairing={{webhookData.data.pairingId}}, source issue={{webhookData.data.issueKey}}
```

The rule must not read Teamwork Graph content, source issue fields, or any other
payload data. It only consumes the forwarded CloudEvent fields and Green's local
`pairedEpicKey`.

## Seed the two tenants

Run the local harness:

```sh
bun run demo:lean-event
```

It sends Green's seed first, then Blue's seed. The output names the configured
Blue and Green issue keys and the one remaining manual action; it never prints a
capability URL. A failed seed returns its HTTP status and the failed step without
including the server response body.

## Exercise and verify the event

1. In Blue Jira Automation, run **Publish work package** for
   `SCG_SOURCE_EPIC_KEY`, with the source Epic key as `sourceEpicId` and the
   Automation actor account ID as `publisherId`.
2. Confirm the configured Green paired Epic has exactly one new comment for this
   attempt. It must contain only the event ID, event type, pairing ID, and Blue
   source issue key.
3. Inspect both Forge development logs with `bun run forge:logs`. Confirm that
   seed logs contain pairing ID and role only; logs and responses must not show
   either webhook URL or Green's paired Epic key in Blue.

## Reliability boundary and deferred work

This POC is **at-most-once and synchronous**: Blue posts once to Green, and
Green posts once to Jira Automation. There is no retry, receipt, outbox, queue,
deduplication, replay, or durable audit state. Re-running the Blue Automation
Action creates another attempt.

Production work deliberately deferred from this POC includes authenticated
cross-tenant delivery and authorization, Green-local Teamwork Graph resolution,
durable delivery/retry/receipt handling, event fan-out infrastructure, actual
Jira update-event emission, and administrative lifecycle/key-rotation controls.
