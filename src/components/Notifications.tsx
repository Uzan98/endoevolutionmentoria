import { useState } from "react";
import { useStore } from "../store";
import { Icon } from "./Icon";
import { disablePush, enablePush, testPush, useNotificationPrefs, usePushState } from "../lib/push";

const IOS_STEPS = "No iPhone, as notificações chegam pelo app instalado: no Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”. Abra o app pelo ícone e ative aqui.";

/** Painel de notificações (Meu perfil). */
export function NotificationSettings() {
  const { user } = useStore();
  const state = usePushState();
  const { prefs, update } = useNotificationPrefs(user?.id);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!user) return null;
  const mentor = user.role === "mentor";

  const run = async (fn: () => Promise<{ ok: boolean; message?: string } | void>, okText?: string) => {
    setBusy(true);
    setMsg(null);
    const r = await fn();
    setBusy(false);
    if (r && !r.ok) setMsg({ ok: false, text: r.message ?? "Não foi possível concluir." });
    else if (r?.message || okText) setMsg({ ok: true, text: r?.message ?? okText! });
  };

  const options: { key: keyof typeof prefs; label: string; hint: string; show: boolean }[] = [
    { key: "chat", label: "Mensagens", hint: mentor ? "Quando um aluno escreve no chat." : "Quando a equipe responde no chat.", show: true },
    { key: "forum", label: "Fórum", hint: mentor ? "Dúvidas novas dos alunos." : "Quando alguém responde a sua dúvida.", show: true },
    { key: "meetings", label: "Encontros ao vivo", hint: "1 hora antes e quando começar.", show: true },
    { key: "lessons", label: "Aulas novas", hint: "Quando uma aula nova é publicada.", show: !mentor },
  ];

  return (
    <div className="settings-panel">
      <div className="push-status">
        <span className={`icon-chip${state === "on" ? " icon-chip-solid" : ""}`}><Icon name="bell" size={20} /></span>
        <div>
          <strong>
            {state === "on" && "Ativadas neste aparelho"}
            {state === "off" && "Desativadas neste aparelho"}
            {state === "denied" && "Bloqueadas neste aparelho"}
            {state === "needs-install" && "Instale o app para receber"}
            {state === "unsupported" && "Este navegador não recebe notificações"}
            {state === "loading" && "Verificando…"}
          </strong>
          <p className="muted">
            {state === "on" && "Você recebe avisos mesmo com o app fechado."}
            {state === "off" && "Ative para ser avisado de mensagens, respostas e encontros, mesmo com o app fechado."}
            {state === "denied" && "Para liberar: Ajustes do aparelho → Notificações (ou o cadeado ao lado do endereço, no computador)."}
            {state === "needs-install" && IOS_STEPS}
            {state === "unsupported" && "Use o Chrome, o Edge, o Safari ou o app instalado."}
          </p>
        </div>
      </div>
      {(state === "off" || state === "on") && (
        <div className="push-actions">
          {state === "off" ? (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(enablePush, "Notificações ativadas neste aparelho.")}>
              <Icon name="bell" size={18} /> Ativar notificações
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => run(testPush)}>
                Enviar notificação de teste
              </button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => run(async () => disablePush(), "Desativadas neste aparelho.")}>
                Desativar neste aparelho
              </button>
            </>
          )}
        </div>
      )}
      {msg && <span className={msg.ok ? "caption" : "form-error"} role="status">{msg.text}</span>}

      <fieldset className="push-prefs">
        <legend>O que você quer receber</legend>
        {options.filter((o) => o.show).map((o) => (
          <label key={o.key} className="pref-row">
            <span>
              <strong>{o.label}</strong>
              <small className="muted">{o.hint}</small>
            </span>
            <input type="checkbox" className="switch" checked={prefs[o.key]} onChange={(e) => void update({ [o.key]: e.target.checked })} />
          </label>
        ))}
      </fieldset>
    </div>
  );
}

const NUDGE_KEY = "endoevolution:push-nudge-dismissed";

/** Convite para ativar as notificações, dentro do chat. */
export function PushNudge({ text }: { text: string }) {
  const state = usePushState();
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(NUDGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [msg, setMsg] = useState<string | null>(null);
  if (hidden || (state !== "off" && state !== "needs-install")) return null;
  const close = () => {
    setHidden(true);
    try {
      localStorage.setItem(NUDGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="push-nudge" role="note">
      <Icon name="bell" size={18} />
      <span>{msg ?? (state === "needs-install" ? "Instale o app (Compartilhar → Adicionar à Tela de Início) para receber notificações." : text)}</span>
      {state === "off" && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={async () => {
            const r = await enablePush();
            if (r.ok) close();
            else setMsg(r.message ?? null);
          }}
        >
          Ativar
        </button>
      )}
      <button type="button" className="icon-btn" aria-label="Dispensar" onClick={close}>
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
