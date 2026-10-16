// Entry point: wires the REPL, the explorer, settings, and the REPL globals.
import {
  CHECKBOX_IDS,
  readFilters,
  SELECT_IDS,
  setPreset,
  writeFilters,
} from "./explorer/controls.ts"
import { displayOrder, renderTabs, scrollFocusedIntoView } from "./explorer/render.ts"
import { createRepl } from "./repl/editor.ts"
import { clearConsole, print, printError, printTable, updateProblemCount } from "./repl/output.ts"
import { type CustomPreset, storage } from "./storage.ts"
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
import { extendRange, moveFocus, selectRange } from "./tabs/selection.ts"

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
    consoleHeight: state.consoleHeight,
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
    // Keyboard actions must never reach a tab the filter hid.
    const shown = new Set(state.filteredTabs.map((tab) => tab.id))
    if (state.focusedId != null && !shown.has(state.focusedId)) state.focusedId = null
    if (state.anchorId != null && !shown.has(state.anchorId)) state.anchorId = null
  } catch (err) {
    if (!(err instanceof SyntaxError)) throw err
    // A half-typed regex shows nothing but keeps the selection for when it becomes valid.
    regexError.textContent = err.message
    state.filteredTabs = []
  }
  renderTabs()
  markActiveView()
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
      button.title = `${preset.name} · ${t("preset_delete_hint")}`
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
  markActiveView()
}

/** Underlines the saved view whose filters match the current ones instead of the built-in tab. */
function markActiveView() {
  const current = readFilters()
  const matches = (preset: CustomPreset) =>
    (Object.keys(current) as (keyof FilterOptions)[]).every((key) =>
      preset[key] === undefined || preset[key] === current[key]
    )
  const index = state.customPresets.findIndex(matches)
  const custom = $("customPresetBar").children
  for (let i = 0; i < custom.length; i++) custom[i].classList.toggle("active", i === index)
  if (index >= 0) {
    $("presetBar").querySelectorAll(".preset").forEach((btn) => btn.classList.remove("active"))
  } else setPreset(state.activePreset)
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
  const theme = $<HTMLSelectElement>("themeSelect").value
  state.settings.theme = theme === "dark" || theme === "light" ? theme : "system"
  storage.saveSettings(state.settings)
  applyTheme()
  applyFilters()
}

function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme
  $<HTMLSelectElement>("themeSelect").value = state.settings.theme
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
  translateAttr("data-i18n-aria-label", (el, text) => el.setAttribute("aria-label", text))
  translateAttr("data-i18n-placeholder", (el, text) => {
    ;(el as HTMLInputElement).placeholder = text
  })
  updateProblemCount()
  repl.updateLinkState()
  renderTabs()
  renderCustomPresets()
}

const MIN_CONSOLE_HEIGHT = 140
const MIN_LIST_HEIGHT = 120

/** Console height that still leaves room for the list, whatever the window height. */
function clampConsoleHeight(height: number) {
  const app = $("app")
  const listTop = $("tabList").getBoundingClientRect().top - app.getBoundingClientRect().top
  const statusHeight = document.querySelector<HTMLElement>(".status-bar")?.offsetHeight ?? 0
  const max = globalThis.innerHeight - listTop - MIN_LIST_HEIGHT - statusHeight - 5
  return Math.round(Math.max(MIN_CONSOLE_HEIGHT, Math.min(max, height)))
}

function applyConsoleLayout() {
  $("app").style.setProperty("--console-height", `${clampConsoleHeight(state.consoleHeight)}px`)
  $("app").classList.toggle("console-hidden", state.consoleHidden)
  $("showConsoleBtn").setAttribute("aria-pressed", String(!state.consoleHidden))
}

function setConsoleHidden(hidden: boolean) {
  state.consoleHidden = hidden
  applyConsoleLayout()
  saveUiState()
  setTimeout(() => {
    repl.refresh()
    if (hidden) $("tabList").focus()
    else repl.focus()
  }, 0)
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
    const statusHeight = document.querySelector<HTMLElement>(".status-bar")?.offsetHeight ?? 0
    state.consoleHeight = clampConsoleHeight(globalThis.innerHeight - ev.clientY - statusHeight)
    $("app").style.setProperty("--console-height", `${state.consoleHeight}px`)
    repl.refresh()
  })
  // The saved height may not fit a smaller window; the saved value itself is kept.
  globalThis.addEventListener("resize", applyConsoleLayout)
  globalThis.addEventListener("mouseup", () => {
    if (!dragging) return
    dragging = false
    splitter.classList.remove("dragging")
    saveUiState()
  })
}

