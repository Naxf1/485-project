import { describe, expect, it } from 'vitest';
import {
  applyTheme,
  cycleTheme,
  nextPreference,
  parsePreference,
  readPreference,
  resolveTheme,
  savePreference,
  THEME_STORAGE_KEY,
  type ThemeRoot,
  type ThemeStorage,
} from '../../frontend/src/theme';

class FakeStorage implements ThemeStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class BlockedStorage implements ThemeStorage {
  getItem(): string | null {
    throw new Error('storage is blocked');
  }

  setItem(): void {
    throw new Error('storage is blocked');
  }
}

const fakeRoot = (): ThemeRoot & { attributes: Record<string, string> } => {
  const attributes: Record<string, string> = {};
  return {
    attributes,
    setAttribute(name: string, value: string): void {
      attributes[name] = value;
    },
  };
};

describe('theme preference', () => {
  it('defaults to system when nothing is stored', () => {
    expect(readPreference(new FakeStorage())).toBe('system');
    expect(readPreference(null)).toBe('system');
  });

  it('reads a stored preference and ignores unknown values', () => {
    const storage = new FakeStorage();
    storage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(readPreference(storage)).toBe('dark');

    storage.setItem(THEME_STORAGE_KEY, 'purple');
    expect(parsePreference(storage.getItem(THEME_STORAGE_KEY))).toBe('system');
  });

  it('follows the operating system while on system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('keeps an explicit choice regardless of the operating system', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('cycles light to system to dark', () => {
    expect(nextPreference('light', 'light')).toBe('system');
    expect(nextPreference('system', 'light')).toBe('dark');
    expect(nextPreference('dark', 'dark')).toBe('light');
  });

  it('applies the resolved theme to the document root', () => {
    const root = fakeRoot();
    applyTheme(root, 'dark');
    expect(root.attributes['data-theme']).toBe('dark');
  });
});

describe('theme toggle', () => {
  it('switches a system-light user to dark and saves the choice', () => {
    const root = fakeRoot();
    const storage = new FakeStorage();

    const result = cycleTheme({
      preference: 'system',
      systemPrefersDark: false,
      root,
      storage,
    });

    expect(result.preference).toBe('dark');
    expect(result.resolved).toBe('dark');
    expect(root.attributes['data-theme']).toBe('dark');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('switches a dark user back to light and saves the choice', () => {
    const root = fakeRoot();
    const storage = new FakeStorage();

    const result = cycleTheme({
      preference: 'dark',
      systemPrefersDark: true,
      root,
      storage,
    });

    expect(result.preference).toBe('light');
    expect(result.resolved).toBe('light');
    expect(root.attributes['data-theme']).toBe('light');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('returns to system and follows the operating system again', () => {
    const root = fakeRoot();
    const storage = new FakeStorage();

    const result = cycleTheme({
      preference: 'light',
      systemPrefersDark: true,
      root,
      storage,
    });

    expect(result.preference).toBe('system');
    expect(result.resolved).toBe('dark');
    expect(root.attributes['data-theme']).toBe('dark');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });

  it('keeps working when the browser blocks storage', () => {
    const root = fakeRoot();
    const blocked = new BlockedStorage();
    const result = cycleTheme({
      preference: 'system',
      systemPrefersDark: false,
      root,
      storage: blocked,
    });

    expect(result.resolved).toBe('dark');
    expect(root.attributes['data-theme']).toBe('dark');
  });
});
