const {
  readLeanEventDemoConfig,
} = require("../dist/harness/read-lean-event-demo-config");
const { runLeanEventDemo } = require("../dist/harness/run-lean-event-demo");

const http = {
  post: async (url, body) => {
    const response = await fetch(url, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    return { status: response.status };
  },
};

async function main() {
  const config = readLeanEventDemoConfig(process.env);
  if (config.isErr()) {
    console.error(JSON.stringify(config.error));
    process.exitCode = 1;
    return;
  }

  const result = await runLeanEventDemo(config.value, http);
  if (result.isErr()) {
    console.error(JSON.stringify(result.error));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify(result.value));
}

void main();
