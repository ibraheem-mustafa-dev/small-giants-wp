Invoke /autopilot before doing anything else.

You are resuming Wave 3C, unit U-1 (nav surfaces), of the merged Spec 36 + 37 track (small-giants-wp, branch main). Bean is on a time crunch: be token-efficient, add no reviews beyond what is listed here, use headed Chrome in ONE window, wait for pages to load, and commit with explicit pathspecs (never `git add -A`, never stash, no attribution lines, never a PR). Read `.claude/plans/2026-09-21-wave-3c-implementation-plan.md` (Read-first block, section 1, section 9), `.claude/reports/2026-09-21-u1-design.md` (the council-changed design), and `.claude/reports/2026-09-21-u1-c4-surface-ground-design.md` (commit 4 design, council changes, the 4e ruling). Deploy only with `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only --skip-build` after a webpack build via the PowerShell tool.

## Bean's instruction for this resume (in this order)

1. Finish 4b properly (below), then do 4c, 4d, 4e.
2. Run a `/qc-council` over the whole U-1 build (4a to 4e), two different models chosen by `/delegate` (one code-path verifier, one adversarial reader), apply its changes.
3. Build and commit commit 6 (item hover paint: `itemOpacity`, `itemOpacityHover`, `panelCardLift`, `itemPaddingShiftHover`; design in `2026-09-21-u1-design.md` section 3 item 6; M-21 cells in section 2).
4. Then run the DB reseed (`python plugins/sgs-blocks/scripts/sgs-update-v2.py`, 20 to 40 minutes, run it in the background and poll its exit), update `.claude/LEDGER.md`, and do the full-scale doc updates (Spec 36, Spec 37, the plan and verify docs, decisions.md entry, U-1 exit cells, `families-master.json` coverage_status for M-09, M-13, M-43, M-21, Spec 19/dev-setup if any command or fixture changed).

## State at the pause (all on origin/main)

| Commit | What | State |
|---|---|---|
| 677148215 (+ report d0bff2eb9) | 1: mega close delay reads `submenuCloseGrace` | done, live-verified |
| 6eb948176 (+ c7f1a8043) | 2: force-solid paints the resting background through the merge | done, live-verified |
| e8c70192c, 3fa812e8d (+ 0aa26468b) | 3, 3b: per-tier header `zIndex`, drawer stacking derives from it | done, live-verified |
| be1be25da (+ 3e221b698) | 5: `submenuIntentDelay`, `submenuOpenOn` (hover or click) | done, live-verified with real pointer input |
| bf2200abd, 60d8905f0 (+ 91fb3d550) | 4a: shared surface ground helper, wrapper hook, header `backdropBlur` renamed `surfaceBlur`, saturate, opacity | done, live-verified (blur, saturate, 86 percent fill) |
| 5abaa8981 | 4b: mega panel `bgBlur` replaced by `surfaceBlur`/`surfaceSaturate`/`surfaceOpacity`; `shadow` (default preset `floating`, empty means none) and `shadowColour` are its single box-shadow writer; roster JSON regenerated | **committed and pushed, NOT deployed, NOT verified live** |

## 4b: what is left (do this first)

The deploy was blocked by the dirty-tree gate because ANOTHER session has uncommitted work in `trust-bar/*`, `includes/class-sgs-blocks.php`, `includes/class-sgs-container-wrapper.php` (a small `helpers-trust-bar-css-length.php` require), `IconPicker/*` and an untracked `assets/icons/sgs-icons.json`. Do not stash, do not pass `--allow-dirty`, do not commit their files. Run `git status --short plugins/sgs-blocks` first: if those paths are now committed or clean, deploy; if still dirty, tell Bean the paths and wait.

