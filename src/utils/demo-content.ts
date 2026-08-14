import type { Photo, TopicSection } from "../types";
import { createId } from "./format";

/** デモ用の初期トピック（卒業制作の見栄え用） */
export function createDemoSections(): {
  sections: TopicSection[];
  photos: Record<string, Photo>;
} {
  const p1 = createId("photo");
  const p2 = createId("photo");
  const p3 = createId("photo");
  const p4 = createId("photo");
  const p5 = createId("photo");
  const p6 = createId("photo");

  const photos: Record<string, Photo> = {
    [p1]: { id: p1, objectUrl: "/sample/photo-1.svg", name: "sample-1.svg" },
    [p2]: { id: p2, objectUrl: "/sample/photo-2.svg", name: "sample-2.svg" },
    [p3]: { id: p3, objectUrl: "/sample/photo-3.svg", name: "sample-3.svg" },
    [p4]: { id: p4, objectUrl: "/sample/photo-4.svg", name: "sample-4.svg" },
    [p5]: { id: p5, objectUrl: "/sample/photo-5.svg", name: "sample-5.svg" },
    [p6]: { id: p6, objectUrl: "/sample/photo-6.svg", name: "sample-6.svg" },
  };

  const sections: TopicSection[] = [
    {
      id: createId("section"),
      title: "理科の実験！",
      body: "「ものが燃えるとき」の学習で、火がつくために必要なものを予想しました。初めてマッチの使い方を学び、グループで協力しながら実験を進めました。",
      photoIds: [p1, p2, p3],
      tone: "lavender",
      icon: "",
    },
    {
      id: createId("section"),
      title: "みんなで遊ぶ",
      body: "昼休みにクラス全員でドッジボールやドロケイをしました。「楽しかった！」「仲良く遊べた！」という声が多く、笑顔の多い時間になりました。",
      photoIds: [p4, p5, p6],
      tone: "cream",
      icon: "",
    },
  ];

  return { sections, photos };
}

export const demoAnnouncement = {
  title: "お知らせ",
  body: "来週水曜日は個人写真撮影があります。できれば赤・ピンク・水色など明るい色の服だと写真映えします。なくても大丈夫です。",
};
