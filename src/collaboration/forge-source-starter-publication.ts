import api, { fetch, route } from "@forge/api";

import { kvsDemoPairingStore } from "../pairing/kvs-demo-pairing-store";
import { prepareStarterPublication } from "./starter-peer-delivery-contract";

interface WebTriggerRequest {
  readonly body?: string;
}

interface WebTriggerResponse {
  readonly body: string;
  readonly headers: { readonly "Content-Type": string };
  readonly statusCode: number;
}

interface JiraIssueResponse {
  readonly fields?: {
    readonly created?: unknown;
    readonly summary?: unknown;
    readonly updated?: unknown;
  };
  readonly id?: unknown;
  readonly key?: unknown;
  readonly self?: unknown;
}

function response(
  statusCode: number,
  body: Record<string, string>,
): WebTriggerResponse {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    statusCode,
  };
}

function parsePublicationRequest(
  request: WebTriggerRequest,
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

function sourceEpicFromJira(issue: JiraIssueResponse):
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
    typeof fields.updated !== "string" ||
    typeof issue.self !== "string"
  ) {
    return undefined;
  }

  try {
    return {
      createdAt: fields.created,
      id: issue.id,
      key: issue.key,
      summary: fields.summary,
      updatedAt: fields.updated,
      url: `${new URL(issue.self).origin}/browse/${issue.key}`,
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
export async function publishStarterDelivery(
  request: WebTriggerRequest,
): Promise<WebTriggerResponse> {
  const publicationRequest = parsePublicationRequest(request);
  if (!publicationRequest) {
    return response(400, { error: "invalid-source-publication" });
  }

  const pairingState = await kvsDemoPairingStore.read();
  const publication = prepareStarterPublication(
    {
      pairings: pairingState.pairings
        .filter((pairing) => pairing.role === "source")
        .map((pairing) => ({
          pairingId: pairing.pairingId,
          peerDeliveryUrl: pairing.peerDeliveryUrl,
          sourceEpicId: pairing.sourceEpicId,
          status: pairing.status,
        })),
    },
    publicationRequest,
  );
  if (publication.isErr()) {
    return response(409, { error: publication.error.code });
  }

  const jiraResponse = await api
    .asApp()
    .requestJira(
      route`/rest/api/3/issue/${publication.value.sourceEpicId}?fields=id,key,summary,created,updated`,
    );
  if (!jiraResponse.ok) {
    return response(502, { error: "source-epic-read-failed" });
  }

  const sourceEpic = sourceEpicFromJira(
    (await jiraResponse.json()) as JiraIssueResponse,
  );
  if (!sourceEpic) {
    return response(502, { error: "source-epic-read-failed" });
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
    return response(502, { error: "peer-starter-delivery-failed" });
  }

  return response(200, {
    correlationId,
    outcome: "delivered",
    sourceEpicKey: sourceEpic.key,
  });
}
