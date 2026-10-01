# Handover: Gate 3C item 4 (Indus and lamalama header copies), cloud session

**Date:** 2026-10-01
**Branch:** `claude/fervent-archimedes-wqsw2k` (pushed to origin, head `cfe5d96` plus this doc). No pull requests.
**Status:** the branch merges into `main` without conflicts. Every gate failure you reported is fixed. It is **not yet merged into `main`, reseeded or deployed.** That runs on your machine (step 1).
**Governing docs:**
- `.claude/plans/2026-09-21-wave-3c-implementation-plan.md` §7 (Gate 3C)
- `.claude/plans/2026-09-27-reference-capture-method-plan.md` "Build status"
- Specs 36, 37, 02 and 33

---

## 1. Do this first (PowerShell, about 15 minutes)

```powershell
cd C:\Users\Bean\Projects\small-giants-wp
git branch --show-current
git pull --no-rebase origin main
git fetch origin claude/fervent-archimedes-wqsw2k
git merge --no-edit origin/claude/fervent-archimedes-wqsw2k
python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1
python plugins/sgs-blocks/scripts/generate-attr-role-map.py
python plugins/sgs-blocks/scripts/consistency/build-roster.py
git commit -m "chore(db): reseed for the nav parity settings" -- plugins/sgs-blocks/scripts/behavioural-analyser/css-property-classifications.json plugins/sgs-blocks/scripts/consistency/attr-role-map.json plugins/sgs-blocks/scripts/consistency/roster.json
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown
git push origin main
```

- The branch line must read `main`.
- If the merge says CONFLICT, resolve it before going on.
- If a gate fails, fix that gate (see §6 for which failures are environment noise).
- If the push is rejected, run `git pull --no-rebase origin main`, then push again.
- The merge commit may need a `[batch-ok:<reason>]` token in its message (the pre-commit hook asks for it).

## 2. What this session changed (all on the branch, commits carry `Claude-Session: …session_015nP9vshSFMxfKXqmQy28YK`)

`git log --grep=session_015nP9vshSFMxfKXqmQy28YK` lists all 27 commits. Grouped:

### Framework controls (every gap closed as a real inspector control)

- **sgs/nav-drawer-menu**
  - Item-level parity with sgs/nav-bar-menu.
  - The ornament frame sequence.
  - A no-destination row takes the link typography.
  - `megaBodyPadding`: the padding around a mega panel in its accordion (new `MegaBodyPaddingPanel.js`). The default lives in a `:where()` rule.
  - `itemSeparatorPosition` (`between` | `below`): `includes/nav-drawer-menu-separator-css.php::sgs_nav_drawer_menu_separator_below_css`.
  - The drawer link honours `itemMotionDuration`/`itemMotionEasing` through `--sgs-nav-item-motion`.
- **sgs/nav-bar-menu**
  - `scrimFadeEasing` and `scrimFadeEasingCustom`: the backdrop's own fade curve, falling back to the panel ease.
- **sgs/mega-panel**
  - The drawer form controls (I-D11).
  - Drawer colours reach their end shapes.
  - The editor previews the drawer form.
  - `drawerCardTagMargin` and `drawerCardTitleLineHeight`.
  - `shared/nav-interactivity/mega-disclosure.js::liveScale`: panels no longer lock at 1% short while the open animation scales them. `test-panel-bounds.mjs` passes 36/36.
- **sgs/button**
  - The shared `MotionEasingControl`, plus `transitionEasingCustom`.
  - The canvas previews the hover transition.
  - The lift paints `translate`, not `transform`.
- **sgs/social-icons**
  - The circle style paints a brand disc.
  - Glyph size and per-icon colour.
  - `textAlign` aligns the icon row.
- **sgs/icon**: shaped icons size as glyph plus padding (`box-sizing: content-box` on the shape modifiers).
- **sgs/mega-aside**: the aside gap default can be overridden.
- **Hover guards and shadow fallback** on the drawer section box, the ornament draw and the header ink.

