# Triage T5 — Tier-object migration: live re-measurement

**Date:** 2026-08-30
**Method:** every number below comes from a command run in this session (listed inline). Where a doc and a live command disagreed, the command wins and that is called out.

## Expected population (declared before counting)

Before running anything: expected roughly 27 migratable properties / ~37 block-touches (the doc's own working figure), a majority-but-not-all asset exemption under C19, the 3 `<prop>Desktop`-base families still present, and somewhere between 2 and 7 live borderRadius split-mechanism blocks (the doc's own text already flags this as reduced from 11 by a prior commit).

## 1. Live re-measurement

Command:
```
cd plugins/sgs-blocks && python scripts/migrate-tier-object.py --all-properties --survey
```

Result:
```
DECLARED tier properties: 40   (MIGRATABLE 27 - already done 13)
...
BATCHING SHAPE (of the 27 MIGRATABLE properties):
  1-2 blocks : 26
  3+  blocks : 1   backgroundOverlayOpacity(8)
  total block-touches remaining: 37
```

**27 properties / 37 block-touches — matches the doc's cited figures exactly. No drift.** (Positive control: the same command also lists 13 properties already "done", e.g. `borderRadius` 44/0, `padding`/`margin`/`backgroundImage` — proving the survey distinguishes done-vs-open rather than returning a stuck/zero result.)

## 2. Asset-attribute exemption (C19)

**Governing sentence, quoted verbatim from `.claude/plans/2026-08-25-road-to-uniform-then-spec-39.md` line 193-195 (C19, Bean-settled 2026-08-27):**

> "Art-directed = different *assets* per breakpoint (separate attrs, never a responsive object, because they are different files). Regular responsive object = same asset, different CSS values per tier."

Related decision: `D859` (`.claude/decisions.md:1856`) — the same C19 ruling applied concretely to `sgs/media`'s size/crop panel. Supporting precedent: `D595` (`.claude/decisions.md:10146`) shipped `svgContent`'s Tablet/Mobile siblings specifically as art-direction (different SVG per device), confirming SVG content is asset-class under this ruling.

Per-property detail pulled via `--property <name> --survey` for all 27 (full per-block output captured this session).

### Exempt — genuine per-breakpoint FILE identity (separate attrs correct as-is)

| Property | Touches | Blocks |
|---|---|---|
| `imageId` | 2 | sgs/decorative-image, sgs/media |
| `imageUrl` | 2 | sgs/decorative-image, sgs/media |
| `afterImageId` | 1 | sgs/before-after |
| `afterImageUrl` | 1 | sgs/before-after |
| `beforeImageId` | 1 | sgs/before-after |
| `beforeImageUrl` | 1 | sgs/before-after |
| `logoId` | 1 | sgs/responsive-logo |
| `logoUrl` | 1 | sgs/responsive-logo |
| `thumbnailId` | 1 | sgs/media |
| `thumbnail` | 1 | sgs/media |
| `videoId` | 1 | sgs/media |
| `videoUrl` | 1 | sgs/media |
| `svgContent` | 1 | sgs/media |
| `splitSvg` | 1 | sgs/hero |
| **Total exempt** | **16** | |

All 16 are literal media-file identity (a WordPress attachment ID, a media URL, or raw SVG markup) — exactly the "different files" case C19 rules out of the responsive-object shape.

### Real migration target — CSS/behaviour values (not assets)

| Property | Touches | Blocks |
|---|---|---|
| `backgroundOverlayOpacity` | 8 | container, cta-section, hero, multi-button, physics-canvas, site-footer, site-header, trust-bar |
| `videoAutoplay` | 2 | before-after, media |
| `columns` | 1 | brand-strip |
| `showOn` | 1 | whatsapp-cta |
| `splitMediaObjectPosition` | 1 | hero |
| `splitMediaWidth` | 1 | hero |
| `textAlign` | 1 | hero |
| `videoControls` | 1 | media |
| `videoLazyLoad` | 1 | media |
| `videoLoop` | 1 | media |
| `videoMuted` | 1 | media |
| `videoPlaysInline` | 1 | media |
| **Subtotal (clean, non-asset)** | **20** | |
| `splitMediaType` | 1 | hero |
| **Real-target total (incl. borderline)** | **21** | |

`splitMediaType` is genuinely borderline: it is an enum (`"image"`/`"video"`), not a file reference, but it discriminates WHICH of the two already-per-tier ASSET-typed media families (`splitImage`/`splitVideo`) is shown at a given breakpoint. It stores no asset identity itself and a responsive object holding a string per tier is a normal CSS-value shape — so it does not literally trip C19's "because they are different files" test. Flagging it rather than silently bucketing it either way; recommend Bean confirm before it's batched, but the mechanical reading is: **target, not exempt.**

**16 exempt + 21 target = 37 — accounts for the full touch count with no leftover.** The "~20" working estimate in the doc matches the 20 clean (non-borderline) targets exactly.

## 3. The three `<prop>Desktop`-base residual — CONFIRMED STILL PRESENT

Checked live source, not the survey output alone:

