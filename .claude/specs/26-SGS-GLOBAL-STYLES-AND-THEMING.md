---
doc_type: spec
spec_id: 26
spec_version: 1
title: SGS Global Styles & Per-Client Theming + Pipeline Style Derivation
project: small-giants-wp
status: draft
authors: Bean + Claude (Opus 4.8)
session_date: 2026-06-03
last_verified: 2026-06-03
status_history:
  - 2026-06-03: draft — design ratified via research-buddies + 4-persona council + CLI/abilities investigation + converter investigation; build DEFERRED (Bean scope call), spec is the target.
references:
  - specs/01-SGS-THEME.md            # §Per-site theme.json Model — D156 superseded by this spec
  - specs/11-SGS-BUTTON-ARCHITECTURE.md
  - specs/17-HEADER-FOOTER-ARCHITECTURE.md
  - specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md
  - specs/24-QUERY-DRIVEN-CONTENT-CARDS.md
  - specs/25-SGS-WOOCOMMERCE-EXPERIENCE-LAYER.md
  - plugins/sgs-blocks/scripts/push-theme-snapshot.py
  - plugins/sgs-blocks/scripts/orchestrator/css_router.py
  - plugins/sgs-blocks/scripts/orchestrator/token_resolver.py
  - plugins/sgs-blocks/scripts/orchestrator/variation_router.py
absorbs: []
absorbed_by: null
lock_reason: null
---

# Spec 26 — SGS Global Styles & Per-Client Theming + Pipeline Style Derivation

> **Supersedes Spec 01 §"Per-site theme.json Model" D156 "Live-style precedence".** That entry's "override precedence" framing was wrong. The correct model (this spec): the `wp_global_styles` user layer IS where a site's global styles live; `theme.json` is only the factory-default seed. When this spec ships, update Spec 01 to point here.
> **Build DEFERRED** (Bean, 2026-06-03) until after the active cloning phase closes — except FR-26-D1/D2 (low-risk urgent fixes). This spec is the TARGET architecture.
> **Provenance:** research-buddies (WP 7.0 global-styles, 13 sources) + a 4-persona design council (standards / agency-ops / pipeline-integration / non-coder-UX, all ranked Candidate C #1) + a CLI/abilities investigation + a converter-routing investigation, 2026-06-03.

## Problem statement

SGS is one custom WP 7.0 block theme serving many client sites. Two problems are tangled together:

1. **Wrong write-layer (live bug).** `push-theme-snapshot.py` SCP-overwrites `theme.json` on disk. But WordPress renders a site's global styles from the `wp_global_styles` database post (the Site-Editor user layer), which is merged ON TOP of `theme.json`. So a disk push is silently overridden for every property the post already defines — the push is a no-op the moment anyone has touched the Site Editor (confirmed on the sandybrown canary, post ID 7). The same push path is what the cloning pipeline (Spec 22 Stage 10) uses, so cloned sites' global tokens can silently fail to apply — plausibly inflating the cloning pixel-diff gate.
2. **Fork tax + a retired mechanism.** Each client is a FULL `theme.json` copy (`sites/<client>/theme-snapshot.json`), so every framework-baseline change must be hand-merged into all snapshots → drift. WP style variations — the canonical per-client mechanism — were retired (Decision 18) to fix what was actually a deploy-scoping bug, not a mechanism flaw.

## Corrected mental model (the foundation)

- **WP 7.0 merge order:** `default → blocks → theme (theme.json + style variations) → custom (wp_global_styles CPT)`. The merge happens in PHP (`WP_Theme_JSON_Resolver::get_merged_data('custom')`) and is THEN emitted as `global-styles-inline-css`. The user/custom layer wins at the **data** layer — it is **not** a CSS-specificity "override".
- **`theme.json` = factory-default seed; the `wp_global_styles` post = the live, edited house style** (the source of truth a site actually renders).
- **Per-instance block values** live in the block's own markup (inline `style`/classes) and win by inline specificity — the normal cascade. There is **no separate override layer**; an "override" is simply a real raw value set on one block instance.
- **WP 7.0 fix:** inspector controls now read the MERGED custom-origin value as their starting state (was a long-standing bug).

## Goals

1. The deploy/sync writes the layer WordPress actually renders (the `wp_global_styles` post), with a code-tracked source of truth and a round-trip pull.
2. Per-client brand is a small **style-variation delta**, not a full `theme.json` fork — framework-baseline changes propagate to all clients automatically.
3. Every global property is editable per-instance in the block editor, accepting raw CSS values, with brand presets prominent (the "Middle" path).
4. The cloning pipeline DERIVES a site's globals from the draft (repetition + hero-button position) and deploys them via the same sync.
5. WCAG-safe by default for the common case; the framework stays single-sourced.

## Non-goals

- Universal auto-contrast for any arbitrary light primary with zero per-client override (parked `P-AUTO-CONTRAST-LIGHT-PRIMARIES`). **DIRECTION DECIDED 2026-06-03 (Bean, D161): build-time luminance** — at deploy, compute the brand colour's WCAG relative luminance and pick black/white text per the contrast algorithm; layer CSS `contrast-color()` as a later progressive-enhancement once Baseline-safe. Build still deferred (with the rest of Spec 26) until the cloning phase closes.
- Replacing per-instance inline styles — they remain the highest layer by design.
- Fixing structural / InnerBlocks cloning gaps — separate (Spec 22) and dominate pixel-diff independently of styling.
- A new REST endpoint, a new WP Ability, or a Create Block Theme runtime dependency (see FR-26-A5).

## Hard constraints

- R-22-1 DB-first; R-22-9 universal mechanism; R-22-14 no legacy fallback hacks.
- WCAG 2.2 AA; mobile-first; vanilla JS; `viewScriptModule`.
- Clients use the block editor + Site Editor EXCLUSIVELY — never code/CLI.
- No client-specific values in the framework baseline `theme.json` or `style.css`.

---

## Functional Requirements

### Group A — Global-styles architecture (Candidate C)

**FR-26-A1 — Baseline + per-client variation delta.** One lean framework `theme.json` is the single-sourced factory default (WCAG-safe default colour pairings). Each client's brand is a per-client **style-variation delta** file (only the client's divergences from the baseline), replacing the full-`theme.json`-copy snapshot.
- *Done when:* `sites/<client>/` holds a delta (palette/typography/spacing divergences only), not a full theme.json copy; a change to the baseline `theme.json` reaches all clients on next deploy without editing any per-client file.
- *Model:* opus (architecture) for the delta-derivation design; sonnet for the migration.

