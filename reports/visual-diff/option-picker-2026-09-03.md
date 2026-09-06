# Visual diff — sgs/option-picker — 2026-09-03 (edit.js ReferenceError fix)

verdict: PASS
intent_capture_passed: true
source_sha: e24af8b5b48d5fd0

⚠ THREE REPORTS NOW IN THIS FILE, all kept deliberately, none superseded. This section is the
NEWEST — a follow-up fix to the `pillBgColourHover`/`pillTextColourHover` hover-colour migration
documented in the section below (a missing destructure in `edit.js` was throwing a
ReferenceError in a specific code path). `sgs/option-picker` carries NO gradient work this
session — its own pill-background gradient mechanism (a CSS custom property feeding
`background-color`, which cannot hold a gradient value without switching to `background-image`)
was deliberately deferred, matching the block's existing constraint.

## What changed

| File | Change |
|---|---|
| `edit.js` | fixed a missing destructure of `pillBgColourHover`/`pillTextColourHover` that was throwing a ReferenceError in a specific code path (both are correctly destructured at the top of the component, lines 94-95, and consumed consistently at lines 150-151, 178/180, and the `SgsColourPanel` row definitions ~374-401) |

## Assertions — stated before measuring

1. The block editor does not throw a console error when opening a page containing `sgs/option-picker`.
2. The live frontend emits `--sgs-op-bg-hover`/`--sgs-op-text-hover` correctly at the instance's own scoped selector (not inline, per Spec 32).

## Results — live probe (test page 3223, deleted after)

| # | Assertion | Result |
|---|---|---|
| 1 | No editor console error | **PASS** — logged into the sandybrown canary via Playwright, opened the block editor for a page containing an `sgs/option-picker` instance with `pillBgColourHover:"#ff00ff"`/`pillTextColourHover:"#00ff00"` set. `browser_console_messages(level:"error")` returned **0 errors, 1 unrelated warning**. Inspected the editor canvas iframe directly (`document.querySelector('iframe[name="editor-canvas"]').contentDocument`): the block rendered correctly as a `<fieldset>` with `style="border-style: solid; --sgs-op-bg-hover: #ff00ff; --sgs-op-text-hover: #00ff00;"`, zero `.block-editor-warning`/`.components-notice.is-error` elements present |
| 2 | Frontend custom properties | **PASS** — live lifted CSS (`uploads/sgs-css/sgs-3004-b13167b4...css`): `.sgs-op-50ed214b.wp-block-sgs-option-picker{--sgs-op-bg-hover:#ff00ff;--sgs-op-text-hover:#00ff00;}` — scoped to the instance's own uid class, no inline `style` attribute on the frontend `<fieldset>` |

## What is NOT verified — stated, not buried

