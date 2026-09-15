"use client";

import { createContext, useContext } from "react";
import type { InkTool } from "./Ink";

export type EditorApi = {
  exec: (cmd: string, value?: string) => void;
  block: (tag: string) => void;
  insertChecklist: () => void;
  insertTable: () => void;
  insertImage: (src: string) => void;
  focus: () => void;
};

export type MarkupState = {
  on: boolean;
  tool: InkTool;
  color: string;
  size: number;
};

/**
 * エディタ本体とツールバーを繋ぐ。
 * ref を context 越しに共有すると所有者以外が書き換えることになるため、
 * 登録用と呼び出し用の関数だけを渡す。
 */
export type Bus = {
  registerApi: (api: EditorApi | null) => void;
  callApi: (fn: (api: EditorApi) => void) => void;
  markup: MarkupState;
  setMarkup: (patch: Partial<MarkupState>) => void;
};

export const EditorBus = createContext<Bus | null>(null);

export function useBus(): Bus {
  const b = useContext(EditorBus);
  if (!b) throw new Error("useBus must be used within <EditorBus.Provider>");
  return b;
}
