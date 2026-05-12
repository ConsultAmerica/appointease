export type ChatMsg = { role?: string; content?: unknown };

function asMsgs(raw: unknown): ChatMsg[] {
  if (!Array.isArray(raw)) return [];
  return raw as ChatMsg[];
}

function textContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (
    content &&
    typeof content === "object" &&
    "text" in content &&
    typeof (content as { text?: unknown }).text === "string"
  ) {
    return (content as { text: string }).text;
  }
  return "";
}

export function lastUserUtterance(messages: unknown): string | null {
  const arr = asMsgs(messages);
  for (let i = arr.length - 1; i >= 0; i -= 1) {
    if (arr[i]?.role === "user") {
      const t = textContent(arr[i]?.content).trim();
      if (t) return t;
    }
  }
  return null;
}

function stripDemoPrefix(reply: string) {
  return reply.replace(/^\[(demo-booking-flow|demo-agent)\]\s*/i, "").trim();
}

export function summarizeAgentLogReply(reply: string): {
  displayReply: string;
  actionLabel: string;
  statusLabel: string;
} {
  const trimmed = reply.trim();
  const displayReply = stripDemoPrefix(trimmed);

  if (/^\[demo-booking-flow\]/i.test(trimmed)) {
    if (/confirmed/i.test(displayReply) && /booked/i.test(displayReply)) {
      return {
        displayReply,
        actionLabel: "Recorded booking (demo flow)",
        statusLabel: "Signed-in customers sync a real PENDING row when they confirm in chat.",
      };
    }
    if (/please confirm/i.test(displayReply)) {
      return {
        displayReply,
        actionLabel: "Asked for confirmation",
        statusLabel: "Demo scripted flow — no database change until the customer confirms.",
      };
    }
    return {
      displayReply,
      actionLabel: "Demo booking assistant step",
      statusLabel: "Scripted demo path (no OpenAI).",
    };
  }

  if (/^\[demo-agent\]/i.test(trimmed)) {
    return {
      displayReply,
      actionLabel: "Demo assistant reply",
      statusLabel: "Sample response — no tools or database writes in this turn.",
    };
  }

  return {
    displayReply: trimmed,
    actionLabel: "Assistant reply",
    statusLabel: "See technical details for the full message payload.",
  };
}
