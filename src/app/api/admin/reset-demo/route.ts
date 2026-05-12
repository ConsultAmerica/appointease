import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resetBusinessDemoData } from "@/lib/reset-business-demo-data";
import { checkRateLimit, csrfError, verifyCsrf } from "@/lib/security";

function resetDemoAllowed() {
  return process.env.NODE_ENV === "development" || process.env.ALLOW_ADMIN_DEMO_RESET === "true";
}

export async function POST(req: Request) {
  if (!(await verifyCsrf(req))) {
    return csrfError();
  }
  if (!resetDemoAllowed()) {
    return NextResponse.json(
      {
        error: "Reset demo is only available in development or when ALLOW_ADMIN_DEMO_RESET=true.",
      },
      { status: 403 },
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!(await checkRateLimit(`reset-demo:${ip}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many reset attempts. Try again later." }, { status: 429 });
  }

  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }
  const businessId = session.user.businessId;
  if (!businessId) {
    return NextResponse.json({ error: "Business context missing." }, { status: 400 });
  }

  if (session.user.email && !(await checkRateLimit(`reset-demo:${session.user.email}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many reset attempts for this account." }, { status: 429 });
  }

  try {
    await resetBusinessDemoData(businessId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[reset-demo]", e);
    return NextResponse.json({ error: "Reset failed." }, { status: 500 });
  }
}
