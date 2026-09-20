---
doc_type: strategic-plan
project: small-giants-wp
spec_id: 36+37 (merged execution track)
status: ACTIVE
scope_source: reports/2026-07-28-spec36-37-remaining-work-inventory.md
architecture: plans/archive/2026-07-29-spec36-37-merged-architecture-and-drawer-cpt-gate.md (SIGNED, DP1–DP7)
---

# Strategic plan — the merged nav/header/footer track (Specs 36 + 37, one execution thread)

## Plain-English summary (read this first)

**What this is.** One roadmap for finishing the whole navigation system — headers, footers, menus,
the slide-out menu drawer, and everything that lives inside them — built as ONE track so every
piece matches its counterparts. It ends with the proof: directly cloning the reference sites 100%,
starting with studionamma, to show the system can build anything without cheats or hardcoding.

**Why one track.** The drawer hangs off the header mechanically (anchor height, burger placement,
colour inheritance), so the drawer and its header are built and judged together.

**The nav blocks.** `sgs/nav-bar-menu` (the bar), `sgs/nav-drawer-menu` (the drawer's link list) and
`sgs/nav-drawer` (the drawer panel), all under `plugins/sgs-blocks/src/blocks/<slug>/`. The drawer
itself lives in the `sgs_drawer` custom post type. `sgs/nav-drawer-menu` has no visual-diff report
yet.

**The shape:** verify what is deployed (Wave 1, closed) → build the capabilities, including the
drawer's own edit screen (Wave 2, done) → polish the operator experience (Wave 3, partial) → fix the
defects that are real whatever the design (Wave 3A) → deconstruct every reference into a
requirements table (Wave 3B) → harmonise the header and nav architecture around what the references
need (Wave 3C) → clone the references as the final proof (Wave 4) → teach the cloning pipeline to do
headers/footers automatically (Wave 5).

**The header is the partial-width thing.** A capped-width or floating header holds the logo, the nav,
the cart, the CTA and any message together as one centred surface; dropdown and mega panels take
their width and position from that header when the header is a floating pill (measured on lamalama, the one live pill among the references: the pill and its panel are the same box, width ratio 1.000, no gap; `reports/2026-09-20-w2p-reference-pill-measurements.md`); for any other header the table records the rule each design uses. The architecture is built from the requirements table,
never from guesses: Wave 3B measures the references, Wave 3C builds what the table says, Wave 4
proves it.

**Done means:** every reference on the clone roster (§ Clone roster — 12 clones, 13 with resn) cloned faithfully
with zero hardcoding, Bean's eye signed off per clone, every preset extracted, and the clone walker
consuming the proven system.

## Clone roster (the definitive list — Gate 5 counts against THIS)

**12 clones** = studionamma (first) · buck · dogstudio · fantasy · lamalama · lusion ·
wearecollins · **Away · ButcherBox · rabbit.tech** (these three are owed a teardown first, W3B-3; the Away reference is the UK storefront) ·
two designs Bean built in Claude Design, each with a header, nav bar, drawer and mega menu setup:
**Halcyon Mega Menu** (`sites/Mega-menu design/Mega Menu.dc.html`) and **Indus Foods Mega Menu**
(`sites/Indus Foods Mega Menu Design/Indus Foods Mega Menu.dc.html`, the client design behind W5-c).
**resn** (WebGL) joins as the **13th clone** unless the W3B-3 teardown finds an effect that none of
the four motion tiers (V, G, H, W) can express: Spec 38 is fully built, including the Tier W effects
(surface treatment, flowing gradient), so its effects are inside the boundary in principle and the
teardown only has to confirm it effect by effect. **Warm** is not on the roster.
Gate 5 = **13/13** (12/12 if resn is excluded by the teardown).

---

## Phase 1 — Scope

- **Goal (one sentence):** every remaining FR in Specs 36+37 shipped or mapped to a named stage,
  proven by the roster clone gate (§ Clone roster), under the signed gate's DP1–DP7 architecture.
- **Business context:** SGS's competitive headline is "AI website-builder that clones anything
  faithfully". Nav/header/footer is the last major surface without that proof. Wave 4's clones are
  directly reusable as the client-facing preset library — client-build velocity.
- **Constraints:** no version bumps or deprecations pre-production · shared worktree, commit by
  exact path · Spec 37 §1.2 both-specs-same-commit rule · nothing renders differently until the
  studionamma gate (gate §4.3).
- **Success criteria (measurable):** per-wave gates below; final = FR-37-23 acceptance (live FRs +
  never-overflow on every live site + no inline + Bean's eye) + every roster clone accepted (13/13, or 12/12 if resn is excluded).
- **Scope boundary (explicitly NOT included):**
  - Spec 36 Phase 3 (inventory B4): block-menu support, Nav Health, AI-builds-nav, conditional
    menus, WC category mega, RTL, import/export → **named stage: Spec 36 Phase 3, after this track**.
  - Inventory A4 "deliberately NOT built" list (per-row sticky, D4 warning, 44px floor, preview
    link, hand-typed ratio) → not built by design.
  - FR-37-36 custom React picker → optional extension, only if the native modal proves insufficient.
  - Floating UI stays in the Customiser — the "floating header mode" unit below is the
    header-block pill mode, not a Customiser move.
  - Motion Spec 38 is built; its effects are available to every clone.
- **Calibration:** estimates anchored to this project's actuals (spec'd multi-commit wave ≈ 1
  session; FR-36-9a notice ≈ ½ session; drawer variant build ≈ 2 sessions). Estimates quoted LOW
  per `~/.claude/rules/time-estimates.md`; ADHD-taxed number in brackets.

---

## Phase 2 — Waves, units, dependencies

**Legend:** each unit = `[ID] name — surface · output · est (taxed) · critical-path?`. Status words:
DONE · PARTIAL · NOT DONE.

### Wave 1 — Fixture & verification wave — CLOSED

All six units are live-verified: the Gate 3 composed-nav fixture (fixture page 1842; mega panel
1745 populated), mega motion, mini-cart (`displayMode` link/flyout/drawer), search (4 modes), the
social / business-info / notices controls, and the mega starters picker. The fixtures stay on the
canary for later waves.

**Residuals carried forward (not blocking Wave 2):**
1. axe on the Gate-3 mega panel reports 6 primary-colour contrast violations on the Mama's palette,
   accepted by owner ruling (the colours are the client's brand; content stays distinguishable).
2. Bean's-eye (R-31-13) sign-off on the mega motion is not yet recorded — book it with the next
   live URL.
3. The cart/search screenshot set is not captured (numeric probes only).

### Wave 2 — Capability wave (gate DP2–DP5 + inventory A2/B3 build items)

| ID | Unit | Status | What is built / what remains | Est (taxed) | CP |
|---|---|---|---|---|---|
| W2-i | **DP7 harness fixes** — `plugins/sgs-blocks/scripts/nav-qa/` capture + contrast + fidelity scripts | DONE apart from the three unmeasured refs | Built: the shared `nav-qa/lib/openness-guard.mjs` (exit 3 = VACUOUS) used by four scripts; contrast walks every text element; `--self-test` in all six sweep, capture and audit scripts, including `sweep-drawer-variants.mjs` (47 controls), `shoot-drawer-pairs.mjs` (16) and `elementfrompoint-sweep.mjs` (3); `nav-qa/check-fixture-fidelity.py` (fixture link count and label text against `labels-<site>.json`, right-site keyed, in `gates.json` as `check-fixture-fidelity` and its `--self-test`); `labels-<site>.json` for 7 reference sites. Open: `labels-<site>.json` for Away, ButcherBox, rabbit.tech (generated after W3B-3). Must precede any Wave-4 evidence | 2h (4h) | YES |
| W2-a | **Drawer CPT** `sgs_drawer` (DP2) | DONE | CPT, Active model, revisions, seed by menu LOCATION lookup, admin "Menu drawer" | — | YES |
| **GATE 2** | OPEN-state computed-parity, default CPT drawer vs default drawer, property-identical | PASSED 2026-09-20 on the mechanism (fidelity is Bean's eye) | `reports/2026-09-20-w2-gate2-rerun.md`: `--open-via keyboard` at 375px, both sides emit the same uid, no property mismatches over 8 element records and 400 comparisons, plus an extended probe of 27 records per side (1,267 comparisons, including `backdrop-filter`, pseudo-elements, `::backdrop` and the parent chain). Negative controls: `--open` omitted exits 3 (VACUOUS), 768/1440 exit 3 (UNMEASURED), a deliberately different drawer reports 21 mismatches and exits 1 | — | YES |
| W2-b | `drawerRef` → post picker (DP2) | DONE | `nav-bar-menu/block.json::drawerRef` is a post-ID `number`; the picker; the dangling-post notice (FR-36-9a); create-inline: "Create a new menu panel" (`nav-bar-menu/useCreateDrawer.js::useCreateDrawer`) saves a published `sgs_drawer` post seeded from the blank starter pattern and selects it. Live-verified in the editor (`reports/visual-diff/nav-bar-menu-2026-09-20.md`): one post per double-click, an honest error on an injected 403, no reload needed. `nav-drawer/block.json::drawerRef` stays an element-id string | — | YES |
| W2-c | Drawer starter looks: 7 real starter patterns | DONE | Seven `sgs_drawer` patterns (`theme/sgs-theme/patterns/drawer-*.php`, keyword `featured`, a plain manual keyword; each holds only blocks that render real site data), seeded as published Menu drawer posts marked `_sgs_starter_slug` by `Sgs_Starter_Library_Migration` (re-runs when the set of library patterns changes) and `wp sgs drawer seed-starter --all --user=1`, a "Framework look" label and view in the list. The starter-look control lists the `featured` looks (else all), applies in one Undo step, and changes only the settings a look owns; "Keep my blocks" leaves the client's blocks untouched. `nav-drawer` declares no `variantPreset` and registers no block variations (`git grep -n variantPreset -- plugins/sgs-blocks/src` returns nothing). Live-verified 2026-09-19 on all three test sites; only the Gate 2 harness re-run remains | — | YES |
| W2-d | Migration + seed (DP2) | DONE | Header starter patterns embed no drawer; the per-site seed (FR-37-48). No stored string `drawerRef` exists on any live site, so no re-type sweep is needed (`wp db query "SELECT COUNT(*) FROM wp_posts WHERE post_content LIKE '%\"drawerRef\":\"%'"` returns 0 on the canary, the Indus test site and the Eye Care test site) | — | YES |
| W2-r | **Spec 36 + Spec 37 same-commit statement of the drawer model** (Spec 37 §1.2) | DONE | Both specs state the drawer as a `sgs_drawer` post, the picker, the seed, and the seven looks as starter patterns (Spec 36 FR-36-9a, Spec 37 FR-37-43) | — | YES |
| W2-e | **DP4 trigger controls** | DONE | Six attrs on `nav-bar-menu/block.json`: `triggerMode`, `triggerLabel`, `triggerIcon`, `triggerMagnetEnabled`, `triggerMagnetRadius`, `triggerMagnetStrength`. Open-state sync via the global `store('sgs/nav')` (trigger and drawer are separate DOM trees; context-scoped state silently no-ops) | — | YES |
| W2-f | **FR-37-42 column-shape picker** | DONE; live/eye verification owed | Site-header row inspector writes `gridTemplateColumns` incl. `1fr auto 1fr` | — | YES |
| W2-g | Icon-list contrast on dark drawer surfaces | DONE | ≥ 4.5:1 on all drawer variants | — | YES |
| W2-h | Drawer align centres the menu | DONE | `centred-statement` centres | — | YES |
| W2-j | FR-37-15 behaviours → scoped `#uid` CSS | DONE | Scoped emission via `sgs_emit_tier_rules()`; no body classes | — | no |
| W2-k | FR-37-16 container attrs flat → object | DONE | `site-header` / `site-footer` padding, margin, maxWidth, contentWidth, minHeight, contentBandPadding are objects | — | no |
| W2-l | 36-22 logo source resolution | DONE | Site Info `logo` (media-library attachment ID) is tier 2 between the block's own image and the core custom logo (`includes/class-sgs-site-info-logo.php::resolve_id`); Organization JSON-LD follows the same chain; saving Site Info purges the page cache. Live-verified with fall-through controls (`reports/visual-diff/responsive-logo-2026-09-20.md`) | — | no |
| W2-n | Scroll-state shadow on the pinned header | DONE | `site-header` attributes `shadowScrolled` and `shadowScrolledColour`; nothing paints when unset. Live-verified at 1440px and 375px including reduced motion and a non-sticky header (`reports/visual-diff/site-header-2026-09-20.md`) | — | no |
| W2-o | Payment-logo SVG set | CLOSED, no framework feature | No spec, pattern or block asks for payment marks, and WooCommerce renders an accepted-methods row on the cart page. Clients upload each processor's official artwork into `sgs/trust-bar` image badges, which already works and is the only way to respect each brand's artwork rules (`reports/2026-09-20-w2o-payment-icons-host-options.md`) | — | no |
| W2-p | "Floating" header pill mode | DONE | Built and live-verified on the canary (`reports/visual-diff/site-header-pill-2026-09-20.md`, first pass and a re-check after the QC fixes): `headerFloat` (per tier), `headerFloatInset`, `headerFloatCollapse`, and `backdropBlur` (the only pill among the 12 references, lamalama, is a blur-only bar: `reports/2026-09-20-w2p-reference-pill-measurements.md`); `--sgs-header-height` publishes the pinned bottom edge (top offset plus height), unchanged for every `top:0` header; a mega panel matches the pill and plain dropdowns clamp inside it; the pill persists at mobile unless collapse is on. With no float or blur set the emitted CSS is byte-identical | — | no |
| W2-q | `resolveTier()` cascade | DONE | FR-37-14 built and live-verified | — | no |
| W2-s | 36-24 lint-gate half | DONE | `plugins/sgs-blocks/scripts/lint-responsive-controls.py` in the prebuild gates (`--check` + `--self-test` pass); checks bespoke per-device controls, not per-tier drift | — | no |
| W2-t | Doc closure sweep | DONE | Parking entries archived on resolve | — | no |
| W2-u | **W1 re-verification on the CPT path** (wave exit) | DONE | Live probe on the CPT-rendered drawer (`reports/2026-09-20-w2u-cpt-drawer-integration.md`): focus trap, Tab and Shift+Tab cycling, ESC and focus return, scroll lock, modal and non-modal, at 375px and 1440px, each with a negative control. Findings: opening the drawer dismisses an open mega menu (they are never open together); a non-modal drawer opened from an in-content trigger leaves `main` live; a trigger-anchored drawer renders off-screen at negative x on fixture page 3699 (resolved by the header width model in W3C-1 and W3C-3) | — | YES |

**Net Wave 2:** DONE a, b, c, d, e, f (live/eye verification owed), g, h, j, k, l, n, p, q, r, s, t, u · PARTIAL i ·
CLOSED with no framework feature o.

**TEST (critical path):** Happy = default drawer post renders property-identical to the default
drawer (the DP-signed bar; gate §4.3). Edge = deleted/draft drawer post → FR-36-9a notice;
multi-header page override. Fail = DP7 harness negative controls (closed panel → VACUOUS; label
mismatch → FAIL). Integration = header patterns render without an embedded drawer; the burger opens
the site-wide Active drawer; a per-burger override wins.

### Wave 3 — Polish wave

| ID | Unit | Status | Output | Est (taxed) | CP |
|---|---|---|---|---|---|
| W3-a | FR-37-27 Simple-surface (hide nothing) | SETTLED | ≤3 controls is a default, not a ceiling; nothing to reorder. Live figures come from `node plugins/sgs-blocks/scripts/check-simple-surface-cap.js` (advisory, warn-only) — quote its output, never a cached number | — | no |
| W3-b | Simplicity findings 2+3 (`P-HEADER-SIMPLICITY-FINDINGS`) | PARTIAL | Finding 3 (settings ordering) settled. **Finding 2 (canvas-click selection) is open** | 1h (2h) | no |
| W3-c | FR-37-6 per-site CPTs authored + set-active on every live site | UNVERIFIED | Every live site renders header + footer from its CPTs: the sandybrown canary and the Indus test site (`lavender-dinosaur-183533.hostingersite.com`, deploy target `indus-test`). Both serve `sgs/site-header` + `sgs/site-footer` markup (curl-checked); CPT sourcing per site not yet proven | 45m (1.5h) | YES |
| W3-d | FR-37-26 blind-tester arm | NOT DONE | Bean-run, screen-recorded non-coder session; the authoritative half of the FAIL verdict. The automated proxy covers the Starter-Look control only and does not replace it | Bean session (schedule) | no |
| W3-e | FR-37-18 inspector conformance (Spec 35A Part L) | PARTIAL | The conformance script's gap counts are raw upper bounds, not a workload; triage before acting | 1h (2h) | no |

### Checkpoint protocol (every wave from 3A onward)

No wave's implementation starts until the previous wave has passed all five steps, in order:

1. **Evidence pack** built by the delegate that did the work (live URLs, computed-style output, the
   command that produced each claim).
2. **QC** by someone other than the builder: `/qc-inline` per unit; `/qc-council` (cross-model, each
   fix-shape a hypothesis measured against a baseline) on any shared-mechanism change; an adversarial
   review of a table or family list before Bean signs it.
3. **Docs updated in the same commit** as the code or table they describe: the spec that owns the
   behaviour (Spec 36 and Spec 37 together, per Spec 37 §1.2), this plan's unit rows, the verify doc,
   `LEDGER.md`, `decisions.md`, and `specs/README.md` when a spec changes.
4. **Mechanical gates:** `python .claude/hooks/handoff-preflight.py --check` and
   `python plugins/sgs-blocks/scripts/lints/lint-spec-drift.py --check` pass.
5. **Bean's gate** where the unit table marks one (W3B-1, W3B-5, the eye check closing 3C).

Delegation rules: `/delegate` picks each model at dispatch. Mechanical measuring and fixture building
go to a cheaper model; design, the family clustering and every shared-mechanism change go to the
strongest. Parallel agents get disjoint file lists stated in their brief; a deploy is done once by the
main thread after the agents' work is read and merged, never by an agent.

### Wave 3A — Independent fixes (real whatever the design)

Every unit is first REPRODUCED inside a real `sgs/site-header` (the fixture pages 3693, 3694, 3699 and
the Gate 2 pair 3692/3695 hold nav blocks loose in page content, so they show nothing about a header).
A defect that does not reproduce inside a real header is closed with no change. Each fix carries a
negative control and is verified on a real header on the canary.

| ID | Unit | Output | Est (taxed) | CP |
|---|---|---|---|---|
| W3A-1 | A dropdown or mega panel stays open while the pointer travels from its parent item to the panel | CLOSED with no change: the plain dropdown on a real header works (Bean tested it), so his loose-fixture symptom was a fixture artefact. The pill mega's 21px gap below its item is part of the W3C-1 rebuild, not fixed here | — | no |
| W3A-2 | Default dropdown surface and items | CLOSED, not reproduced inside a real header (see the note under this table); the target was: a dropdown is a visible surface by default (background, border, radius, shadow from theme tokens); no list markers, no default link underline, no marker indent (the dropdown's alignment to its parent item is a W3C-1 family) | 1.5h (3h) | YES |
| W3A-3 | Top-level items that own a dropdown or mega panel get the same hover treatment as their siblings | CLOSED, not reproduced inside a real header (site header and fixtures outside `.entry-content` show no slide-in on any item). Cause proven: `plugins/sgs-blocks/assets/css/extensions.css` applies a content-link underline slide-in to `.entry-content li a:not(.wp-block-button__link):not(.sgs-toc__link)::after` and a `text-decoration: none` that beats the block's own hover underline; it matches `<a>` elements only, so a nav placed inside `.entry-content` gives plain items the effect and panel-owning items (a `<button>`) not. Optional hardening: exclude nav blocks from that rule | 1h (2h) | YES |
| W3A-4 | Mama's Munches canary header | Hover colour DONE: the header nav (`sgs_header` post 3648) had no `itemColourHover`, so the block's locked default (`primary`, FR-41-36, `includes/nav-menu-css.php::sgs_nav_shared_item_state_css`) turned the hover text pink; the draft leaves the text colour alone, so the header now sets `itemColourHover` to `text` and the hover text stays `rgb(58, 46, 38)` on the `rgb(245, 194, 200)` pill (checked live at 1440). Centring OPEN: the nav sits right of centre because the logo's default left-pin (`responsive-logo/render.php`, `margin-inline-end:auto`, FR-36-22) swallows all the free space in the row's `space-between`; with that margin removed the gaps are 224 and 225px, matching the draft's rule (items centred between the logo and the cart). Fix shape awaits Bean | 1h (2h) | no |
| W3A-5 | QA fixtures live inside a real header | DONE: `nav-qa/build-header-fixtures.py` builds four canary pages with the nav inside `sgs/site-header` (page ids 3723 plain, 3733 capped-width, 3734 floating pill, 3735 drawer with submenus; slug prefix `qa-hdr-`). The loose-block pages (3692, 3693, 3694, 3695, 3699) stay until Bean retires them | 1.5h (3h) | YES |

**Fixture facts and reproduction results.** A header placed in page content renders inside `<main>` in
flow, beneath the site's own header, so each fixture page has two `<header>` elements; probes select
`.entry-content header.sgs-site-header`. The pill fixture (3734) measures a 1120px header with an 8px
radius and a mega panel of the same left edge and width (`--sgs-mm-panel-width` 1120px). Inside that
real header the Shop dropdown computes `list-style-type: none`, link `text-decoration: none`,
`padding-left: 0`, background `rgb(251, 243, 220)` and a border (command: hover the Shop toggle, then
read `getComputedStyle` on `.sgs-nav-bar-menu__submenu`), so the bullets, underline, missing surface and
indent seen on the loose fixture do not occur in a header. W3A-1 is closed: the plain dropdown works on a real header, and the pill mega's 21px gap (the
plain and capped headers have 0px because the items fill the header's height) is rebuilt in W3C-1. W3A-3 does not reproduce
in a real header (`qa-hdr-hover-parity`, page 3763).

### Wave 3B — Reference deconstruction (the requirements table)

Output: `reports/<date>-reference-requirements-matrix.md`. The table is **rows × columns × three
tiers**: one row per reference per surface (header shell, bar, dropdown, mega panel, trigger and close,
drawer, footer), one typed column per defining attribute, each cell recorded at 375, 768 and 1440px.
Rows are clustered into capability families that the SGS blocks must cover.

**What data exists.** Eight references have measured data, all of the OPEN DRAWER only
(`.claude/reports/2026-07-28-drawer-code-extraction/`: studionamma, buck, dogstudio, fantasy, lamalama,
lusion, wearecollins, resn; `labels-<site>.json` exists for seven of them, not resn). The header shell,
bar, dropdown, mega panel and footer are unmeasured for every reference, and Away, ButcherBox and
rabbit.tech are unmeasured entirely. So W3B-2 and W3B-3 are a fresh capture from the live reference
sites (rendered DOM, computed style, event-driven capture for behaviour), not a re-read of files; the
existing drawer JSON is a cross-check. Captures are taken in a real headed Chrome (`reports/reference-requirements/CAPTURE-PROTOCOL.md`); the
first eleven were taken headless, and a headed spot-check (`HEADED-SPOTCHECK.md`) compared 133 static
cells, of which 117 match; the 16 that differ are explained by the scrollbar, a different storefront
(Away), page-intro timing and the user agent, and the timing cells headless could not measure were
re-measured headed. Cells that a resting DOM cannot give (hover, close grace, motion,
scroll behaviour) are captured by driving the page (hover, wait, diff computed styles; scroll, diff
transforms) or, where that cannot work, read from the site's code and marked `source-only`.

**Rules for every cell.**
- The row's surface is `present`, `absent` or `not-applicable` first; `absent` is a real value and
  clusters as its own family ("no dropdown"), never a forced fill.
- Labels are derived from measured numbers, never eyeballed: `header width == viewport` → full-bleed;
  narrower with equal left and right inset → capped (record px); with a radius and a top inset →
  floating. Panel anchor: `|panelCentreX − itemCentreX| ≤ 2px` → item-centred; `|panelLeft − itemLeft|
  ≤ 2px` → item-left; `panelWidth ≥ headerWidth − 2px` → header-wide. Centred on the viewport:
  `|surfaceCentreX − viewportCentreX| ≤ 2px`. A panel with a fixed width centred on the header or
  viewport is `capped-centred` (record the px, and whether it differs per panel).
- Every column is tagged `static`, `interaction-capture` or `source-only`, and the cell records which
  method produced it.
- Colours are recorded as hex and sizes as px so clustering compares values, not prose.

**Columns (signed off after a completeness review against the measured data and an adversarial review
of the table design).**
1. Archetype — header: full-bleed, capped, floating pill, partial-width bar; drawer: full-screen, side,
   partial, floating card, card stack, dropdown from the header.
2. Geometry — width, max-width, insets, height, radius, z-index, centring and anchor (rules above).
3. Zone model — columns and rails, alignment, and what sits inside the surface (logo, nav, cart, CTA,
   message, language, utility controls such as theme, sound, search, clock or status).
4. Ground — fill, blur, scrim present or not. *(shared sub-schema A)*
5. Background visual and its behaviour — none, image, video, gradient or cycling media; static,
   parallax, cross-fade, follows the hovered link, autoplay. *(shared sub-schema A)*
6. Item typography and scaling mode — size, weight, case, fluid, stepped or fixed.
7. Item states — hover treatment, active or current indicator, ornament (index, glyph, thumbnail,
   spacer), separators, treatment of an item that owns a panel.
8. Secondary-block roster — kind, position, presence per tier, and content that reacts to hover (a
   preview pane that follows the hovered link).
9. Trigger and close — kind, element semantics and accessible name, burger style; the close button's
   style, position and icon; replaces the burger in place or is separate; whether a top row holds it;
   the animation between the two states; magnet.
10. Mechanics — open trigger (hover or click), close grace, scroll-lock, `dialog` and `inert`, focus
    handling, sticky or hide-on-scroll, whether open state survives a resize.
11. Motion — each effect, its Spec 38 tier (V, G, H, W) and its render substrate (DOM or canvas).
    *(shared sub-schema B)*
12. Content — labels, counts, case origin (source text or CSS `text-transform`), fixed or dynamic.
13. Per-tier delta and drop mechanism — what changes at each tier, and whether an element is removed
    from the DOM, collapsed to 0×0, reflowed or migrated to another role.
14. SGS coverage — 14a mechanical (computed property joined to `block_attributes.css_property` through
    `/sgs-db`) and 14b manual (a behaviour mapped to a block attribute enum); each row records which was
    used.

Clustering keys on the typed values across all surfaces, so one capability found on two surfaces (for
example blur on a header and on a drawer) becomes one family.

| ID | Unit | Output | Est (taxed) | CP |
|---|---|---|---|---|
| W3B-1 | Columns signed off | the column list above, after the completeness and adversarial reviews | DONE | YES |
| W3B-2 | Fresh capture for the 8 references with drawer data (studionamma, buck, dogstudio, fantasy, lamalama, lusion, wearecollins, resn) | header shell, bar, dropdown, mega, footer and interaction cells captured live at three tiers; drawer cells cross-checked against the existing JSON; one agent per reference, disjoint output files | 3h (5h) | YES |
| W3B-3 | Fresh capture for Away, ButcherBox and rabbit.tech (every surface); map each resn effect to a Spec 38 tier and confirm its admission (12 vs 13); resn's ambient audio is covered by `sgs/audio` with `playerStyle: hidden` (loads and plays with no visible player; the audio context is created on the first play gesture) and is not a gap; the other resn effects are re-judged at family level from the headed capture; `labels-<site>.json` for the three | measured rows | 1.5h (3h) | YES |
| W3B-3a | The two Claude Design drafts (Halcyon Mega Menu, Indus Foods Mega Menu): render each locally with its own runtime files, measure the rendered DOM at three tiers, and record each variant as its own rows (Halcyon: Columns, Cards, Minimal × Light, Dark; Indus: Sectors as Cards and as List). The source is Bean's, so it is read as well as measured; its runtime expands loops and stamps classes, so the render, not the source, is the measured truth | measured rows for both designs; all 13 roster references measured | 1h (2h) | YES |
| W3B-4 | Cluster into capability families | each family: name, the references that need it, the SGS block attribute that covers it or none, verdict (covered, gap, conflicts with something built) | 1h (2h) | YES |
| W3B-5 | Bean signs off the family list | the list of families Wave 3C builds and the order | Bean | YES |

### Wave 3C — Header and nav architecture harmonised from the table

Sized when W3B-5 closes. Every family is universal (rule 3), driven by block attributes (rule 6),
design-gated before any shared mechanism changes (rule 7), and built through the shared wrapper or
helper the other blocks already use. Built work that disagrees with the table (the floating pill, the
drawer anchoring, force-solid) is reopened by a family, not patched on its own.

| ID | Unit | Output | Est (taxed) | CP |
|---|---|---|---|---|
| W3C-1 | Header width model | the header is the partial-width surface, centred against the viewport and holding logo, nav and actions together; on a floating-pill header the dropdown and mega panels take the pill's left edge and width (already built, and matching lamalama's measured pill-and-panel box); on every other header the panels take the anchor and width rule the table records (item-centred, header-wide, or capped-centred with a per-panel width) | from the table | YES |
| W3C-2 | Trigger and close behaviour | the burger is replaced in place by the close control where the references do it; the drawer omits a separate top close row where they omit it | from the table | YES |
| W3C-3 | Drawer placement and sizing | side, width and anchor from the model, the trigger-anchored clamp (page 3699), and the force-solid tier background (the off value is the header's own resting background) | from the table | YES |
| W3C-4 | Remaining families | one unit per family from W3B-4 | from the table | YES |

**Lanes, delegation and checkpoints**

| Wave | Order | Parallel lanes (disjoint files) | Delegate | QC checkpoint | Docs closed at the checkpoint |
|---|---|---|---|---|---|
| 3A | W3A-5 first; then W3A-1, W3A-2, W3A-3 together; W3A-4 from the start | L1 hover-intent JS (W3A-1) · L2 dropdown CSS include (W3A-2) · L3 item hover CSS include (W3A-3) · L4 Mama's canary content (W3A-4) | Sonnet builders per lane; main thread deploys once and verifies live | `/qc-inline` per lane; `/qc-council` on W3A-2 and W3A-3 because they change shared block defaults | Spec 36 (dropdown defaults, hover system), verify doc, LEDGER, `decisions.md` |
| 3B | (W3B-2 ‖ W3B-3) → W3B-4 → W3B-5 (W3B-1 closed) | one agent per reference, four references per batch, each writing its own file under `.claude/reports/reference-requirements/` | Sonnet for capture (browser and event-driven); the strongest model for W3B-4 (clustering) | adversarial review of the family list before W3B-5 | the matrix report, this plan, verify doc, LEDGER, `decisions.md` |
| 3C | one design-gate per family, then build | families with disjoint files in parallel; anything touching the shared header wrapper is serial | strongest model designs; `/subagent-driven-development` builds (implementer plus two reviewers); main thread deploys and verifies live | design-gate plus `/qc-council` before each shared-mechanism build; Bean's eye on one composed real header before 3C closes | Spec 36 and Spec 37 in the same commit, verify doc, LEDGER, `decisions.md`, `specs/README.md` |

**TEST (critical path):** Happy = every reference's row is expressible with block attributes and one
composed real header matches its row. Edge = the header at 375, 768 and 1440px with panels open.
Fail = a table row with no covering attribute is a gap unit, never a trimmed reference. Integration =
Wave 4 clones consume the families without per-reference code.

### Wave 4 — PROOF GATE: the reference clones (DP6 as sequenced) — not started

| ID | Unit | Output | Est (taxed) | CP |
|---|---|---|---|---|
| W4-a2 | **Substitution policy signed BEFORE W4-b** | one-page policy Bean agrees: licensed font → named nearest match recorded in the DP5 homes table; copyrighted imagery → same-crop placeholder; neither counts as a capability gap | 15m (30m) + Bean | YES |
| W4-b | **studionamma 100% clone** — header + drawer + footer; content, imagery, colours, typography, motion, positioning, mobile (CTA→drawer stresses DP4/DP5) | per-property DP5 homes table reviewed at gate; DP7-clean harness evidence; **Bean's eye (R-31-13)** | 2 sessions (3) — the floor, incl. one expected loop-back | YES |
| W4-c | Remaining roster clones (buck, dogstudio, fantasy, lamalama, lusion, wearecollins, Away, ButcherBox, rabbit.tech, Halcyon Mega Menu, Indus Foods Mega Menu; resn) — only after W4-b ACCEPTED | accepted clones; every capability gap = defect filed against waves 1–3, never a trimmed reference. **Termination rule: an effect a Spec 38 tier (V, G, H or W) can express is built with the Spec 38 effects; an effect the built Spec 38 effect does not yet match is a defect against that FR; an effect no tier can express comes back as a Bean trim/exclude decision — it never loops back silently** | 5 sessions (8) | YES |
| W4-d | Preset extraction | each accepted clone → header preset + footer preset + drawer starter; invented fills: Utility commerce, Overlay hero-contrast, Directory footer | 1h/clone (2h) | no |
| W4-e | Starter-set narrowing | drop `centred/minimal/full`; keep `scratch` + 3 search variants | 30m (1h) | no |
| W4-f | Contrast on all 8 client palettes per preset — **automated**: extend the DP7 contrast sweep to iterate `theme-snapshot.json` palettes (harness extension counted here) | palette sweep passes, machine evidence | 1.5h (3h) | no |

**TEST (critical path):** Happy = computed-parity vs reference + Bean's eye per clone. Edge =
mobile drawer parity; content-role migrations. Fail = DP7 harness mismatch fails the build.
Integration = presets restyle under each client's theme-snapshot tokens (DP5 home #3).

### Wave 5 — Spec 33 Part 2: the header/footer clone walker — not started

| ID | Unit | Output | Est (taxed) | CP |
|---|---|---|---|---|
| W5-a | FR-37-22 emittable-by-construction + header/footer clone walker ("Spec 33 Part 2") | pipeline clones header/footer through the walker; the roster clones become regression fixtures — includes authoring + review of the Spec 33 Part 2 section itself (Spec 33 holds Part 1 only; a spec must exist before the walker is built). `section_passes.py::SKIP_TOP_LEVEL_TAGS` still skips header/footer/nav | 2.5 sessions (5) | YES |
| W5-b | FR-37-23 final acceptance | live FRs + never-overflow on every live site + no inline + Bean's eye | ½ session (1) | YES |
| W5-c | 36-18 Indus branded-header cutover (cloning output) + 36-25 structured-data-once + 36-26a discoverability verify | branded Indus header via the pipeline, from the Indus Foods Mega Menu design (its inline-style Claude Design source has no SGS-BEM classes, so W5-a's input contract decides how it enters the pipeline); schema emitted once; contract verified — includes one client feedback round on the branded Indus header | 1.5 sessions (3) | no |

### Dependency graph + critical path

```
W2-i (done; labels for the three unmeasured refs follow W3B-3) — harness honesty; Gate 2's re-run and every Wave-4 capture depend on it
W2-b                                          (done)
W2-c                            (done; live-verified on all three test sites)
Gate 2 harness re-run           (done 2026-09-20)
W2-u wave exit                  (done 2026-09-20)

Wave 3 after the Wave 2 CP set (polish on final surfaces)
W3A-5 first (fixtures inside a real header), then W3A-1..4
W3B-2 || W3B-3 -> W3B-4 -> W3B-5 (Bean)     (W3B runs while W3A runs)
W3C REQUIRES W3B-5; W3A-1..3 fold into W3C-1 if the table changes them
W4-a2 (substitution policy, Bean) before W4-b
W4-b REQUIRES: W2-i..u CP set + W2-f live verified + Gate 2/3 passed + W3C complete
W4-c after W4-b ACCEPTED (Bean)   ← the one deliberate serialisation
W5-a after W4 complete
```

CRITICAL PATH: W2-i → W2-b → W2-d → W2-r → W2-c → Gate 2 re-run → W2-u → W3A-5 → W3B-2/3 → W3B-4
→ W3B-5 (Bean) → W3C → W4-a2 → W4-b → Bean's eye → W4-c → W5-a → W5-b.

**Parallel opportunities:** W3A-1..4 parallel to W3B · W3-b/e parallel · W4-c's clones
parallelise AFTER the W4-b acceptance (never before — each clone is judged whole, with its header).
**Bean-gated bottlenecks (W4-a2, Gate 4, W3-d, the mega-motion eye check) get BOOKED at the
preceding wave's close with the evidence pack pre-built — an external ping (Telegram), not an
in-session reminder (Rule 7: in-session reminders die).**

### Tooling

`/sgs-wp-engine`, `/wp-block-development`, `/delegate`, `/qc`, `/qc-inline`, `/gap-analysis`,
`/visual-qa`, `/sgs-db`, `/wp-blocks` — all in the session skill roster. Playwright MCP live.
`plugins/sgs-blocks/scripts/nav-qa/` harness scripts exist (LEDGER re-runnable assets).
`build-deploy.py` = the ONE deploy path (`--target sandybrown` or `--target indus-test`).
`wp-sgs-developer` + `design-reviewer` + `code-reviewer` agents registered.

---

## Phase 3 — Risk & effort

**Conversion: 1 session = 5 focused hours.** Remaining effort by wave (LOW hours, from the unit
tables): Wave 2 open units per the table above · Wave 3 ≈ 3.5h + Bean session · Wave 3A ≈ 5h · Wave 3B ≈ 6h + Bean sign-off · Wave 3C sized at W3B-5 · Wave 4 ≈ 48h
(≈ 10.5 sessions; W4-d is 1h × 12 clones) · Wave 5 ≈ 22h (≈ 4.5 sessions). The clone waves are the
biggest single driver: pattern-authoring and clone work runs 2–4× optimistic on this project.
Schedule risk: a W4-b loop-back blocks W4-c entirely — the serialisation is deliberate but must be
visible.

### Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| CPT move breaks the property-identical bar | High — gate §4.3 blocks everything downstream | Gate 2 = computed-parity default-vs-default, re-run after W2-b/c/d complete |
| studionamma clone exposes missing capabilities late | High — is the point of the gate | Gate rule: every gap = defect filed against waves 1–3 and FIXED, never a trimmed reference; expect one loop-back cycle in the estimate |
| Harness false-passes (a check that passes vacuously) | High — Bean trust | W2-i ships negative controls (`--self-test` style) BEFORE any Wave-4 evidence is captured |
| Gate 2 parity measured on a CLOSED drawer would be vacuous | High | Gate 2 parity is OPEN-state via the guarded harness, with negative control |
| Unbounded loop-back on WebGL/motion-heavy references | High | W4-c termination rule — effects use the built Spec 38 tiers; a mismatch is a defect against that FR; an effect no tier can express is a Bean trim decision |
| Rollback after destructive attr cuts is multi-commit on a shared worktree | Medium | Gate 2 re-run on the drawer after `variantPreset` is gone |
| Licensed fonts/imagery read as capability defects | Medium | W4-a2 substitution policy signed by Bean before W4-b |
| Specs drift from the drawer CPT model | Medium | W2-r same-commit statement in both specs |
| Shared worktree collision with a co-active track | Medium | Commit exact paths; never `git add -A`; branch re-check in the commit command |
| Editor-killing crash past green gates | Medium | After any edit.js / shared-component change: deploy + OPEN the real editor before closing the unit. Every block name used in editor code must be a registered block (`sgs/nav-bar-menu`, `sgs/nav-drawer-menu`, `sgs/nav-drawer`): `createBlock` does not check the slug and an unregistered one inserts a dead `core/missing` placeholder |
| A fix built on a fixture artefact (loose blocks outside a header) | High — wasted rebuild | Every W3A unit is reproduced inside a real header first; QA fixtures are rebuilt there (W3A-5) |
| The table's columns miss a defining attribute, so a family is missed | High — surfaces as a Wave 4 loop-back | The columns passed a completeness review against the measured data and an adversarial review; a reference behaviour no column holds is added as a column, never dropped |
| Clustering merges two mechanisms into one family, or splits one | Medium | Adversarial review of the family list before Bean signs it (W3B-5) |
| Parallel agents collide on shared files | Medium | Disjoint file lists in each brief; one deploy by the main thread; `git diff --stat` read after every agent |
| Store-API price data unavailable for search (36-20) | Low | Logged as its own dispatch, not silently absorbed |

---

## Phase 4 — Milestone gates

```
GATE 1: Fixture wave clean — CLOSED
Six Wave 1 units live-verified. Residuals (accepted mega contrast violations, Bean's-eye on mega
motion, cart/search screenshot set) are listed under Wave 1.

GATE 2: CPT cutover proven
AFTER: W2-i + W2-a  · PASS: OPEN-state computed-parity property-identical via the DP7-fixed
harness, negative control run · STATE: passed once (`reports/2026-07-30-w2a-gate2-drawer-cpt.md`);
re-run owed after W2-b/c/d complete · TYPE: auto-gate + code-review

GATE 3: Capability wave complete
AFTER: W2-e..p  · PASS: both open drawer defects live-verified fixed; DP7 harness self-tests
pass; FR-37-42 writes correct grids incl. 1fr auto 1fr; Gate 3 is passable on the CP set
(W2-i..u) alone — W2-j/k/l/m/n/o/p/s may trail into Wave-3 time without blocking it
TYPE: auto + /qc multi-rater

GATE 3A: independent fixes verified
AFTER: W3A-1..5  · PASS: each fix reproduced then fixed inside a real header with a negative control;
QC and docs steps of the checkpoint protocol done  · TYPE: auto-gate + /qc-council

GATE 3B: requirements table signed
AFTER: W3B-1..5  · PASS: all 13 roster references captured at three tiers; every row in one family; the
adversarial review of the family list answered; Bean has signed the list  · TYPE: go/no-go (Bean)

GATE 3C: architecture harmonised
AFTER: W3C-1..4  · PASS: every signed family built or explicitly mapped; one composed real header
matches its table row; specs, verify doc and LEDGER state the model  · TYPE: auto + go/no-go (Bean's
eye, R-31-13)

GATE 4: studionamma accepted   ← THE go/no-go
AFTER: W3C + W4-b  · PASS: Bean's eye + DP5 homes table reviewed + DP7-clean evidence
FAIL: capability gaps → loop back to waves 1–3, re-present only after DP7 evidence
TYPE: go/no-go (Bean)  · READINESS: computed at the time; do not pre-assert
· The Bean session is BOOKED at Wave 3 close with the evidence pack pre-built (external ping, not
in-session)

GATE 5: Track acceptance
AFTER: W4-c..f + W5  · PASS: FR-37-23 in full; 13/13 accepted (12/12 if resn is excluded); presets
extracted; starter-set narrowing done; walker regression fixtures green
TYPE: go/no-go (Bean)  · READINESS: computed at the time from the 4-component formula — do not
pre-assert
```

Stop-loss: any gate <50 → surface pivot-vs-park with two ranked paths; log in parking.md.

---

## Phase 5.3 — Per-phase handoff blocks

```
[Wave 2 — handoff]  Trigger: /phase-planner scope="W2 capability wave (remaining units)"
  Entry: this plan · gate DP2–DP5+DP7 (READ IN FULL) · header CPT registration code (the family
  pattern to mirror) · nav-bar-menu/block.json::drawerRef · nav-drawer/block.json::drawerRef ·
  reports/2026-07-30-w2a-gate2-drawer-cpt.md
  Label hint: PLAN opus (shared-mechanism design-gate inside: floating mode)

[Wave 3 — handoff]  Trigger: /phase-planner scope="W3 polish"  · Label: sonnet

[Wave 3A — handoff]  Trigger: /phase-planner scope="W3A independent fixes"
  Entry: this plan (§ Checkpoint protocol, § Wave 3A) · nav-bar-menu and site-header block.json ·
  includes/nav-menu-submenu-css.php · includes/nav-menu-item-border-featured-css.php
  Label hint: sonnet builders, one lane each

[Wave 3B — handoff]  Trigger: /phase-planner scope="W3B requirements table"
  Entry: this plan (§ Wave 3B columns) · reports/2026-07-28-drawer-code-extraction/ · teardown run
  20260728-112649-7bc4a8 · labels-<site>.json
  Label hint: sonnet measurers per reference; opus for clustering

[Wave 3C — handoff]  Trigger: /phase-planner scope="W3C header and nav architecture"
  Entry: the signed family list · Spec 36 + Spec 37 · plugins/sgs-blocks/CLAUDE.md block standards
  Label hint: PLAN opus (shared-mechanism design-gate per family)

[Wave 4 — handoff]  Trigger: /phase-planner scope="W4 studionamma clone" (then per-clone)
  Entry: teardown FINDINGS.md · drawer-code-extraction jsons · DP5/DP7 · R-31-13
  Label hint: PLAN opus + design-reviewer agent per clone

[Wave 5 — handoff]  Trigger: /phase-planner scope="Spec 33 Part 2 walker"
  Entry: Spec 31 (FULL read — cloning session rule) · Spec 33 · this plan's W4 outputs
  Label hint: PLAN opus (cloning-pipeline surface — R-31 rules apply)
```

## Standing decisions

1. **Drawer fixes land ON the CPT path** — a defect that is CSS-only (path-independent) is fixed
   immediately.
2. **The mega "heading-less panel notice" (36-12 residue)** waits on the mega CPT editor surface.
3. **Per-burger override precedence:** picker value beats the site-wide Active drawer; an empty
   picker = Active. No third "inherit" state.
4. **W4-b evidence pack is fixed in advance:** computed-parity JSON + DP7 captures + homes table +
   labels fidelity output. Bean judges from the pack + live URL — no ad-hoc evidence shapes.
6. **`labels-<site>.json` for the three unmeasured refs is generated inside W3B-3.**
8. **Header-level width:** a partial-width or floating header holds the logo, nav and actions as one centred surface; panels follow it. Reference behaviour is read from the requirements table, never guessed.
7. **Clone roster:** see § Clone roster; Gate 5 counts against it.

## First action (≤5 min, zero dependencies)

W3A-5 (rebuild the QA fixtures inside a real header) and W3B-2/W3B-3 (fresh reference capture) start together; neither needs anything from Bean. W3B-1 is signed off.

## References

Inventory (scope) · signed gate (architecture) · teardown run `20260728-112649-7bc4a8` ·
`reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md` (drawer-variant exit-gate evidence) ·
Spec 36 · Spec 37 §4/§5 · `reports/2026-09-17-header-footer-cpt-issue-register.md`.
