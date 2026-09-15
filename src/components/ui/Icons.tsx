import React from "react";

type P = { size?: number; className?: string; strokeWidth?: number };

function S({ size = 18, className = "", strokeWidth = 1.7, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden focusable="false"
    >
      {children}
    </svg>
  );
}

export const ChevronDown = (p: P) => <S {...p}><path d="M6 9.5 12 15.5 18 9.5" /></S>;
export const ChevronRight = (p: P) => <S {...p}><path d="M9.5 6 15.5 12 9.5 18" /></S>;

export const Folder = (p: P) => (
  <S {...p}>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.1a2 2 0 0 1 1.5.7l1 1.2h7.4A2.5 2.5 0 0 1 21 9.4v7.1A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
  </S>
);

export const Trash = (p: P) => (
  <S {...p}>
    <path d="M4 7h16M9.5 7V5.6A1.6 1.6 0 0 1 11.1 4h1.8A1.6 1.6 0 0 1 14.5 5.6V7" />
    <path d="M6.5 7l.8 11.1A2 2 0 0 0 9.3 20h5.4a2 2 0 0 0 2-1.9L17.5 7" />
    <path d="M10.5 10.5v6M13.5 10.5v6" />
  </S>
);

export const Tag = (p: P) => (
  <S {...p}>
    <path d="M11.6 3.4 20 11.8a1.6 1.6 0 0 1 0 2.3l-5.9 5.9a1.6 1.6 0 0 1-2.3 0L3.4 11.6A1.4 1.4 0 0 1 3 10.6V4.4A1.4 1.4 0 0 1 4.4 3h6.2a1.4 1.4 0 0 1 1 .4Z" />
    <circle cx="7.6" cy="7.6" r="1.35" fill="currentColor" stroke="none" />
  </S>
);

export const FolderPlus = (p: P) => (
  <S {...p}>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.1a2 2 0 0 1 1.5.7l1 1.2h7.4A2.5 2.5 0 0 1 21 9.4v7.1A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
    <path d="M12 10.6v4.8M9.6 13h4.8" />
  </S>
);

export const Ellipsis = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <circle cx="8.6" cy="12" r=".95" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r=".95" fill="currentColor" stroke="none" />
    <circle cx="15.4" cy="12" r=".95" fill="currentColor" stroke="none" />
  </S>
);

export const Share = (p: P) => (
  <S {...p}>
    <path d="M12 15V3.8" />
    <path d="M8.4 7.2 12 3.6l3.6 3.6" />
    <path d="M7 10.5H6A2 2 0 0 0 4 12.5v6A2 2 0 0 0 6 20.5h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
  </S>
);

export const Compose = (p: P) => (
  <S {...p}>
    <path d="M19 13.2v5.3A2.5 2.5 0 0 1 16.5 21h-9A2.5 2.5 0 0 1 5 18.5v-9A2.5 2.5 0 0 1 7.5 7h5.3" />
    <path d="M17.6 3.9a1.9 1.9 0 0 1 2.7 2.7l-7.7 7.7-3.3.6.6-3.3z" />
  </S>
);

export const Undo = (p: P) => (
  <S {...p}>
    <path d="M4 9h9.6a5.4 5.4 0 0 1 0 10.8H9" />
    <path d="M7.6 5.2 3.8 9l3.8 3.8" />
  </S>
);

export const Redo = (p: P) => (
  <S {...p}>
    <path d="M20 9h-9.6a5.4 5.4 0 0 0 0 10.8H15" />
    <path d="M16.4 5.2 20.2 9l-3.8 3.8" />
  </S>
);

export const TextFormat = ({ size = 18, className = "" }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
    <text x="12" y="17.4" textAnchor="middle" fontSize="15.5" fontWeight="600" fill="currentColor"
      fontFamily="-apple-system, BlinkMacSystemFont, system-ui, sans-serif">Aa</text>
  </svg>
);

export const Checklist = (p: P) => (
  <S {...p}>
    <circle cx="5.4" cy="7" r="2.4" />
    <path d="M4.4 16.6 5.6 17.8 7.4 15.4" />
    <circle cx="5.4" cy="16.8" r="2.4" fill="currentColor" fillOpacity=".18" />
    <path d="M11 7h9M11 16.8h9" />
  </S>
);

export const Table = (p: P) => (
  <S {...p}>
    <rect x="3.4" y="5" width="17.2" height="14" rx="2.2" />
    <path d="M3.4 10h17.2M9.6 10v9M15.2 10v9" />
  </S>
);

export const Paperclip = (p: P) => (
  <S {...p}>
    <path d="M19.2 11.3 12 18.5a4.1 4.1 0 0 1-5.8-5.8l7.4-7.4a2.7 2.7 0 1 1 3.8 3.8l-7.3 7.3a1.3 1.3 0 0 1-1.9-1.9l6.7-6.7" />
  </S>
);

export const Markup = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.7" />
    <path d="M15.4 8.3 9.6 14.1l-.6 2.1 2.1-.6 5.8-5.8a1.05 1.05 0 0 0-1.5-1.5Z" />
  </S>
);

export const Search = (p: P) => (
  <S {...p}>
    <circle cx="10.8" cy="10.8" r="6.2" />
    <path d="m15.4 15.4 4 4" />
  </S>
);

export const Sun = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
  </S>
);

export const Moon = (p: P) => (
  <S {...p}>
    <path d="M20 14.2A8.4 8.4 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2Z" />
  </S>
);

export const Auto = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 3.6v16.8" />
    <path d="M12 3.6a8.4 8.4 0 0 1 0 16.8Z" fill="currentColor" stroke="none" />
  </S>
);

export const Droplet = (p: P) => (
  <S {...p}>
    <path d="M12 3.5c3.4 3.6 5.6 6.3 5.6 9a5.6 5.6 0 1 1-11.2 0c0-2.7 2.2-5.4 5.6-9Z" />
  </S>
);

export const Pin = (p: P) => (
  <S {...p}>
    <path d="M14.6 3.4 20.6 9.4l-2.5.6-3 3 .4 3.7-1.5 1.5-7.2-7.2 1.5-1.5 3.7.4 3-3z" />
    <path d="M7.8 16.2 4 20" />
  </S>
);

export const Restore = (p: P) => (
  <S {...p}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M3.6 4.4v4h4" />
  </S>
);

export const Eraser = (p: P) => (
  <S {...p}>
    <path d="m8.6 20-4.2-4.2a1.9 1.9 0 0 1 0-2.7l8-8a1.9 1.9 0 0 1 2.7 0l4.8 4.8a1.9 1.9 0 0 1 0 2.7L14.7 20Z" />
    <path d="M20 20h-9M8.6 9.4 14.6 15.4" />
  </S>
);

export const Pen = (p: P) => (
  <S {...p}>
    <path d="M4 20.2 4.9 16l11-11a2.2 2.2 0 0 1 3.1 3.1l-11 11z" />
    <path d="M14.4 6.6 17.4 9.6" />
  </S>
);

export const Marker = (p: P) => (
  <S {...p}>
    <path d="M6 14.6 14.8 5.8a2.4 2.4 0 0 1 3.4 3.4L9.4 18H6z" />
    <path d="M4 21h16" strokeWidth="2.6" />
  </S>
);

export const Close = (p: P) => <S {...p}><path d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6" /></S>;
export const Check = (p: P) => <S {...p}><path d="m5 12.6 4.6 4.6L19 7.4" /></S>;
export const Sidebar = (p: P) => (
  <S {...p}>
    <rect x="3.2" y="5" width="17.6" height="14" rx="2.4" />
    <path d="M9.6 5v14" />
  </S>
);
