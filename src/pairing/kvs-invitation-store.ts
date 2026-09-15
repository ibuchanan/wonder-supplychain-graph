import { kvs } from "@forge/kvs";

import type { InvitationWorkflowState } from "./invitation-workflow";

const invitationWorkflowStateKey = "invitation-workflow-state";
const emptyState: InvitationWorkflowState = { invitations: [] };

export const kvsInvitationStore = {
  read: async (): Promise<InvitationWorkflowState> =>
    (await kvs.get<InvitationWorkflowState>(invitationWorkflowStateKey)) ??
    emptyState,
  write: async (state: InvitationWorkflowState): Promise<void> => {
    await kvs.set(invitationWorkflowStateKey, state);
  },
};
