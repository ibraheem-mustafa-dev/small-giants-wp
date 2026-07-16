---
doc_type: phase-report
phase: 4.5
date: 2026-05-12
project: small-giants-wp
spec: .claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md
---

# Phase 4.5 — Token discovery + additive registration

Companion to Phase 4 (convention enforcement gates). Phase 4.5 makes the token-lint **additive** rather than **verdict-based**: non-token values become new-token-candidates written to the client's style variation, not violations to fix. Captures the operator framing: "cloning preserves intentional bespoke detail — small differences are the whole point."

## What shipped

| Component | Change |
|---|---|
| `plugins/sgs-blocks/scripts/lints/token-lint.py` | Rewritten to additive mode. New types: `TokenWritePlan`, `NewTokenCandidate`, `Occurrence`. New function: `apply_write_plan()` writes discovered tokens to a client style variation JSON. Legacy `LintResult` / `TokenViolation` kept as deprecated shims, accessible via `--no-new-tokens`. |
| Width routing | `max-width` / `min-width` now route to a dedicated `snap_max_width()` matcher against `settings.layout.contentSize`, `settings.layout.wideSize`, and `settings.custom.maxWidth.*`. Spec §5.4 confidence tiers no longer apply to layout dimensions. |
| Variation overlay | `merge_variation()` overlays a client style variation on top of the base `theme.json` before discovery — tokens registered in the variation dedupe correctly. New `variation_paths` kwarg on all three `lint_*` functions. |
| `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` | Stage 0.5 (`stage_0_5_token_lint`) consumes `TokenWritePlan` in additive mode (default). Falls back to `LintResult` verdict shim with `no_new_tokens=True`. |
| `plugins/sgs-blocks/includes/class-font-collection.php` (+ scaffold) | `wp_register_font_collection( 'sgs-google-fonts', … )` registers all 1,923 uimax Google Fonts as browsable in the editor's Manage Fonts modal — zero frontend enqueue cost. Manifest at `plugins/sgs-blocks/assets/font-collections/google-fonts.json` built by `scripts/build-font-collection.py` from `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db` `google_fonts` table. WP 6.5+ required. |

## Mama's mockup results

| Run | Result |
|---|---|
| Discovery against base `theme.json` only | 3 candidates: `[fontFamily] fraunces`, `[spacing] 28`, `[maxWidth] narrow-420` |
| Discovery against base + `mamas-munches.json` variation | 2 candidates: `[spacing] 28`, `[maxWidth] narrow-420`. **Fraunces correctly dedupes** — already registered in the variation under slug `heading`. |
| Live apply to `mamas-munches.json` | 2 tokens written: `spacingSizes[0] = { slug: '28', size: '28px', name: '28px' }`, `custom.maxWidth.narrow-420 = '420px'` |
| Post-apply re-discovery | 0 candidates (full closure) |
| Idempotency re-apply | 0 added, 0 skipped — clean |

## Retro-canonicalisation (4.6b)

Nothing to do for Mama's mockup: the 2 new tokens are token-class gaps, not `attribute_gap_candidates` rows. Cross-referencing `gap-candidate` lines against the attribute_gap_candidates table found zero matches. The Phase 3.5 + 4.6a work already closed all attribute-class gaps to 0/37 remaining.

This retro pass will be more meaningful on future drafts that haven't been through prior canonicalisation passes — Mama's is post-Phase-6 migrated and already token-lean.

## Drift validator + hero baseline

- `python plugins/sgs-blocks/scripts/drift-validator/validate.py` → **PASS** (0 violations across 1,343 attrs)
- `python tools/recogniser-v2/extract.py … --verify-against tests/golden/hero-extraction-baseline.json` → **PASS** (no regression)

## Caveats / known gaps

1. **Font Library collection** requires WP 6.5+. Plugin guards with `function_exists( 'wp_register_font_collection' )`; silent no-op on older WP.
2. **Font Library JSON is ~2.5 MB**. Served from `plugins/sgs-blocks/assets/font-collections/`. WP's editor fetches it only when Manage Fonts modal opens — not on frontend. Should be served gzipped in production.
3. **`maxWidth` matcher is exact-match only.** A 420px value with a registered 420px token snaps confidence 1.0; 421px is a separate new token. No fuzzy tolerance. Intentional — layout container widths are discrete by design, unlike palette colours.
4. **`font-family` discovery exact-matches the first name in the stack.** Variations with stacks like `"Fraunces, 'DM Serif Display', Georgia, serif"` are correctly matched when the input's first name is `Fraunces`. Stacks where the wanted font is in position 2+ aren't matched.
5. **The 2026-04-28 pre-existing PHP code-smell warnings** (cognitive complexity 33, unused variables in `stage_4_5_6_7_8_extract`) are outside Phase 4.5 scope. Two new nested-ternary warnings introduced during this phase were resolved before commit.

## Follow-ups parked

- **P-S15-STYLEVAR-GEN** — Auto-generate style variations from uimax font_pairings + colour palettes (operator framing: Phase 0 of every future draft-design cycle). Deferred to post-Phase-6.
- **P-S15-PAIRINGS-PICKER** — Site Editor SlotFill panel for browsing uimax pairings. Deferred to post-Phase-6 + after STYLEVAR-GEN ships.

See `.claude/parking.md` for full entries.
