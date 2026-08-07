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

## Real selectors (verified live 2026-07-20)

The examples below were written in Wave-0 against placeholder names. These are
the selectors the built blocks actually emit — confirmed against
`nav-menu/render.php` + the live canary DOM:

| Thing | Selector |
|---|---|
| Burger toggle (opens the drawer) | `.sgs-nav-menu__burger` |
| Drawer root (`<dialog>`) | `.sgs-nav-drawer` |
| Drawer close (×) | `.sgs-nav-drawer__close` |
| Bar list | `.sgs-nav-menu__bar` |
| Any nav link | `.sgs-nav-menu__link` |
| Featured item | `.sgs-nav-menu__item--featured` |

The Wave-0 draft of this README said `.sgs-nav-menu__toggle` for the burger —
that class never existed; `axe-run.mjs` correctly exited 2 with
`matched 0 elements` rather than silently passing on a whole-page fallback.

### Two selector traps on a real page (measured live 2026-07-29)

**1. `.sgs-nav-menu__burger` matches THREE elements on a drawer fixture page.**
The theme's site header renders one (hidden above its own collapse point), the
page content renders one, and the nav-menu *inside* the drawer renders a third.
A bare `--open ".sgs-nav-menu__burger"` resolves `.first()` to the header's,
which at 1440px is `0x0` and not clickable — the run dies on a 30s click
timeout that looks like a broken drawer but is a selector bug. Scope to the
page content:

```bash
--open ".entry-content > nav.sgs-nav-menu .sgs-nav-menu__burger"
```

All three also carry the same `aria-controls="sgs-nav-drawer"` when drawers use
the default `drawerRef` — so give each drawer a unique `drawerRef` whenever a
page holds more than one.

**2. The drawer REPARENTS to `<body>` when it opens (the D323 fix — it has to
escape a transformed/filtered ancestor).** So a content-scoped
`--scope ".entry-content > dialog.sgs-nav-drawer"` matches before the open and
**0 elements after it**. Scope the drawer by itself:

```bash
--scope "dialog.sgs-nav-drawer"
```

Working end-to-end example against a desktop-anchored variant at 1440:

```bash
node scripts/nav-qa/axe-run.mjs <page-url> \
  --open ".entry-content > nav.sgs-nav-menu .sgs-nav-menu__burger" \
  --scope "dialog.sgs-nav-drawer" --viewport 1440
# → openness guard PASS — open and interactive: 438x342, 6 focusable element(s)
# → 0 violations.
```

## 1. `axe-run.mjs` — accessibility gate

**Covers:** FR-36-16 *"axe = 0 on the OPEN drawer AND an OPEN desktop
mega"*.

```bash
# Whole-page pass (no interaction)
node scripts/nav-qa/axe-run.mjs https://sandybrown-nightingale-600381.hostingersite.com/

# Open the drawer, scope the axe run to the drawer only
node scripts/nav-qa/axe-run.mjs https://sandybrown-nightingale-600381.hostingersite.com/ \
  --open ".sgs-nav-menu__burger" --scope ".sgs-nav-drawer"

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
**VACUOUS:** exit code `3` — see the openness guard below.

### Openness guard (added 2026-07-29 — read this before trusting any scoped result)

A `<dialog>` sits in the DOM whether it is open or closed, and axe skips
hidden subtrees by default. So until 2026-07-29 a scoped run on a **closed**
drawer returned `0 violations` exactly like an open one. **Every scoped
drawer/mega result recorded before that date proves nothing** — re-run it.

The guard measures the scope's rendered state before axe runs and requires
all of: a `<dialog>` carries the `open` property · a non-zero box · not
`display:none` / `visibility:hidden` / `opacity:0` / `[hidden]` /
`aria-hidden="true"` · **at least one visible focusable element** (a panel you
cannot Tab into is not open). Failing any of these prints `VACUOUS` with the
specific reasons and exits `3` — never a passing `0`.

It arms automatically when the run implies an opened surface (`--open` given,
or the scope resolves to a `<dialog>`).

| Flag | Effect |
|---|---|
| `--require-open` | Arm the guard for ANY scope (e.g. a disclosure `<div>` panel that is not a `<dialog>` and was opened by something other than `--open`). |
| `--allow-closed` | Deliberately disarm. The result is stamped `guard: SKIPPED … UNGUARDED` in both text and `--json` output so it can never be mistaken for a guarded pass. |

Every run now prints an `openness guard <STATUS>` line, so a bare
`0 violations` can always be traced to whether the surface was really open.

Verified live 2026-07-29 on `/t1-nav/` (drawer test page) at 375px:
closed + `--allow-closed` → `0 violations`, exit 0 (the old, vacuous pass);
closed + guard → `VACUOUS`, exit 3; opened via `.sgs-nav-menu__burger` →
`guard PASS — 375x1200, 5 focusable element(s)`, `0 violations`, exit 0.

## 1b. The guard is SHARED, and its proof is RE-RUNNABLE (2026-07-30)

The guard used to live inline inside `axe-run.mjs`'s `main()`, which is exactly
why three sibling scripts never got it. It now lives once in
**`lib/openness-guard.mjs`** and is imported by `axe-run.mjs`,
`sweep-drawer-variants.mjs`, `shoot-drawer-pairs.mjs` and
`elementfrompoint-sweep.mjs`.

**Shared exit-code vocabulary** (`EXIT` in the lib): `0` ok · `1` real failures ·
`2` usage/navigation · **`3` VACUOUS — nothing was measured, so the run is
neither a pass nor evidence of a defect.**

⚠ **The paragraph above this one is a manual record from 2026-07-29 and is NOT
re-runnable — that is precisely the weakness this section fixes.** The guard's
proof is now a command:

```bash
# 7 cases, 6 of them NEGATIVE CONTROLS that MUST be caught (closed dialog,
# nothing focusable, zero-size, aria-hidden, opacity:0, allow-closed stamping).
# Exits non-zero if the guard ever stops catching an injected violation.
node scripts/nav-qa/lib/openness-guard.mjs --self-test
node scripts/nav-qa/axe-run.mjs --self-test          # same suite, via the consumer
```

**Per-script negative controls** (verified 2026-07-30; re-run any time — each
MUST exit non-zero, and a `0` from any of them means the wiring has rotted):

```bash
CANARY=https://sandybrown-nightingale-600381.hostingersite.com

