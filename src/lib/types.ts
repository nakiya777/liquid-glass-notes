export type NoteKind = "text" | "handwritten";

export type InkStroke = {
  id: string;
  /** SVG path の d 属性 */
  d: string;
  color: string;
  width: number;
  /** ハイライタは乗算合成・半透明 */
  tool: "pen" | "marker" | "pencil";
};

export type Note = {
  id: string;
  folderId: string;
  title: string;
  /** 本文（サニタイズ済みリッチテキスト HTML） */
  html: string;
  ink: InkStroke[];
  tags: string[];
  kind: NoteKind;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  /** ゴミ箱に入れた時刻。null なら生存 */
  deletedAt: number | null;
};

export type Folder = {
  id: string;
  name: string;
  /** 削除・改名の不可なシステムフォルダ */
  system?: "all" | "trash";
  order: number;
};

export type Material = "light" | "dark";
export type MaterialPref = Material | "auto";

export type Settings = {
  material: MaterialPref;
  /** SVG 屈折を使うか（対応ブラウザのみ有効） */
  refraction: boolean;
  /**
   * macOS「透明度を下げる」/ prefers-reduced-transparency に従うか。
   * 本アプリは材質そのものが主題のため既定は false（＝OS設定を上書きしてガラスを描く）。
   * 設定メニューから明示的に切り替えられる。
   */
  respectOsTransparency: boolean;
  icloudOpen: boolean;
  tagsOpen: boolean;
  wallpaper: string;
};

export type AppData = {
  folders: Folder[];
  notes: Note[];
  selectedFolderId: string;
  selectedNoteId: string | null;
};

export type PersistShape = {
  version: 1;
  data: AppData;
  settings: Settings;
};
