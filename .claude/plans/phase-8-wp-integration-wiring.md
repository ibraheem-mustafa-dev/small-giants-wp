---
doc_type: phase-plan
phase_id: 8
project: small-giants-wp
parent_spec: .claude/specs/14-CLONING-PIPELINE-CATALOGUE.md
parent_plan: .claude/plans/master-spec14-build-plan.md
title: Phase 8 — WP integration wiring (FR22/23/24/25/27/28/30/34)
session_date: 2026-05-11
plan_label: PLAN sonnet
estimated_minutes: 240-300
---

# Phase 8 — WP integration wiring

**USP:** Connects the catalogue + extraction layer to WordPress's native capabilities. Token-aware extraction, supports-first attribute writing, SGS-BEM modifier semantics for buttons + dynamic links, /wp-blocks CLI integration, block variations, lightbox/duotone routing, /wp-theme-check as token authority.

**Plan label:** `[PLAN: sonnet]` — mostly wiring to existing CLIs; some judgement on resolver chains.

**Success criteria:**

- [ ] FR22 token resolver covers all 11 theme.json surfaces (palette, font sizes, font families, spacing, shadows, gradients, border-radius, duration, easing, transition, button-presets)
- [ ] FR22 writes per-client overrides to active style variation file at `theme/sgs-theme/styles/<client>.json`, NEVER to root theme.json (verified by post-merge git diff check at FR21)
- [ ] FR23 supports-first attribute writer routes to native WP attribute paths before falling through to custom block.json attributes
- [ ] FR24 button-role modifier extraction: `.sgs-button__cta--primary` → block attribute `role='primary'`; render.php applies framework default styling
- [ ] FR25 dynamic-link modifier extraction: `.sgs-button__cta--latest-blog` → block attribute `linkTarget='latest-blog'`; render.php resolves WP_Query
- [ ] FR27 wires 8 `/wp-blocks` subcommands into pipeline stages (match, tokens, impact, validate, gaps, weaknesses, variations, health)
- [ ] FR28 block-variation matcher checks existing `variations` array before declaring a fresh attribute set
- [ ] FR30 lightbox / duotone / appearanceTools native routing
- [ ] FR34 `/wp-theme-check presets` is FR22's authoritative token source (not raw theme.json)
- [ ] Commit: `feat(p8): WP integration wiring across 8 FRs`

**Entry context:** Spec 14 FR22/23/24/25/27/28/30/34. P3 catalogue (role-templates carries the resolution recipes). P4 extract.py refactored. `/wp-blocks` CLI + `/wp-theme-check` CLI.

**Tooling Index:** Python + Edit + /wp-blocks + /wp-theme-check + /sgs-db + git.

---

## Step 1 — [SESSION-START] Pre-flight + inventory current state

```
Step 1 — Pre-flight + inventory
  Model:       inline
  Action:      Master pre-flight. Run `/wp-theme-check presets theme/sgs-theme/theme.json --json` to capture the current token surface inventory. Save to `pipeline-state/p8-token-inventory.json` for reference during build.
  Outcome:     Token inventory captured
  Marker:      SESSION-START
  Time:        10 min
  Cold-Entry:  master plan + spec 14 FR22-FR34
```

## Step 2 — FR22 + FR34 token resolver

