# Peer-to-peer authorization flow (shared-secret POC)

## Status

This is a deliberately constrained proof of concept.
It defines an invitation and authorization UX
that uses a Forge environment secret only
to authenticate direct peer requests.
It does not approve this secret model for customer deployments.

## Purpose

Demonstrate that two controlled Forge installations
can establish one **Site relationship**
and authorize one or more separately scoped **Pairings**
without a terminal relay or a central application service.

The proof answers a product question:
can the people involved understand
and safely complete the bilateral consent flow?

It reuses the terms in
[the domain glossary](../CONTEXT.md)
and is a companion
to [Peer-to-peer authentication and authorization](peer-to-peer-authentication.md).
That document remains the intended successor for real peer credential bootstrap.

## POC boundary

### In scope

- Exactly two named, controlled development-site installations
  using the same Forge app **development environment**.
- One deployment-provisioned, encrypted Forge environment variable
  containing a high-entropy POC secret.
- A recipient-bound, non-secret Site relationship invitation.
- Tina's nomination of Blue and Blue-side administrator consent.
- Toby's final Green-side approval of
  the nominated Blue installation
  and the agreed terms.
- Application-implemented HMAC authentication on direct bootstrap,
  confirmation, and enabled operational webtrigger requests, using the
  RFC-141-compatible header shape.
- Local enforcement of a Site relationship lease and Pairing-level allowlist.
- Explicit rejection, expiry, and local revocation.

### Explicitly out of scope

- OPAQUE, PAKE, passphrases, key agreement, encrypted endpoint exchange,
  or peer-key rotation.
- Customer deployment, production use,
  or more than the two approved development installations.
- Treating a Forge environment variable
  as tenant-specific secret storage.
- Generalized delegation, Automation-created counterpart Epics,
  or delegated Pairing acceptance.
- A new permission model for Jira, Teamwork Graph, or the Forge app.
- Renewal. A new invitation is required after expiry or revocation.

## Key decision: authentication is not authorization

`SHARED_SECRET` is a base64-encoded secret set with
`forge variables set --encrypt` for the shared Forge development environment
before either site performs setup. The current app reads it to compute and
verify request signatures; Forge does not yet perform that verification.
It is never shown in the app UI, invitation, URLs, normal storage, source control, or logs.

The POC adopts RFC-141's 32–64 decoded-byte key constraint now, so its secret
format can be registered with Forge's future `hmacSharedSecret` feature without
replacement. Key rotation and the platform's two-key/12-month lifecycle are
future migration concerns; the POC does not claim to implement them.

Because Forge variables are environment-scoped,
every installation that uses that development environment can hold the same secret.
Consequently, a valid Forge HMAC signature proves only
**possession of the controlled POC secret**.
It does not prove a particular customer tenant, person, or genuine peer installation.

The receiver authorizes a request only when _all_ of the following are true:

1. the receiving app verified the request's HMAC signature;
2. the claimed sender site and installation/environment
   match a locally approved Site relationship;
3. the relationship is active, unrevoked, and inside its lease;
4. the exact Pairing is active and authorizes the requested operation; and
5. the request is fresh, unreplayed, schema-valid, and eligible for its route.

This makes the shared variable a transport-authentication experiment,
not the source of business authorization.
A third installation with the same environment secret
still has no authorized relationship and must be denied.

## Actors and local authority

| Actor               | Authority in this POC                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toby                | Green administrator. Creates an invitation and gives final approval after Blue is nominated. He needs no Blue account.                                                      |
| Tina                | Existing Green user selected as the invitation recipient; she has no Green administrator powers. She is also a Blue administrator and may nominate and approve Blue.        |
| Green app           | Owns the outbound invitation and, after Toby's approval, Green's local Site relationship and Pairings.                                                                      |
| Blue app            | Records Blue's local consent, nomination, and local Site relationship/Pairings.                                                                                             |
| Deployment operator | Sets/removes the encrypted development-only POC secret and deploys the same tested app version to the two approved sites. This is deployment setup, not invitation consent. |

