---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-19
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**You changed the direction of this programme, and it was the right call.**

The plan was a detector asking *"does this block have a colour panel?"* — a yes/no question. You
asked for something better first: define the **golden shape** every control should have, then
measure everything against it. That is now built, and it found **409 conformance gaps across 64
blocks** in a single pass.

**What the numbers say about the editor your clients use.** Of roughly 226 colour settings across
the framework, **83% offer only one state** — no hover. **78% offer no gradient option at all.**
Exactly **one** setting in the entire library offers three states. And **26 blocks** show
WordPress's own colour panel alongside ours, so a client sees two different colour interfaces for
the same block. None of that was visible before today.

**The thing worth remembering.** Twice tonight a file that looked authoritative turned out to be
read by nothing. You challenged one directly — the shared "state vocabulary" — and you were right:
four scripts load that file and not one reads the section the new schema had just been pointed at.
The same pattern caught a spec section naming a component as canonical that has zero uses anywhere
in the codebase. **This repo has several files that look like sources of truth with no enforcement
behind them.** Ending that is exactly what the golden-schema work is for.

**Where it stands.** Ten commits: the schema, the detector, the commit-time trigger that makes it
all run without anyone remembering to, plus two clean-ups you asked for (submenu padding, and the
state rename). The next step is one shared helper — you cleared its design gate, so it is ready to
build, and it unblocks roughly 70-80% of the repair work.

## Shipped today

| What | Detail |
|---|---|
| **The golden control schema** — canonical shape as DATA, colour first | `scripts/consistency/golden-controls.json` |
| **Rule 31 golden-colour-control** — measures conformance, not presence | **409** findings / 64 blocks, advisory |
| **Commit-time trigger** — inspector-scan runs when an `edit.js` is staged | there is no CI; it only ran on manual builds |
| **nav-menu mis-tagged state** — 3 attrs labelled a state they never render in | root cause: classifier last-write-wins |
| **hero 8 dead `gridItem*` attrs deleted** + rule 21 ratcheted 259 → 253 | 126→118 attrs, 13→12 elements |
| **Schema corrected** after Bean challenged its source | state vocabulary split real vs notional |
| **`submenuPadding` tiered** to match nav-drawer/mega-panel | canary had ZERO stored values; fallback proven by executing the helper |
| **State vocabulary renamed `selected` → `current`** — code layer only | 13 rows; NO reseed run, that is coordinated separately |
| **tabs follows the vocabulary** + **DB reseed run** + **25 orphan rows pruned** | prediction declared then reconciled exactly; DB attrs 2440→2415 |
| **site-header: 6 attrs deleted** that could never render + rule 21 ratcheted 253→250 | no `layout` attr, so the emit gate was unsatisfiable |
| **surface-cap now scans all 4** header/footer blocks (rows were never measured) | + the composite-undercount limitation documented |
| **Header session prompt** written · **D670–D679** recorded · **STOP §A15** (9 STOPs, ritual Q15) · programme doc updated | |

## Blockers

**None blocking.** C1's design gate was CLEARED by Bean (D677) — it is ready to build.

## THE FRONT — START HERE NEXT SESSION: C1 → C2 → C3

⭐ **C1's design gate is CLEARED (D677). It is ready to build — no decision blocks it.**

**Goal: one shared hover helper, after which the colour rollout becomes mostly mechanical.**
Read `.claude/plans/2026-08-18-inspector-enforcement-programme.md` FIRST.

### ⛔ MANDATORY READING GATE — read these IN FULL before touching anything

| Read fully | Why |
|---|---|
| **`.claude/plans/2026-08-18-inspector-enforcement-programme.md`** | THE brief — what exists, what was measured, what "done" means |
| **`plugins/sgs-blocks/scripts/consistency/golden-controls.json`** | The contract rule 31 enforces. Read before proposing any colour change |
| **`.claude/STOP-CATALOGUE.md`** | Structural defences; §A15 is this session's nine |
| `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` Part O §1 + §6 | ⚠ Both carry stale claims — check the programme doc's Phase 4 list before quoting either |

**Self-check before Task C1:** can you name the three incompatible ways hover colour is emitted
today, and say which one is Spec-32-compliant? If not, re-read the programme doc's golden-schema
phase.

---

### Task C1 — unify hover behind one shared helper `[start here]` ⭐ **Bean-ruled**

