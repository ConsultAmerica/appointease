/** Whether OpenAI is configured for live agent tools. */
export function openaiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * Scripted demo agent when OpenAI is unset.
 * Enabled by default (dev + production) unless explicitly disabled.
 */
export function demoAgentEnabled(): boolean {
  if (openaiConfigured()) return false;
  if (process.env.DISABLE_DEMO_AGENT === "true") return false;
  if (process.env.ALLOW_DEMO_AGENT === "false") return false;
  return true;
}

/** live = OpenAI tools; demo = scripted replies; off = chat disabled */
export function resolveChatMode(): "live" | "demo" | "off" {
  if (openaiConfigured()) return "live";
  if (demoAgentEnabled()) return "demo";
  return "off";
}
