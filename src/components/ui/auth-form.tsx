"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LogoLockup } from "@/components/brand-mark";

type Field = {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
};

type AuthState = { error?: string };

export function AuthForm({
  title,
  subtitle,
  fields,
  submitLabel,
  action,
  initialState,
  footer,
}: {
  title: string;
  subtitle: string;
  fields: Field[];
  submitLabel: string;
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  initialState: AuthState;
  footer: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, initialState);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-5 flex justify-center">
            <LogoLockup height={34} />
          </div>
          <h1 className="text-xl font-semibold text-fg">{title}</h1>
          <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>
        </div>

        <form action={formAction} className="space-y-4 rounded-card border border-border bg-surface p-6">
          {fields.map((field) => (
            <div key={field.name}>
              <label htmlFor={field.name} className="mb-1.5 block text-xs font-medium text-fg-muted">
                {field.label}
              </label>
              <input
                id={field.name}
                name={field.name}
                type={field.type}
                placeholder={field.placeholder}
                required
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-brand transition-colors"
              />
            </div>
          ))}

          {state.error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-fg transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {pending ? "Please wait…" : submitLabel}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-fg-muted">{footer}</p>
      </div>
    </div>
  );
}

export { Link };
