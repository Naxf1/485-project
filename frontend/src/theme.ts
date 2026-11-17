export const THEME_STORAGE_KEY = 'fixlane.theme';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeRoot {
  setAttribute(name: string, value: string): void;
}

export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CycleThemeInput {
  preference: ThemePreference;
  systemPrefersDark: boolean;
  root: ThemeRoot | null;
  storage: ThemeStorage | null;
}

export interface CycleThemeResult {
  preference: ThemePreference;
  resolved: ResolvedTheme;
}

export function parsePreference(value: string | null | undefined): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

export function nextPreference(
  current: ThemePreference,
  resolved: ResolvedTheme,
): ThemePreference {
  if (current === 'system') return resolved === 'dark' ? 'light' : 'dark';
  return current === 'light' ? 'system' : 'light';
}

export function readPreference(storage: ThemeStorage | null): ThemePreference {
  if (!storage) return 'system';
  try {
    return parsePreference(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

export function savePreference(storage: ThemeStorage | null, preference: ThemePreference): void {
  if (!storage) return;
  try {
    storage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    return;
  }
}

export function applyTheme(root: ThemeRoot | null, theme: ResolvedTheme): void {
  if (!root) return;
  root.setAttribute('data-theme', theme);
}

export function cycleTheme(input: CycleThemeInput): CycleThemeResult {
  const resolved = resolveTheme(input.preference, input.systemPrefersDark);
  const preference = nextPreference(input.preference, resolved);
  const nextResolved = resolveTheme(preference, input.systemPrefersDark);

  applyTheme(input.root, nextResolved);
  savePreference(input.storage, preference);

  return { preference, resolved: nextResolved };
}
