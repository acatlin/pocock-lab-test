// PROTOTYPE - throwaway. Variant B: a bottom navigation bar with one question per screen,
// and every filter in a bottom sheet (including a free date range).
import { h, put, icon, figure, lineChart, cityColor } from "./ui.js";
import { DOW_LONG, num, num1, pct, rangeLabel, shortDay, series } from "./data.js";
import { formatDay } from "../src/dates.js";

export const name = "Bottom navigation";

const TABS = [
  { key: "overview", label: "Overview", icon: "grid" },
  { key: "trend", label: "Trend", icon: "trend" },
  { key: "weekdays", label: "Weekdays", icon: "bars" },
  { key: "busiest", label: "Busiest", icon: "star" },
];
const SCREENS = { overview, trend, weekdays, busiest };
const GRAINS = [
  { key: "day", label: "Day", sub: "Ride count per day" },
  { key: "week", label: "Week", sub: "Average ride count per day, by week" },
  { key: "month", label: "Month", sub: "Average ride count per day, by month" },
];

let sheetOpen = false; // interface state only, so it is not in the URL

export function render(ctx) {
  const { root, q, set, info, sel } = ctx;
  const tab = TABS.find((t) => t.key === q.tab) ?? TABS[0];
  const allDates = sel.from === info.from && sel.to === info.to;
  const month = info.months.find((m) => m.from === sel.from && m.to === sel.to);
  const active = (allDates ? 0 : 1) + (sel.cities.length ? 1 : 0);
  const openSheet = () => {
    sheetOpen = true;
    set({});
  };
  const closeSheet = () => {
    sheetOpen = false;
    set({});
  };
  const dateText = allDates ? "All dates" : month ? month.long : rangeLabel(sel.from, sel.to);
  const cityText = sel.cities.length ? sel.cities.join(", ") : "All cities";

  let content;
  if (ctx.error) {
    content = h("div", { class: "center", role: "alert" },
      h("div", { class: "center-icon" }, icon("alert", 40)),
      h("strong", null, "Couldn’t load ride data"),
      h("div", null, "Check your connection and try again."),
      h("button", { class: "btn filled", type: "button", onclick: ctx.retry }, "Retry"));
  } else if (ctx.empty) {
    content = h("div", { class: "center" },
      h("strong", null, "No ride counts match these filters"),
      h("div", null, `${dateText} · ${cityText}`),
      h("button", { class: "btn filled", type: "button", onclick: openSheet }, "Edit filters"),
      h("button", { class: "btn text", type: "button", onclick: () => set({ from: null, to: null, cities: [], state: "ok" }) }, "Reset"));
  } else {
    content = h("div", { class: "scroll", "data-scroll": true }, h("div", { class: "page" }, SCREENS[tab.key](ctx)));
  }

  put(root,
    h("header", { class: "appbar" },
      h("div", { class: "title" }, tab.label),
      !ctx.error && h("button", { class: "icon-btn", type: "button", "aria-label": `Filters, ${active} active`, onclick: openSheet },
        icon("filter"), active > 0 && h("span", { class: "badge" }, active))),
    !ctx.error && h("button", { class: "summary", type: "button", onclick: openSheet }, `${dateText} · ${cityText}`),
    content,
    h("nav", { class: "nav", "aria-label": "Sections" },
      TABS.map((t) => h("button", { type: "button", "aria-current": t.key === tab.key ? "page" : null, onclick: () => set({ tab: t.key }) },
        h("span", { class: "pill" }, icon(t.icon, 22)), t.label))),
    sheetOpen && !ctx.error && sheet(ctx, { allDates, month, closeSheet }),
  );
}

function tile(label, value, sub) {
  return h("div", { class: "tile" },
    h("div", { class: "tile-label" }, label), h("div", { class: "tile-value" }, value), h("div", { class: "tile-sub" }, sub));
}

function overview({ info, sum }) {
  const top = [...sum.busiest].sort((a, b) => b.rides - a.rides)[0];
  const week = sum.weekday.all;
  return [
    h("div", { class: "tiles" },
      tile("Total rides", num(sum.total), `${num(sum.days)} days`),
      tile("Average per day", num1(sum.perDay), sum.cities.length > 1 ? `${sum.cities.length} cities together` : sum.cities[0]),
      tile("Weekend difference", week.uplift == null ? "–" : pct(week.uplift), "Sat–Sun against Mon–Fri"),
      tile("Highest ride count", num(top.rides), `${top.city} · ${top.dates.map(shortDay).join(", ")}`)),
    figure({
      title: "Rides by city",
      sub: "Share of total rides",
      body: [
        h("div", { class: "share", role: "img", "aria-label": "Stacked bar of each city’s share of total rides" },
          sum.byCity.map((c) => h("div", { style: `flex:${c.rides} 1 0;background:${cityColor(info, c.city)}`, title: `${c.city}: ${num(c.rides)}` }))),
        h("div", { class: "share-legend" }, sum.byCity.map((c) => h("div", { class: "share-row" },
          h("i", { class: "rect-key", style: `background:${cityColor(info, c.city)}` }),
          h("span", null, c.city),
          h("strong", null, num(c.rides)),
          h("span", { class: "share-pct" }, `${Math.round(c.ofTotal * 100)}%`)))),
      ],
    }),
  ];
}

