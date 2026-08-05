import './styles.css';

import { loadHotels } from './data/hotels';
import { h, mustFind } from './lib/dom';
import { icon } from './lib/icons';
import { selectHotels } from './lib/select';
import { FilterStore, filtersFromUrl } from './state/store';
import { brandLockup } from './ui/brand';
import { filterPanel } from './ui/filters';
import { MapDialog } from './ui/map-dialog';
import { resultsPanel } from './ui/results';
import { searchBar } from './ui/search-bar';

const THEME_KEY = 'perch.theme';

function mountThemeToggle(): HTMLElement {
  const button = h('button', { class: 'btn btn--icon', type: 'button' });

  const paint = () => {
    const dark = document.documentElement.dataset['theme'] !== 'light';
    button.replaceChildren(icon(dark ? 'sun' : 'moon', 15));
    button.setAttribute(
      'aria-label',
      dark ? 'Switch to light theme' : 'Switch to dark theme'
    );
  };

  button.addEventListener('click', () => {
    const next =
      document.documentElement.dataset['theme'] === 'light' ? 'dark' : 'light';
    document.documentElement.dataset['theme'] = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode: the in-page theme is still correct */
    }
    paint();
  });

  paint();
  return button;
}

async function start(): Promise<void> {
  const app = mustFind('#app');
  const hotels = await loadHotels();

  const store = new FilterStore(filtersFromUrl(location.search));
  const map = new MapDialog();

  const bounds = selectHotels(hotels, store.value).priceBounds;
  const results = resultsPanel(store, (hotel) => {
    void map.open(hotel, hotels);
  });

  app.replaceChildren(
    h('header', { class: 'topbar' }, [
      brandLockup(),
      h('div', { class: 'topbar__spacer' }),
      mountThemeToggle(),
    ]),
    searchBar(store, hotels),
    h('div', { class: 'layout' }, [
      filterPanel(store, bounds),
      results.root,
    ])
  );

  const update = () => {
    const filters = store.value;
    results.render(selectHotels(hotels, filters), filters);
  };

  store.subscribe(update);
  update();
}

start().catch((error: unknown) => {
  console.error(error);
  mustFind('#app').replaceChildren(
    h('div', { class: 'empty' }, [
      h('h3', { text: 'Something went wrong' }),
      h('p', { text: 'The search could not be loaded. Please refresh the page.' }),
    ])
  );
});
