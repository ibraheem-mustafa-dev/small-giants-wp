---
doc_type: report
topic: header-nav-behaviour-surface-inventory
task: Spec 35 T1.4a
date: 2026-07-28
status: COMPLETE — fresh, code-grounded inventory ahead of the FR-37-14 tri-state reshape
inputs:
  - Bean's warning: "the options have expanded past the original 3 modes" (headerSticky/
    Transparent/Shrink was the old mental model — reality is now 8+ distinct controls
    across 2 block levels plus 2 unrelated enum/threshold mechanisms)
  - .claude/plans/2026-07-28-resolveTier-cascade-design-gate.md (T1.1 resolveTier() contract,
    APPROVED + BUILT same day, D400)
  - .claude/plans/2026-07-26-per-row-sticky-mini-design.md (D1: per-row sticky REJECTED)
  - .claude/specs/37-HEADER-FOOTER-BUILDER.md FR-37-14/15/16 (~818-883)
governs: the FR-37-14 tri-state reshape roster (next build after this inventory)
---

# Header/nav behaviour surface — full inventory (T1.4a)

## 0. Plain English

Problem: the FR-37-14 tri-state reshape spec still describes a 4-boolean list
(`headerSticky`/`Transparent`/`Shrink`/`HideOnScroll`). That list is stale — real work
since then added `contrastSafe` (a 4-value enum, not boolean), three independent
per-row behaviours with their own inherit semantics, a shrink-hide-target picker, and a
burger-menu breakpoint enum that has nothing to do with scroll behaviour at all.
Building the reshape against the old 4-item list would silently miss 5+ live controls.

Effect: this is why Bean gated the reshape on a fresh inventory before any build.

Solution: the table below is every behaviour-ish attribute on the header/nav surface,
with file:line evidence, followed by a proposed FR-37-14 roster and open questions only
Bean can settle.

## 1. Full inventory table

