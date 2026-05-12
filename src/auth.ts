import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { z } from "zod";
import authConfig from "@/auth.config";
import { logAuthEvent } from "@/lib/auth-audit";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.preprocess(
    (val) => (typeof val === "string" ? val.trim().toLowerCase() : val),
    z.string().email(),
  ),
  password: z.string().min(8),
});

async function getRequestMeta() {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? h.get("cf-connecting-ip") ?? null;
    const userAgent = h.get("user-agent");
    return { ip, userAgent };
  } catch (e) {
    console.warn("[auth] getRequestMeta failed (sign-in still proceeds)", e);
    return { ip: null, userAgent: null };
  }
}

if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET?.trim()) {
  console.error("[auth] AUTH_SECRET is required in production.");
}
if (process.env.NODE_ENV !== "production" && !process.env.AUTH_SECRET?.trim()) {
  console.warn("[auth] AUTH_SECRET is empty — set it in .env.local for reliable sessions (see .env.example).");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        const { ip, userAgent } = await getRequestMeta();

        if (!parsed.success) {
          await logAuthEvent({
            event: "LOGIN_FAILURE",
            ip,
            userAgent,
            metadata: { reason: "invalid_payload" },
          });
          return null;
        }

        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email: parsed.data.email },
          });
        } catch (err) {
          console.error("[auth] Database error during login — check DATABASE_URL and that Postgres is running.", err);
          const e = new CredentialsSignin();
          e.code = "database_unavailable";
          throw e;
        }
        if (!user) {
          await logAuthEvent({
            event: "LOGIN_FAILURE",
            email: parsed.data.email,
            ip,
            userAgent,
            metadata: { reason: "unknown_user" },
          });
          return null;
        }

        const requireEmailVerification = process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true";
        if (!user.emailVerifiedAt && requireEmailVerification) {
          await logAuthEvent({
            event: "LOGIN_FAILURE",
            userId: user.id,
            email: user.email,
            ip,
            userAgent,
            metadata: { reason: "email_unverified" },
          });
          return null;
        }

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!isValid) {
          await logAuthEvent({
            event: "LOGIN_FAILURE",
            userId: user.id,
            email: user.email,
            ip,
            userAgent,
            metadata: { reason: "bad_password" },
          });
          return null;
        }

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: user.role,
          businessId: user.businessId,
        };
      },
    }),
  ],
  events: {
    signIn: async ({ user }) => {
      const { ip, userAgent } = await getRequestMeta();
      await logAuthEvent({
        event: "LOGIN_SUCCESS",
        userId: user.id,
        email: user.email ?? undefined,
        ip,
        userAgent,
      });
    },
    signOut: async (message) => {
      const { ip, userAgent } = await getRequestMeta();
      if ("token" in message && message.token?.sub) {
        await logAuthEvent({
          event: "LOGOUT",
          userId: message.token.sub,
          ip,
          userAgent,
        });
      }
    },
  },
});