# axe-run — same page, drawer left closed → exit 3
node scripts/nav-qa/axe-run.mjs $CANARY/poc-drawer-floating-capped-card/ \
  --scope 'dialog.sgs-nav-drawer' --viewport 390            # → VACUOUS, exit 3

# sweep-drawer-variants — a host with no fixture → exit 3 (NOT exit 1)
node scripts/nav-qa/sweep-drawer-variants.mjs --plan scripts/nav-qa/poc-content-plan.json \
  --base https://example.com --only floating-capped-card --widths 375   # → exit 3

# shoot-drawer-pairs — no fixture → non-zero (this ALWAYS exited 0 before)
node scripts/nav-qa/shoot-drawer-pairs.mjs --plan scripts/nav-qa/poc-content-plan.json \
  --base https://example.com --out /tmp/x --only floating-capped-card \
  --widths 375 --ours-only                                             # → exit 1
```

**A trap worth knowing:** pointing `--base` at a bogus *path* on the canary does
NOT work as a negative control — WordPress's canonical-URL guessing silently
redirects `/nonexistent-xyz/poc-drawer-<v>/` to the real fixture and the run
passes. Verified with `curl -L` 2026-07-30. Use a different HOST.

## 1c. ⚠ axe CANNOT measure contrast inside an open `<dialog>` (measured 2026-07-30)

**Do not "just let axe check the contrast" on a drawer. It cannot, and it will
tell you everything is fine.**

Measured on the canary POC drawers: axe places **every** text element inside an
open `dialog.sgs-nav-drawer` into its **INCOMPLETE** bucket, each with
*"Element's background color could not be determined because it is overlapped by
another element"* — because a `<dialog>` renders in the browser's **top layer**
above a `::backdrop` and axe cannot resolve a background through it.

Two consequences, both real defects that were live until 2026-07-30:

1. `axe-run.mjs` passed `resultTypes: [ 'violations' ]`, which **discarded the
   incomplete bucket entirely**. It printed a confident `0 violations` on a
   drawer containing 8 undecided elements — 3 of them rendering at **1:1
   contrast, i.e. genuinely invisible** (`P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER`).
   It now prints every undecided element and says plainly that they are NOT
   counted as passing.
2. The plan-of-record's own proposed fix — "delegate contrast to axe's
   `color-contrast` rule scoped to the open surface" — **would not have worked**.
   It would have swapped a check that missed 6 elements for one that misses all 8.

**So drawer contrast is measured by `checkRestContrast()` in
`sweep-drawer-variants.mjs`, not by the axe leg.** It walks every element owning
a text node, resolves each one's OWN effective background by climbing ancestors
to the first non-transparent `backgroundColor` (compositing alpha down to the page
background), and applies the WCAG large-text relaxation per element
(`>=24px`, or `>=18.66px` at weight `>=700` → 3:1).

Verified control pair, 375px:

| Variant | drawer bg | measured | real failures |
|---|---|---|---|
| `centred-statement` | dark `footer-bg` | 8 | **3** — icon-list text at 1:1 |
| `split-zone-serif` | dark `footer-bg` | 11 | **3** — icon-list text at 1:1 |
| `floating-capped-card` | `surface` | 9 | 0 |
| `two-column-editorial` | `surface` | 10 | 0 |

The 6 failures are exactly the recorded defect, caught for the first time; the two
light variants confirm no false positives. The old check measured only
`.sgs-nav-menu__link-text` (3 elements per page) and never hovered anything
despite being called `checkHoverContrast`.

**Owner-accepted failures are reported, never suppressed.**
`ACCEPTED_CONTRAST_PAIRS` moves a known pair (`P-MAMAS-PRIMARY-CONTRAST`, Bean
2026-07-30: *"still distinguishable … even though they fail WCAG"*) into its own
`acceptedFailures` bucket in the JSON — still printed, just not failing the
verdict. Adding a pair is a decision that needs Bean, not a way to quieten a red
check.

**What changed in each script:**

| Script | Before | Now |
|---|---|---|
| `shoot-drawer-pairs.mjs` | reference captured with **no** open check (a closed homepage became "the reference"); a failed cell never affected the exit code | both sides guarded; a reference with no `panel` selector in its recipe is returned **UNVERIFIED** and is not presentable as a reference (`--allow-unverified-reference` opts in and stamps it); non-zero exit on any failed cell |
| `sweep-drawer-variants.mjs` | `openDrawer()` clicked and assumed; vacuity recorded but folded into exit 1 | asserts via the shared guard; **exit 3** for any vacuous cell, so "4 failed checks" on an unopened drawer no longer reads as 4 product defects |
| `elementfrompoint-sweep.mjs` | clicked, waited 350ms, hoped | asserts against the new `openScope` config key; exit 3 on vacuity; a config without `openScope` is stamped `UNASSERTED` with a loud warning instead of being silently trusted |

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

# Pin the JS-off anchor count for CI
node scripts/nav-qa/crawl-assert.mjs <url> --expect-count 11

# Prove the superset gate can still fail (no browser, no network)
node scripts/nav-qa/crawl-assert.mjs --self-test
```

