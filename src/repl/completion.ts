// Ctrl+Space / "." completion for the REPL editor.
// @ts-types="@types/codemirror"
import CodeMirror from "codemirror"
import "codemirror/addon/hint/show-hint.js"

const KEYWORDS = [
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
const BUILTINS = [
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
]

function ownKeysDeep(obj: unknown): string[] {
  const out = new Set<string>()
  let cur = obj
  for (let depth = 0; cur && depth < 3; depth++) {
    try {
      Object.getOwnPropertyNames(cur).forEach((k) => out.add(k))
      cur = Object.getPrototypeOf(cur)
    } catch {
      break
    }
  }
  out.delete("__proto__")
  return [...out].sort()
}

function resolveChain(chain: string): unknown {
  let value: unknown = globalThis
  for (const part of chain.split(".")) {
    if (!part) continue
    try {
      value = (value as Record<string, unknown>)[part]
    } catch {
      return null
    }
    if (value == null) return null
  }
  return value
}

const startsWith = (prefix: string) => (x: string) =>
  x.toLowerCase().startsWith(prefix.toLowerCase())

/** `globals` are the REPL helper names offered before builtins and keywords. */
export function installCompletion(editor: CodeMirror.Editor, globals: string[]) {
  const words = [...globals, ...BUILTINS, ...KEYWORDS]
  const hint = (cm: CodeMirror.Editor) => {
    const cursor = cm.getCursor()
    const line = cm.getLine(cursor.line).slice(0, cursor.ch)
    const chain = line.match(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.([A-Za-z_$][\w$]*)?$/)
    let list: string[] = []
    let fromCh = cursor.ch
    if (chain) {
      const target = resolveChain(chain[1]), prefix = chain[2] || ""
      fromCh -= prefix.length
      if (target) list = ownKeysDeep(target).filter(startsWith(prefix))
    } else {
      const prefix = line.match(/([A-Za-z_$][\w$]*)$/)?.[1] || ""
      fromCh -= prefix.length
      list = words.filter(startsWith(prefix))
    }
    return {
      list: list.slice(0, 120),
      from: CodeMirror.Pos(cursor.line, fromCh),
      to: CodeMirror.Pos(cursor.line, cursor.ch),
    }
  }
  const show = (cm: CodeMirror.Editor) => cm.showHint({ hint, completeSingle: false })
  editor.on("inputRead", (cm, change) => {
    if (change.text?.length === 1 && change.text[0] === ".") show(cm)
  })
  return show
}
