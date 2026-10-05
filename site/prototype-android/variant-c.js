// PROTOTYPE - throwaway. Variant C: the city is the navigation (a tab per city) and one
// calendar heatmap carries both the trend and the day-of-week pattern.
import { h, put, figure, cityColor } from "./ui.js";
import { DOW, DOW_LONG, addDays, dowIndex, weekStart, monthShort, num, num1, pct, rangeLabel, summarize } from "./data.js";
import { formatDay } from "../src/dates.js";

export const name = "City calendar";

let picked = null; // the day tapped in the calendar; interface state only

export function render(ctx) {
  const { root, info, sel, set } = ctx;
  const city = sel.cities.length === 1 ? sel.cities[0] : null;
  const month = info.months.find((m) => m.from === sel.from && m.to === sel.to);
  const allDates = sel.from === info.from && sel.to === info.to;
  const tab = (label, value) =>
    h("button", { type: "button", role: "tab", "aria-selected": String(value === city), onclick: () => set({ cities: value ? [value] : [] }) }, label);
  const seg = (label, on, onclick) => h("button", { type: "button", "aria-pressed": String(on), onclick }, label);

  put(root,
    h("header", { class: "head" },
      h("div", { class: "title" }, "Rides"),
      h("div", { class: "sub" }, ctx.error ? "Ride data unavailable" : `${info.cities.length} cities · ${rangeLabel(info.from, info.to)}`)),
    h("div", { class: "tabs", role: "tablist", "data-hscroll": true }, tab("All cities", null), info.cities.map((c) => tab(c, c))),
    h("div", { class: "scroll", "data-scroll": true },
      h("div", { class: "page" },
        !ctx.error && h("div", { class: "seg", role: "group", "aria-label": "Month" },
          seg("All", allDates, () => set({ from: null, to: null })),
          info.months.map((m) => seg(m.label, month?.key === m.key, () => set({ from: m.from, to: m.to })))),
        !ctx.error && !allDates && !month && h("div", { class: "custom" },
          `Custom range: ${rangeLabel(sel.from, sel.to)}. `,
          h("button", { class: "link", type: "button", onclick: () => set({ from: null, to: null }) }, "Show all dates")),
        body(ctx, city))),
    ctx.error && h("div", { class: "snack", role: "alert" },
      "Couldn’t load ride data",
      h("button", { type: "button", onclick: ctx.retry }, "Retry")),
  );
}

function body(ctx, city) {
  const { info, sum, set, width } = ctx;
  if (ctx.error) return h("div", { class: "blank" }, "Nothing to show yet.");
  if (ctx.empty) {
    return h("div", { class: "blank" },
      "No ride counts in this selection. ",
      h("button", { class: "link", type: "button", onclick: () => set({ from: null, to: null, cities: [], state: "ok" }) }, "Show everything"));
  }
  const week = sum.weekday.all;
  const busiest = city ? sum.busiest[0] : null;
  const compare = summarize(ctx.dateRows).byCity;
  const maxPerDay = Math.max(...compare.map((c) => c.perDay));

  return [
    h("section", { class: "headline" },
      h("div", null,
        h("div", { class: "hero-label" }, city ? `Rides in ${city}` : "Rides in all cities"),
        h("div", { class: "hero-value" }, num(sum.total))),
      h("div", { class: "side" },
        h("div", null, h("strong", null, num1(sum.perDay)), "a day"),
        week.uplift != null && h("div", null, h("strong", null, pct(week.uplift)), "at weekends"))),

    figure({
      title: "Ride count by day",
      sub: "One square per day: weeks run left to right, Monday at the top",
      body: calendar(ctx, busiest, width - 32),
      table: { head: ["Day", "Rides"], rows: sum.daily.map((d) => [formatDay(d.date), num(d.rides)]) },
    }),

    h("section", { class: "fig" },
      h("div", { class: "fig-title" }, "Average ride count per day"),
      h("div", { class: "fig-sub" }, city ? `${city} against the other cities. Tap a city to open it.` : "Tap a city to open it."),
      h("div", { class: "fig-body" }, compare.map((c) => {
        // On a city tab only that city keeps its colour; the others drop back to grey.
        const color = !city || c.city === city ? cityColor(info, c.city) : "var(--deemph)";
        return h("button", { class: "cmp", type: "button", "aria-current": c.city === city ? "true" : null, onclick: () => set({ cities: [c.city] }) },
          h("span", { class: "cmp-name" }, c.city),
          h("div", { class: "hbar", style: `--share:${c.perDay / maxPerDay};background:${color}` }),
          h("span", { class: "hbar-value" }, num1(c.perDay)));
      }))),

    h("section", { class: "fig" },
      h("div", { class: "fig-title" }, city ? "Busiest day" : "Busiest day by city"),
      h("div", { class: "rows" }, sum.busiest.map((b) => h("div", { class: "row" },
        h("i", { class: "dot-key", style: `background:${cityColor(info, b.city)}` }),
        h("div", { class: "row-main" }, !city && h("div", null, b.city), b.dates.map((date) => h("div", { class: city ? null : "row-sub" }, formatDay(date)))),
        h("div", { class: "row-value" }, num(b.rides)))))),
  ];
}

