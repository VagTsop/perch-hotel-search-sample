import { clear, h } from '../lib/dom';
import { fmt, nightsBetween } from '../lib/format';
import type { SelectionResult } from '../lib/select';
import { SORT_LABELS, type Filters, type Hotel, type SortKey } from '../data/types';
import type { FilterStore } from '../state/store';
import { hotelCard } from './hotel-card';

const PAGE_SIZE = 12;

/**
 * Result list, sort control and empty state.
 *
 * Two things the original could not do: the "Sort by" control actually sorts
 * (it previously filtered by amenity name while claiming to sort by price or
 * rating), and the result count is announced to assistive technology when it
 * changes, so a screen-reader user learns that a filter did something.
 */
export function resultsPanel(
  store: FilterStore,
  onShowMap: (hotel: Hotel) => void
): { root: HTMLElement; render: (result: SelectionResult, filters: Filters) => void } {
  const count = h('p', { class: 'results__count' });
  const live = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });

  const sort = h('select', { id: 'sort', class: 'select' });
  for (const [value, label] of Object.entries(SORT_LABELS)) {
    sort.append(h('option', { value, text: label }));
  }
  sort.addEventListener('change', () =>
    store.patch({ sort: sort.value as SortKey })
  );

  const list = h('div', { class: 'results__list' });
  const more = h('button', {
    class: 'btn btn--ghost results__more',
    type: 'button',
    hidden: true,
  });

  let shown = PAGE_SIZE;
  let current: SelectionResult | null = null;
  let nights = 1;

  const paint = () => {
    if (!current) return;
    clear(list);

    if (!current.hotels.length) {
      list.append(
        h('div', { class: 'empty' }, [
          h('h3', { text: 'No stays match these filters' }),
          h('p', { text: 'Try widening the price range or removing an amenity.' }),
          resetButton(store),
        ])
      );
      more.hidden = true;
      return;
    }

    const page = current.hotels.slice(0, shown);
    const frag = document.createDocumentFragment();
    for (const hotel of page) {
      frag.append(hotelCard(hotel, nights, { onShowMap }));
    }
    list.append(frag);

    const remaining = current.hotels.length - page.length;
    more.hidden = remaining <= 0;
    more.textContent = remaining > 0 ? `Show ${Math.min(PAGE_SIZE, remaining)} more` : '';
  };

  more.addEventListener('click', () => {
    shown += PAGE_SIZE;
    paint();
  });

  store.subscribe(() => {
    // Any filter change returns to the first page; keeping a deep offset would
    // show page four of a two-page result set.
    shown = PAGE_SIZE;
  });

  const render = (result: SelectionResult, filters: Filters) => {
    current = result;
    nights = nightsBetween(filters.checkIn, filters.checkOut);
    sort.value = filters.sort;

    const summary =
      result.total === 0
        ? 'No stays found'
        : `${fmt.number(result.total)} ${result.total === 1 ? 'stay' : 'stays'}` +
          (result.cheapest !== null ? ` · from ${fmt.price(result.cheapest)} per night` : '');

    count.textContent = summary;
    live.textContent = summary;

    paint();
  };

  const root = h('section', { class: 'results' }, [
    h('div', { class: 'results__bar' }, [
      count,
      h('div', { class: 'results__sort' }, [
        h('label', { class: 'results__sort-label', for: 'sort', text: 'Sort by' }),
        sort,
      ]),
    ]),
    live,
    list,
    more,
  ]);

  return { root, render };
}

function resetButton(store: FilterStore): HTMLElement {
  const button = h('button', {
    class: 'btn btn--primary',
    type: 'button',
    text: 'Clear all filters',
  });
  button.addEventListener('click', () => store.reset());
  return button;
}
