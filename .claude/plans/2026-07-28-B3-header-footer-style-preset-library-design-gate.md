---
doc_type: design-gate
topic: B3 — header/footer style-preset library
date: 2026-07-28
status: AWAITING BEAN SIGN-OFF — nothing built
governs: amends Spec 37 FR-37-8 (starter library) + FR-37-28 (presets are permitted); no Spec 36 change
decisions_taken: Bean, 2026-07-28 — (1) a preset changes EVERYTHING, "exactly what a pattern
  selector would give them"; (2) 8+ presets, a fuller library; (3) header AND footer, but each with
  its OWN presets — no combined site-wide preset
research: 4-source competitor sweep 2026-07-28 (Kadence · Astra · Elementor · GeneratePress ·
  Blocksy · Spectra · WP core block style variations), cited inline in §2
---

# B3 — Header/Footer Style-Preset Library — Design Gate

## 0. Plain English (read this first)

**What this is.** A library of ready-made header and footer *designs* a client picks in one click —
not blank shells they then have to style.

**Why it matters.** The starter library gives a client the right STRUCTURE. Nothing yet gives them a
good LOOK. This is the thing that makes an SGS site feel designed rather than assembled, and it is
the highest client-facing return left on this track.

**The finding that changes the shape of the job.** I expected to build a new inspector control. I
went and read the seven header starters that already ship, and the mechanism is not the gap — the
LIBRARY is. `header-full.php` already sets a background colour, a coloured top bar, padding, a
bottom rule, sticky and hide-on-scroll. So the picker already delivers "what a pattern selector
gives them". What it does NOT deliver is **variety**: every existing starter paints `surface` behind
`primary`, so on any given site all seven look like the same header with the parts moved around.
There is no dark header, no bold high-contrast header, no editorial header, no dense header.

**So B3 is an AUTHORING job, not a mechanism job.** That is much cheaper and much lower-risk than
building a control, and it is what the parent design gate predicted: *"the picker mechanism already
works; high-ROI, low cost"* (`2026-07-25-header-footer-per-row-identity-design-gate.md` §3.C).

---

## 1. The decision being gated

**Build 8 styled HEADER patterns and 8 styled FOOTER patterns, delivered through the native
"Choose a pattern" modal that is already live (FR-37-7), each a git-versioned file under
`theme/sgs-theme/patterns/` (FR-37-8).**

No new block, no new attribute, no new admin UI, no new React component.

### 1.1 Why the existing picker and not an inspector control

| | Native picker (chosen) | Inspector "style preset" control (rejected) |
|---|---|---|
| Can change structure | **Yes** — it writes a whole block tree | No — it would have to `replaceBlocks`, destroying the operator's content |
| Mechanism cost | **Zero** — live + verified (D377, re-verified D393) | A new control, a new derivation, a new live-verify cycle |
| Risk | Applies only to an EMPTY post | Rewriting a populated block tree is exactly the D393 failure class |
| Matches the ask | **Yes** — Bean: *"exactly what a pattern selector would give them"* | Only if it also moved things, which is the destructive part |

Bean's answer — *a preset changes everything* — is only safely deliverable at **create time**. A
control that restyles AND restructures a header someone has already built is a tree rewrite, and
D393 is the record of what a silent tree rewrite costs. The picker has no such problem: the post is
empty by definition.

### 1.2 How a client changes their mind later (no new mechanism needed)

The native modal fires only on a NEW post, so a client cannot re-open the gallery on a header they
have already built. **That is fine, and the CPT model already answers it:** create a *second* header
post, pick a different look, **preview it on the real site without publishing** (FR-37-41, shipped
2026-07-27), then press Set as active. Nothing is ever overwritten, and the old header stays
re-activatable.

This is worth saying out loud in the picker's own copy, so an operator knows the door is not shut.

### 1.3 One thing NOT built, stated rather than hidden

There is **no "restyle this existing header in place"** path, and this design deliberately does not
add one. If Bean wants it later it is its own decision with its own gate, because it is a tree
rewrite. Recorded here so it is a choice, not an oversight (STOP-29).

---

## 2. What the research says a preset should be (and where we deviate)

Sources swept 2026-07-28. The honest summary:

