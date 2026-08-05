import React from "react";
import ForgeReconciler, { Button, Heading, Stack, Text } from "@forge/react";

import {
  applyDeterministicSupplierReceipt,
  createAuthorizedSupplierScenario,
  toSupplierPackageView,
  type SupplierReceiptDelivery,
} from "../simulator/authorized-supplier-package";

const Simulator = () => {
  const [scenario, setScenario] = React.useState(
    createAuthorizedSupplierScenario,
  );
  const [latestDelivery, setLatestDelivery] = React.useState<
    SupplierReceiptDelivery | undefined
  >(undefined);
  const [auditEvents, setAuditEvents] = React.useState<
    SupplierReceiptDelivery["auditEvents"]
  >([]);
  const [errorCode, setErrorCode] = React.useState<string | undefined>(
    undefined,
  );
  const simulatorView = toSupplierPackageView(scenario);

  const deliver = () => {
    const result = applyDeterministicSupplierReceipt(scenario);

    if (result.isErr()) {
      setErrorCode(result.error.code);
      return;
    }

    setErrorCode(undefined);
    setScenario(result.value.nextScenario);
    setLatestDelivery(result.value);
    setAuditEvents((currentEvents) => [
      ...currentEvents,
      ...result.value.auditEvents,
    ]);
  };

  return (
    <Stack space="space.200">
      <Text>
        Development-only deterministic scenario. No peer endpoint or partner
        data is used.
      </Text>

      <Button appearance="primary" onClick={deliver} type="button">
        Deliver deterministic package
      </Button>

      <Stack space="space.050">
        <Heading size="medium">Latest delivery</Heading>
        {latestDelivery ? (
          <>
            <Text>
              Outcome: {latestDelivery.decision.idempotency} ·{" "}
              {latestDelivery.decision.state} · version{" "}
              {latestDelivery.decision.version}
            </Text>
            <Text>New audit events: {latestDelivery.auditEvents.length}</Text>
          </>
        ) : (
          <Text>No deterministic delivery has run yet.</Text>
        )}
        {errorCode ? <Text>Delivery error: {errorCode}</Text> : null}
      </Stack>

      <Stack space="space.050">
        <Heading size="medium">Current package</Heading>
        <Text>
          {simulatorView.current.sourceEpic.key} ·{" "}
          {simulatorView.current.sourceEpic.summary}
        </Text>
        <Text>
          Version {simulatorView.current.version} published{" "}
          {simulatorView.current.publishedAt}
        </Text>
        <Text>
          {simulatorView.current.sourceEpic.statusCategory} ·{" "}
          {simulatorView.current.sourceEpic.priority}
        </Text>
      </Stack>

      <Stack space="space.050">
        <Heading size="medium">Provenance</Heading>
        <Text>Source site: {simulatorView.provenance.sourceSiteId}</Text>
        <Text>Publisher: {simulatorView.provenance.publisherId}</Text>
      </Stack>

      <Stack space="space.100">
        <Heading size="medium">Audit evidence</Heading>
        {auditEvents.length === 0 ? (
          <Text>No local audit events recorded yet.</Text>
        ) : (
          auditEvents.map((auditEvent) => (
            <Text key={auditEvent.eventId}>
              {auditEvent.eventType} · {auditEvent.eventId} ·{" "}
              {auditEvent.correlationId}
            </Text>
          ))
        )}
      </Stack>

      <Stack space="space.100">
        <Heading size="medium">Direct children</Heading>
        {simulatorView.children.map((child) => (
          <Stack key={child.key} space="space.025">
            <Text>
              {child.key} · {child.issueType} · {child.summary}
            </Text>
            <Text>
              {child.statusCategory} · {child.priority}
            </Text>
            <Text>{child.description}</Text>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <Simulator />
  </React.StrictMode>,
);
