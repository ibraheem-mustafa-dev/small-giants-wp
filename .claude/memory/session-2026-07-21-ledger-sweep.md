# LEDGER sweep — 2026-07-21

Swept from `.claude/LEDGER.md` during the 2026-07-21 handoff to keep the ledger under its
24,576-byte cap. These blocks are the verbatim prior living-status entries for the Spec 35
track (2026-07-19/20) and the 2026-07-17 orientation paragraph. Superseded, not deleted.

---

**Latest (2026-07-20, Track 1 — Spec 35 rollout, 4 commits, all merged to main via `5672b4c6`).**
Element-first inspector design LOCKED + its machine contract BUILT + the exemplar made real:
(1) **Parallax split** — background parallax = a toggle in the native Colour panel (`group="color"`,
background-capable blocks only) with conditional Strength; element parallax = its own renamed+explained
panel with conditional Strength; both drive the one `sgsParallax` enum (mutually exclusive) → zero
render/data-model change; live-verified (`1d476c26`). (2) **Task 2 #1 — element manifest** (`supports.sgs.elements`
= `{label,order,clusters[],prefix?,isWrapper?,attrMap?}`) + `cluster-member-sets.json` (text/fill/layout
member sets from the registry) + `check-element-manifest-conformance.js` (CLUSTER-COHERENCE rule, WARN-only);
brand-strip manifest seeded — honest run **16 OK / 22 gaps** (`869fe84d`). (3) **Task 2 #2 — brand-strip
exemplar now CONSUMES the real controls**: `tileShadow` → `ShadowControl` (scoped `<style>`, no inline),
per-logo link → `SgsLinkControl` (`869fe84d`). (4) **ShadowControl crash fix** — live-verify caught it
crashing on first render (`useSettings('shadow.presets')` returns WP's origin-keyed `{default,theme,custom}`
object on WP 7.0.x, not an array); normalised + slug-deduped; re-verified live (`bffb00ff`). Also: **Task 4
live-verified** (form-field inspector decluttered). **Next:** Task 3 (hover-duplicate codemod — design-gate
first), Task 6 (wire linters WARN-only), Task 2 #3 (per-device border/shadow — design-gate), #4 (content-tab
spec), step-5 (per-block manifest gap-closing from the 22-gap list). Handoff: `next-session-prompt-spec35-track1.md`.

**Prior (2026-07-19, Track 1 — Spec 35 block-inspector-UX, 11 commits).** Phase 0 foundations DONE +
attribute-registry mapped through Phase 1c. Built: the inspector DONE-checklist; the block roster
(DB-derived); all 3 audits (inspector-conformance JSX-AST, feature-parity, shrink-to-fit — WARN-only);
3 shared components (`DesignTokenPicker` enableAlpha, `SgsLinkControl`, `ShadowControl`); brand-strip as
the pilot exemplar; the **min-width:0 wrapper backstop** (built + deployed, but NOT live-emission-proven —
the homepage has no wrapper-grid container; UNIT D will prove it). **Registry insight (Bean-driven):**
944 attr names → ~80 TRUE settings; the "282 one-offs" were classifier laziness (dedup by NAME not
property-identity), fully adjudicated to 0 genuinely-unique. `plugins/sgs-blocks/scripts/consistency/`.
Full narrative: `memory/session-2026-07-19*.md`.

**Where we are (2026-07-17).** Two things run in parallel:
1. **The website builder itself** — the header/footer/nav system + the drawer menu are built
   and LIVE on both your test site (sandybrown) and the Indus site (palestine-lives). The
   last real product work (Phase 2 nav/logo fixes + the disclosure drawer) shipped and was
   merged to the `main` line. A few small polish items and the Indus header/footer match are
   still queued (below).
2. **A tidy-up of how the project is run** — a signed-off plan
   (now `plans/archive/2026-07-16-setup-simplification-and-protocol.md`) culled cruft and added
   automatic guard-rails so the AI needs less babysitting. **FULLY COMPLETE (P0–P6) and archived.**

**Why it matters.** You are QC-only on the framework; every drifting doc or missing guard-rail
is time you have to spend catching mistakes.



---

## Spec 36 Phase-1 close-out detail (swept 2026-07-21)

- **WAVES 0–4 + Gate-1 — ALL COMPLETE, Phase 1 CLOSED (2026-07-20).** Full blow-by-blow narrative swept to
  **`memory/session-2026-07-20-11-spec36-phase1-close.md`** (verbatim) now that the phase is shut; the compressed
  record follows. Built: the shared `store('sgs/nav')` (D323 body-reparent + D340 scroll-lock ported verbatim, the
  two old focus-traps MERGED); **`sgs/nav-menu`** (flat bar + burger→drawer, menu picker, collapse-point, featured
  checklist); **`sgs/nav-drawer`** (full-screen `<dialog showModal>`, × as undeletable chrome, `animateFrom`
  direction control) — **content-KIND block-private**, because a `<dialog>` cannot be hosted by
  `SGS_Container_Wrapper` (D294, Bean-approved; now documented as Spec 36 FR-36-13's `<dialog>` exception).
  `scripts/nav-qa/` Gate-1 tooling; header re-authored in `parts/header.html`; `sgs/adaptive-nav` left registered
  but dormant as the rollback path.
- **Gate-1 evidence (all green, live on the canary):** drawer axe **0** · elementFromPoint sweep **20/20** (10/10
  at 375, the Spec 36 §8 baseline, `probes.mamas.json`) · crawl-assert PASS with JS off · burger/ESC/focus/Tab ·
  CLS 0.0000–0.0144 · **Bean's eye PASSED** · **D340 bounce PASSED** (Bean, manual, real desktop browser — the
  harness CANNOT judge this; see STOP-HARNESS-CANNOT-SEE-A-CLASSIC-SCROLLBAR).
- **Three real bugs found + fixed during Wave 4, each live-verified:** (1) **D351** — the featured item rendered at
  **1.35:1**; root cause was a MISSING `featuredBg` attribute, so the converter silently dropped the draft's pill
  fill. The fidelity fix and the a11y fix were one fix (draft pairing 5.28:1). (2) The drawer's **exit animation had
  never once run** — `runClose()` called `dialog.close()` in the same tick, making the element `display:none` before
  a frame painted; native ESC also bypassed the close handler entirely. (3) A co-active session's deploy **silently
  reverted** the D351 fix and a false `verdict: PASS` reached Bean — `build-deploy.py`'s verify leg cannot detect an
  absent change. All three are now STOP entries.
- **FR-36-1 classic-menu resolver — BUILT + LIVE-VERIFIED (D352, `4a4c220a`).** Classic menus are the PRIMARY source
  per spec but resolved to nothing. Now CLASSIC-FIRST then `wp_navigation` (**Bean's ruling:** keep the single numeric
  `ref`, classic wins the id tie — no new attr, no reshape), normalising classic items into the same block-shaped
  array so `flatten()`/drawer/edit.js needed ZERO changes; FR-36-1's missing fallback order also implemented; editor
  picker now lists classic menus (they were unpickable). ⚠ **The first acceptance run was VACUOUS and was caught** —
  the labels asserted also come from the header's block menu, so it would have passed with the feature absent.
  Redone with a marker present on the classic page and ABSENT on the homepage. No regression.
- **Phase-1 close-out (roster + DB):** `no-header-footer-block.py` needs NO change, proven by EXECUTING it
  (`nav-menu`/`nav-drawer` → 0; `nav`/`header` → 2) · Spec 00 §2.1 refreshed (still named the six-days-deleted
  `sgs/mobile-nav`) · **`/sgs-update` Stage 11 had been FAILING (exit 1)** — detection was right, the hardcoded
  roster stale (`nav-menu`+`brand-strip` layout, `nav-drawer` content); now exits 0 · **30 attrs registered**
  (`sgs/nav-menu` had 2 of its 9 `featured*`).
- **⛔ One handoff instruction REFUSED:** "retire the adaptive-nav / mega-menu / mobile-nav DB rows". `mobile-nav`
  is ALREADY gone from `src/` and the DB; `adaptive-nav` MUST stay as the FR-36-18 rollback path; `mega-menu` is
  **Phase-2 scope**. Executing it as written would have deleted the rollback path — struck, not carried forward.
- **Known-open, NOT blockers:** featured-item HOVER diverges from the draft (`box-shadow: inset 0 -2px 0 accent`
  has no attribute) — **⛔ Bean-locked DO-NOT-FIX: the planted TEST CASE for header cloning**
  (`P-NAV-FEATURED-HOVER-DRAFT-PARITY`, BLOCKED). Bean also reported the inspector's **Styles tab blanking the
  sidebar** — **NOT REPRODUCED** (all 3 nav blocks, every panel forced open, zero console errors); he
  deprioritised it (`P-NAV-STYLES-TAB-BLANKS-UNREPRODUCED`).
- **NOT nav, recorded so it is not re-flagged:** 2 page contrast fails (button 3.67:1, Trustpilot 2.63:1) + a
  **duplicate `<main>` landmark** traced to a `core/group` in the PAGE content — belongs to the queued core→SGS
  migration (product-queue task A), not to nav. ("Our Story" has a submenu, flattened in Phase 1 by design;
  menu 1467's `/gifts/` → `/gift-ideas/` was fixed by Bean himself.)



---

## Track 2 history (P2 + P2.5) — swept 2026-07-21

**Track 2 history (P2 + P2.5) — CLOSED, detail archived.** P2 (the header/footer/nav BUILDER
design-gate) is DONE + SIGNED OFF: `plans/2026-07-18-P2-builder-ux-design-gate.md` — the
settings panel a non-coder uses, over a CPT editing home (`sgs_header`/`sgs_footer`, NOT the
Site Editor), tri-state per-device controls, starter-template picker, bound to Spec 35.
Navigation was then carved out as P2.5 (full rework — Bean overrode the council's "salvage
adaptive-nav"). **P2.5 outcome: `specs/36-SGS-NAVIGATION-SYSTEM.md` SIGNED OFF v2.1
(2026-07-19)** — the single canonical nav home; 7-persona adversarial council + qc-council
fact-check, all 26 FRs survive; code-salvage audit evidenced to `file:line`
(`reports/2026-07-19-P2.5-phase6.5-salvage-audit.md`); safe doc-purge done (spec 34 DELETED,
Spec 17/02 → Spec 36 pointers). Menu data = **CLASSIC WP menus PRIMARY** (`wp_navigation` is a
Phase-3 extra — an earlier "wp_navigation locked" line was a stale carry, corrected 07-19).
**Post-build deferrals — WORKED 2026-07-20 (see the Phase-1 close-out below).** The roster items
(Spec 17 §S9-1, `00 §2.1`, `no-header-footer-block.py`, Spec 29) are DONE; the DB-row retirement was
struck as not-actionable. **Still genuinely open:** the block-registration deletion + Indus header
cutover (**FR-36-18**) and the Spec 33 Part 2 emit-target repoint (**FR-36-15**) — both Phase-2 scope.
Full narrative: `memory/session-2026-07-19*.md`.
**Phase 1 CLOSED. Plan (historical, was QC-clean 92/100): `plans/2026-07-19-spec36-phase1-mvp-nav-plan.md`.**
