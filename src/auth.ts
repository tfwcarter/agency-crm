import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      id: "credentials",
      name: "Staff",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          organizationId: user.organizationId,
          role: user.role,
          userType: "staff" as const,
        };
      },
    }),
    Credentials({
      id: "portal-credentials",
      name: "Client Portal",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const client = await db.client.findUnique({ where: { portalEmail: email.toLowerCase() } });
        if (!client || !client.portalEnabled || !client.portalPasswordHash) return null;

        const valid = await bcrypt.compare(password, client.portalPasswordHash);
        if (!valid) return null;

        return {
          id: client.id,
          email: client.portalEmail ?? undefined,
          name: client.businessName,
          organizationId: client.organizationId,
          role: "client",
          userType: "client" as const,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.organizationId = (user as { organizationId: string }).organizationId;
        token.role = (user as { role: string }).role;
        token.userType = (user as { userType: "staff" | "client" }).userType;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.organizationId = token.organizationId as string;
        session.user.role = token.role as string;
        session.user.id = token.sub as string;
        session.user.userType = (token.userType as "staff" | "client") ?? "staff";
      }
      return session;
    },
  },
});
