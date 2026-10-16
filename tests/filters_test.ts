// "Close shown" closes exactly what filterTabs returns, so these cases guard which tabs get closed.
import { assertEquals, assertThrows } from "@std/assert"
import {
  DEFAULT_FILTERS,
  type FilterOptions,
  filterTabs,
  groupTabs,
  nonDefaultFilters,
  normalizeUrl,
  pruneSelection,
  type Tab,
} from "../src/tabs/filters.ts"

const NOW = 1_800_000_000_000
const HOUR = 3_600_000
const DAY = 24 * HOUR
const OWN_URL = "moz-extension://abc/console.html"

function tab(id: number, props: Partial<Tab> = {}): Tab {
  return {
    id,
    index: id,
    windowId: 1,
    highlighted: false,
    active: false,
    pinned: false,
    incognito: false,
    status: "complete",
    title: `Tab ${id}`,
    url: `https://example.com/${id}`,
    lastAccessed: NOW - id * HOUR,
    ...props,
  }
}

const run = (tabs: Tab[], options: Partial<FilterOptions> = {}, currentWindowId = 1) =>
  filterTabs(tabs, { ...DEFAULT_FILTERS, ...options }, {
    currentWindowId,
    hiddenUrl: OWN_URL,
    now: NOW,
  }).map((x) => x.id)

Deno.test("ignorePinned removes pinned tabs from the result", () => {
  const tabs = [tab(1, { pinned: true }), tab(2)]
  assertEquals(run(tabs), [1, 2])
  assertEquals(run(tabs, { ignorePinned: true }), [2])
})

Deno.test("the console page itself is hidden", () => {
  assertEquals(run([tab(1, { url: OWN_URL }), tab(2)]), [2])
})

Deno.test("search matches the chosen field case-insensitively", () => {
  const tabs = [
    tab(1, { title: "Linear issue", url: "https://linear.app/x" }),
    tab(2, { title: "hada news", url: "https://news.hada.io/" }),
  ]
  assertEquals(run(tabs, { search: "HADA", field: "url" }), [2])
  assertEquals(run(tabs, { search: "linear", field: "title" }), [1])
  assertEquals(run(tabs, { search: "linear.app", field: "host" }), [1])
  assertEquals(run(tabs, { search: "news.hada", field: "title" }), [])
  assertEquals(run(tabs, { search: "news.hada" }), [2], "field all matches URL too")
  assertEquals(run(tabs, { search: "issue" }), [1], "field all matches title too")
})

Deno.test("regex search, and invalid regex throws instead of matching everything", () => {
  const tabs = [tab(1, { title: "abc" }), tab(2, { title: "xyz" })]
  assertEquals(run(tabs, { search: "^a", regex: true, field: "title" }), [1])
  assertEquals(run(tabs, { search: "^X", regex: true, field: "title" }), [2], "case-insensitive")
  assertThrows(() => run(tabs, { search: "(", regex: true }), SyntaxError)
})

Deno.test("scope current keeps only the current window", () => {
  const tabs = [tab(1, { windowId: 1 }), tab(2, { windowId: 2 })]
  assertEquals(run(tabs, { scope: "current" }, 2), [2])
})

Deno.test("accessed filters use lastAccessed age, boundaries inclusive for 'within'", () => {
  const tabs = [
    tab(1, { lastAccessed: NOW - 5 * 60_000 }),
    tab(2, { lastAccessed: NOW - HOUR }),
    tab(3, { lastAccessed: NOW - DAY }),
    tab(4, { lastAccessed: NOW - DAY - 1 }),
    tab(5, { lastAccessed: NOW - 8 * DAY }),
    tab(6, { lastAccessed: NOW - 31 * DAY }),
    tab(7, { lastAccessed: undefined }),
  ]
  const cases: [FilterOptions["accessed"], number[]][] = [
    ["all", [1, 2, 3, 4, 5, 6, 7]],
    ["lt5m", [1]],
    ["lt1h", [1, 2]],
    ["lt24h", [1, 2, 3]],
    ["gt24h", [4, 5, 6]],
    ["gt7d", [5, 6]],
    ["gt30d", [6]],
    ["never", [7]],
  ]
  for (const [accessed, expected] of cases) {
    assertEquals(run(tabs, { accessed, sort: "old" }).sort((a, b) => a! - b!), expected, accessed)
  }
})

