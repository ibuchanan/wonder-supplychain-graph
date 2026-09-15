import { describe, expect, it } from "vitest";

import { parseNominationRequest } from "../../src/pairing/parse-nomination-request";

const validRequest = {
  correlationId: "correlation-001",
  createdAt: "2026-09-14T18:00:00.000Z",
  direction: "blue-to-green",
  idempotencyKey: "nominate-001",
  intendedReceiverSiteAri: "ari:cloud:jira::site/green-site",
  invitationReference: "reference-001",
  nominatedIdentity: {
    environmentAri: "ari:cloud:ecosystem::environment/blue-development",
    installationAri: "ari:cloud:ecosystem::installation/blue-installation",
    siteAri: "ari:cloud:jira::site/blue-site",
  },
  operation: "site-relationship.nominate",
  protocolVersion: "v1",
  receiverEndpointStatus: "configured",
  relationshipId: "relationship-001",
  requestId: "request-001",
  terms: {
    allowedOperations: ["starter.delivery"],
    expiresAt: "2026-09-21T12:00:00.000Z",
    termsVersion: "v1",
  },
} as const;

describe("parseNominationRequest", () => {
  it("accepts only the versioned nomination envelope", () => {
    expect(parseNominationRequest(JSON.stringify(validRequest))).toEqual(
      validRequest,
    );
  });

  it.each([
    ["not json", "the body is not JSON"],
    ["[]", "the body is not an object"],
    [
      JSON.stringify({ ...validRequest, operation: "starter.delivery" }),
      "the operation is not eligible for the bootstrap route",
    ],
    [
      JSON.stringify({ ...validRequest, protocolVersion: "v2" }),
      "the protocol version is unsupported",
    ],
    [
      JSON.stringify({ ...validRequest, requestId: "" }),
      "the one-time request ID is empty",
    ],
    [
      JSON.stringify({ ...validRequest, relationshipId: undefined }),
      "the proposed relationship ID is missing",
    ],
    [
      JSON.stringify({ ...validRequest, idempotencyKey: undefined }),
      "the business idempotency key is missing",
    ],
    [
      JSON.stringify({ ...validRequest, intendedReceiverSiteAri: undefined }),
      "the intended receiver is unnamed",
    ],
    [
      JSON.stringify({ ...validRequest, createdAt: "14/09/2026" }),
      "the created-at instant is not an ISO instant",
    ],
    [
      JSON.stringify({
        ...validRequest,
        nominatedIdentity: { siteAri: "ari:cloud:jira::site/blue-site" },
      }),
      "the nominated identity is incomplete",
    ],
    [
      JSON.stringify({
        ...validRequest,
        terms: { ...validRequest.terms, allowedOperations: [] },
      }),
      "the proposed scope is empty",
    ],
    [
      JSON.stringify({
        ...validRequest,
        terms: { ...validRequest.terms, allowedOperations: ["site.admin"] },
      }),
      "the proposed scope names an unknown operation",
    ],
    [
      JSON.stringify({
        ...validRequest,
        terms: { ...validRequest.terms, termsVersion: "" },
      }),
      "the immutable terms version is empty",
    ],
    [
      JSON.stringify({ ...validRequest, receiverEndpointStatus: "pending" }),
      "the endpoint status is not a safe status value",
    ],
    [
      JSON.stringify({ ...validRequest, direction: undefined }),
      "the permitted direction is missing",
    ],
    [
      JSON.stringify({ ...validRequest, direction: "green-to-blue" }),
      "the direction reverses the one this operation permits",
    ],
    [
      JSON.stringify({
        ...validRequest,
        receiverEndpointStatus: "https://blue.webtrigger.atlassian.app/receive",
      }),
      "the endpoint status carries an endpoint URL",
    ],
  ])("rejects a nomination request when %s", (body) => {
    expect(parseNominationRequest(body)).toBeUndefined();
  });
});
