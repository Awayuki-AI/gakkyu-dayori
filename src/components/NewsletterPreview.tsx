import type { Announcement, Issue, Photo, Settings, TopicSection } from "../types";
import { chunkPhotos, formatWareki } from "../utils/format";

type Props = {
  settings: Settings;
  issue: Issue;
  sections: TopicSection[];
  photos: Record<string, Photo>;
  announcement: Announcement | null;
  includeAnnouncement: boolean;
  draggingPhotoId: string | null;
  onDragStart: (photoId: string, sectionId: string) => void;
  onDropOnSection: (sectionId: string, targetPhotoId: string | null) => void;
  onAddPhotos: (files: FileList | File[], sectionId: string) => void;
};

export function NewsletterPreview({
  settings,
  issue,
  sections,
  photos,
  announcement,
  includeAnnouncement,
  draggingPhotoId,
  onDragStart,
  onDropOnSection,
  onAddPhotos,
}: Props) {
  const showAnnouncement =
    includeAnnouncement &&
    Boolean(announcement && (announcement.title.trim() || announcement.body.trim()));

  const dateParts = formatWareki(issue.date).split(/\s+/);
  const warekiYear = dateParts[0] ?? "";
  const warekiDay = dateParts.slice(1).join("") || formatWareki(issue.date);

  return (
    <article
      className="sheet"
      data-accent={settings.accentSeason}
      aria-label="学級便りプレビュー"
    >
      <div className="sheet-inner">
        <header className="sheet-header">
          <div className="header-top">
            <div className="paperclips" aria-hidden="true">
              <img
                className="paperclips-img"
                src="/paperclips.png"
                alt=""
              />
            </div>
            <div className="header-center">
              <h1 className="series-title">{settings.seriesTitle}</h1>
              <hr className="header-rule" />
              <p className="school-line">
                {settings.schoolName} {settings.className} 学級だより
              </p>
            </div>
            <div className="header-issue">
              <div>{warekiYear}</div>
              <div>{warekiDay}</div>
              <div>NO.{issue.issueNumber}</div>
            </div>
          </div>
        </header>

        <div className={`sheet-body ${showAnnouncement ? "with-announce" : ""}`}>
          {sections.map((section, index) => {
            const sectionPhotos = section.photoIds
              .map((id) => photos[id])
              .filter(Boolean);
            const rows = chunkPhotos(sectionPhotos, 3);

            return (
              <section
                key={section.id}
                className={`topic topic-${section.tone}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggingPhotoId) {
                    onDropOnSection(section.id, null);
                    return;
                  }
                  if (e.dataTransfer.files?.length) {
                    onAddPhotos(Array.from(e.dataTransfer.files), section.id);
                  }
                }}
              >
                {index === 0 && (
                  <div className="topic-decos" aria-hidden="true">
                    <img
                      className="topic-deco deco-tape-red"
                      src="/decor/tape-purple.png"
                      alt=""
                    />
                    <img
                      className="topic-deco deco-pencil"
                      src="/decor/pencil.png"
                      alt=""
                    />
                    <img
                      className="topic-deco deco-eraser"
                      src="/decor/eraser.png"
                      alt=""
                    />
                  </div>
                )}
                {index === 1 && (
                  <div className="topic-decos" aria-hidden="true">
                    <img
                      className="topic-deco deco-tape-green"
                      src="/decor/tape-green.png"
                      alt=""
                    />
                    <img
                      className="topic-deco deco-triangle"
                      src="/decor/triangle.png"
                      alt=""
                    />
                  </div>
                )}

                <h2 className="topic-title">
                  <span>{section.title.trim() || "トピック"}</span>
                </h2>
                {section.body.trim() ? (
                  <>
                    <hr className="dotted-rule" />
                    <div className="topic-body">{section.body}</div>
                  </>
                ) : null}
                {rows.length > 0 ? (
                  <div className="photo-stacks">
                    {rows.map((row, rowIndex) => (
                      <div
                        key={`${section.id}-row-${rowIndex}`}
                        className={`photo-row count-${row.length}`}
                      >
                        {row.map((photo) => (
                          <div
                            key={photo.id}
                            className={`photo-cell ${draggingPhotoId === photo.id ? "dragging" : ""}`}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData(
                                "text/plain",
                                photo.id,
                              );
                              onDragStart(photo.id, section.id);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (draggingPhotoId) {
                                onDropOnSection(section.id, photo.id);
                                return;
                              }
                              if (e.dataTransfer.files?.length) {
                                onAddPhotos(
                                  Array.from(e.dataTransfer.files),
                                  section.id,
                                );
                              }
                            }}
                          >
                            <img src={photo.objectUrl} alt="" />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="photo-drop-hint photo-drop-hint-quiet">
                    写真未追加
                  </div>
                )}
              </section>
            );
          })}

          {showAnnouncement && announcement && (
            <aside className="announcement">
              <h2 className="announcement-title">
                <span>{announcement.title.trim() || "お知らせ"}</span>
              </h2>
              <hr className="dotted-rule" />
              <p className="announcement-body">
                {announcement.body.trim()}
              </p>
            </aside>
          )}
        </div>
      </div>
    </article>
  );
}
