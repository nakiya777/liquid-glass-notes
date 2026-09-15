"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Glass } from "@/components/glass/Glass";
import { LensProvider, useLensContext } from "@/components/glass/LensProvider";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import * as I from "@/components/ui/Icons";
import { StoreProvider, useStore } from "@/lib/store";
import { measureWallpaperLuminance } from "@/lib/lens";
import { useMediaQuery } from "@/lib/useExternal";
import { downloadText, noteToMarkdown } from "@/lib/export";
import { createLogger } from "@/lib/debug";
import type { Material } from "@/lib/types";
import { Sidebar } from "./Sidebar";
import { NoteList } from "./NoteList";
import { Editor } from "./Editor";
import { Toolbar } from "./Toolbar";
import { EditorBus, type Bus, type EditorApi, type MarkupState } from "./editorApi";

const log = createLogger("shell");

export function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const { settings } = useStore();
  return (
    <LensProvider enabled={settings.refraction}>
      <Inner />
    </LensProvider>
  );
}

function Inner() {
  const { data, settings, dispatch, ready } = useStore();
  const apiRef = useRef<EditorApi | null>(null);
  /* 手書きモードは「どのメモに対して開いたか」を持たせる。
     メモを切り替えると owner が一致しなくなり自動的に畳まれるので、
     effect で消しに行く必要がない（別のメモへ描く事故も防げる）。 */
  const [markupRaw, setMarkupRaw] = useState<MarkupState & { owner: string | null }>({
    on: false, owner: null, tool: "pen", color: "#1c1c1e", size: 3,
  });
  const [autoMaterial, setAutoMaterial] = useState<Material>("light");

  const currentNoteId = data.selectedNoteId;
  const setMarkup = useCallback(
    (patch: Partial<MarkupState>) => {
      setMarkupRaw((m) => ({
        ...m,
        ...patch,
        owner: patch.on === undefined ? m.owner : patch.on ? currentNoteId : null,
      }));
    },
    [currentNoteId],
  );

  const markup = useMemo<MarkupState>(
    () => ({ ...markupRaw, on: markupRaw.on && markupRaw.owner === currentNoteId }),
    [markupRaw, currentNoteId],
  );

  const registerApi = useCallback((api: EditorApi | null) => {
    apiRef.current = api;
  }, []);
  const callApi = useCallback((fn: (api: EditorApi) => void) => {
    const api = apiRef.current;
    if (api) fn(api);
    else log.warn("エディタが未登録のため操作を無視した");
  }, []);

  const bus = useMemo<Bus>(
    () => ({ registerApi, callApi, markup, setMarkup }),
    [registerApi, callApi, markup, setMarkup],
  );

  const osReducedTransparency = useMediaQuery("(prefers-reduced-transparency: reduce)");

  /* 壁紙の平均輝度から材質を決める（Liquid Glass の適応挙動） */
  useEffect(() => {
    let alive = true;
    measureWallpaperLuminance(settings.wallpaper)
      .then((l) => { if (alive) setAutoMaterial(l > 0.55 ? "light" : "dark"); })
      .catch((e) => log.error("壁紙の輝度測定に失敗", e));
    return () => { alive = false; };
  }, [settings.wallpaper]);

  /* macOS「透明度を下げる」は既定では尊重しない（本アプリは材質そのものが主題のため）。
     設定から「OS の透明度設定に従う」を選んだ時だけ平面表示へ落とす。 */
  const flat = settings.respectOsTransparency && osReducedTransparency;
  const material: Material = settings.material === "auto" ? autoMaterial : settings.material;

  useEffect(() => {
    document.documentElement.dataset.material = material;
  }, [material]);

  useEffect(() => {
    document.documentElement.dataset.flat = flat ? "1" : "0";
    log.log("transparency", { osReducedTransparency, respect: settings.respectOsTransparency, flat });
  }, [flat, osReducedTransparency, settings.respectOsTransparency]);

  /* 主要な操作をキーボードからも */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "z") {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "redo" : "undo" });
      } else if (k === "n") {
        e.preventDefault();
        dispatch({ type: "createNote" });
      } else if (e.key === "Backspace" && data.selectedNoteId) {
        e.preventDefault();
        dispatch({ type: "trashNote", id: data.selectedNoteId });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, data.selectedNoteId]);

  return (
    <EditorBus.Provider value={bus}>
      <div className="wallpaper" style={{ ["--wallpaper" as string]: `url(${settings.wallpaper})` }} />

      <div className="app">
        <Glass variant="panel" radius={30} bevel={26} lensScale={34} className="slab" contentClassName="slab__in">
          {/* 保存データの復元前に本文を描くと SSR と食い違うため、復元後に出す */}
          {ready && (
            <div className="slab__grid">
              <Sidebar />
              <span className="slab__rule" />
              <NoteList />
              <span className="slab__rule" />
              <Editor />
            </div>
          )}
        </Glass>

        {ready && (
          <>
            <TopChrome material={material} osReducedTransparency={osReducedTransparency} />
            <Toolbar />
          </>
        )}
      </div>
    </EditorBus.Provider>
  );
}

