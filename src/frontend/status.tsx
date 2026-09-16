import { invoke, router } from "@forge/bridge";
import ForgeReconciler from "@forge/react";
import React, { useCallback, useEffect, useState } from "react";

import {
  type ConfigurationConcern,
  configurationLocation,
} from "./configuration-location";
import {
  type AdministratorOverview,
  type ConfigurationUrls,
  type InstallationReadiness,
  type PeerCxOverview,
  StatusPage,
} from "./status-page";

const CONCERNS: readonly ConfigurationConcern[] = ["log-sink", "peer-cx"];

function unwrap<Value>(value: Value | { readonly body: Value }): Value {
  return value && typeof value === "object" && "body" in value
    ? value.body
    : (value as Value);
}

const App = () => {
  const [readiness, setReadiness] = useState<InstallationReadiness>();
  const [overview, setOverview] = useState<AdministratorOverview>();
  const [configurationUrls, setConfigurationUrls] = useState<ConfigurationUrls>(
    {},
  );

  const loadOverview = useCallback(() => {
    void invoke<AdministratorOverview>("getPeerCxOverview").then(
      (value) => setOverview(unwrap(value)),
      () => setOverview({ auditOutcomes: [], peerCxs: [] }),
    );
  }, []);

  useEffect(() => {
    void invoke<InstallationReadiness>("getInstallationReadiness").then(
      (value) => setReadiness(unwrap(value)),
      () => setReadiness({ status: "blocked" }),
    );
    loadOverview();

    // A module key becomes a URL only by asking the host, so the empty states
    // are handed resolved addresses rather than constructing admin URLs. A
    // concern the host cannot resolve simply contributes no link.
    void Promise.all(
      CONCERNS.map(async (concern) => {
        const url = await router
          .getUrl(configurationLocation(concern))
          .catch(() => null);

        return [concern, url?.toString()] as const;
      }),
    ).then((resolved) =>
      setConfigurationUrls(
        Object.fromEntries(resolved.filter(([, url]) => url)),
      ),
    );
  }, [loadOverview]);

  const revoke = useCallback(
    (peerCx: PeerCxOverview) => {
      void invoke("revokePeerCx", {
        correlationId: peerCx.peerCxId,
        peerCxId: peerCx.peerCxId,
        safeReason: "administrator-revoked",
      }).then(loadOverview, loadOverview);
    },
    [loadOverview],
  );

  return (
    <StatusPage
      configurationUrls={configurationUrls}
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
