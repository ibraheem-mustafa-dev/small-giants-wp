---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-20
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**All three golden-builder sessions were already merged into `main` when this session
started. What was NOT done was proving they work.** Sessions A and C had never run the full
build, and A's work had never been opened in a real editor. Running it found **four real
defects**, three of them invisible to every gate in the chain.

**The one that mattered most.** Session A's redesigned typography panel **crashed
`sgs/heading`'s inspector** — open the Typography panel and the whole sidebar disappeared.
It shipped through a green build because a green build never opens the editor.

**A control that existed, was wired at both ends, and did nothing.** The new border-style
picker (Solid / Dashed / Dotted) was passed correctly by the block and read correctly by the
component that draws it — but the layer in between forwards a hand-written list of
properties, and nobody added the two new ones to that list. Both ends looked finished.

**What to be wary of, again: the instrument, not the code.** A gate failed on a sentence
inside a code comment. A survey reported "nothing to see" for 49 real problems because its
pattern could not match an underscore. My own first three attempts to inspect the live
editor all measured the wrong thing. Every real answer today came from reading actual state
— the React tree, the block.json files — never from reasoning about what should be true.

## Shipped today

| What | Detail |
|---|---|
| **3 sessions verified, not just merged** | build + gates + canary deploy + live editor |
| **`sgs/heading` inspector crash FIXED** | `useSettings()` returns origin-keyed objects, not arrays |
| **Shared `flattenPresetSetting()`** | 3rd recurrence of one class — one function now, not a 4th local copy |
| **Border-style picker made REACHABLE** | was dead UI; verified it renders AND writes (`none -> dashed`) |
| **Duplicate "Font size" label removed** | rule 29 back to its backlog of 8 |
| **control-parity false positive fixed** | comment-masking + paired fixtures, 14 -> 16 assertions |
| **Golden census made honest** | Session A shipped the 21-type composer; this session fixed what it could not MEASURE |
| **49 border native-UI violations recovered** | regex could not match `__experimentalBorder` |
| **MEASURABILITY + capability-loss reporting** | the census now says what it CANNOT measure |
| **2 worktrees pruned safely** | both `node_modules` were junctions INTO main's — unlinked first |

## Where conformance actually stands

Re-measured 2026-08-20 after the census fixes. Every figure below is reconciled
against an independent pass over the block.json files.

```
21 control types x 83 blocks = 1743 rows      MEASURABILITY 40 of 63 cells UNMEASURED (was 45)

canonical    colour   63 CONFORMANT ·  1 VIOLATION · 13 MISSING ·  6 N-A
             border   52 CONFORMANT ·  6 VIOLATION ·  8 MISSING · 17 N-A   <- was N/A x83
             resp-wrap 59 CONFORMANT ·                            24 N-A   <- was N/A x83
             media     9 CONFORMANT ·                            74 N-A   <- was N/A x83
             typography 16 CONFORMANT · 33 VIOLATION · 18 MISSING · 16 N-A
             length-unit            · 48 VIOLATION · 11 MISSING · 24 N-A

nativeUi     colour 25 VIOL · border 49 VIOL · box-4value 50 VIOL · length-unit 50 VIOL
```

**VIOLATION vs MISSING now means something.** VIOLATION = the block paints the
surface itself and the client cannot reach it. MISSING = it should have the
control and does not. Colour's old "2 violations" resolve into buybox
(VIOLATION — 27 own declarations, still a real gap) and site-footer — **CORRECTED
2026-08-20 (D700): NOT actually MISSING.** The census's 1-hop reach couldn't see
that site-footer already mounts a colour panel (`DesignTokenPicker`, via
`GradientOverlayControl.js`); the depth+exclusion fix that widened
`reachedComponents()` to 4 hops found it. Site-footer already has an SGS panel —
it was a false MISSING, not a real gap. See
`.claude/reports/2026-08-20-colour-golden-scan-set.md` master table row 7.