Toby's Green administration actions and Tina's Blue administration actions
are available only through their respective Forge admin pages.
For this POC, that module access control is the administrator gate;
the app does not perform a second administrator-permission check for each button press.
Handlers use the authenticated Forge invocation context,
not browser-supplied actor, role, or site values.
A display name, email address, possession of an invitation link,
or possession of the POC secret is never sufficient.

## Proposed UX

### 0. Prepare the controlled POC

The deployment operator deploys the same app version to Green and Blue
in the same Forge development environment
and sets `SHARED_SECRET` as an encrypted Forge variable.
The secret is generated with cryptographically secure randomness
and is at least 32 random bytes before encoding.

Each app shows a local **Peer POC readiness** status to its administrator:

- _Ready_: the encrypted secret is configured
  and the app can determine its local site/installation/environment identity;
- _Blocked_: the secret or required identity is unavailable; or
- _Not approved for this POC_: the installation is not one of
  the two deployment-approved development sites.

The UI exposes no secret value or secret-derived fingerprint.
A readiness check is local only;
it makes no claim about the other site.

### 1. Toby creates a recipient-bound invitation on Green

From Green's peer-relationship administration screen,
Toby selects Tina from existing Green users and chooses **Invite site administrator**.
He enters:

- the high-level purpose and a narrowly defined allowed operation set;
- the agreement end instant (default: one calendar year after activation); and
- an optional safe display label for his own tracking.

The Green admin page creates a pending Site relationship invitation
with a random invitation ID, correlation ID, immutable terms version,
recipient Green account ID, creation time, and fixed seven-day expiry.
It displays a copyable navigation URL containing only the non-secret invitation reference.

Toby sends that URL to Tina through an existing business channel.
The app does not send the message or verify the channel.
Opening the link performs no mutation
and reveals only approved minimal context.

### 2. Tina authenticates on Green and follows the Blue hand-off link

Tina opens the link, signs into Green, and sees **Invitation received**
only if her stable Green account ID matches the invitation recipient.
The page explains:

- Green's approved display name and the high-level purpose;
- proposed operation scope and agreement end instant;
- that she must continue as a Blue administrator; and
- that no sharing is enabled yet.

Tina chooses **Continue on Blue**.
For this controlled two-site POC,
Green already has Blue's development-site app URL from deployment configuration.
Green opens a full Blue-site URL for the app's **Join peer invitation** screen,
using Forge-supported external navigation.
The URL carries only non-secret navigation and setup correlation:
the invitation reference and Green's dedicated bootstrap webtrigger address.
The bootstrap address is not an operational delivery endpoint
and is useless without a valid HMAC signature and authorized relationship state.
It is never included in Toby's original invitation URL.

This direct link is intentional POC scope,
not cross-site discovery or proof of Blue's identity.
If Blue's URL is unavailable or fails validation against the deployment-approved
POC allowlist,
Green falls back to showing the same non-secret hand-off bundle for manual copy.
The link or bundle contains neither a secret nor an HMAC signature.

### 3. Tina nominates and consents to Blue

Tina follows the **Continue on Blue** link,
signs into Blue as a Blue administrator,
and lands on **Join peer invitation** with the hand-off fields prefilled.
Blue verifies its own local readiness.
Its administrator gate is the Blue Forge admin page from which Tina performs this action.
It shows the same purpose, scope, and proposed end instant
and asks Tina to choose **Nominate this Blue site**.

On confirmation, Blue creates only a local pending record
and sends a protected `site-relationship.nominate` request to Green's bootstrap route.
The request identifies Blue's locally observed site/installation/environment identity
and includes Blue's proposed operational receiver endpoint.
Green verifies the HMAC signature before parsing the request.
It then validates the invitation state
and stores the nomination as _awaiting Toby approval_.
No operational endpoint is returned or activated at this stage.

Blue shows **Waiting for Green approval**.
It may use bounded protected polling of Green's bootstrap route;
no browser session or long-running request remains open while waiting.

### 4. Toby reviews the exact nomination on Green

Green notifies no one automatically in this POC.
Toby returns to Green's relationship administration screen
and sees **Blue nominated — review needed**.
He sees the locally stored Blue site/installation/environment identity,
the same immutable terms, expiry, and safe endpoint status
(configured/not configured, not the endpoint URL).

