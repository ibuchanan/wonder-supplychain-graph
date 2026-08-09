# Developing Supplychain Graph

This guide describes the local development loop for Supplychain Graph. Product
and architecture decisions live in [`specs/`](specs/).

## Prerequisites

- Node.js 24 and npm, matching [`.nvmrc`](.nvmrc).
- The Forge CLI, authenticated only when you need to register, deploy, install,
  tunnel, or inspect a hosted app.
- SecretSpec when running the Forge scripts that read `FORGE_*` configuration.

## First-time setup

```sh
npm install
npm run check
```

The repository commits `package-lock.json`; use npm to keep it current.

## Everyday loop

| Command | Purpose |
| --- | --- |
| `npm run test` | Run project-owned tests once. |
| `npm run test:watch` | Re-run project-owned tests while editing. |
| `npm run typecheck` | Type-check production application TypeScript. |
| `npm run lint` | Run prelint checks, Biome, Forge lint, and type-checking. |
| `npm run format` | Apply Biome formatting. |
| `npm run format:check` | Verify formatting without writing. |
| `npm run build` | Compile the TypeScript application into `dist/`. |
| `npm run check` | Run the normal pre-push quality gate. |

The `vendor/` directory is reference material, not a workspace. Root commands
must not lint, type-check, or run its test suites.

## Forge baseline

`manifest.yml` declares a minimal Jira issue panel and retains this app's Forge
identity. The collaboration core is intentionally pure and has no Forge I/O.
When a product capability needs a backend handler, Jira API access, or another
Forge surface, add the least-privilege module and permissions in the same
change.

Before modifying `manifest.yml`, verify the relevant Forge module and scope in
the current Forge documentation. After any permissions or egress change, deploy
and upgrade the installation:

```sh
npm run forge:deploy
npm run forge:upgrade
```

Run `npm run forge:register` only when deliberately adopting this source tree as
a new Forge app. It changes the app ID and should not be a normal setup step.

## Forge configuration

`secretspec.toml` declares non-secret Forge command configuration:

- `FORGE_PRODUCT`
- `FORGE_ENVIRONMENT`
- `SCG_SOURCE_SITE` and `SCG_DESTINATION_SITE` for the controlled two-tenant
  Forge workflows

Use the `forge:*` scripts only after configuring those values with SecretSpec.
`npm run forge:install` and `npm run forge:upgrade` fail fast after the
source-site operation. `npm run forge:uninstall` attempts both sites before
returning failure for an unexpected uninstall error; an already-absent
installation is a successful no-op. Keep real credentials and secret values
outside the repository.

## Controlled two-tenant starter delivery

Use `npm run demo:starter-delivery` to run the controlled development harness after deploying the app to both tenants and creating a destination graph connection. The script uses SecretSpec to load generated webtrigger URLs, site-specific Epic IDs, and the Pairing ID from your local environment; do not commit them.

The harness requires these local environment variables:

- `SCG_DESTINATION_SEED_URL`
- `SCG_DESTINATION_DELIVERY_URL`
- `SCG_SOURCE_SEED_URL`
- `SCG_SOURCE_PUBLICATION_URL`
- `SCG_PAIRING_ID`
- `SCG_SOURCE_EPIC_KEY`
- `SCG_PAIRED_EPIC_KEY`

It seeds the destination Pairing, seeds the source Pairing with the destination delivery URL, and then invokes source publication. On success it prints the delivery correlation ID, document ID, source Epic key, update sequence, and object count. Use the correlation ID to join source and destination Forge logs. Then manually confirm that destination Search/Rovo finds the document and that its source URL opens the Source Epic for a normally authorized user.

The supported clean reset is to delete and recreate the destination native graph connection, then rerun the harness to seed both Pairings again. This is necessary because `upsert` can leave a previously indexed document after its Source Epic or Pairing is removed.

## Testing expectations

Add behavior tests at an agreed public seam. The collaboration core should be
deterministic and free of Forge, network, storage, Jira-content, and credential
dependencies. Add manifest-wiring tests when a Forge module or handler is
introduced.

## Repository boundaries

- Keep feature requirements and decisions in `specs/`.
- Treat `vendor/` as read-only reference material unless intentionally updating
  a submodule or imported example.
- Do not retain generated Hello World modules, placeholder scripts, or template
  documentation once a real project convention replaces them.
