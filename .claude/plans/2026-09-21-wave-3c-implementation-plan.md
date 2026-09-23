---
doc_type: implementation-plan
project: small-giants-wp
spec_id: 36+37 (merged execution track)
status: READY TO EXECUTE
parent_plan: .claude/plans/2026-07-29-merged-spec36-37-track-strategic-plan.md (Wave 3C)
inputs: .claude/reports/reference-requirements/FAMILIES-MASTER.md, .claude/reports/reference-requirements/families-master.json, .claude/reports/reference-requirements/FAMILIES-REVIEW.md
---

# Wave 3C implementation plan

## Read this first

- **What this is.** Wave 3C of the merged Spec 36 + Spec 37 nav, header, footer and drawer
  track. Thirteen reference sites were measured, clustered into 46 capability families and
  signed by Bean. This plan turns that signed list into build work.
- **The state.** Nothing in Wave 3C is built yet. The families are signed and the units below
  are the build order. Scope is FULL: every signed family is built. Nothing is parked,
  deferred or dropped. Bean answered the eight open questions on 2026-09-21 (section 1).
  Bean is on a time crunch: be token-efficient, run the loop as written and add no extra reviews.
- **The four things to do first.**
  1. Read section 1 (Bean's answers). Nothing there needs asking again.
  2. Read section 9 (commands, fixtures, gotchas, lessons) so you do not rediscover them.
  3. Run Step 0a and Step 0b (section 3). 0a needs plan mode exited because it writes
     to the shared framework database.
  4. Start U-1 through the per-unit loop in section 5.
- **What else to read.** Section 9's lessons before anything. Spec 36 in full before U-1.
  Spec 37 sections 1 and 2 before any drawer unit. The unit's own reference JSON rows before
  its design gate. The reading list in `.claude/prompts/2026-09-21-wave-3c-start.md` is the
  session's full gate.
- **Bean's answers** (section 1): force-solid gets a solid resting colour, the drawer clamp is
  dropped, full scope, three accepted divergences, no file splits, sandybrown only, the Indus
  Foods draft is the capped-header exemplar, and a Lottie player is built from a researched model.

## 1. Bean's answers (2026-09-21)

Nothing here is open. Where an answer needs work, the step is named.

**(a) Force-solid header background: build it.** The header already has a transparent mode. The
"force solid" setting at a tier must give a solid resting colour: the header's own resting
background (its surface token). Built in U-1 for every header, with or without the pill.

**(b) Trigger-anchored drawer overhang: dropped.** Canary page 3699 was a loose test page, so
there is nothing to clamp; the clamp and its Spec 36 wording are not built. Page 3699 is in the trash
(Bean approved). Pages 3692 to 3695 are the same kind of loose page and stay until
Bean says otherwise; none of them is evidence. Testing uses real CPTs: Step 0f creates a test
`sgs_header` and a test `sgs_drawer` post and activates them.

**(c) Full scope: confirmed.** Every signed family is built: U-6 includes M-24 and M-25, U-8
includes M-20, U-14 includes M-08, U-12 builds all eight furniture blocks, and M-10 and M-47 stay
in. Inside each unit the family with the fewest references is built last, so a cut is easy if
time runs out, but nothing is dropped or parked.

**(d) Divergences from a reference: accepted, all three.** The only places a clone will differ from
its reference on purpose: (1) DEC-01, resn's WebGL scene approximated with a Tier V effect or an
existing fx field, with real DOM text for its labels; (2) DEC-02, accessible defaults kept where a
reference ships an accessibility defect, with one carve-out, close-on-scroll for lamalama; (3) DEC-07,
buck's random fill frozen to one colour, because a new colour per page load is a content choice.
Each is recorded in the clone's report so it never reads as a defect.

**(e) The over-length files: leave them.** `nav-menu-markup.php`, `nav-menu-submenu-css.php`,
`nav-drawer/render.php`, `site-header/render.php`, `store.js` and `header-behaviours/view.js` are
two to three times the length limit. Do not split them in Wave 3C. Disclose each commit that adds
to one with `[gates-ok:pre-existing file length]`. Bean has ruled this not worth the tokens.

**(f) Deploy: sandybrown only.** Deploy every unit to sandybrown. When a different client's header
or drawer is needed, switch the active header and drawer CPTs on sandybrown
(`wp sgs header set-active <id>` and `wp sgs drawer set-active <id>`, Spec 19 section 4.14)
instead of deploying to `indus-test` or `eye-care-test`. Those two targets are used only if Bean asks.

**(g) The second composed header at Gate 3C: the Indus Foods draft.** Bean did not follow the
question, so plainly: at the end of Wave 3C one finished header is checked against a reference. The
floating-pill header has one (lamalama). An ordinary capped-width header needs a yardstick too. The
default, unless Bean names another, is Bean's own Indus Foods Mega Menu draft: a full-width bar with
its content capped at 1240px, dropdown and mega panels, and a mobile overlay.

**(h) Lottie: build a Lottie player, and leave lamalama's canvas mark as a still.** Moving SVG
logos already exist (`sgs/responsive-logo` `animationStyle` and `svgAnimationSource`, .svg from the
media library only); Lottie exists nowhere in the tree. Bean's instruction: be efficient and
delegate the design to a subagent that uses `/gh-research` to find a proven implementation to model.
That research is `.claude/reports/2026-09-21-lottie-player-research.md`. U-17 is the Lottie player
unit: a Tier H admission through Spec 38 section 1.2a (with a decision entry), a substrate value
on `sgs/responsive-logo` that accepts a media-library .json, and a reusable media-slot attribute. It
runs in parallel with the nav chain. lamalama's live canvas mark stays a still and is recorded as a
divergence.

Research result (`.claude/reports/2026-09-21-lottie-player-research.md`): use `lottie-web` 5.13.0, light build (SVG renderer, 46.6 KB gzip, no WASM, no CDN, no `eval`). Integration: `animationSubstrate` (`svg-draw` or `lottie`), `lottieSource` (media-library .json, validated at upload, fail closed) and trigger and loop attributes on `sgs/responsive-logo`; the existing logo `<picture>` is the poster; a shared `supports.sgs.lottie` helper serves other media slots; the player loads lazily behind a swappable adapter and never loads under reduced motion. About 2 hours. Spec 38 section 1.2a parts (i) to (iii) pass. **Part (iv) is granted (Bean, 2026-09-21):** the player is 93% of the 50 KB JS budget, so pages that use Lottie get a named allowance of 60 KB for the player and nothing else; pages without Lottie ship nothing extra. U-17 still writes the D-numbered decision entry and the Spec 38 section 1.2a membership amendment (Tier H gains the Lottie player) in its own commit.

## 2. Decisions already signed

Full text lives in `.claude/reports/reference-requirements/families-master.json::decisions`
and `::engineering_notes`. Do not restate them elsewhere. What they change here:

| ID | What it means for the build |
|---|---|
| DEC-02 | SGS's accessible default is kept on every block. Exactly one carve-out: a close-on-scroll attribute for lamalama, in U-9. No other accessibility opt-out |
| DEC-03 | Away is the UK storefront; its copy cells are not cloned verbatim and Away is re-read on the UK site before Wave 4 |
| DEC-04 | Step 0c. DEC-05: Step 0d. DEC-11: the drafts' 768 rows are mobile, so they have no tablet row |
| DEC-09 | The drawer closes when the viewport crosses `collapsePoint` while open; otherwise it stays open and reflows. One rule, no attribute. In U-9 |
| DEC-10 | Clone what Bean's two drafts intend, not what their runtime does wrong. Where the draft's own rendering mis-clusters a panel entry, cluster it correctly. The panel-entry row shape in U-5 is a real requirement, not a draft artefact |
| DEC-14 | Add a fourth `triggerMode` value meaning "the row's own surface is the trigger". In U-14. The three existing values are `icon`, `text`, `icon-and-text`, validated in PHP with no JSON enum |
| DEC-15 | Amend FR-36-6: the drawer's own × becomes optional per `closeStyle` and per tier. Written into Spec 36 at Step 0b, before U-11 builds |
| DEC-16, DEC-17 | NOT accepted as written. Their scope floor and four-of-eight split were not accepted; the plan builds every family and all eight furniture blocks (section 1c), smallest-support family last inside each unit |
| DEC-01, DEC-02, DEC-07 | The three accepted divergences (section 1d). Nothing is built for them. M-08 is built, in U-14. DEC-13: the Lottie player is built as U-17 (section 1h) |
| ENG-01 | z-index becomes a per-tier attribute defaulting to 100. Inside U-1 |
| ENG-02 | `accordionExclusive` boolean, default true. Inside U-9 |
| ENG-03 | Six `sgs/site-header` attributes are in `block.json` and rendered but missing from the framework DB. Step 0a |

**Nothing in Wave 3C is parked, deferred or dropped.** A reference is never trimmed to fit the
framework: a row with no covering attribute is a gap unit. Three items sit outside this wave
for a stated reason rather than by parking. wearecollins' `m` hotkey and resn's history-back closer, because
both are alternative routes to a dismissal U-9 already builds. If Bean wants any of the three,
each becomes a unit of its own.

**Divergences are recorded at clone time**: one line each under a "Recorded divergences"
heading in the clone's `reports/visual-diff/<clone>` report, so Bean's eye does not read them
as defects.

## 3. Step 0, and the order it runs in

- **0a and 0b run before U-1.**
- **0c runs before Wave 4**, and before U-8 or U-2 read rabbit's dropdown cells.
- **0d runs before U-16's design gate.**
- **0e is optional and blocks nothing.**
- **0f runs before U-1's live check:** create and activate a test header and drawer.

**0f, real test CPTs.** Canary page 3699 is already in the trash (Bean approved). Create a test `sgs_header` post and a test `sgs_drawer` post (start from the
seeded framework header and drawer: `wp sgs header seed-starter` and `wp sgs drawer seed-starter`,
Spec 19 section 4.14), and activate them with `wp sgs header set-active <id>` and
`wp sgs drawer set-active <id>`. Record the ids in the LEDGER line. Live checks in the per-unit
loop run against the activated CPTs and the `qa-hdr-*` fixtures.

**0a, reseed the framework DB.** `python plugins/sgs-blocks/scripts/sgs-update-v2.py`
(the stage map is in its module docstring; 13 stages, several pull from upstream sources).
Budget 20 to 40 minutes and run it in the background; poll its exit before reading the DB.
It writes to the shared framework DB, so plan mode must be exited and Bean must have said go.
Then confirm all six ENG-03 attributes landed:

```
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT attr_name FROM block_attributes WHERE block_slug='sgs/site-header' AND attr_name IN ('headerFloat','headerFloatInset','headerFloatCollapse','backdropBlur','shadowScrolled','shadowScrolledColour')"
```

Six rows expected. Fewer means the seed is incomplete: name the missing attributes to Bean
and stop. `block.json` is ground truth until this passes.

**0b, spec amendments, as their own commit before any unit builds.** Spec 36 FR-36-6 gets the
optional × as a testable predicate, not prose: the × may be omitted at a tier only when
`modality` is `non-modal` AND the bar's burger is rendered at that tier (`collapsePoint` puts
it in the DOM) AND `closeStyle` at that tier is `burger-morph`; in every other combination
`render.php` forces it on. PHP tests in the same commit: modal plus burger-morph gives ×;
non-modal plus separate-x gives ×; non-modal plus burger-morph with the burger hidden gives ×;
non-modal plus burger-morph with the burger live gives no ×.

