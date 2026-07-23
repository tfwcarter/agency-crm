import { AuthForm } from "@/components/ui/auth-form";
import { portalLoginAction } from "@/lib/actions/client-portal";

export default function PortalLoginPage() {
  return (
    <AuthForm
      title="Client Portal"
      subtitle="Log in to view your projects, invoices, and files"
      fields={[
        { name: "email", label: "Email", type: "email", placeholder: "you@yourbusiness.com" },
        { name: "password", label: "Password", type: "password", placeholder: "Your password" },
      ]}
      submitLabel="Log in"
      action={portalLoginAction}
      initialState={{}}
      footer={<span className="text-fg-subtle">Access is provided by your agency — contact them if you need a login.</span>}
    />
  );
}
