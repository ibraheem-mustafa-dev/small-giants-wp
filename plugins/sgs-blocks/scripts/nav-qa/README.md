# nav-qa — QA tooling for the SGS nav blocks

The machine-checkable slice of the FR-36-16 live acceptance gate (Spec 36 §8). The
scripts target three blocks:

| Block | Renders | Root class |
|---|---|---|
| `sgs/nav-bar-menu` | the horizontal bar, the burger, dropdowns and mega panels | `.sgs-nav-bar-menu` (a `<nav>`) |
| `sgs/nav-drawer-menu` | the vertical menu inside the drawer only | `.sgs-nav-drawer-menu` |
| `sgs/nav-drawer` | the `<dialog>` that holds the drawer menu, the close button and any child blocks | `.sgs-nav-drawer` (a `<dialog>`) |

Every script is parameterised (CLI arguments or a JSON probes file); none hardcodes
block markup beyond the defaults documented below. None of them replaces the
owner's eye (R-31-13) or the cropped screenshot pair: they are the
machine-checkable slice of FR-36-16, not the whole gate.

## Prerequisites

- `playwright` is a devDependency of `plugins/sgs-blocks` (the same convention as
  `scripts/playwright-fetch.js` and `scripts/audit-scoped-selector-live.js`).
- `axe-core` is an explicit devDependency of `plugins/sgs-blocks/package.json`, so
  `axe-run.mjs` does not depend on another package's install tree. Run `npm install`
  once in `plugins/sgs-blocks/`. `axe-run.mjs` reads the local copy and prints a
  loud note if it has to fall back to a CDN copy.
- Run every command from `plugins/sgs-blocks/` (the examples below assume that cwd).
- `php` on the PATH for `submenu-harness.php`.

## Real selectors

These are the classes the blocks emit. Derive them from the sources, never from
memory: `src/blocks/nav-bar-menu/render.php`, `src/blocks/nav-drawer-menu/render.php`,
`src/blocks/nav-drawer/render.php`, `includes/nav-menu-markup.php` (the shared item
markup) and each block's `style.css`.

