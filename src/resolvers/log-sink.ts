import { fetch as forgeFetch, getAppContext } from "@forge/api";
import type Resolver from "@forge/resolver";

import { recordLifecycleOutcome } from "../audit/kvs-lifecycle-journal-store";
import { kvsLogSinkStore } from "../observability/kvs-log-sink-store";
import { validateCloudEventsWebhook } from "../observability/log-shipping";
import {
  clearLogSink,
  configureLogSink,
  describeLogSink,
  permittedSinkHosts,
} from "../observability/log-sink-configuration";

interface SaveLogSinkPayload {
  readonly authMethod: string;
  readonly secret: string;
  readonly targetUrl: string;
}

function readSaveLogSinkPayload(
  value: unknown,
): SaveLogSinkPayload | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const payload = value as {
    authMethod?: unknown;
    secret?: unknown;
    targetUrl?: unknown;
  };

  return typeof payload.authMethod === "string" &&
    typeof payload.secret === "string" &&
    typeof payload.targetUrl === "string"
    ? {
        authMethod: payload.authMethod,
        secret: payload.secret,
        targetUrl: payload.targetUrl.trim(),
      }
    : undefined;
}

export function registerLogSinkResolvers(resolver: Resolver): void {
  /**
   * The administrator's view of the app-wide CloudEvent log sink. It reports
   * whether a secret is on record and never the secret itself, so the page can
   * show what is configured without the credential reaching a browser.
   */
  resolver.define("getLogSink", async () => {
    const { configuration, hasSecret } = await kvsLogSinkStore.read();

    return describeLogSink(configuration, hasSecret);
  });

  /**
   * Saves the sink target, auth method, and secret. One sink serves every event
   * the app emits, so this is app-wide for the tenant rather than per-connection.
   */
  resolver.define("saveLogSink", async ({ context, payload }) => {
    const request = readSaveLogSinkPayload(payload);
    if (!request) {
      return { reason: "log-sink-request-incomplete", status: "rejected" };
    }

    const configured = configureLogSink({
      ...(typeof context["accountId"] === "string"
        ? { actorAccountId: context["accountId"] }
        : {}),
      authMethod: request.authMethod,
      occurredAt: new Date().toISOString(),
      permittedSinkHosts,
      secret:
        request.secret.trim() || (await kvsLogSinkStore.readSecret()) || "",
      targetUrl: request.targetUrl,
    });
    if (configured.isErr()) {
      return { reason: configured.error.code, status: "rejected" };
    }

    const validated = await validateCloudEventsWebhook({
      configuration: configured.value.configuration,
      deliver: async (delivery) => {
        if (!("method" in delivery)) {
          throw new Error("Webhook validation must use OPTIONS");
        }

        const response = await forgeFetch(delivery.url, {
          headers: delivery.headers,
          method: delivery.method,
        });

        return {
          headers: {
            "WebHook-Allowed-Origin":
              response.headers.get("WebHook-Allowed-Origin") ?? "",
          },
          ok: response.ok,
        };
      },
      installationId: getAppContext().installationAri.toString(),
    });
    if (validated.status === "rejected") {
      return { reason: validated.reason, status: "rejected" };
    }

    await kvsLogSinkStore.write(
      configured.value.configuration,
      configured.value.secret,
    );
    await recordLifecycleOutcome(configured.value.auditEvent);

    return { status: "saved" };
  });

  /** Returns the app to an unconfigured state, secret included. */
  resolver.define("resetLogSink", async ({ context }) => {
    const cleared = clearLogSink({
      ...(typeof context["accountId"] === "string"
        ? { actorAccountId: context["accountId"] }
        : {}),
      occurredAt: new Date().toISOString(),
    });

    await kvsLogSinkStore.clear();
    await recordLifecycleOutcome(cleared.auditEvent);

    return { status: "reset" };
  });
}
