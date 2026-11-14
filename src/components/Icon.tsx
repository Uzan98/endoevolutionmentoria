// Ícones de linha, 16px, um único traço. Só aparecem na navegação e em ações pontuais.
const paths: Record<string, string> = {
  home: "M3 10.5 12 4l9 6.5M5.5 9v10.5h13V9",
  modules: "M4 5h16M4 12h16M4 19h10",
  live: "M4 7h11v10H4zM15 10.5l5-3v9l-5-3",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0",
  admin: "M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6L12 3Z",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6 6 18",
  check: "M5 12.5 10 17l9-10",
  play: "M8 5.5v13l10.5-6.5L8 5.5Z",
  file: "M7 3h7l4 4v14H7zM14 3v4h4",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  edit: "M4 20h4L19 9l-4-4L4 16v4Z",
  trash: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13",
  plus: "M12 5v14M5 12h14",
  chevron: "M9 6l6 6-6 6",
  back: "M15 6l-6 6 6 6",
};

export function Icon({ name, size = 16 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
