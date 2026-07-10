import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { DatabaseAlert } from "@/components/database-alert";
import { PostSignInWelcome } from "@/components/post-sign-in-welcome";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { auth } from "@/auth";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AppointmentAI — Multi-clinic scheduling",
  description: "Guest booking, admin dashboards, and optional AI — built on Next.js and PostgreSQL.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 font-sans text-slate-900">
        <Providers session={session}>
          <SiteHeader session={session} />
          <DatabaseAlert />
          <PostSignInWelcome />
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter session={session} />
        </Providers>
      </body>
    </html>
  );
}
