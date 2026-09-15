"use client";

import React, { useState } from "react";
import { Glass } from "@/components/glass/Glass";
import * as I from "@/components/ui/Icons";
import { allTags, folderCount, useStore } from "@/lib/store";

type RowProps = {
  id: string;
  name: string;
  icon: React.ReactNode;
  count?: number;
  deletable?: boolean;
  selected: boolean;
  editing: boolean;
  renaming: boolean;
  draft: string;
  onSelect: (id: string) => void;
  onDraft: (v: string) => void;
  onBeginRename: (id: string, name: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onDelete: (id: string) => void;
};

function FolderRow({
  id, name, icon, count, deletable, selected, editing, renaming, draft,
  onSelect, onDraft, onBeginRename, onCommitRename, onCancelRename, onDelete,
}: RowProps) {
  if (renaming) {
    return (
      <div className="row" data-selected={selected}>
        <span style={{ color: "var(--accent)" }}>{icon}</span>
        <input
          autoFocus
          className="folder-input"
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          onBlur={onCommitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommitRename();
            if (e.key === "Escape") onCancelRename();
          }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="row on-glass"
      data-selected={selected}
      onClick={() => onSelect(id)}
      onDoubleClick={() => { if (deletable) onBeginRename(id, name); }}
    >
      <span style={{ color: "var(--accent)" }} className="shrink-0">{icon}</span>
      <span className="flex-1 truncate text-[13.5px]">{name}</span>
      {editing && deletable ? (
        <span className="flex items-center gap-0.5">
          <span
            role="button"
            tabIndex={0}
            className="mini-btn"
            title="名称を変更"
            onClick={(e) => { e.stopPropagation(); onBeginRename(id, name); }}
            onKeyDown={(e) => { if (e.key === "Enter") onBeginRename(id, name); }}
          >
            <I.Compose size={13} />
          </span>
          <span
            role="button"
            tabIndex={0}
            className="mini-btn mini-btn--danger"
            title="フォルダを削除"
            onClick={(e) => { e.stopPropagation(); onDelete(id); }}
            onKeyDown={(e) => { if (e.key === "Enter") onDelete(id); }}
          >
            <I.Trash size={13} />
          </span>
        </span>
      ) : (
        count !== undefined && <span className="t-tiny tabular-nums">{count}</span>
      )}
    </button>
  );
}

export function Sidebar() {
  const { data, settings, setSettings, dispatch } = useStore();
  const [editing, setEditing] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const user = data.folders.filter((f) => !f.system).sort((a, b) => a.order - b.order);
  const all = data.folders.find((f) => f.system === "all");
  const trash = data.folders.find((f) => f.system === "trash");
  const tags = allTags(data);

  const shared = {
    editing,
    draft,
    onSelect: (id: string) => dispatch({ type: "selectFolder", id }),
    onDraft: setDraft,
    onBeginRename: (id: string, name: string) => { setRenameId(id); setDraft(name); },
    onCommitRename: () => {
      if (renameId) dispatch({ type: "renameFolder", id: renameId, name: draft });
      setRenameId(null);
    },
    onCancelRename: () => setRenameId(null),
    onDelete: (id: string) => dispatch({ type: "deleteFolder", id }),
  };

  return (
    <section className="pane pane--sidebar">
      <header className="pane__head">
        <h2 className="t-title on-glass">フォルダ</h2>
        <button type="button" className="pill-btn" onClick={() => setEditing((v) => !v)}>
          {editing ? "完了" : "編集"}
        </button>
      </header>

      <div className="scroll sidebar__body">
        <button
          type="button"
          className="section-head"
          aria-expanded={settings.icloudOpen}
          onClick={() => setSettings({ icloudOpen: !settings.icloudOpen })}
        >
          <span className="t-head on-glass">iCloud</span>
          <span className="chev" data-open={settings.icloudOpen}><I.ChevronDown size={16} /></span>
        </button>

        <div className="disclosure" data-open={settings.icloudOpen}>
          <div className="disclosure__inner">
            {all && (
              <FolderRow
                {...shared}
                id={all.id} name={all.name} icon={<I.Folder size={17} />}
                count={folderCount(data, all.id)}
                selected={data.selectedFolderId === all.id}
                renaming={false}
              />
            )}
            {user.map((f) => (
              <FolderRow
                key={f.id}
                {...shared}
                id={f.id} name={f.name} icon={<I.Folder size={17} />}
                count={folderCount(data, f.id)}
                deletable
                selected={data.selectedFolderId === f.id}
                renaming={renameId === f.id}
              />
            ))}
            {trash && (
              <FolderRow
                {...shared}
                id={trash.id} name={trash.name} icon={<I.Trash size={17} />}
                count={folderCount(data, trash.id)}
                selected={data.selectedFolderId === trash.id}
                renaming={false}
              />
            )}
          </div>
        </div>

        <button
          type="button"
          className="section-head mt-2"
          aria-expanded={settings.tagsOpen}
          onClick={() => setSettings({ tagsOpen: !settings.tagsOpen })}
        >
          <span className="t-head on-glass">タグ</span>
          <span className="chev" data-open={settings.tagsOpen}>
            {settings.tagsOpen ? <I.ChevronDown size={16} /> : <I.ChevronRight size={16} />}
          </span>
        </button>

        <div className="disclosure" data-open={settings.tagsOpen}>
          <div className="disclosure__inner">
            {tags.length === 0 ? (
              <p className="t-tiny px-2.5 py-1.5">タグはまだありません</p>
            ) : (
              tags.map((t) => (
                <div key={t} className="row on-glass">
                  <span style={{ color: "var(--accent)" }}><I.Tag size={16} /></span>
                  <span className="flex-1 truncate text-[13.5px]">{t}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <footer className="sidebar__foot">
        <NewFolderButton />
      </footer>
    </section>
  );
}

function NewFolderButton() {
  const { dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const create = () => {
    dispatch({ type: "createFolder", name });
    setName("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <Glass
        variant="control"
        radius={17}
        bevel={9}
        className="w-[34px] h-[34px]"
        contentClassName="items-center justify-center"
      >
        <button type="button" className="icon-btn" title="新規フォルダ" onClick={() => setOpen((v) => !v)}>
          <I.FolderPlus size={17} />
        </button>
      </Glass>

      <div
        className="menu"
        data-open={open}
        style={{ position: "absolute", bottom: "calc(100% + 10px)", left: 0, width: 230, zIndex: 60, transformOrigin: "bottom left" }}
      >
        <Glass variant="chrome" radius={14} bevel={11} contentClassName="p-2.5 gap-2">
          <label className="t-tiny" htmlFor="new-folder-name">新しいフォルダの名前</label>
          <input
            id="new-folder-name"
            className="folder-input folder-input--boxed"
            value={name}
            placeholder="無題のフォルダ"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
              if (e.key === "Escape") setOpen(false);
            }}
          />
          <div className="flex justify-end gap-1">
            <button type="button" className="pill-btn" onClick={() => setOpen(false)}>キャンセル</button>
            <button type="button" className="pill-btn" style={{ fontWeight: 600 }} onClick={create}>作成</button>
          </div>
        </Glass>
      </div>
    </div>
  );
}