## THE FRONT — next session

**Both open decisions are now TAKEN and measured** (A: native-UI detection restored
for length-unit + box-4value; B: colour carve-out and the circular `surfaces.colour`
predicate removed). `/qc`: 14 of 14 scenarios pass, confidence 90/100, grade PASS.

### 1. Close the remaining 40 UNMEASURED cells

Run `node scripts/surveys/survey-golden-conformance.js` and read the MEASURABILITY
table — it names them. Six types (`state`, `alignment`, `repeater`, `animation`,
`angle-position`, `preset`) describe a PATTERN in prose rather than naming a
component; their N/A is honest and closing them means either extracting a real
shared component or accepting the type has none.

### 2. Fix, in parallel, against a list that is finally complete

| Work | Size | Shape |
|---|---|---|
| Native-UI retirement — **spacing** (box-4value + length-unit) | **50 blocks** | `block.json` only, mechanical, newly visible |
| Native-UI retirement — **border** | **49 blocks** | `block.json` only, mechanical, newly visible |
| Native-UI retirement — colour | 25 blocks | `block.json` only, mechanical |
| Typography hardcoding | **33 VIOLATION** | blocks painting their own type with no client control |
| length-unit hardcoding | **48 VIOLATION** | same shape |
| Form colour | `sgs/form` + 12 field blocks | one design, then mechanical |
| `sgs/buybox` | 1 block | 27 own colour declarations, no panel |
| `sgs/heading` borderColourHover | 1 attr | clears BOTH rule-31 heading findings, 409 -> 407 |

⛔ **Serialised, never parallel:** `rules.json`, `package.json`, `golden-controls.json`,
`core/*.js`.

## Methodology guardrails (carried forward — all still true)

- ⛔ **COMMIT before dispatching ANY agent, even a read-only one.** A task framing does not
  constrain tool access; only committing does.
- ⛔ **Before citing a file as a source of truth, grep for a reader of the KEY, not the file.**
  Three "authoritative" sources proved unread or self-contradicting.
- ⛔ **A measured count BELOW an independent prediction is a detector bug until proven otherwise.**
  Rule 31 undercounted by 33 rows; three blocks scored zero because they build their rows list
  indirectly. A false absence reads exactly like a clean result.
- ⛔ **`git grep` only, never `grep -r`** — and scope a census to the exact filename that defines
  the population (`grep -rln` over a directory returned 61 against a true 60).
- ⛔ **Use a word boundary in a JSX tag pattern, never a trailing character class** — multi-line
  JSX puts the tag at end-of-line and the wrong pattern returns a false absence.
- ⛔ **Never pipe a population-defining survey through `head -N`.** Count first. (Broken again
  today by the person quoting it — it hid the live hover CSS during verification.)
- ⛔ **No detector ships with a hand-counted baseline.** Declare, run, reconcile.
- ⛔ **A false positive is a detector bug, never baseline fodder.**
- ⛔ **NOTHING GATES A DB ORPHAN, and the rule alone did not hold.** After deleting attributes
  from a `block.json`, the DB keeps their rows until Stage 9 runs. The db-consistency suite exits
  0 with orphans present (it only flags "rogue seeds" carrying a `css_property`), so nothing
  catches it. **A gate is needed, not a third restatement of the rule:** fail when a
  `block_attributes` row has no matching `block.json` attribute.
- ⛔ **`/sgs-update --stage 1` UPDATES BUT DOES NOT PRUNE.** Deleting an attribute from a
  `block.json` leaves its DB row behind as a "rogue seed"; Stage 9 is the prune.
- ⛔ **The advisory ratchet does NOT self-heal.** It blocks growth past a frozen number; it never
  lowers it. Clearing findings without lowering `openBacklog` creates silent slack.
- ⛔ **`ctx.cache.json()` returns `{ok, error, data}`** — reading `.attributes` off it yields
  undefined and silently disables a rule.
