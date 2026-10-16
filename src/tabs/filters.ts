// Pure tab filtering, sorting and grouping. No DOM or browser API access, so it is unit-tested.

export type Tab = browser.tabs.Tab

export type SearchField = "all" | "title" | "url" | "host"
export type Scope = "all" | "current"
export type StateFilter =
  | "all"
  | "active"
  | "inactive"
  | "pinned"
  | "unpinned"
  | "audible"
  | "muted"
  | "discarded"
  | "loading"
  | "complete"
export type AccessedFilter =
  | "all"
  | "lt5m"
  | "lt1h"
  | "lt24h"
  | "gt24h"
  | "gt7d"
  | "gt30d"
  | "never"
export type SortOrder = "recent" | "old" | "state" | "domain" | "title" | "window"
export type GroupBy = "none" | "domain" | "window" | "state"
export type GroupSort = "name" | "count-desc" | "count-asc" | "recent" | "old"
export type PrimaryState =
  | "active"
  | "pinned"
  | "audible"
  | "muted"
  | "discarded"
  | "loading"
  | "complete"

export interface FilterOptions {
  search: string
  regex: boolean
  field: SearchField
  scope: Scope
  state: StateFilter
  accessed: AccessedFilter
  sort: SortOrder
  groupBy: GroupBy
  groupSort: GroupSort
  ignorePinned: boolean
  preset: string
}

export const DEFAULT_FILTERS: Readonly<FilterOptions> = Object.freeze({
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
})

/** Options that differ from the defaults, in declaration order. */
export function nonDefaultFilters(options: FilterOptions): Partial<FilterOptions> {
  return Object.fromEntries(
    Object.entries(options).filter(([key, value]) =>
      value !== DEFAULT_FILTERS[key as keyof FilterOptions]
    ),
  )
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

type TabLike = Tab | string | null | undefined

function rawUrl(tabOrUrl: TabLike): string {
  return typeof tabOrUrl === "string" ? tabOrUrl : tabOrUrl?.url || ""
}

export function hostname(tabOrUrl: TabLike): string {
  try {
    return new URL(rawUrl(tabOrUrl)).hostname
  } catch {
    return ""
  }
}

/** URL without hash and trailing slashes, used to detect duplicate tabs. */
export function normalizeUrl(tabOrUrl: TabLike): string {
  const raw = rawUrl(tabOrUrl)
  try {
    const u = new URL(raw)
    u.hash = ""
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "")
    return u.toString()
  } catch {
    return raw.replace(/#.*$/, "").replace(/\/+$/, "")
  }
}

export function primaryState(tab: Tab): PrimaryState {
  if (tab.active) return "active"
  if (tab.pinned) return "pinned"
  if (tab.audible) return "audible"
  if (tab.mutedInfo?.muted) return "muted"
  if (tab.discarded) return "discarded"
  if (tab.status === "loading") return "loading"
  return "complete"
}

const STATE_RANK: Record<PrimaryState, number> = {
  active: 0,
  pinned: 1,
  audible: 2,
  muted: 3,
  loading: 4,
  complete: 5,
  discarded: 6,
}

const STATE_MATCHERS: Record<StateFilter, (tab: Tab) => boolean> = {
  all: () => true,
  active: (tab) => !!tab.active,
  inactive: (tab) => !tab.active,
  pinned: (tab) => !!tab.pinned,
  unpinned: (tab) => !tab.pinned,
  audible: (tab) => !!tab.audible,
  muted: (tab) => !!tab.mutedInfo?.muted,
  discarded: (tab) => !!tab.discarded,
  loading: (tab) => tab.status === "loading",
  complete: (tab) => tab.status === "complete" && !tab.discarded,
}

export function matchesState(tab: Tab, filter: StateFilter): boolean {
  return (STATE_MATCHERS[filter] ?? STATE_MATCHERS.all)(tab)
}

export function matchesAccessed(tab: Tab, filter: AccessedFilter, now = Date.now()): boolean {
  if (filter === "all") return true
  const ts = Number(tab.lastAccessed || 0)
  if (filter === "never") return !ts
  if (!ts) return false
  const age = now - ts
  switch (filter) {
    case "lt5m":
      return age <= 5 * MINUTE
    case "lt1h":
      return age <= HOUR
    case "lt24h":
      return age <= DAY
    case "gt24h":
      return age > DAY
    case "gt7d":
      return age > 7 * DAY
    case "gt30d":
      return age > 30 * DAY
    default:
      return true
  }
}

function hostIs(tab: Tab, domain: string): boolean {
  const h = hostname(tab)
  return h === domain || h.endsWith(`.${domain}`)
}

function duplicateUrls(tabs: Tab[]): Set<string> {
  const counts = new Map<string, number>()
  for (const tab of tabs) {
    const key = normalizeUrl(tab)
    if (key) counts.set(key, (counts.get(key) || 0) + 1)
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key))
}