Deno.test("each state filter keeps only its tabs", () => {
  const tabs = [
    tab(1, { active: true }),
    tab(2, { pinned: true }),
    tab(3, { audible: true }),
    tab(4, { mutedInfo: { muted: true } }),
    tab(5, { discarded: true }),
    tab(6, { status: "loading" }),
  ]
  const cases: [FilterOptions["state"], number[]][] = [
    ["all", [1, 2, 3, 4, 5, 6]],
    ["active", [1]],
    ["inactive", [2, 3, 4, 5, 6]],
    ["pinned", [2]],
    ["unpinned", [1, 3, 4, 5, 6]],
    ["audible", [3]],
    ["muted", [4]],
    ["discarded", [5]],
    ["loading", [6]],
    ["complete", [1, 2, 3, 4]],
  ]
  for (const [state, expected] of cases) assertEquals(run(tabs, { state }), expected, state)
})

Deno.test("duplicates preset ignores hash and trailing slash", () => {
  const tabs = [
    tab(1, { url: "https://a.com/x/" }),
    tab(2, { url: "https://a.com/x#top" }),
    tab(3, { url: "https://a.com/y" }),
  ]
  assertEquals(run(tabs, { preset: "duplicates", sort: "window" }), [1, 2])
  assertEquals(normalizeUrl("https://a.com/x/#h"), "https://a.com/x")
})

Deno.test("duplicates preset only counts tabs left after the other filters", () => {
  const tabs = [
    tab(1, { url: "https://a.com/", pinned: true }),
    tab(2, { url: "https://a.com/" }),
  ]
  assertEquals(run(tabs, { preset: "duplicates", ignorePinned: true }), [])
})

Deno.test("host presets match the domain and its subdomains only", () => {
  const tabs = [
    tab(1, { url: "https://linear.app/team" }),
    tab(2, { url: "https://x.linear.app/" }),
    tab(3, { url: "https://notlinear.app/" }),
    tab(4, { url: "https://gist.github.com/" }),
  ]
  assertEquals(run(tabs, { preset: "linear", sort: "window" }), [1, 2])
  assertEquals(run(tabs, { preset: "github" }), [4])
})

Deno.test("audible and discarded presets", () => {
  const tabs = [tab(1, { audible: true }), tab(2, { discarded: true }), tab(3)]
  assertEquals(run(tabs, { preset: "audible" }), [1])
  assertEquals(run(tabs, { preset: "discarded" }), [2])
  assertEquals(run(tabs, { preset: "unknown" }), [1, 2, 3])
})

Deno.test("stale24 preset keeps tabs not accessed for a day", () => {
  const tabs = [
    tab(1, { lastAccessed: NOW - HOUR }),
    tab(2, { lastAccessed: NOW - 2 * DAY }),
    tab(3, { lastAccessed: NOW - DAY }),
  ]
  assertEquals(run(tabs, { preset: "stale24" }), [2], "exactly 24 h is not stale yet")
})

Deno.test("sort orders", () => {
  const tabs = [
    tab(1, { windowId: 2, index: 0, title: "b", url: "https://z.com/", active: true }),
    tab(2, { windowId: 1, index: 1, title: "a", url: "https://y.com/", discarded: true }),
    tab(3, { windowId: 1, index: 0, title: "c", url: "https://x.com/", pinned: true }),
  ]
  assertEquals(run(tabs, { sort: "recent" }), [1, 2, 3])
  assertEquals(run(tabs, { sort: "old" }), [3, 2, 1])
  assertEquals(run(tabs, { sort: "title" }), [2, 1, 3])
  assertEquals(run(tabs, { sort: "domain" }), [3, 2, 1])
  assertEquals(run(tabs, { sort: "window" }), [3, 2, 1])
  assertEquals(run(tabs, { sort: "state" }), [1, 3, 2])
})