- ⛔ **Never compare AST line numbers against `strippedText()` line numbers** — use character
  offsets.
- ⛔ **Read a gate's header before calling it broken**, and check whether a script parses argv
  before probing it with `--help` (`extract-signatures.py` ignores flags and runs).
- ⛔ **Main agent owns `package.json` and `rules.json`** — single-merge-point files.
- ⛔ **No agent runs a build** (`clean:build` does `rmSync('build')`), edits a shared JSON, or
  mutates a repo file as a fixture (D659).
- ⛔ **No shared-DB reseed without coordinating** — other sessions are live.
- ⛔ **`$?` after a pipe reads the LAST command's status.** Redirect first.
- ⛔ **A pre-commit gate can fail SILENTLY** — never `--no-verify`; use the scoped skip with a
  reason. A command-scanning hook also matches your *script content*, heredocs included — reword
  the prose rather than reaching for a bypass token.
- ⛔ **`cat -A` THE BYTES.** A literal backspace (`0x08`) replaced a regex word boundary TWICE
  today. Both times the detector matched nothing, passed clean, and looked exactly like a healthy
  tree.
- ⛔ **Axis scope is not uniform.** `canonical` needs the one-hop view THROUGH shared components;
  `bannedLookalikes` needs it MINUS the canonical components, because the raw primitive
  legitimately lives inside `DesignTokenPicker`. Getting it wrong produced 5 false positives.
- ⛔ **Depth and the banned-lookalike exclusion must move TOGETHER.** One hop under-reports 9 of
  17 components (`ColorPalette` 3→64); raising depth alone trades that for ~61 false positives.
  Reproduce first: `python scripts/surveys/compare-reach-depth.py .`
- ⛔ **A derived field is a claim, not a decision.** `surfaces.colour` is computed from what a
  block ALREADY has, so as a scope predicate it is self-fulfilling — it excludes exactly the
  blocks that are missing a panel and can therefore never find one.
- ⛔ **`__experimentalSkipSerialization` is NOT a colour-UI flag.** It is the serialisation opt-out
  the conformant shape REQUIRES. Counting it reports 50 blocks against a true 25. Two sessions
  made this mistake independently.
- ⛔ **A step that swallows its own failures is invisible in the exit code.** `/sgs-update`'s
  classifier sub-step warns and continues by design — exit 0 whether it worked or not.
- ⛔ **A regenerated artefact + a shared DB + multiple branches loses entries silently.** The
  classifier regenerates from the tree it runs in; the DB is shared. A stale branch cannot see
  another branch's attributes, and re-running cannot help — the input genuinely is not there.
  **Merge first.**
- ⛔ **`git commit -- <paths>` only commits TRACKED files.** New files need `git add` first — a
  rule shipped without its fixtures this way, green locally, broken on a fresh clone.
- ⛔ **The `[gates-ok:]` token is read from the COMMAND string, not the message file** — and git's
  own `.githooks/pre-commit` does not honour it at all.
- ⛔ **Look inside a worktree before removing it.** The stale main worktree held 7 uncommitted
  audit entries existing nowhere else. Verify `node_modules` is not a junction (LinkType/Target)
  — a past removal emptied it 962→0.
- ⛔ **`*/` inside a JS block comment TERMINATES it.** `src/blocks/*/components/` written in a
  docblock is a syntax error.
- ⛔ **A green build never opens the editor.** Session A's typography redesign crashed
  `sgs/heading`'s inspector and passed every one of ~50 gates. The editor is a separate
  surface no static gate covers — open it.
- ⛔ **`?? []` guards NULL, not the WRONG TYPE.** `useSettings()` returns an origin-keyed
  OBJECT for `typography.fontFamilies`/`fontSizes` and a flat ARRAY for `color.palette` — on
  the SAME site. A truthy object sails through the guard and `.map` throws. Use
  `flattenPresetSetting()` (`src/utils/presetSettings.js`); never write a fourth local copy.
