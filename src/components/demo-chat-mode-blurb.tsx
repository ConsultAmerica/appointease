import Link from "next/link";

const tones = {
  banner: {
    link: "font-medium text-[color:var(--btn-secondary)] underline underline-offset-2",
    code: "rounded bg-blue-100 px-1 py-0.5 text-xs",
  },
  page: {
    link: "font-medium text-[color:var(--btn-secondary)] underline-offset-2 hover:underline",
    code: "rounded bg-slate-100 px-1 py-0.5 text-xs",
  },
  /** Admin-only strip: neutral, small type. */
  admin: {
    link: "font-medium text-slate-800 underline underline-offset-2 hover:text-slate-950",
    code: "rounded border border-slate-200 bg-surface px-1 py-0.5 font-mono text-[10px] text-slate-800",
  },
} as const;

/**
 * Canonical copy when /chat runs without OPENAI_API_KEY (demo scripted replies).
 * Keep in sync with `.env.example` comments.
 */
export function DemoChatModeBlurb({ tone }: { tone: keyof typeof tones }) {
  const t = tones[tone];
  return (
    <>
      <strong className="font-semibold">AI chat: demo mode.</strong> No <code className={t.code}>OPENAI_API_KEY</code>{" "}
      is set, so <strong>/chat</strong> uses free scripted replies (no OpenAI bill).{" "}
      <Link href="/book" className={t.link}>
        Step-by-step /book
      </Link>{" "}
      still uses your database only. Add a key in <code className={t.code}>.env.local</code> when you want live tools
      in chat (
      <a
        href="https://platform.openai.com/api-keys"
        className={t.link}
        target="_blank"
        rel="noopener noreferrer"
      >
        API keys
      </a>
      ).
    </>
  );
}
