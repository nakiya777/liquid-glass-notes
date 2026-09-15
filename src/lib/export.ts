import type { Note } from "./types";

/** メモを Markdown へ。共有・書き出しはすべて端末内で完結させる */
export function noteToMarkdown(note: Note): string {
  const lines: string[] = [`# ${note.title || "新規メモ"}`, ""];

  if (typeof document !== "undefined" && note.html) {
    const host = document.createElement("div");
    host.innerHTML = note.html;

    const inline = (el: Element): string =>
      Array.from(el.childNodes)
        .map((n) => {
          if (n.nodeType === Node.TEXT_NODE) return n.textContent ?? "";
          const e = n as Element;
          const inner = inline(e);
          switch (e.tagName) {
            case "B": case "STRONG": return `**${inner}**`;
            case "I": case "EM": return `*${inner}*`;
            case "U": return `<u>${inner}</u>`;
            case "S": case "STRIKE": return `~~${inner}~~`;
            case "CODE": return `\`${inner}\``;
            case "BR": return "\n";
            case "A": return `[${inner}](${e.getAttribute("href") ?? ""})`;
            case "IMG": return `![](画像)`;
            default: return inner;
          }
        })
        .join("");

    for (const el of Array.from(host.children)) {
      switch (el.tagName) {
        case "H1": lines.push(`# ${inline(el)}`, ""); break;
        case "H2": lines.push(`## ${inline(el)}`, ""); break;
        case "H3": lines.push(`### ${inline(el)}`, ""); break;
        case "BLOCKQUOTE": lines.push(`> ${inline(el)}`, ""); break;
        case "UL":
          for (const li of Array.from(el.children)) {
            const box = el.classList.contains("checklist")
              ? ((li as HTMLElement).dataset.checked === "true" ? "- [x] " : "- [ ] ")
              : "- ";
            lines.push(box + inline(li));
          }
          lines.push("");
          break;
        case "OL":
          Array.from(el.children).forEach((li, i) => lines.push(`${i + 1}. ${inline(li)}`));
          lines.push("");
          break;
        case "TABLE": {
          const rows = Array.from(el.querySelectorAll("tr"));
          rows.forEach((tr, i) => {
            const cells = Array.from(tr.children).map((td) => inline(td).trim() || " ");
            lines.push(`| ${cells.join(" | ")} |`);
            if (i === 0) lines.push(`|${cells.map(() => " --- ").join("|")}|`);
          });
          lines.push("");
          break;
        }
        default: {
          const t = inline(el).trim();
          if (t) lines.push(t, "");
        }
      }
    }
  }

  if (note.ink.length) lines.push("", `_（手書きストローク ${note.ink.length} 本は Markdown に含まれません）_`);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
