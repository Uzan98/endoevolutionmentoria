import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { Icon, ToothLogo } from "./Icon";
import { meetingDate, plural, relativeDay } from "../lib/format";
import { useAppUpdate, useOnline, usePWAInstall } from "../lib/pwa";
import { useTheme } from "../lib/theme";
import { useChat } from "../chat";
import { setAppBadge, syncPush } from "../lib/push";
import { supabase } from "../lib/supabase";

export function Shell() {
  const { user, logout, db, isDone, error, clearError } = useStore();
  const chat = useChat();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  const online = useOnline();
  const pwa = usePWAInstall();
  const update = useAppUpdate();

  // Mensagem nova fora da página de mensagens: aviso rápido com atalho para a conversa.
  const [incoming, setIncoming] = useState<{ id: string; from: string; to: string; body: string } | null>(null);
  const lastSeen = useRef<string | null | undefined>(undefined);
  const newest = chat.messages.at(-1);
  useEffect(() => {
    if (!chat.ready || !user) return;
    if (lastSeen.current === undefined) {
      lastSeen.current = newest?.id ?? null; // o que já estava lá ao abrir não é novidade
      return;
    }
    if (!newest || newest.id === lastSeen.current) return;
    lastSeen.current = newest.id;
    if (newest.senderId === user.id || newest.state || loc.pathname === "/mensagens") return;
    const from = db.users.find((u) => u.id === newest.senderId)?.name ?? "Equipe Endo Evolution";
    setIncoming({ id: newest.id, from, body: newest.body, to: user.role === "mentor" ? `/mensagens?aluno=${newest.studentId}` : "/mensagens" });
  }, [chat.ready, newest, user, loc.pathname, db.users]);
  useEffect(() => {
    if (!incoming) return;
    const t = window.setTimeout(() => setIncoming(null), 7000);
    return () => window.clearTimeout(t);
  }, [incoming]);
  useEffect(() => {
    if (loc.pathname === "/mensagens") setIncoming(null);
  }, [loc.pathname]);

  // Notificações: confirma a inscrição deste aparelho ao abrir o app (se a permissão já foi dada)
  const userId = user?.id;
  useEffect(() => {
    if (userId) void syncPush();
  }, [userId]);
  // último acesso (painel do mentor): ao abrir e ao voltar para o app; o servidor limita a 1 a cada 10 min
  useEffect(() => {
    if (!userId) return;
    let last = 0;
    const mark = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 10 * 60000) return;
      last = Date.now();
      void supabase.rpc("marcar_acesso").then(() => {}); // a consulta só é enviada quando aguardada
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [userId]);
  // número de mensagens não lidas no ícone do app
  useEffect(() => {
    if (chat.ready) setAppBadge(chat.totalUnread);
  }, [chat.ready, chat.totalUnread]);
  // tocou numa notificação com o app aberto: troca de tela sem recarregar
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== "abrir" || typeof e.data.url !== "string") return;
      const u = new URL(e.data.url, window.location.origin);
      if (u.origin === window.location.origin) nav(u.pathname + u.search);
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, [nav]);

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
    { to: "/mensagens", label: user.role === "mentor" ? "Mensagens" : "Falar com o mentor", icon: "chat" },
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
            {l.to === "/mensagens" && chat.totalUnread > 0 && (
              <span className="nav-badge" aria-label={`${chat.totalUnread} mensagens não lidas`}>{chat.totalUnread}</span>
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
        onClick={async () => {
          await logout();
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
          Você está sem internet. Conecte-se para ver as aulas e o fórum atualizados.
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
      {error && (
        <div className="toast" role="alert">
          <span>{error}</span>
          <button className="icon-btn" aria-label="Fechar aviso" onClick={clearError}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {update.ready && !error && !incoming && (
        <div className="toast toast-update" role="status">
          <span>Nova versão da plataforma disponível.</span>
          <button className="btn btn-primary btn-sm" onClick={update.apply}>Atualizar</button>
        </div>
      )}
      {incoming && !error && (
        <div className="toast toast-chat" role="status">
          <Link to={incoming.to} className="toast-chat-link" onClick={() => setIncoming(null)}>
            <Icon name="chat" size={18} />
            <span>
              <strong>{incoming.from}</strong>
              <span>{incoming.body.length > 90 ? `${incoming.body.slice(0, 90)}…` : incoming.body}</span>
            </span>
          </Link>
          <button className="icon-btn" aria-label="Fechar aviso" onClick={() => setIncoming(null)}>
            <Icon name="close" size={16} />
          </button>
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
          { to: "/mensagens", label: "Mensagens", icon: "chat" },
        ].map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className="tab-item">
            <span className="tab-icon">
              <Icon name={t.icon} size={22} />
              {t.to === "/forum" && user.role === "mentor" && waiting > 0 && <span className="tab-badge">{waiting}</span>}
              {t.to === "/mensagens" && chat.totalUnread > 0 && (
                <span className="tab-badge" aria-label={`${chat.totalUnread} não lidas`}>{chat.totalUnread}</span>
              )}
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
  const chat = useChat();
  const theme = useTheme();
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
  // Mensagens não lidas: o aluno tem uma conversa; o mentor, uma por aluno.
  const unreadChats = user
    ? (user.role === "mentor" ? db.users.filter((u) => u.role !== "mentor").map((u) => u.id) : [user.id])
        .map((id) => ({ id, n: chat.unread(id), name: db.users.find((u) => u.id === id)?.name ?? "" }))
        .filter((x) => x.n > 0)
        .slice(0, 3)
    : [];
  const hasNews = upcoming.length > 0 || answers.length > 0 || unreadChats.length > 0;

  return (
    <div className={`top-actions top-actions-${variant}`} ref={ref}>
      <button
        className="round-btn"
        aria-label={theme.effective === "dark" ? "Usar modo claro" : "Usar modo escuro"}
        title={theme.effective === "dark" ? "Modo claro" : "Modo escuro"}
        onClick={theme.toggle}
      >
        <Icon name={theme.effective === "dark" ? "sun" : "moon"} size={20} />
      </button>
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
            {unreadChats.map((c) => (
              <li key={`chat-${c.id}`}>
                <Link to={user?.role === "mentor" ? `/mensagens?aluno=${c.id}` : "/mensagens"} className="pop-item">
                  <strong>{c.n === 1 ? "Nova mensagem" : `${c.n} mensagens novas`}</strong>
                  <span>{user?.role === "mentor" ? `De ${c.name}` : "Da equipe Endo Evolution"}</span>
                </Link>
              </li>
            ))}
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
