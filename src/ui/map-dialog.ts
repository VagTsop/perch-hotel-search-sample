import type { Map as LeafletMap, Marker, TileLayer } from 'leaflet';

import { CITY_CENTRES } from '../data/hotels';
import { h } from '../lib/dom';
import { fmt } from '../lib/format';
import { icon } from '../lib/icons';
import type { Hotel } from '../data/types';

/**
 * Real map, in a native `<dialog>`.
 *
 * The original mounted one Bootstrap modal containing a Google Maps iframe
 * whose `src` was set once, to the first record in the file — so every hotel's
 * "View Map" button opened the same location.
 *
 * This renders actual cartography. Each property has WGS-84 coordinates derived
 * from its distance to the real city centre, so the pin and the "1.4 km from
 * centre" label on the card cannot disagree.
 *
 * Leaflet and its stylesheet are imported dynamically the first time the dialog
 * opens: the map is roughly 45 kB, and someone who never opens it should not
 * pay for it. `<dialog>` brings focus trapping, Escape-to-close and an inert
 * background for free, all of which the old modal reimplemented badly.
 */

/** CARTO basemaps, free for reasonable use, with the required attribution. */
const TILES = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
} as const;

const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

type Leaflet = typeof import('leaflet');

export class MapDialog {
  private readonly dialog = h('dialog', { class: 'mapdlg' });
  private readonly canvas = h('div', { class: 'mapdlg__canvas' });
  private readonly title = h('h2', { class: 'mapdlg__title', id: 'mapdlg-title' });
  private readonly subtitle = h('p', { class: 'mapdlg__subtitle' });

  private leaflet: Leaflet | null = null;
  private map: LeafletMap | null = null;
  private markers: Marker[] = [];
  private tiles: TileLayer | null = null;
  private tileTheme: 'dark' | 'light' | null = null;
  private loading: Promise<Leaflet> | null = null;

  constructor() {
    const close = h('button', {
      class: 'btn btn--icon mapdlg__close',
      type: 'button',
      'aria-label': 'Close map',
    }, [icon('close', 16)]);
    close.addEventListener('click', () => this.dialog.close());

    this.dialog.setAttribute('aria-labelledby', 'mapdlg-title');
    this.dialog.append(
      h('header', { class: 'mapdlg__head' }, [
        h('div', {}, [this.title, this.subtitle]),
        close,
      ]),
      this.canvas
    );

    this.dialog.addEventListener('click', (event) => {
      if (event.target === this.dialog) this.dialog.close();
    });

    // Leaflet measures the container on creation; a `<dialog>` has no layout
    // until it is shown, so the map must be told to re-measure afterwards.
    this.dialog.addEventListener('close', () => this.map?.closePopup());

    document.body.append(this.dialog);
  }

  async open(focus: Hotel, all: readonly Hotel[]): Promise<void> {
    const inCity = all.filter((x) => x.city === focus.city);

    this.title.textContent = focus.name;
    this.subtitle.textContent =
      `${focus.district}, ${focus.city} · ${fmt.distance(focus.distanceKm)} from centre` +
      (inCity.length > 1 ? ` · ${inCity.length} properties in this city` : '');

    this.dialog.showModal();

    const L = await this.load();
    this.draw(L, focus, inCity);
  }

  private load(): Promise<Leaflet> {
    this.loading ??= (async () => {
      const [L] = await Promise.all([
        import('leaflet'),
        import('leaflet/dist/leaflet.css'),
      ]);
      this.leaflet = L.default ?? (L as unknown as Leaflet);
      return this.leaflet;
    })();
    return this.loading;
  }

  private draw(L: Leaflet, focus: Hotel, hotels: readonly Hotel[]): void {
    const centre = CITY_CENTRES[focus.city] ?? { lat: focus.lat, lng: focus.lng };

    if (!this.map) {
      this.map = L.map(this.canvas, {
        center: [centre.lat, centre.lng],
        zoom: 13,
        scrollWheelZoom: false,
        attributionControl: true,
      });
    }

    // The map instance is reused across opens, so the basemap has to be
    // re-checked each time — otherwise toggling the theme leaves a dark map
    // sitting inside a light dialog.
    this.syncTiles(L);

    for (const marker of this.markers) marker.remove();
    this.markers = [];

    const cheapest = hotels.reduce((lo, x) =>
      x.pricePerNight < lo.pricePerNight ? x : lo
    );

    for (const hotel of hotels) {
      const active = hotel.id === focus.id;
      const deal = !active && hotel.id === cheapest.id;

      const marker = L.marker([hotel.lat, hotel.lng], {
        icon: L.divIcon({
          className: '',
          html: `<span class="pricepin${active ? ' pricepin--active' : ''}${deal ? ' pricepin--deal' : ''}">${fmt.price(hotel.pricePerNight)}</span>`,
          iconSize: [52, 26],
          iconAnchor: [26, 26],
        }),
        // The focused property must sit above its neighbours.
        zIndexOffset: active ? 1000 : deal ? 500 : 0,
        title: `${hotel.name} — ${fmt.price(hotel.pricePerNight)} per night`,
      });

      marker.bindPopup(
        `<strong>${escapeHtml(hotel.name)}</strong><br>${escapeHtml(hotel.district)} · ${'★'.repeat(hotel.stars)}<br>${fmt.price(hotel.pricePerNight)} per night · ${fmt.score(hotel.guestScore)}/10`
      );

      marker.addTo(this.map);
      this.markers.push(marker);
      if (active) marker.openPopup();
    }

    const bounds = L.latLngBounds(hotels.map((x) => [x.lat, x.lng]));
    this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });

    // The dialog only gains a size when shown, so re-measure on the next frame.
    requestAnimationFrame(() => this.map?.invalidateSize());
  }

  private syncTiles(L: Leaflet): void {
    if (!this.map) return;
    const theme =
      document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark';
    if (this.tileTheme === theme && this.tiles) return;

    this.tiles?.remove();
    this.tiles = L.tileLayer(TILES[theme], {
      attribution: ATTRIBUTION,
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(this.map);
    this.tileTheme = theme;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[<>&"]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : '&quot;'
  );
}
