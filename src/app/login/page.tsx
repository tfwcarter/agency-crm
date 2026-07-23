import Link from "next/link";
import { AuthForm } from "@/components/ui/auth-form";
import { loginAction } from "@/lib/actions/auth";

export default function LoginPage() {
  return (
    <AuthForm
      title="Welcome back"
      subtitle="Log in to your agency workspace"
      fields={[
        { name: "email", label: "Email", type: "email", placeholder: "you@agency.com" },
        { name: "password", label: "Password", type: "password", placeholder: "Your password" },
      ]}
      submitLabel="Log in"
      action={loginAction}
      initialState={{}}
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-brand hover:text-brand-hover">
            Sign up
          </Link>
        </>
      }
    />
  );
}
