import { useEffect } from "react";
import { Icon } from "./components/Icon";
import { ToastHost } from "./components/ui";
import { useSession } from "./lib/cloud";
import { dueWords } from "./lib/curriculum";
import { match, useRoute } from "./lib/router";
import { todayLog, useAppState } from "./lib/store";
import { Admin } from "./pages/Admin";
import { AuthGate } from "./pages/AuthGate";
import { Coach } from "./pages/Coach";
import { Home } from "./pages/Home";
import { LessonPage, Learn, ReadingPage } from "./pages/Learn";
import { Onboarding } from "./pages/Onboarding";
import { Progress } from "./pages/Progress";
import { DrillPage, Review } from "./pages/Review";
import { Session } from "./pages/Session";
import { Settings } from "./pages/Settings";
import { Words } from "./pages/Words";

const NAV = [
  { to: "/", icon: "home", label: "Aujourd'hui", short: "Accueil" },
  { to: "/review", icon: "repeat", label: "Réviser", short: "Réviser" },
  { to: "/words", icon: "words", label: "Mon répertoire", short: "Mots" },
  { to: "/learn", icon: "cap", label: "Cours", short: "Cours" },
  { to: "/coach", icon: "sparkles", label: "Coach IA", short: "Coach" },
];

function useTheme(theme: "system" | "light" | "dark") {
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0e0d18" : "#f5f2ec");
  }, [theme]);
}

export function App() {
  const s = useAppState();
  const route = useRoute();
  const session = useSession();
  useTheme(s.settings.theme);

  // Console admin : accessible sans compte élève (protégée par sa propre clé)
  if (route.startsWith("/admin")) return <><main className="main"><Admin /></main><ToastHost /></>;
  // Barrière e-mail : connexion par code avant tout
  if (!session) return <><AuthGate /><ToastHost /></>;
  if (!s.onboarded) return <><Onboarding /><ToastHost /></>;

  // Écrans plein écran (sans navigation)
  const lesson = match(route, "/lesson/:id");
  const reading = match(route, "/reading/:id");
  if (route === "/session") return <><Session /><ToastHost /></>;
  if (route.startsWith("/drill")) return <><DrillPage key={route} /><ToastHost /></>;
  if (lesson) return <><LessonPage key={lesson.id} id={lesson.id} /><ToastHost /></>;
  if (reading) return <><ReadingPage key={reading.id} id={reading.id} /><ToastHost /></>;

  const due = dueWords(s).length;
  const sessionPending = !todayLog(s).completed;
  const path = route.split("?")[0];

  let page;
  switch (path) {
    case "/review": page = <Review />; break;
    case "/words": page = <Words />; break;
    case "/learn": page = <Learn />; break;
    case "/coach": page = <Coach />; break;
    case "/progress": page = <Progress />; break;
    case "/settings": page = <Settings />; break;
    default: page = <Home />;
  }

  const isActive = (to: string) => (to === "/" ? path === "/" || path === "" : path.startsWith(to));

  return (
    <div className="app">
      <aside className="sidebar">
        <a href="#/" className="brand">
          <div className="brand-mark">365</div>
          <div className="brand-name">
            Anglais 365<small>De A1 à C1, chaque jour</small>
          </div>
        </a>
        <nav className="nav">
          {NAV.map((n) => (
            <a key={n.to} href={`#${n.to}`} className={isActive(n.to) ? "active" : ""}>
              <Icon name={n.icon} />
              {n.label}
              {n.to === "/review" && due > 0 && <span className="badge-count">{due}</span>}
              {n.to === "/" && sessionPending && <span className="badge-count">1</span>}
            </a>
          ))}
          <div className="divider" style={{ margin: "8px 0" }} />
          <a href="#/progress" className={isActive("/progress") ? "active" : ""}>
            <Icon name="chart" /> Mes progrès
          </a>
          <a href="#/settings" className={isActive("/settings") ? "active" : ""}>
            <Icon name="settings" /> Réglages
          </a>
        </nav>
        <div className="sidebar-foot">
          <a href="#/session" className="btn primary block">
            <Icon name="play" size={16} fill /> {sessionPending ? "Session du jour" : "Session bonus"}
          </a>
        </div>
      </aside>

      <header className="topbar">
        <a href="#/" className="brand" style={{ padding: 0 }}>
          <div className="brand-mark">365</div>
          <div className="brand-name">Anglais 365</div>
        </a>
        <div className="row-sm">
          <a href="#/progress" className="btn ghost icon" aria-label="Mes progrès">
            <Icon name="chart" />
          </a>
          <a href="#/settings" className="btn ghost icon" aria-label="Réglages">
            <Icon name="settings" />
          </a>
        </div>
      </header>

      <main className="main">{page}</main>

      <nav className="tabbar">
        {NAV.map((n) => (
          <a key={n.to} href={`#${n.to}`} className={isActive(n.to) ? "active" : ""}>
            <Icon name={n.icon} size={22} />
            {n.short}
            {((n.to === "/review" && due > 0) || (n.to === "/" && sessionPending)) && <span className="dot" />}
          </a>
        ))}
      </nav>
      <ToastHost />
    </div>
  );
}
