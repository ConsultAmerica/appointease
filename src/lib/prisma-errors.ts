/**
 * Maps Prisma / driver failures to a single user-visible sentence (no secrets).
 */
export function describeDatabaseLoadFailure(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes("channel_binding") || lower.includes("sasl")) {
    return "Database login failed (often due to channel binding). In Neon, copy a connection string without “channel_binding=require”, or use the “Transaction” pooler URL, update DATABASE_URL in Vercel, then redeploy.";
  }

  if (err instanceof Error && err.name === "PrismaClientInitializationError") {
    return "Could not open a database connection. Set DATABASE_URL in Vercel → Settings → Environment Variables (Production), use your host’s pooled Postgres URL if offered, redeploy, then try again.";
  }

  const code =
    err && typeof err === "object" && "code" in err && typeof (err as { code: unknown }).code === "string"
      ? (err as { code: string }).code
      : null;

  if (code === "P1001") {
    return "Cannot reach the database server. Confirm the host name in DATABASE_URL, that Neon (or your provider) is running, and that firewalls allow this connection.";
  }
  if (code === "P1000") {
    return "Database authentication failed. Check the user and password in DATABASE_URL.";
  }
  if (code === "P1017" || lower.includes("server closed the connection")) {
    return "The database closed the connection. Try a pooled connection string (Neon “pooler” host) and add connect_timeout if your provider recommends it.";
  }

  if (
    code === "P2021" ||
    code === "P2022" ||
    lower.includes("does not exist") ||
    (lower.includes("column") && lower.includes("does not exist")) ||
    (lower.includes("relation") && lower.includes("not exist"))
  ) {
    return "Database schema is out of date. Run: npx prisma migrate deploy (with production DATABASE_URL), or redeploy after setting DATABASE_URL on Vercel so migrations run at build time.";
  }

  if (lower.includes("self signed certificate") || lower.includes("certificate")) {
    return "TLS/certificate error talking to the database. Use the connection string your provider gives for serverless (usually with sslmode=require).";
  }

  return "Could not load businesses. The database may be unavailable or DATABASE_URL may be missing or incorrect for this environment.";
}
