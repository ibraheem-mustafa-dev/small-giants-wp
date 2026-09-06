# `inspector-scan/` — the block-editor inspector conformance scanner

**What it is.** A static analyser over every block's **editor surface** (`edit.js` and the
shared components it mounts), checking the inspector a client actually sees against Spec 35's
standard: are controls grouped into Settings/Styles, is the right control primitive used for
the storage shape, is a colour row the canonical shape rather than a lookalike, does a
declared control actually reach a rendered property.

It is the only thing in the repo that resolves **which blocks reach which shared component**,
which is why the components adoption ledger reuses its resolver rather than growing a second.

---

## Entry point

```bash
node plugins/sgs-blocks/scripts/inspector-scan/run.js            # human-readable report
node plugins/sgs-blocks/scripts/inspector-scan/run.js --json     # machine-readable (~1.3 MB)
```

There is **no `--help`** — passing an unknown flag runs a full scan.

It runs in **both** gate chains: `prebuild`, and `.githooks/sgs-gates.sh` on any staged
`src/blocks/*/edit.js` or `src/components/*.js`.

---

## Structure

| Path | Role |
|---|---|
| `run.js` | Entry point. Builds the `ctx`, discovers the roster, runs each rule, prints the report. |
| `rules.json` | **The registry.** Every rule's id, its file, and whether it is `gate` or `advisory`. |
| `rules/*.js` | One file per rule — 22 of them. |
| `core/` | Shared machinery used by every rule (9 modules, below). |
| `baselines/` | Per-rule grandfathered findings. |
| `fixtures/` | Self-test fixtures, including the must-flag cases. |
| `placement-rule-surfaces.json` | Data for the D537 placement rule. |

### `core/`

| Module | What it owns |
|---|---|
| `sources.js` | `SourceCache` — one read + one AST parse per file per run. |
| `components.js` | `resolveComponentFiles` (name → file) and `getSharedOwnerScan` (block → shared component, one hop). |
| `golden.js` | `reachedComponents` and the golden-colour-control machinery. |
| `roster.js` | Which blocks exist — reconciles `roster.json` against `src/blocks/`. |
| `finding.js` | `makeFinding` — the shape every rule returns. |
| `baseline.js` | `hasRealReason` — baseline matching. |
| `extensions.js` | Universal-extension awareness. |
| `report.js` | Rendering. |
| `selftest.js` | Runs each rule's `selfTest` against isolated fixtures. |

### The registry: 24 entries, 22 files

`rules.json` holds **24** entries but there are only **22** rule files. The two without a
file (`roster-drift`, `parse-error`) are engine-level checks run by `run.js` itself, not rule
modules. Split by mode: **7 gate, 17 advisory**.

An advisory rule reports and never fails the build. Each carries an `advisoryReason` saying
*why* it is not yet promotable — usually "this is a large real backlog", with a measured
figure and a date.

---

## Adding a rule

1. Write `rules/NN-name.js`.
2. **Register it in `rules.json`** with an `id`, `file` and `mode`.
3. **Export a `selfTest`** — it is mandatory and registration is enforced. A rule that is not
   registered does not run.
4. Give the self-test a **must-flag fixture**. A silently-disabled rule returns zero findings,
   which looks exactly like a clean tree; only a fixture it is required to catch can tell the
   difference.
5. Start `advisory` with a measured `advisoryReason`. Promote to `gate` once it runs quiet.

⚠ **Prefer an AST walk to a regex.** JSX children are a tree. Two regexes were tried for the
empty-container rule and both were wrong in opposite directions — one found 0 (a char class
cannot cross the `=>` in an arrow-function prop) and one found 471 (it matched the closing
`>` of the last self-closing child). A false absence and a false flood from one question.

---

## Data it reads and writes

**Reads:** every `src/blocks/*/edit.js`, `src/components/**/*.js`, `src/blocks/extensions/*.js`,
each block's `block.json`, `scripts/consistency/roster.json`, `rules.json`, `baselines/`,
and the `sgs-framework.db` `block_attributes` table (rule 31, for `css_property`).

**Writes:** nothing except `err.log` and stdout. It is a read-only analyser.

---

## Gotchas worth knowing before you trust a number

⚠ **`resolveComponentFiles` does a FLAT `readdirSync` per directory — it does not recurse.**
It indexes `src/components`, `src/blocks/*/components` and `src/blocks/extensions`, so
anything in a nested folder such as `src/components/colour-variants/` is **not in the map at
all**. Measured 2026-08-24: `fillRow`/`textRow`/`borderRow` are invisible to it.

⚠ **`getSharedOwnerScan` resolves ONE hop and credits a block only when its JSX contains
`<ComponentName`.** A helper invoked as a function call — `fillRow( { … } )` — is not seen,
and a component mounted two levels deep is not either. **A zero from this resolver is not
evidence of non-adoption**; check the mechanism the thing actually uses before concluding.

⚠ **A comment mentioning a component is not a use of it.** Eight files "reference"
`SgsLinkControl`; every one is prose. Strip comments before matching.

⚠ **Rule counts drift and are measured, not remembered.** Every figure in an
`advisoryReason` carries the date it was measured. Re-measure before quoting one.
