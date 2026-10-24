# The cloning tool's completion: fix what is known, re-clone everything, fix every root cause

**This is the approved plan for everything in it (Bean, 2026-10-23).** An orchestrator working a wave proceeds without a separate plan-mode approval. It stops for Bean only for:
- a decision this plan does not record;
- a shared-mechanism change (the wrapper, the walker, Fill's resolver, Solve) this plan does not name.

The rulings below approve the shared-mechanism changes they list.

## Purpose
**The goal.** The cloning tool meets the goal it was built for: any Claude Design draft becomes a working SGS site that the parity walker proves identical to the draft, at 375, 768 and 1440, at rest, hover, effects and motion. That proof covers:
- every surface of the three proving-ground clients: Indus Foods, Eye Care Birmingham, and Mama's Munches' redesign;
- every value written through native SGS settings found by measured effect, never one-off fixes;
- every known gap closed at its root, so that no repeat offender appears on a later client.

**Why this plan exists.** On 2026-10-23 two pieces of evidence showed that testing for unknown gaps is premature while known ones remain:
- the walker found 611 open differences on the Indus header (191 distinct groups);
- the Spec 48 audit found whole features unbuilt or broken.

So the order is:
1. **Phase 0:** the foundations that make a full run possible and honest.
2. **Phase 1:** fix every known issue.
3. **Phase 2:** re-clone and census every surface of the three clients.
4. **Phase 3:** investigate each census cause and fix it universally.
5. **Phase 4:** repeat Phases 2 and 3 until the walker reports identical.

This plan continues `plans/2026-10-21-handoff-readers.md` (its Track T next line points here). That plan's rulings 1 to 14 and its closing standard stay binding.

## How the work runs
**Tracks, one session each (Bean, 2026-10-23).** The work is grouped into four tracks with little overlap. Bean runs each as its own Opus session, compacted between waves exactly as in the handoff-readers plan (`/handoff local`, `/compact`, the next wave from the prompt that handoff wrote, named `.claude/prompts/<date>-track-<x>-<wave>.md` and deleted when used).

| Track | Owns (sole writer) | Holds |
|---|---|---|
| **W, measurement and proof** | `scripts/parity/**`; `scripts/computed-route/census-all.mjs` and `lib/census-mechanism.mjs`; `lib/delivery-map.mjs`; the gate-chain probes and `gaps.json` writer (`lib/gate-chain.mjs`, `gate-chain.mjs`); `census.mjs`, `data/census-classes.json` | The walker, the census, gap proof, done marks proven live, and the checks that refuse a false closure |
| **R, the Fill route** | `scripts/computed-route/lib/fill-*.mjs`, `lib/css-equivalence/**`, `lib/css-families.mjs`, `lib/resolve*.mjs`, `lib/db.mjs`, `lib/ledger.mjs`, `lib/pairs.mjs`, `lib/solve-*.mjs`, `skeleton*.mjs`, `fill.mjs`, `solve.mjs` | Everything that decides what is written, and the convicted Spec 48 route FRs |
| **F, the framework** | `plugins/`, `theme/`, the block specs they change | Tap areas, any block behaviour the settings map proves missing (expected none), reseeds |
| **S, sites and inputs** | `scripts/computed-route/site-build*.mjs`, `lib/site-build-*.mjs`, `manifest.mjs`, `intake*.mjs`; `plugins/sgs-blocks/scripts/theme-extractor/`; `sites/<client>/build/page-map.json`; the site setups; the Phase 2 runs | Getting every client's site and inputs right, and running the re-clone |

**The wave loop.** The skills: `/delegate` routes each dispatch and supplies the three brief lines every brief carries word for word; `/subagent-prompt` writes each brief; `/dispatching-parallel-agents` sends a batch; `/qc-council` reviews.
1. **Wide waves (Bean: time is short).** Every independent item of a track goes in one wave, with no lane cap.
   - Lanes run as API workers through `/delegate` (`python C:/Users/Bean/.claude/skills/delegate/scripts/api-agent.py --prompt-file <brief> --tools full --cwd <worktree>`, in the background), so the Agent tool's four-at-once ceiling does not apply.
   - The Agent tool is used only for work that needs MCP, SSH or a browser session (`wp-sgs-developer` for site and framework work).
   - The one hard limit: no two lanes edit the same file.
2. **Each lane works in its own worktree** (`git worktree add .claude/worktrees/<lane> -b feature/<lane> main`, then `npm ci` in `scripts/computed-route`, and in the worktree's own `plugins/sgs-blocks` (from PowerShell) when the lane runs the walker).
   - **Every brief says:** "Never link or junction any `node_modules`."
   - **Before any `git worktree remove`:** `Get-ChildItem -Recurse -Force -Attributes ReparsePoint <worktree>` must return nothing.
   - **Why:** on 2026-10-23 a lane's link let a forced worktree removal empty the main checkout's `plugins/sgs-blocks/node_modules`. It commits only if its tests and `node scripts/computed-route/capabilities.mjs --gate` exit 0. It follows `/systematic-debugging`:
   1. prove the cause on the real run;
   2. enumerate the variants as a DB-derived list of blocks, parts, states and tiers, and report its size;
   3. write MUST FAIL tests;
   4. fix it;
   5. run `tools/mutate.mjs` until red with 0 skipped;
   6. re-run the real Fill and diff it per node.
3. **The orchestrator merges.**
   - It reads every diff and merges with `git merge --no-ff`.
   - It runs the full route suite and the gates in the main checkout. Mutation runs happen only in lane worktrees.
   - It deletes each lane's branch and worktree once merged.
4. **Review.** One reviewer for the wave's diff (`/qc-council` Stage 7.5, Sonnet at medium effort). A wave that changes a shared mechanism (the walker, Fill's resolver, the wrapper, Solve) gets the full three-rater `/qc-council` instead. Then one fix agent takes the findings list.
5. **Docs.**
   - This plan's Status for the wave's items, the FR Status lines and `scripts/computed-route/README.md`.
   - Bean gets one line at each merge.

**The queue file** (`.claude/queue.md`, append-only, committed and pushed with each line).

The handoff-readers plan's lines still apply:
- `F reseed-start/done`
- `F built`
- `F deployed`
- `T site-run-start/end`

This plan adds:
- `W walker <sha> <what changed>`: Tracks R and S use a new walker only from this line.
- `R built <unit> <sha>`
- `S site-setup <target> <sha>`
- `S site-run-start <client> <what>` / `S site-run-end`

**The rule:** read the queue before any reseed, deploy, calibration, Fill run, site build or framework-DB read, and never read the DB between a `reseed-start` and its `reseed-done`.

**Gates after each merge (main checkout):**
- `node scripts/computed-route/check-approved.mjs indus-foods --no-built`: 157 match, 0 mismatch.
- `node scripts/computed-route/freeze.mjs diff-all 2026-10-21-1947`: any change shown to Bean.
- The route suite: only the known intake re-run red.
- `lint.mjs`, `capabilities.mjs --gate`, `census.mjs <run> --check`, `delivery-map.mjs <client> --check`.
- `python scripts/check-no-client-names.py --check`.

## Rulings (Bean, 2026-10-23)
The handoff-readers plan's rulings 1 to 14 stand. Ruling 11 is reworded (a cloned size overrules the 44px house minimum; a tap area fits its shape) and ruling 14 is new (no setting is missing: equivalence by measured effect first, then scoped `sgsCustomCss` with a gaps log row).

New here:
- **A. Agents.** Specialists do the work: `wp-sgs-developer` for SGS sites, settings and framework; route code through `/delegate`'s coding workers. The main thread orchestrates and checks every claim against the files.
- **B. Sites.**
  - The Eye Care re-clone goes on `eye-care-clone-test`: https://mintcream-lyrebird-224487.hostingersite.com, WordPress and WooCommerce installed by Bean, credentials in `.claude/secrets/eye-care-clone-test.env`.
  - `eye-care-test` (darkcyan-grouse) is not touched.
  - `indus-test` and `mamas-test` are rebuilt in place.
  - The Eye Care source is the local handoff folder `sites/eye-care-ward-end/handoff/`.
- **C. Fix known before testing for unknown.** No census run happens while a known issue in its path is open.
- **D. Done means identical.** The walker reports 0 open differences on every surface, apart from the accepts Bean signs. Then come the pairs, then Bean's eye (FP-13).
- **E. A done mark needs live evidence.** A delivery-map or plan "done" stands only with the walker's row or the live block's setting proving it.
- **F. Accepted difference or gap (2026-10-24).** Custom CSS for something SGS does not plan to build is an accepted difference, logged in `sites/<client>/build/qa/divergences.json` with the kind `accepted-difference`, Bean's ruling and the CSS it uses (the custom px breakpoint is the model case: the Indus nav's 10px item padding from 1024 to 1199px). `gaps.json` holds only gaps a native setting is planned for. Every custom CSS write cites exactly one of the two, and a check refuses one that cites neither. This replaces ruling 14's "gaps log row" for unplanned work.