Deno.test("groupTabs groups and orders groups", () => {
  const tabs = [
    tab(1, { url: "https://b.com/1" }),
    tab(2, { url: "https://a.com/1" }),
    tab(3, { url: "https://b.com/2" }),
  ]
  const keys = (sort: Parameters<typeof groupTabs>[2]) =>
    groupTabs(tabs, "domain", sort).map((g) => `${g.key}:${g.tabs.map((x) => x.id).join(",")}`)
  assertEquals(keys("name"), ["a.com:2", "b.com:1,3"])
  assertEquals(keys("count-desc"), ["b.com:1,3", "a.com:2"])
  assertEquals(keys("count-asc"), ["a.com:2", "b.com:1,3"])
  assertEquals(keys("recent"), ["b.com:1,3", "a.com:2"])
  assertEquals(keys("old"), ["b.com:1,3", "a.com:2"])
  // b.com holds both the newest and the oldest tab; a.com sits in between.
  const mixed = [
    tab(1, { url: "https://b.com/", lastAccessed: NOW }),
    tab(2, { url: "https://a.com/", lastAccessed: NOW - HOUR }),
    tab(3, { url: "https://c.com/", lastAccessed: NOW - 2 * HOUR }),
    tab(4, { url: "https://b.com/x", lastAccessed: NOW - 3 * HOUR }),
  ]
  const order = (sort: Parameters<typeof groupTabs>[2]) =>
    groupTabs(mixed, "domain", sort).map((g) => g.key)
  assertEquals(order("recent"), ["b.com", "a.com", "c.com"])
  assertEquals(order("old"), ["b.com", "c.com", "a.com"])
  assertEquals(
    groupTabs([tab(1, { url: "about:blank" }), tab(2, { windowId: 3 })], "window", "name")
      .map((g) => g.key),
    ["1", "3"],
  )
  assertEquals(
    groupTabs([tab(1, { url: "about:blank" })], "domain", "name").map((g) => g.key),
    ["(no domain)"],
  )
  assertEquals(
    groupTabs([tab(1, { pinned: true }), tab(2, { audible: true })], "state", "name")
      .map((g) => g.key),
    ["audible", "pinned"],
  )
  assertEquals(groupTabs(tabs, "none", "name"), [{ key: "", tabs }])
})

Deno.test("nonDefaultFilters keeps only changed options for the generated query", () => {
  assertEquals(nonDefaultFilters({ ...DEFAULT_FILTERS }), {})
  assertEquals(nonDefaultFilters({ ...DEFAULT_FILTERS, search: "hada", field: "url" }), {
    search: "hada",
    field: "url",
  })
})

Deno.test("unknown state filter from the REPL keeps every tab", () => {
  const tabs = [tab(1, { active: true }), tab(2)]
  assertEquals(run(tabs, { state: "bogus" as FilterOptions["state"] }), [1, 2])
})

Deno.test("pruneSelection keeps only visible selected tabs", () => {
  const selected = new Set([1, 2, 3])
  pruneSelection(selected, [tab(2), tab(3), tab(4)])
  assertEquals([...selected], [2, 3])
})

Deno.test("the console page stays in the list when hideSelf is off", () => {
  const tabs = [tab(1, { url: OWN_URL }), tab(2)]
  const ids = filterTabs(tabs, { ...DEFAULT_FILTERS }, {
    currentWindowId: 1,
    hiddenUrl: null,
    now: NOW,
  })
    .map((x) => x.id)
  assertEquals(ids, [1, 2])
})
