import { describe, expect, it } from "vitest";

import {
  parseActivationPollRequest,
  parseActivationPollResponse,
  parseActivationProposal,
  parseConfirmationRequest,
} from "../../src/pairing/parse-activation-envelopes";

const blueIdentity = {
  environmentAri: "ari:cloud:ecosystem::environment/blue-development",
  installationAri: "ari:cloud:ecosystem::installation/blue-installation",
  siteAri: "ari:cloud:jira::site/blue-site",
} as const;

const validPoll = {
  correlationId: "correlation-001",
  createdAt: "2026-09-14T19:05:00.000Z",
  direction: "blue-to-green",
  intendedReceiverSiteAri: "ari:cloud:jira::site/green-site",
  nominatedIdentity: blueIdentity,
  operation: "site-relationship.poll",
  protocolVersion: "v1",
  relationshipId: "relationship-001",
  requestId: "poll-request-001",
  termsVersion: "v1",
} as const;

describe("parseActivationPollRequest", () => {
  it("accepts only the versioned poll envelope", () => {
    expect(parseActivationPollRequest(JSON.stringify(validPoll))).toEqual(
      validPoll,
    );
  });

  it.each([
    ["not json", "the body is not JSON"],
    ["[]", "the body is not an object"],
    [
      JSON.stringify({ ...validPoll, operation: "site-relationship.confirm" }),
      "the operation is a different setup operation",
    ],
    [
      JSON.stringify({ ...validPoll, protocolVersion: "v2" }),
      "the protocol version is unsupported",
    ],
    [
      JSON.stringify({ ...validPoll, relationshipId: "" }),
      "the polled relationship ID is empty",
    ],
    [
      JSON.stringify({ ...validPoll, requestId: undefined }),
      "the one-time request ID is missing",
    ],
    [
      JSON.stringify({ ...validPoll, createdAt: "14/09/2026" }),
      "the created-at instant is not an ISO instant",
    ],
    [
      JSON.stringify({ ...validPoll, intendedReceiverSiteAri: undefined }),
      "the intended receiver is unnamed",
    ],
    [
      JSON.stringify({
        ...validPoll,
        nominatedIdentity: { siteAri: blueIdentity.siteAri },
      }),
      "the polling identity is incomplete",
    ],
    [
      JSON.stringify({ ...validPoll, direction: undefined }),
      "the permitted direction is missing",
    ],
    [
      JSON.stringify({ ...validPoll, direction: "green-to-blue" }),
      "the direction reverses the one this operation permits",
    ],
    [
      JSON.stringify({ ...validPoll, termsVersion: undefined }),
      "the immutable terms reference is missing",
    ],
  ])("rejects a poll request when %s", (body) => {
    expect(parseActivationPollRequest(body)).toBeUndefined();
  });
});

const validConfirmation = {
  confirmedIdentity: blueIdentity,
  correlationId: "correlation-001",
  createdAt: "2026-09-14T19:10:00.000Z",
  direction: "blue-to-green",
  idempotencyKey: "correlation-001:confirm",
  intendedReceiverSiteAri: "ari:cloud:jira::site/green-site",
  leaseEndsAt: "2026-09-21T12:00:00.000Z",
  operation: "site-relationship.confirm",
  protocolVersion: "v1",
  relationshipId: "relationship-001",
  requestId: "confirm-request-001",
  termsVersion: "v1",
} as const;

describe("parseConfirmationRequest", () => {
  it("accepts only the versioned confirmation envelope", () => {
    expect(parseConfirmationRequest(JSON.stringify(validConfirmation))).toEqual(
      validConfirmation,
    );
  });

  it.each([
    ["not json", "the body is not JSON"],
    ["[]", "the body is not an object"],
    [
      JSON.stringify({
        ...validConfirmation,
        operation: "site-relationship.poll",
      }),
      "the operation is a different setup operation",
    ],
    [
      JSON.stringify({ ...validConfirmation, protocolVersion: "v2" }),
      "the protocol version is unsupported",
    ],
    [
      JSON.stringify({ ...validConfirmation, idempotencyKey: undefined }),
      "the business idempotency key is missing",
    ],
    [
      JSON.stringify({ ...validConfirmation, requestId: "" }),
      "the one-time request ID is empty",
    ],
    [
      JSON.stringify({ ...validConfirmation, createdAt: "14/09/2026" }),
      "the created-at instant is not an ISO instant",
    ],
    [
      JSON.stringify({ ...validConfirmation, leaseEndsAt: "soon" }),
      "the agreed end instant is not an ISO instant",
    ],
    [
      JSON.stringify({ ...validConfirmation, termsVersion: "" }),
      "the immutable terms version is empty",
    ],
    [
      JSON.stringify({
        ...validConfirmation,
        confirmedIdentity: { siteAri: blueIdentity.siteAri },
      }),
      "the confirming identity is incomplete",
    ],
    [
      JSON.stringify({ ...validConfirmation, direction: undefined }),
      "the permitted direction is missing",
    ],
    [
      JSON.stringify({ ...validConfirmation, direction: "green-to-blue" }),
      "the direction reverses the one this operation permits",
    ],
  ])("rejects a confirmation request when %s", (body) => {
    expect(parseConfirmationRequest(body)).toBeUndefined();
  });
});