### Decisions for Phase 1 (Bean, 2026-10-24)
1. **Focus ring: clone the browser's own ring.** Track F: `theme/sgs-theme/assets/css/focus.css` takes an outline-style token that accepts `auto`, and a switch that drops its hairline and glow and keeps the element's resting shadow. Track R: apply the held wiring (`fill-state.mjs::fillStates`, patch from the r-focus lane) and extend R1's hold so a block's hover look is cancelled on focus where the draft has none (88 Indus header rows).
2. **Staggers: no framework work.** Spec 38A §8's stagger helper (start offset, step, maximum total delay; plays on open and state) holds the three Indus staggers: mega panel items (`Math.min(i * 26, 320)`), drawer rows (`140 + i * 55`) and drawer accordion sub-items (`80 + Math.min(k * 45, 360)`). Track R: Fill writes `sgsMotion.stagger` from a record's index formula, proven on the mega panels and drawer in Phase 2; the accordion sub-list follows ruling F if it has no home.
3. **The 22 header rows with no setting.** Track F:
   - `sgs/nav-bar-menu`'s burger bars become three motion parts (Bar 1, 2, 3), each with corner rounding, length at rest and on hover, and hover timing and delay; width becomes a hover value. Indus (18/13/8px, the third bar 40ms late) and Mama's (22/22/16px) draw uneven rounded bars.
   - A burger shadow through the shared shadow control.
   - The Hover motion panel gains a colour-and-shadow timing override (duration and easing) on every motion block, defaulting to the client's `transition.fast` (all three snapshots already match their draft's most-used colour timing: Indus 250ms, Mama's 200ms, Eye Care 250ms, each `ease`).
   - A per-client hover movement timing token (Indus 350ms spring, Mama's 200ms its own spring, Eye Care 250ms ease), proposed by Track S's extractor.
   - `flexWrap` on `sgs/social-icons` (19 blocks already have it), with a detector over every block that lays items in a row without it.
   - Track S: the extractor carries every easing a draft's `tokens/*.css` declares into the snapshot (Mama's own spring into `spring`, others as extra named curves; today Indus's `--ease-button` and `--ease-in-out` and Mama's springs and drawer curve are lost), the diff shown to Bean before a push.
