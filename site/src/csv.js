// Parse comma-separated text with a header row into an array of objects.
// Values stay as strings; callers convert numbers where they need them.
// Quoted fields are not supported; the sample data has none.
export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0 || lines[0] === "") return [];
  const header = lines[0].split(",");
  return lines
    .slice(1)
    .filter((line) => line.length > 0)
    .map((line) => {
      const cells = line.split(",");
      const row = {};
      header.forEach((name, i) => {
        row[name] = cells[i] ?? "";
      });
      return row;
    });
}
