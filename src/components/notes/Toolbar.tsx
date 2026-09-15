"use client";

import React, { useRef, useState } from "react";
import { Glass } from "@/components/glass/Glass";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import * as I from "@/components/ui/Icons";
import { useStore } from "@/lib/store";
import { useBus } from "./editorApi";
import { createLogger } from "@/lib/debug";

const log = createLogger("toolbar");

const INK_COLORS = ["#1c1c1e", "#d8453a", "#e8438f", "#d99a25", "#3f9a4e", "#2f77d6"];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function Toolbar() {
  const { canUndo, canRedo, dispatch, data } = useStore();
  const { callApi, markup, setMarkup } = useBus();
  const [fmtOpen, setFmtOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const note = data.notes.find((n) => n.id === data.selectedNoteId);
  const locked = !note || !!note.deletedAt;

  const fmtItems: MenuItem[] = [
    { kind: "label", label: "書式" },
    { kind: "item", label: "タイトル", onSelect: () => callApi((a) => a.block("H1")) },
    { kind: "item", label: "見出し", onSelect: () => callApi((a) => a.block("H2")) },
    { kind: "item", label: "小見出し", onSelect: () => callApi((a) => a.block("H3")) },
    { kind: "item", label: "本文", onSelect: () => callApi((a) => a.block("P")) },
    { kind: "sep" },
    { kind: "item", label: "太字", onSelect: () => callApi((a) => a.exec("bold")) },
    { kind: "item", label: "斜体", onSelect: () => callApi((a) => a.exec("italic")) },
    { kind: "item", label: "下線", onSelect: () => callApi((a) => a.exec("underline")) },
    { kind: "item", label: "取り消し線", onSelect: () => callApi((a) => a.exec("strikeThrough")) },
    { kind: "sep" },
    { kind: "item", label: "箇条書き", onSelect: () => callApi((a) => a.exec("insertUnorderedList")) },
    { kind: "item", label: "番号付きリスト", onSelect: () => callApi((a) => a.exec("insertOrderedList")) },
    { kind: "item", label: "引用", onSelect: () => callApi((a) => a.block("BLOCKQUOTE")) },
  ];

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      log.warn("画像以外は添付できない", file.type);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      log.error(`画像が大きすぎる (${(file.size / 1e6).toFixed(1)}MB)。2MB 以下にする`);
      window.alert("画像は 2MB 以下にしてくださいませ。localStorage の容量を超えます。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => callApi((a) => a.insertImage(String(reader.result)));
    reader.readAsDataURL(file);
  };

  return (
    <div className="toolbar-wrap">
      <Glass variant="chrome" radius={24} bevel={18} className="toolbar" contentClassName="toolbar__in">
        {markup.on ? (
          <>
            <div className="toolbar__group">
              {([["pen", <I.Pen key="p" size={18} />], ["marker", <I.Marker key="m" size={18} />], ["pencil", <I.Compose key="c" size={17} />], ["eraser", <I.Eraser key="e" size={18} />]] as const).map(
                ([t, icon]) => (
                  <button
                    key={t}
                    type="button"
                    className="icon-btn"
                    title={{ pen: "ペン", marker: "マーカー", pencil: "鉛筆", eraser: "消しゴム" }[t]}
                    data-active={markup.tool === t || undefined}
                    onClick={() => setMarkup({ tool: t, size: t === "marker" ? 14 : t === "eraser" ? 12 : 3 })}
                  >
                    {icon}
                  </button>
                ),
              )}
            </div>

            <span className="toolbar__sep" />

            <div className="toolbar__group">
              {INK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="swatch"
                  style={{ background: c }}
                  data-active={markup.color === c || undefined}
                  title={c}
                  onClick={() => setMarkup({ color: c })}
                />
              ))}
            </div>

            <span className="toolbar__sep" />

            <label className="toolbar__size" title="線の太さ">
              <input
                type="range" min={1} max={22} step={1}
                value={markup.size}
                onChange={(e) => setMarkup({ size: Number(e.target.value) })}
              />
            </label>

            <button type="button" className="pill-btn" onClick={() => setMarkup({ on: false })}>完了</button>
          </>
        ) : (
          <>
            <div className="toolbar__group">
              <button type="button" className="icon-btn" title="取り消す (⌘Z)" disabled={!canUndo} onClick={() => dispatch({ type: "undo" })}>
                <I.Undo size={18} />
              </button>
              <button type="button" className="icon-btn" title="やり直す (⇧⌘Z)" disabled={!canRedo} onClick={() => dispatch({ type: "redo" })}>
                <I.Redo size={18} />
              </button>
            </div>

            <span className="toolbar__sep" />

            <div className="toolbar__group">
              <div className="relative">
                <button type="button" className="icon-btn" title="書式" disabled={locked} data-active={fmtOpen || undefined} onClick={() => setFmtOpen((v) => !v)}>
                  <I.TextFormat size={19} />
                </button>
                <Menu open={fmtOpen} onClose={() => setFmtOpen(false)} items={fmtItems} origin="bottom" align="start" width={190} />
              </div>
              <button type="button" className="icon-btn" title="チェックリスト" disabled={locked} onClick={() => callApi((a) => a.insertChecklist())}>
                <I.Checklist size={18} />
              </button>
              <button type="button" className="icon-btn" title="表" disabled={locked} onClick={() => callApi((a) => a.insertTable())}>
                <I.Table size={18} />
              </button>
              <button type="button" className="icon-btn" title="画像を添付" disabled={locked} onClick={() => fileRef.current?.click()}>
                <I.Paperclip size={18} />
              </button>
              <button type="button" className="icon-btn" title="手書き" disabled={locked} onClick={() => setMarkup({ on: true })}>
                <I.Markup size={19} />
              </button>
            </div>
          </>
        )}
      </Glass>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
    </div>
  );
}
