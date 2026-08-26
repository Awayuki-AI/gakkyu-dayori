export type Photo = {
  id: string;
  objectUrl: string;
  name: string;
};

export type AccentSeason = "spring" | "summer" | "autumn" | "winter";

export type PhotoFit = "contain" | "cover";

export type TopicSection = {
  id: string;
  title: string;
  body: string;
  photoIds: string[];
  /** contain=全体表示（集合写真向け）, cover=枠埋め */
  photoFit: PhotoFit;
  /** このトピックの本文サイズ（pt） */
  bodyFontPt: number;
  /** card tint within the cream family */
  tone: "cream" | "peach" | "lavender";
  /** reserved; display uses heading color only (no emoji) */
  icon: string;
};

export type Announcement = {
  title: string;
  body: string;
};

export type Settings = {
  seriesTitle: string;
  schoolName: string;
  className: string;
  nextIssueNumber: number;
  /** 学校メール（Gmailでリンクを送るときの宛先。任意） */
  schoolEmail: string;
  /** Google Cloud の OAuth クライアントID（Drive保存用） */
  googleClientId: string;
  /** seasonal accent color for the header band etc. */
  accentSeason: AccentSeason;
  /** A4便りの文字サイズ（pt） */
  fontSeriesTitlePt: number;
  fontSchoolLinePt: number;
  fontHeaderIssuePt: number;
  fontTopicTitlePt: number;
  /** お知らせ枠の本文サイズ（pt） */
  fontAnnouncementBodyPt: number;
};

export type Issue = {
  date: string; // YYYY-MM-DD
  issueNumber: number;
};
