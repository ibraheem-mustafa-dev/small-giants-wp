# nav-qa — Spec 36 Phase-1 Gate-1 QA tooling

Four scripts covering the FR-36-16 live acceptance gate ("the concrete
live-QC gate" — Spec 36 §8). Written in **Wave-0, before `sgs/nav-menu` /
`sgs/nav-drawer` exist**, so every script is fully parameterised (CLI args
or a JSON probes file) — nothing hardcodes the eventual block markup.
Step 11 (the final acceptance gate) runs these rather than building fresh
tooling.

All four are runnable standalone right now against ANY page (they were
smoke-tested end-to-end against a local static fixture during Wave-0, and
`axe-run.mjs`/`elementfrompoint-sweep.mjs` also work against any live URL,
e.g. an old header/footer page) — you don't need the new nav blocks built
to trust the scripts work; you only need them once you have real
selectors to point at.

## Prerequisites

- `playwright` is already a devDependency of `plugins/sgs-blocks` (see
  `scripts/playwright-fetch.js` / `scripts/audit-scoped-selector-live.js`
  for the existing convention these scripts match).
- `axe-core` was already present transitively (verified 2026-07-19,
  `axe-core@^4.10.3`) but has been added as an **explicit devDependency**
  in `plugins/sgs-blocks/package.json` so `axe-run.mjs` doesn't depend on
  an accident of some other package's install tree. Run `npm install`
  once in `plugins/sgs-blocks/` before using `axe-run.mjs` (or trust the
  transitive copy already on disk — the script checks and tells you which
  it used).
- Run every command from `plugins/sgs-blocks/` (repo-relative examples
  below assume that cwd).

## 1. `axe-run.mjs` — accessibility gate

**Covers:** FR-36-16 *"axe = 0 on the OPEN drawer AND an OPEN desktop
mega"*.

```bash
# Whole-page pass (no interaction)
node scripts/nav-qa/axe-run.mjs https://sandybrown-nightingale-600381.hostingersite.com/

# Open the drawer, scope the axe run to the drawer only
node scripts/nav-qa/axe-run.mjs https://sandybrown-nightingale-600381.hostingersite.com/ \
  --open ".sgs-nav-menu__toggle" --scope ".sgs-nav-drawer"

# Open a desktop mega at a forced 1440 viewport, scope to the mega panel
node scripts/nav-qa/axe-run.mjs https://palestine-lives.org/ \
  --open ".sgs-nav-menu__item--has-mega .sgs-nav-menu__link" \
  --scope ".sgs-nav-menu__mega-panel" --viewport 1440

# Machine-readable output for a gate script to parse
node scripts/nav-qa/axe-run.mjs <url> --open <sel> --scope <sel> --json
```

**Pass:** `axe-run: 0 violations.` and exit code `0`.
**Fail:** a `[impact] rule-id — help text` block per violation + exit code `1`.
**Bad args / navigation failure:** exit code `2` with a loud stderr message
(e.g. `--open selector "..." matched 0 elements` — this catches a typo'd
selector rather than silently passing on a whole-page fallback).

## 2. `elementfrompoint-sweep.mjs` — occlusion sweep

**Covers:** FR-36-16's `elementFromPoint` occlusion sweep (methodology
carried verbatim from Spec 34 FR-S9-5 / FR-34-7, D101): with the drawer
OPEN, the header row's probe returns the toggle/close control, every
drawer link probed at its own centre returns itself, and everything below
the header is unreachable (returns the scrim/`inert` layer). Baseline:
**10/10 Mama's, 18/18 Indus**.

Probes are supplied as a JSON file — see `probes.example.json` in this
directory for the exact shape (flat vs per-viewport, `point` vs `self`
probe kinds, fully commented). Copy it, point it at the real block
classes once they exist, and keep one probes file per client/mockup.

```bash
node scripts/nav-qa/elementfrompoint-sweep.mjs <url> \
  --probes scripts/nav-qa/probes.example.json \
  --viewports 375,768,1440

# Drawer only (skip the 1440 desktop-mega probe set)
node scripts/nav-qa/elementfrompoint-sweep.mjs <url> \
  --probes path/to/mamas-probes.json --viewports 375,768 --open-target drawer
```

