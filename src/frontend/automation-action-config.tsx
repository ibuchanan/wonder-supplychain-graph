import { invoke, view } from "@forge/bridge";
import ForgeReconciler, {
  ErrorMessage,
  Form,
  HelperMessage,
  Label,
  RequiredAsterisk,
  Stack,
  Text,
  Textfield,
  useForm,
  useProductContext,
} from "@forge/react";
import React, { useEffect } from "react";

interface ConfigField {
  readonly defaultValue?: string;
  readonly description: string;
  readonly label: string;
  readonly name: string;
}

type FormValues = Record<string, string>;

function defaultValues(fields: readonly ConfigField[]): FormValues {
  return Object.fromEntries(
    fields.map((field) => [field.name, field.defaultValue ?? ""]),
  );
}

function AutomationActionConfig({
  fields,
  title,
}: {
  readonly fields: readonly ConfigField[];
  readonly title: string;
}) {
  const context = useProductContext();
  const { data: extensionData } = context?.extension ?? {};
  const savedInputs = (extensionData?.inputs ?? {}) as FormValues;
  const { formState, getValues, handleSubmit, register } = useForm({
    defaultValues: { ...defaultValues(fields), ...savedInputs },
  });

  useEffect(() => {
    void invoke("getActionConfigStatus");
  }, []);

  const submitChange = (input: Partial<FormValues>) => {
    void view.submit({ ...getValues(), ...input });
  };

  if (!context) {
    return <Text>Loading action configuration…</Text>;
  }

  return (
    <Form onSubmit={handleSubmit((values) => void view.submit(values))}>
      <Stack space="space.200">
        <Text>{title}</Text>
        {fields.map((field) => {
          const input = register(field.name, {
            required: { message: `${field.label} is required`, value: true },
          });
          const error = formState.errors[field.name]?.message;

          return (
            <Stack key={field.name} space="space.050">
              <Label labelFor={input.id}>
                {field.label}
                <RequiredAsterisk />
              </Label>
              <Textfield
                {...input}
                onChange={(event) => {
                  input.onChange(event);
                  submitChange({ [field.name]: event.target.value });
                }}
              />
              <HelperMessage>{field.description}</HelperMessage>
              {error && <ErrorMessage>{String(error)}</ErrorMessage>}
            </Stack>
          );
        })}
      </Stack>
    </Form>
  );
}

export function renderAutomationActionConfig({
  fields,
  title,
}: {
  readonly fields: readonly ConfigField[];
  readonly title: string;
}) {
  ForgeReconciler.render(
    <React.StrictMode>
      <AutomationActionConfig fields={fields} title={title} />
    </React.StrictMode>,
  );
}
