// Renders the tab list, the list header and the selection bar.
import type { TranslationKey } from "../i18n.ts"
import { $, state, t } from "../state.ts"
import {
  DEFAULT_FILTERS,
  type GroupBy,
  groupTabs,
  hostname,
  NO_DOMAIN,
  type PrimaryState,
  type Tab,
} from "../tabs/filters.ts"
import { CHECKBOX_IDS, readFilters, SELECT_IDS } from "./controls.ts"

const ICONS = {
  pinned:
    '<path d="M9.5 2.5 13.5 6.5 11 7.5 8.5 10l.5 3-6-6 3 .5L8.5 5z"/><path d="m5 11-2.5 2.5"/>',
  audio: '<path d="M3 6v4h2.5L9 13V3L5.5 6z"/><path d="M11.5 5.5a3.5 3.5 0 0 1 0 5"/>',
  muted: '<path d="M3 6v4h2.5L9 13V3L5.5 6z"/><path d="m11.5 6.5 3 3m0-3-3 3"/>',
  activate: '<path d="M6 3.5H3.5v9h9V10"/><path d="M9 3h4v4M13 3 7.5 8.5"/>',
  close: '<path d="m4.5 4.5 7 7m0-7-7 7"/>',
}

function icon(name: keyof typeof ICONS) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("viewBox", "0 0 16 16")
  svg.setAttribute("aria-hidden", "true")
  svg.innerHTML = ICONS[name]
  return svg
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

function relativeTime(timestamp: number | undefined) {
  if (!timestamp) return "—"
  const minutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60_000)
  if (minutes < 1) return t("now")
  if (minutes < 60) return t("min", { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t("hour", { count: hours })
  return t("day", { count: Math.floor(hours / 24) })
}

/** Host and path without the scheme; non-web URLs (about:, moz-extension:) as they are. */
function displayUrl(url = "") {
  try {
    const u = new URL(url)
    if (u.protocol !== "http:" && u.protocol !== "https:") return url
    const path = u.pathname === "/" ? "" : u.pathname
    return `${u.hostname.replace(/^www\./, "")}${path}${u.search}`
  } catch {
    return url
  }
}

function favicon(tab: Tab) {
  const letter = () =>
    el("span", {
      className: "favicon letter",
      textContent: (hostname(tab) || "?").replace(/^www\./, "")[0],
    })
  const src = tab.favIconUrl
  if (!src || src.startsWith("chrome:")) return letter()
  const img = el("img", { className: "favicon" })
  img.alt = ""
  img.loading = "lazy"
  img.src = src
  img.addEventListener("error", () => img.replaceWith(letter()), { once: true })
  return img
}

function flag(text: string, cls = "", iconName?: keyof typeof ICONS) {
  const node = el("span", { className: `flag ${cls}`.trim(), title: text })
  if (iconName) node.append(icon(iconName))
  else node.textContent = text
  return node
}

function flags(tab: Tab) {
  const out: HTMLElement[] = []
  if (tab.active) out.push(flag(t("active"), "active"))
  if (tab.pinned) out.push(flag(t("pinned"), "", "pinned"))
  if (tab.mutedInfo?.muted) out.push(flag(t("muted"), "", "muted"))
  else if (tab.audible) out.push(flag(t("audio"), "", "audio"))
  if (tab.discarded) out.push(flag(t("discarded_state")))
  else if (tab.status === "loading") out.push(flag(t("loading")))
  return out
}

function rowButton(action: string, tabId: number, iconName: keyof typeof ICONS, title: string) {
  const button = el("button", { className: `row-icon-btn ${action}`, title })
  button.type = "button"
  button.dataset.rowAction = action
  button.dataset.tabId = String(tabId)
  button.append(icon(iconName))
  return button
}

function groupCloseButton() {
  const button = el("button", {
    className: "row-icon-btn close group-close",
    title: t("close_group"),
  })
  button.type = "button"
  button.dataset.groupAction = "close"
  button.append(icon("close"))
  return button
}

function tabRow(tab: Tab) {
  const id = tab.id!
  const selected = state.selectedIds.has(id)
  const checkbox = el("input", { type: "checkbox", checked: selected, className: "row-checkbox" })
  checkbox.dataset.tabId = String(id)
  checkbox.tabIndex = -1
  const classes = ["tab-row"]
  if (selected) classes.push("selected")
  if (id === state.focusedId) classes.push("focused")
  if (tab.active) classes.push("is-active")
  if (tab.discarded) classes.push("is-discarded")
  const row = el("div", { className: classes.join(" ") }, [
    el("label", { className: "row-check" }, [checkbox]),
    favicon(tab),
    el("div", { className: "tab-text" }, [
      el("span", { className: "tab-title", textContent: tab.title || t("untitled") }),
      el("span", { className: "tab-host", textContent: displayUrl(tab.url) }),
    ]),
    el("div", { className: "tab-flags" }, flags(tab)),
    el("div", {
      className: "last-access",
      textContent: relativeTime(tab.lastAccessed),
      title: tab.lastAccessed ? new Date(tab.lastAccessed).toLocaleString() : "",
    }),
    el("div", { className: "row-actions" }, [
      rowButton("activate", id, "activate", t("activate_tab")),
      rowButton("close", id, "close", t("close_tab")),
    ]),
  ])
  row.title = `${tab.title || ""}\n${tab.url || ""}`
  row.dataset.tabId = String(id)
  row.setAttribute("role", "option")
  row.setAttribute("aria-selected", String(selected))
  return row
}

const STATE_LABELS: Record<PrimaryState, TranslationKey> = {
  active: "state_active",
  pinned: "state_pinned",
  audible: "state_audible",
  muted: "state_muted",
  discarded: "state_discarded",
  loading: "state_loading",
  complete: "state_complete",
}

function groupLabel(key: string, by: GroupBy) {
  if (by === "window") return t("window_group", { id: key })
  if (by === "state") return t("state_group", { state: t(STATE_LABELS[key as PrimaryState]) })
  return key === NO_DOMAIN ? t("no_domain") : key
}

function renderList(groupBy: GroupBy, groupSort: ReturnType<typeof readFilters>["groupSort"]) {
  const list = $("tabList")
  if (!state.filteredTabs.length) {
    list.replaceChildren(el("div", { className: "empty-state", textContent: t("no_match") }))
    return
  }
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
          groupCloseButton(),
        ]),
        ...group.tabs.map(tabRow),
      ])
    ),
  )
}