- No before/after comparison of the actual bug (the ReferenceError was described as firing "only
  in a specific code path" not exercised by a plain page load) — verification confirms the
  current state is clean, not that a specific prior failure mode is now fixed by diff.
- Deploy used `--allow-dirty` (7 unrelated `form-field-*/edit.js` files, a different track's WIP),
  `--skip-oldshape-audit` (HIGH finding was `sgs/text` on post 3212, unrelated),
  `--skip-gate-full` (confirmed via full-output grep: zero mentions of `sgs/option-picker` across
  the entire advisory output; both ratchet breaches are pre-existing debt in unrelated blocks).
- Test page (3223) was deleted after verification; it no longer exists on the canary.

---

⚠ TWO EARLIER REPORTS FOLLOW, both kept deliberately. The first below covers the
37-media-no-handroll object-fit migration (verdict PASS, live-verified 2026-09-03,
deploy commit 7de8f0ff8). The second covers the Category B hover-colour migration
that introduced `pillBgColourHover`/`pillTextColourHover`, also verdict PASS. Neither
supersedes the other — different changes to the same block. Read the section above for
the current (ReferenceError fix) change.

# Visual diff — sgs/option-picker — 2026-09-03

verdict: PASS
intent_capture_passed: true
source_sha: 48d8adcb694b4252

## Assertion

The `object-fit`/`object-position` crop-mode migration (rule `37-media-no-handroll`) is designed to be
visually neutral for any instance that never explicitly sets the new control: the block's `block.json`
`default` for the new attribute was set to match whatever value was previously hardcoded, and the shared
atom stylesheet's own fallback reproduces the same default. The assertion under test: **the live canary
serves the correct fallback CSS, and the block's own compiled stylesheet no longer duplicates or conflicts
with it.**

## Live result

Deploy commit `7de8f0ff8` (main), verified live against
`https://sandybrown-nightingale-600381.hostingersite.com/` on 2026-09-03 � payload-verify step confirmed
all 83 deployed `block.json` checksums match the committed payload; OPcache + page cache purged post-deploy.

No live populated option-picker instance found on the canary's current content to capture directly
(the canary is a small demo site; not every migrated block has a content-bearing example live). Verified instead:
(1) the compiled frontend stylesheet (`build/blocks/option-picker/style-index.css`) contains zero literal `object-fit`/
`object-position` declarations outside a `var()` expression � the old hardcode is genuinely gone from the live
bundle, not just the source tree; (2) the shared atom stylesheet (`assets/css/media-atoms/object-fit.css`,
compiled into the live `media-element.css` bundle, `?ver=1788429270`) is confirmed live and serving
`object-fit: var( --sgs-media-object-fit, cover )` on `.sgs-media-el` � the exact fallback the removed hardcode
used to paint, so any un-set instance renders identically to before this migration; (3) the block's own `block.json`
loaded live confirms the `mediaElements` declaration is present and the plugin's payload-verify step (part of this
session's deploy) confirmed all 83 deployed `block.json` files match the committed payload byte-for-byte.

## Why before/after doesn't apply

The change is a CSS-mechanism swap (hardcoded property to atom-driven CSS custom property) with the
default value deliberately preserved � a before/after pixel diff would show no difference by design for
any instance that doesn't explicitly set the new control, so a before-state capture proves nothing a live
correctness check doesn't already prove. The meaningful question is whether the live mechanism is wired
correctly, which the assertion above tests directly.

---

# Visual diff — sgs/option-picker — 2026-09-03

verdict: PASS
intent_capture_passed: true
source_sha: uncommitted-payload (deployed via build-deploy.py --payload plugins/sgs-blocks/src/blocks/option-picker/)

Covers Category B's hover-colour migration for `sgs/option-picker`'s pill base state, adding a
real `hover` row alongside the existing `normal` row (matching `nav-menu`'s `item-text`/
`item-bg` shape) — deliberately reversing the block's own FR-35-5 "no hover state needed"
exception per Bean's explicit instruction.

## What changed

| File | Change |
|---|---|
| `block.json` | new string attrs `pillBgColourHover`, `pillTextColourHover`; new `attrMap` entries `"css:background-color":"pillBgColourHover"` / `"css:color":"pillTextColourHover"` on the hover state slot |
| `edit.js` | existing pill colour row's `states` array gains a `hover` entry alongside `normal` |
| `render.php` | reads `pillBgColourHover`/`pillTextColourHover`, emits `--sgs-op-bg-hover`/`--sgs-op-text-hover` as scoped `<style>` custom-property VALUES (Spec 32 FR-32-4 — no inline `style="--var:…"` attributes) |
| `style.css` | unchanged — the pre-existing `var(--sgs-op-bg-hover, var(--sgs-op-bg, <hardcoded preset default>)))` fallback chain (outlined/filled/ghost variants) already supported the override slot; it previously always fell through to the hardcoded default because nothing ever set `--sgs-op-bg-hover` |

**Note on mechanism:** unlike the other 4 blocks in this rollout, `sgs/option-picker` does not
use `:where()`-wrapped selector fallbacks — its pre-existing `style.css` already used a
`var(--sgs-op-bg-hover, var(--sgs-op-bg, <default>)))` fallback CHAIN. This migration's job was
simply to make render.php actually EMIT `--sgs-op-bg-hover`/`--sgs-op-text-hover` when the new
attrs are set (previously nothing ever populated that custom property, so the chain always fell
through to its innermost default).

## Assertions — stated before measuring

1. Resting-state parity: with the new attrs unset, no `--sgs-op-bg-hover`/`--sgs-op-text-hover`
   custom property is emitted, so the existing fallback chain still resolves to the pre-migration
   hardcoded default for each of the 3 pill-style variants (outlined/filled/ghost).
2. Negative control: an instance with the attrs unset gets no PHP-emitted custom-property rule at
   all for its scope class.
3. Override: setting the hover attrs to distinct test colours on a live page produces a
   scoped `<style>` rule declaring `--sgs-op-bg-hover`/`--sgs-op-text-hover` at real specificity
   on that instance's own uid-scoped class.

## Results

| # | Assertion | Result |
|---|---|---|
| 1 | Resting-state parity | **PASS** — `build/blocks/option-picker/style-index.css` on the live canary still carries, byte-identical to source, all 3 variants' hover fallback chains: `.sgs-option-picker--outlined …:hover …{background-color:var(--sgs-op-bg-hover,var(--sgs-op-bg,var(--wp--preset--color--secondary,#f3f4f6)))}`, `.sgs-option-picker--filled …{…var(--sgs-op-bg-hover,var(--sgs-op-bg,var(--wp--preset--color--surface-alt,#d1d5db)))}`, `.sgs-option-picker--ghost …{…var(--sgs-op-bg-hover,var(--wp--preset--color--secondary,rgba(0,0,0,.05)))}` |
| 2 | Negative control | **PASS** — live test page (post 3219, root cause of an initial false-negative traced and fixed: the block requires a populated `optionItems` array to render at all — `render.php:147` returns early on empty items; the block's guard is legitimate, not a bug), second `<fieldset class="…sgs-op-38f4eff3">` instance with no hover attrs; its scoped selector in the lifted stylesheet carries zero rules at all — confirmed by grepping the CSS for `.sgs-op-38f4eff3` and getting no match |
| 3 | Override | **PASS** — same page, first `<fieldset class="…sgs-op-f54e3891">` instance with `pillBgColourHover:"#ff00ff"`, `pillTextColourHover:"#00ff00"`. Live lifted CSS (`uploads/sgs-css/sgs-3001-6dd95dae...css`): `.sgs-op-f54e3891.wp-block-sgs-option-picker{--sgs-op-bg-hover:#ff00ff;--sgs-op-text-hover:#00ff00;}` — a real-specificity custom-property declaration scoped to that instance's own uid class, which the existing `var(--sgs-op-bg-hover, …)` fallback chain in style.css will now resolve to instead of its inner default |

## What is NOT verified — stated, not buried

- No physical mouse-hover simulation with pixel-colour screenshot; lifted-CSS-text inspection was
  used instead (this project's own precedent).
- This block's mechanism is a CSS custom-property VALUE, not a competing `:hover` selector rule —
  so unlike the other 4 blocks in this rollout, there is no `:focus-visible`/touch-hover-guard
  rule to independently verify here; the existing static `:hover`/`:focus-within` selector rules
  in style.css are unchanged by this migration and simply now read a live custom property instead
  of an always-empty one.
- A first attempt to create the negative-control/override test page failed silently (empty
  `optionItems` meant `render.php` returned nothing, and a shell-escaping bug in the initial
  `wp post update` call also double-escaped the JSON) — both root-caused and fixed before the
  results above were captured; noted here for transparency rather than hidden.
- The gate-full advisory-ratchet failure was bypassed with `--skip-gate-full` — confirmed via grep
  that `sgs/option-picker` never appears in that failure's finding list (pre-existing debt in
  unrelated blocks).
- `oldshape-audit` was skipped — its one HIGH finding was `sgs/text` on post 3212, unrelated.
- `npm run build` had to be re-run mid-session (the described pre-built `build/` was absent on
  disk); the full postbuild gate chain ran clean.
- Test pages were deleted after verification.
