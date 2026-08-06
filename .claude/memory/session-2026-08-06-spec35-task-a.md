---
doc_type: session
project: small-giants-wp
date: 2026-08-06
track: 1b (Spec 35) — Task A
---

# Session 2026-08-06 (PM) — Spec 35 Task A: pool 23 → 13

Swept from `LEDGER.md` (byte cap). The LEDGER keeps status; this file keeps the narrative.

## Headline

Eligible pool **23 → 13**. Three commits, each measured against a declared expectation and a
hash-verified DB backup: `0ecdbbd2` (A1+A3), `32b4fbd7` (A4 part), `e1402858` (A6).

## Four ledger claims measured FALSE

1. **"A1 reseed closes 7 rows."** No. The fingerprint shells D1 fresh every run, so the
   shared-include rows (`d5766eff`) were ALREADY visible to it. A reseed alone changed nothing.
2. **"`value-fragment` blocks `technical`."** No — the role's own contract reads *"each verdict
   NOT-content **or value-fragment**"*. `value-fragment` was never a disqualifier; the classifier
   was manufacturing one in place of a veto.
3. **"A5: role seeded, just confirm."** No. `link-content` is on ZERO rows and no row anywhere
   carries `link_template`. A5 is a build.
4. **"A2 = 3 enums."** Two of the named three were wrong targets, and two rows listed under A4
   were the real enum candidates.

## A1 + A3 — the real root cause (`0ecdbbd2`)

`classify_detector1.py` tested `fragment` BEFORE the func dispatch (main path :415, self-test
:321), so it overrode every downstream verdict — including the explicit `NOT-content` rule at
:187-192 that fires when a value lands in a `name=`/`id=`/`for=` HTML attribute.

The 7 blocks `sgs/form-field-{date,email,number,phone,select,text,textarea}` delegate their whole
render to `includes/forms/field-render-helpers.php`, which builds the submission key by
concatenation (`'sgs-field-' . sanitize_key($field_name)`, :166-171) and emits it as `name=""`.
Their ONLY D1 row was therefore `value-fragment`, fragmentation was "D1's whole story", and
`fingerprint_content_roles.py` filed them as content GAPS. The other 7 form-field blocks read
`fieldName` directly in their own render.php, produced a non-fragment row, earned a NOT-content
veto and were already `technical`. **Identical attribute, identical meaning, opposite
classification — decided purely by whether the block inlines or delegates.**

Fix: fragmentation suppresses CONTENT categories only (`FRAGMENT_EXEMPT_CATEGORIES`,
`resolve_final_category()` — one helper, both call sites).

Measured, expectation declared first: 33 fragment rows → 31 NOT-content, exactly 2 genuinely
content. D1 vetoes 0→7, content gaps 8→1, pool 23→14. DB diff: 9 rows changed, ALL `None → role`,
0 overwrites/adds/deletes.

**Negative control is two REAL rows, not fixtures:** `whatsapp-cta.phoneNumber` (esc_url →
link-href — the case the fragment rule exists for, and the row A5 depends on) and
`counter.prefix` (esc_html → visible-text). Both stay `value-fragment`. Exemption set deliberately
narrow — `STYLING-exclude` is non-content too but is NOT exempt, because zero fragment rows
resolve to it.

Gate: fixture Shape E + 2 assertions (8 checks). Proven able to fail — emptying the exemption set
turns it red, exit 1, then reverted green.

## A4 (part) — `responsive-logo.align` → `layout` (`32b4fbd7`)

Bean's recall was right. `align` is not an SGS attribute: it is CORE's alignment attribute,
injected because `block.json:20` declares `supports.align: ["left","center","right","wide"]`. Core
paints `alignleft/aligncenter/alignright/alignwide`; the block adds ONE rule, only for `left`
(`margin-inline-end:auto;margin-inline-start:0`, render.php:201), because core's `alignleft` means
FLOAT and a float would break a header flex row.

So it carries real layout — a draft with a centred logo should clone to `align: center`, and
`technical` (excluded from the content walk) would discard that. D6's hardcoded
`role: "technical"` became a PER-KEY map.

**The trap:** `native_support_evidence()` matched only `"<key>": true|false`, but `supports.align`
is an ARRAY. Mapping `align` without an array branch would have been SILENTLY INERT — the same
shape as the `supports.className` trap the module docstring already records.

