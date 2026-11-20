import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { DEMO_LOGIN, supabase } from "../lib/supabase";
import { ToothLogo } from "../components/Icon";
import { ToothArt } from "../components/ToothArt";

const DEMO = { aluno: "aluna@endoevolution.com", mentor: "mentor@endoevolution.com", senha: "demo123" };

export function Login() {
  const { user, status, login, requestPasswordReset } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [sent, setSent] = useState(false);
  const [catalog, setCatalog] = useState<{ id: string; title: string; lessons: number }[]>([]);

  useEffect(() => {
    supabase
      .from("catalog")
      .select("id, title, lessons")
      .order("position")
      .then(({ data }) => setCatalog(data ?? []));
  }, []);

  if (user && status === "ready") return <Navigate to={(loc.state as { from?: string } | null)?.from ?? "/"} replace />;

  const totalLessons = catalog.reduce((s, m) => s + m.lessons, 0);
  const from = (loc.state as { from?: string } | null)?.from ?? "/";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "forgot") {
      if (!email.includes("@")) return setError("Digite o e-mail cadastrado.");
      setBusy(true);
      const r = await requestPasswordReset(email);
      setBusy(false);
      if (r.ok) setSent(true);
      else setError(r.message ?? "");
      return;
    }
    setBusy(true);
    const r = await login(email, password);
    setBusy(false);
    if (r.ok) nav(from, { replace: true });
    else setError(r.message ?? "");
  };

  const fill = (who: "aluno" | "mentor") => {
    setEmail(DEMO[who]);
    setPassword(DEMO.senha);
    setError("");
  };

  return (
    <div className="login">
      <section className="login-field">
        <ToothArt className="login-art" />
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
            Área de membros da mentoria: {catalog.length || 6} módulos, {totalLessons || "dezenas de"} video-aulas, materiais de apoio e encontros
            ao vivo quinzenais para discutir os seus casos.
          </p>
        </div>
        <ol className="login-modules" aria-label="Módulos da mentoria">
          {catalog.map((m, i) => (
            <li key={m.id}>
              <span className="login-mod-num">{i + 1}</span>
              {m.title}
            </li>
          ))}
        </ol>
      </section>

      <section className="login-form-wrap">
        <form className="login-form" onSubmit={submit} noValidate>
          <h2 className="title-sm">{mode === "login" ? "Entrar na plataforma" : "Recuperar a senha"}</h2>
          {mode === "forgot" && !sent && <p className="muted">Digite o e-mail cadastrado. Enviaremos um link para você criar uma senha nova.</p>}
          {sent ? (
            <p className="form-ok" role="status">
              Se esse e-mail estiver cadastrado, o link chega em alguns minutos. Confira também a caixa de spam.
            </p>
          ) : (
            <>
              <label className="field">
                <span>E-mail</span>
                <input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              {mode === "login" && (
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
              )}
              {error && (
                <p id="login-error" className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Enviar link"}
              </button>
            </>
          )}
          <button
            type="button"
            className="link login-switch"
            onClick={() => {
              setMode(mode === "login" ? "forgot" : "login");
              setSent(false);
              setError("");
            }}
          >
            {mode === "login" ? "Esqueci minha senha" : "Voltar para o login"}
          </button>

          {DEMO_LOGIN && mode === "login" && (
            <div className="demo-box">
              <p>Acesso de demonstração (senha {DEMO.senha}):</p>
              <div className="row-gap">
                <button type="button" className="btn btn-secondary" onClick={() => fill("aluno")}>
                  Entrar como aluna
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => fill("mentor")}>
                  Entrar como mentor
                </button>
              </div>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
