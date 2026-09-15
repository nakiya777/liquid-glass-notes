"use client";

import React, { useMemo, useState } from "react";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import * as I from "@/components/ui/Icons";
import { InkLayer } from "./Ink";
import { useStore, visibleNotes } from "@/lib/store";
import { htmlToPlain } from "@/lib/sanitize";
import type { Note } from "@/lib/types";

type SortKey = "updated" | "created" | "title";

function formatDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  const diff = (today.getTime() - ts) / 86_400_000;
  if (diff < 7) return ["日", "月", "火", "水", "木", "金", "土"][d.getDay()] + "曜日";
  return d.toLocaleDateString("ja-JP", { year: "2-digit", month: "numeric", day: "numeric" });
}

function Thumb({ note }: { note: Note }) {
  return (
    <div className="thumb" aria-hidden>
      {note.ink.length > 0 ? (
        <InkLayer strokes={note.ink} className="ink-thumb" />
      ) : (
        <div className="thumb__lines">
          <i /><i /><i />
        </div>
      )}
    </div>
  );
}

export function NoteList() {
  const { data, dispatch } = useStore();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");
  const [menuOpen, setMenuOpen] = useState(false);

  const folder = data.folders.find((f) => f.id === data.selectedFolderId);
  const isTrash = folder?.system === "trash";

  const notes = useMemo(() => {
    const base = visibleNotes(data, data.selectedFolderId);
    const q = query.trim().toLowerCase();
    const filtered = q
      ? base.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            htmlToPlain(n.html).toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q)),
        )
      : base;
    if (sort === "title") return [...filtered].sort((a, b) => (a.title || "無題").localeCompare(b.title || "無題", "ja"));
    if (sort === "created") return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
    return filtered;
  }, [data, query, sort]);

  const menuItems: MenuItem[] = [
    { kind: "label", label: "並べ替え" },
    { kind: "item", label: "編集日時", checked: sort === "updated", onSelect: () => setSort("updated") },
    { kind: "item", label: "作成日時", checked: sort === "created", onSelect: () => setSort("created") },
    { kind: "item", label: "タイトル", checked: sort === "title", onSelect: () => setSort("title") },
    ...(isTrash
      ? ([
          { kind: "sep" },
          {
            kind: "item",
            label: "ゴミ箱を空にする",
            danger: true,
            disabled: notes.length === 0,
            icon: <I.Trash size={15} />,
            onSelect: () => dispatch({ type: "emptyTrash" }),
          },
        ] as MenuItem[])
      : []),
  ];

  return (
    <section className="pane pane--list">
      <header className="pane__head relative">
        <h2 className="t-title on-glass truncate">{folder?.name ?? "メモ"}</h2>
        <div className="relative">
          <button
            type="button"
            className="icon-btn"
            title="表示オプション"
            data-active={menuOpen || undefined}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <I.Ellipsis size={19} />
          </button>
          <Menu open={menuOpen} onClose={() => setMenuOpen(false)} items={menuItems} />
        </div>
      </header>

      <div className="list__search">
        <I.Search size={15} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="検索"
          aria-label="メモを検索"
        />
        {query && (
          <button type="button" className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => setQuery("")} title="検索を消去">
            <I.Close size={13} />
          </button>
        )}
      </div>

      <div className="scroll list__body fade-top">
        {notes.length === 0 ? (
          <p className="t-meta px-3 py-6 text-center">
            {query ? "一致するメモはありません" : "メモはありません"}
          </p>
        ) : (
          notes.map((n) => {
            const selected = n.id === data.selectedNoteId;
            const preview = htmlToPlain(n.html);
            return (
              <button
                key={n.id}
                type="button"
                className="note-row on-glass"
                data-selected={selected}
                onClick={() => dispatch({ type: "selectNote", id: n.id })}
              >
                <span className="note-row__main">
                  <span className="note-row__title">{n.title || "新規メモ"}</span>
                  <span className="note-row__meta">
                    <span className="tabular-nums">{formatDate(n.updatedAt)}</span>
                    <span className="note-row__preview">
                      {preview || (n.ink.length ? "手書きメモ" : "追加のテキストなし")}
                    </span>
                  </span>
                </span>
                <Thumb note={n} />
              </button>
            );
          })
        )}
      </div>

      <footer className="list__foot t-tiny">
        {notes.length} 件のメモ
      </footer>
    </section>
  );
}
