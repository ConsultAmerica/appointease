import { signUrlToken } from "@/lib/link-signing";

function layout(params: { title: string; inner: string; footer?: string }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;background:#f9fafb;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#1e40af;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:600;">AppointmentAI</td>
          </tr>
          <tr>
            <td style="padding:24px;color:#111827;font-size:15px;line-height:1.6;">
              <h1 style="margin:0 0 12px;font-size:20px;">${params.title}</h1>
              ${params.inner}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px;color:#64748b;font-size:12px;border-top:1px solid #e5e7eb;">
              ${params.footer ?? "This message was sent by AppointmentAI."}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildVerifyUrl(appUrl: string, rawToken: string): string {
  const base = `${appUrl.replace(/\/$/, "")}/auth/verify-email`;
  const q = new URLSearchParams({ token: rawToken });
  const sig = signUrlToken(rawToken);
  if (sig) q.set("sig", sig);
  return `${base}?${q.toString()}`;
}

function buildResetUrl(appUrl: string, rawToken: string): string {
  const base = `${appUrl.replace(/\/$/, "")}/auth/reset-password`;
  const q = new URLSearchParams({ token: rawToken });
  const sig = signUrlToken(rawToken);
  if (sig) q.set("sig", sig);
  return `${base}?${q.toString()}`;
}

export function verificationEmailHtml(params: { appUrl: string; verifyToken: string; recipientName?: string }) {
  const href = buildVerifyUrl(params.appUrl, params.verifyToken);
  const inner = `
    <p style="margin:0 0 16px;">${params.recipientName ? `Hi ${params.recipientName},` : "Hello,"}</p>
    <p style="margin:0 0 16px;">Confirm your email address to activate your AppointmentAI account.</p>
    <p style="margin:0 0 16px;">
      <a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Verify email</a>
    </p>
    <p style="margin:0;color:#64748b;font-size:13px;">If the button does not work, paste this link into your browser:<br/><span style="word-break:break-all;">${href}</span></p>`;
  return layout({
    title: "Verify your email",
    inner,
    footer: "If you did not create an account, you can ignore this email.",
  });
}

export function passwordResetEmailHtml(params: { appUrl: string; resetToken: string }) {
  const href = buildResetUrl(params.appUrl, params.resetToken);
  const inner = `
    <p style="margin:0 0 16px;">We received a request to reset your password.</p>
    <p style="margin:0 0 16px;">
      <a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Reset password</a>
    </p>
    <p style="margin:0;color:#64748b;font-size:13px;">This link expires in 1 hour. If you did not request a reset, ignore this email.</p>`;
  return layout({
    title: "Reset your password",
    inner,
  });
}

export function resendVerificationEmailHtml(params: { appUrl: string; verifyToken: string; recipientName?: string }) {
  return verificationEmailHtml(params);
}

export function bookingRequestReceivedHtml(params: {
  businessName: string;
  serviceName: string;
  customerName: string;
  startAtLabel: string;
  appUrl: string;
}) {
  const inner = `
    <p style="margin:0 0 16px;">Hi ${params.customerName},</p>
    <p style="margin:0 0 16px;">Your booking request for <strong>${params.serviceName}</strong> at <strong>${params.businessName}</strong> on <strong>${params.startAtLabel}</strong> has been received.</p>
    <p style="margin:0 0 16px;">Status: <strong>Pending confirmation</strong>. You will receive another email when the business confirms.</p>
    <p style="margin:0;color:#64748b;font-size:13px;">Book more appointments anytime: <a href="${params.appUrl}/book">${params.appUrl}/book</a></p>`;
  return layout({
    title: "Booking request received",
    inner,
  });
}
