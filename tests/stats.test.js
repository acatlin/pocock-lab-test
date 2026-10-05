import { test } from "node:test";
import assert from "node:assert/strict";
import { totalRides, ridesByCity, busiestDaysByCity } from "../site/src/stats.js";

const rows = [
  { date: "2026-07-01", city: "Miami", rides: "10" },
  { date: "2026-07-01", city: "Boston", rides: "20" },
  { date: "2026-07-02", city: "Boston", rides: 30 },
];

test("totalRides sums the rides column", () => {
  assert.equal(totalRides(rows), 60);
});

test("ridesByCity totals per city in alphabetical order", () => {
  assert.deepEqual(ridesByCity(rows), [
    { city: "Boston", rides: 50 },
    { city: "Miami", rides: 10 },
  ]);
});

test("busiestDaysByCity gives a city's busiest day and its ride count", () => {
  const rows = [
    { date: "2026-07-01", city: "Boston", rides: 20 },
    { date: "2026-07-02", city: "Boston", rides: 35 },
    { date: "2026-07-03", city: "Boston", rides: 30 },
  ];
  assert.deepEqual(busiestDaysByCity(rows), [
    { city: "Boston", dates: ["2026-07-02"], rides: 35 },
  ]);
});

test("busiestDaysByCity lists every busiest day, earliest first, when the highest ride count repeats", () => {
  const rows = [
    { date: "2026-07-04", city: "Boston", rides: 35 },
    { date: "2026-07-01", city: "Boston", rides: 20 },
    { date: "2026-07-02", city: "Boston", rides: 35 },
  ];
  assert.deepEqual(busiestDaysByCity(rows), [
    { city: "Boston", dates: ["2026-07-02", "2026-07-04"], rides: 35 },
  ]);
});

test("busiestDaysByCity returns cities in alphabetical order regardless of row order", () => {
  const rows = [
    { date: "2026-07-01", city: "Miami", rides: 50 },
    { date: "2026-07-01", city: "Denver", rides: 15 },
    { date: "2026-07-02", city: "Boston", rides: 40 },
    { date: "2026-07-02", city: "Denver", rides: 25 },
    { date: "2026-07-02", city: "Miami", rides: 45 },
  ];
  assert.deepEqual(busiestDaysByCity(rows), [
    { city: "Boston", dates: ["2026-07-02"], rides: 40 },
    { city: "Denver", dates: ["2026-07-02"], rides: 25 },
    { city: "Miami", dates: ["2026-07-01"], rides: 50 },
  ]);
});

test("busiestDaysByCity compares ride counts as numbers when they arrive as strings", () => {
  const rows = [
    { date: "2026-07-01", city: "Boston", rides: "9" },
    { date: "2026-07-02", city: "Boston", rides: "10" },
    { date: "2026-07-03", city: "Boston", rides: 10 },
  ];
  assert.deepEqual(busiestDaysByCity(rows), [
    { city: "Boston", dates: ["2026-07-02", "2026-07-03"], rides: 10 },
  ]);
});

test("busiestDaysByCity returns an empty list when there are no rows", () => {
  assert.deepEqual(busiestDaysByCity([]), []);
});
