/** public/ 配下のパスを、Vite の base（GitHub Pages 含む）に合わせて返す */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  const cleaned = path.replace(/^\//, "");
  return `${base}${cleaned}`;
}
