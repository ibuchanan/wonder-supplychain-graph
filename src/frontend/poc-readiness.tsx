import { invoke } from "@forge/bridge";
import ForgeReconciler, { Heading, Lozenge, Stack, Text } from "@forge/react";
import React, { useEffect, useState } from "react";

type PocReadinessStatus = "blocked" | "ready";

interface PocReadiness {
  readonly status: PocReadinessStatus;
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

  useEffect(() => {
    void invoke<PocReadiness>("getPocReadiness").then(
      (value) => setReadiness("body" in value ? value.body : value),
      () => setReadiness({ status: "blocked" }),
    );
  }, []);

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
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