### Auto mode is a SUPERSET gate, not a "≥1 anchor" gate

`≥1 anchor` was far too weak — a nav that server-rendered ONE link and
injected the other nine passed the crawlability assertion. Auto mode now
loads the **same URL twice**, once JS-off and once JS-on, and requires the
JS-off nav-href set to be a **superset** of the JS-on set. The page is its
own oracle: there is no roster to maintain and nothing to drift, and the
property under test ("the nav is server-rendered") means any nav link that
appears only with JS on IS the defect. Superset rather than exact match,
because JS legitimately *moves* links out of the containers (the D323
drawer body-reparent) — that subtracts from the JS-on set and must not read
as a failure.

**Pass (explicit mode):** every `--want-href`/`--want-text` item found,
exit `0`. **Pass (auto mode):** ≥1 anchor found, the JS-off set is a
superset of the JS-on set, and `--expect-count` (if given) matched — exit `0`.
**Fail:** missing items printed per-item (`MISSING href containing "..."`);
or, in auto mode, `0 anchors found`, or each JS-only href named under
`SUPERSET FAIL`, or a `COUNT FAIL` line — exit `1`.
**Bad args / navigation failure:** exit `2`.

## 4. `logical-props-lint.py` — RTL-readiness lint (WARN by default, `--check` gates)

**Covers:** FR-36-16 *"RTL/logical properties"*.

Grep-scans CSS/SCSS for physical box-model + positioning properties that
have a logical equivalent (`margin-left`/`right`, `padding-left`/`right`,
bare `left:`/`right:`) and suggests the `-inline-start`/`-inline-end`
replacement (LTR-document assumption, since that's SGS's default — the
suggestion flips if the target is ever RTL). **Default mode always exits
`0`** — a nudge for the Step-11 human reviewer, because a physical property
is not always wrong (e.g. a direction-agnostic icon nudge).

**`--check` is the gate mode.** This script is the ONLY detector for a real
Spec 36 §8 requirement, and until now it was referenced from nothing but
this README — so the risk was never that it read green forever, it was that
nobody ran it. `--check` exits `1` on any hit NOT recorded in
`logical-props-baseline.json`: existing debt is frozen and visible in that
file, new debt fails. Entries are keyed by *file + property + normalised
declaration* with an occurrence count — never by line number, which would
go stale on the first re-indent. Runs the nav surface in ~0.15s, so it is
cheap enough for a per-build gate.

```bash
# WARN only (unchanged): default target dirs — the two nav blocks + shared utils
python scripts/nav-qa/logical-props-lint.py

# Gate: exit 1 on NEW physical properties
python scripts/nav-qa/logical-props-lint.py --check

# Re-freeze the current debt (review the baseline diff!)
python scripts/nav-qa/logical-props-lint.py --seed

# Prove the gate can still fail
python scripts/nav-qa/logical-props-lint.py --self-test

# Explicit dirs
python scripts/nav-qa/logical-props-lint.py src/blocks/nav-menu src/blocks/nav-drawer src/utils
```

`package.json` wiring (NOT applied here — another track owns that file).
Append to the existing `"prebuild"` `&&` chain, alongside the other
`--check` gates:

```
 && python scripts/nav-qa/logical-props-lint.py --check
```

and add the standalone alias next to `check:inline-styling`:

```
"check:logical-props": "python scripts/nav-qa/logical-props-lint.py --check"
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
