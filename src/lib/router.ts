import { useEffect, useState } from "react";

function current(): string {
  return window.location.hash.replace(/^#/, "") || "/";
}

/** Routage par hash : fonctionne sur n'importe quel hébergement statique. */
export function useRoute(): string {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const on = () => {
      setRoute(current());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function match(route: string, pattern: string): Record<string, string> | null {
  const r = route.split("?")[0].split("/").filter(Boolean);
  const p = pattern.split("/").filter(Boolean);
  if (r.length !== p.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) params[p[i].slice(1)] = decodeURIComponent(r[i]);
    else if (p[i] !== r[i]) return null;
  }
  return params;
}
