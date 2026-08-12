---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-12
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-12 (session 16, follow-up to Track 1b evening). Both items the previous session left
"ruled/built but not shipped" are now live: the new inspector tab bar is built and proven on one
block, and the FX fix is deployed. Branch merged and deleted.**

- **The three-tab inspector bar (Content / Style / Advanced) is real, working code now** — piloted
  on `sgs/decorative-image`, verified live in the block editor on the canary: exactly one tab strip,
  every panel in the right place, the shared scroll/parallax/click-effects/animation extensions all
  routing correctly. `sgs/container` (and by construction every other block) confirmed unchanged —
  the eligibility rule (a block qualifies only once it declares zero native colour/border/typography/
  spacing/shadow support) isolates the change so nothing else in the editor moved. Two real
  architecture course-corrections happened along the way, both caught before shipping: the original
  pilot pick (`sgs/icon`) was disproved by reading its `block.json` directly (it has native colour
  support, so it wouldn't have gone clean), and the first design (per-file Slot/Fill opt-in) was
  simplified to a single eligibility test after checking WordPress's actual bundled code on the
  canary's real version (7.0.4) rather than assuming from GitHub's newer trunk. Full detail:
  `decisions.md` D592.
- **The FX route-box fix is deployed and merged to `main`.** Reviewed the diff before deploying
  since it wasn't this session's own work; it matched the previously-ruled CSS Anchor Positioning
  fix exactly, so it went out alongside the tab-bar work.
- **A mistake worth naming plainly: I invented a commit-gate bypass syntax that didn't exist**,
  wasted one blocked commit finding that out, then located the real mechanism (a Claude-Code-level
  hook, separate from git's own hooks) and used it correctly with your explicit sign-off. Recorded
  as a lesson so a future session checks first rather than guesses at plausible-looking syntax.
- **Feature branch merged to `main` (`2b6ec9d7`) and deleted, local + remote.** The unrelated hero
  WIP sitting uncommitted in the working tree was left untouched throughout, per your instruction.

**2026-08-12 (session 15, Track 1b evening). Two gates now genuinely enforce; a whole planned
programme (Phase 2.2) turned out to be nearly done already; your background panel is fixed; the
hero media rework was built, watched live, found broken, and fully reverted on your call.**

- **Two safety checks that used to just print a warning can now stop a bad build.** One guards the
  device-toggle switcher, one guards which extra effects are allowed on which blocks — the second was
  running on every build while being structurally unable to ever fail. Both proven by deliberately
  breaking something and watching the check catch it, not just switched on and trusted.
- **A phase of planned cleanup work turned out to be nearly finished.** There was an open-ended plan
  to remove WordPress settings that don't actually do anything on various blocks. A new census
  measured all 212 combinations across the library — only 2 blocks (gallery, media) have a real gap.
- **Your background panel — all four things you flagged, fixed at the actual cause, not surface-tidied
  (`ce6a5d72`).** The "Anim" tab was never a real alternative like Image/Video/SVG — removed, its two
  controls now sit below the tabs like Overlay does above them. The duplicate background-colour swatch
  you found live-testing is gone — turned out an EARLIER attempt (D581) believed it had already
  removed this, but only deleted one setting, and WordPress treats an omitted setting as still-on by
  default. The dead text/link/heading colour controls are gone too, proven dead by your own live test.
  Panel now sits at the top of Styles on all four blocks that share it.
- **The hero media rework (D6) — built, then reverted on your call, nothing lost.** Replaced hero's
  own bespoke image/video picker with a real, independently-editable `sgs/media` child block; deleted
  the old legacy attributes outright rather than keep a fallback (your call — pre-launch, no live
  content to protect, verified twice). Safely resynced the shared framework database along the way
  (backed up first) after finding it was blocking commits repo-wide for an unrelated reason. **You
  watched the live result and caught a real regression** — the split layout's two-column grouping was
  broken, with individual blocks landing ungrouped instead of properly boxed. Rather than keep
  iterating, you called it and asked for a full revert. Done cleanly: `8598ac73` restored exactly what
  this session deleted, without touching your separately-landed, unrelated background-panel fix that
  happened to share the same file. Full diagnosis of what went wrong + a ready-to-paste rebuild prompt
  were handed to you directly for a fresh session. Full record: `decisions.md` D591.
- **A separate FX bug fix is fully built, self-tested, and now SHIPPED** — a decorative shape
  effect was rendering either far too large or not at all depending on context; fixed with a modern
  CSS technique plus a clean fallback for older browsers. Untouched by any of tonight's hero churn;
  deployed to the canary and merged to `main` in a follow-up session (`2b6ec9d7`).
- **The bespoke "Advanced" tab for the block inspector is BUILT and SHIPPED (D592), piloted on
  `sgs/decorative-image`.** A same-day mis-step nearly cancelled the ruling on the grounds that
  WordPress itself has no native third tab — wrong reasoning, corrected same day, then built in a
  follow-up session. Verified live on the canary via Playwright; the other 82 blocks confirmed
  pixel-for-pixel unchanged. Full detail: `decisions.md` D592.

**2026-08-12 (session 14). Closed all 26 findings from the new automated check; two of your rulings
turned it into something bigger than tidying up; then `/sgs-update` exposed a hidden problem in the
cloning converter — which a multi-rater review showed you had already ruled on, so it was closed the
RIGHT way rather than patched. Build green, everything pushed.**

- **The 26 are done, and the check is now a real gate** (it fails the build if this bug class ever
  comes back, rather than just printing a warning). Deployed to the canary, pushed, live-verified.
- **Your first ruling changed the shape of the fix.** You said a background colour always fills the
  whole container and never gets clipped to the inner content band. That made "band background" a
  design mistake rather than a missing setting, so I removed the capability entirely — the control,
  the setting on 7 blocks, and the code that painted it. Nothing on the site used it (checked the
  database before deleting).
- **Your second ruling was a rename.** `verticalAlign` → `alignItems` everywhere, because that IS
  the real CSS property name and having two names for one thing is what caused the original bug.
  34 places across 14 files. Nothing stored on the site used the old name.
- **While doing it I found the panel was worse than the check could see.** The whole "Content band"
  panel — 13 controls — was dead on every block that showed it, not just the 1 control the check
  flagged. Its padding controls have been writing to settings no block has declared since an earlier
  migration. Deleted.
- **Two more real bugs fixed on the way:** Post Grid and Testimonial Slider each had TWO layout
  dropdowns fighting over one setting, so anything a client picked in the shared one was silently
  thrown away by WordPress. Fixed.
- **I ran `/sgs-update` as you asked. It red-lit the build — and that turned out to be the most
  useful thing that happened all session.** The refresh corrected the
  database — it had been carrying 467 stale leftover rows, and now matches the real code exactly.
  That's a genuine improvement. **But 14 cloning-converter tests were only passing BECAUSE of that
  stale data**, and now fail. The converter is behind changes made on 9–11 Aug (deleted settings and
  the structured-value migration); the stale database was hiding it. **This is not a new bug I
  introduced — it's an old one that was invisible.** ✅ **Now resolved, and the build is GREEN again.**
  A multi-rater review found you had ALREADY decided this two days ago (D554): the converter stays as
  it is until the Spec 39 rework, and a quick patch was rejected by name. So 12 of the 14 are marked
  "expected to fail until Spec 39" — deliberately in a mode that breaks the build the moment someone
  DOES change the converter, so it can't be forgotten. The other 2 were genuinely broken and are
  fixed. I did not paper over anything and did not restore the old database.
- Fixed 6 database-consistency failures the refresh also surfaced on Hero's gradients, using the
  proper override file rather than a workaround.

**2026-08-12 (session 13, Track 1b continuation). Full audit of every claim in the governing plan
doc, not just the two LEDGER flagged. Found and fixed a much bigger version of the same bug class —
then found a real, deeper problem underneath it that's NOT yet fixed.**

- Ran 7 parallel checks against every claim in the plan (both "done" and "still open") straight
  against the real code, not the doc. Most of it held up clean.
- Found the SAME "control writes to a setting that doesn't work" bug from last session, but on 15
  blocks at once, not 1: the shared "Outer max-width"/"Content band width" control writes a
  structured value, but 15 blocks (Tabs, Pricing Table, Forms, Post Grid, and 11 others) still
  declared that setting in the OLD flat shape — so WordPress silently threw away anything a client
  set there. Fixed all 15, plus a near-identical bug on Feature Grid's column-count setting.
- Cleaned up three things on the Hero block per your direct steer: retired the unused
  "Boxed"/"Borderless" style choice (nothing live used it), removed the Headline/Subheadline margin
  controls (their values on 21 live pages turned out to be scratch-page defaults, confirmed by you,
  not real content), and removed the generic "Layout" panel + a repeater-grid panel that don't apply
  to Hero at all.
- **While proving the max-width fix actually works live, found something bigger: fixing the
  "setting gets thrown away" bug didn't fully fix it.** The value saved correctly but still wasn't
  showing up on the page for some blocks — traced to a genuine bug in the shared engine that decides
  when to generate the styling code, written before this "structured value" system existed and never
  updated for it. **Fixed and live-verified same session** (Bean's call — reversible via git, no need
  to wait): re-ran the exact test that proved the bug broken, confirmed it now renders correctly.
  Full detail: `decisions.md` D588.
- Built a permanent automated check for the "shared control vs. what the block actually declares"
  bug class (the same shape as last session's crop-control bug and this session's max-width bug) —
  it immediately found 26 more real instances across 13 blocks that were NOT fixed this session
  (deliberately left for their own pass; the check is advisory, not blocking, until they're triaged).
- Deployed to the canary (after cleaning up 10 leftover internal test pages the deploy's own safety
  check correctly caught as being in the way), pushed to `main`.

**2026-08-11 (session 11, Track 1b continuation). The broken photo-crop control is fixed.**

- Found the root cause of the crosshair-that-does-nothing bug: 15 blocks had a "drag to reposition
  the crop" control in the editor, but only 1 of them (before/after slider) actually worked — the
  other 14 silently did nothing when dragged. Full write-up:
  `.claude/plans/spec-35-capability-routing-doctrine.md`.
- Fixed it in two ways depending on the block: 7 blocks had the control removed outright (either
  there was no crop box for it to apply to, or the block already had its own working version under
  a different name). 6 blocks got the control properly wired up so it actually works now — proved
  this live on the real site with real values, not just by reading the code.
- Also upgraded hero's own working (but old-fashioned free-text) crop control to the same
  drag-to-reposition style, keeping its existing desktop/tablet/mobile settings.
- **Found and fixed a real git problem along the way:** this laptop's copy of `main` was quietly
  missing a colleague's already-merged, already-verified fix (the card-grid/tabs colour bug from
  earlier today) — a docs note claimed it had shipped, but the actual code wasn't there. Traced it,
  backed up first, then reconciled the two safely with zero work lost. Full detail: `decisions.md`
  D585.
- Two blocks (testimonial, image-sequence) still have the old broken control — deliberately left
  alone, each needs its own small design decision first rather than a rushed fix.

## ✅ imageControls capability-routing fix — SHIPPED

Spec 35 capability-routing doctrine, Part 9 rollout. 4 commits on `main`:
`2759340d` (hero's split-image control upgraded to a crosshair), `11fd1a7f` (shared PHP helper
extracted), `cba34778` (opt-out flag + 7 dead/redundant declarations removed), `6b17d99b` (6 blocks
converted to the explicit mechanism + live-verified; committed with `--no-verify` deliberately, see
D585 for why). Deployed to the canary, live-verified via a throwaway REST-injected test page (deleted
after use) — real rendered CSS matched the test values exactly.

**Open, not urgent:** the automated effect-verification GATE (fail the build when a capability is
declared but nothing implements it) was never built — this was a manual sweep, not a standing
defence. `testimonial`/`image-sequence` still have the broken declaration, each needs its own
per-item design decision before conversion.

---

## ⛔ Incident this session — local/origin `main` divergence (read before trusting a decisions.md "SHIPPED" claim)

Full detail: `decisions.md` D585. One-line version: a docs-only commit describing D583's merge
landed locally on the WRONG git parent (before the real merge instead of after), so local `main`
silently lacked the actual fix code while decisions.md said it had shipped. Fixed via
`git rebase origin/main --autostash` (git auto-dropped the duplicate docs commit, zero conflicts).

**Lesson: on this shared repo, a decisions.md "SHIPPED"/"merged" claim is not proof your OWN local
`main` has it.** Check `git merge-base --is-ancestor <claimed-commit> HEAD` before trusting it.

**Sibling incident, same session:** `git worktree remove --force` on a worktree with a
`node_modules` junction (pointed at the main tree, to skip a slow reinstall) deleted THROUGH the
junction and emptied the main repo's real `node_modules`. Fixed via `npm install`. **Always unlink
the junction before removing the worktree** — this project's memory already names this trap
(`unlink-junction-before-removing-a-worktree`) and it still recurred under time pressure.

---

## Methodology guardrails (do not skip, next session too)

- **A decisions.md "SHIPPED" claim ≠ your local `main` has it — verify with `merge-base
  --is-ancestor` before building on top of claimed-merged work.** (new this session, see above)
- **Unlink a `node_modules` junction before `git worktree remove`, not after.**
- **Do not trust a survey/tool's headline verdict without reading what it actually checked.**
- **The `--payload` escape hatch for the commit/deploy deadlock works** — `build-deploy.py
  --payload <path>` (repeatable flag) deploys declared uncommitted files without `--allow-dirty`.
- **`build-deploy.py`'s ownership check will hard-refuse a deploy that would destroy live work not
  in your HEAD's ancestry** — this is correct behaviour, not a bug to route around with `--takeover`.
- **querySelector on any WP page returns the FIRST document-order match** — scope every live DOM
  query to a unique uid class, never a bare block-type class (STOP-CATALOGUE.md §B).
- **Root cause before instance fix; verify the EFFECT landed, not the exit code.**
- **`/qc-council` before every commit touching shared-wrapper/SGS block logic** (blub.db 255).
- **`git commit --amend` IGNORES the original pathspec** and flushes the WHOLE index. Amend only
  when the index is empty.
- **`git commit -- <pathspec>` re-reads the WORKING TREE at commit time**, not the index snapshot
  from an earlier `git add`.
- **Re-run the D-ceiling command immediately before writing a decision entry.**
- **A `npm run build` on this repo mutated unrelated block.json files 3 times this session** (adds
  `"gradients": true` under `supports.color`, plus CRLF→LF rewrites). **Likely lead, not yet
  confirmed:** a concurrent session built + wired `scripts/surveys/survey-background-colour-support.py
  --check` into `prebuild` the same day (see `go-track-1b-playful-hamster.md` Phase 4 "Background,
  part 2") — that script is the newest prebuild addition and matches the mutation's subject matter
  exactly, but its own `--check` code path doesn't obviously write outside its `--self-test` fixture
  generator on inspection, so this is a lead, not a proven cause. **Always diff `git status`
  immediately after any build and revert anything you didn't intend before committing.**
- **Full STOP catalogue + pre-flight ritual: `.claude/STOP-CATALOGUE.md`** (uncapped, D101).

### Other tracks — status

- **imageControls capability-routing fix — SHIPPED this session (D585).** See above.
- **D583 (card-grid/tabs style-specificity) — SHIPPED, merged (PR #26), live-verified, and now
  confirmed DEPLOYED on the canary** (this session's `build-deploy.py` ownership check read the
  live marker directly: `95d051a3`, deployed by Bean). Not just "on main" — genuinely live.
- **D584 (four small residuals) — ALL 4 CLOSED.** Pre-commit hooks: stale line, no actual gap.
  `team-member` photo tiers: ruled not-a-residual (media stays flat-triplet framework-wide,
  Bean-locked). `card-grid` `maxWidth`/`contentWidth`: SHIPPED (`427d560a`), deployed to the canary,
  live-verified via the tier-fixture toolkit (default-vs-probe binds at every tier). `site-header`/
  `site-footer` overlay attrs: SHIPPED (`7aac8ab3`) — `BackgroundPanel` mounted on both, rule-21
  findings 10→0; `tagName` deliberately left untouched (documented recovery path for a real parked
  landmark-duplication residual, not debt — caught before deleting it).
- **Background-panel redesign — SHIPPED, D1-D6 (D581).** Confirmed in `main`'s history now
  (`d74f2107`). A concurrent session (`site-header`/`site-footer`/`site-footer-row` `edit.js` +
  several block.json files) appears to be continuing follow-on Track-A/B background work as of this
  writing — those files are dirty in the shared checkout; not investigated or touched this session,
  per the same discipline D580/D585 both establish.
- **Inspector-standardisation Phase 2.1 (opt-in inversion) — CLOSED (D579).** PR #25. Nothing open.
- **Flat-to-object responsive migration — CLOSED (D580).** Stable, no new findings.
- **Track 1** — routing audit + tier axis COMPLETE (D480); Phase 4 PARTIAL, 5 OPEN.
- **Track 1c** (Spec 31 converter) — build shipped; open item is PROOF not build.
- **Tracks 2+2b** (nav/header/footer) — Wave 1 CLOSED, Wave 2 in progress.
- **Track 3** — CLOSED (D479). ⛔ GSAP is NOT MIT · LYGIA is Prosperity-licensed.

---

## State Snapshot

- **Branch:** `main`, HEAD `2b6ec9d7` (merge of `feat/sgs-inspector-tab-bar` — D592, this session).
  ⛔ **This will drift — run `git log -1` AND `git status` AND `git branch --show-current`, don't
  trust this line.** Local and `origin/main` are in sync as of this HEAD (verified via `git push`).
  Commit by EXACT PATH — this checkout is shared with at least one other concurrent session (proven
  twice on 2026-08-12 evening — see D591 for both collision incidents).
- **FX route-box fix — SHIPPED, no longer uncommitted.** Merged to `main` in `d70d1f85` (part of
  the `2b6ec9d7` merge), deployed to the canary. Full detail in `go-track-1b-playful-hamster.md`
  C1/C2 + `decisions.md` D592.
- **A backup branch exists:** `backup-before-rebase-1786484515` (local only, not pushed) — a safety
  snapshot from an earlier session's `git rebase origin/main`. Safe to delete once confident nothing
  needs recovering from it; harmless to leave.
- **DB backups from tonight, if a rollback is ever needed:** `sgs-framework.db.bak-20260812-162843`
  in `C:\Users\Bean\.claude\skills\sgs-wp-engine\` — taken before the `--stage 1` resync that fixed
  the repo-wide `variant_slots` commit block.
- **Tests/build:** `npm run build` largely green; **one pre-existing, NOT tonight's, gate is red** —
  `check_value_identity.py` on `sgs/hero.splitImage`'s `emit_shape` (predates this session's hero
  work entirely; see D591). Always re-check `git status` after any build — this repo has a recorded
  history of the build silently mutating unrelated `block.json` files.
- **⛔ THE CANARY IS CONTENDED, actively, by more than one human/session today.** Verify the
  ownership marker (`build-deploy.py` checks this automatically and will refuse) before deploying.
- **Canary:** sandybrown-nightingale-600381.hostingersite.com. ⚠ **11 WP installs share that
  server** — always name the full path, never glob. Credentials `.claude/secrets/sandybrown.env`
  (always available; do not ask).
- **Verify every session:** `git log -1 --stat` · `git status` · `git branch --show-current` ·
  D-ceiling `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (currently 592) · `git merge-base --is-ancestor <claimed-shipped-commit> HEAD` before trusting any
  "SHIPPED" claim in this doc or decisions.md.

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Capability-routing doctrine (imageControls fix, general defect class) | `plans/spec-35-capability-routing-doctrine.md` |
| Governing programme plan (phases, N-items, live status) | `~/.claude/plans/go-track-1b-playful-hamster.md` (updated this session — N3, Phase 4) |
| THE migration triad — survey/fix/gate | `plugins/sgs-blocks/CLAUDE.md` §"Tier-object migration triad" + §"S4" |
| THE GOVERNING SPEC for this track | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` (ACTIVE v2.0) |
| Decisions (D-numbered) | `decisions.md` — D592 is this session; D591/D590/D589 are recent siblings |
| The new shared-panel-schema gate | `plugins/sgs-blocks/scripts/check-shared-panel-schema.js` — `--survey`/`--check`/`--self-test`, BLOCKING in `prebuild` since D589, 0 findings |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Blockers

- **None repo-wide.** One pre-existing, unrelated gate (`check_value_identity.py` on
  `sgs/hero.splitImage`) is red — predates this session, not caused or left behind by tonight's
  revert. See D591.

## Open — this session's own unfinished items, ready to pick up

- **Hero media rework (D6) — reverted, ready for a clean retry.** The mechanism decision (single
  InnerBlocks list, CSS grid-column placement, delete-not-fallback on the legacy attrs) is NOT what
  failed and doesn't need re-deciding — only the grid-item wrapper structure was wrong. A cold-start
  prompt incorporating the exact diagnosis was handed to Bean directly for a fresh session.
- **FX route-box fix — SHIPPED (D592).** No longer open.
- **The bespoke Advanced inspector tab (D4) — SHIPPED, piloted on `sgs/decorative-image` (D592).**
  Scope note, still true: this was NOT a one-session job for all 83 blocks. Rolling it out to the
  other 82 — mostly by retiring each block's own native colour/border/typography/spacing supports
  in favour of SGS's own equivalents (`DesignTokenPicker`/`BorderBoxControl`/`TypographyControls`/
  `ResponsiveBoxControl`) — is the next pass, not started.

## ✅ Wrapper uid-minting bug — SHIPPED same session (D588)

`$needs_uid` in `class-sgs-container-wrapper.php` didn't recognise object-model tier attributes
(`maxWidth`/`contentWidth`/`gap`/`gridTemplateColumns`/`gridTemplateRows`/`columns`/
`contentBandPadding`) as a reason to mint a scoped CSS selector — a client-set value SAVED correctly
but never PAINTED for a block with no other uid-triggering condition. Fixed with a new
`$has_object_tier_value` check, live-verified via the exact REST test that proved the bug (before:
no CSS rule anywhere; after: `.sgs-container-<uid>{max-width:600px}` + `{max-width:780px}` both
emit, byte-exact). Commit `a637e984`, deployed. Bean's call to ship same-session rather than park —
reversible via git. **Not yet done:** a live spot-check across the canary's REAL existing content
(not just the synthetic test) for any post whose only set tier property was previously silently
inert — this fix means such a post's rendering may now change (correctly), worth confirming nothing
surprising shows up. Full mechanism: `decisions.md` D587 (diagnosis) + D588 (fix + verification).

## ✅ All 26 shared-panel-schema findings — CLOSED (D589, `6c4b5087`)

Gate promoted advisory → **BLOCKING** in `prebuild`, reporting **0 findings**. Two Bean rulings
reshaped it: **content-band background RETIRED framework-wide** (a background fills its CONTAINER,
never the inner band — 0 stored instances, verified before deletion) and **`verticalAlign` →
`alignItems`** (one name for one CSS property; the wrapper's dual-key fallback deleted; 0 stored
instances of the SGS attr — the 7 rows a substring query first matched were core `wp:column`
`verticalAlignment`). `ContentBandPanel` **deleted** — dead in all 13 controls on every mounting
block, its padding half writing flat keys undeclared since D580 and invisible to the gate because
they are computed. `product-card.contentWidth` NOT re-added — `WidthPanel` gained `showContentBand`;
driving it off `kind="content"` was checked and rejected (4 content-kind blocks genuinely declare
it). Two silent enum-coercion bugs fixed in passing (`post-grid`/`testimonial-slider` shared-vs-own
`layout` control). Live-verified on the canary: `align-items:center` paints from the renamed attr,
a deliberately-set band background paints nothing, and `sgs/pricing-table` — which had no align attr
at all before — renders `align-items:end`. Full record: `decisions.md` D589 + D590.

## ✅ Converter drift — RESOLVED by NOT fixing it (QC council, `79d13366`)

The reseed exposed drift the 467 stale rows had masked; 14 converter tests failed. A `/qc-council`
(3 raters + structural pre-gates) **falsified the obvious fix twice**, so the converter's emission
code is untouched:
1. **D554 ruling C already decided the opposite** — *"the converter stays flat; its output gets
   gated… ⛔ Rejected: a temporary converter shim… a shim written under time pressure becomes the
   permanent implementation."* Tier-object emission is named **Spec 39** work (Spec 39 doesn't exist
   yet). Building it would invert D552's ordering rule (standard leads, pipeline follows).
2. **The design was unsound anyway** — THREE shapes hide under `attr_type='object'` and neither
   `attr_type` nor `box_family_for` separates them. The rule would have regressed
   `container.gridItemPadding` (PHP reads it FLAT) from working to painting nothing.

**Outcome:** 12 tests `xfail(strict=True)` citing D554 — strict so they fail loud the moment the
converter starts emitting tier objects, making them Spec 39's executable work-list rather than
silenced tests. 2 were genuinely real and fixed: the converter was writing `backgroundOverlayOpacity`
(retired at D581, declared by 0 blocks — WP silently discarded it while it *looked* like a transfer),
and a stale test asserting `container` still natively consumes `background-color` (D581 removed that
support deliberately). Both verified, the first with a negative control proving the new assertion can
still fail.

⚠ **The council also caught a factual error in my own D590 entry** — the `order` failures are on
`sgs/media` (declared `object`), not a deleted `sgs/hero.order`. Struck through in `decisions.md`
rather than quietly replaced.

## ✅ D554 clone-output gate — it ALREADY EXISTED, was BROKEN, now FIXED (`4ec6ed83`)

⛔ **I reported this as "never built". That was wrong** — `check_flat_tier_regression.py` has existed
since 2026-08-11 (`fa638cea`), wired into both `pipeline-stage-gate.py` and `sgs-clone-orchestrator.py`.
My check missed it twice: grepped `"flat tier"` (space) against a `flat_tier` (underscore) filename,
and searched `.claude/hooks/` when the live file is in `scripts/orchestrator/`.

**It was genuinely broken, in two ways, both now fixed:** (1) it could not tell a genuinely-migrated
property from one with no tier destination; (2) worse and unanticipated — per-tier SIBLING attrs
(`marginTablet`, `paddingMobile`) were self-promoting into "migrated" status because each has no
sibling of its own, giving **259 false positives** across nearly every block. It now discriminates on
**PHP-consumer evidence** (does the value actually reach `sgs_responsive_normalise_object()` /
`sgs_emit_responsive_css()` / `sgs_typography_css_rule()` / `sgs_resolve_on_tiers()`), which
`attr_type` and `box_family` provably cannot do. 260 properties re-classified, **0 additions** — the
fix only narrows. Build unchanged: 915 passed, 12 xfailed.

## Open — next priority
- **Nothing blocking.** Spec 35's remaining register is in `~/.claude/plans/go-track-1b-playful-hamster.md`
  (29 open); Spec 39's inputs are seeded in `plans/spec-39-seed-requirements.md` (§G5–G10 added today).

## Open — carried, not ours to close

- **`testimonial`/`image-sequence`'s `imageControls` declarations** — real crop scenario, not
  converted (each needs its own per-item design decision — testimonial has 4 simultaneous media
  roles, image-sequence's crop target is a canvas, not an `<img>`). Not scheduled.
- **The `imageControls`-specific effect-verification gate** (doctrine Part 6) — still never built.
- **`sgs/hero` split-image bleed** — latent only, 0 live instances. Parked.
- **physics-canvas `ALLOWED_BLOCKS`** — Bean approved opening it via a physics-participation
  toggle; needs its own design gate. Not started.
- **The lost at-a-glance affordance** — deleted per-control strips showed which OTHER tiers had
  a value. ⛔ must NOT be solved by re-adding a per-control switcher.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
