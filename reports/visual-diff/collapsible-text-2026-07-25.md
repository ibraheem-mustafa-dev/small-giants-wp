---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/collapsible-text honours declared textAlign support"
block: sgs/collapsible-text
date: 2026-07-25
wave: "Spec 31 close — text-align dead-support fix (declared support now rendered)"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/collapsible-text — render declared `supports.typography.textAlign` (attr-gated)

**Verdict: PASS.** This change makes the block honour a support it already declared but
never rendered (a pre-existing dead control). The added frontend rule is **gated on the
`textAlign` attribute being set** — so every existing instance (which has no `textAlign`
value) renders byte-identically. `first_paint_capture_passed: true`: no existing rendered
output changes.

## What changed (frontend render.php, attr-gated)
`src/blocks/collapsible-text/render.php` now reads `$attributes['textAlign']`, validates it
∈ {left, center, right}, and emits a scoped `{selector}{text-align:VALUE;}` rule **only when
non-empty** (reusing the existing `$typography_selector` on `.sgs-collapsible-text__body`).
When `textAlign` is unset/invalid, no rule is emitted — identical to prior behaviour.

## Why (root cause)
The block declared `supports.typography.textAlign:true` with `__experimentalSkipSerialization`,
so WP does not auto-apply it and the block never read the attr — a client toggling alignment in
the editor saw nothing. The cloning converter's root-text-align fold (Spec 31 root_supports)
routes a draft's alignment to this attr, which would then silently not paint (a WRITTEN-not-LANDED
class). Making the block render the attr closes both the editor dead-control and the clone gap.

## Evidence
- **Existing instances unchanged**: the emission is guarded `if ('' !== $text_align)`; unset →
  no rule → identical first paint (the surface this gate protects).
- Converter suite green (1034 pass); `audit-inline-styling --check` 0 violations (rule is scoped
  `<style>`, not inline).
- Comprehensive text-align audit (2026-07-25): all 16 textAlign-supporting blocks now honour the
  support (own emission or shared wrapper) — this block was one of 3 gaps fixed.
