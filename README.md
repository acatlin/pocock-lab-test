# pocock-end-to-end-js

Template repository for the agentic SDLC lab, JavaScript edition. A small static
site with tested ES modules, deployed to GitHub Pages by a workflow on every push
to `main`. No framework, no bundler, no dependencies: the site itself needs only
Node 20+.

## Start here

For the lab you also need [Claude Code](https://claude.com/claude-code) and the
GitHub CLI, signed in (`gh auth status`). Then, in order:

1. Create your own repo with **Use this template** on GitHub, and clone it.
2. Run the checks in [Setup and verify](#setup-and-verify).
3. Enable Pages: see [Deploy](#deploy).
4. Create the triage labels: see [Triage labels](#triage-labels). `/to-spec` and
   `/to-tickets` apply one of them, so do this before you reach those steps.
5. Install the skills: see [Skills](#skills).
6. Replace the paragraph in `FEATURE.md` with your one-sentence feature.
7. Open Claude Code in the repo and run `/grill-with-docs`. The rest of the
   workflow is in `CLAUDE.md`.

## Setup and verify

```bash
node -v        # v20 or higher
npm test       # expected: a summary line ending in "pass 3"
npm start      # serves site/ at http://localhost:8080 (Ctrl+C to stop)
```

## Layout

| Path | What it is |
|---|---|
| `site/index.html`, `site/style.css` | The pages. Paths are relative so the site works under a GitHub Pages subpath. |
| `site/src/csv.js`, `site/src/stats.js` | ES modules used by the pages and by the tests. Computation lives here. |
| `site/data/rides.csv` | Sample data: daily ride counts for three cities, July-September 2026. |
| `tests/*.test.js` | Tests, run by Node's built-in test runner. |
| `scripts/serve.js` | Zero-dependency local static server. |
| `.github/workflows/publish.yml` | Runs the tests on every pull request and push to `main`; a push to `main` also deploys `site/` to GitHub Pages. |
| `CLAUDE.md` | Context for Claude Code. |
| `FEATURE.md` | The one-sentence feature you will build in the lab. |
| `docs/agents/` | Configuration the skills read: the issue tracker, the triage labels, and where domain docs live. |

`/grill-with-docs` adds `GLOSSARY.md` and `docs/adr/` at the repo root as terms and
decisions get settled.

## Deploy

Settings -> Pages -> Build and deployment -> Source: **GitHub Actions**. Then
every push to `main` publishes the site at `https://<handle>.github.io/<repo>/`.
Pull requests run the tests only; nothing is published until the merge to `main`.

Pages has to be enabled once in every repo: the setting is not copied when you
create a repo from this template. Until it is on, the `Publish site` workflow
passes the tests and then fails at `actions/configure-pages` with "Get Pages site
failed". You can also enable it from the command line, then re-run the failed run:

```bash
gh api -X POST repos/<handle>/<repo>/pages -f build_type=workflow
gh run rerun <run-id> --failed    # find the id with: gh run list
```

## Triage labels

The `/triage` skill applies five labels, mapped in `docs/agents/triage-labels.md`.
A repo created from this template copies the files but not the labels: it starts
with GitHub's default labels, which include `wontfix` but not the other four.
Create them once in every repo:

```bash
gh label create needs-triage    --color FBCA04 --description "Maintainer needs to evaluate this issue"
gh label create needs-info      --color D876E3 --description "Waiting on reporter for more information"
gh label create ready-for-agent --color 0E8A16 --description "Fully specified, ready for an AFK agent"
gh label create ready-for-human --color 1D76DB --description "Requires human implementation"
```

## Skills

The lab's slash commands (`/grill-with-docs`, `/to-spec`, `/to-tickets`,
`/implement`, `/code-review`) come from
[mattpocock/skills](https://github.com/mattpocock/skills). The files in
`docs/agents/` were generated with v1.3.1, so install that version:

```bash
npx skills add "mattpocock/skills#v1.3.1" -g -a claude-code -s '*' -y
```

This installs all the skills for your user account, in `~/.claude/skills`, so they
are available in every project.

## License

MIT.
