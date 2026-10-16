// Shared page state, the translator, and DOM lookup.
import { detectLanguage, translate, type TranslationKey } from "./i18n.ts"
import { type Settings, storage } from "./storage.ts"
import type { Tab } from "./tabs/filters.ts"

export const DEFAULT_SETTINGS: Settings = {
  confirmClose: true,
  hideSelf: true,
  autoRefresh: true,
  theme: "system",
  language: detectLanguage(),
}

const savedUi = storage.ui()

export const state = {
  allTabs: [] as Tab[],
  filteredTabs: [] as Tab[],
  selectedIds: new Set<number>(),
  currentWindowId: null as number | null,
  activePreset: "all",
  customPresets: storage.presets(),
  settings: storage.settings(DEFAULT_SETTINGS),
  // The list is the main view; the console opens on demand (Ctrl+`).
  consoleHidden: savedUi.consoleHidden ?? true,
  consoleHeight: savedUi.consoleHeight || 300,
  /** Row the keyboard acts on. */
  focusedId: null as number | null,
  /** Where the next Shift+click or Shift+j/k range starts. */
  anchorId: null as number | null,
  /** Selection before the current Shift+j/k range began; null when no range is being extended. */
  rangeBase: null as Set<number> | null,
}

export const t = (key: TranslationKey, vars?: Record<string, string | number>) =>
  translate(state.settings.language, key, vars)

export function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) throw new Error(`#${id} is missing from console.html`)
  return el as T
}

export const selectedTabs = () => state.allTabs.filter((tab) => state.selectedIds.has(tab.id!))

export function setStatus(text: string) {
  $("statusText").textContent = text
}
