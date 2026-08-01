---
verdict: SHIPPED-NOT-DEPLOYED (Tasks 1+2) / VERIFIED-LIVE (Task 3)
block: sgs/before-after
date: 2026-08-01
spec: 38
agent: single-agent, 3 register steps (6 / 6b / 23) — deliberately one dispatch to avoid a shared-file collision
canary (Task 3 only): https://sandybrown-nightingale-600381.hostingersite.com/ba-real-imagery-canary/ (page 2111, this agent's own canary)
---

# sgs/before-after — video/SVG sources, all 4 reveal directions, real test imagery

Binding constraint for this session: **no deploy**. Tasks 1 and 2 change `render.php`
behaviour and cannot render anything different on the live canary until the main thread
deploys — evidence below is build-time (webpack compile, PHP syntax, an offline PHP smoke
test of the new resolver, and a JS lint pass), not live-DOM. Task 3 needed no code change,
so it IS verified live.

## Files changed

- `plugins/sgs-blocks/src/blocks/before-after/block.json` — new attributes
- `plugins/sgs-blocks/src/blocks/before-after/render.php` — media-slot resolution rewired
- `plugins/sgs-blocks/src/blocks/before-after/media-render.php` — **NEW FILE**, the per-slot
  image/video/SVG resolver (see "why a new file" below)
- `plugins/sgs-blocks/src/blocks/before-after/style.css` — 4 reveal directions + video/SVG/toggle CSS
- `plugins/sgs-blocks/src/blocks/before-after/view.js` — video sync layer
- `plugins/sgs-blocks/src/blocks/before-after/edit.js` — Media panel rebuilt (image/video/SVG picker
  per side), Reverse direction toggle, Autoplay toggle

No files outside `before-after/` were touched. No git command was run beyond `status`/`diff`/`log`.

---

## Task 1 (Step 6) — video and SVG sources

**Shipped:** `beforeMediaType`/`afterMediaType` (enum `image|video|svg`, default `image`) —
each comparison SIDE independently chooses its media type, mirroring sgs/media's mediaType
fork applied per slot rather than block-wide. New attrs: `before/afterVideoId`,
`before/afterVideoUrl`, `before/afterVideoAlt`, `before/afterSvgContent`, `videoAutoplay`.

**Why a new file instead of growing render.php:** `render.php` was already 519 lines before
this task — over this codebase's 300-line PHP guideline (`plugins/sgs-blocks/CLAUDE.md`).
Per the rule "if you inherit a file that exceeds these limits, flag it — don't add to it," the
media-type resolution logic (image/video/SVG × 2 sides) went into a sibling file inside this
block's OWN directory instead: `plugins/sgs-blocks/src/blocks/before-after/media-render.php`.
This is within my file ownership (`before-after/**`), loads via `require_once __DIR__ .
'/media-render.php'`, and is copied to `build/` by `--webpack-copy-php` alongside `render.php`
exactly as I built and confirmed (`build/blocks/before-after/media-render.php` present,
10,065 bytes, after `npx wp-scripts build`).

