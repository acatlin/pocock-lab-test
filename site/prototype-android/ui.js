// PROTOTYPE - throwaway. DOM helpers and chart primitives shared by the three variants.
// Layout is deliberately not shared: each variant arranges these however it likes.
import { num, num1 } from "./data.js";

const SVG = "http://www.w3.org/2000/svg";

function build(node, props, kids) {
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : value);
  }
  node.append(
    ...kids
      .flat(Infinity)
      .filter((kid) => kid != null && kid !== false)
      .map((kid) => (typeof kid === "number" ? String(kid) : kid)),
  );
  return node;
}

// Children are appended as text nodes or elements, never parsed as HTML.
export const h = (tag, props, ...kids) => build(document.createElement(tag), props, kids);
export const s = (tag, props, ...kids) => build(document.createElementNS(SVG, tag), props, kids);
// Append to an existing node with the same filtering (false and null children are skipped).
export const put = (node, ...kids) => build(node, null, kids);

const ICONS = {
  filter: ["M3 6h18", "M6 12h12", "M10 18h4"],
  grid: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  trend: ["M3 17l6-6 4 4 8-8"],
  bars: ["M5 20V10", "M12 20V4", "M19 20v-7"],
  star: ["M12 3l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.9 6.4 20l1.3-6.2L3 9.5l6.3-.7z"],
  table: ["M3 5h18v14H3z", "M3 10h18", "M3 15h18", "M9 5v14"],
  check: ["M5 12l5 5 9-10"],
  close: ["M6 6l12 12", "M18 6L6 18"],
  alert: ["M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z", "M12 7.5v5.5", "M12 16.4v.2"],
};

export const icon = (name, size = 24) =>
  s("svg", { class: "ico", width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": "true" },
    ICONS[name].map((d) => s("path", { d })));

// A city keeps its colour whatever the filters are: the slot comes from the whole file.
export const cityColor = (info, city) => `var(--series-${info.cities.indexOf(city) + 1})`;

const auto = (v) => (Number.isInteger(v) ? num(v) : num1(v));

export function legend(items, kind = "line") {
  return h("div", { class: "legend" },
    items.map((item) => h("span", null, h("i", { class: `${kind}-key`, style: `background:${item.color}` }), item.name)));
}

export function dataTable({ head, rows }) {
  return h("div", { class: "tbl-wrap" },
    h("table", { class: "tbl" },
      h("thead", null, h("tr", null, head.map((text) => h("th", { scope: "col" }, text)))),
      h("tbody", null, rows.map((row) => h("tr", null, row.map((text, i) => h(i === 0 ? "th" : "td", i === 0 ? { scope: "row" } : null, text)))))));
}

// A titled chart with a table view behind a toggle.
export function figure({ title, sub, body, table, note }) {
  const chart = [body].flat();
  const holder = h("div", { class: "fig-body" }, chart);
  let tableNode = null;
  let showing = false;
  const toggle = table && h("button", {
    class: "icon-btn",
    type: "button",
    "aria-label": `${title}: show as table`,
    "aria-pressed": "false",
    onclick: () => {
      showing = !showing;
      tableNode ??= dataTable(table);
      holder.replaceChildren(...(showing ? [tableNode] : chart));
      toggle.setAttribute("aria-pressed", String(showing));
      toggle.replaceChildren(icon(showing ? "trend" : "table", 20));
    },
  }, icon("table", 20));
  return h("figure", { class: "fig" },
    h("figcaption", { class: "fig-head" },
      h("div", null, h("div", { class: "fig-title" }, title), sub && h("div", { class: "fig-sub" }, sub)),
      toggle),
    holder,
    note && h("div", { class: "fig-note" }, note));
}

function niceScale(max) {
  const raw = Math.max(max, 1) / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let t = 0; t <= top + step / 2; t += step) ticks.push(t);
  return { ticks, top };
}

