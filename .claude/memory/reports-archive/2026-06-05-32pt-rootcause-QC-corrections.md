---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "QC verdict + corrections for the 32-point root-cause report (read alongside part1/2/3)"
created: 2026-06-05
---

# QC corrections — read BEFORE acting on the 32-point root-cause reports

Multi-agent QC (2026-06-05) over the Task-A 3-part report + the Task-B methodology doc.

## Task A — coverage + claim-validity: GRADE B+

- **Coverage: 32/32** points present with a root cause + DOC-vs-IMPL verdict across part1/2/3 (incl. sub-points 11a-e, 12A-D).
- **Spot-checked load-bearing claims against the code — CONFIRMED:**
  1. `convert.py:2901` exception-3 wrap guard (`if is_top_level and slug != "sgs/container":`) has NO mirror-composite exemption; `_is_container_mirror_block()` exists (line 874) but is only called in the A2 lift path (line 2669). Fix `and not _is_container_mirror_block(slug)` is accurate. (Bean #1/#2/#4 — the double-container.)
  2. `#9` primary-button: `_root_lift_rules()` includes `background-color`→`style.color.background`; `sgs/button` has `supports.color.background:true`, so `_lift_root_supports_to_style` (~line 2659) lifts it onto the button WRAPPER div → paints it. (All primary buttons; #23 same cause.)
  3. `#10/#11` product cards: both emits are `wp:sgs/product-card {"sourceMode":"bound"}` with NO `productId` → productId=0 → empty-state render. CONFIRMED in run-103529 extract.patched.json.
  4. `#18` notice-banner: render.php (FR-22-6) no longer reads scalar `text` (line 28-29) — only `$content` InnerBlocks (line 105); self-closing emit + no `showIcon` → empty banner. CONFIRMED.

## ⚠ MATERIAL CORRECTION — Part 3 "Family A" mechanism (affects 11 points: 13,14,16,19,20,22,24,27,28,30 + the #6/#12A heading family)

The part-3 report calls the dominant cause **"class-level CSS not extracted / converter extracts inline-style only."** **That is overstated/wrong.** `_collect_css_decls_for_element` (convert.py ~541-652) DOES match class-scoped rules — inline style, direct-class selectors, parent-qualified selectors, and grouped selectors — when the rule's last token matches one of the element's OWN classes (line ~602).

**The real gap is: CSS INHERITANCE is not simulated.** A rule on an ANCESTOR (e.g. `.sgs-ingredients-section__inner { text-align:center }`) whose property is an *inheritable* CSS property (`text-align`, `color`, `font-family/size/weight/style`, `line-height`, `letter-spacing`) visually cascades to child elements — but the converter only collects rules targeting the element's own classes, so the inherited value never reaches the child block's attrs.

**Corrected fix-shape (use THIS, not the report's):** when walking a child element, ALSO collect rules whose selector targets an ANCESTOR element, but ONLY for inheritable properties, and apply them as the child's attr unless the child has its own overriding rule. This is **ancestor-inheritance simulation**, NOT "add class-level extraction" (which already exists). Acting on the report's wording risks writing redundant code + missing the actual gap.

(Note: this is the same family as the typography descendant-collector fix shipped `642cad61` — that fix added descendant/ancestor-qualified matching for typography on leaf headings; generalise it to all inheritable properties + all child elements, which is the proper universal fix.)

## Task B — methodology: GRADE B-, GO WITH AMENDMENTS

The 6 amendments are already folded into `2026-06-05-taskB-clone-verification-methodology.md` (structural-path fallback + `wp-block-*` skip; font-load verification; image-404 guard; element-count-by-role diff; concrete ΔE thresholds; +vertical-align/text-decoration/font-variant). Build the AMENDED version (~90% coverage), not the as-first-specified one. Residual misses + golden-master mode documented there.

## Doc-vs-impl summary (from the 3 reports, QC-confirmed)
Overwhelmingly **IMPLEMENTATION** faults (spec §FR-22-21/§FR-22-5 correctly mandates faithful transfer; the converter doesn't deliver: inheritance sim, wrap-gate exemption, productId emission, multi-card slot extraction, missing lift mappings, button-wrapper paint). **Not-a-fault:** #7 (unverified perception), #12B (the draft's own muted colour). **Block-capability gaps (not pipeline):** #12C ghost preset missing, #32 slider/author-image toggles (feasible — `displayMode` + `showAuthorImage` attrs). **DOC-clarity gap:** content-synthesis clause for non-container content blocks (announcement-bar #26 `messages` array; notice-banner contract).
