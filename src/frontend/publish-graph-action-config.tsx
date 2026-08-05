import { renderAutomationActionConfig } from "./automation-action-config";

renderAutomationActionConfig({
  title: "Configure work-package publishing for Rovo discovery",
  fields: [
    {
      description:
        "The Supplychain Graph connector connection ID that receives the package projection.",
      label: "Graph connection ID",
      name: "connectionId",
    },
    {
      defaultValue: "{{issue.key}}",
      description:
        "The Source Epic key, normally the Jira Automation issue key smart value.",
      label: "Source Epic ID",
      name: "sourceEpicId",
    },
    {
      defaultValue: "{{initiator.accountId}}",
      description: "The Jira Automation initiator account ID smart value.",
      label: "Publisher account ID",
      name: "publisherId",
    },
    {
      description:
        "A value that correlates this publication request with Automation execution.",
      label: "Correlation ID",
      name: "correlationId",
    },
    {
      description:
        "A stable key used to make repeat Automation execution safe.",
      label: "Idempotency key",
      name: "idempotencyKey",
    },
    {
      description:
        "The ISO-8601 publication timestamp shown in Rovo package provenance.",
      label: "Publication time",
      name: "publishedAt",
    },
  ],
});
