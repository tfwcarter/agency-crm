"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { signIn } from "@/auth";

const signupSchema = z.object({
  agencyName: z.string().min(2, "Agency name is required"),
  name: z.string().min(1, "Your name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const DEFAULT_STAGES = [
  { name: "New Lead", order: 0, color: "#6d5ef8" },
  { name: "Contacted", order: 1, color: "#38bdf8" },
  { name: "Qualified", order: 2, color: "#22d3ee" },
  { name: "Proposal Sent", order: 3, color: "#f59e0b" },
  { name: "Negotiating", order: 4, color: "#fb923c" },
  { name: "Won", order: 5, color: "#22c55e" },
  { name: "Lost", order: 6, color: "#ef4444" },
];

export type SignupState = { error?: string };

export async function signupAction(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    agencyName: formData.get("agencyName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { agencyName, name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return { error: "An account with that email already exists" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.organization.create({
    data: {
      name: agencyName,
      users: {
        create: {
          email: normalizedEmail,
          passwordHash,
          name,
          role: "owner",
        },
      },
      stages: {
        create: DEFAULT_STAGES,
      },
    },
  });

  await signIn("credentials", {
    email: normalizedEmail,
    password,
    redirectTo: "/dashboard",
  });

  return {};
}

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Email and password are required" };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("CredentialsSignin")) {
      return { error: "Invalid email or password" };
    }
    throw err;
  }

  return {};
}