Toby can choose:

- **Approve Blue and activate**:
  asserts that the named Blue installation
  and exact terms are the intended counterpart;
- **Reject invitation**:
  records a safe reason and invalidates the attempt; or
- **Leave pending**:
  no authority is granted and the fixed expiry remains.

The Green Forge admin page is the administrator gate for approval or rejection.
Changes to the nominated identity, scope, endpoint, or terms version
invalidate the pending decision and require a new invitation.

### 5. Bilateral confirmation and activation

After Toby approves,
Green returns an authenticated activation proposal only
to Blue's protected poll/confirmation request.
Blue verifies that the returned relationship ID, counterpart identity, terms version,
and expiry exactly match its pending record.
Blue then records its local acceptance
and sends `site-relationship.confirm` with a fresh signed request ID and timestamp.

Green activates its local Site relationship only after this confirmation;
Blue activates only after the authenticated success response.
Each local record contains the same correlation ID and immutable relationship terms,
but each site keeps its own audit evidence and endpoint configuration.

Only after both local records are active may
either administrator create or activate a Pairing.
Each Pairing binds exactly one Source Epic and one Paired Epic
and has its own route-operation allowlist.
It cannot inherit access merely because the Site relationship is active.

### 6. Operate, inspect, revoke

The administration screen lists
relationship status,
counterpart identity,
agreed scope,
agreement end instant,
Pairing count,
and non-content audit outcomes.
It never renders a secret, HMAC signature, raw endpoint URL, or payload.

Either local administrator may choose **Revoke locally**.
Revocation immediately blocks
that tenant's send and receive authorization
for every Pairing under the relationship.
A best-effort authenticated remote notification is desirable
but is not a promise of simultaneous remote revocation during a partition.

## State model

| State                        | Meaning                                                                   | Business exchange                                                   |
| ---------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `draft`                      | Form has not created an invitation.                                       | Denied                                                              |
| `invited`                    | Green invitation exists, is recipient-bound, and is unexpired.            | Denied                                                              |
| `blue-nominated`             | Blue recorded local consent and Green has the authenticated nomination.   | Denied                                                              |
| `awaiting-green-approval`    | Same as `blue-nominated`, awaiting Toby's decision.                       | Denied                                                              |
| `awaiting-blue-confirmation` | Toby approved the exact nomination; Blue must confirm it.                 | Denied                                                              |
| `active`                     | Both sites recorded the matching confirmation within the lease.           | Allowed only if the exact Pairing and operation are also authorized |
| `rejected`                   | Toby rejected the attempt.                                                | Denied                                                              |
| `expired`                    | Seven-day setup deadline or agreement end instant passed.                 | Denied                                                              |
| `revoked`                    | A local administrator stopped participation.                              | Denied locally                                                      |
| `blocked`                    | Required secret, identity, durable state, or verification is unavailable. | Denied                                                              |

All state changes are idempotent
with a correlation ID
and transition-specific idempotency key.
A refresh, duplicate request, or lost response
may return the already-recorded safe outcome;
it must not create a second relationship or activate a new endpoint.

## RFC-141-compatible HMAC profile

This POC implements application-layer authentication using the wire shape in
[RFC-141: HMAC Authenticated Web Triggers](rfc-141-hmac-webtriggers.md).
RFC-141's planned `hmacSharedSecret` feature is deliberately not a dependency:
until it is available, the receiving app verifies the signature in its handler.
When the platform feature becomes available, the app can move verification to
Forge without changing the secret encoding, signature header, or request body.

The sending app computes HMAC-SHA256 with the base64-decoded
`SHARED_SECRET` and sends:

```text
x-webtrigger-signature: sha256=<hex HMAC>
```

The receiving handler requires that header, verifies the `sha256=` prefix and
HMAC against the exact HTTP body, and rejects invalid or missing signatures
before parsing the request body or performing any side effect.
For every POC request, the sender also supplies an RFC-3339
`x-webtrigger-timestamp`; it signs `<timestamp>.<body>`.
The receiver verifies that same input and rejects timestamps older than five
minutes or more than 30 seconds in the future.
Requests without a body sign the empty string; this POC uses timestamped POST
requests for all peer operations.