After a clean deploy, verify 4b live in headed Chrome (page id 4 is the working tab; the chrome-devtools MCP tools are deferred, load them with ToolSearch):
- The mega panel is post 1745 ("SPIKE Brands Panel", `sgs_mega_menu`), used by the fixtures (menu item Brands) on pages like `/qa-hdr-mega-dropdown-drawer/`. To test blur, saturate, opacity and shadow, TEMPORARILY inject `"surfaceBlur":"12px","surfaceSaturate":150,"surfaceOpacity":0.8` into the `<!-- wp:sgs/mega-panel {` comment of post 1745 (back up its `post_content` to the scratchpad first, write it with `wp_update_post( wp_slash(...) )` through an `eval-file` script scp'd to the server, since post_content escaping through the shell breaks), open Brands with a REAL hover, and read the panel's computed `backdrop-filter`, `background-color` (or `--sgs-mm-panel-bg`) and `box-shadow`; then read it again with `shadow` set to an empty string (expect `box-shadow: none`); then RESTORE the original content and confirm it.
- Also confirm the default panel still renders a shadow (`floating` preset) and no blur (empty defaults).
- Council F5 (asked for before any further block adopts blur): on a blurred header (page `/qa-hdr-surface/`, id 3826), open a dropdown (Shop) and the mega panel and check each is `position` as expected, inside the viewport, and that `elementFromPoint` at its centre is inside it; a non-modal drawer needs `modality: non-modal` on the drawer, so do that check after 4c.
- Then append a 4b section to `reports/visual-diff/mega-panel-2026-09-21.md` (new file; `verdict: PASS`, `intent_capture_passed: true`, `source_sha` from the recipe used in `reports/visual-diff/site-header-2026-09-21.md`: SHA-256 over `name\0bytes\0` for each file of the commit under `src/blocks/mega-panel/`, first 16 hex, computed from the commit because the script reads the git index) and commit it.

## 4c, 4d, 4e (from the commit-4 design note)

- 4c `sgs/nav-drawer`: keep `surfaceBlur` and `surfaceOpacity`; emit both through `sgs_surface_backdrop_decls` / `sgs_surface_fill_alpha` in `nav-drawer/render.php`; add `surfaceSaturate`; add `shadow` and `shadowColour` (one writer); mount `SurfaceGroundControls` and `ShadowControl` in its inspector; canvas preview in `nav-drawer/edit.js`; use `sgs_css_single_length_value` for blur (the council found the drawer's old check accepted a two-value blur).
- 4d `surfaceFadeEdge` on `sgs/site-header` (`none | top | bottom`, a `mask-image` fade of that edge to transparent; one reference, fantasy). Built last, small.
- 4e fan-out through the shared background panel (Bean's ruling): mount `SurfaceGroundControls` inside `container/components/BackgroundPanel.js` when the block declares `surfaceBlur`; add `surfaceBlur` and `surfaceSaturate` (opacity only where the block passes its own fill to `sgs_surface_fill_alpha`) to every wrapper block that mounts the panel (container, header, footer, hero, cta-section, trust-bar, physics-canvas; `multi-button` only if it renders through `SGS_Container_Wrapper`, check first). More than three blocks: ship it as a survey, fix and check script (precedent `scripts/fanout-overlay-sibling-attrs.py`), a canvas preview per block (the `check-editor-render-parity` gate enforces it), and note that `trust-bar` and the wrapper are currently being edited by another session.

## Not done and to tell Bean

- `sgs/mega-panel::borderRadius` (string) has NOT been moved to a tier object: no exit cell needs it and it carries a silent-coercion hazard and a converter DB routing row. Ask Bean whether to do it.
- Halcyon and Indus mega shadows are two-layer; `shadow` composes one layer, so their second layer is approximated (record as a divergence in the clone report).
- The mega panel's default shadow changed from a hardcoded two-layer literal to the `floating` theme preset.

## Facts that cost time this session (do not rediscover)

- The Bash tool halves backslashes in heredocs and mangles `\n` inside them: write patch scripts to the scratchpad with the Write tool, then run them; never put `\n` escapes in a heredoc.
- `wp_style_engine_get_styles` silently DROPS a `color-mix()` value (measured live). A translucent fill must be written as its own scoped rule, as `site-header/render.php` now does.
- The pre-deploy stored-content audit aborts a deploy if stored content still uses a renamed attribute; rebuild the fixture (`python plugins/sgs-blocks/scripts/nav-qa/build-header-fixtures.py --only <slug>`) and re-run.
- Gate failures that are NOT this work and are disclosed in every commit message: `migrate-orchestrator-rename` (scans the gitignored scratch copy `pipeline-state/_p1p2/headtree`), `dbschema-check_schema_drift` (an empty table `should_not_be_writable` left in the shared framework DB), `wp-hooks validate` (3 unknown hooks), and the pre-commit F6 db-consistency `variant_slots` for `sgs/trust-bar` (bypass with `SGS_F5_SKIP=db-consistency/run.py SGS_F5_SKIP_REASON="..."`; the reseed refreshes it). After any block.json attribute change run `python plugins/sgs-blocks/scripts/consistency/build-roster.py` and commit `scripts/consistency/roster.json` and `attr-role-map.json`, or the inspector-scan pre-commit gate blocks.
- The visual-diff commit gate: commit with `SGS_VISUAL_GATE_SKIP=<block>[,<block>]` and a truthful `SGS_VISUAL_GATE_REASON`, then commit the live report straight after. The commit hooks take over a minute: run the commit in the background and confirm with `git log -1`.
- Live testing: sandybrown fixtures are pages built by `plugins/sgs-blocks/scripts/nav-qa/build-header-fixtures.py` (slugs `qa-hdr-*`): `qa-hdr-force-solid` 3790, `qa-hdr-z-index` 3799, `qa-hdr-open-click` 3808, `qa-hdr-open-delay` 3817, `qa-hdr-surface` 3826, pill 3734. Test header #3777 and test drawer #3778 are the active ones on sandybrown; Mama's header #3648 and default drawer #3593 can be re-activated with `wp sgs header set-active` / `wp sgs drawer set-active` (`--user=1`, over `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73`, path `domains/sandybrown-nightingale-600381.hostingersite.com/public_html`).
- Real pointer input is available through the chrome-devtools `hover`, `click` and `press_key` tools; read timings from an in-page MutationObserver, not from tool latency.

First action on resume: read the three docs above, run `git status --short plugins/sgs-blocks`, tell Bean in three lines where 4b stands (deployable or blocked by the other session), and continue.