// ── List selection and keyboard ─────────────────────────────────────────────

function focusRow(id: number | null) {
  state.focusedId = id
  renderTabs()
  scrollFocusedIntoView()
}

/** The focused tab if its row is on screen, otherwise null. */
function shownFocusedId() {
  const id = state.focusedId
  return id != null && displayOrder().includes(id) ? id : null
}

/** Click focuses a row; the checkbox or Ctrl/Cmd toggles it; Shift selects a range from the anchor. */
function clickRow(id: number, ev: MouseEvent, checkbox: HTMLInputElement | null) {
  state.rangeBase = null
  if (ev.shiftKey) {
    const order = displayOrder()
    // Without an anchor on screen the clicked row starts a new range.
    if (state.anchorId == null || !order.includes(state.anchorId)) state.anchorId = id
    selectRange(state.selectedIds, order, state.anchorId, id, checkbox?.checked ?? true)
  } else {
    if (checkbox || ev.metaKey || ev.ctrlKey) {
      if (state.selectedIds.has(id)) state.selectedIds.delete(id)
      else state.selectedIds.add(id)
    }
    state.anchorId = id
  }
  focusRow(id)
}

async function closeFocused() {
  const id = shownFocusedId()
  if (id == null) return
  const order = displayOrder()
  const next = order[order.indexOf(id) + 1] ?? order[order.indexOf(id) - 1] ?? null
  await performRowAction("close", id)
  // Keep the keyboard position on the neighbour once the tab is gone.
  if (!state.allTabs.some((tab) => tab.id === id)) focusRow(next)
}

function activateFocused() {
  const id = shownFocusedId()
  if (id != null) reportErrors(actions.activate)(id)
}

function toggleFocused() {
  const id = shownFocusedId()
  if (id == null) return
  if (state.selectedIds.has(id)) state.selectedIds.delete(id)
  else state.selectedIds.add(id)
  state.anchorId = id
  state.rangeBase = null
  renderTabs()
}

function moveRow(delta: number, extend: boolean) {
  const order = displayOrder()
  const current = shownFocusedId()
  const next = moveFocus(order, current, delta)
  if (next == null) return
  if (extend) {
    if (state.anchorId == null || !order.includes(state.anchorId)) state.anchorId = current ?? next
    state.rangeBase ??= new Set(state.selectedIds)
    state.selectedIds = extendRange(state.rangeBase, order, state.anchorId, next)
  } else {
    state.anchorId = next
    state.rangeBase = null
  }
  focusRow(next)
}

/** Fields where keys belong to the element (typing, the editor, dialogs, console text). */
function isTextTarget(el: HTMLElement | null) {
  return !!el?.closest?.(
    "input:not([type=checkbox]), textarea, select, .CodeMirror, dialog, #consoleOutput",
  )
}

/** Controls whose Enter/Space must keep their own meaning (press a button, tick a box). */
function isControlTarget(el: HTMLElement | null) {
  return !!el?.closest?.("button, a, label, input[type=checkbox]")
}