```
Step 2 — Token resolver
  Model:       sonnet
  Action:      Implement `resolve_to_token(css_value, prop_kind, active_variation, token_inventory)` at `tools/recogniser-v2/token_resolver.py`. Logic:
    1. Load `/wp-theme-check presets` output (cached at p8-token-inventory.json) — this is the authoritative list of CSS custom properties WP generates at runtime
    2. For each css_value passed in (a hex/px/font-name/etc.), check the token inventory for a match within tolerance:
       - Colour: hex distance ≤ 5 in RGB space → use the matching var()
       - Spacing: exact px match OR closest token in the spacing scale (within ±2px)
       - Font: exact family name match
       - Font-size: exact px or rem match
       - Shadow / gradient / radius / duration / easing / transition: exact string match
    3. Per-variation awareness: if active style variation overrides a token, that variation's value wins; resolver returns the same var() reference (the variation's overlay handles the actual value swap at render time).
    4. Returns: tuple (token_reference, confidence). token_reference is the `var(--wp--preset--...)` or `var(--wp--custom--...)` string; or None if no match within tolerance. Confidence 1.0 on exact match, 0.9 on close match, 0.0 on miss.
  Files:       tools/recogniser-v2/token_resolver.py (new, ~250 LOC)
  Outcome:     Function exists; smoke test against Mama's known colours/spacings produces correct token references
  Time:        60 min
  Tooling:     Write tool + Python json
  Test:
    Happy:       Mama's primary colour `#E68A95` → `var(--wp--preset--color--primary)` (assuming variation maps primary to that hex)
    Edge:        Off-palette colour `#F0F0F0` → no token match → returns None; extractor falls back to inline hex
    Fail:        Token inventory file missing → halt + run /wp-theme-check first
    Integration: Stage 6 CLASSIFY calls this on every colour/spacing/typography CSS value
```

## Step 3 — FR22 write-path: per-client variation file routing

```
Step 3 — Variation-file writer
  Model:       sonnet
  Action:      Implement `write_per_client_override(client_slug, target_path, value, run_id)` at `tools/recogniser-v2/variation_writer.py`. Writes ONLY to `pipeline-state/<run-id>/staging/theme/sgs-theme/styles/<client-slug>.json` (variation file). NEVER to staging path that mirrors root theme.json. Reads existing variation file (canonical) if it exists; merges new overrides; writes to staging. If no variation file exists for the client, creates an empty overlay at staging.
  Files:       tools/recogniser-v2/variation_writer.py (new, ~120 LOC)
  Outcome:     Function exists; smoke test writes a colour override to a fake client's staged variation file
  Time:        35 min
  Tooling:     Write tool + Python json
  Test:
    Happy:       Override `styles.blocks.sgs/hero.color.text` → staged client variation file has that path populated
    Edge:        Variation file doesn't exist → created empty + populated
    Fail:        Caller attempts to write to root theme.json → raise typed exception (hard refuse)
    Integration: FR21 staged-merge moves the variation file from staging to canonical on PASS
```

## Step 4 — FR23 supports-first attribute writer

```
Step 4 — Supports-first writer
  Model:       sonnet
  Action:      Implement `route_attribute_write(block_slug, attr_role, value, run_id)` at `tools/recogniser-v2/supports_first.py`. Decision tree:
    1. If attr role corresponds to a native WP supports capability (color.background, color.text, spacing.padding, typography.fontSize, border.*, etc.) AND the block's block.json already has the matching `supports.*` enabled OR theme.json has `appearanceTools=true` (which unlocks most natively), THEN write to the block instance's `attrs.style.<path>` (native WP path)
    2. ELSE write to per-client variation file via FR22 variation_writer for clone-wide values, OR to a new custom block.json attribute via FR12 attribute_applicator for per-block schema additions
    3. Prefer the LOWEST stable level: variation overrides for clone-wide; per-instance attrs for block instances
  Files:       tools/recogniser-v2/supports_first.py (new, ~150 LOC)
  Outcome:     Function exists; smoke test routes common cases correctly
  Time:        45 min
  Tooling:     Write tool + Python json
  Test:
    Happy:       Background colour on a wrapper → native `attrs.style.color.background`; novel hover-shadow → custom block.json attribute via FR12
    Edge:        appearanceTools=true catches typography even without per-block supports → native path
    Fail:        Unrecognised role → defaults to custom attribute path + logs
    Integration: Stage 6 CLASSIFY calls this for every Bucket A entry
