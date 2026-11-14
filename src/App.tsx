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
import { Forum } from "./pages/Forum";
import { ForumThread } from "./pages/ForumThread";

function RequireAuth({ children, role }: { children: ReactElement; role?: "mentor" }) {
  const { user } = useStore();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
