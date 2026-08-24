---
doc_type: prompt
title: DB + script documentation — code-only investigation and QC
date: 2026-08-24
status: READY
governing: .claude/dev-setup.md (both generated catalogues), Spec 31 §13 (data layer)
owner_track: colour-golden / tooling
---

# DB + script documentation — code-only investigation and QC

Invoke `/autopilot` first.

## The method, and why it is non-negotiable

Every claim in this work must be traced **through the code to the raw source**. Do not
summarise a docstring, a comment, a spec or a plan. This session proved why:

- **Six scripts' headers lie about their own wiring.** `inspector-scan/run.js` says "NOT
  wired into prebuild yet"; it is in both gate chains. A catalogue built from headers
  propagates each lie with the catalogue's authority behind it.
- **`derived_selector` reads like a CSS selector and is a formula** —
  `f".sgs-{short_slug}__{canonical_slot}"`. Zero of its values exist as classes in the
  tree. A survey once measured "58% autofixable" off it. The figure was wrong.
- **`css_tier` was silently nondeterministic until 2026-08-22.** It iterated a Python
  `set`, and Python salts string hashing per process. Two runs on an unchanged tree
  flipped `card-grid`, `gallery` and `post-grid` in opposite directions across three
  sessions, each reverted by hand without the cause being found.

A value you cannot trace to executing code does not go in the catalogue. "Unverified" is
a useful answer. An invented mechanism is not.

## What already exists — extend it, never rebuild it

⛔ **Read `.claude/dev-setup.md` before writing any script.** It carries two GENERATED
catalogues, both with a `--check` that is proven able to fail:

| Catalogue | Generator | Covers |
|---|---|---|
| Tooling | `plugins/sgs-blocks/scripts/generate-tooling-catalogue.py` | 524 scripts across 5 directories, both gate chains |
| DB columns | `plugins/sgs-blocks/scripts/generate-db-catalogue.py` | 35 tables, vocabularies, NULL rates |

**Script directories are plural — five of them.** Searching one and concluding a tool does
not exist is how this repo has rebuilt the same functionality repeatedly. The tooling
catalogue is the fifth attempt at a catalogue; four predecessors rotted because they were
hand-maintained. Grep the **subject** (colour, gradient, token, element, parity), never the
verb — the same idea appears as `census-*`, `survey-*`, `audit-*`, `check-*`, `scan-*`,
`probe-*` and `report-*`.

---

## Task 1 — Gate A: repoint the trigger and re-seed the goldens

**What:** The converter's golden-fixture safety net has been unable to run since
2026-07-05. It watches `plugins/sgs-blocks/scripts/orchestrator/converter_v2/`, deleted
that day. Its harness is alive and 37 of 39 fixtures fail.

**Why it is not a regression — already root-caused, do not re-litigate:**

| Date | Event |
|---|---|
| 2026-07-05 | `converter_v2/` deleted (`c8690345`) — trigger dies |
| 2026-07-25 | Goldens last seeded (`d1f2c16b`) |
| 2026-08-04 | Section-root capability gate enforced (`2b5a6b64`, FR-31-16) — emit contract changes |

`recognise()` returns `sgs/quote` correctly; `recognise_section()` deliberately demotes a
content component standing in as a whole page section. Its docstring documents the measured
consequence. The ~7 fixtures that keep their identity fail because the converter now
extracts **more** than the golden holds.

**Do, in this order:**
1. Repoint `.githooks/sgs-gates.sh:386` from `orchestrator/converter_v2/` to `converter/`.
   Also drop the dead `converter_v2` alternative from the regex at `:372`.
2. Deploy and prove the current emit is correct on the canary — the LANDED proof.
3. Re-seed: `python plugins/sgs-blocks/scripts/tests/seed_conformance_goldens.py`.
4. Re-run the harness; it must pass 39/39.

⛔ **Never re-seed from a bare local emit.** Re-seeding captures whatever the converter
emits right now. Without proving that output correct on a live page first, a real
regression sitting among the intended changes is blessed permanently and becomes
invisible. The script's own header says exactly this.

**Orchestration:** inline (main thread). The LANDED proof is judgement, not mechanical.
**Acceptance:** harness 39/39, gate fires on a converter change, LANDED proof cited.

---

## Task 2 — `container_kind`: fix the anomaly, then wire it into the refresh

**What:** `container_kind` decides whether a block is a section, a layout or content —
which feeds `recognition.py`, the converter's Stage-2 recognition. It is derived by regex
over **attribute names** in `block.json` and never reads the PHP that renders the block.

**2a — the one anomaly.** `sgs/modal` is `container_kind='section'` but its `render.php`
does not call `SGS_Container_Wrapper`. D294 requires section-KIND composites to keep the
wrapper. Investigate and correct whichever side is wrong.

⚠ **Do not widen this into a re-derivation.** An earlier pass in this repo flagged 13
"disagreements" using the predicate *content-kind must not call the wrapper*. **D294 says
content-kind MAY render block-private — permission, not obligation.** Twelve of the
thirteen are the exact blocks D294 names as the content set. The data is fine.

