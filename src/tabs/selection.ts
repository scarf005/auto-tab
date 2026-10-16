// Range selection over the list as displayed (after sorting and grouping).

/**
 * Sets every ID between `anchor` and `target` in `order` (inclusive) to `select`.
 * Without a usable anchor only `target` changes, like a plain click.
 */
export function selectRange(
  selected: Set<number>,
  order: number[],
  anchor: number | null,
  target: number,
  select: boolean,
): void {
  const to = order.indexOf(target)
  if (to < 0) return
  const anchorIndex = anchor == null ? -1 : order.indexOf(anchor)
  const from = anchorIndex < 0 ? to : anchorIndex
  const [start, end] = from <= to ? [from, to] : [to, from]
  for (const id of order.slice(start, end + 1)) {
    if (select) selected.add(id)
    else selected.delete(id)
  }
}

/** The ID `delta` rows away from `current` in `order`, clamped to the ends. */
export function moveFocus(order: number[], current: number | null, delta: number): number | null {
  if (!order.length) return null
  if (!Number.isFinite(delta)) return delta < 0 ? order[0] : order.at(-1)!
  const index = current == null ? -1 : order.indexOf(current)
  if (index < 0) return delta < 0 ? order.at(-1)! : order[0]
  return order[Math.max(0, Math.min(order.length - 1, index + delta))]
}

/**
 * Keyboard range (Shift+j/k): what was selected before the range started, plus anchor..target.
 * Moving back toward the anchor shrinks the range again.
 */
export function extendRange(
  base: Set<number>,
  order: number[],
  anchor: number,
  target: number,
): Set<number> {
  const next = new Set(base)
  selectRange(next, order, anchor, target, true)
  return next
}
