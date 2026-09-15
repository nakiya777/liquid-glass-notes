/**
 * contentEditable 由来の HTML を許可リスト方式で洗う。
 * localStorage / 貼り付け経由で混入したスクリプトを保存・再描画しないための保険。
 */
const ALLOWED_TAGS = new Set([
  "P", "DIV", "BR", "SPAN", "B", "STRONG", "I", "EM", "U", "S", "STRIKE",
  "H1", "H2", "H3", "H4", "UL", "OL", "LI", "BLOCKQUOTE", "CODE", "PRE",
  "TABLE", "THEAD", "TBODY", "TR", "TD", "TH", "HR", "IMG", "A", "LABEL", "INPUT",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  "*": new Set(["class", "data-checked", "dir"]),
  IMG: new Set(["src", "alt", "width", "height"]),
  A: new Set(["href", "target", "rel"]),
  INPUT: new Set(["type", "checked", "disabled"]),
  TD: new Set(["colspan", "rowspan"]),
  TH: new Set(["colspan", "rowspan"]),
};

function safeUrl(raw: string, allowData: boolean): string | null {
  const v = raw.trim();
  if (allowData && /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(v)) return v;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("/") || v.startsWith("./")) return v;
  return null;
}

export function sanitizeHtml(dirty: string): string {
  if (typeof document === "undefined") return "";
  const host = document.createElement("div");
  host.innerHTML = dirty;

  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (!ALLOWED_TAGS.has(child.tagName)) {
        // タグは落とすが、中身のテキストは残す
        const frag = document.createDocumentFragment();
        while (child.firstChild) frag.appendChild(child.firstChild);
        child.replaceWith(frag);
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        const allowed =
          ALLOWED_ATTRS["*"].has(name) || ALLOWED_ATTRS[child.tagName]?.has(name);
        if (!allowed || name.startsWith("on")) {
          child.removeAttribute(attr.name);
          continue;
        }
        if (name === "src" || name === "href") {
          const url = safeUrl(attr.value, child.tagName === "IMG");
          if (url) child.setAttribute(name, url);
          else child.removeAttribute(attr.name);
        }
      }
      if (child.tagName === "A") {
        child.setAttribute("rel", "noopener noreferrer");
        child.setAttribute("target", "_blank");
      }
      walk(child);
    }
  };
  walk(host);
  return host.innerHTML;
}

/** 一覧のプレビュー用に本文を平文へ落とす */
export function htmlToPlain(html: string): string {
  if (typeof document === "undefined") return "";
  const host = document.createElement("div");
  host.innerHTML = html;
  return (host.textContent ?? "").replace(/\s+/g, " ").trim();
}
