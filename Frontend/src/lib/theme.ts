export type ThemePreference = "light" | "dark" | "system";

const THEME_KEY = "codexa_theme";
const root = () => document.documentElement;

const syncSystemTheme = () => {
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root().classList.toggle("dark", isDark);
};

export const applyTheme = (theme: ThemePreference) => {
  root().classList.toggle("dark", theme === "dark");
  if (theme === "system") {
    syncSystemTheme();
  }
  localStorage.setItem(THEME_KEY, theme);
};

export const getSavedTheme = (): ThemePreference => {
  const savedTheme = localStorage.getItem(THEME_KEY);
  return savedTheme === "dark" || savedTheme === "system" ? savedTheme : "light";
};

export const initializeTheme = () => {
  applyTheme(getSavedTheme());
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (getSavedTheme() === "system") syncSystemTheme();
  });
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
