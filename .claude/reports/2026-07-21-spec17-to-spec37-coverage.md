---
doc_type: coverage-report
project: small-giants-wp
title: Plan-doc coverage matrix — header/footer PLAN documents vs Spec 37
date: 2026-07-21
status: DRAFT — for /qc-council per Spec 37 §9
scope_note: >
  This matrix covers the FIVE PLAN documents named in the task (07-13 SYSTEM gate, P1 architecture
  decision, P2 builder-UX gate, 07-17 strategic plan, archived FR-HF container gate). It does NOT
  re-derive Spec 17's 48 FRs — that is a separate, larger pass Spec 37 §9 also requires before
  Spec 17 can be deleted; this document only closes the "plan docs were invisible to spec-level
  checks" risk Bean named.
---

# Coverage matrix — header/footer plan documents vs Spec 37

**Purpose.** Spec 37 §9 requires proof that no requirement from the plan corpus was silently
dropped when Spec 37 was written. The container row model (Spec 37 §3) is the proof this matters:
it existed ONLY in the 07-13 plan, never in a spec, so it was invisible to every prior spec-level
audit. This document is the audit that closes that hole for the five plan documents in scope.

**Disposition key:**
- `CARRIED (FR-37-N / §N)` — substance is in Spec 37, cited precisely.
- `MOVED (Spec NN)` — owned by another spec now; cited precisely.
- `RETIRED (reason)` — deliberately dropped; reason stated.
- `⚠ GAP` — not in Spec 37, no cited justification for dropping it.

---

## 1. `2026-07-13-header-footer-nav-system-design-gate.md` (the "07-13 SYSTEM gate")