function tooltip() {
  const node = h("div", { class: "tip", hidden: true });
  return {
    node,
    show(title, rows, x, width) {
      node.replaceChildren(
        h("div", { class: "tip-title" }, title),
        ...rows.map((row) => h("div", { class: "tip-row" },
          h("i", { class: "line-key", style: `background:${row.color}` }), h("strong", null, row.value), h("span", null, row.name))));
      node.hidden = false;
      node.style.left = `${x}px`;
      node.style.transform = x > width / 2 ? "translateX(calc(-100% - 10px))" : "translateX(10px)";
    },
    hide() { node.hidden = true; },
  };
}

// buckets: [{ label, title }], series: [{ name, color, values }] with one value per bucket.
export function lineChart({ width, height = 190, buckets, series, endLabels = true, area = false, yMax, label }) {
  const n = buckets.length;
  const m = { l: 30, r: endLabels ? 58 : 10, t: 10, b: 22 };
  const pw = width - m.l - m.r;
  const ph = height - m.t - m.b;
  const { ticks, top } = niceScale(yMax ?? Math.max(...series.flatMap((sr) => sr.values.filter((v) => v != null))));
  const x = (i) => m.l + (n === 1 ? pw / 2 : (i / (n - 1)) * pw);
  const y = (v) => m.t + ph - (v / top) * ph;
  const svg = s("svg", { width, height, viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": label });

  for (const t of ticks) {
    svg.append(
      s("line", { x1: m.l, x2: m.l + pw, y1: y(t), y2: y(t), class: t === 0 ? "axis" : "grid" }),
      s("text", { x: m.l - 6, y: y(t) + 3.5, class: "tick", "text-anchor": "end" }, num(t)));
  }
  const labelled = n <= 4 ? [...Array(n).keys()] : [...new Set([0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1])];
  for (const i of labelled) {
    const anchor = n === 1 ? "middle" : i === 0 ? "start" : i === n - 1 ? "end" : "middle";
    svg.append(s("text", { x: x(i), y: height - 6, class: "tick", "text-anchor": anchor }, buckets[i].label));
  }

  const ends = [];
  for (const sr of series) {
    const pts = sr.values.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean);
    if (!pts.length) continue;
    const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
    if (area && pts.length > 1) {
      svg.append(s("path", { d: `${d}L${pts.at(-1)[0].toFixed(1)} ${y(0)}L${pts[0][0].toFixed(1)} ${y(0)}Z`, style: `fill:${sr.color}`, opacity: 0.1 }));
    }
    svg.append(s("path", { d, class: "line", style: `stroke:${sr.color}` }));
    for (const p of n <= 6 ? pts : [pts.at(-1)]) svg.append(s("circle", { cx: p[0], cy: p[1], r: 4, class: "dot", style: `fill:${sr.color}` }));
    ends.push({ name: sr.name, y: pts.at(-1)[1] });
  }
  // End labels only when they do not collide; the legend carries identity otherwise.
  const sorted = [...ends].sort((a, b) => a.y - b.y);
  if (endLabels && sorted.every((e, i) => i === 0 || e.y - sorted[i - 1].y >= 12)) {
    for (const e of ends) svg.append(s("text", { x: m.l + pw + 8, y: e.y + 4, class: "end-label" }, e.name));
  }

  const cross = s("line", { class: "cross", y1: m.t, y2: m.t + ph, visibility: "hidden" });
  const dots = series.map((sr) => s("circle", { r: 4, class: "dot", style: `fill:${sr.color}`, visibility: "hidden" }));
  const hit = s("rect", { x: m.l - 10, y: 0, width: pw + 20, height, fill: "transparent" });
  svg.append(cross, ...dots, hit);
  const tip = tooltip();
  const show = (event) => {
    const box = svg.getBoundingClientRect();
    const px = (event.clientX - box.left) * (width / box.width);
    const i = n === 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / pw) * (n - 1))));
    cross.setAttribute("x1", x(i));
    cross.setAttribute("x2", x(i));
    cross.setAttribute("visibility", "visible");
    series.forEach((sr, k) => {
      const v = sr.values[i];
      dots[k].setAttribute("visibility", v == null ? "hidden" : "visible");
      if (v != null) {
        dots[k].setAttribute("cx", x(i));
        dots[k].setAttribute("cy", y(v));
      }
    });
    const rows = series.filter((sr) => sr.values[i] != null).map((sr) => ({ color: sr.color, value: auto(sr.values[i]), name: sr.name }));
    tip.show(buckets[i].title, rows, x(i), width);
  };
  const hide = () => {
    tip.hide();
    cross.setAttribute("visibility", "hidden");
    for (const dot of dots) dot.setAttribute("visibility", "hidden");
  };
  hit.addEventListener("pointermove", show);
  hit.addEventListener("pointerdown", show);
  hit.addEventListener("pointerleave", hide);
  return h("div", { class: "chart", style: `width:${width}px` }, svg, tip.node);
}

