// localStorage persistence. Keys are unchanged from 0.2.0 so saved state carries over.
import type { Language } from "./i18n.ts"
import type { FilterOptions } from "./tabs/filters.ts"

export const STORAGE_KEYS = {
  settings: "tabConsole.settings",
  presets: "tabConsole.presets",
  history: "tabConsole.history",
  ui: "tabConsole.ui",
} as const

export interface Settings {
  confirmClose: boolean
  hideSelf: boolean
  autoRefresh: boolean
  theme: "system" | "light" | "dark"
  language: Language
}

export type CustomPreset = { name: string } & Partial<FilterOptions>

export type SavedUi = Partial<FilterOptions> & {
  consoleHidden?: boolean
  /** Console drawer height in px. */
  consoleHeight?: number
}

function read<T>(key: string, fallback: T): T {
  try {
    const text = localStorage.getItem(key)
    if (text == null || text === "") return fallback
    return JSON.parse(text) ?? fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: the page keeps working with in-memory state.
  }
}

export const storage = {
  settings: (defaults: Settings): Settings => ({
    ...defaults,
    ...read<Partial<Settings>>(STORAGE_KEYS.settings, {}),
  }),
  saveSettings: (settings: Settings) => write(STORAGE_KEYS.settings, settings),
  presets: (): CustomPreset[] => read(STORAGE_KEYS.presets, []),
  savePresets: (presets: CustomPreset[]) => write(STORAGE_KEYS.presets, presets),
  history: (): string[] => read(STORAGE_KEYS.history, []),
  saveHistory: (history: string[]) => write(STORAGE_KEYS.history, history),
  ui: (): SavedUi => read(STORAGE_KEYS.ui, {}),
  saveUi: (ui: SavedUi) => write(STORAGE_KEYS.ui, { ...read(STORAGE_KEYS.ui, {}), ...ui }),
  clear: () => Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key)),
}
