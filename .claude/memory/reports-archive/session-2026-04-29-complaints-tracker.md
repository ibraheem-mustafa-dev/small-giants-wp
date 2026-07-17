# Session 2026-04-29 — Bean's complaints / corrections tracker

Extracted from every message Bean sent during the session. Each entry has the original phrasing, what was claimed as fix, and actual current status.

## ✅ Fixed (verified live)

| # | Bean's complaint | Fix applied | Verification |
|---|---|---|---|
| 1 | "This isn't intelligent at all" — universal hover-scale applied to everything including header/footer/page wrapper, content cut off | Inverted to default-OFF + opt-in 11-card list. Captured as lesson `defaults-need-deliberate-per-item-judgement-not-blanket` (blub.db row 190) | Commit `33d0962` — header/footer no longer scale; only 11 cards have hover scale |
| 2 | "those colour names don't map accurately to global palette colour names in WP" | Extracted real 15 slugs from theme.json | Audit table v2 uses correct slugs |
| 3 | "the default global colour palette should be aligned with my brand's colours, not Indus" | Swapped theme.json baseline from Indus values to SGS brand from `small-giants-studio/app/globals.css` (#1F7A7A teal-green + #F59E0B amber + warm off-white) | Commit `7d10ae9` — verified live: Indus override still wins on palestine-lives.org |
| 4 | "Brand-strip should be full colour throughout" | Set `greyscale: false` default | Commit `8fb5c45` |
| 5 | "Heritage-strip should have primary background" | Set bg = `primary` default | Commit `8fb5c45` |
| 6 | "Did you check if the blocks are invalid on the edit page?" | Verified — 62 SGS blocks, 0 invalid | Confirmed via `wp.data.select('core/block-editor').getBlocks()` walk |
| 7 | Counter "Product Lines" subtitle clipping (Gemini Vision) | line-height 1 → 1.1 + margin-bottom 4.5px → 7.92px | Commit `5f099bd` — confirmed live |
| 8 | Mobile top-bar "Apply For Trade Account" text cut mid-character | text-overflow:clip → ellipsis + smaller font on small screens | Commit `5f099bd` |
| 9 | Certification Bar mobile badges below 44×44px touch target | min-height 40px → 44px | Commit `5f099bd` |
| 10 | Form input title sitting on top of placeholder when not selected | Placeholder color: transparent unconditionally; revealed on focus; label floats up on focus/fill | Confirmed live: placeholder is `rgba(0,0,0,0)` when empty |

## ⚠️ Partially fixed (uncommitted changes in working tree)

| # | Bean's complaint | Status | Action needed |
|---|---|---|---|
| 11 | "It doesn't look like any of the updates have gone through... no differences even though you said you set up default colour presets for each block" | 12 of 30 blocks now emit inline colour styles after render.php fixes; agent worked on remaining 18 (gallery, post-grid, table-of-contents, testimonial-slider + business-info/mega-menu/breadcrumbs/icon already done) | Commit + redeploy theme files (button style variations not yet on server) |
| 12 | "Announcement bar still looks like trash on the live page" | Padding moved to `padding-block` + `padding-inline` token-based pattern | Theme has it but plugin re-deploy didn't include theme files; needs separate scp |
| 13 | "Buttons don't need custom defaults — use the primary and secondary global preset that you should apply" | Agent registered 3 `core/button` style variations: `sgs-primary` (teal solid), `sgs-secondary` (teal outline), `sgs-accent` (gold default) in `theme/sgs-theme/functions.php` + 65 lines CSS in `core-blocks.css` | **Theme files NOT deployed yet** |
| 14 | "Check the original Indus draft website's button setup for this Indus theme's button styles" | Partial — Astra theme uses `var(--ast-global-color-X)` indirection; the actual button rules use outline-style with primary border + transparent bg + primary text on hover | Need to map Astra colour vars to hex values to fully replicate Indus reference patterns |

## ❌ Not yet fixed / unresolved

| # | Bean's complaint | Why not fixed |
|---|---|---|
| 15 | "I was way too safe" with hover defaults — display-only blocks could benefit from animations, child elements deserve their own hovers, testimonial slider's arrows/dots/cards each need defaults | Group J per-element specs in audit table v2 are spec'd; multi-part hovers shipped in `743a7b4`; but Bean's broader point about adding more animation/colour ambition across display blocks (counter on-scroll, brand-strip greyscale-to-colour, etc.) — partly addressed |
| 16 | "the icon block single icon has the star all the way on the left sitting outside the content width of the page" | **Could not locate** in audit — only star found is at `top: 13121, left: 313` (within content width). The misaligned icon at left=35 was business-info's address icon inside the top bar (intentional). Need Bean to point at the specific element with screenshot |
| 17 | "Announcement bar was an example of several issues you stated you had fixed" — multiple blocks have unfixed issues | 27 of 30 blocks STILL render without inline colour styles per the most recent live audit (down from 30 of 30 originally; 3 blocks worked from start). Theme files holding remaining fixes not yet deployed |
| 18 | Audit + remove redundant `*ButtonColour` / `submitColour` attributes from SGS blocks now that block style variations exist | Agent's audit table identified 7 candidate attributes across cta-section, form, mobile-nav, back-to-top — flagged for review, NOT removed yet |
| 19 | Existing blocks on `/block-test/` still don't have new defaults applied because `block.json` `attributes.*.default` only fires on fresh insertions, not migrations | 3 options open: (a) re-build the test page with fresh blocks, (b) `wp.data.dispatch.savePost()` per block to force migration, (c) leave as-is since render.php fixes handle most of this server-side. Bean asked Q1 about deleting + recreating page — answer was "yes, partial fix" |

## Decisions Bean made (all locked in)

- Defaults should be the most powerful representation per block, not the most neutral hedge
- All values must reference palette slugs, never bare hex
- Brand-strip = full colour, no greyscale
- Heritage-strip bg = `primary` (full brand statement)
- SGS palette extracted from `small-giants-studio/app/globals.css`
- Indus palette overrides correctly preserved
- "It's just a colour palette — treat as part of completing the framework" — don't split workstreams
- Forget over-reliance on AI vision audits; trust direct visual inspection
- Use ui-ux-pro-max design intelligence database before recommending defaults

## Architectural debt acknowledged this session

1. **`block.json` defaults don't migrate existing blocks** — only apply to new insertions. Render.php is the durable fix path.
2. **Render.php was inconsistent** — only 3 of 30 blocks emitted inline colour styles before this session; 7 more added today; remaining 18 still need verification post-deploy.
3. **No global `core/button` style variations were registered** — every SGS block had to invent its own button colour attributes. Now registered (sgs-primary/sgs-secondary/sgs-accent) but not deployed.
4. **business-info renders inside the sticky header top bar** at far-left position — confirmed this is the layout, not a bug. But Bean's "star icon outside content width" complaint may refer to a different element I haven't located.
5. **Static blocks (certification-bar, heritage-strip, notice-banner)** can't easily migrate to new defaults without re-saving each block instance OR a migrate() in deprecation.

## Next session — concrete to-do list

1. Deploy theme files (`theme/sgs-theme/functions.php` + `assets/css/core-blocks.css`) to palestine-lives.org so the 3 button style variations are actually live
2. Get screenshot from Bean showing the exact "star icon outside content width" element — fix that specific element
3. Resolve Astra `--ast-global-color-*` indirection in the Indus mockup HTML to map to actual hex values, then verify SGS button styles match those visual targets
4. Audit + remove the 4-7 redundant `*ButtonColour` attributes per agent's table
5. Re-audit `/block-test/` post-deploy: target ≥ 25 of 30 blocks emitting inline colour styles
6. Bean decides: rebuild test page from scratch OR keep existing blocks
7. Visual comparison: `/block-test/` vs Indus reference homepage at desktop and mobile, side by side