**Rule for any selector you pass to a script:** it must match at least one element
on the page you point it at. A selector that matches nothing is a defect in the
selector, and a script that quietly passes on zero matches is a false pass. Count
matches before trusting a green result (`page.locator( sel ).count()`, or the
script's own `matched 0 elements` exit `2`).

### `sgs/nav-bar-menu` (`.sgs-nav-bar-menu`)

| Thing | Selector |
|---|---|
| Bar root (`<nav>`) | `nav.sgs-nav-bar-menu` |
| Bar list (`<ul>`) | `.sgs-nav-bar-menu__bar` |
| Item (`<li>`) | `.sgs-nav-bar-menu__item` |
| Featured item | `.sgs-nav-bar-menu__item--featured` |
| Any nav link | `.sgs-nav-bar-menu__link` (text in `.sgs-nav-bar-menu__link-text`) |
| Burger wrapper | `.sgs-nav-bar-menu__toggle-wrap` |
| Burger button (opens the drawer) | `.sgs-nav-bar-menu__burger` (glyph `.sgs-nav-bar-menu__burger-icon` > `.sgs-nav-bar-menu__burger-bar`; label `.sgs-nav-bar-menu__burger-text`; a non-icon trigger mode adds `.sgs-nav-bar-menu__burger--<mode>`) |
| Dropdown parent item | `.sgs-nav-bar-menu__item--has-submenu` |
| Dropdown root (`<div>`) | `.sgs-nav-bar-menu__submenu-root` |
| Dropdown toggle (`<button>`, a parent with no URL, or the caret beside a linked parent) | `.sgs-nav-bar-menu__subtoggle` |
| Dropdown panel wrapper | `.sgs-nav-bar-menu__submenu-wrap` (carries `data-sgs-mega-panel`) |
| Dropdown list / item / link | `.sgs-nav-bar-menu__submenu` / `.sgs-nav-bar-menu__subitem` / `.sgs-nav-bar-menu__sublink` |
| Mega item | `.sgs-nav-bar-menu__item--mega` |
| Mega trigger (`<button>`) | `.sgs-nav-bar-menu__mega-trigger` |
| Mega panel wrapper (the surface to scope axe/probes to) | `.sgs-nav-bar-menu__mega-panel-wrap` (carries `data-sgs-mega-panel`; the `sgs/mega-panel` block renders inside it as `.sgs-mega-panel`) |
| Mega "view all" link | `.sgs-nav-bar-menu__mega-viewall` |

`.sgs-nav-bar-menu__*` classes exist only inside the bar, in the site header or
wherever else a bar block is placed. A desktop mega or dropdown is not modal: it
adds no scrim and makes nothing `inert`, and it has no scroll lock.

### `sgs/nav-drawer` (`.sgs-nav-drawer`)

| Thing | Selector |
|---|---|
| Drawer root (`<dialog>`, id defaults to `sgs-nav-drawer`) | `dialog.sgs-nav-drawer` (carries `data-sgs-nav-drawer` and `data-sgs-nav-modality`) |
| Drawer body (holds the menu and child blocks) | `.sgs-nav-drawer__body` |
| Close button | `.sgs-nav-drawer__close` (parts: `.sgs-nav-drawer__close-text`, `.sgs-nav-drawer__close-glyph`, `.sgs-nav-drawer__close-bars`) |
| Scrim (rendered only when an anchor tier is PARTIAL-WIDTH — see below) | `.sgs-nav-drawer__scrim` |
| Modifiers | `.sgs-nav-drawer--submenu-*`, `--close-*`, `--anim-*`, `--preset-*` |

**The scrim is gated on ANCHOR, not on modality.** `render.php::$sgs_nd_needs_scrim`
is true only when at least one of the desktop/tablet/mobile `anchor` tiers resolves
to something other than `full-screen`; `modality` is not in that condition. The
DEFAULT drawer is full-screen on every tier, so **it has no `.sgs-nav-drawer__scrim`
in the DOM under either modality** — a probe that waits for one on a default drawer
waits forever. (What *is* non-modal-only is the scrim's click LISTENER in
`src/shared/nav-interactivity/store.js`: under `showModal()` a click-away is
delivered on `::backdrop` with `target === dialog` instead.)

Measured live on the canary 2026-09-20 —
`document.querySelectorAll('.sgs-nav-drawer__scrim').length` after load at 1440:

| Fixture | `modality` | `anchor` | scrims |
|---|---|---|---|
| `/qa-w2u-gate2-block-path-drawer/` | `modal` | default (full-screen) | **0** |
| `/qa-w2u-nonmodal-drawer/` | `non-modal` | default (full-screen) | **0** |
| `/qa-w2u-nonmodal-partial-drawer/` | `non-modal` | `{desktop:trigger,…}` | **1** |

The middle row is the one that falsifies "non-modal ⇒ scrim".

### `sgs/nav-drawer-menu` (`.sgs-nav-drawer-menu`, inside the drawer only)

| Thing | Selector |
|---|---|
| Menu root | `.sgs-nav-drawer-menu` |
| Drawer list (`<ul>`) | `.sgs-nav-drawer-menu__bar` (with `.sgs-nav-drawer-menu__bar--drawer`) |
| Item (`<li>`) | `.sgs-nav-drawer-menu__item` (with `--drawer`; `--featured`, `--has-submenu` as applicable) |
| Any drawer link | `.sgs-nav-drawer-menu__link` (text in `.sgs-nav-drawer-menu__link-text`) |
| Accordion (`<details>`) / summary / caret | `.sgs-nav-drawer-menu__accordion` / `.sgs-nav-drawer-menu__accordion-summary` / `.sgs-nav-drawer-menu__caret` |
| Submenu list / item / link | `.sgs-nav-drawer-menu__submenu` / `.sgs-nav-drawer-menu__subitem` / `.sgs-nav-drawer-menu__sublink` |

The bar and drawer-menu class families are disjoint, so a `.sgs-nav-bar-menu__*`
selector can never match the drawer's copy of the menu and vice versa.

### Selector traps on a real page

**1. A bare `.sgs-nav-bar-menu__burger` can match more than one element.** A page
that holds its own nav-bar-menu in the content (every fixture page built by
`build-poc-fixtures.py`) has the theme header's burger AND the content bar's burger.
A bare `--open ".sgs-nav-bar-menu__burger"` resolves to the first, which is hidden
above the header's collapse point (`0x0`, not clickable): the run dies on a 30s click
timeout that looks like a broken drawer but is a selector bug. Scope to the page
content:

```bash
--open ".entry-content > nav.sgs-nav-bar-menu .sgs-nav-bar-menu__burger"
```

A burger's `aria-controls` is the id of the drawer it opens. That id comes from the
bar's `drawerRef`, which is an `sgs_drawer` post id (`0` = the site's active
drawer), and resolves to `sgs-nav-drawer` unless the drawer post's own
`sgs/nav-drawer` block sets a different `drawerRef`.