**FR-26-A2 — Scoped variations (privacy-leak fix, supersedes Decision 18).** Reinstate WP style variations, but deploy ONLY the relevant client's variation file to that client's site, and suppress the Browse-Styles picker via a `block_editor_settings_all` filter (≈3 lines). This structurally closes the Decision-18 privacy leak (a deploy-scoping bug, not a mechanism flaw). Record a superseding note on Decision 18.
- *Done when:* a client site's editor shows only that client's variation (or none, picker hidden); no other client's brand is enumerable; `decisions.md` carries the Decision-18 superseding note.
- *Model:* sonnet.

**FR-26-A3 — Sync via the WP-native REST endpoint (extend `push-theme-snapshot.py`, ~40 lines).** No new endpoint/ability/plugin code; no Create Block Theme runtime dependency.
- **Push:** write the variation/`theme.json` on disk AND `POST /wp/v2/global-styles/{id}` (app-password auth from `.claude/secrets/sandybrown.env`) with the snapshot's `styles` + `settings`; resolve `{id}` from `_links.self` of the GET the script already performs.
- **Pull (round-trip):** add app-password auth to the existing `GET /wp/v2/global-styles/themes/{stylesheet}` so it reads the user layer and folds Site-Editor edits back into the client's variation delta.
- *Done when:* a push changes a live-visible style on the canary with no manual REST step; a pull captures a Site-Editor edit back into the delta file.
- *Model:* sonnet.

