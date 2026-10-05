import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "../site/src/csv.js";

test("parseCsv turns a header row and data rows into objects", () => {
  const rows = parseCsv("date,city,rides\n2026-07-01,Boston,120\n2026-07-01,Miami,150\n");
  assert.deepEqual(rows, [
    { date: "2026-07-01", city: "Boston", rides: "120" },
    { date: "2026-07-01", city: "Miami", rides: "150" },
  ]);
});
