# i2-stops: why the 2026-11-24 proof clone stopped at the apply stage

## Headline

The claim is partly right, and it misses the cause.

- PROVEN: the stop is unconditional, not tied to strict mode. `scripts/computed-route/site-run.mjs::applyDetail` throws "a no-setting row names a setting the block has (no-setting-review.json)" whenever `lib/apply-gate.mjs::gateRows` counts one `unresolved` row. `--strict` is not on that path (`strict` only reaches `proposeDetail` and `runExit`). `apply.mjs` itself sets exit code 1 only for a whole run, not for `--surfaces`, which is how site-run calls it.
- PROVEN: apply does not refuse to place. It writes every op it can first (form-careers 17 ops, form-catalogue 19, form-enquiry 22, mega-about 31, mega-trade 27, form-send 12, my-account 2, drawer-site-menu 11), then the closing gate fails the surface. The comment at the apply call in `site-run.mjs` says "It stops the surface like a failed build", so no verify and no walk follow.
- PROVEN: nine surfaces stopped, not six. Indus: form-careers, form-catalogue, form-enquiry, mega-about, mega-trade (`reclone-2026-11-24/in/site-run.log`) and drawer-site-menu (earlier run `qa/site-run/2026-11-24T07-51-43`). Mama's: my-account and form-send (`mm/site-run.log`; form-send is Mama's, not Indus's). Eye Care: modal-size-guide (`ec/site-run.log`). The brief's six omit Indus mega-about, mega-trade and drawer-site-menu, and attribute form-send to Indus.
- PROVEN: the gate is Spec 48's "Closing gate" bullet ("An unresolved row fails a whole run"), from `bf36602ce` and `5d7bceaf7` (2026-11-07). It predates Bean's 2026-11-20/21 ruling that a look the clone cannot place is listed loudly and never stops the clone, and was never updated. That is the real instance of the claim: the stop itself is wrong (class a) for all nine surfaces. In 8 of the 9 there is also an upstream fault that needs its own fix (below).
- Method: the review file `qa/apply/no-setting-review.json` was overwritten by later runs, so I re-ran the real gate (`gateRows` with the real `block_attributes` rows, read-only) over each surface's `qa/apply/<surface>.plan.json`. The counts match the logs exactly for all nine (for example form-careers: 4 confirmed, 1 unjudged, 3 unresolved). Scratch scripts: `E:\sgs-tmp\general-cloning\investigate\i2-stops\gate.mjs`, `all.mjs`, `count.mjs`.

Across all 60 plan files in the three proof worktrees, exactly 13 rows are unresolved, all in these nine surfaces.

## Per surface

Stage for all nine: apply (`apply.mjs` ends, then `site-run.mjs::applyDetail` throws).

**1 and 2. Indus form-careers and form-catalogue (3 rows each).** Rows: `field-label font-size`, `font-weight`, `line-height`: "labelFontSize holds one value for all of them; the draft has 2 different values: 13.5px | 15px" (700 | 400; 20.925px | normal). Raised by `lib/apply-probe-items.mjs::partItems` (several draft values for a setting the block holds once), reached from `lib/apply-family-form.mjs::form.decide` (element `field-label`).
- Class (b), PROVEN, separate fault. The draft has one label look. `lib/apply-probes.mjs::labelTextHolder` picks, inside a `<label>` that wraps a `<select>`, the descendant with the most letters, and an `<option>` ("Sales & account management") beats the label span ("Team"). I ran the real function in headless Chromium on the draft's markup (the field template in `Indus Foods Website v2.dc.html`): an input gives SPAN 13.5px/700/20.925px; a select gives OPTION 15px/400/normal. That reproduces the logged values exactly.
- Spec 48 says this function reads "the span holding the words, never the wrapping label", so the code contradicts its spec for selects.
- Both forms carry selects in the draft data (careers: Team, Role; catalogue: Sector, Format).

**3. Indus form-enquiry (1 row).** `tileCheckSize`: "no width setting on sgs/form-field-tiles paints '.sgs-form-field__group > ... > .sgs-form-tile__check' (candidates: tileCheckSize)", draft 24px, default 20px. Raised in `lib/resolve.mjs` (the `!tied.length` branch, via `resolveDiscovered` then `noSetting`).
- Class (b), PROVEN, separate fault in the setting record. `tileCheckSize` has css_property `height,width` in `block_attributes`; `lib/setting-record.mjs::settingEntry` keeps one `property` per setting, and `loadRecord('sgs/form-field-tiles','indus-foods').settings.tileCheckSize.property` is `height`. `resolve.mjs::tiedBy` requires `c.property === short` (or `reachedBy`, which joins only shorthand families, not height and width), so a `width` row finds nothing tied. The block does have the setting and its slot is right. Same value from the proof worktree's commit `c8b4a3f78`.