// groups: [{ label, title, strong }], series: [{ name, color, values }] with one value per group.
export function groupedColumns({ width, height = 170, groups, series, label }) {
  const m = { l: 30, r: 4, t: 10, b: 22 };
  const pw = width - m.l - m.r;
  const ph = height - m.t - m.b;
  const { ticks, top } = niceScale(Math.max(...series.flatMap((sr) => sr.values.filter((v) => v != null))));
  const y = (v) => m.t + ph - (v / top) * ph;
  const band = pw / groups.length;
  const k = series.length;
  const bw = Math.max(3, Math.min(14, Math.floor((band - 10 - (k - 1) * 2) / k)));
  const gw = k * bw + (k - 1) * 2;
  const svg = s("svg", { width, height, viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": label });
  for (const t of ticks) {
    svg.append(
      s("line", { x1: m.l, x2: m.l + pw, y1: y(t), y2: y(t), class: t === 0 ? "axis" : "grid" }),
      s("text", { x: m.l - 6, y: y(t) + 3.5, class: "tick", "text-anchor": "end" }, num(t)));
  }
  const tip = tooltip();
  const washes = [];
  groups.forEach((group, g) => {
    const x0 = m.l + g * band;
    const wash = s("rect", { x: x0 + 1, y: m.t, width: band - 2, height: ph, class: "wash" });
    washes.push(wash);
    svg.append(wash);
    series.forEach((sr, j) => {
      const v = sr.values[g];
      if (v == null) return;
      const bx = x0 + (band - gw) / 2 + j * (bw + 2);
      const by = y(v);
      const r = Math.min(4, bw / 2, y(0) - by);
      // Rounded at the data end, square at the baseline.
      svg.append(s("path", {
        d: `M${bx} ${y(0)}V${by + r}Q${bx} ${by} ${bx + r} ${by}H${bx + bw - r}Q${bx + bw} ${by} ${bx + bw} ${by + r}V${y(0)}Z`,
        style: `fill:${sr.color}`,
      }));
    });
    svg.append(s("text", { x: x0 + band / 2, y: height - 6, class: group.strong ? "tick strong" : "tick", "text-anchor": "middle" }, group.label));
    const show = () => {
      for (const w of washes) w.classList.toggle("on", w === wash);
      const rows = series.filter((sr) => sr.values[g] != null).map((sr) => ({ color: sr.color, value: auto(sr.values[g]), name: sr.name }));
      tip.show(group.title, rows, x0 + band / 2, width);
    };
    const hide = () => {
      wash.classList.remove("on");
      tip.hide();
    };
    const hit = s("rect", { x: x0, y: 0, width: band, height, fill: "transparent", class: "hit", tabindex: 0, "aria-label": group.title });
    hit.addEventListener("pointerenter", show);
    hit.addEventListener("pointerdown", show);
    hit.addEventListener("focus", show);
    hit.addEventListener("pointerleave", hide);
    hit.addEventListener("blur", hide);
    svg.append(hit);
  });
  return h("div", { class: "chart", style: `width:${width}px` }, svg, tip.node);
}