- ⛔ **A component forwarding an EXPLICIT prop list eats any prop you forget to name.**
  `DesignTokenPicker` dropped `borderStyle`/`onBorderStyleChange` between a correct caller
  and a correct receiver. Both ends looked finished.
- ⛔ **Read the live React fiber instead of guessing which component rendered.** Three
  successive guesses (wrong component, wrong popover, wrong tab) were all wrong; the fiber
  answered it in one call. Names are MINIFIED in a production build — detect an element by
  the props it HAS, never by its name.
- ⛔ **`querySelector` returns the FIRST match, not your instance** — a page-wide selector
  inside `.block-editor-block-inspector` can hit the block TOOLBAR popover. Identify a probe
  by CONTENT (a swatch, a known class), never by document order.
- ⛔ **An inspector probe reading the wrong TAB measures nothing.** "Background parallax is
  gone" was vacuous until re-run on the Styles tab — it could not have seen a presence
  either. The tabs are ICON-ONLY, so matching a tab by its text finds nothing.
- ⛔ **`--json` array length is NOT the finding count.** `core/report.js` serialises
  BASELINED findings into the array while the gate counts FLAGGED only — rule 21 reads 208
  by array length and 197 by the gate. Nearly reported as a phantom regression.
- ⛔ **A regex over RAW file text reads prose as code.** `<SelectControl>` inside a docblock
  failed the control-parity gate. Mask comments IN PLACE (preserving length + newlines) so
  line numbers and rewrite spans stay valid.
- ⛔ **A character class without `_` cannot match a WP `__experimental*` support family.**
  `border`'s declared detectVia silently resolved to null and reported N/A on all 83 blocks
  — 49 real violations reading as a clean result.
- ⛔ **A worktree's `node_modules` is a JUNCTION into main's.** `git worktree remove --force`
  follows it and empties main. `cmd /c rmdir` the junction FIRST, then re-count main's
  entries (975) after every removal.
- ⛔ **A peer golden row overriding a base row can DELETE an axis silently.** Three did.
  `loadMergedSchema()` records it on `_meta.capabilityLoss`; the census prints it.
- ⛔ **The stored-content gate catches YOUR test fixture too.** A verification page carrying
  an attr `sgs/text` does not declare aborted the deploy — correctly (D338 class).
- ⛔ **A DECLARED predicate the engine cannot READ is the worst shape a detector takes.**
  Twice in one day: a family regex that could not match `__experimentalBorder` (49 real
  violations), and a canonical reader that looked at 2 keys of many (249 rows). Both
  reported N/A, which is indistinguishable from clean. When an axis reads N/A
  library-wide, suspect the READER before believing the contract is silent.
- ⛔ **A widening that turns a VIOLATION into a PASS is a loosened detector, not a fix.**
  Caught only by diffing per-BLOCK; the per-count totals looked like an improvement.
  Diff identities, not tallies.
- ⛔ **PROSE UNDER A `component` KEY IS NOT A COMPONENT NAME.** Six goldens rows describe
  a pattern there. Treating them as identifiers would have scored six types against names
  that can never match. Gate on `/^[A-Z][A-Za-z0-9]*$/`.
- ⛔ **Scoping a contract by a DERIVED field is circular.** `surfaces.colour` is computed
  from what a block already has, so it excluded exactly the blocks missing a panel.
  Deleted. Scope on evidence the predicate gathers itself.
- ⛔ **Never mutate a repo file as a test fixture (D659).** The composer's three failure
  modes were tested by copying `core/golden.js` into a scratch tree — it requires only
  `fs`/`path`, so a standalone copy works. Repo verified clean afterwards.
- **A completeness error is invisible to every correctness gate.**
- **Run builds synchronously, never backgrounded.**

## Open — carried

- **12 form blocks + `sgs/form`** — clients cannot colour form fields at all. The form exposes 4
  colour rows (focus ring, progress bar, submit); field background, border, text and label are
  theme-painted and unreachable. Competitive gap vs Kadence/Spectra.
