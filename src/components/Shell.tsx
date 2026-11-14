import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { Icon, ToothLogo } from "./Icon";
import { meetingDate, plural, relativeDay } from "../lib/format";
import { useOnline, usePWAInstall } from "../lib/pwa";

export function Shell() {
  const { user, logout, db, isDone } = useStore();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  const online = useOnline();
  const pwa = usePWAInstall();

  // Ao trocar de página: fecha o menu do celular e volta ao topo.
  // (corpo com chaves: scrollTo pode retornar uma Promise, que o React trataria como cleanup)
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  if (!user) return null;
  const links = [
    { to: "/", label: "Início", icon: "home", end: true },
    { to: "/modulos", label: "Módulos", icon: "modules" },
    { to: "/encontros", label: "Encontros ao vivo", icon: "live" },
    { to: "/forum", label: "Fórum", icon: "forum" },
    { to: "/perfil", label: "Meu perfil", icon: "user" },
  ];

  // Card "Continue evoluindo": quanto falta no módulo atual.
  const current = db.modules.findIndex((m) => m.lessons.some((l) => !isDone(l.id)));
  const left = current >= 0 ? db.modules[current].lessons.filter((l) => !isDone(l.id)).length : 0;
  const evolve =
    user.role === "mentor"
      ? "Acompanhe o progresso da turma no painel do mentor."
      : current >= 0
        ? `Você está a ${plural(left, "aula", "aulas")} de concluir o módulo ${current + 1}.`
        : "Você concluiu todos os módulos. Parabéns!";

  // Mentor: dúvidas que ainda não têm resposta dele.
  const mentorIds = new Set(db.users.filter((u) => u.role === "mentor").map((u) => u.id));
  const waiting = db.threads.filter((t) => !db.replies.some((r) => r.threadId === t.id && mentorIds.has(r.authorId))).length;

  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("");

  const side = (
    <>
      <Link to="/" className="brand" aria-label="Endo Evolution, início">
        <ToothLogo />
        <span>
          Endo
          <br />
          Evolution
        </span>
      </Link>
      <nav className="nav" aria-label="Principal">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className="nav-item">
            <Icon name={l.icon} size={20} /> {l.label}
            {l.to === "/forum" && user.role === "mentor" && waiting > 0 && (
              <span className="nav-badge" aria-label={`${waiting} sem resposta do mentor`}>{waiting}</span>
            )}
          </NavLink>
        ))}
        {user.role === "mentor" && (
          <NavLink to="/admin" className="nav-item">
            <Icon name="admin" size={20} /> Painel do mentor
          </NavLink>
        )}
      </nav>
      <div className="side-sep" />
      <div className="me">
        <span className="avatar" aria-hidden="true">{initials}</span>
        <span>
          <strong>{user.name}</strong>
          <small>{user.role === "mentor" ? "Mentor" : "Aluno"}</small>
        </span>
      </div>
      <button
        className="nav-item nav-logout"
        onClick={() => {
          logout();
          nav("/login");
        }}
      >
        <Icon name="logout" size={20} /> Sair
      </button>
      {pwa.mode === "android" && (
        <button className="nav-item nav-install" onClick={pwa.install}>
          <Icon name="down" size={20} /> Instalar o app
        </button>
      )}
      <Link to={user.role === "mentor" ? "/admin" : "/modulos"} className="evolve-card">
        <span className="evolve-bolt"><Icon name="bolt" size={22} /></span>
        <strong>Continue evoluindo!</strong>
        <span>{evolve}</span>
        <span className="evolve-trend"><Icon name="trend" size={34} /></span>
      </Link>
    </>
  );

  return (
    <div className="app">
      <aside className="sidebar">{side}</aside>
      <header className="topbar">
        <Link to="/" className="topbar-brand" aria-label="Endo Evolution, início">
          <ToothLogo size={30} />
          <strong>Endo Evolution</strong>
        </Link>
        <TopActions variant="bar" />
      </header>
      {!online && (
        <p className="offline-bar" role="status">
          Você está sem internet. O app continua funcionando, mas os vídeos precisam de conexão.
        </p>
      )}
      {open && (
        <div className="sheet" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="icon-btn sheet-close" aria-label="Fechar menu" onClick={() => setOpen(false)}>
            <Icon name="close" size={22} />
          </button>
          {side}
        </div>
      )}
      <main className="canvas">
        <TopActions variant="float" />
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="Navegação principal">
        {[
          { to: "/", label: "Início", icon: "home", end: true },
          { to: "/modulos", label: "Módulos", icon: "modules" },
          { to: "/forum", label: "Fórum", icon: "forum" },
          { to: "/encontros", label: "Encontros", icon: "live" },
        ].map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className="tab-item">
            <span className="tab-icon">
              <Icon name={t.icon} size={22} />
              {t.to === "/forum" && user.role === "mentor" && waiting > 0 && <span className="tab-badge">{waiting}</span>}
            </span>
            {t.label}
          </NavLink>
        ))}
        <button className={`tab-item${open ? " active" : ""}`} aria-label="Mais opções" aria-expanded={open} onClick={() => setOpen(true)}>
          <span className="tab-icon">
            <Icon name="menu" size={22} />
          </span>
          Mais
        </button>
      </nav>
    </div>
  );
}

