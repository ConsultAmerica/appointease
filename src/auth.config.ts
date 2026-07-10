import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth options (no Prisma / bcrypt / DB). Used by `proxy.ts` (Next.js 16 edge auth).
 * Full credentials + DB live in `auth.ts` for API routes and `authorize`.
 */
export default {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [],
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
  pages: {
    signIn: "/auth/login",
  },
} satisfies NextAuthConfig;