- **The depth + transitive-exclusion change — APPLIED 2026-08-20 (D700).** Bounded 4-hop
  walk, reach 3-18→30-35 out of 83 blocks (real self-test, not just synthetic). Residual gap
  to full depth (34/64 for `ColorPalette`) is `SgsColourPanel`'s runtime-selected-control
  blind spot (measured, not assumed) — still open, named in `.claude/reports/2026-08-20-colour-golden-scan-set.md`.
- **17 "control weaker than its value" findings** (`survey-control-gaps.py`), including 3
  hand-rolled font-size boxes breaching the mandatory TypographyControls rule.
- **`sgs/quote` discards every hover gradient a client sets** — control writes it, render reads
  it, `block.json` never declares it. Same class as D338's 45 bugs.
- **`sgs/feature-grid` Layout control inert** · **`sgs/text` 2 undeclared per-device font sizes**
- **F5/F6 commit gate measures the main checkout, not the worktree it runs in.**
- **handoff-preflight fails in a fresh worktree** — `02-SGS-BLOCKS-REFERENCE.md` is gitignored
  and generated locally.
- `extract-signatures.py` is **non-deterministic** — never commit a wholesale regeneration inside
  an unrelated change.
- **5 blocks have `:hover` with no `:focus-visible`** (was 7; 2 fixed today).
- **`survey-control-mounts.py` has no self-test.**
- **`mistakes.md` is 34 active against a ~30 target** · **`decisions.md` docscores B-**

## State Snapshot

- **Branch:** work landed on `main` via an isolated worktree — the shared checkout was on
  another session's `fix/spec-staleness-purge` throughout and was never disturbed.
- **D-ceiling:** **D695** (D693 colour scopes on evidence · D694 canonical read 2 keys of
  many · D695 independentlySufficient) — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Live counts:** rule 21 **197 FLAGGED** + 11 baselined (⚠ the `--json` array reads 208 —
  it includes baselined), rule 31 **409**, rule 29 **8**, rule 01 58, rule 18 13. All
  unmoved across every census change.
- **Gates:** `npm run build` exit 0, no ratchets · inspector-scan `--check` exit 0 ·
  golden-conformance self-test **20/20** · control-parity 16/16 · cheat-gate / F5 / F6 green.
- **`/qc`:** 14 of 14 scenarios PASS — determinism (byte-identical reruns), closed verdict
  vocabulary, no missing verdicts, prose-only types stay N/A, all three composer failure
  modes (absent / malformed / duplicate-key peer), measurability table matches reality, and
  four independent reconciliations. Confidence **90/100**, grade **PASS**.
- **Canary:** deployed and live-verified earlier this session (editor fixes). The census
  changes are tooling only — nothing shipped to the site since.

## Pointers

| For | Read |
|---|---|
| **THE PLAN — axes + parallel split** | **`.claude/plans/go-c1-c4-lively-zebra.md`** |
| The programme brief | `.claude/plans/2026-08-18-inspector-enforcement-programme.md` |
| The 21 control contracts | `golden-controls.json` + `consistency/goldens/{styling,input,behaviour}.json` |
| Handover: session B (input) | `.claude/reports/2026-08-19-session-b-input-goldens-handover.md` |
| Handover: session C (behaviour) | `.claude/reports/2026-08-19-session-c-behaviour-goldens-handover.md` |
| Handover: shared-component visibility | `.claude/reports/2026-08-19-shared-component-visibility-handover.md` |
| Handover: surface-cap Task 4 | `.claude/reports/2026-08-19-task4-surface-cap-handover.md` |
| Structural defences (uncapped, D101) | `STOP-CATALOGUE.md` |
| Inspector UX standard | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Styling / token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Build / deploy / credentials | `dev-setup.md` · `build-deploy.py --target sandybrown` |
