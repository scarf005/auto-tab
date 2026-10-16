// tabIds decides which tab IDs are passed to browser.tabs.remove and friends.
import { assertEquals } from "@std/assert"
import { tabIds } from "../src/tabs/actions.ts"
import type { Tab } from "../src/tabs/filters.ts"

const tab = (id: number | undefined) => ({ id }) as Tab

Deno.test("tabIds accepts tabs, IDs, arrays and nullish input", () => {
  assertEquals(tabIds(null), [])
  assertEquals(tabIds(undefined), [])
  assertEquals(tabIds(4), [4])
  assertEquals(tabIds(tab(4)), [4])
  assertEquals(tabIds([3, tab(1), 2]), [3, 1, 2])
})

Deno.test("tabIds drops duplicates and non-integer IDs, keeping first-seen order", () => {
  assertEquals(tabIds([3, tab(3), tab(1.5), tab(undefined), 2, 3]), [3, 2])
})
