import { h, svg } from '../lib/dom';

/**
 * Brand mark.
 *
 * A roof over a single point: shelter plus place, which is the whole product in
 * two shapes. Built from geometry rather than a picked icon so it stays legible
 * at 16 px, reads correctly in one colour, and does not look like the same
 * pin every other travel site uses.
 *
 * The mark is drawn on a 24×24 grid: the roof spans 3.2→20.8 with its apex at
 * 4.8, and the dot sits on the vertical centre line so the whole thing balances
 * around x=12.
 */
export function brandMark(size = 20): SVGElement {
  return svg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2.6"
          stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true" focusable="false">
      <path d="M3.2 12.6 L12 4.8 L20.8 12.6"/>
      <circle cx="12" cy="16.9" r="2.15" fill="currentColor" stroke="none"/>
    </svg>`
  );
}

/** Full lockup: mark in a tile, wordmark and descriptor. */
export function brandLockup(): HTMLElement {
  return h('a', { class: 'brand', href: '.', 'aria-label': 'Perch — home' }, [
    h('span', { class: 'brand__tile' }, [brandMark(20)]),
    h('span', { class: 'brand__text' }, [
      h('strong', { class: 'brand__name', text: 'Perch' }),
      h('span', { class: 'brand__tag', text: 'Stays, sorted' }),
    ]),
  ]);
}
