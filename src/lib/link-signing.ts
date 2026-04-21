import crypto from "crypto";

/**
 * HMAC-SHA256 over the raw URL token so links cannot be tampered with without the secret.
 * Uses LINK_SIGNING_SECRET if set, otherwise AUTH_SECRET.
 */
export function signUrlToken(rawToken: string): string {
  const secret = process.env.LINK_SIGNING_SECRET ?? process.env.AUTH_SECRET ?? "";
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(`url-token:${rawToken}`).digest("hex");
}

export function verifyUrlTokenSignature(rawToken: string, signature: string | null | undefined): boolean {
  if (!signature) return false;
  const expected = signUrlToken(rawToken);
  if (!expected) return false;
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function signingSecretConfigured(): boolean {
  return Boolean(process.env.LINK_SIGNING_SECRET ?? process.env.AUTH_SECRET);
}

export function requireSignedEmailLinks(): boolean {
  return process.env.REQUIRE_SIGNED_EMAIL_LINKS === "true";
}
