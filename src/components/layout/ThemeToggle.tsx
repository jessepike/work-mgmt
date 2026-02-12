"use client";

import { useEffect, useState } from "react";

type ThemePref = "system" | "light" | "dark";

function applyTheme(theme: ThemePref) {
  const html = document.documentElement;
  html.classList.remove("theme-light", "theme-dark");
  if (theme === "light") {
    html.classList.add("theme-light");
    return;
  }
  if (theme === "dark") {
    html.classList.add("theme-dark");
    return;
  }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  html.classList.add(prefersDark ? "theme-dark" : "theme-light");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePref>("system");

  useEffect(() => {
    const saved = localStorage.getItem("wm.theme");
    if (saved === "system" || saved === "light" || saved === "dark") {
      setTheme(saved);
      applyTheme(saved);
      return;
    }
    applyTheme("system");
  }, []);

  useEffect(() => {
    localStorage.setItem("wm.theme", theme);
    applyTheme(theme);
  }, [theme]);

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value as ThemePref)}
      className="h-7 bg-zed-main border border-zed-border rounded px-2 text-[10px] font-bold uppercase tracking-widest text-text-secondary"
      title="Theme"
    >
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