**4 and 5. Indus mega-about and mega-trade (1 row each).** `drawerLinkTrailingColourHover`: "TR-034 gives the row arrow's opacity only and the saved panel holds no row text colour to keep it at". Returned by `lib/apply-chrome-hover.mjs` (the `fade` branch, when neither `drawerLinkTrailingColour` nor `drawerLinkLabelColour` is saved).
- Class (b), PROVEN as input; the deeper upstream cause is partly UNPROVEN. Apply already wrote `drawerLinkTrailingIcon: arrow`; only the hover colour has no value to keep. Fill never read the drawer link settings: `fill/mega-about/.../fill-report.json` lists `drawerLinkBg`, `drawerLinkDivider`, `drawerLinkTrailingColour` and more as unread ("no draftSlots finder names `.sgs-mega-panel__content > .sgs-mega-aside > .sgs-container:nth-of-type(1)`"). That matches deep review S1's C2. To settle whether `drawerLinkLabelColour` is also unread, read the saved panel on the scratch site.

**6. Indus drawer-site-menu (1 row).** `closeIconSize`: "the draft close glyph is two 18px bars; the saved closeIcon is not a custom svg of straight strokes, so its drawn length per pixel of size is not in the saved settings". From `lib/apply-chrome-closeicon.mjs`.
- Class (d), PROVEN: a real "cannot compute" for a built-in icon. The setting exists but its size cannot be derived. This is exactly a look to list and carry on from.

