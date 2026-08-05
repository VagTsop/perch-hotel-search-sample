export type PropertyType =
  | 'hotel'
  | 'apartment'
  | 'hostel'
  | 'guesthouse'
  | 'resort';

export type Amenity =
  | 'wifi'
  | 'pool'
  | 'sauna'
  | 'parking'
  | 'balcony'
  | 'breakfast'
  | 'gym'
  | 'pets'
  | 'ac';

export interface Hotel {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly district: string;
  readonly propertyType: PropertyType;
  /** Official star classification, 0–5. */
  readonly stars: number;
  /** Aggregated guest score, 0–10, one decimal. */
  readonly guestScore: number;
  readonly reviewCount: number;
  /** Nightly rate in euros. */
  readonly pricePerNight: number;
  readonly amenities: readonly Amenity[];
  /** Straight-line distance to the city centre, kilometres. */
  readonly distanceKm: number;
  /** Real WGS-84 coordinates, offset from the city centre by `distanceKm`. */
  readonly lat: number;
  readonly lng: number;
}

export type SortKey =
  | 'recommended'
  | 'price-asc'
  | 'price-desc'
  | 'guest-desc'
  | 'stars-desc'
  | 'distance-asc';

export interface Filters {
  readonly query: string;
  readonly city: string | null;
  readonly checkIn: string;
  readonly checkOut: string;
  readonly guests: number;
  readonly maxPrice: number | null;
  readonly minStars: number | null;
  readonly minGuestScore: number | null;
  readonly propertyTypes: readonly PropertyType[];
  readonly amenities: readonly Amenity[];
  readonly sort: SortKey;
}

export const AMENITY_LABELS: Record<Amenity, string> = {
  wifi: 'Free Wi-Fi',
  pool: 'Pool',
  sauna: 'Sauna',
  parking: 'Parking',
  balcony: 'Balcony',
  breakfast: 'Breakfast included',
  gym: 'Gym',
  pets: 'Pet friendly',
  ac: 'Air conditioning',
};

export const PROPERTY_LABELS: Record<PropertyType, string> = {
  hotel: 'Hotel',
  apartment: 'Apartment',
  hostel: 'Hostel',
  guesthouse: 'Guesthouse',
  resort: 'Resort',
};

export const SORT_LABELS: Record<SortKey, string> = {
  recommended: 'Recommended',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  'guest-desc': 'Guest rating',
  'stars-desc': 'Star rating',
  'distance-asc': 'Distance to centre',
};

/** Guest-score bands, matching how travel sites label them. */
export const SCORE_BANDS: readonly { min: number; label: string }[] = [
  { min: 9, label: 'Exceptional' },
  { min: 8, label: 'Excellent' },
  { min: 7, label: 'Very good' },
  { min: 6, label: 'Good' },
  { min: 0, label: 'Fair' },
];

export function scoreLabel(score: number): string {
  return SCORE_BANDS.find((b) => score >= b.min)?.label ?? 'Fair';
}
