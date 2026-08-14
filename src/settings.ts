import type { Settings } from "./types";

const STORAGE_KEY = "gakkyu-dayori-settings-v1";

export const defaultSettings: Settings = {
  seriesTitle: "らしさ",
  schoolName: "大島小学校",
  className: "6年1組",
  nextIssueNumber: 1,
  accentSeason: "spring",
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultSettings };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...defaultSettings, ...parsed };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
