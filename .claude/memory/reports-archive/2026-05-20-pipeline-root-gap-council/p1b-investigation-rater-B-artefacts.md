# P1.B Regression — Rater B: Artefact + Log File Forensics

**Run dirs examined:**
| Run dir | Timestamp | Classification |
|---|---|---|
| `mamas-munches-homepage-2026-05-19-233712` | 23:37 UTC | Pre-P1.B baseline |
| `mamas-munches-homepage-2026-05-19-234547` | 23:45 UTC | Pre-P1.B (borderline, same bucket counts as baseline) |
| `mamas-munches-homepage-2026-05-19-235038` | 23:50 UTC | Post-P1.B+dedup (latest) |

P1.B commit: `05fb38a4` "feat(pipeline): replace Stage 0.7 verbatim CSS dump with Spec 16 §FR6 four-destination router" — timestamped 2026-05-20 00:44 BST (= 2026-05-19 23:44 UTC).

---

## 1. Bucket Count Deltas Pre/Post-P1.B

| Bucket | Pre-P1.B (234547) | Post-P1.B (235038) | Delta |
|---|---|---|---|
| unrecognised_class | 0 | 0 | 0 |
| unrecognised_section | 2 | 2 | 0 |
| extraction_failed | 1108 | 1110 | **+2** |
| animation_unclassified | 0 | 0 | 0 |
| structural_mismatch_or_orphan | 0 | 0 | 0 |
| chrome_skipped | 0 | 0 | 0 |
| cv2_handled_no_top_level_match | 3 | 3 | 0 |
| **TOTAL** | **1113** | **1115** | **+2** |

The +2 delta (one each in `header` and `footer`) is negligible — header/footer are structural gaps unrelated to pixel-diff. `extraction_failed` at 1110 is identical to the pre-P1.B run at 233712.

**Finding: bucket counts are not the regression signal.** The regression is invisible at the bucket layer — it lives in the CSS output file, not the leftover classifier.

---

## 2. Brand + Social-Proof + Hero Attr Deltas at 1440px

All three target sections show **zero attribute change** between runs:

| Section | Pre attrs | Post attrs | variation_css_rules | block_markup len |
|---|---|---|---|---|
| hero | 62 | 62 | 0 → 0 | 1388 → 1388 |
| brand | 79 | 79 | 8 → 8 | 2831 → 2831 |
| social-proof | 34 | 34 | 11 → 11 | 2474 → 2474 |

`extract.json` `extracted_attributes`, `block_markup`, `variation_css`, and `status` are byte-for-byte identical pre and post. The stage_4 `variation_css_rules` counts in `trace.jsonl` are also identical.

**Finding: the regression is NOT in extraction, conversion, or block markup generation.** The pipeline upstream of CSS output is unaffected.

---

## 3. @media Query Routing Analysis — THE ROOT CAUSE

**mamas-munches.css** (post-P1.B, 175 lines, generated `2026-05-19T23:50:39`):

| Breakpoint | @media rule count |
|---|---|
| 768px | 21 |
| 640px | 4 |
| 600px | 3 |
| 1024px | 3 |
| 1280px | 2 |
| prefers-reduced-motion | 1 |
| **TOTAL** | **34** |

**Critical finding: all 33 responsive @media rules (excluding prefers-reduced-motion) are emitted without `.page-id-144` scope.** Zero of 33 include the D2 page-scope prefix.

The 111 base D2 rules ARE correctly scoped (e.g. `.page-id-144 .sgs-hero{ ... }`).

### Specificity conflict table

Every section where a D2 base rule and a responsive @media rule target the same CSS property:

| Section | Base D2 rule (wins) | @media override (loses) | Broken property |
|---|---|---|---|
| hero L56 vs L65 | `.page-id-144 .sgs-hero { grid-template-columns: 1fr }` (0,2,0) | `@media 768px { .sgs-hero { grid-template-columns: 1fr 1fr } }` (0,1,0) | hero stays single-column at all breakpoints |
| hero L69 vs L69 | `.page-id-144 .sgs-hero__content { padding: 28px 20px 40px }` (0,2,0) | `@media 768px { .sgs-hero__content { padding: 56px 48px } }` (0,1,0) | padding never expands |
| hero L62 vs L70 | `.page-id-144 .sgs-hero__content h1 { font-size: 34px }` (0,2,0) | `@media 768px { .sgs-hero__content h1 { font-size: 52px } }` (0,1,0) | h1 stays 34px at 1440px |
| brand L107 vs L111 | `.page-id-144 .sgs-brand { grid-template-columns: 1fr }` (0,2,0) | `@media 768px { .sgs-brand { grid-template-columns: 1fr 1fr } }` (0,1,0) | brand stays single-column |
| social-proof L150 vs L155 | `.page-id-144 .sgs-testimonial-slider { grid-template-columns: 1fr }` (0,2,0) | `@media 640px { .sgs-testimonial-slider { grid-template-columns: repeat(3,1fr) } }` (0,1,0) | testimonials stay single-column |
| trust-bar L76 vs L83 | `.page-id-144 .sgs-trust-bar__inner { grid-template-columns: 1fr 1fr }` (0,2,0) | `@media 600px { .sgs-trust-bar__inner { grid-template-columns: repeat(4,1fr) } }` (0,1,0) | trust-bar stays 2-col |
| footer L159 vs L173 | `.page-id-144 .sgs-footer__grid { grid-template-columns: 1fr }` (0,2,0) | `@media 768px { .sgs-footer__grid { grid-template-columns: 2fr 1fr 1fr } }` (0,1,0) | footer stays single-column |