**7. Mama's form-send (1 row).** `labelLineHeight`: "shape: normal cannot be held (line-height normal is the font's own spacing ... none was read for it here)". From `lib/resolve-declared.mjs::keywordForm`, via `partItems` then `stateItem`.
- Class (b), PROVEN as mechanism. Fill converts `normal` to a measured line box (`lib/fill-normal-keywords.mjs`, fed by `normalLineHeight` in `lib/fill-read-collect.mjs`). Apply's reads (`lib/apply-read.mjs`, `lib/apply-probes.mjs`) never collect `normalLineHeight`, so apply can only refuse. A separate fault: two stages treat the same value differently. UNPROVEN: which label element the Mama's row read (I did not read the Mama's draft).

**8. Mama's my-account (1 row).** `box-shadow` hover: "uncalibrated: sgs/account signedOutButtonShadowHover, signedOutSignInShadowHover, signedOutRegisterShadowHover, emptyStateShadowHover, loginButtonShadowHover, registerButtonShadowHover (hover) not calibrated". Returned as `gap: 'uncalibrated'` in `lib/resolve.mjs`: no candidate has a record entry.
- Class (b)/(c) mixed, PROVEN: `loadRecord('sgs/account','mamas-munches-redesign')` has no entry for any of the six; three sit in `untestedStates` and `unproved`, three have no trace. The block has hover shadow settings the record could not place. The gate then reads them as "the block has a box-shadow setting in hover" and fails. Needs its own fix (the seeder's proof of those six), separate from the stop. Caveat: this reads today's DB, not the proof's.

**9. Eye Care modal-size-guide (1 row).** `top`: "top 0px sits under the 69px header at 375". Raised by `lib/apply-family-pin.mjs::pin.decide` (`gap < 0`), with `headers[w]` from `lib/apply-read.mjs` (the first sticky or fixed, top-0, near-full-width element taller than 30px in the draft).
- Class (a), PROVEN, with two faults. First, the refusal is the writer's own choice: `pinEdge: top`, `pinBelowHeader: off`, `pinGap: 0` is exactly `top: 0` and the block supports it (`plugins/sgs-blocks/includes/container-pin-edge-css.php` keeps a dialog or modal pin at `top:0` and ignores the header anyway). Second, the gate's match is spurious: the only `sgs/container` setting whose css_property includes `top` is `arrowInsetTop` (css_element `arrow`), and `judgeRow` finds no part word in `top`, so it counts that unrelated setting. UNPROVEN: whether the 69px element is the page header or the modal's own sticky bar (open the modal draft at 375).

## Same cause elsewhere (counts from the proof)

- Gate over-reach: 13 unresolved rows in 9 surfaces; the same gate confirmed the other no-setting rows correctly. There are 104 `status: 'no-setting'` emit sites in 33 `lib/apply-*.mjs` files; 17 name an attribute in `prop`, and each trips `judgeRow` rule 1 ("a row naming a setting by its attribute is unresolved") whenever it fires, whatever its reason. Detector shape: a row with `status: 'no-setting'` whose `prop` equals a `block_attributes.attr_name` of its block, or whose last word is any setting's css_property.
- Label-wrapped selects: 2 of 7 form surfaces in the proof. The Indus v2 draft has three forms with selects (careers, catalogue, and the contact page's "Enquiry type"); the contact page was not probed this way (its apply passed with 0 unresolved; I did not establish why).
- Height and width record collapse: 36 settings in `block_attributes` list two or more non-family longhands, of which 30 are `height,width` pairs (for example `iconSize` on `sgs/button`, `closeSize` on `sgs/nav-drawer`, `badgeSize` on `sgs/cart`). Only tileCheckSize tripped it in the proof. Whether the rest hit the same dead end in other runs is UNPROVEN; a query of every such entry's record `property` would show.
- Uncalibrated hover rows: 1 in the proof (my-account).

## Other places a run ends for a look it cannot place

Apply and fill stage throws, classified:
- Should be listed, not thrown: `apply.mjs` exit code 1 on `gate.unresolved` (whole run) and `site-run.mjs::applyDetail`. Same cause as above.
- `fill.mjs` "the skeleton is not valid (R-47-10)", from `lib/fill-skeleton.mjs::skeletonProblems` and `lint.mjs::lintSkeleton`. Real invalid input in principle (inline style attribute, core style attribute, native_wp style setting, a style value on a node, a handover with no owner or kind, a `::before` or `::after` slot). But the skeleton writer emits these itself: the Indus header `::before` slot, Eye Care home's `sgs/google-reviews` handover with no owner, `sgs/process-steps` style values `steps` and `headingLevel` (a DB fault: `steps` has a css_property), Mama's cart template handover kind `layout`. So the throw is right and the writer is wrong, a separate fault; `propose` does not stop on it first.
- `lib/paint-gate.mjs::assertPaints` ("a block its tree uses has no look for the client"): a real missing input, escapable with `--allow-missing-paint`. Keep.
- `fill.mjs` `surfaceRefusal` (a commerce surface with no WooCommerce piece, FR-48-87): real.
- `apply.mjs` "the re-read failed, so every write of this run was restored": infrastructure, real, and it restores rather than strands.
- `lib/apply-ledger.mjs` refusing divergence rulings that "could excuse work it was never meant to cover": real invalid input.
- Real inputs or infrastructure (keep): `lib/apply-read.mjs` "the draft did not render", `lib/apply-reveal-read.mjs` (component not mounted, state not reached), `lib/tree.mjs` R-47-11 target and host-busy refusals, `lib/fill-read.mjs` empty read and missing Playwright, `lib/fill-handover.mjs` unknown owner or kind, `lib/fill-list-content.mjs` schema mismatch, `lib/fill-shop-parts.mjs`, `lib/fill-skeleton.mjs` bad finder, `solve.mjs` walker wrote no report.
- Outside apply and fill, same shape: the walker refusing the `auto-scrolled` state ("draft not at rest after a fresh load", 29 Indus walks) ends the walk step for a look it cannot compare; and `wp-build-page.js` rejecting a wrongly typed setting (heading `level` 1 where `"h1"` is expected, Mama's and Eye Care order-confirmation). The second is a real invalid value written by an earlier stage.

## Calls I made

- Treated the nine-surface set as ground truth and reported the difference from the brief's six, instead of limiting myself to six.
- Rebuilt the lost review rows by re-running the real `gateRows` over the saved plan files, instead of re-running apply (no site reads).
- Ran one headless Chromium page on inline HTML (not a live draft or any site) to test `labelTextHolder`.
- Read the current main checkout's setting records and DB for the record claims; confirmed tileCheckSize against the proof worktree (`c8b4a3f78`). My-account's record state is today's DB, not the proof's, so a reseed since then could differ.
- Did not run apply, Fill, any site-run stage, or open the Eye Care modal draft; those are the UNPROVEN items above.
