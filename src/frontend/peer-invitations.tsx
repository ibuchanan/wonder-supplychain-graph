import { invoke, router } from "@forge/bridge";
import ForgeReconciler, {
  Button,
  ButtonGroup,
  Code,
  ErrorMessage,
  Form,
  FormFooter,
  FormSection,
  Heading,
  Label,
  Lozenge,
  RadioGroup,
  RequiredAsterisk,
  SectionMessage,
  Stack,
  Text,
  TextArea,
  Textfield,
  useForm,
  useProductContext,
} from "@forge/react";
import React, { useCallback, useEffect, useState } from "react";

import { chooseInvitationView } from "./peer-invitations-view";

/**
 * The safe recipient projection. It deliberately has no field for the
 * invitation reference itself, a secret, or a peer delivery endpoint: this view
 * is shown to a peer administrator on another site.
 */
interface InvitationDetails {
  readonly expiresAt: string;
  readonly purpose: string;
  readonly safeLabel?: string;
  readonly termsVersion: string;
}

type ReadInvitationResponse =
  | { readonly invitation: InvitationDetails; readonly status: "available" }
  | { readonly status: "unavailable" };

type CreateInvitationResponse =
  | { readonly navigationUrl: string; readonly status: "created" }
  | { readonly status: "blocked" };

interface InvitationFormFields {
  readonly purpose: string;
  readonly recipientAccountId: string;
  readonly safeLabel: string;
}

function unwrap<Value>(value: Value | { readonly body: Value }): Value {
  return value && typeof value === "object" && "body" in value
    ? value.body
    : (value as Value);
}

const UNAVAILABLE =
  "This invitation is unavailable or you are not its recipient.";

const RecipientInvitation = ({ reference }: { readonly reference: string }) => {
  const [response, setResponse] = useState<ReadInvitationResponse>();

  useEffect(() => {
    void invoke<ReadInvitationResponse>("readInvitation", { reference }).then(
      (value) => setResponse(unwrap(value)),
      () => setResponse({ status: "unavailable" }),
    );
  }, [reference]);

  if (!response) {
    return <Text>Checking this invitation…</Text>;
  }

  if (response.status !== "available") {
    return (
      <Stack space="space.200">
        <Heading size="large">Invitation unavailable</Heading>
        <SectionMessage appearance="warning">
          <Text>{UNAVAILABLE}</Text>
        </SectionMessage>
      </Stack>
    );
  }

  const { invitation } = response;

  return (
    <Stack space="space.200">
      <Heading size="large">Peer invitation</Heading>
      <Text>{invitation.purpose}</Text>
      <Text>Terms: {invitation.termsVersion}</Text>
      <Text>Expires: {invitation.expiresAt}</Text>
      {invitation.safeLabel ? <Text>{invitation.safeLabel}</Text> : null}
    </Stack>
  );
};

const InvitationForm = () => {
  const { formState, getFieldId, handleSubmit, register } =
    useForm<InvitationFormFields>();
  const [response, setResponse] = useState<CreateInvitationResponse>();

  const submit = useCallback(async (fields: InvitationFormFields) => {
    // The recipient reaches this same module through its own URL, so the
    // invitation has to carry the module's navigable address rather than a
    // guess at one.
    const navigationUrl = await router.getUrl({
      moduleKey: "scg-peer-invitations",
      target: "module",
    });

    if (!navigationUrl) {
      setResponse({ status: "blocked" });
      return;
    }

    const created = await invoke<CreateInvitationResponse>("createInvitation", {
      greenNavigationUrl: navigationUrl.toString(),
      purpose: fields.purpose,
      recipientAccountId: fields.recipientAccountId,
      safeLabel: fields.safeLabel || undefined,
    }).then(unwrap, () => ({ status: "blocked" }) as const);

    setResponse(created);
  }, []);

  return (
    <Stack space="space.200">
      <Heading size="medium">Invite a peer administrator</Heading>
      <Text>
        Creates a recipient-bound invitation with a seven-day setup deadline.
      </Text>
      <Form onSubmit={handleSubmit(submit)}>
        <FormSection>
          <Label labelFor={getFieldId("recipientAccountId")}>
            Recipient account ID
            <RequiredAsterisk />
          </Label>
          <Textfield {...register("recipientAccountId", { required: true })} />
          {formState.errors.recipientAccountId ? (
            <ErrorMessage>A recipient account ID is required.</ErrorMessage>
          ) : null}

          <Label labelFor={getFieldId("purpose")}>
            Purpose
            <RequiredAsterisk />
          </Label>
          <TextArea {...register("purpose", { required: true })} />
          {formState.errors.purpose ? (
            <ErrorMessage>A purpose is required.</ErrorMessage>
          ) : null}

          <Label labelFor={getFieldId("safeLabel")}>Safe label</Label>
          <Textfield {...register("safeLabel")} />
        </FormSection>
        <FormFooter>
          <Button appearance="primary" type="submit">
            Create invitation
          </Button>
        </FormFooter>
      </Form>
      {response?.status === "created" ? (
        <SectionMessage appearance="success" title="Invitation created">
          <Text>Send this URL through an existing business channel:</Text>
          <Code>{response.navigationUrl}</Code>
        </SectionMessage>
      ) : null}
      {response?.status === "blocked" ? (
        <SectionMessage appearance="warning" title="Invitation unavailable">
          <Text>Check the required fields and try again.</Text>
        </SectionMessage>
      ) : null}
    </Stack>
  );
};

/**
 * The frontend's view of the app-wide log sink. It deliberately has no secret
 * field: the resolver reports only whether one is on record, so a credential
 * cannot reach a browser even once.
 */
