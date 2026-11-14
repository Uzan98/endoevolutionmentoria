export function duration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")} min` : `${h} h`;
}

const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });
const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });
const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** "qui, 19 nov · 20:00" */
export function meetingDate(iso: string): string {
  const d = new Date(iso);
  return `${weekday.format(d).replace(".", "")}, ${dayMonth.format(d).replace(".", "")} · ${time.format(d)}`;
}

export function daysUntil(iso: string): number {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  const b = new Date(iso);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function relativeDay(iso: string): string {
  const n = daysUntil(iso);
  if (n === 0) return "hoje";
  if (n === 1) return "amanhã";
  return `em ${n} dias`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export const firstName = (name: string) => name.split(" ")[0];

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "19 nov" */
export const shortDate = (iso: string) => dayMonth.format(new Date(iso)).replace(".", "").replace(" de ", " ");

/** "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias" ou a data. */
export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return "agora";
  if (diff < 60) return `há ${Math.floor(diff)} min`;
  if (diff < 60 * 24) return `há ${Math.floor(diff / 60)} h`;
  const days = Math.floor(diff / (60 * 24));
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