**2. The drawer reparents to `<body>` when it opens** (it has to escape a
transformed or filtered ancestor). A content-scoped
`--scope ".entry-content > dialog.sgs-nav-drawer"` matches before the open and
**0 elements after it**. Scope the drawer by itself:

```bash
--scope "dialog.sgs-nav-drawer"
```

**2b. The MEGA PANEL reparents to `<body>` too.** Same trap, different surface: a
content-scoped `.entry-content … .sgs-nav-bar-menu__mega-panel-wrap` matches while
the panel is closed and **0 elements once it opens** (measured 2026-09-20: after
Enter on the trigger the panel's `parentElement` is `BODY`). Resolve it by the
trigger's own `aria-controls` id, which survives the move:

```js
const id = document.querySelector( megaTriggerSel ).getAttribute( 'aria-controls' );
const panel = document.getElementById( id );
```

A probe that keeps the content-scoped selector reads `panel === null` after a
successful open and reports a working mega as broken.

Working example against a desktop-anchored drawer variant fixture at 1440:

```bash
node scripts/nav-qa/axe-run.mjs <fixture-page-url> \
  --open ".entry-content > nav.sgs-nav-bar-menu .sgs-nav-bar-menu__burger" \
  --scope "dialog.sgs-nav-drawer" --viewport 1440
# → openness guard PASS — open and interactive
# → 0 violations.
```

## 1. `axe-run.mjs` — accessibility gate

**Covers:** FR-36-16 *"axe = 0 on the OPEN drawer AND an OPEN desktop mega"*.

```bash
# Whole-page pass (no interaction)
node scripts/nav-qa/axe-run.mjs https://sandybrown-nightingale-600381.hostingersite.com/

# Open the drawer, scope the axe run to the drawer only (the guard arms itself)
node scripts/nav-qa/axe-run.mjs https://sandybrown-nightingale-600381.hostingersite.com/ \
  --open ".sgs-nav-bar-menu__burger" --scope "dialog.sgs-nav-drawer" --viewport 375

# Open a desktop mega at a forced 1440 viewport, scope to the mega panel wrapper.
# A mega is a hover-bridge surface: it must be opened by keyboard.
node scripts/nav-qa/axe-run.mjs <page-with-a-mega-item> \
  --open ".entry-content .sgs-nav-bar-menu__mega-trigger" --open-via keyboard \
  --scope ".entry-content .sgs-nav-bar-menu__mega-panel-wrap" --viewport 1440

# Open the drawer from the detaching chip, which shows only after scrolling:
# a short window (--height, default 1200) so the page can scroll, then --scroll
node scripts/nav-qa/axe-run.mjs <qa-scrim-url> --height 450 --scroll 380 \
  --open ".sgs-nav-bar-menu__detach button" --scope ".sgs-nav-drawer" --viewport 1440

# Machine-readable output for a gate script to parse
node scripts/nav-qa/axe-run.mjs <url> --open <sel> --scope <sel> --json
```

The burger is only visible below the bar's collapse point, so open the drawer at a
viewport under it (the default collapse point is 768px).

**Pass:** `axe-run: 0 violations.` and exit code `0`.
**Fail:** a `[impact] rule-id — help text` block per violation, exit code `1`.
**Bad args / navigation failure:** exit code `2` with a loud stderr message (for
example `--open selector "..." matched 0 elements`, which catches a mistyped
selector instead of silently passing on a whole-page fallback).
**VACUOUS:** exit code `3` — see the openness guard below.
**Undecided elements:** axe's `incomplete` bucket is printed, never discarded, and
those elements are not counted as passing (see §1c).

`--open-via click` (default) clicks the trigger, then parks the pointer away from
the opened surface: correct for a `<dialog>` drawer. `--open-via keyboard` focuses
the trigger and presses Enter, so the pointer never touches the surface: required
for the desktop mega, whose hover-bridge closes it (170ms grace) the moment the
pointer parks.

### The openness guard — read this before trusting any scoped result

A `<dialog>` sits in the DOM whether it is open or closed, and axe skips hidden
subtrees by default. A scoped run on a **closed** drawer therefore returns
`0 violations` exactly like an open one, and proves nothing.

The guard measures the scope's rendered state before axe runs and requires all of:
a `<dialog>` carries the `open` property · a non-zero box · not `display:none` /
`visibility:hidden` / `opacity:0` / `[hidden]` / `aria-hidden="true"` · **at least
one visible focusable element** (a panel you cannot Tab into is not open). Failing
any of these prints `VACUOUS` with the specific reasons and exits `3`, never a
passing `0`.

It arms automatically when the run implies an opened surface (`--open` given, or
the scope resolves to a `<dialog>`).

| Flag | Effect |
|---|---|
| `--require-open` | Arm the guard for ANY scope (for example a disclosure `<div>` panel that is not a `<dialog>` and was opened by something other than `--open`). |
| `--allow-closed` | Deliberately disarm. The result is stamped `guard: SKIPPED … UNGUARDED` in both text and `--json` output so it can never be mistaken for a guarded pass. |

Every run prints an `openness guard <STATUS>` line, so a bare `0 violations` can
always be traced to whether the surface was really open.

## 1b. The guard is shared and its proof is re-runnable

The guard lives once in **`lib/openness-guard.mjs`** and is imported by
`axe-run.mjs`, `sweep-drawer-variants.mjs`, `shoot-drawer-pairs.mjs` and
`elementfrompoint-sweep.mjs`, so no sibling script can drift from it.

**Shared exit-code vocabulary** (`EXIT` in the lib): `0` ok · `1` real failures ·
`2` usage/navigation · **`3` VACUOUS: nothing was measured, so the run is neither
a pass nor evidence of a defect.**

The guard's proof is a command, not a prose note:

```bash
# Includes NEGATIVE CONTROLS that MUST be caught (closed dialog, nothing focusable,
# zero-size, aria-hidden, opacity:0, allow-closed stamping, hidden/absent trigger).
# Exits non-zero if the guard ever stops catching an injected violation.
node scripts/nav-qa/lib/openness-guard.mjs --self-test
node scripts/nav-qa/axe-run.mjs --self-test          # same suite, via the consumer
```

**Per-script negative controls** (each MUST exit non-zero; a `0` from any of them
means the wiring has rotted). `poc-drawer-<variant>` pages are the fixtures built by
`build-poc-fixtures.py`:

```bash
CANARY=https://sandybrown-nightingale-600381.hostingersite.com

# axe-run — same page, drawer left closed → exit 3
node scripts/nav-qa/axe-run.mjs $CANARY/poc-drawer-floating-capped-card/ \
  --scope 'dialog.sgs-nav-drawer' --viewport 390            # → VACUOUS, exit 3

# sweep-drawer-variants — a host with no fixture → exit 3 (NOT exit 1)
node scripts/nav-qa/sweep-drawer-variants.mjs --plan scripts/nav-qa/poc-content-plan.json \
  --base https://example.com --only floating-capped-card --widths 375   # → exit 3

# shoot-drawer-pairs — no fixture → non-zero
node scripts/nav-qa/shoot-drawer-pairs.mjs --plan scripts/nav-qa/poc-content-plan.json \
  --base https://example.com --out /tmp/x --only floating-capped-card \
  --widths 375 --ours-only                                             # → exit 1
```

Pointing `--base` at a bogus *path* on the canary is not a valid negative control:
WordPress's canonical-URL guessing redirects `/nonexistent-xyz/poc-drawer-<v>/` to
the real fixture and the run passes. Use a different HOST.

## 1c. axe cannot measure contrast inside an open `<dialog>`

Do not rely on axe for drawer contrast. axe places every text element inside an open
`dialog.sgs-nav-drawer` into its **INCOMPLETE** bucket, each with *"Element's
background color could not be determined because it is overlapped by another
element"*, because a `<dialog>` renders in the browser's **top layer** above a
`::backdrop` and axe cannot resolve a background through it. axe therefore cannot
return a contrast violation there, and a clean `0 violations` can hide elements
rendering at 1:1 (invisible). `axe-run.mjs` prints every undecided element and says
plainly that they are not counted as passing.

Drawer contrast is measured by `checkRestContrast()` in `sweep-drawer-variants.mjs`.
It walks every element owning a text node, resolves each one's OWN effective
background by climbing ancestors to the first non-transparent `backgroundColor`
(compositing alpha down to the page background), and applies the WCAG large-text
relaxation per element (`>=24px`, or `>=18.66px` at weight `>=700` → 3:1).

**Owner-accepted failures are reported, never suppressed.** `ACCEPTED_CONTRAST_PAIRS`
moves a known `rgb(fg)-on-rgb(bg)` pair into its own `acceptedFailures` bucket in
the JSON: still printed, just not failing the verdict. Adding a pair is an owner
decision, not a way to quieten a red check.

## 2. `elementfrompoint-sweep.mjs` — occlusion sweep

**Covers:** FR-36-16's `elementFromPoint` occlusion sweep (methodology carried
verbatim from Spec 34 FR-S9-5 / FR-34-7): with the drawer OPEN, the header row's
probe returns the close control, every drawer link probed at its own centre returns
itself, and everything below the header is unreachable (the modal owns the
hit-test). Baseline: **10/10 Mama's, 18/18 Indus**.

