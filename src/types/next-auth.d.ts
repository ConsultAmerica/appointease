import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: "ADMIN" | "STAFF" | "CUSTOMER";
      businessId: string | null;
    };
  }

  interface User {
    role: "ADMIN" | "STAFF" | "CUSTOMER";
    businessId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    businessId?: string | null;
    name?: string | null;
    email?: string | null;
  }
}