- **Nobody ships a "look-only" header preset.** Astra's Header Presets, Kadence's Advanced Header
  layout picker, GenerateBlocks' 15 site-header patterns and Spectra's block Presets are all
  **structure/layout** pickers. Colour and type are handled separately, as a site-wide layer
  (Elementor Global Colors/Fonts; Spectra Global Styles; WP style variations).
- **WP core's block style variations** (6.6+, `theme.json` `styles.blocks.*.variations`) are the
  platform-native look mechanism — but they **cannot change structure**, so they cannot satisfy
  "everything". Noted and set aside for that reason, not overlooked.
- **Adjective naming is the convention for a look** (Spectra's real set: *Modern SaaS, Minimal
  Clean, Bold Creative, Editorial Premium, Startup Fresh, Warm Organic*); numbered/structural naming
  is for layout.
- **Documented failure mode:** Spectra's own cascade is *Block Settings > Global Styles*, so a
  preset silently fails to show on a block the operator already customised. **Our picker cannot hit
  this** — it writes real attributes into an empty post, so there is nothing to lose a fight with.

**Where we deviate, deliberately:** every product splits look from structure; we are combining them,
because Bean asked for a preset to be a complete design and because our delivery vehicle (a pattern
into an empty post) is the one place combining them is safe.

---

## 3. The roster — 8 headers, 8 footers

Named by adjective, per the convention. Each is a DISTINCT visual identity, not a rearrangement.
**Header and footer presets are independent** (Bean: *"both but they don't have combined presets"*)
— a client may pair any header look with any footer look.

### 3.1 Headers

| # | Name | Colour band | Density | Behaviour | Distinguishing move |
|---|---|---|---|---|---|
| 1 | **Ink** | `text` band, `surface` nav | tight | sticky + shrink | Near-black bar, white nav. The confident default. |
| 2 | **Editorial** | `surface`, thin `border-subtle` bottom rule | generous | sticky | Centred logo above a centred nav; the most "designed" |
| 3 | **Bold** | `accent` band, `accent-text` | chunky | sticky + shrink | High-contrast accent bar, pill nav hover |
| 4 | **Quiet** | `surface-alt`, `text-muted` nav | minimal | sticky | Restrained; underline-on-hover only |
| 5 | **Utility** | `primary-dark` thin top strip + `surface` main | standard | sticky, top row hides on scroll | Classic commerce: contact strip over logo+nav+cart |
| 6 | **Overlay** | transparent → `surface` on scroll | generous | transparent + sticky + `contrastSafe` | Sits over a hero image; the scrim guarantees contrast |
| 7 | **Compact** | `surface`, `border-light` rule | dense, small logo | sticky + hide-on-scroll | For content-heavy sites; reclaims vertical space |
| 8 | **Warm** | `accent-light`, `text` | generous | sticky | Split layout with a prominent CTA at the right |

### 3.2 Footers

| # | Name | Colour band | Structure | Distinguishing move |
|---|---|---|---|---|
| 1 | **Ink** | `text` | 4 columns + bottom bar | Near-black, matches header Ink |
| 2 | **Editorial** | `surface`, top rule | centred single column | Logo, one line, policy links |
| 3 | **Bold** | `accent` | 3 columns + strong CTA row | Accent band with a newsletter/CTA top row |
| 4 | **Quiet** | `surface-alt` | 2 columns | Almost nothing but contact + copyright |
| 5 | **Utility** | `primary-dark` | 4 columns + payment/trust bottom bar | Commerce-shaped |
| 6 | **Directory** | `footer-bg` | 5 columns, dense links | Link-heavy, for larger sites |
| 7 | **Compact** | `surface` | single bottom bar only | One strip: copyright, socials, policy |
| 8 | **Warm** | `accent-light` | 3 columns, generous | Soft, brand-forward |

---

## 4. Binding rules the build must follow

1. **Tokens only, never literals.** Every colour is a `theme.json` palette slug
   (`primary`/`accent`/`text`/`surface-alt`/`footer-bg`…), every space a spacing preset. A hardcoded
   hex would make the preset look wrong on every client but one (R-31-1, §3.9 no client data).
   *Verified available:* 16 palette slugs, 7 font sizes, 8 spacing steps, 4 font families.
