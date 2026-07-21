# Next session — Spec 35 Track 1: converter-consumes-the-keyed-data + container bug

**Invoke `/autopilot` before anything else.** Then read this end-to-end.

> `main` is SHARED with a co-active Track 2 (Spec 36/37 header/footer/nav). Track 2 owns
> `LEDGER.md`, the D-numbering cadence, and `next-session-prompt-nav-rework-P2.5.md`.
> **This is Track 1's prompt.** Path-scope every commit; re-check `git branch --show-current`
> in the SAME command as the commit; NEVER `git add -A`. Commit gate REJECTS a bare
> `git commit` — explicit `-- <paths>` required.

## Plain-English state (where we are)

Last session (committed `20ea88fe`, pushed to `main`) built the DATA: every block attribute
now carries which CSS property it drives, on which element, in which state, at which screen
size — all derived from code, not guessed from names. Routing ambiguity dropped from 106
cases to 0 **in the data**. It also fixed 93 wrong editor-sidebar controls and wired the fix
into `/sgs-update` so it stays fixed.

**But the converter — the thing that actually clones a site — cannot yet ASK for that data
using the full key.** So this session is about making the converter CONSUME what we built.
Three fronts, below.

## MANDATORY READING GATE (before any edit)

1. `/autopilot` (first, always).
2. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — **IN FULL**, end to end. Fronts 1 and 2
   are converter surfaces; you must have the whole spec in context (Bean-locked).
3. `.claude/STOP-CATALOGUE.md` — pre-flight ritual + STOP entries (never subtract, D101).
4. `.claude/parking.md` — the OPEN entries this prompt builds on: `P-CSSPROP-RUNTIME-RESOLVER-
   UNDER-KEYED`, `P-VARIANT-DISCRIMINATORS-MUST-BE-STRUCTURAL`,
   `P-CONTAINER-CUSTOM-BAND-WIDTH-BROKEN`, `P-ROLE-AND-CSSPROP-ARE-PERPENDICULAR-AXES`,
   `P-CSSLAYER-DROPPED-ON-AN-UNASKED-QUESTION`, `P-INSPECTOR-CONTROL-TYPE-94-DISAGREEMENTS`.

## The three fronts (Bean's priority — do these before other work)

### Front 1 — widen the runtime resolver (converter surface, clone-verified)
**Plain English:** the converter looks up "which attribute drives this CSS property?" with
only two facts — the block and the property. That's now too coarse: 312 attributes across 103
groups share a (block, property) pair and are only told apart once you add element, state and
tier. The data HAS those; the lookup ignores them, so the converter picks the first by row
order — an arbitrary clone-fidelity risk.
**Where:** `attr_for_property(block_slug, css_property)` in
`plugins/sgs-blocks/scripts/converter/db/db_lookup.py:~1600`. Also `declared_attrs_for_css_
property` (`:634`) reads the same columns.
**Why it's THE blocker:** correct data the converter can't request changes nothing about cloning.
**Do:** DESIGN GATE FIRST (`/brainstorming`, inline, Bean signs off) — the widened signature,
and the tie-break when a caller lacks element/state/tier context. Then build. **Verify with a
real clone run (R-31-11/13), not just the gate.** Parking: `P-CSSPROP-RUNTIME-RESOLVER-UNDER-KEYED`.

