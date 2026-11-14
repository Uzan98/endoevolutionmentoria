import { useStore } from "../store";
import { duration, meetingDate, relativeDay } from "../lib/format";

export function Meetings() {
  const { db } = useStore();
  const now = Date.now();
  const upcoming = db.meetings.filter((m) => new Date(m.startsAt).getTime() + m.durationMin * 60000 > now);
  const past = db.meetings.filter((m) => !upcoming.includes(m)).reverse();

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="title">Encontros ao vivo</h1>
        <p className="muted">Discussão de casos e plantão de dúvidas com o mentor, a cada duas semanas.</p>
      </header>

      <section className="block">
        <h2 className="panel-title">Próximos</h2>
        {upcoming.length ? (
          <ul className="meeting-list">
            {upcoming.map((m, i) => {
              const start = new Date(m.startsAt).getTime();
              const live = start <= now;
              return (
                <li key={m.id} className={`meeting${i === 0 ? " is-next" : ""}`}>
                  <div>
                    <p className="meeting-date">{meetingDate(m.startsAt)}</p>
                    <p className="meeting-title">{m.title}</p>
                    <p className="muted">
                      {duration(m.durationMin)} · {live ? "acontecendo agora" : relativeDay(m.startsAt)}
                    </p>
                  </div>
                  <a className={`btn ${i === 0 ? "btn-primary" : "btn-secondary"}`} href={m.link} target="_blank" rel="noreferrer">
                    {live ? "Entrar agora" : "Link da sala"}
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="empty">Nenhum encontro agendado. Os próximos aparecem aqui assim que forem marcados.</p>
        )}
      </section>

      {past.length > 0 && (
        <section className="block">
          <h2 className="panel-title">Anteriores</h2>
          <ul className="meeting-list">
            {past.map((m) => (
              <li key={m.id} className="meeting">
                <div>
                  <p className="meeting-date">{meetingDate(m.startsAt)}</p>
                  <p className="meeting-title">{m.title}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
