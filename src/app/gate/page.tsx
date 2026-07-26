import { redirect } from "next/navigation";
import { isGateEnabled } from "@/lib/site-gate";
import { unlockGateAction } from "./actions";
import { GateScreen } from "@/components/gate/gate-screen";

export const metadata = { title: "Enter — Shepherds" };

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  // Gate disabled (no SITE_GATE_PASSWORD set) → nothing to guard.
  if (!isGateEnabled()) redirect("/");

  const { error, next } = await searchParams;
  return <GateScreen action={unlockGateAction} error={error === "1"} next={next ?? "/"} />;
}
