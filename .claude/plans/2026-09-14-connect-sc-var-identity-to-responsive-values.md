# Connect Piece 1 (sc-var identity) to Piece 2 (responsive values)

**Status:** SHIPPED, 2026-09-14 (D1061). Follows D1057/D1058 (Piece 1, Piece 2 shipped
standalone). The original text-containment-only design (below) was found broken against real
`sc-for` data during build and replaced with a structural+text dual strategy — see D1061 for
the full account. `sc_var_responsive_correlator.py` + tests shipped; verified end-to-end
against the real Ward End Eye Care draft (not just fixtures).

## What's missing

Piece 1 (`sc_var_classifier.py` + wiring) tags a boundary (a repeated-item section) with a
block-identity guess, keyed by its `sc-for` variable name. Piece 2
(`draft-responsive-probe.js`) measures individual rendered elements for which CSS properties
change across widths, keyed by normalised tag+text. Neither knows about the other today.

## Design (Bean-approved judgement call: strict matching only)

A new correlator joins them by CONTENT, since both derive from the same rendered page:

1. `per-section-convention-voter.py::build_boundary()` — when `sc_var_hint` fires, also store
   the raw normalisable text (`boundary["sc_var_text"] = text_snippet`) so the correlator has
   something to match against. One-line addition alongside the existing fingerprint block.
2. New `plugins/sgs-blocks/scripts/recogniser/sc_var_responsive_correlator.py` — reads a
   boundaries JSON (Piece 1 output) + a `draft-responsive-probe.js` report JSON (Piece 2
   output). Ports Piece 2's exact `norm()` function to Python (not re-invented — must match
   byte-for-byte or containment checks silently fail). For each Piece 2 element, tests whether
   its normalised text is contained within exactly one Piece 1 boundary's normalised text.
   **Strict mode:** zero or 2+ containing boundaries -> drop, count as unresolved. Never guess.
   Output: a list of `{boundary_id, sc_var_hint, element_key, changed_properties,
   values_by_width}` correlated records, plus `unresolved_count` for both sides.
3. Test file `test_sc_var_responsive_correlator.py` — self-test style (this pipeline's
   convention), including a negative control (an element whose text matches 2 boundaries ->
   must be dropped, not guessed).

## Explicitly NOT in this pass

- Route coverage beyond one already-loaded page (Piece 2's own named gap, unchanged).
- Piece 1 Tier B (Haiku classifier) — still scaffolded only.
- Wiring the correlated output into the actual converter attribute-writer — this pass produces
  the joined data artefact; consuming it in `converter/` is separate follow-up work.
