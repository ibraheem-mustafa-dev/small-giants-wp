# Commit log — feat/inspector-completeness, archived before squash-merge

Squash-merged to main 2026-08-19 (Bean's ruling). The branch's commits collapse into one, so
their messages are preserved here verbatim — they carry the measured figures, the
reconciliations and the self-corrections that git blame would otherwise stop pointing at.
Caveat: this archive is written before the final doc commit, so it lists every commit except
the one that adds this file.

```
commit 1fd30b3d  2026-08-19
docs: sweep the specs, plan and LEDGER to match what was actually built

Three parallel branches (sonnet, routed via /delegate) plus the LEDGER by hand.

SPEC 37 (+137/-2, FR count 41, no renumbering) — two new requirements:
  FR-37-44  contrastSafe silently overrides an operator's explicit choice. A
            POLICY BREACH of a11y-validation-feedback-informational-not-gate,
            not a bug. Ruling: make it responsive AND make the upgrade a visible,
            declinable notice.
  FR-37-45  the transparent pair's scrolled colour is hardcoded and the pair
            cannot be inverted. Mechanism exists; controls do not.
  Plus: FR-37-13's stale boolean claim, FR-37-27's self-contradiction (it said
  the surface-cap script does not exist while §5 said GATE BUILT — it exists and
  now scans 4 blocks), the header/row duplication recorded as a NAMING problem
  against FR-37-37/38/39, FR-37-40 reinforced against the Kadence misreading, and
  the 6 deleted attrs recorded.
  ⭐ The branch also found a contradiction nobody had asked it to look for: a
  line instructing a FUTURE resolver rewrite to "carry forward" the silent WCAG
  upgrade — which would have propagated the very breach FR-37-44 rules against.
  Reconciled rather than left in silent conflict.

SPEC 35 (+6,112 bytes, 68 headings unchanged, every §N-field-M citation intact) —
six stale claims corrected, each re-verified before editing, and two that looked
stale but were NOT (IconPicker and ShadowControl really are still missing `id`)
deliberately left alone. Added: SgsColourPanel finally named in §1, a pointer to
golden-controls.json, and the THREE gradient mechanisms as an element-dependent
choice with a flag that enforcement must become mechanism-aware.

PROGRAMME DOC (+175/-29) — the progression since it was written, C1's design gate
recorded as CLEARED (D677), and a new closing Phase 5: the library-wide colour +
hover audit, with sgs/button as the only exception, DECLARED IN DATA never
hardcoded (R-31-1), sequenced explicitly after C1 and C2.

LEDGER — THE FRONT now names C1 as the unambiguous next-session entry point, adds
C4 as the closing stage, and hands the header work to its own session prompt.

⚠ GOLDEN-CONTROLS.JSON WAS STALE AND IT IS MY FILE. I wrote it with the rename
recorded as an open question, the rename then landed later the same session
(D678), and I never went back. It described `selected` as a live state with 16
rows; the DB has `current` 13 and `selected` 0. Corrected against a live query,
not against the decision log — which was the right call, because D676 says
"deferred" and D678 says it landed, and only the DB settles it. The contract file
disagreeing with the database it governs is exactly the class of defect this
programme exists to end.

Gates: inspector-scan exit 0; db-consistency exit 0; handoff-preflight all 9 pass.
---
commit 07aa1d16  2026-08-19
docs(plans): self-contained session prompt for the header completion work

Written to the project's prompt-writing standard (~/.claude/references/
prompt-writing.md): skill invocations with when-to-use, an MCP/tool table, a
numbered research approach, and domain-skill reminders at point of use — not just
the task list.

Four scoped tasks, all with the design decisions already made (D679): contrastSafe
stops silently overriding the operator and becomes per-device; the transparent pair
gets a colour control and a direction switch; the row-level labels get renamed so
they stop reading as duplicates of the header ones; and the surface-cap detector
learns to resolve composite mounts.

Carries the settled constraints so the receiving session does not re-litigate them
— the one-sticky-element model (D389), that Kadence's per-row variant uses
position:fixed not CSS sticky and is therefore not a counter-example, and the
ordering constraint that Task 2 must precede Task 3 or the labels get renamed twice.
---
commit 3873c7ab  2026-08-19
chore(visual-gate): log the site-header skip

Appended by the pre-commit hook after staging, so it lands a commit behind the
change it records. Carries the render-impact proof as its reason.
---
commit 8ef7d604  2026-08-19
docs: D679 — the header audit, 6 deletions shipped and 3 findings recorded

Records what the audit found so none of it depends on anyone remembering:
contrastSafe silently overriding the operator (a breach of the locked
a11y-informational rule, not a bug), transparent's two states being real but
unreachable by a client, and the header/row duplication being a NAMING problem
rather than redundancy — each pair produces genuinely different output, so
deleting either side would lose capability.

Also records the competitor evidence: nobody ships the same toggle at both
levels, and Kadence's per-row "which row survives" is built on JS position:fixed
with a measured placeholder, NOT CSS sticky — so D389's rejection of per-row CSS
sticky stands rather than being contradicted.

Renames deliberately held until the transparent redesign lands, or they would be
renamed twice.

Gates: handoff-preflight --check all 9 pass; D-ceiling 679.
---
commit 95159f02  2026-08-19
feat(surface-cap): scan the header/footer ROW blocks, and document what the count is not

The script measured only sgs/site-header and sgs/site-footer. The ROW blocks were
never measured at all, despite carrying their own default-visible controls — so
FR-37-27's cap had no computable reach over half the header surface.

Now scans all four. Measured:
  sgs/site-header       5 | OVER
  sgs/site-footer       3 | WITHIN
  sgs/site-header-row   6 | OVER   <- never measured before
  sgs/site-footer-row   7 | OVER   <- never measured before

Exit behaviour UNCHANGED: advisory, exits 0 without --strict. Widening the scope
of an advisory script must not turn it into a gate (the <=3 figure is a default,
not a ceiling — Bean-confirmed). --strict still exits 1. Self-test 5/5.
The two original blocks' figures are byte-identical to before.

⛔ A LIMITATION DOCUMENTED RATHER THAN LEFT TO LOOK AUTHORITATIVE: the script
counts a COMPOSITE COMPONENT MOUNT as one row without opening the component. On
the row blocks that is wrong in BOTH directions, measured:
  RowScrollBehaviourControls counted 1, renders THREE isShownByDefault -> UNDER 2
  ResponsiveBoxControls      counted 1, has ZERO isShownByDefault      -> OVER 1
So site-header-row's "6" is really about 7. Every figure for a composite-mounting
block is an approximation, not a census, and the header now says so.

The implementing agent reported this as "handles opaque composites as single-unit
rows per spec — no concerns". That framing was wrong and is the exact
rationalisation this repo keeps getting caught by: a detector that cannot resolve
an indirect value undercounts SILENTLY, and a soft number presented as a
measurement is worse than no number. Caught in review, not by the self-report.

The real fix — resolve the mount and count its isShownByDefault — is deliberately
NOT done here: it would also move the figures for site-header and site-footer,
which carry human rulings made against the current numbers. Recorded as open.
---
commit d76651ef  2026-08-19
fix(site-header): delete 6 attributes that could never render

Copy-pasted from sgs/site-header-row without the one attribute that makes them
work. sgs/site-header declares NO `layout` attribute, and the wrapper only emits
alignContent / alignItems / columns / flexDirection / flexWrap / justifyContent
inside branches gated on 'grid' === $layout or 'flex' === $layout
(class-sgs-container-wrapper.php:964,1003). The gate can never be satisfied, no
control writes any of them, and nothing writes `layout`. 55 attributes -> 49.

⚠ The identical six exist on sgs/site-header-row and are LIVE there — that block
DOES declare `layout` (enum flex|grid, default flex). Untouched, verified.

WHY THE EXISTING TOOLING MISSED THIS: check-dead-controls.js catches the INVERSE
class (a control whose attribute nothing renders). These six have no control at
all, so there was nothing for it to flag — a real blind spot, not a gate failure.
Found by tracing the PHP emission gate against the block's own attribute list.

RATCHETED IN THE SAME COMMIT: rule 21 render-without-control was flagging 3 of
the 6, so its openBacklog goes 253 -> 250. Without that the gain becomes silent
slack — the ratchet blocks growth past a frozen number but never lowers it.
Positive control: openBacklog 249 -> exit 1, 250 -> exit 0.

Only 3 of 6 were flagged because rule 21's predicate requires the attribute be
consumed somewhere; the other three were invisible to it too.

Reviewed cross-model (haiku implementer, sonnet reviewer): spec compliant, no
findings. Both "cannot verify from diff" items resolved by the controlling agent,
which had independently run the gates and the deadness trace.

Gates: inspector-scan exit 0 (advisory 786 -> 783); check-dead-controls exit 0;
check-element-manifest-conformance exit 0.
---
commit 7618b7e3  2026-08-19
docs: D678 — Stage 1 reseeds but does not prune; LEDGER caught up

Records the judgement error honestly: a 25-row orphan census was measured and the
decision taken was NOT to prune, reasoning most rows predated this session. The
F5/F6 gate then blocked the commit and named all 8 NEW violations as this
session's own. The gate distinguishes NEW from baselined; its judgement was
better than mine. Fixed via Stage 9.

LEDGER: the stale-classifications open item is CLOSED (the reseed regenerated it);
the reseed and tabs-label questions removed from "waiting on Bean", leaving only
site-header; new guardrail added — Stage 1 updates but does not prune, Stage 9 is
the prune.

Gates: handoff-preflight --check all 9 pass; D-ceiling 678.
---
commit 1977cf1e  2026-08-19
refactor(states): tabs follows the vocabulary, reseed, and the orphan prune it exposed

Bean-ruled: tabs' visible label should match the renamed vocabulary. 5 rows in
tabs/edit.js, key AND label. Inspector-only strings; no attribute or render change.

RESEED RUN — Bean confirmed no other session is live, the only thing blocking it.
DB backed up first to sgs-framework.db.bak-2026-08-19-pre-rename-reseed.

PREDICTION DECLARED BEFORE RUNNING, then reconciled: hover 116, current 13,
selected 0. MEASURED exactly that. The DB previously held 16 `selected` because it
was last seeded BEFORE tonight's nav-menu fix, so it still carried those 3
mis-tagged rows; they are now correctly `hover`.

THE REGENERATED CACHE — a 16,721-line raw diff that is only 17 semantic changes:
  +8  headingLevel entries — the genuinely missing rows that made this file STALE.
      That open item is closed as a side effect.
  -8  hero's gridItem* entries — correct; those attributes were deleted tonight.
   1  a css_tier value — the known non-deterministic churn, disclosed not hidden.
The rest was reordering.

THE PART WORTH READING: reconciling the cache against the DB left ONE hover row
unaccounted — sgs/hero.gridItemBorderGradientHover. Chasing it found that STAGE 1
UPDATES BUT DOES NOT PRUNE, so all 8 attributes deleted tonight survived as DB
rows. The F5/F6 commit gate independently caught the same thing and BLOCKED this
commit, naming every one of hero's 8 as a "rogue seed". The gate was right and I
was wrong to have planned to leave it: I had decided not to prune, reasoning the
orphans were mostly not mine. The gate distinguishes NEW from baselined, and all
8 NEW ones were mine.

Fixed via Stage 9, the sanctioned prune, dry-run first: 25 attribute-orphan rows
deleted (hero's 8 plus 17 pre-existing), 0 blocks/supports/capabilities touched.
DB attrs 2440 -> 2415, orphans 0. hover 116 -> 115, and 115 = 89 derived + 26 net
overrides — the arithmetic that had been off by one now reconciles exactly. The
unexplained +1 WAS the defect.

Gates: db-consistency exit 0 (was NEW-violation blocking); inspector-scan exit 0;
manifest-conformance exit 0.
---
commit 38bc7c32  2026-08-19
docs: C1 design gate cleared (D677) + LEDGER caught up

Bean ruled all three open questions on the shared hover-colour helper, so C1 is
no longer blocked:
  (a) emission  — info-box's per-instance scoped :hover rule is canonical, which
                  makes back-porting card-grid a Spec-32 COMPLIANCE fix
  (b) button    — EXEMPT, reason recorded: its hover vars feed three preset
                  classes with theme.json fallback chains
  (c) scope     — colour only (sgs_emit_state_colour_css), not a general state
                  helper. Colour is the layer with a measured backlog behind it

LEDGER: submenuPadding and the state rename moved from pending to shipped;
C1's gate marked cleared; the two questions Bean answered removed from
"waiting on Bean" and replaced with the two that genuinely remain — the
coordinated /sgs-update reseed, and whether tabs' visible "Active" label follows
the renamed vocabulary. Commit count and blocker line corrected.

Gates: handoff-preflight --check all 9 pass; D-ceiling 677.
---
commit 542f8566  2026-08-19
chore(visual-gate): log the four scoped skips from this session

Appended by the pre-commit hook after staging, so it lands one commit behind the
changes it records. Four entries: hero (dead gridItem attrs) and the three
state-rename blocks (option-picker, table-of-contents, tabs). Each carries the
render-impact proof as its reason, per the gate's mandatory-reason rule.
---
commit 173ca610  2026-08-19
refactor(states): rename the `selected` state vocabulary word to `current`

Bean-ruled. CODE LAYER ONLY — no DB reseed was run, deliberately.

WHY THIS IS A CODE CHANGE, NOT A DATA MIGRATION: block_attributes.css_state is a
DERIVED column. A direct UPDATE would be silently undone by the next reseed,
because the classifier re-derives it from source. So this edits the DERIVATION
plus its committed cache; the live DB catches up at the next coordinated reseed,
a shared action affecting other live sessions, NOT part of this commit.

WHY `current` AND NOT `active`: `:active` is a real CSS pseudo-class meaning
"being pressed", and `current` maps to `aria-current` — the selector breadcrumbs
already emits and the one nav-menu's unwired current-page indicator would need.
Recorded honestly in D676: the ORIGINAL argument for `current` was WEAK. It
claimed `active` would collide with a `pressed` state; `pressed` exists only in
cluster-member-sets.json's unread `states` block and has zero DB rows.

  extract-signatures.py   the derivation — _STATE_SELECTOR_PATTERNS, the three
                          _bem_current_state sites, the self-test assertions
  block.json x3           option-picker, table-of-contents, tabs. Tab-indented
                          formatting preserved; NOT round-tripped through json.dump
  classifications cache   13 rows, edited SURGICALLY. That file must not be
                          regenerated: extract-signatures.py ignores --help and
                          executes, and its output is non-deterministic
  survey script, spec SQL scope, 3 inspector-only literals

TWO CORRECTIONS MADE ON REVIEW OF THE DELEGATED WORK:
1. breadcrumbs' cache row was left as `selected`, reasoned from it having no
   block.json states key. But its state derives from _bem_current_state(), which
   this commit renames — so the classifier now produces `current` for it and the
   cache would have disagreed with its own generator. Changed; the self-test
   confirms it resolves to css_state='current'. All 13 rows are consistent.
2. The renamed docstring claimed nav-menu's itemColourHover "resolves to
   css_state='current'". FALSE — those three resolve to `hover`; that mis-tag was
   the bug fixed in 4626fb31 earlier today. The claim was inherited from the
   pre-rename text and carried forward with the word swapped. Removed.

`tabs/edit.js` keeps its visible `key:'active'` / `label:'Active'` — a UI-only
string nothing reads against the DB vocabulary, on the framework's only 3-state
row. Bean's call whether the label follows.

Gates: extract-signatures.py --self-test 4/4 PASS (verified it exits before
touching the DB); all edited JSON parses; both .py compile; inspector-scan exit 0
with the advisory total unchanged at 786.
---
commit 27659122  2026-08-19
fix(nav-menu): tier submenuPadding to match its sibling flyout surfaces

Bean-ruled. submenuPadding was a flat box object with a plain BoxControl, while
nav-drawer and mega-panel tier the identical "panel inner spacing" concept. The
in-code comment defending the flat shape had all its FACTS right but rested on
"a dropdown's inner spacing is not device-tiered", which its own siblings
contradict.

NO SCHEMA CHANGE AND NO DEPRECATION. submenuPadding and nav-drawer's
drawerPadding already had byte-identical declarations - {"type":"object",
"default":{}}. The difference was purely how edit.js and render.php INTERPRET
the object, so this is a wiring change, not a migration.

  edit.js  BoxControl -> ResponsiveBoxControl, copying nav-drawer/edit.js:395-407
           exactly (base/tablet/mobile values, tier->desktop onChange key).
           hasValue updated to the tier keys; BoxControl import dropped, now dead.
  render.php  the single --sgs-nm-submenu-padding custom property replaced by a
           tier-aware sgs_emit_responsive_css() call on the same selector, later
           in source order, so an unset tier leaves the base 8px 0 in place.

THE DATA RISK I FLAGGED DOES NOT EXIST HERE - checked rather than assumed. A
stored flat {top,right,bottom,left} read as ?.desktop would yield undefined and
silently fall back to 8px 0, losing a client's setting. The canary carries ZERO
stored submenuPadding values: 131 pages, 9 posts, 15 templates, 15 template
parts swept via REST, zero matches.

VISUAL SAFETY PROVEN BY EXECUTION, not by reading: calling the helper directly
returns an EMPTY STRING for an empty object, the correct base rule for a
desktop-only value, and a correct @media (max-width:1023px) block for a
tablet-only value. So every existing page renders byte-identically today.

Also corrected rule 30-raw-box-control's advisoryReason, which cited
nav-menu:1244 as a live flat-box-object example. That citation is now historical.

Gates: php -l clean; edit.js parses; rules.json valid; inspector-scan exit 0 with
the advisory total unchanged at 786.
---
commit b7a03e26  2026-08-19
docs: record the golden-control pivot across the governing docs

Task F. This session changed the programme's shape; that belongs in the brief
the next session reads, not only in a session plan.

PROGRAMME DOC (2026-08-18-inspector-enforcement-programme.md):
  - D2 marked SUPERSEDED by rule 31, with the reason: a binary panel-exists
    check conflates three defects (no control / core-native control /
    non-conformant control). Proven — D2's own 5-block candidate list split into
    two unrelated causes on inspection, so it would have pointed at the wrong
    fix for three of the five.
  - new phase 1.5 for the golden control schema, naming C1 (the shared hover
    helper) as the blocker for its rollout half
  - new 5.4, the first honest census of the colour surface, and the first taken
    after the gradient crash was fixed the same day
  - gradient rollout recorded as IN SCOPE — an item cannot be both parked and in
    flight; rule 31's 193 row-missing-gradient findings are now its backlog
  - 7 newly-found stale claims added to Phase 4
  - two of the doc's OWN claims corrected: retireWhen does not exist anywhere in
    scripts/, and the ratchet does not self-heal

LEDGER: replaced. THE FRONT is now C1 -> C2 -> C3. Records the site-header
finding honestly — Bean's instinct was PARTLY right (rows own transparent/
shrink/hide) but sticky is header-level by his own D389 ruling and Layout preset
is mandated by FR-37-28, so the real finding is two live mechanisms for one
capability, not vestigial controls.

DECISIONS: D670-D676. Ceiling 669 -> 676, verified heading-anchored.

STOP-CATALOGUE: new A15 with 9 STOPs, plus ritual question 15. D101 respected —
counts only rose (STOP occurrences 255 -> 264, A-headings 3 -> 4, ritual 14 ->
15), receipt line added.

STOP FLOOR: bumped 209 -> 251 identifiers. The gate reported 42 STOPs sitting
beyond the committed floor, which is the same no-self-heal pattern this session
documented — a gain left unlocked can be silently lost later. Computed with the
gate's OWN _defined_stop_ids function rather than a reimplementation, and merged
as a union with an explicit assertion that zero identifiers were removed.

Gates: handoff-preflight --check all 9 pass (LEDGER 13,274/24,576; STOP baseline
of 251 fully carried forward; 39 links resolve; 173 citations resolve).
inspector-scan --check exit 0.
---
commit 0cd53fdb  2026-08-19
feat(githooks): run inspector-scan when an editor surface is staged

THE GAP THIS CLOSES: there is no CI on this repo — .github/workflows/ does not
exist — and the pre-commit hook invoked neither prebuild nor inspector-scan.
So the entire rule set (7 gate rules + 14 advisory, including the golden-colour
conformance rule added today) ran ONLY when somebody typed `npm run build`.
A detector nothing triggers is a detector nobody has.

SCOPE, deliberately narrow: fires when a staged path matches
src/blocks/<block>/edit.js or src/components/*.js — exactly the surface every
inspector rule reads. A staged .md, render.php or style.css does not trigger it.

VERIFIED BY RUNNING THE HOOK, NOT BY READING IT:
  - stage a .md            -> scan does NOT run (0 occurrences)          PASS
  - stage an edit.js       -> scan runs, reports 7 gate / 14 advisory     PASS
  - lower an openBacklog,
    stage an edit.js       -> hook exits 1 and prints COMMIT BLOCKED      PASS
The third is the one that matters: a gate that reports without failing is
theatre. Registry and working tree restored after each probe.

THREE TRAPS HONOURED, each from a real incident in this repo:
  - $? is read after a REDIRECT, never after a pipe (after a pipe it carries the
    last command's status, not the scan's)
  - node is resolved via command -v, the way Gate A resolves python since D564 —
    a hardcoded interpreter path made "missing interpreter" and "real
    regression" indistinguishable
  - the scoped bypass REFUSES to run without a reason and logs every use to
    reports/visual-diff/manual-skips.log, the same discipline as the visual gate

The block message deliberately steers away from --no-verify, which would also
discard gitleaks, cheat-gate, F5 and F6 — all unrelated and all passing.
---
commit e5c47704  2026-08-19
feat(inspector-scan): rule 31 — golden colour control conformance

Task B. The first detector that measures a control against its canonical SHAPE
rather than asking whether a control exists. Reads
scripts/consistency/golden-controls.json controls.colour; no rule logic restates
the contract.

FIVE FINDING KINDS, measured live 2026-08-19:
  row-missing-gradient        193
  row-below-minimum-states    190
  native-colour-ui             26
  banned-lookalike              0   (regression guard - proven failable)
  roster-surface-unknown        0   (null-surfaces guard)
  ---------------------------------
  total                       409   -> openBacklog

WHAT native-colour-ui CATCHES, and why it is new: core's colour UI does not
arrive via JSX - there are ZERO raw ColorPalette/PanelColorSettings mounts in any
of the 83 edit.js files. It arrives through block.json supports.color. 26 blocks
have a live flag; 23 of them ALSO mount SgsColourPanel, so a client sees two
different colour interfaces for the same block. Rule 24 gates the JSX half and
never opens block.json, so there is no overlap.

A REAL DETECTOR BUG, FOUND AND FIXED RATHER THAN BASELINED: the first live run
returned 173/164, below an independent regex prediction. Instrumenting rows
processed (206) against a fresh count (239) localised the whole 33-row gap to
three blocks - product-card, nav-menu, social-icons - each scoring ZERO rows
despite having colour panels, because all three build the rows prop indirectly
(.push(), a separately-declared const, a spread-of-conditional). The resolver was
extended rather than the shortfall accepted; 239/239 rows now processed.
A false ABSENCE reads exactly like a clean result.

VERIFIED BY RUNNING, NOT BY READING:
  - node run.js --self-test 31-golden-colour-control -> PASS (real harness, via
    the registry entry; the building agent could not invoke this itself)
  - 6 mustFlag / 6 mustNotFlag fixtures across 12 directories
  - native-colour-ui's 26 agrees with an independent pre-rule Python count AND
    with the 26 findings keyed on a block.json file - two methods, same answer
  - RATCHET POSITIVE CONTROL: openBacklog 408 -> exit 1, 409 -> exit 0. The gate
    is armed for this rule, not merely present

Two blind spots are declared in the registration rather than hidden: a nested
value expression falls back to the schema floor of 2 (can only under-count), and
rows built via .concat()/Array.from() stay unresolved (no live instance).

Advisory on introduction - never promote on the run that introduces a rule.
---
commit fcbe90de  2026-08-19
fix(consistency): golden-controls no longer defers to an unread state vocabulary

Bean challenged whether cluster-member-sets.json is reliable. It is not, for
this purpose, and he was right.

MEASURED: all four consumers of that file — check-element-manifest-conformance.js,
check-cluster-coverage.py, placement-reach.py, extract-signatures.py — read only
its `clusters` and `order` keys. Its `states` block has ZERO readers. It is
documentation living inside a data file: nothing would notice it drifting, so it
cannot be a source of truth. The first draft of golden-controls.json called it
exactly that.

CORRECTED: this file now carries the vocabulary itself, split honestly.
  REAL (have DB rows + a derivation chain): hover 113, selected 16
  NOTIONAL (exist only in that unread block, 0 DB rows): focus, pressed, disabled

THAT WEAKENS THE RENAME ARGUMENT, recorded rather than buried. I advised against
renaming `selected` to `active` because `active` would collide with `pressed`.
`pressed` exists only in the unread block. The real constraint is different and
smaller: `selected` has 16 live rows and a derivation chain, so a rename is a
9-step migration rather than a relabel. Question reopened, not closed.

SECOND DEFECT FOUND WHILE CHECKING, recorded against the row component:
Part O §6 names StateToggleControl the canonical state component and calls it
"verified adoptable today" with a live nav-menu mount. Spec 35:736 contradicts
it in the same document, and the tree agrees with :736 — 0 JSX mounts across
src/blocks; the only references are two comments recording where it used to live
(brand-strip/edit.js:316, nav-menu/edit.js:463) plus its own file. The working
mechanism is SgsColourPanel rows -> DesignTokenPicker states, which is what this
schema already encoded.

No change to what the schema requires of a control — only to what it claims as
its source, and to two false claims it inherited.
---
commit a309638f  2026-08-19
fix(hero): delete 8 dead gridItem* attributes, and ratchet the rule that found them

Bean's ruling: "We shouldn't have fake or dead shapes or attributes."

WHAT WENT: 8 attributes (gridItemBackground / Border / BorderGradient /
BorderGradientHover / BorderRadius / Padding / Shadow / TextColour), their 2
boxFamilies entries, and the whole `grid-item` element from
supports.sgs.elements. 126 -> 118 attributes, 13 -> 12 elements.

WHY THEY WERE DEAD, measured not assumed:
  - zero references in hero's edit.js / render.php / save.js
  - zero references in any theme pattern
  - no client could reach them: hero mounts no GridItemDefaultsPanel
  - render never emitted them: the wrapper's grid-item CSS is gated behind
    'grid' === $layout (class-sgs-container-wrapper.php:1034) and no hero
    control, pattern or save path ever writes `layout`

NOT A STANDALONE HERO FIX. The deletion lands with its gate in the same commit:
rule 21 render-without-control was flagging exactly these 6 attrs, so its
openBacklog is ratcheted 259 -> 253. Without that the improvement would become
silent slack - the ratchet blocks growth past a frozen number but never lowers
it on progress, so a cleared finding is invisible and reversible.

Siblings untouched and verified: container, cta-section and trust-bar keep their
own gridItem* attrs; they mount GridItemDefaultsPanel and genuinely use them.

Visual gate: scoped skip, reason logged to reports/visual-diff/manual-skips.log.
Not auto-skippable because the metadata-only channel covers supports.sgs alone
and this also removes attributes; render impact is nil for the reason above.

FOLLOW-UP, deliberately not done here: the converter resolves its GRID
destination from the out-of-repo DB, not block.json, so its behaviour only
changes after a /sgs-update reseed - a shared action affecting other live
sessions, to be coordinated.

Gates: check-element-manifest-conformance exit 0; inspector-scan exit 0 with the
tightened backlog (7 gate rules, 0 gating findings; advisory 383 -> 377).
---
commit cfd2aa16  2026-08-19
feat(consistency): the golden control schema — colour, as data

Task A of the golden-control programme. Encodes the canonical SHAPE a colour
control must have, so enforcement (and later generation) measure against data
rather than prose. Answers "does this control match its canonical shape?", not
merely "does a control exist?".

WHAT IS ENCODED (colour only — the other 12 Part O contracts get a row when a
rule needs one, never speculatively):
  - canonical panel/row/text-gradient/overlay components with their real APIs
  - banned lookalikes as REGRESSION GUARDS: all 4 are at zero live instances
  - the native-core-colour fingerprint (Bean's addition): supports.color, not JSX
  - minimum states: normal + hover, extended by the element's DECLARED states
  - gradient: universal, with declared exemptions carrying a real reason
  - scope: roster.json surfaces.colour, with the null-surfaces trap spelled out

STATE VOCABULARY IS REFERENCED, NOT COPIED. cluster-member-sets.json already
defines five states and their CSS realisations. `selected` deliberately unifies
[aria-selected="true"], [aria-current] and .is-active; `pressed` is the separate
state for genuine :active. Duplicating that here would create a second
vocabulary that drifts.

WHY STATES DERIVE FROM THE MANIFEST: an element's declared states set its
required set. No new vocabulary, no hardcoded "is this a nav block" roster, and
it honours FR-35-5 (states are DECLARED, never parsed from attribute names).
Measured: 25 elements declare a state - 23 hover, 3 selected.

Every figure was produced by running a command today and re-verified against the
tree after writing: scope 65, supports.color 53, at-least-one-flag-true 26,
SgsColourPanel adoption 60. All four match.

FOUR STALE SPEC CLAIMS RECORDED IN THE FILE (Phase 4 material):
  - Part O §1 field 9 "NOT YET BUILT, no state axis and no popover" - all three
    exist today (DesignTokenPicker.js:205, :400-416, :289-317)
  - Part O §1 field 6 "49/50 conform, star-rating violates" - star-rating now
    mounts SgsColourPanel (edit.js:134)
  - "raw GradientPicker inside GradientOverlayControl" - it uses the SGS fork
  - SgsColourPanel is never named in §1 despite being the 60-block vehicle

Hand-maintained by design: this is a contract, not a derivation, so it cannot be
generated from the tree it governs.
---
commit 4626fb31  2026-08-19
fix(nav-menu): remove the duplicate `selected` state that mis-tagged 3 hover attrs

`supports.sgs.elements.item.states` declared `hover` and `selected` with
byte-identical attrMaps. The behavioural classifier records per attribute on a
last-write-wins basis (extract-signatures.py:1966-1983), so `selected` iterated
second and silently overwrote the correct hover derivation.

Result: itemColourHover / itemBgHover / itemRadiusHover were tagged
css_state=selected in the derived data, for a state they never render in.
render.php:953-957 wires all three to `:hover, :focus-visible` only;
current-page styling is a separate path (render.php:1473-1480).

The block.json _note conceded this and kept it "for schema consistency", which
made the metadata factually wrong rather than consistent. Note rewritten.

Proven, not assumed: re-deriving the classifier after the block.json fix flips
exactly these 3 rows from selected to hover. Only those 3 lines are carried here.
13 selected rows remain across tabs/option-picker/table-of-contents/breadcrumbs,
all correctly tagged.

nav-menu is the only block with this shape; the other four were each checked.

Gates: check-element-manifest-conformance exit 0 (style-defect 12/12,
state-without-base 4/4, unclassified 0, role-map-stale 0); inspector-scan exit 0
(7 gate rules, 0 gating findings).
---
commit 1e63a449  2026-08-19
docs(mistakes): capture the two lessons from the gradient-crash session

Both rules came out of one session (2026-08-19) and are recorded in full in
~/.claude/memory/learning/ + the CC auto-memory layer; these are the index
stubs.

1. a-crash-masks-every-defect-behind-it
   Clicking "Gradient" crashed every SGS block. I fixed it and verified live -
   no throw, no error boundary, clean console, component mounted, correct
   control points. All crash-shaped checks, all passing. Bean's screenshot then
   showed the gradient panel visibly broken: no bar, TYPE truncated to "L.",
   collapsed popover. That defect was three days old and had never been
   observable by anyone, because the crash fired before the UI could be seen.
   The rule: a crash is an opaque cover over everything downstream of it.
   Fixing it is the FIRST chance to inspect that surface, not the end of the
   job. "CRASHED: false" is not "it works".

2. a-fork-that-renames-identifiers-inherits-none-of-the-original-behaviour
   The D636 fork of core's CustomGradientPicker copied the JSX faithfully and
   renamed all 17 CSS classes; no stylesheet for the new names was ever
   written, so core's height:48px/width:100% never applied. The sibling
   colour-picker fork keeps 20 core classes and looks correct. Compounding it,
   @wordpress/components is a webpack external with no local copy, so the CSS
   could not have been ported at fork time. The rule: forking copies what is in
   the file, never what the platform binds to the file's IDENTIFIERS - renaming
   silently unhooks all of it with no error at any layer. Also records the
   wp-scripts trap: a shared EDITOR component's CSS must not be named
   style.css, or it ships to the frontend.

Two oldest stubs (2026-07-21, 2026-07-28) archived to hold the active list
level at 34. Still ~4 over the ~30 target, unchanged by this commit.
---
commit 3fa0ebbd  2026-08-19
fix(gradient): restore the gradient picker's styling - it had none at all

Bean reported the gradient popover rendering collapsed: no gradient bar, a
truncated TYPE select ("L.") and a squashed ANGLE dial, against a Solid
popover that looks correct.

Root cause: the D636 fork copied core's CustomGradientBar JSX but renamed
every class to sgs-gradient-picker__*, and no stylesheet for those names has
ever existed - 0 matches in src/ and 0 in the built bundle. Core's stylesheet
could not have been ported either: @wordpress/components is a webpack
external, so there is no local copy to port FROM (verified repo-wide - no
node_modules copy, no vendored Gutenberg; the only "custom-gradient-picker"
strings in the tree are our own docblocks naming the file we copied).

The asymmetry with the sibling fork is the tell, and explains why Solid looks
right and Gradient does not:
  colour-picker fork:   20 core components-* classes kept  -> fully styled
  gradient-picker fork:  0 core classes, 17 sgs-* classes  -> styled by nothing

Core's rule the fork was missing, read from the live editor's own stylesheet
(ground truth, since it cannot be read locally):
  .components-custom-gradient-picker__gradient-bar { height:48px; width:100% }
A bar with no height and no width is invisible, and a popover sized to its
contents then collapses.

Fix: the 9 elements with a core counterpart now carry core's class ALONGSIDE
the sgs- one, so core's stylesheet applies for free - the same arrangement
the colour-picker fork already relies on. The sgs- classes stay as our own
hooks. editor.css covers only the 4 SGS-only elements core has no equivalent
for (root min-width, type/angle wrappers, the D636 stop-editor palette).

Named editor.css, NOT style.css: wp-scripts routes a file called style.css to
the FRONTEND bundle. The first attempt did exactly that and shipped an
editor-only control's CSS to every page. Verified after the rename: present in
68 per-block editor stylesheets, 0 frontend ones - matching the existing
LinkPopoverControl.css precedent.

This defect is pre-existing D636 debt, not a regression from the crash fix.
It was unobservable until now because clicking "Gradient" crashed the block
before the UI could be seen.
---
commit daeec438  2026-08-19
fix(gradient): switching a colour row to Gradient crashed every block

Clicking "Gradient" on any colour row replaced the block with "This block has
encountered an error and cannot be previewed".

Root cause (proven against gradient-parser@1.2.0, not inferred):
gradientParser.parse() does NOT throw for an empty or whitespace-only string -
it returns an EMPTY ARRAY. The forked-from-core try/catch only covered the
throwing shape, so [0] was undefined and the next .orientation read threw a
TypeError, which React's error boundary turns into the error box.

Core never hit this: a core gradient attribute is undefined when unset, and
parse(undefined) DOES throw, so its catch covered it. Every SGS gradient
attribute defaults to "" instead - 96 of them across 36 blocks - so this fired
on the first click, on every gradient control in the plugin
(DesignTokenPicker, GradientCapableColourControl, GradientOverlayControl and
sgs/separator's direct mount).

One load-bearing fix: parse through a helper that answers null for BOTH
failure shapes, with a single recovery path. ?? is left as forked-verbatim
rather than changed to || - that would be a second, overlapping fix covering
only a subset, and two overlapping fixes are unfalsifiable.

Also: an unset picker now seeds from the client's brand palette (primary ->
accent as var() stops, so a brand change re-colours it) instead of core's
stock blue/purple, falling back to the palette's first two entries and then to
DEFAULT_GRADIENT. Seed only - nothing is written until the operator touches
the bar, exactly as in core.

No gate could have caught this: all ~50 prebuild gates are static source
checks and none mounts a control and clicks it. Adds
tests/js/gradient-picker.test.js (20 cases) including a negative control that
reproduces the pre-fix function and asserts it throws, so a silently-disabled
test cannot read as a clean pass.
---
commit 9b6bd000  2026-08-18
docs(handoff): session close — LEDGER, D665-D669, STOP A14, 3 lessons

LEDGER replaced (not appended) with the inspector-enforcement session and a
4-task orchestration plan for the next one: D2, D4, the commit-time trigger,
then hero.

D665 colour placement — an element is anything with its OWN PANEL (Bean-locked)
D666 detectors are inspector-scan RULES, never standalone scripts
D667 the advisory ratchet — openBacklog sat on 19 rules and was read by nothing
D668 rule 30's 4 false positives — a THIRD box storage shape exists
D669 the Simple-surface cap stays at 3; the COUNTER was wrong

STOP-CATALOGUE §A14 — eight new entries, and D101 carry-forward PASSES with
every category up: defined STOPs 234 -> 242, bullet defences 299 -> 308,
unique tokens 272 -> 280, sections 5 -> 5, ritual questions 13 -> 14. Nothing
dropped or reworded away. Receipt measured AFTER the write, per session 9's
own lesson about self-referential counts.

Programme doc gained Phase overview + Out of scope; docscore 82.9% -> 100% A.

TWO INCIDENTS THIS HANDOFF, both now captured as lessons:

1. The QC subagent dispatched to verify this reconciliation ran
   `git checkout main -- .` despite a read-only brief, DESTROYING three files
   of uncommitted doc work — the LEDGER rewrite, D665-D669, and the mistakes
   entries — then reported those docs as MISSING and returned INCONSISTENT.
   The finding was literally true and completely misleading. Nothing committed
   was lost; the blast radius was scoped in under a minute by noting that files
   written AFTER its checkout survived, and files outside the repo survived.
   Rule: COMMIT before dispatching any agent, even a read-only one. A task
   framing does not constrain tool access; only committing does.

2. My own prune of mistakes.md searched for the next `###` as an end anchor and
   swallowed 14 entries — caught by counting 19 where 33 was expected. Restored
   from HEAD and re-added without pruning. mistakes.md sits at 34 against a ~30
   target; prune next session rather than risk a second splice mid-handoff.

handoff-preflight --check: all 9 checks pass.
---
commit 023b301a  2026-08-18
docs(plan): /qc pass on the programme doc — 5 defects found and fixed

Verified ~25 factual claims against live ground truth. Structural pre-gate
first: every cited file:line resolves and is accurate, including run.js:8's
own stale "NOT wired into prebuild" claim that the doc flags for correction.

Confirmed exact: 52 prebuild segments / 0 wrappers; 7 gate + 13 advisory /
383 findings; rule findings 0/8/0/3; role 2435 of 2440; css_property 995;
inspector_control_type 973; css_element 910; 308 elements with 308/308
label, order and clusters; contentAttrs 0; isWrapper 68; SgsColourPanel 60;
TypographyControls 16; ShadowControl 15; roster 83; hero 126 attrs and 13
elements; D4 population 138/50 reproduced from the doc's own predicate;
rule 21 backlog 259; overrides 378; surface cap 5 OVER / 3 WITHIN.

Fixed:
  1. "12 commits" was stale on write. Replaced with the command to derive
     it — a commit count in a doc is wrong the moment it is committed.
  2. "21 entries in rules.json" -> 22 (20 real rules + 2 pseudo-rules).
  3. Free-slot list omitted 31 and 32.
  4. "MediaPicker 9/83" -> 8/83. The 9 conflated MediaPicker (8) with
     MediaGalleryPicker (1) — the multi-count trap the doc's own §6 warns
     about, committed inside the doc that warns about it.
  5. "nine advisory rules carried 383 findings" mixed a BEFORE count with
     an AFTER total. It was 9 rules / 372 findings; it is now 13 / 383.

Also disambiguated five bare filenames (edit.js:588, LayoutPanel.js:326 and
similar) with their directories — all resolved correctly, but a cold reader
could not tell which block was meant.
---
commit 7b49f595  2026-08-18
docs(plan): consolidated inspector-enforcement programme doc

One doc replacing a scratch plan and a session's worth of scattered agent
reports. Covers what already exists, what was measured, what shipped, what
remains, and what "done" means.

Written as a project artefact rather than a personal scratch file because
the next session needs it cold. Supersedes the pre-build plan in
~/.claude/plans/ (kept there for its council record).

Sections worth knowing about:
  §2 what already exists — the rule engine, the data layer, the contracts.
     Read before building anything, so nothing gets rebuilt.
  §3 findings, including the colour/element rule Bean locked today.
  §6 five instrument bugs found in one day, and the standing rule they
     earn: no detector ships with a hand-counted baseline.
  §9 completion conditions, per detector, per phase, and for the
     programme.

Every figure in it was produced by running something; the few inherited
ones say so.
---
commit ebf48696  2026-08-18
fix(gates): close Phase 0 — last advisory wrapper gone, surface counter fixed

ZERO [ADVISORY] wrappers remain in prebuild. All 52 segments can now fail.

RETIRED 3 STALE ROLE OVERRIDES (Bean: override what is getting in the way).
attr-classification-overrides.json 381 -> 378 entries: responsive-logo.alt,
cart.ariaLabel, tabs.blockLabel. Two carried a 2026-08-04 Bean ruling and
tabs.blockLabel existed BECAUSE the structural check missed it (PHP spells
the variable aria_label, HTML the attribute aria-label, and the marker only
matched the hyphen). The worry was that "the fingerprint now derives it
independently" might be the audit reading back the role the override itself
seeded. It is not, and the check is non-circular: this script's actual job
is finding attributes that LACK a mechanism, so with the overrides gone all
three would surface as findings if nothing reached them. None do.
audit-declared-vs-seeded-roles.py now exits 0 and is unwrapped.

SURFACE COUNTER FIXED — the cap was never the problem, the count was.
check-simple-surface-cap.js reported sgs/site-footer at 7 default-visible
rows against FR-37-27's cap of 3. Two real over-counts:

  1. A <PanelBody initialOpen={ false }> is CLOSED on load, and the script
     had ZERO occurrences of initialOpen. Its header claims a bare control
     in a PanelBody "is unconditionally shown" — true for an open panel,
     simply false for a collapsed one. A closed accordion is progressive
     disclosure, and the oldest such mechanism in the editor.
  2. A <Notice> was counted as a control. site-footer's is a conditional,
     non-dismissible contrast WARNING — not a setting an operator can set
     or lose.

  site-footer 7 -> 3, WITHIN cap. site-header 6 -> 5.

Two regression fixtures added to the script's own self-test so neither
over-count can return.

WHY THE CAP STAYS AT 3. It is FR-37-27, Bean-confirmed, with a stated
reason: a tech-illiterate client can unpin a control they rely on and get a
missing setting with no trail. site-header's remaining 5 are not a cap
problem — they are DRIFT past Bean's own curation. His 2026-08-13 F2 ruling
kept exactly two default-visible, Header width and Sticky on scroll. Both
are still there. BackgroundPanel (from the wrapper-decomposition background
rollout), minHeight and Layout preset arrived afterwards, because nothing
enforced the cap. Raising it would bless the drift; which of the five stay
visible is a client-facing UX call and is left to Bean.

Verified: self-test PASSED incl. both new fixtures; full prebuild exit 0.
---
commit 810884ff  2026-08-18
fix(inspector-scan): rule 30 flagged 4 false positives — real count is 0

Caught before any of the four were "fixed", which matters: acting on them
would have replaced correct controls with ones that silently drop the
value.

THE THIRD SHAPE. Spec 35 §12 field 3 names two storage shapes. A third
legitimate one exists: a FLAT BOX OBJECT (top/right/bottom/left),
deliberately not device-tiered, rendered through
sgs_box_object_shorthand( array $box ). A plain BoxControl is the CORRECT
control for it — ResponsiveBoxControl stores a tier-shaped object and
calls onChange( tier, next ), which a renderer expecting a flat box drops
with nothing to see in the editor or the markup.

Both shapes read "type": "object" with an empty {} default, so the schema
type alone cannot separate them. The discriminator is whether Tablet/
Mobile SIBLING attributes exist, or tier keys appear in the default —
the only positive evidence an attribute is meant to vary per breakpoint.

Evidence, read at source rather than inferred: nav-menu/edit.js carries an
explicit comment stating this and nav-menu/render.php:1275 calls
sgs_box_object_shorthand(); product-card/render.php:294-295 states that
cardPadding is a top/right/bottom/left box-object attr mirroring
ctaPadding and tagPadding. All four flagged sites are that shape.

The rule classified purely on "is there a ResponsiveOverride ancestor?"
and never opened block.json — even though its own docblock already said
classification must be by storage shape. Doc described the right
principle; code did not implement it.

A SECOND BUG surfaced while fixing the first, and it is worth knowing
tree-wide: ctx.cache.json() returns an { ok, error, data } WRAPPER, not
the parsed object. Reading .attributes straight off it yields undefined,
which made every attribute look non-tiered and silently disabled the
rule. Its own self-test caught that immediately by reporting the mustFlag
fixture as no longer flagging — the negative control earning its place.

New mustNotFlag fixture flat-box-object-no-tiers mirrors the live shape so
this cannot regress. openBacklog 4 -> 0. The rule still PROVABLY fails via
boxcontrol-raw-flat-with-siblings, so a genuine tiered attribute on a raw
BoxControl is still caught.

Verified: self-test PASS, 0 live findings, full --check exit 0.
---
commit 31787356  2026-08-18
fix(gates): Phase 0.2 — four advisory wrappers removed, they can now fail

Five prebuild segments were shell-neutralised as (cmd || echo [ADVISORY]).
The `||` swallows a non-zero exit before the &&-chain ever sees it, so the
gate ran, printed findings, and passed regardless. Four of the five were
measured passing at exit 0 on their own, so removing the wrapper costs
nothing today and closes the hole tomorrow:

  check-image-controls-support.py   exit 0
  check-dead-api-calls.py           exit 0
  audit-block-uniformity.py         exit 0
  check-editor-render-parity.js     exit 0

Re-confirmed immediately before the edit rather than trusting the earlier
reading. Full prebuild re-run after: exit 0, 52 segments intact.

THE FIFTH STAYS WRAPPED, deliberately. audit-declared-vs-seeded-roles.py
exits 1 on 3 STALE override entries — a real defect the wrapper has been
swallowing on every build. Unwrapping it before those are triaged would
red-line the build.

Triage is NOT done here, and deliberately so — it needs Bean, because two
of the three are Bean-ruled and one may be a circular audit result:
  - sgs/responsive-logo.alt — its own note records the retirement
    condition as MET. Safe to retire.
  - sgs/cart.ariaLabel — seeded for DOCUMENTATION not routing
    (Bean, 2026-08-04).
  - sgs/tabs.blockLabel — same Bean ruling, and its note says the entry
    exists BECAUSE the structural check missed it: PHP spells the variable
    aria_label while HTML spells the attribute aria-label, and the marker
    only matched the hyphen. "Blind spot recorded." So "the fingerprint
    now derives it independently" is either a genuine fix or the audit
    reading back the role this override itself seeded. Those look
    identical from outside, and retiring on the wrong reading silently
    drops an a11y classification.
---
commit a20befa9  2026-08-18
feat(inspector-scan): rule 29 — duplicate visible labels, both mechanisms

One rule, two KINDs, because they are the same client-facing defect: the
operator reads an identical label twice.

KIND 1 — a responsive wrapper and the control inside it paint the same
text. ResponsiveOverride and ResponsiveControl paint their label span
unconditionally. hideLabelFromVision suppresses the inner paint for every
control EXCEPT BoxControl, which ignores the prop (895aef9b proved this
against WP 7.0.4 source). 5 sites.

KIND 2 — a ToolsPanel nested in a same-title PanelBody with no
sgs-nested-tools-panel marker. 3 sites.

THE TWO RULES PARTITION BY LIFECYCLE, and this also reconciles the
conflicting counts that two separate censuses produced. 8 same-title
nestings exist tree-wide: 5 already carry the marker, and those belong to
rule 28, which guards whether an applied fix SURVIVES. The 3 that never
got the fix belong here. 29 catches never-fixed; 28 catches
fixed-then-regressed. Neither can see the other's half.

scope:'global' — 2 of the 5 KIND-1 sites live in block-root helper files
(media and before-after BooleanResponsiveControl.js), invisible to a
per-block edit.js scope. Uses the componentsDir corpus added earlier today
in 0.5, which is what unblocked this rule after a first attempt was
stopped for exactly that gap.

Predicted 8 before the first live run, measured 8 — and cross-checked
against an INDEPENDENT AST census written in a different style before the
rule's own output was trusted, because two same-shaped instruments
agreeing is not independent confirmation.

Verified after registration: self-test PASS, 8 flagged, roster-drift
clear, full --check exit 0, gate findings still 0, advisory 379 -> 387
fully accounted.

Declared gaps: KIND 1 matches literal/__()/identifier label equality only,
so a concatenated label would be missed (none live); KIND 1 does not
follow a render prop into another imported component; KIND 2 needs a
direct JSX ancestor; neither corpus root recurses past one directory level
(verified empty at that depth today).
---
commit 18ce194d  2026-08-18
feat(inspector-scan): rule 33 — does a declared control reach paint?

The THIRD defect layer: declared / rendered / CONSUMED. Every other rule
asks whether a control exists. This asks whether its CSS ever reaches the
painted element. A control can exist, render, save a value, and change
nothing.

sgs/hero is the worked example. Its 7 native typography controls are
silent no-ops: selectors.typography targets .sgs-hero__headline, which
edit.js sets only as an InnerBlocks TEMPLATE child's className. The
generated scoped rule sits at (0,2,0) and cannot beat that child block's
own inline typography at (1,0,0,0) — this framework's HC2 rule. Spec 35
F.1 fixed exactly this on cta-section, info-box and notice-banner; hero
was never done.

A NAIVE TEXT SEARCH CANNOT FIND IT, and that was proven before building:
a class-presence probe over all 83 blocks returned 2 findings, BOTH FALSE
POSITIVES (modal and social-icons, whose wp-block-sgs-* root classes
WordPress generates at render time), and MISSED HERO, because
.sgs-hero__headline IS in hero's files — just never as a DOM class
attribute. Both false positives are now mustNotFlag fixtures.

A REAL ENGINE BUG WAS FOUND AND FIXED MID-BUILD, and it generalises
beyond this rule: comparing AST line numbers against strippedText() line
numbers is WRONG. strippedText() blanks a multi-line comment's entire
character range INCLUDING its newlines, collapsing them and shifting
every later line number — which silently produced ZERO findings on hero,
the one block the rule exists to catch. Character offsets stay aligned;
line numbers do not. strippedText() also strips only block comments in
PHP, never line comments, so the rule carries its own quote-aware
stripper. Same family as D661.

Predicted 3 before the first live run, measured 3 — hero, pricing-table,
testimonial-slider. Reconciled, no surprises. Verified independently
after registration: self-test PASS, 3 flagged, hero among them, advisory
total 376 -> 379 fully accounted, gate findings still 0.

Declared blind spots, stated not hidden: it does NOT compute CSS
specificity, it infers child-owned-therefore-ineffective from the
InnerBlocks-template shape; pricing-table still paints today via a
redundant alias class and is flagged as a declared/rendered mismatch
anyway, with the finding text saying so; the DOM-emission heuristic is
text-shaped rather than a PHP AST (no live block hits that gap,
hand-verified).
---
commit b1982fef  2026-08-18
fix(gates): Phase 0.4 — three always-exit-0 scripts can now fail

Three prebuild scripts parsed --check and then returned 0 regardless. Each
now has a real failing path behind a baseline, and each was independently
proven able to fail by dropping one baseline entry (exit 1) and restoring
(exit 0) — a gate that cannot fail is not a gate.

audit-block-file-consistency.py — real no-op was at :1223/:1271 (the :89
docstring described it accurately). 26 findings baselined; --check now
exits 1 on net-new. Also gains a baseline-refresh flag.

check-duplicate-controls.js — 13 findings, 2 of them FALSE POSITIVES.
Fixed the DETECTOR rather than baselining them, because a false positive
is a detector bug and never baseline fodder. Root cause: sgs/hero's
mutually-exclusive Ken-burns/parallax toggles each write BOTH attrs (own
value plus a clear-the-sibling ternary), and the AST writer-counter
credited that clearing clause as an independent control for the other
attribute. resolveWrite() now excludes the self-passthrough shape. 13 ->
11, and the 2 removed are exactly the hero pair. The remaining 11 are real
(e.g. sgs/tab and sgs/trust-bar duplicate 'label' in one file) and are
baselined. Self-test still 3/3.

audit-shrink-to-fit.js — 8 exit(0) calls, not the 9 one source claimed.
Stays warn-only on its network-dependent paths BY DESIGN: no --url, no
Playwright, or a navigation failure must never red-line an unrelated
commit. A URL-keyed baseline + real --check activates only when --url and
--check are both passed. Fail path proven with a local file:// fixture
forcing a 2000px container into a 400px viewport (6 findings, exit 1);
baseline ships clean, the fixture URL was not left in it.

0.3 IS STRUCK — NO DEFECT EXISTED, and nothing was changed. The concern
was that f5-commit-gate.py's sub-gates silently no-op without a local DB.
Verified: cheat-gate, excluded-gate and db-consistency all resolve
Path.home()/.claude/skills/sgs-wp-engine/sgs-framework.db — the real
14.4 MB database (36 tables), which connects and queries fine. The two
0-byte repo-local sgs-framework.db files are never referenced by any of
them; they are dead decoys, not the dependency. Caveat, not verified:
behaviour on a fresh clone with no such DB present.

0.4b NOT APPLIED, deliberately — needs Bean. check-simple-surface-cap.js
has a real strict-mode gate at :704 that prebuild never triggers. Running
it: exit 1, 2 blocks over cap (site-header 6 vs 3, site-footer 7 vs 3).
The one-line package.json change is ready, but the script has NO baseline
mechanism, so flipping it today red-lines the build until those two are
remediated.
---
commit 4a9bdcb2  2026-08-18
feat(inspector-scan): 0.5 components corpus + 0.6 advisory ratchet + rule 30

0.5 — COMPONENTS_DIR plumbed onto ctx (run.js) and mirrored as _components
in core/selftest.js, matching the existing extensionsDir pattern. This is the
ONE corpus no rule could reach; rule 26's own header declares the gap. Purely
ADDITIVE: no existing rule reads componentsDir, and the advisory total was
372 before and after — proving no existing corpus or count moved.

0.6 — the advisory ratchet. rules.json already carried openBacklog on 19
entries and NOTHING read it. computeExit now fails when an advisory rule's
flagged count exceeds its declared backlog, so debt may only go DOWN. An
advisory rule with no numeric backlog now fails too, closing the escape
hatch where a new rule silently opts out.

  RE-BASELINED FIRST, because enabling the check naively would have red-lined
  the build on three rules. Frozen to today's measured counts:
    21-render-without-control        129 -> 259   *** debt had DOUBLED unseen
    23-content-width-needs-inner-band  0 -> 1     regression locked in
    22-placement-rule-surfaces      none -> 1     had NO backlog key at all
    18-decorative-image-aria          15 -> 13    down, debt cleared
    03-dense-panel-candidate          16 -> 15    down
    07-preset-only-shadow              1 -> 0     down
    26-responsive-duplicate            8 -> 2     down
  Five ratcheted DOWN — that debt was cleared and never recorded anywhere.

  Proven able to fail: 01-tab-group backlog temporarily 58 -> 57 against 58
  live findings produced the RATCHET error and exit 1; restored from a
  scratchpad copy and re-verified at 58 (no repo file left mutated, D659).

rule 30-raw-box-control — Spec 35 §5 banned raw BoxControl. New advisory slot,
never a widening of rule 24's live gate (its house ruling at :26-33).
POPULATION IS 4, NOT 12, and the correction is the point: of 16 raw matches,
4 are the canonical wrapper's own internals and 8 are the MANDATED pairing —
§12 field 3 REQUIRES object-typed attrs to use ResponsiveOverride + plain
BoxControl. Predicted 4, measured 4. Verified independently: hero and the
other 6 mandated blocks are correctly NOT flagged. An earlier plan draft
would have had an agent 'fix' hero:1468 and delete a correct decision.

Verified: --self-test PASS for 28 and 30 + harness meta-check; --check exit 0;
gate findings 0; advisory 372 -> 376 (+4, fully accounted).

OPEN for Bean: nav-menu submenuPadding carries a comment arguing its
non-tiering is deliberate. If ruled so, baseline that one entry with a reason.
---
commit 6e86e8b1  2026-08-18
chore(visual-gate): log the scoped skip for the dead-selector deletion

Audit trail for e68e978f. Both entries record the proof: the deleted
selector matches zero elements, so a first-paint capture would compare a
page against itself.
---
commit e68e978f  2026-08-18
feat(inspector-scan): rule 28 fix-durability + clear its 2 findings

GATE AND FIX IN THE SAME COMMIT (the pattern that made four fixes stick in
this repo and whose absence rotted twelve — see 21b40503).

THE DEFECT CLASS. ~52 prebuild segments all ask 'is what this block has
correct?'. None asks 'is the fix somebody already applied still there?'.
Commit 4a859e42 fixed the Spec 35 A5 nested-panel double-title by pairing
className=sgs-nested-tools-panel in edit.js with a hide rule in editor.css.
Two UNRELATED commits then deleted the className: c5acba10 (shadow
migration) from button, f6f3c033 (colour rollout) from tabs. Both through a
green build. An orphaned CSS rule matching nothing is not a syntax error,
not a dead control and not a style violation — invisible by construction.

THE RULE. Per block, a durability marker must appear on BOTH sides or
neither. Comments do not count: the JS side reads strippedText(), the CSS
side strips block comments, because a marker in a commented-out attribute
is a DELETED fix a text search scores as present. Generalises by adding a
row to DURABILITY_MARKERS. Advisory on introduction (E6 point 9).

Predicted 2 findings before the first run, measured 2 — zeroIsAClaim with
no reconciliation gap. Proven able to fail WITHOUT mutating the repo: both
known-bad sites already existed, so the negative control was a read (D659).

THE FIX WAS NOT WHAT WAS PLANNED. 'Restore the marker' was wrong for both.
The marker was planted on pairs with IDENTICAL titles (button
Shadow/Shadow, tabs Colours/Colours); both nestings were legitimately
removed by the same commits that dropped the className — button's nested
ToolsPanel is now a direct ShadowControl, and tabs has ZERO ToolsPanel in
the file. Restoring button's marker would have hidden an inner h2 whose
title now DIFFERS from its parent, deleting a real label. Correct repair:
delete the two orphaned rules. openBacklog 2 -> 0.

Verified: --self-test PASS (3 mustFlag incl. the comment-stripper control,
2 mustNotFlag); live scan 2 -> 0; full --check exit 0, gate findings 0.
---
commit 52ca8c2e  2026-08-18
Merge branch 'main' into feat/inspector-completeness
---
commit f745c27d  2026-08-18
chore(docs): land the decisions-sweep-auto Stop hook output from the prior session

7 entries swept decisions.md -> memory/decisions-archive.md, baseline
rebased 567,836 -> 620,846. Automated housekeeping, committed only to
clear the tree before merging main.
---
commit cdf6b03e  2026-08-18
docs: close out the plans audit — archive the Spec 31 plan, record D661-D664, correct the LEDGER

Completes the record-keeping half of the plans-folder audit. The archiving had
shipped; the living docs still described the old state.

- Archived 2026-07-22-spec31-completion-to-100.md (superseded by Spec 39 per
  Bean, 2026-08-18), repointing Spec 31 and one report first. Plans root 21 -> 20.
- LEDGER: struck the "17 stale agent worktrees" item — VERIFIED false, git
  worktree list shows only live checkouts and .claude/worktrees/ is empty. Folded
  four second-thread rows into "Shipped today" rather than replacing the section,
  because a co-active session owns this file's front-of-work today.
- decisions.md: D661 (comment-stripper swallow, incl. the WRONG first diagnosis,
  recorded deliberately), D662 (breakpoint 599->767 and the three exclusions a
  blanket sweep would have got wrong), D663 (Stage 8: one run not three scripts;
  the fail-open gate the review caught), D664 (the audit itself + Bean's rulings).

Known, expected, not a defect: handoff-preflight's decisions-size check now
reports 1,199 bytes over its growth budget. Per .claude/CLAUDE.md this is
self-healing via the decisions-sweep-auto.py Stop hook and explicitly must not
be investigated. Other 8 checks pass; all archive paths resolve.
---
```
