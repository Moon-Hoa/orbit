/** Minimum gap to leave between a clamped element and the viewport edge, CSS px. */
const VIEWPORT_EDGE_MARGIN_PX = 8

/**
 * Clamps a horizontal anchor position so an element of `halfWidthPx` centered
 * on it (e.g. via `transform: translateX(-50%)`) stays fully within the
 * viewport width, with a small margin. Used by the marker/spacecraft
 * tooltips, whose anchor point can be anywhere on screen, including right at
 * the edge, on a narrow viewport.
 */
export function clampToViewportWidth(xPx: number, halfWidthPx: number): number {
  const min = halfWidthPx + VIEWPORT_EDGE_MARGIN_PX
  const max = window.innerWidth - halfWidthPx - VIEWPORT_EDGE_MARGIN_PX
  return Math.min(Math.max(xPx, min), max)
}
