// The REPL editor: CodeMirror, run, history, and the generated `ui.query(...)` link.
// @ts-types="@types/codemirror"
import CodeMirror from "codemirror"
import "codemirror/mode/javascript/javascript.js"
import "codemirror/addon/edit/closebrackets.js"
import "codemirror/addon/edit/matchbrackets.js"
import { storage } from "../storage.ts"
import { $, setStatus, t } from "../state.ts"
import { installCompletion } from "./completion.ts"
import { evaluate } from "./evaluate.ts"
import { clearConsole, print, printSource } from "./output.ts"

const HISTORY_LIMIT = 100

export interface ReplOptions {
  /** Names offered first by completion. */
  globals: string[]
  /** Source that reproduces the current explorer filters. */
  uiQuerySource: () => string
}

export function createRepl({ globals, uiQuerySource }: ReplOptions) {
  const history = storage.history()
  let historyIndex = history.length
  let lastResult: unknown
  // The editor follows explorer filters until the user edits it.
  let dirty = false
  let syncing = false
  let lastGenerated = ""

  async function run() {
    const source = editor.getValue().trim()
    if (!source) return
    if (history.at(-1) !== source) {
      history.push(source)
      if (history.length > HISTORY_LIMIT) history.shift()
      storage.saveHistory(history)
    }
    historyIndex = history.length
    printSource(source)
    setStatus(t("running"))
    try {
      lastResult = await evaluate(source)
      print("result", lastResult)
      setStatus(t("completed"))
    } catch (err) {
      print("error", err)
      setStatus(t("error"))
    }
  }

  function moveHistory(delta: number) {
    if (!history.length) return
    historyIndex = Math.max(0, Math.min(history.length, historyIndex + delta))
    editor.setValue(historyIndex === history.length ? "" : history[historyIndex])
    editor.setCursor(editor.lineCount(), 0)
  }

  const editor = CodeMirror.fromTextArea($<HTMLTextAreaElement>("codeEditor"), {
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
      "Ctrl-Enter": run,
      "Cmd-Enter": run,
      "Ctrl-Space": (cm) => showCompletion(cm),
      "Alt-Up": () => moveHistory(-1),
      "Alt-Down": () => moveHistory(1),
      "Ctrl-L": clearConsole,
    },
  } as CodeMirror.EditorConfiguration)
  const showCompletion = installCompletion(editor, globals)

  function updateLinkState() {
    $("queryLinkState").textContent = dirty ? t("edited") : t("linked")
  }

  /** Rewrites the editor from the explorer filters unless the user edited it (or `force`). */
  function syncFromUi(force = false) {
    if (!force && dirty) return
    const source = uiQuerySource()
    lastGenerated = source
    syncing = true
    if (editor.getValue() !== source) editor.setValue(source)
    syncing = false
    dirty = false
    updateLinkState()
  }

  editor.on("change", () => {
    if (syncing) return
    dirty = editor.getValue().trim() !== lastGenerated.trim()
    updateLinkState()
  })

  return {
    run,
    syncFromUi,
    updateLinkState,
    refresh: () => editor.refresh(),
    focus() {
      editor.focus()
      editor.setCursor(editor.lineCount(), 0)
    },
    value: () => editor.getValue(),
    lastResult: () => lastResult,
  }
}

export type Repl = ReturnType<typeof createRepl>
