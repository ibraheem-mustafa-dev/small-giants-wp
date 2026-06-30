# Role-derivation root cause + universal fix (2026-06-30)

**Context:** the W3 LANDED proof surfaced that the new converter emits lossy child blocks
(hero CTA `<a class="sgs-button--primary" href>` → `{label}` only; `url`+`inheritStyle` dropped).
A 6-persona design-gate council reframed the code fix (route every child through
`build_block_markup`); the DB-truth adversary flagged role-data bugs. Bean directed: root-cause
why `/sgs-update` (deterministic) leaves wrong/missing role data, and fix the DERIVATION, not per-entry.

## Proven root cause (3 layers)

1. **The name-regex role classifier is NOT wired into `/sgs-update`.**
   `sgs-update-v2.py:703-704` runs `subprocess.run(["python", assign-canonical.py])` — **no args**.
   The default `run()` does slot-resolution only. The role-detection classifier
   (`detect_role_from_block_json` + `run_role_detection_dry_run`/`_apply`, assign-canonical.py:1113/1175/1239)
   is a **standalone `--apply-roles` mode nobody invokes**. So on every reseed, content-bearing roles
   for url/image/icon/text attrs are NEVER auto-derived.

2. **The classifier is NULL-only / additive (assign-canonical.py:1026, SQL `WHERE role IS NULL`).**
   Even when run, it only FILLS NULL roles — it never CORRECTS an already-populated wrong role.

3. **Wrong roles are only ever fixed by hand** via `ATTR_CLASSIFICATION_OVERRIDES` (sgs-update-v2.py:971) —
   a dict already full of per-attr patches (team-member, testimonial ×6, card-grid…). **That manual
   treadmill is the "room for wrong data."**

## The report (read-only gate over all 619 attrs)

- **UPGRADE (4)** generic `content` → specific (all high-confidence name-regex):
  `sgs/icon.linkUrl`→link-href, `sgs/media.linkUrl`→link-href, `sgs/media.imageUrl`→image-object,
  `sgs/decorative-image.imageUrl`→image-object.
- **NULL-FILL (7)** content currently dropped (role NULL): `option-picker.label`,
  `product-card.featuredTag`, `product-faq.heading` → text-content; `cart`/`notice-banner.iconName`,
  `notice-banner.iconSource` → identity; `trust-bar.items` → content.
- **STYLING (2)** correctly EXCLUDED: `hero.splitImage`, `testimonial-slider.sideImage` are
  deliberately `scalar-media` (D128); the name-regex over-proposes `image-object` — leave alone.
- **REVIEW (0).**

## Council false-positives corrected (verified against block.json + DB)

- `sgs/multi-button` "no content roles" — NOT a bug; it's a pure layout wrapper, content = `sgs/button` children.
- `sgs/social-icons` "no content roles" — NOT a scalar bug; content is an `array` (`icons` repeater) → array-field path.
- `icon-slug` role — does NOT exist; icon identity uses `role='identity'` (use that in code).

## NEW code bug found (for the child-lift build)

DB convention is **`link-href`** (30 attrs); new engine `converter/services/field_extractors.py`
handler is **`url-href`** (0 attrs). The new shared lift would miss every link attr until reconciled.

## The universal fix (Bean-approved "apply all 11", report-first)

**A — derivation/tooling (root cause):**
1. WIRE the role classifier into the standard `/sgs-update` flow (the no-arg subprocess must run the apply).
2. EXTEND the apply: also process `role='content'` rows, UPGRADING to a specific content-bearing role
   ONLY when the proposed role is specific (≠ `content`) AND high-confidence (Tier-1 name-regex).
   Never touch non-NULL non-`content` roles (protects `scalar-media`). Fill NULL rows as before.
3. ADD a db-consistency mismatch gate: flag any name-says-X / role-says-Y disagreement going forward.

**B — code (universal child-lift, per council):** route every child through `build_block_markup`
(delete the scalar `primary_attr` bypass); reconcile `link-href`↔`url-href`; add `link-href`+`css-modifier`
branches to the shared lift; handle None composition; tests across child/array/top-level shapes.

## Verification
- After A: re-run the report → UPGRADE=0, NULL-FILL=0, scalar-media untouched; full /sgs-update reseed → roles persist (no override needed).
- After B: LANDED hero proof on canary — CTAs render with link + primary/secondary style; direct page-source compare + computed-style + Bean eye.
