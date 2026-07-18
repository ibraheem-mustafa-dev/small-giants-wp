---
doc_type: architecture-decision
project: small-giants-wp
track: TRACK 2 — Header/Footer/Nav full rebuild
phase: P1 — Research → Architecture (deliverable)
date: 2026-07-18
status: DRAFT — awaiting /adversarial-council (Gate 1) + Bean sign-off
plan: .claude/plans/2026-07-17-header-footer-nav-full-rebuild-strategic-plan.md
evidence: 3-round research council (wf_7f62de54-623) — 5 gather streams + 4 adversarial personas + 4 rebuttal domains, 13 agents, 0 errors
---

# P1 Architecture Decision — Header/Footer/Nav

## 0. Bottom line (plain English)

**Verdict: BUILD our own — lean.** Do NOT adopt/fork a competitor. But do NOT build the maximal
"every setting independent at every screen size" model either — that is a combinatorial trap that
the research shows makes every competitor's builder confusing. Build the *minimum capability set the
conversion evidence supports*, with a simple cascade-from-desktop default and advanced overrides
tucked behind an "Advanced" panel. **Study** Kadence's breakpoint-switch UX and GenerateBlocks'
server-side content-fork architecture as reference patterns — copy the ideas, not the code.

## 0a. Bean-locked requirement (2026-07-18) — the header/footer is a THREE-way strategic surface

The header/footer/nav is not a commodity to minimise. It must serve **three** hard requirements
simultaneously, and the architecture is judged against all three:

1. **Framework design-build** — the sound foundation SGS builds every client design on.
2. **Client self-service** — a non-coder edits/designs their own header/footer in the block builder.
3. **Cloning-pipeline OUTPUT** — the SGS converter (Spec 31 + Spec 33 Part 2) must be able to clone
   ANY client's existing header/footer *into* these blocks, faithfully. The header/footer are
   **emit targets of the pipeline**, not just hand-built blocks.

