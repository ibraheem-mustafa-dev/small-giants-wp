---
doc_type: spec
spec_id: 15
spec_version: 0.2
project: small-giants-wp
title: Deterministic Draft-to-SGS Converter + QA Pipeline — Unified Architecture
status: APPROVED — Bean locked decisions + post-QC fixes applied 2026-05-12
session_date: 2026-05-12
authors: Bean + Claude (Opus 4.7)
absorbs: ['.claude/scratch/absorbed/12-DRAFT-TO-SGS-PIPELINE.md', '.claude/scratch/absorbed/13-DRAFT-NAMING-CONVENTION.md', '.claude/scratch/absorbed/14-CLONING-PIPELINE-CATALOGUE.md']
references: ['.claude/specs/11-SGS-BUTTON-ARCHITECTURE.md', '.claude/specs/01-SGS-THEME.md', '.claude/specs/02-SGS-BLOCKS.md']
captured_corrections:
  - dont-delete-db-rows-on-ghost-verdict
  - bean-drafts-use-sgs-prefixed-bem-naming
  - verify-rendered-output-not-internal-metrics
  - extend-measurement-set-when-human-eye-disputes
  - ingest-dont-generate-reference-data
---

# Spec 15 — Deterministic Draft-to-SGS Converter + QA Pipeline

## 1. Purpose + Scope

### 1.1 End goal

A deterministic pipeline that takes a Bean-controlled HTML/CSS draft, converts it to a working SGS WordPress site (block markup + theme settings + media), and validates the output through QA gates at every stage. The pipeline is deterministic for compliant drafts — given the same input, it produces byte-identical output across runs.

The same architecture handles:
- **Cross-platform output** — emit Bootstrap, Tailwind, shadcn, React, or Node.js equivalents of any block.json by composition from the data layer (Phase 6, extension).
- **External source ingestion** — drafts produced by AI-builders (Lovable, v0, Bolt) or scrapes of competitor sites pass through `/uimax-classify-naming` + lingua-franca conversion before entering the converter, so they reach the converter as SGS-BEM-compliant drafts.

### 1.2 What this spec owns

- The naming convention (was Spec 13).
- The mapping layer between draft + block.json + theme.json + cross-platform targets.
- The converter pipeline stages (was Spec 14 P3–P10 + Spec 12).
- The `/sgs-update` unified scanner that keeps the data layer current.
- The QA pipeline gates.
- The upstream conditions that draft-building pipelines and external integrations must conform to.

### 1.3 What this spec does NOT own

- The implementation of individual SGS blocks (governed by `02-SGS-BLOCKS.md` + per-block `block.json`).
- The button architecture (governed by Spec 11, already SHIPPED).
- The booking, forms, popups, chatbot subsystems (governed by their own specs).
- Hosting, deployment, content migration (separate ops pipelines).

### 1.4 Predecessors

This spec absorbs Specs 12, 13, 14 in full. They move to `.claude/scratch/absorbed/` with "Absorbed by Spec 15" markers preserving commit-message history. Plan files at `.claude/plans/phase-*-*.md` that came out of Spec 14 are preserved as input material for Phase 5 of this spec's execution.

---

## 2. Architectural Layers

The system has six layers. Each consumes only the layers below it. End goal is at the top; upstream conditions at the bottom.