```
brand-strip/render.php:57:  $columns_desktop = isset( $attributes['columnsDesktop'] ) ? ... : 8;
hero/render.php:256:        $text_align_desktop = $attributes['textAlignDesktop'] ?? '';
whatsapp-cta/render.php:38:  $show_on_desktop = $attributes['showOnDesktop'] ?? true;
```

All three genuinely read the **suffixed** key (`columnsDesktop`/`textAlignDesktop`/`showOnDesktop`), never the bare name. The survey's own `render_state()`/`reads_attr_directly()`/`edit_refs()` functions regex-match only `['prop']`, `['propTablet']`, `['propMobile']` — never `['propDesktop']` — so they report these three as **DELEGATED / NONE ("clean, nothing to check")**, which is false: the residual is real and still live (verified against current disk state, not a cached claim).

**What breaks if `--fix` runs on these three today:** ran it directly —

```
python scripts/migrate-tier-object.py --property showOn --fix   → KeyError: 'showOn'
python scripts/migrate-tier-object.py --property columns --fix  → KeyError: 'columns'
python scripts/migrate-tier-object.py --property textAlign --fix → KeyError: 'textAlign'
```

`apply_block_json()` looks up the base declaration via the **bare** key (`attrs[prop]`) rather than through `_base_attr_spec()` (which is Desktop-aware). Since these three blocks only declare `<prop>Desktop` in block.json, the lookup raises an uncaught `KeyError` **before any file write** — so it is not a silent corruption, but it is an unhandled crash. Run singly it just aborts that one property; run via `--all-properties --fix` it would abort the **entire batch** at whichever of these three properties sorts first, blocking every other property's fix in the same invocation until these three are excluded or the script is patched to route `apply_block_json` through `_base_attr_spec()`.

## 4. Live borderRadius split-mechanism count

⚠ Per the brief, the on-disk `.claude/reports/inline-styling-audit-2026-07-09.json` is stale (its own `generatedAt` is `2026-08-17`, ten+ days old, despite the tool printing "Report written" on every run) — only the live console output was used.

Command:
```
node scripts/audit-inline-styling.js --check
```
Live console output:
```
Blocks with tier-without-base defect: 2 (sgs/media, sgs/whatsapp-cta)
[audit-inline-styling --check] PASS — 0 inline styling violations across 83 blocks + the shared wrapper.
```

Cross-checked directly against each of the 7 originally-believed blocks' `block.json` (`supports.__experimentalBorder` + radius-named attributes):

| Block | `__experimentalBorder.radius` | SGS radius attrs | Split mechanism? |
|---|---|---|---|
| before-after | absent | `borderRadius` + Tablet + Mobile | No — single all-SGS mechanism |
| brand-strip | absent | `borderRadius` + Tablet + Mobile | No — single all-SGS mechanism |
| countdown-timer | absent | `borderRadius` + Tablet + Mobile | No — single all-SGS mechanism |
| counter | absent | `borderRadius` + Tablet + Mobile | No — single all-SGS mechanism |
| **media** | **true** | Tablet + Mobile only, no base | **Yes — still split** |
| table-of-contents | absent | `borderRadius` + Tablet + Mobile | No — single all-SGS mechanism |
| **whatsapp-cta** | **true** | Tablet + Mobile only, no base | **Yes — still split** |

**Live count: 2 (`sgs/media`, `sgs/whatsapp-cta`), not 7.** The other 5 of the originally-believed 7 already carry their own SGS-owned base `borderRadius` attribute alongside the Tablet/Mobile siblings — a single mechanism, not a split one — so they don't belong in this category regardless of what closed them. (Note: `git show 8e8a19a09` shows that commit actually migrated a *different* 11-block roster — accordion, button, container, heading, icon-list, option-picker, process-steps, product-card, quote, text, timeline — not the 4 named in the brief; none of those 11 overlap the "believed 7" list here. Whatever the history, the **live** state for the 7 named blocks is 2 split, 5 already single-mechanism.)

## Summary for the caller

- **Live counts:** 27 migratable properties, 37 block-touches — matches the doc, no drift.
- **C19 split:** 16 touches exempt (image/video/svg ID-URL-content — genuine per-breakpoint files), 20 clean real-migration-target touches, 1 borderline (`splitMediaType`, hero) that mechanically reads as a target but is worth a one-line Bean confirmation before batching. 16+21=37, fully accounted.
- **3-family Desktop-base residual:** still live and confirmed by reading current `render.php` source in all three blocks (brand-strip/columns, hero/textAlign, whatsapp-cta/showOn). Running `--fix` on any of them today throws an unhandled `KeyError` in `apply_block_json()` before any write — safe from corruption but would abort a full `--all-properties --fix` batch run. Needs `apply_block_json()` routed through the existing `_base_attr_spec()` helper (already used by `classify()`) before these three can be migrated mechanically.
- **borderRadius split-mechanism:** live count is **2** (`sgs/media`, `sgs/whatsapp-cta`), not the previously-believed 7 — verified via live `audit-inline-styling.js --check` console output (the on-disk JSON/MD report is stale, dated 2026-08-17, and was not trusted) plus a direct per-block `block.json` check of the other 5 candidates, all of which turned out to already be single-mechanism.