**This DECISIVELY reinforces BUILD over adopt — on a non-cost basis.** A forked competitor block
carries a private attribute schema (`kadence/*`, `generateblocks/*`) that the SGS converter
**cannot emit into** — the converter writes SGS DB-first `block_attributes` keyed to SGS-BEM
(R-31-1). So "adopt" is not merely more expensive (the council's C2 objection) — it is
**architecturally incompatible with requirement (3)**. Fork is *disqualified*, not just dearer. This
answers the Competitor persona's "the header is commodity / you never priced the fork" finding: the
header-as-pipeline-output IS the differentiation, and only a bespoke SGS-native block can be it.

## 1. The build-vs-adopt verdict — BUILD (unanimous across streams + council)

All five research streams and three of four council personas converged on BUILD. The Adopt
Advocate's strongest *technical* point survived (Kadence's render mechanism is scoped-CSS, not
inline — compatible with SGS's no-inline contract), but its *conclusion* (fork Kadence) did not.

**Why adopt loses (evidence-backed):**
- **Licence is a non-issue** — every candidate (Kadence, Spectra, GenerateBlocks, MaxiBlocks,
  Rootblox) is GPLv2+ and legally forkable. Licence was never the blocker. *(Stream D, high)*
- **Architecture-fit is the blocker.** Every candidate ships its OWN private attribute schema +
  namespace + CSS-output model (`kadence/*`, `generateblocks/*`, `maxi-blocks/*`) with zero mapping
  onto SGS's DB-first `block_attributes` / `box_family` / SGS-BEM system (R-31-1). No external plugin
  emits SGS-BEM — true by definition. *(Build Purist + rebuttal, UPHELD against live code)*
- **"Fork" = rewrite + permanent debt.** Forking any candidate means rewriting its block
  registration + attribute schema + CSS-output layer to satisfy the no-inline contract and naming
  rules, PLUS forever manually re-applying every upstream security/WP-core-compat fix. That cost is
  **higher** than building fresh. *(Stream D, high)*
- **No "wait for core" option.** WP core's custom-breakpoint request has been open since Oct 2022;
  core is not closing this gap on any visible timeline. No urgency risk in choosing BUILD. *(Stream B/D, high)*

**Dissent captured (Adopt Advocate):** forking Kadence's *proven capability shape* is a bounded,
estimable task vs. inventing the model from a blank file. **Rebuttal:** true that Kadence's mechanics
are sound, but "adopt-and-reskin" still requires re-registering every attribute onto SGS's model —
which is the rewrite. The Adopt Advocate proposed a time-boxed fork spike; we did NOT run it
(residual — see §5). If the fork-cost estimate is wrong, this verdict is the thing to re-test.

## 2. The capability-parity model (the design decision to lock)

**SCOPE REVISION (Bean-locked 2026-07-18) — rich capability, simple SURFACE.** Requirement (3)
above (clone-pipeline output) means the capability SET must be **rich, not minimal** — "super high
levels of functionality" — because the converter must faithfully clone a client's *existing* rich
header (mega-menus, multiple header modes, per-device layouts) INTO these blocks, and clients must be
able to design richly themselves. This **overrides the CRO Realist's "go minimal, drop mega-menu"
recommendation.** Mega-menu + all header modes are **IN** — they are clone targets. The reconciliation
with operator-simplicity is NOT a smaller feature set; it is **progressive disclosure**: rich
capability underneath, a simple cascade-from-desktop default surface, richer controls behind
disclosure, everything defaulting OFF and revealing on demand. **This RAISES the bar on the council's
C3/C4/C6 findings** (more attributes = more D328/sentinel surface + more stall risk) — which is
exactly why the sibling-attr mechanism, the override cap, and the phasing must be locked precisely
BEFORE building. High functionality is the reason to get the architecture right, not a reason to rush it.

**Shape: cascade-default + scoped override, NOT full independence.**

The CRO/Support Realist's position — validated against SGS's actual client roster
(restaurant / B2B food / medical, none catalogue-heavy) — carries the model:

1. **Default = cascade from desktop.** An operator sets a value once (desktop); tablet + mobile
   inherit unless explicitly overridden. This is how a non-coder configures the whole header in
   minutes, not hours.
2. **Per-surface / per-breakpoint OVERRIDE lives behind a collapsed "Advanced" panel** (native
   Gutenberg `ToolsPanel` / collapsed `PanelBody` — already in use in `site-header/edit.js`). The
   default panel stays simple; power is available, not in the way. This is progressive disclosure,
   not paywall-gating.
3. **FOUNDATION POSTURE — full clean rebuild, opportunistic salvage (Bean-locked 2026-07-18).** The
   current header/footer/nav blocks are placeholder-grade — they never built the intended architecture.
   So the block architecture is **designed clean from the three requirements (§0a)**, NOT extended off
   the current blocks. A pre-existing part (e.g. the 17 object-tiered attrs, the shared-menu wiring
   `FR-34-4`, the business-info store `FR-S9-10`) is **adopted ONLY if it fits the clean design as-is**
   — a free pre-built part. The instant the design would have to bend to accommodate an existing part,
   that part is rebuilt. **Existing code earns its place by fitting; it never drives or constrains the
   design.** (This kills my earlier "extend the 17 tiered attrs" default — that was the exact
   build-on-a-placeholder trap the council's C1 finding rested on, now inverted.)
4. **On/off capabilities are designed as TIERED TRI-STATE from the start — no flat booleans, no
   sibling-attr patch.** The Spec-Lawyer's Gate-1 finding (C3): a bare boolean can't express
   "inherit from desktop vs explicitly off here", so cascade is impossible for a flat boolean. In a
   clean rebuild we never hit this — every responsive on/off capability (`sticky` / `transparent` /
   `shrink` / `contrast-safe`) is a **3-state value (`inherit` / `on` / `off`), tiered per surface +
   breakpoint**, designed that way from day one. This resolves D328/D291 by construction (no
   flat→object coercion, no enum-coercion) rather than patching around it.

**Capability SET the conversion evidence actually supports (the lean scope):**
- Sticky header (mobile-concentrated win: NN/g ~22% nav-time saving; Contentsquare +31% conversions
  on mobile sticky CTA) — with the 20-30%-viewport-height + 44px-target discipline SGS already meets.
- **Visible top-level nav at desktop/tablet, drawer reserved for genuinely mobile widths.** NN/g:
  hiding nav behind a hamburger costs >20% discoverability *even on desktop*. This directly shapes
  the `collapseTier` default.
- Click-to-call / visible phone number in the header (10-15× lead conversion for local/service SMEs).
- Simple drawer content-fork (independent drawer content, not a collapsed copy) — the one place
  independent-per-surface genuinely earns its keep.
- CTA slot (donate above-the-fold for charities; cart/account top-right for e-commerce).
- Mega-menu = **opt-in, low priority** — a net negative for small SME/charity navs (content-breadth
  decision, not brand-size); build it only when a client's content genuinely needs 2D categorisation.

**Harvest (study, don't fork):**
- **Kadence's** numeric "screen size to switch to mobile" breakpoint control + icon-driven
  desktop/tablet/mobile value-switcher — proof the parity inspector is buildable with standard
  `@wordpress/components`.
- **GenerateBlocks Pro's** server-side Conditions (render different markup per device, zero hidden
  DOM) — the architectural ideal for the drawer content-fork (no dead duplicate markup).

## 3. Spec truth-up — Spec 17 §S9 + Spec 34 vs LIVE code

**Headline (important, and it revises a plan premise):** the plan assumed "the specs have carried
false claims that misled every session." For the header/footer specs specifically, the audit found
the **opposite** — they are *unusually well-grounded, not aspirational*. Verified directly against
live `block.json` + DB + PHP:

| Spec claim | Live-verified status |
|---|---|
| 95 total attrs / 17 tiered / 78 flat (D339 correction) | **TRUE, exact.** site-header 26/0-object · site-footer 22/0-object · site-header-row 10/5-object · site-footer-row 11/6-object · adaptive-nav 26 |
| `headerSticky`/`headerTransparent`/`headerShrink` flat booleans, `contrastSafe` flat enum, no tiered siblings | **TRUE** (grepped whole `src/` tree — no `*Mobile`/`*Tablet` siblings exist) |
| FR-34-4 shared menu source (adaptive-nav ↔ nav-menu via block context) | **BUILT + verified** (`providesContext`/`usesContext` wiring confirmed) |
| FR-S9-10 business-info central store | **Substantially BUILT** — 7 live PHP classes (`class-sgs-...`) |
| FR-S9-1/2/3/4/5/9/11, FR-34-1..4, FR-34-6 | **Match BUILT claims** on static-code read |
| `sgs/mobile-nav` retired | **TRUE** (absent from code + DB — no legacy dual-system risk) |
| **FR-34-5 drawer settings** (content-alignment, inner spacing, popup padding, close-icon colour) | **THE ONE REAL GAP — only `Background` shipped.** Treat as OPEN in the model, not done. |

**Fact-check correction (2026-07-18):** an earlier draft of this doc said Spec 17 §S9 carried a "SGS
supersedes core's WCAG-broken nav" claim that needed narrowing to click-mode. **On direct read of Spec
17 §S9, that claim does NOT exist there** — it was a general WP-core research observation (core's *click*
submenu mode has a real WCAG issue; its *default hover* mode renders the correct anchor+separate-button
structure) that was mis-attributed to the spec. SGS's nav uses the disclosure/accordion APG pattern
(D334), not core's click-mode, so the distinction is moot for SGS anyway. **No spec edit is needed —
recorded here only so the false edit-item doesn't propagate.**

## 4. What this unlocks (P2 scope preview)

BUILD (not adopt) means **P2/P4 do not collapse** — the builder is genuinely ours to design. P2 =
the builder-UX design-gate over this model: a Site-Editor panel exposing the lean capability set with
cascade-default + Advanced-override, harvesting Kadence's breakpoint-switcher UX. FR-34-5 (drawer
settings) folds into that same panel — build it once.

## 5. Open residuals (honest — carried to P2/P3, none block the verdict)

1. ~~Everything is SCHEMA-verified, NOT LIVE-verified — live-verify the current modes first.~~
   **KILLED 2026-07-18 (Bean-directed).** The council's C1 (5-voice) demanded a live-DOM check of the
   current header modes before building. But the current build is placeholder-grade and is being fully
   rebuilt (§2.3) — verifying a throwaway that's about to be discarded tells us nothing about the
   architecture we're choosing. The finding rested on the false "we're extending the current blocks"
   premise; with the clean-rebuild decision it dissolves. (The genuinely useful audit — which current
   parts are sound enough to opportunistically salvage — was largely done by research Stream E already.)
2. **Fork-cost never empirically measured.** The Adopt Advocate's time-boxed Kadence-fork spike wasn't
   run — the BUILD verdict rests on qualitative reasoning (strong + unanimous, but not measured). If
   anyone wants to pressure-test "build cheaper than adopt", that spike is the test.
3. **Kadence tab data-structure** (one shared attribute-per-capability = true parity precedent, vs
   three surface-siloed panels) unresolved — matters only as a reference study for P2, not the verdict.
4. FR-34-5 real-client-demand not checked against parking.md/LEDGER (5-min grep before P2 scopes it).
5. `contrastSafe` auto-suggest behaviour (silent scrim default vs operator prompt) = a WCAG design
   decision for P2/P3, not settled here.

## 6. Decision record (post Gate-1 council + Bean steer, 2026-07-18)

- **BUILD, not adopt** — reinforced to a *non-cost* certainty by requirement §0a.3 (clone-pipeline
  output): a forked competitor block's private schema can't be a converter emit target. Fork
  disqualified. (Council C2 — "fork-cost unmeasured" — resolved on architecture, not price.)
- **Full clean rebuild of the block architecture** from the three requirements (§0a); opportunistic
  salvage only, existing code never drives the design (§2.3).
- **Rich capability, simple surface** — mega-menu + all header modes IN (they are clone targets);
  operator-simplicity via progressive disclosure, not a smaller feature set (§2 scope revision).
- **Capability-parity model** = cascade-from-desktop default + capped Advanced override; every
  responsive on/off capability is a **tiered 3-state (`inherit/on/off`)** value from day one (§2.4).

**Locked design principles (surviving Gate-1 council findings, filtered 2026-07-18):**
- **DP1 (C3)** — responsive on/off capabilities = tiered tri-state, never flat boolean. Resolves D328/D291 by construction.
- **DP2 (C4)** — the "Advanced" override surface is a NAMED, CAPPED list (keeps the operator UI simple).
- **DP2a — accessibility feedback is INFORMATIONAL ONLY (Bean-locked 2026-07-18).** WCAG/contrast
  issues arising from an operator's choices (e.g. a transparent header over a light image producing
  low-contrast nav text) surface as a **passive informational notice in the block editor + WP admin
  area — and nothing more.** NEVER a gate (never blocks save/publish), never auto-enforced or
  auto-corrected, never wired into the build/agent/pipeline enforcement. The operator sees it and
  decides. **This OVERRIDES the council's "enforce contrast-safe on whenever transparent is on" fix —
  Bean prefers informed agency over enforcement.** Distinction preserved: SGS's framework **WCAG 2.1 AA
  baseline still governs the blocks' DEFAULT rendered output** (they ship accessible out of the box);
  the informational-only model applies to operator OVERRIDES that depart from that accessible default.