The HMAC check authenticates key possession and body integrity, but its
timestamp window does not prevent a captured valid request from being replayed
within that window. The signed body is therefore a strict,
versioned envelope that includes at least:

- sender and intended receiver site/installation/environment identities;
- Site relationship ID and immutable terms version;
- Pairing ID when the operation is Pairing-scoped;
- operation name and permitted direction;
- a created-at time and an unpredictable one-time request ID; and
- a business-operation idempotency key where the request has a side effect.

The function compares all peer-supplied identity and scope fields with its
receiver-owned authorization state. It atomically consumes the request ID in
receiver/relationship scope before any business side effect and retains replay
evidence for the entire possible timestamp-acceptance interval. It applies the
stricter five-minute POC age limit and rejects timestamps more than 30 seconds
in the future. Business idempotency is separate: a retry uses a new signed
request ID and timestamp but retains the same business-operation idempotency key.

All routes use HTTPS, bounded request bodies, strict Zod schemas, generic safe
errors, and authorization checks before side effects or endpoint disclosure.
HMAC makes the signed body authentic and tamper-evident; it does not make it
confidential. The body and headers contain no secret, Jira content, or endpoint URL.

## Required audit evidence

Each tenant records non-content, non-secret events for invitation creation and
viewing, recipient mismatch, Blue nomination, Toby approval/rejection, both
confirmations, activation, expiry, revocation, HMAC-verification failure
category, and replay rejection. Each event includes the correlation ID, actor
where locally known, timestamp, outcome, and safe reason code.

## Acceptance checks

1. Toby can invite Tina without manually entering Blue's URL or installation ID;
   the controlled POC may use deployment-approved Blue-site configuration to
   render Tina's **Continue on Blue** link.
2. A forwarded invitation cannot be used by a different Green user to nominate
   a site or change invitation state.
3. Tina can nominate Blue as a Blue administrator but cannot activate the
   relationship without Toby's later Green approval.
4. Toby's approval binds exactly the nominated site/installation/environment,
   endpoint status, terms version, scope, and expiry.
5. A request from an installation that has the development-environment secret
   but no matching active local relationship is denied.
6. An active relationship does not authorize a new Pairing, a different Epic,
   or an operation absent from that Pairing's allowlist.
7. Modified body, method, path, issuer, audience, direction, expiry, or scope;
   a reused nonce; missing durable replay state; or invalid local state prevents
   all side effects.
8. Expiry, rejection, revocation, missing secret, missing local identity, and
   partial confirmation fail closed and reveal no protected endpoint or Jira
   content.
9. The two-site POC proves successful controlled setup and one authorized
   delivery, while logs, UI, URLs, ordinary KVS data, and graph objects contain
   no secret or HMAC signature.

## Exit criteria and next step

This POC is successful when a controlled Green/Blue demonstration shows the UX
above, records the expected local audit trail, and proves the authorization
checks independently of possession of the shared secret.

Before using this outside the controlled development POC, replace the shared
Forge-environment secret with the already selected OPAQUE-based bootstrap (or
another separately approved, authenticated key-establishment design). Re-run
all authorization and replay tests because changing the trust root is a security
boundary, not a configuration change.

## Open decisions

1. Validate the app's RFC-141-compatible HMAC implementation against known-good
   signature vectors before integration. Later, separately validate the Forge
   `hmacSharedSecret` feature before migrating verification to the platform.
2. Decide the authoritative Forge mechanism for durable, atomic signed-request-ID
   consumption and test it across concurrent invocations.
3. Confirm how the app obtains and persists trustworthy local
   site/installation/environment identity for comparison on both sites.
4. Validate the exact Blue global-page route and external-navigation behavior
   for the deployed development app; keep manual copy/paste as the fallback if
   the route cannot be made stable enough for the POC.
5. Define the first minimal Pairing operation allowlist and whether the
   existing starter delivery is its only enabled operation.
6. Decide the precise agreement-end calendar semantics before implementation.
