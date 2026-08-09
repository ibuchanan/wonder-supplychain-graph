const {
  readStarterDeliveryHarnessConfig,
} = require("../dist/harness/read-starter-delivery-harness-config");
const {
  runStarterDeliveryHarness,
} = require("../dist/harness/run-starter-delivery-harness");

const http = {
  post: async (url, body) => {
    const response = await fetch(url, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const responseBody = await response.text();
    return {
      json: async () => JSON.parse(responseBody),
      status: response.status,
      text: async () => responseBody,
    };
  },
};

async function main() {
  const config = readStarterDeliveryHarnessConfig(process.env);
  if (config.isErr()) {
    console.error(JSON.stringify(config.error));
    process.exitCode = 1;
    return;
  }

  const result = await runStarterDeliveryHarness(config.value, http);
  if (result.isErr()) {
    console.error(JSON.stringify(result.error));
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify({
      ...result.value,
      manualAcceptance:
        "Confirm the document is discoverable in destination Search/Rovo and its source URL opens the Source Epic.",
    }),
  );
}

void main();
