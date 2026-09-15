"use client";

import React, {
  createContext, useContext, useEffect, useMemo, useReducer, useRef, useCallback,
  useSyncExternalStore,
} from "react";
import type { AppData, Folder, InkStroke, Note, PersistShape, Settings } from "./types";
import { DEFAULT_SETTINGS, SEED } from "./seed";
import { sanitizeHtml } from "./sanitize";
import { createLogger } from "./debug";

const log = createLogger("store");
const STORAGE_KEY = "lgn.v1";
const HISTORY_LIMIT = 120;
const COALESCE_MS = 700;

export type Action =
  | { type: "selectFolder"; id: string }
  | { type: "selectNote"; id: string | null }
  | { type: "createNote" }
  | { type: "patchNote"; id: string; patch: Partial<Pick<Note, "title" | "html" | "kind" | "tags" | "pinned">>; coalesce?: string }
  | { type: "setInk"; id: string; ink: InkStroke[]; coalesce?: string }
  | { type: "trashNote"; id: string }
  | { type: "restoreNote"; id: string }
  | { type: "deleteForever"; id: string }
  | { type: "emptyTrash" }
  | { type: "createFolder"; name: string }
  | { type: "renameFolder"; id: string; name: string }
  | { type: "deleteFolder"; id: string }
  | { type: "hydrate"; data: AppData }
  | { type: "undo" }
  | { type: "redo" };

type History = { past: AppData[]; present: AppData; future: AppData[] };
type State = History & { lastCoalesce: string | null; lastAt: number };

const uid = (p: string) =>
  `${p}_${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 8)}`;

/** 履歴に積むべき変更か（選択操作は積まない） */
const MUTATING = new Set<Action["type"]>([
  "createNote", "patchNote", "setInk", "trashNote", "restoreNote",
  "deleteForever", "emptyTrash", "createFolder", "renameFolder", "deleteFolder",
]);

function apply(data: AppData, action: Action): AppData {
  const touch = (n: Note): Note => ({ ...n, updatedAt: Date.now() });

  switch (action.type) {
    case "selectFolder": {
      const inFolder = visibleNotes(data, action.id);
      return { ...data, selectedFolderId: action.id, selectedNoteId: inFolder[0]?.id ?? null };
    }
    case "selectNote":
      return { ...data, selectedNoteId: action.id };

    case "createNote": {
      const folderId =
        data.selectedFolderId === "all" || data.selectedFolderId === "trash"
          ? "notes"
          : data.selectedFolderId;
      const n: Note = {
        id: uid("n"), folderId, title: "", html: "", ink: [], tags: [],
        kind: "text", pinned: false,
        createdAt: Date.now(), updatedAt: Date.now(), deletedAt: null,
      };
      return { ...data, notes: [n, ...data.notes], selectedFolderId: folderId, selectedNoteId: n.id };
    }

    case "patchNote":
      return {
        ...data,
        notes: data.notes.map((n) =>
          n.id === action.id
            ? touch({
                ...n,
                ...action.patch,
                html: action.patch.html !== undefined ? sanitizeHtml(action.patch.html) : n.html,
              })
            : n,
        ),
      };

    case "setInk":
      return {
        ...data,
        notes: data.notes.map((n) =>
          n.id === action.id
            ? touch({ ...n, ink: action.ink, kind: action.ink.length ? "handwritten" : n.kind })
            : n,
        ),
      };

    case "trashNote": {
      const notes = data.notes.map((n) =>
        n.id === action.id ? { ...n, deletedAt: Date.now() } : n,
      );
      const rest = visibleNotes({ ...data, notes }, data.selectedFolderId);
      return { ...data, notes, selectedNoteId: rest[0]?.id ?? null };
    }

    case "restoreNote":
      return {
        ...data,
        notes: data.notes.map((n) => (n.id === action.id ? { ...n, deletedAt: null } : n)),
      };

    case "deleteForever": {
      const notes = data.notes.filter((n) => n.id !== action.id);
      const rest = visibleNotes({ ...data, notes }, data.selectedFolderId);
      return { ...data, notes, selectedNoteId: rest[0]?.id ?? null };
    }

    case "emptyTrash":
      return { ...data, notes: data.notes.filter((n) => !n.deletedAt), selectedNoteId: null };

    case "createFolder": {
      const f: Folder = {
        id: uid("f"),
        name: action.name.trim() || "新規フォルダ",
        order: Math.max(0, ...data.folders.map((x) => x.order)) + 1,
      };
      // ゴミ箱は常に最後尾へ
      const folders = [...data.folders, f].sort(
        (a, b) => (a.system === "trash" ? 1 : 0) - (b.system === "trash" ? 1 : 0) || a.order - b.order,
      );
      return { ...data, folders, selectedFolderId: f.id, selectedNoteId: null };
    }

    case "renameFolder":
      return {
        ...data,
        folders: data.folders.map((f) =>
          f.id === action.id && !f.system ? { ...f, name: action.name.trim() || f.name } : f,
        ),
      };

    case "deleteFolder": {
      const target = data.folders.find((f) => f.id === action.id);
      if (!target || target.system) return data;
      const notes = data.notes.map((n) =>
        n.folderId === action.id ? { ...n, deletedAt: n.deletedAt ?? Date.now() } : n,
      );
      const folders = data.folders.filter((f) => f.id !== action.id);
      const nextFolder = data.selectedFolderId === action.id ? "notes" : data.selectedFolderId;
      return {
        ...data, folders, notes,
        selectedFolderId: nextFolder,
        selectedNoteId: visibleNotes({ ...data, notes }, nextFolder)[0]?.id ?? null,
      };
    }

    case "hydrate":
      return action.data;

    default:
      return data;
  }
}

