export const themes = ["default", "light", "dark"] as const;

export type Theme = (typeof themes)[number];

export function normalizeTheme(value: string | null): Theme {
  return themes.includes(value as Theme) ? (value as Theme) : "default";
}
