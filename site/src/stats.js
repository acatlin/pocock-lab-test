// Summaries of ride rows: [{ date, city, rides }, ...] with rides as strings or numbers.

export function totalRides(rows) {
  return rows.reduce((sum, row) => sum + Number(row.rides), 0);
}

// Total rides per city, sorted by city name.
export function ridesByCity(rows) {
  const totals = new Map();
  for (const row of rows) {
    totals.set(row.city, (totals.get(row.city) ?? 0) + Number(row.rides));
  }
  return [...totals.entries()]
    .map(([city, rides]) => ({ city, rides }))
    .sort((a, b) => a.city.localeCompare(b.city));
}

// Each city's busiest days: the dates on which its ride count is highest.
export function busiestDaysByCity(rows) {
  const busiest = new Map();
  for (const row of rows) {
    const rides = Number(row.rides);
    const current = busiest.get(row.city);
    if (!current || rides > current.rides) {
      busiest.set(row.city, { city: row.city, dates: [row.date], rides });
    } else if (rides === current.rides) {
      current.dates.push(row.date);
    }
  }
  for (const entry of busiest.values()) entry.dates.sort();
  return [...busiest.values()].sort((a, b) => a.city.localeCompare(b.city));
}
