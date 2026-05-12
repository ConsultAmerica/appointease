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
    <div className="border-b border-teal-200 bg-teal-50 px-4 py-3 text-center text-sm text-teal-950">
      <span>{text}</span>
      <button
        type="button"
        className="ml-3 font-medium text-teal-800 underline underline-offset-2 hover:text-teal-900"
        onClick={() => setText(null)}
      >
        Dismiss
      </button>
    </div>
  );
}
