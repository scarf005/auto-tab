// Console value formatting, roughly like the devtools console.

const MAX_ITEMS = 80
const MAX_DEPTH = 4

const indent = (items: string[]) => items.join(",\n  ").replaceAll("\n", "\n  ")

export function formatValue(value: unknown, depth = 0, seen = new WeakSet<object>()): string {
  if (value === undefined) return "undefined"
  if (value === null) return "null"
  if (typeof value === "string") return JSON.stringify(value)
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value)
  }
  if (typeof value === "function") return `ƒ ${value.name || "anonymous"}()`
  if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`
  if (value instanceof RegExp) return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (typeof value !== "object") return String(value)

  if (seen.has(value)) return "[Circular]"
  seen.add(value)
  if (depth > MAX_DEPTH) return Array.isArray(value) ? "[…]" : "{…}"
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ITEMS).map((x) => formatValue(x, depth + 1, seen))
    if (value.length > MAX_ITEMS) items.push(`… ${value.length - MAX_ITEMS} more`)
    return `[\n  ${indent(items)}\n]`
  }
  let keys: string[]
  try {
    keys = Object.keys(value)
  } catch {
    return String(value)
  }
  const items = keys.slice(0, MAX_ITEMS).map((key) => {
    let result
    try {
      result = formatValue((value as Record<string, unknown>)[key], depth + 1, seen)
    } catch (err) {
      result = `[Thrown: ${(err as Error).message}]`
    }
    return `${key}: ${result}`
  })
  if (keys.length > MAX_ITEMS) items.push(`… ${keys.length - MAX_ITEMS} more`)
  return `{\n  ${indent(items)}\n}`
}

/** Arguments of console.log and friends: strings print raw, everything else formatted. */
export function formatArgs(args: unknown[]): string {
  return args.map((v) => typeof v === "string" ? v : formatValue(v)).join(" ")
}

const MAX_TABLE_ROWS = 100
const MAX_TABLE_COLUMNS = 12

export interface TableData {
  columns: string[]
  rows: string[][]
  total: number
}

/** console.table layout, or null when the value is not tabular. */
export function tableData(value: unknown): TableData | null {
  let rows: unknown[]
  if (Array.isArray(value)) rows = value
  else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    rows = Object.keys(record).map((key) =>
      record[key] && typeof record[key] === "object"
        ? { "(index)": key, ...(record[key] as object) }
        : { "(index)": key, value: record[key] }
    )
  } else return null

  const shown = rows.slice(0, MAX_TABLE_ROWS)
  const columns: string[] = []
  for (const row of shown) {
    if (row && typeof row === "object") {
      for (const key of Object.keys(row)) {
        if (!columns.includes(key) && columns.length < MAX_TABLE_COLUMNS) columns.push(key)
      }
    } else if (!columns.includes("value")) columns.push("value")
  }
  const cell = (row: unknown, key: string) => {
    const v = row && typeof row === "object"
      ? (row as Record<string, unknown>)[key]
      : key === "value"
      ? row
      : undefined
    return v && typeof v === "object" ? formatValue(v, 1) : String(v ?? "")
  }
  return {
    columns,
    rows: shown.map((row) => columns.map((key) => cell(row, key))),
    total: rows.length,
  }
}