**Pass:** `elementfrompoint-sweep: TOTAL N/N — PASS`, exit code `0` — this
is the number to quote against the spec's baseline (10/10 Mama's, 18/18
Indus).
**Fail:** each failing probe prints its `expected:` vs `actual:` node
description (tag + id + first 3 classes) so you can see exactly what
stole the hit-test — exit code `1`.
**Bad args / missing probes file / nav didn't open:** exit code `2`.

**Not covered by this script (see Spec 36 §8 for why):** the drawer
geometry check (`getBoundingClientRect().top` === header bottom ±1px) and
the D340 scrollbar-bounce test both require a **real desktop browser
window with a classic scrollbar** — device emulation cannot reproduce the
scrollbar-vanish bounce, so that check stays a manual/Bean's-eye step at
Step 11, not something this script fakes a pass for.

## 3. `crawl-assert.mjs` — pre-JS crawl assertion

**Covers:** FR-36-16 *"the crawl assertion (every bar+dropdown+mega link
AND mega content in the pre-JS HTML)"* and the *"`<details>` no-JS drawer
+ no-JS bar links"* assertion.

Uses a Playwright browser context with `javaScriptEnabled: false` — no
script on the page ever runs, so what the script reads back is exactly
what the server sent (the standard technique for simulating a non-JS
crawler; more robust than hand-rolled regex over raw HTML because it
still gets you real `querySelectorAll`/locator support). Pass `--raw` if
you additionally want the literal raw response body printed/returned.

```bash
# Explicit: assert specific links survive with JS off
node scripts/nav-qa/crawl-assert.mjs https://palestine-lives.org/ \
  --want-href "/about,/products,/contact" \
  --want-text "About,Products,Contact,Brands"

# Auto-detect: scan the SGS nav BEM roots for any anchors at all
node scripts/nav-qa/crawl-assert.mjs https://palestine-lives.org/

# Custom nav-root selector (update once the real block root classes are known)
node scripts/nav-qa/crawl-assert.mjs <url> --nav-selector ".sgs-nav-menu, .sgs-nav-drawer"
```

**Pass (explicit mode):** every `--want-href`/`--want-text` item found,
exit `0`. **Pass (auto mode):** ≥1 anchor found inside `--nav-selector`,
exit `0`.
**Fail:** missing items printed per-item (`MISSING href containing "..."`)
or, in auto mode, a loud `0 anchors found` message plus a hint that this
usually means client-side-only rendering — exit `1`.
**Bad args / navigation failure:** exit `2`.

## 4. `logical-props-lint.py` — RTL-readiness lint (WARN-only)

**Covers:** FR-36-16 *"RTL/logical properties"*.

Grep-scans CSS/SCSS for physical box-model + positioning properties that
have a logical equivalent (`margin-left`/`right`, `padding-left`/`right`,
bare `left:`/`right:`) and suggests the `-inline-start`/`-inline-end`
replacement (LTR-document assumption, since that's SGS's default — the
suggestion flips if the target is ever RTL). **Always exits `0`** — this
is a nudge for the Step-11 human reviewer, not a build gate (a physical
property is not always wrong, e.g. a direction-agnostic icon nudge).

```bash
# Default target dirs: the two nav blocks + the shared utils module
python scripts/nav-qa/logical-props-lint.py

# Explicit dirs
python scripts/nav-qa/logical-props-lint.py src/blocks/nav-menu src/blocks/nav-drawer src/utils
```

A missing target directory prints a `WARN: target directory not found`
line rather than crashing — this is expected before the nav blocks are
built and the script is safe to run from Wave-0 onward. **Note (verified
2026-07-19 during this build):** `src/blocks/nav-menu` and
`src/blocks/nav-drawer` already exist on disk (in-progress parallel
work) — the script correctly reports `OK` for both today since their
`style.css` currently has zero physical-property hits.

## Notes for Step 11 (the final acceptance gate)

- Run all four against **both** gate targets — Mama's (gate-1, flat bar +
  drawer) and Indus (gate-2, dropdowns + mega) — per FR-36-16.
- **Clear the cache first** (`hosting_clearWebsiteCacheV1` +
  `wp litespeed-purge all`) before any run — otherwise you measure the
  stale `?ver`, per Spec 36 §8's explicit warning.
- `elementfrompoint-sweep.mjs`'s printed `N/N` is the number to quote
  against the spec's baseline (10/10 Mama's, 18/18 Indus) — don't
  round or approximate it.
- None of these four replace **Bean's eye** (R-31-13) or the cropped
  screenshot pair — they are the machine-checkable slice of FR-36-16, not
  the whole gate.
