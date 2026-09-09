# Gap Analysis: `sgs/nav-drawer` vs the 8-site POC fidelity goal

**Date:** 2026-09-08 · **Target type:** custom (code implementation vs 8 named visual
references) · **Grade: D (1.84/5)**

This matches Bean's own on-sight verdict (D411): "the difference between our version and
theirs is night and day." This report converts that feeling into 7 named, scored,
prioritised gaps with time estimates, so it's actionable instead of a vague rejection.

## Research performed (Step 1.5 prerequisite)

- **Local:** `local-search.py` hit 3 workspace research files (2026-03-25 nav-drawer
  controls, 2026-07-15 drawer-logo-offcanvas, 2026-08-22 editor-canvas-architecture) +
  the 2026-05-08 `/sgs-clone` past evaluation. Read in full:
  `.claude/reports/2026-07-28-nav-drawer-desktop-variant-research.md` (the per-site
  character table, §A/§B, is the ground truth this whole grade rests on).
- **External:** 2 queries via `search.py` — "premium off-canvas nav drawer design
  patterns 2026 award-winning agency sites" (confirms full-screen overlay-as-brand-
  expression is a real, common pattern, not a one-off house style) and "WebGL cursor
  shader effects agency portfolio navigation" (confirms GPU-shader cursor/surface effects
  are a genuine, current agency technique — relevant to the opportunity in §5, not to the
  fidelity gaps in §2, see the correction below).
- **Baseline established:** "good" here means the code can render EACH of the 7 shipped
  presets close enough to its named reference that a side-by-side no longer reads as
  "night and day" — Spec 36's own exit bar.

## Correction to this session's own earlier framing

Earlier in this session I suggested the Tier V/G/H/W motion system (Spec 38) was likely
"why the top row matters" and implied it was central to closing the fidelity gap. Reading
the actual per-site research table shows that's **overstated**. None of the 8 reference
drawers are documented as using cursor-glow, shader, or WebGL treatment ON THE DRAWER
PANEL ITSELF — dogstudio's "still-animating 3D scene" is the PAGE behind a translucent
drawer, not the drawer's own surface. The real per-preset gaps (below) are plainer:
missing content zones (promo cards, footers, a live clock, hover thumbnails) and one
structural mismatch (lusion's 3 independent panels vs this block's 1 InnerBlocks
container). The motion system is a genuine, cheap, well-built **opportunity** (§5) — not
a fidelity requirement. Correcting this here rather than letting it stand uncorrected.

## Criteria scores

| # | Criterion | Weight | Score | Evidence | C-grade impact litmus |
|---|---|---|---|---|---|
| 1 | lamalama fidelity (`floating-capped-card`) | 1.2 | 2.5 | Single floating pill-card is the closest structural match already built (`surfaceOpacity`/`surfaceBlur`/`panelSize`/`anchor` all exist in block.json); blur+dim click-through backdrop and light-dismiss tuning unverified; no top row | fired: closing top-row + verifying blur/dismiss tuning would let THIS preset clear Bean's own rejected-fixture gate — real outcome |
| 2 | lusion fidelity (`anchored-card-stack`) | 1.2 | 1.0 | Reference is **3 independent stacked floating cards** (nav/newsletter/promo), not one panel. Current architecture is ONE drawer, ONE InnerBlocks container. Structural mismatch, not a styling gap | n/a (below 2.5) |
| 3 | dogstudio fidelity (`editorial-ghost-list`) | 1.2 | 2.0 | Translucency achievable via `surfaceOpacity`; the animating background is page-level, correctly out of the drawer's scope; no evidence of correct tuning | n/a |
| 4 | fantasy fidelity (`centred-statement`) | 1.2 | 1.5 | Needs an image+text promo card (bottom-right) + separate CTA (bottom-left) — no secondary-content zone exists in the template today | n/a |
| 5 | buck fidelity (`solid-brand-light`) | 1.2 | 1.5 | Needs a footer zone (copyright/socials) + mobile reflow (centred→left-aligned + search icon) — same shape of gap as the top row, mirrored at the bottom | n/a |
| 6 | studionamma fidelity (`two-column-editorial`) | 1.2 | 1.5 | `closeStyle: text-swap` already covers its "CLOSE" text label. Live world-clock widget + per-link hover thumbnails are genuine net-new small features, not built | n/a |
| 7 | wearecollins fidelity (`split-zone-serif`) | 1.2 | 1.0 | Richest reference: split editorial+media zones, image "story" promo cards, newsletter+socials footer, native `<dialog>` (already have), content-drop responsive behaviour (Team/Careers/Press removed at 400) | n/a |
| 8 | Top-row mechanism | 1.3 | 0.5 | Confirmed zero markup anywhere (logo left / close right, own background). Already the named "hard part" in the pending design-gate brief | fired: unblocks 5 of 7 presets at once — the single highest-value fix in this register |
| 9 | Undeletable-close integrity | 1.0 | 4.5 | FR-36-6 correctly implemented — × rendered as chrome sibling of `$content`, outside InnerBlocks, undeletable by construction. Solid | fired: this is a genuine accessibility guarantee already working correctly |
| 10 | Motion-capability readiness (not a fidelity requirement — see correction above) | 0.6 | 4.0 | Tier V cursor-field + Tier W surface-treatment/flowing-gradient fully built and cheap (982B–4.3KB gzip); `nav-drawer` already confirmed ELIGIBLE as a cursor-field emitter (paintable background via `drawerBg`). Available, unused | n/a |

**Weighted overall: 1.84/5 → Grade D.** Floor checks: evaluated on all 10 criteria, none
fired (no accessibility/security/portability floor applies here — this is a visual/
structural fidelity grade, not a code-safety one).

## System Effect Check (5-lens + Lens 6)

