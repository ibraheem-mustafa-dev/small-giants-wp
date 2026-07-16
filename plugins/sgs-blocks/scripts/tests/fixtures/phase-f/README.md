# Phase-F Fixture Corpus

**Purpose:** The multi-shape universality test bed for the Spec 31 clean modular rebuild. Phase F step F1 (§12.7 row F1). Every pipeline stage must pass against this corpus before progressing to the next stage.

---

## A. Coverage table — existing conformance fixtures

These fixtures in `../conformance/` already exercise the named block-shapes. **Reference only — do NOT duplicate them here.**

| Block-shape | Definition | Conformance fixture(s) |
|-------------|-----------|------------------------|
| **InnerBlocks** — `has_inner_blocks=1`; per-item CSS routes to child block attrs; uniform item CSS → parent `gridItem*` defaults | `block_composition.has_inner_blocks = 1` | `sgs-card-grid.html`, `sgs-feature-grid.html`, `sgs-accordion.html`, `sgs-accordion-item.html`, `sgs-tabs.html`, `sgs-tab.html`, `sgs-multi-button.html`, `sgs-testimonial-slider.html`, `sgs-content-collection.html` |
| **Scalar** — `has_inner_blocks=0`; child content/style lives in the parent's typed scalar attrs | `block_composition.has_inner_blocks = 0` | `sgs-testimonial.html`, `sgs-team-member.html`, `sgs-trust-bar.html`, `sgs-google-reviews.html`, `sgs-trustpilot-reviews.html`, `sgs-quote.html`, `sgs-info-box.html`, `sgs-notice-banner.html`, `sgs-option-picker.html`, `sgs-pricing-table.html`, `sgs-product-card.html`, `sgs-post-grid.html`, `sgs-gallery.html`, `sgs-form.html`, `sgs-form-step.html`, `sgs-form-field-tiles.html`, `sgs-modal.html` |
| **Mixed** — `has_inner_blocks=1` + scalar L4 grid-area slots; full wrapper attrs (L1–L4) plus per-area scalar attrs | hero/cta with `headline`/`contentPadding*`/`mediaBackground` area slots | `sgs-hero.html`, `sgs-cta-section.html` |
| **Atomic-media** — `sgs/media` scalar-media `<img>` family (object-fit / border-radius / max-width / aspect-ratio); the "family E" absent from page 8 | Spec 31 §8 family E; `_lift_scalar_media_from_img` path | **NEW** → `sgs-media.draft.html` (this corpus) |

---

## B. New fixtures this corpus adds

Each new fixture is a pair: `<name>.draft.html` (SGS-BEM draft with embedded `<style>`) + `<name>.expected.md` (known-correct expected render contract).

| File | Block-shape | What it tests |
|------|------------|---------------|
| `sgs-media.draft.html` | Atomic-media | `sgs/media` image block — object-fit, border-radius, max-width, aspect-ratio; the only block-shape NOT covered by any conformance fixture |
| `rt-pseudo-before.draft.html` | Scalar / section | RED-TEAM: `::before`/`::after` CSS never collected by current Stage 0.7 parser (M3-S7 HIGH gap) |
| `rt-video-media.draft.html` | Mixed | RED-TEAM: `<video>` in a `__media` grid-area column — the scalar-media `<img>`-only path swallows `<video>` via `continue` (M2-G2/G13 HIGH gap) |
| `rt-media-600.draft.html` | Section / InnerBlocks | RED-TEAM: `@media (max-width:600px)` rule — non-device-tier breakpoint silently dropped by current converter (M3-S2 HIGH gap) |
| `rt-background-url.draft.html` | Section | RED-TEAM: `background:url(...)` / `background-image` — no `property_suffixes` row → D2-only, never gap-candidated (M3-NOSUFFIX / M3-S1 HIGH gap) |
| `rt-centred-maxwidth.draft.html` | Section | RED-TEAM: section-ROOT `max-width:1200px;margin:0 auto` — the MF-3 layer-detection trap (must route to OUTER `customWidth`, NOT mis-detect as L2 `contentWidth`) |

---

## C. The F2 / F3 fixture contract

Each Phase-F fixture pair obeys this contract (enforced when F2 and F3 are built):

- **`<name>.draft.html`** — an SGS-BEM draft. Contains:
  - A `<!-- fixture: ... -->` header comment naming the target block + what the fixture tests.
  - A `<style>` block with `.sgs-<block>__<element>` rules (BEM, matching the conformance format).
  - Minimal but valid HTML markup using those classes.
  - All CSS values chosen to **differ from wrapper defaults** (so a coincidental-default match cannot give a false COVERED verdict — §7b MF-7 Tier-1 rule).

- **`<name>.expected.md`** — the known-correct render contract. States per section:
  - Which block slug must be emitted.
  - Which attrs (and at which responsive tier) must carry specific values.
  - Which CSS properties are HIGH gap (currently silently dropped) and what the TARGET behaviour is.
  - The TIER classification: `COVERED` (should round-trip via the universal path), `GAP` (no destination attr yet — log to `attribute_gap_candidates`), or `CHEAT-FORBIDDEN` (must NOT appear as inline style / D2 scoped CSS).

---

## D. Idempotency / fixed-point contract (§12.5)

Re-cloning a clone must produce identity: `clone(clone(draft)) == clone(draft)`.

This is a **future F3 metamorphic test** (one of the three metamorphic relations in §12.2.3). It is documented here so the F3 oracle builder knows to include it. Implementation: run the converter on a fixture's expected WP block markup as if it were a new draft; the output must equal the expected markup.

The fixtures in this corpus are designed to be idempotency-safe: no fixture emits raw inline CSS that would confuse a second-pass parse.

---

## E. Blocks absent from page 8 — coverage note

Page 8 (Mama's Munches canary) does NOT contain all 31 blocks × variants. The following are absent and require this fixture corpus for any COVERED verdict (§7b MF-7 single-canary blind-spot guard):

- `sgs/media` (entire family E — atomic-media shape) → `sgs-media.draft.html`
- `sgs/tabs` + `sgs/tab` → covered by `../conformance/sgs-tabs.html` + `../conformance/sgs-tab.html`
- `sgs/accordion` + `sgs/accordion-item` → covered by `../conformance/sgs-accordion.html` + `../conformance/sgs-accordion-item.html`
- `sgs/gallery` → covered by `../conformance/sgs-gallery.html`

Any block emitting `UNVERIFIED` (no live probe + no fixture hit) is explicitly not `COVERED` — the coverage matrix must show the distinction.