function calendar(ctx, busiest, width) {
  const { info, sum, rows, set } = ctx;
  const byDate = new Map(sum.daily.map((d) => [d.date, d.rides]));
  const first = weekStart(sum.dates[0]);
  const cols = Math.round((Date.parse(weekStart(sum.dates.at(-1))) - Date.parse(first)) / 6048e5) + 1;
  const values = sum.daily.map((d) => d.rides);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const bin = (v) => (max === min ? 3 : Math.min(5, Math.floor(((v - min) / (max - min)) * 5) + 1));
  const size = Math.min(40, Math.floor((width - 30 - 36 - (cols + 1) * 2) / cols));
  const at = (row, col) => `grid-row:${row};grid-column:${col}`;

  const grid = h("div", { class: "cal", style: `grid-template-columns:28px repeat(${cols}, ${size}px) 34px` },
    h("div", { class: "cal-avg cal-head", style: at(1, cols + 2) }, "avg"),
    DOW.map((day, i) => [
      h("div", { class: i > 4 ? "cal-day strong" : "cal-day", style: at(i + 2, 1) }, day),
      h("div", { class: "cal-avg", style: at(i + 2, cols + 2) }, sum.weekday.all.byDow[i] == null ? "" : num(sum.weekday.all.byDow[i])),
    ]));

  let shownMonth = "";
  for (let col = 0; col < cols; col++) {
    const monday = addDays(first, col * 7);
    const inRange = [0, 1, 2, 3, 4, 5, 6].map((d) => addDays(monday, d)).filter((date) => byDate.has(date));
    const label = inRange.length ? monthShort(inRange.at(-1)) : shownMonth;
    if (label !== shownMonth) {
      grid.append(h("div", { class: "cal-month", style: at(1, col + 2) }, label));
      shownMonth = label;
    }
    for (const date of inRange) {
      const rides = byDate.get(date);
      const isBusiest = busiest?.dates.includes(date);
      grid.append(h("button", {
        class: isBusiest ? "cell busiest" : "cell",
        type: "button",
        style: `${at(dowIndex(date) + 2, col + 2)};background:var(--seq-${bin(rides)})`,
        "aria-label": `${formatDay(date)}: ${num(rides)} rides${isBusiest ? ", busiest day" : ""}`,
        "aria-pressed": String(date === picked),
        onclick: () => {
          picked = date === picked ? null : date;
          set({});
        },
      }));
    }
  }

  let detail;
  if (picked && byDate.has(picked)) {
    const parts = rows.filter((r) => r.date === picked);
    detail = [
      h("div", null, h("strong", null, num(byDate.get(picked))), ` rides on ${formatDay(picked)}`),
      parts.length > 1 && h("div", { class: "detail-parts" }, parts.map((r) =>
        h("span", null, h("i", { class: "dot-key", style: `background:${cityColor(info, r.city)}` }), `${r.city} ${num(r.rides)}`))),
    ];
  } else {
    detail = h("div", null, `Tap a day to see its ride count. ${DOW_LONG[bestDow(sum)]}s have the highest average ride count.`);
  }

  return [
    grid,
    h("div", { class: "scale" },
      h("span", null, num(min)),
      h("span", { class: "scale-steps" }, [1, 2, 3, 4, 5].map((k) => h("i", { style: `background:var(--seq-${k})` }))),
      h("span", null, `${num(max)} rides a day`),
      busiest && h("span", { class: "scale-mark" }, h("i", { class: "mark" }), "busiest day")),
    h("div", { class: "detail", "aria-live": "polite" }, detail),
  ];
}

function bestDow(sum) {
  const byDow = sum.weekday.all.byDow.map((v) => v ?? -1);
  return byDow.indexOf(Math.max(...byDow));
}
