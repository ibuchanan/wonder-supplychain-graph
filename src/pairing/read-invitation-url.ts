import { err, type Result } from "@forge-ahead/errors";

import {
  type InvitationDetails,
  type InvitationWorkflowState,
  type ReadInvitationError,
  readInvitation,
} from "./invitation-workflow";

export type ReadInvitationUrlError =
  | ReadInvitationError
  | { readonly code: "invitation-reference-missing" };

export function readInvitationUrl(
  state: InvitationWorkflowState,
  url: string,
  authenticatedAccountId: string,
  now?: string,
): Result<InvitationDetails, ReadInvitationUrlError> {
  try {
    const reference = new URL(url).searchParams.get("invitation");

    if (!reference) {
      return err({ code: "invitation-reference-missing" });
    }

    return readInvitation(state, reference, authenticatedAccountId, now);
  } catch {
    return err({ code: "invitation-reference-missing" });
  }
}
