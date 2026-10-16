// The console output pane on the left.
import { $, t } from "../state.ts"
import { formatArgs, formatValue, tableData } from "./format.ts"

export type EntryKind = "source" | "result" | "log" | "info" | "warn" | "error"

let errorCount = 0

const nowTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })

function div(className: string, text?: string) {
  const el = document.createElement("div")
  el.className = className
  if (text !== undefined) el.textContent = text
  return el
}

function append(entry: HTMLElement) {
  const output = $("consoleOutput")
  output.appendChild(entry)
  output.scrollTop = output.scrollHeight
}

export function updateProblemCount() {
  const el = $("problemCount")
  el.textContent = t("errors", { count: errorCount })
  el.classList.toggle("has-errors", errorCount > 0)
}

export function printSource(source: string) {
  const entry = div("console-entry source")
  entry.append(div("source-line", source), div("console-meta", nowTime()))
  append(entry)
}

/** `result` and `error` print one value; log kinds print console.log style argument lists. */
export function print(kind: Exclude<EntryKind, "source">, value: unknown) {
  const entry = div(`console-entry ${kind}`)
  const text = Array.isArray(value) && kind !== "result" ? formatArgs(value) : formatValue(value)
  entry.append(div("console-value", text), div("console-meta", nowTime()))
  append(entry)
  if (kind === "error") {
    errorCount++
    updateProblemCount()
  }
}

export const printError = (err: unknown) => print("error", err)

export function printTable(value: unknown) {
  const data = tableData(value)
  if (!data) return print("log", [value])
  const table = document.createElement("table")
  table.className = "console-table"
  const head = table.createTHead().insertRow()
  for (const column of data.columns) {
    head.appendChild(document.createElement("th")).textContent = column
  }
  const body = table.createTBody()
  for (const row of data.rows) {
    const tr = body.insertRow()
    for (const cell of row) tr.insertCell().textContent = cell
  }
  const meta = [t("rows", { count: data.total })]
  if (data.total > data.rows.length) meta.push(t("first100"))
  meta.push(nowTime())
  const entry = div("console-entry log")
  entry.append(table, div("console-meta", meta.join(" · ")))
  append(entry)
}

export function clearConsole() {
  $("consoleOutput").textContent = ""
  errorCount = 0
  updateProblemCount()
}

/** The `console` object user code sees. */
export const replConsole = {
  log: (...args: unknown[]) => print("log", args),
  info: (...args: unknown[]) => print("info", args),
  warn: (...args: unknown[]) => print("warn", args),
  error: (...args: unknown[]) => print("error", args),
  table: printTable,
  clear: clearConsole,
}
