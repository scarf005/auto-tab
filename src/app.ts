// @ts-nocheck
import CodeMirror from "codemirror"
import "codemirror/mode/javascript/javascript.js"
import "codemirror/addon/hint/show-hint.js"
import "codemirror/addon/edit/closebrackets.js"
import "codemirror/addon/edit/matchbrackets.js"
;(function () {
  "use strict"

  const STORAGE_KEYS = {
    settings: "tabConsole.settings",
    presets: "tabConsole.presets",
    history: "tabConsole.history",
    ui: "tabConsole.ui",
  }

  const translations = {
    ko: {
      sync_query: "UI → 쿼리",
      sync_query_title: "우측 필터 상태를 좌측 쿼리로 강제 동기화",
      help: "도움말",
      clear: "지우기",
      hide_console: "콘솔 숨기기",
      hide_console_title: "우측 탭 탐색기만 사용",
      show_console: "콘솔 표시",
      refresh: "새로고침",
      settings: "설정",
      editor_shortcuts: "Ctrl+Enter 실행 · Ctrl+Space 자동완성 · Alt+↑/↓ 기록",
      run: "실행",
      tab_explorer: "탭 탐색기",
      search_placeholder: "제목 / URL 검색",
      field_all: "제목 + URL",
      field_title: "제목",
      field_url: "URL",
      field_host: "도메인",
      scope: "범위",
      scope_all: "모든 창",
      scope_current: "현재 창",
      state: "상태",
      state_all: "모든 상태",
      state_active: "활성",
      state_inactive: "비활성",
      state_pinned: "고정됨",
      state_unpinned: "고정 안 됨",
      state_audible: "소리 재생",
      state_muted: "음소거",
      state_discarded: "언로드됨",
      state_loading: "로딩 중",
      state_complete: "로드 완료",
      accessed: "마지막 접근",
      accessed_all: "전체",
      accessed_lt5m: "5분 이내",
      accessed_lt1h: "1시간 이내",
      accessed_lt24h: "24시간 이내",
      accessed_gt24h: "24시간 초과",
      accessed_gt7d: "7일 초과",
      accessed_gt30d: "30일 초과",
      accessed_never: "기록 없음",
      sort: "정렬",
      sort_recent: "접근: 최근순",
      sort_old: "접근: 오래된순",
      sort_state: "상태",
      sort_domain: "도메인",
      sort_title: "제목",
      sort_window: "창 / 탭 순서",
      group_by: "그룹화",
      group_none: "안 함",
      group_domain: "도메인",
      group_window: "창",
      group_state: "상태",
      group_sort: "그룹 정렬",
      group_sort_name: "이름",
      group_sort_count_desc: "개수 ↓",
      group_sort_count_asc: "개수 ↑",
      group_sort_recent: "최근 접근",
      group_sort_old: "오래된 접근",
      ignore_pinned: "고정 탭 무시",
      ignore_pinned_desc: "고정 탭을 조회 결과와 일괄 작업 대상에서 제외합니다.",
      preset_all: "전체",
      preset_duplicates: "중복 URL",
      preset_stale: "24시간 미접근",
      preset_audible: "소리 재생",
      preset_discarded: "언로드됨",
      save_preset: "프리셋 저장",
      close_shown: "조회 결과 닫기",
      close_selected: "선택 항목 닫기",
      close_shown_desc: "현재 필터를 통과해 화면에 표시된 탭을 선택 여부와 관계없이 전부 닫습니다.",
      close_selected_desc: "체크박스로 선택한 탭만 닫습니다.",
      discard: "언로드",
      reload: "새로고침",
      pin: "고정",
      unpin: "고정 해제",
      mute: "음소거",
      unmute: "음소거 해제",
      tab: "탭",
      theme_toggle: "라이트/다크 모드 전환",
      help_title: "REPL 도우미",
      help_tabs: "현재 우측 필터 결과",
      help_selected: "체크한 탭",
      help_last: "직전 REPL 결과",
      help_query: "우측 필터 상태를 적용하고 결과 반환",
      help_close: "현재 필터 결과 닫기",
      help_table: "콘솔에 표 렌더링",
      help_raw: "Firefox WebExtension 원본 API",
      confirm_close: "탭 닫기 전 확인",
      hide_self: "Tab Console 자체 숨기기",
      auto_refresh: "탭 변경 시 자동 새로고침",
      theme: "테마",
      theme_light: "라이트",
      theme_dark: "다크",
      reset: "저장 상태 초기화",
      done: "완료",
      linked: "UI 쿼리 연동됨",
      edited: "사용자 코드 — UI 자동 덮어쓰기 중지",
      ready: "준비됨",
      running: "실행 중…",
      completed: "완료",
      error: "오류",
      refresh_failed: "새로고침 실패",
      no_match: "조건에 맞는 탭이 없습니다.",
      selected_shown: "{selected}개 선택 · {shown}개 표시",
      tabs_count: "{count}개 탭",
      shown_total: "{shown}개 표시 · 전체 {total}개",
      group_count: "{count}개",
      now: "방금",
      min: "{count}분",
      hour: "{count}시간",
      day: "{count}일",
      untitled: "(제목 없음)",
      active: "활성",
      pinned: "고정",
      audio: "소리",
      muted: "음소거",
      discarded_state: "언로드",
      loading: "로딩",
      complete: "완료",
      activate_tab: "탭 활성화",
      close_tab: "탭 닫기",
      preset_name: "프리셋 이름:",
      delete_preset: "프리셋 ‘{name}’을 삭제할까요?",
      close_shown_confirm: "표시된 탭 {count}개를 모두 닫을까요?",
      close_selected_confirm: "선택한 탭 {count}개를 닫을까요?",
      close_one_confirm: "‘{title}’ 탭을 닫을까요?",
      reset_confirm: "필터, 프리셋, 설정, REPL 기록을 초기화할까요?",
      ready_console:
        "준비됨. {count}개 탭을 읽었습니다. $tabs, $selected, $_, browser.*를 사용할 수 있습니다.",
      errors: "오류 {count}개",
      rows: "{count}행",
      first100: "처음 100행 표시",
      window_group: "창 {id}",
      state_group: "상태: {state}",
    },
    en: {
      sync_query: "UI → Query",
      sync_query_title: "Force the current right-panel filters into the left query",
      help: "Help",
      clear: "Clear",
      hide_console: "Hide console",
      hide_console_title: "Use the Tab Explorer alone",
      show_console: "Show console",
      refresh: "Refresh",
      settings: "Settings",
      editor_shortcuts: "Ctrl+Enter run · Ctrl+Space complete · Alt+↑/↓ history",
      run: "Run",
      tab_explorer: "Tab Explorer",
      search_placeholder: "Search title / URL",
      field_all: "Title + URL",
      field_title: "Title",
      field_url: "URL",
      field_host: "Domain",
      scope: "Scope",
      scope_all: "All windows",
      scope_current: "Current window",
      state: "State",
      state_all: "Any state",
      state_active: "Active",
      state_inactive: "Inactive",
      state_pinned: "Pinned",
      state_unpinned: "Unpinned",
      state_audible: "Audible",
      state_muted: "Muted",
      state_discarded: "Discarded",
      state_loading: "Loading",
      state_complete: "Complete",
      accessed: "Accessed",
      accessed_all: "Any time",
      accessed_lt5m: "Within 5 min",
      accessed_lt1h: "Within 1 h",
      accessed_lt24h: "Within 24 h",
      accessed_gt24h: "Older than 24 h",
      accessed_gt7d: "Older than 7 d",
      accessed_gt30d: "Older than 30 d",
      accessed_never: "No timestamp",
      sort: "Sort",
      sort_recent: "Accessed: recent",
      sort_old: "Accessed: old",
      sort_state: "State",
      sort_domain: "Domain",
      sort_title: "Title",
      sort_window: "Window / index",
      group_by: "Group by",
      group_none: "None",
      group_domain: "Domain",
      group_window: "Window",
      group_state: "State",
      group_sort: "Group sort",
      group_sort_name: "Name",
      group_sort_count_desc: "Count ↓",
      group_sort_count_asc: "Count ↑",
      group_sort_recent: "Recent access",
      group_sort_old: "Old access",
      ignore_pinned: "Ignore pinned",
      ignore_pinned_desc: "Pinned tabs are excluded from results and bulk actions.",
      preset_all: "All",
      preset_duplicates: "Duplicates",
      preset_stale: "Stale 24 h",
      preset_audible: "Audible",
      preset_discarded: "Discarded",
      save_preset: "Save preset",
      close_shown: "Close shown",
      close_selected: "Close selected",
      close_shown_desc:
        "Closes every tab currently visible after filtering, regardless of selection.",
      close_selected_desc: "Closes only checked tabs.",
      discard: "Discard",
      reload: "Reload",
      pin: "Pin",
      unpin: "Unpin",
      mute: "Mute",
      unmute: "Unmute",
      tab: "Tab",
      theme_toggle: "Toggle light/dark mode",
      help_title: "REPL helpers",
      help_tabs: "Current filtered result",
      help_selected: "Checked tabs",
      help_last: "Previous REPL result",
      help_query: "Apply/query the right-panel state",
      help_close: "Close current filtered tabs",
      help_table: "Render a table in the console",
      help_raw: "Raw Firefox WebExtension API",
      confirm_close: "Confirm before closing tabs",
      hide_self: "Hide Tab Console itself",
      auto_refresh: "Auto refresh on tab changes",
      theme: "Theme",
      theme_light: "Light",
      theme_dark: "Dark",
      reset: "Reset saved state",
      done: "Done",
      linked: "UI query linked",
      edited: "Custom code — UI auto-rewrite paused",
      ready: "Ready",
      running: "Running…",
      completed: "Completed",
      error: "Error",
      refresh_failed: "Refresh failed",
      no_match: "No tabs match this filter.",
      selected_shown: "{selected} selected · {shown} shown",
      tabs_count: "{count} tabs",
      shown_total: "{shown} shown · {total} total",
      group_count: "{count}",
      now: "now",
      min: "{count} min",
      hour: "{count} h",
      day: "{count} d",
      untitled: "(untitled)",
      active: "active",
      pinned: "pinned",
      audio: "audio",
      muted: "muted",
      discarded_state: "discarded",
      loading: "loading",
      complete: "complete",
      activate_tab: "Activate tab",
      close_tab: "Close tab",
      preset_name: "Preset name:",
      delete_preset: "Delete preset ‘{name}’?",
      close_shown_confirm: "Close all {count} shown tabs?",
      close_selected_confirm: "Close {count} selected tabs?",
      close_one_confirm: "Close ‘{title}’?",
      reset_confirm: "Reset filters, presets, settings, and REPL history?",
      ready_console:
        "Ready. {count} tabs available. Use $tabs, $selected, $_, or browser.* in the REPL.",
      errors: "{count} errors",
      rows: "{count} rows",
      first100: "first 100 shown",
      window_group: "Window {id}",
      state_group: "State: {state}",
    },
  }

  const prefersKorean = (navigator.languages || [navigator.language || ""]).some((x) =>
    String(x).toLowerCase().startsWith("ko")
  )
  const defaults = {
    confirmClose: true,
    hideSelf: true,
    autoRefresh: true,
    theme: "light",
    language: prefersKorean ? "ko" : "en",
  }

  const state = {
    allTabs: [],
    filteredTabs: [],
    selectedIds: new Set(),
    currentWindowId: null,
    activePreset: "all",
    customPresets: [],
    settings: { ...defaults },
    history: [],
    historyIndex: 0,
    lastResult: undefined,
    errorCount: 0,
    consoleHidden: false,
    consoleWidth: "48vw",
    refreshTimer: null,
    searchTimer: null,
    rendering: false,
    editorDirty: false,
    syncingEditor: false,
    lastGeneratedQuery: "",
  }

  const $ = (id) => document.getElementById(id)
  const t = (key, vars = {}) => {
    const dict = translations[state.settings.language] || translations.en
    let value = dict[key] ?? translations.en[key] ?? key
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.replaceAll(`{${name}}`, String(replacement))
    }
    return value
  }
  const safeParse = (text, fallback) => {
    if (text == null || text === "") return fallback
    try {
      return JSON.parse(text) ?? fallback
    } catch {
      return fallback
    }
  }
  const saveLocal = (key, value) => localStorage.setItem(key, JSON.stringify(value))

  function loadState() {
    state.settings = { ...defaults, ...safeParse(localStorage.getItem(STORAGE_KEYS.settings), {}) }
    state.customPresets = safeParse(localStorage.getItem(STORAGE_KEYS.presets), [])
    state.history = safeParse(localStorage.getItem(STORAGE_KEYS.history), [])
    const savedUi = safeParse(localStorage.getItem(STORAGE_KEYS.ui), {})
    state.consoleHidden = !!savedUi.consoleHidden
    state.consoleWidth = savedUi.consoleWidth || "48vw"
  }
  loadState()

  const editor = CodeMirror.fromTextArea($("codeEditor"), {
    mode: "javascript",
    lineNumbers: true,
    lineWrapping: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    autoCloseBrackets: true,
    matchBrackets: true,
    viewportMargin: Infinity,
    extraKeys: {
      "Ctrl-Enter": runEditor,
      "Cmd-Enter": runEditor,
      "Ctrl-Space": (cm) => showCompletion(cm),
      "Alt-Up": () => moveHistory(-1),
      "Alt-Down": () => moveHistory(1),
      "Ctrl-L": clearConsole,
    },
  })

  function setStatus(text) {
    $("statusText").textContent = text
  }
  function nowTime() {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  function applyI18n() {
    document.documentElement.lang = state.settings.language
    $("languageSelect").value = state.settings.language
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n)
    })
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.title = t(el.dataset.i18nTitle)
    })
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder)
    })
    updateProblemCount()
    updateQueryLinkState()
    renderTabs()
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.settings.theme === "dark" ? "dark" : "light"
    $("themeSelect").value = state.settings.theme
    $("themeBtn").textContent = state.settings.theme === "dark" ? "☾" : "☀"
  }

  function formatValue(value, depth = 0, seen = new WeakSet()) {
    if (value === undefined) return "undefined"
    if (value === null) return "null"
    if (typeof value === "string") return JSON.stringify(value)
    if (["number", "boolean", "bigint"].includes(typeof value)) return String(value)
    if (typeof value === "function") return `ƒ ${value.name || "anonymous"}()`
    if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`
    if (value instanceof RegExp) return value.toString()
    if (value instanceof Date) return value.toISOString()
    if (typeof value === "object") {
      if (seen.has(value)) return "[Circular]"
      seen.add(value)
      if (depth > 4) return Array.isArray(value) ? "[…]" : "{…}"
      if (Array.isArray(value)) {
        const values = value.slice(0, 80).map((x) => formatValue(x, depth + 1, seen))
        if (value.length > 80) values.push(`… ${value.length - 80} more`)
        return `[\n  ${values.join(",\n  ").replaceAll("\n", "\n  ")}\n]`
      }
      let keys
      try {
        keys = Object.keys(value)
      } catch {
        return String(value)
      }
      const values = keys.slice(0, 80).map((key) => {
        let result
        try {
          result = formatValue(value[key], depth + 1, seen)
        } catch (err) {
          result = `[Thrown: ${err.message}]`
        }
        return `${key}: ${result}`
      })
      if (keys.length > 80) values.push(`… ${keys.length - 80} more`)
      return `{\n  ${values.join(",\n  ").replaceAll("\n", "\n  ")}\n}`
    }
    return String(value)
  }

  function appendEntry(kind, value, source) {
    const entry = document.createElement("div")
    entry.className = `console-entry ${kind}`
    if (source) {
      const src = document.createElement("div")
      src.className = "source-line"
      src.textContent = source
      entry.appendChild(src)
    }
    if (kind !== "source") {
      const out = document.createElement("div")
      out.className = "console-value"
      out.textContent = Array.isArray(value) && kind !== "result"
        ? value.map((v) => typeof v === "string" ? v : formatValue(v)).join(" ")
        : formatValue(value)
      entry.appendChild(out)
    }
    const meta = document.createElement("div")
    meta.className = "console-meta"
    meta.textContent = nowTime()
    entry.appendChild(meta)
    $("consoleOutput").appendChild(entry)
    $("consoleOutput").scrollTop = $("consoleOutput").scrollHeight
    if (kind === "error") {
      state.errorCount++
      updateProblemCount()
    }
  }

  function appendTable(value) {
    let rows
    if (Array.isArray(value)) rows = value
    else if (value && typeof value === "object") {
      rows = Object.keys(value).map((key) =>
        value[key] && typeof value[key] === "object"
          ? { "(index)": key, ...value[key] }
          : { "(index)": key, value: value[key] }
      )
    } else return appendEntry("log", [value])
    const entry = document.createElement("div")
    entry.className = "console-entry log"
    const table = document.createElement("table")
    table.className = "console-table"
    const keys = []
    rows.slice(0, 100).forEach((row) => {
      if (row && typeof row === "object") {
        Object.keys(row).forEach((key) => {
          if (!keys.includes(key) && keys.length < 12) keys.push(key)
        })
      } else if (!keys.includes("value")) keys.push("value")
    })
    const thead = document.createElement("thead"), hr = document.createElement("tr")
    keys.forEach((key) => {
      const th = document.createElement("th")
      th.textContent = key
      hr.appendChild(th)
    })
    thead.appendChild(hr)
    table.appendChild(thead)
    const tbody = document.createElement("tbody")
    rows.slice(0, 100).forEach((row) => {
      const tr = document.createElement("tr")
      keys.forEach((key) => {
        const td = document.createElement("td")
        const v = row && typeof row === "object" ? row[key] : (key === "value" ? row : undefined)
        td.textContent = v && typeof v === "object" ? formatValue(v, 1) : String(v ?? "")
        tr.appendChild(td)
      })
      tbody.appendChild(tr)
    })
    table.appendChild(tbody)
    entry.appendChild(table)
    const meta = document.createElement("div")
    meta.className = "console-meta"
    meta.textContent = `${t("rows", { count: rows.length })}${
      rows.length > 100 ? ` · ${t("first100")}` : ""
    } · ${nowTime()}`
    entry.appendChild(meta)
    $("consoleOutput").appendChild(entry)
    $("consoleOutput").scrollTop = $("consoleOutput").scrollHeight
  }

  const replConsole = {
    log: (...args) => appendEntry("log", args),
    info: (...args) => appendEntry("info", args),
    warn: (...args) => appendEntry("warn", args),
    error: (...args) => appendEntry("error", args),
    table: appendTable,
    clear: clearConsole,
  }
  function updateProblemCount() {
    const el = $("problemCount")
    el.textContent = t("errors", { count: state.errorCount })
    el.classList.toggle("has-errors", state.errorCount > 0)
  }
  function clearConsole() {
    $("consoleOutput").textContent = ""
    state.errorCount = 0
    updateProblemCount()
  }

  const indirectEval = globalThis.eval

  function compileUserSource(source) {
    try {
      return indirectEval(`(async (console) => (\n${source}\n))`)
    } catch (err) {
      if (!(err instanceof SyntaxError)) throw err
      return indirectEval(`(async (console) => {\n${source}\n})`)
    }
  }

  async function executeUserSource(source) {
    return await compileUserSource(source)(replConsole)
  }
  async function runEditor() {
    const source = editor.getValue().trim()
    if (!source) return
    if (!state.history.length || state.history.at(-1) !== source) {
      state.history.push(source)
      if (state.history.length > 100) state.history.shift()
      saveLocal(STORAGE_KEYS.history, state.history)
    }
    state.historyIndex = state.history.length
    appendEntry("source", "", source)
    setStatus(t("running"))
    try {
      const result = await executeUserSource(source)
      state.lastResult = result
      appendEntry("result", result)
      setStatus(t("completed"))
    } catch (err) {
      appendEntry("error", err)
      setStatus(t("error"))
    }
  }
  function moveHistory(delta) {
    if (!state.history.length) return
    state.historyIndex = Math.max(0, Math.min(state.history.length, state.historyIndex + delta))
    editor.setValue(
      state.historyIndex === state.history.length ? "" : state.history[state.historyIndex],
    )
    editor.setCursor(editor.lineCount(), 0)
  }

  function ownKeysDeep(obj) {
    const out = new Set()
    let cur = obj, depth = 0
    while (cur && depth < 3) {
      try {
        Object.getOwnPropertyNames(cur).forEach((k) => out.add(k))
      } catch {
        break
      }
      cur = Object.getPrototypeOf(cur)
      depth++
    }
    return [...out].filter((x) => x !== "__proto__").sort()
  }
  function resolveChain(chain) {
    let value = globalThis
    for (const part of chain.split(".")) {
      if (!part) continue
      try {
        value = value[part]
      } catch {
        return null
      }
      if (value == null) return null
    }
    return value
  }
  const globalCompletions = [
    "browser",
    "$tabs",
    "$selected",
    "$_",
    "tabs",
    "refresh",
    "close",
    "discard",
    "reload",
    "pin",
    "unpin",
    "mute",
    "unmute",
    "activate",
    "hostname",
    "normalizeUrl",
    "table",
    "sleep",
    "ui",
    "Array",
    "Object",
    "Map",
    "Set",
    "Promise",
    "RegExp",
    "URL",
    "Date",
    "JSON",
    "Math",
    "Intl",
    "console",
    "globalThis",
    "async",
    "await",
    "const",
    "let",
    "return",
    "if",
    "else",
    "for",
    "of",
    "while",
    "try",
    "catch",
    "throw",
    "new",
    "typeof",
  ]
  function completionHint(cm) {
    const cursor = cm.getCursor(), line = cm.getLine(cursor.line).slice(0, cursor.ch)
    const chainMatch = line.match(
        /([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.([A-Za-z_$][\w$]*)?$/,
      ),
      wordMatch = line.match(/([A-Za-z_$][\w$]*)$/)
    let list = [], fromCh = cursor.ch
    if (chainMatch) {
      const target = resolveChain(chainMatch[1]), prefix = chainMatch[2] || ""
      fromCh -= prefix.length
      if (target) {
        list = ownKeysDeep(target).filter((x) => x.toLowerCase().startsWith(prefix.toLowerCase()))
      }
    } else {
      const prefix = wordMatch?.[1] || ""
      fromCh -= prefix.length
      list = globalCompletions.filter((x) => x.toLowerCase().startsWith(prefix.toLowerCase()))
    }
    return {
      list: list.slice(0, 120),
      from: CodeMirror.Pos(cursor.line, fromCh),
      to: CodeMirror.Pos(cursor.line, cursor.ch),
    }
  }
  function showCompletion(cm) {
    CodeMirror.showHint(cm, completionHint, { completeSingle: false })
  }
  editor.on("inputRead", (cm, change) => {
    if (change.text?.length === 1 && change.text[0] === ".") showCompletion(cm)
  })
  editor.on("change", () => {
    if (state.syncingEditor) return
    state.editorDirty = editor.getValue().trim() !== state.lastGeneratedQuery.trim()
    updateQueryLinkState()
  })

  function normalizeItems(items) {
    if (items == null) return []
    const ids = []
    for (const item of (Array.isArray(items) ? items : [items])) {
      const id = typeof item === "number" ? item : item?.id
      if (Number.isInteger(id) && !ids.includes(id)) ids.push(id)
    }
    return ids
  }
  const tabs = (query = {}) => browser.tabs.query(query)
  async function closeTabs(items) {
    const ids = normalizeItems(items)
    if (!ids.length) return 0
    await browser.tabs.remove(ids)
    scheduleRefresh(30)
    return ids.length
  }
  async function discardTabs(items) {
    const ids = normalizeItems(items)
    const r = await Promise.allSettled(ids.map((id) => browser.tabs.discard(id)))
    scheduleRefresh(80)
    return r
  }
  async function reloadTabs(items) {
    const ids = normalizeItems(items)
    const r = await Promise.allSettled(ids.map((id) => browser.tabs.reload(id)))
    scheduleRefresh(80)
    return r
  }
  async function updateTabs(items, props) {
    const ids = normalizeItems(items)
    const r = await Promise.allSettled(ids.map((id) => browser.tabs.update(id, props)))
    scheduleRefresh(80)
    return r
  }
  const pinTabs = (items) => updateTabs(items, { pinned: true }),
    unpinTabs = (items) => updateTabs(items, { pinned: false }),
    muteTabs = (items) => updateTabs(items, { muted: true }),
    unmuteTabs = (items) => updateTabs(items, { muted: false })
  async function activateTab(tab) {
    const id = typeof tab === "number" ? tab : tab?.id
    if (!Number.isInteger(id)) throw new Error("activate(tab): valid tab or tab ID required")
    const target = await browser.tabs.get(id)
    await browser.windows.update(target.windowId, { focused: true })
    return browser.tabs.update(id, { active: true })
  }
  function hostname(tabOrUrl) {
    const raw = typeof tabOrUrl === "string" ? tabOrUrl : tabOrUrl?.url || ""
    try {
      return new URL(raw).hostname
    } catch {
      return ""
    }
  }
  function normalizeUrl(tabOrUrl) {
    const raw = typeof tabOrUrl === "string" ? tabOrUrl : tabOrUrl?.url || ""
    try {
      const u = new URL(raw)
      u.hash = ""
      if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "")
      return u.toString()
    } catch {
      return raw.replace(/#.*$/, "").replace(/\/+$/, "")
    }
  }
  const tableHelper = (value) => replConsole.table(value),
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  function getUiOptions(includeDefaults = false) {
    const raw = {
      search: $("searchInput").value,
      regex: $("regexToggle").checked,
      field: $("fieldSelect").value,
      scope: $("scopeSelect").value,
      state: $("stateFilter").value,
      accessed: $("accessedFilter").value,
      sort: $("sortSelect").value,
      groupBy: $("groupBySelect").value,
      groupSort: $("groupSortSelect").value,
      ignorePinned: $("ignorePinnedToggle").checked,
      preset: state.activePreset,
    }
    if (includeDefaults) return raw
    const defaults = {
      search: "",
      regex: false,
      field: "all",
      scope: "all",
      state: "all",
      accessed: "all",
      sort: "recent",
      groupBy: "none",
      groupSort: "name",
      ignorePinned: false,
      preset: "all",
    }
    return Object.fromEntries(Object.entries(raw).filter(([key, value]) => value !== defaults[key]))
  }
  function setUiOptions(opts = {}) {
    if (opts.search !== undefined) $("searchInput").value = String(opts.search)
    if (opts.regex !== undefined) $("regexToggle").checked = !!opts.regex
    if (opts.field !== undefined) $("fieldSelect").value = opts.field
    if (opts.scope !== undefined) $("scopeSelect").value = opts.scope
    if (opts.state !== undefined) $("stateFilter").value = opts.state
    if (opts.accessed !== undefined) $("accessedFilter").value = opts.accessed
    if (opts.sort !== undefined) $("sortSelect").value = opts.sort
    if (opts.groupBy !== undefined) $("groupBySelect").value = opts.groupBy
    if (opts.groupSort !== undefined) $("groupSortSelect").value = opts.groupSort
    if (opts.ignorePinned !== undefined) $("ignorePinnedToggle").checked = !!opts.ignorePinned
    if (opts.preset !== undefined) setPreset(opts.preset)
  }
  function buildUiQuerySource() {
    return `await ui.query(${JSON.stringify(getUiOptions(false), null, 2)})`
  }
  function syncEditorFromUi(force = false) {
    if (!force && state.editorDirty) return
    const source = buildUiQuerySource()
    state.lastGeneratedQuery = source
    state.syncingEditor = true
    if (editor.getValue() !== source) editor.setValue(source)
    state.syncingEditor = false
    state.editorDirty = false
    updateQueryLinkState()
  }
  function updateQueryLinkState() {
    $("queryLinkState").textContent = state.editorDirty ? t("edited") : t("linked")
  }

  const ui = {
    refresh: refreshTabs,
    select(items) {
      normalizeItems(items).forEach((id) => state.selectedIds.add(id))
      renderTabs()
      return getSelectedTabs()
    },
    clearSelection() {
      state.selectedIds.clear()
      renderTabs()
    },
    async query(opts = {}) {
      setUiOptions(opts)
      applyFilters({ skipEditorSync: true })
      syncEditorFromUi(true)
      return state.filteredTabs.slice()
    },
    setFilter(opts = {}) {
      setUiOptions(opts)
      applyFilters({ skipEditorSync: true })
      syncEditorFromUi(true)
      return state.filteredTabs.slice()
    },
    shown: () => state.filteredTabs.slice(),
    state: () => getUiOptions(true),
    syncQuery: () => {
      syncEditorFromUi(true)
      return editor.getValue()
    },
  }

  Object.assign(globalThis, {
    tabs,
    refresh: refreshTabs,
    close: closeTabs,
    discard: discardTabs,
    reload: reloadTabs,
    pin: pinTabs,
    unpin: unpinTabs,
    mute: muteTabs,
    unmute: unmuteTabs,
    activate: activateTab,
    hostname,
    normalizeUrl,
    table: tableHelper,
    sleep,
    ui,
  })
  Object.defineProperties(globalThis, {
    "$tabs": { configurable: true, get: () => state.filteredTabs.slice() },
    "$selected": { configurable: true, get: () => getSelectedTabs() },
    "$_": { configurable: true, get: () => state.lastResult },
  })

  function filterSearchValue(tab, field) {
    if (field === "title") return tab.title || ""
    if (field === "url") return tab.url || ""
    if (field === "host") return hostname(tab)
    return `${tab.title || ""}\n${tab.url || ""}`
  }
  function getDuplicateSet(tabsList) {
    const counts = new Map()
    tabsList.forEach((tab) => {
      const key = normalizeUrl(tab)
      if (key) counts.set(key, (counts.get(key) || 0) + 1)
    })
    return new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key))
  }
  function presetPredicate(name, tabsList) {
    const duplicateSet = name === "duplicates" ? getDuplicateSet(tabsList) : null, day = 86400000
    if (name === "duplicates") return (tab) => duplicateSet.has(normalizeUrl(tab))
    if (name === "audible") return (tab) => !!tab.audible
    if (name === "pinned") return (tab) => !!tab.pinned
    if (name === "discarded") return (tab) => !!tab.discarded
    if (name === "stale24") {
      return (tab) => !!tab.lastAccessed && tab.lastAccessed < Date.now() - day
    }
    if (name === "linear") {
      return (tab) => {
        const h = hostname(tab)
        return h === "linear.app" || h.endsWith(".linear.app")
      }
    }
    if (name === "github") {
      return (tab) => {
        const h = hostname(tab)
        return h === "github.com" || h.endsWith(".github.com")
      }
    }
    return () => true
  }

  function primaryState(tab) {
    if (tab.active) return "active"
    if (tab.pinned) return "pinned"
    if (tab.audible) return "audible"
    if (tab.mutedInfo?.muted) return "muted"
    if (tab.discarded) return "discarded"
    if (tab.status === "loading") return "loading"
    return "complete"
  }
  function stateRank(tab) {
    return ({ active: 0, pinned: 1, audible: 2, muted: 3, loading: 4, complete: 5, discarded: 6 })[
      primaryState(tab)
    ] ?? 9
  }
  function matchesState(tab, filter) {
    if (filter === "all") return true
    if (filter === "active") return !!tab.active
    if (filter === "inactive") return !tab.active
    if (filter === "pinned") return !!tab.pinned
    if (filter === "unpinned") return !tab.pinned
    if (filter === "audible") return !!tab.audible
    if (filter === "muted") return !!tab.mutedInfo?.muted
    if (filter === "discarded") return !!tab.discarded
    if (filter === "loading") return tab.status === "loading"
    if (filter === "complete") return tab.status === "complete" && !tab.discarded
    return true
  }
  function matchesAccessed(tab, filter) {
    const ts = Number(tab.lastAccessed || 0),
      age = ts ? Date.now() - ts : Infinity,
      h = 3600000,
      d = 86400000
    if (filter === "all") return true
    if (filter === "never") return !ts
    if (!ts) return false
    if (filter === "lt5m") return age <= 300000
    if (filter === "lt1h") return age <= h
    if (filter === "lt24h") return age <= d
    if (filter === "gt24h") return age > d
    if (filter === "gt7d") return age > 7 * d
    if (filter === "gt30d") return age > 30 * d
    return true
  }
  function sortTabs(result, sort) {
    result.sort((a, b) => {
      if (sort === "old") return (a.lastAccessed || 0) - (b.lastAccessed || 0)
      if (sort === "state") {
        return stateRank(a) - stateRank(b) || (b.lastAccessed || 0) - (a.lastAccessed || 0)
      }
      if (sort === "domain") {
        return hostname(a).localeCompare(hostname(b)) ||
          (a.title || "").localeCompare(b.title || "")
      }
      if (sort === "title") return (a.title || "").localeCompare(b.title || "")
      if (sort === "window") return a.windowId - b.windowId || a.index - b.index
      return (b.lastAccessed || 0) - (a.lastAccessed || 0)
    })
  }

  function applyFilters({ skipEditorSync = false } = {}) {
    if (state.rendering) return
    const search = $("searchInput").value,
      regex = $("regexToggle").checked,
      field = $("fieldSelect").value,
      scope = $("scopeSelect").value,
      stateFilter = $("stateFilter").value,
      accessed = $("accessedFilter").value,
      sort = $("sortSelect").value,
      ignorePinned = $("ignorePinnedToggle").checked
    $("regexError").textContent = ""
    let matcher = null
    if (search) {
      if (regex) {
        try {
          matcher = new RegExp(search, "i")
        } catch (err) {
          $("regexError").textContent = err.message
          state.filteredTabs = []
          renderTabs()
          saveUiFilterState()
          if (!skipEditorSync) syncEditorFromUi()
          return
        }
      } else {
        const needle = search.toLowerCase()
        matcher = { test: (value) => value.toLowerCase().includes(needle) }
      }
    }
    const ownUrl = browser.runtime.getURL("console.html")
    const base = state.allTabs.filter((tab) => {
      if (state.settings.hideSelf && tab.url === ownUrl) return false
      if (ignorePinned && tab.pinned) return false
      if (scope === "current" && tab.windowId !== state.currentWindowId) return false
      if (!matchesState(tab, stateFilter) || !matchesAccessed(tab, accessed)) return false
      if (matcher && !matcher.test(filterSearchValue(tab, field))) return false
      return true
    })
    const pred = presetPredicate(state.activePreset, base), result = base.filter(pred)
    sortTabs(result, sort)
    state.filteredTabs = result
    const visibleIds = new Set(result.map((x) => x.id))
    ;[...state.selectedIds].forEach((id) => {
      if (!visibleIds.has(id)) state.selectedIds.delete(id)
    })
    renderTabs()
    saveUiFilterState()
    if (!skipEditorSync) syncEditorFromUi()
  }

  function saveUiFilterState() {
    const prior = safeParse(localStorage.getItem(STORAGE_KEYS.ui), {})
    saveLocal(STORAGE_KEYS.ui, {
      ...prior,
      consoleHidden: state.consoleHidden,
      consoleWidth: state.consoleWidth,
      ...getUiOptions(true),
    })
  }
  function restoreUiFilterState() {
    const saved = safeParse(localStorage.getItem(STORAGE_KEYS.ui), {})
    setUiOptions(saved)
    if (saved.preset) state.activePreset = saved.preset
  }
  function setPreset(name) {
    state.activePreset = name || "all"
    document.querySelectorAll(".preset[data-preset]").forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.preset === state.activePreset)
    )
  }
  function renderCustomPresets() {
    const bar = $("customPresetBar")
    bar.textContent = ""
    state.customPresets.forEach((preset, index) => {
      const button = document.createElement("button")
      button.className = "preset"
      button.textContent = preset.name
      button.title = `${t("save_preset")} · right-click: delete`
      button.onclick = () => {
        setUiOptions(preset)
        applyFilters()
      }
      button.oncontextmenu = (ev) => {
        ev.preventDefault()
        if (confirm(t("delete_preset", { name: preset.name }))) {
          state.customPresets.splice(index, 1)
          saveLocal(STORAGE_KEYS.presets, state.customPresets)
          renderCustomPresets()
        }
      }
      bar.appendChild(button)
    })
  }
  async function savePreset() {
    const name = prompt(t("preset_name"))
    if (!name) return
    state.customPresets.push({ name: name.trim().slice(0, 40), ...getUiOptions(true) })
    saveLocal(STORAGE_KEYS.presets, state.customPresets)
    renderCustomPresets()
  }

  function relativeTime(timestamp) {
    if (!timestamp) return "—"
    const diff = Math.max(0, Date.now() - timestamp), min = Math.floor(diff / 60000)
    if (min < 1) return t("now")
    if (min < 60) return t("min", { count: min })
    const hours = Math.floor(min / 60)
    if (hours < 24) return t("hour", { count: hours })
    return t("day", { count: Math.floor(hours / 24) })
  }
  function statePill(text, cls) {
    const span = document.createElement("span")
    span.className = `state-pill${cls ? ` ${cls}` : ""}`
    span.textContent = text
    return span
  }
  function groupKey(tab, by) {
    if (by === "domain") return hostname(tab) || "(no domain)"
    if (by === "window") return String(tab.windowId)
    if (by === "state") return primaryState(tab)
    return ""
  }
  function groupLabel(key, by) {
    if (by === "window") return t("window_group", { id: key })
    if (by === "state") {
      return t("state_group", { state: t(key === "discarded" ? "discarded_state" : key) })
    }
    return key
  }
  function groupedTabs() {
    const by = $("groupBySelect").value
    if (by === "none") return [{ key: "", tabs: state.filteredTabs }]
    const map = new Map()
    state.filteredTabs.forEach((tab) => {
      const key = groupKey(tab, by)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(tab)
    })
    const groups = [...map].map(([key, tabs]) => ({
      key,
      tabs,
      recent: Math.max(...tabs.map((x) => x.lastAccessed || 0)),
      old: Math.min(...tabs.map((x) => x.lastAccessed || 0)),
    }))
    const sort = $("groupSortSelect").value
    groups.sort((a, b) =>
      sort === "count-desc"
        ? b.tabs.length - a.tabs.length || a.key.localeCompare(b.key)
        : sort === "count-asc"
        ? a.tabs.length - b.tabs.length || a.key.localeCompare(b.key)
        : sort === "recent"
        ? b.recent - a.recent
        : sort === "old"
        ? a.old - b.old
        : a.key.localeCompare(b.key)
    )
    return groups
  }

  function createTabRow(tab) {
    const row = document.createElement("div")
    row.className = `tab-row${state.selectedIds.has(tab.id) ? " selected" : ""}`
    row.dataset.tabId = String(tab.id)
    const main = document.createElement("div")
    main.className = "tab-main"
    const checkbox = document.createElement("input")
    checkbox.type = "checkbox"
    checkbox.checked = state.selectedIds.has(tab.id)
    checkbox.className = "row-checkbox"
    checkbox.dataset.tabId = String(tab.id)
    main.appendChild(checkbox)
    const text = document.createElement("div")
    text.className = "tab-text"
    const title = document.createElement("div")
    title.className = "tab-title"
    title.textContent = tab.title || t("untitled")
    title.title = tab.title || ""
    const url = document.createElement("div")
    url.className = "tab-url"
    url.textContent = tab.url || ""
    url.title = tab.url || ""
    text.append(title, url)
    main.appendChild(text)
    row.appendChild(main)
    const flags = document.createElement("div")
    flags.className = "tab-state"
    if (tab.active) flags.appendChild(statePill(t("active"), "active"))
    if (tab.pinned) flags.appendChild(statePill(t("pinned"), "pinned"))
    if (tab.audible) flags.appendChild(statePill(t("audio"), "audio"))
    if (tab.mutedInfo?.muted) flags.appendChild(statePill(t("muted"), ""))
    if (tab.discarded) flags.appendChild(statePill(t("discarded_state"), "discarded"))
    else if (tab.status === "loading") flags.appendChild(statePill(t("loading"), ""))
    row.appendChild(flags)
    const accessed = document.createElement("div")
    accessed.className = "last-access"
    accessed.textContent = relativeTime(tab.lastAccessed)
    accessed.title = tab.lastAccessed ? new Date(tab.lastAccessed).toLocaleString() : ""
    row.appendChild(accessed)
    const actions = document.createElement("div")
    actions.className = "row-actions"
    const activateBtn = document.createElement("button")
    activateBtn.className = "row-icon-btn"
    activateBtn.textContent = "↗"
    activateBtn.title = t("activate_tab")
    activateBtn.dataset.rowAction = "activate"
    activateBtn.dataset.tabId = String(tab.id)
    const closeBtn = document.createElement("button")
    closeBtn.className = "row-icon-btn close"
    closeBtn.textContent = "×"
    closeBtn.title = t("close_tab")
    closeBtn.dataset.rowAction = "close"
    closeBtn.dataset.tabId = String(tab.id)
    actions.append(activateBtn, closeBtn)
    row.appendChild(actions)
    row.addEventListener("dblclick", (ev) => {
      if (["INPUT", "BUTTON"].includes(ev.target.tagName)) return
      activateTab(tab).catch((err) => appendEntry("error", err))
    })
    return row
  }

  function renderTabs() {
    state.rendering = true
    const list = $("tabList")
    list.textContent = ""
    ;[...state.selectedIds].forEach((id) => {
      if (!state.allTabs.some((x) => x.id === id)) state.selectedIds.delete(id)
    })
    if (!state.filteredTabs.length) {
      const empty = document.createElement("div")
      empty.className = "empty-state"
      empty.textContent = t("no_match")
      list.appendChild(empty)
    } else {
      const by = $("groupBySelect").value
      groupedTabs().forEach((group) => {
        if (by === "none") group.tabs.forEach((tab) => list.appendChild(createTabRow(tab)))
        else {
          const block = document.createElement("section")
          block.className = "group-block"
          const head = document.createElement("div")
          head.className = "group-header"
          const name = document.createElement("span")
          name.textContent = groupLabel(group.key, by)
          const meta = document.createElement("span")
          meta.className = "group-meta"
          meta.textContent = t("group_count", { count: group.tabs.length })
          head.append(name, meta)
          block.appendChild(head)
          group.tabs.forEach((tab) => block.appendChild(createTabRow(tab)))
          list.appendChild(block)
        }
      })
    }
    const selectedVisible = state.filteredTabs.filter((x) => state.selectedIds.has(x.id)).length
    $("selectionLabel").textContent = t("selected_shown", {
      selected: state.selectedIds.size,
      shown: state.filteredTabs.length,
    })
    $("selectAllCheckbox").checked = state.filteredTabs.length > 0 &&
      selectedVisible === state.filteredTabs.length
    $("selectAllCheckbox").indeterminate = selectedVisible > 0 &&
      selectedVisible < state.filteredTabs.length
    $("tabTotalBadge").textContent = t("tabs_count", { count: state.allTabs.length })
    document.querySelectorAll(".bulk-actions button").forEach((button) => {
      button.disabled = button.dataset.action === "close-shown"
        ? state.filteredTabs.length === 0
        : state.selectedIds.size === 0
    })
    state.rendering = false
    setStatus(t("shown_total", { shown: state.filteredTabs.length, total: state.allTabs.length }))
  }

  function getSelectedTabs() {
    return state.allTabs.filter((tab) => state.selectedIds.has(tab.id))
  }
  async function refreshTabs() {
    try {
      const win = await browser.windows.getCurrent()
      state.currentWindowId = win.id
      state.allTabs = await browser.tabs.query({})
      applyFilters()
      return state.allTabs.slice()
    } catch (err) {
      appendEntry("error", err)
      setStatus(t("refresh_failed"))
      throw err
    }
  }
  function scheduleRefresh(delay) {
    if (!state.settings.autoRefresh && delay !== 30 && delay !== 80) return
    clearTimeout(state.refreshTimer)
    state.refreshTimer = setTimeout(() => refreshTabs().catch(() => {}), delay || 180)
  }
  function scheduleSearch() {
    clearTimeout(state.searchTimer)
    state.searchTimer = setTimeout(() => applyFilters(), 180)
  }

  async function performBulkAction(action) {
    if (action === "close-shown") {
      const shown = state.filteredTabs.slice()
      if (!shown.length) return
      if (
        state.settings.confirmClose && !confirm(t("close_shown_confirm", { count: shown.length }))
      ) return
      try {
        await closeTabs(shown)
        state.selectedIds.clear()
        await refreshTabs()
      } catch (err) {
        appendEntry("error", err)
      }
      return
    }
    const selected = getSelectedTabs()
    if (!selected.length) return
    if (
      action === "close" && state.settings.confirmClose &&
      !confirm(t("close_selected_confirm", { count: selected.length }))
    ) return
    try {
      if (action === "close") await closeTabs(selected)
      if (action === "discard") await discardTabs(selected)
      if (action === "reload") await reloadTabs(selected)
      if (action === "pin") await pinTabs(selected)
      if (action === "unpin") await unpinTabs(selected)
      if (action === "mute") await muteTabs(selected)
      if (action === "unmute") await unmuteTabs(selected)
      if (action === "close") state.selectedIds.clear()
      await refreshTabs()
    } catch (err) {
      appendEntry("error", err)
    }
  }
  async function performRowAction(action, id) {
    const tab = state.allTabs.find((x) => x.id === id)
    if (!tab) return
    if (action === "activate") return activateTab(tab)
    if (action === "close") {
      if (
        state.settings.confirmClose &&
        !confirm(t("close_one_confirm", { title: tab.title || t("untitled") }))
      ) return
      await closeTabs(tab)
      state.selectedIds.delete(id)
      await refreshTabs()
    }
  }

  function applySettingsToUi() {
    $("confirmCloseSetting").checked = state.settings.confirmClose
    $("hideSelfSetting").checked = state.settings.hideSelf
    $("autoRefreshSetting").checked = state.settings.autoRefresh
    $("themeSelect").value = state.settings.theme
  }
  function saveSettingsFromUi() {
    state.settings.confirmClose = $("confirmCloseSetting").checked
    state.settings.hideSelf = $("hideSelfSetting").checked
    state.settings.autoRefresh = $("autoRefreshSetting").checked
    state.settings.theme = $("themeSelect").value
    saveLocal(STORAGE_KEYS.settings, state.settings)
    applyTheme()
    applyFilters()
  }
  function applyConsoleLayout() {
    $("app").style.setProperty("--console-width", state.consoleWidth)
    $("app").classList.toggle("console-hidden", state.consoleHidden)
    $("showConsoleBtn").classList.toggle("hidden", !state.consoleHidden)
    saveUiFilterState()
  }
  function setConsoleHidden(hidden) {
    state.consoleHidden = !!hidden
    applyConsoleLayout()
    setTimeout(() => editor.refresh(), 0)
  }
  function initSplitter() {
    const splitter = $("splitter")
    let dragging = false
    splitter.addEventListener("mousedown", (ev) => {
      dragging = true
      splitter.classList.add("dragging")
      ev.preventDefault()
    })
    window.addEventListener("mousemove", (ev) => {
      if (!dragging) return
      const min = 320,
        max = Math.max(min, window.innerWidth - 430),
        width = Math.max(min, Math.min(max, ev.clientX))
      state.consoleWidth = `${width}px`
      $("app").style.setProperty("--console-width", state.consoleWidth)
      editor.refresh()
    })
    window.addEventListener("mouseup", () => {
      if (!dragging) return
      dragging = false
      splitter.classList.remove("dragging")
      saveUiFilterState()
    })
  }

  function bindEvents() {
    $("runBtn").onclick = runEditor
    $("clearConsoleBtn").onclick = clearConsole
    $("helpBtn").onclick = () => $("helpDialog").showModal()
    $("settingsBtn").onclick = () => {
      applySettingsToUi()
      $("settingsDialog").showModal()
    }
    $("refreshBtn").onclick = () => refreshTabs().catch(() => {})
    $("hideConsoleBtn").onclick = () => setConsoleHidden(true)
    $("showConsoleBtn").onclick = () => setConsoleHidden(false)
    $("savePresetBtn").onclick = savePreset
    $("syncQueryBtn").onclick = () => syncEditorFromUi(true)
    document.querySelectorAll("[data-dialog-close]").forEach((button) =>
      button.addEventListener("click", () => button.closest("dialog")?.close())
    )
    $("searchInput").addEventListener("input", scheduleSearch)
    ;[
      "fieldSelect",
      "scopeSelect",
      "stateFilter",
      "accessedFilter",
      "sortSelect",
      "groupBySelect",
      "groupSortSelect",
      "regexToggle",
      "ignorePinnedToggle",
    ].forEach((id) => $(id).addEventListener("change", () => applyFilters()))
    $("presetBar").onclick = (ev) => {
      const button = ev.target.closest("[data-preset]")
      if (!button) return
      setPreset(button.dataset.preset)
      applyFilters()
    }
    $("selectAllCheckbox").onchange = function () {
      if (this.checked) state.filteredTabs.forEach((x) => state.selectedIds.add(x.id))
      else state.filteredTabs.forEach((x) => state.selectedIds.delete(x.id))
      renderTabs()
    }
    $("tabList").addEventListener("change", (ev) => {
      if (!ev.target.classList.contains("row-checkbox")) return
      const id = Number(ev.target.dataset.tabId)
      ev.target.checked ? state.selectedIds.add(id) : state.selectedIds.delete(id)
      renderTabs()
    })
    $("tabList").addEventListener("click", (ev) => {
      const button = ev.target.closest("[data-row-action]")
      if (button) {
        performRowAction(button.dataset.rowAction, Number(button.dataset.tabId)).catch((err) =>
          appendEntry("error", err)
        )
      }
    })
    document.querySelector(".bulk-actions").onclick = (ev) => {
      if (ev.target.dataset.action) performBulkAction(ev.target.dataset.action)
    }
    ;["confirmCloseSetting", "hideSelfSetting", "autoRefreshSetting", "themeSelect"].forEach((id) =>
      $(id).addEventListener("change", saveSettingsFromUi)
    )
    $("themeBtn").onclick = () => {
      state.settings.theme = state.settings.theme === "dark" ? "light" : "dark"
      saveLocal(STORAGE_KEYS.settings, state.settings)
      applyTheme()
      applySettingsToUi()
    }
    $("languageSelect").onchange = () => {
      state.settings.language = $("languageSelect").value
      saveLocal(STORAGE_KEYS.settings, state.settings)
      applyI18n()
      renderCustomPresets()
    }
    $("resetSettingsBtn").onclick = () => {
      if (!confirm(t("reset_confirm"))) return
      Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key))
      location.reload()
    }
    browser.tabs.onCreated.addListener(() => scheduleRefresh(180))
    browser.tabs.onRemoved.addListener(() => scheduleRefresh(180))
    browser.tabs.onMoved.addListener(() => scheduleRefresh(180))
    browser.tabs.onAttached.addListener(() => scheduleRefresh(180))
    browser.tabs.onDetached.addListener(() => scheduleRefresh(180))
    browser.tabs.onActivated.addListener(() => scheduleRefresh(180))
    browser.tabs.onUpdated.addListener(() => scheduleRefresh(260))
    window.addEventListener("error", (event) => {
      if (event.error) appendEntry("error", event.error)
    })
    window.addEventListener(
      "unhandledrejection",
      (event) =>
        appendEntry(
          "error",
          event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        ),
    )
  }

  restoreUiFilterState()
  setPreset(state.activePreset)
  renderCustomPresets()
  applySettingsToUi()
  applyTheme()
  applyConsoleLayout()
  initSplitter()
  bindEvents()
  updateProblemCount()
  applyI18n()
  refreshTabs().then(() => {
    syncEditorFromUi(true)
    appendEntry("info", [t("ready_console", { count: state.allTabs.length })])
  }).catch(() => {})
})()
