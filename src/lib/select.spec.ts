import { describe, expect, it } from 'vitest';

import { createHotels } from '../data/hotels';
import { defaultFilters, filtersFromUrl, filtersToUrl } from '../state/store';
import { filterHotels, selectHotels, sortHotels, suggest } from './select';
import type { Filters } from '../data/types';

const hotels = createHotels(1);
const base = (over: Partial<Filters> = {}): Filters => ({
  ...defaultFilters(),
  ...over,
});

describe('dataset', () => {
  it('is deterministic for a seed', () => {
    expect(createHotels(7)).toEqual(createHotels(7));
  });

  it('has no duplicate names', () => {
    const names = hotels.map((h) => h.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('keeps every property internally consistent', () => {
    for (const h of hotels) {
      expect(h.stars).toBeGreaterThanOrEqual(0);
      expect(h.stars).toBeLessThanOrEqual(5);
      expect(h.guestScore).toBeGreaterThanOrEqual(0);
      expect(h.guestScore).toBeLessThanOrEqual(10);
      expect(h.pricePerNight).toBeGreaterThan(0);
    }
  });
});

describe('filterHotels', () => {
  it('matches name, city and district', () => {
    const target = hotels[0]!;
    expect(filterHotels(hotels, base({ query: target.name }))).toContain(target);
    expect(
      filterHotels(hotels, base({ query: target.city })).every(
        (h) => h.city === target.city || h.name.toLowerCase().includes(target.city.toLowerCase())
      )
    ).toBe(true);
  });

  it('is case-insensitive', () => {
    const target = hotels[3]!;
    const upper = filterHotels(hotels, base({ query: target.name.toUpperCase() }));
    expect(upper).toContain(target);
  });

  it('treats star rating as a minimum, not an exact match', () => {
    const result = filterHotels(hotels, base({ minStars: 4 }));
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((h) => h.stars >= 4)).toBe(true);
    // The original required equality, which hid every 5-star property.
    expect(result.some((h) => h.stars === 5)).toBe(true);
  });

  it('applies a maximum price', () => {
    const result = filterHotels(hotels, base({ maxPrice: 120 }));
    expect(result.every((h) => h.pricePerNight <= 120)).toBe(true);
  });

  it('requires every selected amenity, not just one', () => {
    const result = filterHotels(hotels, base({ amenities: ['pool', 'sauna'] }));
    expect(result.every((h) => h.amenities.includes('pool') && h.amenities.includes('sauna'))).toBe(
      true
    );
  });

  it('combines filters conjunctively', () => {
    const result = filterHotels(
      hotels,
      base({ city: 'Paris', minStars: 4, amenities: ['wifi'] })
    );
    expect(
      result.every(
        (h) => h.city === 'Paris' && h.stars >= 4 && h.amenities.includes('wifi')
      )
    ).toBe(true);
  });

  it('returns everything when no filter is set', () => {
    expect(filterHotels(hotels, base())).toHaveLength(hotels.length);
  });
});

describe('sortHotels', () => {
  it('sorts by price ascending and descending', () => {
    const asc = sortHotels(hotels, 'price-asc').map((h) => h.pricePerNight);
    const desc = sortHotels(hotels, 'price-desc').map((h) => h.pricePerNight);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
  });

  it('sorts by guest score and distance', () => {
    const byScore = sortHotels(hotels, 'guest-desc');
    expect(byScore[0]!.guestScore).toBeGreaterThanOrEqual(byScore.at(-1)!.guestScore);

    const byDistance = sortHotels(hotels, 'distance-asc');
    expect(byDistance[0]!.distanceKm).toBeLessThanOrEqual(byDistance.at(-1)!.distanceKm);
  });

  it('does not mutate the input', () => {
    const before = hotels.map((h) => h.id);
    sortHotels(hotels, 'price-desc');
    expect(hotels.map((h) => h.id)).toEqual(before);
  });
});

describe('selectHotels', () => {
  it('reports the cheapest match and stable price bounds', () => {
    const result = selectHotels(hotels, base({ sort: 'price-asc' }));
    expect(result.total).toBe(hotels.length);
    expect(result.cheapest).toBe(result.hotels[0]!.pricePerNight);
    expect(result.priceBounds.min).toBeLessThan(result.priceBounds.max);
  });

  it('returns a null cheapest when nothing matches', () => {
    const result = selectHotels(hotels, base({ query: 'zzzz-nothing' }));
    expect(result.total).toBe(0);
    expect(result.cheapest).toBeNull();
  });
});

describe('suggest', () => {
  it('ignores queries shorter than two characters', () => {
    expect(suggest(hotels, 'P')).toHaveLength(0);
  });

  it('returns unique, capped results', () => {
    const out = suggest(hotels, 'par', 5);
    expect(out.length).toBeLessThanOrEqual(5);
    expect(new Set(out.map((o) => `${o.kind}:${o.value}`)).size).toBe(out.length);
  });
});

describe('url state', () => {
  it('round-trips through the query string', () => {
    const filters = base({
      query: 'Nice',
      city: 'Nice',
      minStars: 4,
      maxPrice: 300,
      amenities: ['wifi', 'pool'],
      sort: 'price-asc',
    });
    const restored = filtersFromUrl(filtersToUrl(filters));

    expect(restored.query).toBe('Nice');
    expect(restored.city).toBe('Nice');
    expect(restored.minStars).toBe(4);
    expect(restored.maxPrice).toBe(300);
    expect(restored.amenities).toEqual(['wifi', 'pool']);
    expect(restored.sort).toBe('price-asc');
  });

  it('omits defaults so a clean search has a clean URL', () => {
    expect(filtersToUrl(defaultFilters())).not.toContain('sort=');
  });

  it('rejects an unknown sort key', () => {
    expect(filtersFromUrl('?sort=drop-table').sort).toBe('recommended');
  });

  it('repairs a check-out that precedes check-in', () => {
    const restored = filtersFromUrl('?in=2026-09-10&out=2026-09-01');
    expect(restored.checkOut > restored.checkIn).toBe(true);
  });
});
