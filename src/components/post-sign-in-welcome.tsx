"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "appointease-welcome";

function welcomeText(kind: string): string {
  if (kind === "register") {
    return "Account created — you’re signed in. You can book appointments or open your dashboard below.";
  }
  return "You’re signed in.";
}

/**
 * One-shot banner after credentials sign-in / register (see `navigateAfterCredentialsSignIn`).
 */
export function PostSignInWelcome() {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    try {
      const kind = sessionStorage.getItem(STORAGE_KEY);
      if (!kind) return;
      sessionStorage.removeItem(STORAGE_KEY);
      setText(welcomeText(kind));
    } catch {
      /* ignore */
    }
  }, []);

  if (!text) return null;

  return (
    <div className="border-b border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm text-[color:var(--foreground)]">
      <span>{text}</span>
      <button
        type="button"
        className="ml-3 font-medium text-[color:var(--btn-secondary)] underline underline-offset-2 hover:text-[color:var(--btn-secondary)]"
        onClick={() => setText(null)}
      >
        Dismiss
      </button>
    </div>
  );
}