**What:** `sgs_emit_state_colour_css( string $selector, array $decls_normal, array $decls_hover )`,
modelled on `sgs_border_gradient_css()` (`includes/helpers-tokens.php:1006`, **21 callers**). Then
back-port `button`, `info-box` and `card-grid` onto it.
**Why:** there is NO shared helper for flat-colour hover, so three blocks invented three
mechanisms. This is what moves the conversion from ~30-40% mechanical to ~70-80%.
**Estimated time:** 45 min for the helper plus back-ports.

- ✅ **DESIGN GATE CLEARED 2026-08-19 (D677).** Bean ruled all three open questions:
  **(a) emission** — the helper writes `info-box`'s per-instance scoped `:hover` rule, the
  Spec-32-compliant shape (so back-porting `card-grid` is a compliance fix, not tidying);
  **(b) `button`** — EXEMPT, with the reason recorded: its hover vars feed three preset
  classes with `theme.json` fallback chains, so only `info-box` and `card-grid` back-port;
  **(c) scope** — colour ONLY (`sgs_emit_state_colour_css`), not a general state helper.
  Widening later is easy; narrowing a shipped helper is not.
- ⭐ **Canonicalise on `info-box`'s scoped-rule pattern** (`render.php:171-187`) — its own docblock
  rejects `card-grid`'s inline `--sgs-hover-*` values citing Spec 32 FR-32-4 / D345. So
  back-porting `card-grid` is a **compliance fix**, not tidying.
- ⚠ **`button` is EXEMPT per (b) above** — record the exemption in the helper's docblock so the
  next reader does not "finish the job" and break the preset cascade (`style.css:87-98` + `:104-130`).

### Task C2 — the conversion pass (blocked on C1)

Default 2 states, extended by the element's own declared states; `button` as the template.
**Mechanical:** new `block.json` attrs (pure suffix derivation), the `states.hover.attrMap`,
appending a `states[]` sibling (~60% of rows).
**Judgement-bound — do NOT let a script decide:** whether the property even accepts a gradient
(text needs `background-clip:text`; shadow has no gradient form — these become declared
exemptions); rows split across two panel entries (`quote/edit.js:390-450` needs merging, and its
base reads WP-core `style?.color?.text` while `block.json:89` sets `supports.color.text: false`);
and "should this element have a hover at all".

### Task C3 — the 22 blocks with no colour panel (assess separately)

`hero`, `container`, `site-header`, `site-footer` have scattered mounts; 18 have nothing. These
need a panel **created**, not edited — placement, grouping and labels are editorial work. Keep out
of any scripted pass.

### Task C4 — ⭐ THE CLOSING STAGE: library-wide colour + hover audit

**What:** one auditing script enforcing the now-unified colour AND hover controls across every
block, with **`sgs/button` as the only exception**.

**Enforces three things:**
1. **Colour** — every row conforms to `golden-controls.json`: canonical `SgsColourPanel` →
   `DesignTokenPicker`, minimum 2 states extended by the element's declared states, no banned
   lookalikes, no core-native double-painting.
2. **Hover** — every block emitting hover colour goes through the shared
   `sgs_emit_state_colour_css` helper (C1), never a block-private mechanism.
3. ⭐ **Gradient, MECHANISM-AWARE.** There are THREE gradient mechanisms and which is correct
   depends on what the row paints — per-state toggle in `DesignTokenPicker` (background/border/
   icon), `GradientCapableColourControl` (TEXT only, needs `background-clip:text`),
   `GradientOverlayControl` (whole-block overlay, single-state by construction). ⛔ A binary "does
   a gradient path exist?" check is INSUFFICIENT — a text row wired to the background mechanism
   would PASS while rendering nothing. Rule 31's current `row-missing-gradient` kind is binary and
   needs this refinement.

**The exception:** `sgs/button` is exempt from the hover-helper rule (D677b) — its
`--sgs-btn-*-hover` vars feed a static `style.css` rule AND three preset classes with `theme.json`
fallback chains. ⛔ The exemption must be DECLARED IN DATA with a reason, never a hardcoded block
name in the script (R-31-1 bans hardcoded dicts).

**Sequencing:** runs AFTER C1 (no unified hover mechanism exists to enforce until the helper does)
and after C2's conversion pass (or it flags the entire backlog as violations on day one).

**Completion conditions** (programme §9): expected count declared BEFORE the first live run by an
independent method then reconciled · `--self-test` with a negative control that genuinely fails ·
registered in `rules.json` in the same commit · ships ADVISORY · a false positive is a detector
bug, never baseline fodder.

### Independent, slot in anywhere

- **D4 element panels (slot 32)** — 128 qualifying elements, ~110 missing a panel, hero 6/1.
  Ships honest and complete per Bean's ruling; the count is a work list, not noise.

