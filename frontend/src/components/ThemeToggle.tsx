"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light"|"dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light"|"dark"|null;
    const preferDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = saved ?? (preferDark ? "dark" : "light");
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <button aria-label="切換主題" onClick={toggle} className="theme-toggle">
      {theme === "light" ? "🌙" : "🌞"}
    </button>
  );
}