Probes are supplied as a JSON file: `probes.example.json` documents the exact shape
(flat vs per-viewport, `point` vs `self` probe kinds, `openSelector`, `openScope`);
`probes.mamas.json` is the real Mama's Munches file, confirmed against the canary
DOM. Keep one probes file per client or mockup. `openScope` names the surface the
trigger opens (for example `dialog.sgs-nav-drawer`); with it the script asserts the
drawer is genuinely open before probing (exit `3` if not), and without it the run is
stamped `openness: UNASSERTED` with a loud warning.

```bash
node scripts/nav-qa/elementfrompoint-sweep.mjs \
  https://sandybrown-nightingale-600381.hostingersite.com/ \
  --probes scripts/nav-qa/probes.mamas.json --viewports 375,768,1440

# Drawer only (skip the 1440 desktop probe set)
node scripts/nav-qa/elementfrompoint-sweep.mjs <url> \
  --probes path/to/probes.json --viewports 375,768 --open-target drawer
```

**Pass:** `elementfrompoint-sweep: TOTAL N/N — PASS`, exit code `0`; quote that
number against the baseline.
**Fail:** each failing probe prints its `expected:` vs `actual:` node description
(tag + id + first 3 classes) so you can see what stole the hit-test, exit `1`.
**Bad args / missing probes file / nav didn't open:** exit `2`.
**VACUOUS:** the `openScope` surface was not genuinely open, exit `3`.

