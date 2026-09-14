[Skip to last reply](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029/15) [Skip to top](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029/1)

[Skip to main content](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029#main-container)

[![The Atlassian Developer Community](https://global.discourse-cdn.com/atlassiandeveloper/original/3X/8/a/8af5f0f17e19b3a83d19652a2939589f5abdfa08.png)](https://community.developer.atlassian.com/)

Log In

- ​

- ​


[Developer Community](http://community.developer.atlassian.com/) [Documentation](https://developer.atlassian.com/)

You’re all caught up on any announcements.

# [RFC-141: HMAC Authenticated Web Triggers](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029)

[General](https://community.developer.atlassian.com/c/everything-else/71) [Request for Comments (RFC)](https://community.developer.atlassian.com/c/everything-else/rfc/102)

- [forge](https://community.developer.atlassian.com/tag/forge/698),
- [authentication](https://community.developer.atlassian.com/tag/authentication/432),
- [forge-web-trigger](https://community.developer.atlassian.com/tag/forge-web-trigger/1061)

You have selected **0** posts.

[select all](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029)

[cancel selecting](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029)

487
views
33
likes
3
links
6
users


[![](https://avatars.discourse-cdn.com/v4/letter/m/9f8e36/48.png)7](https://community.developer.atlassian.com/u/MatthewFreeman "MatthewFreeman")

[![](https://sea1.discourse-cdn.com/atlassiandeveloper/user_avatar/community.developer.atlassian.com/markrekveld/48/36150_2.png)3](https://community.developer.atlassian.com/u/markrekveld "markrekveld")

[![](https://sea1.discourse-cdn.com/atlassiandeveloper/user_avatar/community.developer.atlassian.com/remie/48/34985_2.png)](https://community.developer.atlassian.com/u/remie "remie")

[![](https://sea1.discourse-cdn.com/atlassiandeveloper/user_avatar/community.developer.atlassian.com/ppasler/48/49174_2.png)](https://community.developer.atlassian.com/u/ppasler "ppasler")

[![](https://sea1.discourse-cdn.com/atlassiandeveloper/user_avatar/community.developer.atlassian.com/aaronmorris1/48/46830_2.png)](https://community.developer.atlassian.com/u/AaronMorris1 "AaronMorris1")

read
9
min


[Aug 5](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029/1 "Jump to the first post")

1 / 15


Aug 5


[21d ago](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029/15)

## post by MatthewFreeman on Aug 5

[![](https://avatars.discourse-cdn.com/v4/letter/m/9f8e36/48.png)](https://community.developer.atlassian.com/u/matthewfreeman)

[MatthewFreeman](https://community.developer.atlassian.com/u/matthewfreeman)[Atlassian Staff](https://community.developer.atlassian.com/g/Atlassian-Staff)

3

[Aug 5](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029 "Post date")

# [Heading link](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029\#p-226936-project-summary-1) Project Summary

The RFC proposes a lightweight, industry-standard authentication layer for Forge app developers using Web Triggers. This ensures that functions invoked by publicly accessible Web Trigger URLs are only called by trusted parties.

- **Publish**: 6 Aug 2026

- **Discuss**: 7 Aug 2026 - 21 Aug 2026

- **Resolved**: 25 Aug 2026


# [Heading link](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029\#p-226936-problem-2)**Problem**

The Forge Web Trigger capability lets developers create a public URL. When called via HTTP, that URL invokes a backend function in their Forge app. Developers can create these URLs explicitly via the CLI, or programmatically at runtime using the `webTrigger` module from `@forge/api`.

Currently, Forge Web Triggers lack native authentication or authorization. Developers must build their own solutions at the _application layer_, which is error-prone and a common source of security vulnerabilities.

In addition to solving the specific problem of simple, shared-secret authentication, this feature also lays the groundwork to provide a wider variety of more complex built-in authentication mechanisms in the future for developers and admins.

# [Heading link](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029\#p-226936-proposal-3) Proposal

We are proposing to support [HMAC Authentication](https://www.okta.com/en-au/identity-101/hmac/ "https://www.okta.com/en-au/identity-101/hmac/") for Forge Webtriggers.

This proposal closes **3 key security gaps** in the default Web Trigger capability:

1. **Authentication:** Only clients with a pre-shared secret key can call the URL.

2. **Body Tampering:** Signatures are computed at the client and re-computed at the server to ensure data integrity.

3. **Replay Attacks:** Shared secret keys expire and can be rotated. A leaked URL cannot be called indefinitely.


This will be an optional authentication solution, implemented at the platform layer and enabled via `modules.webtrigger.request.authentication` in your app’s `manifest.yml`:

```yaml

# Example manifest.yml

modules:
  webtrigger:
    - key: hmac-auth-webtrigger
      function: auth-webtrigger-fn
      urlFormat: v2 # required for this feature
      request:
        authentication: hmacSharedSecret # valid values include: hmacSharedSecret | none`*
```

For backwards compatibility, the `request` field will be optional. Webtriggers that do not have this field defined will continue to work.

| Feature | Details |
| --- | --- |
| **URL format** | Authenticated URLs will use a new `v2` format with an `/auth/` path. |
| **Key generation** | Secret keys (base64 encoded) are provided via the Forge CLI (piped or interactive) or programmatically via the `@forge/api` runtime. |
| **Authentication header** | Requests must include the `x-hub-signature` header containing an HMAC SHA256 signature of the body, signed with a base64 decoded secret key. |
| **Key management** | Supports up to 2 keys per installation for rotation. Keys with an expiry, do so after 12 months. Decoded keys must be between 32 and 256 bits. |

```sh

# Example Authenticated URL

https://15314aab-9e4a-482e-9db5-fac2eaa17e60.webtrigger.atlassian.app/auth/dUye775SIX5AnlZPckfl2PF5cRs
```

**Note:**`userPath` segments are still supported for authenticated URLs.

## [Heading link](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029\#p-226936-url-generation-via-cli-4) URL Generation via CLI

Developers can supply the `base64`-encoded secret key via an interactive prompt or by piping it to the `forge webtrigger create` command.

```sh

# URL creation via piped input
echo -n "<encoded-shared-secret-key>" | forge webtrigger create --readSecretKey --noKeyExpiry

## OR

# Url creation via interactive input
forge webtrigger create
? Select an installation: my-site.atlassian.net
? Select a web trigger: hmac-auth-webtrigger
? Enter the secret key for this HMAC web trigger: [input is hidden]
<developer types or pastes encoded secret key>
```

## [Heading link](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029\#p-226936-url-generation-via-runtime-5) URL Generation via Runtime

The `webTrigger` module in `@forge/api` will be updated to accept the encoded shared secret key.

```javascript

import { webTrigger } from "@forge/api"

async function createHmacAuthWebTrigger() {
    const forceCreate = true;

    // You can still force create urls with the existing API
    // const url = await webTrigger.getUrl('simple-webtrigger', forceCreate);

    const url = await webTrigger.getUrl('hmac-auth-webtrigger', {
        forceCreate,
        secretKey: '<encoded-shared-secret-key>',
        noKeyExpiry: true // optional - default false - valid values are true | false
    });

    return url;
}
```

# [Heading link](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029\#p-226936-url-http-authentication-6) URL HTTP Authentication

The `x-webtrigger-signature` will be required for requests to webtriggers that use `authentication: hmacSharedSecret`.

We chose `x-webtrigger-signature` because:

- Using the `Authorization`[header](https://repl.ca/what-is-x-hub-signature/ "https://repl.ca/what-is-x-hub-signature/") could conflict with existing Web Triggers.

- It conforms to the `x-hub-signature` header shape used by contemporary industry solutions, but clearly linking the header to the Forge Web Trigger capability.

- Atlassian already uses this approach in product webhooks such as [Jira](https://developer.atlassian.com/cloud/jira/platform/webhooks/#secure-admin-webhooks "https://developer.atlassian.com/cloud/jira/platform/webhooks/#secure-admin-webhooks").


Clients compute a HMAC SHA256 signature of the HTTP body, using their decoded secret key. This signature is sent in the `x-webtrigger-signature` header. The server recomputes the signature and compares it to the header value. Requests only succeed when the signatures match.

```sh

# Example curl request

signature=$(echo -n <request-body> | openssl dgst -sha256 -hmac <your-decoded-secret-key> | sed -E 's/^.*= /sha256=/')
# The above 'openssl dgst -sha256 -hmac' command produces a signature of the shape: SHA2-256(stdin)= 8adf40a8b889640b2235c626e988ad3c2c328bd4e6a02860a7418f162e300c92
# The header value provided with the request should replace the prefix 'SHA2-256(stdin)= ' with the standard prefix 'sha256='.
# So, the value provided is 'sha256=8adf40a8b889640b2235c626e988ad3c2c328bd4e6a02860a7418f162e300c92'

curl -X POST \
https://15314aab-9e4a-482e-9db5-fac2eaa17e60.webtrigger.atlassian.app/auth/dUye775SIX5AnlZPckfl2PF5cRs \
-H "x-webtrigger-signature: $signature" \
-d <request-body>
```

## [Heading link](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029\#p-226936-replay-prevention-7) Replay Prevention

Keys can be created with an expiry, do so after 12 months once registered. During this period, if an attack can get ahold of an inflight request body and signature header, they can repeat this request until the key used to compute the signature expires.

Keys created without an expiry are more susceptible to this issue for obvious reasons.

### [Heading link](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029\#p-226936-timestamps-8) Timestamps

Optionally, HTTP invocations can provide an additional header `x-webtrigger-timestamp`, with the [RFC 3339](https://datatracker.ietf.org/doc/html/rfc3339) formatted timestamp of when the request was performed. If the request contains this header, the signature should be computed with the timestamp and body of the request, formatted as `<timestamp>.<body>`,

At the server, for requests that provide the `x-webtrigger-timestamp` header, the server will recompute the signature using the same format. It will also ensure that the timestamp provided is within 10 minutes, either side. This ensures that leaked requests are only valid for 10 minutes once made.

### [Heading link](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029\#p-226936-requests-without-data-9) Requests without Data

`GET` requests, or any request with no `body`, should compute the digest using an empty string. The server uses the same approach when authenticating these requests. It is recommended that these requests, if possible, use the **Timestamps** feature to prevent indefinite replay attacks of their request (until key expiry).

# [Heading link](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029\#p-226936-secret-keys-10) Secret Keys

A `webtrigger` module can have at most **2 secret keys** registered per product installation. This supports key rotation.

Creating a new URL with the same context (module, installation, app, and environment) and a new secret key will replace the **oldest stored key**. Both registered keys are tried at invocation time when comparing signatures.

## [Heading link](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029\#p-226936-security-11) Security

Decoded secret keys must be between 32 and 64 bytes long. This range ensures secure signature generation. Key length has no effect on signature generation time, at either the client or server, however providing keys longer than 64 bytes is useless as they will be truncated to 64 bytes during computation.

## [Heading link](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029\#p-226936-expiry-12) Expiry

Keys by default expire 12 months after registration. Once a key is within 30 days of expiry and is used to compute a signature for an authenticated request, the response of that HTTP request will contain a header `x-webtrigger-key-expires` with [RFC 3339](https://datatracker.ietf.org/doc/html/rfc3339) standard date of the key expiry as the value.

```bash

# Example
x-webtrigger-key-expires: 2026-08-13T16:40:05Z #format: YYYY-MM-DDTHH:MM:SSZ
```

Keys created without this expiry, are treated as eternally valid until rotated out explicitly, and so webtrigger modules created with these eternal keys will never receive this header.

There is no minimum key usage duration, so webtrigger modules are able to rotate these keys as often as the web trigger URL creation limits allow.

## [Heading link](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029\#p-226936-hash-function-enforcement-13) Hash Function Enforcement

`x-webtrigger-signature` header value **must** be prefixed with `sha256=`. The server will use this to determine the cryptographic hash function to perform the signature generation with. As part of this proposal, only `sha256` is supported.

# [Heading link](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029\#p-226936-asks-14) Asks

- Like or comment on this RFC if this feature would benefit you or your apps.
- Do you have feedback on the design or the proposed APIs?
- Is there anything we are missing that we could reasonably include?
- Does anyone require a method to determine the age of their registered keys?

# [Heading link](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029\#p-226936-rfc-update-log-15) RFC Update Log

**13 Aug 2026**

- Updated minimum bit length of decoded secret keys; 32 bits → 32 bytes.
- Updated maximum bit length of decoded secret keys; 256 bits → 64 bytes.
- Added optional `timestamp` feature, to strengthen replay attack prevention.
- Added expiry header in HTTP response, to indicate a key is close to expiry.
- Added `sha256=` prefix to signature header value.
- Consolidated all `header` values with prefix `x-webtrigger-*`.

**20 Aug 2026**

- Updated default key expiry: 6 months → 12 months.
- Added opt-out for key expiry at time of creation.

### Solved

[![](https://avatars.discourse-cdn.com/v4/letter/m/9f8e36/24.png)MatthewFreeman](https://community.developer.atlassian.com/u/matthewfreeman) [21d](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029/14 "Post date")

​


> Hi everyone,
>
> Thank you all for your engagement and feedback with this feature proposal, your comments and requirements were central to fleshing out this feature to meet developer needs.
>
> I’ll mark this RFC as resolved and will ideally have this feature ready for use in the near future.
>
> Thanks, Matthew.

[read more](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029/14)

![heart](https://emoji.discourse-cdn.com/twitter/heart.png?v=15)
7


1 Reply

​


​


- [Cross Posting RFC-141: HMAC Authenticated Web Triggers](https://community.developer.atlassian.com/t/cross-posting-rfc-141-hmac-authenticated-web-triggers/102110)

487
views
33
likes
3
links
6
users


[![](https://avatars.discourse-cdn.com/v4/letter/m/9f8e36/48.png)7](https://community.developer.atlassian.com/u/MatthewFreeman "MatthewFreeman")

[![](https://sea1.discourse-cdn.com/atlassiandeveloper/user_avatar/community.developer.atlassian.com/markrekveld/48/36150_2.png)3](https://community.developer.atlassian.com/u/markrekveld "markrekveld")

[![](https://sea1.discourse-cdn.com/atlassiandeveloper/user_avatar/community.developer.atlassian.com/remie/48/34985_2.png)](https://community.developer.atlassian.com/u/remie "remie")

[![](https://sea1.discourse-cdn.com/atlassiandeveloper/user_avatar/community.developer.atlassian.com/ppasler/48/49174_2.png)](https://community.developer.atlassian.com/u/ppasler "ppasler")

[![](https://sea1.discourse-cdn.com/atlassiandeveloper/user_avatar/community.developer.atlassian.com/aaronmorris1/48/46830_2.png)](https://community.developer.atlassian.com/u/AaronMorris1 "AaronMorris1")

read
9
min


## post by markrekveld on Aug 11

## post by remie on Aug 11

## post by markrekveld on Aug 11

## post by ppasler on Aug 11

## post by MatthewFreeman on Aug 12

## post by MatthewFreeman on Aug 12

## post by markrekveld on Aug 12

## post by MatthewFreeman on Aug 13

## post by PrinceNyeche on Aug 14

## post by AaronMorris1 on Aug 17

## post by MatthewFreeman on Aug 19

## post by MatthewFreeman on Aug 20

## post by MatthewFreeman on Aug 24

## Closed on Aug 25

Reply

### New & Unread Topics

| Topic | Replies | Views | Activity |
| --- | --- | --- | --- |
| [RFC-131: Forge Release Tracks](https://community.developer.atlassian.com/t/rfc-131-forge-release-tracks/100290)<br>[Request for Comments (RFC)](https://community.developer.atlassian.com/c/everything-else/rfc/102) <br>- [forge](https://community.developer.atlassian.com/tag/forge/698) | [15](https://community.developer.atlassian.com/t/rfc-131-forge-release-tracks/100290/1) | 895 | [May 22](https://community.developer.atlassian.com/t/rfc-131-forge-release-tracks/100290/16) |
| [RFC-132: Removal of Third-Party Libraries from Data Center Public API](https://community.developer.atlassian.com/t/rfc-132-removal-of-third-party-libraries-from-data-center-public-api/100371)<br>[Request for Comments (RFC)](https://community.developer.atlassian.com/c/everything-else/rfc/102) <br>- [jira-data-center](https://community.developer.atlassian.com/tag/jira-data-center/689),<br>- [confluence-data-center](https://community.developer.atlassian.com/tag/confluence-data-center/664),<br>- [data-center](https://community.developer.atlassian.com/tag/data-center/950),<br>- [crowd](https://community.developer.atlassian.com/tag/crowd/28),<br>- [bitbucket-data-center](https://community.developer.atlassian.com/tag/bitbucket-data-center/822),<br>- [dependencies](https://community.developer.atlassian.com/tag/dependencies/445),<br>- [bamboo-data-center](https://community.developer.atlassian.com/tag/bamboo-data-center/1013),<br>- [public-api](https://community.developer.atlassian.com/tag/public-api/1662) | [13](https://community.developer.atlassian.com/t/rfc-132-removal-of-third-party-libraries-from-data-center-public-api/100371/1) | 998 | [May 12](https://community.developer.atlassian.com/t/rfc-132-removal-of-third-party-libraries-from-data-center-public-api/100371/14) |
| [RFC 115: Redesign of Developer Space for Forge Billing – Roles, Permissions, and Design Flows](https://community.developer.atlassian.com/t/rfc-115-redesign-of-developer-space-for-forge-billing-roles-permissions-and-design-flows/96104)<br>[Request for Comments (RFC)](https://community.developer.atlassian.com/c/everything-else/rfc/102) <br>- [forge-pricing](https://community.developer.atlassian.com/tag/forge-pricing/1537),<br>- [developer-space](https://community.developer.atlassian.com/tag/developer-space/1626) | [13](https://community.developer.atlassian.com/t/rfc-115-redesign-of-developer-space-for-forge-billing-roles-permissions-and-design-flows/96104/1) | 919 | [Nov 2025](https://community.developer.atlassian.com/t/rfc-115-redesign-of-developer-space-for-forge-billing-roles-permissions-and-design-flows/96104/14) |
| [RFC-128: Local development mocks for Forge Storage](https://community.developer.atlassian.com/t/rfc-128-local-development-mocks-for-forge-storage/99256)<br>[Request for Comments (RFC)](https://community.developer.atlassian.com/c/everything-else/rfc/102) <br>- [forge](https://community.developer.atlassian.com/tag/forge/698),<br>- [forge-storage](https://community.developer.atlassian.com/tag/forge-storage/900) | [30](https://community.developer.atlassian.com/t/rfc-128-local-development-mocks-for-forge-storage/99256/1) | 1.0k | [Mar 11](https://community.developer.atlassian.com/t/rfc-128-local-development-mocks-for-forge-storage/99256/31) |
| [RFC-135: Setting default values for issue types on context](https://community.developer.atlassian.com/t/rfc-135-setting-default-values-for-issue-types-on-context/100893)<br>[Request for Comments (RFC)](https://community.developer.atlassian.com/c/everything-else/rfc/102) <br>- [rest-api](https://community.developer.atlassian.com/tag/rest-api/34),<br>- [jira-cloud](https://community.developer.atlassian.com/tag/jira-cloud/7),<br>- [jira-cloud-rest-api](https://community.developer.atlassian.com/tag/jira-cloud-rest-api/682),<br>- [jira-admin](https://community.developer.atlassian.com/tag/jira-admin/208) | [4](https://community.developer.atlassian.com/t/rfc-135-setting-default-values-for-issue-types-on-context/100893/1) | 215 | [Jun 4](https://community.developer.atlassian.com/t/rfc-135-setting-default-values-for-issue-types-on-context/100893/5) |

Topic list, column headers with buttons are sortable.

### Want to read more? Browse other topics in [Request for Comments (RFC)](https://community.developer.atlassian.com/c/everything-else/rfc/102) or [view latest topics](https://community.developer.atlassian.com/latest).

[System status](https://status.developer.atlassian.com/) [Privacy](https://www.atlassian.com/legal/privacy-policy) [Your California Privacy Choices](https://www.atlassian.com/legal/privacy-policy#additional-disclosures-for-ca-residents) [Developer Terms](https://developer.atlassian.com/market/atlassian-developer-terms) [Trademark](https://www.atlassian.com/legal/trademark)Cookie preferences© 2025 Atlassian