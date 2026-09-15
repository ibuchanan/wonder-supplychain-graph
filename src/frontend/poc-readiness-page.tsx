import {
  Button,
  DynamicTable,
  Lozenge,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
} from "@forge/react";

export type PocReadinessStatus = "blocked" | "ready";

export interface PocReadiness {
  readonly status: PocReadinessStatus;
}

export type RelationshipStatus =
  | "active"
  | "expired"
  | "failed"
  | "pending"
  | "revoked";

/**
 * The safe administrator projection. It deliberately has no field for a
 * secret, a signature, a peer delivery endpoint, or Jira content: a screen is
 * permanent disclosure, so those must not be able to reach it.
 */
export interface RelationshipOverview {
  readonly agreedOperations: readonly string[];
  readonly agreementEndsAt: string;
  readonly counterpartSiteAri: string;
  readonly pairingCount: number;
  readonly relationshipId: string;
  readonly status: RelationshipStatus;
  readonly termsVersion: string;
}

export interface AuditOutcome {
  readonly correlationId?: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: string;
  readonly outcome: "denied" | "recorded";
  readonly reason?: string;
}

export interface AdministratorOverview {
  readonly auditOutcomes: readonly AuditOutcome[];
  readonly relationships: readonly RelationshipOverview[];
}

export interface PocReadinessPageProps {
  readonly onRevoke: (relationship: RelationshipOverview) => void;
  readonly overview: AdministratorOverview | undefined;
  readonly readiness: PocReadiness | undefined;
}

const relationshipAppearance: Record<
  RelationshipStatus,
  "default" | "removed" | "success"
> = {
  active: "success",
  expired: "removed",
  failed: "removed",
  pending: "default",
  revoked: "removed",
};

const content: Record<
  PocReadinessStatus,
  {
    readonly appearance: "success" | "warning";
    readonly text: string;
  }
> = {
  blocked: {
    appearance: "warning",
    text: "Blocked. A local POC prerequisite is unavailable.",
  },
  ready: {
    appearance: "success",
    text: "Ready. This reports only local POC readiness.",
  },
};

/**
 * The administrator's view of local POC readiness. It takes everything it
 * shows as props so that the page's structure can be exercised without an
 * Atlassian host.
 */
export const PocReadinessPage = ({
  onRevoke,
  overview,
  readiness,
}: PocReadinessPageProps) => (
  <Stack space="space.200">
    {readiness ? (
      <>
        <Lozenge appearance={content[readiness.status].appearance} isBold>
          {readiness.status === "ready" ? "Ready" : "Blocked"}
        </Lozenge>
        <Text>{content[readiness.status].text}</Text>
      </>
    ) : (
      <Text>Checking local POC readiness…</Text>
    )}

    <Tabs id="poc-readiness-sections">
      <TabList>
        <Tab>Site relationships</Tab>
        <Tab>Recent audit outcomes</Tab>
      </TabList>
      <TabPanel>
        <Stack space="space.200">
          <Text>
            This tenant's own records only. Revoking is local and immediate, and
            blocks every Pairing under that relationship.
          </Text>
          <DynamicTable
            emptyView={
              <Text>No Site relationship is recorded on this site.</Text>
            }
            head={{
              cells: [
                { content: "Counterpart", key: "counterpart" },
                { content: "Status", key: "status" },
                { content: "Agreed scope", key: "scope" },
                { content: "Agreement ends", key: "ends" },
                { content: "Pairings", key: "pairings" },
                { content: "", key: "action" },
              ],
            }}
            rows={(overview?.relationships ?? []).map((relationship) => ({
              cells: [
                { content: relationship.counterpartSiteAri },
                {
                  content: (
                    <Lozenge
                      appearance={relationshipAppearance[relationship.status]}
                    >
                      {relationship.status}
                    </Lozenge>
                  ),
                },
                { content: relationship.agreedOperations.join(", ") },
                { content: relationship.agreementEndsAt },
                { content: String(relationship.pairingCount) },
                {
                  content:
                    relationship.status === "active" ? (
                      <Button
                        appearance="danger"
                        onClick={() => onRevoke(relationship)}
                      >
                        Revoke locally
                      </Button>
                    ) : null,
                },
              ],
              key: relationship.relationshipId,
            }))}
          />
        </Stack>
      </TabPanel>
      <TabPanel>
        <Stack space="space.200">
          <Text>
            Non-content evidence retained by this site. Reason codes only: no
            secret, signature, endpoint, or Jira content is recorded.
          </Text>
          <DynamicTable
            emptyView={
              <Text>No audit evidence is recorded on this site yet.</Text>
            }
            head={{
              cells: [
                { content: "When", key: "when" },
                { content: "Event", key: "event" },
                { content: "Outcome", key: "outcome" },
                { content: "Reason", key: "reason" },
                { content: "Correlation ID", key: "correlation" },
              ],
            }}
            rows={[...(overview?.auditOutcomes ?? [])]
              .reverse()
              .map((event) => ({
                cells: [
                  { content: event.occurredAt },
                  { content: event.eventType },
                  {
                    content: (
                      <Lozenge
                        appearance={
                          event.outcome === "denied" ? "removed" : "default"
                        }
                      >
                        {event.outcome}
                      </Lozenge>
                    ),
                  },
                  { content: event.reason ?? "—" },
                  { content: event.correlationId ?? "—" },
                ],
                key: event.eventId,
              }))}
          />
        </Stack>
      </TabPanel>
    </Tabs>
  </Stack>
);