function trend({ info, sum, rows, q, set, width }) {
  const grain = GRAINS.find((g) => g.key === q.grain) ?? GRAINS[1];
  const data = series(rows, grain.key);
  const yMax = Math.max(...Object.values(data.byCity).flat().filter((v) => v != null));
  const value = grain.key === "day" ? num : num1;
  return [
    h("div", { class: "seg", role: "group", "aria-label": "Group by" },
      GRAINS.map((g) => h("button", { type: "button", "aria-pressed": String(g.key === grain.key), onclick: () => set({ grain: g.key }) },
        g.key === grain.key && icon("check", 16), g.label))),
    // One small chart per city on a shared scale, so each line is readable on its own.
    sum.byCity.map((c) => figure({
      title: c.city,
      sub: `${data.wholeWeeks ? "Average ride count per day, by whole week" : grain.sub} · ${num1(c.perDay)} a day overall`,
      body: lineChart({
        width: width - 32,
        height: 132,
        buckets: data.buckets,
        series: [{ name: c.city, color: cityColor(info, c.city), values: data.byCity[c.city] }],
        endLabels: false,
        area: true,
        yMax,
        label: `Line chart of ride counts over time for ${c.city}`,
      }),
      table: { head: [grain.label, "Ride count"], rows: data.buckets.map((b, i) => [b.title, value(data.byCity[c.city][i])]) },
    })),
  ];
}

function weekdays({ info, sum }) {
  const stats = sum.cities.map((city) => ({ city, ...sum.weekday.byCity[city] }));
  const max = Math.max(...stats.flatMap((s) => [s.weekday ?? 0, s.weekend ?? 0]));
  const bar = (label, v, color) => h("div", { class: "pair-bar" },
    h("span", { class: "pair-label" }, label),
    v == null
      ? h("span", { class: "pair-none" }, "No days in range")
      : [h("div", { class: "hbar", style: `--share:${v / max};background:${color}` }), h("span", { class: "hbar-value" }, num1(v))]);
  const cell = (v) => (v == null ? "–" : num1(v));
  return [
    figure({
      title: "Weekdays against weekends",
      sub: "Average ride count per day",
      body: stats.map((s) => h("div", { class: "pair" },
        h("div", { class: "pair-head" }, h("span", null, s.city), s.uplift != null && h("span", null, `${pct(s.uplift)} at weekends`)),
        bar("Mon–Fri", s.weekday, "var(--deemph)"),
        bar("Sat–Sun", s.weekend, cityColor(info, s.city)))),
    }),
    h("section", { class: "fig" },
      h("div", { class: "fig-title" }, "Each day of the week"),
      h("div", { class: "fig-sub" }, "Average ride count"),
      h("table", { class: "tbl week-tbl" },
        h("thead", null, h("tr", null, h("th", { scope: "col" }, "Day"), sum.cities.map((city) => h("th", { scope: "col" }, city)))),
        h("tbody", null, DOW_LONG.map((day, i) => h("tr", { class: i > 4 ? "weekend" : null },
          h("th", { scope: "row" }, day), stats.map((s) => h("td", null, cell(s.byDow[i])))))))),
  ];
}

function busiest({ info, sum }) {
  return sum.busiest.map((b) => {
    const perDay = sum.byCity.find((c) => c.city === b.city).perDay;
    return h("section", { class: "busy" },
      h("div", { class: "busy-city" }, h("i", { class: "dot-key", style: `background:${cityColor(info, b.city)}` }), b.city),
      h("div", { class: "busy-line" },
        h("div", { class: "busy-dates" }, b.dates.map((date) => h("div", null, formatDay(date)))),
        h("div", { class: "busy-value" }, num(b.rides))),
      h("div", { class: "busy-sub" }, `${pct(b.rides / perDay - 1)} against this city’s average day of ${num1(perDay)}`));
  });
}

function sheet({ info, sel, set, rows }, { allDates, month, closeSheet }) {
  const option = (label, on, onclick, role, color) =>
    h("button", { class: "opt", type: "button", role, "aria-checked": String(on), onclick },
      h("span", { class: "opt-check" }, on && icon("check", 20)),
      color && h("i", { class: "dot-key", style: `background:${color}` }),
      label);
  return [
    h("div", { class: "scrim", onclick: closeSheet }),
    h("div", { class: "sheet", role: "dialog", "aria-label": "Filters" },
      h("div", { class: "sheet-handle" }),
      h("div", { class: "sheet-body" },
        h("h3", null, "Dates"),
        option("All dates", allDates, () => set({ from: null, to: null }), "radio"),
        info.months.map((m) => option(m.long, month?.key === m.key, () => set({ from: m.from, to: m.to }), "radio")),
        h("div", { class: "dates" },
          h("label", null, "From", h("input", { type: "date", value: sel.from, min: info.from, max: info.to, onchange: (e) => e.target.value && set({ from: e.target.value }) })),
          h("label", null, "To", h("input", { type: "date", value: sel.to, min: info.from, max: info.to, onchange: (e) => e.target.value && set({ to: e.target.value }) }))),
        h("h3", null, "Cities"),
        info.cities.map((city) => {
          const on = sel.cities.includes(city);
          return option(city, on, () => set({ cities: on ? sel.cities.filter((c) => c !== city) : [...sel.cities, city] }), "checkbox", cityColor(info, city));
        }),
        h("div", { class: "sheet-hint" }, "No city ticked means all cities.")),
      h("div", { class: "sheet-foot" },
        h("button", { class: "btn text", type: "button", onclick: () => set({ from: null, to: null, cities: [] }) }, "Reset"),
        h("button", { class: "btn filled", type: "button", onclick: closeSheet }, `Show ${num(rows.length)} ride counts`))),
  ];
}
