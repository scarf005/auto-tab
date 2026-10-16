// Entry point: wires the REPL, the explorer, settings, and the REPL globals.
import { readFilters, setPreset, writeFilters } from "./explorer/controls.ts"
import { renderTabs } from "./explorer/render.ts"
import { createRepl } from "./repl/editor.ts"
import { clearConsole, print, printError, printTable, updateProblemCount } from "./repl/output.ts"
import { storage } from "./storage.ts"
import { $, selectedTabs, setStatus, state, t } from "./state.ts"
import { type BulkAction, createTabActions, tabIds, type TabRefs } from "./tabs/actions.ts"
import {
  type FilterOptions,
  filterTabs,
  hostname,
  nonDefaultFilters,
  normalizeUrl,
  pruneSelection,
  type Tab,
} from "./tabs/filters.ts"

const SEARCH_DEBOUNCE_MS = 180
const TAB_EVENT_REFRESH_MS = 180
const TAB_UPDATED_REFRESH_MS = 260
const ACTION_REFRESH_MS = 50

// ── Refresh and filtering ────────────────────────────────────────────────────

let refreshTimer: ReturnType<typeof setTimeout> | undefined
let searchTimer: ReturnType<typeof setTimeout> | undefined

/** Tab events refresh only with auto refresh on; our own actions (`force`) always do. */
function scheduleRefresh(delay: number, force = false) {
  if (!force && !state.settings.autoRefresh) return
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => refreshTabs().catch(() => {}), delay)
}

const actions = createTabActions(() => scheduleRefresh(ACTION_REFRESH_MS, true))

function saveUiState() {
  storage.saveUi({
    consoleHidden: state.consoleHidden,
    consoleWidth: state.consoleWidth,
    ...readFilters(),
  })
}

function applyFilters({ syncEditor = true } = {}) {
  const regexError = $("regexError")
  regexError.textContent = ""
  try {
    state.filteredTabs = filterTabs(state.allTabs, readFilters(), {
      currentWindowId: state.currentWindowId,
      hiddenUrl: state.settings.hideSelf ? browser.runtime.getURL("console.html") : null,
    })
    pruneSelection(state.selectedIds, state.filteredTabs)
  } catch (err) {
    if (!(err instanceof SyntaxError)) throw err
    // A half-typed regex shows nothing but keeps the selection for when it becomes valid.
    regexError.textContent = err.message
    state.filteredTabs = []
  }
  renderTabs()
  saveUiState()
  if (syncEditor) repl.syncFromUi()
}

async function refreshTabs() {
  try {
    const [win, tabs] = await Promise.all([
      browser.windows.getCurrent(),
      browser.tabs.query({}),
    ])
    state.currentWindowId = win.id ?? null
    state.allTabs = tabs
    applyFilters()
    return state.allTabs.slice()
  } catch (err) {
    printError(err)
    setStatus(t("refresh_failed"))
    throw err
  }
}

function scheduleSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => applyFilters(), SEARCH_DEBOUNCE_MS)
}

// ── REPL ─────────────────────────────────────────────────────────────────────

/** Sets explorer filters from the REPL and returns the result. */
function queryFromRepl(options: Partial<FilterOptions> = {}) {
  writeFilters(options)
  applyFilters({ syncEditor: false })
  repl.syncFromUi(true)
  return state.filteredTabs.slice()
}

const ui = {
  refresh: refreshTabs,
  select(items: TabRefs) {
    for (const id of tabIds(items)) state.selectedIds.add(id)
    renderTabs()
    return selectedTabs()
  },
  clearSelection() {
    state.selectedIds.clear()
    renderTabs()
  },
  // Promise constructor turns a throw into a rejection, as the old async method did.
  query: (options?: Partial<FilterOptions>) =>
    new Promise<Tab[]>((resolve) => resolve(queryFromRepl(options))),
  setFilter: queryFromRepl,
  shown: () => state.filteredTabs.slice(),
  state: () => readFilters(),
  syncQuery: () => {
    repl.syncFromUi(true)
    return repl.value()
  },
}

