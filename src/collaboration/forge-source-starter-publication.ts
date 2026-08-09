import api, { fetch, route } from "@forge/api";
import {
  buildSuccessResponse,
  defineWebTrigger,
  type WebTriggerEvent,
  type WebTriggerResponse,
} from "@forge-ahead/triggers/webtrigger";

import type { DemoSourcePairing } from "../pairing/apply-demo-pairing-seed";
import { kvsDemoPairingStore } from "../pairing/kvs-demo-pairing-store";
import { prepareStarterPublication } from "./starter-peer-delivery-contract";

interface JiraIssueResponse {
  readonly fields?: {
    readonly created?: unknown;
    readonly summary?: unknown;
    readonly updated?: unknown;
  };
  readonly id?: unknown;
  readonly key?: unknown;
}

function errorResponse(
  statusCode: number,
  body: Record<string, string | number>,
): WebTriggerResponse {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": ["application/json"] },
    statusCode,
  };
}

function parsePublicationRequest(
  request: WebTriggerEvent,
): { readonly pairingId: string } | undefined {
  if (!request.body) {
    return undefined;
  }

  try {
    const value: unknown = JSON.parse(request.body);
    if (
      typeof value !== "object" ||
      value === null ||
      Object.keys(value).length !== 1 ||
      typeof (value as { pairingId?: unknown }).pairingId !== "string"
    ) {
      return undefined;
    }

    return { pairingId: (value as { pairingId: string }).pairingId };
  } catch {
    return undefined;
  }
}

function peerFailureDetail(status: number, body: string): string {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed === "object" && parsed !== null) {
      const value = parsed as { error?: unknown; message?: unknown };
      const reason =
        typeof value.error === "string"
          ? value.error
          : typeof value.message === "string"
            ? value.message
            : undefined;
      if (reason) {
        return `destination returned HTTP ${status}: ${reason.slice(0, 500)}`;
      }
    }
  } catch {
    // The destination response was not JSON; retain only its status.
  }

  return `destination returned HTTP ${status}`;
}

function toRfc3339Timestamp(value: string): string {
  return new Date(value).toISOString();
}

function sourceEpicFromJira(
  issue: JiraIssueResponse,
  sourceSiteUrl: string,
):
  | {
      readonly createdAt: string;
      readonly id: string;
      readonly key: string;
      readonly summary: string;
      readonly updatedAt: string;
      readonly url: string;
    }
  | undefined {
  const { fields } = issue;
  if (
    typeof issue.id !== "string" ||
    typeof issue.key !== "string" ||
    typeof fields?.summary !== "string" ||
    typeof fields.created !== "string" ||
    typeof fields.updated !== "string"
  ) {
    return undefined;
  }

  try {
    return {
      createdAt: toRfc3339Timestamp(fields.created),
      id: issue.id,
      key: issue.key,
      summary: fields.summary,
      updatedAt: toRfc3339Timestamp(fields.updated),
      url: `${sourceSiteUrl}/browse/${issue.key}`,
    };
  } catch {
    return undefined;
  }
}

/**
 * Publishes one paired Source Epic directly to its destination Forge webtrigger.
 * The caller supplies only a Pairing identifier; all content and peer routing are
 * derived within the source tenant.
 */
export const publishStarterDelivery = defineWebTrigger(async (request) => {
  const publicationRequest = parsePublicationRequest(request);
  if (!publicationRequest) {
    return errorResponse(400, { error: "invalid-source-publication" });
  }

  const pairingState = await kvsDemoPairingStore.read();
  const publication = prepareStarterPublication(
    {
      pairings: pairingState.pairings
        .filter(
          (pairing): pairing is DemoSourcePairing =>
            pairing.role === "source" &&
            typeof pairing.sourceSiteUrl === "string",
        )
        .map((pairing) => ({
          pairingId: pairing.pairingId,
          peerDeliveryUrl: pairing.peerDeliveryUrl,
          sourceEpicKey: pairing.sourceEpicKey,
          sourceSiteUrl: pairing.sourceSiteUrl,
          status: pairing.status,
        })),
    },
    publicationRequest,
  );
  if (publication.isErr()) {
    return errorResponse(409, { error: publication.error.code });
  }

  const jiraResponse = await api
    .asApp()
    .requestJira(
      route`/rest/api/3/issue/${publication.value.sourceEpicKey}?fields=id,key,summary,created,updated`,
    );
  if (!jiraResponse.ok) {
    return errorResponse(502, { error: "source-epic-read-failed" });
  }

  const sourceEpic = sourceEpicFromJira(
    (await jiraResponse.json()) as JiraIssueResponse,
    publication.value.sourceSiteUrl,
  );
  if (!sourceEpic) {
    return errorResponse(502, { error: "source-epic-read-failed" });
  }

  const correlationId = crypto.randomUUID();
  const peerResponse = await fetch(publication.value.peerDeliveryUrl, {
    body: JSON.stringify({
      correlationId,
      pairingId: publication.value.pairingId,
      protocolVersion: "v1",
      sourceEpic,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!peerResponse.ok) {
    return errorResponse(502, {
      detail: peerFailureDetail(peerResponse.status, await peerResponse.text()),
      error: "peer-starter-delivery-failed",
    });
  }

  const deliveryResponse: unknown = await peerResponse.json();
  if (
    typeof deliveryResponse !== "object" ||
    deliveryResponse === null ||
    typeof (deliveryResponse as { documentId?: unknown }).documentId !==
      "string" ||
    typeof (deliveryResponse as { objectCount?: unknown }).objectCount !==
      "number" ||
    typeof (deliveryResponse as { updateSequence?: unknown }).updateSequence !==
      "number"
  ) {
    return errorResponse(502, {
      error: "invalid-peer-starter-delivery-response",
    });
  }

  const { documentId, objectCount, updateSequence } = deliveryResponse as {
    readonly documentId: string;
    readonly objectCount: number;
    readonly updateSequence: number;
  };

  return buildSuccessResponse({
    correlationId,
    documentId,
    objectCount,
    outcome: "delivered",
    sourceEpicKey: sourceEpic.key,
    sourceUrl: sourceEpic.url,
    updateSequence,
  });
});
