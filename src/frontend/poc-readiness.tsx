import { invoke } from "@forge/bridge";
import ForgeReconciler, {
  Button,
  DynamicTable,
  Heading,
  Lozenge,
  Stack,
  Text,
} from "@forge/react";
import React, { useCallback, useEffect, useState } from "react";

type PocReadinessStatus = "blocked" | "ready";

interface PocReadiness {
  readonly status: PocReadinessStatus;
}

type RelationshipStatus =
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
interface RelationshipOverview {
  readonly agreedOperations: readonly string[];
  readonly agreementEndsAt: string;
  readonly counterpartSiteAri: string;
  readonly pairingCount: number;
  readonly relationshipId: string;
  readonly status: RelationshipStatus;
  readonly termsVersion: string;
}

interface AuditOutcome {
  readonly correlationId?: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: string;
  readonly outcome: "denied" | "recorded";
  readonly reason?: string;
}

interface AdministratorOverview {
  readonly auditOutcomes: readonly AuditOutcome[];
  readonly relationships: readonly RelationshipOverview[];
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

function unwrap<Value>(value: Value | { readonly body: Value }): Value {
  return value && typeof value === "object" && "body" in value
    ? value.body
    : (value as Value);
}

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

const App = () => {
  const [readiness, setReadiness] = useState<PocReadiness>();
  const [overview, setOverview] = useState<AdministratorOverview>();

  const loadOverview = useCallback(() => {
    void invoke<AdministratorOverview>("getRelationshipOverview").then(
      (value) => setOverview(unwrap(value)),
      () => setOverview({ auditOutcomes: [], relationships: [] }),
    );
  }, []);

  useEffect(() => {
    void invoke<PocReadiness>("getPocReadiness").then(
      (value) => setReadiness(unwrap(value)),
      () => setReadiness({ status: "blocked" }),
    );
    loadOverview();
  }, [loadOverview]);

  const revoke = useCallback(
    (relationship: RelationshipOverview) => {
      void invoke("revokeRelationship", {
        correlationId: relationship.relationshipId,
        relationshipId: relationship.relationshipId,
        safeReason: "administrator-revoked",
      }).then(loadOverview, loadOverview);
    },
    [loadOverview],
  );

  return (
    <Stack space="space.200">
      <Heading size="large">Peer POC readiness</Heading>
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

      <Heading size="medium">Site relationships</Heading>
      <Text>
        This tenant's own records only. Revoking is local and immediate, and
        blocks every Pairing under that relationship.
      </Text>
      <DynamicTable
        emptyView="No Site relationship is recorded on this site."
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
                    onClick={() => revoke(relationship)}
                  >
                    Revoke locally
                  </Button>
                ) : null,
            },
          ],
          key: relationship.relationshipId,
        }))}
      />

      <Heading size="medium">Recent audit outcomes</Heading>
      <Text>
        Non-content evidence retained by this site. Reason codes only: no
        secret, signature, endpoint, or Jira content is recorded.
      </Text>
      <DynamicTable
        emptyView="No audit evidence is recorded on this site yet."
        head={{
          cells: [
            { content: "When", key: "when" },
            { content: "Event", key: "event" },
            { content: "Outcome", key: "outcome" },
            { content: "Reason", key: "reason" },
            { content: "Correlation ID", key: "correlation" },
          ],
        }}
        rows={[...(overview?.auditOutcomes ?? [])].reverse().map((event) => ({
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
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
