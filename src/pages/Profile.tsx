import { useState, type FormEvent } from "react";
import { useStore } from "../store";

export function Profile() {
  const { user, updateUser } = useStore();
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

  const changePw = (e: FormEvent) => {
    e.preventDefault();
    if (pw.current !== user.password) return setPwMsg({ ok: false, text: "A senha atual não confere." });
    if (pw.next.length < 6) return setPwMsg({ ok: false, text: "A nova senha precisa ter pelo menos 6 caracteres." });
    updateUser({ password: pw.next });
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
          <p className="muted">Use pelo menos 6 caracteres.</p>
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
    </div>
  );
}
