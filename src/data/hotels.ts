import type { Amenity, Hotel, PropertyType } from './types';

/**
 * Deterministic hotel catalogue.
 *
 * The original sample shipped four records, two of which shared a name, and
 * hotlinked photographs from four other companies' servers — one of which now
 * returns 404. Everything here is generated from a fixed seed instead: the
 * data is invented, reproducible on every machine, and owned by nobody.
 *
 * Swapping this for a real API means replacing `loadHotels()`; nothing else in
 * the application knows where a `Hotel` came from.
 */

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

interface CitySpec {
  readonly name: string;
  readonly districts: readonly string[];
  /** Rough nightly rate for a mid-range room, before variation. */
  readonly baseRate: number;
  readonly weight: number;
  /** Real city-centre coordinates; properties are scattered around them. */
  readonly lat: number;
  readonly lng: number;
}

const CITIES: readonly CitySpec[] = [
  {
    name: 'Paris',
    districts: ['Le Marais', 'Montmartre', 'Saint-Germain', 'Bastille', 'Opéra'],
    baseRate: 210,
    weight: 0.3,
    lat: 48.8566,
    lng: 2.3522,
  },
  {
    name: 'Nice',
    districts: ['Vieux Nice', 'Promenade', 'Carré d’Or', 'Cimiez'],
    baseRate: 165,
    weight: 0.18,
    lat: 43.7102,
    lng: 7.262,
  },
  {
    name: 'Lyon',
    districts: ['Presqu’île', 'Vieux Lyon', 'Croix-Rousse', 'Confluence'],
    baseRate: 135,
    weight: 0.16,
    lat: 45.764,
    lng: 4.8357,
  },
  {
    name: 'Bordeaux',
    districts: ['Chartrons', 'Saint-Pierre', 'Bassins à Flot'],
    baseRate: 130,
    weight: 0.14,
    lat: 44.8378,
    lng: -0.5792,
  },
  {
    name: 'Marseille',
    districts: ['Vieux-Port', 'Le Panier', 'Notre-Dame', 'Joliette'],
    baseRate: 120,
    weight: 0.13,
    lat: 43.2965,
    lng: 5.3698,
  },
  {
    name: 'Toulouse',
    districts: ['Capitole', 'Saint-Cyprien', 'Carmes'],
    baseRate: 110,
    weight: 0.09,
    lat: 43.6047,
    lng: 1.4442,
  },
];

// Invented names only. No real chains, no trademarks.
const NAME_PREFIX = [
  'Hôtel', 'Hôtel', 'Hôtel', 'Résidence', 'Villa', 'Maison', 'Auberge', 'Le',
];

const NAME_CORE = [
  'Lumière', 'Bellevue', 'Verger', 'Cadran', 'Marin', 'Alouette', 'Sablon',
  'Perrier', 'Tourterelle', 'Grenadine', 'Colline', 'Rivage', 'Papillon',
  'Ancre', 'Comptoir', 'Faubourg', 'Cordelier', 'Feuillant', 'Aurore',
  'Vermillon', 'Sextant', 'Balcon', 'Fontaine', 'Palmier', 'Estuaire',
];

const NAME_SUFFIX = ['', '', '', ' & Spa', ' Rive Gauche', ' Centre', ' Port'];

const PROPERTY_WEIGHTS: readonly [PropertyType, number][] = [
  ['hotel', 0.56],
  ['apartment', 0.2],
  ['guesthouse', 0.12],
  ['hostel', 0.08],
  ['resort', 0.04],
];

const ALL_AMENITIES: readonly Amenity[] = [
  'wifi', 'breakfast', 'ac', 'parking', 'balcony', 'gym', 'pool', 'pets', 'sauna',
];

/** How likely each amenity is to be present, before star-rating influence. */
const AMENITY_BASE: Record<Amenity, number> = {
  wifi: 0.94,
  breakfast: 0.55,
  ac: 0.6,
  parking: 0.45,
  balcony: 0.35,
  gym: 0.28,
  pool: 0.2,
  pets: 0.3,
  sauna: 0.14,
};

function weighted<T>(pairs: readonly [T, number][], r: number): T {
  let acc = 0;
  for (const [value, weight] of pairs) {
    acc += weight;
    if (r < acc) return value;
  }
  return pairs[pairs.length - 1]![0];
}

function pick<T>(items: readonly T[], r: number): T {
  return items[Math.min(items.length - 1, Math.floor(r * items.length))]!;
}