**Not covered (Spec 36 §8):** the drawer geometry check
(`getBoundingClientRect().top` equals the header bottom ±1px) and the
scrollbar-vanish bounce test both need a **real desktop browser window with a
classic scrollbar**; device emulation cannot reproduce them, so they stay a manual
step rather than a faked pass.

## 3. `crawl-assert.mjs` — pre-JS crawl assertion

**Covers:** FR-36-16 *"the crawl assertion (every bar+dropdown+mega link AND mega
content in the pre-JS HTML)"* and the *"`<details>` no-JS drawer + no-JS bar links"*
assertion.

It uses a Playwright browser context with `javaScriptEnabled: false`: no script on
the page ever runs, so what the script reads back is exactly what the server sent
(the standard technique for simulating a non-JS crawler, and more robust than
hand-rolled regex over raw HTML because it still gives real DOM queries). Pass
`--raw` to also print the literal response body.

```bash
# Explicit: assert specific links survive with JS off
node scripts/nav-qa/crawl-assert.mjs <url> \
  --want-href "/shop,/about,/faqs" --want-text "Shop,Our Story,FAQs"

# Auto-detect: scan the nav roots for anchors and compare JS-off with JS-on
node scripts/nav-qa/crawl-assert.mjs https://sandybrown-nightingale-600381.hostingersite.com/

# Custom nav roots (default: .sgs-nav-bar-menu, .sgs-nav-drawer, .sgs-nav-bar-menu__mega-panel-wrap)
node scripts/nav-qa/crawl-assert.mjs <url> --nav-selector ".sgs-nav-bar-menu, .sgs-nav-drawer"

# Pin the JS-off anchor count for CI
node scripts/nav-qa/crawl-assert.mjs <url> --expect-count 11

# Prove the superset gate can still fail (no browser, no network)
node scripts/nav-qa/crawl-assert.mjs --self-test
```

