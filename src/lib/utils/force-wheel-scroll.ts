export function forceScrollableWheel(
  element: HTMLElement,
  deltaY: number,
  deltaX: number = 0
): boolean {
  const canScrollVertically = element.scrollHeight > element.clientHeight
  const canScrollHorizontally = element.scrollWidth > element.clientWidth

  if (!canScrollVertically && !canScrollHorizontally) {
    return false
  }

  if (canScrollVertically && deltaY !== 0) {
    const maxScrollTop = element.scrollHeight - element.clientHeight
    const nextScrollTop = Math.min(maxScrollTop, Math.max(0, element.scrollTop + deltaY))

    if (nextScrollTop !== element.scrollTop) {
      element.scrollTop = nextScrollTop
      return true
    }
  }

  if (canScrollHorizontally && deltaX !== 0) {
    const maxScrollLeft = element.scrollWidth - element.clientWidth
    const nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, element.scrollLeft + deltaX))

    if (nextScrollLeft !== element.scrollLeft) {
      element.scrollLeft = nextScrollLeft
      return true
    }
  }

  return false
}