**2b — wire it into the automatic refresh.** `sync-container-wrapping-blocks.py` writes
`container_kind` only under `--apply`, and `/sgs-update` runs it WITHOUT `--apply` (report
only, `:972`). The column therefore drifts silently between manual runs.

⚠ `sgs/container` is in `EXCLUDE_SLUGS` as "the reference block itself" (`:152-156`), so
the block every composite must mirror can never be classified. Decide deliberately whether
that stays.

⛔ **This column feeds converter recognition.** Any value change alters what the pipeline
emits. Measure before and after, enumerated per block, and run Gate A (Task 1) afterwards.

**Orchestration:** 2a inline; 2b delegated to one `sonnet` subagent via `/delegate`.
**Depends on:** Task 1 (Gate A must be able to fire before changing a recognition input).
**Acceptance:** modal resolved; `container_kind` refreshed automatically; per-block
before/after diff enumerated; Gate A still 39/39.

---

## Task 3 — Finish the DB column tracing (SIX tables, not 24)

**Scope was cut from 24 to 6 on 2026-08-24 after checking each table for real readers.**
Sixteen were cut as irrelevant or fossil; two more on Bean's call. Do not re-expand it.

**Already traced** (in `.claude/dev-setup.md`): `block_attributes` (11 classification
columns), `blocks`, `block_composition`, `block_capabilities`, `block_supports`, and the
eight vocabulary tables.

**Trace these six:**

| Table | Rows | Why it earns the work |
|---|---|---|
| `fx_effects` | 16 | 5 readers, self-healing reseed, the four-tier motion doctrine |
| `array_item_schema` | 62 | 3 readers. ⚠ Its `role` is a SEPARATE 3-value vocabulary — never join it to `block_attributes.role` |
| `design_tokens` | 261 | 3 readers incl. `converter/resolvers/outer_box.py` |
| `block_selectors` | 75 | Block Selectors API map |
| `animation_tokens` | 8 | Feeds the motion registry |
| `schema_metadata` | 4 | Already known drifted — says WP 7.0, the canary runs 7.1 |

**CUT — do not trace:**

- `patterns` (Bean, 2026-08-24).
- `attribute_gap_candidates` — a WRITE-MOSTLY ledger. Its "9 readers" resolved to 3 writers,
  5 test fixtures and ONE production read (`gap-detection/detect.py:111`). CLAUDE.md rule 4a
  already calls it debug-only and NOT a fidelity signal.
- Fossils with no writer and no reader: `block_changes` (2,735 rows, last written
  2026-07-15), `pipeline_corrections` (4 rows, 2026-04-13). Worth a RETIREMENT decision
  someday; not tracing work.
- Not this work: `hooks`, `docs`, `markup_examples`, `pattern_coverage`, `indexed_files`,
  `deploy_steps`, `gotchas`, `schema_migrations`, `theme_parts`, `plugins`, `style_variations`.

Per column: **every writer** (file:line, which wins on conflict); the **derivation followed
to its origin**, classified NAME-DERIVED / STRUCTURAL / DECLARED / PARSED / HAND-OVERRIDE,
quoting the computing code; whether **the name matches the data**; **weaknesses and stronger
alternatives**; and **NULL semantics** proven from code.

Fold findings into `generate-db-catalogue.py`'s `COLUMN_MEANING` map — never the markdown,
which is overwritten.

**Orchestration:** two `sonnet` subagents via `/dispatching-parallel-agents`, disjoint
tables. Read-only; never run `sgs-update-v2.py` (it writes the shared DB).

---

## Task 3b — REBUILD `components` as the unification adoption ledger

**The idea (Bean, 2026-08-24).** `components` today holds 13 rows of editor-side JS with
placeholder descriptions and `props` all NULL — a file listing wearing the name. Rebuild it
as the registry of **every shared helper and injector built for unification**, WITH ADOPTION
COUNTS. Adoption is what makes it an audit rather than a list.

**Measured surface — the table is missing 64 of 77:**

| Family | On disk | In the table today |
|---|---|---|
| Editor components (`src/components/`) | 31 | 10 |
| Shared utils (`src/utils/`) | 7 | 3 |
| PHP render helpers (`includes/helpers-*.php`) | **22** | **0** |
| `render_block` injectors (`includes/`) | **16** | **0** |
| The shared wrapper (`class-sgs-container-wrapper.php`) | 1 | 0 |

**Schema — ONE table, differentiated by family and functionality** (Bean's call: injectors
and helpers belong together, distinguished by columns, not split across tables):

```
family        editor-component | util | render-helper | injector | wrapper
functionality what it unifies, one line (e.g. "background colour rows", "box shorthand",
              "device visibility via render_block")
file_path     repo-relative
adopters      COUNT of blocks that actually use it
adopter_list  the block slugs, so a zero or a legacy count is actionable
```

⚠ **Injectors are a different RISK class and the `family` column must make that legible.**
A `render_block` filter mutates EVERY block's output whether the block opted in or not; a
helper is called deliberately. D405 records four injectors whose inline writes were being
SILENTLY STRIPPED — the gate passed while the features were dead.

