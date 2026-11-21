// Ícones de linha (traço 1.8). Os de "ação" são preenchidos via fill quando indicado.
const paths: Record<string, string> = {
  home: "M3.5 10.5 12 4l8.5 6.5V20h-5.5v-5.5h-6V20H3.5z",
  modules: "M4 5h16v5H4zM4 14h16v5H4zM7 7.5h4M7 16.5h4",
  live: "M3.5 6.5h12v11h-12zM15.5 10.5l5-3v9l-5-3M7 10.5h5",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0",
  admin: "M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6L12 3Z",
  logout: "M10 4H5v16h5M14 8l4 4-4 4M18 12H9",
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
  arrow: "M5 12h14M13 6l6 6-6 6",
  calendar: "M4.5 6h15v14h-15zM4.5 10h15M8.5 3.5v4M15.5 3.5v4M9 15l2 2 4-4",
  calendarPlain: "M4.5 6h15v14h-15zM4.5 10h15M8.5 3.5v4M15.5 3.5v4",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5V12l3 2",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16ZM10 20.5a2.2 2.2 0 0 0 4 0",
  bolt: "M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8Z",
  trophy: "M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8.5 20.5h7M9.5 17.5h5v3h-5z",
  chart: "M5 20V13M10 20V8M15 20v-6M20 20V5",
  note: "M6 3.5h9l3 3v14H6zM9 9h6M9 12.5h6M9 16h4",
  trend: "M4 18l6-6 4 4 6-8M15 8h5v5",
  forum: "M3.5 5h12v9H8l-4.5 3.5V5ZM15.5 9h5v11l-3.5-2.8H10V14",
  vote: "M6 15l6-6 6 6",
  solved: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 12.5l2.7 2.7L16 9.8",
  reply: "M10 8 4 13l6 5M4 13h10a6 6 0 0 1 6 6",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20a6.5 6.5 0 0 1 13 0M15.5 4.6a3.5 3.5 0 0 1 0 6.3M17.5 13.8a6.5 6.5 0 0 1 4 6.2",
  alert: "M12 3.5 2.5 20h19L12 3.5ZM12 10v4.5M12 17.3v.2",
  chat: "M4 5.5h16v10.5H9.5L5 19.5V16H4z M8 9.5h8M8 12.5h5",
  send: "M4 12 20 4l-6.5 16-2.5-6.5L4 12ZM11 13.5 20 4",
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z",
  sun: "M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4",
  monitor: "M3.5 5h17v11h-17zM9 20h6M12 16v4",
};

const filled = new Set(["play", "bolt"]);

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const fill = filled.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={fill ? 1 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

/** Marca: dente em linha dupla, como no mockup. */
export function ToothLogo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M24 9.5c-3-2.6-7.6-3.8-11-1.6-4.3 2.8-4.6 9-2.8 14.6 1.5 4.6 2.2 8.7 3.1 13.1.8 4 2.4 6.4 4.3 6.4 2.3 0 3-3.2 3.6-7 .5-3.2 1.3-5.3 2.8-5.3s2.3 2.1 2.8 5.3c.6 3.8 1.3 7 3.6 7 1.9 0 3.5-2.4 4.3-6.4.9-4.4 1.6-8.5 3.1-13.1 1.8-5.6 1.5-11.8-2.8-14.6-3.4-2.2-8-1-11 1.6Z"
        stroke="#BDEDE0"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path d="M19.5 14.5c-2.5-1.3-5.2-.9-6.3 1.6" stroke="#5FD3B8" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M24 13v10" stroke="#5FD3B8" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
