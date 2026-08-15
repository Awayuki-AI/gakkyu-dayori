import { useEffect, useRef, useState } from "react";
import { EditorPanel } from "./components/EditorPanel";
import { NewsletterPreview } from "./components/NewsletterPreview";
import { loadSettings, saveSettings } from "./settings";
import type {
  Announcement,
  Issue,
  Photo,
  Settings,
  TopicSection,
} from "./types";
import { createId, todayIsoDate } from "./utils/format";
import { createDemoSections, demoAnnouncement } from "./utils/demo-content";
import { fileToObjectUrl, isLikelyImageFile } from "./utils/image-file";
import {
  ensureGoogleDriveLogin,
  isLikelyEmail,
  isLikelyGoogleClientId,
  preloadGoogleIdentity,
  resolveGoogleClientId,
  shareDriveFileWithEmail,
  uploadPdfToDrive,
} from "./utils/google-drive";
import { downloadPreviewAsPdf, previewToPdfBlob } from "./utils/pdf";
import "./App.css";

function createSection(
  tone: TopicSection["tone"] = "cream",
  icon = "",
): TopicSection {
  return {
    id: createId("section"),
    title: "",
    body: "",
    photoIds: [],
    tone,
    icon,
  };
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [issue, setIssue] = useState<Issue>(() => ({
    date: todayIsoDate(),
    issueNumber: loadSettings().nextIssueNumber,
  }));
  const [demo] = useState(() => createDemoSections());
  const [sections, setSections] = useState<TopicSection[]>(() => demo.sections);
  const [photos, setPhotos] = useState<Record<string, Photo>>(() => demo.photos);
  const [includeAnnouncement, setIncludeAnnouncement] = useState(true);
  const [announcement, setAnnouncement] = useState<Announcement>(
    () => demoAnnouncement,
  );
  const [exporting, setExporting] = useState(false);
  const [dragState, setDragState] = useState<{
    photoId: string;
    fromSectionId: string;
  } | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    preloadGoogleIdentity();
  }, []);

  useEffect(() => {
    return () => {
      Object.values(photosRef.current).forEach((p) => {
        if (p.objectUrl.startsWith("blob:")) {
          URL.revokeObjectURL(p.objectUrl);
        }
      });
    };
  }, []);

  function handleSettingsChange(next: Settings) {
    setSettings(next);
  }

  async function handleAddPhotos(files: FileList | File[], sectionId: string) {
    const list = Array.from(files).filter(isLikelyImageFile);
    if (list.length === 0) {
      alert(
        "画像として読み込めませんでした。JPEG / PNG / HEIC（iPhoneの写真）を選んでください。",
      );
      return;
    }

    const added: Photo[] = [];
    const failed: string[] = [];
    for (const file of list) {
      try {
        added.push({
          id: createId("photo"),
          objectUrl: await fileToObjectUrl(file),
          name: file.name,
        });
      } catch (err) {
        console.error(err);
        failed.push(file.name);
      }
    }

    if (added.length === 0) {
      alert(
        "写真を追加できませんでした。拡張子が .jpg / .png / .heic のファイルか確認してください。",
      );
      return;
    }

    setPhotos((prev) => {
      const next = { ...prev };
      for (const p of added) next[p.id] = p;
      return next;
    });

    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, photoIds: [...s.photoIds, ...added.map((p) => p.id)] }
          : s,
      ),
    );

    if (failed.length > 0) {
      alert(`一部の写真を追加できませんでした:\n${failed.join("\n")}`);
    }
  }

  function handleRemovePhoto(sectionId: string, photoId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, photoIds: s.photoIds.filter((id) => id !== photoId) }
          : s,
      ),
    );
    setPhotos((prev) => {
      const target = prev[photoId];
      if (target?.objectUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.objectUrl);
      }
      const next = { ...prev };
      delete next[photoId];
      return next;
    });
  }

  function handleSectionChange(id: string, patch: Partial<TopicSection>) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  }

  function handleAddSection() {
    const tones: TopicSection["tone"][] = ["cream", "lavender", "peach"];
    const tone = tones[sections.length % tones.length];
    setSections((prev) => [...prev, createSection(tone)]);
  }

  function handleRemoveSection(id: string) {
    const target = sections.find((s) => s.id === id);
    if (!target) return;
    for (const photoId of target.photoIds) {
      const photo = photos[photoId];
      if (photo?.objectUrl.startsWith("blob:")) {
        URL.revokeObjectURL(photo.objectUrl);
      }
    }
    setPhotos((prev) => {
      const next = { ...prev };
      for (const photoId of target.photoIds) delete next[photoId];
      return next;
    });
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  function handleDragStart(photoId: string, fromSectionId: string) {
    setDragState({ photoId, fromSectionId });
  }

  function handleDropOnSection(
    toSectionId: string,
    targetPhotoId: string | null,
  ) {
    if (!dragState) return;
    const { photoId, fromSectionId } = dragState;
    setDragState(null);

    setSections((prev) => {
      const copy = prev.map((s) => ({ ...s, photoIds: [...s.photoIds] }));
      const from = copy.find((s) => s.id === fromSectionId);
      const to = copy.find((s) => s.id === toSectionId);
      if (!from || !to) return prev;

      const fromIndex = from.photoIds.indexOf(photoId);
      if (fromIndex < 0) return prev;
      from.photoIds.splice(fromIndex, 1);

      if (targetPhotoId && to.photoIds.includes(targetPhotoId)) {
        const toIndex = to.photoIds.indexOf(targetPhotoId);
        to.photoIds.splice(toIndex, 0, photoId);
      } else {
        to.photoIds.push(photoId);
      }
      return copy;
    });
  }

  async function handleExportPdf() {
    const node = previewRef.current?.querySelector(".sheet");
    if (!(node instanceof HTMLElement)) return;
    setExporting(true);
    try {
      const name = `${settings.seriesTitle}_NO${issue.issueNumber}.pdf`;
      await downloadPreviewAsPdf(node, name);
      setSettings((s) => ({
        ...s,
        nextIssueNumber: Math.max(s.nextIssueNumber, issue.issueNumber + 1),
      }));
    } catch (err) {
      console.error(err);
      alert("PDFの作成に失敗しました。もう一度お試しください。");
    } finally {
      setExporting(false);
    }
  }

  async function handleSaveToDrive() {
    const clientId = resolveGoogleClientId(settings.googleClientId);
    if (!isLikelyGoogleClientId(clientId)) {
      alert(
        "初回のみ、GoogleクライアントIDの設定が必要です。\nヘッダー・設定の欄に貼るか、やり方をこのあと案内します。",
      );
      return;
    }

    const node = previewRef.current?.querySelector(".sheet");
    if (!(node instanceof HTMLElement)) return;

    const ok = window.confirm(
      "個人のGoogleアカウントでログインし、PDFをマイドライブへ保存します。学校のアドレスを設定していれば、続けて共有します。",
    );
    if (!ok) return;

    const login = ensureGoogleDriveLogin(clientId);
    setExporting(true);
    try {
      await login;
      const pdfFilename = `${settings.seriesTitle}_NO${issue.issueNumber}.pdf`;
      const pdfBlob = await previewToPdfBlob(node);
      const saved = await uploadPdfToDrive({
        clientId,
        filename: pdfFilename,
        pdfBlob,
      });

      setSettings((s) => ({
        ...s,
        nextIssueNumber: Math.max(s.nextIssueNumber, issue.issueNumber + 1),
      }));

      const shareTo = settings.schoolEmail.trim();
      let shared = false;
      if (isLikelyEmail(shareTo)) {
        try {
          await shareDriveFileWithEmail({
            fileId: saved.id,
            email: shareTo,
          });
          shared = true;
        } catch (shareErr) {
          console.error(shareErr);
        }
      }

      if (saved.webViewLink) {
        window.open(saved.webViewLink, "_blank", "noopener,noreferrer");
      }
      if (shared) {
        alert(
          `個人ドライブへ保存し、${shareTo} へ共有しました。学校アカウントの「共有アイテム」から開けます。`,
        );
      } else if (shareTo) {
        alert(
          "個人ドライブへ保存しました。学校アカウントへの自動共有はできませんでした。開いた画面の「共有」から、学校アドレスを追加してください。",
        );
      } else {
        alert(
          "個人ドライブへ保存しました。学校で使いたいときは、開いた画面の「共有」に学校アドレスを入れるか、PDFをダウンロードして学校ドライブへ上げてください。",
        );
      }
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Driveへの保存に失敗しました。";
      alert(message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-[340px_1fr]">
      <EditorPanel
        settings={settings}
        issue={issue}
        sections={sections}
        photos={photos}
        includeAnnouncement={includeAnnouncement}
        announcement={announcement}
        onSettingsChange={handleSettingsChange}
        onIssueChange={setIssue}
        onSectionChange={handleSectionChange}
        onAddSection={handleAddSection}
        onRemoveSection={handleRemoveSection}
        onToggleAnnouncement={setIncludeAnnouncement}
        onAnnouncementChange={setAnnouncement}
        onAddPhotos={handleAddPhotos}
        onRemovePhoto={handleRemovePhoto}
        onExportPdf={handleExportPdf}
        onSaveToDrive={handleSaveToDrive}
        exporting={exporting}
      />
      <main
        className="flex items-start justify-center overflow-auto p-6"
        ref={previewRef}
      >
        <NewsletterPreview
          settings={settings}
          issue={issue}
          sections={sections}
          photos={photos}
          announcement={announcement}
          includeAnnouncement={includeAnnouncement}
          draggingPhotoId={dragState?.photoId ?? null}
          onDragStart={handleDragStart}
          onDropOnSection={handleDropOnSection}
          onAddPhotos={handleAddPhotos}
        />
      </main>
    </div>
  );
}