| # | Attr | Level | Current shape | Editor control | Consumers | Tri-state candidate? | Notes |
|---|------|-------|----------------|-----------------|-----------|----------------------|-------|
| 1 | `headerSticky` | `sgs/site-header` | `boolean`, default `false` — `plugins/sgs-blocks/src/blocks/site-header/block.json:71` | `ToggleControl` in "Header behaviour" ToolsPanel — `site-header/edit.js:463-483` | `class-sgs-header-behaviours.php:205` (reads literal `headerSticky` → body class `sgs-header-behaviour-sticky`); `header-behaviours.css` `position:sticky !important`; `view.js:114-117` `isHeaderPinned()` measures computed `position` (does NOT trust this flag) | **YES** — named explicitly in FR-37-14's roster | Single sticky element, header-only by design (D1, §5 below) |
| 2 | `headerTransparent` | `sgs/site-header` | `boolean`, default `false` — `block.json:72` | `ToggleControl` — `edit.js:485-511` | Same body-class path (`headerTransparent` → `sgs-header-behaviour-transparent`); `view.js` toggles `body.is-header-scrolled` at scrollY>50; auto-upgrades `contrastSafe:'none'`→`'scrim'` when transparent is on (`class-sgs-header-behaviours.php:224-226`) | **YES** — FR-37-14 roster | Side-effects on `contrastSafe` (#3) — the resolver, not the attr itself, does the coupling |
| 3 | `headerShrink` | `sgs/site-header` | `boolean`, default `false` — `block.json:73` | `ToggleControl` — `edit.js:513-533` | Body-class path (`sgs-header-behaviour-shrink`); `view.js` toggles `body.is-header-shrunk`, own threshold, independent of #2 | **YES** — FR-37-14 roster | |
| 4 | `headerHideOnScroll` | `sgs/site-header` | `boolean`, default `false` — `block.json:74` | `ToggleControl` — `edit.js:535-554` | Body-class path (`sgs-header-behaviour-hide-on-scroll-down`); `view.js` toggles `body.is-header-scrolling-down` at scrollY>100 + direction check | **YES** — FR-37-14 roster names this as "plus the new hide-on-scroll attribute" (spec ~828) | Note: the spec text implies this attr didn't exist yet at spec-authoring time; it is already live |
| 5 | `contrastSafe` | `sgs/site-header` | `string` **enum** (`none`/`scrim`/`shadow`/`force-solid`), default `'none'` — `block.json:75-79` | `SelectControl` — `edit.js:556-584` (`CONTRAST_SAFE_OPTIONS`) | `class-sgs-header-behaviours.php:210-226` validates against `VALID_CONTRAST_MODES`, silent-upgrades `'none'`→`'scrim'` when transparent is on; emits `sgs-header-behaviour-contrast-{mode}` body class | **NOT a boolean-shaped tri-state candidate as-is** — it is already a 4-value enum, not on/off. FR-37-14 names it explicitly ("Applies to headerSticky, headerTransparent, headerShrink, contrastSafe" — spec line 828) but a per-device TRI-STATE of a 4-VALUE enum is a different shape than tri-state-of-boolean (see Q1 below) | The auto-upgrade-to-scrim logic lives in the PHP resolver, not the attr default — a reshape must preserve it or relocate it deliberately |
| 6 | `rowTransparent` | `sgs/site-header-row` + `sgs/site-footer-row` (shared component) | `object` `{desktop,tablet,mobile}` of booleans, default `{}` — `site-header-row/block.json:98-101`, `site-footer-row/block.json` (same shape) | `ResponsiveOverride` + `ToggleControl` inside `RowScrollBehaviourControls.js:204-244` (shared component, imported by both row blocks' `edit.js`) | `sgs_resolve_tier_booleans()` (`helpers-responsive.php:741-756`) in `site-header-row/render.php:150` / `site-footer-row/render.php:155` → emits `data-sgs-row-transparent="desktop tablet"`-style attr (only ON tiers listed) when the row carries class `sgs-row-behaviour`; `header-behaviours/view.js` scans `.sgs-row-behaviour` elements client-side via `matchMedia` | **ALREADY tri-state-ish** — but via the LEGACY boolean-inherit-upward resolver (`sgs_resolve_tier_booleans`), not the new `resolveTier()` string-enum cascade | Row-level and header-level are INDEPENDENT/ADDITIVE, not exclusive — see §2 |
| 7 | `rowHideOnScroll` | Same 2 row blocks | Same `{desktop,tablet,mobile}` boolean object shape — `site-header-row/block.json:102-105` | Same component, `RowScrollBehaviourControls.js:246-277` | Same `sgs_resolve_tier_booleans()` path; `view.js` toggles per-row `is-row-hidden`/collapse (see FR-37-40 note below) | Same as #6 | |
| 8 | `rowShrink` | Same 2 row blocks | Same boolean-object shape — `site-header-row/block.json:106-109` | Same component, `RowScrollBehaviourControls.js:279-330`, plus a live "Show me the shrunk size" editor preview toggle | Same resolver; `render.php:170-183` emits proportional shrink CSS (`sgs_row_shrink_css()`) scoped to `.is-row-shrunk` | Same as #6 | Warns via `Notice` when the row has no vertical padding (shrink would do nothing) — informational only |
| 9 | `rowShrinkHideTarget` | Same 2 row blocks | `string` (anchor id), default `''` — `site-header-row/block.json:110-113` | `SelectControl` populated from `supports.anchor`-capable children, excluding `supports.sgs.headerEssential` blocks — `RowScrollBehaviourControls.js:340-359` | `sgs_resolve_row_shrink_hide_target()` server-side backstop (re-validates against real children + `headerEssential` flag) — `site-header-row/render.php:184-196`; emits `data-sgs-row-shrink-hide` + scoped `display:none` rule keyed to `.is-row-shrunk #{target}` | **NO** — not a behaviour flag, it's a target reference (string anchor id). Out of scope for the tri-state cascade entirely | Orphaned target (deleted child) silently resolves to "nothing hidden" — not an error |
| 10 | Per-row **sticky** | Row blocks | **Does not exist as an attribute — deliberately** | n/a | n/a | **N/A — REJECTED (D1)** | `.claude/plans/2026-07-26-per-row-sticky-mini-design.md` §D1: per-row `position:sticky` was considered and rejected on the "short-parent trap" (a sticky element inside a short `<header>` unpins the moment scroll passes the header's own height). Sticky stays HEADER-level (#1) only; a row instead gets the collapse-when-pinned behaviour under FR-37-40 (see #7's consumer note) — confirmed zero `rowSticky` hits repo-wide |
| 11 | `collapsePoint` (surfaced as "Burger Menu" control) | `sgs/nav-menu` | `number` (px), default `768` — `nav-menu/block.json:133` | `SelectControl`/toggle-group over 4 NAMED presets (`mobile`=768 / `tablet`=1024 / `always`=99999 / `custom`=any other value) — `nav-menu/edit.js:47-78` (`BURGER_SCOPE_PX`, `burgerScopeOf()`), UI panel titled "Burger Menu" at `edit.js:461-511`. **Confirmed: the enum has 4 named options (mobile/tablet/always/custom), matching the task brief's "Always/Tablet/Mobile/Custom" description — not 3.** | `render.php` + emitted `@media` rules read the raw numeric `collapsePoint` unchanged — the enum is a presentation layer only, added 2026-07-28 per the code comment at `edit.js:47-48` ("no bare px values in the UI") | **NOT a tri-state candidate — it's a threshold/breakpoint value, not an on/off-per-tier flag.** Recommend it stay its own numeric-with-named-presets enum; forcing it into the `{desktop,tablet,mobile}` tri-state shape would be a category error (one number, not three independent per-tier states) | Named-preset-over-numeric-attr is its OWN pattern, useful precedent for #5 (`contrastSafe`) if Bean wants presentation/storage decoupled there too |
| 12 | Header essential furniture marker | Any block (`supports.sgs.headerEssential`) | `boolean` in `block.json.supports.sgs`, declarative | n/a (not operator-facing) | Read by `RowScrollBehaviourControls.js:132` (editor) and the render.php backstop (#9) to exclude logo/nav/cart from the shrink-hide picker | N/A — not a behaviour, a capability flag | Out of scope, listed for completeness since it gates #9 |

## 2. Composition — header-level vs row-level (who wins?)

They do **not** compete — they are two **independent, additive** paths targeting
different DOM scopes, confirmed at `header-behaviours/view.js:1-49` (module docblock,
point 4: "PER-ROW … does NOT replace #2/#3 above" / "independently of every other row
and of the header-level body-class path"):

- **Header-level** (#1-5): toggles state classes on `document.body`
  (`is-header-scrolled`/`is-header-shrunk`/`is-header-scrolling-down`); CSS descends
  from `body.sgs-header-behaviour-*` selectors; affects the WHOLE header.
- **Row-level** (#6-9): toggles state classes on the **row element itself**
  (`is-row-scrolled`/`is-row-hidden`/`is-row-shrunk`); resolved per-tier via
  `matchMedia` at the 768/1024 breakpoints; affects only that row.
- One shared passive scroll listener + `requestAnimationFrame` throttle serves both
  paths (`view.js:44-45`).
- The one real interaction point is **FR-37-40 collapse-when-pinned**: whether a row's
  hide-on-scroll RENDERS as `translateY` or height-collapse depends on `isHeaderPinned()`
  (`view.js:114-117`), which reads `headerSticky`'s (#1) **rendered effect**
  (`position:sticky`/`fixed`), not the attribute directly. So header-level sticky does
  influence row-level hide-on-scroll's rendering mode — but it's a rendering-mode
  switch, not an override; the row's own tri-state on/off is still independent.
- `RowScrollBehaviourControls.js:72-103` also reads the ancestor header's `headerSticky`
  attribute directly (via `getBlockParentsByBlockName`) purely to show an editor
  **advisory Notice** ("scroll effects will barely be seen on an unpinned header") —
  informational only, never a gate, never blocks saving.

## 3. `contrastSafe` — detail (item #5 above)

Declared `site-header/block.json:75-79` as a 4-value string enum with
`'none'` default. Consumed exclusively in `class-sgs-header-behaviours.php`:
`VALID_CONTRAST_MODES` const (line 62), read at line 210, validated + emitted as
`sgs-header-behaviour-contrast-{mode}` body class (lines 271-275), with the
auto-upgrade-to-`'scrim'` WCAG safety net at lines 213-226 firing only when
`headerTransparent` is true AND `contrastSafe` is still `'none'`.

## 4. Divergence: rows already have a WORKING (but different) inherit mechanism

Rows (#6-8) already ship a per-tier inherit cascade — but it is `sgs_resolve_tier_booleans()`
(PHP, `helpers-responsive.php:741-756`) paired with `ResponsiveOverride.js`
(JS, presence/absence of the key = inherit; an explicit `false` = "off here", not
unset). This is functionally similar to but **structurally different** from the new
canonical `resolveTier()` cascade (T1.1, BUILT 2026-07-28 per LEDGER.md — string enum
`'inherit'|'on'|'off'`, not boolean-with-absence-as-inherit). Both resolve to the same
UX outcome today, but they are **two different stored shapes for the same concept**,
which is exactly the "never fork a second cascade" problem the
`2026-07-28-resolveTier-cascade-design-gate.md` design gate was written to stop. The
gate's own §2 already earmarks this: "Row-block migration off the legacy resolvers
(deferred post-T1.4)."

## 5. Proposed FR-37-14 reshape roster (recommendation, not a decision)

**In scope for the tri-state (`{desktop:'on'|'off', tablet:'inherit'|'on'|'off',
mobile:'inherit'|'on'|'off'}`) reshape, header-level:**
- `headerSticky` (#1)
- `headerTransparent` (#2)
- `headerShrink` (#3)
- `headerHideOnScroll` (#4)

**Needs its own decision — not a plain boolean tri-state:**
- `contrastSafe` (#5) — 4-value enum, not on/off. Either (a) leave scalar/flat (a
  contrast MODE rarely needs to differ by device), or (b) extend to the scalar/value
  family already defined in the resolveTier gate (`{desktop:<enum-val>,
  tablet:<enum-val|null>, mobile:<enum-val|null>}` — same shape FR-37-16 responsive
  values use, just with enum values instead of CSS lengths). Recommend (b) for
  consistency, since the gate's algorithm already generalises to "value family",
  not just booleans — but this is a judgment call for Bean (see Q1).

**Explicitly OUT of scope for this reshape (confirmed by evidence above, not omission):**
- `rowTransparent`/`rowHideOnScroll`/`rowShrink` (#6-8) — already tri-state-shaped
  functionally, on the legacy resolver; migration is separately tracked
  ("deferred post-T1.4" per the design gate) and should stay a distinct ticket so
  FR-37-14 doesn't grow into a second migration mid-flight.
- `rowShrinkHideTarget` (#9) — a reference, not a behaviour flag.
- Per-row sticky — does not exist, rejected by D1, not a gap.
- `collapsePoint`/Burger Menu (#11) — a threshold value with named presets, category
  mismatch with tri-state.

## 6. Open questions for Bean

1. **`contrastSafe` shape** — flat scalar-per-device (like FR-37-16 responsive values)
   or genuinely tri-stated with `'inherit'`? A contrast mode is usually a WHOLE-header
   design decision, not per-device — worth confirming device-level control is even
   wanted here before building it.
2. **Legacy row resolver migration timing** — fold the row blocks' `sgs_resolve_tier_booleans`
   → canonical `resolveTier()` migration into THIS reshape (bigger single PR, no
   two-cascade window) or keep it a separate deferred ticket as the design gate
   currently states? The design gate explicitly deferred it, but T1.4a was
   commissioned partly because "the options expanded" — worth re-confirming the
   deferral still stands now that the full inventory is in front of you.
3. **Spec 37 §3.8 header-content cascade** — the resolveTier design gate (§5) flagged
   this as an open question already asked of Bean on 2026-07-28 ("does the
   visibility-exclusion ruling apply to header CONTENT curation too, or does it keep
   its own down-cascade?") — still unresolved as of this inventory; flagging again
   since it sits directly adjacent to this reshape's blast radius.
4. **`collapsePoint`'s named-preset-over-numeric pattern** — worth reusing for
   `contrastSafe` (decouple stored value from UI labels) regardless of the Q1 answer?
   Not required, but the precedent exists and is clean.

## Files read

- `plugins/sgs-blocks/src/blocks/site-header/block.json`
- `plugins/sgs-blocks/src/blocks/site-header/edit.js` (lines 380-590 region)
- `plugins/sgs-blocks/src/blocks/site-header-row/block.json`
- `plugins/sgs-blocks/src/blocks/site-header-row/render.php`
- `plugins/sgs-blocks/src/blocks/site-header-row/edit.js` (grep for `RowScrollBehaviourControls`)
- `plugins/sgs-blocks/src/blocks/site-footer-row/block.json` (grep for row-attr names)
- `plugins/sgs-blocks/src/blocks/site-footer-row/render.php`
- `plugins/sgs-blocks/src/blocks/site-footer-row/edit.js` (grep for `RowScrollBehaviourControls`)
- `plugins/sgs-blocks/src/components/RowScrollBehaviourControls.js`
- `plugins/sgs-blocks/src/components/ResponsiveOverride.js`
- `plugins/sgs-blocks/includes/class-sgs-header-behaviours.php`
- `plugins/sgs-blocks/includes/helpers-responsive.php` (lines 585-757 region:
  `sgs_resolve_tier`, `sgs_resolve_tier_booleans`)
- `plugins/sgs-blocks/src/header-behaviours/view.js` (lines 1-120 region)
- `plugins/sgs-blocks/src/blocks/nav-menu/block.json`
- `plugins/sgs-blocks/src/blocks/nav-menu/edit.js` (lines 40-115 region + grep hits)
- `.claude/plans/2026-07-26-per-row-sticky-mini-design.md` (full)
- `.claude/plans/2026-07-28-resolveTier-cascade-design-gate.md` (full)
- `.claude/specs/37-HEADER-FOOTER-BUILDER.md` (lines 790-889 region)
- `.claude/LEDGER.md` (lines 155-320 region)
- Repo-wide grep: `rowSticky` (0 hits), `sgs_resolve_tier_booleans` (5 files),
  `Burger Menu`/`burgerMenu`/`collapsePoint`/`navCollapse` (nav-menu block only)
