import type {
  AccentSeason,
  Announcement,
  Issue,
  Settings,
  TopicSection,
} from "../types";

type Props = {
  settings: Settings;
  issue: Issue;
  sections: TopicSection[];
  includeAnnouncement: boolean;
  announcement: Announcement;
  onSettingsChange: (next: Settings) => void;
  onIssueChange: (next: Issue) => void;
  onSectionChange: (id: string, patch: Partial<TopicSection>) => void;
  onAddSection: () => void;
  onRemoveSection: (id: string) => void;
  onToggleAnnouncement: (on: boolean) => void;
  onAnnouncementChange: (next: Announcement) => void;
  onAddPhotos: (files: FileList | File[], sectionId: string) => void;
  onRemovePhoto: (sectionId: string, photoId: string) => void;
  onExportPdf: () => void;
  exporting: boolean;
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-[#c5d3de] bg-white px-2.5 py-2 text-[0.9rem] text-ink outline-none focus:border-[#3b82c4]";
const labelClass = "mb-2.5 block text-[0.82rem] text-muted";

export function EditorPanel({
  settings,
  issue,
  sections,
  includeAnnouncement,
  announcement,
  onSettingsChange,
  onIssueChange,
  onSectionChange,
  onAddSection,
  onRemoveSection,
  onToggleAnnouncement,
  onAnnouncementChange,
  onAddPhotos,
  onRemovePhoto,
  onExportPdf,
  exporting,
}: Props) {
  return (
    <aside className="flex flex-col gap-3 overflow-auto border-r border-[#c5d3de] bg-white px-4 pb-8 pt-4">
      <div>
        <h1 className="m-0 font-heading text-xl font-bold text-[#3b82c4]">
          学級便り
        </h1>
        <p className="mb-3 mt-1.5 text-[0.85rem] text-muted">
          写真は端末内だけで処理します。外部には送りません。
        </p>
        <button
          type="button"
          onClick={onExportPdf}
          disabled={exporting}
          className="w-full rounded-full bg-[#3b82c4] px-4 py-2.5 font-bold text-white enabled:hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
        >
          {exporting ? "PDF作成中…" : "PDFをダウンロード"}
        </button>
      </div>

      <details className="rounded-xl border border-[#c5d3de] bg-[#f3f6f8] p-3" open>
        <summary className="mb-2 cursor-pointer font-heading font-bold text-[#3b82c4]">
          ヘッダー・設定
        </summary>
        <label className={labelClass}>
          シリーズ名
          <input
            className={fieldClass}
            value={settings.seriesTitle}
            onChange={(e) =>
              onSettingsChange({ ...settings, seriesTitle: e.target.value })
            }
          />
        </label>
        <label className={labelClass}>
          学校名
          <input
            className={fieldClass}
            value={settings.schoolName}
            onChange={(e) =>
              onSettingsChange({ ...settings, schoolName: e.target.value })
            }
          />
        </label>
        <label className={labelClass}>
          学級名
          <input
            className={fieldClass}
            value={settings.className}
            onChange={(e) =>
              onSettingsChange({ ...settings, className: e.target.value })
            }
          />
        </label>
        <label className={labelClass}>
          日付
          <input
            className={fieldClass}
            type="date"
            value={issue.date}
            onChange={(e) => onIssueChange({ ...issue, date: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          号数
          <input
            className={fieldClass}
            type="number"
            min={1}
            value={issue.issueNumber}
            onChange={(e) =>
              onIssueChange({
                ...issue,
                issueNumber: Number(e.target.value) || 1,
              })
            }
          />
        </label>
        <label className={labelClass}>
          季節アクセント
          <select
            className={fieldClass}
            value={settings.accentSeason}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                accentSeason: e.target.value as AccentSeason,
              })
            }
          >
            <option value="spring">春（水色ポップ）</option>
            <option value="summer">夏（みどりみずいろ）</option>
            <option value="autumn">秋（あたたかグレー）</option>
            <option value="winter">冬（ブルーグレー）</option>
          </select>
        </label>
        <p className="m-0 text-xs text-muted">
          学校名・学級名・シリーズ名・季節はブラウザに保存。号数はPDF出力後に+1されます。
        </p>
      </details>

      {sections.map((section, index) => (
        <details
          key={section.id}
          className="rounded-xl border border-[#c5d3de] bg-[#f3f6f8] p-3"
          open={index === 0}
        >
          <summary className="mb-2 cursor-pointer font-heading font-bold text-[#3b82c4]">
            トピック {index + 1}
          </summary>
          <label className={labelClass}>
            見出し
            <input
              className={fieldClass}
              value={section.title}
              onChange={(e) =>
                onSectionChange(section.id, { title: e.target.value })
              }
              placeholder="例: 理科の実験！"
            />
          </label>
          <label className={labelClass}>
            本文
            <textarea
              className={`${fieldClass} resize-y`}
              rows={4}
              value={section.body}
              onChange={(e) =>
                onSectionChange(section.id, { body: e.target.value })
              }
              placeholder="保護者向けの短い説明"
            />
          </label>
          <label className={labelClass}>
            カード色味
            <select
              className={fieldClass}
              value={section.tone}
              onChange={(e) =>
                onSectionChange(section.id, {
                  tone: e.target.value as TopicSection["tone"],
                })
              }
            >
              <option value="cream">グレー（テンプレ上段）</option>
              <option value="lavender">ミント（テンプレ下段）</option>
              <option value="peach">ベージュ</option>
            </select>
          </label>
          <label className={labelClass}>
            写真を追加（複数可）
            <input
              className="mt-1 block w-full text-sm"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files?.length) {
                  onAddPhotos(e.target.files, section.id);
                  e.target.value = "";
                }
              }}
            />
          </label>
          {section.photoIds.length > 0 && (
            <ul className="mb-2 flex list-none flex-col gap-1.5 p-0">
              {section.photoIds.map((id) => (
                <li
                  key={id}
                  className="flex items-center justify-between rounded-lg border border-[#c5d3de] bg-white px-2 py-1 text-[0.8rem]"
                >
                  <span>写真 {id.slice(-4)}</span>
                  <button
                    type="button"
                    className="rounded-full border border-[#c5d3de] px-2 py-0.5 text-xs hover:border-[#3b82c4]"
                    onClick={() => onRemovePhoto(section.id, id)}
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="m-0 text-xs text-muted">
            プレビュー上で写真をドラッグすると並べ替えできます。
          </p>
          {sections.length > 1 && (
            <button
              type="button"
              className="mt-2 w-full rounded-full border border-red-200 px-3 py-2 text-[#a55] hover:bg-red-50"
              onClick={() => onRemoveSection(section.id)}
            >
              このトピックを削除
            </button>
          )}
        </details>
      ))}

      <button
        type="button"
        className="rounded-full border border-[#c5d3de] bg-white px-4 py-2 hover:border-[#3b82c4]"
        onClick={onAddSection}
      >
        トピックを追加
      </button>

      <details className="rounded-xl border border-[#c5d3de] bg-[#f3f6f8] p-3" open>
        <summary className="mb-2 cursor-pointer font-heading font-bold text-[#3b82c4]">
          お知らせ（任意）
        </summary>
        <label className="mb-2.5 flex items-center gap-2 text-[0.82rem] text-muted">
          <input
            type="checkbox"
            checked={includeAnnouncement}
            onChange={(e) => onToggleAnnouncement(e.target.checked)}
          />
          お知らせ枠を入れる
        </label>
        {includeAnnouncement && (
          <>
            <label className={labelClass}>
              見出し
              <input
                className={fieldClass}
                value={announcement.title}
                onChange={(e) =>
                  onAnnouncementChange({
                    ...announcement,
                    title: e.target.value,
                  })
                }
              />
            </label>
            <label className={labelClass}>
              本文
              <textarea
                className={`${fieldClass} resize-y`}
                rows={3}
                value={announcement.body}
                onChange={(e) =>
                  onAnnouncementChange({
                    ...announcement,
                    body: e.target.value,
                  })
                }
              />
            </label>
          </>
        )}
      </details>
    </aside>
  );
}
