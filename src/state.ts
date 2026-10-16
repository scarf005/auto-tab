// Shared page state, the translator, and DOM lookup.
import { detectLanguage, translate, type TranslationKey } from "./i18n.ts"
import { type Settings, storage } from "./storage.ts"
import type { Tab } from "./tabs/filters.ts"

export const DEFAULT_SETTINGS: Settings = {
  confirmClose: true,
  hideSelf: true,
  autoRefresh: true,
  theme: "light",
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
  consoleHidden: !!savedUi.consoleHidden,
  consoleWidth: savedUi.consoleWidth || "48vw",
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
