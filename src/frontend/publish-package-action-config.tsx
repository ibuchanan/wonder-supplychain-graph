import { renderAutomationActionConfig } from "./automation-action-config";

renderAutomationActionConfig({
  title: "Configure work-package publication",
  fields: [
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
  ],
});
