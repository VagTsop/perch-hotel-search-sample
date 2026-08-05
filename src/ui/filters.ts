import { h } from "../lib/dom";
import { fmt } from "../lib/format";
import { starIcon } from "../lib/icons";
import { CITY_NAMES } from "../data/hotels";
import {
  AMENITY_LABELS,
  PROPERTY_LABELS,
  type Amenity,
  type Filters,
  type PropertyType,
} from "../data/types";
import type { FilterStore } from "../state/store";
//
const STAR_OPTIONS = [5, 4, 3, 2] as const;
const SCORE_OPTIONS = [
  { value: 9, label: "Exceptional 9+" },
  { value: 8, label: "Excellent 8+" },
  { value: 7, label: "Very good 7+" },
  { value: 6, label: "Good 6+" },
] as const;

/**
 * Filter sidebar.
 *
 * Every control is a labelled form element in a `<fieldset>` — the original
 * used bare `<select>`s with a `<span>` floating above them, so nothing was
 * programmatically associated and one group was populated with the literal
 * options "Filter 1" through "Filter 6".
 */
export function filterPanel(
  store: FilterStore,
  bounds: { min: number; max: number },
): HTMLElement {
  const root = h("aside", { class: "filters", "aria-label": "Filters" });

  // ---- Price -------------------------------------------------------------
  const priceOut = h("output", { class: "filters__value", for: "max-price" });
  const price = h("input", {
    id: "max-price",
    class: "range",
    type: "range",
    min: bounds.min,
    max: bounds.max,
    step: 5,
  });

  const paintRange = (value: number) => {
    const pct =
      ((value - bounds.min) / Math.max(1, bounds.max - bounds.min)) * 100;
    price.style.setProperty("--fill", `${pct}%`);
    priceOut.textContent = `up to ${fmt.price(value)}`;
  };

  price.addEventListener("input", () => paintRange(Number(price.value)));
  price.addEventListener("change", () =>
    store.patch({ maxPrice: Number(price.value) }),
  );

  // ---- City --------------------------------------------------------------
  const city = h("select", { id: "city", class: "select" }, [
    h("option", { value: "", text: "Anywhere" }),
    ...CITY_NAMES.map((name) => h("option", { value: name, text: name })),
  ]);
  city.addEventListener("change", () =>
    store.patch({ city: city.value || null }),
  );

  // ---- Stars -------------------------------------------------------------
  // A segmented control rather than a row of chips: the options are mutually
  // exclusive and ordered, so they should look like one control with a moving
  // selection, not five independent toggles of differing widths.
  const starGroup = h("div", {
    class: "segmented",
    role: "group",
    "aria-label": "Minimum star rating",
  });

  const starAny = h("button", {
    class: "segmented__item",
    type: "button",
    text: "Any",
    "aria-pressed": "false",
  });
  starAny.addEventListener("click", () => store.patch({ minStars: null }));
  starGroup.append(starAny);

  const starButtons = STAR_OPTIONS.map((n) => {
    const button = h(
      "button",
      {
        class: "segmented__item",
        type: "button",
        "aria-pressed": "false",
        "aria-label": n === 5 ? "5 stars" : `${n} stars and above`,
      },
      [
        h("span", { text: String(n) }),
        starIcon(11),
        n === 5 ? null : h("span", { class: "segmented__plus", text: "+" }),
      ],
    );

    button.addEventListener("click", () => {
      const current = store.value.minStars;
      store.patch({ minStars: current === n ? null : n });
    });
    starGroup.append(button);
    return { n, button };
  });

  // ---- Guest score -------------------------------------------------------
  const scoreGroup = h("div", {
    class: "segmented",
    role: "group",
    "aria-label": "Minimum guest rating",
  });
  const scoreCaption = h("p", { class: "filters__caption" });

  const scoreAny = h("button", {
    class: "segmented__item",
    type: "button",
    text: "Any",
    "aria-pressed": "false",
  });
  scoreAny.addEventListener("click", () =>
    store.patch({ minGuestScore: null }),
  );
  scoreGroup.append(scoreAny);

  const scoreButtons = SCORE_OPTIONS.map(({ value, label }) => {
    const button = h("button", {
      class: "segmented__item",
      type: "button",
      "aria-pressed": "false",
      "aria-label": label,
      text: `${value}+`,
    });
    button.addEventListener("click", () => {
      const current = store.value.minGuestScore;
      store.patch({ minGuestScore: current === value ? null : value });
    });
    scoreGroup.append(button);
    return { value, label, button };
  });

  // ---- Property type -----------------------------------------------------
  const typeGroup = h("div", { class: "checks" });
  const typeInputs = (Object.keys(PROPERTY_LABELS) as PropertyType[]).map(
    (type) => {
      const input = h("input", {
        type: "checkbox",
        id: `type-${type}`,
        value: type,
      });
      input.addEventListener("change", () =>
        store.toggleIn("propertyTypes", type),
      );
      typeGroup.append(
        h("label", { class: "check", for: `type-${type}` }, [
          input,
          h("span", { text: PROPERTY_LABELS[type] }),
        ]),
      );
      return { type, input };
    },
  );

  // ---- Amenities ---------------------------------------------------------
  const amenityGroup = h("div", { class: "checks" });
  const amenityInputs = (Object.keys(AMENITY_LABELS) as Amenity[]).map((a) => {
    const input = h("input", {
      type: "checkbox",
      id: `amenity-${a}`,
      value: a,
    });
    input.addEventListener("change", () => store.toggleIn("amenities", a));
    amenityGroup.append(
      h("label", { class: "check", for: `amenity-${a}` }, [
        input,
        h("span", { text: AMENITY_LABELS[a] }),
      ]),
    );
    return { a, input };
  });

  root.append(
    section("Price per night", [
      h("div", { class: "filters__head" }, [priceOut]),
      price,
      h("div", { class: "range__scale" }, [
        h("span", { text: fmt.price(bounds.min) }),
        h("span", { text: fmt.price(bounds.max) }),
      ]),
    ]),
    section("City", [
      h("label", { class: "sr-only", for: "city", text: "City" }),
      city,
    ]),
    section("Star rating", [starGroup]),
    section("Guest rating", [scoreGroup, scoreCaption]),
    section("Property type", [typeGroup]),
    section("Amenities", [amenityGroup]),
  );

  const sync = (f: Filters) => {
    const value = f.maxPrice ?? bounds.max;
    price.value = String(value);
    paintRange(value);

    city.value = f.city ?? "";

    starAny.classList.toggle("is-on", f.minStars === null);
    starAny.setAttribute("aria-pressed", String(f.minStars === null));
    for (const { n, button } of starButtons) {
      const on = f.minStars === n;
      button.classList.toggle("is-on", on);
      button.setAttribute("aria-pressed", String(on));
    }

    scoreAny.classList.toggle("is-on", f.minGuestScore === null);
    scoreAny.setAttribute("aria-pressed", String(f.minGuestScore === null));
    let caption = "Any guest score";
    for (const { value: v, label, button } of scoreButtons) {
      const on = f.minGuestScore === v;
      button.classList.toggle("is-on", on);
      button.setAttribute("aria-pressed", String(on));
      if (on) caption = label;
    }
    scoreCaption.textContent = caption;
    for (const { type, input } of typeInputs) {
      input.checked = f.propertyTypes.includes(type);
    }
    for (const { a, input } of amenityInputs) {
      input.checked = f.amenities.includes(a);
    }
  };

  store.subscribe(sync);
  // Run once on mount. Without this the controls start blank while the results
  // are already filtered — which is exactly what happens when someone opens a
  // shared link carrying filters in the query string.
  sync(store.value);

  return root;
}

function section(title: string, children: (Node | string)[]): HTMLElement {
  return h("fieldset", { class: "filters__group" }, [
    h("legend", { class: "filters__legend", text: title }),
    ...children,
  ]);
}