### Front 2 — re-key variant detection off STRUCTURE (converter surface, clone-verified)
**Plain English:** the converter guesses a block's variant (e.g. trust-bar icon-circle vs
text-only vs image-badge) by which STYLING settings got filled in. Populating css_property made
those styling settings fillable from generic draft CSS, so detection can now be fooled — the 5
`[gates-ok:]`-bypassed findings on `main`. Variants usually differ by STRUCTURE (a different
child element), not styling — the CSS lift can fake a value but not an element that isn't in the
draft.
**Bean's approved design + the clean sources found:** discriminate on BEM structure via the
`variations` table (variant-defining attr values, e.g. `badgeStyle`) + `block_selectors`
(element→selector). trust-bar's render proves it: `image-badge` → `<img class="sgs-trust-bar__
badge-img">` (`render.php:344-357`); `text-only` → `.sgs-trust-bar__badge-label` only, no
image/icon (`:328-330`); `icon-circle` → `.sgs-trust-bar__badge` + icon span + `.sgs-trust-bar
__label` (`:320`). Fallback: CSS discrimination first, structural fallback when CSS doesn't
reach a single winner.
**Where:** `detect_variant` + `_variant_slots_map` + `variant_slots` population
(`db_lookup.py:~2350-2430`; population is `/sgs-update`'s set-difference).
**Universal (R-31-9):** audit ALL `variant_slots` rows, not just trust-bar.
**DATA BUG to fix or ignore, not trust:** trust-bar's `markup_examples` row is under the DEAD
slug `sgs/trust-badges` (renamed D123). Design gate FIRST, build, clone-verify. Parking:
`P-VARIANT-DISCRIMINATORS-MUST-BE-STRUCTURAL`.

### Front 3 — container custom band-width bug (editor UX, live repro — PARALLELISABLE)
**Plain English:** on `sgs/container` + the shared wrapper, choosing "custom" for the content
band-width often won't select, and when it does no input box appears to type the value. A
client can't set a custom width at all.
**Method:** LIVE EDITOR REPRO FIRST (Playwright on the canary editor — insert a container, open
the band-width control). Do NOT theorise from `edit.js` alone (root-cause rule). Touches the
wrapper `edit.js`/`render.php` — sensitive; the FIX is design-gated, but the DIAGNOSIS can run
now. Parking: `P-CONTAINER-CUSTOM-BAND-WIDTH-BROKEN`.

## Parallelisation plan

```
DESIGN GATE (inline, Bean signs off both) ─ Front 1 signature+tie-break ─ Front 2 structural key
        │
   MAIN THREAD: build Front 1 → then Front 2 (SEQUENTIAL — same file db_lookup.py, and
                Front 2's scoring likely reads Front 1's widened resolver). Clone-verify each.
        │
   IN PARALLEL (independent files + own verification, dispatch at session start):
   ├── SUBAGENT A — Front 3 container bug: Playwright live repro + diagnosis. REPORT ONLY
   │              (the wrapper edit.js fix is design-gated before applying).
   └── SUBAGENT B — small confirmed cleanups, all low-risk, all independent of the converter:
        • Task 4: consolidate `_build_var_map` onto `_build_php_var_attr_map`
          (extract-signatures.py). EXTEND the original; do NOT delete the newer one — it
          feeds `separator contentIconSize`. Reviewer confirmed the older path has a live gap.
          This changes the `output_signature` path (1,298 rows) → needs before/after measurement.
        • 2 proven `sgs/option-picker` rows: role='typography' on border-radius
          (`pillBorderRadius`/`pillSelectedBorderRadius`) — the pill* name-collision. Fix at the
          role source, not a manual DB poke (role is name-derived; see the perpendicular-axes note).
        • dead `CONTROL_COMPONENT_MAP` in `enrich-db.py` (unused since last session removed
          `_parse_edit_js_controls`; verify with grep, then delete).
```

**Why 1 & 2 are NOT parallel:** both edit `db_lookup.py` and both change how the converter
resolves DB routing data — same-file parallel edits conflict, and Front 2 likely depends on
Front 1's widened resolver. **Why 3 IS parallel:** wrapper editor files, Playwright verification,
no shared state with the resolver work. Subagent B is likewise disjoint (analyser + role source).

## What shipped last session (do NOT redo)

`20ea88fe` on `main`: keyed `css_property`+element/state/tier (routing determinism 0 in data);
override-file architecture (`attr-classification-overrides.json`, 175 entries); inspector_
control_type made edit.js-authoritative + wired into `/sgs-update` (93 controls fixed, incl. the
nested MediaUpload>Button trap); stale enrich-db writer removed. 6 context-capture bugs fixed.
Committed `--no-verify` with `[gates-ok:]` for the 5 known trust-bar findings — kept honest, NOT
baselined, so they re-flag until Front 2 fixes them.

## Structural defences (carry forward, never subtract — D101)

Carry the STOP-CATALOGUE pre-flight ritual. FOUR new STOP entries earned last session — add to
`STOP-CATALOGUE.md` if not already there:
- **STOP-RESIDUE-DECLARED-IRREDUCIBLE-USUALLY-ISNT** — 4× last session an agent called the
  remaining findings irreducible and 4× it wasn't (tier bug, state bug, hero split, prefix
  reader). Each was found by asking "what SHOULD this number be?", never by the agent's own
  re-check of its own scope. Re-derive; question the causal story, not just the count.
