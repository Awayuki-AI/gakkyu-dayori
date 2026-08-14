export type Photo = {
  id: string;
  objectUrl: string;
  name: string;
};

export type AccentSeason = "spring" | "summer" | "autumn" | "winter";

export type TopicSection = {
  id: string;
  title: string;
  body: string;
  photoIds: string[];
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
  /** seasonal accent color for the header band etc. */
  accentSeason: AccentSeason;
};

export type Issue = {
  date: string; // YYYY-MM-DD
  issueNumber: number;
};
