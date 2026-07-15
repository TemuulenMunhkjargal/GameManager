"use client";

import { Palette } from "lucide-react";
import { useEffect, useRef } from "react";
import { normalizeTheme } from "@/lib/theme";

const themes = [
  { value: "default", label: "Default", description: "Glassy green, inspired by the GameHall logo." },
  { value: "light", label: "Light", description: "Bright surfaces with soft green accents." },
  { value: "dark", label: "Dark", description: "Neutral charcoal with restrained green highlights." },
] as const;

export function ThemeSelector() {
  const select = useRef<HTMLSelectElement>(null);
  useEffect(() => { const saved = normalizeTheme(localStorage.getItem("gamehall-theme")); document.documentElement.dataset.theme = saved; if (select.current) select.current.value = saved; }, []);
  function change(value: string) { const theme = normalizeTheme(value); document.documentElement.dataset.theme = theme; localStorage.setItem("gamehall-theme", theme); }
  return <section className="panel detail-panel theme-panel"><div className="theme-heading"><div className="theme-icon"><Palette size={20} /></div><div><p className="eyebrow">Appearance</p><h2>Theme</h2><p className="muted">Choose how GameHall looks on this installation.</p></div></div><div className="field"><label htmlFor="theme">Color theme</label><select defaultValue="default" id="theme" onChange={(event) => change(event.target.value)} ref={select}>{themes.map((theme) => <option key={theme.value} value={theme.value}>{theme.label}</option>)}</select></div><div className="theme-options">{themes.map((theme) => <div className={`theme-preview ${theme.value}`} key={theme.value}><span className="theme-swatch" /><div><strong>{theme.label}</strong><p>{theme.description}</p></div></div>)}</div></section>;
}
