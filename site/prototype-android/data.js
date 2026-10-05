// PROTOTYPE - throwaway. Loading, filtering and summarising for the Android prototype.
// Untested on purpose; the real versions belong in site/src with tests (issues #6, #15, #16, #17).
import { parseCsv } from "../src/csv.js";
import { totalRides, ridesByCity, busiestDaysByCity } from "../src/stats.js";
import { formatDay } from "../src/dates.js";

export const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DOW_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const utc = (iso) => new Date(`${iso}T00:00:00Z`);
const part = (iso, options) => utc(iso).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });

export const dowIndex = (iso) => (utc(iso).getUTCDay() + 6) % 7; // Mon = 0
export const addDays = (iso, n) => {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const weekStart = (iso) => addDays(iso, -dowIndex(iso));

// Numbers and dates both fixed to US English (issue #14).
export const num = (n) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
export const num1 = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const pct = (x) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x * 100))}%`;
export const shortDay = (iso) => part(iso, { month: "short", day: "numeric" });
export const monthShort = (iso) => part(iso, { month: "short" });
export const monthLong = (iso) => part(iso, { month: "long", year: "numeric" });
export const rangeLabel = (from, to) => `${shortDay(from)} – ${shortDay(to)}, ${to.slice(0, 4)}`;

export async function loadRows() {
  const response = await fetch("./data/rides.csv");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parseCsv(await response.text()).map((r) => ({ date: r.date, city: r.city, rides: Number(r.rides) }));
}

// What the whole file covers: drives the derived intro text and the filter controls.
export function describe(rows) {
  const dates = [...new Set(rows.map((r) => r.date))].sort();
  const cities = [...new Set(rows.map((r) => r.city))].sort();
  const months = [...new Set(dates.map((d) => d.slice(0, 7)))].map((key) => {
    const inMonth = dates.filter((d) => d.startsWith(key));
    return { key, label: monthShort(inMonth[0]), long: monthLong(inMonth[0]), from: inMonth[0], to: inMonth.at(-1) };
  });
  return { dates, cities, months, from: dates[0], to: dates.at(-1) };
}

export const EMPTY_INFO = { dates: [], cities: [], months: [], from: "", to: "" };

export function dailyTotals(rows) {
  const totals = new Map();
  for (const r of rows) totals.set(r.date, (totals.get(r.date) ?? 0) + r.rides);
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, rides]) => ({ date, rides }));
}

// Averages by day of the week for a list of { date, rides }.
function dowStats(days) {
  const sums = Array(7).fill(0);
  const counts = Array(7).fill(0);
  for (const d of days) {
    const i = dowIndex(d.date);
    sums[i] += d.rides;
    counts[i] += 1;
  }
  const mean = (indexes) => {
    const n = indexes.reduce((a, i) => a + counts[i], 0);
    return n ? indexes.reduce((a, i) => a + sums[i], 0) / n : null;
  };
  const weekday = mean([0, 1, 2, 3, 4]);
  const weekend = mean([5, 6]);
  return {
    byDow: sums.map((sum, i) => (counts[i] ? sum / counts[i] : null)),
    weekday,
    weekend,
    uplift: weekday && weekend ? weekend / weekday - 1 : null,
  };
}

export function summarize(rows) {
  const dates = [...new Set(rows.map((r) => r.date))].sort();
  const cities = [...new Set(rows.map((r) => r.city))].sort();
  const total = totalRides(rows);
  const totals = ridesByCity(rows);
  const max = Math.max(0, ...totals.map((c) => c.rides));
  const byCity = totals.map((c) => {
    const days = rows.filter((r) => r.city === c.city).length;
    return { ...c, days, perDay: c.rides / days, ofMax: max ? c.rides / max : 0, ofTotal: total ? c.rides / total : 0 };
  });
  const daily = dailyTotals(rows);
  return {
    total,
    dates,
    cities,
    days: dates.length,
    perDay: dates.length ? total / dates.length : 0,
    byCity,
    busiest: busiestDaysByCity(rows),
    daily,
    weekday: {
      all: dowStats(daily),
      byCity: Object.fromEntries(cities.map((c) => [c, dowStats(rows.filter((r) => r.city === c))])),
    },
  };
}

// Average ride count per day for each city, bucketed by day, week (Mon to Sun) or month.
// An average, not a total, so a part week at either end of the range is not understated.
export function series(rows, grain) {
  const keyOf = grain === "day" ? (d) => d : grain === "week" ? weekStart : (d) => d.slice(0, 7);
  const dates = [...new Set(rows.map((r) => r.date))].sort();
  const buckets = [];
  const index = new Map();
  for (const date of dates) {
    const key = keyOf(date);
    if (!index.has(key)) {
      index.set(key, buckets.length);
      buckets.push({ key, from: date, to: date, days: 0 });
    }
    const bucket = buckets[index.get(key)];
    bucket.to = date;
    bucket.days += 1;
  }
  for (const b of buckets) {
    b.label = grain === "month" ? monthShort(b.from) : shortDay(b.from);
    b.title =
      grain === "day" ? formatDay(b.from)
      : grain === "month" ? monthLong(b.from)
      : b.from === b.to ? shortDay(b.from)
      : `${shortDay(b.from)} – ${shortDay(b.to)}`;
  }
  const cells = {};
  for (const r of rows) {
    const cell = (cells[r.city] ??= buckets.map(() => ({ sum: 0, n: 0 })))[index.get(keyOf(r.date))];
    cell.sum += r.rides;
    cell.n += 1;
  }
  const byCity = Object.fromEntries(
    Object.entries(cells).map(([city, list]) => [city, list.map((c) => (c.n ? c.sum / c.n : null))]),
  );
  // A part week at either end holds mostly weekdays or mostly weekend days, so its average
  // reads as a false dip or spike. Keep whole weeks only when there are enough of them.
  const whole = buckets.map((b, i) => (b.days === 7 ? i : -1)).filter((i) => i >= 0);
  if (grain === "week" && whole.length >= 2 && whole.length < buckets.length) {
    return {
      buckets: whole.map((i) => buckets[i]),
      byCity: Object.fromEntries(Object.entries(byCity).map(([city, list]) => [city, whole.map((i) => list[i])])),
      wholeWeeks: true,
    };
  }
  return { buckets, byCity };
}
