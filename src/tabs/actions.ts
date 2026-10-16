// Tab operations shared by the REPL globals and the explorer buttons.
import type { Tab } from "./filters.ts"

export type TabRef = Tab | number
export type TabRefs = TabRef | TabRef[] | null | undefined

/** Unique integer tab IDs from a tab, an ID, or an array of either. */
export function tabIds(items: TabRefs): number[] {
  if (items == null) return []
  const ids = new Set<number>()
  for (const item of Array.isArray(items) ? items : [items]) {
    const id = typeof item === "number" ? item : item?.id
    if (Number.isInteger(id)) ids.add(id!)
  }
  return [...ids]
}

export type BulkAction = "close" | "discard" | "reload" | "pin" | "unpin" | "mute" | "unmute"

/**
 * Creates the tab actions. `onChange` runs after each action so the explorer can refresh even
 * when auto refresh on tab events is disabled.
 */
export function createTabActions(onChange: () => void) {
  async function each<T>(items: TabRefs, run: (id: number) => Promise<T>) {
    const result = await Promise.allSettled(tabIds(items).map(run))
    onChange()
    return result
  }
  const update = (items: TabRefs, props: browser.tabs._UpdateUpdateProperties) =>
    each(items, (id) => browser.tabs.update(id, props))

  const actions = {
    async close(items: TabRefs): Promise<number> {
      const ids = tabIds(items)
      if (!ids.length) return 0
      await browser.tabs.remove(ids)
      onChange()
      return ids.length
    },
    discard: (items: TabRefs) => each(items, (id) => browser.tabs.discard(id)),
    reload: (items: TabRefs) => each(items, (id) => browser.tabs.reload(id)),
    pin: (items: TabRefs) => update(items, { pinned: true }),
    unpin: (items: TabRefs) => update(items, { pinned: false }),
    mute: (items: TabRefs) => update(items, { muted: true }),
    unmute: (items: TabRefs) => update(items, { muted: false }),
    async activate(tab: TabRef): Promise<Tab> {
      const id = typeof tab === "number" ? tab : tab?.id
      if (!Number.isInteger(id)) throw new Error("activate(tab): valid tab or tab ID required")
      const target = await browser.tabs.get(id!)
      await browser.windows.update(target.windowId!, { focused: true })
      return browser.tabs.update(id!, { active: true })
    },
  } satisfies Record<BulkAction | "activate", unknown>
  return actions
}

export type TabActions = ReturnType<typeof createTabActions>
