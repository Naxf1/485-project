import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  cycleTheme,
  nextPreference,
  readPreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '../theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

const LABELS: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia(DARK_QUERY).matches;
  } catch {
    return false;
  }
}

function MoonIcon(): JSX.Element {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

function SunIcon(): JSX.Element {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </svg>
  );
}

export function ThemeToggle(): JSX.Element {
  const [preference, setPreference] = useState<ThemePreference>(() => readPreference(browserStorage()));
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);

  const resolved: ResolvedTheme = resolveTheme(preference, systemDark);

  useEffect(() => {
    applyTheme(document.documentElement, resolved);
  }, [resolved]);

  useEffect(() => {
    let query: MediaQueryList | null = null;
    try {
      query = window.matchMedia(DARK_QUERY);
    } catch {
      query = null;
    }
    if (!query) return;

    const onChange = (event: MediaQueryListEvent): void => setSystemDark(event.matches);
    query.addEventListener('change', onChange);

    return () => query?.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback((): void => {
    const result = cycleTheme({
      preference,
      systemPrefersDark: systemDark,
      root: document.documentElement,
      storage: browserStorage(),
    });
    setPreference(result.preference);
  }, [preference, systemDark]);

  const upcoming = nextPreference(preference, resolved);
  const current = preference === 'system' ? `System (${resolved})` : LABELS[preference];

  return (
    <button
      type="button"
      className="icon-button"
      aria-label="Toggle dark mode"
      title={`Theme: ${current} — switch to ${LABELS[upcoming]}`}
      onClick={toggle}
    >
      {resolved === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
