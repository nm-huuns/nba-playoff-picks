"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center gap-2 group"
    >
      <div className="relative w-11 h-6 rounded-full border border-[#555]">
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
            dark ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </div>
      <span className="text-[0.65rem] font-extrabold uppercase tracking-[0.1em] text-[#555] dark:text-[#999] group-hover:text-white transition-colors">
        {dark ? "Dark" : "Light"}
      </span>
    </button>
  );
}