2. **Every attribute must be DECLARED on the block, or WP silently discards it** (D338). Gate:
   `python scripts/check-dead-pattern-attrs.py` — must pass before commit. *Confirmed available:*
   `site-header` has no `typography` support, so per-preset type differences live on the child
   elements (`sgs/business-info` and `sgs/heading` both declare `fontSize`/`fontFamily`), not the
   container. Density is therefore carried by **padding + logo width + font size on children**.
3. **Every header pattern ships an `sgs/nav-drawer` as a SIBLING** of `sgs/site-header`, as all
   seven existing ones do. (The `sgs/nav-menu` notice shipped this session catches a missing one,
   but a starter must never rely on the safety net.)
4. **New footer link lists use `sgs/icon-list` menu-bound**, not `core/list` with `#` hrefs
   (FR-36-26c / D374) — so a client's footer links come from a real WP menu they can edit once.
   > **Separate finding, NOT fixed here:** `footer-columns.php` and its siblings still use
   > `core/list` with dead `#` links. Pre-dates D374. Recorded for a follow-up rather than
   > swept into this work.
5. **Theme `style.css` `Version` MUST be bumped** — WP caches the pattern-file list against it, so
   16 new patterns without a bump are complete, deployed and **uninsertable**
   (STOP-NEW-PATTERN-FILES-NEED-A-THEME-VERSION-BUMP; this exact failure shipped on 2026-07-27).
   Verify after deploy by querying `wp/v2/block-patterns/patterns`, never by assuming.
6. **Contrast is verified, not asserted.** Every preset's text-on-band pairing measured against
   WCAG 2.1 AA on **every client palette**, not one (STOP-VERIFY-EVERY-CLIENT — the token NAME is
   not a luminance: `primary-dark` is a *pink* on mamas-munches). Any pairing that fails is
   redesigned, not shipped with a caveat.
7. **Presets must survive insertion.** Re-run the 16-starter corruption probe (the one that returned
   `corrupted: 0` this session) extended to all 32 patterns. This is the D393 regression guard, and
   it is cheap.
8. **No border-width-named custom property in an inline `style`** — WP core's
   `[style*="border-width"]` substring selector paints a phantom border
   (STOP-WP-STYLE-SUBSTRING-COLLISION). Scoped `<style>` output is safe, which is what Spec 32
   already mandates.

---

## 5. Acceptance (binary, measured on the canary)

- All 16 new patterns register: `wp/v2/block-patterns/patterns` returns them after the version bump.
- Creating a new `sgs_header` / `sgs_footer` shows them in the native modal with previews.
- Choosing each one writes THAT design's tree to the saved `post_content` — **verified by reading
  the saved children, not `metadata.patternName`** (the D377 trap D393 exposed).
- `corrupted: 0` across all 32 patterns on the insertion probe.
- `check-dead-pattern-attrs.py` passes: zero silently-discarded attributes.
- Contrast: every band/text pairing ≥ AA on all client palettes.
- **Bean's eye (R-31-13)** — the presets look designed. Measurement alone does not close this one;
  this is a visual deliverable and the eye is co-authoritative.

---

## 6. Cost and sequencing

Authoring is mechanical once this roster is signed off. Realistic: **~5 min per pattern file**
including its insertion check, so ~80 min for 16, plus ~30 min for the version bump, deploy,
registration check and the contrast sweep.

**Recommended sequencing (Bean's call):** ship **Ink, Editorial and Bold** for header and footer
first — the three widest-apart looks — deploy, and put them in front of Bean's eye BEFORE authoring
the remaining five pairs. If the visual direction is wrong, that is 6 files to redo instead of 16.
The alternative (author all 16, then review) is fine if Bean would rather see the whole library at
once; it just costs more if the direction misses.

---

## 7. Open question for sign-off

1. **Roster names and looks (§3)** — sign off as-is, or swap any of the 16 for something else?
2. **Sequencing (§6)** — three pairs first for an eye-check, or all eight pairs then review?
3. **Do the existing 7 header / 7 footer starters stay?** They would sit alongside the new ones,
   making ~15 cards in the modal. Options: (a) keep both sets (most choice, busiest modal);
   (b) retire the existing structural ones now that every new preset carries a structure anyway;
   (c) keep only "Start from scratch" plus the new eight. **Recommendation: (c)** — the new roster
   covers every structure the old ones did, and a 9-card modal is a library rather than a list.
