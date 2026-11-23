import { useState } from "react";

export const FIELD_MESSAGES = {
  email: "Enter a valid email address, for example anna@example.com",
  newPassword: "Use 8 to 72 characters",
  name: "Enter your name",
};

interface Issue {
  path: (string | number)[];
  message: string;
}

export interface Schema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false; error: { issues: Issue[] } };
}

export type FieldErrors = Record<string, string>;

export function fieldErrors<T>(schema: Schema<T>, values: unknown, messages: Record<string, string> = {}): FieldErrors {
  const result = schema.safeParse(values);
  if (result.success) return {};
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "form");
    errors[field] ??= messages[field] ?? issue.message;
  }
  return errors;
}

export function useFormValidation<T>(schema: Schema<T>, messages: Record<string, string>) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [checked, setChecked] = useState(false);

  return {
    errors,
    validate(values: unknown) {
      const found = fieldErrors(schema, values, messages);
      setErrors(found);
      setChecked(true);
      return Object.keys(found).length === 0;
    },
    revalidate(values: unknown) {
      if (checked) setErrors(fieldErrors(schema, values, messages));
    },
  };
}