const replGlobals = {
  tabs: (query: browser.tabs._QueryQueryInfo = {}) => browser.tabs.query(query),
  refresh: refreshTabs,
  close: actions.close,
  discard: actions.discard,
  reload: actions.reload,
  pin: actions.pin,
  unpin: actions.unpin,
  mute: actions.mute,
  unmute: actions.unmute,
  activate: actions.activate,
  hostname,
  normalizeUrl,
  table: printTable,
  sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  ui,
}

const repl = createRepl({
  globals: ["browser", "$tabs", "$selected", "$_", ...Object.keys(replGlobals)],
  uiQuerySource: () =>
    `await ui.query(${JSON.stringify(nonDefaultFilters(readFilters()), null, 2)})`,
})

Object.assign(globalThis, replGlobals)
Object.defineProperties(globalThis, {
  $tabs: { configurable: true, get: () => state.filteredTabs.slice() },
  $selected: { configurable: true, get: selectedTabs },
  $_: { configurable: true, get: repl.lastResult },
})

// ── Explorer actions ─────────────────────────────────────────────────────────

const confirmClose = (message: string) => !state.settings.confirmClose || confirm(message)

async function closeShown() {
  const shown = state.filteredTabs.slice()
  if (!shown.length || !confirmClose(t("close_shown_confirm", { count: shown.length }))) return
  await actions.close(shown)
  state.selectedIds.clear()
  await refreshTabs()
}

async function performBulkAction(action: BulkAction | "close-shown") {
  if (action === "close-shown") return closeShown()
  const selected = selectedTabs()
  if (!selected.length) return
  if (action === "close") {
    if (!confirmClose(t("close_selected_confirm", { count: selected.length }))) return
    await actions.close(selected)
    state.selectedIds.clear()
  } else {
    await actions[action](selected)
  }
  await refreshTabs()
}

async function performRowAction(action: string, id: number) {
  const tab = state.allTabs.find((x) => x.id === id)
  if (!tab) return
  if (action === "activate") {
    await actions.activate(tab)
  } else if (action === "close") {
    if (!confirmClose(t("close_one_confirm", { title: tab.title || t("untitled") }))) return
    await actions.close(tab)
    state.selectedIds.delete(id)
    await refreshTabs()
  }
}

// ── Presets ──────────────────────────────────────────────────────────────────

function renderCustomPresets() {
  $("customPresetBar").replaceChildren(
    ...state.customPresets.map((preset, index) => {
      const button = document.createElement("button")
      button.className = "preset"
      button.textContent = preset.name
      button.title = `${t("save_preset")} · right-click: delete`
      button.onclick = () => {
        writeFilters(preset)
        applyFilters()
      }
      button.oncontextmenu = (ev) => {
        ev.preventDefault()
        if (!confirm(t("delete_preset", { name: preset.name }))) return
        state.customPresets.splice(index, 1)
        storage.savePresets(state.customPresets)
        renderCustomPresets()
      }
      return button
    }),
  )
}

function savePreset() {
  const name = prompt(t("preset_name"))?.trim()
  if (!name) return
  state.customPresets.push({ ...readFilters(), name: name.slice(0, 40) })
  storage.savePresets(state.customPresets)
  renderCustomPresets()
}

// ── Settings, theme, language, layout ───────────────────────────────────────

const SETTING_CHECKBOXES = {
  confirmClose: "confirmCloseSetting",
  hideSelf: "hideSelfSetting",
  autoRefresh: "autoRefreshSetting",
} as const

function showSettings() {
  for (const [key, id] of Object.entries(SETTING_CHECKBOXES)) {
    $<HTMLInputElement>(id).checked = state.settings[key as keyof typeof SETTING_CHECKBOXES]
  }
  $<HTMLSelectElement>("themeSelect").value = state.settings.theme
}

