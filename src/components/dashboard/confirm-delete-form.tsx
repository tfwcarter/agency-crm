"use client";

// Wraps a server-action form with a native confirm() guard — used anywhere a
// button triggers a permanent delete, so a stray click can't wipe a record.
export function ConfirmDeleteForm({
  action,
  confirmText,
  children,
}: {
  action: () => void | Promise<void>;
  confirmText: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
