import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { InstallCard } from "../components/InstallCard";
import { useStore } from "../store";
import { useChat } from "../chat";
import { firstName, greeting, initials, meetingDate, plural, relativeDay, timeAgo } from "../lib/format";
import type { User } from "../data/seed";

// Início do mentor: como está a turma e o que precisa dele agora.
// Tudo calculado com os dados que o mentor já recebe (progresso, fórum, chat e último acesso).

const DAY = 86400000;
const ddmm = (t: number) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(t));

type Status = "done" | "ok" | "warn" | "stalled" | "new" | "idle";
const STATUS: Record<Status, { label: string; tone: "good" | "warn" | "bad" | "neutral"; icon: string; rank: number }> = {
  stalled: { label: "Parado", tone: "bad", icon: "alert", rank: 0 },
  idle: { label: "Não começou", tone: "warn", icon: "alert", rank: 1 },
  warn: { label: "Atenção", tone: "warn", icon: "clock", rank: 2 },
  new: { label: "Começando", tone: "neutral", icon: "play", rank: 3 },
  ok: { label: "Em dia", tone: "good", icon: "check", rank: 4 },
  done: { label: "Concluiu", tone: "good", icon: "solved", rank: 5 },
};

interface Row {
  s: User;
  done: number;
  pct: number;
  moduleIdx: number; // módulo atual (-1 = concluiu)
  last: number | null; // última atividade de qualquer tipo (ms)
  idleDays: number | null; // dias sem concluir uma aula

  status: Status;
  unread: number;
}

