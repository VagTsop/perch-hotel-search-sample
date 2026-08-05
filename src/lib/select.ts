import type { Filters, Hotel, SortKey } from '../data/types';

/**
 * Filtering and sorting live here as pure functions over the data.
 *
 * The original implementation walked the rendered DOM — it read prices back out
 * of `$(".price")` text, stripped the currency symbol, and toggled visibility
 * per node. That made the result set unknowable without a browser, impossible
 * to unit test, and quietly wrong whenever the markup changed. Everything below
 * takes `Hotel[]` and returns `Hotel[]`; the DOM is told what to draw
 * afterwards and never consulted.
 */

const SORTERS: Record<SortKey, (a: Hotel, b: Hotel) => number> = {
  // "Recommended" balances guest sentiment against price so the default order
  // is not simply the most expensive rooms first.
  recommended: (a, b) => score(b) - score(a),
  'price-asc': (a, b) => a.pricePerNight - b.pricePerNight,
  'price-desc': (a, b) => b.pricePerNight - a.pricePerNight,
  'guest-desc': (a, b) => b.guestScore - a.guestScore || b.reviewCount - a.reviewCount,
  'stars-desc': (a, b) => b.stars - a.stars || b.guestScore - a.guestScore,
  'distance-asc': (a, b) => a.distanceKm - b.distanceKm,
};

function score(h: Hotel): number {
  const sentiment = h.guestScore / 10;
  const confidence = Math.min(1, h.reviewCount / 1200);
  const value = 1 - Math.min(1, h.pricePerNight / 600);
  const proximity = 1 - Math.min(1, h.distanceKm / 12);
  return sentiment * 0.45 + confidence * 0.15 + value * 0.25 + proximity * 0.15;
}

function matchesQuery(hotel: Hotel, query: string): boolean {
  if (!query) return true;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    hotel.name.toLowerCase().includes(needle) ||
    hotel.city.toLowerCase().includes(needle) ||
    hotel.district.toLowerCase().includes(needle)
  );
}

export function filterHotels(
  hotels: readonly Hotel[],
  filters: Filters
): readonly Hotel[] {
  return hotels.filter((h) => {
    if (!matchesQuery(h, filters.query)) return false;
    if (filters.city && h.city !== filters.city) return false;
    if (filters.maxPrice !== null && h.pricePerNight > filters.maxPrice) return false;

    // Star and score filters are "at least", not "exactly". The original
    // required an exact star match, so asking for 4 stars hid every 5-star
    // property — the opposite of what a traveller means by the control.
    if (filters.minStars !== null && h.stars < filters.minStars) return false;
    if (filters.minGuestScore !== null && h.guestScore < filters.minGuestScore) {
      return false;
    }

    if (
      filters.propertyTypes.length &&
      !filters.propertyTypes.includes(h.propertyType)
    ) {
      return false;
    }

    // Amenities are conjunctive: every ticked box must be present.
    if (filters.amenities.length) {
      for (const a of filters.amenities) {
        if (!h.amenities.includes(a)) return false;
      }
    }

    return true;
  });
}

export function sortHotels(
  hotels: readonly Hotel[],
  sort: SortKey
): readonly Hotel[] {
  // Never sort the caller's array in place.
  return hotels.slice().sort(SORTERS[sort]);
}

export interface SelectionResult {
  readonly hotels: readonly Hotel[];
  readonly total: number;
  readonly cheapest: number | null;
  readonly priceBounds: { min: number; max: number };
}

/** Single entry point the UI calls whenever any control changes. */
export function selectHotels(
  hotels: readonly Hotel[],
  filters: Filters
): SelectionResult {
  const matched = sortHotels(filterHotels(hotels, filters), filters.sort);

  let min = Infinity;
  let max = 0;
  for (const h of hotels) {
    if (h.pricePerNight < min) min = h.pricePerNight;
    if (h.pricePerNight > max) max = h.pricePerNight;
  }

  return {
    hotels: matched,
    total: matched.length,
    cheapest: matched.length
      ? matched.reduce((lo, h) => Math.min(lo, h.pricePerNight), Infinity)
      : null,
    priceBounds: {
      min: Number.isFinite(min) ? min : 0,
      max,
    },
  };
}

/** Suggestions for the search combobox: cities first, then districts, then names. */
export function suggest(
  hotels: readonly Hotel[],
  query: string,
  limit = 8
): readonly { value: string; kind: 'city' | 'district' | 'hotel' }[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];

  const seen = new Set<string>();
  const out: { value: string; kind: 'city' | 'district' | 'hotel' }[] = [];

  const push = (value: string, kind: 'city' | 'district' | 'hotel') => {
    const key = `${kind}:${value}`;
    if (seen.has(key) || out.length >= limit) return;
    if (!value.toLowerCase().includes(needle)) return;
    seen.add(key);
    out.push({ value, kind });
  };

  for (const h of hotels) push(h.city, 'city');
  for (const h of hotels) push(h.district, 'district');
  for (const h of hotels) push(h.name, 'hotel');

  return out;
}
