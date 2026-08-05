import api, { route } from "@forge/api";
import { err, ok } from "@forge-ahead/errors";

import { logger } from "../logging";
import { logRovoCommentResult } from "../observability/domain-events";

import {
  commentOnOriginatingEpic,
  type JiraCommentPort,
} from "./comment-on-originating-epic";
import { kvsPackageConnectionStore } from "../projection/kvs-connection-store";

export interface RovoCommentActionPayload {
  readonly commentText: string;
  readonly connectionId: string;
}

function toAtlassianDocument(body: string) {
  return {
    body: {
      content: [
        {
          content: [{ text: body, type: "text" }],
          type: "paragraph",
        },
      ],
      type: "doc",
      version: 1,
    },
  };
}

const jiraCommentPort: JiraCommentPort = {
  createComment: async ({ body, issueKey }) => {
    const response = await api
      .asUser()
      .requestJira(route`/rest/api/3/issue/${issueKey}/comment`, {
        body: JSON.stringify(toAtlassianDocument(body)),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

    if (!response.ok) {
      return err({
        code: "jira-comment-failed",
        detail: `Jira returned HTTP ${response.status}: ${await response.text()}`,
      });
    }

    const data = (await response.json()) as { id?: string };

    if (!data.id) {
      return err({
        code: "jira-comment-failed",
        detail: "Jira created no comment ID.",
      });
    }

    return ok({ commentId: data.id });
  },
};

/**
 * Rovo action entry point. The Jira comment is made as the initiating user;
 * the action accepts a connection reference rather than an issue key so the
 * destination always comes from trusted current-package provenance.
 */
export async function commentOnOriginatingEpicFromRovo(
  payload: RovoCommentActionPayload,
) {
  const outcome = await commentOnOriginatingEpic(
    { jira: jiraCommentPort, store: kvsPackageConnectionStore },
    payload,
  );

  if (outcome.isErr()) {
    logRovoCommentResult(logger, {
      connectionId: payload.connectionId,
      reason: outcome.error.code,
      status: "failed",
    });

    return { output: `Unable to add package comment: ${outcome.error.code}.` };
  }

  logRovoCommentResult(logger, {
    commentId: outcome.value.commentId,
    connectionId: payload.connectionId,
    sourceEpicId: outcome.value.sourceEpicId,
    status: "commented",
    version: outcome.value.version,
  });

  return {
    output: `Added Supplychain Graph package comment to ${outcome.value.sourceEpicId} (comment ${outcome.value.commentId}; package version ${outcome.value.version}).`,
  };
}