### Auto mode is a SUPERSET gate, not a "≥1 anchor" gate

A "≥1 anchor" gate is far too weak: a nav that server-renders ONE link and injects
the other nine would pass. Auto mode loads the **same URL twice**, once JS-off and
once JS-on, and requires the JS-off nav-href set to be a **superset** of the JS-on
set. The page is its own oracle: there is no roster to maintain and nothing to
drift, and the property under test ("the nav is server-rendered") means any nav link
that appears only with JS on IS the defect. Superset rather than exact match,
because JS legitimately *moves* links out of the containers (the drawer's body
reparent), which subtracts from the JS-on set and must not read as a failure.

**Pass (explicit mode):** every `--want-href`/`--want-text` item found, exit `0`.
**Pass (auto mode):** ≥1 anchor found, the JS-off set is a superset of the JS-on
set, and `--expect-count` (if given) matched, exit `0`.
**Fail:** missing items printed per item (`MISSING href containing "..."`); or, in
auto mode, `0 anchors found`, each JS-only href named under `SUPERSET FAIL`, or a
`COUNT FAIL` line, exit `1`. A `--nav-selector` that names classes the blocks do
not emit reports `0 anchors found`, so a stale selector fails loudly.
**Bad args / navigation failure:** exit `2`.

## 4. `logical-props-lint.py` — RTL-readiness lint (WARN by default, `--check` gates)

**Covers:** FR-36-16 *"RTL/logical properties"*.

