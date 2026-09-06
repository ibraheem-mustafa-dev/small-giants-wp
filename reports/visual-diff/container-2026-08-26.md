# Visual diff — `sgs/container` editor canvas after the shared background-preview extraction

verdict: PASS
editor_capture_passed: true

**Date:** 2026-08-26
**Canary:** sandybrown-nightingale-600381.hostingersite.com (WP 7.1)
**Commit under test:** `11228c3e0` — *fix(editor-canvas): clients can see their background again*
**Surface:** the editor canvas only. Nothing in this change reaches the frontend.

## What changed, and why it needed a capture

`sgs/container` was the only block that ever mirrored `BackgroundPanel`'s attributes
into the editor canvas. That logic was extracted into a shared module
(`src/utils/background-preview.js`) so five more blocks could adopt it, and the
`::before` / `::after` layer CSS moved out of `container/editor.css` into the shared
editor stylesheet (`assets/css/extensions.css`), keyed on generic marker classes
(`.sgs-ed-has-bg-media` / `.sgs-ed-has-overlay`) instead of container-private ones.

Two things could have broken container specifically, which is why the gate demanded
this report rather than accepting the static argument:

1. the marker class was RENAMED, so a stale selector would paint nothing;
2. the rules moved to a different stylesheet, which loads through a different hook
   (`enqueue_block_assets`) into the canvas iframe.

## Static equivalence (necessary, not sufficient)

The declaration sets were compared directly. **21 declarations removed from
`container/editor.css`, 21 added to `extensions.css`, zero difference** — the move is
byte-identical at the declaration level. This proves the RULES did not change; it does
not prove they still MATCH anything, which is what the capture below is for.

## Live capture — the real editor, on the real canary

Logged into the canary and opened page **2596** (a draft carrying two `sgs/container`
instances with a real uploaded `backgroundImage`), then measured the actual painted
pseudo-element inside the canvas iframe.

| Measure | Container 1 | Container 2 |
|---|---|---|
| carries `.sgs-ed-has-bg-media` | yes | yes |
| `--sgs-ed-bg-image` resolves | real uploads URL | real uploads URL |
| `::before` paints an image | **true** | **true** |
| `background-size` | `contain` | `auto` |
| `background-position` | `0% 0%` | `50% 50%` |
| `z-index` | `-1` | `-1` |
| box | 1257×300 | 1257×300 |

Both containers still paint. The two instances resolve to DIFFERENT `background-size`
and `background-position` values, which is the useful detail: it shows per-instance
attributes are still honoured rather than a single hardcoded fallback being painted for
everything. `z-index:-1` confirms the layer still sits behind content, so the client's
own content is not dimmed.

## The adopters — the actual point of the change

Container already worked before this commit, so verifying it alone would only prove
nothing regressed. To prove the change does what it claims, probe page **2841** was
created with an `sgs/multi-button` and an `sgs/trust-bar`, each given a real
`backgroundImage`. Both are blocks that previously showed the client **nothing**.

| Measure | `sgs/multi-button` | `sgs/trust-bar` |
|---|---|---|
| carries `.sgs-ed-has-bg-media` | yes | yes |
| `::before` paints an image | **true** | **true** |
| `background-size` | `cover` | `cover` |
| `z-index` | `-1` | `-1` |

This also incidentally rules out the D338 failure mode: had `backgroundImage` not been
a declared attribute on those blocks, WordPress would have silently discarded it and
the marker class would never have appeared.

Probe page 2841 was deleted after capture.

## Screenshot

`reports/visual-diff/container-2026-08-26-editor-canvas.png` — the probe page in the
editor with both blocks painting.

⚠ That PNG is **gitignored** (`reports/visual-diff/*.png` is excluded), so it exists on
the machine that ran this capture and is NOT in the repository. Do not go looking for it
in git history. The measured values in the tables above are the durable evidence; the
screenshot is a convenience, which is why every claim here is stated as a number rather
than resting on the image.

## Scope of this verdict — what it does NOT cover

- **Frontend: unchanged and untested, deliberately.** `editor.css` compiles to the
  editor-only bundle and is never enqueued on the frontend. The shared
  `extensions.css` DOES load on the frontend, but the marker classes are applied
  exclusively by `edit.js`; grep confirms no `render.php` or PHP anywhere emits them,
  so the selectors cannot match there.
- **Aesthetic judgement is not claimed.** This report proves the layer paints, with the
  right source, size, position and stacking. Whether the result looks right remains
  Bean's eye (R-31-13).
- One instance of each adopting block was measured, not all five blocks. The remaining
  three (`physics-canvas`, `site-footer`, `site-header`) call the identical shared
  function and were confirmed to carry it in their deployed bundles, but were not
  separately captured.

## Debt cleared

`11228c3e0` carried a logged manual skip for `container`
(`reports/visual-diff/manual-skips.log`) because the capture required a deploy, the
deploy required a clean tree, and the clean tree required that commit. The skip reason
stated a real capture would follow in the same session. **This report is that capture.**
