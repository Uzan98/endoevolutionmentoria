export type VideoSource =
  | { kind: "youtube"; embed: string }
  | { kind: "vimeo"; embed: string }
  | { kind: "file"; src: string }
  | { kind: "none" };

/** Aceita links do YouTube, Vimeo ou um arquivo de vídeo direto (.mp4, .webm, .m3u8). */
export function parseVideo(url: string): VideoSource {
  const u = url.trim();
  if (!u) return { kind: "none" };
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { kind: "youtube", embed: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1` };
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/);
  if (vm) return { kind: "vimeo", embed: `https://player.vimeo.com/video/${vm[1]}${vm[2] ? `?h=${vm[2]}` : ""}` };
  return { kind: "file", src: u };
}