function reducer(state: State, action: Action): State {
  if (action.type === "undo") {
    if (!state.past.length) return state;
    const past = state.past.slice(0, -1);
    const present = state.past[state.past.length - 1];
    log.log("undo", { depth: past.length });
    return { past, present, future: [state.present, ...state.future], lastCoalesce: null, lastAt: 0 };
  }
  if (action.type === "redo") {
    if (!state.future.length) return state;
    const [present, ...future] = state.future;
    log.log("redo", { queued: future.length });
    return { past: [...state.past, state.present], present, future, lastCoalesce: null, lastAt: 0 };
  }
  if (action.type === "hydrate") {
    return { past: [], present: action.data, future: [], lastCoalesce: null, lastAt: 0 };
  }

  const present = apply(state.present, action);
  if (present === state.present) return state;

  if (!MUTATING.has(action.type)) {
    return { ...state, present };
  }

  const key = "coalesce" in action ? action.coalesce : undefined;
  const now = Date.now();
  const merge = !!key && key === state.lastCoalesce && now - state.lastAt < COALESCE_MS;

  const past = merge ? state.past : [...state.past, state.present].slice(-HISTORY_LIMIT);
  return { past, present, future: [], lastCoalesce: key ?? null, lastAt: now };
}

/* ---------------------------------- selectors --------------------------------- */

export function visibleNotes(data: AppData, folderId: string): Note[] {
  const list = data.notes.filter((n) =>
    folderId === "trash" ? !!n.deletedAt : !n.deletedAt && (folderId === "all" || n.folderId === folderId),
  );
  return list.sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt,
  );
}

export function folderCount(data: AppData, folderId: string): number {
  return visibleNotes(data, folderId).length;
}

export function allTags(data: AppData): string[] {
  const s = new Set<string>();
  data.notes.filter((n) => !n.deletedAt).forEach((n) => n.tags.forEach((t) => s.add(t)));
  return [...s].sort();
}

/* ----------------------------------- context ---------------------------------- */

type Ctx = {
  data: AppData;
  settings: Settings;
  canUndo: boolean;
  canRedo: boolean;
  ready: boolean;
  dispatch: React.Dispatch<Action>;
  setSettings: (patch: Partial<Settings>) => void;
};

const StoreCtx = createContext<Ctx | null>(null);

function readPersisted(): PersistShape | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistShape;
    if (parsed?.version !== 1 || !parsed.data?.folders) return null;
    return parsed;
  } catch (e) {
    log.error("読み込み失敗。初期データで起動する", e);
    return null;
  }
}

/* 起動時の保存データは一度だけ読む。state の遅延初期化から呼ぶので
   effect で setState する必要がない（描画の連鎖を作らない）。 */
let bootCache: PersistShape | null | undefined;
function boot(): PersistShape | null {
  if (bootCache === undefined) {
    bootCache = typeof window === "undefined" ? null : readPersisted();
    log.log("boot", bootCache ? { notes: bootCache.data.notes.length } : "保存データなし");
  }
  return bootCache;
}

/* サーバ描画では false、水和後に true。
   保存データ由来の中身はこれが true になってから描く。 */
const alwaysReady = () => true;
const neverReady = () => false;
const noSubscribe = () => () => {};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, (): State => ({
    past: [], present: boot()?.data ?? SEED, future: [], lastCoalesce: null, lastAt: 0,
  }));
  const [settings, setSettingsRaw] = React.useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    ...(boot()?.settings ?? {}),
  }));
  const ready = useSyncExternalStore(noSubscribe, alwaysReady, neverReady);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 保存（デバウンス）
  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        const payload: PersistShape = { version: 1, data: state.present, settings };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        log.log("saved");
      } catch (e) {
        log.error("保存失敗（容量超過の可能性）", e);
      }
    }, 400);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state.present, settings, ready]);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsRaw((s) => ({ ...s, ...patch }));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      data: state.present,
      settings,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      ready,
      dispatch,
      setSettings,
    }),
    [state.present, state.past.length, state.future.length, settings, ready, setSettings],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}
