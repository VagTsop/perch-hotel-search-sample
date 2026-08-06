# Perch — Hotel Search

A hotel search interface built in **dependency-free TypeScript**. No framework,
no jQuery, no CSS library, no icon font: **14 kB gzipped** for the whole
application.

**[Live demo](https://vagtsop.github.io/perch-hotel-search-sample/)**

---

## What it does

- **Search** across hotel names, cities and districts, with an accessible
  combobox for suggestions
- **Filter** by price, city, star rating, guest score, property type and
  amenities — all combinable
- **Sort** by price, guest rating, star rating, distance, or a blended
  "recommended" score
- **Share** any result set: every filter is mirrored into the URL, and the back
  button undoes the last change
- **Map** view drawn from each property's own coordinates, in a native
  `<dialog>`

## Why it was rebuilt

This started as a small jQuery sample. The rewrite fixed behaviour, not just
appearance.

| | Before | After |
|---|---|---|
| Sorting | The "Sort by" control filtered by amenity name. It never sorted. | Six real sort orders, unit-tested |
| Filtering | Read prices back out of the DOM (`$(".price").text()`), stripped the currency symbol, toggled node visibility | Pure functions over typed data; the DOM is told what to draw |
| Star filter | Exact match — asking for 4 stars hid every 5-star hotel | "At least", as the control implies |
| Map | One iframe whose `src` was set once, to the first record, so every hotel opened the same map | Real cartography, every property at its own coordinates, lazy-loaded |
| Catalogue | 4 records, two sharing a name, photos hotlinked from four other companies (one already 404, one plain HTTP) | 180 generated properties, deterministic, with 56 bundled photographs |
| Dates | Two `<input type="date">` plus four chevron buttons that each re-implemented "add a day"; check-out could precede check-in | One range picker, two months in view, nights counted live |
| Dependencies | jQuery, Bootstrap CSS + JS, Popper, Font Awesome (76 kB CSS + 15 font files) | None |
| State | Lived in the DOM; nothing was shareable | One store, mirrored to the URL |
| Accessibility | Unlabelled inputs, `div`-based suggestion list, `keyCode` handlers | Labelled controls, ARIA combobox, live result count, native dialog |

The old demo also shipped placeholder content: a "More Filters" group whose
options were literally `Filter 1` … `Filter 6`, and a stray
`<img data-src="THUMBNAIL_URL">` pointing at a file that was not in the
repository.

## Build output

```
dist/index.html    1.15 kB │ gzip:  0.63 kB
dist/index.css    16.21 kB │ gzip:  4.09 kB
dist/index.js     30.30 kB │ gzip: 11.46 kB
                            ────────────────
                             total 16.18 kB
```

Photographs add 1.5 MB to the repository but nothing to the initial load: they
are `loading="lazy"`, so only the cards in view fetch one.

## Architecture

```
src/
  data/
    types.ts        Domain model
    hotels.ts       Seeded generator — swap for an API, nothing else changes
  lib/
    select.ts       Filtering and sorting: pure, testable, no DOM
    select.spec.ts  21 unit tests
    format.ts       Intl formatters, date maths
    dom.ts          Element factory (no innerHTML anywhere)
    icons.ts        Inline SVG set
    photo.ts        Type-matched photograph, chosen per hotel id
  state/
    store.ts        Observable filters, mirrored to the query string
  ui/
    search-bar.ts   Destination combobox, dates, guests
    date-range.ts   Two-month range picker
    filters.ts      Sidebar
    results.ts      List, sort, empty state, paging
    hotel-card.ts   Result card
    map-dialog.ts   City map
  main.ts
  styles.css        Design tokens, light and dark
```

### Notes on a few decisions

**Filtering never touches the DOM.** `selectHotels(hotels, filters)` takes data
and returns data. That is what makes the behaviour testable without a browser,
and it is the single largest difference from the original.

**No `innerHTML`.** Every node is built through a small `h()` helper that sets
`textContent`, so a hotel name or search term can never inject markup.

**Photographs are bundled, not hotlinked.** 56 Unsplash images, downloaded
once, cropped and re-encoded to WebP at the size the card actually renders
(640×480, ~28 kB each). Each property draws from the pool matching its type, so
a hostel never shows a beach resort, and the choice is derived from the hotel id
so a property keeps its photograph across reloads. Nothing depends on a third
party at runtime, so nothing can 404 the way the original's images already have.

**Dates are parsed as local.** `new Date('2026-08-05')` is parsed as UTC and
silently shifts the day for anyone west of Greenwich; `parseISO` avoids that.

## Getting started

```bash
npm install
npm run dev
```

```bash
npm run build    # type-check, then bundle
npm test         # 21 unit tests
```

## Data and image credits

Every property, price and review count is generated in the browser from a fixed
seed. Nothing here describes a real hotel, and no real brand is referenced.

The photographs in `public/photos/` come from [Unsplash](https://unsplash.com)
and are used under the [Unsplash Licence](https://unsplash.com/license), which
permits commercial use without permission or attribution. They are illustrative
only — no photograph depicts the invented property it is shown against.

## Tech

TypeScript 5.8 (strict, `noUncheckedIndexedAccess`) · Vite 7 · Vitest 3
