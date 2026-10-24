# Developing Supplychain Graph

This guide describes the local development loop for Supplychain Graph. Product
and architecture decisions live in [`specs/`](specs/).

## Prerequisites

- Node.js 24 and npm, matching [`.nvmrc`](.nvmrc).
- The Forge CLI, authenticated only when you need to register, deploy, install,
  tunnel, or inspect a hosted app.
- Bun 1.4.3+ for the Fence Rider development dependency (installed from its
  private GitHub repository; Git access is required).
- SecretSpec 0.21.1+ with your chosen provider configured. Fence Rider resolves
  the full profile for Forge lint as well as deployment and installation.

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
| `npm run typecheck` | Type-check application and test TypeScript. |
| `npm run size:check` | Build and enforce the 80 kB compressed application-output budget. |
| `npm run lint` | Run prelint checks, Biome, Forge lint, and type-checking. |
| `npm run format` | Apply Biome formatting. |
| `npm run format:check` | Verify formatting without writing. |
| `npm run build` | Compile the TypeScript application into `dist/`. |
| `npm run check` | Run the normal pre-push quality gate. |

The `vendor/` directory is reference material, not a workspace. Root commands
must not lint, type-check, or run its test suites.

Forge workflows use Fence Rider. Generator commands are captured with `&&`
before executing their value-free scripts; generation failure stops the workflow.
Error-code strings and the manifest's reviewed dynamic-peer egress and classic
Jira scopes have narrowly scoped `ast-grep-ignore` comments.

The 80 kB size budget replaces the starter's 10 kB placeholder and measures the
compressed compiled application output, not Forge's deployed bundle. It is
checked during pre-push alongside tests and lint.

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

`secretspec.toml` declares `FORGE_PRODUCT`, `FORGE_ENVIRONMENT`, and the
shared development-only peer HMAC secret. Generate and store the secret as an
encrypted Forge variable without printing it:

```sh
npm run forge:variables:generate-shared-secret
```

The script generates exactly 32 random bytes, base64-encodes them, stores the
value in your SecretSpec provider via stdin, then runs `fence-rider variables`
for an encrypted Forge upload. A provider write failure prevents upload. If upload
fails, the new provider value remains; retry the upload before deploying.
The Peer POC readiness
page uses trusted Forge runtime identity and fails closed when local prerequisites
are unavailable; it never displays the secret or a secret-derived fingerprint. It
prefers Homebrew
OpenSSL 3, ignores a conflicting inherited `OPENSSL_CONF`, and fails rather
than using an older LibreSSL binary. Set `OPENSSL_BIN` to override the selected
OpenSSL 3 binary, or set `FORGE_ENVIRONMENT` to target a non-development Forge
environment.

Generate a new value when rotating this controlled POC secret. Do not print,
commit, or copy it into application configuration, webtrigger URLs, or logs.
Future Pairing setup in the Forge admin flow will supply the non-secret
counterpart endpoint and relationship state.

Upload configured runtime values with `npm run forge:variables:set`. Only names
in `[scopes.runtime].secrets` are uploaded, and every value is encrypted. The
`:set-encrypted` and `:set:secretspec` scripts are aliases for the same allowlisted
upload. They no longer accept arbitrary `KEY VALUE` arguments; set values in your
provider, then upload. Use `-- --environment staging` to override the environment.
Upload failures are not transactional; deploy separately to the same environment
after a successful upload to activate changes.

`npm run forge:install` and `npm run forge:upgrade` use local-only
`SCG_SOURCE_SITE` and `SCG_DESTINATION_SITE` from the active SecretSpec profile.
Both must be present before either installation changes. The adapter supplies
`FORGE_SITE` per site, so do not add a provider declaration for `FORGE_SITE`.
Product and environment remain profile-controlled. Installs are non-interactive;
upgrades explicitly add `--upgrade`. Neither adds automatic scope consent.
`npm run forge:uninstall` attempts both sites before returning failure for an
unexpected uninstall error; an already-absent installation is a successful no-op.
Keep real credentials and secret values outside the repository.

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