function saveSettingsFromUi() {
  for (const [key, id] of Object.entries(SETTING_CHECKBOXES)) {
    state.settings[key as keyof typeof SETTING_CHECKBOXES] = $<HTMLInputElement>(id).checked
  }
  state.settings.theme = $<HTMLSelectElement>("themeSelect").value === "dark" ? "dark" : "light"
  storage.saveSettings(state.settings)
  applyTheme()
  applyFilters()
}

function applyTheme() {
  const dark = state.settings.theme === "dark"
  document.documentElement.dataset.theme = dark ? "dark" : "light"
  $<HTMLSelectElement>("themeSelect").value = state.settings.theme
  $("themeBtn").textContent = dark ? "☾" : "☀"
}

function applyI18n() {
  document.documentElement.lang = state.settings.language
  $<HTMLSelectElement>("languageSelect").value = state.settings.language
  const translateAttr = (attr: string, apply: (el: HTMLElement, text: string) => void) =>
    document.querySelectorAll<HTMLElement>(`[${attr}]`).forEach((el) =>
      apply(el, t(el.getAttribute(attr) as Parameters<typeof t>[0]))
    )
  translateAttr("data-i18n", (el, text) => el.textContent = text)
  translateAttr("data-i18n-title", (el, text) => el.title = text)
  translateAttr("data-i18n-placeholder", (el, text) => {
    ;(el as HTMLInputElement).placeholder = text
  })
  updateProblemCount()
  repl.updateLinkState()
  renderTabs()
  renderCustomPresets()
}

function applyConsoleLayout() {
  $("app").style.setProperty("--console-width", state.consoleWidth)
  $("app").classList.toggle("console-hidden", state.consoleHidden)
  $("showConsoleBtn").classList.toggle("hidden", !state.consoleHidden)
}

function setConsoleHidden(hidden: boolean) {
  state.consoleHidden = hidden
  applyConsoleLayout()
  saveUiState()
  setTimeout(repl.refresh, 0)
}

function initSplitter() {
  const splitter = $("splitter")
  let dragging = false
  splitter.addEventListener("mousedown", (ev) => {
    dragging = true
    splitter.classList.add("dragging")
    ev.preventDefault()
  })
  globalThis.addEventListener("mousemove", (ev) => {
    if (!dragging) return
    const min = 320, max = Math.max(min, globalThis.innerWidth - 430)
    state.consoleWidth = `${Math.max(min, Math.min(max, ev.clientX))}px`
    $("app").style.setProperty("--console-width", state.consoleWidth)
    repl.refresh()
  })
  globalThis.addEventListener("mouseup", () => {
    if (!dragging) return
    dragging = false
    splitter.classList.remove("dragging")
    saveUiState()
  })
}

// ── Events ───────────────────────────────────────────────────────────────────

const reportErrors =
  <A extends unknown[]>(fn: (...args: A) => Promise<unknown>) => (...args: A) => {
    fn(...args).catch(printError)
  }

