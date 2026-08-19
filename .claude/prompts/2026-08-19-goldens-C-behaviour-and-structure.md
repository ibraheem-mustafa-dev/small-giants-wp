# Session C — finalise the MEDIA / STATE / STRUCTURE control goldens

```
created: 2026-08-19
branch:  create `feat/goldens-behaviour` from origin/main, in YOUR OWN WORKTREE
peers:   Sessions A (`feat/goldens-styling`) and B (`feat/goldens-input`) run in
         parallel. A builds the COMPOSER you depend on — see §2.
```

## 0. Read these before touching anything

| Read | Why |
|---|---|
| `.claude/LEDGER.md` | current state, and the guardrail list — every one was paid for |
| `plugins/sgs-blocks/scripts/consistency/golden-controls.json` | the contract you are extending; **`colour` is the worked example** |
| `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` **Part O, incl. O.15 + O.16** | the contract vocabulary and the two traps between layers |
| `plugins/sgs-blocks/scripts/surveys/survey-golden-conformance.js` | the engine that will READ your rows — its header states what it can and cannot see |

**Self-check before you start:** can you say why `roster.json`'s `surfaces.*` cannot
answer *"should this block have this control?"* If not, re-read Spec 35 O.16 — that
misunderstanding produced a 21-item phantom backlog.

## 1. What you are building

The library has **~24 control types**. Only **colour** is finalised. Your third covers
**media, state and structure** — and it holds the two most interesting judgement calls
in the whole roster:

| # | Type | Note from Bean |
|---|---|---|
| 13 | **Media** | ⚠ decide **with evidence** whether this is ONE contract or several. Live: `MediaPicker` (13 mounts, 8 blocks), `MediaGalleryPicker` (2), `MediaUpload` (35), `FocalPointPicker` (3). Single-vs-gallery may be one contract with a mode, or two. |
| 15 | **State / hover** | ⚠ the contract's currently-named canonical `StateToggleControl` has **ZERO mounts anywhere** — it points at dead code. The WORKING mechanism is `SgsColourPanel` rows → `DesignTokenPicker` states. Name what is real. |
| 16 | Responsive wrapper | `ResponsiveControl` / `ResponsiveOverride` / `ResponsiveTriStateControl` — 3 components, one concept |
| 17 | Repeater / list | 307 declared elements across 83 blocks; `array_item_schema` exists in the DB |
| 18 | Animation | `AnimationControl`, 2 mounts, no contract today |
| 20 | Angle / position | |
| 22 | Preset / variant picker | relates to `blocks.variant_attr` + the `variant_slots` table — query, don't guess |

**Excluded (Bean):** #24 Rich text — not real, it happens in the canvas.
**Session A owns:** gradient-into-colour, typography, length-unit, 4-value box, border,
shadow, alignment — and the COMPOSER.
**Session B owns:** enum/segmented, boolean, free-text, link, icon, multi-select, date.
Do not write their rows.

## 2. Where your rows go — you do NOT edit golden-controls.json

⛔ **`golden-controls.json` is a single merge point and two peer sessions are live.**
Two sessions editing it produces a conflict on every run.

Write your rows to a NEW file you own outright:

```
plugins/sgs-blocks/scripts/consistency/goldens/behaviour.json
```

Same shape as `golden-controls.json`'s `controls` object — one key per control type.
Session A writes `goldens/styling.json` and builds the composer; Session B writes
`goldens/input.json`. Nobody touches another session's file or the base.

⚠ **A builds the composer; you do not wait for it.** Write your file to the agreed
shape and verify with a temporary local merge if A's composer has not landed. Say so in
your report if you verified that way.

## 3. What a FINISHED contract row contains

Copy `controls.colour`'s shape. A row is finished when it has all five:

1. **`canonical`** — the component(s) that ARE the correct implementation, with paths.
   ⛔ **Use colour's nested shape** (`{ panel: {component, path}, row: {component, path} }`)
   even where a type has one component — put it under `panel`. The existing 13 rows each
   invented their own shape, which is why the census reports N/A for all of them.
   **You are normalising, not inventing.** Where a type genuinely has several components
   (responsive wrapper, media), model them as sibling keys under `canonical`, each with
   `component` + `path`, and say in prose when each applies.
