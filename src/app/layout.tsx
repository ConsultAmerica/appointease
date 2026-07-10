import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DatabaseAlert } from "@/components/database-alert";
import { PostSignInWelcome } from "@/components/post-sign-in-welcome";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { auth } from "@/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
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