function bindEvents() {
  $("runBtn").onclick = repl.run
  $("clearConsoleBtn").onclick = clearConsole
  $("helpBtn").onclick = () => $<HTMLDialogElement>("helpDialog").showModal()
  $("settingsBtn").onclick = () => {
    showSettings()
    $<HTMLDialogElement>("settingsDialog").showModal()
  }
  $("refreshBtn").onclick = () => refreshTabs().catch(() => {})
  $("hideConsoleBtn").onclick = () => setConsoleHidden(true)
  $("showConsoleBtn").onclick = () => setConsoleHidden(false)
  $("savePresetBtn").onclick = savePreset
  $("syncQueryBtn").onclick = () => repl.syncFromUi(true)
  document.querySelectorAll<HTMLElement>("[data-dialog-close]").forEach((button) =>
    button.addEventListener("click", () => button.closest("dialog")?.close())
  )

  $("searchInput").addEventListener("input", scheduleSearch)
  document.querySelectorAll(".filter-panel select, .filter-panel input[type=checkbox]")
    .forEach((el) => el.addEventListener("change", () => applyFilters()))
  $("presetBar").onclick = (ev) => {
    const button = (ev.target as HTMLElement).closest<HTMLElement>("[data-preset]")
    if (!button) return
    setPreset(button.dataset.preset)
    applyFilters()
  }

  const selectAll = $<HTMLInputElement>("selectAllCheckbox")
  selectAll.onchange = () => {
    for (const tab of state.filteredTabs) {
      if (selectAll.checked) state.selectedIds.add(tab.id!)
      else state.selectedIds.delete(tab.id!)
    }
    renderTabs()
  }
  const tabList = $("tabList")
  tabList.addEventListener("change", (ev) => {
    const target = ev.target as HTMLInputElement
    if (!target.classList.contains("row-checkbox")) return
    const id = Number(target.dataset.tabId)
    if (target.checked) state.selectedIds.add(id)
    else state.selectedIds.delete(id)
    renderTabs()
  })
  tabList.addEventListener("click", (ev) => {
    const button = (ev.target as HTMLElement).closest<HTMLElement>("[data-row-action]")
    if (button) {
      reportErrors(performRowAction)(button.dataset.rowAction!, Number(button.dataset.tabId))
    }
  })
  tabList.addEventListener("dblclick", (ev) => {
    const target = ev.target as HTMLElement
    if (target.closest("input, button")) return
    const row = target.closest<HTMLElement>(".tab-row")
    if (row) reportErrors(actions.activate)(Number(row.dataset.tabId))
  })
  document.querySelector<HTMLElement>(".bulk-actions")!.onclick = (ev) => {
    const action = (ev.target as HTMLElement).closest<HTMLElement>("[data-action]")?.dataset.action
    if (action) reportErrors(performBulkAction)(action as BulkAction | "close-shown")
  }

  for (const id of [...Object.values(SETTING_CHECKBOXES), "themeSelect"]) {
    $(id).addEventListener("change", saveSettingsFromUi)
  }
  $("themeBtn").onclick = () => {
    state.settings.theme = state.settings.theme === "dark" ? "light" : "dark"
    storage.saveSettings(state.settings)
    applyTheme()
  }
  $("languageSelect").onchange = () => {
    state.settings.language = $<HTMLSelectElement>("languageSelect").value === "ko" ? "ko" : "en"
    storage.saveSettings(state.settings)
    applyI18n()
  }
  $("resetSettingsBtn").onclick = () => {
    if (!confirm(t("reset_confirm"))) return
    storage.clear()
    location.reload()
  }

  const onTabEvent = () => scheduleRefresh(TAB_EVENT_REFRESH_MS)
  for (
    const event of [
      browser.tabs.onCreated,
      browser.tabs.onRemoved,
      browser.tabs.onMoved,
      browser.tabs.onAttached,
      browser.tabs.onDetached,
      browser.tabs.onActivated,
    ]
  ) {
    ;(event as WebExtEvent<() => void>).addListener(onTabEvent)
  }
  browser.tabs.onUpdated.addListener(() => scheduleRefresh(TAB_UPDATED_REFRESH_MS))

  globalThis.addEventListener("error", (event) => {
    if (event.error) printError(event.error)
  })
  globalThis.addEventListener("unhandledrejection", (event) => {
    printError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)))
  })
}

// ── Start ────────────────────────────────────────────────────────────────────

const savedFilters = storage.ui()
writeFilters(savedFilters)
setPreset(savedFilters.preset ?? state.activePreset)
applyTheme()
applyConsoleLayout()
initSplitter()
bindEvents()
applyI18n()
refreshTabs().then(() => {
  repl.syncFromUi(true)
  print("info", [t("ready_console", { count: state.allTabs.length })])
}).catch(() => {})
