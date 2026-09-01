import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const THEME_PRESETS = [
  {
    id: "blue",
    name: "Midnight Blue",
    sidebarBg: "bg-slate-900 border-slate-800",
    sidebarHeader: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    activeLink: "bg-blue-600 text-white shadow-md shadow-blue-600/30",
    activeSubLink: "bg-blue-600/20 text-blue-300 font-bold",
    accentText: "text-blue-600",
    logoBg: "bg-blue-600 text-white",
    colorHex: "#2563eb",
  },
  {
    id: "purple",
    name: "Royal Purple",
    sidebarBg: "bg-purple-950/90 border-purple-900/60",
    sidebarHeader: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    activeLink: "bg-purple-600 text-white shadow-md shadow-purple-600/30",
    activeSubLink: "bg-purple-600/20 text-purple-300 font-bold",
    accentText: "text-purple-600",
    logoBg: "bg-purple-600 text-white",
    colorHex: "#9333ea",
  },
  {
    id: "emerald",
    name: "Emerald Green",
    sidebarBg: "bg-emerald-950/90 border-emerald-900/60",
    sidebarHeader: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    activeLink: "bg-emerald-600 text-white shadow-md shadow-emerald-600/30",
    activeSubLink: "bg-emerald-600/20 text-emerald-300 font-bold",
    accentText: "text-emerald-600",
    logoBg: "bg-emerald-600 text-white",
    colorHex: "#059669",
  },
  {
    id: "amber",
    name: "Gold Amber",
    sidebarBg: "bg-amber-950/90 border-amber-900/60",
    sidebarHeader: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    activeLink: "bg-amber-600 text-white shadow-md shadow-amber-600/30",
    activeSubLink: "bg-amber-600/20 text-amber-300 font-bold",
    accentText: "text-amber-600",
    logoBg: "bg-amber-600 text-white",
    colorHex: "#d97706",
  },
  {
    id: "rose",
    name: "Crimson Red",
    sidebarBg: "bg-rose-950/90 border-rose-900/60",
    sidebarHeader: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    activeLink: "bg-rose-600 text-white shadow-md shadow-rose-600/30",
    activeSubLink: "bg-rose-600/20 text-rose-300 font-bold",
    accentText: "text-rose-600",
    logoBg: "bg-rose-600 text-white",
    colorHex: "#e11d48",
  },
  {
    id: "slate",
    name: "Dark Onyx",
    sidebarBg: "bg-zinc-950 border-zinc-800",
    sidebarHeader: "bg-zinc-800 text-zinc-300 border-zinc-700/50",
    activeLink: "bg-zinc-700 text-white shadow-md shadow-zinc-700/30",
    activeSubLink: "bg-zinc-800 text-zinc-200 font-bold",
    accentText: "text-zinc-400",
    logoBg: "bg-zinc-700 text-white",
    colorHex: "#475569",
  },
];

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem("rbms_app_theme") || "blue";
  });

  useEffect(() => {
    localStorage.setItem("rbms_app_theme", currentTheme);
    document.documentElement.setAttribute("data-theme", currentTheme);
  }, [currentTheme]);

  const activePreset = THEME_PRESETS.find((t) => t.id === currentTheme) || THEME_PRESETS[0];

  return (
    <ThemeContext.Provider value={{ currentTheme, setCurrentTheme, activePreset, THEME_PRESETS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
