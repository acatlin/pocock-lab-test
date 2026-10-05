// PROTOTYPE - throwaway. The floating bar that switches variants. Not part of any design.

// Only on a local or private-network host, so a stray merge cannot ship the bar to Pages.
const LOCAL = /^(localhost$|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]$)/.test(location.hostname);

export function mountSwitcher({ keys, names, states, get, set }) {
  if (!LOCAL) return { update() {} };

  const cycle = (step) => {
    const i = keys.indexOf(get().variant);
    set({ variant: keys[(i + step + keys.length) % keys.length] });
  };
  const button = (text, label, onclick) => {
    const node = document.createElement("button");
    node.type = "button";
    node.textContent = text;
    node.setAttribute("aria-label", label);
    node.addEventListener("click", onclick);
    return node;
  };
  const label = document.createElement("span");
  label.className = "proto-label";
  const data = button("", "Cycle the simulated data state", () => {
    const i = states.indexOf(get().state);
    set({ state: states[(i + 1) % states.length] });
  });
  data.className = "proto-data";
  const bar = document.createElement("div");
  bar.className = "proto-bar";
  bar.append(
    button("←", "Previous variant", () => cycle(-1)),
    label,
    button("→", "Next variant", () => cycle(1)),
    data,
  );
  document.body.append(bar);

  window.addEventListener("keydown", (event) => {
    if (event.target.closest?.("input, textarea, select, [contenteditable]")) return;
    if (event.key === "ArrowLeft") cycle(-1);
    if (event.key === "ArrowRight") cycle(1);
  });

  return {
    update() {
      const { variant, state } = get();
      label.textContent = `${variant} (${names[variant]})`;
      data.textContent = `Data: ${state}`;
    },
  };
}
