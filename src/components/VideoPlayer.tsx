import { parseVideo } from "../lib/video";

export function VideoPlayer({ url, title, onEnded }: { url: string; title: string; onEnded?: () => void }) {
  const v = parseVideo(url);
  return (
    <div className="player">
      {v.kind === "file" && <video key={v.src} src={v.src} controls playsInline preload="metadata" onEnded={onEnded} aria-label={title} />}
      {(v.kind === "youtube" || v.kind === "vimeo") && (
        <iframe key={v.embed} src={v.embed} title={title} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen />
      )}
      {v.kind === "none" && <p className="player-empty">O vídeo desta aula ainda não foi publicado.</p>}
    </div>
  );
}
