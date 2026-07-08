import type { AppSettings } from "../domain/types";
import { appSettingsSchema } from "../domain/schemas";

const SETTINGS_KEY = "germany-path-finder:ai-settings";

export const defaultSettings: AppSettings = {
  providerId: "custom",
  providerName: "OpenAI-compatible",
  endpoint: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
};

export const providerPresets = {
  custom: {
    providerId: "custom",
    providerName: "OpenAI-compatible custom",
    endpoint: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    disabled: false,
  },
  gemini: {
    providerId: "gemini",
    providerName: "Gemini API",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/",
    model: "gemini-3.5-flash",
    disabled: false,
  },
  openai: {
    providerId: "openai",
    providerName: "OpenAI",
    endpoint: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    disabled: false,
  },
  anthropic: {
    providerId: "anthropic",
    providerName: "Anthropic",
    endpoint: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4-5",
    disabled: true,
  },
} satisfies Record<AppSettings["providerId"], Omit<AppSettings, "apiKey"> & { disabled: boolean }>;

export function loadSettings(): AppSettings {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings;

  try {
    return appSettingsSchema.parse(JSON.parse(raw));
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function hasUsableAiSettings(settings: AppSettings) {
  return Boolean(settings.endpoint.trim() && settings.apiKey.trim() && settings.model.trim());
}
