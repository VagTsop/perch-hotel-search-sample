import { addDays, today } from '../lib/format';
import type { Amenity, Filters, PropertyType, SortKey } from '../data/types';

/**
 * Minimal observable store.
 *
 * Filters are mirrored into the query string, so a result set is a shareable
 * URL and the browser's back button undoes a filter instead of leaving the
 * page. That is the whole reason state lives in one place rather than being
 * read back out of form controls.
 */

const SORTS: readonly SortKey[] = [
  'recommended',
  'price-asc',
  'price-desc',
  'guest-desc',
  'stars-desc',
  'distance-asc',
];

const PROPERTY_TYPES: readonly PropertyType[] = [
  'hotel',
  'apartment',
  'hostel',
  'guesthouse',
  'resort',
];

const AMENITIES: readonly Amenity[] = [
  'wifi',
  'pool',
  'sauna',
  'parking',
  'balcony',
  'breakfast',
  'gym',
  'pets',
  'ac',
];

export function defaultFilters(): Filters {
  const checkIn = addDays(today(), 14);
  return {
    query: '',
    city: null,
    checkIn,
    checkOut: addDays(checkIn, 2),
    guests: 2,
    maxPrice: null,
    minStars: null,
    minGuestScore: null,
    propertyTypes: [],
    amenities: [],
    sort: 'recommended',
  };
}

function num(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function list<T extends string>(value: string | null, allowed: readonly T[]): T[] {
  if (!value) return [];
  return value.split(',').filter((v): v is T => (allowed as readonly string[]).includes(v));
}

export function filtersFromUrl(search: string): Filters {
  const base = defaultFilters();
  const p = new URLSearchParams(search);
  const sort = p.get('sort');
  const checkIn = p.get('in') ?? base.checkIn;
  const rawOut = p.get('out') ?? base.checkOut;

  return {
    query: p.get('q') ?? base.query,
    city: p.get('city'),
    checkIn,
    // A check-out on or before check-in is not a state the UI should hold.
    checkOut: rawOut > checkIn ? rawOut : addDays(checkIn, 1),
    guests: Math.min(8, Math.max(1, num(p.get('guests')) ?? base.guests)),
    maxPrice: num(p.get('max')),
    minStars: num(p.get('stars')),
    minGuestScore: num(p.get('score')),
    propertyTypes: list(p.get('type'), PROPERTY_TYPES),
    amenities: list(p.get('amenity'), AMENITIES),
    sort: sort && (SORTS as readonly string[]).includes(sort) ? (sort as SortKey) : base.sort,
  };
}

export function filtersToUrl(f: Filters): string {
  const d = defaultFilters();
  const p = new URLSearchParams();
  const set = (key: string, value: string | number | null | undefined, fallback?: unknown) => {
    if (value === null || value === undefined || value === '') return;
    if (fallback !== undefined && value === fallback) return;
    p.set(key, String(value));
  };

  set('q', f.query);
  set('city', f.city);
  set('in', f.checkIn, d.checkIn);
  set('out', f.checkOut, d.checkOut);
  set('guests', f.guests, d.guests);
  set('max', f.maxPrice);
  set('stars', f.minStars);
  set('score', f.minGuestScore);
  if (f.propertyTypes.length) p.set('type', f.propertyTypes.join(','));
  if (f.amenities.length) p.set('amenity', f.amenities.join(','));
  set('sort', f.sort, d.sort);

  const q = p.toString();
  // Pure: returns the query string only. Composing it with a path is the
  // caller's job, which keeps this testable outside a browser.
  return q ? `?${q}` : '';
}

type Listener = (filters: Filters) => void;

export class FilterStore {
  private filters: Filters;
  private readonly listeners = new Set<Listener>();
  private flushHandle = 0;

  constructor(initial: Filters) {
    this.filters = initial;
    addEventListener('popstate', () => {
      this.filters = filtersFromUrl(location.search);
      this.emit();
    });
  }

  get value(): Filters {
    return this.filters;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  patch(partial: Partial<Filters>): void {
    const next = { ...this.filters, ...partial };

    // Dates are the one pair that can contradict each other, so the invariant
    // is enforced centrally rather than in each date input's handler.
    if (next.checkOut <= next.checkIn) {
      next.checkOut = addDays(next.checkIn, 1);
    }

    this.filters = next;
    this.emit();
    this.scheduleUrlWrite();
  }

  reset(): void {
    this.filters = defaultFilters();
    this.emit();
    this.scheduleUrlWrite();
  }

  toggleIn<K extends 'propertyTypes' | 'amenities'>(
    key: K,
    value: Filters[K][number]
  ): void {
    const current = this.filters[key] as readonly string[];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    this.patch({ [key]: next } as unknown as Partial<Filters>);
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.filters);
  }

  /** Typing into the search box should not push a history entry per keystroke. */
  private scheduleUrlWrite(): void {
    cancelAnimationFrame(this.flushHandle);
    this.flushHandle = requestAnimationFrame(() => {
      history.replaceState(
        null,
        '',
        location.pathname + filtersToUrl(this.filters)
      );
    });
  }
}
