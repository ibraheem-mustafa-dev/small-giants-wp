# Handoff brief: route calibration session, FR-48-8 step 5 and coverage d2 (2026-10-20)

Written for the cloud session that runs `/handoff cloud` Steps 2 to 9. It replaces Step 1: do not re-derive it.

## Tasks and intended outcomes

The session was started from a pasted brief (no prompt file). Done meant:

- (a) Coverage plan d2: sgs/nav-drawer's five scrim settings reached in its slot map, and the resolver writing a draft's `backdrop-filter: blur(2px)` to `scrimBlur`. **Achieved.** All five (`scrimColour`, `scrimColourGradient`, `scrimOpacity` on `@scrim::before`; `scrimBlur`, `scrimFadeDuration` on `@scrim`) are reached at 375, 768 and 1440 in `scripts/computed-route/cache/nav-drawer.json` (gitignored; readKey `cb09db873f6c`, site `local-indus`). The resolver writes `2px`. The Indus draft's backdrop element is not yet paired with the drawer's `@scrim` slot: the Indus drawer is a client-built surface (S-09), so that pairing belongs to the Indus surface proof (FR-48-8 plan step 6).
- (b) The four kept slot maps (sgs/button, sgs/nav-bar-menu, sgs/nav-drawer-menu, sgs/post-grid) replaced, or residue recorded with a proven cause. **Achieved.** button, nav-bar-menu and post-grid are replaced. nav-drawer-menu keeps its 2026-10-12 map, for a proven cause: its fixture renders no current-page item, so `itemColourCurrent`, `itemBorderColourCurrent` and `itemFontWeightCurrent` cannot be read. The fix is designed in the FR-48-8 plan's Open.
- (c) Each of the 10 unmatched audit verdicts fixed or assigned. **Achieved.** `order` (sgs/media) and `stroke-width` (sgs/trust-bar `iconStrokeWidth`) are now reached. `grid-auto-columns`, `grid-auto-flow`, `overflow-x`, `scroll-snap-type` and `scroll-snap-align` go to FR-48-79; `grid-column` goes to FR-48-83; `font-variant-numeric` and `direction` need no setting. The hero `splitContentOrder` part of `order` goes to FR-48-79, and the mega-panel `drawerAsideOrder` part to FR-48-81. The evidence is in each FR's Status line.
- (d) FR-48-8 plan step 5 marked done. **Achieved** (the Progress line "Step 5's resolver-mapping residue").

## This session's commits (all on main, pushed)

- `1712507b5` feat(calibration, d2): the reader keys the body-level scrim as `@scrim`; per-device opacity, backdrop-blur and order markers; the resolver maps blur() to a length; a missed state names its real failure (`missedReason`).
- `3136a735e` fix(post-grid, gallery, pricing-table): columns tier floored at 1. `absint("repeat(3, 1fr)")` was 0, and post-grid divided by it, making the page 33,554,432px wide, so no hover could reach the cards.
- `3ff674ec8`, `73172b40d` fix(db overrides): `sgs/button.inheritStyle` and `sgs/buybox.addToCartStyle` get css_property and css_layer NULL (discovered enums); `sgs/nav-drawer-menu.submenuCaretSize` gets css_property `height,width`.
- `2a4c0d542` chore(db reseed) from a clean worktree. Row diff: 9,217 rows, exactly 3 changed. db-consistency 0, colour gate 0, schema drift clean.
- `650d0c1c6` fix(calibration): `stateTarget` uses the manifest's declared element selector (`lib/resolve.mjs::blockElements`; 83 state rows on 22 blocks were hovering the block root). `markTargetInPage` clears stale `data-cr-toggle` marks, which made every later state instance reopen the first instance's panel.
- `e7eafd1f7` fix(calibration, QC council): the opacity tier marker follows the setting's scale (0–100 versus 0–1) and sets an empty colour partner first.
- `b6b2a996d`, `2a2885934`, `25908181c` docs: FR-48-8 plan, coverage plan item 2, Spec 48 FR-48-8, FR-48-79, FR-48-81, FR-48-83 and FR-48-85 Status lines.

## Findings worth keeping (even where no file changed)

- calibration's "stays hidden" label covered every failure; the real post-grid error was `locator.hover: Element is outside of the viewport`, caused by the columns divide by zero (proven by building the real chunk).
- A marker or state-target change is not part of `READ_KEY`, so existing slot maps are not made due by it; `--recalibrate` forces a re-measure. 13 non-Indus blocks still carry maps measured with the old state targeting (listed in the FR-48-8 plan Open).
- `justify-items` is outside calibration's read list, so `sgs/container.justifyItems` is never planned; adding it changes `READ_KEY` (all 44 Indus files due, about 50 minutes).
- `provision-calibration-refs.mjs` refuses a local mirror by design; the current-page menu item fix must be provisioned on indus-test, then the mirror refreshed.
- `local-indus` supplies no product reference, so sgs/buybox cannot calibrate there.
- A QC council (three Sonnet raters) reviewed the session: one Important code finding (the opacity marker's scale) fixed in `e7eafd1f7`; doc findings fixed in `2a2885934`; minor unfloored columns paths (editor preview, `repeat(0)` in four blocks) recorded in the FR-48-8 plan Open.

## State

- Branch `main`, HEAD `25908181c` (includes peer sessions' commits after mine).
- Route tests: 1,649 pass (`node --test scripts/computed-route/tests/*.test.mjs`), `capabilities.mjs --gate` clean, `lint.mjs` passes.
- Plugin build: `npm run build` passed; synced to `local-indus` (the WSL mirror of indus-test) at `3ff674ec8`; later commits of mine are route-only.
- Deploy: this session deployed nothing to live sites. Peer session small-giants-wp-07 deployed `--blocks-only` to indus-test from main `075e10c3e`, which includes `3136a735e`.
- Framework DB: peer session small-giants-wp-b7 reseeded three times afterwards (states wave: a `states` table, `block_attributes.css_state_selector`, 14 rows gained a css_state). That may make some Indus calibration files due on the next run (slotKey changes); not this session's work.
- Uncommitted files of mine: none. The tree's other modified files belong to other sessions.

## Docs this session already updated

- `.claude/plans/2026-10-19-fr48-8-declared-values.md`: Progress (step 5 residue done) and Open (the proven residue: drawer-menu Current rows and their fix, `justifyItems`, buybox, 13 blocks to re-measure, the eight verdicts, unfloored columns paths).
- `.claude/plans/2026-10-12-clone-coverage-foundation.md`: Order item 2's (d2) sentence and the four-kept-maps sentence.
- `.claude/specs/48-CLONING-SYSTEM.md`: FR-48-8, FR-48-79, FR-48-81, FR-48-83 and FR-48-85 Status lines.

## Still to reconcile (the cloud session's job)

- `.claude/LEDGER.md` Front M (route calibration) still says "40 of 44 slot maps remeasured, four kept" and "Next: d2 ...". Rewrite it to current truth. Touch no other front: peers b7 (states wave) and 07 (mega section links) are editing theirs.
- `.claude/dev-setup.md`: check whether the local-mirror or calibration paragraph should mention `--recalibrate` for a marker or target change. Add one line only if a calibration paragraph exists that it belongs in.
- `scripts/computed-route/README.md` is already current (lint passes).
- The next work for this track, in order: (1) the current-page menu item (FR-48-8 plan Open, first bullet); (2) re-measuring the 13 non-Indus blocks on their sites; (3) floors for the unfloored columns paths; (4) step 6, the Indus surface proof, which waits on Indus step 20 after the states wave.
