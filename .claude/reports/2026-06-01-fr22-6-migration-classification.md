---
doc_type: report
generated: 2026-06-01
spec_ref: 22-FR-22-6
session_tag: small-giants-wp-2026-06-01-theme-wave1
supersedes_scope: 2026-05-27-hybrid-block-roster.md (adds target/not-target/done classification)
---

# FR-22-6 Migration Classification (theme thread, wave 1)

Classifies the 61-block hybrid roster (`2026-05-27-hybrid-block-roster.md`) into
actionable buckets. Evidence-backed (render.php + block.json read per block where
a verdict was non-obvious). Produced by the Track C analysis subagent (Sonnet),
reviewed by the main thread. **Drives the FR-22-6 migration waves.**

## Buckets

### DONE (already FR-22-6 migrated — skip)
hero, cta-section, trust-bar (dual-mode bound), info-box (v4), testimonial-slider,
testimonial, **notice-banner (v3 — shipped this session)**.

### NOT-A-TARGET (config/structural attrs, not display content the converter emits as InnerBlocks)
- **13 form-field-* blocks** (text/email/phone/textarea/checkbox/radio/select/tiles/
  file/consent/date/number/address/hidden) — `conditionalField/Operator/Value` =
  conditional-logic config; `label`/`fieldName` = form-field config rendered via
  `field_open()`/`field_label()` helpers. Verified by reading form-field-text
  render.php + block.json. **Document this verdict so future sessions don't re-evaluate.**
- form-review (`heading` = review-step UI header), form-step (`label` = ARIA step nav).
- container (5 attrs all background/layout styling config).
- accordion-item (`title` = `<summary>` header; `isOpen` = state), tab (`label` = tab
  button + ARIA), mega-menu (`badge`/`label` = nav labels), mobile-nav (cta* = nav links),
  table-of-contents (`title` = widget header).
- counter (`number`/`prefix`/`suffix` = animation engine `data-target`; migrating breaks
  the JS animation), star-rating (`label` = caption on a PHP-computed SVG/JSON-LD block),
  whatsapp-cta (`message` feeds `rawurlencode` into the wa.me URL).
- **quote** — PARTIALLY migrated already (dual render path: echoes `$content` when present,
  else scalar). Needs only a `save: () => <InnerBlocks.Content/>` switch + a deprecated
  entry; complex attrs → dedicated follow-up, not a batch.

### GENUINE TARGET — wave ordering (low→high blast radius)
- **Wave 2A — ⚠ CATEGORY ERROR (corrected 2026-06-02, do NOT use this list):** social-proof,
  featured-product, gift-section, footer, header are **mockup-draft SECTION classes, NOT SGS
  blocks** — verified: no `block.json` exists for any; all five appear only as section classes
  in the Mama's mockup HTML. FR-22-6 migrates SGS BLOCKS (whose render.php reads a scalar
  `text`/`heading` attr), not mockup section names (cf. the rule "mockup classes map to
  patterns, not blocks"). The real single-`text` Wave-2 targets must be RE-DERIVED by scanning
  the block roster's render.php files — this list is void.
- **Wave 2B — single media/icon attr**: decorative-image (imageUrl→sgs/media),
  responsive-logo (read render.php — `alt` may be metadata = NOT-A-TARGET), icon-block
  (iconValue→sgs/icon).
- **Wave 2C — array-content** (moderate): social-icons, process-steps (rich deprecated
  chain = good ref), trustpilot-reviews, announcement-bar (`targetDate` likely NOT-A-TARGET),
  certification-bar, card-grid, gallery, timeline.
- **Wave 2D — medium blast radius (read render.php first, R-22-10)**: team-member (photo via
  sgs_render_media + hover-overlay coupling), post-grid, business-info, countdown-timer.
- **Wave 3 — HIGH blast radius (deliberate session, most-used blocks)**: heading
  (headline/label/sub), text (tag/text), label (tag/text).

### EXCLUDED this wave (other tracks own them)
product-card, icon, button, icon-list.

## Cross-cutting finding (gates the whole roster)
All FR-22-6 migrations share the **null-save→InnerBlocks auto-migrate gap** (parking
P-FR226-NULL-SAVE-MIGRATION / generalised from P-D1): the new empty `InnerBlocks.Content`
save can validate against an old empty/self-closing post WITHOUT firing `migrate()`, so
scalar content can be dropped on existing posts. Affects info-box (shipped) + notice-banner
+ every Wave-2 block. Resolution = WP-CLI batch migration when a production site exists
(Bean's chosen path), OR add `isEligible` (non-empty scalar + no inner blocks → force walk).
Bean's prior disposition (moot until a real SGS site exists) stands.

## Recommendations
1. Document the form-field NOT-A-TARGET verdict in the Phase 2 plan (13 blocks removed from scope).
2. Remove counter/star-rating/whatsapp-cta from Phase-2 FR-22-6 scope via spec amendment (functional attrs, low cloning value).
3. Resolve P-FR226-NULL-SAVE-MIGRATION framework-wide before the Wave-2 batch runs.
