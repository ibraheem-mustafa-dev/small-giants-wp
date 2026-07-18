---
doc_type: builder-ux-design-gate
project: small-giants-wp
track: TRACK 2 — Header/Footer/Nav full rebuild
phase: P2 — Builder design-gate (deliverable)
date: 2026-07-18
status: SIGNED OFF + CLOSED 2026-07-18 (P2 = the header/footer/control builder design-gate, the original scope). Gate-2 council + gap-analysis (B+) + CPT editing-home + JOB-2 sweep + specialist review gate (build + UX) + §14 WP control-implementation spec bound to Spec 35, all folded. The NAVIGATION rework is carved OUT as a new phase **P2.5** (Bean 2026-07-18 — §15 override = FULL REWORK; see `.claude/next-session-prompt-nav-rework-P2.5.md`). WP 7.0.2.
governing_standards: Spec 32 (rendered no-inline output) + Spec 35 (editor control-completeness — the header/footer/nav blocks are built to its Part L definition-of-done, §14)
builds_over: .claude/plans/2026-07-18-P1-architecture-decision-header-footer-nav.md (the LOCKED model — DP1–DP6)
gate2_council: .claude/reports/2026-07-18-P2-adversarial-council-gate2.md (6 personas — Cynic/Ship-PM/Competitor/Spec-Lawyer/Support/First-use+A11y)
roadmap: .claude/plans/2026-07-17-header-footer-nav-full-rebuild-strategic-plan.md (P2 of 6; gates G1/G6)
grounded_against_live_code:
  - plugins/sgs-blocks/src/components/ResponsiveControl.js (the real device switcher — SEE §2.4: it syncs via core/editor, which is a Site-Editor RISK, not a proven capability)
  - plugins/sgs-blocks/src/components/StateToggleControl.js (the ToggleGroupControl segmented idiom + legend-stays-visible discoverability)
  - plugins/sgs-blocks/src/blocks/site-header/edit.js (current 4 flat behaviours in a native ToolsPanel; auto-scrim on transparent)
  - plugins/sgs-blocks/src/blocks/adaptive-nav/block.json (object-tier attrs already live; FR-34-5's 4 controls absent — additive)
scope: DESIGN ONLY. No block/attr/component was built in this phase. P3 builds the model; P4 builds the panel.
---

# P2 Builder-UX Design-Gate — Header / Footer / Nav (v2, post-council)

## 0. Bottom line (plain English)

**What this is.** The *design* for the settings panel a non-coder client uses to configure their
header, footer and menu in the WordPress block editor (on the CPT admin screen — §2) — written as a formal gate so "no builder
shipped" can never slip through silently again. It sits over the architecture P1 locked; it does not
re-open P1.

**The one big design decision — the EDITING HOME is a CPT admin screen, not the Site Editor
(revised 2026-07-18 after a grounded wp-sgs-developer analysis; supersedes v2's Site-Editor framing).**
The client edits their header/footer as a normal post on a findable **"SGS Header / Footer" admin
menu** (the `sgs_header`/`sgs_footer` CPTs already exist and open on the `sgs/site-header`/`site-footer`
blocks; the SGS admin submenus already exist). The block **inspector is still the control surface** —
opening the CPT selects the block and its inspector IS the builder — but the *home* is the post editor,
not the Site Editor. This is superior on every axis that matters (§2): it is findable (the #1 non-coder
failure was Site-Editor navigation), the responsive device-switcher **just works** (the post editor has
the `core/editor` store our switcher already reads — the Cynic's biggest risk, gone), and it gives
native multiple-saved-headers + draft/preview-before-publish + revisions for free. The **Hybrid**
option (edit in both the CPT screen AND the Site Editor) is REJECTED: WP has no native CPT↔template-part
sync, so it is the two-stores-drift parallel-system trap this whole design exists to avoid.

**Two decisions the council added (Bean-steered 2026-07-18):**
- **Start from a template, not a blank panel.** The builder's entry point is a **"Choose a header
  style" starter-pattern picker** — the non-coder motion is *pick a good header, change the logo*, not
  configure-from-blank. Your cloning converter is the factory that generates the starter packs (§2.5).
- **The panel may offer intent-level PRESET controls** ("Layout: Centered / Split / Minimal" that set
  several attributes at once) — the converter still targets the underlying attribute layer, so cloning
  is unaffected, but the everyday UX is not capped to one-control-per-attribute (§2.6).

**The everyday surface stays tiny; power hides.** ~3 controls per element by default (the
conversion-evidence set), the rest behind a named "Advanced" disclosure — and an operator can
**pin/unpin** which controls sit on their everyday surface (the ≤3 lint is the sensible default, not a
ceiling the client can't influence) (§5).

**How responsiveness feels.** One value set once (desktop); tablet/mobile inherit unless overridden;
"inherit from desktop" is a real, visible control state (DP1). **Caveat the council forced (§2.4):**
the promise that *switching to the mobile tab resizes the editor canvas* depends on the Site Editor
exposing a settable device type — this is a **RISK to verify with a 15-min live spike BEFORE P3**, not
a proven capability, because the component we reuse syncs via the *post*-editor store.

**What ships first.** A single **additive vertical slice — the drawer settings (FR-34-5) only** (the
council cut the tri-state control + the real-clone-in proof from it: neither can be honestly tested by
drawer settings, §10). It proves the responsive-value control pattern + the Advanced IA with zero
production risk, and proves converter-fit by a schema-conformance check (not a walker that doesn't
exist yet). The tri-state control + the real clone-in proof move to P3, where the real `headerSticky`
reshape tests them for real.

## 0b. Gate-2 council revisions (what changed from v1, and why)

The v1 draft went through a 6-persona adversarial council (Gate 2). It endorsed the *direction*
(inspector-as-builder, tri-state model, progressive disclosure, converter co-design — nobody dissented)
but graded the artefact C-centre (D+ to B‑): "right design, over-claimed readiness." Every convergent
must-fix is folded into this v2. The map:

| Council finding (voices) | v1 problem | v2 fix (section) |
|---|---|---|
| **DP6 slice needs the P6 walker (3)** | §9/§10 required the first slice to "clone a real header in" — but the walker is P6, unbuilt | Slice proves DP6 by **attribute-schema conformance**; real clone-in moves to the walker's phase (§9, §10) |
| **Designed for Site Editor, verified the wrong editor (~5)** | Claimed the device switcher resizes the canvas; it syncs via `core/editor` (post editor), likely null in the Site Editor | **Named pre-P3 live spike** (device-sync via `core/edit-site` + PluginSidebar-in-Site-Editor); claim softened (§2.4) |
| **Reshaping 4 live flags → D328 silent coercion → sticky OFF in prod (2)** | §4.1 waved the migration to "P3 canary gate" without naming the coercion | **Explicit migration plan** — new attr NAMES + read-time fallback + re-clone; canary before/after check (§6c) |
| **Cut the tri-state from the slice (3)** | §10 companion built the tri-state against a throwaway attr = build-it-twice | **Cut** — slice is drawer value-controls only; tri-state → P3 (§10). *Bean-confirmed.* |
| **Drawer-editing entry point undefined (3)** | DP5 Task 3 needs the operator to open/select the drawer; unspecified | **"Edit menu drawer" entry point** + the open-in-canvas editing UX (§2.3, §5.3) |
| **DP5 test weak — un-blinded, confirmatory (3)** | Author-run, on the 3 easy tasks | **≥3 blind testers + an untimed Advanced-discovery probe + a P4-gate statement** (§8) |
| **Tri-state comprehension/microcopy (2)** | Control shape specified; the words a non-coder reads were not | **Microcopy defined** + simple-surface sticky = single toggle w/ a secondary "per-device" reveal (§4.1) |
| **Contrast notice not computable / no dismissal rule (3)** | "over a light hero" isn't knowable to the header; dismissal undefined | **Computable trigger** (header's own resolved bg) + **dismissal persistence rule** (§7) |
| **Site-Info is a 2nd store; phone splits 2 homes; absent from converter map (3)** | §9 map omitted Site-Info; phone edited in sidebar, toggled in inspector | Site-Info **added to §9** with an explicit clone target; phone flow reconciled (§2.6, §9) |
| **on/off render mechanism contradicts Spec 32 (1, concrete)** | §6a said "reuse the body-class mechanism" — global, not scoped | **Scoped `#uid` `@media` rule** in the block's own `<style>`; body-class retired for this (§6a) |
| **§4.2 has no API; §6 resolver naming/edge cases (Spec-Lawyer)** | Extended `ResponsiveControl` had no prop signature; resolver named 2 ways | **Concrete §4.2 API + single-named resolver + desktop=`'inherit'` guard + box-null shape** (§4.2, §6) |
| **A11y "compliant by intention not specification" (Operator)** | Keyboard/focus/ARIA/44px asserted, not specified | **Full a11y contract** for both components (§4.3) |
| **No template library — the non-coder deal-winner (Competitor)** | Configure-from-blank | **Starter-pattern picker as the entry point** (§2.5). *Bean-added as a named goal.* |
| **Inspector 1:1 caps the UX (Competitor)** | "Inspector = 1:1 attribute view" forbade preset controls | **Decoupled** — converter targets attributes; inspector may add preset controls (§2.6). *Bean-confirmed.* |
| **Hard cap fights client self-service (Competitor)** | ≤3 lint = a ceiling a client can't influence | **Operator pin/unpin; lint = default not ceiling** (§5). *Bean-confirmed.* |

Non-convergent should-fixes also folded: `__experimental` API treadmill into the DP3 smoke-suite
(§4.4); SSR editor-preview parity for the tri-state (§4.4); mega-menu shape downgraded to "slot
reserved, TBD P5" (§5.4); drawer responsive tiers scoped to where the drawer renders (§5.3).

**v2 → v3 (post wp-sgs-developer analysis, Bean-requested):** the **editing home moved from the Site
Editor to the `sgs_header`/`sgs_footer` CPT admin screen** (§2) — superior on findability, device-sync,
preview/versioning, and converter-emit; Hybrid rejected (no native CPT↔template-part sync). The v2
Site-Editor blocking spike (§2.4) downgraded to a cheap confirmation because the CPT post editor already
carries the `core/editor` store the switcher reads. The architecture-alternatives sweep Bean asked for
is §13 — most decisions pressure-tested as already-right; two real action items (a stale Spec 17 claim;
the CPT pattern-registration timing gap) + one considered-and-declined (a scoped D270 exception).

**v3 → v4 (specialist review gate — Bean-requested; two agents grounded against LIVE code):**
- **`wp-sgs-developer` (build review, GO-cond B‑)** — 4 build-blockers the council missed *because no
  council persona read the PHP/JS*: a11y contract corrected to the real `ButtonGroup`-not-tablist
  component + a named P3 upgrade (§4.3); the CPT active-header short-circuit given an exact hook + its own
  re-entrancy guard + a re-applied behaviour filter so §6a's CSS injects (§2.2); box-per-side cascade
  named as NEW P3 build not "unchanged mechanism" (§6d); both-attrs-present migration precedence (§6c).
  Plus should-fixes: tester sourcing floor (§8), the brand-strip `ServerSideRender` precedent (§4.4), the
  Site-Info binding-source fn (§9).
- **`design-reviewer` (UX review, GO-cond B‑/B)** — 3 UX must-fixes: a persistent "customised" indicator
  + explicit flip-behaviour on the tri-state (§4.1); the starter-picker actually DESIGNED (card grid,
  thumbnails, start-from-scratch, preview-before-apply, §2.5); a one-click "turn on contrast safety"
  escape hatch (§7). Plus: ghost-text inherited value (§4.2), reduced-motion (§4.3), CPT "Active" badge
  (§2.2), and the pin/unpin refinement.
- **Bean decision (2026-07-18):** pin/unpin **kept but default-off, tucked into an Advanced "Customise
  this panel" action** (§5) — not a first-class handle a non-coder can trigger by accident.
- **Process lesson (carry to P4's gate + captured):** a 6-persona adversarial council with NO
  live-code-grounded reviewer converges on rhetorical/UX gaps and rubber-stamps code-level claims. Every
  future Gate on this track REQUIRES ≥1 reviewer grounded against the actual source (the way these two
  specialist passes were). Extends memory `verify-contents-not-filename-or-wiring`.

**v4 → v5 (Bean-requested — detail the WP mechanics, don't assume):** added **§14 — WP Control
Implementation Spec**, binding the builder to **Spec 35 (Block Inspector UX + Control-Completeness,
6-stream research)**. §14 specifies the EXACT component + props + WP version + stability for every
control, maps each of the current blocks' defects (dead controls / duplicates / missing controls / no
transparency / no per-device / no WP column features / raw selects / no presets) to its concrete fix,
states every native-vs-hand-roll call with the WP version (so nothing is assumed "available for years"),
and makes Spec 35 Part L the per-block definition-of-done. Key P3 framework fixes surfaced: add
`enableAlpha`+`clearable` to `DesignTokenPicker` (the transparency gap), a shared `SgsLinkControl`
wrapper, native `layout` support for real footer/header columns, and `templateLock:"contentOnly"` on
starter patterns.

---

## 0a. Scope + non-goals

**In scope (this doc designs all of it):** the surface decision + discoverability (§2); the
starter-template entry point (§2.5); preset-vs-atomic controls (§2.6); the per-block IA / simple-vs-
Advanced split with tab assignment + reorderable cap (§5); the two new shared components with concrete
APIs + a11y contracts (§4); the DP1 tri-state stored shape + cascade algorithm + the live-flag
migration plan (§6); the informational-only contrast notice (§7); the operator-simplicity test (§8);
the attribute→converter mapping incl. Site-Info (§9); the first vertical slice (§10).

**Out of scope (named, not dropped — STOP-29):** building anything (P3 model / P4 panel); reshaping the
5 live blocks' flat attrs (P3, canary-first per §6c); the mega-menu 2D content-builder UX (slot +
shape reserved §5.4 → P5); advanced header modes' full behaviour (P5); the header/footer clone WALKER
(Spec 33 Part 2 / FR-S9-11 → the phase that builds it; this doc only fixes attribute shapes so the
walker has a faithful target, §9). The starter-template **library build** is a named goal (§2.5) whose
phase Bean scopes at sign-off — this doc designs its shape, not its build.

---

## 0c. Binding build constraints (Bean-locked 2026-07-18 — apply to every P3/P4 build task)

These bind every block, control, and emit in this design. A P3/P4 task that violates one is wrong,
regardless of what else it achieves.

1. **NO unnecessary inline styles (Spec 32).** Nothing renders as an inline `style="…"` property
   declaration. Native styling supports stay declared (client-facing controls) but flip to scoped
   serialisation (`__experimentalSkipSerialization` + `wp_style_engine_get_styles($style,['selector'=>"#uid"])`
   appended to the block's own scoped `<style>`). Responsive tiers + `:hover` live in stylesheet rules,
   never inline. The only permitted non-attr output is a non-device-breakpoint rule routed to
   `sgsCustomCss`. Overrides = CSS custom-property VALUES, never inline declarations. The
   `audit-inline-styling.js` instrument + the no-inline land-verify harness gate this.
2. **Use SGS blocks — NEVER a core block we've replaced (`block-replacements.json` / ban-clear).** The
   builder's templates, patterns, starters, and converter emit use `sgs/container` (never `core/group`/
   `core/columns`/`core/column`), `sgs/heading`/`sgs/text` (never `core/heading`/`core/paragraph` where
   replaced), `sgs/separator` (never `core/separator`), etc. The `check-no-core-blocks.py` prebuild gate
   fails the build on any banned core block in theme files; `lint-page.py` catches them in page content.
   **The ONE deliberate exception is under active decision:** §15 (the nav-engine build-vs-adopt) may
   consciously ADOPT `core/navigation` if the research says core nav now meets the bar — that would be a
   *decided, documented* exception (core nav is not a "replaced" block — SGS never shipped a core-nav
   replacement that's banned; `sgs/adaptive-nav` is a composite, and whether it stays is §15's call). No
   OTHER core-block adoption is permitted by accident.
3. **Native `layout` for columns, real responsive controls, no hardcoded counts** (§14.4).
4. **Spec 35 Part L is the per-block definition-of-done** (§14). **Spec 32 governs rendered output;
   Spec 35 governs the editor controls.** Both are gates, not aspirations.

## 1. Design principles → traceability

| Locked constraint | Honoured in | One-line resolution |
|---|---|---|
| **DP1** — tiered tri-state on/off | §4.1 + §6 | `ResponsiveTriStateControl`; stored `inherit\|on\|off` per tier; desktop concrete. |
| **DP2** — Advanced = NAMED, CAPPED list | §5 | Exact per-block split; ≤3 default; operator-reorderable; lint = default. |
| **DP2a** — a11y feedback INFORMATIONAL ONLY | §7 | Passive `Notice`; never a gate; computable trigger + dismissal rule. |
| **DP4** — vertical slice FIRST | §10 | Drawer settings (FR-34-5) only; additive; tri-state + clone-in cut → P3/walker. |
| **DP5** — operator-simplicity pass/fail test | §8 | 3-task script, <3 min, blind ≥3 testers, + discovery probe. |
| **DP6** — converter-emittable BY CONSTRUCTION | §9 | Attribute map incl. Site-Info; slice proves it by **schema conformance** (walker later). |

Council conditions C1–C7 (from the P1 Gate-1 council) remain honoured as in v1; the Gate-2 council
findings are folded per §0b.

---

## 2. Surface decision — where the builder lives (CPT editing home)

*Revised 2026-07-18 after a grounded wp-sgs-developer analysis (report folded here). v2 put the editing
home in the Site Editor; the analysis showed a CPT admin screen is superior on findability, device-sync,
preview/versioning, and converter-emit. The block inspector remains the control surface either way — only
the container/home changes.*

### 2.1 The editing home = the `sgs_header` / `sgs_footer` CPT admin screen
The client edits their header as a **normal post** (`post.php`, the classic block/post editor) on a
findable **"SGS Header / Footer" admin-menu item**. Verified live: the CPTs already exist
(`class-sgs-block-cpts.php:38,41`), registered with `'template' => [['sgs/site-header']]` /
`[['sgs/site-footer']]` (they open on the right blocks), and SGS already has the admin submenus
(`register_submenus()` — "Advanced Headers"/"Advanced Footers" under the SGS top-level menu). The delta
to expose them is small (flip `show_in_menu` / surface via the existing submenu). **The block inspector
is still the builder** — selecting `sgs/site-header` in the CPT canvas shows exactly the panels §3–§9
design. No separate aggregated builder panel, no second control store.

**Why CPT beats the two rejected alternatives (analysis, ranked on this client persona):**
- **CPT (chosen):** findable admin menu; native multiple-saved-headers (the CPT list table); native
  draft/preview-before-publish + revisions (template parts have none); the device-switcher works
  unchanged (§2.4); the converter writes a `wp_posts` row (simpler than a `wp_template_part` row).
- **Site-Editor template-part only (v2's framing) — REJECTED as the home:** the #1 non-coder failure is
  Site-Editor navigation; no draft/preview workflow; the device-switcher carries the `core/edit-site`
  risk (§2.4). Retained ONLY as the immutable code-shipped fallback (§2.2).
- **Hybrid (both) — REJECTED:** WP has **no native CPT↔template-part sync**; two editable stores holding
  the same header drift the moment one is edited and not the other — the exact parallel-system trap this
  design exists to kill. The only gain (FSE power-user access) is unneeded: header editing is already
  gated to `edit_theme_options` (agency-only), and the non-coder client never needs FSE. Not worth the
  permanent sync liability.

### 2.2 The binding mechanism — how a CPT header becomes the live site header
A CPT post is NOT automatically the site header; something must render the *active* one into the
`<header>` slot. A working display-conditions engine already exists — `Sgs_Header_Rules`
(`class-sgs-header-rules.php`) hooks `pre_render_block`, walks an ordered rules list
(`wp_options['sgs_header_rules']`, conditions: post_type/template/url/role/device, first-match-wins),
and renders the matched pattern, with an immutable `sgs/framework-header-default` fallback. This is the
same shape as Elementor Theme Builder / Kadence Elements display rules. The design uses it as follows:
- **Common case (one header) — LOCKED to one mechanism + exact hook (wp-sgs-developer MF1):** a
  **"Set as active header"** action on the CPT writes `wp_options['sgs_active_header_cpt_id']`, and
  `Sgs_Header_Rules::filter_template_part()` (`class-sgs-header-rules.php:195-208`) gains an **early
  `if ( get_option('sgs_active_header_cpt_id') )` branch BEFORE `self::evaluate()`** that renders that
  post directly. This bypasses the whole rules engine for the common case (matches "before the rules
  list" literally) and keeps it separate from the advanced rules UI. **It needs its OWN re-entrancy
  guard** — the existing `$evaluated_this_request` static guards `evaluate()`, not this new branch, so a
  page that renders `core/template-part area="header"` twice (rare: some templates render a preview
  header) would double-render without a dedicated guard on the new branch.
- **The direct-render must re-apply the behaviour filter (wp-sgs-developer MF2):** the `cpt:{post_id}`
  fast-path renders `get_post($id)->post_content` via `do_blocks()` — but it MUST still pass its HTML
  through `apply_filters('sgs_header_rule_resolved', $html, ...)` before returning, because that filter
  (fired today inside `evaluate()`, `class-sgs-header-rules.php:236-249`) is the injection point the §6a
  sticky/transparent/shrink scoped-CSS emission hooks. Skip it and the header behaviours silently don't
  apply. One line, but named here so it can't ship missing.
- **Advanced case (header-per-page-type):** the existing multi-condition rules UI stays for power users.
- **"Active" indicator (design-reviewer #7):** the CPT list table shows an **"Active" badge/status
  column** (the pattern WP uses for the active theme in Appearance → Themes) so a client with 2 saved
  headers can see which is live without opening each.
- **⚠ Pre-P3 VERIFY-then-FIX (structural gap; unverified as a live bug):** CPT-derived patterns register
  on `admin_init` only (`class-sgs-block-cpts.php:55`), but rules resolve on the **frontend** — a
  CPT-targeted rule may silently fail live. **First P3 task:** create a CPT header, add a rule, hit the
  frontend cold, confirm. The `cpt:{post_id}` direct-render fix above (do_blocks + re-apply filter) is
  the by-construction fix. Est: a single-file PHP change + the "Set as active" action ≈ a few hours.

### 2.3 Findability + entry points (the CPT admin menu closes the convergence)
The council's biggest convergent finding (findability, ~5 voices) is answered by the CPT home itself:
"SGS Header" / "SGS Footer" are top-level-ish admin-menu items a client can find the way they find
Posts/Pages — no Site-Editor treasure hunt. Additions:
- **Cold-start pointers** from wp-admin furniture: an admin-bar "Edit header/footer" link + a
  Dashboard/Appearance pointer, so "change your phone number" lands on the right screen.
- **Drawer editing (DP5 Task 3):** inside the CPT canvas, the `sgs/adaptive-nav` drawer is a hidden
  `<dialog>`; the design adds a **"Edit menu drawer" affordance** (a toggle/List-View entry that puts the
  drawer into a persistent "preview-open" editing state) so its InnerBlocks are reachable. This is the
  Task-3 mechanism the council flagged as unspecified.
- **The starter-template picker (§2.5)** is the visual entry — "New header → choose a style" seeds a new
  CPT post — the demo-winning surface, with no second data store.

### 2.4 The device-switcher — CPT lowers the risk to a confirmation (was a blocking spike in v2)
The live `ResponsiveControl` syncs via **`core/editor` `getDeviceType()`** (`ResponsiveControl.js:45-51`),
with a documented fallback to local state where that store is absent. **The CPT post editor (`post.php`)
loads the `edit-post` app family, which registers `core/editor`** — the store the component was built
against — so on the CPT home the switcher **should work unchanged, canvas-resize included**. (The Site
Editor is the different `edit-site` app whose device type is `core/edit-site`; that was the risk in v2's
framing.) This is a concrete point *for* CPT: it removes v2's blocking spike. **Residual (cheap
confirmation, not a blocker):** confirm on the sandybrown WP 7.0.2 CPT editor that `core/editor`
deviceType drives the canvas as expected (the wp-sgs-developer analysis asserts this from WP-platform
knowledge but flagged it as not-live-tested). If it somehow doesn't, tier-switching degrades to
control-only (edits the stored value; operator uses WP's own preview) — the data model is unaffected
either way. Run it in the same session as the §2.2 binding check.

### 2.5 Starter-template library — the entry point (Bean-added; council's biggest gap)
The builder's *first screen* for a fresh client is **"New header → choose a style"**: creating a new
`sgs_header` CPT post opens a visual picker of designed header **styles** ("style" is the ONE term used
everywhere — not "template"/"layout"). This is the highest-leverage screen in the whole builder (blank
panel = ADHD/non-coder stall; a gallery = a 10-second first action), so its UI is DESIGNED here, not just
named (design-reviewer MUST-FIX #2):
- **A responsive card grid** (not a dropdown/list — the only format that makes "pick a good header, tweak
  the logo" a genuine visual decision). Each card = a **live thumbnail** + a one-line use-case descriptor
  ("Best for: restaurants, simple menu"), not just a name.
- **A persistent "Start from scratch" card** at the end of the grid — never force a style (Kadence/Spectra
  escape hatch).
- **Preview-before-apply** — clicking a card opens a full-size preview modal (Elementor pattern) before it
  seeds the post, so a client never overwrites in-progress work by a mis-click.
- **Re-visit behaviour (was unstated):** the picker shows on CPT *creation*; from an existing header, the
  "choose a different style" path is a deliberate action (re-opens the grid with a "this replaces your
  current header" confirm), never automatic.
- Starters are **block patterns** (`theme/sgs-theme/patterns/*.php` — git-versioned + read-only-to-clients;
  a `wp_block`/synced pattern is right only for per-client operator-saved variations, not framework
  starters). The picker seeds the CPT post from the chosen pattern (the CPT's `'template'` seed makes this
  native).
- The **cloning converter is the pack factory**: the same emit path (§9) that clones a client's header
  into these blocks generates the framework starter packs — so the moat (§9) finally points at the
  DIY buyer, not only at agency delivery.
- **Named goal, phase TBD at sign-off.** This doc designs the shape; the build (curating ~15–20
  starter patterns + wiring the picker) is a named roadmap goal, not P2/P3 slice work. It does NOT
  block the model build.

### 2.6 Preset controls + Site-Info reconciliation (decouple; Bean-confirmed)
- **The converter targets the ATTRIBUTE layer; the inspector is free to add composite PRESET
  controls** on top (e.g. a "Layout" `ToggleGroupControl`: Centered / Split / Minimal that writes
  several attrs at once). This does NOT weaken DP6 — presets write the same converter-writable
  attributes; they are an operator convenience, not a parallel data path. The v1 phrase "inspector =
  1:1 attribute view" is **struck**: the inspector is a view of, and a composer over, the attributes.
- **Site-Info phone flow (the two-homes fix):** the number is *typed* once on the existing Site-Info
  admin page (FR-S4-3 — the one genuinely cross-cutting store, `sgs_site_info` in `wp_options`, verified
  the correct WP-native singleton-config store); the header inspector's "Show phone / click-to-call"
  **toggle** (in the CPT block inspector) surfaces it. To kill the "which screen" confusion, the toggle's
  help line deep-links to the Site-Info page, and **if Site-Info has no phone set, the toggle renders an
  inline nudge** ("Add a phone number in Site Info →"), never a silent broken element. Site-Info's
  converter emit is specified in §9 (it is a PHP option store, so it needs an explicit clone target — the
  v1 omission the Cynic caught).

---

## 3. Information architecture — the inspector, per block

Native two-group split (already in the codebase): `InspectorControls` default = **Styles** tab;
`InspectorControls group="settings"` = **Settings** tab. Within each: `PanelBody` (simple, open) vs
`ToolsPanel` (Advanced disclosure — the existing show-more pattern). **No third mechanism.** Every
control in §5 carries an explicit **tab assignment** (Styles vs Settings) and a **surface** (Simple vs
Advanced) — the two axes an implementer needs and v1 left to guess.

---

## 4. The two NEW shared components (concrete APIs + a11y contract)

Files: `plugins/sgs-blocks/src/components/ResponsiveTriStateControl.js` (new) and the extension lives
in `plugins/sgs-blocks/src/components/ResponsiveControl.js` (edited in place, back-compatible).

### 4.1 `ResponsiveTriStateControl` — the DP1 on/off control
Composes `ResponsiveControl`'s render-prop + device-sync (subject to §2.4) and `StateToggleControl`'s
`__experimentalToggleGroupControl` segmented switch + visible-legend idiom.

**Shape:** desktop tier = 2-option (`Off`/`On`, concrete base, no Inherit); tablet/mobile = 3-option
(`Inherit`/`Off`/`On`, default `Inherit`). The `Inherit` option's label resolves inline —
*"Inherit (following Desktop: On)"* — so the operator always sees what inherit means now.

**Microcopy (defined — the council said "control shape ≠ the words a non-coder reads"):**
- Simple-surface sticky renders as a **single `ToggleControl`** ("Sticky on scroll") for the common
  case, with a secondary, clearly-subordinate **"Customise per device →"** link that expands the full
  tri-state device switcher. So the everyday case is one glance/one click; the per-tier power is one
  step away, not in the operator's face. (Resolves Operator MF-O2.)
- **Persistent override indicator + explicit flip behaviour (design-reviewer MUST-FIX #1 — the
  highest-support-ticket failure mode):** when ANY tier holds an explicit (non-inherit) value, the
  simple toggle shows a **persistent trace** — a small "Customised for Tablet, Phone" line beneath it,
  and a **coloured dot on the affected device icons** (the proven Kadence pattern — steal it). Reuses the
  `resolveTier`/value-presence check already in §4.2; adds no control. **And state it explicitly (the
  ambiguity that causes "I turned it off but it's still sticky on my phone"):** the simple toggle
  controls the **desktop tier only**; flipping it does **NOT** touch existing tablet/phone overrides.
  The operator clears an override via the tri-state's per-tier reset (§4.2), never by accident from the
  simple toggle.
- Tier labels: "All devices" (desktop, the base) / "Tablet" / "Phone" (avoid "mobile" jargon).
- The `Inherit` option help: "Uses the All-devices setting ({resolved})." No word "cascade".

**API:**
```
<ResponsiveTriStateControl
    label={ __( 'Sticky on scroll', 'sgs-blocks' ) }
    help={ __( 'Pins the header to the top as the visitor scrolls.', 'sgs-blocks' ) }
    value={ headerSticky }              // { desktop:'on'|'off', tablet:'inherit'|'on'|'off', mobile:… }
    onChange={ ( next ) => setAttributes( { headerSticky: next } ) }
    defaultDesktop="off"                // the block's shipped base for a fresh insert
/>
```
The resolved inline hint uses the shared `resolveTier` helper (§6). **Stored shape** (answers C3):
`{ desktop:'on'|'off', tablet:'inherit'|'on'|'off', mobile:'inherit'|'on'|'off' }`, desktop default per
block, tablet/mobile default `'inherit'`. No flat boolean. Migration of the 4 live flags → §6c.

### 4.2 Extended `ResponsiveControl` — inherit indicator + reset (the FR-S9-6 gap, with a real API)
The live component is a pure render-prop wrapper taking only `{ children, label }` — it does NOT know
the value. The extension adds the props it needs to show inherited-state + reset:
```
<ResponsiveControl
    label={ __( 'Inner spacing', 'sgs-blocks' ) }
    value={ drawerGap }                     // { desktop, tablet:null|val, mobile:null|val }
    isInherited={ ( tier ) => value[ tier ] == null }          // tier is inheriting
    resolvedValue={ ( tier ) => resolveTier( value, tier ) }   // what it resolves to (for the hint)
    onReset={ ( tier ) => onChange( { ...value, [ tier ]: null } ) }  // reset-to-inherited
>
    { ( tier ) => <UnitControl value={ value[ tier ] ?? '' } … /> }
</ResponsiveControl>
```
- **Inherited affordance** (tablet/phone) — **primary signal = the resolved value rendered as
  ghost/placeholder-style text INSIDE the value field** (`28px` greyed, the Kadence pattern —
  design-reviewer #4: an icon-on-the-tab alone is a known-weak signal sighted users miss). So both
  sighted + screen-reader users get the same signal from the same place. Backed for AT by exposing that
  value via `aria-describedby` → a visible text node (`Inheriting from All devices: 28px`), never a bare
  `placeholder` attribute (WCAG 1.4.1 + 4.1.2 — Operator MF-A2). The tab icon is a nice-to-have, not the
  primary cue.
- **"Reset to inherited"** button: rendered on tablet/phone only when that tier has an explicit value;
  DOM position = immediately after the tier's value input, before the next tier tab; `aria-label="Reset
  {label} to inherited value"`; **on click, focus moves to the now-inherited value display** (never
  left dangling on the unmounting button — the Operator MF-A1 focus-loss fix). Keyboard-reachable
  Tab+Enter (not right-click-only, FR-S9-6).
- No new store; no `__experimental` device component.

### 4.3 A11y contract for BOTH components (corrected against live code — wp-sgs-developer MF4)
> **CORRECTION (v4):** v3 claimed the device switcher has `role="tablist"` + arrow-key nav "WP
> provides". **False against live code:** `ResponsiveControl.js:77-89` renders a `ButtonGroup` of plain
> `Button`s with `isPressed` — **no `tablist` role, no arrow-key nav (Tab-key only)**; and
> `StateToggleControl`'s `ToggleGroupControl` renders `role="radiogroup"`, not `tablist`. Built as v3
> literally wrote it, this would FAIL an a11y audit. The honest, buildable contract:
- **Named P3 task — upgrade the device switcher:** raise `ResponsiveControl`'s `ButtonGroup` to a real
  `role="tablist"` with roving-tabindex arrow-key navigation (or an equivalent `radiogroup`), so tier
  switching is keyboard-conformant. This is a genuine component upgrade, not a free assertion — the P3
  estimate carries it. The tri-state segment is a `ToggleGroupControl` (`radiogroup`, arrow-key native).
- **Keyboard:** after that upgrade, both the device tier control and the tri-state segments are
  arrow-key traversable + Tab-reachable; every interactive element operable by keyboard.
- **Touch targets:** the tri-state segments and the device tabs meet **44×44px** (project non-negotiable).
  **Pre-existing gap named, not carried silently:** `ResponsiveControl.js:80-87` uses `size="small"`
  WP `Button`s (~24-32px) — below 44px. P3/P4 raise these to 44px in the same build; this is a fix, not
  a forward-carry.
- **Non-colour state:** inherited/selected state uses icon + text + `aria-label`, never colour alone
  (1.4.1); the selected-segment boundary meets non-text contrast 3:1 (1.4.11).
- **Screen-reader tier-change announcement:** switching device tier resizes the canvas + changes which
  stored value edits target — a large non-local effect. Both components share an `aria-live="polite"`
  region announcing the active tier ("Now editing Phone view") so an SR user isn't silently editing the
  wrong tier (Operator MF-A4).
- **Focus visibility** preserved on all segments/tabs/buttons (WCAG 2.4.7, kept from 2.2 cheap wins).
- **Reduced motion (design-reviewer #6):** the canvas-resize side-effect on tier switch (§2.4) is a
  viewport-level animated resize — gate its transition on `prefers-reduced-motion` (framework WCAG 2.1
  AA baseline requires it).

### 4.4 Maintenance honesty (should-fixes folded)
- Both components sit on `__experimentalToggleGroupControl` + the Advanced IA on `__experimentalToolsPanel`.
  These are unstable WP APIs; **they join the DP3 per-WP-release regression smoke-suite** (the design
  does not claim they are zero-maintenance).
- **Editor-preview parity:** the tri-state's *resolved* per-tier behaviour is not visible in a hand-
  built `edit.js` preview (SSR-vs-preview drift, the `ssr-fixes-hand-built-preview-drift` lesson). P4
  decides the preview approach — **reference implementation: `sgs/brand-strip`, fixed 2026-07-18 by
  switching to `<ServerSideRender>` for exactly this drift class** (wp-sgs-developer should-fix — name it
  so P4 doesn't re-derive the decision) — or an explicit "preview reflects saved settings after publish"
  note. Flagged so P4 doesn't hand-build a drifting preview.

---

## 5. Per-block IA — simple vs Advanced, with tab assignment + reorderable cap (DP2)

**The cap (Bean-steered + design-reviewer #5 refinement):** the simple `PanelBody` ships **≤3 controls
by default**, from the conversion-evidence set. **An operator can pin/unpin** which controls sit on their
everyday surface (stored per-site) — so ≤3 is the *default*, not a ceiling a client must wait for a
release to change. **BUT pin/unpin is DEFAULT-OFF and tucked deeper (Bean-confirmed 2026-07-18):** it is
NOT a first-class drag handle on the simple surface (a tech-illiterate client could unpin a control they
use and get a "missing setting" with no trail); it is reachable only from a deliberate **"Customise this
panel"** action inside Advanced. This keeps the competitor answer ("you choose your everyday controls")
without the accidental-hide support risk. The build-time lint `check-simple-surface-cap.js` enforces the
*default* set, not an absolute number (see §5.5).

**"Control" is defined** (Spec-Lawyer MF6): one labelled inspector row = one control. A
`ResponsiveTriStateControl` counts as **one** control (its device tabs are one row's affordance, not
three controls).

| Block | Tab | Simple (default ≤3, pinnable) | Advanced (`ToolsPanel`) |
|---|---|---|---|
| `sgs/site-header` | Settings | Sticky on scroll (single toggle + per-device reveal, §4.1) · Show phone/click-to-call (§2.6) | Transparent-until-scrolled · Shrink · Contrast mode (informational §7) |
| `sgs/site-header` | Styles | *(Layout preset §2.6 — Centered/Split/Minimal)* | Header width (`WidthPanel`) · per-breakpoint spacing (`ResponsiveSpacingPanel`, §4.2 affordance) |
| `sgs/site-footer` | Settings | Columns (desktop count) · Show credit line | Per-breakpoint column count |
| `sgs/site-footer` | Styles | — | Background · spacing overrides |
| `sgs/adaptive-nav` | Settings | Which menu · Collapse-to-drawer breakpoint | Overflow behaviour · mega-menu enable (§5.4) |
| `sgs/adaptive-nav` | Styles | — | Link colour/hover (`DesignTokenPicker`) · link typography (`TypographyControls`) |
| Drawer (on `adaptive-nav`) | Settings | Background (`drawerBg`) · Drawer content (InnerBlocks, §2.3) | — |
| Drawer (on `adaptive-nav`) | Styles | — | **FR-34-5:** Close-icon colour · Content alignment · Inner spacing (responsive) · Popup padding (responsive) |
| `sgs/nav-menu` | Styles | Link colour | Divider toggle/colour · item padding · typography · independent menu source (`ref`) |

### 5.4 Mega-menu — slot reserved, shape TBD P5 (STOP-29 honesty; Ship-PM/Spec-Lawyer)
The v1 "attribute shape is fixed HERE" over-claimed — `wp_navigation` is core's ref-based menu
structure and where a per-item "has mega panel" flag lives against it is genuinely undecided. **v2:
the inspector SLOT is reserved** (an "Enable mega-menu" affordance on `adaptive-nav` Advanced that will
reveal the existing `sgs/mega-menu` block as the submenu's content); the **attribute shape + the
authoring UX are TBD in P5** and named there, not pretended-fixed now. This is a fourth potential
disclosure surface (a block revealed as InnerBlocks) — noted so P5 doesn't invent a third pattern
silently.

### 5.5 The cap lint (honest about what it enforces)
`check-simple-surface-cap.js` (wired to prebuild in P4, alongside `check-dead-controls.js`) asserts the
simple `PanelBody` of each header/footer/nav block declares only the **named default allowlist**
(§5's Simple columns). It enforces "these are the defaults", not "≤3 of anything" — the two are
different, and the operator pin/unpin model means the *rendered* everyday set is per-site while the
*shipped default* is what the lint guards. The allowlist is data (a JSON map, R-31-1-clean), not a
hardcoded dict in the script. **It is a default-guard, not an absolute-count gate — stated so it isn't
mistaken for the latter.**

---

## 6. DP1 stored shape + cascade algorithm + live-flag migration (answers C3 + the D328 risk)

### 6a. On/off (tri-state) attrs — resolution + Spec-32-conformant emission
Stored `{ desktop:'on'|'off', tablet:'inherit'|'on'|'off', mobile:… }`. **One shared resolver**,
`resolveTier(value, tier)` (the single canonical name — the v1 `resolve(tier)`/`resolveTier(value,tier)`
clash is removed), implemented identically in PHP (render) and JS (the inline hint), with a golden test
asserting agreement over a fixture matrix:
```
resolveTier(value, tier):
  if tier == 'desktop':  return value.desktop == 'inherit' ? DEFAULT_OFF : value.desktop   # guard (§6b)
  if tier == 'tablet':   return value.tablet == 'inherit' ? resolveTier(value,'desktop') : value.tablet
  if tier == 'mobile':   return value.mobile == 'inherit' ? resolveTier(value,'tablet')  : value.mobile
```
**Emission (Spec-32-conformant — the Cynic MF3 fix):** the resolved per-tier on/off is emitted as a
**block-scoped `#uid` rule wrapped in that tier's `@media`** inside the block's own `<style>` — NOT a
`<body>` class (sticky is `position:sticky` on the header element, a block-scoped property; a global
body-class both violates the no-inline/scoped contract and can't express "sticky ON desktop / OFF
mobile"). `class-sgs-header-behaviours.php`'s body-class path is **retired for these per-tier
behaviours** (or repurposed purely as the scoped-`<style>` emitter) — P3 states which, and shows the
exact CSS for "sticky ON All-devices / OFF Phone" so no interpretation remains. The `--sgs-header-
height` ResizeObserver publisher (FR-S9-9) is untouched.

### 6b. `desktop == 'inherit'` guard (Spec-Lawyer MF3)
The UI never offers Inherit at desktop, but a migration/converter/corruption could write it. The
resolver **coerces `desktop:'inherit'` → `DEFAULT_OFF`** (the block's shipped base), deterministically —
never throws, never silently sticks. Stated so two agents resolve it identically.

### 6c. Migrating the 4 live flat attrs → tri-state (the production-regression fix — Cynic MF5 + Spec-Lawyer MF5)
`headerSticky`/`headerTransparent`/`headerShrink` are live booleans on both production sites;
`contrastSafe` is a live enum. Changing the attr *type* under the *same name* triggers WP's silent
coerce-to-default (the `object-typed-attr-coerces-flat-to-default` lesson, D328) → **sticky/transparent/
shrink would silently switch OFF in production on the reshaping deploy**, and deprecations are banned
(D270). The migration is therefore **explicit, not "handled at the canary gate"**:
- **New attribute NAMES** for the tri-state versions (e.g. `stickyMode`/`transparentMode`/`shrinkMode`
  as `object`), leaving the old boolean attrs readable. render.php **reads the new attr if present,
  else falls back to the old boolean** (`headerSticky:true` → `{desktop:'on'}`) — a read-time
  migration, no deprecation, no coercion (the old boolean keeps its declared type).
- **Both-present precedence (wp-sgs-developer should-fix):** once `stickyMode` exists on a post,
  `headerSticky` is **never read again** (new attr wins unconditionally — no merge), and **P4 DELETES the
  old boolean's ToolsPanel item** rather than leaving it dual-wired, so a stale `headerSticky:true` can't
  be re-surfaced and cause a future regression.
- **Re-clone / re-author** the live header instances onto the new attrs via the CPT admin screen /
  block-editor recovery (WP-CLI `post_content` edits are forbidden) as part of P3; **canary-first (sandybrown → palestine-lives)**
  with a **live before/after computed-value check that sticky/transparent/shrink are preserved** on
  both sites before close. This is P3 work; named here so P3 cannot skip it.

### 6d. Value attrs — scalar mechanism is live; box-per-side is NEW P3 build (corrected — wp-sgs-developer MF3)
Scalar value attrs (`gap`, `drawerGap`, `linkFontSize`) keep the live `sgs_emit_responsive_css` contract
(`helpers-responsive.php:437-477`, verified: it implements scalar tier-diff cascade — mobile falls to
tablet falls to desktop, emitting only where a tier differs): `{ desktop:<val>, tablet:<val>|null,
mobile:<val>|null }`, `null`=inherit. **For BOX-shaped value attrs** (`drawerPadding`), tablet/mobile are
**objects with per-side nulls** — `{ desktop:{t,r,b,l}, tablet:{t:null,r:null,…}|null, mobile:… }` —
resolving per side (`mobile.top ?? tablet.top ?? desktop.top`); a whole-tier `null` = inherit every side.
**CORRECTION (v4): this per-side box decomposition is NEW capability, not "the live mechanism unchanged"
as v3 implied.** `sgs_responsive_atoms_from_spec` takes one atom per prop, not a box. **Named P3
sub-task:** extend it to decompose a box-object into 4 independent atoms with per-side inherit. **Live
check first:** grep `ResponsiveSpacingPanel`/`WidthPanel` (`site-header/edit.js:16`) for an existing
box-cascade P3 can LIFT rather than build fresh — if it exists, cite + reuse it; if not, the §10 P3
estimate must carry this as real build work. Cascade direction is fixed mobile-first (FR-S9-6).

---

## 7. DP2a — informational-only contrast notice (computable + dismissible, defined)
- **Default rendered output stays WCAG 2.1 AA** (framework baseline; transparent ships WITH a safe
  scrim by default — a safe default, not enforcement).
- **Computable trigger (Cynic should-fix):** the header cannot see the hero behind it, so the trigger
  is defined on **what the header itself resolves** — *Transparent on + Contrast mode = None* — a
  combination the inspector fully knows. It does NOT claim to detect "over a light hero" (undetectable
  from the header). Copy: *"Transparent header with contrast safety off can be hard to read over light
  images."* with **two actions: `[Turn on contrast safety]`** (a one-click fix — the escape hatch a
  dismissed non-coder otherwise never finds, design-reviewer MUST-FIX #3; it flips the setting, does NOT
  enforce — DP2a intact) **+ `[Preview]`** (WP front-end preview of the current template).
- **Dismissal rule (Support MF4):** the `Notice` dismissal persists **per block instance, in post/
  template-part meta** (auditable — the "we informed them" trail), keyed to the *specific risky
  combination*; a **different** risky combination re-shows a fresh notice (so dismissal isn't a blanket
  forever-silence, and isn't a per-session nag).
- **Never a gate**, never auto-enforced, never agent-wired (DP2a, Bean-locked — overrides council C4's
  "mandatory-on"). Marketing keeps the *default-safe scrim* loud so informational-only doesn't read as
  "SGS doesn't care about accessibility" (Competitor should-fix).

---

## 8. DP5 — operator-simplicity test (hardened; Operator/Competitor/Ship-PM)
**The test (P4 Gate-4 acceptance — NOT a slice check; the slice ships value-controls, not sticky/phone):**
> A fresh non-coder, given only wp-admin + a one-line brief, does all three in <3 min total,
> without opening any Advanced disclosure, unaided: (1) make the header **stick on scroll**; (2) **show
> a click-to-call phone** in the header; (3) put **3 links + 1 paragraph** into the mobile menu drawer.

**Hardening:**
- **Blind testers** (not the author) — a single author-run test is theatre with a stopwatch (Competitor).
  Target ≥3 fresh testers; **to avoid P4 stalling waiting for volunteers (wp-sgs-developer should-fix),
  the floor is Bean + 1 other, both blind, screen-recorded** — recruiting a 3rd is a nice-to-have, not a
  blocker on Gate 4.
- **The clock starts at cold-start** (finding the header from wp-admin), NOT after the panel is found —
  the entry-point (§2.3) is *in* the test (Competitor: don't skip the pre-registered failure).
- **Plus an untimed discovery probe** (Operator MF-O3): "make the header transparent" — observe whether
  the tester finds the Advanced disclosure unaided. Logged pass/fail separately; does not block Gate 4
  (per DP5 spirit) but is required in the report.
- **Operational definitions:** "opened Advanced" = the `ToolsPanel` menu/disclosure is expanded (from
  the screen-recording); "help request" = asking any person or leaving the editor for docs (re-reading
  the one-line brief is allowed). Report → `reports/visual-diff/operator-simplicity-<date>.md`.

---

## 9. DP6 — converter mapping (incl. Site-Info) + the honest proof path
The inspector is a view of, and composer over, block attributes; every capability maps to an attribute
the converter can write. **Site-Info (a PHP store, not a block attr) is now included** (Cynic MF4).
**Container (revised §2):** the header/footer emit target is now a **`sgs_header`/`sgs_footer` CPT post**
(`wp_insert_post` a `wp_posts` row + `post_content` = the block tree) — the analysis found this a
*simpler* converter write than a `wp_template_part` row (no area-taxonomy / theme-slug ceremony). The
converter writes the block attributes into the CPT post's content; the §2.2 activation rule makes it live.

| Capability | Attribute / target | Converter source | Notes |
|---|---|---|---|
| Sticky / Transparent / Shrink | `stickyMode`/`transparentMode`/`shrinkMode` tri-state objects (§6c) | header's `position`/transparency/shrink per media query | New names (§6c); per-tier resolve. |
| Contrast mode | `contrastSafe` enum | not extracted (informational) | Default safe; converter leaves default. |
| Which menu | `ref` / context | scraped `<nav>` → `wp_navigation` | FR-34-4. |
| Collapse breakpoint | `collapseTier` + `collapseCustomPx` | width where nav → burger | Existing. |
| Drawer bg / close-icon / align / spacing / padding | `drawerBg` + FR-34-5 `toggleOpenColour`/`drawerAlign`/`drawerGap`/`drawerPadding` | scraped drawer styles | FR-34-5 = NEW/additive. |
| Layout preset (§2.6) | writes the underlying layout attrs | scraped structure | Preset is an inspector convenience; converter writes the atoms. |
| **Site-Info** (logo/phone/email/address/hours/socials) | the `sgs_site_info` `wp_options` record (the write target the FR-S4 `register_block_bindings_source` callback reads) | scraped contact block / footer | **Explicit target named** (P3 cites the exact FR-S4 binding-source callback fn — wp-sgs-developer should-fix). Converter writes the option, not a block attr. Un-scrapable values = operator-only, not silently dropped. |
| Mega-menu | slot reserved; shape TBD P5 (§5.4) | scraped 2D dropdown | Not fixed now — STOP-29. |

**The DP6 proof path (decoupled — Cynic MF2 + Ship-PM + Competitor):** the first slice does NOT clone a
real header in (the walker is P6/unbuilt). It proves DP6 by **attribute-schema conformance**: a unit
check asserting the 4 FR-34-5 attrs match the shapes this table says the walker will emit. The
**real clone-through-walker proof moves to the phase that builds the walker** (Spec 33 Part 2). DP6
stays a design constraint threaded through every phase (each capability is attribute-settable) — it is
just not proven by a walker that doesn't exist yet.

---

## 10. First vertical slice — drawer settings (FR-34-5) ONLY (Bean-confirmed cut)
The council cut two things from v1's slice; Bean confirmed. The slice is now the smallest thing that
de-risks P3 with **zero production risk**:

**In the slice:**
- The 4 NEW FR-34-5 drawer attrs (`toggleOpenColour`/`drawerAlign`/`drawerGap`/`drawerPadding`) on
  `sgs/adaptive-nav` — **additive; zero reshape of any live flat attr** (verified absent in
  `adaptive-nav/block.json`).
- The **extended `ResponsiveControl`** (§4.2 — inherit indicator + reset) driving `drawerGap` (responsive
  value) + `drawerPadding` (responsive box via `BoxControl`).
- The **Advanced-disclosure IA + Styles/Settings tab placement** (§3/§5) on the drawer.
- **DP6 proof by schema-conformance** (§9) — not a walker clone-in.
- Deploy **canary-first (sandybrown) via `build-deploy.py`** (never hand-rolled tar/scp, D336); it's
  additive so rollback risk is low, but the deploy path is named.

**CUT from the slice (→ P3):**
- `ResponsiveTriStateControl` — the 4 drawer attrs are colour/enum/value, NOT on/off, so the slice
  cannot honestly test it; building it here against a throwaway attr = building it twice. It is proven
  in P3 on the **real `headerSticky` reshape** (§6c), where the tri-state is the actual mechanism.
- The **real clone-a-header-in** proof — needs the P6 walker (§9).

**North-star honesty (Ship-PM — stated, not buried):** this slice ships a **developer-facing** win (the
value-control pattern + Advanced IA proven, additively, on a live block). The **operator-facing**
north-star (sticky + click-to-call, the things a non-coder *feels*) still sits behind the **P3 live-flag
reshape** (§6c). The slice de-risks P3; it does not itself defuse the C6 stall trap. The genuine early
*operator* win, if one is wanted sooner, is the **starter-template picker (§2.5)** — which is why it's
now a named goal.

**Honest estimate (smallest-plausible):** slice ≈ 1–1.5 sessions (additive, one block). P3 (Site-Editor
spike + reshape 4 flags → tri-state + canary/rollback/regression on 2 prod sites) ≈ 2–3 sessions. P4
(panel + CPT admin menu + entry points + lint + operator test) ≈ 2 sessions. So P3+P4 ≈ 4–5 sessions with the
slice cut clean; more if the slice is built as v1 wrote it.

---

## 11. Open questions for Bean (the 4 strategic calls are now DECIDED; residuals only)
1. **DECIDED** — Template library: **YES, named goal** (§2.5). Phase to scope at roadmap level.
2. **DECIDED** — Preset controls: **YES, decouple** (§2.6).
3. **DECIDED** — First slice: **drawer settings only, tri-state cut → P3** (§10).
4. **DECIDED** — Cap: **reorderable + lint-as-default** (§5).
5. **DECIDED (this session)** — Editing home: **CPT admin screen, not the Site Editor** (§2); Hybrid
   rejected (parallel-system trap). Bean leaned CPT; the wp-sgs-developer analysis confirmed it decisively.
6. **Residual (P3 opener, not a P2 blocker):** two cheap live checks, same session — (a) the §2.2
   binding gap (does a CPT-targeted rule render on the frontend? fix the `admin_init`-only registration
   if not) and (b) the §2.4 confirmation (does `core/editor` deviceType drive the canvas on the CPT
   `post.php` editor as the analysis expects?). Both on sandybrown WP 7.0.2.
7. **Residual (QC-time):** exact contrast-notice + tri-state microcopy wording (drafted §4.1/§7).
8. **Considered, NOT actioned (Bean may overrule):** a narrow D270 no-deprecations exception for the
   4-flag migration (§13.3) — declined because the read-time PHP fallback (§6c) is the *more* robust path
   for these dynamic render.php blocks; a deprecation mainly helps the editor path, not the frontend.

---

## 12. Acceptance + gate status
**DONE when:**
- [x] `/adversarial-council` (Gate 2) — GO-conditional; all convergent must-fixes folded (§0b).
- [ ] `/gap-analysis` grades this v2 (target ≥ B / GO).
- [ ] `/qc-inline` checks v2 against the 3-way end-goal (framework / self-service / converter output) —
      every capability serves all three (Site-Info emit + preset decoupling + starter library close the
      v1 gaps the Competitor found on requirement 2/3).
- [ ] Bean final sign-off (Gate 2).

**Locked-enough bar:** P3/P4 build with zero re-interpretation — both components have concrete APIs +
a11y contracts (§4), the resolver + desktop-guard + box-shape are specified (§6), the live-flag
migration is explicit (§6c), the simple/Advanced split carries tab + surface + reorderable-cap (§5), the
operator test is blind + hardened (§8), every capability incl. Site-Info maps to a converter target
(§9), and the slice is de-risked + honestly scoped (§10). Deferrals are named phases (§0a, §2.5, §5.4),
never "out of scope".

**Gate status:** v5 — council-passed + gap-analysis B+ + CPT editing home + JOB-2 sweep + specialist
review gate (build + UX) + §14 WP-control implementation spec bound to Spec 35 (exact components, no
assumptions). Awaiting Bean final sign-off. Do NOT scope P3 until that closes. **§14's Spec 35 Part L is
the per-block definition-of-done — a header/footer/nav block is not "done" until it passes it.**

---

## 13. Architecture-alternatives sweep (Bean-requested; wp-sgs-developer, grounded live)

Bean asked whether *other* decisions in P1/P2 have a clearly-superior alternative we'd missed. Every
significant mechanism was pressure-tested against live code + WP-native options. **Result: most are
already the WP-native-correct choice; two real action items + one considered-and-declined.**

### 13.1 ACTION — Spec 17 FR-S1-1 is stale (fix before P3 reads it as truth)
FR-S1-1 says `parts/header.html` is reduced to a single `wp:pattern` reference. **Live reality
(verified):** it carries the FULL `wp:sgs/site-header` markup inline (~27 lines), a hand-kept duplicate
of `patterns/framework-header-default.php` — NOT a pattern reference. Consequence: editing the pattern
file does NOT propagate to the template part (they're independent copies). **Fix (cheap):** either mark
FR-S1-1 not-yet-implemented (matching the spec's own honest-gap style) or implement the delegation
(replace inline markup with `<!-- wp:pattern {"slug":"sgs/framework-header-default"} /-->`). This
matters because DP6/§2 reasoning touches the header render path — P3 must not inherit a false premise.
**Owner: a P3 pre-task or a doc-audit fix; ~10 min.**

### 13.2 ACTION — the CPT pattern-registration timing gap (already in §2.2)
The `admin_init`-only registration of CPT-derived patterns vs the frontend rules-engine lookup — the
one real gap the CPT decision exposes. Covered in §2.2 as the first P3 verify-then-fix. Restated here so
the architecture register is complete: it's a bug in *existing* code any CPT-rules wiring trips over,
independent of this design.

### 13.3 CONSIDERED, DECLINED — a scoped D270 no-deprecations exception for the 4-flag migration
The analysis flagged (as a question, not a recommendation) whether the 4 live production flags
(`headerSticky`/`headerTransparent`/`headerShrink`/`contrastSafe`) warrant a narrow, one-off exception
to D270 (no deprecations pre-production): a scoped `deprecated.js` would auto-upgrade the saved boolean
to the tri-state object on load, sparing the §6c manual per-site re-clone on 2 production sites.
**Declined (Bean may overrule):** these are **dynamic (render.php) blocks** — a block deprecation's
`migrate` runs on the *editor* parse path, not on frontend render, where D328's coercion actually bites.
The §6c **new-attr-name + read-time PHP fallback handles the frontend directly and deterministically**,
so it is the *more* robust choice here, not merely the policy-compliant one. The deprecation would add a
banned pattern for a partial benefit. Kept as an open note (§11 Q8) in case Bean weights the manual
re-clone cost higher.

### 13.4 Pressure-tested, ALREADY RIGHT (no superior alternative exists under our constraints)
- **Tri-state emission as scoped `#uid` `@media` CSS** (§6a) — the WP-native-correct answer; container
  queries don't fit (viewport-driven, not container-driven); no core "responsive boolean → CSS" support
  exists. Already the self-corrected right call post-council.
- **New-attr-name + read-time fallback migration** (§6c) — the only shape that survives WP's own D328
  object-coercion given D270. (See 13.3 for the one nuance.)
- **Site-Info as `wp_options` + block-bindings source** — the correct WP-native singleton-config store;
  `wp_block`/postmeta-CPT alternatives are not superior for cross-cutting site config.
- **Starter library as `patterns/*.php`** (§2.5) — git-versioned, deploy-shipped, read-only-to-clients;
  `wp_block`/synced patterns are right only for per-client operator-saved variations (a different scope).
- **The two bespoke editor components** (§4) — WP 7.0.2 ships no stable tri-state-inherit or per-tier
  device control; building bespoke on the (unstable, smoke-suited) `__experimental` primitives is correct.

*Verification note:* the analysis read Spec 17 lines 1–452 in full; §S5–S9 detail (~600 lines) was not
re-read this pass and is flagged unverified if it later bears on sign-off.

---

## 14. WP CONTROL IMPLEMENTATION SPEC — explicit, Spec-35-bound, no assumptions (Bean-requested)

**Why this section exists.** The rest of the doc designs the *architecture*; this section specifies the
*actual WordPress controls* — the exact component, its props, how it's wired, the WP version it needs,
and whether it's stable or `__experimental` — so P3/P4 do NOT "reach for the standard thing" and
reproduce the current blocks' defects (dead controls, duplicates, missing controls, half-built colour
pickers, no per-device, hand-rolled versions of things WP ships). **Governing standard: Spec 35 (SGS
Block Inspector UX + Control-Completeness). The header/footer/nav blocks are built to Spec 35 Part L's
per-block definition-of-done — no exceptions.** Target platform: **WP 7.0.2** (every native mechanism
below is present on 7.0.2 — versions noted so nothing is assumed).

### 14.1 The current defects this builder FIXES (Bean's list → the concrete fix)

| Current defect (in the live header/footer/nav blocks) | Root cause | The fix in THIS design |
|---|---|---|
| **Dead controls** (a control that renders nothing) | attr declared, not consumed in render.php | Every control below is consumed; the `check-dead-controls.js` prebuild gate stays green (zero-tolerance). Part L gate. |
| **Duplicate controls** (parent + child both style the same element) | bespoke panel duplicating a native `supports` panel / HC2 parent-vs-child | Spec 35 A6 + HC2: never duplicate a native supports panel; parent owns layout, child owns typography. |
| **Missing controls** (e.g. no transparency, drawer settings absent) | half-built / never finished | Spec 35 Part B completeness table applied per control (below); FR-34-5's 4 missing drawer controls built (§5.3). |
| **No "choose transparency"** (colour picker can't pick transparent/semi) | `DesignTokenPicker` has **no `enableAlpha`/`clearable`** (Spec 35 Part I — the framework-wide gap) | **Add `enableAlpha` + `clearable` to `DesignTokenPicker`** (Spec 35 Wave 1 #1) — every header/footer colour (drawer bg, link, close-icon, band bg) can then be transparent/semi-transparent. |
| **No per-device toggles / object controls** | flat attrs, no responsive switcher | The tri-state `ResponsiveTriStateControl` (§4.1) + the extended `ResponsiveControl`/`ResponsiveBoxControl` (§4.2) — per-device on/off + per-device values, 768/1024 tiers. |
| **No use of WP column features** (footer columns hardcoded) | hardcoded count, no layout control | Footer columns use the native **`layout` support (`flex`/`grid` + `blockGap`)** + a per-device column-count control mapping to `sgs/container`'s grid — real responsive columns, not a fixed number (§14.4). |
| **Toggle buttons missing / raw selects** | `SelectControl`/checkbox where a segmented toggle belongs | `ToggleGroupControl` for 2–5 short choices; `ToggleControl` for booleans (§14.3). |
| **No "saving presets"** | no starter/defaults mechanism | The starter-template picker (§2.5) + the locked 4-channel saved-defaults model (patterns / Section Styles / Site-Editor Styles / pin-unpin) — §14.6. |

### 14.2 Component map — header/footer/nav controls (exact component + props + wiring)

Every row: the control, the **exact WP/SGS component**, the mandatory props (Spec 35 Part B
"complete means"), the WP version + stability, and the wiring note. `__exp` = `__experimental*` (present
+ already used in our codebase, but unstable → goes on the DP3 smoke-suite, §4.4).

| Control | Component (exact) | Mandatory props / completeness | Ver / stability | Wiring |
|---|---|---|---|---|
| Sticky / Transparent / Shrink (per-device on/off) | **`ResponsiveTriStateControl`** (NEW §4.1) wrapping `__experimentalToggleGroupControl` + `__experimentalToggleGroupControlOption` | Off/On (desktop) · Inherit/Off/On (tablet/phone); `isBlock`; `__nextHasNoMarginBottom`; help via `aria-describedby` (Spec 35 E2) | `__exp` (in use in `StateToggleControl.js`) | Stored object per §6a; emitted as scoped `#uid @media` (§6a), NOT a body-class; NOT native `position.sticky` support (core can't do transparent-on-scroll or per-tier — §14.5). |
| A simple boolean (e.g. "Show phone", "Divider on") | **`ToggleControl`** | `checked`, `onChange`, `help`, `__nextHasNoMarginBottom` | stable | One attr, consumed in render.php. |
| Colour: drawer bg / link / hover / close-icon / band | **`DesignTokenPicker`** (EXISTS) — **must gain `enableAlpha` + `clearable`** | palette + custom; **`enableAlpha` (transparent!)**; `clearable` (alpha-0 ≠ unset); token-first | `enableAlpha` is stable on `ColorGradientControl` (the picker's base) | Spec 35 Wave 1 #1 — a P3 framework-wide fix; verify the value survives `safecss`/normalises to rgba/hex per D302. |
| Content alignment (drawer) | **`__experimentalToggleGroupControl`** (icon options: left/centre/right) | 3 short options → segmented, NOT a Select (Spec 35 Part B "Selection") | `__exp` | `drawerAlign` enum → `align-items` on the drawer body (§5.3). |
| Inner spacing / gap (per-device) | **`ResponsiveControl`** (extended §4.2) wrapping **`UnitControl`** | `units` (px/rem/em); `isResetValueOnUnitChange`; inherit indicator + reset (§4.2) | stable | `drawerGap` object → `sgs_emit_responsive_css` (§6d). |
| Popup / row padding (per-device, 4-side) | **`ResponsiveBoxControl`** (SGS, EXISTS) wrapping **`BoxControl`** | 4 sides + link/unlink; `units`; `allowReset`; `splitOnAxis` (Spec 35 Part B) | `BoxControl` stable | `drawerPadding`/row padding box object → per-side cascade (§6d — the NEW P3 decompose). |
| Nav item / CTA / phone link | **`LinkControl`** (via a shared `SgsLinkControl` wrapper — Spec 35 Wave 1 #2) | internal-content search + new-tab + `rel` nofollow/sponsored via `settings` | stable | Replaces any raw-URL `TextControl` (Spec 35 Part F anti-pattern). |
| Which menu (nav) | **`ComboboxControl`** (searchable) or the existing `useEntityRecords('postType','wp_navigation')` picker | searchable if >~10 menus (Spec 35 Part B) | stable | `ref` attr; context-inherit default (FR-34-4). |
| Collapse breakpoint | **`SelectControl`** (enum) + **`UnitControl`** for the custom-px tier | real units on custom | stable | `collapseTier`/`collapseCustomPx` (exist); custom-px reads `SGS_Breakpoints` (R-31-1). |
| Layout preset ("Centered/Split/Minimal") | **`__experimentalToggleGroupControl`** (or a small card picker) | 3–5 options → segmented (§2.6) | `__exp` | Writes several layout attrs at once (§2.6 decouple); converter still writes the atoms (§9). |
| Progressive disclosure (Advanced) | **`__experimentalToolsPanel` + `__experimentalToolsPanelItem`** | `resetAll`; 1–3 `isShownByDefault`; optional behind "+" (Spec 35 A5) | `__exp` (in use in `site-header/edit.js`) | THE anti-clutter mechanism; §3/§5. |
| Tab placement | native **`group` prop** on `InspectorControls` (`"settings"` / default Styles / `"advanced"`) | Spec 35 A3 | stable | Every §5 control carries a Styles-vs-Settings assignment. |
| Shadow (if a header/band needs it) | shared **`ShadowControl`** (Spec 35 says BUILD — currently 3-option selects) | real X/Y/blur/spread/colour+alpha builder, presets on top (Spec 35 Part B) | build (Wave 1 #3) | Only if a header style needs shadow; don't ship a None/Small/Medium select. |

### 14.3 Toggle buttons specifically (Bean called this out)
- **Segmented choice (2–5 short options)** → `__experimentalToggleGroupControl` + `…Option` (icons where
  they read faster: alignment, layout preset). NOT `SelectControl`, NOT radio checkboxes (Spec 35 Part B).
- **Single boolean** → `ToggleControl`.
- **The tri-state** (Inherit/Off/On) is a 3-option `ToggleGroupControl` — the same family, so the
  editor feels consistent (§4.1). Selected + focus state must be visible under Windows High-Contrast (not
  colour alone) and `help` linked via `aria-describedby` (Spec 35 E2 — the exact Gutenberg #50785 gap).

### 14.4 WP column / layout features (Bean: "no use of basic things like wp column features")
The footer's column row and the header rows must use WordPress's **native `layout` block support**, not a
hardcoded count:
- **`supports.layout` = `{ type: 'flex' | 'grid', allowSizingOnChildren }`** on the row block → free
  native flex/grid + `blockGap` (Spec 35 Part G, native). Our `sgs/container` already carries a grid
  engine (`layout`/`flexWrap`/`gridTemplateColumns*` attrs) — the footer/header rows delegate to it
  (composite-mirror rule), so "columns" = the container's real responsive grid, per-device, not a fixed 3.
- **Column count** is a **per-device control** (`RangeControl` 1–6 with `withInputField` + reset, wrapped
  in `ResponsiveControl`) that maps to `gridTemplateColumns` per tier → genuine responsive columns
  (3→1 at 768 is a value, not a bespoke breakpoint — D2 device standard).
- This replaces the current hardcoded footer-column markup (the "no WP column features" defect).

### 14.5 Native-vs-hand-roll decisions (explicit, with the WP version — don't assume, don't blindly adopt)
Spec 35 Part G says *prefer native*; but several header behaviours genuinely can't be native. Each call,
stated so P3 doesn't wrongly hand-roll OR wrongly assume a native support covers it:
| Behaviour | Native mechanism (ver) | Decision |
|---|---|---|
| Base sticky position | `supports.position.sticky` (6.0+) | **Not sufficient alone** — it can't do transparent-at-rest→solid-on-scroll or per-tier on/off. We keep the tri-state + the `class-sgs-header-behaviours.php` scroll layer (§6a). Use native only where a plain always-sticky is wanted. |
| Aspect-ratio / min-height (logo, band) | `dimensions.aspectRatio` (6.3+) / `minHeight` (6.5+) | **Use native** — free inspector UI + CSS; don't hand-roll. |
| Duotone / filter on a header image | `filter.duotone` (native) | **Use native** — don't hand-roll a filter panel. |
| Dynamic content (phone/logo from Site-Info) | **Block Bindings API** (`register_block_bindings_source`, **6.5+**) | **Use it** — it's WP's own direction + the §9 converter target; don't build a bespoke dynamic-attr system. |
| Client-safe editing of a starter header | **`templateLock:"contentOnly"`** (native) | **Adopt** in the starter patterns (Spec 35 Wave 1 #4) — a client edits content, can't break structure; near-zero cost, currently unused. |
| Link fields | `LinkControl` (stable) | **Use it** — never a raw URL field. |

### 14.6 "Saving presets" (Bean called this out) — the exact mechanism
No bespoke defaults store (the locked 4-channel model). For header/footer/nav specifically:
- **Starter styles** → block patterns surfaced by the §2.5 picker ("New header → choose a style").
- **"Same structure, different look" variants** → native **Block Style Variations / Section Styles**
  (WP 6.6+, Spec 35 Part G) rather than bespoke variant switching.
- **Visual defaults** → Site-Editor Styles panel (`wp_global_styles`) + per-client `theme-snapshot.json`.
- **The operator's own everyday-surface arrangement** → the pin/unpin per-site store (§5, default-off).
- **Save-as-active** → `sgs_active_header_cpt_id` (§2.2) — the client's "this is my header" is a real
  saved, activatable CPT post with revisions.

### 14.7 Enforcement (so this isn't just prose — Spec 35 Part K)
- **`check-dead-controls.js`** (prebuild, zero-tolerance) — no control ships that nothing renders.
- **The Spec 35 lint (Part K)** — flags a colour control without `enableAlpha`, a URL field not using
  `LinkControl`, a preset-only "shadow", an animation without a reduced-motion gate. P4 wires it for the
  header/footer/nav blocks.
- **Part L definition-of-done** folded into `block-migration-DONE-checklist.md` for each of
  `sgs/site-header`/`site-footer`/`site-header-row`/`site-footer-row`/`adaptive-nav`/`nav-menu` — a block
  is not "done" until every Part L box is ticked (group split, ToolsPanel disclosure, enableAlpha+clearable,
  UnitControl real units, per-side box, real builders, LinkControl, responsive 768/1024 switcher,
  StateToggleControl states, hideExtensions, MediaUploadCheck, no duplicated supports panel, native over
  hand-rolled, reduced-motion gate, decorative-image/ARIA-label, keyboard+contrast+aria-describedby a11y,
  contentOnly patterns, zero Part-F anti-patterns).

---

## 15. NAVIGATION ENGINE DECISION

> ### ⛔ BEAN OVERRIDE 2026-07-18 (supersedes the salvage framing below) — FULL REWORK
> The council recommended salvaging adaptive-nav's "working" parts. **Bean overrode on lived experience:
> adaptive-nav is the messy, repeatedly-patch-fixed block he wants GONE — the council judged its code
> structure "capable"; Bean has used + patch-fixed it and knows better. His ground truth wins.**
>
> **LOCKED now (only these):**
> 1. **Full rework of the WHOLE nav block set** — no salvage of `sgs/adaptive-nav`; the KEEP-VERBATIM/
>    REBUILD table below is superseded (it leaned on keeping adaptive-nav). Existing blocks are reference
>    material only.
> 2. **Menu data = `wp_navigation` CPT** (the one settled mechanism — unchanged).
> 3. **Feature bar (very high):** WP core nav's feature set as the **BASE**, then ADD every feature from
>    **top-competitor WP themes** (Stream B matrix), then every relevant **general web / UI-UX navigation
>    standard + best practice we're currently missing** (needs a dedicated pass — see below), then the
>    **WP platform features we'll use (Spec 35 controls + more)**. Meet-and-exceed, not match.
> 4. **The mega-menu is a REBUILD** (its current 3-store/slug-matched mechanism is broken — the Converter
>    critic proved it can only render mega items LAST). **Its implementation is NOT locked** — Bean's
>    CPT-à-la-Astra/Spectra idea is a *candidate to evaluate on evidence* in P2.5, not a decision (Bean
>    2026-07-18: "a suggestion/guess from me — you're the expert, decide from research + council + QC").
>
> **DELIBERATELY NOT DECIDED (Bean):** the NUMBER of blocks, what each does, and how they compose. That
> is an architecture decision that can only be made **once we know the full scale of (a) everything we
> need to build and (b) everything we have available to build it with.**
>
> **THEREFORE the next nav step is NOT a build and NOT the salvage slice below — it is a COMPREHENSIVE
> NAV REQUIREMENTS + AVAILABLE-TOOLING INVENTORY** → *then* the block-architecture decision → *then* build.
> The inventory assembles: the core-nav feature baseline (Stream A) + the competitor feature matrix +
> mechanisms (Stream B) + the client menu requirements (Stream C) + Spec 35 controls + **a NEW dedicated
> general-web/UI-UX navigation best-practices pass** (the one input not yet gathered). Council findings
> that SURVIVE the override: core nav is not the render-engine (its internals are private — WP-Platform
> Realist); the mega 3-store/ordering bug is real (the CPT rebuild fixes it); the drawer's transform-
> ancestor constraint must be designed out; and the verify-platform-claims-against-source lesson (§15.7).
>
> **Everything from §15.0 down is retained as the RESEARCH RECORD + the superseded salvage analysis —
> read it as inputs to the inventory, not as the current decision.**

---

## 15 (superseded salvage analysis — retained as research record) — clean SGS-native rebuild ON WP's rails + salvage

**Verdict (Bean-locked 2026-07-18, on a 3-stream research pass — reports below):** **BUILD SGS-native.**
Core `core/navigation` is ruled OUT as the UI engine. But do NOT build in a vacuum — **stand on WP's
rails**: keep `wp_navigation` as the menu-data source, adopt WP's Interactivity-API accessibility/overlay
plumbing, and reuse the working, tested current parts (Spec-34 drawer, one-source resolver, crawlable
render) where they fit a clean design. **"Salvage ≠ patchwork":** the architecture is designed clean from
the header-CPT requirements; a current part earns its place only by fitting as-is (P1's opportunistic-
salvage posture). This is NOT decided by assumption — it is the convergent read of three grounded streams.

### 15.0 Evidence (3 research streams, 2026-07-18 — grounded, cited)
- **Stream A — WP core nav on 7.0.2 (capability audit):** core nav is a **non-starter as the UI engine**.
  WP 7.0's OWN release notes state overlays are *"always rendered full-screen… sidebar drawer styles
  aren't yet supported"* — the opposite of Spec 34's header-visible drawer. **No native mega-menu** (every
  WP mega-menu is a plugin). Core nav **emits inline styles** (only `textDecoration` skip-serialised) —
  breaks Spec 32. **No per-device tiers.** Submenu a11y is **unsettled** (4 open core issues; "open on
  click" kills the href). The ONE useful piece: `wp_navigation` CPT is a clean reusable menu-DATA backend
  a converter can write plain trees into.
- **Stream B — competitor teardown + hook inventory:** the strong builders (Kadence/Spectra/GenerateBlocks/
  Bricks/GreenShift) **extend WP's nav plumbing, they don't replace the menu data model** — GenerateBlocks
  explicitly preserves `wp_navigation` compat. WP 7.0 + the **Interactivity API** now ship reusable
  accessible open/close/focus plumbing (`get_nav_element_directives`, `overlayOpenedBy`, `data-wp-*`) and
  an **editable-blocks overlay** (`get_overlay_blocks_from_template_part`) — so we hand-roll LESS. The lean
  pattern (GenerateBlocks + GreenShift converge): **ONE overlay/panel primitive** reused for mega-menu +
  off-canvas + popovers, not three bespoke components (matches SGS Rule 3 universal-no-carve-outs).
- **Stream C — the concrete menus + current-nav reality:** the current `sgs/adaptive-nav`+`nav-menu`+
  `mega-menu` trio **already covers the structural demands** (one-source, crawlable, Spec-34 disclosure
  drawer, mega-panels, overflow-More, configurable collapse) — it is "capable with a defined gap list,"
  not "rotten." The clients bracket the space: **Mama's** = flat 5-item bar + 1 featured item + cart
  badge; **Indus** = 7-item bar, 4 expandable (3 dropdowns + 1 mega "Brands"), **5 fully-built rich mega
  panels** (photo-grid / split-with-aside-CTA / logo-grid / info-box), a two-row header (utility bar +
  nav), accordion/drill-down collapse.

### 15.1 The architecture (RE-SCOPED post-council 2026-07-18 — the v1 of this section over-claimed; see §15.6)
**A 4-critic council (all code-grounded) converged: the DIRECTION is right, the ARTICULATION was
over-claimed on nearly every specific.** Re-scoped honestly:

**LOCKED (all 4 agree, evidence-backed):**
- **Menu data = `wp_navigation` CPT** (keep `SGS_Nav_Menu_Source`). Never a bespoke menu store.
- **Core `core/navigation` is OUT as the UI engine** — can't meet Spec 34 (drawer geometry), Spec 32
  (no-inline), mega (none), per-device (none). §0c-constraint-2's reserved exception does NOT fire.

**GATE — "salvage ≠ patchwork" is now a FALSIFIABLE TEST, not a slogan (Salvage-Sceptic MF1).** Each
current part gets ONE verdict, no third option — **KEEP-VERBATIM** (byte-identical, zero edits = real
salvage) or **REBUILD-FROM-SPEC** (delete + rewrite; the working block is *reference material*, not a
foundation). **"Keep-and-modify" is BANNED** — anything you'd edit is REBUILD. Per-target:

| Current part | Verdict | Why (council) |
|---|---|---|
| One-source resolver (`SGS_Nav_Menu_Source`) | **KEEP-VERBATIM** | Works; all agree; the sound half. |
| Crawlable server-render | **KEEP-VERBATIM** | Progressive-enhancement contract, sound. |
| Configurable collapse tier + overflow-More | **KEEP-VERBATIM** | Working, tested. |
| The Spec-34 disclosure drawer (view.js ~248 drawer lines) | **KEEP-VERBATIM — LEAVE IT ALONE** | Ship-PM + WP-Platform: rewriting working, tested a11y JS onto Interactivity gives ZERO user benefit + the levers don't even exist (below). |
| `sgs/mega-menu` | **REBUILD-FROM-SPEC** | Converter+Salvage-Sceptic, code-verified: it's THREE disconnected stores (wp_navigation + duplicated label/url + slug-matched `wp_template_part`) with a **live ordering bug — it can only render mega items LAST**, so it can't place Indus's "Brands" at position 4/7. Plus its panels use core blocks (Spec 32 violation). This is the defining Indus requirement and it's broken. |

**"Adopt WP-native levers" was FALSE — reframed (WP-Platform Realist, verified vs core source).** 4 of 5
named mechanisms (`get_nav_element_directives`, `overlayOpenedBy`, `block_core_navigation_render_inner_
blocks`/`_listable_blocks`, `get_overlay_blocks_from_template_part`) are **private, core-nav-only
internals a bespoke block cannot call**; WP's team documents its overlay as "intentionally NOT a
general-purpose dialog." So: the drawer/disclosure interaction is **PORT-THE-PATTERN under SGS's own
`data-wp-interactive="sgs/adaptive-nav"` namespace + SGS's own Interactivity store** (a legitimate but
net-NEW build, not a free reuse) — and only where a surface is being rebuilt anyway (NEVER a retrofit of
the working drawer). **Genuinely reusable (keep):** `registerBlockVariation`, Block Hooks API, generic
`render_block` filter. §15.2 splits these.

**"One overlay primitive" → shared PLUMBING, not one component (Salvage-Sceptic MF5 + WP-Platform (e) +
Converter MF3).** A disclosure (mega: hover-capable, no freeze, no ESC) and a dialog (drawer: focus
containment via `inert`, ESC-mandatory) have incompatible ARIA contracts — the codebase's OWN view.js
note says "do not simplify one into the other." So: **one shared open/close/focus/inert UTILITY consumed
by distinct blocks**, never a single unified component. Prove it by writing the 3 call-sites; if they need
per-mode `if` branches, they're not one primitive.

**The mega-panel data shape is DESIGNED before any P3 build (Converter MF1/MF3).** Name: (i) how a
`wp_navigation` link marks "has a mega panel" — by **ID/position reference, NOT slug-string**; (ii) a
converter-owned template-part naming convention (`sgs-mega-{client}-{item}`) so clients never collide;
(iii) the **interleaving fix** so a mega item renders at its real position, not always-last;
(iv) template-part storage = DB `wp_insert_post` (portable) vs theme file — decide.

**The transform-ancestor landmine is resolved IN the design (Salvage-Sceptic MF4).** The salvaged drawer
forbids a `transform`/`filter`/`contain` on any ancestor — but a **hide-on-scroll header** (a feature
Bean will want, built with `transform: translateY()`) violates exactly that. **§15.3 requirement:** the
drawer overlay must survive a transformed header ancestor (portal to `<body>` — which the current drawer
already does on open; make it a first-class, tested requirement, not a buried code comment).

**Reconcile-before-lock (Salvage-Sceptic MF3):** `adaptive-nav/render.php`'s header comment still
describes the OLD `showModal()` model that Spec 34 §3 says was replaced — reconcile which modality is
actually live, and re-measure the line counts, before P3 (docs disagreeing about a "salvage" target is
itself a fail).

### 15.1a ⭐ PROVE-THE-CAUSE FIRST — the named first slice + a pre-registered exit (unanimous council)
Three of four critics converged: **do NOT commit to an engine rebuild before proving the engine needs
one.** Stream C already conceded the current trio is "capable with a defined gap list, not rotten" — that
is a *narrated* claim, never *measured*. So the FIRST nav work (analogous to §10's drawer slice — additive,
demoable, touches no working code) is a **prove-the-cause slice:**

1. **Reproduce the Mama's flat bar LIVE** on the existing trio (near-free — Stream C says it's within
   current coverage). Smallest first action.
2. **Build ONE Indus mega panel** (the photo-grid — most representative of the 5) end-to-end on the
   **current `sgs/mega-menu` as it stands** — this exercises the *rich* path (the hard, motivating
   capability) and will surface the real defects (the always-last ordering bug, the 3-store shape).
3. **A converter schema-conformance test (DP6 for the nav, Converter MF2):** assert a converter *could*
   write (a) a `wp_navigation` post of 7 items/3 submenus, (b) one mega InnerBlock with the real Indus
   label/url, (c) one `wp_template_part` whose content is the actual `mega-menu-brands.html` tree — run on
   fixtures NOW, not "whenever Spec 33 Part 2 lands" (that deferral is the exact
   `requirement-used-to-justify-not-made-a-constraint` trap P1's DP6 already corrected once).

**PRE-REGISTERED EXIT CONDITION (Ship-PM + Salvage-Sceptic):** if the slice reproduces both menus with
only the known gaps, the honest verdict is **"close the defined gap list (FR-34-5 drawer settings; mega
a11y `role=menu`→disclosure; mega data-shape rebuild; drill-down) + fix the mega ordering — NOT rebuild
the whole engine."** The slice measures whether "rebuild" is even the right word. This is the anti-stall
+ prove-the-cause gate this decision was missing.

**Defined-gap sizing (Salvage-Sceptic SHOULD):** each parked gap is its own REBUILD unit with its own
verify, NOT a flat bullet — mega a11y (`role=menu`→disclosure) rewrites the whole 333-line roving-keyboard
model; drill-down is a coordinated view.js+markup+CSS change with a `prefers-reduced-motion` gate. Also
close `P-WRAPPER-BORDER-EMIT` (borders never emit through the shared wrapper all 3 nav blocks use) as part
of the rebuild.

### 15.2 WP mechanism inventory — split GENERAL (reusable) vs CORE-NAV-PRIVATE (port, don't call)
**GENERAL — genuinely reusable by a bespoke block (verified vs core source):**
- **`wp_navigation` CPT + `ref`** — the menu-data source (already used via `SGS_Nav_Menu_Source`).
- **`registerBlockVariation`** — ship pre-configured nav flavours without forking.
- **Block Hooks API** — optional auto-insert of an SGS CTA/utility block into the nav.
- **`render_block` filter** — generic post-process escape hatch (sparingly).
- **Interactivity API** *as a PATTERN to port* — SGS writes its OWN `data-wp-interactive="sgs/adaptive-nav"`
  namespace + its OWN `state`/`actions`/`callbacks` store, modelled on core's directive shape (net-NEW
  build, not a free reuse), shipped as a `viewScriptModule`. Only for surfaces being rebuilt — NEVER a
  retrofit of the working drawer.

**CORE-NAV-PRIVATE — CANNOT be called by a bespoke block (WP-Platform Realist, verified; do NOT budget as free):**
- `get_nav_element_directives()` — `private static`; hardcodes `data-wp-interactive="core/navigation"`.
- `block_core_navigation_render_inner_blocks` / `_listable_blocks` filters — fire ONLY inside core nav's
  own render path; dead for a non-core-nav block.
- `get_overlay_blocks_from_template_part()` — `private static`; scoped to core nav; **full-screen-only** →
  not usable for a header-visible drawer (geometry mismatch is terminal, not a spike question).
- `allowedBlocks`-arbitrary-SGS-blocks-in-a-`wp_navigation`-post — needs a live check (the CPT's block-list
  validation may reject non-nav blocks); do NOT assume before P3.

*(Research inputs recorded in §15.0. The v1 of this list — which named the CORE-NAV-PRIVATE items as usable
"levers" — was the load-bearing error the council caught: those are not levers that can be pulled.)*

### 15.3 Requirements the chosen engine MUST meet
- **Works perfectly inside the header CPT** (§2) — the nav is a slot in the header; the two are designed
  together, not bolted.
- **Spec 35** control-completeness (Part L) · **Spec 32** no-inline · **Spec 31** converter-emittable
  (the cloning pipeline can clone a scraped nav INTO it — §9) · **Spec 17 §S9** (FR-S9-4 one-menu-source,
  FR-S9-5 drawer a11y) · **Spec 33 Part 2** (header/footer clone) · **Spec 01** · the **css-mistakes /
  common-wp-styling-errors** doc · §0c constraints (no-inline, no banned core blocks).
- Reproduces Indus + Mama's menus + generalises (R-31-9 universality).
- Mega-menu, drawer (Spec 34 disclosure model), collapse-to-drawer breakpoint, one menu source
  (adaptive-nav ↔ nav-menu context) — all working, not patched.

### 15.4 Doc consolidation (Bean-requested — "less docs is better")
The nav/menu content is scattered: **Spec 17 §S9** (nav FRs), **Spec 34** (drawer), **Spec 35** (inspector
standard, nav controls), **Spec 31 §13** (converter), **Spec 33 Part 2** (clone). Part of this decision's
output is a **consolidation pass**: name ONE canonical home for the nav-engine spec, migrate the
load-bearing content there, and archive/strip the scattered duplicates (per the project restructuring —
gate docs like code, fewer of them). Decide the canonical home as part of §15's deliverable; do NOT leave
five half-overlapping nav specs.

### 15.5 Process record + status
Ran as a focused 3-stream research pass (2026-07-18: core-nav audit + competitor teardown + menu
extraction) → synthesised the decision above (§15.0–15.1) → Bean picked the **clean-rebuild-on-rails +
salvage** posture. **Remaining before P3 builds the nav:** `/adversarial-council` on this decision (Rule 7,
high-blast-radius — pending) + the §15.4 spec consolidation + Bean final sign-off (with the rest of P2,
per his hold-all-of-P2 call).

**STATUS: DIRECTION LOCKED (core nav out, `wp_navigation` in) + RE-SCOPED post-council. The next nav step
is the §15.1a prove-the-cause slice, NOT an engine rebuild.** Awaiting Bean sign-off (with the rest of P2).

### 15.6 Council record + the two requirements it added
**4-critic council (2026-07-18, all code-grounded): Ship-PM C−→A−(rescoped) · Salvage-Sceptic D+ ·
Converter D · WP-Platform D.** Unanimous: direction right, articulation over-claimed; every critic found
its worst issue by reading LIVE CODE the 3 research streams (and my v1) had not. Full report:
`.claude/reports/2026-07-18-P2-nav-decision-council.md`. All convergent must-fixes are folded above
(KEEP-VERBATIM/REBUILD gate; mega=REBUILD + designed data-shape; drawer=leave-alone; levers=port-pattern;
one-primitive→shared-plumbing; prove-the-cause slice + exit condition).

**Two added hard requirements:**
- **§15.3 add — transform-ancestor survival:** the drawer overlay must work with a `transform`/`filter`/
  `contain` on a header ancestor (a hide-on-scroll header uses `transform: translateY()`), via `<body>`
  portal. First-class + tested, not a buried comment.
- **§15.3 add — the reproduce-both-menus LIVE baseline** IS the acceptance gate: Mama's (flat 5 + featured
  + cart badge) and Indus (7 items, 3 dropdowns, 1 mega at position 4, 5 rich panels, 2-row header,
  accordion collapse) both reproduced live + Bean's eye. Cart badge + 2-row utility header get mapped to
  blocks/attrs (currently unassigned — Ship-PM/Converter MISSING).

**§15.4 consolidation — sequenced LAST + as a conflict-reconciliation pass:** the 5 nav-touching specs
(17 §S9, 34, 35, 31 §13, 33 Part 2) already CONTRADICT (render.php vs Spec 34 modality) — consolidation is
a reconcile-conflicts pass, not a filing exercise, and runs AFTER the prove-the-cause slice fixes the
direction (else we consolidate around an engine we then don't build). Canonical nav home decided then.

### 15.7 Process lesson (captured)
**A research agent's capability summary is a HYPOTHESIS, not ground truth — verify platform claims against
SOURCE before building on them.** Stream B (competitor research) oversold WP-native "levers"; the
code-grounded WP-Platform Realist proved 4 of 5 are private core-nav internals that can't be called. AND
3 code-grounded critics each found the worst defect (mega 3-store bug, transform landmine, private levers)
by reading LIVE CODE, which neither the research streams nor the v1 decision did. **Every future Gate on
this track requires ≥1 reviewer grounded against live source** (extends the P2 lesson + memory
`verify-contents-not-filename-or-wiring` + `fact-check-council-register-findings-before-acting`).
