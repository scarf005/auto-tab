// Runs REPL source. Expressions return their value; statements run as an async function body.
import { replConsole } from "./output.ts"

// Indirect eval runs in global scope, so user code cannot see this module's bindings.
const indirectEval = globalThis.eval

type Compiled = (console: typeof replConsole) => Promise<unknown>

function compile(source: string): Compiled {
  try {
    return indirectEval(`(async (console) => (\n${source}\n))`)
  } catch (err) {
    if (!(err instanceof SyntaxError)) throw err
    return indirectEval(`(async (console) => {\n${source}\n})`)
  }
}

export const evaluate = (source: string) => compile(source)(replConsole)
