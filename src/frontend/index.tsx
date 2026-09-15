import { invoke } from "@forge/bridge";
import ForgeReconciler, { Heading, Stack, Text } from "@forge/react";
import React, { useEffect, useState } from "react";

type LocalReadinessStatus =
  | "failed"
  | "ready"
  | "unconfigured"
  | "waiting-for-pairing";

const readinessText: Record<LocalReadinessStatus, string> = {
  failed:
    "Delivery failed. Check Forge logs for local troubleshooting details.",
  ready: "Ready for starter publication or delivery.",
  unconfigured: "Unconfigured. A local role has not been configured.",
  "waiting-for-pairing": "Waiting for pairing.",
};

const App = () => {
  const [status, setStatus] = useState<LocalReadinessStatus | undefined>();

  useEffect(() => {
    void invoke<{ status: LocalReadinessStatus }>("getLocalReadiness").then(
      (readiness) => {
        const payload = "body" in readiness ? readiness.body : readiness;
        setStatus(payload.status);
      },
      () => setStatus("failed"),
    );
  }, []);

  return (
    <Stack space="space.200">
      <Heading size="medium">Supplychain Graph readiness</Heading>
      <Text>
        {status ? readinessText[status] : "Checking local readiness…"}
      </Text>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