function onKeyDown(ev: KeyboardEvent) {
  if (ev.key === "`" && ev.ctrlKey) {
    ev.preventDefault()
    setConsoleHidden(!state.consoleHidden)
    return
  }
  const search = $<HTMLInputElement>("searchInput")
  if (ev.target === search) {
    if (ev.key === "Escape") {
      ev.preventDefault()
      if (search.value) {
        search.value = ""
        applyFilters()
      } else $("tabList").focus()
    } else if (ev.key === "ArrowDown" || ev.key === "Enter") {
      ev.preventDefault()
      // Apply a search still waiting for its debounce, so focus lands on the real result.
      if (searchTimer !== undefined) {
        clearTimeout(searchTimer)
        searchTimer = undefined
        applyFilters()
      }
      $("tabList").focus()
      if (shownFocusedId() == null) moveRow(1, false)
    }
    return
  }
  const target = ev.target as HTMLElement | null
  if (isTextTarget(target) || ev.altKey) return
  const mod = ev.metaKey || ev.ctrlKey
  const key = ev.key
  if (isControlTarget(target) && (key === "Enter" || key === " " || mod)) return
  if (mod && key.toLowerCase() === "a") {
    ev.preventDefault()
    state.filteredTabs.forEach((tab) => state.selectedIds.add(tab.id!))
    renderTabs()
    return
  }
  if (mod) return
  const handlers: Record<string, () => void> = {
    "/": () => {
      search.focus()
      search.select()
    },
    "?": () => $<HTMLDialogElement>("helpDialog").showModal(),
    j: () => moveRow(1, false),
    J: () => moveRow(1, true),
    ArrowDown: () => moveRow(1, ev.shiftKey),
    k: () => moveRow(-1, false),
    K: () => moveRow(-1, true),
    ArrowUp: () => moveRow(-1, ev.shiftKey),
    Home: () => moveRow(-Infinity, ev.shiftKey),
    g: () => moveRow(-Infinity, false),
    End: () => moveRow(Infinity, ev.shiftKey),
    G: () => moveRow(Infinity, false),
    x: toggleFocused,
    " ": toggleFocused,
    Enter: activateFocused,
    o: activateFocused,
    d: () => reportErrors(closeFocused)(),
    Delete: () => handlers.d(),
    Escape: () => {
      if (!state.selectedIds.size) return
      state.selectedIds.clear()
      renderTabs()
    },
  }
  const handler = handlers[key]
  if (!handler) return
  ev.preventDefault()
  handler()
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
  $("showConsoleBtn").onclick = () => setConsoleHidden(!state.consoleHidden)
  $("savePresetBtn").onclick = savePreset
  $("syncQueryBtn").onclick = () => repl.syncFromUi(true)
  document.querySelectorAll<HTMLElement>("[data-dialog-close]").forEach((button) =>
    button.addEventListener("click", () => button.closest("dialog")?.close())
  )

  $("searchInput").addEventListener("input", scheduleSearch)
  for (const id of [...Object.values(SELECT_IDS), ...Object.values(CHECKBOX_IDS)]) {
    $(id).addEventListener("change", () => applyFilters())
  }
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
  tabList.addEventListener("click", (ev) => {
    const target = ev.target as HTMLElement
    const button = target.closest<HTMLElement>("[data-row-action]")
    if (button) {
      reportErrors(performRowAction)(button.dataset.rowAction!, Number(button.dataset.tabId))
      return
    }
    const row = target.closest<HTMLElement>(".tab-row")
    if (!row) return
    const checkbox = target.closest<HTMLInputElement>(".row-checkbox")
    // Clicks on the checkbox label reach here twice (label, then input); handle the input only.
    if (!checkbox && target.closest(".row-check")) return
    // Each click re-renders the rows, so the browser never fires dblclick; use the click count.
    if (ev.detail === 2 && !checkbox && !ev.shiftKey && !ev.metaKey && !ev.ctrlKey) {
      reportErrors(actions.activate)(Number(row.dataset.tabId))
      return
    }
    clickRow(Number(row.dataset.tabId), ev, checkbox)
  })
  tabList.addEventListener("focus", () => {
    // Show where the keyboard is as soon as the list gets focus (Tab key, click).
    if (state.focusedId == null || !displayOrder().includes(state.focusedId)) {
      focusRow(displayOrder()[0] ?? null)
    }
  })
  tabList.addEventListener("mousedown", (ev) => {
    // Shift+click would otherwise select page text.
    if (ev.shiftKey) ev.preventDefault()
  })
  $("selectionBar").onclick = (ev) => {
    const action = (ev.target as HTMLElement).closest<HTMLElement>("[data-action]")?.dataset.action
    if (action) reportErrors(performBulkAction)(action as BulkAction)
  }
  $("closeShownBtn").onclick = () => reportErrors(performBulkAction)("close-shown")
  $("clearSelectionBtn").onclick = () => {
    state.selectedIds.clear()
    renderTabs()
  }
  document.addEventListener("keydown", onKeyDown)

  for (const id of [...Object.values(SETTING_CHECKBOXES), "themeSelect"]) {
    $(id).addEventListener("change", saveSettingsFromUi)
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