/** Tab IDs in the order the rows are shown (groups change it). */
export function displayOrder(): number[] {
  return [...$("tabList").querySelectorAll<HTMLElement>(".tab-row")].map((row) =>
    Number(row.dataset.tabId)
  )
}

export function scrollFocusedIntoView() {
  $("tabList").querySelector(".tab-row.focused")?.scrollIntoView({ block: "nearest" })
}

/** Marks filter chips that differ from the defaults, and hides group sort when not grouping. */
function renderFilterChips(filters: ReturnType<typeof readFilters>) {
  for (const [key, id] of Object.entries({ ...SELECT_IDS, ...CHECKBOX_IDS })) {
    const changed = filters[key as keyof typeof filters] !==
      DEFAULT_FILTERS[key as keyof typeof DEFAULT_FILTERS]
    $(id).closest(".chip")?.classList.toggle("changed", changed)
  }
  $("groupSortChip").classList.toggle("hidden", filters.groupBy === "none")
}

export function renderTabs() {
  const existing = new Set(state.allTabs.map((tab) => tab.id))
  for (const id of state.selectedIds) if (!existing.has(id)) state.selectedIds.delete(id)

  const filters = readFilters()
  renderList(filters.groupBy, filters.groupSort)
  renderFilterChips(filters)

  const shown = state.filteredTabs.length
  const total = state.allTabs.length
  const selectedVisible = state.filteredTabs.filter((x) => state.selectedIds.has(x.id!)).length
  const selectedCount = state.selectedIds.size

  $("tabTotalBadge").textContent = String(total)
  $("selectionLabel").textContent = shown === total
    ? t("list_count", { shown })
    : t("list_count_filtered", { shown, total })
  const selectAll = $<HTMLInputElement>("selectAllCheckbox")
  selectAll.checked = shown > 0 && selectedVisible === shown
  selectAll.indeterminate = selectedVisible > 0 && selectedVisible < shown
  selectAll.disabled = shown === 0

  const closeShown = $<HTMLButtonElement>("closeShownBtn")
  closeShown.textContent = t("close_all", { count: shown })
  closeShown.disabled = shown === 0

  $("selectionBar").classList.toggle("visible", selectedCount > 0)
  $("selectionCount").textContent = t("selected_count", { count: selectedCount })
  document.querySelectorAll<HTMLButtonElement>("#selectionBar [data-action]").forEach((button) => {
    button.disabled = selectedCount === 0
  })
}
