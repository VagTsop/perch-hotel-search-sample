import { svg } from './dom';

/**
 * Inline SVG icon set.
 *
 * Replaces Font Awesome, which the original loaded as a 76 kB stylesheet plus
 * fifteen font files in five formats — including `.eot` for Internet Explorer.
 * These are a few hundred bytes total and inherit `currentColor`.
 */
const PATHS = {
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87',
  star: 'm12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z',
  pin: 'M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  map: 'm9 4 6 2 5.4-1.8a.6.6 0 0 1 .8.57v12.9a.6.6 0 0 1-.41.57L15 20l-6-2-5.4 1.8a.6.6 0 0 1-.8-.57V6.33a.6.6 0 0 1 .41-.57L9 4Zm0 0v14m6-12v14',
  close: 'M18 6 6 18M6 6l12 12',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  wifi: 'M5 12.55a11 11 0 0 1 14 0M1.4 9a16 16 0 0 1 21.2 0M8.5 16.1a6 6 0 0 1 7 0M12 20h.01',
  pool: 'M2 12h20M2 17h20M7 12V4a2 2 0 0 1 4 0v8M13 12V4a2 2 0 0 1 4 0v8',
  sauna: 'M8 3v4M12 3v4M16 3v4M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9Z',
  parking: 'M4 3h16v18H4zM9 17V8h3.5a2.5 2.5 0 0 1 0 5H9',
  balcony: 'M4 10h16v11H4zM4 14h16M9 10V3h6v7',
  breakfast: 'M18 8h1a3 3 0 0 1 0 6h-1M3 8h15v6a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8ZM6 2v3M10 2v3M14 2v3',
  gym: 'M2 12h2M20 12h2M6 8v8M18 8v8M9 6v12M15 6v12',
  pets: 'M11 15c-3 0-5 2-5 4a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2c0-2-2-4-5-4ZM6.5 9a1.8 2.3 0 1 0 0-4.6 1.8 2.3 0 0 0 0 4.6ZM15.5 9a1.8 2.3 0 1 0 0-4.6 1.8 2.3 0 0 0 0 4.6ZM3 14a1.6 2 0 1 0 0-4 1.6 2 0 0 0 0 4ZM19 14a1.6 2 0 1 0 0-4 1.6 2 0 0 0 0 4Z',
  ac: 'M3 7h18M3 12h18M3 17h18M8 4l2 3-2 3M16 14l-2 3 2 3',
  check: 'M20 6 9 17l-5-5',
  'chevron-left': 'M15 18 9 12l6-6',
  'chevron-right': 'M9 18l6-6-6-6',
  'chevron-down': 'M6 9l6 6 6-6',
} as const;

export type IconName = keyof typeof PATHS;

export function icon(name: IconName, size = 16, strokeWidth = 1.75): SVGElement {
  return svg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${PATHS[name]}"/></svg>`
  );
}

/** Filled star used for the classification badge. */
export function starIcon(size = 11): SVGElement {
  return svg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="${PATHS.star}"/></svg>`
  );
}