Spec 37's boundary rule (section 1): a change crossing the line between nav and the container
or CPT side edits BOTH specs in the same commit. U-10, U-11, U-14 and U-16 cross it. Per-unit
doc updates ship with the unit's code; only these amendments ship first, alone.

**0c, headed capture pass (DEC-04).** ButcherBox and rabbit.tech at 768, plus rabbit's open
dropdown and both footers; Away re-read on the UK storefront. Method:
`.claude/reports/reference-requirements/CAPTURE-PROTOCOL.md`, one headed Chrome window, page
fully loaded before measuring. The new measurements REPLACE the existing rows in
`butcherbox.json`, `rabbit.json` and `away.json`; they do not append.

**0d, footer hover and one footer reveal** measured on the references that have footers
(DEC-05), same method. **0e, optional**: a 1000px tablet capture of the two drafts. DEC-11
already rules their 768 rows mobile, so 0e is for completeness and blocks nothing.

0c and 0d run headed, so they flash a Chrome window on Bean's screen. Tell him before
starting and run both in one browser session.

## 4. Units, in execution order

The 14 nav units form one connected file-overlap component (`nav-menu-markup.php` and
`site-header/*` are the hot files), so they run ONE AT A TIME in this order. U-12 and U-15
are disjoint from everything and run in parallel with the chain from unit 1. U-17 (the Lottie
player, section 1h) runs in parallel with the chain.

