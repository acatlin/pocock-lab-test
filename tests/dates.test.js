import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDay } from "../site/src/dates.js";

test("formatDay gives an ISO date as weekday, month, day and year", () => {
  assert.equal(formatDay("2026-08-23"), "Sun, Aug 23, 2026");
});

test("formatDay shows the calendar day in the data whatever the machine's timezone", (t) => {
  const original = process.env.TZ;
  t.after(() => {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  });
  // The two ends of the timezone range: UTC-10 and UTC+14.
  for (const timeZone of ["Pacific/Honolulu", "Pacific/Kiritimati"]) {
    process.env.TZ = timeZone;
    assert.equal(formatDay("2026-08-23"), "Sun, Aug 23, 2026");
  }
});