const validProposal = {
  approvedIdentity: blueIdentity,
  correlationId: "correlation-001",
  counterpartSiteAri: "ari:cloud:jira::site/green-site",
  direction: "green-to-blue",
  leaseEndsAt: "2026-09-21T12:00:00.000Z",
  operation: "site-relationship.activation-proposal",
  protocolVersion: "v1",
  relationshipId: "relationship-001",
  termsVersion: "v1",
} as const;

describe("parseActivationProposal", () => {
  it("accepts only the versioned activation proposal", () => {
    expect(parseActivationProposal(JSON.stringify(validProposal))).toEqual(
      validProposal,
    );
  });

  it("ignores any extra field Green returns alongside the proposal", () => {
    expect(
      parseActivationProposal(
        JSON.stringify({
          ...validProposal,
          receiverEndpointUrl: "https://green.webtrigger.atlassian.app/receive",
        }),
      ),
    ).toEqual(validProposal);
  });

  it.each([
    ["not json", "the body is not JSON"],
    ["[]", "the body is not an object"],
    [
      JSON.stringify({ ...validProposal, operation: "starter.delivery" }),
      "the operation is not an activation proposal",
    ],
    [
      JSON.stringify({ ...validProposal, protocolVersion: "v2" }),
      "the protocol version is unsupported",
    ],
    [
      JSON.stringify({ ...validProposal, relationshipId: undefined }),
      "the proposed relationship ID is missing",
    ],
    [
      JSON.stringify({ ...validProposal, counterpartSiteAri: "" }),
      "the counterpart site is unnamed",
    ],
    [
      JSON.stringify({ ...validProposal, leaseEndsAt: "soon" }),
      "the agreed end instant is not an ISO instant",
    ],
    [
      JSON.stringify({ ...validProposal, termsVersion: "" }),
      "the immutable terms version is empty",
    ],
    [
      JSON.stringify({
        ...validProposal,
        approvedIdentity: { siteAri: blueIdentity.siteAri },
      }),
      "the approved identity is incomplete",
    ],
    [
      JSON.stringify({ ...validProposal, direction: undefined }),
      "the permitted direction is missing",
    ],
    [
      JSON.stringify({ ...validProposal, direction: "blue-to-green" }),
      "the direction reverses the one this response permits",
    ],
  ])("rejects an activation proposal when %s", (body) => {
    expect(parseActivationProposal(body)).toBeUndefined();
  });
});

describe("parseActivationPollResponse", () => {
  it("reads a pending outcome that carries no proposal", () => {
    expect(
      parseActivationPollResponse(
        JSON.stringify({ outcome: "awaiting-green-approval" }),
      ),
    ).toEqual({ outcome: "awaiting-green-approval" });
  });

  it("reads an approved outcome together with its proposal", () => {
    expect(
      parseActivationPollResponse(
        JSON.stringify({
          ...validProposal,
          outcome: "awaiting-blue-confirmation",
        }),
      ),
    ).toEqual({
      outcome: "awaiting-blue-confirmation",
      proposal: validProposal,
    });
  });

  it.each([
    ["not json", "the body is not JSON"],
    [JSON.stringify({ outcome: "whatever" }), "the outcome is unknown"],
    [
      JSON.stringify({ outcome: "awaiting-blue-confirmation" }),
      "an approved outcome arrives without a proposal",
    ],
    [
      JSON.stringify({
        ...validProposal,
        outcome: "active",
        relationshipId: "",
      }),
      "the proposal beside an active outcome is malformed",
    ],
  ])("rejects a poll response when %s", (body) => {
    expect(parseActivationPollResponse(body)).toBeUndefined();
  });
});