It scans the nav CSS for physical box-model and positioning properties that have a
logical equivalent (`margin-left`/`right`, `padding-left`/`right`, bare
`left:`/`right:`) and suggests the `-inline-start`/`-inline-end` replacement (an
LTR-document assumption, since that is SGS's default). **Default mode always exits
`0`**: a nudge for the reviewer, because a physical property is not always wrong
(for example a direction-agnostic icon nudge).

Default target directories: `src/blocks/nav-bar-menu`, `src/blocks/nav-drawer-menu`,
`src/blocks/nav-drawer` and `src/utils`. A block missing from `DEFAULT_DIRS` is a
block the gate never scans, and a default directory that does not exist is only a
`WARN` line, so keep the list in step with `src/blocks/`.

**`--check` is the gate mode.** It exits `1` on any hit NOT recorded in
`logical-props-baseline.json`: existing debt is frozen and visible in that file, new
debt fails. Entries are keyed by *file + property + normalised declaration* with an
occurrence count, never by line number, which would go stale on the first
re-indent. It runs the nav surface in about 0.15s. It is wired as the fast-tier gate
`nav-qa-logical-props` in `scripts/gates.json`
(`python scripts/nav-qa/logical-props-lint.py --check`).

```bash
# WARN only: the default target dirs
python scripts/nav-qa/logical-props-lint.py

# Gate: exit 1 on NEW physical properties
python scripts/nav-qa/logical-props-lint.py --check

# Re-freeze the current debt (review the baseline diff)
python scripts/nav-qa/logical-props-lint.py --seed

# Prove the gate can still fail
python scripts/nav-qa/logical-props-lint.py --self-test

# Explicit dirs
python scripts/nav-qa/logical-props-lint.py src/blocks/nav-bar-menu src/blocks/nav-drawer-menu src/blocks/nav-drawer src/utils
```

## 5. `sweep-drawer-variants.mjs` — drawer-variant exit-gate sweep

**Covers:** FR-36-6's drawer-variant exit gate. Every check returns PASS / FAIL /
VACUOUS with the measured evidence attached, and "cannot tell" is a FAIL. For each
variant in the plan and each width it records: **geometry** (the open panel's real
rect and surface treatment), **restContrast** (per-element, see §1c), **keyboard**
(ESC closes AND focus returns to the burger), **focusContained** (Tab from the last
focusable stays inside the modal), **reducedMotion** (under
`prefers-reduced-motion` the panel is at its full end state immediately),
**axe** (shells out to `axe-run.mjs`, which owns the guard) and **noJsCrawl**
(every nav label is in the JS-off HTML).

```bash
node scripts/nav-qa/sweep-drawer-variants.mjs --plan scripts/nav-qa/poc-content-plan.json \
  --base <site-url> [--only <variant>] [--widths 375,768,1440] [--out report.json]
```

It expects the fixture pages built by `build-poc-fixtures.py`
(`<base>/poc-drawer-<variant>/`). Exit `0` every check passed · `1` at least one
FAIL · `2` bad arguments or unusable plan · **`3` at least one cell VACUOUS** (the
drawer never opened, so those rows prove nothing).

## 6. `shoot-drawer-pairs.mjs` — same-content screenshot pairs

Captures, per variant and width, our fixture's open drawer next to the reference
drawer it was modelled on, carrying the same content, for the owner's eye (R-31-13:
numbers alone do not close a fidelity gate). Both sides go through the openness
guard. A reference recipe with no `panel` selector is returned **UNVERIFIED** and is
not presentable as a reference (`--allow-unverified-reference` opts in and stamps
the cell). Any failed cell gives a non-zero exit; a reference that would not open is
recorded as UNCAPTURED with the reason, never silently omitted.

```bash
node scripts/nav-qa/shoot-drawer-pairs.mjs --plan scripts/nav-qa/poc-content-plan.json \
  --base <site-url> --out <dir> [--widths 1440,375] [--only <variant>] [--ours-only]
```

## 7. `build-poc-fixtures.py` — fixture pages for the drawer sweeps

Creates, for each variant in `poc-content-plan.json`, a classic menu `poc-<variant>`
and a page `poc-drawer-<variant>` whose content is a header `sgs/nav-bar-menu`
(collapse point forced high so the burger is always visible and desktop anchors are
reachable) plus the variant's `sgs/nav-drawer` holding an `sgs/nav-drawer-menu` and
its seeded child roster. Content comes only from the plan (real copy harvested from
the reference sites), never invented here. Writes go through the REST API with the
canary application password from `.claude/secrets/sandybrown.env`, never through
WP-CLI, which bypasses block validation.

`poc-content-plan.json` restates each variant's `sgs/nav-drawer-menu` attributes
because authoring block markup directly does not apply a look's seeded child
attributes; they must match the corresponding drawer PATTERN,
`theme/sgs-theme/patterns/drawer-<variant>.php`.

