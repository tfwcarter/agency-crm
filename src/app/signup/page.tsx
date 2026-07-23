import Link from "next/link";
import { AuthForm } from "@/components/ui/auth-form";
import { signupAction } from "@/lib/actions/auth";

export default function SignupPage() {
  return (
    <AuthForm
      title="Create your agency"
      subtitle="Set up your workspace in under a minute"
      fields={[
        { name: "agencyName", label: "Agency name", type: "text", placeholder: "Acme Marketing Co." },
        { name: "name", label: "Your name", type: "text", placeholder: "Jane Smith" },
        { name: "email", label: "Email", type: "email", placeholder: "you@agency.com" },
        { name: "password", label: "Password", type: "password", placeholder: "At least 8 characters" },
      ]}
      submitLabel="Create account"
      action={signupAction}
      initialState={{}}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-brand hover:text-brand-hover">
            Log in
          </Link>
        </>
      }
    />
  );
}