```
┌─ L5  END GOAL ──────────────────────────────────────────────────────┐
│  Deterministic draft → SGS clone + QA-validated output              │
└──────────────────────────────────────────────────────────────────────┘
         consumes ↓
┌─ L4  CONVERTER + QA PIPELINE ───────────────────────────────────────┐
│  /sgs-clone orchestrator (Stages 0-9 + QA at every stage)           │
└──────────────────────────────────────────────────────────────────────┘
         consumes ↓
┌─ L3  MAPPING LAYER (Rosetta Stone) ─────────────────────────────────┐
│  Slot synonyms · Property suffixes · Modifier suffixes ·            │
│  Output-signature canonicalisation · Token value-matcher ·          │
│  Default-inheritance check · Cross-platform composition             │
└──────────────────────────────────────────────────────────────────────┘
         consumes ↓
┌─ L2  DATA LAYER ────────────────────────────────────────────────────┐
│  sgs-framework.db (blocks, block_attributes [extended],             │
│  patterns, block_compositions, design_tokens, block_selectors,      │
│  slot_synonyms [NEW], property_suffixes [NEW], modifier_suffixes    │
│  [NEW]) + uimax (component_libraries, patterns, design_tokens,      │
│  animations, naming_conventions, recognition_log,                   │
│  attribute_gap_candidates, functionality_gap_candidates) +          │
│  theme.json (settings + styles) + per-client style variations       │
└──────────────────────────────────────────────────────────────────────┘
         consumes ↓
┌─ L1  CONVENTION LAYER ──────────────────────────────────────────────┐
│  SGS-BEM canonical (.sgs-<block>__<element>--<modifier>)            │
│  Block.json attribute naming canonical (via canonical_slot)         │
│  Theme.json token slug canonical                                    │
│  Behavioural canonicalisation rule (same output signature           │
│  → same canonical slot)                                             │
└──────────────────────────────────────────────────────────────────────┘
         consumes ↓
┌─ L0  UPSTREAM CONDITIONS ───────────────────────────────────────────┐
│  Draft-building must emit SGS-BEM HTML using theme.json tokens.     │
│  AI-builder integrations route through /uimax-classify-naming +     │
│  lingua-franca conversion first.                                    │
│  External scrapes route through /uimax-sgs-scrape-pattern first.    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Convention Layer (L1)

### 3.1 SGS-BEM canonical class name format

Every Bean-controlled draft uses:

```
.sgs-<block>__<element>--<modifier>
```

Regex: `^\.sgs-[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$`

Where:
- `<block>` matches an SGS block slug registered in `block.json` (`hero`, `cta-section`, `card-grid`, etc.).
- `<element>` matches a **canonical slot** from that block (see §3.3 — canonical slots come from the synonym table, not the block.json attribute name verbatim).
- `<modifier>` matches a canonical modifier from the modifier vocabulary (Primary / Secondary / Hover / Active / etc.) OR a block.json attribute enum value.

### 3.2 Behavioural canonicalisation rule

> **Two block.json attributes that produce the same output behaviour ARE the same concept and share a canonical slot.**

Output behaviour means the combination of:
- Output function (`esc_html`, `esc_attr`, `esc_url`, `wp_kses_post`)
- DOM element wrapper (`<h1>`, `<p>`, `<a>`, `<img>`, etc.)
- BEM element class
- CSS property affected (if styling-related)
- Conditional gates

Determined by static analysis of `render.php` / `save.js`. Attributes with matching signatures are treated as synonyms regardless of their declared names.

### 3.3 Canonical attribute decomposition template

Every block.json attribute decomposes as:

```
<canonical_slot><PropertyType><Modifier><Breakpoint>

Examples:
  headlineFontSizeMobile    -> heading + FontSize + (no modifier) + Mobile
  borderRadiusMobileTL      -> (root) + BorderRadius + TL(corner) + Mobile
  ctaPrimaryHoverBackground -> button + Primary(variant) + Hover(state) + Background
  imagePaddingTopTablet     -> image + Padding + Top(side) + Tablet
```

`canonical_slot` comes from §3.4. `PropertyType` / `Modifier` / `Breakpoint` come from the bounded vocabularies in §3.5–§3.7.

### 3.4 Canonical slot vocabulary (proposed v1 — finalise on first Phase 1 audit)

| Concept | Canonical | Synonyms folded in |
|---|---|---|
| Primary heading | `heading` | `title`, `headline`, `name` |
| Sub-heading | `subheading` | `subtitle`, `subHeadline`, `sub` |
| Pre-heading label | `label` | `eyebrow`, `kicker`, `tag` |
| Paragraph body | `text` | `body`, `description`, `content`, `caption`, `copy` |
| Polymorphic image/video slot | `media` | `image`, `photo`, `picture`, `video`, `embed` |
| Background polymorphic | `backgroundMedia` | `backgroundImage`, `backgroundVideo`, `bgImage`, `bgVideo`, `heroImage` |
| Image alt text | `alt` | — |
| Image caption | `caption` | — |
| Primary CTA / button | `button` | `cta`, `ctaPrimary`, `primaryCta`, `primaryButton` |
| Secondary CTA / button | `buttonSecondary` | `ctaSecondary`, `secondaryCta`, `secondaryButton` |
| Link target URL | `link` | `url`, `href`, `anchor` |
| Repeating list of items | `items` | — (distinct from `options`, `badges`) |
| Form-field selection options | `options` | — |
| Decorative badge / pill | `badge` | `pill` |
| Person portrait | `avatar` | `portrait`, `profile`, `authorImage` |
| Iconography | `icon` | `symbol`, `glyph` |
| Date | `date` | `datetime`, `timestamp` |
| Price | `price` | `cost`, `amount` |
| Star rating | `rating` | `stars`, `score` |
| Visual divider | `separator` | `divider`, `rule` |

The synonym table is `slot_synonyms` in sgs-framework.db. New slots can be added; existing canonicals are locked.

### 3.5 Property suffix vocabulary (32 canonical — frozen after Phase 1)

Colour family: `Colour`, `Color`, `Background`, `Foreground`, `TextColour`, `TextColor`, `BorderColour`, `BorderColor`, `BackgroundColour`, `BackgroundColor`, `Stroke`, `Shadow`.

Typography: `FontFamily`, `FontSize`, `FontWeight`, `LineHeight`, `LetterSpacing`, `TextTransform`, `TextDecoration`, `TextAlign`.

Layout: `Padding`, `Margin`, `Gap`, `Width`, `Height`, `MinHeight`, `MaxWidth`, `MaxHeight`, `MinWidth`, `AspectRatio`.

Visual: `BorderRadius`, `BorderWidth`, `BorderStyle`, `BoxShadow`, `Opacity`, `ObjectFit`, `ObjectPosition`.

Content: `Url`, `Href`, `Link`.

Behaviour: `Style`, `Variant`, `Layout`, `Alignment`, `Required`, `Placeholder`, `HelpText`, `ErrorMessage`.

### 3.6 Modifier suffix vocabulary (16 canonical — frozen after Phase 1)

| Kind | Values |
|---|---|
| Breakpoint | `Mobile`, `Tablet`, `Desktop` |
| Side | `Top`, `Right`, `Bottom`, `Left` |
| Corner | `TL`, `TR`, `BL`, `BR` |
| State | `Hover`, `Active`, `Focus`, `Disabled` |
| Variant | `Primary`, `Secondary`, `Tertiary` |
| Unit | `Unit` |

### 3.7 Polymorphic media discriminator

The `media` and `backgroundMedia` slots use an object schema with a `type` discriminator:

```
{
  type: 'image' | 'video',
  url: string,
  alt?: string,                  // image-only (a11y)
  caption?: string,
  posterUrl?: string,            // video-only
  duration?: number,             // video-only
  captionsUrl?: string,          // video-only (a11y track)
  transcript?: string,           // video-only
  id?: number,                   // WP attachment id (when uploaded)
}
```

Render.php branches on `type`:
- `image` → emits `<img>` + Schema.org `ImageObject`.
- `video` → emits `<video src poster>` + `<track src=captionsUrl>` + Schema.org `VideoObject`.

Backwards compatibility: existing image attrs default to `type: 'image'`. Authors opt into video by setting `type: 'video'` on a slot; no other code change required.

---

## 4. Data Layer (L2)

### 4.1 sgs-framework.db — existing + extensions

| Table | Existing rows | This spec changes |
|---|---|---|
| `blocks` | 65 (after restoring sgs/media + sgs/data-display as `status='planned'`) | — |
| `block_attributes` | 1343 | **Add columns:** `canonical_slot`, `output_signature` (JSON), `role`, `derived_selector`, `equivalent_implementations` (JSON, optional override) |
| `block_selectors` | 69 (WP-native per style-support category) | — |
| `block_supports` | n/a | — |
| `block_compositions` | 37 (Spec 14 P3 populated) | — |
| `patterns` | 36 | — |
| `design_tokens` | 28 (theme.json slugs) | — |
| `animations` | 7 (sgs animation enum values) | — |
| `style_variations` | 8 (per-client overrides) | — |
| `hooks`, `gotchas`, `deploy_steps`, etc. | — | — |
| **`slot_synonyms`** (NEW) | 0 → ~20 (Phase 1) | New table — see §4.3 |
| **`property_suffixes`** (NEW) | 0 → 32 | New table — see §4.4 |
| **`modifier_suffixes`** (NEW) | 0 → 16 | New table — see §4.5 |

### 4.2 uimax — existing tables, populated incrementally

| Table | Rows | Spec 15 expectations |
|---|---|---|
| `component_libraries` | 211 (67 SGS + 144 others) | Per-block cross-platform equivalents stay block-level; per-attribute equivalents live on `block_attributes` row, mirrored from sgs-framework.db |
| `patterns` | 0 — schema exists | Phase 5 populates from sgs-framework.db patterns + scraped patterns |
| `design_tokens` | 5164 | Cross-platform value-level equivalents (already partially populated) |
| `animations` | 63 | Per-animation per-platform impl already structured |
| `naming_conventions` | 16 | SGS-BEM is the canonical row (`is_canonical_for_sgs_drafts=1`) |
| `recognition_log` | 385 | Feedback loop for clone runs — Phase 5 consumes |
| `attribute_gap_candidates` | 0 — schema exists (Spec 14 P2) | Populated by Phase 5 gap detection |
| `functionality_gap_candidates` | 0 — schema exists | Populated when blocks need new features |

### 4.3 `slot_synonyms` schema

```sql
CREATE TABLE slot_synonyms (
    canonical_slot      TEXT PRIMARY KEY,
    aliases             TEXT NOT NULL,           -- JSON array of synonym base words
    role                TEXT,                    -- default role for this slot (e.g. 'richtext-content')
    description         TEXT,
    wp_canonical        TEXT,                    -- WP core equivalent (e.g. 'content' for paragraph)
    html_semantic_tag   TEXT,                    -- preferred HTML element (e.g. 'h1'..'h6' for heading)
    created_at          TEXT DEFAULT CURRENT_TIMESTAMP
);
```

Seeded from §3.4 table during Phase 1.

### 4.4 `property_suffixes` schema

```sql
CREATE TABLE property_suffixes (
    suffix              TEXT PRIMARY KEY,        -- e.g. 'FontSize', 'Colour', 'Padding'
    role                TEXT NOT NULL,           -- Layer 2 role this suffix maps to
    css_property        TEXT,                    -- the CSS prop it sets (when applicable)
    is_token_matched    INTEGER DEFAULT 1,       -- 1 = always token-match, 0 = free value
    token_source        TEXT,                    -- which theme.json setting category (palette, spacingSizes, fontSizes, etc.)
    notes               TEXT
);
```

Seeded from §3.5 (32 rows) during Phase 1.

### 4.5 `modifier_suffixes` schema

```sql
CREATE TABLE modifier_suffixes (
    suffix              TEXT PRIMARY KEY,        -- e.g. 'Mobile', 'TL', 'Hover', 'Primary'
    kind                TEXT NOT NULL,           -- 'breakpoint' | 'side' | 'corner' | 'state' | 'variant' | 'unit'
    notes               TEXT
);
```

Seeded from §3.6 (16 rows) during Phase 1.

### 4.6 `block_attributes` schema extension

Add columns:

```sql
ALTER TABLE block_attributes ADD COLUMN canonical_slot        TEXT;
ALTER TABLE block_attributes ADD COLUMN role                  TEXT;
ALTER TABLE block_attributes ADD COLUMN derived_selector      TEXT;
ALTER TABLE block_attributes ADD COLUMN output_signature      TEXT;  -- JSON
ALTER TABLE block_attributes ADD COLUMN equivalent_implementations  TEXT;  -- JSON, optional
ALTER TABLE block_attributes ADD COLUMN signature_confidence  REAL;  -- 0.0-1.0
```

Populated by `/sgs-update` Stage 3 + 4 (see §6).

### 4.7 theme.json + styles.json integration

Theme.json is the framework's design token + default styles source.

| theme.json section | Token category | Maps to (this spec) |
|---|---|---|
| `settings.color.palette` | Palette tokens (slug + value) | `design_tokens.kind='color'` |
| `settings.color.gradients` | Gradient tokens | `design_tokens.kind='gradient'` |
| `settings.spacing.spacingSizes` | Spacing scale | `design_tokens.kind='spacing'` |
| `settings.typography.fontSizes` | Font-size scale | `design_tokens.kind='fontSize'` |
| `settings.typography.fontFamilies` | Font stacks | `design_tokens.kind='fontFamily'` |
| `settings.shadow.presets` | Shadow tokens | `design_tokens.kind='shadow'` |
| `settings.custom.*` | Custom tokens (transitions, radii, etc.) | `design_tokens.kind='custom'` |
| `styles.elements.<el>` | Per-HTML-element global default styles | Default-inheritance lookup (see §5.4) |
| `styles.blocks.<block-name>` | Per-block global default styles | Default-inheritance lookup |
| `styles.variations` (per-variation overrides via per-client .json files) | — | `style_variations` table per client |

Per-client style variations live at `theme/sgs-theme/styles/<client-slug>.json`. Each variation overrides token values (e.g. `--primary` to client's brand colour) while preserving slugs. Block.json values stored as slugs → re-rendering with a different variation swaps actual values without touching block content.

---

## 5. Mapping Layer (L3 — the Rosetta Stone)

### 5.1 Slot identity dispatch

Given a block.json attribute name:

1. Decompose into `(slot_word, properties, modifiers)` per §3.3 template.
2. Look up `slot_word` in `slot_synonyms`. If present (either as canonical_slot or in an aliases JSON array), resolve to canonical.
3. If not present, **flag as gap candidate** — new slot concept needs a canonical entry.

Output: every attribute has a `canonical_slot` value (string) and a `role` value (string).

### 5.2 Selector derivation

Once `canonical_slot` is assigned, selector derives:

```
selector = ".sgs-<block_slug_without_namespace>__<canonical_slot>"

Examples:
  block sgs/hero, attribute headlineFontSize, canonical_slot=heading
    -> .sgs-hero__heading

  block sgs/heritage-strip, attribute bodyFontSize, canonical_slot=text
    -> .sgs-heritage-strip__text

  block sgs/trust-bar, attribute labelFontSize, canonical_slot=text
    -> .sgs-trust-bar__text
```

For deeper nesting (e.g. nested headings like `.sgs-hero__copy h1`), the slot can declare a `selector_pattern` override in `slot_synonyms` (rare exception; default is the simple form).

### 5.3 Output-signature comparison

Two attributes are **behaviourally equivalent** if their `output_signature` JSON dicts are equal after normalisation:

```
signature = {
  type:                 string,         // block.json attribute type
  output_function:      string,         // 'esc_html' | 'esc_attr' | 'esc_url' | 'wp_kses_post' | 'null' (boolean/object)
  output_element:       string | null,  // 'h1' | 'p' | 'a' | 'img' | 'span' | etc.
  output_class:         string | null,  // BEM class
  output_role:          string,         // L2 role slug
  is_content_or_design: 'content' | 'design',
  conditional_gates:    list[string]    // names of php conditionals around the echo (sorted)
}
```

Static analysis extracts this from `render.php` / `save.js`. Attributes with the same signature get the same `canonical_slot`.

### 5.4 Token value-matcher + default-inheritance check

For each CSS value found in a draft (during clone extraction):

```
function snap_to_token(css_value, css_property, slot_role):
    1. Look up theme.json setting category from property_suffixes.token_source
    2. Iterate all tokens in that category from design_tokens table
    3. Compute distance metric:
       - Colour: ΔE2000 in Lab colour space (perceptual)
       - Spacing/font-size: percent-deviation in px
       - Shadow/font-family: discrete match
    4. Tolerance gate:
       - ΔE2000 ≤ 2.0 (imperceptible)         -> snap, confidence 1.0
       - ΔE2000 ≤ 5.0 (near match)             -> snap, confidence 0.85
       - ΔE2000 ≤ 10.0 (close match)           -> snap, confidence 0.6
       - > 10.0                                -> no snap; flag is_gap_candidate=true
       - Spacing/font: ±5% -> 1.0, ±15% -> 0.6, else gap
    5. Return (token_slug, confidence) or (raw_value, 0.0)

function inherits_global_default(block_slug, slot, value):
    1. Look up styles.elements.<html_tag> default for this slot's HTML element
    2. Look up styles.blocks.<block_slug>.<slot> override if present
    3. If draft value matches the resolved default exactly:
       return INHERIT (no per-block override needed; let global apply)
    4. Else:
       return OVERRIDE (record per-block value)
```

The converter uses this two-stage logic:
1. **Default-inheritance check first** — does this value match the global default? If yes, emit no per-block value.
2. **Token-snap second** — if override needed, snap to nearest token and emit slug.

### 5.5 Cross-platform composition

Cross-platform output (e.g. SGS → Tailwind) is COMPOSED from three layers, not stored per-attribute:

```
For attribute X on block Y with canonical_slot=S, role=R, value=token T:

  Bootstrap output =
    Bootstrap's selector for slot S            (from slot_synonyms x naming_conventions)
    + Bootstrap's css/utility for role R       (from property_suffixes x naming_conventions)
    + Bootstrap's value for token T            (from design_tokens.equivalent_implementations)

  Tailwind output = (analogous chain via naming_conventions row)
  shadcn output  = (analogous)
  React generic  = (analogous)
  Node.js / pug  = (analogous)
```

Per-attribute storage in `block_attributes.equivalent_implementations` is only for overrides where the composition rule doesn't apply (rare). Default is composed at query time.

For Phase 6 (extension), `/library-docs` (Context7-backed) pulls platform vocabularies as needed to populate the missing pieces of the composition chain.

---

## 6. /sgs-update Unified Pipeline (L2 → L3 wiring)

`/sgs-update` becomes the single scanner that keeps the data layer current and the mapping layer derived. 11 stages, all idempotent.

| Stage | Function | Existing or new |
|---|---|---|
| **1 — Inventory** | Walk `plugins/sgs-blocks/src/blocks/` + `theme/sgs-theme/`. Populate `blocks` + `patterns` + `theme_parts`. | Existing |
| **2 — Block.json native** | Parse each block.json. Populate `block_attributes` (basic metadata) + `block_selectors` (WP-native) + `block_supports`. | Existing |
| **3 — Behavioural analysis (NEW)** | Parse render.php / save.js per block. Extract `output_signature` per attribute. Write to `block_attributes.output_signature`. | NEW |
| **4 — Canonical assignment (NEW)** | For each attribute: decompose name per §3.3, look up `canonical_slot` via `slot_synonyms`, assign `role` via `property_suffixes`, derive `selector` via §5.2. Write to `block_attributes`. Cluster attributes by `output_signature` — if cluster has different `canonical_slot` values across members, flag synonym candidates. | NEW |
| **5 — Pattern composition** | Parse `theme/sgs-theme/patterns/*.php` for nested block markers. Populate `block_compositions.block_slugs`. | Existing (Spec 14 P3) |
| **6 — Token sync** | Parse `theme.json`. Sync `settings.*` categories to `design_tokens`. Sync `styles.*` defaults to a `theme_defaults` cache. | Existing (token sync), NEW (styles cache) |
| **7 — Animation sync** | Scan SGS blocks for `sgsAnimation` enum values. Sync to uimax `animations` table. | Existing (partial) |
| **8 — Uimax mirror** | Sync everything to uimax (component_libraries, patterns, design_tokens, animations, naming_conventions). Per-attribute canonical / role / signature mirrored as JSON on `component_libraries` rows or expanded into a future per-attribute mirror table. | Existing (partial) |
| **9 — Drift validator (NEW)** | Every attribute decomposes into known canonicals? Flag violations: unknown slot, unknown property suffix, unknown modifier. Report to `/sgs-update` output. Exit non-zero if violations on `--strict` flag. | NEW |
| **10 — Gap detection (NEW)** | Signatures without canonical_slot → write to `attribute_gap_candidates`. Recognition_log `extraction_failed` events for unresolved selectors → write to gap candidates. | NEW |
| **11 — Reference doc regen** | Regenerate `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` + canonical vocabulary appendix from DB. | Existing |

Re-running `/sgs-update` is idempotent. Output report summarises: blocks scanned, attrs populated, synonyms detected, drift violations, gap candidates surfaced.

---

## 7. Converter Pipeline (L4)

`/sgs-clone <draft-path>` orchestrates the conversion. 10 stages with QA at every stage.

| Stage | Function | QA gate |
|---|---|---|
| **0 — Pre-flight** | Verify draft file exists. Verify required uimax + sgs-db data populated. | Stop on missing data |
| **0.1 — BEM compliance lint** | Every class in the draft matches the SGS-BEM regex (§3.1) OR is a recognised core/Tailwind/Bootstrap pattern (lingua-franca route). | Strict mode: reject; `--draft-mode`: warn |
| **0.5 — Token-usage lint** | Every CSS value in the draft maps to a theme.json token within tolerance (§5.4). Surface values that don't snap. | Strict mode: reject; `--draft-mode`: warn + log gap candidates |
| **1 — Section boundary detection** | Identify top-level section wrappers. Match against `patterns.slug` + `slot_synonyms` to determine which pattern/block each section maps to. | Each section either matched OR flagged |
| **2 — Block-type match** | For each section, resolve target block from canonical_slot → block_slug lookup. | Match confidence ≥ 0.7 required |
| **3 — Slot extraction** | For each block.json attribute on the matched block, locate the slot in the draft via `derived_selector` (§5.2). Extract value using `role`-keyed strategy (Layer 2 role-templates). | Per-attribute extraction outcome logged to recognition_log |
| **4 — Token snapping** | For property-level values (colours, spacing, fonts, shadows), snap to nearest theme.json token via §5.4. Free values (text, URL, image src) pass through. | Confidence < 0.6 → log + use raw value |
| **5 — Default-inheritance check** | For each per-block value, check if it matches the global default (`styles.elements.X` / `styles.blocks.X`). If yes, drop the override (let global apply). | Override count delta logged |
| **6 — block.json emission** | Construct block.json attribute object using canonical slot values + slug references. Validate against block.json `attributes` schema. | Schema validation fails → halt |
| **7 — Render to WP markup** | Serialise block.json + nested InnerBlocks to WP block-comment markup. | Markup parses via WP block parser |
| **8 — Visual parity QA** | Playwright renders the WP markup. Compare screenshot to draft at 3 viewports. Pixel-diff tolerance ≤ 1% per viewport (pass gate); regions > 0.5% always surfaced as thumbnails in the QC report for operator review. | Above 1% → halt; 0.5–1% → surfaced for review but pipeline continues |
| **9 — Coverage + gap report** | Per-block: attrs populated / declared. Per-section: extraction outcomes. Surface to operator. | Always runs |

### 7.1 Extraction strategies (Layer 2 roles)

Continues to use the role-template dispatch from Spec 14 P3 (`output/role-templates.json`). Role assignment now comes from `block_attributes.role` (populated by `/sgs-update` Stage 4), not derived per-run.

### 7.2 Per-block override registry (deprecation path)

Spec 14 P4 introduced a per-block override registry (`overrides/hero.py`) to preserve hero's hand-coded extraction. **After Phase 3 of this spec lands (canonical-slot data populated in sgs-db), the hero override is no longer needed** — hero's slots become regular catalogue-driven entries. The `overrides/` directory + hero override deletes in Phase 3.

---

## 8. Upstream Conditions (L0)

Conditions that draft-building pipelines and external-source integrations must conform to. These are the gates that make the converter deterministic.

| Source of draft | Required pre-processing | Enforcement point |
|---|---|---|
| Bean-controlled HTML/CSS draft | Author in SGS-BEM. Use theme.json token values (not arbitrary CSS values). | Stage 0.1 + 0.5 of `/sgs-clone` |
| `/innovative-design` output | Must emit SGS-BEM HTML. Token values from active theme.json. | `/innovative-design` skill update — Phase 4 of this spec |
| `/sgs-clone --draft-mode` (Bean-iterating drafts) | Soft warnings on BEM violations, allow continue | Stage 0.1 soft mode |
| AI-builder output (Lovable, v0, Bolt, Cursor) | Route through `/uimax-classify-naming` to identify source convention, then through lingua-franca conversion (Spec 13 §5 → absorbed here in §8.1) before the draft enters `/sgs-clone` | External pipeline wrapper |
| External scraped sites (competitor cloning) | Same — `/uimax-sgs-scrape-pattern` runs before `/sgs-clone`. Source classes preserved in `equivalent_implementations.<source-convention>`, SGS-BEM primary written to `patterns.primary_class`. | `/uimax-sgs-scrape-pattern` is the gateway |

### 8.1 Lingua-franca-conversion rule (absorbed from Spec 13 §5)

When external sources enter the pipeline, classes are converted to SGS-BEM at scrape time per the existing `/uimax-sgs-scrape-pattern` mechanism. SGS-BEM is the primary class; source-convention class names are stored as siblings in `equivalent_implementations` with `convention=<source-convention-slug>`. Never silently drop a translation; flag as `is_gap_candidate=1` if no SGS-BEM equivalent exists.

---

## 9. QA Gates Summary

QA fires at every stage. Gates can run in three modes:

- **Strict** — violations halt the pipeline. Used in CI / `/sgs-clone --strict`.
- **Soft-warn** — violations logged + reported but pipeline continues. Used in `/sgs-clone --draft-mode`.
- **Legacy bypass** — violations skipped. Used on pre-rule mockups via `--legacy` flag.

| Stage | QA gate |
|---|---|
| 0.1 | BEM compliance |
| 0.5 | Token-usage |
| 2 | Block-type match confidence ≥ 0.7 |
| 3 | Per-attribute extraction outcome logged |
| 4 | Token snap confidence ≥ 0.6 (else log + raw value) |
| 6 | block.json schema validation |
| 7 | WP block markup parse |
| 8 | Visual parity ≤ 1% pixel diff at 3 viewports (pass gate); 0.5–1% regions surfaced as thumbnails for operator review |
| 9 | Coverage report |

Additionally:
- **`/sgs-update` drift validator (§6 Stage 9)** runs on every update — gates new attributes against canonical vocabulary.
- **Pre-commit hook (Phase 4)** runs Stage 0.1 + 0.5 on any committed draft file under `sites/*/mockups/`.

---

## 10. Functional Requirements (consolidated)

Absorbs Spec 14 FR1–FR26 and adds FR27–FR40 for canonicalisation work.

### From Spec 14 (still in scope)

| FR | Summary |
|---|---|
| FR1 | Layer 4 inner-blocks catalogue (block compositions) |
| FR2 | Layer 2 role-templates (20 roles, cross-platform recipes) |
| FR3 | Layer 3 internal-elements catalogue (per-block slot list) |
| FR4 | Layer 1 envelopes (pattern wrappers) |
| FR5 | extract.py refactored to catalogue-driven dispatch |
| FR6 | Per-platform output via composition |
| FR7 | uimax `component_libraries.is_gap_candidate` column |
| FR8 | `attribute_gap_candidates` + `functionality_gap_candidates` tables |
| FR9 | Lingua-franca conversion at scrape time |
| FR10 | Slot extraction with role-keyed strategies |
| FR11 | Coverage report per block |
| FR12 | WP block-comment markup serialisation with InnerBlocks |
| FR13 | Pattern dedup + classify |
| FR14 | Multi-section walker for full-page extraction |
| FR15 | Operator hand-off interface for ambiguous cases |
| FR16 | uimax `recognition_log` feedback loop |
| FR17 | Doc reconciliation (no ghost claims about shipped infrastructure) |
| FR18 | Recogniser script lifecycle decisions (retire / merge / build) |
| FR19 | FR20 mutex (no concurrent /sgs-update + /sgs-clone) |
| FR20 | Pipeline state directory cleanup |
| FR21 | No canonical mutation outside designated FRs |
| FR22 | Stage-resume removed (atomic sessions) |
| FR23 | RecursionGuard primitive in DOM walkers |
| FR24 | Hero regression baseline preserved through P4 refactor |
| FR25 | Dynamic-link modifiers (`:latest-post(...)` etc.) |
| FR26 | v1 fingerprints' semantic features integrated as required/optional feature data |

### New for Spec 15

| FR | Phase | Summary |
|---|---|---|
| **FR27** | 1 | Behavioural canonicalisation rule (§3.2) |
| **FR28** | 1 | Canonical attribute decomposition template (§3.3) — 32 property suffixes + 16 modifier suffixes |
| **FR29** | 1 | `slot_synonyms` table + 20 canonical slot entries seeded |
| **FR30** | 1 | `property_suffixes` + `modifier_suffixes` vocabulary tables |
| **FR31** | 1 | `block_attributes` extended with `canonical_slot` / `role` / `derived_selector` / `output_signature` / `equivalent_implementations` columns |
| **FR32** | 1 | Static analyser for render.php / save.js → per-attribute output signature |
| **FR33** | 2 | `/sgs-update` extended with Stages 3 + 4 + 9 + 10 |
| **FR34** | 1 | Token value-matcher (§5.4 — ΔE2000 colour matching, percent-deviation for spacing/sizing) |
| **FR35** | 1 | Default-inheritance check against `styles.elements` / `styles.blocks` (WP precedence: blocks > elements > root) |
| **FR36** | 3 | Polymorphic media slot (image OR video object schema, type discriminator) + WP block deprecation for existing image-only attrs |
| **FR37** | 6 | Cross-platform output via composition (no per-attribute storage by default) |
| **FR38** | 4 | Stage 0.1 BEM lint + Stage 0.5 token-usage lint in `/sgs-clone` |
| **FR39** | 4 | Pre-commit hook enforces Stage 0.1 + 0.5 on `sites/*/mockups/` files |
| **FR40** | 3 | Hero override deletion after Phase 3 (extract.py no longer needs `overrides/hero.py`) |

---

## 11. Phases of Execution

Six phases. Each phase ships an isolated commit + verifiable improvement. Earlier phases are gate dependencies for later phases.

### Phase 1 — Foundation (~6-8 hr)

**Output:** Behavioural analyser, vocabulary tables, slot/role/selector assignments populated, value-matcher, default-inheritance lookup.

**Success criteria:**
- `slot_synonyms`, `property_suffixes`, `modifier_suffixes` tables created + seeded
- `block_attributes` schema extended with 6 new columns
- Static analyser parses 100% of render.php + save.js files, emits per-attribute signature
- Every attribute in `block_attributes` has `canonical_slot` + `role` + `derived_selector` populated
- Token value-matcher handles colours (ΔE2000) + spacing + font-sizes + shadows
- Default-inheritance lookup function works against theme.json/styles.json
- Commit: `feat(spec-15-p1): foundation — vocabulary tables + behavioural analyser`

### Phase 2 — /sgs-update unified (~2-3 hr)

**Output:** `/sgs-update` runs Stages 1–11 in one pass. Idempotent. Drift validator gates new attributes.

**Success criteria:**
- Re-running `/sgs-update` produces no diffs after the first run
- Drift validator reports zero violations on current codebase (or surfaces real drift to operator)
- Gap detection writes to `attribute_gap_candidates`
- Reference doc `02-SGS-BLOCKS-REFERENCE.md` regenerated from DB with canonical vocabulary appendix
- Commit: `feat(spec-15-p2): /sgs-update unified pipeline`

### Phase 3 — Catalogue + extractor rewires (~2 hr)

**Output:** `extract.py` reads canonical-slot data from sgs-db. Hero override deleted. P3 catalogue generator becomes a thin DB query.

**Success criteria:**
- `extract.py` (P4 dispatcher) reads `block_attributes.canonical_slot` + `role` + `derived_selector` instead of role-templates.json + derived-selector logic
- `overrides/hero.py` deleted; hero extraction works via canonical path (re-verify against `tests/golden/hero-extraction-baseline.json`)
- Layer 3 catalogue generator (`step6_layer3.py`) replaced by a DB query (or retained for back-compat with sgs-db as source)
- Trust-bar + heritage-strip extraction coverage measurably improves
- Commit: `feat(spec-15-p3): catalogue + extractor rewire to canonical slots`

### Phase 4 — Draft convention enforcement (~3-4 hr)

**Output:** Stage 0.1 BEM lint + Stage 0.5 token-usage lint in `/sgs-clone`. Pre-commit hook for `sites/*/mockups/`. `/innovative-design` updated to emit compliant drafts.

**Success criteria:**
- `/sgs-clone --draft-mode` reports BEM + token violations as warnings
- `/sgs-clone --strict` rejects non-compliant drafts
- Pre-commit hook fires on any change to a mockup file under `sites/*/mockups/`
- `/innovative-design` skill description updated; output verified to use SGS-BEM + theme.json tokens
- Commit: `feat(spec-15-p4): draft convention enforcement gates`

### Phase 5 — Clone pipeline E2E (~8-10 hr)

**Output:** Absorbs Spec 14 P5–P10 plan files at `.claude/plans/phase-5-*.md` through `.claude/plans/phase-10-*.md`. Adapts entry conditions to consume the now-canonical foundation.

**Success criteria:**
- `/sgs-clone` runs end-to-end on Mama's mockup with ≥90% block attribute coverage
- Visual parity ≤ 1% pixel diff vs draft at 3 viewports; regions > 0.5% surfaced as thumbnails in QC report for operator review
- Coverage report + gap detection write to uimax
- Operator interface for ambiguous cases (FR15)
- Acceptance harness (absorbed from Spec 14 P10) passes — defined as: all 5 canonical-mutation-boundary checks green + ≥90% block attribute coverage on Mama's mockup
- Commit per sub-phase using `feat(spec-15-p5-<sub>): <description>` format (e.g. `feat(spec-15-p5-gap-detection): ...`, `feat(spec-15-p5-staged-scaffolding): ...`), all on origin/main

### Phase 6 — Cross-platform output (extension) (~6-8 hr)

**Output:** Block.json → Bootstrap / Tailwind / shadcn / React / Node.js code generators. `/library-docs` populates platform vocabularies as needed.

**Success criteria:**
- Generator for at least 2 target platforms (Tailwind + React generic recommended first) emits valid component code for any SGS block
- Cross-platform composition (§5.5) covers ≥80% of canonical slots; rest flagged for `/library-docs` lookup
- Per-platform smoke test: a generated Tailwind component renders visually equivalent to the SGS block
- Commit: `feat(spec-15-p6): cross-platform output generators`

### Phase ordering rules

- Phase 1 is the gate for everything else.
- Phase 2 + 3 can run in series after Phase 1 (3 strongly depends on 1; can run before or after 2).
- Phase 4 depends on Phase 1 + 2.
- Phase 5 depends on Phases 1–4 complete.
- Phase 6 depends on Phase 1 + 3 minimum (canonical slots + role data populated); recommended to wait for Phase 5 so it consumes a fully-validated foundation, but can start in parallel with Phase 4–5 if cross-platform output is urgent. Phase 6 outputs are decoupled from clone-pipeline output, so no data hazard.

Total estimate: ~27–37 hr across 6 phases.

---

## 12. Appendices

### A. Glossary

| Term | Definition |
|---|---|
| **Canonical slot** | The single canonical name for a semantic slot concept (e.g. `heading`, `text`, `button`). Block.json attribute names may use this name OR a registered synonym; the canonical_slot field in `block_attributes` resolves both to the same value. |
| **Output signature** | The behavioural fingerprint of an attribute: (type, output_function, output_element, output_class, output_role, is_content_or_design, conditional_gates). Determined by static analysis. |
| **Design token** | A named, intentional design value in `theme.json settings.*` — has a slug (e.g. `primary`) and a value (e.g. `#0F7E80`). All design property values in the framework reference tokens by slug. |
| **Token snap** | Mapping an arbitrary CSS value found in a draft to the nearest design token (within tolerance) so block.json stores the slug, not the raw value. |
| **Default inheritance** | When a per-block value matches the global default defined in `theme.json styles.elements.X` or `styles.blocks.X`, the per-block override is omitted and the global applies. |
| **Lingua-franca conversion** | At scrape time (external sources only), source-convention class names are converted to SGS-BEM as primary, with the original preserved in `equivalent_implementations`. |
| **Behavioural canonicalisation** | Two attributes that produce the same `output_signature` ARE the same concept, share a `canonical_slot`, and can be cross-mapped across platforms identically. |
| **Style variation** | Per-client `.json` file in `theme/sgs-theme/styles/` that overrides specific token values to re-theme the entire site. Slugs stay constant; values change. |
| **/sgs-update** | The unified scanner that walks the codebase + theme.json, populates sgs-framework.db + uimax, and runs drift validation + gap detection. |
| **/sgs-clone** | The orchestrator that takes a Bean-controlled draft and produces an SGS WordPress clone via the 10-stage converter pipeline. |
| **BEM** | "Block-Element-Modifier" — a CSS naming convention. Classes follow `block__element--modifier` (e.g. `.sgs-hero__copy--center`). SGS uses an `sgs-`-namespaced variant; see §3.1. |
| **ΔE2000** | A perceptual colour-distance metric from CIE Lab colour space. ΔE2000 of 1.0 is the threshold of just-noticeable colour difference for an average viewer; ΔE2000 of 5.0 is "noticeable but acceptable"; ΔE2000 > 10.0 is "obvious mismatch". Used in §5.4 to snap arbitrary CSS colours to theme.json palette tokens within tolerance. |
| **InnerBlocks** | A WordPress concept where a parent block declares a slot that holds child blocks (e.g. `sgs/hero` contains nested `sgs/button` instances). Render.php emits `<InnerBlocks.Content />` for the slot; child blocks render independently inside the wrapper. |
| **RecursionGuard** | A safety primitive built in Spec 14 P2 (`plugins/sgs-blocks/scripts/recogniser/recursion-guard.py`) that wraps DOM-walking functions to prevent runaway recursion on malformed mockups or deeply-nested conditionals. Default `max_depth=12`; raises typed exception on overflow. |
| **Drift validator** | The check at `/sgs-update` Stage 9 that every attribute in every block.json decomposes into known canonical slot + property suffix + modifier suffix. Fails surface as violations the operator must resolve. Prevents convention drift from accumulating silently. |
| **Gap candidate** | A row flagged in `attribute_gap_candidates` (sgs-framework.db) or `equivalent_implementations.<platform>.is_gap_candidate=true` (uimax tables) indicating that a piece of mapping data is missing. Surfaces during clone extraction (slot has no canonical), during token snapping (CSS value doesn't match any theme.json token within tolerance), or during cross-platform composition (no known equivalent for a target platform). |
| **Modifier vocabulary** | The bounded set of 16 canonical modifier suffixes (`Mobile`/`Tablet`/`Desktop` breakpoints, `Top`/`Right`/`Bottom`/`Left` sides, `TL`/`TR`/`BL`/`BR` corners, `Hover`/`Active`/`Focus`/`Disabled` states, `Primary`/`Secondary`/`Tertiary` variants, `Unit`). Combined with the slot vocabulary + property suffix vocabulary via the decomposition template (§3.3) to produce all canonical block.json attribute names. |

### B. Resolved decisions

Locked by Bean 2026-05-12 prior to Phase 1 kickoff:

1. **Canonical naming corner cases** → `subheading` (lowercase, one word, matches BEM convention in selectors) + `buttonSecondary` (noun-first; clusters with `button*` / `buttonPrimary*` alphabetically). Reflected in §3.4 canonical slot vocabulary.
2. **Block.json `sgs.attrSelectors` field** → DB is the source of truth (populated by `/sgs-update` static analysis). Block.json may optionally declare `supports.sgs.attrSelectors` to override the auto-derivation per-attribute — `/sgs-update` reads it and respects it. Default path requires zero per-block authoring.
3. **Polymorphic media migration** → Yes, add a WP block deprecation for each block whose schema changes (existing posts auto-migrate to `type: 'image'`). Reflected in FR36 phase 3 work. Standard SGS pattern (see `process-steps/deprecated.js`).
4. **`styles.blocks.<block-name>` precedence** → Match WP standard exactly: `styles.blocks.<block>` > `styles.elements.<el>` > root defaults. Reflected in FR35 phase-1 work; Phase 1 success criteria adds unit test verifying this order.
5. **Per-attribute `equivalent_implementations` override schema** → Defer until Phase 6 when cross-platform output starts. Design against the first real override case rather than speculating. Phases 1–5 only populate `canonical_slot + role + selector`; composition rule handles platforms.
6. **Visual parity tolerance** → 1% pixel diff as the pass gate, with regions > 0.5% always surfaced as thumbnails in the QC report for operator review. Industry-norm middle ground; lets the pipeline pass through harmless anti-aliasing jitter while still surfacing real layout drifts for human judgement. Reflected in §7 Stage 8 and §9 QA gates table.

### C. Captured corrections that informed this spec

- **dont-delete-db-rows-on-ghost-verdict** — sgs/media + sgs/data-display were nearly nuked in P3 follow-up; restored with status='planned' after Bean caught it. Surfaces in §4.1 (blocks count).
- **bean-drafts-use-sgs-prefixed-bem-naming** — Spec 13's foundational rule; absorbed into §3.
- **verify-rendered-output-not-internal-metrics** — drives the Stage 8 visual parity QA at §7 + §9.
- **extend-measurement-set-when-human-eye-disputes** — informs the value-matcher's confidence levels at §5.4 (don't trust internal-metric matches alone).
- **ingest-dont-generate-reference-data** — drives §6 Stage 3 + 4 (static analysis, not LLM generation, for vocabulary derivation).
- **broaden-search-before-declaring-spec-wrong** — multiple times this session; reflected in the §4 inventory (every existing table audited before proposing new ones).

### D. Migration of absorbed specs

After Bean approves this spec:

```
mkdir -p .claude/scratch/absorbed
git mv .claude/specs/12-DRAFT-TO-SGS-PIPELINE.md  .claude/scratch/absorbed/
git mv .claude/specs/13-DRAFT-NAMING-CONVENTION.md .claude/scratch/absorbed/
git mv .claude/specs/14-CLONING-PIPELINE-CATALOGUE.md .claude/scratch/absorbed/
```

Each file gets a header note:

```
> **ABSORBED BY SPEC 15** — see `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md`.
> Preserved here for commit-message history continuity (feat(p1)..feat(p4) references).
> Do not author new work against this doc. All content + rules carried forward to Spec 15.
```

Living docs to update (point at Spec 15 as truth):
- `.claude/CLAUDE.md`
- `.claude/architecture.md`
- `.claude/state.md` (current_phase advances to `spec-15-phase-1-foundation`)
- `.claude/plan.md`
- `.claude/cloning-pipeline-flow.md`
- `.claude/goals.md`
- `.claude/handoff.md`
- `.claude/next-session-prompt.md`

Other spec docs that reference 12/13/14 (e.g. `02-SGS-BLOCKS.md`, `2026-04-27-optimisation-toolkit-design.md`) — deferred update; parking entry created.

### E. Asset Inventory & Lifecycle

Every file, script, data source, table, plan doc, and skill mentioned in Spec 15 — verified to exist (or marked as PLANNED for a specific phase) and tagged with its lifecycle status.

**Legend:**
- **BUILT** — exists on disk + in scope going forward
- **PLANNED** — will be built in the named phase
- **DATA-SOURCE** — input data file; not retired but consumed by a phase
- **TO-RETIRE** — exists but slated for removal in a named phase
- **REFERENCE** — historical doc / commit-history continuity only
- **ABSORBED** — content folded into Spec 15

#### Code assets

| Path | Status | Phase | Notes |
|---|---|---|---|
| `tools/recogniser-v2/extract.py` | BUILT | — | Slim dispatcher (630 LOC) after spec 14 P4 refactor. Spec 15 P3 rewires to read from sgs-db. |
| `tools/recogniser-v2/extract_strategies.py` | BUILT | — | 11 role-based extraction strategies + dispatch table. |
| `tools/recogniser-v2/utils.py` | BUILT | — | Shared helpers (numeric, BS4, CSS classification, computed-style accessor). |
| `tools/recogniser-v2/overrides/__init__.py` | BUILT | — | Override registry. |
| `tools/recogniser-v2/overrides/hero.py` | TO-RETIRE | Phase 3 | 908 LOC hero override. Deleted after canonical-slot data populated (FR40). |
| `plugins/sgs-blocks/scripts/recogniser/recursion-guard.py` | BUILT | — | Spec 14 P2 ship — 150 LOC, max_depth=12. |
| `plugins/sgs-blocks/scripts/recogniser/leftover-bucket-router.py` | BUILT | — | Spec 14 P1 ship — bucket router for unmatched DOM elements. |
| `plugins/sgs-blocks/scripts/recogniser/simple_html_review_report.py` | BUILT | — | Spec 14 P1 ship — HTML review reporter. |
| `plugins/sgs-blocks/scripts/pattern-fingerprint.py` | BUILT (partial-retire) | Phase 1 | Pre-existing. Its `ATTR_TO_CSS` dict is the seed for Phase 1's role assignment; annotate as deprecated once vocabulary tables ship. |
| `plugins/sgs-blocks/scripts/pattern-register.py` | BUILT | — | Pattern registration into sgs-db; consumed by `/sgs-update` Stage 5. |
| `plugins/sgs-blocks/scripts/fingerprint-builder/build-catalogue.py` | TO-RETIRE | Phase 3 | Spec 14 P3 output. After Phase 3, catalogue moves into sgs-db; this script + its outputs become historical. |
| `plugins/sgs-blocks/scripts/fingerprint-builder/step2_3_4_layer1_3_4.py` | TO-RETIRE | Phase 3 | Same — Phase 3 retirement. |
| `plugins/sgs-blocks/scripts/fingerprint-builder/step6_layer3.py` | TO-RETIRE | Phase 3 | Same — Phase 3 retirement. |
| `plugins/sgs-blocks/scripts/fingerprint-builder/audit-attr-vocabulary.py` | BUILT (one-off) | Phase 1 | Audit tooling that surfaced the synonym clusters; kept as reference; Phase 1 may extend or supersede. |
| `plugins/sgs-blocks/scripts/fingerprint-builder/audit-attr-vocabulary-v2.py` | BUILT (one-off) | Phase 1 | v2 audit with multi-suffix decomposition. |
| `plugins/sgs-blocks/scripts/fingerprint-builder/qa-gate.py` | TO-RETIRE | Phase 3 | Spec 14 P3 catalogue QA gate; obsolete after catalogue moves to sgs-db. |
| `~/.claude/skills/sgs-wp-engine/scripts/update-db.py` | BUILT | — | `/sgs-update` core; Phase 2 extends with Stages 3 + 4 + 9 + 10. |
| `~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | BUILT | — | sgs-db query helper. |
| `~/.claude/skills/sgs-wp-engine/scripts/populate-db.py` | BUILT | — | Backing for `/sgs-update`. |
| `plugins/sgs-blocks/scripts/uimax-tools/uimax-write-validator.py` | BUILT | — | Pre-write validator (no-licensing + Rosetta Stone). |
| `plugins/sgs-blocks/scripts/uimax-tools/uimax_write.py` | BUILT | — | Atomic validate-then-write helper. |
| `plugins/sgs-blocks/scripts/uimax-tools/sgs-update-uimax-sync.py` | BUILT | — | `/sgs-update` Stage 3+4 sync (existing nomenclature predates Spec 15's stage numbering). |
| **v1 recogniser scripts** `tools/recogniser/*.py` (recogniser.py, section_detector.py, style_extractor.py, fingerprint_indexer.py, output_router.py, serialiser.py, patch-featured-product.py) | **TO-RETIRE** | Phase 5 | Pre-spec-14 recogniser pipeline (~8000 LOC, 12% hero coverage). Replaced by recogniser-v2 + /sgs-clone orchestrator. Move to `tools/recogniser-legacy/` or delete during Phase 5 cleanup. |

#### Data sources

| Path | Status | Phase | Notes |
|---|---|---|---|
| `tools/recogniser/data/fingerprints.json` | DATA-SOURCE | Phase 1 | v1 hand-authored `attr_extractors` (78 blocks, partial coverage). Phase 1 ingests this as the SEED for `block_attributes.canonical_slot` + `derived_selector` for ~10 blocks with rich entries (hero, info-box, cta-section, heritage-strip headline, etc.). After Phase 1 ingest, the file becomes REFERENCE only — not edited going forward. Note: its `block_type` field is stale and must NOT be trusted (P1 captured correction). |
| `plugins/sgs-blocks/scripts/fingerprint-builder/output/layer-1-envelopes.json` | TO-RETIRE | Phase 3 | Spec 14 P3 output. |
| `plugins/sgs-blocks/scripts/fingerprint-builder/output/layer-3-internal-elements.json` | TO-RETIRE | Phase 3 | Same. |
| `plugins/sgs-blocks/scripts/fingerprint-builder/output/layer-4-inner-blocks.json` | TO-RETIRE | Phase 3 | Same. |
| `plugins/sgs-blocks/scripts/fingerprint-builder/output/role-templates.json` | TO-MIGRATE | Phase 1 | 20 role definitions with cross-platform recipes. Phase 1 migrates content into `property_suffixes` table (in DB) + per-role `equivalent_implementations` JSON; file becomes REFERENCE. |
| `tests/golden/hero-extraction-baseline.json` | DATA-SOURCE | — | Regression baseline for hero (74 attrs). Spec 15 P3 must preserve via `--verify-against` after hero override deletion. |
| `tests/golden/static-block-snapshots/*.json` | DATA-SOURCE | — | Spec 14 P1 ship — 9 static-block snapshots for FR12 deprecation safety. |
| `sites/mamas-munches/mockups/homepage/index.html` | DATA-SOURCE | Phase 4–5 | The first Bean-controlled draft. SGS-BEM compliant (post spec 13 P6 migration). |
| `sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md` | TO-RETIRE | Phase 4 | Per-mockup hand-written slot binding. Becomes redundant once Phase 4 enforcement gates ensure every mockup follows the convention. Archive after Phase 4 ships. |
| `sites/mamas-munches/research/sandybrown-media-map.json` | DATA-SOURCE | Phase 4–5 | WP attachment id ↔ mockup filename map for image resolution. |
| `theme/sgs-theme/styles/<client-slug>.json` | DATA-SOURCE | — | Per-client style variations. Consumed by Phase 1 default-inheritance lookup. |
| `theme/sgs-theme/patterns/*.php` | DATA-SOURCE | — | Pattern definitions. Consumed by `/sgs-update` Stage 5 (pattern composition). |

#### Databases

| DB | Path | Notes |
|---|---|---|
| **sgs-framework.db** | `~/.claude/skills/sgs-wp-engine/sgs-framework.db` (635KB) | Authoritative SGS framework metadata. Phase 1 extends `block_attributes` + adds 3 new vocab tables. |
| **uimax** (ui-ux-pro-max.db) | `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db` (3.4MB) | Cross-platform design intelligence DB. 5164 design_tokens + 67 SGS component_libraries rows + 63 animations rows. Phase 1 mirrors per-attribute canonical/role/signature; Phase 2 wires `/sgs-update` Stage 8 to keep mirror current. |

#### Plan files

**Cleanup 2026-05-12 (Option B):** plans/ tidied from 19 → 5 files. Spec 14 P5-P10 plans moved to `scratch/absorbed/` (their content is now inlined in Spec 15 plan §Phase 5 sub-phases). Spec 13 `-complete` files + Spec 13 P8 moved to `scratch/archive/` (shipped or low-priority reference; commit history covers them).

**Active in `.claude/plans/`:**

| File | Status | Notes |
|---|---|---|
| `spec-15-master-execution-plan.md` | ACTIVE | Truth doc for Phases 1-5 execution. |
| `phase-1-doc-recon-and-snapshots.md` | REFERENCE | Spec 14 P1 — shipped (commit `f467bc72`). Kept as commit-history anchor for `feat(p1)` references. |
| `phase-2-schema-and-recursion-guard.md` | REFERENCE | Spec 14 P2 — shipped (commit `15f4d6cf`). Kept as commit-history anchor for `feat(p2)`. |
| `phase-3-catalogue-build.md` | REFERENCE | Spec 14 P3 — shipped (commits `e0f26ec5` + `10819cbb` + `833fed21`). Kept as commit-history anchor for `feat(p3)`. |
| `phase-4-extract-refactor.md` | REFERENCE | Spec 14 P4 — shipped (commit `8e2e427a`). Kept as commit-history anchor for `feat(p4)`. |

**Moved to `.claude/scratch/absorbed/`** (Spec 14 P5–P10 — content inlined in Spec 15 plan §Phase 5; do NOT author new work against these):

- `phase-5-gap-detection.md` (now Spec 15 sub-phase 5a)
- `phase-6-staged-scaffolding.md` (now Spec 15 sub-phase 5b)
- `phase-7-lingua-franca.md` (now Spec 15 sub-phase 5c)
- `phase-8-wp-integration-wiring.md` (now Spec 15 sub-phase 5d)
- `phase-9-autonomy-and-visual-qa.md` (now Spec 15 sub-phase 5e)
- `phase-10-acceptance-harness.md` (now Spec 15 sub-phase 5f)

**Moved to `.claude/scratch/archive/`** (Spec 13 shipped + the never-started P8 — historical reference only):

- `phase-1-foundation-complete.md` through `phase-7-orchestrator-rewire-complete.md` (Spec 13 P1–P7 shipped)
- `phase-8-validation-and-deploy.md` (Spec 13 P8 — never started; validation aspects fully covered by Spec 15 Phase 4 + 5e + 5f)

#### Skills + commands referenced

| Skill | Status | Notes |
|---|---|---|
| `/sgs-update` | BUILT (extending in Phase 2) | Unified scanner; Phase 2 adds Stages 3+4+9+10. |
| `/sgs-clone` | BUILT (extending in Phase 4–5) | Orchestrator skill; Phases 4–5 add Stage 0.1+0.5 + E2E pipeline. |
| `/sgs-db` | BUILT | sgs-framework.db query helper. |
| `/wp-blocks` | BUILT | block.json query helper. |
| `/uimax` | BUILT | uimax query + ingest helper. |
| `/uimax-classify-naming` | BUILT | External-source convention identifier. |
| `/uimax-sgs-scrape-pattern` | BUILT | External-source pattern scraper + lingua-franca writer. |
| `/innovative-design` | BUILT (updating in Phase 4) | Output must conform to SGS-BEM per Phase 4 FR38. |
| `/library-docs` | BUILT | Context7-backed library docs lookup. Used in Phase 6 cross-platform vocabulary fill. |
| `/strategic-plan` | BUILT | Phase planning skill; will run after spec migration. |
| `/qc` | BUILT | Multi-stage QC pipeline; consumed at end of every phase. |
| `/delegate` | BUILT | Model dispatch decision rule; used in subagent assignment. |
| `/subagent-prompt` | BUILT | Cold prompt writer for subagent dispatches. |

#### Overlap / drift surfaced by this inventory

1. **`tools/recogniser/` (v1) — 7 scripts to retire.** Pre-spec-14 recogniser pipeline. Replaced by recogniser-v2 + /sgs-clone. Scheduled retirement: Spec 15 Phase 5 cleanup (move to `tools/recogniser-legacy/` or delete).
2. **`fingerprint-builder/` output JSONs — 4 files to retire.** Spec 14 P3 generated these. Phase 3 of Spec 15 moves the data into sgs-db; the JSON files + their generator scripts become historical.
3. **`pattern-fingerprint.py.ATTR_TO_CSS` dict — supersede in Phase 1.** Annotate as deprecated once `property_suffixes` table ships.
4. **TRUTH-SPEC.md (per-mockup) — retire after Phase 4.** Phase 4's draft-convention enforcement makes per-mockup hand-written bindings redundant.
5. **`master-spec14-build-plan.md` — absorbed into Spec 15.** Move to scratch with Specs 12/13/14.
6. **v1 fingerprints.json — DATA-SOURCE for Phase 1, then REFERENCE.** Don't delete (it's the seed data) but don't trust `block_type` field.

---

**Status:** APPROVED (v0.2, 2026-05-12). Bean locked the 6 §12B decisions; post-QC fixes applied (FR phase column, Phase 5 commit format, Phase 6 dependency clarity, 7 glossary additions, 1% visual parity tolerance, dependency wording). Next: migration steps in §D execute, then `/strategic-plan` produces phase-by-phase execution map, then ship Phase 1.
