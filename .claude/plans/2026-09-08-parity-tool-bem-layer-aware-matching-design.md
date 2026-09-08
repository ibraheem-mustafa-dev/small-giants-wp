# computed-parity.js — BEM layer-aware collision resolution (design)

**Status:** Approved by Bean 2026-09-08, ready for build.
**Owning file:** `plugins/sgs-blocks/scripts/parity/computed-parity.js`
**Context:** Clone-fidelity programme, Phase 1 (fix the parity tool). Follows the qc-council
run that validated a purely statistical "keep all candidates, best match wins" fix for the
`boxElsRaw` text-collision bug (see the council's Stage 6 experiment in the session that
produced this doc). Bean asked whether the fix could instead use the same layer knowledge the
CONVERTER already has, rather than guessing statistically — this doc is that design.

## Problem (recap, plain English)

The parity tool matches draft elements to clone elements by their visible text. When several
nested elements share identical text — e.g. a wrapper `<section>` whose sole child is an
`<div class="…__inner">` holding 100% of the text — the tool can only keep ONE of them per
text key. It currently keeps the deepest. That silently discards whichever element the LOST
candidate actually painted (proven live: a real `border-top:1px` on the outer `<section>`
vanishes because the tool keeps the borderless `__inner` div instead).

## Root architectural fact (verified this session)

Every composite block that mirrors `sgs/container` (hero, trust-bar, cta-section, container
itself, plus block-private composites like form/modal/post-grid) renders its "layer 2" content
band as a child element named `sgs-<own-block-name>__inner` — e.g. `sgs-container__inner`,
`sgs-form__inner`, `sgs-modal__inner`, `sgs-post-grid__inner`. Confirmed via grep across
`plugins/sgs-blocks/includes/class-sgs-container-wrapper.php` and each block's own
`render.php`. This is NOT one shared literal string — each block names its own inner layer
after itself, per this project's standard `sgs-<block>__<element>--<modifier>` BEM convention
(Spec 00 §3.1).

The general, no-hardcoded-list version of the signal: **a collision candidate is a structural
sub-layer of an ancestor candidate (not an independently authored block) when its own BEM
`<block>` token matches the ancestor's BEM `<block>` token.** A genuinely nested block (someone
deliberately placing a real `sgs/container` inside an `sgs/hero`) has a DIFFERENT block token
in its own root class and is correctly NOT treated as a sub-layer.

## Design

Three-tier resolution order for a `boxElsRaw` collision:

1. **BEM same-family match (new, deterministic).** Parse every candidate's class list with a
   small JS port of the `sgs-<block>__<element>--<modifier>` pattern (mirrors
   `db_lookup.parse_sgs_bem()`'s regex — Spec 00 §3.1 — re-implemented in-browser since
   `CAPTURE_SRC` runs in the page context with no Python access). If a descendant candidate's
   `block` token equals an ancestor candidate's `block` token, they are the SAME component's
   own layers, not competing boxes:
   - The ancestor (outer) is kept as the record for border/background/section-level box
     properties.
   - The descendant (`__<element>`) is kept as the record for content-width/band-level
     properties (max-width, margin-auto centring, band padding).
   - Both survive as separate `boxEls` entries (keyed distinctly, not collapsed to one) so
     BOTH get scored on their own real properties — nothing is silently dropped on either
     side.
2. **Statistical fallback (the qc-council-validated fix, unchanged).** When no BEM
   same-family relationship is found among the colliding candidates, keep every candidate,
   compare the draft record against each, and keep whichever pairing has the fewest
   mismatches.
3. **Last resort.** If the fallback still can't discriminate (a genuine tie), keep today's
   deepest-wins behaviour — not a regression, since that's the current behaviour for every
   case already.

## Why this over a pure statistical fix

- Deterministic where the architecture is known — no risk of the best-match heuristic
  picking wrong on an untested shape (the council already falsified one heuristic that looked
  plausible and picked the wrong element on the real footer case).
- Correctly distinguishes a genuine nested container block from an auto-generated layer —
  something no amount of text/property matching can know, because it's a question about
  authorial intent, not computed style.
- Both layers get scored, not just the "winner" — closes the open question from the qc-council
  report about whether a losing candidate's own properties should still count.

## Build scope

Single file: `plugins/sgs-blocks/scripts/parity/computed-parity.js`.
- Add a small BEM parser inside `CAPTURE_SRC` (regex port, no new dependency).
- Change the `boxElsRaw` collision branch: on a same-family match, keep BOTH candidates under
  distinct keys instead of collapsing to one. On no match, switch from unconditional
  overwrite to array-of-candidates (per the qc-council Stage 6 experiment already written).
- Update the box-comparison consumer (`runTier`'s box branch) to try multiple candidates per
  key and keep the best match, per the same experiment.

## Verification

Re-run `computed-parity.js` against page 2742 pre/post:
- Announcement-bar + Trustpilot-bar `border-top-width`: must report the true 1px (currently
  false 0px).
- Footer-row `display`/`justify-content`: must stay correctly matched (no regression) AND the
  footer-row's own border (if any) should now also score correctly rather than being silently
  dropped.
- Spot-check one page with NO composite-wrapper collisions at all to confirm the fallback path
  still produces identical output to before this change (no behaviour change where the BEM
  rule doesn't apply).