- **DP3 (C5)** — the bespoke nav replaces `core/navigation`, so a per-WP-release regression smoke-suite (both sites) is a named deliverable; the 2 live sites migrate onto the new architecture via canary-first (sandybrown → palestine-lives).
- **DP4 (C6)** — ship a vertical slice end-to-end FIRST (early win + de-risk + measures real build-cost), before the full multi-block rebuild. Anti-stall.
- **DP5 (C7)** — "operator simplicity" gets a defined pass/fail test (e.g. non-coder sets sticky + phone + drawer content in <3 min without opening Advanced).
- **Consider (WP-Platform):** check WP 7.1 release notes (due weeks) for any native breakpoint/nav-parity feature before over-building; consider forking only core's click-mode fix and deferring to core's (WCAG-correct) hover-mode markup to cut reimplementation surface.

**Spec truth-up (DONE 2026-07-18, fact-checked against live spec text):** Spec 17 §S9 + Spec 34
verified truthful. (a) FR-34-5 marked NOT-BUILT (status marker added to Spec 34 — only `drawerBg`
shipped). (b) was a **phantom** — the "core-WCAG-supersede" claim isn't in Spec 17 §S9 (see §3
correction); no edit made. No fiction purge required — the specs were accurate.

**Gate 1 status:** council-passed (GO-conditional; conditions folded above as locked principles) +
Bean-steered + Bean greenlit finishing P1 (2026-07-18, "finish now"). P1 CLOSED. P2 (builder
design-gate) may be scoped next session per the roadmap.
