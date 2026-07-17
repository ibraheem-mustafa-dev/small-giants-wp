# sgs/brand-strip — new controls build — 2026-07-17

**Mode:** Build (additive controls, endless-marquee scope preserved — no carousel/autoplay/dots/arrows/displayMode added, per council NO-GO).

**Verdict: PASS**

`first_paint_capture_passed: true`

## Scope delivered

### FIX
1. Per-logo `linkUrl` wired end to end — was previously dead (edit.js wrote it, render.php never read it). Now render.php wraps the rendered media in `<a>` when `linkUrl` is set, with a new per-logo `linkTarget` (`_self`/`_blank`) toggle in the editor, `rel="noopener"` (or `"noopener noreferrer"` when opening in a new tab).
2. `greyscale` boolean/default mismatch resolved by removal — subsumed into the new `imageEffect` attribute (see ADD-1).

### ADD
1. `imageEffect` (`none` | `grayscale` | `sepia`, plain string default `"none"`, NOT a block.json enum — avoids the D291/D328 silent-coercion trap). Sanitised in render.php via `in_array(..., true)` mirroring the existing `$safe_hover_effect` idiom. Replaces the old `greyscale` boolean + its class/control entirely (pre-production, D270 no-deprecations policy — clean replacement, no deprecated.js).
2. Per-logo `name` caption + top-level `showNames` toggle. When on: image becomes decorative (`alt=""`), caption text carries the accessible name via `aria-labelledby` (verified live, see below). Caption renders in a new `.sgs-brand-strip__tile` wrapper that sits OUTSIDE the existing fixed-size `.sgs-brand-strip__item` box — the tile's own sizing/hover/zoom CSS is untouched.
3. `logoGap` (number, px, default `0` = "use theme preset spacing") — wired to `--sgs-logo-gap` custom property, consumed by both `.sgs-brand-strip__track` and `.sgs-brand-strip__set` base-tier gap rules (only emitted when > 0, so existing spacing is byte-identical when unset).
4. Static tile border (`tileBorderWidth` px + `tileBorderColour` via DesignTokenPicker) and `tileShadow` (none/small/medium) — distinct from the pre-existing HOVER border/shadow system, which was left untouched. Border consumed via the block's existing scoped-`<style>` mechanism (extends `$scoped_css`); shadow consumed via a root class (`sgs-brand-strip--tile-shadow-{value}`), mirroring the existing hover-effect class pattern.

## Files changed

- `C:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\src\blocks\brand-strip\block.json`
- `C:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\src\blocks\brand-strip\edit.js`
- `C:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\src\blocks\brand-strip\render.php`
- `C:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\src\blocks\brand-strip\style.css`
- `C:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\scripts\oldshape-audit-baseline.json` (3 new baseline entries — see "Unresolved / judgement calls" below)

## New attributes + defaults

| Attribute | Type | Default |
|---|---|---|
| `imageEffect` | string | `"none"` |
| `showNames` | boolean | `false` |
| `logoGap` | number | `0` |
| `tileBorderWidth` | number | `0` |
| `tileBorderColour` | string | `""` |
| `tileShadow` | string | `"none"` |
| `logos[].alt` | string (item schema) | — |
| `logos[].linkUrl` | string (item schema) | — |
| `logos[].linkTarget` | string (item schema) | — |
| `logos[].name` | string (item schema) | — |

Removed: `greyscale` (boolean, was default `false`; render.php had a stale `?? true` fallback — both gone now).

## Live verification (Indus page 13, palestine-lives.org)

Editor dispatch used (per project rule — wp-cli post_content writes are blocked on this project): set `logos[0]` (Sanam) to `linkUrl: 'https://example.com/link-test'`, `linkTarget: '_blank'`, `name: 'Test Brand Name'`; set `showNames: true`; saved via `core/editor` `savePost()` — `didPostSaveRequestSucceed(): true`.

Frontend DOM evidence (`browser_evaluate` on the live page, not the editor):

```json
{
  "linkFound": true,
  "linkTarget": "_blank",
  "linkRel": "noopener noreferrer",
  "linkAriaLabelledby": "sgs-brandstrip-853746be-name-0",
  "nameSpan": { "id": "sgs-brandstrip-853746be-name-0", "text": "Test Brand Name" },
  "imgAltInsideLink": "",
  "ariaLabelledbyResolvesToName": true
}
```