4. **Mama's Site Info.** Instagram `https://www.instagram.com/mamasmunches/`; copyright stored as `Mama's Munches · Registered food business` (the block prints the © and year); email `Zainab@mamasmunches.com`, with mamas-test's form recipients pointed at Bean's inbox until handover (Track S; switched back on the handover checklist). Track R: Fill writes `sgs/business-info`'s `copyrightPrefix` from the draft's wording (`""` where the draft's line has no "Copyright").
6. **Focus and the nav's open-panel look (Bean, 2026-10-24, after lane r-states).** Every SGS hover setting paints `:hover` and `:focus-visible` together (`plugins/sgs-blocks/includes/helpers-hover-state.php::sgs_hover_state_rules`), so Fill cannot cancel a hover look on focus; Fill names each such row `focus-shares-hover` (`fill-state.mjs::focusSharesHover`). Track F: a way for a hover setting to leave focus at its resting look, so decision 1 holds. Option A: `sgs/nav-bar-menu` gains an open-panel look for an item whose panel is open (background and text colour; the Indus draft tints items with a panel `rgba(10,126,168,.12)` from `openItem()`, and Contact, with no panel, stays plain), and Track R makes Fill read looks a draft sets from script (`fill-state-read.mjs` reads stylesheet state rules only). Track S: `theme-extractor` writes a link `:focus-visible` look (link-hover colour and underline) into the Indus snapshot that the draft never declares.
5. **Palette roles: the proposer must reach the answer keys.** Track S makes the palette role proposal (`scripts/computed-route/lib/tokens.mjs`) reproduce three answer keys: Indus's confirmed marks, Eye Care's `eye-care-test` snapshot, and Mama's roles as Bean ruled them (page ground `surface` `#FBF3DC`; `surface-alt` and `text-inverse` `#FFFAF0`; `text`, `heading`, `border`, `link-hover`, `primary-text`, `accent-text` and `section-text` `#3A2A22`; `section` `#F9D5D3`; `primary` `#F9CF6E`; `accent` `#EE8088`; `link` `#A8404F`; `text-muted` `#5E4A3D`; `border-light` `#EADBC0`; `footer-bg` `#FBF3DC`; `#4E3C31` a custom "Body copy"; the rest custom). The signals it lacks today: the `body` rule (page ground and default text), ground and text use counts, text-on-ground pairs, a ground the footer inherits, and one colour filling several roles. It then runs on all three clients; every remaining mismatch is a logic fix or a named review class with its reason, for an agent to check.

## Known issues and current solutions (the register)
Evidence:
- the Indus header walk (`scripts/parity/draft-live-walk.mjs` on `sites/indus-foods/build/qa/parity/header.fill.mjs`, post 201, 2026-10-23: 611 open differences, 191 groups, 56 accepted and neutralisation-verified);
- Fill run `sites/indus-foods/build/qa/fill/header/2026-10-23T04-45-48/` (87 `no-setting` rows);
- three diagnosis lanes;
- three Spec 48 auditors;
- the CSS-equivalence research.

Each row lands in the phase and track named.

