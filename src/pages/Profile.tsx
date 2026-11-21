import { useState, type FormEvent } from "react";
import { useStore } from "../store";
import { useTheme, type ThemeChoice } from "../lib/theme";
import { Icon } from "../components/Icon";
import { NotificationSettings } from "../components/Notifications";

export function Profile() {
  const { user, updateUser, updatePassword } = useStore();
  const theme = useTheme();
  const themeOptions: { id: ThemeChoice; label: string; icon: string }[] = [
    { id: "system", label: "Sistema", icon: "monitor" },
    { id: "light", label: "Claro", icon: "sun" },
    { id: "dark", label: "Escuro", icon: "moon" },
  ];
  const [name, setName] = useState(user?.name ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [saved, setSaved] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!user) return null;

  const save = (e: FormEvent) => {
    e.preventDefault();
    updateUser({ name: name.trim() || user.name, city: city.trim() });
    setSaved(true);
  };

  const changePw = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 8) return setPwMsg({ ok: false, text: "A nova senha precisa ter pelo menos 8 caracteres." });
    setPwMsg(null);
    const r = await updatePassword(pw.current, pw.next);
    if (!r.ok) return setPwMsg({ ok: false, text: r.message ?? "Não foi possível alterar a senha." });
    setPw({ current: "", next: "" });
    setPwMsg({ ok: true, text: "Senha alterada." });
  };

  return (
    <div className="page page-settings">
      <header className="page-head">
        <h1 className="title">Meu perfil</h1>
      </header>

      <section className="settings-row">
        <div className="settings-label">
          <h2>Dados pessoais</h2>
          <p className="muted">Seu nome aparece nos encontros ao vivo e no certificado de conclusão.</p>
        </div>
        <form className="settings-panel" onSubmit={save}>
          <label className="field">
            <span>Nome completo</span>
            <input value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
          </label>
          <label className="field">
            <span>E-mail</span>
            <input value={user.email} disabled aria-describedby="email-hint" />
            <small id="email-hint" className="caption">Para trocar o e-mail de acesso, fale com a equipe da mentoria.</small>
          </label>
          <label className="field">
            <span>Cidade</span>
            <input value={city} onChange={(e) => { setCity(e.target.value); setSaved(false); }} />
          </label>
          <div className="row-gap">
            <button className="btn btn-primary" type="submit">Salvar</button>
            {saved && <span className="caption" role="status">Dados salvos.</span>}
          </div>
        </form>
      </section>

      <section className="settings-row">
        <div className="settings-label">
          <h2>Senha</h2>
          <p className="muted">Use pelo menos 8 caracteres.</p>
        </div>
        <form className="settings-panel" onSubmit={changePw}>
          <label className="field">
            <span>Senha atual</span>
            <input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          </label>
          <label className="field">
            <span>Nova senha</span>
            <input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          </label>
          <div className="row-gap">
            <button className="btn btn-secondary" type="submit">Alterar senha</button>
            {pwMsg && <span className={pwMsg.ok ? "caption" : "form-error"} role="status">{pwMsg.text}</span>}
          </div>
        </form>
      </section>
      <section className="settings-row" id="notificacoes">
        <div className="settings-label">
          <h2>Notificações</h2>
          <p className="muted">Avisos no celular e no computador, mesmo com a plataforma fechada. Ative em cada aparelho que você usa.</p>
        </div>
        <NotificationSettings />
      </section>
      <section className="settings-row">
        <div className="settings-label">
          <h2>Aparência</h2>
          <p className="muted">“Sistema” acompanha o modo claro ou escuro do seu celular ou computador.</p>
        </div>
        <div className="settings-panel">
          <div className="theme-switch" role="group" aria-label="Tema">
            {themeOptions.map((o) => (
              <button key={o.id} type="button" aria-pressed={theme.choice === o.id} onClick={() => theme.setTheme(o.id)}>
                <Icon name={o.icon} size={16} /> {o.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