The pre-P1.B CSS (Stage 0.7 verbatim dump, 717 lines) wrote all rules unscoped — both base and @media rules had equal specificity. The responsive overrides worked. After P1.B, base rules gained a `.page-id-144` prefix (+1 specificity class), but @media rules did not. Every responsive layout is now overridden by the scoped base rule.

---

## 4. Root Cause: `css_router.py` L648

File: `plugins/sgs-blocks/scripts/orchestrator/css_router.py`  
Function: `write_variation_css()` (L603–L661 in commit `05fb38a4`)

```python
# L648
if scope_prefix and not rule.startswith("@"):
    # Prepend .page-id-N to selector
    brace_idx = rule.index("{")
    sel = rule[:brace_idx].strip()
    body = rule[brace_idx:]
    parts.append(f"{scope_prefix}{sel}{body}\n")
else:
    # @media rules fall here — emitted UNSCOPED
    parts.append(f"{rule}\n")
```

The `not rule.startswith("@")` guard was designed to avoid naively prepending `.page-id-144` to `@media (min-width: 768px)` — which would produce invalid CSS. But the fix only excluded @media rules from scoping entirely. The correct approach is to inject the scope prefix inside the @media rule, onto the inner selector.

**css-d1-assignments.json is schema-valid** — 9 block entries, non-empty for `sgs/button` (4 assignments), `sgs/hero` (3), `sgs/feature-grid` (1), `sgs/announcement-bar` (2). No misrouted brand/social-proof assignments. The D1 router is functioning correctly — the bug is isolated to D2 @media emission.

---

## 5. Top 5 Findings Ranked by Pixel-Diff Impact

**#1 — @media rules in D2 are unscoped, losing specificity to D2 base rules (impact: HIGH)**  
`css_router.py` L648: `not rule.startswith("@")` guard emits all 33 responsive @media rules without `.page-id-144` scope. Base rules have specificity 0,2,0; @media rules have 0,1,0. Every layout-defining @media override (grid-template-columns, min-height, font-size, padding) is silenced at all breakpoints on page-id-144.  
Fix: wrap inner selectors inside @media blocks with the scope prefix, e.g. `@media (...) { .page-id-144 .sgs-hero { ... } }`.

**#2 — Hero grid-template-columns stays 1fr at 1440px (impact: HIGH)**  
CSS L56 base rule `.page-id-144 .sgs-hero { grid-template-columns: 1fr }` overrides L65 `@media 768px { .sgs-hero { grid-template-columns: 1fr 1fr } }`. Desktop hero renders as a single stacked column rather than 50/50 split-image layout. This accounts for the largest 1440px pixel-diff.

**#3 — Hero h1 stays 34px at 1440px (impact: HIGH)**  
CSS L62 base rule `.page-id-144 .sgs-hero__content h1 { font-size: 34px }` overrides L70 `@media 768px { .sgs-hero__content h1 { font-size: 52px } }` and L74 `@media 1280px { ... font-size: 58px }`. Desktop heading is 41% smaller than mockup.

**#4 — Brand and testimonial sections stay single-column at 1440px (impact: MEDIUM)**  
CSS L107 `.page-id-144 .sgs-brand { grid-template-columns: 1fr }` blocks L111 `@media 768px { .sgs-brand { grid-template-columns: 1fr 1fr } }`. CSS L150 `.page-id-144 .sgs-testimonial-slider { grid-template-columns: 1fr }` blocks L155 `@media 640px { ... grid-template-columns: repeat(3,1fr) }`.

**#5 — Bucket counts are stable; no new extraction gaps introduced by P1.B (impact: confirms scope)**  
extraction_failed delta is only +2 (header + footer structural gaps, pre-existing). The regression is 100% in CSS output layer post-extraction. All stage_4 `variation_css_rules` counts are identical pre/post. The pipeline correctly extracted and converted — only the CSS writer's scoping logic is broken.

---

## Summary

Pre-P1.B verbatim CSS dump (Stage 0.7) emitted 717 lines with all rules unscoped — responsive @media overrides worked because specificity was flat. Post-P1.B `css_router.py` correctly scoped 111 D2 base rules to `.page-id-144` but left all 33 responsive @media rules unscoped. The resulting specificity gap (0,2,0 vs 0,1,0) silences every responsive layout override at desktop breakpoints. No other pipeline stage changed. Fix is surgical: `css_router.py` L648 needs to inject scope inside @media blocks rather than skipping them.