### Decisions waiting on Bean

1. **`sgs/site-header`'s visible rows** — ⚠ the question changed. Bean's instinct that behaviour
   belongs on the ROWS is **partly right**: rows own transparent/shrink/hide (FR-37-37/38/39), but
   sticky is header-level *by Bean's own D389 ruling* (per-row sticky rejected on the short-parent
   trap), and Layout preset is mandated on the header by FR-37-28. The real finding is that
   transparent/hide/shrink are implemented on **both** blocks by two different live mechanisms.
   Retiring either side is a new decision, not a cleanup.

**Order:** C1 → C2 → C3. `submenuPadding` and D4 slot 32 are independent of all three.

## Methodology guardrails (carried forward — all still true)

- ⛔ **COMMIT before dispatching ANY agent, even a read-only one.** A task framing does not
  constrain tool access; only committing does.
- ⛔ **Before citing a file as a source of truth, grep for a reader of the KEY, not the file.**
  Three "authoritative" sources proved unread or self-contradicting today.
- ⛔ **A measured count BELOW an independent prediction is a detector bug until proven otherwise.**
  Rule 31 undercounted by 33 rows; three blocks scored zero because they build their rows list
  indirectly. A false absence reads exactly like a clean result.
- ⛔ **`git grep` only, never `grep -r`** — and scope a census to the exact filename that defines
  the population (`grep -rln` over a directory returned 61 against a true 60).
- ⛔ **Use a word boundary in a JSX tag pattern, never a trailing character class** — multi-line
  JSX puts the tag at end-of-line and the wrong pattern returns a false absence.
- ⛔ **Never pipe a population-defining survey through `head -N`.** Count first.
- ⛔ **No detector ships with a hand-counted baseline.** Declare, run, reconcile.
- ⛔ **A false positive is a detector bug, never baseline fodder.**
- ⛔ **NOTHING GATES A DB ORPHAN, and the rule alone did not hold.** After deleting attributes from
  a `block.json`, the DB keeps their rows until Stage 9 runs. D678 recorded that as a rule — and it
  was violated within hours, by the same session that wrote it, on the very next deletion. The
  db-consistency suite exits 0 with orphans present (it only flags "rogue seeds" carrying a
  `css_property`), so nothing catches it. **A gate is needed, not a third restatement of the rule:**
  fail when a `block_attributes` row has no matching `block.json` attribute. Candidate for the C4
  audit stage.
- ⛔ **`/sgs-update --stage 1` UPDATES BUT DOES NOT PRUNE.** Deleting an attribute from a
  `block.json` leaves its DB row behind as a "rogue seed"; Stage 9 is the prune. Proven
  today — 8 deleted hero attrs survived a reseed and the F5/F6 commit gate caught every one.
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
- ⛔ **No shared-DB reseed without coordinating** — other sessions are live on this branch.
- ⛔ **`$?` after a pipe reads the LAST command's status.** Redirect first.
- ⛔ **A pre-commit gate can fail SILENTLY** — never `--no-verify`; use the scoped skip with a
  reason. A command-scanning hook also matches your *script content*, heredocs included — reword
  the prose rather than reaching for a bypass token.
- **A completeness error is invisible to every correctness gate.**
- **Run builds synchronously, never backgrounded.**

## The header — COMPLETE and LIVE-VERIFIED (2026-08-19)

All five tasks from `.claude/prompts/2026-08-19-header-session-prompt.md` are shipped on
`feat/header-completeness`, deployed to the canary and verified against the live painted DOM.
Report: `reports/visual-diff/site-header-2026-08-19.md` (17 assertions, `verdict: PASS`).
Decisions: **D681-D684**. Task 4 was completed by the C1-C4 session instead — see its handover,
`.claude/reports/2026-08-19-task4-surface-cap-handover.md`.

| Task | Outcome |
|---|---|
| 1 contrastSafe | Per-device; the silent `none`->`scrim` override is GONE, replaced by an editor advisory naming the affected tiers with a one-click fix. D402's carve-out superseded, Spec 37 amended. 323 -> 133 lines, incl. a second per-page-load `parse_blocks()` deleted |
| 2 transparent | Scrolled background + text + gradient are client-set; direction invertible. Header colour migrated off WP-native into one SGS panel; `scrolled` admitted to the real state vocabulary |
| 3 row naming | Row behaviours renamed by scope (header-row + footer-row) |
| 4 surface cap | DONE by the C1-C4 session (`6c3ec1b0`) |
| 5 attributes | `shadow` mounted (declared + rendering, but unreachable); 13 unreachable attrs deleted; 56 -> 43 |