2. **`bannedLookalikes`** — raw primitives that bypass the canonical component. Exact
   JSX-identifier match, never substring.
3. **`nativeUi.detectVia`** — the `supports.*` key where core renders a COMPETING UI,
   written as `block.json supports.<key> — any sub-flag set true`. Omit the whole
   `nativeUi` object if core has no competitor. ⚠ Media plausibly does have one
   (`supports.spacing` does not apply, but check `align`/`dimensions`) — verify, don't assume.
4. **`qualifiesWhen`** — the evidence a block SHOULD have this control. See §4.
5. **`scope`** — which blocks the contract applies to.

**Every figure you quote must be produced by running something**, with the command
recorded beside it. A reasoned figure is a claim; five instrument bugs surfaced in one
day here.

## 4. `qualifiesWhen` — the field that lets the census find MISSING controls

Read Spec 35 O.16 first. The engine is generic; **the evidence is per family**:

- media → the block renders an `<img>` / `<video>` / media element
- state/hover → the block emits a `:hover` or `:focus-visible` rule
- responsive wrapper → the block has any per-device attribute tier
- repeater → the block declares an array-typed attribute with an item schema
- animation → the block declares motion attributes or opts into the animation extension
- preset/variant → the block declares `supports.sgs.variants` or a `variant_attr`

Two signals are family-agnostic — reuse rather than reinvent:

| Signal | Reuse |
|---|---|
| **styled/owned by an ancestor** | ✅ "my rendered classes are governed elsewhere" — emit `home: 'ancestor'` |
| **feature parity vs the replaced core block** | ✅ `roster.json` `blocks[].qualifies.replacedCoreSupports` |

⭐ **State/hover is your highest-value predicate.** 8 blocks now emit hover colour through
the shared `sgs_emit_state_colour_css` helper, and **5 blocks still have a `:hover` with
no `:focus-visible`** — a keyboard user cannot reach those states at all. A `qualifiesWhen`
that keys on "emits a hover rule" turns that from a note in the LEDGER into a finding the
census produces every run.

## 5. Hard constraints

- ⛔ **Your own git worktree.** Two sessions in one worktree switched a branch under a
  live session today and blocked commits for hours.
- ⛔ **Merge `origin/main` BEFORE you start, and again before you push.** A stale tree
  plus the shared DB silently loses entries — re-running the seeder cannot fix it,
  because the input genuinely is not there.
- ⛔ **Never edit** `golden-controls.json`, `goldens/styling.json`, `goldens/input.json`,
  `core/golden.js`, `rules.json`, or `package.json`. A owns the composer; deliver
  registration strings and let the integrator wire them.
- ⛔ **No `/sgs-update`, no `extract-signatures.py`, no DB writes.** The DB is shared and
  `extract-signatures.py` is non-deterministic. **Read-only DB queries are fine** — you
  will need them for `variant_slots` and `array_item_schema`.
- ⛔ **No `npm run build`** — `clean:build` does `rmSync('build')`.
- ⛔ **`cat -A` any regex you write.** A literal backspace (`0x08`) replaced `\b` TWICE
  in one day; both times the detector matched nothing and passed clean.
- ⛔ **`*/` inside a JS block comment terminates it** — `src/blocks/*/components/` in a
  docblock is a syntax error.
- ⛔ **A variant's definition lives in `variant_slots` + `blocks.variant_attr`** — query
  it before reasoning about the preset/variant contract, never infer from attribute names.

## 6. Done when

1. `node scripts/surveys/survey-golden-conformance.js --self-test` passes.
2. The census reports **real verdicts, not N/A**, for every type you added — N/A across
   a whole type means the engine cannot read your row.
3. **You predicted each type's finding count BEFORE the first run and reconciled after.**
   A count below your prediction is a detector bug until proven otherwise.
4. The media decision (one contract or several) is settled **with the measurement that
   settled it**, not by preference.
5. The state/hover contract names a canonical that actually has mounts.
6. `python .claude/hooks/handoff-preflight.py --check` passes.

## 7. Report back

Per type: canonical shape, qualifiesWhen evidence, predicted vs measured counts · the
media one-vs-several decision **with its evidence** · what state/hover now names as
canonical and how many blocks reach it · whether the 5 hover-without-focus-visible blocks
are caught by your predicate · anything that contradicted this brief — say so plainly
rather than working around it.
