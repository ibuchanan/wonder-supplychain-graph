# Run the starter-delivery demonstration

This how-to runs the controlled starter-delivery demonstration from a clean
installation of the current checked-out app.

The demonstration uses two Jira development sites:

- the **source** site, which owns the Jira Epic; and
- the **destination** site, which receives a document through Teamwork Graph.

Treat generated webtrigger URLs as development capabilities. Store them only in
your local SecretSpec profile or another local secret store. Do not commit,
share, or log them.

## Prerequisites

You need:

- Node.js 24 and npm, matching [`.nvmrc`](../.nvmrc);
- the Forge CLI, authenticated for the Forge app declared in
  [`manifest.yml`](../manifest.yml);
- SecretSpec configured locally with the two development-site hostnames; and
- organization-admin access to create the destination Teamwork Graph connection.

Use controlled, non-sensitive test data. The destination document is
workspace-visible and includes the source Epic key and summary.

The checked-out `manifest.yml` already identifies the Forge app. Do **not** run
`forge register`: it creates a new app identity, rather than deploying this
app's current identity.

## 1. Prepare the repository and local configuration

Install dependencies and verify the checkout:

```sh
npm install
npm run check
```

Configure your local SecretSpec profile with these required deployment values:

```dotenv
FORGE_PRODUCT=jira
FORGE_ENVIRONMENT=development
SCG_SOURCE_SITE=source-example.atlassian.net
SCG_DESTINATION_SITE=destination-example.atlassian.net
```

`SCG_SOURCE_SITE` and `SCG_DESTINATION_SITE` are hostnames, not URLs. The
repository's Forge scripts use this local configuration to target both sites.

## 2. Deploy and install the app on both sites

Deploy the current app to its development environment, then install that
version on the source and destination sites:

```sh
npm run forge:deploy
npm run forge:install
```

This guide assumes neither site has an old Supplychain Graph installation, so
no upgrade, uninstall, or prior-demo reset is required.

## 3. Create the destination graph connection

On the destination site, as an organization admin:

1. Open **Atlassian Administration**.
2. Select **Apps**, then the destination site.
3. Open **Connected apps**, select this app, and open **Connections**.
4. Connect the **Supplychain Graph Package** connector.
5. Wait for the connection to become active.

The connection-change event records the destination connection in app storage.
The destination seed operation returns HTTP `409` until that record exists.

## 4. Enable the development seed handlers

The development-only pairing seed handlers return `404` until
`DEMO_PAIRING_SEED_ENABLED` is exactly `true`. Set it once for the shared Forge
development environment:

```sh
forge variables set DEMO_PAIRING_SEED_ENABLED true --environment development
```

Do not enable this variable in staging or production. Forge variables belong to
an app environment, so this setting applies to both site installations using
the development environment.

## 5. Generate the webtrigger settings

Generate or retrieve all four webtrigger URLs and print the existing
SecretSpec assignments in one ready-to-paste block:

```sh
npm run demo:starter-delivery:webtriggers
```

Paste the complete output block into your local `.env`. The command is safe to
rerun: Forge returns the same URL for a function in the same installation
context. The URLs are development capabilities; do not commit, share, or log
them.

## 6. Choose the demo records and local harness values

Create or select an Epic on each site, then choose a non-secret pairing ID. Use
the Jira issue **key**, not an issue URL.

| Variable | Value |
| --- | --- |
| `SCG_PAIRING_ID` | A new unique ID shared by both site seed operations, such as `starter-demo-2026-08-09-a`. |
| `SCG_SOURCE_EPIC_KEY` | The source site's test Epic key, such as `MFG-17`. |
| `SCG_PAIRED_EPIC_KEY` | The destination site's paired Epic key, such as `SUP-42`. This is retained as pairing metadata. |

Keep the four webtrigger assignments generated in the preceding step, then add these three values to your local SecretSpec profile:

```dotenv
SCG_PAIRING_ID=starter-demo-2026-08-09-a
SCG_SOURCE_EPIC_KEY=MFG-17
SCG_PAIRED_EPIC_KEY=SUP-42
```

The harness validates all eight values before making a request. It derives the
canonical source browser URL from `SCG_SOURCE_SITE` and stores that URL in the
source pairing; this avoids deriving a browser link from Jira's API-form
`self` URL. These values are local-only; do not upload them as Forge variables.

## 7. Run and verify the demonstration

Run the harness. The npm script uses SecretSpec to load the local-only harness values:

```sh
npm run demo:starter-delivery
```

It performs these calls in order:

1. seeds the destination pairing with the source Epic and paired destination
   Epic;
2. seeds the source pairing with the destination delivery URL; and
3. publishes the source pairing.

A successful result includes `outcome: "delivered"`, a correlation ID, document
ID, source Epic key, source URL, update sequence, and `objectCount: 1`. It also
prints a copy-paste `twg docs search` command scoped to the destination site.
Run that command to retrieve the destination-side search result and graph
Document ARI; it does not directly hydrate raw graph-document fields. Use the
correlation ID to find the source and destination Forge logs. Then, as a
normally authorized user, confirm that destination Search or Rovo finds the
document and that its source URL opens the source Epic.

If you deployed a version that adds source-site URL provenance after a pairing
was already seeded, rerun this harness before publishing. Reseeding replaces the
source pairing with the canonical `https://<SCG_SOURCE_SITE>` URL required for
document navigation.

If the harness reports `request-failed`, it includes the failed step, HTTP
status, and any JSON `error` or `message`. For `409` at `destination-seed`,
confirm that the destination graph connection is active and inspect development
Forge logs.
