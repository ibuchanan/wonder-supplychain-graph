import {
  Button,
  DynamicTable,
  Link,
  Lozenge,
  Stack,
  // The Tabs family is documented UI Kit, but predates the approved-export
  // list prelint checks, so each of its specifiers is suppressed here.
  // ast-grep-ignore: no-unapproved-forge-react-components-tsx
  Tab,
  // ast-grep-ignore: no-unapproved-forge-react-components-tsx
  TabList,
  // ast-grep-ignore: no-unapproved-forge-react-components-tsx
  TabPanel,
  // ast-grep-ignore: no-unapproved-forge-react-components-tsx
  Tabs,
  Text,
} from "@forge/react";

import type { ConfigurationConcern } from "./configuration-location";

export type InstallationReadinessStatus = "blocked" | "ready";

export interface InstallationReadiness {
  readonly status: InstallationReadinessStatus;
}

export type PeerCxAgreementStatus =
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
export interface PeerCxOverview {
  readonly agreedOperations: readonly string[];
  readonly agreementEndsAt: string;
  readonly counterpartSiteAri: string;
  readonly pairingCount: number;
  readonly peerCxId: string;
  readonly status: PeerCxAgreementStatus;
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
  readonly peerCxs: readonly PeerCxOverview[];
}

/**
 * The configuration page's address per concern, already resolved. Resolving a
 * module key is asynchronous and host-bound, so the page is handed the answer
 * rather than asking for it; a concern is absent until its URL resolves.
 */
export type ConfigurationUrls = {
  readonly [Concern in ConfigurationConcern]?: string;
};

export interface StatusPageProps {
  readonly configurationUrls: ConfigurationUrls;
  readonly onRevoke: (peerCx: PeerCxOverview) => void;
  readonly overview: AdministratorOverview | undefined;
  readonly readiness: InstallationReadiness | undefined;
}

const peerCxAppearance: Record<
  PeerCxAgreementStatus,
  "default" | "removed" | "success"
> = {
  active: "success",
  expired: "removed",
  failed: "removed",
  pending: "default",
  revoked: "removed",
};

const content: Record<
  InstallationReadinessStatus,
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
 * The administrator's read-only view of this site: whether the installation is
 * ready, which PeerCXs exist, and what evidence has been recorded.
 * It takes everything it shows as props so that the page's structure can be
 * exercised without an Atlassian host.
 */
export const StatusPage = ({
  configurationUrls,
  onRevoke,
  overview,
  readiness,
}: StatusPageProps) => (
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

    <Tabs id="status-sections">
      <TabList>
        <Tab>PeerCXs</Tab>
        <Tab>Recent audit outcomes</Tab>
      </TabList>
      <TabPanel>
        <Stack space="space.200">
          <Text>
            This tenant's own records only. Revoking is local and immediate, and
            blocks every Pairing under that peerCx.
          </Text>
          <DynamicTable
            emptyView={
              <Stack space="space.100">
                <Text>No PeerCX is recorded on this site.</Text>
                {configurationUrls["peer-cx"] ? (
                  <Link href={configurationUrls["peer-cx"]}>
                    Create a PeerCX
                  </Link>
                ) : null}
              </Stack>
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
            rows={(overview?.peerCxs ?? []).map((peerCx) => ({
              cells: [
                { content: peerCx.counterpartSiteAri },
                {
                  content: (
                    <Lozenge appearance={peerCxAppearance[peerCx.status]}>
                      {peerCx.status}
                    </Lozenge>
                  ),
                },
                { content: peerCx.agreedOperations.join(", ") },
                { content: peerCx.agreementEndsAt },
                { content: String(peerCx.pairingCount) },
                {
                  content:
                    peerCx.status === "active" ? (
                      <Button
                        appearance="danger"
                        onClick={() => onRevoke(peerCx)}
                      >
                        Revoke locally
                      </Button>
                    ) : null,
                },
              ],
              key: peerCx.peerCxId,
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
              <Stack space="space.100">
                <Text>No audit evidence is recorded on this site yet.</Text>
                {configurationUrls["log-sink"] ? (
                  <Link href={configurationUrls["log-sink"]}>
                    Set up a log sink
                  </Link>
                ) : null}
              </Stack>
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
