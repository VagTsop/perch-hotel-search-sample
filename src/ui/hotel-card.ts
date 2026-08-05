import { h } from '../lib/dom';
import { fmt } from '../lib/format';
import { icon, starIcon, type IconName } from '../lib/icons';
import { photoFor } from '../lib/photo';
import {
  AMENITY_LABELS,
  PROPERTY_LABELS,
  scoreLabel,
  type Amenity,
  type Hotel,
} from '../data/types';

const AMENITY_ICON: Record<Amenity, IconName> = {
  wifi: 'wifi',
  pool: 'pool',
  sauna: 'sauna',
  parking: 'parking',
  balcony: 'balcony',
  breakfast: 'breakfast',
  gym: 'gym',
  pets: 'pets',
  ac: 'ac',
};

export interface CardHandlers {
  onShowMap(hotel: Hotel): void;
}

export function hotelCard(
  hotel: Hotel,
  nights: number,
  handlers: CardHandlers
): HTMLElement {
  const total = hotel.pricePerNight * nights;

  const media = h('div', { class: 'card__media' }, [photoFor(hotel)]);
  media.append(
    h('span', { class: 'card__type', text: PROPERTY_LABELS[hotel.propertyType] })
  );

  // Badges are deliberately rare — about 4% of the catalogue. The default sort
  // already floats the best properties to the top, so a looser threshold would
  // put a badge on almost every card above the fold and mean nothing.
  if (hotel.guestScore >= 9.4 && hotel.reviewCount >= 800) {
    media.append(h('span', { class: 'card__badge', text: 'Guest favourite' }));
  } else if (hotel.reviewCount >= 3200) {
    media.append(h('span', { class: 'card__badge', text: 'Popular' }));
  }

  const stars = h('span', {
    class: 'card__stars',
    'aria-label': `${hotel.stars} star classification`,
  });
  for (let i = 0; i < hotel.stars; i++) stars.append(starIcon());

  const location = h('p', { class: 'card__location' }, [
    icon('pin', 13),
    h('span', { text: `${hotel.district}, ${hotel.city}` }),
    h('span', {
      class: 'card__distance',
      text: `${fmt.distance(hotel.distanceKm)} from centre`,
    }),
  ]);

  const amenities = h('ul', { class: 'card__amenities' });
  // Four is the most that fits without wrapping on a narrow card; the rest are
  // summarised rather than truncated silently.
  for (const a of hotel.amenities.slice(0, 4)) {
    amenities.append(
      h('li', { title: AMENITY_LABELS[a] }, [
        icon(AMENITY_ICON[a], 13),
        h('span', { text: AMENITY_LABELS[a] }),
      ])
    );
  }
  if (hotel.amenities.length > 4) {
    amenities.append(
      h('li', { class: 'card__amenity-more', text: `+${hotel.amenities.length - 4} more` })
    );
  }

  const score = h('div', { class: 'card__score' }, [
    h('strong', { text: fmt.score(hotel.guestScore) }),
    h('span', {}, [
      h('span', { class: 'card__score-label', text: scoreLabel(hotel.guestScore) }),
      h('span', {
        class: 'card__reviews',
        text: `${fmt.number(hotel.reviewCount)} reviews`,
      }),
    ]),
  ]);

  const mapButton = h('button', {
    class: 'btn btn--ghost card__map',
    type: 'button',
  }, [icon('map', 14), h('span', { text: 'Map' })]);
  mapButton.addEventListener('click', () => handlers.onShowMap(hotel));

  const price = h('div', { class: 'card__price' }, [
    h('span', { class: 'card__price-label', text: 'per night' }),
    h('strong', { text: fmt.price(hotel.pricePerNight) }),
    h('span', {
      class: 'card__price-total',
      text: `${fmt.price(total)} for ${fmt.nights(nights)}`,
    }),
  ]);

  const deal = h('div', { class: 'card__deal' }, [
    price,
    h('button', { class: 'btn btn--primary', type: 'button', text: 'View deal' }),
    mapButton,
  ]);

  return h('article', { class: 'card' }, [
    media,
    h('div', { class: 'card__body' }, [
      h('div', { class: 'card__heading' }, [
        h('h3', { class: 'card__name', text: hotel.name }),
        stars,
      ]),
      location,
      amenities,
      score,
    ]),
    deal,
  ]);
}
