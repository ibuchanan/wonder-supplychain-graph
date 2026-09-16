import { err, ok, type Result } from "@forge-ahead/errors";

import type { SupplierReceiptState } from "../receipt/apply-command";

export interface CurrentPackageStore {
  readonly read: (graphCxId: string) => Promise<SupplierReceiptState>;
}

export interface OriginatingPackageProvenance {
  readonly correlationId: string;
  readonly pairingId: string;
  readonly publishedAt: string;
  readonly publisherId: string;
  readonly sourceEpicId: string;
  readonly version: string;
}

export interface NoCurrentPackageError {
  readonly code: "no-current-package";
  readonly graphCxId: string;
}

export interface PackageProvenanceUnavailableError {
  readonly code: "package-provenance-unavailable";
  readonly graphCxId: string;
}

export type OriginatingPackageError =
  | NoCurrentPackageError
  | PackageProvenanceUnavailableError;

export async function resolveOriginatingPackage(
  store: CurrentPackageStore,
  graphCxId: string,
): Promise<Result<OriginatingPackageProvenance, OriginatingPackageError>> {
  const state = await store.read(graphCxId);
  const currentPackage = state.currentPackage;

  if (!currentPackage) {
    return err({ code: "no-current-package", graphCxId });
  }

  const pairing = state.pairings.find(
    (candidate) =>
      candidate.pairingId === currentPackage.pairingId &&
      candidate.sourceEpicId === currentPackage.sourceEpicId &&
      candidate.pairedEpicId === currentPackage.pairedEpicId,
  );

  if (!pairing) {
    return err({ code: "package-provenance-unavailable", graphCxId });
  }

  return ok({
    correlationId: currentPackage.correlationId,
    pairingId: currentPackage.pairingId,
    publishedAt: currentPackage.publishedAt,
    publisherId: currentPackage.publisherId,
    sourceEpicId: currentPackage.sourceEpicId,
    version: currentPackage.version,
  });
}

export interface JiraCommentRequest {
  readonly body: string;
  readonly issueKey: string;
}

export interface JiraCommentCreated {
  readonly commentId: string;
}

export interface JiraCommentFailedError {
  readonly code: "jira-comment-failed";
  readonly detail: string;
}

export interface JiraCommentPort {
  readonly createComment: (
    request: JiraCommentRequest,
  ) => Promise<Result<JiraCommentCreated, JiraCommentFailedError>>;
}

export interface CommentOnOriginatingEpicDependencies {
  readonly jira: JiraCommentPort;
  readonly store: CurrentPackageStore;
}

export interface CommentOnOriginatingEpicRequest {
  readonly commentText: string;
  readonly graphCxId: string;
}

export interface CommentTextRequiredError {
  readonly code: "comment-text-required";
}

export type CommentOnOriginatingEpicError =
  | CommentTextRequiredError
  | JiraCommentFailedError
  | OriginatingPackageError;

export interface CommentOnOriginatingEpicResult {
  readonly commentId: string;
  readonly correlationId: string;
  readonly sourceEpicId: string;
  readonly version: string;
}

function commentBody(
  provenance: OriginatingPackageProvenance,
  commentText: string,
): string {
  return [
    "Supplychain Graph package comment",
    `Source package: ${provenance.sourceEpicId} · version ${provenance.version} · pairing ${provenance.pairingId}`,
    "Submitted through the Supplychain Graph Rovo action.",
    "",
    commentText,
  ].join("\n");
}

export async function commentOnOriginatingEpic(
  { jira, store }: CommentOnOriginatingEpicDependencies,
  { commentText, graphCxId }: CommentOnOriginatingEpicRequest,
): Promise<
  Result<CommentOnOriginatingEpicResult, CommentOnOriginatingEpicError>
> {
  const normalizedComment = commentText.trim();

  if (!normalizedComment) {
    return err({ code: "comment-text-required" });
  }

  const provenance = await resolveOriginatingPackage(store, graphCxId);

  if (provenance.isErr()) {
    return err(provenance.error);
  }

  const created = await jira.createComment({
    body: commentBody(provenance.value, normalizedComment),
    issueKey: provenance.value.sourceEpicId,
  });

  if (created.isErr()) {
    return err(created.error);
  }

  return ok({
    commentId: created.value.commentId,
    correlationId: provenance.value.correlationId,
    sourceEpicId: provenance.value.sourceEpicId,
    version: provenance.value.version,
  });
}
