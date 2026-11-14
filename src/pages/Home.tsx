import { Link } from "react-router-dom";
import { LessonStrip } from "../components/LessonStrip";
import { Icon } from "../components/Icon";
import { moduleProgress, useStore } from "../store";
import { duration, firstName, greeting, meetingDate, plural, relativeDay, shortDate } from "../lib/format";

export function Home() {
  const { db, user, allLessons, isDone } = useStore();
  if (!user) return null;

  const done = allLessons.filter((l) => isDone(l.id));
  const watchedMin = done.reduce((s, l) => s + l.durationMin, 0);
  const totalMin = allLessons.reduce((s, l) => s + l.durationMin, 0);
  const pct = allLessons.length ? Math.round((done.length / allLessons.length) * 100) : 0;

  const currentModuleIdx = db.modules.findIndex((m) => m.lessons.some((l) => !isDone(l.id)));
  const currentModule = currentModuleIdx >= 0 ? db.modules[currentModuleIdx] : undefined;
  const last = allLessons.find((l) => l.id === db.lastLesson[user.id]);
  const nextLesson = last && !isDone(last.id) ? last : allLessons.find((l) => !isDone(l.id));
  const nextModule = db.modules.find((m) => m.lessons.some((l) => l.id === nextLesson?.id));
  const nextLessonIdx = nextModule?.lessons.findIndex((l) => l.id === nextLesson?.id) ?? -1;

  const upcoming = db.meetings.filter((m) => new Date(m.startsAt).getTime() + m.durationMin * 60000 > Date.now());
  const notes = Object.entries(db.notes[user.id] ?? {})
    .filter(([, t]) => t.trim())
    .map(([lessonId, text]) => ({ lesson: allLessons.find((l) => l.id === lessonId), text }))
    .filter((n) => n.lesson)
    .slice(-3)
    .reverse();

  const remaining = currentModule ? currentModule.lessons.filter((l) => !isDone(l.id)).length : 0;
  const finding = currentModule
    ? `${remaining === 1 ? "Falta" : "Faltam"} ${plural(remaining, "aula", "aulas")} para concluir o módulo ${currentModuleIdx + 1}, ${currentModule.title.toLowerCase()}.`
    : "Você concluiu todos os módulos da mentoria.";

  return (
    <div className="page page-home">
      <header className="greeting">
        <h1>
          {greeting()}, {firstName(user.name)}.
        </h1>
        <p className="muted-lg">{user.role === "mentor" ? "Você está vendo a área do aluno como mentor." : finding}</p>
        {user.role === "mentor" && (
          <Link to="/admin" className="btn btn-primary">
            Abrir painel do mentor
          </Link>
        )}
      </header>

      <section className="grid tiles" aria-label="Resumo do seu progresso">
        <div className="tile">
          <p className="label">Aulas concluídas</p>
          <p className="kpi">
            {done.length} <span className="unit">de {allLessons.length}</span>
          </p>
          <p className="caption">{pct}% da mentoria</p>
        </div>
        <div className="tile">
          <p className="label">Tempo de aula assistido</p>
          <p className="kpi">{watchedMin ? duration(watchedMin) : "0 min"}</p>
          <p className="caption">de {duration(totalMin)} de conteúdo</p>
        </div>
        <div className="tile">
          <p className="label">Módulo atual</p>
          <p className="kpi">
            {currentModule ? currentModuleIdx + 1 : db.modules.length} <span className="unit">de {db.modules.length}</span>
          </p>
          <p className="caption">{currentModule?.title ?? "Mentoria concluída"}</p>
        </div>
        <div className="tile">
          <p className="label">Próximo encontro</p>
          {upcoming[0] ? (
            <>
              <p className="kpi">{shortDate(upcoming[0].startsAt)}</p>
              <p className="caption">
                {meetingDate(upcoming[0].startsAt).split(", ")[0]}, {meetingDate(upcoming[0].startsAt).split(" · ")[1]} · ao vivo{" "}
                {relativeDay(upcoming[0].startsAt)}
              </p>
            </>
          ) : (
            <>
              <p className="kpi faint">—</p>
              <p className="caption">Nenhum encontro agendado</p>
            </>
          )}
        </div>
      </section>

      <section className="grid">
        <article className="panel span-9 continue">
          <div className="panel-head">
            <h2 className="panel-title">{done.length ? "Continue de onde parou" : "Comece por aqui"}</h2>
          </div>
          {nextLesson && nextModule ? (
            <div className="continue-body">
              <Link to={`/modulos/${nextModule.id}/aulas/${nextLesson.id}`} className="title-card" aria-label={`Assistir ${nextLesson.title}`}>
                <span className="title-card-mod">
                  Módulo {db.modules.indexOf(nextModule) + 1} · aula {nextLessonIdx + 1}
                </span>
                <span className="title-card-name">{nextLesson.title}</span>
                <span className="title-card-play">
                  <Icon name="play" size={18} />
                  {duration(nextLesson.durationMin)}
                </span>
              </Link>
              <div className="continue-info">
                <p className="muted">{nextModule.title}</p>
                <h3 className="lesson-name">{nextLesson.title}</h3>
                <p>{nextLesson.description}</p>
                <LessonStrip module={nextModule} isDone={isDone} currentId={nextLesson.id} />
                <p className="caption">
                  {moduleProgress(nextModule, isDone).done} de {nextModule.lessons.length} aulas deste módulo concluídas
                </p>
                <Link to={`/modulos/${nextModule.id}/aulas/${nextLesson.id}`} className="btn btn-primary">
                  {done.length ? "Continuar aula" : "Assistir primeira aula"}
                </Link>
              </div>
            </div>
          ) : (
            <p className="empty">Todas as aulas foram concluídas. Os novos conteúdos aparecem aqui assim que forem publicados.</p>
          )}
        </article>

        <article className="panel span-3">
          <div className="panel-head">
            <h2 className="panel-title">Encontros ao vivo</h2>
            <Link to="/encontros" className="link">Ver todos</Link>
          </div>
          {upcoming.length ? (
            <ul className="rows">
              {upcoming.slice(0, 3).map((m) => (
                <li key={m.id} className="row-card">
                  <strong>{m.title}</strong>
                  <span className="muted">{meetingDate(m.startsAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Nenhum encontro agendado.</p>
          )}
        </article>
      </section>

      <section className="grid">
        <article className="panel span-6">
          <div className="panel-head">
            <h2 className="panel-title">
              Módulos <span className="chip">{db.modules.length}</span>
            </h2>
            <Link to="/modulos" className="link">Ver todos</Link>
          </div>
          <ul className="rows">
            {db.modules.slice(0, 4).map((m, i) => {
              const p = moduleProgress(m, isDone);
              return (
                <li key={m.id}>
                  <Link to={`/modulos/${m.id}`} className="row-card row-module">
                    <span className="row-module-top">
                      <strong>
                        {i + 1}. {m.title}
                      </strong>
                      <span className="muted num">
                        {p.done}/{p.total}
                      </span>
                    </span>
                    <LessonStrip module={m} isDone={isDone} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </article>

        <article className="panel span-6">
          <div className="panel-head">
            <h2 className="panel-title">Suas anotações</h2>
          </div>
          {notes.length ? (
            <ul className="rows">
              {notes.map(({ lesson, text }) => {
                const mod = db.modules.find((m) => m.lessons.some((l) => l.id === lesson!.id))!;
                return (
                  <li key={lesson!.id}>
                    <Link to={`/modulos/${mod.id}/aulas/${lesson!.id}`} className="row-card">
                      <strong>{lesson!.title}</strong>
                      <span className="note-text">{text}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="empty">As anotações que você fizer durante as aulas aparecem aqui.</p>
          )}
        </article>
      </section>
    </div>
  );
}