**This table is the execution surface and it supersedes the unit table in FAMILIES-MASTER,
which is pre-decision.** Take scope from here; take full file lists from
`families-master.json::units[].files`.

**Exit cells.** A unit's exit cells are, for each of its families, every reference in
`families-master.json::families[<id>].uncovered_references`, read as that reference's
`<ref>.json::rows[surface,tier].cells[<column>]` (each cell carries `value`, `method` and
`evidence`). Read the values from the JSON; never hand-copy them into a doc.

**Family order inside a unit.** The families column is the build order within the unit:
largest reference support first, smallest last, counted from `uncovered_references`. If time
bites, the tail is the cheap thing to defer to a later session, but nothing is dropped.

**Bean column.** `design` means the design report goes to him as a three-line ask with one
recommendation and the build waits on his reply. `eye` means he judges the built output
visually. `none` means neither.

| Order | Unit | Scope after the decisions | Families (exit cells) | Bean | Size | Lock files |
|---|---|---|---|---|---|---|
| 1 | U-1 — **DONE** | De-hardcode the nav surfaces. FIRST COMMIT wires the mega fork's `closeGrace` to `submenuCloseGrace` (`nav-menu-markup.php` builds it with a literal 170 while the non-mega fork reads the attribute); lift or parameterise `mega-disclosure.js::MAX_INTENT_DELAY_MS = 80`, which clamps a markup-declared 300; per-tier z-index (ENG-01); align the surface-ground vocabulary (fill, blur, radius and shadow diverge by name and type across site-header, mega-panel and nav-drawer). The force-solid tier emits the header's resting background (section 1a) | M-09 (covered), M-13 (partial), M-43 (covered), M-21 (covered, live check owed) | design | medium | `nav-menu-markup.php`, `site-header/{render.php,style.css,block.json}`, `mega-panel/{render.php,style.css,block.json}`, `nav-drawer/block.json` |
| 2 | U-9 | Dismissal routes, modality, trigger semantics, the resize rule (DEC-09), `accordionExclusive` (ENG-02), close-on-scroll (DEC-02) | M-36, M-34, M-35, M-40, M-47 | design | medium | `nav-bar-menu/block.json`, `nav-drawer/block.json`, `nav-menu-markup.php`, `src/shared/nav-interactivity/{store.js,mega-disclosure.js}` |
| 3 | U-11 | Close-control presence, placement (`same-slot` / `top-row-start` / `top-row-end` plus an offset pair) and morph motion (DEC-15); magnet strength (M-10). Includes the `closeStyle` string to tier-object migration via `migrate-tier-object.py --property closeStyle`, with the fallthrough check that a stored flat string still resolves, and `$sgs_nd_allowed_close_styles` kept equal to the JSON enum | M-27, M-10 | eye | medium | `nav-drawer/{block.json,render.php,style.css}`, `nav-bar-menu/{block.json,style.css}` |
| 4 | U-5 | Entry and exit animation vocabulary and item stagger. The mega fork has no entry-animation attribute today, so the animation must reach the mega interactivity context | M-31, M-32 | eye | high | `nav-drawer/{style.css,render.php,block.json}`, `mega-panel/block.json`, `nav-menu-markup.php`, `src/shared/nav-interactivity/` |
| 5 | U-2 | Surface scrim, colour, alpha and blur per tier. The drawer hardcodes `rgba(0, 0, 0, 0.55)` twice in `style.css`; the panel fork has no scrim element at all, so U-2 adds one | M-14 | design | medium | `mega-panel/{render.php,block.json}`, `nav-drawer/{style.css,render.php,block.json}`, `src/shared/nav-interactivity/store.js` |
| 6 | U-3 | Drawer side anchor, container inset, pitch tier object. No drawer clamp (section 1b) | M-17, M-46 | none | medium | `nav-drawer/{render.php,block.json}`, `nav-drawer-menu/block.json` |
| 7 | U-6 | Item hover parity: opacity and padding-shift hover (M-21, delivered by U-1 — see its row), row separators (M-30), sibling dim (M-24, a list-scoped rule), two-copy label roll (M-25, a second label in the markup, needed on the bar, the drawer, the trigger and the footer). M-24 and M-25 need new markup, so they come last | M-30, M-24, M-25 | eye | high | `nav-bar-menu/{block.json,style.css}`, `nav-drawer-menu/{block.json,style.css}`, `nav-menu-markup.php`, `nav-menu-submenu-css.php` |
| 8 | U-7 | Per-item ornament (M-22) and per-item media slot (M-15) | M-22, M-15 | none | medium | `nav-menu-markup.php`, `nav-drawer-menu/block.json`, `mega-group/`, `nav-menu-submenu-css.php` |
| 9 | U-10 | Role migration: move a non-menu header block into the drawer per tier. Crosses the Spec 37 boundary | M-19 | design | medium | `site-header-row/block.json`, `nav-drawer/render.php`, `nav-menu-markup.php` |
| 10 | U-4 | Type scaling mode: a formula unit, per-tier line-height; includes `business-info` for the footer half | M-45 | none | medium | `nav-bar-menu/block.json`, `nav-drawer-menu/block.json`, `nav-menu-submenu-css.php`, `business-info/block.json` |
| 11 | U-8 | Panel geometry: anchor enum and mega top offset (M-16). "Panel follows the pill" is a covered value of M-16, already built. Then Away's callout row (M-20), the aside or callout column count, which comes last on one reference | M-16, M-20 | none | medium | `nav-menu-submenu-css.php`, `mega-panel/{block.json,render.php}`, `mega-aside/render.php` |
| 12 | U-14 | Band pass-through, a zero-height shell (M-52); the surface-trigger `triggerMode` value (M-39, DEC-14); then a trigger that outlives its header, the detaching chip (M-08, buck and resn), last on two references. Do not reuse `class-sgs-floating-ui-renderer.php` as is: its container is `aria-hidden`, and FR-36-8's priority-plus-More text contradicts it | M-52, M-39, M-08 | design | medium | `site-header/{render.php,block.json,style.css}`, `site-header-row/block.json`, `nav-bar-menu/block.json` |
| 13 | U-13 | Header scroll intelligence: section-adaptive ink (M-04), then direction-keyed restyle (M-03, one reference, last) | M-04, M-03 | design | high | `src/header-behaviours/view.js`, `includes/class-sgs-header-behaviours.php`, `site-header/*` |
| 14 | U-16 | Header and footer entrance animation, after the 0d measurements. Premise: `site-header` and `site-footer` carry `supports.sgs.hideExtensions`; `site-footer-row` does not | M-11 | eye | medium | `site-header/block.json`, `site-footer/block.json`, `site-footer-row/block.json` |
| ‖ | U-12 | Eight furniture blocks, in priority order: local-time clock, language switch, back-to-top, account or log-in link, then store selector, wishlist, theme toggle, sound mute. One agent per block, each in its own new directory. Plus the two `headerEssential` flags | M-18 | none | high | eight new directories, plus `product-search/block.json` and `filter-search/block.json` (the two `headerEssential` flags, edited by the main thread) |
| ‖ | U-15 | Self-changing header message (rotate, random, live clock) on `notice-banner`. No overlap with header or nav infrastructure | M-07 | eye | medium | `notice-banner/*` |

