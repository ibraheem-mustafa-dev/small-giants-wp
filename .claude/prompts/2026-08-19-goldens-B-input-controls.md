# Session B — finalise the INPUT-CONTROL goldens

```
created: 2026-08-19
branch:  create `feat/goldens-input` from origin/main, in YOUR OWN WORKTREE
peers:   Sessions A (`feat/goldens-styling`) and C (`feat/goldens-behaviour`) run in
         parallel. A builds the COMPOSER you depend on — see §2.
```

## 0. Read these before touching anything

| Read | Why |
|---|---|
| `.claude/LEDGER.md` | current state, and the guardrail list — every one was paid for |
| `plugins/sgs-blocks/scripts/consistency/golden-controls.json` | the contract you are extending; **`colour` is the worked example, `link` is your starting point** |
| `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` **Part O, incl. O.15 + O.16** | the contract vocabulary and the two traps between layers |
| `plugins/sgs-blocks/scripts/surveys/survey-golden-conformance.js` | the engine that will READ your rows — its header states what it can and cannot see |

**Self-check before you start:** can you say why `roster.json`'s `surfaces.*` cannot
answer *"should this block have this control?"* If not, re-read Spec 35 O.16 — that
misunderstanding produced a 21-item phantom backlog.

## 1. What you are building

The library has **~24 control types**. Only **colour** is finalised. Your third covers
the **input controls** — how a client types, picks and toggles:

| # | Type | Note from Bean |
|---|---|---|
| 8+9 | **Enum / select + Segmented enum** | ⚠ **MERGE into one contract.** It must carry the rule that CHOOSES between a dropdown and a segmented control — based on option count AND the rendered length of the option labels, so a segmented control never wraps to two lines in the side panel. That selection rule is the contract's core, not a footnote. |
| 10 | Boolean | |
| 11 | Free text / bare number | |
| 12 | **Link / URL** | ⚠ **Finalise as the LinkPopover setup.** `LinkPopoverField`/`LinkPopoverContent` are canonical; `SgsLinkControl` is SUPERSEDED and has **0 mounts**. |
| 14 | Icon | |
| 21 | Multi-select / tokens | `FormTokenField`, 2 mounts, no contract today |
| 23 | **Date** | not "used" as a control — but **~4 controls are raw text boxes that qualify**. The contract exists to make those findable. |

**Excluded (Bean):** #24 Rich text — not real, it happens in the canvas.
**Session A owns:** gradient-into-colour, typography, length-unit, 4-value box, border,
shadow, alignment — and the COMPOSER you depend on.
**Session C owns:** media, state/hover, responsive wrapper, repeater, animation,
angle/position, preset picker. Do not write their rows.

## 2. Where your rows go — you do NOT edit golden-controls.json

⛔ **`golden-controls.json` is a single merge point and two peer sessions are live.** Two sessions editing it produces a conflict on every run.

Write your rows to a NEW file you own outright:

```
plugins/sgs-blocks/scripts/consistency/goldens/input.json
```

Same shape as `golden-controls.json`'s `controls` object — one key per control type.
Session A writes `goldens/styling.json` and builds the composer. Session C writes
`goldens/behaviour.json`. Nobody touches another session's file or the base.

⚠ **A builds the composer; you do not wait for it.** Write your file to the agreed
shape and verify with a temporary local merge if A's composer has not landed. Say so in
your report if you verified that way.

## 3. What a FINISHED contract row contains

Copy `controls.colour`'s shape. A row is finished when it has all five:

1. **`canonical`** — the component(s) that ARE the correct implementation, with paths.
   ⛔ **Use colour's nested shape** (`{ panel: {component, path}, row: {component, path} }`)
   even where a type has one component — put it under `panel`. The existing 13 rows each
   invented their own shape, which is why the census reports N/A for all of them.
   **You are normalising, not inventing.**
2. **`bannedLookalikes`** — raw primitives that bypass the canonical component. Exact
   JSX-identifier match, never substring. For **link**, `SgsLinkControl` belongs here.
