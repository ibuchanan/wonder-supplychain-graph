import { describe, expect, it } from "vitest";

import {
  signPeerRequest,
  verifyPeerRequest,
} from "../../src/collaboration/peer-hmac-auth";

const secret = Buffer.from("0123456789abcdef0123456789abcdef").toString(
  "base64",
);
const body = '{"type":"scg:work-package:queued"}';
const timestamp = "2026-09-14T16:00:00.000Z";

describe("peer HMAC authentication", () => {
  it("creates and verifies an RFC-141-compatible timestamped signature", () => {
    const headers = signPeerRequest(secret, body, timestamp);

    expect(headers).toEqual({
      "x-webtrigger-signature": expect.stringMatching(/^sha256=[a-f0-9]{64}$/),
      "x-webtrigger-timestamp": timestamp,
    });
    expect(
      verifyPeerRequest(
        {
          body,
          headers: Object.fromEntries(
            Object.entries(headers ?? {}).map(([key, value]) => [key, [value]]),
          ),
        },
        secret,
        Date.parse(timestamp),
      ),
    ).toBeUndefined();
  });

  it("rejects a non-canonical base64 secret", () => {
    expect(
      signPeerRequest(`${Buffer.alloc(33).toString("base64")}A`, body),
    ).toBeUndefined();
  });

  it("rejects missing, modified, duplicate, stale, future, and invalid-secret requests", () => {
    const headers = signPeerRequest(secret, body, timestamp);
    const request = {
      body,
      headers: Object.fromEntries(
        Object.entries(headers ?? {}).map(([key, value]) => [key, [value]]),
      ),
    };

    expect(verifyPeerRequest({ body }, secret, Date.parse(timestamp))).toBe(
      "invalid-hmac-timestamp",
    );
    expect(
      verifyPeerRequest(
        { ...request, body: `${body}!` },
        secret,
        Date.parse(timestamp),
      ),
    ).toBe("invalid-hmac-signature");
    expect(
      verifyPeerRequest(
        {
          body,
          headers: {
            ...request.headers,
            "x-webtrigger-signature": [
              headers?.["x-webtrigger-signature"] ?? "",
              "extra",
            ],
          },
        },
        secret,
        Date.parse(timestamp),
      ),
    ).toBe("invalid-hmac-signature");
    expect(
      verifyPeerRequest(
        request,
        secret,
        Date.parse(timestamp) + 5 * 60 * 1000 + 1,
      ),
    ).toBe("invalid-hmac-timestamp");
    expect(
      verifyPeerRequest(request, secret, Date.parse(timestamp) - 30 * 1000 - 1),
    ).toBe("invalid-hmac-timestamp");
    expect(
      verifyPeerRequest(request, "not-base64", Date.parse(timestamp)),
    ).toBe("invalid-hmac-secret");
  });
});