/** Built-in preset predicates. `tabs` is the pool the preset is applied to. */
export function presetPredicate(
  name: string,
  tabs: Tab[],
  now = Date.now(),
): (tab: Tab) => boolean {
  switch (name) {
    case "duplicates": {
      const duplicates = duplicateUrls(tabs)
      return (tab) => duplicates.has(normalizeUrl(tab))
    }
    case "audible":
      return (tab) => !!tab.audible
    case "pinned":
      return (tab) => !!tab.pinned
    case "discarded":
      return (tab) => !!tab.discarded
    case "stale24":
      return (tab) => !!tab.lastAccessed && tab.lastAccessed < now - DAY
    case "linear":
      return (tab) => hostIs(tab, "linear.app")
    case "github":
      return (tab) => hostIs(tab, "github.com")
    default:
      return () => true
  }
}

function searchText(tab: Tab, field: SearchField): string {
  if (field === "title") return tab.title || ""
  if (field === "url") return tab.url || ""
  if (field === "host") return hostname(tab)
  return `${tab.title || ""}\n${tab.url || ""}`
}

/** Throws SyntaxError when `regex` is on and `search` is not a valid pattern. */
export function searchMatcher(search: string, regex: boolean): ((value: string) => boolean) | null {
  if (!search) return null
  if (regex) {
    const re = new RegExp(search, "i")
    return (value) => re.test(value)
  }
  const needle = search.toLowerCase()
  return (value) => value.toLowerCase().includes(needle)
}

const byAccessDesc = (a: Tab, b: Tab) => (b.lastAccessed || 0) - (a.lastAccessed || 0)
const byTitle = (a: Tab, b: Tab) => (a.title || "").localeCompare(b.title || "")

const TAB_COMPARATORS: Record<SortOrder, (a: Tab, b: Tab) => number> = {
  recent: byAccessDesc,
  old: (a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0),
  state: (a, b) => STATE_RANK[primaryState(a)] - STATE_RANK[primaryState(b)] || byAccessDesc(a, b),
  domain: (a, b) => hostname(a).localeCompare(hostname(b)) || byTitle(a, b),
  title: byTitle,
  window: (a, b) => a.windowId! - b.windowId! || a.index - b.index,
}

export function sortTabs(tabs: Tab[], sort: SortOrder): Tab[] {
  return tabs.sort(TAB_COMPARATORS[sort] ?? TAB_COMPARATORS.recent)
}

export interface FilterContext {
  currentWindowId: number | null
  /** Tab URL to drop from results (the console page itself), or null to keep it. */
  hiddenUrl: string | null
  now?: number
}

/** Applies every filter, the preset, and the sort. Throws SyntaxError for an invalid regex. */
export function filterTabs(all: Tab[], options: FilterOptions, context: FilterContext): Tab[] {
  const now = context.now ?? Date.now()
  const matcher = searchMatcher(options.search, options.regex)
  const base = all.filter((tab) => {
    if (context.hiddenUrl && tab.url === context.hiddenUrl) return false
    if (options.ignorePinned && tab.pinned) return false
    if (options.scope === "current" && tab.windowId !== context.currentWindowId) return false
    if (!matchesState(tab, options.state) || !matchesAccessed(tab, options.accessed, now)) {
      return false
    }
    return !matcher || matcher(searchText(tab, options.field))
  })
  return sortTabs(base.filter(presetPredicate(options.preset, base, now)), options.sort)
}

/** Drops selected IDs the filter hid, so bulk actions only touch visible tabs. */
export function pruneSelection(selected: Set<number>, visible: Tab[]): void {
  const ids = new Set(visible.map((tab) => tab.id))
  for (const id of selected) if (!ids.has(id)) selected.delete(id)
}

export interface TabGroup {
  key: string
  tabs: Tab[]
}

export const NO_DOMAIN = "(no domain)"

function groupKey(tab: Tab, by: GroupBy): string {
  if (by === "domain") return hostname(tab) || NO_DOMAIN
  if (by === "window") return String(tab.windowId)
  if (by === "state") return primaryState(tab)
  return ""
}

export function groupTabs(tabs: Tab[], by: GroupBy, sort: GroupSort): TabGroup[] {
  if (by === "none") return [{ key: "", tabs }]
  const map = new Map<string, Tab[]>()
  for (const tab of tabs) {
    const key = groupKey(tab, by)
    const list = map.get(key)
    if (list) list.push(tab)
    else map.set(key, [tab])
  }
  const groups = [...map].map(([key, tabs]) => {
    const times = tabs.map((x) => x.lastAccessed || 0)
    return { key, tabs, recent: Math.max(...times), old: Math.min(...times) }
  })
  const byName = (a: TabGroup, b: TabGroup) => a.key.localeCompare(b.key)
  const comparators: Record<GroupSort, (a: typeof groups[0], b: typeof groups[0]) => number> = {
    "count-desc": (a, b) => b.tabs.length - a.tabs.length || byName(a, b),
    "count-asc": (a, b) => a.tabs.length - b.tabs.length || byName(a, b),
    recent: (a, b) => b.recent - a.recent,
    old: (a, b) => a.old - b.old,
    name: byName,
  }
  groups.sort(comparators[sort] ?? comparators.name)
  return groups.map(({ key, tabs }) => ({ key, tabs }))
}
