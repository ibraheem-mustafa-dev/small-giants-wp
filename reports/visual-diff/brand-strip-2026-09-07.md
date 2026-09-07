# Visual diff — sgs/brand-strip — 2026-09-07

verdict: PASS
intent_capture_passed: true
source_sha: 53a03a240dda3667

## What changed

Root-caused via `/systematic-debugging`: `itemTextColourHover` painted `color:` on
`.sgs-brand-strip__item:hover`, but that element only ever contains an `<img>`/`<video>`
(`sgs_render_media()`) — never a text node — so the control had zero visual effect
regardless of value. It was also documented as "the hover counterpart of `nameColour`",
which is wrong: `nameColourHover` already fills that role on the sibling
`.sgs-brand-strip__name` element (a genuinely different DOM node — the two are siblings
inside `.sgs-brand-strip__tile`, not ancestor/descendant).

Removed: the attribute + gradient sibling (`block.json`), its editor control (`edit.js`),
and its render.php/style.css emission.

While in this cluster, `check-dead-controls.js` CHECK 5 surfaced a second, pre-existing
gap the removal exposed: `itemBackgroundColourHover`'s `--sgs-tile-hover-bg` custom
property was assigned to a PHP variable but never actually emitted anywhere in
render.php — its only reader was inside the block of code just removed. Restored the
missing emission, mirroring the sibling `itemBorderColourHover` pattern one line below.

## Why before/after doesn't apply

The removed control never rendered anything visible in any prior state, so there is no
meaningful "before" screenshot to diff against — the assertion is about the *current*
live output, not a change in appearance.

## Assertions, live result

Scratch page (id 3366) created via WP-CLI on the sandybrown canary with a real
`sgs/brand-strip` instance (3 logo items, `itemBackgroundColourHover: #ff6600`,
`itemBorderColourHover: #0033ff`), deployed and fetched live.

| Assertion | Live result |
|---|---|
| `itemBackgroundColourHover` now emits `--sgs-tile-hover-bg` | **`--sgs-tile-hover-bg:#ff6600;`** present in the deployed lifted CSS (`uploads/sgs-css/sgs-3359-*.css`) ✅ |
| `itemBorderColourHover` still emits `--sgs-tile-hover-border` (unbroken by the edit) | **`--sgs-tile-hover-border:#0033ff;`** present ✅ |
| Compiled `.sgs-brand-strip__item:hover` rule lost its `color:` declaration, kept `background-color`/`border-color` | Confirmed in the enqueued stylesheet output — `color:` absent, both other declarations present ✅ |
| No trace of the removed mechanism anywhere live | `grep` for `itemTextColourHover` / `sgs-tile-hover-text` across the page HTML and the lifted CSS: **0 matches** ✅ |
| Block still renders (no fatal, no empty-state fallback) | 3 items rendered; `sgs-brand-strip__empty` class absent from the root ✅ |

## Risk

No markup change. One attribute pair removed (dead, zero prior visual effect by
construction — an `<img>`/`<video>` cannot respond to `color:`). One missing custom-property
emission restored, using the exact same pattern as its already-working sibling
(`itemBorderColourHover` → `--sgs-tile-hover-border`) one line below it in the same file.

## Gates

`php -l` clean · babel parse of `edit.js` clean · `check-dead-controls.js` 0 net-new
(CHECK 5 dead-assignment finding resolved) · `check-duplicate-controls.js` 0 net-new ·
`npm run build` (webpack) clean · `build-deploy.py` full gate tier PASS (pytest-oracle,
inspector-scan, block-file-consistency) · `payload-verify` 83/83 · motion-qa 3/3 live
probes PASS.

`[gates-ok]` note: the separate `check-colour-attr-css-property` gate in the `npm run
build` prebuild chain fails on `sgs/breadcrumbs.linkColour` — a concurrent session's
in-progress DB classification work, unrelated to this change (verified via `git diff`
that breadcrumbs and DB files are untouched by this commit).
