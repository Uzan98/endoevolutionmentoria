import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { ToothLogo } from "../components/Icon";

export function Login() {
  const { user, login, db } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (user) return <Navigate to="/" replace />;

  const totalLessons = db.modules.reduce((s, m) => s + m.lessons.length, 0);
  const from = (loc.state as { from?: string } | null)?.from ?? "/";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (login(email, password)) nav(from, { replace: true });
    else setError("E-mail ou senha incorretos. Confira os dados e tente de novo.");
  };

  const fill = (who: "aluno" | "mentor") => {
    const u = db.users.find((x) => x.role === who)!;
    setEmail(u.email);
    setPassword(u.password);
    setError("");
  };

  return (
    <div className="login">
      <section className="login-field">
        <img className="login-art" src="/img/dente-vidro.webp" alt="" aria-hidden="true" />
        <p className="login-wordmark">
          <ToothLogo />
          <span>
            Endo
            <br />
            Evolution
          </span>
        </p>
        <div className="login-copy">
          <h1 className="login-title">A sua endodontia, um módulo por vez.</h1>
          <p className="login-sub">
            Área de membros da mentoria: {db.modules.length} módulos, {totalLessons} video-aulas, materiais de apoio e encontros
            ao vivo quinzenais para discutir os seus casos.
          </p>
        </div>
        <ol className="login-modules" aria-label="Módulos da mentoria">
          {db.modules.map((m, i) => (
            <li key={m.id}>
              <span className="login-mod-num">{i + 1}</span>
              {m.title}
            </li>
          ))}
        </ol>
      </section>

      <section className="login-form-wrap">
        <form className="login-form" onSubmit={submit} noValidate>
          <h2 className="title-sm">Entrar na plataforma</h2>
          <label className="field">
            <span>E-mail</span>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={error ? "login-error" : undefined}
              required
            />
          </label>
          {error && (
            <p id="login-error" className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary btn-block" type="submit">
            Entrar
          </button>

          <div className="demo-box">
            <p>Acesso de demonstração (senha demo123):</p>
            <div className="row-gap">
              <button type="button" className="btn btn-secondary" onClick={() => fill("aluno")}>
                Entrar como aluna
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => fill("mentor")}>
                Entrar como mentor
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