function TopChrome({
  material,
  osReducedTransparency,
}: {
  material: Material;
  osReducedTransparency: boolean;
}) {
  const { data, settings, setSettings, dispatch } = useStore();
  const { supported } = useLensContext();
  const [share, setShare] = useState(false);
  const [opts, setOpts] = useState(false);
  const [glassMenu, setGlassMenu] = useState(false);

  const note = data.notes.find((n) => n.id === data.selectedNoteId);

  const shareItems: MenuItem[] = [
    { kind: "label", label: "共有（すべて端末内で完結）" },
    {
      kind: "item", label: "Markdown をコピー", disabled: !note,
      onSelect: () => note && navigator.clipboard.writeText(noteToMarkdown(note)),
    },
    {
      kind: "item", label: ".md として書き出す", disabled: !note,
      onSelect: () => note && downloadText(`${note.title || "note"}.md`, noteToMarkdown(note)),
    },
    { kind: "item", label: "印刷", disabled: !note, onSelect: () => window.print() },
  ];

  const optItems: MenuItem[] = [
    {
      kind: "item", label: note?.pinned ? "ピンを外す" : "ピンで固定", disabled: !note,
      icon: <I.Pin size={15} />,
      onSelect: () => note && dispatch({ type: "patchNote", id: note.id, patch: { pinned: !note.pinned } }),
    },
    {
      kind: "item", label: "タグを編集", disabled: !note,
      icon: <I.Tag size={15} />,
      onSelect: () => {
        if (!note) return;
        const v = window.prompt("タグをカンマ区切りで", note.tags.join(", "));
        if (v === null) return;
        dispatch({
          type: "patchNote", id: note.id,
          patch: { tags: v.split(",").map((s) => s.trim()).filter(Boolean) },
        });
      },
    },
    { kind: "sep" },
    {
      kind: "item", label: "ゴミ箱に入れる", danger: true, disabled: !note || !!note.deletedAt,
      icon: <I.Trash size={15} />,
      onSelect: () => note && dispatch({ type: "trashNote", id: note.id }),
    },
  ];

  const glassItems: MenuItem[] = [
    { kind: "label", label: "ガラスの材質" },
    { kind: "item", label: "自動（背景の明るさで判定）", icon: <I.Auto size={15} />, checked: settings.material === "auto", onSelect: () => setSettings({ material: "auto" }) },
    { kind: "item", label: "明るい材質", icon: <I.Sun size={15} />, checked: settings.material === "light", onSelect: () => setSettings({ material: "light" }) },
    { kind: "item", label: "暗い材質", icon: <I.Moon size={15} />, checked: settings.material === "dark", onSelect: () => setSettings({ material: "dark" }) },
    { kind: "sep" },
    {
      kind: "item",
      label: supported ? "縁の屈折（SVG）" : "縁の屈折：このブラウザは非対応",
      icon: <I.Droplet size={15} />,
      checked: settings.refraction && supported,
      disabled: !supported,
      onSelect: () => setSettings({ refraction: !settings.refraction }),
    },
    { kind: "sep" },
    {
      kind: "item",
      label: "OS の透明度設定に従う",
      checked: settings.respectOsTransparency,
      onSelect: () => setSettings({ respectOsTransparency: !settings.respectOsTransparency }),
    },
    {
      kind: "label",
      label: osReducedTransparency
        ? "この Mac は「透明度を下げる」が有効です。従うとガラスは不透明になります。"
        : `現在の材質：${material === "light" ? "明" : "暗"}`,
    },
    ...(supported
      ? []
      : ([{ kind: "label", label: "このブラウザは backdrop-filter の SVG フィルタに未対応。ぼかしのみで描画中。" }] as MenuItem[])),
  ];

  return (
    <div className="topchrome">
      <Glass variant="control" radius={17} bevel={13} className="chrome-pod" contentClassName="chrome-pod__in">
        <div className="relative">
          <button type="button" className="icon-btn" title="ガラスの設定" data-active={glassMenu || undefined} onClick={() => setGlassMenu((v) => !v)}>
            <I.Droplet size={18} />
          </button>
          <Menu open={glassMenu} onClose={() => setGlassMenu(false)} items={glassItems} width={270} />
        </div>
        <div className="relative">
          <button type="button" className="icon-btn" title="共有" data-active={share || undefined} onClick={() => setShare((v) => !v)}>
            <I.Share size={18} />
          </button>
          <Menu open={share} onClose={() => setShare(false)} items={shareItems} width={240} />
        </div>
        <div className="relative">
          <button type="button" className="icon-btn" title="メモの操作" data-active={opts || undefined} onClick={() => setOpts((v) => !v)}>
            <I.Ellipsis size={19} />
          </button>
          <Menu open={opts} onClose={() => setOpts(false)} items={optItems} width={200} />
        </div>
        <span className="toolbar__sep" />
        <button type="button" className="icon-btn" title="新規メモ (⌘N)" onClick={() => dispatch({ type: "createNote" })}>
          <I.Compose size={18} />
        </button>
      </Glass>
    </div>
  );
}
