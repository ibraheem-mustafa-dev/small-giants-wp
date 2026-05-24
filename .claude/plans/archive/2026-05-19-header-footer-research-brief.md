---
doc_type: research-brief
project: small-giants-wp
date: 2026-05-19
session_tag: small-giants-wp-2026-05-19-phase-9b-foundation
phase: header-footer-architecture
streams:
  - stream-1-wp-canonical
  - stream-2-gold-standard-themes
  - stream-3-internal-gaps
status: ready-for-spec-writer
---

# Header/Footer Architecture — Research Brief

This brief consolidates findings from three parallel research streams run on 2026-05-19. It is the input document for `/spec-writer` (Phase B) which will draft the canonical SGS header/footer architecture spec, gated by a multi-model `/qc` council.

## 1. The architecture answer in one sentence

The WP 6.9 canonical composition for "activate a style variation → seed the correct header/footer initial content, while keeping operators free to edit" is:

**Block patterns (with `blockTypes` annotation) for discovery + the `save_post_wp_global_styles` action hook as the trigger + a `wp_template_part` post-type write for execution + block bindings for site-wide data fields (phone/address/email).**

Nothing in this stack locks the Site Editor. Operators retain "Replace", in-place edit, and "Revert to default" at all times.

## 2. Mechanism stack — what each layer does

