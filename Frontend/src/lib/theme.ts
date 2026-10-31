export type ThemePreference = "light" | "dark";

const THEME_KEY = "codexa_theme";
const root = () => document.documentElement;

export const applyTheme = (theme: ThemePreference) => {
  root().classList.toggle("dark", theme === "dark");
  localStorage.setItem(THEME_KEY, theme);
};

export const getSavedTheme = (): ThemePreference => {
  const savedTheme = localStorage.getItem(THEME_KEY);
  return savedTheme === "dark" ? "dark" : "light";
};

export const initializeTheme = () => {
  applyTheme(getSavedTheme());
};

export const applyAccessibilityPreferences = (
  reducedMotion: boolean,
  fontSize: "small" | "default" | "large",
  compact: boolean,
) => {
  root().classList.toggle("reduce-motion", reducedMotion);
  root().classList.toggle("compact-mode", compact);
  root().classList.toggle("text-scale-small", fontSize === "small");
  root().classList.toggle("text-scale-large", fontSize === "large");
  root().classList.toggle("text-scale-default", fontSize === "default");
};