**FR-26-A4 — Pre-deploy guard.** Before any push, check `wp_global_styles` for user-edited content (`wp post list --post_type=wp_global_styles` or the REST GET); if present and divergent, WARN (don't silently overwrite).
- *Done when:* pushing to a site whose post has user edits surfaces a warning + requires confirmation before overwriting.
- *Model:* haiku.

**FR-26-A5 — WP-native surface confirmation (rationale, not a build item).** There is NO `wp global-styles` WP-CLI command, NO core "write global styles" Ability (the WP 7.0 Abilities/MCP adapter exists but ships no such ability), and Create Block Theme is GUI-only. The canonical programmatic surface IS the `/wp/v2/global-styles` REST endpoints — which is why FR-26-A3 extends the existing script rather than building new.
- *Done when:* (documentation requirement) the spec records this so no future session re-investigates or builds a redundant endpoint/ability.
- *Model:* n/a.

### Group B — Block styling model ("Middle" path)

**FR-26-B1 — Raw custom values enabled framework-wide.** `theme.json` `settings.color.custom` (+ `customGradient`, `customDuotone`), `settings.spacing.customSpacingSize: true`, full `spacing.units`, `appearanceTools: true` — so every colour/spacing control accepts raw hex/px, not only preset tokens. (Already set 2026-06-03 / D156 — this FR records + locks it.)
- *Done when:* a block colour/spacing control accepts a raw value (e.g. `420px`, `#3A2E26`) in the editor + persists.
- *Model:* sonnet.

**FR-26-B2 — Presets-prominent inspector UX.** Brand presets show first/prominent; a secondary "Custom" control reveals the raw picker. Brand swatches show on hover the attribute LABEL (e.g. "Global Primary", "Global Background", "Heading 2 text colour/size/weight") AND the hex value.
- *Done when:* opening a colour control shows brand swatches first; hovering a swatch shows its label + hex; "Custom" reveals a raw picker.
- *Model:* sonnet (editor UX).

**FR-26-B3 — Overridable-default custom-property pattern.** Every framework default colour/spacing is `property: var(--sgs-x, <default>)`; a per-instance value wins via the normal cascade. No separate override layer.
- *Done when:* a per-instance value visibly wins over the global default with no `!important`; unset properties fall through to the default var.
- *Model:* sonnet.

**FR-26-B4 — Per-block raw-control lint-gate (structural QC).** Every global property a block can be affected by MUST expose a per-instance control that accepts RAW values (not token-presets-only), across all ~68 blocks. Enforced as a QC gate, not per-block discipline. (Memory `block-style-controls-accept-raw-css-and-overridable`.)
- *Done when:* a QC script asserts, per block, that each affecting global property has a raw-accepting control; a non-conforming block fails the gate.
- *Model:* sonnet (gate authoring).

**FR-26-B5 — WCAG contrast linter.** Flag any palette colour paired with white/light text that fails 4.5:1. Framework default is white-on-primary (WCAG-safe for saturated primaries); light-pastel primaries require a per-client dark-text value in their variation. Ties to `P-AUTO-CONTRAST-LIGHT-PRIMARIES`.
- *Done when:* the linter flags a failing palette/text pairing at deploy time + names the per-client override needed.
- *Model:* haiku.

**FR-26-B6 — Inspector reads the merged custom-origin value (WP 7.0).** SGS custom inspector panels MUST read the MERGED custom-origin value (`wp_get_global_styles` / `useSettings`) as the control's initial state — never the raw `theme.json` default.
- *Done when:* a control's initial value reflects a Site-Editor global override, not the theme.json seed.
- *Model:* sonnet.

### Group C — Pipeline style derivation ("emit raw → derive globals from repetition")

**FR-26-C1 — Converter emits raw values.** The converter emits raw per-block values; remove the per-attribute mid-walk snap from the hot path (it cannot see repetition).
- *Done when:* a converted page's block attributes carry raw extracted values; no mid-walk token-snap gates them.
- *Model:* sonnet.

**FR-26-C2 — Derive-globals post-pass (repetition).** After markup render, before Stage 10 deploy, cluster emitted values by `(block-family/element-type, attr)` across the whole page, compute the dominant value, and PROMOTE it to the global default when it is dominant by a TUNABLE threshold (default ≥3 occurrences AND ≥60% of instances). Tie-break (no clear majority) → keep the framework default.
- *Done when:* on a draft with N identically-styled `<h2>`, the post-pass promotes that style to the global Heading-2 default; an outlier h2 does not.
- *Model:* opus (clustering/threshold design) → sonnet (build).

**FR-26-C3 — Hero-button-position rule (builds a confirmed gap).** The hero section's FIRST button DEFINES the site-wide global PRIMARY button preset; the SECOND button DEFINES the SECONDARY preset — by POSITION, not frequency (only ~2 exist, so FR-26-C2's frequency rule won't fire). Today the pipeline only makes cloned buttons REFERENCE existing presets (`inheritStyle`, D147); deriving the preset VALUES from the hero buttons is NOT implemented — this FR specifies building it.
- *Done when:* cloning a draft writes the hero left/right button styling into the client variation's primary/secondary button preset values; cloned buttons site-wide inherit them.
- *Model:* sonnet.

**FR-26-C4 — Token-snap inside the post-pass.** Token resolution (raw hex → `var(--wp--preset--color--primary)` when it matches a palette token) still runs — once per cluster in the post-pass, not per block.
- *Done when:* a clustered value that matches a palette token deploys as the token reference, not a raw literal.
- *Model:* sonnet.

**FR-26-C5 — Write promoted globals to the variation delta.** Extend `variation_router.py` to handle `styles.elements.*` (e.g. h2 typography) and `settings.custom.buttonPresets.*` (it handles only palette/spacing/font-size/shadow/font-family today). Promoted globals write to the per-client variation delta and deploy via FR-26-A3.
- *Done when:* `variation_router` writes an `styles.elements.h2` and a `buttonPresets.primary` entry; FR-26-A3 deploys them live.
- *Model:* sonnet.

**FR-26-C6 — Per-instance override only on divergence.** Emit a raw per-instance value on a block ONLY where it diverges from the derived global; matching blocks inherit the global.
- *Done when:* a block matching the derived global carries no redundant inline value; a divergent block carries its raw override.
- *Model:* sonnet.

**FR-26-C7 — Documented caveats (constraints).** Thresholds configurable per run (not hardcoded); single-page/homepage-bias acknowledged (deriving site-wide globals from one draft page); this does NOT fix structural/InnerBlocks gaps.
- *Done when:* the post-pass reads thresholds from run config; the homepage-bias limitation is noted in the deploy report.
- *Model:* n/a (constraint).

### Group D — Urgent fixes (low-risk; do before the deferred migration)

**FR-26-D1 — Canary contamination — RESOLVED / MOOT (verified 2026-06-03, do NOT clear post 7).** The council's recommendation was "clear `wp_global_styles` post 7 so `theme.json` renders." **Verification inverted that:** the canary's `theme.json` already carries Mama's FULL brand palette (`theme:primary`, `theme:surface-pink`, `theme:accent`, …) AND the WCAG CSS (len ~2273), and post 7 MIRRORS the same tokens — because this session's Mama's WCAG work (D157-adjacent) wrote BOTH layers, which synced them. So the canary already renders Mama's brand correctly from both layers; the colour-contamination the council feared was real *before* this session but is **already resolved**. **Clearing post 7 is therefore unnecessary AND risky** (no render benefit; the canary is shared with the cloning thread) — do NOT do it. The cloning pixel-diff is NOT colour-contaminated currently.
- *Done when:* (verified) `GET /wp/v2/global-styles/themes/sgs-theme` shows `theme:*` Mama slugs + the WCAG css; post 7 mirrors them. No action.
- *Residual risk this leaves:* the two layers are synced ONLY because both were hand-written this session; without FR-26-D2 they will RE-DIVERGE on the next `push-theme-snapshot` (disk-only) or any Site-Editor edit. FR-26-D2 is the durable fix.
- *Model:* n/a.

**FR-26-D2 — REST-write extension to `push-theme-snapshot.py`.** The FR-26-A3 push half (write the live `wp_global_styles` post). Closes parking `P-PUSH-SNAPSHOT-SKIPS-GLOBAL-STYLES`.
- *Done when:* a `push-theme-snapshot` run changes a live style on the canary via the post, verified live.
- *Model:* sonnet.

---

## Architecture

```
Framework theme.json (baseline, single-sourced, WCAG-safe)        ← seed (code)
        +
sites/<client>/<client>.json  (style-variation DELTA, git-tracked) ← per-client source of truth (code)
        │  push-theme-snapshot.py (extended, ~40 lines)
        │    push → POST /wp/v2/global-styles/{id}  (writes the LIVE layer)
        │    pull → GET  /wp/v2/global-styles/themes/{slug} (round-trip)
        │    guard → warn if the post has user edits before overwrite
        ▼
wp_global_styles post (Site-Editor user layer)  ← what the site RENDERS
        ▲
        │  cloning pipeline (Spec 22):
        │    converter emits RAW → derive-globals post-pass (repetition + hero-button position)
        │    → writes the variation delta → deploys via the sync above
Block editor: presets prominent + raw available; per-instance wins via cascade;
              controls read the merged custom-origin value (WP 7.0).
```

## Acceptance criteria

1. A `push-theme-snapshot` run changes a live-visible global style on the canary with no manual REST step (FR-26-A3/D2).
2. A baseline `theme.json` change propagates to all clients on next deploy without editing any per-client file (FR-26-A1).
3. No client's brand is enumerable in another client's editor (FR-26-A2).
4. A block colour/spacing control accepts a raw value; presets show first; per-instance wins via cascade (FR-26-B1/B2/B3).
5. The QC lint-gate fails a block missing a raw-accepting control for an affecting global property (FR-26-B4).
6. Cloning a draft with N identical h2s sets the global Heading-2 style; the hero's two buttons set the primary/secondary presets; outliers keep raw overrides (FR-26-C2/C3/C6).
7. The canary pixel-diff is measured against a page rendering the intended global tokens (FR-26-D1).

## Phasing (build deferred — Bean scope call)

- **Now (low-risk):** FR-26-D1 (clear canary post) + FR-26-D2 (REST-write extension). Coordinate D1 with the cloning thread.
- **Phase 1 (post cloning-phase close):** FR-26-A1/A2/A3/A4 (variation-delta migration + sync + guard) — a dedicated session; it re-baselines the pixel-diff, so not during the active cloning phase.
- **Phase 2:** FR-26-B group (block-styling model + lint-gate + WCAG linter).
- **Phase 3:** FR-26-C group (pipeline derivation + hero-button presets) — depends on Phase 1's variation/sync.

## Open Questions

1. Variation-delta granularity: a registered WP style variation file vs a child-theme `theme.json` delta — both work; the council favoured a style variation for a solo non-coder. Confirm at Phase-1 planning.
2. Per-site `wp_global_styles` post-ID discovery in the deploy script: `_links.self` from the themes GET vs an explicit `wp eval` resolver call — pick the more robust at build.
3. FR-26-C2 thresholds (≥3 / ≥60%) need empirical calibration against real draft pages before locking defaults.

## Supersedes / cross-references

- **Supersedes** Spec 01 §"Per-site theme.json Model" D156 "Live-style precedence" wording (the "override precedence" framing). Update Spec 01 to reference this spec when shipped.
- **Decision 18** (variation retirement) gets a superseding note (FR-26-A2): it over-corrected a deploy-scoping bug.
- Cross-ref: Spec 22 (cloning pipeline / Stage 10 deploy), Spec 11 (button presets), Spec 17 §S1 FR-S1-4 (skip-link — separate header concern), Spec 24/25 (product/WooCommerce layer use these globals).
- Parking: `P-PUSH-SNAPSHOT-SKIPS-GLOBAL-STYLES` (closed by FR-26-D2), `P-AUTO-CONTRAST-LIGHT-PRIMARIES` (related, still deferred).
- Memories: `canary-live-styles-come-from-wp-global-styles-post`, `block-style-controls-accept-raw-css-and-overridable`.