| # | Layer | Role | WP version |
|---|------|------|------------|
| 1 | `parts/header.html` + `parts/footer.html` | Framework defaults — should be MINIMAL (per Stream 3 gap #2). Use TT5 pattern-delegation: each file is a single `wp:pattern` reference; real markup lives in registered patterns | 5.9+ |
| 2 | `theme.json` `templateParts[]` | Register the named template-part areas. **Each `area` must have at least 2 patterns with matching `blockTypes` to unlock the native "Replace" toolbar quick-swap** | 6.0+ |
| 3 | `register_block_pattern()` with `blockTypes: ['core/template-part/header']` | Surfaces client-specific patterns (`mamas-munches-header.php`, `indus-foods-header.php`) in the Site Editor's "Replace" picker | 5.9+ |
| 4 | `save_post_wp_global_styles` action hook | Fires when an operator activates / saves a style variation in the Site Editor → reads active variation via `WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles()` → triggers seeding | 5.9+ (hook), 5.9+ (resolver) |
| 5 | `wp_insert_post()` into `wp_template_part` + `wp_set_object_terms()` for `wp_template_part_area` | Writes the seeded markup. Once written, this DB record wins over the theme file. Must guard against overwriting existing operator customisations | 5.9+ |
| 6 | `register_block_bindings_source()` | Custom source `sgs/site-info` reads per-site data (phone, email, address, opening hours) from `wp_options`. Patterns carry the binding, not the literal data — eliminates personal-data hardcoding (Stream 3 gap #4) | 6.5+ |
| 7 | (No Customiser) | Block themes route style choices through the Site Editor's Styles panel. `active_theme_style` legacy `theme_mod` is replaced by reading active variation from `wp_global_styles` directly | n/a |

## 3. Multi-site / multi-client isolation

**Already handled by WP's native CPT-per-site model.** Each WordPress install has its own `wp_template_part` records, scoped by `theme` field. There is no cross-install leakage by construction. The Stream 3 gap #4 ("client patterns hardcode personal data") is solved by layer 6 above: patterns carry block-binding placeholders, not literal data; per-site `wp_options` populates the values.

## 4. The native "Replace" toolbar quick-swap (cheapest win)

Stream 2 surfaced this as the highest-ROI feature: the Site Editor's "Replace" toolbar button automatically activates whenever two or more patterns are registered with matching `blockTypes` for the same area. Zero custom code. SGS currently ships only one `header.html` and one `footer.html` — registering 2-3 more variants to each area unlocks the picker immediately.

## 5. Operator workflow (plain English, post-spec)

1. Operator activates Mama's style variation in Site Editor → Styles panel → click variation
2. `save_post_wp_global_styles` fires → SGS reads the active variation → checks the matching header/footer pattern → writes `wp_template_part` records seeded with that pattern's content
3. Operator opens the header in Site Editor — sees Mama's header pattern, fully editable
4. To switch to a different pattern: toolbar → "Replace" → pick another registered header pattern
5. To edit content: in-place block editing
6. To reset: "Revert to default" (appears when DB override exists)
7. Per-site data (phone, email, address) lives in `wp_options` — patterns render it via `sgs/site-info` block binding. Editing phone in WP admin updates it everywhere

## 6. Best ideas from the gold-standard corpus (Stream 2)

Eight patterns to consider in spec design, ranked by SGS fit:

| Rank | Idea | Source | Spec section |
|------|------|--------|--------------|
| 1 | **Native "Replace" toolbar quick-swap** — register ≥2 patterns per area | TT5 / WP 6.7 native | Template Parts Architecture |
| 2 | **Pattern-delegation** — `header.html` is a single `wp:pattern` reference, real markup is the pattern | TT5 | Framework Defaults |
| 3 | **Two-axis composability** — colours/fonts decouple from header/footer layout; mix any combination | Ollie | Style Variation → Template Part Linkage |
| 4 | **Independent colour + typography presets** — split `/styles/colors/` and `/styles/typography/`; 8 × 9 = 72 combos from 17 files | TT5 + Ollie | Operator UI |
| 5 | **CPT-based advanced headers (`sgs_header` CPT)** — for mega-menu/transparent-hero/sticky variants too complex for template-part patterns | Kadence | Migration & Backward-Compatibility (or future P2) |
| 6 | **Conditional display rules** — show Header A on homepage, B on shop | Blocksy | Future feature, not v1 |
| 7 | **Public browseable pattern library** — marketing/client-conversation tool | Frost | Out of spec scope; marketing concern |
| 8 | **Child-theme-per-client model** | Ona | Rejected for SGS — adds upgrade complexity; spec stays single-theme + variations |

## 7. The 8 gaps the spec must resolve (Stream 3 + add-on)

| Gap # | Description | Severity | Spec section |
|-------|-------------|----------|--------------|
| 1 | No automatic linkage between style variation and header/footer | High | Style Variation → Template Part Linkage |
| 2 | Framework default `parts/footer.html` is Indus-Foods-shaped — every new site inherits the wrong thing | High | Framework Defaults |
| 3 | `theme.json` registers `header-sticky` / `header-transparent` / `header-shrink` but no `.html` files exist | High | Template Parts Architecture |
| 4 | Client patterns hardcode personal data (emails, addresses, URLs) | High | Multi-Client Isolation |
| 5 | No `customize_register` for `active_theme_style` — only WP-CLI/DB can set it | Medium | Operator UI |
| 6 | Inconsistent slug namespacing (`sgs/` vs `sgs-theme/`) | Medium | Slug & Namespace Conventions |
| 7 | "Invalid block" warning likely caused by stored-block schema mismatch with current plugin | Medium | Migration & Backward-Compatibility |
| 8 (add-on) | No versioning strategy for theme.json or block attributes when framework evolves | High | Migration & Backward-Compatibility |

## 8. Spec sections to produce

`/spec-writer` should output a spec with these 7 sections (one per group):

1. **Framework Defaults** — addresses gaps #2, #3
2. **Style Variation → Template Part Linkage** — addresses gap #1
3. **Template Parts Architecture** — addresses gaps #3, #6
4. **Multi-Client Isolation** — addresses gap #4
5. **Operator UI** — addresses gap #5
6. **Slug & Namespace Conventions** — addresses gap #6
7. **Migration & Backward-Compatibility** — addresses gaps #7, #8

## 9. Council evaluation dimensions

Bean specified the multi-model `/qc` council must evaluate the spec on these dimensions:

1. User-friendliness for site owners (non-coder operators)
2. AI agent setup (works cleanly for our automated cloning + maintenance flow)
3. Cloning process compatibility (the converter pipeline can land header/footer markup without breaking editability)
4. Multi-client isolation (different clients on the same theme don't cross-contaminate)
5. Latest WP version features (WP 6.9 — register_block_template, block bindings, block hooks, Style Engine)
6. Security (capability checks, nonces, sanitisation, no SSRF/XSS surface)
7. Code quality (no hardcoded client strings in framework, proper BEM, consistent conventions)

## 10. Out-of-scope for this spec

- Conditional header rules (Blocksy-style) — defer to v2
- CPT-based advanced headers — defer to v2 unless a specific client needs mega-menu + sticky + transparent variants
- Public pattern library marketing page — separate effort
- Style-engine optimisations — covered separately

## 11. Inputs the spec writer should pull during drafting

- This brief (canonical input)
- Stream 1 full report (WP-canonical mechanisms, ~1500 words)
- Stream 2 full report (gold-standard themes, ~2000 words)
- Stream 3 full report (gap consolidation, ~500 words)
- Existing `theme/sgs-theme/parts/header.html` + `footer.html` (current framework defaults)
- Existing `theme/sgs-theme/patterns/header-mamas-munches.php` + `footer-mamas-munches.php` (client examples)
- `theme/sgs-theme/styles/*.json` (existing style variations)
- `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` §8.1 (SGS-BEM naming convention)
- `.claude/CLAUDE.md` (project rules, especially the "No hard-coded client strings in framework" rule)

## 12. Notes

- **Block bindings** are the unlock for personal-data hardcoding gap (#4). Patterns reference bindings; per-site `wp_options` carries the values. One pattern works for every client.
- **Save-on-variation-change hook** must guard against overwriting operator customisations. Suggested guard: only seed if `wp_template_part` post does not exist for that slug+theme, OR if a `sgs_last_seeded_at` post meta is older than the variation's `post_modified`.
- **Backwards-compat for existing sites:** current SGS sites have customised template parts in their DB. The spec must include a migration path that does NOT wipe operator edits.

---

*End of brief. Ready for `/spec-writer`.*
