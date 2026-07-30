---
doc_type: report
title: "FR-32 residual inline sites — two dynamic builds the literal grep cannot see"
project: small-giants-wp
date: 2026-07-30
status: OPEN — named residual, not fixed this session
spec: 32-COMPONENT-STYLING-TOKEN-CONTRACT (FR-32-1, FR-32-4 as amended D345)
---

# Two residual inline-style sites in the shared container wrapper

## Why this exists

The 2026-07-30 FR-32 sweep fixed 14 inline sites. Two more were then found by widening the
search pattern, and are recorded here rather than fixed — a shared-wrapper change at the end of a
long session, without its own verification pass, is exactly the shape this programme exists to stop
(STOP-19). Deferred-not-dropped per STOP-29.

## The detection lesson (this is the important part)

Every sweep so far searched for the **literal** string `style="--`. That pattern cannot see an
attribute assembled at runtime:

```php
' style="' . esc_attr( implode( ';', $decls ) ) . '"'
```

This is precisely how `sgs/trust-bar` escaped detection. On 2026-07-30 the block's fix was verified
live and reported as complete, then an independent check found the deployed page still emitting the
inline attribute — because the emit site was a `sprintf( ' style="--sgs-trust-badge-icon-fill:%s"' )`
built at render time, which the verification grep never matched.

**Rule:** an inline-style sweep must search for attribute ASSEMBLY (`' style="'`, `sprintf`,
`style=\"`), not only for literal `style="` in markup strings. A grep's blind spot is not evidence
of absence — it is the shape of the grep.

## The two sites

| # | Location | Emits | Why it survived |
|---|---|---|---|
| 1 | `includes/class-sgs-container-wrapper.php:1800` | `style="{base gap + --sgs-gi-* custom properties}"` on `.sgs-container__inner` | Its own comment (`:1793-1798`) declares the remaining decls "inline-safe" |
| 2 | `includes/class-sgs-container-wrapper.php:1828` | `style="{$inner_style_parts}"` on `.sgs-container__inner` | Same reasoning, mirrored branch |

**Both comments reason under the PRE-D345 contract** — that a custom-property VALUE is not a
property declaration and is therefore permitted inline. FR-32-4 as amended (2026-07-18, D345)
forbids exactly that, and FR-32-1's done-when is "no `style` attribute at all … neither a property
declaration NOR a custom-property value NOR an empty `style=""`".

This is the **fourth** instance of the same stale-comment pattern in one sweep — `cta-section:333`,
`countdown-timer`, `class-post-grid-rest.php:323`, and now these two. In every case a comment
written under the old contract vouched for the emit and stopped re-investigation. **A comment that
justifies a breach is not evidence; it is a dated opinion.**

## Blast radius + why they were not fixed today

`.sgs-container__inner` belongs to the SHARED wrapper — every composite with a content band routes
through it. A change here is a Rule-7 design-gate surface.

Measured mitigation: on the 2026-07-30 gate-canary (page 2064) these paths did **not** fire — the
live DOM carried six inline `[style]` attributes and none was `.sgs-container__inner`. Both sites
are gated behind `$grid_on_inner && $inner_grid_decls` (site 1) and `$inner_style_parts` (site 2),
so they are conditional, not universal.

⚠ That is a measurement on ONE page, not proof they are dead. Do not treat "did not fire here" as
"never fires".

## What closing them requires

1. Determine on a real page set when `$grid_on_inner && $inner_grid_decls` is non-empty.
2. Route the `--sgs-gi-*` per-grid-item values to the FR-32-4a positional shape (they vary per item,
   so a single root-scoped rule cannot carry them) — and honour FR-32-4a's positional-integrity
   requirement: the items must be the sole element children of their parent, or the offset must be
   derived.
3. Route the base gap to the existing `.{uid}` scoped rule.
4. Re-verify on the live DOM, both surfaces, plus the editor (D388).

## Related

- Spec 32 FR-32-4a (added 2026-07-30) — the positional per-item shape and its integrity requirement.
- `P-NO-INLINE-GATE-COVERAGE-GAPS` — the gate's canary coverage gaps.
- The gate itself (`no-inline/check-no-inline.py`) scans RENDERED pages, so it would catch these
  when a page exercises them — its blind spot is coverage, not pattern.
