import { clear, h } from '../lib/dom';
import { nightsBetween, parseISO, toISO, today } from '../lib/format';
import { icon } from '../lib/icons';
import type { FilterStore } from '../state/store';

/**
 * Date-range picker.
 *
 * Replaces two independent `<input type="date">` controls. Those rendered
 * differently in every browser, could not show a range, and let the user pick a
 * check-out before the check-in — the old code patched that up afterwards with
 * four chevron buttons that each re-implemented "add a day".
 *
 * One control, two months in view, the selected range highlighted, and the
 * nights count shown while choosing.
 */

const MONTH_FMT = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
const DAY_FMT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const TRIGGER_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

/** Monday-first, matching the locale this product is aimed at. */
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function dateRangeField(store: FilterStore): HTMLElement {
  const root = h('div', { class: 'field field--range daterange' });

  const summary = h('span', { class: 'daterange__dates' });
  const nightsTag = h('span', { class: 'daterange__nights' });

  const trigger = h('button', {
    class: 'field__control daterange__trigger',
    type: 'button',
    'aria-expanded': 'false',
    'aria-haspopup': 'dialog',
  }, [icon('calendar', 15), summary, nightsTag, icon('chevron-down', 14)]);

  const panel = h('div', {
    class: 'daterange__panel',
    role: 'dialog',
    'aria-label': 'Choose dates',
    hidden: true,
  });

  const grids = h('div', { class: 'daterange__months' });
  const label = h('h3', { class: 'daterange__title', 'aria-live': 'polite' });

  const prev = h('button', {
    class: 'btn btn--icon daterange__nav',
    type: 'button',
    'aria-label': 'Previous month',
  }, [icon('chevron-left', 15)]);

  const next = h('button', {
    class: 'btn btn--icon daterange__nav',
    type: 'button',
    'aria-label': 'Next month',
  }, [icon('chevron-right', 15)]);

  panel.append(
    h('header', { class: 'daterange__head' }, [prev, label, next]),
    grids,
    h('footer', { class: 'daterange__foot' }, [
      h('p', { class: 'daterange__hint', text: 'Pick a check-in date, then a check-out.' }),
    ])
  );

  root.append(
    h('label', { class: 'field__label', text: 'Dates' }),
    trigger,
    panel
  );

  // ---- state -------------------------------------------------------------
  let view = startOfMonth(store.value.checkIn);
  /** Set while the user has chosen a start but not yet an end. */
  let pendingStart: string | null = null;
  let hovered: string | null = null;

  /**
   * Day cells by ISO date, kept so hovering can repaint the range by toggling
   * classes. Rebuilding the grid on `mouseenter` destroyed the button between
   * `mousedown` and `mouseup`, so the browser never produced a `click` and the
   * second date could not be chosen with a real mouse at all.
   */
  const cells = new Map<string, HTMLButtonElement>();

  const close = () => {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    pendingStart = null;
    hovered = null;
  };

  const open = () => {
    view = startOfMonth(store.value.checkIn);
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    draw();
  };

  trigger.addEventListener('click', () => (panel.hidden ? open() : close()));

  prev.addEventListener('click', () => {
    view = shiftMonth(view, -1);
    draw();
  });
  next.addEventListener('click', () => {
    view = shiftMonth(view, 1);
    draw();
  });

  // Capture phase, deliberately. Choosing a day re-renders the grid, which
  // detaches the button that was clicked; by the time a bubbling listener ran,
  // `root.contains(target)` would be false for a node that is no longer in the
  // document at all, and the panel would close on the first click every time.
  document.addEventListener(
    'click',
    (event) => {
      if (!panel.hidden && !root.contains(event.target as Node)) close();
    },
    true
  );

  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      close();
      trigger.focus();
    }
  });

  const pick = (iso: string) => {
    if (pendingStart === null) {
      pendingStart = iso;
      hovered = null;
      paint();
      return;
    }

    // Choosing an earlier day restarts the range rather than erroring.
    if (iso <= pendingStart) {
      pendingStart = iso;
      paint();
      return;
    }

    store.patch({ checkIn: pendingStart, checkOut: iso });
    close();
  };

  /** Repaints selection state on the existing cells. Never touches the tree. */
  function paint(): void {
    const filters = store.value;
    const start = pendingStart ?? filters.checkIn;
    const end = pendingStart
      ? hovered && hovered > pendingStart
        ? hovered
        : null
      : filters.checkOut;

    for (const [iso, cell] of cells) {
      cell.classList.toggle('is-start', iso === start);
      cell.classList.toggle('is-end', end !== null && iso === end);
      cell.classList.toggle(
        'in-range',
        end !== null && iso > start && iso < end
      );
    }
  }

  function draw(): void {
    const min = today();

    label.textContent = `${MONTH_FMT.format(parseISO(view)!)} — ${MONTH_FMT.format(
      parseISO(shiftMonth(view, 1))!
    )}`;

    prev.toggleAttribute('disabled', shiftMonth(view, -1) < startOfMonth(min));

    cells.clear();
    clear(grids);
    grids.append(month(view, min), month(shiftMonth(view, 1), min));
    paint();
  }

  function month(monthIso: string, min: string): HTMLElement {
    const first = parseISO(monthIso)!;
    const grid = h('div', { class: 'cal' });

    grid.append(
      h('div', { class: 'cal__label', text: MONTH_FMT.format(first) }),
      h('div', { class: 'cal__weekdays' }, WEEKDAYS.map((d) => h('span', { text: d })))
    );

    const days = h('div', { class: 'cal__grid' });

    // Monday-first offset: getDay() returns 0 for Sunday.
    const offset = (first.getDay() + 6) % 7;
    for (let i = 0; i < offset; i++) days.append(h('span', { class: 'cal__pad' }));

    const total = daysInMonth(first);
    for (let day = 1; day <= total; day++) {
      const iso = toISO(new Date(first.getFullYear(), first.getMonth(), day));
      const disabled = iso < min;

      const cell = h('button', {
        class: 'cal__day',
        type: 'button',
        text: String(day),
        disabled,
        'aria-label': DAY_FMT.format(parseISO(iso)!),
      });

      if (iso === min) cell.classList.add('is-today');

      if (!disabled) {
        cells.set(iso, cell);
        cell.addEventListener('click', () => pick(iso));
        cell.addEventListener('mouseenter', () => {
          if (pendingStart === null) return;
          hovered = iso;
          paint();
        });
      }

      days.append(cell);
    }

    grid.append(days);
    return grid;
  }

  const syncTrigger = () => {
    const f = store.value;
    const a = parseISO(f.checkIn);
    const b = parseISO(f.checkOut);
    if (!a || !b) return;
    summary.textContent = `${TRIGGER_FMT.format(a)} – ${TRIGGER_FMT.format(b)}`;
    const n = nightsBetween(f.checkIn, f.checkOut);
    nightsTag.textContent = `${n} ${n === 1 ? 'night' : 'nights'}`;
  };

  store.subscribe(() => {
    syncTrigger();
    if (!panel.hidden) draw();
  });
  syncTrigger();

  return root;
}

function startOfMonth(iso: string): string {
  const d = parseISO(iso) ?? new Date();
  return toISO(new Date(d.getFullYear(), d.getMonth(), 1));
}

function shiftMonth(iso: string, by: number): string {
  const d = parseISO(iso)!;
  return toISO(new Date(d.getFullYear(), d.getMonth() + by, 1));
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