**Video scope — deliberate, documented limitation:** direct file sources only (WP
media-library upload, or a direct .mp4/.webm/.ogg/.mov URL). **YouTube/Vimeo embeds are NOT
supported.** Reasoning, not an oversight: a before/after comparison needs both sides' current
playback position kept in sync (`view.js` `bootVideoSyncLayer`); a cross-origin `<iframe>` can
only be driven via that platform's own JS player SDK, which is an externally-hosted script —
exactly what the Spec 38 three-tier motion doctrine (Tier V / Tier G / Tier H, closed list, "no
CDN ever") exists to keep out of this codebase. Rather than ship a YouTube/Vimeo path that
would silently drift out of sync with no fix available inside that doctrine, the resolver
detects a YouTube/Vimeo URL and treats the slot as **empty** (`has_content: false`), so the
block's existing no-JS-safe gate reports it honestly (renders nothing) instead of a broken
half-synced comparison. This is stated in the block.json description, the editor's inline
`Notice` on the video picker, and the `media-render.php` docblock.

**Sync mechanism (view.js `bootVideoSyncLayer`):** ONE shared play/pause button (rendered only
when `$has_video_slot` is true) drives both `<video>` elements together; a `timeupdate`
listener on the primary video re-syncs the other whenever drift exceeds 0.15s. No native
`controls` are ever emitted on the `<video>` tags — the shared toggle is the only playback
control, so the two videos can never be started independently.

**Reduced motion:** `videoAutoplay` (operator toggle, default `false`) is read in `view.js`
against `window.matchMedia('(prefers-reduced-motion: reduce)')` — when reduced motion is
active, autoplay is suppressed unconditionally regardless of the attribute, and both videos
start paused waiting for an explicit click on the toggle. The toggle itself is never
suppressed (a user-initiated play is not the autonomous motion §10 asks to be simplified away
— same reasoning already applied to the divider drag in this block).

**Evidence (build-time, no live DOM available):**
- `php -l` — zero syntax errors on both `render.php` and `media-render.php`.
- `phpcs --standard=WordPress` — zero errors on `media-render.php`; `render.php`'s only
  findings were 6 pre-existing array-alignment WARNINGS, auto-fixed via `phpcbf` (see Task 2
  evidence — same run covered both).
- `npx wp-scripts build --experimental-modules --webpack-copy-php` — **webpack 5.105.2 compiled
  successfully**, twice (before and after lint fixes). `media-render.php` confirmed present in
  `build/blocks/before-after/` at 10,065 bytes.
- **Offline PHP smoke test** of `sgs_before_after_resolve_media()` (stub WP functions, no WP
  bootstrap) — 8 cases, all passed:
  1. image via attachment ID → `has_content=true`, correct `<img>`.
  2. image with nothing set → `has_content=false`.
  3. video via direct `.webm` URL → `has_content=true`, correct `<video><source type="video/webm">`,
     `data-sgs-before-after-video` present, no `autoplay`/`controls` attrs.
  4. video via a YouTube URL → `has_content=false`, explanatory HTML comment, NOT rendered as
     a broken iframe.
  5. video via WP attachment ID → resolves URL + MIME from `wp_get_attachment_url()`/
     `get_post_mime_type()` correctly.
  6. SVG with real markup → `has_content=true`, wrapped in `.__svg` div.
  7. SVG with whitespace-only content → `has_content=false` (trimmed check).
  8. an invalid `mediaType` value falls back to `image` (matches the `enum` guard).
- `npx wp-scripts lint-js` — **zero new errors** introduced in `edit.js`/`view.js`; the only
  remaining findings (3× `no-unsafe-wp-apis` in `edit.js`, 2× `import/no-unresolved` in
  `view.js`) were proven pre-existing by diffing against `git show HEAD:…` of each file before
  any of my edits — identical findings on the untouched original.

**What could not be verified this session:** actual video playback/sync on a real page (needs
deploy), the editor's video-upload UI round-trip (needs deploy + a live editor session),
whether `wp_enqueue_script_module` still gates correctly with two videos present (logic
unchanged from the existing Draggable enqueue, but unexercised).

---

## Task 2 (Step 6b) — all four reveal directions

**Shipped:** `reverseDirection` (boolean, default `false` — Bean-locked default UNCHANGED),
crossed with the existing `orientation` (`horizontal|vertical`) to give:

| orientation | reverseDirection | Reveals "after" from |
|---|---|---|
| horizontal | false (default) | LEFT — unchanged |
| horizontal | true | RIGHT |
| vertical | false (default) | TOP — unchanged |
| vertical | true | BOTTOM |

**The label trap, closed structurally, not per-direction:** the 2026-07-31 bug was labels and
clip-path drifting out of sync. Rather than writing 4 independent CSS rules for label order
(one per direction) that could individually drift, both the clip-path AND the label `order`
are keyed off the exact same `[data-reverse="1"]` / `[data-orientation="vertical"]` attribute
selectors on the SAME root element:

```css
/* clip */
.wp-block-sgs-before-after[data-reverse="1"]:not([data-orientation="vertical"]) .__after-wrap {
  clip-path: inset(0 0 0 var(--sgs-before-after-position));
}
/* label, same attribute, same file, adjacent block */
.wp-block-sgs-before-after[data-reverse="1"] .__label--after { order: 1; }
.wp-block-sgs-before-after[data-reverse="1"] .__label--before { order: 0; }
```

A future direction addition can only be wired by adding to BOTH rule families under the same
attribute name — there's no code path where clip and label read different flags. I also caught
a SECOND latent instance of the same bug class while doing this: `.__labels` was a row-flex
(`justify-content: space-between`) with no `flex-direction: column` override for
`[data-orientation="vertical"]`, so a vertical instance would already have been putting its
labels LEFT/RIGHT while the media split TOP/BOTTOM — flagged as "UNMEASURED" in the 2026-07-31
report specifically because this was never checked. Fixed in the same style.css edit
(`flex-direction: column` under `[data-orientation="vertical"]`).

**Mandated verification shape — screenshot per direction + label-vs-src measurement:** THIS IS
THE PART THAT CANNOT BE DONE THIS SESSION. The `reverseDirection` attribute does not exist in
the deployed code (`block.json` on the live site has no such attribute — WP would silently
discard it per the D338 "unknown attr is dropped, not errored" gotcha this codebase has
already been bitten by once), so setting it on a live canary page right now would do nothing
observable. I did NOT fake this with editor-only or synthetic verification — I am reporting it
as **unverified pending deploy**, per the task's own "This is a look-at-it defect class — use
Playwright" instruction: there is nothing real for Playwright to look at until the code ships.

**What I verified instead (the honest substitute — CSS math, not a screenshot):**
- Traced the `clip-path: inset()` box-model arithmetic for all 4 cases by hand against the
  existing (measured, live-proven) horizontal-default behaviour, confirming the physical
  handle-to-revealed-area relationship holds in all 4 quadrants (documented inline in
  `style.css`'s new comment block — same reasoning a reviewer would need to re-derive it).
- Confirmed via `npx wp-scripts lint-style` that the new selectors compile without syntax
  errors — pre-existing `@stylistic/function-parentheses-space-inside` findings are the
  established project convention (80 of the SAME class already existed on the untouched file
  before any of my edits — confirmed by diffing `git show HEAD:…`), not new debt.
- Confirmed the compiled `build/blocks/before-after/style-index.css` contains the new
  `data-reverse` and `video-toggle` selectors (grep, non-zero match).

**Required next step (flagged for whoever deploys):** after deploy, run the exact
label-vs-`src` measurement this report's predecessor used
(`reports/visual-diff/before-after-labels-2026-07-31.md`) against all 4 direction combinations
on a real canary — screenshot + `getComputedStyle` clip-path + which image's `src` sits in
`.__after-wrap` + which side each label measures to. I did not fabricate that evidence here.

---

## Task 3 (Step 23) — real imagery, all 4 breakpoints — VERIFIED LIVE

No code change needed (root cause was the source test images, already proven by the prior
session). Created my own canary page (binding rule 5 — never edit another agent's page):
`https://sandybrown-nightingale-600381.hostingersite.com/ba-real-imagery-canary/` (page ID
2111), using two REAL photographs already in the sandybrown media library
(`cookies-on-bun-case-17.jpeg` id 1445, `Halimahs-17.jpeg` id 1442 — genuine Mama's Munches
product photography, not synthetic canary frames) on the CURRENTLY DEPLOYED block (no new
attributes used — `beforeImageId`/`afterImageId`/labels/`startPosition`/`height` only).

**Screenshots taken, this session, this URL, cache-busted with a reload + `window.location.href`
re-assert immediately before each capture** (per the shared-browser-session binding rule),
saved to `reports/visual-diff/assets/before-after-2026-08-01/`:

| Viewport | File | Checkerboard/frame-index marker present? |
|---|---|---|
| 1440px | `ba-real-1440.png` | No |
| 1024px | `ba-real-1024.png` | No |
| 768px | `ba-real-768.png` | No |
| 375px | `ba-real-375.png` | No |

Confirmed clean at every mandated breakpoint — proves the prior session's root-cause diagnosis
(the marker was baked into the `frame_0001.webp`/`frame_0048.webp` motion-canary test images,
not a block/CSS bug) rather than merely asserting it.

**Label-vs-src regression check (not skipped, since this task explicitly must not regress the
label fix):**

```
afterWrap img src  = https://…/Halimahs-17-1536x864.jpeg     (afterImageId=1442)
before    img src  = https://…/cookies-on-bun-case-17-1536x1338.jpeg (beforeImageId=1445)
clip-path          = inset(0px 50% 0px 0px)   → visible on LEFT
"After" label side = LEFT
"Before" label side = RIGHT
```

Labels correctly track their own image — the 2026-07-31 fix is intact, confirmed by direct
measurement (not screenshot-eyeballing alone), on real photography.

Console messages: 0 errors, 0 warnings on this page.

**What this does NOT prove:** the marker was investigated and ruled out on the specific
synthetic images used by the Wave C motion canary; a DIFFERENT future test-image generator
could reintroduce a similar artefact, and this check would need re-running against whatever
imagery a real client site ends up using.

---

## Summary — what needs a deploy before it can be closed

Tasks 1 and 2 are code-complete, build-clean (webpack + phpcs + eslint + an offline PHP unit
smoke test of the new resolver), and architecturally reviewed against this codebase's own
rules (file-length limit respected via the new sibling file; no-CDN motion doctrine respected
by excluding YouTube/Vimeo; the label/clip sync-by-construction pattern applied to close the
exact bug class this block was previously caught by). **Neither can be visually verified until
deployed** — that is a structural fact of the "no deploy" constraint on this dispatch, not a
gap I am papering over. Task 3 needed no deploy and is fully verified live, at all four
mandated breakpoints, with a direct label-vs-src measurement, not an eyeball check.
