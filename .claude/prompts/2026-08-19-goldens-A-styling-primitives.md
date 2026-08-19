# Session A — finalise the STYLING-PRIMITIVE control goldens

```
created: 2026-08-19
branch:  create `feat/goldens-styling` from origin/main, in YOUR OWN WORKTREE
peers:   Sessions B (`feat/goldens-input`) and C (`feat/goldens-behaviour`) run in
         parallel. You build the COMPOSER they both depend on — ship it FIRST.
```

## 0. Read these before touching anything

| Read | Why |
|---|---|
| `.claude/LEDGER.md` | current state, and the guardrail list — every one was paid for |
| `plugins/sgs-blocks/scripts/consistency/golden-controls.json` | the contract you are extending; **`colour` is the worked example** |
| `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` **Part O, incl. O.15 + O.16** | the contract vocabulary and the two traps between layers |
| `plugins/sgs-blocks/scripts/surveys/survey-golden-conformance.js` | the engine that will READ your rows — its header states what it can and cannot see |

**Self-check before you start:** can you say why `roster.json`'s `surfaces.colour`
cannot answer *"should this block have a colour control?"* If not, re-read Spec 35
O.16 — that misunderstanding produced a 21-item phantom backlog.

## 1. What you are building

The library has **~24 control types**. Only **colour** is finalised, the rest are temp goldens so we need to find the UI example that we want to standardise. Your third is the
**styling primitives** — the controls that paint, size and space things:

| # | Type | Note from Bean |
|---|---|---|
| 2 | **Gradient** | ⚠ **probably MERGES INTO colour** — decide with evidence, do not assume |
| 3 | Typography | mandatory `TypographyControls` per plugin CLAUDE.md |
| 4 | Length / unit | |
| 5 | 4-value box | |
| 6 | Border | |
| 7 | Shadow | |
| 19 | Alignment | |

**Session B owns:** enum/segmented, boolean, free-text, link, icon, multi-select, date.
**Session C owns:** media, state/hover, responsive wrapper, repeater, animation,
angle/position, preset picker. Do not write their rows.

### Your main task - Find the different forms of each control type and show them to Bean via /playwright or /chrome-devtools-mcp:chrome-devtools on the Canary's block editor. Then when we decide on a real golden for the control type we can move onto point 2

### ⭐ Your main task — find the UI example worth standardising ON

⛔ **The existing rows for your types are TEMP goldens, not decisions.** Only `colour` is
finalised. Do NOT treat the current `canonical` entry for a type as settled and merely
bolt predicates onto it — your job is to look at how that control is ACTUALLY implemented
across the library today, decide which implementation should become the standard, and
write the contract from that.

That means, per type:
1. **Survey the real implementations** — `npm run survey:control-mounts` shows every
   mount by scope. Where a type has several components doing the same job, they are
   candidates, not a settled hierarchy.
2. **Pick the one to standardise on, with a reason** — most adopted is a signal, not the
   answer. The best implementation is the one that already handles the hard cases
   (responsive tiers, states, tokens) rather than the one copied most often.
3. **Name the losers as `bannedLookalikes`** so the census can find every block still on
   them. A contract that names a canonical without naming what it replaces cannot
   generate a migration list.

⚠ Where the current row names a canonical that has **zero mounts**, it is pointing at dead
code — say so explicitly and pick something real.

## 2. Where your rows go — you do NOT edit golden-controls.json

⛔ **`golden-controls.json` is a single merge point and two peer sessions are live.** Two sessions editing it produces a conflict on every run.

Write your rows to a NEW file you own outright:

```
plugins/sgs-blocks/scripts/consistency/goldens/styling.json
```

Same shape as `golden-controls.json`'s `controls` object — one key per control type.
The composer (§5) merges it. Session B writes `goldens/input.json`, Session C writes `goldens/behaviour.json`.
Nobody touches another session's file or the base.

## 3. What a FINISHED contract row contains

Copy `controls.colour`'s shape. A row is finished when it has all five:

1. **`canonical`** — the component(s) that ARE the correct implementation, with paths.
   ⛔ **Use colour's nested shape** (`{ panel: {component, path}, row: {component, path} }`)
   even where a type has only one component — put it under `panel`. The existing 13
   rows each invented their own shape, which is why the census reports N/A for all of
   them. **You are normalising, not inventing.**
2. **`bannedLookalikes`** — raw primitives that bypass the canonical component.
   Exact JSX-identifier match, never substring.