- **STOP-VERIFY-THE-DELIVERABLE-EXISTS** — a subagent reported "the audit is running in the
  background" having made ONE tool call and written nothing. An `ls` of the promised file beat
  91k tokens of plausible prose. Check the deliverable exists.
- **STOP-PRE-EXISTING-CLAIM-CHECK-SESSION-START** — a subagent called the 5 trust-bar findings
  "pre-existing" 3×; the gate reported "All checks passed" at session start. "Pre-existing" is a
  claim to verify against the session-start baseline, not accept.
- **STOP-CHECK-BOTH-HOOK-LAYERS-BEFORE-COMMIT** — the commit gate is TWO layers: the Claude
  PreToolUse `f5-commit-gate.py` reads the Bash COMMAND for `[gates-ok:<reason>]` (put the token
  IN the command, e.g. a trailing `# [gates-ok:…]`, not only the `-F` message file); the native
  git `pre-commit` hook runs F5/F6 itself and is bypassed only by `--no-verify` (Bean-authorised).
  Both are needed to commit past a known-parked finding.

## Pre-flight ritual (answer before first Write/Edit)
1. On `main`? Next commit path-scoped away from Track 2 (`LEDGER.md`, `site-*`, `adaptive-nav`,
   `mega-menu`, spec 36/37 files, `theme/sgs-theme/patterns/header-*`) with explicit `-- <paths>`?
2. Touching `db_lookup.py` / the converter? → Spec 31 read in full, design-gated, plan to
   CLONE-verify (not gate-verify) before closing.
3. About to accept a subagent's "irreducible" / "pre-existing" / "done" claim? → re-derive from
   the tool; check the deliverable exists; ask what the number should be.
4. About to poke the DB for a `role`/`css_property` fix? → role is name-derived and read by the
   live converter; fix at the source with proof, and remember role (value-type) and css_property
   (delivery) are PERPENDICULAR — do not "replace" role (`P-ROLE-AND-CSSPROP-ARE-PERPENDICULAR-AXES`).

## Tool bindings
`/brainstorming` (design gates, fronts 1+2) · `/qc-council` (converter changes) ·
`/dispatching-parallel-agents` (subagents A+B at session start) · `/sgs-db` + `/wp-blocks`
(DB is authoritative — never hardcode a count) · Playwright MCP (front 3 live repro + clone
verification) · `/delegate` (route every dispatch) · `wp-sgs-developer` agent (converter build;
constrain: no deploy/commit unless told).
Canary creds: `.claude/secrets/sandybrown.env` (parse in Python, don't `source` — shell
metacharacters). Deploy only if a clone-verify needs it: `build-deploy.py --target sandybrown
--blocks-only` from an ISOLATED worktree. SSH alias `ssh hd`.

## Deferred (not this session's fronts, but tracked)
- `P-INSPECTOR-CONTROL-TYPE-94-DISAGREEMENTS` — 88 now fixed at the seeder; the full 76-unaudited
  → all resolved last session (2 independent audits, 0 stored-correct). Strong candidate for the
  next Spec-35 sidebar-completeness front once the converter fronts land.
- `P-CSSLAYER-DROPPED-ON-AN-UNASKED-QUESTION` — decide in Front 1's design gate whether css_layer
  joins the routing key or stays a separate axis.