/** Busca de aulas e notificações, no canto superior direito. */
function TopActions({ variant }: { variant: "bar" | "float" }) {
  const { db, user } = useStore();
  const [panel, setPanel] = useState<"search" | "bell" | null>(null);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const loc = useLocation();

  useEffect(() => setPanel(null), [loc.pathname]);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPanel(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const results = q.trim()
    ? db.modules.flatMap((m, mi) =>
        m.lessons.filter((l) => norm(`${l.title} ${l.description}`).includes(norm(q.trim()))).map((l) => ({ m, mi, l })),
      )
    : [];
  const upcoming = db.meetings.filter((m) => new Date(m.startsAt).getTime() + m.durationMin * 60000 > Date.now());
  // Respostas de outras pessoas nas minhas dúvidas, últimos 7 dias.
  const weekAgo = Date.now() - 7 * 86400000;
  const answers = user
    ? db.replies
        .filter((r) => r.authorId !== user.id && new Date(r.createdAt).getTime() > weekAgo)
        .map((r) => ({ r, t: db.threads.find((t) => t.id === r.threadId) }))
        .filter((x) => x.t && x.t.authorId === user.id)
        .sort((a, b) => b.r.createdAt.localeCompare(a.r.createdAt))
        .slice(0, 3)
    : [];
  const hasNews = upcoming.length > 0 || answers.length > 0;

  return (
    <div className={`top-actions top-actions-${variant}`} ref={ref}>
      <button className="round-btn" aria-label="Buscar aulas" aria-expanded={panel === "search"} onClick={() => setPanel(panel === "search" ? null : "search")}>
        <Icon name="search" size={20} />
      </button>
      <button className="round-btn" aria-label="Notificações" aria-expanded={panel === "bell"} onClick={() => setPanel(panel === "bell" ? null : "bell")}>
        <Icon name="bell" size={20} />
        {hasNews && <span className="dot" aria-hidden="true" />}
      </button>

      {panel === "search" && (
        <div className="popover" role="dialog" aria-label="Buscar aulas">
          <input autoFocus className="search-input" placeholder="Buscar aula, ex.: MB2, irrigação…" value={q} onChange={(e) => setQ(e.target.value)} />
          {q.trim() && (
            <ul className="pop-list">
              {results.slice(0, 6).map(({ m, mi, l }) => (
                <li key={l.id}>
                  <Link to={`/modulos/${m.id}/aulas/${l.id}`} className="pop-item">
                    <strong>{l.title}</strong>
                    <span>Módulo {mi + 1} · {m.title}</span>
                  </Link>
                </li>
              ))}
              {results.length === 0 && <li className="pop-empty">Nenhuma aula encontrada para “{q.trim()}”.</li>}
            </ul>
          )}
        </div>
      )}
      {panel === "bell" && (
        <div className="popover" role="dialog" aria-label="Notificações">
          <p className="pop-title">Notificações</p>
          <ul className="pop-list">
            {answers.map(({ r, t }) => (
              <li key={r.id}>
                <Link to={`/forum/${t!.id}`} className="pop-item">
                  <strong>Nova resposta na sua dúvida</strong>
                  <span>
                    {db.users.find((u) => u.id === r.authorId)?.name ?? "Alguém"} respondeu “{t!.title}”
                  </span>
                </Link>
              </li>
            ))}
            {upcoming.slice(0, 3).map((m) => (
              <li key={m.id}>
                <Link to="/encontros" className="pop-item">
                  <strong>Encontro ao vivo {relativeDay(m.startsAt)}</strong>
                  <span>{m.title} · {meetingDate(m.startsAt)}</span>
                </Link>
              </li>
            ))}
            {!hasNews && <li className="pop-empty">Nenhuma notificação nova.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
