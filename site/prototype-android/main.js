// PROTOTYPE - throwaway. Loads the real ride data once, keeps the selection in the URL,
// and hands the same context to whichever variant ?variant= names.
import { loadRows, describe, summarize, EMPTY_INFO, num } from "./data.js";
import { mountSwitcher } from "./switcher.js";
import * as A from "./variant-a.js";
import * as B from "./variant-b.js";
import * as C from "./variant-c.js";

const VARIANTS = { A, B, C };
const KEYS = Object.keys(VARIANTS);
const STATES = ["ok", "error", "empty"]; // "error" and "empty" are simulated from the bar
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const screen = document.getElementById("screen");
const statePanel = document.getElementById("state");

const params = new URLSearchParams(location.search);
const q = {
  variant: KEYS.includes(params.get("variant")) ? params.get("variant") : "A",
  from: params.get("from"),
  to: params.get("to"),
  cities: (params.get("cities") ?? "").split(",").filter(Boolean),
  tab: params.get("tab") ?? "overview",
  grain: params.get("grain") ?? "week",
  state: STATES.includes(params.get("state")) ? params.get("state") : "ok",
};

let rows = [];
let info = EMPTY_INFO;
let loadError = null;
let lastView = "";

async function load() {
  try {
    rows = await loadRows();
    info = describe(rows);
    loadError = null;
  } catch (error) {
    console.error("Could not load ride data", error);
    loadError = error;
  }
}

function selection() {
  return {
    from: ISO.test(q.from ?? "") ? q.from : info.from,
    to: ISO.test(q.to ?? "") ? q.to : info.to,
    cities: q.cities.filter((city) => info.cities.includes(city)),
  };
}

function writeUrl(sel) {
  const p = new URLSearchParams({ variant: q.variant });
  if (sel.from !== info.from) p.set("from", sel.from);
  if (sel.to !== info.to) p.set("to", sel.to);
  if (sel.cities.length) p.set("cities", sel.cities.join(","));
  if (q.variant === "B" && q.tab !== "overview") p.set("tab", q.tab);
  if (q.variant === "B" && q.grain !== "week") p.set("grain", q.grain);
  if (q.state !== "ok") p.set("state", q.state);
  history.replaceState(null, "", `?${p}`);
}

function set(patch) {
  Object.assign(q, patch);
  render();
}

async function retry() {
  q.state = "ok";
  await load();
  render();
}

function render() {
  const variant = VARIANTS[q.variant];
  const error = q.state === "error" || loadError != null;
  const shown = error ? EMPTY_INFO : info;
  const sel = selection();
  const dateRows = error || q.state === "empty" ? [] : rows.filter((r) => r.date >= sel.from && r.date <= sel.to);
  const picked = sel.cities.length ? dateRows.filter((r) => sel.cities.includes(r.city)) : dateRows;
  writeUrl(sel);

  const view = `${q.variant}/${q.tab}`;
  const top = screen.querySelector("[data-scroll]")?.scrollTop ?? 0;
  const left = screen.querySelector("[data-hscroll]")?.scrollLeft ?? 0;
  screen.className = `screen v${q.variant.toLowerCase()}`;
  screen.replaceChildren();
  variant.render({
    root: screen,
    width: screen.clientWidth,
    info: shown,
    sel,
    q,
    set,
    retry,
    rows: picked,
    dateRows,
    sum: summarize(picked),
    error,
    empty: !error && picked.length === 0,
  });
  if (view === lastView) {
    const scroller = screen.querySelector("[data-scroll]");
    if (scroller) scroller.scrollTop = top;
    const strip = screen.querySelector("[data-hscroll]");
    if (strip) strip.scrollLeft = left;
  }
  lastView = view;

  statePanel.textContent = [
    `variant  ${q.variant} (${variant.name})`,
    `data     ${loadError ? "load failed" : q.state}${q.state === "ok" ? "" : " (simulated)"}`,
    `from     ${sel.from}`,
    `to       ${sel.to}`,
    `cities   ${sel.cities.length ? sel.cities.join(", ") : "all"}`,
    ...(q.variant === "B" ? [`tab      ${q.tab}`, `grain    ${q.grain}`] : []),
    `matched  ${num(picked.length)} ride counts`,
    `url      ${location.search}`,
  ].join("\n");
  switcher.update();
}

const switcher = mountSwitcher({
  keys: KEYS,
  names: Object.fromEntries(KEYS.map((key) => [key, VARIANTS[key].name])),
  states: STATES,
  get: () => q,
  set,
});

let queued = 0;
window.addEventListener("resize", () => {
  cancelAnimationFrame(queued);
  queued = requestAnimationFrame(render);
});

await load();
render();
