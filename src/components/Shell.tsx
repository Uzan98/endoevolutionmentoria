import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { Icon } from "./Icon";

export function Shell() {
  const { user, logout } = useStore();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();

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
    { to: "/perfil", label: "Meu perfil", icon: "user" },
  ];

  const nav_ = (
    <>
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">E</span>
        <span>
          <strong>Endo Evolution</strong>
          <small>Mentoria · Turma 2026</small>
        </span>
      </div>
      <nav className="nav" aria-label="Principal">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className="nav-item">
            <Icon name={l.icon} /> {l.label}
          </NavLink>
        ))}
        {user.role === "mentor" && (
          <>
            <p className="nav-group">Mentor</p>
            <NavLink to="/admin" className="nav-item">
              <Icon name="admin" /> Painel do mentor
            </NavLink>
          </>
        )}
      </nav>
      <div className="side-foot">
        <div className="me">
          <span className="avatar" aria-hidden="true">{user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
          <span>
            <strong>{user.name}</strong>
            <small>{user.role === "mentor" ? "Mentor" : "Aluno"}</small>
          </span>
        </div>
        <button
          className="nav-item"
          onClick={() => {
            logout();
            nav("/login");
          }}
        >
          <Icon name="logout" /> Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="app">
      <aside className="sidebar">{nav_}</aside>
      <header className="topbar">
        <span className="brand-mark" aria-hidden="true">E</span>
        <strong>Endo Evolution</strong>
        <button className="icon-btn" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(true)}>
          <Icon name="menu" size={20} />
        </button>
      </header>
      {open && (
        <div className="sheet" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="icon-btn sheet-close" aria-label="Fechar menu" onClick={() => setOpen(false)}>
            <Icon name="close" size={20} />
          </button>
          {nav_}
        </div>
      )}
      <main className="canvas">
        <Outlet />
      </main>
    </div>
  );
}