> **The looks are patterns, not block variations.** `sgs/nav-drawer` declares no
> variant attribute and registers no block variations — there is no
> `src/blocks/nav-drawer/variations.js` and no `variantPreset` attribute (both
> removed; the seven looks became `theme/sgs-theme/patterns/drawer-*.php`, seeded
> as `sgs_drawer` posts). Any script or note still pointing at either is stale.
> Spec 36 FR-36-6 "Desktop variants" is the authority.

```bash
python scripts/nav-qa/build-poc-fixtures.py --plan scripts/nav-qa/poc-content-plan.json [--dry-run] [--only <variant>]
python scripts/nav-qa/build-poc-fixtures.py --list         # fixtures that exist now
python scripts/nav-qa/build-poc-fixtures.py --delete-all   # remove every fixture it made
```

## 7b. `check-fixture-fidelity.py` — plan versus harvest

Offline check (stdlib only, no WordPress, no network) that `poc-content-plan.json`
carries the same content as the harvest the fixtures claim to clone. For each variant
it resolves the reference site from the plan's `reference`, matches it to the `site`
field of `labels-*.json` under `.claude/reports/2026-07-28-drawer-code-extraction/`,
and asserts:

- the primary link count equals both `counts.primary` and `len(primary_links)`;
- each primary label equals the harvest `text` exactly (case-sensitive; the harvest
  holds the authored text, so `css_uppercase` is informational);
- each secondary block's `exact_text` is present in the variant's plan copy, part by
  part (parts are split on ` / `). A block with none of its parts in the plan is
  listed NOT-CARRIED; a block with only some parts is a mismatch. Decorative and
  dynamic blocks are skipped and named;
- anything the plan's `_known_fidelity_limits` documents is reported KNOWN-LIMIT,
  not as a failure.

It prints a per-variant table (variant, site, expected, actual, missing, extra) and
exits `0` (all pass), `1` (any mismatch), `2` (unreadable input) or `3` (no variants
compared, so the result is vacuous). `--json` gives machine-readable output.
`--self-test` proves it fails on a dropped link, an extra link, a changed label, a
missing harvest file, a partly-missing secondary block and zero variants, and passes
on a matching pair. `scripts/gates.json` runs `--check` and `--self-test` as the fast-tier
gates `check-fixture-fidelity` and `check-fixture-fidelity-self-test`.

```bash
python scripts/nav-qa/check-fixture-fidelity.py [--json]
python scripts/nav-qa/check-fixture-fidelity.py --self-test
```

## 8. `palette-contrast-sweep.mjs` — cross-palette contrast

Renders each self-contained SGS-BEM draft (mega-menu panels and similar) once per
client palette and measures contrast with axe-core, because inheriting a client's
tokens makes a panel adopt the brand but does not make it legible in it. Warn-only by
default; `--strict` opts in to a non-zero exit. `--self-test` renders a known-good
and a known-bad fixture and asserts the gate passes the first and fails the second.

## 9. `submenu-harness.php` — dropdown markup harness

Runs `SGS_Nav_Menu_Bar_Renderer` (the walker in `nav-bar-menu/render.php`) and the
shared `sgs_nav_bar_menu_render_items()` outside WordPress with stubs, and asserts
the flattened menu model and the emitted dropdown markup. It locates the class by
its own delimiters, never by line number, and exits `1` on any failure.

```bash
php scripts/nav-qa/submenu-harness.php
```

## Notes for the acceptance gate

- Run all of them against **both** gate targets, Mama's (flat bar plus drawer) and
  Indus (dropdowns plus mega), per FR-36-16.
- **Clear the cache first** (`hosting_clearWebsiteCacheV1` and
  `wp litespeed-purge all`) before any run, or you measure a stale `?ver`, per
  Spec 36 §8's explicit warning.
- `elementfrompoint-sweep.mjs`'s printed `N/N` is the number to quote against the
  baseline (10/10 Mama's, 18/18 Indus); do not round or approximate it.
