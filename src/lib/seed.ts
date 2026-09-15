import type { AppData, Note, Settings } from "./types";
import { makeLeaf } from "./ink";

const now = Date.now();
const day = 86_400_000;

function note(p: Partial<Note> & Pick<Note, "id" | "folderId" | "title">): Note {
  return {
    html: "",
    ink: [],
    tags: [],
    kind: "text",
    pinned: false,
    createdAt: now - day,
    updatedAt: now - day,
    deletedAt: null,
    ...p,
  };
}

export const SEED: AppData = {
  folders: [
    { id: "all", name: "すべての iCloud", system: "all", order: 0 },
    { id: "notes", name: "メモ", order: 1 },
    { id: "imported", name: "読み込んだメモ", order: 2 },
    { id: "trash", name: "最近削除した項目", system: "trash", order: 3 },
  ],
  notes: [
    note({
      id: "n_glass",
      folderId: "notes",
      title: "Liquid Glass 設計メモ",
      kind: "text",
      tags: ["設計"],
      updatedAt: now - 3600_000,
      html: [
        "<p>ガラス面は4層の重ね合わせで出来ている。</p>",
        "<ul>",
        "<li><b>屈折層</b> — 縁の面取りで背景像を圧縮する</li>",
        "<li><b>ぼかし層</b> — 背景を後退させ、前面の文字を浮かせる</li>",
        "<li><b>着色層</b> — 材質の明暗を決める半透明の塗り</li>",
        "<li><b>縁の光</b> — 上辺が明るく、下辺が沈む鏡面反射</li>",
        "</ul>",
        "<p>ぼかしだけでは板ガラスにならない。縁で光が曲がって初めてガラスに見える。</p>",
      ].join(""),
    }),
    note({
      id: "n_nature",
      folderId: "notes",
      title: "Nature Walks",
      kind: "handwritten",
      tags: ["観察"],
      updatedAt: now - 2 * day,
      html: "<p>裏庭の落ち葉。葉脈の走り方を写しておく。</p>",
      ink: [
        ...makeLeaf(210, 250, 1.5, "#7BC043", -12),
        ...makeLeaf(430, 235, 1.25, "#E8438F", 14),
      ],
    }),
    note({
      id: "n_list",
      folderId: "notes",
      title: "持ち物",
      kind: "text",
      updatedAt: now - 5 * day,
      html: [
        '<ul class="checklist">',
        '<li data-checked="true">方眼ノート</li>',
        '<li data-checked="false">製図用シャープ 0.3</li>',
        '<li data-checked="false">コンベックス 5.5m</li>',
        "</ul>",
      ].join(""),
    }),
    note({
      id: "n_import",
      folderId: "imported",
      title: "現場メモ（読み込み）",
      updatedAt: now - 12 * day,
      html: "<p>他アプリから読み込んだメモはこのフォルダへ入る。</p>",
    }),
  ],
  selectedFolderId: "notes",
  selectedNoteId: "n_nature",
};

export const DEFAULT_SETTINGS: Settings = {
  material: "auto",
  refraction: true,
  respectOsTransparency: false,
  icloudOpen: true,
  tagsOpen: false,
  wallpaper: "/wallpaper/room.webp",
};