**Why adoption counts earn their cost — measured 2026-08-24, the colour surface alone:**

| File | Blocks |
|---|---|
| `SgsColourPanel.js` | 65 |
| `DesignTokenPicker.js` (the LEGACY single-value API) | 26 |
| `colour-variants/fillRow.js` | 22 |
| `colour-variants/textRow.js` | 7 |
| **`colour-variants/borderRow.js`** | **0 — built, never adopted** |
| `GradientCapableColourControl.js` / `GradientOverlayControl.js` | 2 each |

`borderRow` is the built-and-forgotten cycle caught in the act. 26 blocks on the legacy
picker while three purpose-built row helpers sit at 22 / 7 / 0 is the migration backlog,
visible nowhere else. Precedent for the cost of not knowing: `helpers-box.php` carried
byte-identical shared closures from 2026-07-12 with only 4 adopters until a codemod migrated
121 definitions across 57 files; the hardened length sanitiser needed 204 call sites across
56 files.

⚠ **Adoption must resolve ONE HOP, not just grep `edit.js`.** A block reaching a component
through a shared panel is a real adopter. `inspector-scan` already does this resolution
(`resolveComponentFiles` / `getSharedOwnerScan`, 136 components) — REUSE it, do not write a
second resolver that will disagree with the first. The numbers above are direct-grep only
and will undercount.

**Orchestration:** inline for the schema + wiring decision; one `sonnet` subagent for the
adoption scan. Writer goes in `sgs-update-v2.py` Stage 1 so it refreshes automatically —
a registry that needs a manual run is the problem it exists to solve.
**Acceptance:** all ~77 surfaces registered with family, functionality and adopter count;
zero-adoption rows listed explicitly; the writer runs inside `/sgs-update`.

---
## Task 4 — Script inputs and outputs, traced not quoted

The tooling catalogue holds each script's own one-line purpose. It does **not** hold what
data each script reads and writes — the thing that makes it usable.

Three harvests already exist in the scratchpad from 2026-08-23 (stage I/O, script I/O
schema, three-directory inventory). **Treat them as candidate lists, not fact** — they were
built from docs. Verify each against the code before folding anything in.

Source docs worth harvesting, in priority order:
1. `.claude/scratch/cloning-pipeline-flow-pre-split-backup.md` — the only per-stage
   `FILES (R)` / `FILES (W)` / DB-tables data. ⚠ `scratch/` ages out at 30 days.
2. `.claude/reports/2026-08-05-stage-inventory-ground-truth.md` — 34 scripts, 6-field schema.
3. `.claude/memory/specs-archive/21-PIPELINE-STATE-ARTEFACTS.md` — artefact-keyed.

Add an Inputs/Outputs column to `generate-tooling-catalogue.py`, sourced from code.

**Acceptance:** every prebuild + commit-gate script carries verified inputs and outputs.

---

## Task 5 — Write the three missing READMEs

`inspector-scan/` (192 files), `orchestrator/` (45) and `cheat-gate/` (14) have none. An
inventory exists in the scratchpad. **Write these inline, not via a subagent** — `/delegate`
routed this to the main thread because a hallucinated README describing 192 files is worse
than no README.

Each README: what it is, entry points with exact commands, structure grouped by role,
data read and written, how to add to it, and the self-documented gotchas quoted verbatim.

⚠ `cheat-gate` has no unregistered-check guard, unlike `inspector-scan` (which enforces
registration via `rules.json` plus a mandatory `selfTest` export). All 8 modules are
wired today — a latent hazard with zero live instances. State it as that, not as a defect.

---

## Dependency graph

```
Task 1 (inline)  ─ Gate A repoint + LANDED re-seed
      ↓
Task 2 (2a inline, 2b sonnet)  ─ container_kind
      ↓  /qc-council on any recognition-affecting change
Task 3 (3 × sonnet, parallel)  ┐
Task 4 (1 × sonnet)            ├─ independent, run concurrently
Task 5 (inline)                ┘
      ↓  /qc subagent on the folded catalogue
Commit + push to main
```

## Guardrails

- **Trace to code, never quote a docstring.** Six headers in this tree are provably false.
- **Verify every subagent claim before acting.** This session corrected four: a stale
  comment calling a wired gate unwired; "cheat-gate executes 9 checks" (it does not); an
  unregistered-check hazard reported as live (it is latent); and a gate called toothless
  whose own file rebuts the criticism fifteen lines further down.
- **Check the predicate before trusting the measurement.** The `container_kind` error was a
  correct measurement of a wrong rule — a permission read as an obligation. That produces a
  confident, precise, wrong number.
- **A no-evidence result is a broken probe** until proven otherwise. Two probes returned
  clean-looking zeros this session; both were bugs in the probe.
- **Never run `sgs-update-v2.py` while a sibling session is live** — it writes the shared DB.
- **Path-scoped commits, branch re-checked in the same command.** Five tracks share `main`.
- **Never `phpcbf`** — realign by hand.
- Run `python plugins/sgs-blocks/scripts/generate-tooling-catalogue.py --check` and
  `generate-db-catalogue.py --check` before committing; both fail when stale.
