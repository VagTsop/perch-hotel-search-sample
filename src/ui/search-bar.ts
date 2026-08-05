import { clear, debounce, h } from '../lib/dom';
import { icon } from '../lib/icons';
import { suggest } from '../lib/select';
import type { FilterStore } from '../state/store';
import type { Hotel } from '../data/types';
import { dateRangeField } from './date-range';

/**
 * Destination + dates + guests.
 *
 * The suggestion list is a real ARIA combobox: arrow keys move an
 * `aria-activedescendant`, Enter commits, Escape dismisses, and the input keeps
 * focus throughout. The original built a plain `<div>` list, tracked the
 * highlighted item in a module-level variable shared by every instance, and
 * used `keyCode`, so it was unusable with a screen reader and broke on the
 * second field.
 */
export function searchBar(store: FilterStore, hotels: readonly Hotel[]): HTMLElement {
  const input = h('input', {
    id: 'destination',
    class: 'field__input',
    type: 'text',
    role: 'combobox',
    autocomplete: 'off',
    'aria-expanded': 'false',
    'aria-controls': 'destination-listbox',
    'aria-autocomplete': 'list',
    placeholder: 'City, district or hotel',
  });

  const listbox = h('ul', {
    id: 'destination-listbox',
    class: 'combo__list',
    role: 'listbox',
    hidden: true,
  });

  let options: HTMLElement[] = [];
  let active = -1;

  const closeList = () => {
    listbox.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
    options = [];
    clear(listbox);
  };

  const setActive = (next: number) => {
    if (!options.length) return;
    const index = (next + options.length) % options.length;
    options.forEach((o, i) => o.classList.toggle('is-active', i === index));
    const chosen = options[index]!;
    input.setAttribute('aria-activedescendant', chosen.id);
    chosen.scrollIntoView({ block: 'nearest' });
    active = index;
  };

  const commit = (value: string) => {
    input.value = value;
    closeList();
    store.patch({ query: value });
  };

  const openList = () => {
    const matches = suggest(hotels, input.value);
    clear(listbox);

    if (!matches.length) {
      closeList();
      return;
    }

    options = matches.map((m, i) =>
      h('li', {
        id: `destination-option-${i}`,
        class: 'combo__option',
        role: 'option',
        'aria-selected': 'false',
      }, [
        icon(m.kind === 'hotel' ? 'pin' : 'search', 13),
        h('span', { text: m.value }),
        h('span', { class: 'combo__kind', text: m.kind }),
      ])
    );

    options.forEach((option, i) => {
      // `mousedown` rather than `click`: the input must not blur first.
      option.addEventListener('mousedown', (event) => {
        event.preventDefault();
        commit(matches[i]!.value);
      });
      listbox.append(option);
    });

    listbox.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  const search = debounce(() => {
    store.patch({ query: input.value });
    openList();
  }, 180);

  input.addEventListener('input', search);

  input.addEventListener('keydown', (event) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (listbox.hidden) openList();
        else setActive(active + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive(active - 1);
        break;
      case 'Enter':
        if (active > -1 && options[active]) {
          event.preventDefault();
          commit(options[active]!.textContent?.replace(/(city|district|hotel)$/, '') ?? '');
        }
        break;
      case 'Escape':
        closeList();
        break;
    }
  });

  input.addEventListener('blur', () => setTimeout(closeList, 120));

  const guests = h('select', { id: 'guests', class: 'field__input' });
  for (let n = 1; n <= 8; n++) {
    guests.append(
      h('option', { value: n, text: `${n} ${n === 1 ? 'guest' : 'guests'}` })
    );
  }
  guests.addEventListener('change', () =>
    store.patch({ guests: Number(guests.value) })
  );

  const clearBtn = h('button', {
    class: 'btn btn--ghost',
    type: 'button',
    text: 'Reset',
  });
  clearBtn.addEventListener('click', () => store.reset());

  store.subscribe((f) => {
    if (document.activeElement !== input) input.value = f.query;
    guests.value = String(f.guests);
  });

  const initial = store.value;
  input.value = initial.query;
  guests.value = String(initial.guests);

  return h('form', { class: 'searchbar', role: 'search' }, [
    h('div', { class: 'field field--grow combo' }, [
      h('label', { class: 'field__label', for: 'destination', text: 'Destination' }),
      h('div', { class: 'field__control' }, [icon('search', 15), input]),
      listbox,
    ]),
    dateRangeField(store),
    h('div', { class: 'field' }, [
      h('label', { class: 'field__label', for: 'guests', text: 'Guests' }),
      h('div', { class: 'field__control' }, [icon('users', 15), guests]),
    ]),
    clearBtn,
  ]);
}
