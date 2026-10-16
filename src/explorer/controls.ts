// Reads and writes the explorer filter controls.
import { $, state } from "../state.ts"
import type { FilterOptions } from "../tabs/filters.ts"

type SelectKey = "field" | "scope" | "state" | "accessed" | "sort" | "groupBy" | "groupSort"
type CheckKey = "regex" | "ignorePinned"

export const SELECT_IDS: Record<SelectKey, string> = {
  field: "fieldSelect",
  scope: "scopeSelect",
  state: "stateFilter",
  accessed: "accessedFilter",
  sort: "sortSelect",
  groupBy: "groupBySelect",
  groupSort: "groupSortSelect",
}
export const CHECKBOX_IDS: Record<CheckKey, string> = {
  regex: "regexToggle",
  ignorePinned: "ignorePinnedToggle",
}

const select = (key: SelectKey) => $<HTMLSelectElement>(SELECT_IDS[key])
const checkbox = (key: CheckKey) => $<HTMLInputElement>(CHECKBOX_IDS[key])
const searchInput = () => $<HTMLInputElement>("searchInput")

export function readFilters(): FilterOptions {
  return {
    search: searchInput().value,
    regex: checkbox("regex").checked,
    field: select("field").value as FilterOptions["field"],
    scope: select("scope").value as FilterOptions["scope"],
    state: select("state").value as FilterOptions["state"],
    accessed: select("accessed").value as FilterOptions["accessed"],
    sort: select("sort").value as FilterOptions["sort"],
    groupBy: select("groupBy").value as FilterOptions["groupBy"],
    groupSort: select("groupSort").value as FilterOptions["groupSort"],
    ignorePinned: checkbox("ignorePinned").checked,
    preset: state.activePreset,
  }
}

export function setPreset(name: string | undefined) {
  state.activePreset = name || "all"
  document.querySelectorAll<HTMLElement>(".preset[data-preset]").forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.preset === state.activePreset)
  )
}

/** Applies the given options and leaves the others untouched. */
export function writeFilters(options: Partial<FilterOptions>) {
  if (options.search !== undefined) searchInput().value = String(options.search)
  for (const [key, id] of Object.entries(SELECT_IDS)) {
    const value = options[key as SelectKey]
    if (value !== undefined) $<HTMLSelectElement>(id).value = value
  }
  for (const [key, id] of Object.entries(CHECKBOX_IDS)) {
    const value = options[key as CheckKey]
    if (value !== undefined) $<HTMLInputElement>(id).checked = !!value
  }
  if (options.preset !== undefined) setPreset(options.preset)
}
