import { kvs } from "@forge/kvs";

import type { LogSinkConfiguration } from "./log-sink-configuration";

/**
 * One sink per tenant installation. Neither key carries a connection,
 * relationship, or Pairing identifier, because one sink serves every event the
 * app emits rather than one collaboration.
 */
const configurationKey = "log-sink-configuration";
const secretKey = "log-sink-secret";

export interface StoredLogSink {
  readonly configuration: LogSinkConfiguration | undefined;
  readonly hasSecret: boolean;
}

/**
 * Tenant-local storage for the CloudEvent log sink. The URL and auth method
 * live in ordinary app storage; the secret lives in encrypted storage and is
 * only ever reported as present, never read back out of this module.
 */
export const kvsLogSinkStore = {
  clear: async (): Promise<void> => {
    await Promise.all([
      kvs.delete(configurationKey),
      kvs.deleteSecret(secretKey),
    ]);
  },
  read: async (): Promise<StoredLogSink> => {
    const [configuration, secret] = await Promise.all([
      kvs.get<LogSinkConfiguration>(configurationKey),
      kvs.getSecret<string>(secretKey),
    ]);

    return { configuration, hasSecret: Boolean(secret) };
  },
  readSecret: (): Promise<string | undefined> =>
    kvs.getSecret<string>(secretKey),
  write: async (
    configuration: LogSinkConfiguration,
    secret: string,
  ): Promise<void> => {
    await Promise.all([
      kvs.set(configurationKey, configuration),
      kvs.setSecret(secretKey, secret),
    ]);
  },
};
