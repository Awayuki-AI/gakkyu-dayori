import type { CSSProperties } from "react";
import type { Settings } from "../types";

export const DEFAULT_BODY_FONT_PT = 11;

export function clampFontPt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function topicBodyFontPt(section: { bodyFontPt?: number }): number {
  return clampFontPt(
    section.bodyFontPt ?? DEFAULT_BODY_FONT_PT,
    8,
    16,
    DEFAULT_BODY_FONT_PT,
  );
}

export function sheetFontStyle(settings: Settings): CSSProperties {
  return {
    "--fs-series": `${settings.fontSeriesTitlePt}pt`,
    "--fs-school": `${settings.fontSchoolLinePt}pt`,
    "--fs-issue": `${settings.fontHeaderIssuePt}pt`,
    "--fs-topic-title": `${settings.fontTopicTitlePt}pt`,
    "--fs-body": `${settings.fontAnnouncementBodyPt}pt`,
  } as CSSProperties;
}

export function topicFontStyle(section: { bodyFontPt?: number }): CSSProperties {
  return {
    "--fs-topic-body": `${topicBodyFontPt(section)}pt`,
  } as CSSProperties;
}
