/**
 * Yields to the browser so the most recent React state update can paint
 * before the next synchronous block of work begins.
 *
 * Use before long synchronous operations (PDF/Excel/ZIP generation) so
 * spinner / "Descargando..." state is visible to the user.
 *
 * @example
 * setIsExporting(true);
 * await nextPaint();
 * const blob = generatePdf(data); // long sync work
 */
export function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    } else {
      setTimeout(resolve, 0);
    }
  });
}
