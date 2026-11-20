import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ToothLogo } from "../components/Icon";
import { useStore } from "../store";

/** Aberta pelo link do e-mail de convite ou de "esqueci minha senha". */
export function ResetPassword() {
  const { user, status, setNewPassword } = useStore();
  const nav = useNavigate();
  const [pw, setPw] = useState({ a: "", b: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.a.length < 8) return setError("Use pelo menos 8 caracteres.");
    if (pw.a !== pw.b) return setError("As duas senhas não são iguais.");
    setBusy(true);
    const r = await setNewPassword(pw.a);
    setBusy(false);
    if (r.ok) nav("/", { replace: true });
    else setError(r.message ?? "");
  };

  return (
    <div className="reset-page">
      <form className="login-form" onSubmit={submit} noValidate>
        <p className="login-wordmark reset-brand">
          <ToothLogo size={36} />
          <span>Endo Evolution</span>
        </p>
        {status === "loading" ? (
          <p className="muted">Verificando o link…</p>
        ) : user ? (
          <>
            <h1 className="title-sm">Crie sua senha</h1>
            <p className="muted">
              Olá, {user.name.split(" ")[0]}. Escolha uma senha para entrar na plataforma.
            </p>
            <label className="field">
              <span>Nova senha</span>
              <input type="password" autoComplete="new-password" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} aria-describedby="pw-rule" />
              <small id="pw-rule" className="caption">
                Pelo menos 8 caracteres.
              </small>
            </label>
            <label className="field">
              <span>Repita a senha</span>
              <input type="password" autoComplete="new-password" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? "Salvando…" : "Salvar e entrar"}
            </button>
          </>
        ) : (
          <>
            <h1 className="title-sm">Link inválido ou expirado</h1>
            <p className="muted">Peça um novo link na tela de login, em “Esqueci minha senha”.</p>
            <Link to="/login" className="btn btn-primary btn-block">
              Ir para o login
            </Link>
          </>
        )}
      </form>
    </div>
  );
}
