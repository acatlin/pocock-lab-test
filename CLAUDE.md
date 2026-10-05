# pocock-end-to-end-js

Template for the agentic SDLC lab. A static site in `site/` with tested ES
modules; deploys to GitHub Pages on every push to `main`.

## Commands

- Test: `npm test` (Node's built-in runner; tests live in `tests/*.test.js`)
- Serve locally: `npm start` -> http://localhost:8080

## Layout

- `site/index.html`, `site/style.css` - the pages
- `site/src/*.js` - ES modules imported by the pages and by the tests; computation goes here
- `site/data/rides.csv` - sample data (date, city, rides)
- `tests/*.test.js` - one test file per module, using `node:test` and `node:assert/strict`
- `.github/workflows/publish.yml` - runs tests on pull requests and pushes to `main`; a push to `main` also deploys `site/` to Pages
- `docs/agents/*.md` - configuration the skills read (see Agent skills below)

## Conventions

- Computation lives in `site/src` modules and gets a test; pages only load data and display it.
- Vanilla HTML, CSS and ES modules. No framework, bundler, or npm dependencies.
- New pages are new HTML files in `site/`, linked from the nav in `index.html`, using relative paths (`./...`) so they work under a Pages subpath.
- Charts are CSS bars or inline SVG, drawn from data returned by a tested function.
- A page that fetches `site/data/rides.csv` must be served over http (`npm start`); opening the file directly will not work.

## The lab workflow

`/grill-with-docs` -> `/to-spec` -> `/to-tickets` -> `/implement` -> `/code-review` -> PR -> merge (which deploys).
The feature being built is described in `FEATURE.md`. One ticket at a time, on a branch, small commits.

## Agent skills

### Issue tracker

Issues, specs and tickets live in this repo's GitHub Issues (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

The five triage roles use their default label names: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root, created lazily. See `docs/agents/domain.md`.
