import React from "react";
import ForgeReconciler, { Heading, Stack, Text } from "@forge/react";

import {
  createAuthorizedSupplierScenario,
  toSupplierPackageView,
} from "../simulator/authorized-supplier-package";

const App = () => {
  const packageView = toSupplierPackageView(createAuthorizedSupplierScenario());

  if (!("current" in packageView)) {
    return <Text>{packageView.status}</Text>;
  }

  const { current, provenance } = packageView;

  return (
    <Stack space="space.200">
      <Stack space="space.050">
        <Heading size="medium">Current package</Heading>
        <Text>
          Source Epic: {current.sourceEpic.key} · {current.sourceEpic.summary}
        </Text>
        <Text>
          {current.sourceEpic.issueType} · {current.sourceEpic.statusCategory} ·{" "}
          {current.sourceEpic.priority}
        </Text>
        <Text>{current.sourceEpic.description}</Text>
      </Stack>

      <Stack space="space.050">
        <Heading size="medium">Provenance</Heading>
        <Text>Source site: {provenance.sourceSiteId}</Text>
        <Text>Publisher: {provenance.publisherId}</Text>
        <Text>
          Published: version {current.version} · {current.publishedAt}
        </Text>
      </Stack>

      <Stack space="space.100">
        <Heading size="medium">Direct children</Heading>
        {packageView.children.map((child) => (
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
    <App />
  </React.StrictMode>,
);