**⭐ The near-miss worth remembering.** Retiring WP-native colour stopped WordPress registering
`backgroundColor`, and SEVEN header patterns stored their background under that name — all would
have lost it silently. `check-dead-pattern-attrs.py` MISSED it: it asks whether `supports.color` is
declared, not whether its sub-flags are on. Since `golden-controls.json` now names
"declared with every sub-flag false" as the CONFORMANT shape, every block adopting it inherits that
blind spot. Recorded in D683, not fixed (shared detector).

### Header items still open — all need Bean, none blocking

1. **⛔ DB not reseeded or pruned.** 7 new attrs need seeding; 13 deleted ones leave rogue seed rows
   (the D678 class). A reseed is a SHARED-DB action and was not run unilaterally.
2. **Surface-cap figures moved and carry human rulings.** Merged-tree measurement:
   `site-header` **4** (was 5), `site-footer` **2** (WITHIN), `site-header-row` **8**,
   `site-footer-row` **8**. Bean's 2026-08-13 F2 ruling was made against the old numbers.
3. **⚠ `SgsColourPanel` is INVISIBLE to `check-simple-surface-cap.js`.** It is mounted at the top
   level of `edit.js` and renders its OWN `<InspectorControls>` internally; the script walks
   InspectorControls regions found in the block's own file, so a composite mounted OUTSIDE any
   region is never reached. `site-header`'s "4" therefore excludes a whole visible colour panel, and
   the same holds for every block mounting that panel. Same class as the composite gap Task 4 just
   fixed, one level up.
4. **UNPROVEN:** `sgs/site-header-row` passes colour attrs to the style engine RAW (the shape fixed
   on the header). May share the defect.
5. **Probe page 2522 left published** on the canary as the evidence; delete after review.
6. **Recogniser mirror is dead:** `_VALID_HEADER_BEHAVIOURS` mirrors a PHP constant deleted
   2026-07-28, scans for classes nothing emits, and its test compares two hardcoded copies.


## Open — carried

- **`extract-signatures.py` is NON-DETERMINISTIC** — two runs on an unchanged tree differ:
  `css_tier` cycles between desktop/mobile/tablet, 2-4 lines per run. Low blast radius (`css_tier`
  ~1% populated, no dedicated consumer) but every regeneration produces a spurious diff. **Never
  commit a wholesale regeneration inside an unrelated change.**
- **No `retireWhen` mechanism exists** despite the programme's §9 listing it as a per-detector
  completion condition. Build it or drop the condition.
- **`21-render-without-control` self-test FAILS at HEAD** — pre-existing, tier 4, unrelated.
- **`mistakes.md` is 34 active against a ~30 target** — prune oldest-by-date.
- **`decisions.md` docscores B- (76.6%)** — pre-existing; all four failures are template-mismatch
  or false positives.
- **`text-secondary` is a client-only slug that framework code reads.**
- **5 blocks have `:hover` with no `:focus-visible`.**
- **45 attributes a client can never reach** · **2 dead components** · **PR #31** unmerged.

## State Snapshot

- **Branch:** `feat/header-completeness` (has `feat/hover-helper` merged into it, so it carries BOTH
  tracks). ⚠ **Not merged to main** — re-derive with `git rev-list --count main..HEAD`.
- **D-ceiling:** **D684** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Build:** `inspector-scan --check` exit 0 — 7 gate rules / 0 gating findings, **14 advisory /
  732 findings**. `npm run build` + `prebuild` exit 0. Deployed to sandybrown; payload-verify
  confirmed all 83 block.json checksums.
- **Tests:** no separate suite; the gate chain is the suite.
- **Uncommitted:** none tracked. Untracked: `plugins/sgs-blocks/reports/{console,cwv,network}/`
  from another track, plus `.claude/reports/emission-derived-classification-raw-2026-08-19.json`
  (an accidental artefact of the `--help` run recorded above).

## Pointers

| For | Read |
|---|---|
| **THE BRIEF — everything about this programme** | **`.claude/plans/2026-08-18-inspector-enforcement-programme.md`** |
| **The golden control contract (colour)** | **`plugins/sgs-blocks/scripts/consistency/golden-controls.json`** |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Inspector UX standard + the control contracts | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Styling / token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Header/footer division of responsibility | `specs/37-HEADER-FOOTER-BUILDER.md` FR-37-27/37/38/39/40 |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |
