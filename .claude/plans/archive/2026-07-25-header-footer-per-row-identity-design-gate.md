> ARCHIVED 2026-07-28 — in-file status: EXECUTED 2026-07-26.

---
doc_type: design-gate
topic: header-footer-per-row-identity
date: 2026-07-25
status: EXECUTED 2026-07-26 — Option 1 (keep the shared engine) built in full. Phases 1+2 shipped
  (D386–D388) and the sticky work closed via the mini-design (D389) + build (D391/D392). Must-fixes
  1 and 2 were STRUCK rather than built (their premise died when per-row sticky was rejected);
  must-fix 8 turned out to be a live bug and is fixed. Historical from here — canonical record of
  what shipped = Spec 37 FR-37-37/38/39/40.
governs: amends Spec 37 §3 (behaviours) + §7 (constraints); records the block-private decision
review: 6-persona adversarial council (cynic / competitor / spec-lawyer / ship-PM / support-realist / code-grounded) run 2026-07-25 — verdict NO-GO as briefed, GO-WITH-CHANGES on this re-scope
---

# Header/Footer Per-Row Identity — Design Gate

## 0. Plain English (read this first)

**The decision.** The header and footer **keep the framework's shared layout engine**
(`SGS_Container_Wrapper`). We build the new per-row powers *on top of it*. The alternative —
ripping the engine out and giving header/footer their own private copy ("block-private") —
was **considered and rejected** after a 6-persona adversarial pre-mortem.

**Why block-private was rejected (do NOT re-open without new evidence):**
- It was proposed to escape a small settings-inconsistency in how the header stores spacing.
  That inconsistency lives in the block's **own** settings, not in the shared engine — so a
  private copy does not fix it, it just copies the mess into more places to maintain. **The
  premise was false** (confirmed by the two code-grounded reviewers).
- The per-row features it claimed to "unlock" are **already live with the shared engine in
  place** (per-row column counts, sticky/transparent/shrink/hide-on-scroll).
- The `sgs/mega-panel` precedent argues the *opposite*: mega-panel is content-shaped (a box)
  and never used the engine's grid machinery; header/footer are section/grid-shaped — the
  category the composite-mirror rule (D294) deliberately keeps on the shared engine.
- Cost: weeks of invisible work for an identical-looking result + a permanent maintenance
  drift risk (future engine upgrades would silently skip the two private copies).
- Council verdict: **6/6 keep the wrapper.**

**What we build instead.** Each of the 3 header rows (and the footer rows) becomes an
**independently-behaving strip** — its own sticky / transparent / shrink / hide-on-scroll — added
as a thin layer on the existing wrapper-backed rows. The per-row *styling* half (background /
border / text colour) already exists and is live-verified.

---

## 1. The design (per-row identity on the shared engine)

The four scroll behaviours today live on the whole header (one set of toggles). This design
moves/extends them to the **row** so each row behaves independently. The rows already emit their
own uid-scoped `<style>` for colour/border, and the behaviour layer keys on a CSS class — both
orthogonal to how the shared engine paints the box, so no engine change is needed.

**Phase 1 (ships to canary first — the visible win):**
- Per-row **transparent-until-scrolled** and **hide-on-scroll**, as attributes on
  `sgs/site-header-row` / `sgs/site-footer-row`, keyed on the row's existing uid class.
- The behaviour CSS/JS (currently keyed on `.sgs-site-header`) extends to key on the per-row
  uid class as well.
- Done-when: a header top row and a footer bottom row each behave independently, live-verified
  at 375 / 768 / 1440 on the canary.

**Phase 2:**
- Per-row **shrink** (row padding/height reduces on scroll).
- **Shrink-hides-a-chosen-element** (see must-fix 3 + 4).
- **Footer parity** falls out for free (same row block + engine).

**Per-row sticky** = its own mini-design (see must-fix 1 + 2) — it is the one hazardous effect
and must not be a naive toggle.

---

## 2. Must-fixes baked in (from the council — build these into the FRs)

1. ~~**Sticky ↔ hide-on-scroll conflict (real, live).**~~ **RESOLVED 2026-07-26 by REMOVING the
   conflict, not arbitrating it (D389/D392).** The mini-design rejected per-row `position:sticky`
   outright (short-parent trap: a row sticky inside a ~250px `<header>` unpins once scroll passes
   the header's height). With sticky HEADER-level and exactly one sticky element, there is no
   per-row sticky↔hide-on-scroll collision to make mutually exclusive — **so the "mutually
   exclusive" rule was struck, not built.** The combination is now the FEATURE: the header pins
   and the row COLLAPSES out of flow (height→0), because `transform` never reclaims space and
   translating would leave a gap the size of the hidden row. Shipped + live-verified (gap 0.00 at
   all three tiers). Canonical: Spec 37 FR-37-40.
   > ⚠ **Note on this must-fix's premise:** it said a transformed *ancestor* breaks sticky on
   > descendant rows. True — but research also established that a transformed **SIBLING** is
   > structurally irrelevant (containing-block computation walks ancestors only; CSSWG
   > w3c/csswg-drafts#3186). The real killer was the short-parent trap, which this must-fix did
   > not anticipate. What DID survive as a live guard: an ancestor with `overflow` other than
   > `visible`, or `transform`/`perspective`/`filter`, silently stops sticky — now detected and
   > warned about by `findStickyBreakingAncestor()` (advisory, never a gate).
2. ~~**Multiple sticky rows** → automatic offset chain + named z-index scale.~~ **STRUCK
   2026-07-26 — DO NOT BUILD (D389/D392).** Its premise died with must-fix 1: under a single
   header-level sticky element there are no sticky rows to chain, so the mechanism would be dead
   machinery. The research behind it (custom properties written by ResizeObserver, `borderBoxSize`
   not `contentRect`, write to `:root` never the observed element) is banked in the mini-design §D2
   for **Spec 18 Floating UI**, which genuinely needs bottom-edge stacking.
3. **"Hide a chosen element on shrink" — reference safely.** The chosen element is referenced by
   a **stable per-child id set at insert time**, never the editor's internal clientId (which
   changes on copy/paste). If the element is later deleted, shrink acts as if nothing was chosen —
   **no error**. An always-visible "reset shrink" action sits next to the control.
4. **Guardrail: never hide logo / primary-nav / cart.** Enforced via the framework's **DB role
   lookup** (the roles/slots tables), NOT a hardcoded block-name list (which would break the
   no-hardcoded-dictionaries rule). Enforced in the picker UI **and** a server-side backstop.
5. **Closed v1 effect set.** transparent, hide-on-scroll, shrink, sticky. **No "extensible /
   etc." placeholder** (the project forbids placeholder specs). If extensibility is wanted later,
   it becomes a data-driven table — its own separate decision.
6. **Per-row hover — demoted, not built in v1.** Hover belongs to links/buttons at the element
   level, where controls already exist; a per-*row* hover is low value on a header AND hover-scale
   is a `transform` that breaks a sticky row. Revisit only if a real need appears.
7. **Device-tier shape.** All new per-row attributes use the same device-tier object shape the
   rows already use (768 / 1024). No new flat suffixed attributes.
8. **Sticky headers must not cover in-page anchors.** ✅ **BUILT + LIVE-VERIFIED 2026-07-26
   (D391).** The publisher and the site-wide `scroll-padding-top` both already existed — but this
   must-fix turned out to describe a **LIVE BUG**, not a thing to add: both ran *unconditionally*,
   so a NON-sticky header reserved its full height (93px desktop / **252px mobile**) at the top of
   every programmatic scroll — anchors, fragment nav on load, find-in-page, every
   `scrollIntoView()`, keyboard focus scrolling and scroll-snap. **The publisher is now gated on
   the MEASURED computed position and publishes an explicit `0px` otherwise** (`var(--x, 0px)`
   fires its fallback only while the property is UNDEFINED, so the zero has to be written).
   W3C technique **C43** confirms `scroll-padding` is a *sufficient* technique for WCAG
   2.4.11/2.4.12 **including keyboard Tab focus** — so the CSS was correct and was left unchanged;
   the fix is JS-only.
9. **Clone-reproducibility.** The cloning converter must be able to detect + map per-row effects
   from a scraped draft — folded into the (deferred) header/footer cloning work, not built now.

---

## 3. Sequenced ahead of / alongside the plumbing (the real deal-winners)

The council converged that the things that actually win work are client-facing, not internal.
Queue these with (ideally ahead of) the per-row plumbing:

- **A. Operator-simplicity test** — can a non-coder set up a header in a few minutes without
  opening Advanced? The one usability gate, never run. Run it against today's build first; it
  will surface issues before the per-row surface grows.
- **B. "Preview scroll behaviour" button** — opens the live frontend pre-scrolled and at mobile
  width, so the client **sees** the sticky / shrunk / hidden / mobile result before publishing.
  The single biggest ticket-prevention and it is cheap.
- **C. Preset library** — ready-made styled header/footer designs to pick from (not blank
  starters). The picker mechanism already works; high-ROI, low cost.

---

## 4. Explicitly out of scope

- **Wrapper removal / block-private** — rejected (see §0). If a per-row effect ever proves
  genuinely impossible through the shared engine, the fix is to **add that capability to the
  engine** (the composite-mirror route), never to fork it.
- **The spacing-settings tidy-up (flat → object attribute shape on the containers)** — decoupled;
  separate, optional, low priority. The flat shape works; it is not part of this design.

---

## 5. Doc consequences (on execution)

- Amend Spec 37 §7 constraint 2 to record that header/footer **explicitly keep the shared
  wrapper**; block-private was considered + rejected 2026-07-25 (this doc), so it is not an open
  question.
- Add the per-row effect requirements to Spec 37 §3 / behaviours as new FRs with binary
  done-whens, carrying must-fixes 1–9.
- Log the decision in `decisions.md` (keep-the-wrapper; block-private rejected via adversarial
  council).