interface LogSinkStatus {
  readonly authMethod?: string;
  readonly hasSecret: boolean;
  readonly isConfigured: boolean;
  readonly targetUrl?: string;
}

type SaveLogSinkResponse =
  | { readonly reason: string; readonly status: "rejected" }
  | { readonly status: "saved" };

const authMethodOptions = [
  { label: "Bearer Token", name: "authMethod", value: "bearer-token" },
  {
    label: "CloudEvents HTTP Webhook Specification",
    name: "authMethod",
    value: "cloudevents-webhook",
  },
];

/**
 * Safe reasons the resolver may refuse a sink, in the administrator's words.
 * Each explains what to change without repeating the value that was rejected.
 */
const sinkRejections: Record<string, string> = {
  "log-sink-auth-method-unknown": "Choose one of the listed auth methods.",
  "log-sink-host-not-permitted":
    "That host is outside this app's permitted egress. Use a region-pinned AWS API Gateway ingest address.",
  "log-sink-request-incomplete": "Enter a sink target URL and a secret.",
  "log-sink-secret-missing": "A secret is required.",
  "log-sink-url-carries-credentials":
    "Remove the username and password from the URL. The secret belongs in the secret field.",
  "log-sink-url-not-absolute":
    "Enter an absolute URL, including the https:// scheme.",
  "log-sink-url-not-https": "The sink target URL must use https.",
  "webhook-origin-not-allowed":
    "The webhook does not allow this site as its event origin. Update its allowed origins and save again.",
  "webhook-validation-failed":
    "The webhook validation request failed. Confirm that the sink accepts HTTPS OPTIONS requests and try again.",
};

const LogSinkForm = () => {
  const [status, setStatus] = useState<LogSinkStatus>();
  const [targetUrl, setTargetUrl] = useState("");
  const [authMethod, setAuthMethod] = useState("bearer-token");
  const [secret, setSecret] = useState("");
  const [rejection, setRejection] = useState<string>();

  const load = useCallback(
    () =>
      invoke<LogSinkStatus>("getLogSink").then(
        (value) => {
          const loaded = unwrap(value);
          setStatus(loaded);
          setTargetUrl(loaded.targetUrl ?? "");
          setAuthMethod(loaded.authMethod ?? "bearer-token");
        },
        () => setStatus({ hasSecret: false, isConfigured: false }),
      ),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    const saved = await invoke<SaveLogSinkResponse>("saveLogSink", {
      authMethod,
      secret,
      targetUrl,
    }).then(
      unwrap,
      () => ({ reason: "unavailable", status: "rejected" }) as const,
    );

    if (saved.status === "rejected") {
      setRejection(
        sinkRejections[saved.reason] ??
          "The sink could not be saved. Check the fields and try again.",
      );
      return;
    }

    // The saved secret is never read back, so the field is emptied rather than
    // left holding a credential the page has no way to re-display.
    setRejection(undefined);
    setSecret("");
    await load();
  }, [authMethod, load, secret, targetUrl]);

  const reset = useCallback(async () => {
    await invoke("resetLogSink").catch(() => undefined);
    setRejection(undefined);
    setSecret("");
    await load();
  }, [load]);

  if (!status) {
    return <Text>Checking the event log sink…</Text>;
  }

  return (
    <Stack space="space.200">
      <Heading size="medium">Event log sink</Heading>
      <Text>
        Where this app ships every event it emits, audit and technical alike.
        One sink serves the whole site; it is not per-relationship. Nothing is
        delivered yet.
      </Text>
      <Lozenge appearance={status.isConfigured ? "success" : "default"}>
        {status.isConfigured ? "Sink configured" : "No sink configured"}
      </Lozenge>
      <Text>
        {status.hasSecret
          ? "A secret is on record. Saving replaces it."
          : "No secret is on record."}
      </Text>
      <FormSection>
        <Label labelFor="log-sink-url">
          Sink target URL
          <RequiredAsterisk />
        </Label>
        <Textfield
          id="log-sink-url"
          onChange={(event) => setTargetUrl(String(event.target.value ?? ""))}
          placeholder="https://ingest.execute-api.us-east-1.amazonaws.com/v1/events"
          value={targetUrl}
        />

        <Label labelFor="log-sink-secret">
          Secret
          <RequiredAsterisk />
        </Label>
        <Textfield
          id="log-sink-secret"
          onChange={(event) => setSecret(String(event.target.value ?? ""))}
          type="password"
          value={secret}
        />

        <Label labelFor="log-sink-auth-method">Auth method</Label>
        <RadioGroup
          onChange={(event) => setAuthMethod(String(event.target.value ?? ""))}
          options={authMethodOptions}
          value={authMethod}
        />
      </FormSection>
      {rejection ? <ErrorMessage>{rejection}</ErrorMessage> : null}
      <ButtonGroup>
        <Button appearance="primary" onClick={() => void save()}>
          Save sink
        </Button>
        <Button onClick={() => void reset()}>Reset sink</Button>
      </ButtonGroup>
    </Stack>
  );
};

const App = () => {
  const context = useProductContext();
  const location = context?.extension["location"];
  const view = chooseInvitationView(
    typeof location === "string" ? location : undefined,
  );

  if (view.kind === "recipient") {
    return <RecipientInvitation reference={view.reference} />;
  }

  return (
    <Stack space="space.300">
      <Heading size="large">Peer invitations</Heading>
      <Text>
        Peer invitations establish the Site relationship this app exchanges work
        packages under. Each Pairing still needs its own authorization.
      </Text>
      <InvitationForm />
      <LogSinkForm />
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
