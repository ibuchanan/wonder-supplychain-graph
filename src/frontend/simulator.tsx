import React from "react";
import ForgeReconciler, { Heading, Stack, Text } from "@forge/react";

import {
  createAuthorizedSupplierScenario,
  toSupplierPackageView,
} from "../simulator/authorized-supplier-package";

const simulatorView = toSupplierPackageView(createAuthorizedSupplierScenario());

const Simulator = () => (
  <Stack space="space.200">
    <Text>
      Development-only deterministic scenario. No peer endpoint or partner data
      is used.
    </Text>

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

ForgeReconciler.render(
  <React.StrictMode>
    <Simulator />
  </React.StrictMode>,
);
