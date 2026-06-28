"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: "dark",
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeCtx);

// ponytail: ~25-line theme store instead of next-themes — it rendered a <script>
// inside a client component, which React 19 rejects. No-flash init lives in the
// server <head> (see layout.tsx); this just toggles the class + persists choice.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    setThemeState(stored ?? (document.documentElement.classList.contains("dark") ? "dark" : "light"));
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem("theme", t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}
