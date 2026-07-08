import type { AppSettings } from "../domain/types";
import { hasUsableAiSettings, normalizeSettings } from "./settings";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function chatCompletionsUrl(endpoint: string) {
  const clean = endpoint.replace(/\/+$/, "");
  if (clean.endsWith("/chat/completions")) return clean;
  return `${clean}/chat/completions`;
}

export async function callOpenAICompatible(settings: AppSettings, messages: ChatMessage[]) {
  const requestSettings = normalizeSettings(settings);

  if (!hasUsableAiSettings(requestSettings)) {
    throw new Error("AI settings are incomplete.");
  }

  const response = await fetch(chatCompletionsUrl(requestSettings.endpoint), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requestSettings.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: requestSettings.model,
      messages,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Provider returned ${response.status}: ${text.slice(0, 240)}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Provider response did not include a message.");
  }

  return content;
}

export async function testAiConnection(settings: AppSettings) {
  const content = await callOpenAICompatible(settings, [
    {
      role: "system",
      content: "Reply with exactly: OK",
    },
    {
      role: "user",
      content: "Connection test.",
    },
  ]);

  return content.trim().length > 0;
}
