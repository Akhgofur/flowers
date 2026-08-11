import "server-only";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { env } from "@/lib/env";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Safe for a login page: it exposes no secret or missing-variable detail. */
export function isAdminAuthConfigured(): boolean {
  try {
    void env.NEXTAUTH_SECRET;
    void env.ADMIN_EMAIL;
    void env.ADMIN_PASSWORD_HASH;
    return true;
  } catch {
    return false;
  }
}

/** Read secrets only at an authentication boundary, never during public builds. */
export function getAuthOptions(): NextAuthOptions {
  return {
    providers: [
      CredentialsProvider({
        name: "Admin credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          const email = credentials?.email;
          const password = credentials?.password;
          if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            password.length === 0 ||
            password.length > 256
          ) {
            return null;
          }

          // Always compare against the configured hash before checking the email,
          // which avoids creating a cheap email-enumeration timing distinction.
          const passwordMatches = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
          if (!passwordMatches || normalizeEmail(email) !== normalizeEmail(env.ADMIN_EMAIL)) {
            return null;
          }

          return {
            id: "nafis-admin",
            name: "Floraluxe Admin",
            email: env.ADMIN_EMAIL,
          };
        },
      }),
    ],
    session: {
      strategy: "jwt",
      maxAge: 8 * 60 * 60,
      updateAge: 60 * 60,
    },
    pages: { signIn: "/admin/login", error: "/admin/login" },
    secret: env.NEXTAUTH_SECRET,
  };
}