**Answer to Bean's question:** no, `align` does not need "making customisable" — `supports.align`
already gives the client WP's standard alignment toolbar. Nothing was half-built; only the
classification was missing.

## A6 — image-sequence poster lift (`e1402858`)

ROOT CAUSE WAS DATA. `content_attr_for_element('sgs/image-sequence','poster')` returned None:
`posterMedia` had `canonical_slot = NULL` (tier 0 fails, `posterMedia` != `poster`) and no slot to
look aliases up in (tier 1 structurally unreachable). The walker never reached the scalar-lift leg,
which is why the alt could not follow — the companion lift at `walk.py:559` only runs after the
image lifts. That is why `2ca99d6f` was necessary but not sufficient.

Fix: `data/slots.json` — add `poster` AND `posterMedia` to the `media` element slot's aliases
(`posterMedia` so canonical_slot resolves, `poster` so the element-token lookup matches). 104 rows
unchanged in count (a shrinking seed prunes the live DB, §E1).

The `xfail(strict=True)` guard flipped to XPASS(strict) — a hard failure caused by PASSING, exactly
as designed. Marker removed; `test_extraction.py` 44 pass.

## /qc-council — A7's fix-shape REJECTED, better shape found

Three cross-model Sonnet raters (author was Opus).

- **Rater C (forensics)** reproduced every number independently and REFUTED rater E's dissent by
  direct query: E conflated the 5 both-verdict blocks (address/checkbox/file/radio/tiles) with the
  7 fragment-only ones. Also found the structural backstop — `assign-canonical.py:2049-2051` gates
  the technical UPDATE on `role IS NULL AND css_property IS NULL`, so a wrongly-scoped fix could
  not clobber an existing role.
- **Rater E (history)** caught that my A7 premise was FALSE: `sgs_button_element_style_css` is
  ALREADY in `CSS_HELPERS` (:82), and the file's own comment (:96-100) models and DECLINES a
  targeted recogniser, pointing at `property_suffixes` per R-31-1.
- **Rater D (tracer)** confirmed D7 fails on product-card because the block passes the whole
  `$attributes` bag, so `carriers_for()` builds no carrier at all — and proposed the replacement:
  count `css:*` keys in `block.json`'s `attrMap`. 1 + colour-terminal → `color`; >1 → shorthand →
  `styling`. `ctaColourBorder` 1, `gridItemBorder` 3.

**Lesson: my A7 premise survived my own reading and died on a rater's first check. The council paid
for itself on the item I was most confident about.**

## Open, with evidence

- **A5** — `_detect_link_template` WORKS (probed live: `https://wa.me/{value}`, `?text={value}`).
  `/sgs-update` only runs `extract-signatures.py --task-b-only` (`sgs-update-v2.py:1178`), so the
  full signature pass that writes `link_template` never runs. Needs (a) the write wired, (b) a tier
  seeding `link-content` from it. ⚠ A full run rewrites `output_signature` on up to 1397 rows and
  has NO dry-run flag.
- **A7** — build rater D's attrMap occurrence-count method. Separate real bug found:
  `block_attributes.css_property` is LOSSY for shorthands (flattened `gridItemBorder`'s 3 keys to 1).
- **A2 residual** — `icon-list/block.json` uncommitted; visual-diff gate blocked it correctly
  (an `enum` changes render: WP coerces out-of-enum → default). Needs a real capture.
- **A8** — header/footer grid surface: 14 attrs per block, all structurally dead
  (`layout` defaults `""`, no enum, no writer anywhere; emit gated on `'grid' === $layout`,
  `class-sgs-container-wrapper.php:669,702`). Spec 37 §7 constraint 2 records a 6/6 council
  REJECTION of block-private header/footer rendering — but deleting a dead surface while KEEPING
  the wrapper does not re-open that decision.

## Bean's rulings this session

1. `fieldName` = `technical` (applied by mechanism).
2. D6/D7: wire both, adjudicate contested rows on which role actually fits.
3. A7: design-gate then build (the gate rejected the shape — correct outcome).
4. Header/footer: grids belong to the ROW blocks; CSS should route to the CPT, not the block.
5. `responsive-logo.align` is layout — confirmed correct.
