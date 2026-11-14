import { usePWAInstall } from "../lib/pwa";
import { Icon } from "./Icon";

/** Convite para instalar o app (só aparece no celular, fora do modo app). */
export function InstallCard() {
  const { mode, visible, install, dismiss } = usePWAInstall();
  if (!visible) return null;
  return (
    <aside className="install-card" aria-label="Instalar o app">
      <img src="/icons/icon-192.png" alt="" width={44} height={44} />
      <div className="install-text">
        <strong>Instale o app Endo Evolution</strong>
        {mode === "android" ? (
          <span>Acesso direto da tela inicial, em tela cheia.</span>
        ) : (
          <span>
            Toque em <ShareGlyph /> Compartilhar e depois em <b>Adicionar à Tela de Início</b>.
          </span>
        )}
      </div>
      {mode === "android" && (
        <button className="btn btn-primary btn-sm" onClick={install}>
          Instalar
        </button>
      )}
      <button className="icon-btn" aria-label="Agora não" onClick={dismiss}>
        <Icon name="close" size={16} />
      </button>
    </aside>
  );
}

function ShareGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="ícone de compartilhar" role="img" style={{ verticalAlign: "-2px" }}>
      <path d="M12 3v12M8 7l4-4 4 4M6 11H5v10h14V11h-1" />
    </svg>
  );
}
