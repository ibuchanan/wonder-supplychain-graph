import { invoke } from "@forge/bridge";
import ForgeReconciler from "@forge/react";
import React, { useCallback, useEffect, useState } from "react";

import {
  type AdministratorOverview,
  type PocReadiness,
  PocReadinessPage,
  type RelationshipOverview,
} from "./poc-readiness-page";

function unwrap<Value>(value: Value | { readonly body: Value }): Value {
  return value && typeof value === "object" && "body" in value
    ? value.body
    : (value as Value);
}

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
    <PocReadinessPage
      onRevoke={revoke}
      overview={overview}
      readiness={readiness}
    />
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