| § | Item | Disposition | Where |
|---|---|---|---|
| §2 | Rule evolution: header/footer/nav as specialised CONTAINER blocks used *inside* template parts (not a monolithic header block) | CARRIED | Spec 37 §1.1 (owns the container blocks), §2.1 (CPT + template-part architecture), §3 (container design) — the whole spec is built on this exact model |
| §3 roster | `sgs/site-header` | CARRIED | Spec 37 §1.1, FR-37-9 |
| §3 roster | `sgs/site-footer` | CARRIED | Spec 37 §1.1, FR-37-10 |
| §3 roster | `sgs/adaptive-nav` | MOVED + scheduled for retirement | Spec 36 owns nav (§1 "Superseded/replaced (REFERENCE-ONLY): `sgs/adaptive-nav`"); Spec 37 FR-37-21 retires it gated on Spec 36 FR-36-18 |
| §3 roster | `sgs/mobile-nav` (off-canvas drawer, "reuse") | MOVED | Spec 36 FR-36-6 `sgs/nav-drawer` is the current drawer container; drawer ownership is wholly Spec 36's per Spec 37 §1.2 table row "Everything inside the nav… → Spec 36" |
| §4 | Header 3 named rows: top / middle / bottom | CARRIED, verbatim | Spec 37 §3.1 |
| §4 | Footer 3 named rows: top / columns(middle) / bottom | CARRIED, verbatim | Spec 37 §3.2 |
| §4 | Typed element palette (logo/nav/search/cart/account/CTA/contact/social/HTML/widget-area) | CARRIED (existence + promotion) | Spec 37 §3.5 — "row's placeholder and inserter promote the typed palette" |
| §4 | "**not freeform**" — the palette is a hard lock | **RETIRED**, reason stated | Spec 37 §3.5 explicitly reverses this: a hard `allowedBlocks` lock breaks R-31-9 (cloning pipeline must place whatever a draft contains) and fights framework composability. Resolved in favour of curated-but-not-locked. This is a documented, deliberate reversal — not a silent drop. |
| §4b | Global style-token defaults + Site Info inheritance, single-entry-no-re-entry | CARRIED, verbatim | Spec 37 §3.7, FR-37-17 |
| §5 | Combined adaptive nav — one menu source, one-tree-restyled default, drawer escape hatch, mega-menu drill-down, desktop overflow "More" | MOVED | Spec 36 owns nav in full (FR-36-1 menu source, FR-36-8 collapse modes, FR-36-5 mega-menu). Note: this 07-13 nav design was itself overridden by P2 §15 ("BEAN OVERRIDE — FULL REWORK") before Spec 36 existed, so what actually landed in Spec 36 is a later, more thorough design — the 07-13 nav content is superseded research input, not a live requirement in its own right. |
| §6 | Drawer bug fix (inert-freezes-itself root cause) | CARRIED (shipped, historical) | Spec 37 §0 notes P0 shipped; drawer itself is now Spec 36 territory (FR-36-6 dialog geometry, D323/D340) |
| §6 | Drawer a11y contract — progressive enhancement, real focus trap, ESC-close, backdrop dismiss, body-scroll-lock, background-inert-but-drawer-live, redundant state signalling, configurable SR labels, keyboard contract, 44px targets | **MOVED, verified not assumed** | Spec 36 FR-36-6 ("Dialog a11y… D323… D340"), FR-36-10 ("Disclosure vs dialog — the ONE a11y gate"), FR-36-11 ("WCAG 2.1 AA + 2.2 wins"), FR-36-16 acceptance gate (`elementFromPoint` reachability, ESC/focus-return/Tab-containment, scroll-lock sweep) — confirmed by direct read of Spec 36, not assumed from the name match |
| §7 | Per-device content adaptation for NAV/CTA/contact elements (showLabel/iconOnly, move-to-drawer, Indus reference pattern) | MOVED | Spec 36 FR-36-24 "Per-device content + settings" explicitly owns this, citing the same showLabel/move-to-drawer shape |
| §7 | Generic per-tier VISIBILITY toggle for **any** header/footer row element (not nav-specific) — "every element: per-tier visibility toggle" | **⚠ GAP** | Not in Spec 37 (grepped: no "visibility"/"per-tier" hit in the FR roster), not stated as moved or retired. Spec 36 FR-36-24 covers nav items; a business-info/contact/HTML element sitting in a header row (not inside the nav) has no equivalent named capability. |
| §8 | Responsive data model `{desktop,tablet,mobile}`, null=inherit, mobile-first cascade | CARRIED, verbatim | Spec 37 FR-37-16 |
| §8 | Canonicalise attribute key order before uid md5 | CARRIED, verbatim | Spec 37 FR-37-16 |
| §8 | Breakpoints 768/1024 **+ a custom-px 4th tier**, single shared source, for every responsive property | **⚠ GAP (partial)** | Spec 37 FR-37-16 carries 768/1024 only ("Device tiers are 768/1024"); the general-purpose custom-px 4th tier for arbitrary container properties is absent. (Note: `collapseCustomPx` survives, but only as `sgs/adaptive-nav`'s own collapse-breakpoint attribute — Spec 36/nav-scoped, not the general property override this item described.) No stated reason for the narrowing. |
| §8 | Container queries (`container-type:inline-size`) for row-level reflow | CARRIED | Spec 37 §3.6 ("Container queries for row-level reflow… STOP-CONTAINER-TIER-IS-NOT-VIEWPORT") |
| §8 | Editor UX: device switcher (proper tab semantics, 44px, keyboard), inherited-value greyed + icon + `aria-label`, keyboard-reachable reset-to-inherited | MOVED | Spec 35 (Block Inspector UX Standard) owns generic inspector-control mechanics per Spec 37 §1.2 ("Inspector control completeness → Spec 35 Part L"); Spec 35 explicitly carries `aria-describedby`-linked help (E4), `prefers-reduced-motion` gating (E5), and the 768/1024 device-tier standard (D2) |
| §9 | Spec 17 pattern/CPT-template updates (seed `sgs/site-header`/`sgs/site-footer`) | CARRIED | Spec 37 FR-37-6, FR-37-7/8 |
| §9 | DB reseed (`/sgs-update`, `sync-container-wrapping-blocks.py`, `seed-composition-roles.py`) | CARRIED, implicit | Spec 37 §7 constraint 5 (DB-first, no hardcoded dicts) — standing project practice, not restated per-task |
| §9 | Cloning pipeline Part 2 — walker maps draft rows to named slots by BEM role | MOVED, named explicitly | Spec 37 §1.2 table + §6 out-of-scope: "Header/footer clone walker → Spec 33 Part 2"; FR-37-22 states the design-constraint half (emittable by construction) |
| §12 lane A | Reflow — Playwright at 320/360/375/414/768/1024/1280/1440, `scrollWidth<=innerWidth`, 44px targets | CARRIED (narrower width set) | Spec 37 FR-37-12 — same substance, three widths (375/768/1440) instead of eight. Substance intact; not flagged as a gap since the gate mechanism (`scrollWidth<=innerWidth`) is identical, just fewer sample points. |
| §12 lane B | Drawer test — `elementFromPoint` reachability, focus trap, ESC, background-inert, mega drill-down | MOVED | Spec 36 FR-36-16 (confirmed: names the exact `elementFromPoint` occlusion sweep, ESC/focus-return/Tab-containment, scroll-lock sweep) |
| §12 lane C | WCAG 2.2 AA — axe-core, keyboard-only traversal, `aria-current`/`aria-expanded`, 3:1 contrast, keyboard contract, SR labels | SPLIT: container-level CARRIED / nav-level MOVED | Spec 37 §7 constraint 4 (WCAG 2.1 AA, 44px, visible focus) covers the container; `aria-current`/`aria-expanded`/keyboard contract for the MENU is Spec 36 FR-36-11 |
| §12 lane D | No-inline — wrapper carries no inline `style=""`, values in scoped `<style id=uid>` | CARRIED | Spec 37 §7 constraint 1, FR-37-23 acceptance |
| §12 lane E | Per-device — overrides apply, inherited-vs-overridden indicators correct, reset resumes inheritance, uid stable on re-save | SPLIT: data-model CARRIED / indicator UX MOVED | Spec 37 FR-37-16 (shape + uid stability); the visible indicator/reset UX is Spec 35's inspector-completeness territory (FR-37-18 cites it) |
| §12 lane F | Universality — verified on **mamas-munches AND indus-foods** (different logo/palette), no hardcoded client value | **⚠ GAP (narrowed, unstated)** | Spec 37 §7 constraint 3 carries the *no-hardcoded-data* rule, but FR-37-23's acceptance gate only names "the canary" and FR-37-12 names "both dev sites" (sandybrown + palestine-lives — the two *environments*, not the two *client designs*). The explicit cross-CLIENT verification (two different logos/palettes/content proving no hardcoding) that 07-13 §12F and the archived FR-HF gate §7E both named is not restated as a Spec 37 acceptance criterion, and nothing marks it retired. |
| §12 lane G | Behaviour-layer non-regression — sticky/transparent/scroll + `--sgs-header-height` + anchor-offset intact; dark mode ok | CARRIED (behaviours), dark-mode unlisted | Spec 37 FR-37-13/14/15 own the behaviour set and its migration in full; "dark mode ok" specifically isn't named anywhere in Spec 37 — minor, noted here rather than as its own gap row |
| §12 lane H | Editor/operator — inspector controls, no "Invalid block", Site Editor Replace lists patterns, **3-5 person usability sanity-check** | SPLIT: inspector CARRIED / usability test **⚠ GAP** (see P1/P2 rows below — same missing item, listed once there) | Spec 37 FR-37-18 covers inspector conformance; the usability-test requirement is addressed under P1 DP5 / P2 §8 below |
| §13 | Phasing P0-P5 (drawer fix → header → nav → footer → per-device polish → pipeline) | CARRIED (superseded ordering) | Spec 37's own build-status table (§5) and FR numbering reflect a different, later phase plan (P1 architecture → P2 builder-UX → this spec); the original P0-P5 ordering is historical, not a live requirement |
| §15 | 5 open decisions (block naming, drawer rework-vs-fold, one-tree default, do-all-or-gate, footer columns 4-vs-6) | CARRIED (all resolved by later docs) | Block naming → Spec 37 §1.1 names; drawer → Spec 36 FR-36-6 (rebuilt, not reworked-in-place); one-tree default → Spec 36 FR-36-1 (bar↔drawer default inherit); footer columns → Spec 37 FR-37-11 ("1-6" per-device, superseding the 4-vs-6 fixed-count question) |

---

## 2. `2026-07-18-P1-architecture-decision-header-footer-nav.md`

| § | Item | Disposition | Where |
|---|---|---|---|
| §1 | BUILD verdict (not adopt a competitor block) | CARRIED, foundational | Spec 37's entire premise (bespoke CPT + bespoke containers) assumes this; not restated as a line item because it's load-bearing architecture, not a checkable FR |
| §0a | Three-way requirement: framework design-build + client self-service + cloning-pipeline output | CARRIED | Spec 37 FR-37-22 (converter-emittable by construction) covers the third leg explicitly; the first two are the spec's whole purpose |
| §2 | Capability-parity model: cascade-from-desktop default + capped Advanced override (not full independence) | CARRIED (data shape) | Spec 37 FR-37-16 (cascade shape); the "capped Advanced" IA decision is P2's, tracked separately below |
| §2.3 | Full clean rebuild posture — opportunistic salvage only, existing code never drives the design | CARRIED | Spec 37 §3 preamble: "re-derived here using 07-13 as evidence rather than as settled fact" — same posture applied to the container design |
| DP1 | Tri-state (`inherit`/`on`/`off`) per device tier, never flat boolean | CARRIED, verbatim | Spec 37 FR-37-14 |
| DP2 | Advanced override surface = a NAMED, CAPPED list | **⚠ GAP** | See P2 §5 row below — the concrete cap/allowlist design is absent from Spec 37 |
| DP2a | A11y/contrast feedback is INFORMATIONAL ONLY, never a gate | CARRIED, verbatim | Spec 37 FR-37-19 |
| DP3 | Per-WP-release regression smoke-suite; canary-first migration (sandybrown → palestine-lives) | CARRIED, implicit | Spec 37 FR-37-23 requires canary-live evidence; the smoke-suite itself is standing project practice (DP3 in §4.4 of P2), not restated as its own FR |
| DP4 | Ship a vertical slice FIRST, before the full rebuild | CARRIED (superseded ordering) | The drawer-settings slice (P2 §10) shipped as FR-34-5 work, which now lives in Spec 36 (FR-36-6's drawer settings table, "carried verbatim from Spec 34 FR-34-5") |
| DP5 | Operator-simplicity pass/fail test (defined, not vague) | **⚠ GAP** | Not in Spec 37's FR roster or §9 gate at all — see detail below |
| DP6 | Converter-emittable BY CONSTRUCTION — a design constraint, not a P6 bolt-on | CARRIED, verbatim | Spec 37 FR-37-22 |
| §3 | Spec truth-up table (95 attrs verified, FR-34-5 gap, `sgs/mobile-nav` retired) | CARRIED, superseded content | The specific attr-count table is now historical (attrs have since changed under FR-37-14's reshape); the *practice* of stating verified-vs-claimed status per FR is Spec 37's own format (`Status:` + evidence on every FR) |
| §5 residuals | Fork-cost never empirically measured; Kadence tab-structure unresolved; FR-34-5 real-client-demand check; `contrastSafe` auto-suggest behaviour | CARRIED (mostly resolved or moot) | Fork-cost is moot post-BUILD-verdict; FR-34-5 → Spec 36; `contrastSafe` auto-suggest → Spec 37 FR-37-19 keeps it informational, not auto-suggest, so the residual is implicitly resolved in favour of the simpler answer |

**DP5 detail (the concrete gap).** P1 §6 locks: *"the 'operator simplicity' gets a defined pass/fail test (e.g. non-coder sets sticky + phone + drawer content in <3 min without opening Advanced)."* P2 §8 hardens this into a full protocol: blind testers (Bean + 1 other, screen-recorded), clock starts at cold-start, an untimed Advanced-discovery probe, and explicit pass/fail operational definitions, gated as **P4 Gate-4's acceptance test** — not a nice-to-have. Grepping Spec 37 for "operator-simplicity", "blind tester", "DP5", "<3 min", "usability" returns zero hits. There is no equivalent test named anywhere in Spec 37's FR roster or its own §9/FR-37-23 acceptance gate. This is a named, load-bearing acceptance gate from two chained plan documents that has no successor in Spec 37.

---

## 3. `2026-07-18-P2-builder-ux-design-gate.md`

| § | Item | Disposition | Where |
|---|---|---|---|
| §2.1-2.4 | Editing home = CPT admin screen (not Site Editor, not Hybrid); "Set as active" mechanism; direct-render branch; device-switcher risk downgraded to confirmation | CARRIED, near-verbatim | Spec 37 FR-37-1 through FR-37-5 map almost 1:1 onto this section, including the explicit "Rejected: Site-Editor-as-home, and the hybrid of both (P2 §2.1 — …)" citation |
| §2.2 | The CPT admin_init-vs-frontend pattern-registration timing gap (the load-bearing bug) | CARRIED, this IS Spec 37's origin story | Spec 37 §2.2 "Why direct render, and not block patterns" |
| §2.3 | Cold-start pointers: admin-bar "Edit header/footer" link, Dashboard/Appearance pointer | **⚠ GAP (minor)** | Not mentioned in Spec 37. The CPT admin-menu findability itself is carried (FR-37-1's "SGS → Advanced Headers"), but these specific supplementary findability affordances are not. |
| §2.3 | "Edit menu drawer" affordance (reach the drawer's InnerBlocks from the CPT canvas) | **⚠ GAP (minor)** | Not in Spec 37; not explicitly in Spec 36 either (drawer content-editing entry point is unaddressed in both). Nav-adjacent, so it sits in the seam between the two specs. |
| §2.5 | Starter-template picker — card grid, live thumbnails, use-case descriptor, "Start from scratch" card, preview-before-apply, re-visit behaviour | CARRIED, near-verbatim | Spec 37 FR-37-7 ("visual card grid of styles with preview-before-apply, plus a persistent 'Start from scratch' card") |
| §2.5 | Starters as git-versioned `theme/sgs-theme/patterns/*.php`, `templateLock:"contentOnly"` | CARRIED | Spec 37 FR-37-8 |
| §2.5 | Converter is the starter-pack factory (same emit path generates DIY starter packs) | CARRIED, implicit | Spec 37 FR-37-22's converter-emittable constraint supports this reading; not restated as its own line |
| §2.6 | Site-Info phone flow reconciliation (typed once in Site-Info, toggled in header inspector, deep-link + inline nudge if empty) | **⚠ GAP** | Not in Spec 37. FR-37-17 only states the general principle (Site Info renders identically, no re-entry); the specific toggle/deep-link/nudge mechanism from P2 §2.6 is not carried forward. |
| §2.6 | Preset controls — decoupling: inspector may offer composite presets ("Layout: Centered/Split/Minimal") writing several attrs; converter still targets the attribute layer | **⚠ GAP** | Grepped Spec 37 for "preset"/"Centered"/"Split"/"Minimal" — zero hits. This was a named, Bean-confirmed decision (P2 §11 item 2: "DECIDED — Preset controls: YES, decouple") and it has no home in Spec 37. |
| §3 | IA: native Styles/Settings tab split, `PanelBody` (simple) vs `ToolsPanel` (Advanced), every control carries an explicit tab + surface assignment | **⚠ GAP** | Not restated in Spec 37; FR-37-18 defers wholesale to "Spec 35 Part L", but Spec 35 does not carry the specific per-control tab/surface assignment table either (verified: Spec 35 only has a generic "adopt ToolsPanel once 6+ controls" rule, A5) |
| §4.1 | `ResponsiveTriStateControl` — concrete API, microcopy, persistent "customised" indicator, explicit flip-behaviour (simple toggle = desktop only) | MOVED (component-level) | Spec 35 owns generic inspector-control APIs/a11y per Spec 37 §1.2; the DATA SHAPE (tri-state object) is CARRIED in Spec 37 FR-37-14 |
| §4.2 | Extended `ResponsiveControl` — inherit indicator (ghost text + `aria-describedby`), keyboard-reachable reset-to-inherited | MOVED | Spec 35 (aria-describedby-linked help is explicit E4/E5 in Spec 35) |
| §4.3 | A11y contract correction — `ResponsiveControl`'s `ButtonGroup` has **no** `tablist`/arrow-key nav; **named P3 task** to upgrade it to a real tablist + roving-tabindex; raise `size="small"` (~24-32px) to 44px | **⚠ GAP (concrete, named task lost)** | Grepped both Spec 37 and Spec 35 for "tablist"/"ButtonGroup"/"roving-tabindex"/"44px" (Spec 37 only has a generic "44px targets" rendered-output constraint, §7). This specific, scoped, wp-sgs-developer-verified EDITOR-COMPONENT a11y defect + its fix are named nowhere in either successor spec. |
| §4.4 | `__experimental` API maintenance honesty (DP3 smoke-suite); editor-preview parity (SSR vs hand-built preview drift, `sgs/brand-strip` precedent) | CARRIED, implicit | Standing project practice (DP3); the SSR-preview-parity lesson is in project MEMORY.md (`ssr-fixes-hand-built-preview-drift`) already, so it's carried at the framework-memory level even if not restated per-block in Spec 37 |
| §5 | Per-block IA table (which controls are Simple vs Advanced, per block, per tab) — the actual concrete design for site-header/site-footer/adaptive-nav/drawer/nav-menu | **⚠ GAP** | Not in Spec 37 at all. This is the single most concrete, load-bearing UX design in P2 and it is entirely absent from Spec 37's FR roster. |
| §5 | ≤3-control cap as DEFAULT (not ceiling); operator pin/unpin, default-off, tucked in "Customise this panel" | **⚠ GAP** | Same as above — no cap/pin-unpin concept appears in Spec 37 or Spec 35 |
| §5.4 | Mega-menu — slot reserved, shape TBD P5 (STOP-29 honesty) | MOVED | Spec 36 FR-36-5 (the mega CPT is fully designed, superseding "TBD") |
| §5.5 | `check-simple-surface-cap.js` lint | **⚠ GAP** | Depends on the §5 cap design existing; since that's gone, the lint has nothing to enforce — flagged once here, not double-counted |
| §6a | Tri-state emission — scoped `#uid` `@media` rule, NOT a body class; retire/repurpose the body-class layer | CARRIED, verbatim | Spec 37 FR-37-15 |
| §6b | `desktop=='inherit'` guard — coerce to `DEFAULT_OFF`, never throw | CARRIED, implicit | Folded into Spec 37 FR-37-14's tri-state shape; not restated as its own clause, but the shape (`desktop` is 2-option, never offered Inherit) makes the guard's premise moot rather than dropped |
| §6c | Migration: NEW attr names + read-time PHP fallback (`headerSticky:true` → `{desktop:'on'}`), both-present precedence, canary-first + live before/after check | **RETIRED, reason stated (premise changed)** | Spec 37 FR-37-14: "Clean reshape, no migration, no fallback… Both sites are pre-live, so there is no production data to protect; per D270/D293 no deprecations and no read-time legacy fallback are added (which would violate R-31-14 anyway). Existing dev instances are re-inserted or recovered in the editor." This is a genuine, well-reasoned reversal of a P2 council must-fix — worth flagging prominently since P2 treated the fallback as load-bearing (a Cynic + Spec-Lawyer must-fix), and Spec 37 discards it on the grounds that the "live production data" premise no longer holds. Not a silent drop — the reason is explicit and traceable to D270/D293/R-31-14. |
| §6d | Box-per-side decomposition (`drawerPadding` as 4 independent per-side atoms) — NEW P3 build, not "unchanged mechanism" | MOVED | Spec 36 FR-36-6's drawer-settings table carries `drawerPadding` as the identical per-side object shape, sourced explicitly "carried verbatim from Spec 34 FR-34-5" |
| §7 | Contrast notice — computable trigger (Transparent-on + Contrast-mode-None), two actions (`Turn on contrast safety` one-click fix + `Preview`), dismissal persisted per-instance keyed to the specific combination | **⚠ GAP (partial — policy kept, mechanism lost)** | Spec 37 FR-37-19 restates the DP2a POLICY (informational, never a gate) but not the concrete computable-trigger condition, the one-click fix action, or the dismissal-persistence rule. The policy survived; the worked design didn't. |
| §8 | DP5 operator-simplicity test — full hardened protocol | **⚠ GAP** | Already logged once under the P1 section (same item, chained from P1→P2); not double-counted here |
| §9 | Converter map including **Site-Info as an explicit clone target** (the Cynic MF4 fix — a PHP option store, not a block attr) | **⚠ GAP** | FR-37-22 states the general principle (emittable by construction) but does not name Site Info as an explicit converter target the way P2 §9's table does; the specific binding-source function citation is also absent |
| §10 | First vertical slice = drawer settings (FR-34-5) only; tri-state + real-clone-in explicitly cut to P3/walker | CARRIED, historical | This slice shipped as Spec 34 FR-34-5, now folded into Spec 36 FR-36-6/FR-36-14 |
| §13.1 | ACTION — Spec 17 FR-S1-1 stale (parts/header.html hand-duplicated, not a pattern reference) | CARRIED, verbatim | Spec 37 FR-37-6 (28 lines of hand-authored blocks in `parts/header.html`, PARTIAL status) |
| §13.2 | ACTION — CPT pattern-registration timing gap | CARRIED | Same item as row 1 of this table (Spec 37 §2.2) |
| §13.3 | CONSIDERED, DECLINED — a scoped D270 exception for the 4-flag migration | SUPERSEDED, moot | FR-37-14's "no migration needed, sites are pre-live" resolves the whole question differently; the considered-and-declined exception no longer applies because there's nothing to migrate |
| §13.4 | Pressure-tested "already right" list (scoped CSS, Site-Info as `wp_options`, starter library as patterns, bespoke editor components) | CARRIED | Reflected in Spec 37 FR-37-15, FR-37-17, FR-37-8 respectively |
| §14 | WP Control Implementation Spec — component map, native-vs-hand-roll table, "saving presets" mechanism, enforcement lints | MOVED, by design | Spec 37 §1.2 explicitly assigns "Inspector control completeness" to Spec 35 Part L; P2 §14 itself says it is "binding the builder to Spec 35" — this was always meant to land there, not in Spec 37 |
| §15 | Navigation engine decision (Bean override: full rework, not salvage) | MOVED, correctly out of scope | Spec 37 §1.2/§6 explicitly place all nav internals in Spec 36; §15's content is nav-only and is superseded by whatever Spec 36 actually specifies (confirmed live — Spec 36 exists and owns FR-36-1 through FR-36-25) |

---

## 4. `2026-07-17-header-footer-nav-full-rebuild-strategic-plan.md`

| § | Item | Disposition | Where |
|---|---|---|---|
| §2 G1 | Research artefact required before any design/build | CARRIED, implicit | Spec 37's `references:`/`status_history` frontmatter cites its sources (P2, P1, 07-13); the spec's own construction embodies the gate |
| §2 G2 | Live-trigger/rendered-output verification on BOTH sites, never source-code-only | CARRIED | Spec 37 §7 constraint 6 ("Verify on the live page, not the emit — R-31-11, STOP-21"); every FR's "Done when" clause requires frontend/live evidence |
| §2 G3 | Whole-surface sweep before building on an assumption (hidden parallel systems) | CARRIED | Spec 37 §2.2 is itself the product of exactly this kind of sweep (finding the `admin_init`-vs-`pre_render_block` timing bug) |
| §2 G4 | Comprehensive lint wired to prebuild (`lint-theme-css-hardcodes.py`, breakpoint-glossary lint, webpack-entry-vs-enqueue check) | **⚠ GAP (infra, lower severity)** | Not restated in Spec 37; this is generic project tooling debt, not header/footer-specific content, so its absence here is more a housekeeping note than a design drop — flagged for completeness only |
| §2 G5 | No phase closes with QC owed (visual-diff + eyeball AT commit, never parked) | CARRIED | Spec 37 FR-37-23 ("Bean's eye signs off… each with evidence recorded, not asserted") |
| §2 G6 | Design-gate + `/adversarial-council` before any shared-mechanism build | CARRIED | Spec 37's own status_history: "Awaiting the §10 coverage gate + `/qc-council` before sign-off" — and §9 mandates `/qc-council` before Spec 17 deletion |
| §3 | Architecture/data-model FIRST; builder is a UI over it | CARRIED, sequencing already executed | Reflected in the P1→P2→Spec 37 sequencing that actually happened |
| §4 phases | P1 Research→Architecture, P2 Builder design-gate, P3 model build, P4 panel build, P5 advanced header modes, P6 retire+clone+defect sweep | CARRIED (phase boundaries redrawn, substance intact) | P1/P2 executed as named; P3-P6 substance is distributed across Spec 37's `NOT-BUILT`/`PARTIAL` FRs (FR-37-3, FR-37-14 etc. = P3; FR-37-9/10 audits = P4-adjacent; FR-37-21 retirement = P6) |
| §5 | Milestone gates 0-4 (plan validation, architecture sign-off, builder-design sign-off, model live-verified, builder usable-by-non-coder) | CARRIED (0-2 closed), **Gate 4 = the DP5 gap** | Gates 0-2 closed (P1/P2 council-passed); Gate 3/4 map onto Spec 37's own FR-37-23 acceptance gate, MINUS the operator-usability criterion (already logged as the DP5 gap above — not double-counted) |
| §6 R1 | Research says "adopt" — HIGH impact risk | CARRIED, resolved | P1 answered BUILD; risk closed, reflected throughout Spec 37's bespoke-CPT architecture |
| §6 R2 | Capability-parity model churns 5 shipped blocks (D328 risk) | CARRIED (via a different, simpler mitigation) | FR-37-14 addresses the same risk but resolves it by clean-reshape-no-migration rather than the originally-planned sibling-attr/read-time-fallback approach (see §6c row above) |
| §6 R3 | The specs are still lying somewhere | CARRIED — this risk materialised exactly as predicted, and Spec 37 is the fix | Spec 37 §0's own plain-English section: "A session on 2026-07-21 built and verified the wrong thing purely because the governing spec still described the superseded model." |
| §6 R4 | Session sprawl/scope creep — LEDGER carries the baton, park aggressively | CARRIED, implicit | Standing project-wide discipline (LEDGER.md, parking.md), not Spec-37-specific content |
| §6 R5 | Production regression from retrofitting the model onto LIVE blocks; rollback/revert path; canary-first | CARRIED (mitigated via a changed premise) | FR-37-14's "sites are pre-live" finding reduces this risk's severity directly; canary-first deploy practice remains standing project policy (`build-deploy.py --target sandybrown`) |
| §6 R6 | Shared-worktree collision with a concurrent track | CARRIED, implicit | Standing project-wide git-workflow discipline (STOP-RECHECK-BRANCH), not specific to header/footer content |

---

## 5. `archive/2026-07-13-header-footer-container-design-gate.md` (FR-HF-1…6)

| FR | Item | Disposition | Where |
|---|---|---|---|
| FR-HF-1 | Header wrapper `core/group` → `sgs/container` (outer band + inner flex row, scoped responsive padding/border, no inline CSS) | CARRIED — superseded by a later, more complete build | The header is no longer a `core/group`+`sgs/container` pairing at all; it is the purpose-built `sgs/site-header`/`sgs/site-header-row` composite (Spec 37 FR-37-9), which keeps `SGS_Container_Wrapper` per the composite-mirror rule (§7 constraint 2) — a superset of what FR-HF-1 asked for |
| FR-HF-2 | Best-practice responsive value table (header height, padding, gap, breakpoints, touch targets) | CARRIED, by delegation | These become starter-pattern authored defaults (FR-37-8), not spec prose — a location shift, not a drop |
| FR-HF-3 | Sub-400px emergency reflow fix (hide WC customer-account via a `@media(max-width:400px)` hack in `header-behaviours.css`) | CARRIED — superseded by the general mechanism | Spec 37 §3.6's never-overflow contract (`flex-wrap`+`min-width:0`+`flex-shrink:0` on the logo, `clamp()`, container queries, `scrollWidth<=innerWidth` gate) is the generalised, permanent replacement for the old ad-hoc CSS band-aid |
| FR-HF-4 | Footer wrapper `core/group` → `sgs/container` | CARRIED — superseded by build | `sgs/site-footer`/`sgs/site-footer-row` (Spec 37 FR-37-10), same reasoning as FR-HF-1 |
| FR-HF-5 | Composite-mirror + no-inline compliance (no divergent styling path) | CARRIED, verbatim | Spec 37 §7 constraint 2 |
| FR-HF-6 | Behaviour-layer non-regression (sticky/transparent/shrink, `--sgs-header-height` ResizeObserver, anchor-offset fix); CPT template evaluation; pipeline Part 2 emission | CARRIED | Spec 37 FR-37-13/14/15 (behaviours); FR-37-6 (CPT template, already seeded per P2 §2.1's verification); §1.2 (clone walker → Spec 33 Part 2) |
| §6 Q1 | Sub-400 behaviour-layer CSS vs a native sub-400 container tier | CARRIED — resolved via the more general answer | The never-overflow contract (§3.6) is the container-native, universal solution; the ad-hoc single-tier question is moot |
| §6 Q2 | `<section>` vs `<div>` tag option on the container | Not tracked — implementation-granular | Not flagged as a gap; this is a settled-by-existing-code detail (the blocks already ship and render), not a load-bearing design decision the size of the others in this matrix |
| §6 Q3 | Reusable preset: inline-configure vs a registered `sgs/container` block variation | CARRIED — resolved differently | Resolved via dedicated composite blocks (`sgs/site-header`/`sgs/site-footer`, FR-37-9/10) rather than a container variation — a cleaner answer to the same underlying question |
| §6 Q4 | Footer scope now-or-next | CARRIED, resolved | Footer built alongside header (FR-37-10) |
| §6 Q5 | CPT template swap — now vs deferred to Part 2 | CARRIED, resolved | FR-37-6/FR-37-1 confirm the CPT template already points at `sgs/site-header`/`sgs/site-footer` |

---

## Full ⚠ GAP list (repeated, single source of truth — what is actually at risk if Spec 17/plan docs are deleted now)

1. **DP5 operator-simplicity test is entirely absent from Spec 37.** P1 §6 names it as a locked design principle; P2 §8 hardens it into a specific blind-tester protocol and makes it **P4's Gate-4 acceptance criterion**. Grepped Spec 37 fully — zero trace. **Lost: the only defined "is this actually usable by a non-coder" pass/fail test in the whole corpus.**

2. **P2 §5's per-block Simple/Advanced IA table (the concrete control-placement design for site-header/site-footer/adaptive-nav/drawer/nav-menu) is absent, along with the ≤3-cap-as-default + operator pin/unpin mechanism and its enforcement lint (`check-simple-surface-cap.js`).** **Lost: the actual, concrete "what does the client see first" design** — the difference between a usable panel and a wall of controls.

3. **Preset controls (composite "Layout: Centered/Split/Minimal" writing several attrs at once) — a named, Bean-confirmed decision (P2 §2.6/§11) — has no home in Spec 37.** **Lost: the decoupling design that let the inspector be more than a 1:1 attribute view**, without weakening the converter contract.

4. **The device-switcher a11y upgrade — `ResponsiveControl`'s `ButtonGroup` has no `tablist`/arrow-key nav and its buttons are ~24-32px (below the 44px floor) — a named, code-grounded P3 task (P2 §4.3) — is absent from both Spec 37 and Spec 35.** **Lost: a specific, already-diagnosed a11y defect and its fix**, re-hidden by omission.

5. **Generic per-tier visibility toggle for ordinary header/footer row elements (not nav items) — 07-13 §7's "every element: per-tier visibility toggle" — has no equivalent outside the nav-scoped Spec 36 FR-36-24.** **Lost: the ability to hide a non-nav element (e.g. a business-info block) on a specific device tier**, unless it happens to live inside the nav.

6. **The general custom-px 4th breakpoint tier for arbitrary responsive properties (07-13 §8) was narrowed to fixed 768/1024 in Spec 37 FR-37-16, with no stated reason.** (`collapseCustomPx` survives only as `sgs/adaptive-nav`'s own collapse-tier attribute, a narrower, nav-scoped thing.) **Lost, or at minimum unexplained: per-property custom breakpoints for header/footer container attributes.**

7. **Cross-CLIENT universality verification (mamas-munches AND indus-foods, different logo/palette) — named explicitly in 07-13 §12F and the archived FR-HF gate §7E — is narrowed in Spec 37's actual acceptance gate to "the canary"/"both dev sites" (an environment pair, not a client-design pair).** **Lost, or at minimum unexplained: the acceptance criterion that actually proves R-31-9 universality**, as opposed to proving the code runs on two servers.

8. **The contrast-notice's worked mechanism (P2 §7) — the computable trigger condition, the one-click "Turn on contrast safety" fix action, and the per-instance dismissal-persistence rule — survives only as the general DP2a policy statement in Spec 37 FR-37-19.** **Lost: the implementable design**, though the governing policy (informational-only, never a gate) is intact.

9. **Site-Info as an explicit converter clone target (P2 §9's Cynic MF4 fix — naming the exact `wp_options` write + binding-source function) is not named in Spec 37 FR-37-22**, which only states the general emittable-by-construction principle. **Lost: the specific target a P3/walker implementer would otherwise have to rediscover.**

10. **Minor findability affordances** — the admin-bar "Edit header/footer" link, a Dashboard/Appearance pointer (P2 §2.3), and the "Edit menu drawer" affordance for reaching drawer content from the CPT canvas — are absent from both Spec 37 and Spec 36. Lower severity; noted for completeness.

11. **G4's comprehensive-lint infra gate** (`lint-theme-css-hardcodes.py` wiring, a breakpoint-constant glossary lint, a webpack-entry-vs-enqueue check — 07-17 §2) is not restated in Spec 37. Lowest severity of the list — this is generic project tooling debt, not header/footer-specific design, so its omission here is a housekeeping gap rather than a lost requirement.

**Not gaps — deliberate, reasoned reversals worth flagging anyway:** the P2 §6c live-flag migration mechanism (new attr names + read-time PHP fallback + both-present precedence + canary before/after check) was **replaced, not dropped** — Spec 37 FR-37-14 states plainly that both sites are now pre-live, so the elaborate production-safety mechanism P2 built around protecting live customer data no longer applies, and a clean reshape is simpler and equally compliant with D270/D293/R-31-14. This is exactly the kind of retirement the coverage-gate process is supposed to surface and validate — it is sound, but it reverses something P2's own council treated as a hard must-fix, so it deserves a second pair of eyes at `/qc-council` rather than a rubber stamp.

---

# PART 2 — Spec 17 FR coverage matrix (all 39 FRs)

> **Added 2026-07-21.** Part 1 above covers the five PLAN documents only; its own scope note
> says so. This part closes the other half: every FR in Spec 17 itself.
>
> **Correction to the record.** An adversarial-council reviewer concluded "§S1–S8 were never
> audited". Not quite — the audit ran and enumerated all 39 FRs, but its output was never
> written to this file, so the reviewer reading the artefact correctly found nothing. **An audit
> that exists only in a transcript is lost.** That is the same failure mode this whole exercise
> exists to prevent, committed while preventing it. Persisted here to close it.
>
> **Count correction:** Spec 17 has **39** unique FR IDs, not the 48 previously asserted from
> memory. Roster: FR-S1-1…5, FR-S2-1…3, FR-S3-1…4, FR-S4-1…5, FR-S5-1…3, FR-S6-1…2,
> FR-S7-1…4, FR-S8-1…2, FR-S9-1…11.

| Spec 17 FR | Summary | Disposition | Where |
|---|---|---|---|
| FR-S1-1 | `parts/header.html` → pattern reference | CARRIED | FR-37-6 + FR-37-8; pattern-as-render-path superseded by §2.2 direct render |
| FR-S1-2 | Same, footer; no hardcoded client strings | CARRIED | FR-37-6 + FR-37-8 + §3.9 |
| FR-S1-3 | Create real files for orphan `header-{sticky,transparent,shrink}` parts | CARRIED | **FR-37-31** — inverted: they are DELETED, not created (behaviours are attribute-driven) |
| FR-S1-4 | Skip-link uses WP core `#wp-skip-link` (D157) | ⚠ **GAP** | Regression contract absent from Spec 37, which deletes the very files carrying the warning |
| FR-S1-5 | `sgs/product-search` header-eligible + 3 search starters, opt-in | CARRIED | **FR-37-31** second clause (starters + opt-in principle preserved) |
| FR-S2-1 | Variation-triggered seeding hook | RETIRED | Pre-existing — variation system deleted (Decision 18) |
| FR-S2-2 | Variation manifest header/footer fields | RETIRED | Pre-existing — same |
| FR-S2-3 | "Reset Header/Footer" admin button | CARRIED | **FR-37-25** |
| FR-S3-1 | ≥3 patterns/area unlock Replace picker; 10-pattern roster | CARRIED (partial) | FR-37-7/8; ⚠ the 3 layout variants (centred/minimal/full) have no stated fate |
| FR-S3-2 | Conditional header rules | CARRIED | FR-37-20 |
| FR-S3-3 | Conditional footer rules | CARRIED | FR-37-20 |
| FR-S3-4 | `sgs_header`/`sgs_footer` CPTs, REST gated | CARRIED | FR-37-1; ⚠ REST capability-gating detail is prose-only, see below |
| FR-S4-1 | Site Info store | MOVED → Spec 36 | §8.1.1 — **conditional on the Spec 36 amendment; unowned until it lands** |
| FR-S4-2 | `sgs/site-info` binding source | MOVED → Spec 36 | §8.1.1 — same condition |
| FR-S4-3 | Site Info admin page | MOVED → Spec 36 | §8.1.1 — same condition |
| FR-S4-4 | `sgs/business-info` reads the store | CARRIED | Shipped (D325); consumed by §3.7 |
| FR-S4-5 | Personal-data sweep + CI linter | CARRIED | §7 constraint 3 + §3.9 |
| FR-S5-1 | SGS admin menu structure | CARRIED | FR-37-1 + FR-37-5 |
| FR-S5-2 | Style Variation Picker | RETIRED | Pre-existing — Decision 18 |
| FR-S5-3 | WP-CLI surface, 11 `wp sgs` commands | CARRIED (reduced) | **FR-37-30** — set/clear active, list, seed. ⚠ Fate of the other commands unstated |
| FR-S6-1 | Pattern slug standardisation + shim | RETIRED | One-time migration, executed 2026-05 |
| FR-S6-2 | Naming conventions + linter | MOVED → Spec 00 | Naming is Spec 00's |
| FR-S7-1 | Block deprecations | RETIRED | D270/D293 no-deprecations policy; §6 |
| FR-S7-2 | Framework versioning + migration log | RETIRED | Pre-production; no migrations |
| FR-S7-3 | Existing-site safety guard | RETIRED | Depends on dead FR-S2-1; pre-live |
| FR-S7-4 | `_sgs_cloned_from_pattern_slug` re-clone idempotence | RETIRED (with trigger) | §8.1.2 — CPTs carry revisions; clone doesn't touch header/footer until Spec 33 Part 2. **Revisit when Part 2 is built** |
| FR-S8-1 | Colour-axis variations | RETIRED | Pre-existing — Decision 18/19 |
| FR-S8-2 | Typography-axis variations | RETIRED | Pre-existing — same |
| FR-S9-1 | Container blocks permitted inside template parts | CARRIED | Precondition of FR-37-9/10 + §1.1 |
| FR-S9-2 | `sgs/site-header` — 3 named rows, locked palette | CARRIED (deliberate divergence) | FR-37-9 + §3.1–3.6; §3.5 **reverses** the palette lock, with reasoning |
| FR-S9-3 | `sgs/site-footer` — rows + 6 columns + bottom bar | CARRIED | FR-37-10 + FR-37-11 + §3.2 |
| FR-S9-4 | Navigation block | MOVED → Spec 36 | Already re-homed 2026-07-19 |
| FR-S9-5 | Drawer a11y contract | MOVED → Spec 36 | FR-36-6 / FR-36-16 |
| FR-S9-6 | Per-breakpoint responsive model | CARRIED | FR-37-16 (status corrected — rows only) |
| FR-S9-7 | Never-overflow layout | CARRIED | §3.6 + FR-37-12; ⚠ width set narrowed 8→3, see disputed |
| FR-S9-8 | Per-device adaptation — `labelCollapse`, move-to-drawer | PARTLY RETIRED | §3.8 — move-to-drawer dropped (Bean); `labelCollapse` re-evaluated; cascade replaces both |
| FR-S9-9 | Sticky/transparent/shrink behaviours | CARRIED (extended) | FR-37-13/14/15 — +hide-on-scroll, body-class → scoped CSS |
| FR-S9-10 | Global defaults + shared Site Info | CARRIED | FR-37-17 + §3.7 |
| FR-S9-11 | CPT template swap + reseed + clone plumbing | CARRIED / MOVED | FR-37-1 + FR-37-22; walker → Spec 33 Part 2 |

## Open GAPs from this pass

1. **FR-S1-4 — skip-link regression contract.** D157's "do not reintroduce a duplicate theme
   skip-link" warning lives in the very files FR-37-31 deletes. Restate it in FR-37-31.
2. **FR-S3-1 — the 3 layout starter variants** (centred / minimal / full) have no stated fate.
   Presumably fold into FR-37-8; say so explicitly.
3. **FR-S5-3 — the non-carried WP-CLI commands.** FR-37-30 says "reduced set" without saying
   what happens to migrations/seeding-arm/rules commands.

## Prose-only content (no FR-ID — the most easily lost)

- **FR-S3-4's REST capability-gating detail** — CPT reads gated to `edit_theme_options`, 401 not
  200, 50-post soft limit. Security-relevant; nothing in Spec 37 gates its regression.
- **§S9's guardrail block** — "attribute shape FROZEN, no flat→object reshape, sibling-attr only".
  This **directly collides** with FR-37-14/16's clean reshape. Spec 37's pre-live reasoning is
  sound, but it must say it is **knowingly overriding a named guardrail**, not silently supersede it.
- **§S9's tooling paragraph** — `/visual-qa`, `/a11y-audit`, Playwright MCP, purge-cache-before-
  measuring, `/sgs-db` before any "missing X" claim. Operational QC method, unrestated.

## Disputed disposal

**FR-S9-7's width set.** Spec 17 tested 8 widths; FR-37-12 tests 375 / 768 / 1440. The original
requirement existed because of a **sub-384px** overflow bug verified fixed at 320/360/375.
FR-37-12 drops the exact 320–374 band the emergency lived in. **Add 320 to FR-37-12.**