**U-1 — done.** Shipped: mega close-grace reads `submenuCloseGrace`; force-solid paints the header's own
resting background; per-tier `zIndex` on `sgs/site-header` with drawer stacking derived from it;
`submenuIntentDelay` + `submenuOpenOn` (hover or click); the surface-ground trio (`surfaceBlur`,
`surfaceSaturate`, `surfaceOpacity`) aligned across `site-header`, `mega-panel`, `nav-drawer`, `container`,
`cta-section`, `hero`, `multi-button`, `physics-canvas`, `site-footer` and `trust-bar`; `surfaceFadeEdge` on
the header; a `shadow`/`shadowColour` writer on `mega-panel` and `nav-drawer`; layered shadows clone as a
shape list plus a colour list; item hover paint (`itemOpacity`/`itemOpacityHover`,
`submenuOpacity`/`submenuOpacityHover`, `itemPaddingShiftHover`, `panelCardLift`). Exit cells: M-43 moves to
`covered` in `families-master.json` (residual: rabbit's open state never reproduced live). M-09 moves to
`covered` (buck's `auto` z-index is an accepted divergence, Bean). M-21
moves to `covered` (attributes built and PHP-tested; live verification of the card lift and the submenu
opacity pair is owed). M-13 stays `partial` (the mega-panel `borderRadius` stays a single value, Bean; the
edge-fade's live check is owed). Shipped alongside U-1: the universal shadow-tone
check (design `.claude/reports/2026-09-23-shadow-tone-design.md`, Bean-approved GO WITH FIXES) — a surface is
judged dark when white text would be chosen for it, a dark surface takes a black shadow at 2.2x plus a light
ring, and the wrapper, nav-drawer and mega-panel mark `sgs-on-dark`/`sgs-on-light`. Owed: Bean's eye on the
dark-surface screenshot and ring strength; the sandybrown deploy of everything since theme 1.5.91 (waits on
another session committing `sgs/google-reviews`); theme gradient presets read as unknown in the canvas until
callers pass `useSettings('color.gradients')`.

Sizes are `families-master.json::units[].size` at full scope. Convert per
`~/.claude/rules/time-estimates.md`: medium 30 to 60 minutes, high 1 to 2 hours, the whole
chain about 4 sessions with U-12's eight blocks running in parallel throughout. Revise
downward the moment a unit comes in faster.

**Parallel dispatch rules (U-12, U-15, and any reviewer agent).** Each agent's brief names
the ONLY directory it may write (one `src/blocks/<new-block>/` per agent for U-12,
`src/blocks/notice-banner/` for U-15) and states: no `git add`, no commit, no `git stash`, no
`npm run build`, no deploy, and no edit outside that directory; no cleanup of files it did
not create; tests written under its own directory. Blocks register by directory discovery, so
no shared registry edit is needed, and `site-header-row` has no `allowedBlocks` restriction,
so no allow-list edit either. The main thread reads `git diff --stat` after each agent, builds
once, commits each agent's directory with its own pathspec, and deploys once. Two agents never
share `build/`: builds are serialised in the main thread.

**Attribute names and defaults are fixed in the unit's design report**, never invented by an
implementer agent. Check the name does not collide first:
`sgs-db.py sql "SELECT block_slug FROM block_attributes WHERE attr_name='<name>'"`. Enum
values are mirrored in the PHP allow-list in the same commit as the JSON enum.

## 5. The per-unit loop

**0. Done when.** Before designing, write the unit's exit-cell table into the design report:
one row per exit cell (reference, surface, tier, column, the measured value read from
`<ref>.json`, and the attribute and value that will express it). The unit is done when
(a) every exit cell is reachable by a block attribute that is settable in the editor, per tier
where the cell differs per tier; (b) at least one exit cell per family is reproduced on a
`qa-hdr-*` fixture and measured live within the capture protocol's 2px tolerance; (c) the
family's `coverage_status` can honestly move to covered, or its residue is named. A cell the
unit does not satisfy is written into the unit row as
"not covered: `<ref>`/`<surface>`/`<tier>`/`<column>`, reason". No silent skipping.

**1. Design gate (rule 7).** A short `.claude/reports/<date>-<unit>-design.md`: the problem,
the exit-cell table, the design, the risks. Attributes are per-tier objects; no inline styles;
universal, no per-block carve-outs. On a `design` unit the gate is closed by Bean's reply, not
by the council.

**2. QC council.** Invoke `/qc-council` before building any shared change, with two different
models chosen by `/delegate`: one code-path census agent and one adversarial reader. The
payload is (a) the problem statement, (b) the files the change touches, (c) the baseline
measurement of what the code does today, (d) the hypothesis, meaning what the change is meant
to make true, and (e) the command that will prove or disprove it. Apply their changes.

**2a. If the gate or the council says no.** Do not build. Record the verdict and the reason in
the design report and classify it. A spec gap means writing the amendment first, then
re-gating. A scope change goes to Bean as a menu with one recommendation and the unit stops
until he answers. An implementation objection gets one revision, re-run past the same two
reviewers; a second no ends the session on that unit with a `/handoff` stating both verdicts.
A council that splits is not approval: the design goes to Bean with both positions.

**3. Build, including the editor surface.** Every new attribute gets its inspector control in
the same commit as its render: colour rows through `SgsColourPanel` with `linked` wired;
per-element typography through `TypographyControls`; per-tier objects through
`ResponsiveControl` under the global device toggle, never a per-control switcher; borders
through `SgsBorderControl`; enums as `ToggleGroupControl` or `SelectControl` with the PHP
allow-list carrying the same values. Run `node plugins/sgs-blocks/scripts/inspector-scan/run.js`
on the block. After any `edit.js` or shared-component change, deploy and open the real editor
on the canary (log in with `.claude/secrets/sandybrown.env`), insert the block, set each new
control, save, reload: a control that does not round-trip is not done. Every `createBlock`
slug must be registered. Use `/subagent-driven-development`: an implementer plus two reviewers,
one unit at a time in the nav chain.

**4. Tests.** PHP tests in `plugins/sgs-blocks/tests/php/`, JS tests under `scripts/tests/`.
Every test carries a negative control: a version of the test that FAILS against the previous
code, proving it catches the defect, and passes after the fix. Assert the break landed before
trusting it. Then `npm run build` and the prebuild gates.

**5. Commit with explicit pathspecs.** The visual-diff gate (`.githooks/sgs-gates.sh`, a
pre-commit hook) blocks a block commit that has no passing live capture report in
`reports/visual-diff/` at the repo root. The capture needs the deploy and the deploy needs the
commit, so break the cycle with
`SGS_VISUAL_GATE_SKIP=<block> SGS_VISUAL_GATE_REASON="<truthful reason>"` (an empty reason
fails closed; every skip is appended to the tracked `reports/visual-diff/manual-skips.log`),
then commit the capture report straight after. The report is
`reports/visual-diff/<block>-<YYYY-MM-DD>.md` with `verdict: PASS`,
`intent_capture_passed: true`, and a `source_sha:` line whose value comes from
`python plugins/sgs-blocks/scripts/visual-report-sha.py <block>`. After a manual skip the
gate prints nothing, so read it from the script. Run long commits in the background because
the hooks take over a minute, and poll the commit's exit before claiming it landed:
`git log -1` is the proof. Re-check the branch in the same command as the commit.

**6. Deploy.** `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown
--blocks-only` (`--blocks-only` ships the blocks plugin and skips the theme; drop it when a
unit touches the theme). Deploy to sandybrown only (section 1f); switch the active CPTs there
for another client's chrome. If the dirty-tree gate
blocks: the dirt is another session's. Do not stash, do not pass `--allow-dirty`, do not
commit it. List the paths, tell Bean, and wait.

**7. Verify live in a real headed Chrome, one window**, with the chrome-devtools MCP
(section 9). The page fully loaded, measured against the exit cell with `getComputedStyle` and
`getBoundingClientRect`, using `clientWidth`. Fixtures are the `qa-hdr-*` pages; never measure
a loose block in page content. Real pointer paths for hover. A negative control for every
claim. Accessibility in the same pass: `node plugins/sgs-blocks/scripts/nav-qa/axe-run.mjs`
on the fixture with the surface open, plus the unit's own check. U-5 and U-16 reduced motion
(with a positive control proving the effect fires without the media query); U-15 a pause
control for the rotating message and no `aria-live` on a live clock (WCAG 2.2.2); U-12 `lang`
on each language option and focus moved to the target by back-to-top; U-2 the scrim's
click-to-close must not remove the keyboard route; U-13 4.5:1 ink on every section, proved
with `node plugins/sgs-blocks/scripts/nav-qa/palette-contrast-sweep.mjs`.

**7a. If the live check fails.** Do not iterate on the canary. (1) Redeploy the last green
commit through `build-deploy.py`; never hand-roll a restore. (2) `git revert` the unit's
commits newest first with an explicit pathspec, one revert commit each; never
`git reset --hard` on this worktree. (3) Record the failing measurement in the design report
and in the unit row: "live FAIL `<date>`, reverted `<sha>`". (4) Prove the cause on the live
page before any second attempt, and confirm it by removing the cause; the second attempt is a
new design-gate revision. (5) If the failure is in a shared file another unit has since
touched, stop and `/handoff`.

**8. Framework DB and converter.** After the unit's `block.json` changes, run
`python plugins/sgs-blocks/scripts/sgs-update-v2.py` in the background, then prove the rows:

```
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT attr_name, css_property, css_element, css_state, css_tier, box_family FROM block_attributes WHERE block_slug='sgs/<block>' AND attr_name IN (<new attrs>)"
```

Every new attribute that maps to a CSS property must show its `css_property` or the converter
cannot route a draft's CSS to it. A hover companion must be named `{base}Hover` and carry
`css_state='hover'`. Tier objects declare `{"type":"object","default":{}}`. Box-object attrs
are declared in `supports.sgs.boxFamilies`. Then one converter smoke run:
`python -m pytest plugins/sgs-blocks/scripts/converter -q`. Never import
`scripts/converter/db/db_lookup.py` from a read-only reporter; it runs schema migrations as an
import side effect. The attribute commit and the reseed are pushed together.

**9. Docs in the same push:** Spec 36 (and Spec 37 in the same commit where a unit crosses the
boundary), this plan's unit row, `.claude/verify/merged-spec36-37-track.md`, `LEDGER.md`,
`decisions.md`. Then `python .claude/hooks/handoff-preflight.py --check` and
`python plugins/sgs-blocks/scripts/lints/lint-spec-drift.py --check`. Push to `main` after
every unit.

## 6. Session boundaries

End every session with `/handoff`. Before it: never stop between a skipped-gate commit and its
capture-report commit, nor between a deploy and its live check. Finish the loop step or revert
to the last green commit.

`LEDGER.md` gets one line: "Wave 3C: U-x at loop step N; last green sha; deployed to
`<targets>`; capture report owed yes or no; Bean questions open: `<list>`". The unit's row in
section 4 records the same. The next session's prompt is written fresh from that line, starts
with `Invoke /autopilot`, and names the next unit's exit cells.

One unit per checkpoint. Do not start a second nav unit in a session that has an unverified
deploy.

## 7. Gate 3C, the one definition

This is the only definition. The same words sit in the strategic plan's Gate 3C entry and in
`.claude/verify/merged-spec36-37-track.md` Wave 3C.

Gate 3C passes when:

1. Every family in the signed list is covered: its exit cells reachable and at least one
   reproduced live. Twelve families are already covered and are assigned to no unit: M-01,
   M-02, M-05, M-06, M-12, M-23, M-26, M-29, M-41, M-42, M-50 and M-51. They are not built by
   this wave and close the gate as covered. No family closes the gate as parked.
2. Each unit row cites its live report with `verdict: PASS`.
3. `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0 and
   `python plugins/sgs-blocks/scripts/no-inline/check-no-inline.py` passes against a
   reachable canary.
4. Two composed real headers match their reference rows: the pill on fixture page 3734
   (lamalama) and the capped-width header on page 3733 against the Indus Foods Mega Menu
   draft (section 1g), with equal left and right gaps at 1440px, a mega panel whose width equals the
   header's and a dropdown centred on its parent item. Bean's eye is co-authoritative
   (R-31-13).
5. Spec 36, Spec 37, the verify doc and `LEDGER.md` state the model.

Bean's session for item 4 is booked at the last unit's close, with the evidence pack pre-built
and an external ping rather than an in-session message.

## 8. Wave 4 preconditions

Before W4-b (the studionamma clone) starts, all of these are closed:

- Gate 3C passed, and the W2-i..u checkpoint set plus W2-f verified live (session).
- W4-a2: Bean signs the substitution policy for licensed fonts and copyrighted imagery
  (Bean).
- The 0c captures done and Away re-read on the UK storefront (session).
- resn re-judged at family level from the headed capture (session).
- The three accepted divergences (section 1d) written into the clone report template, so
  none of them reaches Wave 4 as an unexplained difference (session).
- The Bean session booked with the evidence pack pre-built and an external ping (session
  prepares, Bean attends).

## 9. Commands, fixtures, gotchas and lessons

**Build.** PowerShell, not Git Bash: `cd plugins/sgs-blocks; npm run build`. The nvm shim is
broken in Git Bash.

**Fixtures on the canary** (built by `plugins/sgs-blocks/scripts/nav-qa/build-header-fixtures.py`,
slug prefix `qa-hdr-`): page 3723 plain, 3733 capped width, 3734 floating pill, 3735 drawer
with submenus, 3763 hover parity. They already exist; do not rebuild them casually. They MUST
be rebuilt after any unit changes a nav block's attribute schema, because a stored fixture
carries the old attributes while a new one defaults. Record the new page ids when you do. The
loose-block pages 3692 to 3699 are not evidence.

**Credentials.** `.claude/secrets/sandybrown.env`: `WP_USER_SANDYBROWN`, `WP_PWD_SANDYBROWN`,
`WP_APP_PWD_SANDYBROWN`.

**The chrome-devtools MCP** is the headed browser. Its tools are deferred, so load them first
with `ToolSearch` ("select:mcp__plugin_chrome-devtools-mcp_chrome-devtools__navigate_page,
mcp__plugin_chrome-devtools-mcp_chrome-devtools__evaluate_script,
mcp__plugin_chrome-devtools-mcp_chrome-devtools__emulate,
mcp__plugin_chrome-devtools-mcp_chrome-devtools__take_screenshot"), then navigate, and use
`…__emulate` to set 375px for the mobile tier rather than resizing by hand. One window for the
whole session: one browser launch per script makes windows flash on Bean's screen.

**Gates.** `python plugins/sgs-blocks/scripts/run-gates.py`;
`node plugins/sgs-blocks/scripts/audit-inline-styling.js --check`;
`python plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py`;
`python plugins/sgs-blocks/scripts/migrate-tier-object.py --property <p> --survey`;
`node plugins/sgs-blocks/scripts/qa/check-border-roundtrip.js`;
`python plugins/sgs-blocks/scripts/nav-qa/check-fixture-fidelity.py`.

**Data.** `families-master.json` holds `families`, `units`, `decisions`, `engineering_notes`,
`lanes`, `verification` and `meta` as top-level keys; use it for anything programmatic and
FAMILIES-MASTER.md for reading. Each `<ref>.json` holds `rows[]`, each with `surface`, `tier`,
`presence` and `cells`, and each cell with `value`, `method` and `evidence`.

**Gotchas that already cost time:**

- The site caches phone and tablet page variants separately, so the first measurement after a
  deploy can read a stale variant. Purge, reload, measure twice.
- Hostinger's CDN can serve week-old HTML and `build-deploy.py` does not purge it.
- A defaulted attribute joining the uid hash changes every header's uid once. Expect that
  after U-1; it is cache churn, not a defect.
- A tier-object attribute given a scalar string emits nothing, and a `{}` default drops the
  old scalar defaults. Ship the migration and the fallthrough check together.
- `header-behaviours/view.js` wires every header on a page and fixture pages have two
  `<header>` elements; probes select `.entry-content header.sgs-site-header`.
- `freezeBackground` is a pure function, `collectFreezeTargets`; U-9 and U-2 touch its
  neighbourhood.
- `sgs-db.py stats` crashes on a missing `grade` column; use `sql`.
- The framework DB is stale for `sgs/site-header` until 0a completes; `block.json` is ground
  truth.

**Lessons that each cost time:**

- Headless distorts timing, WebGL, scrollbars (about 15px) and pointer input. Real headed
  Chrome, one window, wait for the load.
- Presence is what a visitor sees, not an HTML tag: resn has a header of fixed controls and
  no `<header>`.
- Test inside a real header. Loose nav blocks in page content showed defects that do not
  exist in a header, and hid a real one.
- Prove the cause before the fix: read computed styles and rules on the live page, then
  confirm by removing the cause.
- The Bash tool halves backslashes in heredocs. Write scripts with the Write tool, run them,
  and syntax-check first.
- A gate's skip reason must be true. Never claim a live check that has not happened.
- Bean's decisions are not assumed. "Should I start it?" waits for an answer, and a
  background-task notification is never an answer.

## 10. The fresh-session prompt

`.claude/prompts/2026-09-21-wave-3c-start.md` holds it until Wave 3C starts, then it is
deleted. This plan is the record.