### Gate fixes for other sessions' commits (fixed because the deploy refused them)

- **business-info**
  - `iconSize` is claimed as `css:width` in the layout cluster.
  - The phone, email, address and socials gap defaults moved into `:where()`, so `iconGap` owns them.
- **brand-strip**
  - `logoLayout` is a ToggleGroupControl (D812) with role `select-from-enum`.
  - `logoOpacity` is claimed as `css:opacity` on the tile.
- **site-header-row / site-footer-row**: "Show me the shrunk size" previews `rowShrinkPadding` and uses the shrink speed and curve as its transition.
- **Role overrides** in `scripts/attr-classification-overrides.json`:
  - button `iconSvg`
  - cart `pillCountStyle`
  - google-reviews `arrowStep`
  - button `transitionEasingCustom`
  - nav-bar-menu `scrimFadeEasingCustom`
  - nav-drawer-menu `itemSeparatorPosition`
  - brand-strip `logoLayout`

### Tooling

- `scripts/wp-build-page.js`:
  - A cloud-mode request queue (`PARITY_MAX_REQUESTS`, default 4).
  - Login waits only for the redirect (`waitUntil: 'commit'`).
  - Local runs are unchanged.
- `plugins/sgs-blocks/scripts/push-theme-snapshot.py::keep_font_library_families`: a snapshot push no longer switches off the fonts that are activated in the Font Library. This was the root cause of Plus Jakarta Sans and the other families disappearing. Spec 33 is updated.
- `scripts/nav-qa/gate3c/parity-indus.mjs`:
  - The Brands eyebrow pairs its own one-line element.
  - The drawer Home rule reads `a.closest('li')`.
- `scripts/nav-qa/gate3c/probe-drawer-row.mjs`: a drawer row probe.

### Trees (`plugins/sgs-blocks/scripts/nav-qa/gate3c/`)

- **indus-drawer**:
  - stretch alignment, flush rows (gap 0)
  - `megaBodyPadding` 0 0 12px 0, social gap 6px
  - CTA left with `iconGap` 8px
  - the row divider is `itemSeparatorWidth` 1px solid #D8CA50, position `below`, hover treatment none
- **indus-mega-about**:
  - transparent frame
  - tag margin-top 23px, title margin-top 7px
  - `drawerCardTagMargin` "4px 0 6px", `drawerCardTitleLineHeight` "22.5px"
- **indus-mega-trade**: transparent frame.
- **indus-header**: `scrimFadeEasing` "ease".
- **lamalama-drawer**:
  - `itemMotionDuration` 650 with quart-out
  - CTAs `transitionDuration` 350 with quart-out

## 3. Live-site changes on sandybrown (you should know about these)

- **Fonts:** four Font Library families were reactivated in the user global styles (post 7, `settings.typography.fontFamilies`), after a snapshot push had dropped them. The backup from before the change is in `.claude/backups/2026-09-30-sandybrown-global-styles/`.
- **Trees rebuilt:**
  - Indus drawer 4456, About 4426, Trade 4430, header 4461.
  - lamalama drawer 4428.
  - **Rebuild these again after this deploy**, because some settings in them only exist once the new plugin is live.
- **Active header:** it was only ever switched for a walk, and always put back to **3777**. Confirm it reads 3777.

## 4. Where the copies stand

