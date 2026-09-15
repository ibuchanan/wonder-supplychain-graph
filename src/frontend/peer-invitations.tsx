import { invoke, router } from "@forge/bridge";
import ForgeReconciler, {
  Button,
  Code,
  ErrorMessage,
  Form,
  FormFooter,
  FormSection,
  Heading,
  Label,
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
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