### The walker (Track W, Phase 0 lane P3; the two pages match in effect for W1 to W8)
| ID | Issue (proof) | Solution |
|---|---|---|
| W1 | Paint on an inner part: `sgs/icon` paints on `.sgs-icon__shape` (34px) inside a 44px link, and the header's white ground is on its middle row. `parity/lib/paint.mjs::layoutElement` reads the block root (14 groups). | Compare paint from the pair root down to the block's calibrated part. Control: a background planted on the outer link is caught. |
| W2 | Transform spelling: the draft's `matrix(1.13881,-0.160049,…,0,-3.45)` equals the live `scale 1.15; rotate -8deg; translate 0 -3.45px`, but `compare.mjs::sameValue` compares each property alone (40 groups). | One composed matrix per element and state, with a tolerance. Controls: a doubled lift, and a lone `rotate: 1deg`. |
| W3 | Transition lists compared as text or sets (`compare.mjs::timingSet`). | Timings by property name, `transform` mapped to `--sgs-mh-*`. Control: two durations swapped. |
| W4 | An outer pair reads another block's text by DOM order (`collect.mjs::collectPair`, `textCarrier`) (23). | Descendants paired by draft identity, each compared exactly once per width. |
| W5 | The draft is left scrolled: its header shadow is set only when `scrollY > 8` (the `_headerEl.style.boxShadow` line), and full-page capture leaves it scrolled (13). | Scroll 0 and settle before reads; the scrolled state stays its own state. |
| W6 | The live header's links are skipped (`auto-walk.mjs::AUTO_EXCLUDE`) (8). | Reuse `pairs-page.mjs::liftedExclusions`. |
| W7/W8 | `computed-route/lib/pairs.mjs` pairs the draft's main bar with the whole header, and one draft element with two per-width instances (8). It also feeds Fill. | Track R, Phase 1 wave 2, with a full Fill tree diff and the freeze diff. |
| W9 | Never measured: the nav items' hover, the current underline, the caret, the burger bars, the social links' hover colours. | Hover and read every interactive part, paired by identity. |
| W10 | Effect layers are never measured. The header CTA (draft tpl 54) has the magnet (J-10), a sheen (A-18) and a press ripple (A-19); live has only the magnet. | Rows for an effect layer appearing on hover or press. |
| W11 | The census sorts by element; the 87-row `no-setting` class mixes equivalents, shared settings and inert values. | `census-all.mjs` groups by mechanism signature across every surface and client (Phase 0 lane P5). |
| W12 | A done mark was never checked live: `lib/delivery-map.mjs::mapProblems` checked only that the commit exists, so A-18 and A-19 showed done (`6f3d09beb`) though absent. | Fixed in Phase 0 (P4, `116e035b1`) and Phase 1 (W-open, merge `fb5da4a67`): a done key needs the walker's live evidence or a layer on the block that renders the record's own draft element (`lib/delivery-bind.mjs`), and a done `state:` key's commit must change that surface's files (`lib/delivery-state-files.mjs`). Indus `--check` fails 21 keys: A-20, J-10 and J-11 joined the 18 because the built trees carry no `draftRef` (Track S) and no Indus header walker report is on disk to show them live. |
| W13 | No gap was ever proven real. FR-48-64's G5–G7 live probes and FR-48-66's `gaps.json` are built in Phase 0 (`2dca642b1`, `2e315026f`). | Built in Phase 1, Track W: FR-48-65's classes (`lib/gap-classes.mjs`), FR-48-67's `instrument-debt.json`, FR-48-68's backlog and re-check, and `gate-chain.mjs --client` writing `gaps.json` (it imported the writer but never called it). |
| W14 | Found by the second-client walk (`.claude/reports/2026-10-23-second-client-header-walk/report.md`, N3): parts are paired by accessible name, so one link whose name differs between draft and live ("eye care birmingham" against "go to eye care birmingham (sgs test) hom") splits into three presence rows (91 rows on Eye Care's header). | Done in Phase 1 Track W wave 2 (merge `5be5dd8f4`, review fix `11af0d7f7`): parts pair by name, then destination, then kind, place and size, never across two differing destinations; a renamed part is one `label` row. Eye Care header at 768 closed: the split link's 3 presence rows became 1 label row and 1 real live-only link. |
| W15 | Second-client walk N11: the `text: false` root pair `gen-header-1` reads the wordmark's text properties on the draft side and `undefined` live (63 rows in the documented runs; suspect `230daa592`). | Done in wave 2 (merge `28362ef35`, review fix `11af0d7f7`): cause proven (`paint.mjs::textCarrier` took the first unowned text, which the draft painted as the wordmark and live as an image). Where only one side paints text there the pair has one `text presence` row; both painting text compare as before. Eye Care `mega-shop` @375: gen-header-1's 9 text rows gone. Also Track R's R11 item 2: `layoutChildren` is recorded and a gap compares only where a side lays out two or more flex or grid items (pseudo items and `display: contents` children counted); the Indus Register buttons' 6 gap rows gone. |
| W16 | Second-client walk N10: a border colour is compared where the border is 0px on one side, duplicating the width row (39 rows). | Done in wave 2 (merge `0efe7b416`, rule corrected in `3c7964291`): a border colour is a row only where the draft paints that edge, a style where either side has a width, so a draft border live lacks keeps its colour and style rows for Fill. Eye Care `mega-shop` @1440: the N10 colour rows gone, the width rows kept. |
| W17 | Second-client walk N12: a state does not close what the previous state opened (the 375 scrolled shot keeps the nav drawer open on both sides; `header-bar` `y-in-main` 294 against -69), so 521 rows inherit the previous state. | Done in wave 2 (merge `b44f15bf4`, review fix `11af0d7f7`, layer rule `78078d20a`): every state starts from the page's rest (`lib/state-rest.mjs`); a state off rest reloads, one still off rest is a `not-at-rest` row, a state that finds nothing to trigger on both sides is one `nothing-to-trigger` row, `from: 'previous'` chains a step, and neither counts as evidence in the gate chain or the draft-branch verdict. Eye Care @375 `scrolled`: the drawer is closed and `header-bar` `y-in-main` reads 294 against 289 (was -69). Left: Track S scopes the Eye Care header's mega and drawer states with `widths` (10 `nothing-to-trigger` rows until then). |
| W18 | Found by Track R's R11 diagnoses (`.claude/reports/2026-10-23-track-r-r11-diagnoses.md`, item 1b): a pass-through `height:100%` box (the Indus draft `<nav style="height:100%;display:flex;align-items:center">`, 84px) is compared against a live auto-height root (42px) whose items sit in identical boxes; `sgs/nav-bar-menu` has no root height setting, and the box paints nothing. | Done in wave 3 (merge `9d2f168e7`): a draft box that paints nothing on the cross axis of a single-line flex container is compared through its items (`collect.mjs::collectPair` `passThrough`, `compare.mjs::passThroughHeld`); its `w`/`h` row drops only when the draft box is larger than its items, neither side paints, and every item sits in an identical box. Indus nav `h` rows at 1440 and 1920 (84 vs 42) gone with nothing added; the draft does not render that nav at 768. Planted controls: items move, the draft box paints or clips (clip-path, contain, mask, opacity, blend), a draft with more links, extra text or an overflowing box, only live differs; a live nav that splits a draft button into link plus toggle must tile it exactly (the Indus draft navigates with buttons, the clone with links). Spec 48 §3.6 item 22. |
| W19 | Track R's equivalence fix judges `text-align: start/end` and a block container's `justify-content` only when it knows `direction`, `column-count` and `column-width`, which the walker never read. | Done in wave 3 (merge `9d2f168e7`): the three are in `collect.mjs::DEFAULT_PROPS`, read on every pair and never compared (`CONTEXT_PROPS`, skipped by `comparePair` and the divergence ledger). `calibrate-props.mjs::READ_KEY` follows the list, so every cached calibration is stale until recalibrated (Track R recalibrates the Indus header blocks; Track S runs Eye Care's calibration only after). The three also reach Fill's read list: Track R's queue note. Spec 48 §3.6 item 23. |
| W20 | The 18 `(links)` rows in Eye Care's 375 `scrolled` state for the mega-shop labels were untraced. | Traced in wave 3 (merge `9d2f168e7`, GAP-CHECKLIST §32): not a walker artefact. The mega panels are hidden on both sides at tablet and mobile (the drawer hides the mega menu, Bean confirmed 2026-10-24), but `header.mjs::LINK_GROUPS` still promises the mega-shop, brands, lenses and help labels at those widths. Track S gives each link group the widths it applies to (desktop only) and scopes the header states with `widths`. |

### The Fill route (Track R, Phase 1)
| ID | Issue (proof) | Existing setting | Solution |
|---|---|---|---|
| E | Fill cannot see equivalent forms or shared settings. `lib/db.mjs::candidates` matches a declared `css_property` by name, and `property_equivalents` has 4 hand rows. The 87 `no-setting` rows include caret `opacity`, burger-bar `background-color`, `white-space-collapse`, header `position`/`z-index`, `flex-shrink`, corner longhands, and `text-align` on the burger. The 2026-10-19 audit already maps these properties (`.claude/reports/2026-10-19-css-equivalence-audit.json`). No published tool decides CSS equivalence (research notes: session scratchpad `research/research_notes/CSS equivalence matching methods/`). | Colour alpha, `burgerColour`, `textWrap`, `headerSticky`/`zIndex`, `sgsChildSizing`, the radius shorthand, inert | **FR-48-86**: setting equivalence by measured effect (five layers: spelling from `@webref/css` + mdn-data, canonical values in the browser, paints-nothing detection, setting effects from calibration including the shared extensions, the live oracle). FR-48-76's predictor supplies layer 4. `wp-sgs-developer` maps the 87 rows independently as a cross-check. |
| R1 | A block's default hover is never cancelled (`lib/fill-state.mjs::stateDrafts` writes only declared hover properties). The Register button's border and label turn gold; the icons swap colours. | `brandHover: hold`, `childIconBrandHover`, `borderColourHover`, `colourTextHover` | Compare the draft's hover end state with the block's calibrated hover default for every hover-capable property. |
| R2 | One hover lift written twice. `lib/fill-preset.mjs::presetWrites` keeps the per-instance `motion …` write, so the preset `hover-transform` and `sgsMotion` both paint: 1.10× against 1.05× (157.8px against 150.3px). | `sgsMotion` | The preset leaves out every property per-instance motion writes. Test: one writer per property. |
| R4 | Per-tier fallbacks: `multi-button/render.php` uses 8px when `gap.mobile` is empty, while `fill-held.mjs::coveredBySetting` assumes desktop cascades. Gap 8 against 10; line-height 20.4 against 26.35. | Tier objects | "Covered" judged per tier against the block's calibrated per-width fallback. |
| R5 | "Default" judged on the calibration page (`fill-held.mjs::classify`): the grid cell's 24px padding was held as 0. | `padding` | The live confirm read replaces the calibration-page judge. |
| R6 | `none` unwritable (`fill-dimensions.mjs`; `resolve.mjs` handles `none` only for `backdrop-filter`): the logo is 206px against 238px at 375. | `maxWidth` | Keywords accepted for every size-family setting whose CSS takes them. |
| R7 | A declared value dropped silently: nav letter-spacing −0.17px gets no write, held or unwritten row (likely `lib/fill-page.mjs`'s `em` path). | `itemLetterSpacing` | The conservation check is built (Track W, merge `704e148a5`): `census.mjs <run> --check` fails when a declared value on a paired part ends neither written, held nor unwritten. On the Indus header run 480 of 690 real declared values drop (`.claude/reports/2026-10-23-conservation-drops.md`), the letter-spacing among them, many because Fill relies on a block default without a held row. Track R: `fill.mjs` writes `reads.json` through `lib/census-reads.mjs`, then fixes each drop. |
| R8 | Transitions written as one duration (`lib/fill-timing.mjs::oneTiming` returns null for a list). | `sgsMotion` duration/easing; the block's transition settings (through E) | Split per property. |
| R9 | The sheen and ripple were recognised (`lib/motion-behaviours.mjs`) but never written on the header CTA. | `sgsMotion` effects `sheen`, `ripple` | Trace why the recogniser's records did not reach the CTA; write them. |
| R10 | Not built: FR-48-9 ledger path scope; FR-48-10 link lists pair on their first link; FR-48-14 Solve does not load the fact record (child writes instead of one parent write); FR-47-2 layout and enum presence reads; FR-48-4 margin trials; FR-48-5 guard memory. | | Each FR's own done-when. |
| R11 | Diagnose first: the tablet CTA box (`-14`: 0 height at 375, column at 768, padding 24), the Register buttons' 8px gap reading 0, the nav's 84px height read as 42px, and the 768 "Register" centred instead of beside the burger. | | Probed after the walker merge, then filed. |
| R12 | Residuals carried from the handoff-readers plan: `solve.mjs` loading the fact record and origin map (FR-48-14's loop-body check on a real Solve); FR-48-69's per-client `draft-defects.json`; the per-index stagger ladders (A-12, A-14, A-39); the drawer CTA bar rise (A-37); a magnet's pointer-leave spring-back (J-67); `lib/fill-step-rungs.mjs` writing the 1024–1199px nav padding only on measured items; the census's 82 dead hover settings that `tools/fixture-completeness.mjs` cannot explain; the flaky tests (`calibrate-size-box`, `wp-build-page-inserter-defaults`, a random-item test); files over 400 lines split by responsibility (`lib/skeleton-propose.mjs`, `lib/motion-behaviours.mjs`, `lib/fill-motion.mjs`, `lib/fill-row-lift.mjs`). | | Each with a MUST FAIL test. |

### The framework (Track F, Phase 1)
| ID | Issue (proof) | Solution |
|---|---|---|
| F1 | A built-in tap floor beats the cloned size: `icon/style.css::.sgs-icon__link` sets a 44px minimum, so the icons are 44px against 34px and the group is 206px against 166px and wraps (18 groups). | Per ruling 11, a tap area fits the block's own shape or size setting, and 44px is only the default with no size set. Detector first (migration-method) over every block's hard-coded 44px floor. **Done 2026-10-23** (`8fcc15e78` to `7778b1e8a`). The detector `plugins/sgs-blocks/scripts/check-tap-floors.py` (fast gate) reads every block stylesheet, the hit-area arithmetic in any property and the render PHP that prints CSS. 156 literal floors remain, every one on an element no setting sizes: 52 in blocks with no size setting, 104 listed with their reason in `scripts/data/tap-floors.json`. About 40 floors in 22 blocks and 6 shared nav helpers now follow their setting: a 0px flag printed beside the size in the same tier (icon and social row, cart trigger and close, wishlist link, store selector, theme toggle, gallery tile, media link, rating badge, burger and its `::after`, sub-toggle caret, drawer expander, drawer close), the setting's own property (business-info link, whatsapp button, tabs, sub-toggle link), or the floor removed (the form's `max(44px, …)` field heights, the detach chip's 44px clamp, two dead rules). The cart `iconSize` lost its default, so a set 24px counts (one reseed). Proof: `tests/playwright/tap-area-fits-shape.check.mjs` (full gate, 42 cases at 375, 768 and 1440; 59 of 59 sized readings red at `8d031622f`) and PHP render tests. Live on indus-test at `7778b1e8a`: the four header social links measure 34x34 at 768 and 1440 and the row 166px; at 375 the row is hidden, as in the draft. Review: one Sonnet reviewer and one fix agent; every confirmed finding is fixed. |
| F2 | Whatever `wp-sgs-developer`'s settings map proves has no SGS home. Expected none (ruling 14). | Built only with Bean's decision. **Open:** it waits on Track R's settings map (register row E), not yet written. The F1 lanes named the elements a cloned draft could size below 44px with no size setting to do it. Under ruling 14 these take measured-effect equivalence, then scoped `sgsCustomCss` with a gaps-log row, so none needs a new setting unless the map says otherwise. They are: the account controls; buybox notify and guided buttons; cart panel controls; choice-flow chrome and option buttons; option-picker pills; product-card gallery thumbs; nav-drawer chrome slot and logo link; modal trigger; notice-banner close, pause and arrows; business-info social links; brand-strip text tile; trust-bar text-only badge; drawer drill-back; nav sublink and sub-toggle-link width; carousel dots and arrows (gallery, post-grid, google-reviews); gallery lightbox close; before-after handle, thumb and video toggle; media video buttons; form submit and tab widths; and the google-reviews maps link. |
| F3 | Two red tests in Track F's area, both stale tests, not regressions. | **Done** (`4b5674467`): `IconRenderTest` "unknown unit" now refuses `vmin` and `ch` and accepts `vw`/`vh` capped at 100, which `57978eae8` made valid on purpose; `run-u10-u14-standalone.php` 4d/4e assert the rules `77142e513` (token-list `~=`), `ac4022985` (magnet on `translate`) and `b769e818b` (G-2, only interactive elements escape the overlay) shipped without updating it. Each has a MUST FAIL run (reverting the change turns its case red); 34/34 and 35/35. |

### Sites and inputs (Track S, Phase 0 and Phase 1)
| ID | Issue (proof) | Solution |
|---|---|---|
| S1 | The re-clone is blocked: `lib/site-build-plan.mjs` stops on `product`, `product_cat` and `shop` rows; FR-48-55 part 6 (the `woocommerce_*_page_id` options) is not built; FR-48-56 template rows are not driven; Eye Care has no `build/page-map.json`; Mama's redesign has no `build/surfaces.json`. | Phase 0 lane P2. |
| S2 | No site for the Eye Care re-clone. | Phase 0 lane P1: `eye-care-clone-test`, Spec 48 Appendix A. |
| S3 | T4: `theme-extractor/typography.py` synthesises 16px/1.6 labelled `declared` (against FR-33-3); the palette is read from the README, not `tokens/*.css` (§11, FR-33-1); FR-33-12 snapshot freshness is partly built. | Phase 1: tokens read from `tokens/*.css` with a MUST FAIL test, a refusal when the fallback fires, the snapshot diffs shown to Bean before any push. |
| S4 | Inputs a full run degrades without: FR-48-58 stock previews not uploaded; FR-48-57 form validation copy and live submission; `site-options.json` (the route fade) not applied by the site build; FR-48-60/61/62 shop parts and fixtures. | Phase 1, each FR's done-when. |
| S5 | The page-map proposal (intake FR-48-30, `scripts/computed-route/lib/intake-pagemap*.mjs`) classifies surfaces by position and name, not by what they are. Bean, 2026-10-23: the bag drawer is part of the cart block, a checkout header is internal to its surface, and only the site header and the nav drawer are layout surfaces. Eye Care's proposal, compared with the built `eye-care-test` site (2026-10-23): (a) 4 `sgs_drawer` rows where the site has one nav drawer, the bag and filter rail being their blocks' own parts; (b) 8 `sgs_form` rows where the site has one SGS form (contact), sign-in, register, reset, details and addresses being WooCommerce's own account forms; (c) a lens configurator proposed as an `sgs_modal`, where it is the `sgs_choice_flow` post; (d) 4 mega panels collapsed into one `sgs_mega_menu` row; (e) WooCommerce's order-received endpoint proposed as a child page of checkout; (f) the shop page's slug and title swapped (`sunglasses`/Shop against WooCommerce's `shop`/Sunglasses, which would orphan page 6). Mama's two headers and two drawers are the same defect. | Classify each surface by what it is: a block-owned part (the cart's bag, a filter's drawer) belongs to its block; a WooCommerce flow's forms, pages and endpoints are WooCommerce's; a choice flow is `sgs_choice_flow`; one mega panel per menu item. Only a site-wide header, footer and nav drawer become layout rows. `chooseActive`'s guess is then removed. MUST FAIL tests for each of (a) to (f); then regenerate the page maps of all three clients. For Eye Care, `eye-care-test`'s built site is the answer key. |

## Phase 0: foundations (done 2026-10-23)
| Lane (agent) | Track | Work | Waits on | Done when | Status |
|---|---|---|---|---|---|
| P1 (`wp-sgs-developer`) | S | S2: the `eye-care-clone-test` target in `plugins/sgs-blocks/scripts/deploy_common.py::TARGETS`, then Appendix A steps 2–10, 12 and 13 | nothing | A verified deploy with a host marker; theme, snapshot, WooCommerce, mail and Site Info live | done 2026-10-23 (`67f2bd582`). Host marker `67f2bd58`; theme and plugin active; snapshot md5 matches; WooCommerce GBP/GB with pages 6–9, a UK flat-rate zone, VAT-inclusive prices and cash on delivery; mail `--check` PASS; noindex; `/%postname%/`; icon attachment 21; Site Info's 14 keys from the draft. Appendix A step 13 done in Phase 1 (Track S): `local-eye-care` mirrors this site (`cr-calibration` page 23). |
| P2 (API worker, Sonnet) | S | S1: shop rows, part 6, template rows, Eye Care's page map, Mama's page map validated | nothing | Dry-run `site-build.mjs` plans every row for all three clients with no stop; MUST FAIL tests per row kind | done 2026-10-23 (`54b4a34ea`, `a0a7347b4`, merge `4dad0da0c`): dry runs plan Indus 0 creates and 1 change, Mama's 50 and 12, Eye Care 33 creates, 13 changes and 2 adoptions, none stopping; the page maps were then reclassified in Phase 1 (S5) and Bean confirmed all three on 2026-10-23 |
| P3 (API worker, Opus) | W | W1–W6, W9, W10, each with its planted control; the `benchmark.mjs --noise` catch-rate guard | nothing | Every control caught; catch rate not lower; the Indus header re-walk drops the artefact groups and lists the survivors | part 1 done 2026-10-23 (merge `a6d551041`): W2, W3 and W5 (W5's cause was the live header page being too short to scroll, not a draft left scrolled); the header fell from 611 to 460 open rows; W2 9/9, W3 12/12 and W5 5/5 mutations killed. The survivors confirm R2 (live lifts 1.1025× and 4.3px against 1.05× and 2.1px) and R8 (shadow 0.25s `ease` against 0.2s or the spring easing). New: in the scrolled state the draft header stays in view and the live one scrolls away (the tree sets `headerSticky` only at desktop), to check. Part 2 done (lane P3b, `436ac66f7` to `60b355ad8`, merge `c8a356351`): W1 (paint from the painting element), W4 (owned text), W6 (lifted header and footer exclusions), W9 (every interactive part hovered and pressed), W10 (effect layers), Check A (the spacer inside the sticky header's wrapper), and the benchmark's optician cases now serving the handoff locally. The second-client walk was not done (the lane hit its budget). After P3b the walk read 646 open rows (up from 460), and after the review's fixes 682, because the walker now measures what it never saw: the CTA's sheen band and ripple circle, the nav items' hover ground, the current item's gold underline layer, focus looks on every header link, and parts' resting looks. The review's findings are fixed and merged (see Review below). |
| P4 | W | W12, plus W13's G5–G7 probes and the `gaps.json` writer | P3 | `delivery-map.mjs indus-foods --check` fails on A-18/A-19 (MUST FAIL test) | done 2026-10-23 (`82a82224d`, `2dca642b1`, `2e315026f`, merge `c2407168f`; 40 of 40 mutations red). `--check` now fails on 18 Indus keys: A-18 and A-19 are absent live (R9); 14 home-page keys have no built tree yet (Phase 2); A-10 is a site option; A-16 and A-40 are unnamed loops no tree setting identifies. The effect-row shape was settled by `116e035b1`: the delivery map reads the walker's per-pair `effects` record. Closed in Track W Phase 1 (W-open, merge `fb5da4a67`): tree evidence binds to the block rendering the record's own draft element, so `--check` now fails 21 Indus keys (A-20, J-10 and J-11 added, the built trees carrying no `draftRef`). |
| P5 | W | W11, `census-all.mjs` | nothing (started early; rechecked against P3's report format at P3's merge) | The header's groups classified with 0 unclassified | done 2026-10-23 (`7346197bc`, merge `f13a178c2`): the Indus header's 330 rows (walker and Fill) in 182 mechanism groups, 0 unclassified; 12 of 12 mutations red. Open: Eye Care's October Solve walks have no Fill tree, so `--check` over every client fails on 884 rows without a block until Phase 2 replaces that data. |

Review (done 2026-10-23): the full three-rater `/qc-council` over all of Phase 0 (`62c6ed2e8..HEAD`) found 29 issues plus the effect-row mismatch the main thread had confirmed. Three fix lanes (the walker, the proof chain, the site build) reproduced every finding with a MUST FAIL test before fixing it, 86 mutations red, merges `cf4b4de39`, `51bf509bf` and `4ab666188`. The main thread then adapted the delivery map to the walker's effect record (`116e035b1`: an effect counts as shown by its layer shape, `data/effect-layers.json`), so `delivery-map.mjs indus-foods --check --walk <report>` now fails A-18 and A-19 on the walker's live evidence ("the live page lacks added band"; "added circle").

## Phase 1: fix every known issue (waits on Phase 0's merges)
One wave per track, every item in it at once.
- **Track R** runs E, R1, R2, R4–R10, R12 and the R11 diagnoses together. Each owns distinct files, with one exception: R8's transition settings come through E, so R8 lands after E inside the wave.
- **Track W** runs W13's I-classes, instrument debt and backlog (FR-48-65, -67, -68), FR-48-12's lint gate and FR-48-15's citation check. W7/W8 belong to Track R, which owns `lib/pairs.mjs`. Wave 1 done 2026-10-23 (merges `517573a0d` to `f0bd824af`, review fixes `f88e8570b`): FR-48-65, -67 and -68, `gaps.json`, FR-48-12, FR-48-15, R7's conservation check, W12. Wave 2 done 2026-10-23 (merges `0efe7b416` to `b44f15bf4`, review fixes `11af0d7f7`, then `78078d20a`): W14 to W17, the walker records hover and pressed declarations and G2 reads them at the row's own state and element (`d911f09fa`), `gate-chain.mjs`'s walks are lint-gated per state, census I-class rows carry evidence, `rule-origin.mjs` refuses WordPress- and theme-owned stylesheets, `walker-lint.mjs` has tests. Spec 48 §3.6 items 20 and 21. Open rows, full walks before and after the wave (the walker at `20fd8c5a6` against `78078d20a`, draft served locally): Eye Care header 2664 to 2466 (28 runs), Indus header 898 to 862 (8 runs). The full three-rater review found 6 Critical and 9 Important defects (three ways the walker could call two different renders equal, parts paired across differing destinations, and a state that measured nothing counted as evidence), all fixed red-first with mutations killed; the final Indus walk then found the rest check refusing a state over the logo's animated svg paths (`78078d20a`). Wave 3 done 2026-10-24 (merge `9d2f168e7`): W18, W19 (context reads), W20 (the scrolled link rows traced to the config). A stale lens benchmark case stays with Track S. Re-walked with the bare served draft URL (the wave-2 Indus counts used a URL with the file name, which fails the draft's `Root` lookups): Indus header 1370 open rows at both `7d9d0fe2a` and `9d2f168e7` with the committed config (which is stale against the live header and does not pair the nav); Eye Care header 2466 at both, no refused run. The three-rater council found no Critical defect and 5 Important or Minor ones in W18's paint flag and item checks, all fixed red-first (merge `80adb76ba`, then `26566ebda` after the fix's first round re-raised the real Indus nav row in a confirming walk: 62 of 62 mutations killed, Indus nav `h` rows gone at 600 open rows with the current uncommitted config). Next (Track W): wave 4 waits on Track R and Track S results (Phase 1 proof); nothing else is open in Track W except what their runs surface.
- **Track F** runs F1.
- **Track S** runs S3 and S4.

Each unit's done-when is its FR's, plus a re-run of the real Indus header Fill with a per-node tree diff. Track R's wave ends with W7/W8 in `lib/pairs.mjs` and the freeze diff for both clients.

**Done when** every register row is fixed with its proof, or moved by Bean's decision, and the header walker reports only rows a later phase owns.

## Phase 2: the full re-clone and census (Track S runs, Track W measures; waits on Phase 1)
Per client, inside `S site-run-start <client>` / `S site-run-end`. The order is Indus (`indus-test`), Mama's redesign (`mamas-test`), Eye Care (`eye-care-clone-test`):
1. a `mysqldump` backup;
2. `site-build.mjs <client> --site <target> --apply`;
3. `manifest.mjs <client> --apply`;
4. per surface (61, 58 and 52): skeleton `propose`, Fill, then `scripts/wp-build-page.js` (dry run, then build);
5. the walker at 1440/768/375 with hover, effects and motion, three surfaces at a time in the background (a failed surface is logged and the run continues);
6. `census-all.mjs` over the three clients.

**Done when** Bean has the cross-client cause table: each mechanism class with its rows per client, the existing setting or mechanism it lands on, and the Spec 48 FR that owns it.

## Phase 3: root causes and universal fixes (waits on Phase 2's table)
1. For each census class, run `/systematic-debugging` to the mechanism.
2. A design council covers every shared-mechanism change (`/qc-council`, or `/adversarial-council` for a new mechanism).
3. Implementation goes in wide waves in the owning track.
4. Every fix covers every variant its class names (ruling 13).

**Done when** every class is fixed with its proof, or is a gaps-log row Bean has seen.

## Phase 4: loop until identical
Repeat Phase 2 (only the surfaces a fix touched, plus one full pass at the end) and Phase 3, until rulings D and E hold on every surface of the three clients. Then come the pairs for every surface and Bean's eye, which is the sign-off.

## Status
### Done
- [x] 2026-10-23: the Indus header walk and census, three diagnosis lanes, an adversarial council on the fix plan, the CSS-equivalence research, and the Spec 48 audit; this plan written.
- [x] Spec 48 updated (FR-48-86 added; FR-48-76, -51, -81 and -8 Status lines corrected); handoff-readers rulings 11 and 14 and closing standard #5 updated; the project `CLAUDE.md` touch-target line reworded.

### Next
- [x] Phase 0, done 2026-10-23: P1 to P5, the review and its fixes. Main-checkout proof after the last merge: route suite 2694 of 2695 (only the known intake re-run red); check-approved 157/0; freeze diff unchanged (Indus 120/11/11, Mama's 182/7/0); lint, `capabilities.mjs --gate` and the client-name check pass. The Indus header walk reads 682 open rows, every one a real difference or a row a later item owns: the measurement artefacts are gone, and the walker now sees parts, effects, focus and resting looks it was blind to. The delivery map fails 18 Indus keys: A-18 and A-19 on the walker's live evidence, 14 with no built tree yet, A-10 a site option, and A-16 and A-40 unnamed loops.
- [x] Phase 1 Track S (2026-10-23): S3, S4 and S5 built and merged, then the three-rater review and one fix lane (`e005e5730`). Main-checkout proof: route suite 3092 with only the known intake re-run red; extractor 320 of 320; the three `intake.mjs --page-map` runs 0 changes; the three site-build dry runs plan with no stop (Indus 0/2/0, Mama's 27/10/4, Eye Care 24/11/4 creates/changes/adoptions).
  - **S5:** the page map classifies each surface by what it is (`lib/intake-pagemap-owners.mjs`, `lib/intake-pagemap-commerce.mjs`); `chooseActive` and `site-build-decisions.json` are gone; `intake.mjs --page-map <client>` regenerates offline. Eye Care matches `eye-care-test`'s types and counts. Bean confirmed the three maps on 2026-10-23, with two rulings: a page title uses the draft's wording ("Your bag", "Sign in / register"), and the shop keeps WooCommerce's `/shop/` and product addresses, not the manifest's `/sunglasses` and `/frames/`.
  - **S3:** the extractor reads `tokens/*.css`, refuses its undeclared fallbacks, re-hashes and stamps the MANIFEST files, and reads no README on a 48A export. The route's freshness gate (`lib/snapshot-freshness.mjs`) is built but not yet called by `loadSnapshot`.
  - **S4:**
    - FR-48-57: required and too-long copy, the form step and review nodes, and `form-submit-check.mjs`. Its live run waits on Phase 2, because the forms are placeholders.
    - FR-48-58: stock previews uploaded (indus-test 30, eye-care-clone-test 9; reruns upload 0).
    - Site options: applied from `sites/<client>/build/site-options.json`.
    - FR-48-60 to -62: shop parts matched by structure into `build/shop-parts.json`, and fixture products on mamas-test (107, 108) and eye-care-clone-test (82, 83).
  - **Sites:** the `local-eye-care` mirror copies `eye-care-clone-test` (`cr-calibration` 23). mamas-test went through Appendix A: WooCommerce pages 100 to 103, noindex and mail.
  - **Before Phase 2 (Track S unless named):**
    1. Palette proposer to its three answer keys (decision 5; lane running 2026-10-24). Then Bean marks Mama's palette roles and Eye Care's role map (Eye Care has no intake record); re-extract and commit the three snapshots, show Bean the diffs (they now carry every draft easing: `motion_tokens.py`, merged `c67548cfe`; the hover movement timing token stays a trace proposal until Track F names it), push them, and wire `assertSnapshotFresh` into `loadSnapshot`.
    2. Mama's Site Info: done 2026-10-24 (Instagram, email, copyright written to mamas-test; its mail already redirects to Bean's inbox; the go-live checklist's IF-6 switches recipients back at handover).
    3. Calibrate Eye Care's block set on `local-eye-care` (its paint folder is now `eye-care-clone-test`'s, empty).
    4. Track R: `lib/motion-behaviours.mjs::routeFadeOf` misses Indus's record A-12, and Fill does not yet read `build/shop-parts.json`.
  - **Still classified by words:** the `single-product` and `post` rows, and `lib/shop-parts-read.mjs`'s `NAMES` file pick.
- [x] Phase 1 Track F (2026-10-23): F1 done and live on indus-test (`7778b1e8a`); F3 done (`4b5674467`); F2 waits on Track R's settings map.
- [ ] Phase 1, as four sessions Bean runs, one per track (Track R from `.claude/prompts/2026-10-23-track-r-phase1.md`). Track S's and Track F's waves are done; Track W's waves 1 to 3 are done.
- [ ] Phase 2 to Phase 4 as above. Phase 2 starts once every Phase 1 track has closed and Track S's before-Phase-2 list (its Status line above) is done; Bean confirmed the regenerated page maps on 2026-10-23.

## Verification
- Per unit: MUST FAIL tests across the variant list, red mutations with 0 skipped, `capabilities.mjs --gate`, and the real-run proof.
- The walker: every planted control is caught, and the benchmark catch rate never drops.
- The census: 0 unclassified rows, grouped by mechanism.
- Closing: the walker reports 0 open differences on every surface of the three clients, then Bean's eye on the pairs (FP-13).
