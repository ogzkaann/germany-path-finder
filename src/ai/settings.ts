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

export function normalizeSettings(settings: AppSettings): AppSettings {
  const preset = providerPresets[settings.providerId];
  const normalized: AppSettings = {
    ...settings,
    providerName: settings.providerName.trim() || preset.providerName,
    endpoint: settings.endpoint.trim() || preset.endpoint,
    apiKey: settings.apiKey.trim(),
    model: settings.model.trim() || preset.model,
  };

  if (settings.providerId === "gemini") {
    return {
      ...normalized,
      providerName: preset.providerName,
      endpoint: preset.endpoint,
    };
  }

  return normalized;
}

export function loadSettings(): AppSettings {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings;

  try {
    return normalizeSettings(appSettingsSchema.parse(JSON.parse(raw)));
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
}

export function hasUsableAiSettings(settings: AppSettings) {
  const normalized = normalizeSettings(settings);
  return Boolean(normalized.endpoint && normalized.apiKey && normalized.model);
}