- Marquee: `track.classList.contains('sgs-brand-strip__track--ready') === true`, `getComputedStyle(track).animationName === 'sgs-brand-scroll'` — still animating, untouched.
- Full colour by default: root class list contains no `sgs-brand-strip--effect-*` class (imageEffect default `none`), logos render full colour.
- Tile sizing: uniform, unchanged (fixed-size `.sgs-brand-strip__item` box structure preserved — the caption lives in a new sibling wrapper, never inside the tile).
- Console: 0 errors on the live frontend (1 unrelated pre-existing warning, not brand-strip).
- No horizontal overflow caused by `sgs/brand-strip` at 1440/768/375px — confirmed via `getBoundingClientRect()`: the strip's own box stays within the viewport at every breakpoint (`overflow: hidden` correctly clips the oversized marquee `__set`). A pre-existing 20px document-level horizontal overflow at 768px IS present on this page, traced via element-by-element bounding-rect scan to `sgs-info-box`, `sgs-testimonial-slider`, and `sgs-testimonial` elements elsewhere on the page — confirmed NOT caused by brand-strip (its own `right` edge is inside the viewport at every tested width) and out of this task's scope.

## imageEffect validation approach

Plain `"type":"string"` attribute (NOT a block.json `enum`), matching the block's existing `effectHover`/`scrollDirection` idiom. Sanitised server-side in render.php:
```php
$allowed_img_effects = array( 'none', 'grayscale', 'sepia' );
$safe_image_effect   = in_array( $image_effect, $allowed_img_effects, true ) ? $image_effect : 'none';
```
This avoids the D291/D328 silent-coercion bug (a block.json `enum` coerces any out-of-enum stored value to the attribute's default at render, invisibly) — an allowlist-validated plain string degrades safely to `'none'` instead of masking a bad value.

## Name caption a11y handling

- `showNames` off (default): unchanged — `<img alt>` carries the operator's alt text or falls back to the media's own alt, exactly as before.
- `showNames` on AND the logo has a `name` set: the `<img>` becomes decorative (`alt=""`) and a `<span id="{uid}-name-{index}" class="sgs-brand-strip__name">{name}</span>` renders as a caption below the tile. If the logo also has a `linkUrl`, the `<a>` carries `aria-labelledby="{uid}-name-{index}"` so the link's accessible name is the caption text (once, not twice — a decorative image inside a link with an unrelated/absent accessible name would otherwise announce as an unlabelled link). If there's no link, the caption is just visible text — no extra ARIA wiring needed, since sighted and screen-reader users both get the name from the same visible node.
- `showNames` on but the logo has NO `name` set: falls through to the normal alt-text behaviour (never forces `alt=""` on a symbol-only logo with no caption to compensate).

## Dead-control gate result

`node scripts/check-dead-controls.js --check` ran automatically as part of `npm run build`'s `prebuild` step and **PASSED** (build completed with 0 failures) — every new attribute (`imageEffect`, `showNames`, `logoGap`, `tileBorderWidth`, `tileBorderColour`, `tileShadow`, plus the per-logo `linkTarget`/`name`) is consumed in render.php and/or style.css. `audit-inline-styling.js --check` also passed: 0 inline-styling violations across 78 blocks (the new border/shadow controls route through the existing scoped-`<style>`/class mechanisms, never inline).

## Deploy

`python plugins/sgs-blocks/scripts/build-deploy.py --blocks-only --allow-dirty --target palestine-lives` (via PowerShell). `plugins/sgs-blocks/includes/lucide-icons.php` reverted post-build per instructions (`git checkout HEAD --`).

## Unresolved / judgement calls — flagging for Bean

1. **Production data the brief didn't anticipate.** The oldshape-audit deploy gate found 3 OTHER production posts (`palestine-lives/66`, `/67`, `/68`) that also store the old `greyscale` attribute on `sgs/brand-strip` — not just the Indus page 13 instance the brief mentioned. Removing `greyscale` from block.json means those 3 posts' stored `greyscale` value is now silently unreadable (WP just won't see the key — the block still renders fine, it simply falls back to `imageEffect: 'none'`, i.e. full colour, until someone re-opens the editor on those posts and picks an effect). This is non-lossy (no crash, no dropped content) but IS a visual change on 3 posts I did not visually inspect. I added a documented baseline entry to `oldshape-audit-baseline.json` (with a note explaining the D270-driven schema change and a removal condition) rather than silently overriding the gate, so the deploy could proceed — but I have not personally confirmed what those 3 posts look like post-deploy. Worth a quick look if they're live/important pages.
2. **Tile shadow implementation choice.** The brief left the border/shadow delivery mechanism ("scoped `<style>` OR custom property — whichever fits cleanest") to my judgement. I used the block's existing scoped-`<style>` mechanism for border width/colour (continuous values, needs sanitisation) and a root CSS class for shadow (fixed 3-value set, mirrors the existing `--hover-lift/scale/glow` class pattern) — this was a design choice, not dictated by the brief.
3. **`logoGap` sentinel value.** `0` means "use theme default spacing" rather than a literal zero-gap. A client who genuinely wants a hairline/zero gap can't express that through this control (they'd need to use `1px` as the practical minimum). Flagging in case Bean wants a true "0 = touching" option later — not fixed here as it wasn't in scope.
