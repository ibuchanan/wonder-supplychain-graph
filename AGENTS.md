# Wonder: Supplychain Graph

Vision: https://hello.atlassian.net/wiki/spaces/~ibuchanan/pages/7506049105/Supplychain+Graph+Design+Decisions
Additional specs: Local /specs directory
Example & reference implementations: Local /vendor directory, which can be explored with `ccc search`
Tickets: https://devpartisan.atlassian.net/jira/software/projects/SCG/boards/30
Home Slack channel: https://atlassian.enterprise.slack.com/archives/C0AK77GS805
Where people find ESA: https://atlassian.enterprise.slack.com/archives/C08HSMCQUP8

## Working with Tickets

```bash
# Create issues
twg jira workitem create \
  --space SCG \
  -s devpartisan \
  --type Task \
  --summary "Your summary here" \
  --description-format markdown \
  --description "## Your markdown here" \
```

```sh
# Read the issue’s full acceptance criteria and fields
twg jira workitem get SCG-123 \
  -s devpartisan \
  --full \
  -o text
```

```sh
# Transition to Done (trasition-id 41)
twg jira workitem transition \
  --id SCG-123 \
  --transition-id 41 \
  -s devpartisan \
  -o text
```

## Working in Code

Use `@forge-ahead/errors` whenever an expected domain or integration failure can occur:
return a typed `Result` instead of throwing
so callers must explicitly handle the known error cases.
