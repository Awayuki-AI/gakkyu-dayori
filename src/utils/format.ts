/** Split photos into rows of up to 3 (no empty slots). */
export function chunkPhotos<T>(items: T[], size = 3): T[][] {
  if (items.length === 0) return [];
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Convert YYYY-MM-DD to 令和表記（ざっくり: 2019=元年）. */
export function formatWareki(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const reiwa = y - 2018;
  return `令和${reiwa === 1 ? "元" : reiwa}年 ${m}月${d}日`;
}