```

## Step 5 — FR24 button-role modifier extractor

```
Step 5 — Button role extractor
  Model:       sonnet
  Action:      Implement role-modifier extraction in extract.py via the `enum_class_probe` strategy (from P4 Step 4). For sgs/button-bearing elements, parse class names matching `.sgs-button__cta--<modifier>` regex. Map `<modifier>` to block's `role` attribute enum. Update `sgs/button` block.json to include `role` attribute with enum `["primary","secondary","tertiary","ghost"]` if not present. Update `sgs/button/render.php` to apply `is-style-<role>` class from theme.json `settings.custom.buttonPresets`.
  Files:       tools/recogniser-v2/extract.py (modify enum_class_probe to handle role modifiers)
              plugins/sgs-blocks/src/blocks/button/block.json (add `role` attribute)
              plugins/sgs-blocks/src/blocks/button/render.php (apply role class)
  Outcome:     `.sgs-button__cta--primary` extracts to `role='primary'`; renders with framework default primary button styling
  Time:        45 min
  Tooling:     Edit + Python
  Test:
    Happy:       Mama's primary CTA → role=primary on the staged block instance
    Edge:        Modifier value not in enum → emit as gap-candidate (new role to add) + flag for operator review
    Fail:        block.json edit breaks existing posts → deprecated.js via FR12 (sgs/button is dynamic so safe)
    Integration: extract.py dispatcher already routes via role; just enables the path for buttons