export function MentorHome() {
  const { db, user, allLessons } = useStore();
  const chat = useChat();
  const [filter, setFilter] = useState<"all" | "attention" | "ok">("all");
  const now = Date.now();

  const students = useMemo(() => db.users.filter((u) => u.role !== "mentor"), [db.users]);
  const mentorIds = useMemo(() => new Set(db.users.filter((u) => u.role === "mentor").map((u) => u.id)), [db.users]);

  const rows: Row[] = useMemo(
    () =>
      students.map((s) => {
        const prog = db.progress[s.id] ?? {};
        const doneIds = allLessons.filter((l) => prog[l.id]);
        const pct = allLessons.length ? Math.round((doneIds.length / allLessons.length) * 100) : 0;
        const moduleIdx = db.modules.findIndex((m) => m.lessons.some((l) => !prog[l.id]));
        // última atividade: acesso, aula concluída, mensagem ou participação no fórum
        const times = [
          s.lastSeenAt,
          ...Object.values(prog).map((p) => p.completedAt),
          ...chat.messages.filter((m) => m.senderId === s.id).map((m) => m.createdAt),
          ...db.threads.filter((t) => t.authorId === s.id).map((t) => t.createdAt),
          ...db.replies.filter((r) => r.authorId === s.id).map((r) => r.createdAt),
        ]
          .filter(Boolean)
          .map((t) => Date.parse(t as string));
        const last = times.length ? Math.max(...times) : null;
        // situação = ritmo de estudo: há quantos dias não conclui uma aula
        const lessonTimes = Object.values(prog).map((p) => Date.parse(p.completedAt));
        const idleDays = lessonTimes.length ? Math.floor((now - Math.max(...lessonTimes)) / DAY) : null;
        const joinedDays = s.joinedAt ? (now - Date.parse(s.joinedAt)) / DAY : 0;
        let status: Status;
        if (pct >= 100) status = "done";
        else if (doneIds.length === 0) status = joinedDays <= 7 ? "new" : "idle";
        else if (idleDays === null || idleDays > 14) status = "stalled";
        else if (idleDays > 7) status = "warn";
        else status = "ok";
        return { s, done: doneIds.length, pct, moduleIdx, last, idleDays, status, unread: chat.unread(s.id) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [students, db.progress, db.threads, db.replies, db.modules, allLessons, chat.messages, chat.unread],
  );

  if (!user) return null;

  // ---------------------------------------------------------------- indicadores
  const total = rows.length;
  const active = rows.filter((r) => r.last && now - r.last <= 7 * DAY).length;
  const avgPct = total ? Math.round(rows.reduce((n, r) => n + r.pct, 0) / total) : 0;
  const completions = students.flatMap((s) => Object.values(db.progress[s.id] ?? {}).map((p) => Date.parse(p.completedAt)));
  const thisWeek = completions.filter((t) => now - t < 7 * DAY).length;
  const lastWeek = completions.filter((t) => now - t >= 7 * DAY && now - t < 14 * DAY).length;
  const unanswered = db.threads
    .filter((t) => !db.replies.some((r) => r.threadId === t.id && mentorIds.has(r.authorId)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const waitingChats = rows.filter((r) => r.unread > 0);
  const atRisk = rows.filter((r) => r.status === "stalled" || r.status === "idle").sort((a, b) => (b.idleDays ?? 999) - (a.idleDays ?? 999));
  const pending = unanswered.length + waitingChats.length;

  // ---------------------------------------------------------------- ritmo semanal (8 semanas)
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const k = 7 - i; // 7 = mais antiga, 0 = últimos 7 dias
    const end = now - k * 7 * DAY;
    const start = end - 7 * DAY;
    return { start, end, value: completions.filter((t) => t >= start && t < end).length, current: k === 0 };
  });

  // ---------------------------------------------------------------- onde a turma está (por módulo)
  const modules = db.modules.map((m, i) => {
    const finished = rows.filter((r) => m.lessons.length > 0 && m.lessons.every((l) => db.progress[r.s.id]?.[l.id])).length;
    const studying = rows.filter((r) => r.moduleIdx === i && m.lessons.some((l) => db.progress[r.s.id]?.[l.id])).length;
    return { m, i, finished, studying, pct: total ? Math.round((finished / total) * 100) : 0 };
  });

  // ---------------------------------------------------------------- aulas que mais geram dúvidas
  const doubtLessons = allLessons
    .map((l) => ({ l, n: db.threads.filter((t) => t.lessonId === l.id).length, m: db.modules.find((m) => m.lessons.includes(l))! }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3);

  const nextMeeting = db.meetings.find((m) => Date.parse(m.startsAt) + m.durationMin * 60000 > now);

  // ---------------------------------------------------------------- lista de alunos
  const sorted = [...rows].sort((a, b) => STATUS[a.status].rank - STATUS[b.status].rank || (b.last ?? 0) - (a.last ?? 0));
  const shown = sorted.filter((r) =>
    filter === "attention" ? ["stalled", "idle", "warn"].includes(r.status) : filter === "ok" ? ["ok", "done", "new"].includes(r.status) : true,
  );

  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const summary = [
    `${plural(active, "aluno ativo", "alunos ativos")} nos últimos 7 dias`,
    pending ? `${plural(pending, "pendência esperando", "pendências esperando")} por você` : "nenhuma pendência",
  ].join(" · ");

  return (
    <div className="page page-home page-mentor">
      <div className="hello-row hello-row-mentor">
        <header className="hello">
          <p className="eyebrow">{today}</p>
          <h1>
            {greeting()}
            <span className="punct">,</span> {firstName(user.name)}
          </h1>
          <p className="hello-sub">{summary}.</p>
        </header>
      </div>

      <InstallCard />

      <section className="kpis" aria-label="Indicadores da turma">
        <Kpi icon="users" label="Alunos ativos" cap={`nos últimos 7 dias · ${total ? Math.round((active / total) * 100) : 0}% da turma`}>
          {active} <small>de {total}</small>
        </Kpi>
        <Kpi icon="chart" label="Progresso médio" cap="das aulas, considerando toda a turma" bar={avgPct}>
          {avgPct}%
        </Kpi>
        <Kpi icon="check" label="Aulas concluídas" cap={<Delta now={thisWeek} before={lastWeek} />}>
          {thisWeek} <small>nesta semana</small>
        </Kpi>
        <Kpi icon="bell" label="Aguardando você" cap={`${plural(unanswered.length, "dúvida", "dúvidas")} · ${plural(waitingChats.length, "conversa", "conversas")}`} solid={pending > 0}>
          {pending}
        </Kpi>
      </section>

      <section className="mentor-grid">
        <article className="card mentor-card" aria-labelledby="att-title">
          <div className="card-head">
            <h2 className="card-title" id="att-title"><Icon name="bell" size={20} /> Precisa da sua atenção</h2>
          </div>
          <ul className="att-list">
            {waitingChats.map((r) => (
              <AttItem key={`c-${r.s.id}`} to={`/mensagens?aluno=${r.s.id}`} icon="chat" tone="info"
                title={`${firstName(r.s.name)} mandou ${r.unread === 1 ? "uma mensagem" : `${r.unread} mensagens`}`}
                sub={chat.conversation(r.s.id).filter((m) => m.senderId === r.s.id).at(-1)?.body ?? ""} />
            ))}
            {unanswered.slice(0, 4).map((t) => (
              <AttItem key={`t-${t.id}`} to={`/forum/${t.id}`} icon="forum" tone="info"
                title={`Dúvida sem resposta ${timeAgo(t.createdAt)}`} sub={t.title} />
            ))}
            {atRisk.slice(0, 4).map((r) => (
              <AttItem key={`r-${r.s.id}`} to={`/mensagens?aluno=${r.s.id}`} icon="alert" tone="warn"
                title={r.status === "idle" ? `${firstName(r.s.name)} ainda não começou as aulas` : `${firstName(r.s.name)} não conclui uma aula há ${plural(r.idleDays ?? 0, "dia", "dias")}`}
                sub={r.status === "idle" ? `Entrou na turma ${timeAgo(r.s.joinedAt)}. Que tal mandar um incentivo?` : `Parou em ${r.pct}% da mentoria. Mande uma mensagem para retomar.`} />
            ))}
            {!waitingChats.length && !unanswered.length && !atRisk.length && (
              <li className="empty">Tudo em dia: nenhuma dúvida, mensagem ou aluno parado esperando por você.</li>
            )}
          </ul>
        </article>

        <article className="card mentor-card" aria-labelledby="pace-title">
          <div className="card-head">
            <div>
              <h2 className="card-title" id="pace-title"><Icon name="trend" size={20} /> Ritmo da turma</h2>
              <p className="card-sub">Aulas concluídas por semana, últimas 8 semanas</p>
            </div>
          </div>
          <ColumnChart
            data={weeks.map((w) => ({
              label: w.current ? "Agora" : ddmm(w.start),
              value: w.value,
              detail: `${ddmm(w.start)} a ${ddmm(w.end - 1)}`,
            }))}
            unit={["aula", "aulas"]}
          />
        </article>

        <article className="card mentor-card" aria-labelledby="mod-title">
          <div className="card-head">
            <div>
              <h2 className="card-title" id="mod-title"><Icon name="modules" size={20} /> Onde a turma está</h2>
              <p className="card-sub">Alunos que concluíram cada módulo</p>
            </div>
          </div>
          <ul className="hbars">
            {modules.map(({ m, i, finished, studying, pct }) => (
              <li key={m.id} className="hbar" tabIndex={0}
                aria-label={`Módulo ${i + 1}, ${m.title}: ${finished} de ${total} concluíram, ${studying} cursando agora`}>
                <span className="hbar-label"><b>M{i + 1}</b> {m.title}</span>
                <span className="hbar-track"><span className="hbar-fill" style={{ width: `${pct}%` }} /></span>
                <span className="hbar-value">{finished} <small>de {total}</small></span>
                <span className="hbar-tip" role="tooltip">
                  <strong>{pct}% concluíram</strong>
                  <span>{plural(studying, "aluno cursando", "alunos cursando")} agora</span>
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="card mentor-card mentor-side" aria-label="Conteúdo e agenda">
          <div className="card-head">
            <h2 className="card-title"><Icon name="forum" size={20} /> Aulas que mais geram dúvidas</h2>
          </div>
          {doubtLessons.length ? (
            <ol className="doubt-list">
              {doubtLessons.map(({ l, n, m }) => (
                <li key={l.id}>
                  <Link to={`/modulos/${m.id}/aulas/${l.id}`}>
                    <span>{l.title}</span>
                    <small>{plural(n, "dúvida", "dúvidas")}</small>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty">Nenhuma dúvida ligada a aulas ainda.</p>
          )}
          <div className="side-meeting">
            <p className="kpi-label">Próximo encontro ao vivo</p>
            {nextMeeting ? (
              <Link to="/encontros" className="side-meeting-link">
                <strong>{nextMeeting.title}</strong>
                <span>{meetingDate(nextMeeting.startsAt)} · {relativeDay(nextMeeting.startsAt)}</span>
              </Link>
            ) : (
              <Link to="/admin" className="see-all">Agendar encontro <Icon name="arrow" size={16} /></Link>
            )}
          </div>
        </article>
      </section>

      <section className="card mentor-card" aria-labelledby="students-title">
        <div className="card-head card-head-wrap">
          <div>
            <h2 className="card-title" id="students-title"><Icon name="users" size={20} /> Alunos</h2>
            <p className="card-sub">Situação pelo ritmo de estudo: em dia (aula concluída nos últimos 7 dias), atenção (8 a 14 dias), parado (mais de 14)</p>
          </div>
          <div className="tabs" role="tablist" aria-label="Filtrar alunos">
            {([["all", "Todos", rows.length], ["attention", "Atenção", rows.filter((r) => ["stalled", "idle", "warn"].includes(r.status)).length], ["ok", "Em dia", rows.filter((r) => ["ok", "done", "new"].includes(r.status)).length]] as const).map(([id, label, n]) => (
              <button key={id} role="tab" aria-selected={filter === id} className={`tab${filter === id ? " active" : ""}`} onClick={() => setFilter(id)}>
                {label} <span className="chip">{n}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="student-table" role="table" aria-label="Alunos da turma">
          <div className="st-row st-head" role="row">
            <span role="columnheader">Aluno</span>
            <span role="columnheader">Progresso</span>
            <span role="columnheader">Módulo atual</span>
            <span role="columnheader">Última atividade</span>
            <span role="columnheader">Situação</span>
            <span role="columnheader"><span className="sr-only">Ações</span></span>
          </div>
          {shown.map((r) => {
            const st = STATUS[r.status];
            return (
              <div className="st-row" role="row" key={r.s.id}>
                <span role="cell" className="st-who">
                  <span className="chat-avatar">{initials(r.s.name)}</span>
                  <span><strong>{r.s.name}</strong><small>{r.s.city || r.s.email}</small></span>
                </span>
                <span role="cell" className="st-prog">
                  <span className="mini-bar" aria-hidden="true"><span style={{ width: `${r.pct}%` }} /></span>
                  <span className="num">{r.pct}%</span>
                  <small className="st-mobile-label">{r.done} de {allLessons.length} aulas</small>
                </span>
                <span role="cell" className="st-mod">
                  {r.moduleIdx >= 0 ? <>M{r.moduleIdx + 1} <small>{db.modules[r.moduleIdx]?.title}</small></> : "Todos concluídos"}
                </span>
                <span role="cell" className="st-last">{r.last ? timeAgo(new Date(r.last).toISOString()) : "Nunca acessou"}</span>
                <span role="cell">
                  <span className={`status-chip ${st.tone}`}><Icon name={st.icon} size={14} /> {st.label}</span>
                </span>
                <span role="cell" className="st-actions">
                  <Link to={`/mensagens?aluno=${r.s.id}`} className="icon-btn" aria-label={`Mandar mensagem para ${r.s.name}`} title="Mandar mensagem">
                    <Icon name="chat" size={18} />
                    {r.unread > 0 && <span className="icon-dot" aria-hidden="true" />}
                  </Link>
                </span>
              </div>
            );
          })}
          {!shown.length && <p className="empty">Nenhum aluno neste filtro.</p>}
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon, label, cap, bar, solid, children }: { icon: string; label: string; cap: ReactNode; bar?: number; solid?: boolean; children: ReactNode }) {
  return (
    <div className="card kpi-card">
      <span className={`icon-chip${solid ? " icon-chip-solid" : ""}`}><Icon name={icon} size={22} /></span>
      <div>
        <p className="kpi-label">{label}</p>
        <p className="kpi-value">{children}</p>
        {bar !== undefined && (
          <span className="mini-bar" aria-hidden="true"><span style={{ width: `${Math.min(100, bar)}%` }} /></span>
        )}
        <p className="kpi-cap">{cap}</p>
      </div>
    </div>
  );
}

function Delta({ now, before }: { now: number; before: number }) {
  const d = now - before;
  if (d === 0) return <>igual à semana anterior ({before})</>;
  return (
    <span className={`delta ${d > 0 ? "up" : "down"}`}>
      <Icon name={d > 0 ? "up" : "down"} size={12} /> {Math.abs(d)} {d > 0 ? "a mais" : "a menos"} que na semana anterior
    </span>
  );
}

function AttItem({ to, icon, tone, title, sub }: { to: string; icon: string; tone: "info" | "warn"; title: string; sub: string }) {
  return (
    <li>
      <Link to={to} className="att-item">
        <span className={`att-icon ${tone}`}><Icon name={icon} size={18} /></span>
        <span className="att-text">
          <strong>{title}</strong>
          <span>{sub}</span>
        </span>
        <Icon name="chevron" size={16} />
      </Link>
    </li>
  );
}

/** Colunas (uma série): rótulo só na última e na maior; o resto no tooltip e na tabela. */
function ColumnChart({ data, unit }: { data: { label: string; value: number; detail: string }[]; unit: [string, string] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(...data.map((d) => d.value), 1);
  const step = max <= 4 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : 10;
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step).filter((_, i, a) => a.length <= 6 || i % 2 === 0 || i === a.length - 1);
  const maxIdx = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const fmt = (n: number) => `${n} ${n === 1 ? unit[0] : unit[1]}`;

  return (
    <div className="colchart">
      {!table ? (
        <div className="colchart-plot" onPointerLeave={() => setHover(null)}>
          <div className="colchart-grid" aria-hidden="true">
            {ticks.map((t) => (
              <span key={t} style={{ bottom: `${(t / top) * 100}%` }}><i>{t}</i></span>
            ))}
          </div>
          <div className="colchart-cols">
            {data.map((d, i) => (
              <button
                key={d.detail}
                type="button"
                className={`colchart-col${hover === i ? " is-hover" : ""}`}
                aria-label={`${d.detail}: ${fmt(d.value)}`}
                onPointerEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <span className="colchart-bar" style={{ height: `${(d.value / top) * 100}%` }}>
                  {(i === data.length - 1 || i === maxIdx) && d.value > 0 && <em>{d.value}</em>}
                </span>
                {hover === i && (
                  <span className="colchart-tip" role="tooltip">
                    <strong>{fmt(d.value)}</strong>
                    <span>{d.detail}</span>
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="colchart-x" aria-hidden="true">
            {data.map((d) => <span key={d.detail}>{d.label}</span>)}
          </div>
        </div>
      ) : (
        <table className="mini-table">
          <thead><tr><th>Semana</th><th className="r">Aulas concluídas</th></tr></thead>
          <tbody>
            {data.map((d) => <tr key={d.detail}><td>{d.detail}</td><td className="r num">{d.value}</td></tr>)}
          </tbody>
        </table>
      )}
      <button type="button" className="link-btn" onClick={() => setTable(!table)}>{table ? "Ver gráfico" : "Ver como tabela"}</button>
    </div>
  );
}
