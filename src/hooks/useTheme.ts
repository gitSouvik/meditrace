import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "github-ultra-dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("meditrace-theme") as Theme;
      if (stored) return stored;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark", "github-ultra-dark");
    root.classList.add(theme);
    localStorage.setItem("meditrace-theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((t) => {
      if (t === "light") return "dark";
      if (t === "dark") return "github-ultra-dark";
      return "light";
    });

  return { theme, setTheme, toggleTheme };
}
