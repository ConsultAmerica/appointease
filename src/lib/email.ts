import nodemailer from "nodemailer";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

const fallbackFrom = "no-reply@appointmentai.local";

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; providerStatus: string }> {
  const transport = getTransport();
  if (!transport) {
    // Starter-friendly fallback so the flow works without SMTP setup.
    console.log("Email preview", input);
    return { ok: true, providerStatus: "console-preview" };
  }

  const info = await transport.sendMail({
    from: process.env.SMTP_FROM ?? fallbackFrom,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  return { ok: true, providerStatus: info.response ?? "smtp-sent" };
}
