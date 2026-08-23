import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const script = readFileSync(
  "scripts/create-starter-delivery-webtriggers.sh",
  "utf8",
);

describe("create-starter-delivery-webtriggers", () => {
  it("maps each webtrigger function to its matching SecretSpec variable", () => {
    expect(script).toContain(
      'destination_seed_url=$(webtrigger_url scg-seed-destination "$SCG_DESTINATION_SITE")',
    );
    expect(script).toContain(
      'destination_delivery_url=$(webtrigger_url scg-receive-starter "$SCG_DESTINATION_SITE")',
    );
    expect(script).toContain(
      'destination_event_url=$(webtrigger_url scg-receive-lean-event "$SCG_DESTINATION_SITE")',
    );
    expect(script).toContain(
      'source_seed_url=$(webtrigger_url scg-seed-source "$SCG_SOURCE_SITE")',
    );
    expect(script).toContain(
      'source_publication_url=$(webtrigger_url scg-publish-starter "$SCG_SOURCE_SITE")',
    );
    expect(script).toContain("SCG_DESTINATION_SEED_URL=$destination_seed_url");
    expect(script).toContain(
      "SCG_DESTINATION_DELIVERY_URL=$destination_delivery_url",
    );
    expect(script).toContain(
      "SCG_DESTINATION_EVENT_URL=$destination_event_url",
    );
    expect(script).toContain("SCG_SOURCE_SEED_URL=$source_seed_url");
    expect(script).toContain(
      "SCG_SOURCE_PUBLICATION_URL=$source_publication_url",
    );
  });
});
