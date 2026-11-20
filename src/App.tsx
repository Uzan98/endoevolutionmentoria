import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactElement } from "react";
import { Shell } from "./components/Shell";
import { useStore } from "./store";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";
import { Modules } from "./pages/Modules";
import { ModulePage } from "./pages/ModulePage";
import { LessonPage } from "./pages/LessonPage";
import { Meetings } from "./pages/Meetings";
import { Profile } from "./pages/Profile";
import { Admin } from "./pages/Admin";
import { ResetPassword } from "./pages/ResetPassword";
import { Forum } from "./pages/Forum";
import { ForumThread } from "./pages/ForumThread";

function Splash() {
  return (
    <div className="splash" role="status" aria-label="Carregando">
      <span className="splash-mark" />
    </div>
  );
}

function RequireAuth({ children, role }: { children: ReactElement; role?: "mentor" }) {
  const { user, status, recovering } = useStore();
  const loc = useLocation();
  if (status === "loading") return <Splash />;
  if (recovering) return <Navigate to="/redefinir-senha" replace />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/redefinir-senha" element={<ResetPassword />} />
      <Route element={<RequireAuth><Shell /></RequireAuth>}>
        <Route index element={<Home />} />
        <Route path="modulos" element={<Modules />} />
        <Route path="modulos/:moduleId" element={<ModulePage />} />
        <Route path="modulos/:moduleId/aulas/:lessonId" element={<LessonPage />} />
        <Route path="encontros" element={<Meetings />} />
        <Route path="forum" element={<Forum />} />
        <Route path="forum/:threadId" element={<ForumThread />} />
        <Route path="perfil" element={<Profile />} />
        <Route path="admin" element={<RequireAuth role="mentor"><Admin /></RequireAuth>} />
        <Route path="*" element={<div className="page"><h1 className="title">Página não encontrada</h1></div>} />
      </Route>
    </Routes>
  );
}