const KM_PER_DEGREE_LAT = 111.32;

/**
 * Places a property at `distanceKm` from the city centre on the given bearing.
 *
 * Deriving the coordinates from the distance rather than inventing them
 * separately means the map and the "1.4 km from centre" label on the card can
 * never disagree.
 */
function offsetFrom(
  city: CitySpec,
  distanceKm: number,
  bearing: number
): { lat: number; lng: number } {
  const dLat = (distanceKm / KM_PER_DEGREE_LAT) * Math.cos(bearing);
  const dLng =
    (distanceKm / (KM_PER_DEGREE_LAT * Math.cos((city.lat * Math.PI) / 180))) *
    Math.sin(bearing);

  return {
    lat: Math.round((city.lat + dLat) * 1e6) / 1e6,
    lng: Math.round((city.lng + dLng) * 1e6) / 1e6,
  };
}

const HOTEL_COUNT = 180;

function build(seed: number): Hotel[] {
  const rand = rng(seed);
  const cityPairs = CITIES.map((c) => [c, c.weight] as [CitySpec, number]);
  const hotels: Hotel[] = [];
  const used = new Set<string>();

  for (let i = 0; i < HOTEL_COUNT; i++) {
    const city = weighted(cityPairs, rand());
    const propertyType = weighted(PROPERTY_WEIGHTS, rand());

    // Hostels are never 5-star; resorts are never 1-star. Bias the rest high.
    const starRoll = rand();
    const stars =
      propertyType === 'hostel'
        ? 1 + Math.floor(starRoll * 2)
        : propertyType === 'resort'
          ? 4 + Math.floor(starRoll * 2)
          : 2 + Math.floor(starRoll * 4);

    const district = pick(city.districts, rand());

    let name = `${pick(NAME_PREFIX, rand())} ${pick(NAME_CORE, rand())}${pick(
      NAME_SUFFIX,
      rand()
    )}`;
    // Duplicate names were one of the original dataset's defects. Disambiguate
    // by district, the way real chains do — a numeric suffix reads like a room
    // number.
    if (used.has(name)) name = `${name} ${district}`;
    if (used.has(name)) name = `${name} ${city.name}`;
    used.add(name);

    // Price tracks the city, the star rating and a little noise. Distance from
    // the centre discounts the room, as it does in the real market.
    const distanceKm = Math.round(rand() * rand() * 12 * 10) / 10;
    const starFactor = 0.55 + stars * 0.22;
    const distanceDiscount = 1 - Math.min(0.35, distanceKm * 0.028);
    const noise = 0.82 + rand() * 0.4;
    const pricePerNight = Math.max(
      28,
      Math.round((city.baseRate * starFactor * distanceDiscount * noise) / 5) * 5
    );

    // Guest score correlates with stars but leaves room for surprises: a plain
    // guesthouse can outscore a tired four-star, which is what makes filtering
    // by guest rating worth doing at all.
    const guestScore =
      Math.round(
        Math.min(9.8, Math.max(5.2, 5.9 + stars * 0.55 + (rand() - 0.45) * 2.2)) *
          10
      ) / 10;

    const amenities = ALL_AMENITIES.filter((a) => {
      const lift = a === 'pool' || a === 'sauna' || a === 'gym' ? stars * 0.07 : 0;
      return rand() < AMENITY_BASE[a] + lift;
    });

    hotels.push({
      id: `h${(1000 + i).toString(36)}`,
      name,
      city: city.name,
      district,
      propertyType,
      stars,
      guestScore,
      reviewCount: 40 + Math.floor(rand() * rand() * 3800),
      pricePerNight,
      amenities,
      distanceKm,
      ...offsetFrom(city, distanceKm, rand() * Math.PI * 2),
    });
  }

  return hotels;
}

let cache: readonly Hotel[] | null = null;

/** Async purely so the call site already looks like a real data fetch. */
export async function loadHotels(): Promise<readonly Hotel[]> {
  cache ??= build(20_260_805);
  return cache;
}

export function createHotels(seed = 20_260_805): readonly Hotel[] {
  return build(seed);
}

export const CITY_NAMES: readonly string[] = CITIES.map((c) => c.name);

export const CITY_CENTRES: Readonly<Record<string, { lat: number; lng: number }>> =
  Object.fromEntries(CITIES.map((c) => [c.name, { lat: c.lat, lng: c.lng }]));
