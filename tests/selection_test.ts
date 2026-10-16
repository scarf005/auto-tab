// Range selection decides which tabs bulk actions (close, unload, ...) touch.
import { assertEquals } from "@std/assert"
import { extendRange, moveFocus, selectRange } from "../src/tabs/selection.ts"

const ORDER = [10, 20, 30, 40, 50]
const run = (initial: number[], anchor: number | null, target: number, select: boolean) => {
  const selected = new Set(initial)
  selectRange(selected, ORDER, anchor, target, select)
  return [...selected].sort((a, b) => a - b)
}

Deno.test("selectRange selects inclusively in display order, either direction", () => {
  assertEquals(run([], 20, 40, true), [20, 30, 40])
  assertEquals(run([], 40, 20, true), [20, 30, 40])
})

Deno.test("selectRange keeps selections outside the range", () => {
  assertEquals(run([10, 50], 20, 30, true), [10, 20, 30, 50])
})

Deno.test("selectRange can unselect a range", () => {
  assertEquals(run([10, 20, 30, 40], 20, 30, false), [10, 40])
})

Deno.test("selectRange without a visible anchor changes only the target", () => {
  assertEquals(run([], null, 30, true), [30])
  assertEquals(run([], 999, 30, true), [30])
})

Deno.test("selectRange ignores a target that is not shown", () => {
  assertEquals(run([10], 10, 999, true), [10])
})

Deno.test("moveFocus steps and clamps", () => {
  assertEquals(moveFocus(ORDER, null, 1), 10)
  assertEquals(moveFocus(ORDER, null, -1), 50)
  assertEquals(moveFocus(ORDER, 20, 1), 30)
  assertEquals(moveFocus(ORDER, 50, 1), 50)
  assertEquals(moveFocus(ORDER, 20, -Infinity), 10)
  assertEquals(moveFocus(ORDER, 20, Infinity), 50)
  assertEquals(moveFocus([], 20, 1), null)
})

Deno.test("moveFocus to the ends works without a focused row", () => {
  assertEquals(moveFocus(ORDER, null, -Infinity), 10)
  assertEquals(moveFocus(ORDER, null, Infinity), 50)
  assertEquals(moveFocus(ORDER, 999, Infinity), 50)
})

Deno.test("extendRange grows and shrinks around the anchor, keeping the earlier selection", () => {
  const base = new Set([50])
  const sorted = (s: Set<number>) => [...s].sort((a, b) => a - b)
  assertEquals(sorted(extendRange(base, ORDER, 10, 30)), [10, 20, 30, 50])
  assertEquals(sorted(extendRange(base, ORDER, 10, 20)), [10, 20, 50])
  assertEquals(sorted(extendRange(base, ORDER, 30, 10)), [10, 20, 30, 50])
  assertEquals(sorted(base), [50], "base is not modified")
})