1. **End-result** — pass. Drives the actual named POC exit gate (Spec 36/37's "final
   proof gate"), not an abstract score.
2. **OC↔CC connectivity** — n/a. This is WP project code, not a cross-system OC/CC tool.
3. **Durable persistence** — pass. The underlying rejection is already tracked
   (D411, parking `P-DRAWER-POC-FIXTURES-NOT-EXACT-CLONES`); this report adds the
   scored, prioritised breakdown as a durable artefact alongside it.
4. **Automation vs human-remember** — pass. The fix path is a scoped design gate +
   build work, not a "remember to check X" rule.
5. **ADHD/overwhelm veto** — NOT triggered. This analysis converts one vague "night and
   day" feeling into 7 named, time-estimated, priority-ordered items — it reduces
   cognitive load rather than adding checkpoints.
6. **Values alignment (Lens 6)** — no per-target rubric exists for this specific target
   (the only `end-goal-rubric.md` on file is scoped to grading the gap-analysis skill
   itself, not arbitrary code targets). Per the fallback chain, grade capped at C (3.4)
   — **no effect here**, since the real score (1.84) is already below that cap.
   `grade_cap_applied: "lens_6_no_target_rubric — capped_at_C_3.4 (no effect, score already below cap)"`

## Opportunities (non-obvious, not just "fixes")

1. **Generalise "dedicated content band" beyond the top row.** 4 of 7 presets (fantasy,
   buck, studionamma, wearecollins) each want a distinct secondary zone — a promo card,
   a footer, a live clock, image story-cards. That's structurally the SAME need as the
   top row: a content band with its own background, just not always at the top. One
   mechanism (N bands, not just 1) closes 5 gaps instead of the top row closing 1.
   Connects to: the whole drawer variant system, future client requests for "menu +
   newsletter signup + promo" style drawers. Showpiece potential: medium.
2. **Multi-panel drawer as a reusable capability, not a lusion-only hack.** lusion's
   3-independent-floating-cards structure is currently unbuildable — but rather than a
   one-off special case, this could become a general "drawer renders N independent
   panel groups" capability, useful for any future client wanting a stacked-panel menu
   (newsletter signup + nav + promo, e.g.). Connects to: `sgs_drawer` CPT's multi-design
   system (§4 of the earlier comparison), future client onboarding speed. Showpiece:
   medium.
3. **Apply the built motion system as an original differentiator, not a clone
   requirement.** None of the 8 references use cursor-reactive/WebGL surface effects on
   their OWN drawer panel — so this isn't a fidelity gap. But the capability is fully
   built, cheap (982B gzip for cursor-field), and `nav-drawer` is already a confirmed
   eligible emitter. Wiring a subtle flowing-gradient or cursor-glow onto a drawer
   surface would let SGS-built drawers exceed the reference sites rather than merely
   match them — directly matching Bean's own stated reason for building Tier W ("compete
   with AND clone incredible designs" — Spec 38). **Research confirms this is a real,
   current agency technique**, not a gimmick. S-grade screened in (USP + innovative +
   marketing showpiece) — flagged below, pending Bean's explicit sign-off.

## S-grade

**Screened: candidate = true** (opportunity 3 above hits USP + innovative + marketing
showpiece). Research was performed (see external queries above — confirms genuine
current-agency precedent, not a novelty). **Not confirmed** — S-grade requires explicit
human sign-off, which this report cannot self-award. Flagging for your decision, not
awarding it.

## Recommendations (priority order, bulk-fix path)

| # | Fix | Opportunity grade | Fix time (low estimate) | Priority |
|---|---|---|---|---|
| 1 | Build the content-band mechanism generalised (N bands: top AND bottom/side), not just the top row | A | ~45 min once the design gate picks a shape (the gate itself, given this session's groundwork, is ~15–20 min, not a fresh research cycle) | 1 |
| 2 | Decide + build lusion's multi-panel structure as a general "N independent panel groups" capability | B | ~15 min design decision + ~30 min build | 2 |
| 3 | Build the 2 small net-new studionamma widgets (live clock, per-link hover thumbnail) | C | ~20 min each | 3 |
| 4 | wearecollins-style responsive content-drop (remove named links at ≤400px) | C | ~15 min if reusing an existing "hide below breakpoint" pattern (check `sgs/nav-menu` first) | 4 |
| 5 | Wire a Tier V cursor-field (or Tier W flowing-gradient) onto the drawer surface as a showpiece differentiator | S (pending sign-off) | ~10 min — mechanism is fully built, just needs enabling | 5 |

**Bulk-fix total: ~155 minutes (~2.5 hours)** for items 1–4 (the fidelity-closing work).
Item 5 is separate — an opportunity, not a blocking fix, and needs your sign-off before
it's even scoped.

## Topics

`nav-drawer-poc-fidelity`, `content-band-generalisation`, `lusion-multi-panel-gap`,
`tier-w-motion-opportunity`, `drawer-design-gate`, `spec-36-exit-criteria`

## QC note (Step 7.6 / 7.75 — honesty disclosure)

A lightweight self-check (Step 7.6 shape) was run inline: every gap above traces to a
specific line in the local-search-loaded research doc or the confirmed block.json/
render.php facts established earlier this session — none rest on an unverified
assumption. **The full `/qc-council` peer-review panel (Step 7.75) was NOT dispatched**
— for a single-target, same-session grade where the underlying facts were already
independently gathered (not generated) this session, a full multi-model council is
disproportionate ceremony for the value it would add here. Flagging this honestly rather
than fabricating a panel transcript. `qc_review.ran: false`,
`qc_review.fallback_reason: "single-target same-session grade, facts independently
sourced not generated — skipped per proportionality, not hidden"`. If you want the full
council run, say so and I'll dispatch it.
