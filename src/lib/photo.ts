import { h } from './dom';
import type { Hotel, PropertyType } from '../data/types';

/**
 * Property photography.
 *
 * The original hotlinked images from four unrelated companies' servers — one
 * already 404s and one is plain HTTP, which a browser blocks on an HTTPS page.
 * These are Unsplash photographs downloaded once, re-encoded to WebP at the
 * size the card actually renders, and served from this repository: no third
 * party is in the critical path, nothing can rot, and the Unsplash Licence
 * permits commercial use without attribution.
 *
 * A photo is chosen from the pool matching the property type, so a hostel never
 * shows a beach resort. The choice is derived from the hotel id, so the same
 * property keeps the same photograph across reloads.
 */

const POOL: Record<PropertyType, number> = {
  hotel: 12,
  resort: 12,
  apartment: 12,
  guesthouse: 12,
  hostel: 8,
};

/** Tint shown behind the image while it decodes, keyed to the property. */
const TINTS = [
  'linear-gradient(135deg,#1e3a8a,#6366f1)',
  'linear-gradient(135deg,#0f766e,#14b8a6)',
  'linear-gradient(135deg,#7c2d12,#f97316)',
  'linear-gradient(135deg,#312e81,#8b5cf6)',
  'linear-gradient(135deg,#164e63,#06b6d4)',
  'linear-gradient(135deg,#831843,#ec4899)',
];

function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function photoFor(hotel: Hotel): HTMLElement {
  const seed = hash(hotel.id);
  const index = seed % POOL[hotel.propertyType];
  const file = `${hotel.propertyType}-${String(index).padStart(2, '0')}.webp`;

  const frame = h('div', { class: 'photo' });
  frame.style.background = TINTS[seed % TINTS.length]!;

  const img = h('img', {
    // BASE_URL keeps this correct when the site is served from a sub-path.
    src: `${import.meta.env.BASE_URL}photos/${file}`,
    alt: `${hotel.name}, ${hotel.district}`,
    width: 640,
    height: 480,
    loading: 'lazy',
    decoding: 'async',
  });

  img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
  // A missing file should leave the tint, not a broken-image glyph.
  img.addEventListener('error', () => img.remove(), { once: true });

  frame.append(img);
  return frame;
}
