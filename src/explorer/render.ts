// Renders the tab list, selection summary and bulk button states.
import { $, setStatus, state, t } from "../state.ts"
import type { TranslationKey } from "../i18n.ts"
import { type GroupBy, groupTabs, type PrimaryState, type Tab } from "../tabs/filters.ts"
import { readFilters } from "./controls.ts"

function relativeTime(timestamp: number | undefined) {
  if (!timestamp) return "—"
  const minutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60_000)
  if (minutes < 1) return t("now")
  if (minutes < 60) return t("min", { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t("hour", { count: hours })
  return t("day", { count: Math.floor(hours / 24) })
}

type ElementProps = {
  className?: string
  textContent?: string
  title?: string
  type?: string
  checked?: boolean
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElementProps = {},
  children: Node[] = [],
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props)
  node.append(...children)
  return node
}

const pill = (text: string, cls = "") =>
  el("span", { className: `state-pill${cls ? ` ${cls}` : ""}`, textContent: text })

function stateFlags(tab: Tab) {
  const flags: HTMLElement[] = []
  if (tab.active) flags.push(pill(t("active"), "active"))
  if (tab.pinned) flags.push(pill(t("pinned"), "pinned"))
  if (tab.audible) flags.push(pill(t("audio"), "audio"))
  if (tab.mutedInfo?.muted) flags.push(pill(t("muted")))
  if (tab.discarded) flags.push(pill(t("discarded_state"), "discarded"))
  else if (tab.status === "loading") flags.push(pill(t("loading")))
  return flags
}

function rowButton(action: string, tabId: number, text: string, title: string, cls = "") {
  const button = el("button", { className: `row-icon-btn${cls}`, textContent: text, title })
  button.dataset.rowAction = action
  button.dataset.tabId = String(tabId)
  return button
}

function tabRow(tab: Tab) {
  const id = tab.id!
  const selected = state.selectedIds.has(id)
  const checkbox = el("input", { type: "checkbox", checked: selected, className: "row-checkbox" })
  checkbox.dataset.tabId = String(id)
  const text = el("div", { className: "tab-text" }, [
    el("div", {
      className: "tab-title",
      textContent: tab.title || t("untitled"),
      title: tab.title || "",
    }),
    el("div", { className: "tab-url", textContent: tab.url || "", title: tab.url || "" }),
  ])
  const row = el("div", { className: `tab-row${selected ? " selected" : ""}` }, [
    el("div", { className: "tab-main" }, [checkbox, text]),
    el("div", { className: "tab-state" }, stateFlags(tab)),
    el("div", {
      className: "last-access",
      textContent: relativeTime(tab.lastAccessed),
      title: tab.lastAccessed ? new Date(tab.lastAccessed).toLocaleString() : "",
    }),
    el("div", { className: "row-actions" }, [
      rowButton("activate", id, "↗", t("activate_tab")),
      rowButton("close", id, "×", t("close_tab"), " close"),
    ]),
  ])
  row.dataset.tabId = String(id)
  return row
}

const STATE_LABELS: Record<PrimaryState, TranslationKey> = {
  active: "active",
  pinned: "pinned",
  audible: "audible" as TranslationKey,
  muted: "muted",
  discarded: "discarded_state",
  loading: "loading",
  complete: "complete",
}

function groupLabel(key: string, by: GroupBy) {
  if (by === "window") return t("window_group", { id: key })
  if (by === "state") return t("state_group", { state: t(STATE_LABELS[key as PrimaryState]) })
  return key
}

function renderList() {
  const list = $("tabList")
  if (!state.filteredTabs.length) {
    list.replaceChildren(el("div", { className: "empty-state", textContent: t("no_match") }))
    return
  }
  const { groupBy, groupSort } = readFilters()
  if (groupBy === "none") {
    list.replaceChildren(...state.filteredTabs.map(tabRow))
    return
  }
  list.replaceChildren(
    ...groupTabs(state.filteredTabs, groupBy, groupSort).map((group) =>
      el("section", { className: "group-block" }, [
        el("div", { className: "group-header" }, [
          el("span", { textContent: groupLabel(group.key, groupBy) }),
          el("span", {
            className: "group-meta",
            textContent: t("group_count", { count: group.tabs.length }),
          }),
        ]),
        ...group.tabs.map(tabRow),
      ])
    ),
  )
}

export function renderTabs() {
  const existing = new Set(state.allTabs.map((tab) => tab.id))
  for (const id of state.selectedIds) if (!existing.has(id)) state.selectedIds.delete(id)

  renderList()

  const shown = state.filteredTabs.length
  const selectedVisible = state.filteredTabs.filter((x) => state.selectedIds.has(x.id!)).length
  $("selectionLabel").textContent = t("selected_shown", {
    selected: state.selectedIds.size,
    shown,
  })
  const selectAll = $<HTMLInputElement>("selectAllCheckbox")
  selectAll.checked = shown > 0 && selectedVisible === shown
  selectAll.indeterminate = selectedVisible > 0 && selectedVisible < shown
  $("tabTotalBadge").textContent = t("tabs_count", { count: state.allTabs.length })
  document.querySelectorAll<HTMLButtonElement>(".bulk-actions button").forEach((button) => {
    button.disabled = button.dataset.action === "close-shown"
      ? shown === 0
      : state.selectedIds.size === 0
  })
  setStatus(t("shown_total", { shown, total: state.allTabs.length }))
}
