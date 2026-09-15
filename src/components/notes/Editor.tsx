"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { Glass } from "@/components/glass/Glass";
import { useStore } from "@/lib/store";
import { createLogger } from "@/lib/debug";
import { InkCanvas, InkLayer } from "./Ink";
import { useBus, type EditorApi } from "./editorApi";

const log = createLogger("editor");

export function Editor() {
  const { data, dispatch } = useStore();
  const { registerApi, markup } = useBus();
  const docRef = useRef<HTMLDivElement>(null);
  const loadedId = useRef<string | null>(null);

  const note = data.notes.find((n) => n.id === data.selectedNoteId) ?? null;
  const inTrash = !!note?.deletedAt;

  /* メモを切り替えた時だけ innerHTML を差し替える。
     入力のたびに書き戻すとキャレットが飛ぶため。 */
  useEffect(() => {
    const el = docRef.current;
    if (!el || !note) return;
    if (loadedId.current === note.id) return;
    el.innerHTML = note.html;
    loadedId.current = note.id;
    log.log("loaded", note.id);
  }, [note]);

  const pushHtml = useCallback(() => {
    const el = docRef.current;
    if (!el || !note) return;
    dispatch({ type: "patchNote", id: note.id, patch: { html: el.innerHTML }, coalesce: `html:${note.id}` });
  }, [dispatch, note]);

  /* ツールバーから叩く命令。contentEditable の整形は execCommand を使う。
     非推奨 API だが、全ブラウザで現役かつ Range 手組みより挙動が安定する。 */
  useEffect(() => {
    const impl: EditorApi = {
      focus: () => docRef.current?.focus(),
      exec: (cmd, value) => {
        docRef.current?.focus();
        document.execCommand(cmd, false, value);
        pushHtml();
      },
      block: (tag) => {
        docRef.current?.focus();
        document.execCommand("formatBlock", false, tag);
        pushHtml();
      },
      insertChecklist: () => {
        docRef.current?.focus();
        document.execCommand(
          "insertHTML",
          false,
          '<ul class="checklist"><li data-checked="false">&#8203;</li></ul>',
        );
        pushHtml();
      },
      insertTable: () => {
        docRef.current?.focus();
        const cell = "<td>&#8203;</td>";
        document.execCommand(
          "insertHTML",
          false,
          `<table><tbody><tr>${cell.repeat(3)}</tr><tr>${cell.repeat(3)}</tr></tbody></table><p>&#8203;</p>`,
        );
        pushHtml();
      },
      insertImage: (src) => {
        docRef.current?.focus();
        document.execCommand("insertHTML", false, `<img src="${src}" alt="" />`);
        pushHtml();
      },
    };
    registerApi(impl);
    return () => registerApi(null);
  }, [registerApi, pushHtml]);

  /* チェックリストの丸を押したら開閉する */
  const onDocClick = (e: React.MouseEvent) => {
    const li = (e.target as HTMLElement).closest("li");
    if (!li || !li.parentElement?.classList.contains("checklist")) return;
    const r = li.getBoundingClientRect();
    if (e.clientX - r.left > 28) return; // 丸の外＝本文編集
    li.dataset.checked = li.dataset.checked === "true" ? "false" : "true";
    pushHtml();
  };

  if (!note) {
    return (
      <section className="pane pane--editor">
        <div className="editor__empty t-meta">メモが選択されていません</div>
      </section>
    );
  }

  return (
    <section className="pane pane--editor">
      {inTrash && (
        <div className="trash-bar">
          <span className="t-meta">このメモはゴミ箱にあります。</span>
          <span className="flex gap-1">
            <button type="button" className="pill-btn" onClick={() => dispatch({ type: "restoreNote", id: note.id })}>
              元に戻す
            </button>
            <button
              type="button"
              className="pill-btn"
              style={{ color: "#d8453a" }}
              onClick={() => dispatch({ type: "deleteForever", id: note.id })}
            >
              完全に削除
            </button>
          </span>
        </div>
      )}

      <div className="scroll editor__scroll">
        <Glass variant="card" radius={18} bevel={14} noLens className="paper" contentClassName="paper__in">
          <input
            className="paper__title"
            value={note.title}
            placeholder="新規メモ"
            readOnly={inTrash}
            onChange={(e) =>
              dispatch({ type: "patchNote", id: note.id, patch: { title: e.target.value }, coalesce: `title:${note.id}` })
            }
          />

          <div className="paper__canvas">
            <div
              ref={docRef}
              className="doc t-body"
              contentEditable={!inTrash && !markup.on}
              suppressContentEditableWarning
              data-placeholder="ここに書く"
              onInput={pushHtml}
              onBlur={pushHtml}
              onClick={onDocClick}
              spellCheck={false}
            />

            {/* 手書き層。描画モード中だけ入力を受ける */}
            {markup.on && !inTrash ? (
              <InkCanvas
                strokes={note.ink}
                tool={markup.tool}
                color={markup.color}
                size={markup.size}
                onCommit={(ink) => dispatch({ type: "setInk", id: note.id, ink, coalesce: `ink:${note.id}` })}
              />
            ) : (
              <InkLayer strokes={note.ink} className="ink-layer" />
            )}
          </div>
        </Glass>
      </div>
    </section>
  );
}