```

## Step 6 — FR25 dynamic-link modifier extractor

```
Step 6 — Dynamic-link extractor
  Model:       sonnet
  Action:      Implement `linkTarget` attribute extraction. For link-bearing blocks (sgs/button, sgs/card-grid item, etc.), parse class names matching `.sgs-button__cta--<linkTarget>` where linkTarget matches the enum (latest-blog, latest-post, newest-product, featured-product, popular-this-week, most-viewed-post, homepage, shop, contact, custom). Update block.json to include `linkTarget` attribute. Update render.php with a `resolve_link_target($target)` helper that maps enum value → WP_Query call → URL string. Default `custom` falls back to the literal href.
  Files:       plugins/sgs-blocks/src/blocks/button/block.json (add `linkTarget`)
              plugins/sgs-blocks/src/blocks/button/render.php (add resolver)
              tools/recogniser-v2/extract.py (handle linkTarget modifier)
  Outcome:     `.sgs-button__cta--latest-blog` → linkTarget=latest-blog; render.php returns the latest published post URL
  Time:        45 min
  Tooling:     Edit + PHP WP_Query
  Test:
    Happy:       Button with latest-blog modifier renders pointing at latest post
    Edge:        No published posts → graceful fallback (render returns # or homepage URL with logged warning)
    Fail:        WP_Query fails → catch + fallback to homepage URL
    Integration: FR12 attribute auto-application adds linkTarget attr to existing blocks via gap-candidate flow if new modifier values appear
```

## Step 7 — FR27 /wp-blocks CLI integration

```
Step 7 — /wp-blocks wiring
  Model:       sonnet
  Action:      Add helper module `tools/recogniser-v2/wp_blocks_client.py` exposing 8 functions, each a wrapper around `/wp-blocks <subcommand>`: `match(description)`, `tokens(variation=None)`, `impact(slug)`, `validate(markup)`, `gaps(industry)`, `weaknesses()`, `variations(query)`, `health()`. Each returns parsed JSON output. Wire calls into existing pipeline stages:
    - Stage 1 BOUNDARY: also call `match()` alongside convention voter for richer recognition
    - Stage 2 MATCH: enrich confidence-matrix with `impact()` outputs for downstream pre-flight
    - FR22: source token inventory via `tokens(variation)` (per-variation aware)
    - FR12 + FR14: pre-flight via `impact(slug)` to gauge blast radius
    - FR11 + FR14: post-scaffold via `validate(markup)` for serialisation correctness
    - FR9 leftover bucket router: enrich with `gaps(industry)` + `weaknesses()`
    - FR28: search existing via `variations(query)` before declaring fresh attribute set
    - FR15 pre-flight: `health()` as DB sanity check
  Files:       tools/recogniser-v2/wp_blocks_client.py (new, ~250 LOC)
              sgs-clone-orchestrator.py (wiring at multiple stage handlers)
              leftover-bucket-router.py (enrichment)
  Outcome:     8 helper functions exist; subprocess invocations succeed; pipeline stages enriched
  Time:        60 min
  Tooling:     Write tool + Python subprocess
  Test:
    Happy:       Each helper returns parseable output on a smoke fixture
    Edge:        /wp-blocks subcommand returns error → helper returns None + logs; pipeline continues
    Fail:        /wp-blocks executable missing → halt at pre-flight with clear error
    Integration: Cross-cuts all pipeline stages; failure tolerance important
```

## Step 8 — FR28 block-variation matcher

```
Step 8 — Variation matcher
  Model:       sonnet
  Action:      In Stage 2 MATCH, before declaring a fresh attribute set for a section, query `/wp-blocks variations <block-name>` to enumerate the block's registered variations. Compare extracted attribute set + DOM shape against each variation's attribute defaults. If a variation matches within tolerance (≥ 80% attribute overlap), emit the match as `{name: 'sgs/hero', variation: 'split-image'}` instead of staging fresh attributes.
  Files:       sgs-clone-orchestrator.py Stage 2 handler (modified)
  Outcome:     Variation matches emit when applicable; reduces unnecessary attribute scaffolding
  Time:        30 min
  Tooling:     Edit + /wp-blocks variations call
  Test:
    Happy:       Mama's hero matches an existing sgs/hero variation if one fits → no fresh attrs needed
    Edge:        No variation matches → fall through to fresh attribute path (existing behaviour)
    Fail:        /wp-blocks variations returns malformed output → log + fall through
    Integration: Cleaner Stage 2 output; less FR12 work downstream
```

## Step 9 — FR30 lightbox + duotone + appearanceTools native routing

```
Step 9 — Native feature routing
  Model:       sonnet
  Action:      Extend FR23 supports-first routing to recognise three more native paths:
    - Lightbox: if mockup section has a lightbox-shaped wrapper around an image, route to `core/image`'s `lightbox` attribute (theme.json `settings.lightbox.enabled=true`)
    - Duotone: if computed colour suggests a duotone filter, route to `core/image`'s `style.color.duotone` matching a theme.json `settings.color.duotone` preset
    - appearanceTools: typography/border/dimensions controls already unlocked by `appearanceTools=true`; ensure FR23 prefers these native paths
  Files:       tools/recogniser-v2/supports_first.py (extended)
  Outcome:     Lightbox + duotone + native typography route via native WP paths
  Time:        30 min
  Test:
    Happy:       Lightbox image in mockup → core/image attribute, not custom JS layer
    Edge:        Duotone preset doesn't exist in theme.json → emit as gap-candidate (new duotone preset to add)
    Fail:        Native path detection misfires → falls through to custom attribute (acceptable)
    Integration: Cleaner output; respects WP native capabilities
```

## QA Gate — P8 acceptance

```
QA Gate — P8
  Model:       sonnet
  Check:       Run smoke test invoking each new helper. Verify: (a) token_resolver returns valid var() refs; (b) variation_writer refuses root theme.json; (c) supports_first routes correctly; (d) button + dynamic-link modifiers extract; (e) wp_blocks_client subprocesses succeed; (f) variation matcher returns matches when applicable
  Pass:        6/6 smoke conditions PASS
  Marker:      QA
```

## Step 10 — [HANDOFF] Commit P8

```
Step 10 — Commit
  Action:      Stage all P8 files. Commit `feat(p8): WP integration wiring — tokens, supports-first, modifiers, /wp-blocks, variations, native routing`. Push.
  Marker:      HANDOFF
  Time:        3 min
```
