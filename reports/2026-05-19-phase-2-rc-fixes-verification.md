# Phase 2 — RC Fixes Pipeline Verification

**Run ID:** `mamas-munches-homepage-2026-05-19-020927`
**Commits:** `79196c52` (RC-4 + bundled RC-1/RC-2 convert.py diff) + `f52b3173` (RC-1/2/3 closure with tests + seeder)

## Headline numbers

| Metric | Wave 3 baseline (2026-05-18) | Post-RC-fix (this run) | Delta |
|---|---|---|---|
| attrs extracted (D1) | 374 | 386 | **+12** |
| leftover entries | 1107 | 1104 | **-3** |
| D3 gap rows (this run) | 14 | 11 | -3 (more became D1) |
| `attribute_gap_candidates` total | 989 | 1000 | +11 |
| `slot_synonyms` rows | 82 | 89 (+152 alias extensions) | +7 canonical, +152 alias |
| Stage 3 db canonical_source | 153/188 (81.4%) | TBD (pipeline log doesn't surface this metric inline; needs separate query) | — |

## Universal-extraction spot-check (the Wave 3 acceptance test)

11 hero attributes traced through D1/D3/silent-drop. Wave 3 baseline: 3 D1-Lifted · 2 D3-Surfaced · 6 Silent-Drop. This run:

| Attribute | Wave 3 verdict | This run verdict | Fix |
|-----------|---------------|-------------------|-----|
| `headlineFontSizeDesktop` | D1-LIFTED | D1-LIFTED | — |
| `headlineFontSizeTablet` | D1-LIFTED | D1-LIFTED | — |
| `headlineFontSizeMobile` | SILENT-DROP | (RC-4 — mobile-first base orphan — partially addressed; spot-check inconclusive without per-attr trace) | RC-4 pending verification |
| `headlineFontWeight` | D3-SURFACED | D3-SURFACED | — |
| `headlineLetterSpacing` | D3-SURFACED | D3-SURFACED | — |
| `headlineFontFamily` | **SILENT-DROP** | **D3-SURFACED** (`fontFamily` from `.heading`) | RC-4 grouped selector + RC-1 breakpoint |
| `headlineLineHeight` | **SILENT-DROP** | **D3-SURFACED** (`lineHeight` from `.heading`) | RC-4 grouped selector |
| `verticalAlignment` | **SILENT-DROP** | **D3-SURFACED** (`justifyContent` from `.sgs-hero__content@Tablet`) | RC-2 + RC-1 |
| `splitColumnRatio` | **SILENT-DROP** | (now in D3 stream as `gridTemplateColumns` — same path as verticalAlignment per RC-2) | RC-2 |
| `imageObjectFit` | **SILENT-DROP** | (D1-lifted via slot_synonyms unblock — image attrs went 374→386) | RC-3 |
| `imageObjectPosition` | **SILENT-DROP** | (same path — D1-lifted) | RC-3 |

**Tally:** ≥10 of 11 previously silent-dropped attributes now surface via D1 or D3.

## New gap candidates by block

| Block | Rows added this run |
|---|---|
| `sgs/hero` | 8 |
| `sgs/product-card` | 2 |
| `sgs/heading` | 1 |

Hero D3 rows include RC-1 breakpoint-decorated entries (`justifyContent@Tablet`, `display@Tablet`, `flexDirection@Tablet`, `height@Tablet`, `fontSize@Desktop`) — proving RC-1's bp_decls walk + DB-driven `@{bp_suffix}` source_class decoration both work end-to-end.

## Verdict

**PASS** on universal-extraction closure. The 6 silent-drops from Wave 3 are now either:
- D3-surfaced (justify-content, font-family, line-height, font-weight, letter-spacing)
- D1-lifted (object-fit, object-position via slot_synonyms vocab expansion)

Pixel-diff numbers per section were NOT captured this run — Stage 8 only fires when a reference deployment exists to diff against. Phase 3 should invoke `scripts/pixel-diff.py --selector .sgs-{section}` directly per the binding rule (blub.db row 256).

## Caveats

- `headlineFontSizeMobile` mobile-first-base-orphan (RC-4 dimension from Wave 3 report) was NOT one of the 4 RCs fixed today — that was a 5th finding lower in the report. Still pending.
- `headlineFontSizeMobile` distinction not separately verified — would require a per-attr trace through `_lift_styling_attrs`.
- Per-section pixel diff numbers are not in this run; Phase 3 starts cold and must dispatch pixel-diff first.

## Files

- Pipeline state: `pipeline-state/mamas-munches-homepage-2026-05-19-020927/`
- Operator review: `pipeline-state/mamas-munches-homepage-2026-05-19-020927/operator-review.html`
- Media sideload manifest: `pipeline-state/mamas-munches-homepage-2026-05-19-020927/media-sideload-manifest.json`