3. **`nativeUi.detectVia`** — the `supports.*` key where WordPress core renders a
   COMPETING UI, written as `block.json supports.<key> — any sub-flag set true`. The
   engine parses the key out of that string. Omit the whole `nativeUi` object if core
   has no competitor for this type.
4. **`qualifiesWhen`** — the evidence that a block SHOULD have this control. See §4.
5. **`scope`** — which blocks the contract applies to.

**Every figure you quote must be produced by running something.** Record the command
next to the number. A figure you reasoned about is a claim; this repo has a standing
rule against them because five instrument bugs surfaced in one day.

## 4. `qualifiesWhen` — the part that makes the census able to find MISSING controls

This is the highest-value field and the least obvious. Read Spec 35 O.16 first.

The engine is generic; **the evidence is per family.** Colour qualifies on painted
surfaces; yours will differ:

- typography → the block renders text
- length-unit / 4-value box → the block has a box or spacing element
- border → the block paints a border
- shadow → the block has a card-like surface
- alignment → the block has multiple children or a layout axis

Three signal shapes already exist and two are family-agnostic — reuse them:

| Signal | Generalises? |
|---|---|
| own evidence (paints / renders / has a box) | ❌ yours to define per type |
| **styled by an ancestor** | ✅ reuse — "my rendered classes are governed elsewhere" |
| **feature parity vs the replaced core block** | ✅ reuse — `roster.json` `blocks[].qualifies.replacedCoreSupports` |

⚠ **Qualifying does not always mean the control belongs on THIS block.** Every
`sgs/form-field-*` declares elements and paints none; `sgs/form` paints all 52. Emit
`home: 'ancestor'` in that case. Session B meets the form family head-on — but the same
shape may appear in yours.

## 5. The composer — build it as your first task

`survey-golden-conformance.js` currently loads `golden-controls.json` directly. Add a
loader in `plugins/sgs-blocks/scripts/inspector-scan/core/golden.js` that merges:

```
golden-controls.json  (base: colour, link)
  + goldens/styling.json   (yours)
  + goldens/input.json      (Session B's, may not exist yet — tolerate absence)
  + goldens/behaviour.json  (Session C's, may not exist yet — tolerate absence)
```

⛔ **A missing peer file must NOT be an error** — B and C may land after you. Merge what
exists, and make `_meta.encoded` the union of the keys actually present.

⛔ **`core/golden.js` is a single merge point.** Doing this first, in one small commit,
before B or C needs it, is the whole reason it is your task. Tell them both when it lands.

## 6. Hard constraints

- ⛔ **Your own git worktree.** Two sessions in one worktree switched a branch under a
  live session today and blocked commits for hours.
- ⛔ **Merge `origin/main` BEFORE you start, and again before you push.** A stale tree
  plus the shared DB silently loses entries — re-running the seeder cannot fix it
  because the input genuinely is not there.
- ⛔ **Never edit** `golden-controls.json`, `goldens/input.json`, `goldens/behaviour.json`, `rules.json`, or
  `package.json`. Deliver a registration string; the integrator wires it.
- ⛔ **No `/sgs-update`, no `extract-signatures.py`, no DB writes.** The DB is shared
  and `extract-signatures.py` is non-deterministic.
- ⛔ **No `npm run build`** — `clean:build` does `rmSync('build')`.
- ⛔ **`cat -A` any regex you write.** A literal backspace (`0x08`) replaced `\b` TWICE
  in one day; both times the detector matched nothing and passed clean.
- ⛔ **`*/` inside a JS block comment terminates it** — `src/blocks/*/components/` in a
  docblock is a syntax error.

## 7. Done when

1. `node scripts/surveys/survey-golden-conformance.js --self-test` passes.
2. The census reports **real verdicts, not N/A**, for every type you added — N/A across
   a whole type means the engine cannot read your row.
3. **You predicted each type's finding count BEFORE the first run and reconciled after.**
   A count below your prediction is a detector bug until proven otherwise.
4. Every figure in your rows has its producing command recorded beside it.
5. `python .claude/hooks/handoff-preflight.py --check` passes.

## 8. Report back

The composer's behaviour when a peer file is absent · per type: canonical shape,
qualifiesWhen evidence, predicted vs measured counts · the gradient decision **with the
evidence that settled it** · anything that contradicted this brief — say so plainly
rather than working around it.