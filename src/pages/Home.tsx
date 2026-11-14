import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { ToothArt } from "../components/ToothArt";
import { InstallCard } from "../components/InstallCard";
import { moduleProgress, useStore } from "../store";
import { duration, firstName, meetingDate, relativeDay, shortDate } from "../lib/format";

const weekdayShort = (iso: string) => new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(new Date(iso)).replace(".", "").toUpperCase();
const ddmm = (iso: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(iso));

function Bar({ value }: { value: number }) {
  return (
    <span className="mini-bar" aria-hidden="true">
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </span>
  );
}

export function Home() {
  const { db, user, allLessons, isDone } = useStore();
  const navigate = useNavigate();
  if (!user) return null;

  const done = allLessons.filter((l) => isDone(l.id));
  const watchedMin = done.reduce((s, l) => s + l.durationMin, 0);
  const totalMin = allLessons.reduce((s, l) => s + l.durationMin, 0);
  const pct = allLessons.length ? Math.round((done.length / allLessons.length) * 100) : 0;

  const currentIdx = db.modules.findIndex((m) => m.lessons.some((l) => !isDone(l.id)));
  const current = currentIdx >= 0 ? db.modules[currentIdx] : undefined;
  const last = allLessons.find((l) => l.id === db.lastLesson[user.id]);
  const next = last && !isDone(last.id) ? last : allLessons.find((l) => !isDone(l.id));
  const nextMod = db.modules.find((m) => m.lessons.some((l) => l.id === next?.id));
  const nextModIdx = nextMod ? db.modules.indexOf(nextMod) : -1;
  const nextLessonIdx = nextMod?.lessons.findIndex((l) => l.id === next?.id) ?? -1;
  const nextUrl = nextMod && next ? `/modulos/${nextMod.id}/aulas/${next.id}` : "/modulos";

  const upcoming = db.meetings.filter((m) => new Date(m.startsAt).getTime() + m.durationMin * 60000 > Date.now());
  const notes = Object.entries(db.notes[user.id] ?? {})
    .filter(([, t]) => t.trim())
    .map(([lessonId, text]) => {
      const mod = db.modules.find((m) => m.lessons.some((l) => l.id === lessonId));
      return { lesson: allLessons.find((l) => l.id === lessonId), mod, text };
    })
    .filter((n) => n.lesson && n.mod)
    .slice(-2)
    .reverse();

  const welcome = user.genero === "f" ? "Bem-vinda de volta," : user.genero === "m" ? "Bem-vindo de volta," : "Boas-vindas,";
  const cheer =
    pct >= 100
      ? { title: "Mentoria concluída!", text: "Você assistiu a todas as aulas. Agora é levar tudo para a clínica." }
      : pct >= 30
        ? { title: "Você está indo muito bem!", text: `Já são ${pct}% da mentoria. O conhecimento é o primeiro passo para transformar sua prática.` }
        : { title: "Bom começo!", text: "Cada aula concluída aproxima você de uma endodontia mais segura e previsível." };

  return (
    <div className="page page-home">
      <ToothArt variant="light" className="home-art" />

      <header className="hello">
        <p className="eyebrow">{welcome}</p>
        <h1>
          {firstName(user.name)}! <span className="wave" aria-hidden="true">👋</span>
        </h1>
        <p className="hello-sub">
          {user.role === "mentor" ? "Você está vendo a área do aluno como mentor." : "Continue sua jornada rumo à excelência em Endodontia."}
        </p>
      </header>

      <InstallCard />

      <section className="kpis" aria-label="Resumo do seu progresso">
        <div className="card kpi-card">
          <span className="icon-chip"><Icon name="calendar" size={22} /></span>
          <div>
            <p className="kpi-label">Aulas concluídas</p>
            <p className="kpi-value">
              {done.length} <small>de {allLessons.length}</small>
            </p>
            <Bar value={pct} />
            <p className="kpi-cap">{pct}% da mentoria</p>
          </div>
        </div>
        <div className="card kpi-card">
          <span className="icon-chip"><Icon name="clock" size={22} /></span>
          <div>
            <p className="kpi-label">Tempo de aula assistido</p>
            <p className="kpi-value">{watchedMin ? duration(watchedMin) : "0 min"}</p>
            <p className="kpi-cap">de {duration(totalMin)} de conteúdo</p>
            <Bar value={totalMin ? (watchedMin / totalMin) * 100 : 0} />
          </div>
        </div>
        <Link to={current ? `/modulos/${current.id}` : "/modulos"} className="card kpi-card kpi-link">
          <span className="icon-chip icon-chip-solid"><Icon name="play" size={20} /></span>
          <div>
            <p className="kpi-label">Módulo atual</p>
            <p className="kpi-value">
              {current ? currentIdx + 1 : db.modules.length} <small>de {db.modules.length}</small>
            </p>
            <p className="kpi-cap">{current?.title ?? "Mentoria concluída"}</p>
          </div>
          <span className="chev" aria-hidden="true"><Icon name="chevron" size={16} /></span>
        </Link>
        <Link to="/encontros" className="card kpi-card kpi-link">
          <span className="icon-chip"><Icon name="calendarPlain" size={22} /></span>
          <div>
            <p className="kpi-label">Próximo encontro</p>
            {upcoming[0] ? (
              <>
                <p className="kpi-value">{shortDate(upcoming[0].startsAt)}</p>
                <p className="kpi-cap">
                  {meetingDate(upcoming[0].startsAt).split(" · ")[0].split(",")[0]}, {meetingDate(upcoming[0].startsAt).split(" · ")[1]} • ao vivo{" "}
                  {relativeDay(upcoming[0].startsAt)}
                </p>
              </>
            ) : (
              <>
                <p className="kpi-value faint">—</p>
                <p className="kpi-cap">Nenhum encontro agendado</p>
              </>
            )}
          </div>
          <span className="chev" aria-hidden="true"><Icon name="chevron" size={16} /></span>
        </Link>
      </section>

      <section className="home-row row-a">
        <article className="hero-card">
          <ToothArt className="hero-art" />
          <div className="hero-copy">
            <span className="hero-pill">{done.length ? "Continue de onde parou" : "Comece por aqui"}</span>
            {next && nextMod ? (
              <>
                <p className="hero-meta">
                  Módulo {nextModIdx + 1} • Aula {nextLessonIdx + 1}
                </p>
                <h2 className="hero-title">{next.title}</h2>
                <div className="hero-actions">
                  <Link to={nextUrl} className="btn btn-white">
                    <Icon name="play" size={18} /> Assistir aula
                  </Link>
                  <span className="hero-time">
                    <Icon name="clock" size={20} /> {duration(next.durationMin)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <h2 className="hero-title">Todas as aulas concluídas</h2>
                <p className="hero-meta">Os novos conteúdos aparecem aqui assim que forem publicados.</p>
              </>
            )}
          </div>
        </article>

        <article className="card list-card">
          <div className="card-head">
            <h2 className="card-title">
              <Icon name="calendarPlain" size={22} /> Encontros ao vivo
            </h2>
            <Link to="/encontros" className="see-all">
              Ver todos <Icon name="arrow" size={16} />
            </Link>
          </div>
          {upcoming.length ? (
            <ul className="meet-rows">
              {upcoming.slice(0, 3).map((m) => (
                <li key={m.id} className="meet-row">
                  <span className="date-badge">
                    <span>{weekdayShort(m.startsAt)}</span>
                    {ddmm(m.startsAt)}
                  </span>
                  <span className="meet-text">
                    <strong>{m.title}</strong>
                    <span>{meetingDate(m.startsAt).replace(" · ", " • ")}</span>
                  </span>
                  <a href={m.link} target="_blank" rel="noreferrer" className="play-circle" aria-label={`Entrar no encontro ${m.title}`}>
                    <Icon name="play" size={14} />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Nenhum encontro agendado.</p>
          )}
        </article>
      </section>

      <section className="home-row row-b">
        <article className="card list-card">
          <div className="card-head">
            <h2 className="card-title">
              <Icon name="chart" size={22} /> Meus módulos
            </h2>
            <Link to="/modulos" className="see-all">
              Ver todos <Icon name="arrow" size={16} />
            </Link>
          </div>
          <ul className="mod-rows">
            {db.modules.slice(0, 4).map((m, i) => {
              const p = moduleProgress(m, isDone);
              return (
                <li key={m.id}>
                  <Link to={`/modulos/${m.id}`} className="mod-row">
                    <span className="num-circle">{i + 1}</span>
                    <span className="mod-name">{m.title}</span>
                    <Bar value={p.total ? (p.done / p.total) * 100 : 0} />
                    <span className="mod-count">
                      {p.done}/{p.total}
                    </span>
                    <Icon name="chevron" size={16} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </article>

        <article className="card notes-card">
          <h2 className="card-title">
            <Icon name="note" size={22} /> Suas anotações
          </h2>
          {notes.length ? (
            <ul className="note-rows">
              {notes.map(({ lesson, mod, text }) => (
                <li key={lesson!.id}>
                  <Link to={`/modulos/${mod!.id}/aulas/${lesson!.id}`} className="note-row">
                    <strong>{lesson!.title}</strong>
                    <span>{text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="notes-empty">
              <NotepadArt />
              <p>Adicione suas anotações para não perder nenhum detalhe!</p>
            </div>
          )}
          <button className="btn btn-deep" onClick={() => navigate(`${nextUrl}#anotacoes`)}>
            <Icon name="plus" size={18} /> Nova anotação
          </button>
        </article>

        <article className="cheer-card">
          <span className="cheer-icon"><Icon name="trophy" size={30} /></span>
          <h2>{cheer.title}</h2>
          <p>{cheer.text}</p>
          <Link to={nextUrl} className="cheer-btn" aria-label="Ir para a próxima aula">
            <Icon name="up" size={20} />
          </Link>
        </article>
      </section>
    </div>
  );
}

function NotepadArt() {
  return (
    <svg width="132" height="96" viewBox="0 0 132 96" fill="none" aria-hidden="true">
      <path d="M22 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5ZM30 52l1.2 3 3 1.2-3 1.2L30 60l-1.2-3.6-3-1.2 3-1.2L30 52Z" fill="#7FCDB9" />
      <rect x="44" y="18" width="50" height="64" rx="6" transform="rotate(-8 44 18)" fill="#fff" stroke="#126F65" strokeWidth="2.4" />
      <path d="M54 34l26-3.6M55.5 45l26-3.6M57 56l18-2.5" stroke="#126F65" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M50 16.5l1.4 8M60 15l1.4 8M70 13.6l1.4 8M80 12.2l1.4 8" stroke="#126F65" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M104 14l8 8-28 28-11 3 3-11 28-28Z" fill="#126F65" />
      <path d="M100 18l8 8" stroke="#BDEDE0" strokeWidth="2" />
    </svg>
  );
}
