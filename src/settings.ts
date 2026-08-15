import type { Settings } from "./types";
import { envClientId, isLikelyGoogleClientId } from "./utils/google-drive";

const STORAGE_KEY = "gakkyu-dayori-settings-v1";

export const defaultSettings: Settings = {
  seriesTitle: "らしさ",
  schoolName: "大島小学校",
  className: "6年1組",
  nextIssueNumber: 1,
  schoolEmail: "",
  googleClientId: "",
  accentSeason: "spring",
};

export function loadSettings(): Settings {
  const envId = envClientId();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as Partial<Settings>)
      : ({} as Partial<Settings>);
    const merged = { ...defaultSettings, ...parsed };
    if (!isLikelyGoogleClientId(merged.googleClientId) && envId) {
      merged.googleClientId = envId;
    }
    return merged;
  } catch {
    return {
      ...defaultSettings,
      googleClientId: envId,
    };
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
