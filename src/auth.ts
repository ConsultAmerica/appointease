import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { z } from "zod";
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
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? h.get("cf-connecting-ip") ?? null;
  const userAgent = h.get("user-agent");
  return { ip, userAgent };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  /**
   * Required when opening the app via LAN IP, tunnels, or any host other than localhost.
   * Set AUTH_URL in .env to match how you open the site (e.g. http://192.168.1.10:3000).
   */
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
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
          return null;
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
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as { role: string }).role;
        token.businessId = (user as { businessId: string | null }).businessId;
        token.name = user.name ?? null;
        token.email = user.email ?? null;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as "ADMIN" | "STAFF" | "CUSTOMER") ?? "CUSTOMER";
        session.user.businessId = (token.businessId as string | null) ?? null;
        session.user.name = (token.name as string | undefined) ?? session.user.name;
        session.user.email = (token.email as string | undefined) ?? session.user.email;
      }
      return session;
    },
  },
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
  pages: {
    signIn: "/auth/login",
  },
});