- **Indus:** last cloud walk was 424 open (2026-09-29, before the 2026-09-30 fixes).
- **lamalama:** last walk was 254 open (your local run).
- The rows left open sort into four groups:
  - **Walker blind spots (accept with a date):**
    - Indus motion runs on WAAPI (the walker can't read it; the tree already carries the draft's exact values: panel 340ms, rows 460ms stagger 26ms cap 320, cubic-bezier(.16,.84,.32,1)).
    - The social `::before` circles.
    - The 1920 zoom rows.
  - **Structure-only, same paint, nothing hardcoded (accept with a date):**
    - inner vs outer padding, transition shorthand, display variants
    - the logo SVG vs a CSS mark, letters vs SVG glyphs
    - the canvas/showreel
    - the pitch-deck border on the inner layer
    - the message width (the reference spans the band, centred)
    - Sometype naming (lamalama's "Sometype" is the Sometype-Mono file)
    - the scrim's invisible presence at 375/768
  - **Possible timing jitter, show to Bean, don't silently accept:** the About link hover fade, and the 30ms timeline samples that move by up to 0.2 between runs.
  - **Real items:** re-walk after the deploy. Anything still off that a setting can fix goes in the tree. Anything a setting can't fix is a framework gap.

## 5. Next steps (in order, times padded)

1. **Deploy** (§1). Takes 15–25 min. Done when `build-deploy.py` finishes green and `main` is pushed.
2. **Rebuild the changed trees** with `scripts/wp-build-page.js`. Takes 20–30 min. The trees are listed in §3.
3. **Walk both copies** with the header trap. Takes 20–30 min.

   ```powershell
   $wp = "cd domains/sandybrown-nightingale-600381.hostingersite.com/public_html"
   $restore = "$wp && wp sgs header set-active 3777 --user=Claude && wp eval-file /tmp/qa-item-markup-fixture.php two-bar --user=Claude && wp litespeed-purge all"
   try {
     ssh hd "$wp && wp sgs header set-active 4461 --user=Claude && wp litespeed-purge all"
     node scripts/parity/draft-live-walk.mjs plugins/sgs-blocks/scripts/nav-qa/gate3c/parity-indus.mjs --out "$env:TEMP\walk-indus" --no-review
     ssh hd "$wp && wp sgs header set-active 4435 --user=Claude && wp litespeed-purge all"
     node scripts/parity/draft-live-walk.mjs plugins/sgs-blocks/scripts/nav-qa/gate3c/parity-lamalama.mjs --out "$env:TEMP\walk-lamalama" --no-review
   } finally { ssh hd $restore }
   ```

   lamalama sits behind a "One moment, please" bot check. It passes after a reload in a real browser.
4. **Write the dated accepts** in `parity-indus.mjs` and `parity-lamalama.mjs` for the §4 groups. Takes 45–60 min.
5. **Show Bean the jitter rows.** Bean decides accept or fix.
6. **Final walk without `--no-review`** (every state × width screenshot gets a review note), then Bean's eye check. Done when `draft-live-walk.mjs` exits 0 for both copies.
7. **Close Gate 3C item 4** in the plan §7 and the LEDGER, then `/handoff`.

## 6. Gate noise that only happens outside your machine (don't chase these)

The cloud container had no framework database. One was rebuilt from the schema, but stage 1 only; the later stages need network sources. That makes these gates fail there and pass on a full database:
- `db-consistency-run` (no `block_composition` rows)
- `audit-feature-parity` (SOURCE-MISSING: the Gutenberg source is absent)
- `dbschema-*`
- `check-colour-attr-css-property`, `classify-end-shape`
- 9 old content attributes reported as `orphan_unclassified`

`check-hardcoded-render-defaults` fails on Linux because its baseline stores Windows `\` paths. With the paths normalised it reads 0 net-new. Every other gate was checked green there:
- Check A: 0/0
- enum shape: 0 new
- shadow-lift: after `npm run postbuild`

## 7. Guardrails still in force

- Measure a copy only while it is the ACTIVE header, and always put 3777 back.
- Never `--allow-dirty` or `--skip-verify`. Never hand-roll tar/scp.
- Reseed only when `git status` shows no other session's uncommitted plugin source.
- After any walker change, `--self draft` must read 0. Don't weaken checks.
- The builder refuses per-device objects for `itemPadding`, `chromeRowPadding`, `itemBorderRadius`, `itemOrnamentGap` and `closePadding`: give flat values. This is a DB is_responsive gap, logged in the plan.
- Bean's rules:
  - Every gap closes as a real inspector control (check the block library first; most "gaps" already have a control).
  - Same-paint structure rows get dated accepts.
  - Jitter rows go to Bean.
