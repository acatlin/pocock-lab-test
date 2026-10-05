// PROTOTYPE - throwaway. Variant A: everything in one scrolling feed of cards,
// with a sticky row of filter chips as the only control.
import { h, put, icon, figure, legend, lineChart, groupedColumns, cityColor } from "./ui.js";
import { DOW, DOW_LONG, num, num1, pct, rangeLabel, series } from "./data.js";
import { formatDay } from "../src/dates.js";

export const name = "Single feed";

export function render(ctx) {
  const { root, info } = ctx;
  put(root,
    h("header", { class: "appbar" },
      h("div", { class: "title" }, "Rides"),
      h("div", { class: "sub" }, ctx.error ? "Ride data unavailable" : `${info.cities.length} cities · ${rangeLabel(info.from, info.to)}`)),
    !ctx.error && chips(ctx),
    h("div", { class: "scroll", "data-scroll": true }, h("div", { class: "feed" }, body(ctx))),
  );
}

function chip(label, selected, onclick, color) {
  return h("button", { class: "chip", type: "button", "aria-pressed": String(selected), onclick },
    selected && icon("check", 16),
    color && h("i", { class: "dot-key", style: `background:${color}` }),
    label);
}

function chips({ info, sel, set }) {
  const allDates = sel.from === info.from && sel.to === info.to;
  const month = info.months.find((m) => m.from === sel.from && m.to === sel.to);
  const clearDates = () => set({ from: null, to: null });
  return h("div", { class: "chips", "data-hscroll": true, role: "group", "aria-label": "Filters" },
    chip("All dates", allDates, clearDates),
    // A range set in variant B that is not a whole month still has to show up here.
    !allDates && !month && chip(rangeLabel(sel.from, sel.to), true, clearDates),
    info.months.map((m) => chip(m.label, month?.key === m.key, () => (month?.key === m.key ? clearDates() : set({ from: m.from, to: m.to })))),
    h("span", { class: "chip-sep" }),
    info.cities.map((city) => {
      const on = sel.cities.includes(city);
      return chip(city, on, () => set({ cities: on ? sel.cities.filter((c) => c !== city) : [...sel.cities, city] }), cityColor(info, city));
    }));
}

function body(ctx) {
  const { info, sum, set, width } = ctx;
  if (ctx.error) {
    return h("div", { class: "banner", role: "alert" },
      icon("alert"),
      h("div", null, h("strong", null, "Couldn’t load ride data"), h("div", null, "Check your connection and try again.")),
      h("button", { class: "btn text", type: "button", onclick: ctx.retry }, "Retry"));
  }
  if (ctx.empty) {
    return h("div", { class: "fig empty" },
      h("strong", null, "No ride counts match these filters"),
      h("div", null, "Try a wider date range or another city."),
      h("button", { class: "btn filled", type: "button", onclick: () => set({ from: null, to: null, cities: [], state: "ok" }) }, "Clear filters"));
  }

  const chartWidth = width - 66; // feed padding, card padding and card border
  const colors = sum.cities.map((city) => ({ name: city, color: cityColor(info, city) }));
  const grain = sum.days <= 21 ? "day" : "week";
  const trend = series(ctx.rows, grain);
  const week = sum.weekday.all;

  return [
    h("section", { class: "hero" },
      h("div", { class: "hero-label" }, "Total rides"),
      h("div", { class: "hero-value" }, num(sum.total)),
      h("div", { class: "hero-sub" }, `${num(ctx.rows.length)} ride counts over ${num(sum.days)} days · ${num1(sum.perDay)} a day`)),

    figure({
      title: "Rides by city",
      sub: "Total, with the average ride count per day",
      body: sum.byCity.map((c) => h("div", { class: "hbar-row" },
        h("div", { class: "hbar-top" }, h("span", null, c.city), h("span", null, `${num1(c.perDay)} a day`)),
        h("div", { class: "hbar-track" },
          h("div", { class: "hbar", style: `--share:${c.ofMax};background:${cityColor(info, c.city)}` }),
          h("span", { class: "hbar-value" }, num(c.rides))))),
      table: { head: ["City", "Rides", "Per day"], rows: sum.byCity.map((c) => [c.city, num(c.rides), num1(c.perDay)]) },
    }),

    figure({
      title: "Ride counts over time",
      sub: grain === "week" ? `Average ride count per day, by ${trend.wholeWeeks ? "whole week" : "week"}` : "Ride count per day",
      body: [
        legend(colors),
        lineChart({
          width: chartWidth,
          buckets: trend.buckets,
          series: colors.map((c) => ({ ...c, values: trend.byCity[c.name] })),
          label: "Line chart of ride counts over time by city",
        }),
      ],
      table: {
        head: [grain === "week" ? "Week" : "Day", ...sum.cities],
        rows: trend.buckets.map((b, i) => [b.title, ...sum.cities.map((city) => (grain === "week" ? num1 : num)(trend.byCity[city][i]))]),
      },
    }),

    figure({
      title: "By day of the week",
      sub: "Average ride count",
      body: [
        legend(colors, "rect"),
        groupedColumns({
          width: chartWidth,
          groups: DOW.map((label, i) => ({ label, title: DOW_LONG[i], strong: i > 4 })),
          series: colors.map((c) => ({ ...c, values: sum.weekday.byCity[c.name].byDow })),
          label: "Column chart of average ride count by day of the week and city",
        }),
      ],
      note: week.uplift != null &&
        `Across the selected cities a Saturday or Sunday averages ${num1(week.weekend)} rides, against ${num1(week.weekday)} from Monday to Friday (${pct(week.uplift)}).`,
      table: {
        head: ["Day", ...sum.cities],
        rows: DOW_LONG.map((day, i) => [day, ...sum.cities.map((city) => {
          const v = sum.weekday.byCity[city].byDow[i];
          return v == null ? "–" : num1(v);
        })]),
      },
    }),

    figure({
      title: "Busiest day by city",
      body: h("div", { class: "rows" }, sum.busiest.map((b) => h("div", { class: "row" },
        h("i", { class: "dot-key", style: `background:${cityColor(info, b.city)}` }),
        h("div", { class: "row-main" }, h("div", null, b.city), b.dates.map((date) => h("div", { class: "row-sub" }, formatDay(date)))),
        h("div", { class: "row-value" }, num(b.rides))))),
    }),
  ];
}