3. **`nativeUi.detectVia`** — the `supports.*` key where core renders a COMPETING UI,
   written as `block.json supports.<key> — any sub-flag set true`. Omit the whole
   `nativeUi` object if core has no competitor (most of yours will).
4. **`qualifiesWhen`** — the evidence a block SHOULD have this control. See §4.
5. **`scope`** — which blocks the contract applies to.

**Every figure you quote must be produced by running something**, with the command
recorded beside it. A reasoned figure is a claim; five instrument bugs surfaced in one
day here.

## 4. `qualifiesWhen` — the field that lets the census find MISSING controls

Read Spec 35 O.16 first. The engine is generic; **the evidence is per family**:

- link → the block renders an `<a>` or holds a URL-shaped attribute
- icon → the block renders an icon slot
- boolean → an attribute typed boolean with a rendered effect
- date → an attribute holding a date value **however it is currently input**

⭐ **Date is the clearest case for why this field exists.** Nobody would say the library
"needs a date contract" — but 3 gap findings are hand-rolled `TextControl`s holding ISO
dates, and `DateTimePicker` has **zero mounts**. The predicate is what turns that from
folklore into a finding.

Two signals are family-agnostic — reuse rather than reinvent:

| Signal | Reuse |
|---|---|
| **styled/owned by an ancestor** | ✅ "my rendered classes are governed elsewhere" — emit `home: 'ancestor'` |
| **feature parity vs the replaced core block** | ✅ `roster.json` `blocks[].qualifies.replacedCoreSupports` |

⚠ **The form family is the standing example of `home: 'ancestor'`, and it is yours via
`free-text` and `enum`.** Every `sgs/form-field-*` declares elements and paints none;
`sgs/form` paints all 52 (`.sgs-form-field__input` appears in `form/style.css` 36 times).
They qualify **collectively** and the control belongs on the parent, with children
inheriting — the group-default pattern `sgs/multi-button` proves at D640.

## 5. Hard constraints

- ⛔ **Your own git worktree.** Two sessions in one worktree switched a branch under a
  live session today and blocked commits for hours.
- ⛔ **Merge `origin/main` BEFORE you start, and again before you push.** A stale tree
  plus the shared DB silently loses entries — re-running the seeder cannot fix it,
  because the input genuinely is not there.
- ⛔ **Never edit** `golden-controls.json`, `goldens/styling.json`, `goldens/behaviour.json`, `core/golden.js`,
  `rules.json`, or `package.json`. A owns the composer; deliver registration strings and
  let the integrator wire them.
- ⛔ **No `/sgs-update`, no `extract-signatures.py`, no DB writes.** The DB is shared and
  `extract-signatures.py` is non-deterministic.
- ⛔ **No `npm run build`** — `clean:build` does `rmSync('build')`.
- ⛔ **`cat -A` any regex you write.** A literal backspace (`0x08`) replaced `\b` TWICE
  in one day; both times the detector matched nothing and passed clean.
- ⛔ **`*/` inside a JS block comment terminates it** — `src/blocks/*/components/` in a
  docblock is a syntax error.

## 6. Done when

1. `node scripts/surveys/survey-golden-conformance.js --self-test` passes.
2. The census reports **real verdicts, not N/A**, for every type you added — N/A across
   a whole type means the engine cannot read your row.
3. **You predicted each type's finding count BEFORE the first run and reconciled after.**
   A count below your prediction is a detector bug until proven otherwise.
4. The enum contract's dropdown-vs-segmented rule is stated with its thresholds, and
   those thresholds are derived from real option counts and label lengths in the tree —
   not chosen by feel.
5. `python .claude/hooks/handoff-preflight.py --check` passes.

## 7. Report back

Per type: canonical shape, qualifiesWhen evidence, predicted vs measured counts · the
enum selection rule and the measurements behind its thresholds · anything that contradicted this
brief — say so plainly rather than working around it.
