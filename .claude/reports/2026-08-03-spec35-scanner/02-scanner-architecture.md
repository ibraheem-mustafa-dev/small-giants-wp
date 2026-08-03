---
doc_type: report
title: Spec 35 unified inspector scanner — extracted architecture + unification design
status: PROPOSAL (design only — no code written)
created: 2026-08-03
governs: the proposed `scripts/inspector-scan/` unified scanner enforcing the 21 + 3 end
  conditions in `.claude/plans/spec-35-inspector-DONE-checklist.md`
inputs_read: audit-inspector-conformance.js, check-dead-controls.js, check-duplicate-controls.js,
  check-control-ux.js, check-universal-fit.js, check-element-manifest-conformance.js,
  check-hardcoded-render-defaults.js, check-simple-surface-cap.js, lint-responsive-controls.py,
  audit-block-file-consistency.py, audit-feature-parity.py, check-box-family-guard.py,
  consistency/run-consistency-gates.py, consistency/build-roster.py, consistency/roster.json,
  db-consistency/{run,models,check_orphan_roles}.py, package.json, .claude/STOP-CATALOGUE.md
---

# Spec 35 unified inspector scanner — architecture extraction + unification design

READ-ONLY analysis. No implementation code was written; the interface sketches below are
illustrative shapes, not files to paste.

---

## 0. What is actually enforced today (measured, not inherited)

`plugins/sgs-blocks/package.json:2` (`prebuild`) is a single `&&` chain. Of the scripts in
scope for Spec 35's checklist, these run on every `npm run build`:

| Script | How it is reached | Fails the build? |
|---|---|---|
| `consistency/run-consistency-gates.py` | first item in `prebuild` | only via its 2 blocking children (`run-consistency-gates.py:113-125`) |
| `check-box-family-guard.py` | **twice** — `run-consistency-gates.py:120-125` *and* directly in `prebuild` | yes |
| `check-element-manifest-conformance.js` | `run-consistency-gates.py:135-138`, **summary lines only** | no (`check-element-manifest-conformance.js:738`) |
| `check-dead-controls.js --check` | `prebuild` | yes (`check-dead-controls.js:838-840`) |
| `check-hardcoded-render-defaults.js --check` | `prebuild` | yes (`check-hardcoded-render-defaults.js:1869`) |
| `check-control-ux.js --check` | `prebuild` | yes (`check-control-ux.js:535-537`) |
| `lint-responsive-controls.py --check` | `prebuild` | yes |
| `audit-inspector-conformance.js --check` | `prebuild` | yes on WARN severity (`audit-inspector-conformance.js:597-613`) |
| `audit-feature-parity.py --check` | `prebuild` | yes |

**Never wired to anything that runs:** `check-duplicate-controls.js`
(`check-duplicate-controls.js:62-66` — "NOT wired into prebuild/prestart"),
`check-universal-fit.js` (`check-universal-fit.js:74-76`), `check-simple-surface-cap.js`,
`audit-block-file-consistency.py` (`audit-block-file-consistency.py:92-95`),
`audit-shrink-to-fit.js`. That is STOP-6 ("a gate must be wired to something that runs")
holding for five real scripts, ~180KB of working detector logic, right now.

**A stale docblock already lies about this**: `audit-feature-parity.py:29-31` says
"⚠ NOT YET WIRED INTO `prebuild` (package.json:7)" — it *is* wired, as the last item of the
prebuild chain. Any design that relies on a script's own header to know its gate mode
inherits that lie. Mode must be **data**, read from one file (see §4.6).

---

## 1. The common architecture these scripts already share

Seven facets recur near-verbatim. This is the template the unified scanner should absorb.

### 1.1 Path anchoring — identical in all of them

Every script resolves from `__file__`/`__dirname` so cwd never matters:
`audit-inspector-conformance.js:69-77`, `check-dead-controls.js:51-68`,
`check-control-ux.js:86-88`, `check-universal-fit.js:84-87`,
`check-element-manifest-conformance.js:79-85`, `run-consistency-gates.py:44-52`,
`audit-block-file-consistency.py:110-125`. `ROOT = <plugin>`, `BLOCKS_DIR = ROOT/src/blocks`
is universal; `audit-inspector-conformance.js:75-77` additionally climbs two levels to reach
`theme/sgs-theme`.

### 1.2 Two mutually incompatible denominators

- **Roster-keyed** (the DB-derived denominator): `audit-inspector-conformance.js:71` +
  `:577` iterates `roster.blocks`; `check-universal-fit.js:86` + `:454`;
  `audit-feature-parity.py:41` + `:249`; `audit-block-file-consistency.py:117`.
- **Directory-keyed** (`fs.readdirSync(BLOCKS_DIR)`): `check-dead-controls.js:734-737`,
  `check-control-ux.js:453-456`, `check-duplicate-controls.js:729`,
  `check-element-manifest-conformance.js:670-673`,
  `check-hardcoded-render-defaults.js:1778`.

They disagree **today**: `roster.json:_meta.count` is 83; `src/blocks/` holds 84 block
directories, all with `block.json` + `edit.js`. The extra one is `sgs/physics-canvas`
(committed `50c9122b`, 2026-08-03; `roster.json` last regenerated 2026-08-01 01:55).
So `audit-inspector-conformance.js --check` — a **hard, build-failing gate** — does not
look at the newest block in the plugin at all, and reports `PASS` while doing so.

Two of the five directory-keyed scripts exclude `extensions`
(`check-dead-controls.js:736`, `check-control-ux.js:455`); one does not
(`check-element-manifest-conformance.js:672`). `check-dead-controls.js:791-800` then adds a
*third* denominator — `src/blocks/extensions/*.js` — because the extension surface is
structurally unreachable from the first (`check-dead-controls.js:60-66`).

### 1.3 Parsing — Babel where it matters, regex everywhere else

Only four scripts parse properly. `@babel/parser` + `@babel/traverse` are used by
`audit-inspector-conformance.js:65-67`, `check-duplicate-controls.js:77-80`,
`check-simple-surface-cap.js`, and `check-box-family-guard.py` (Python `ast`, over the
converter tree, not edit.js). Babel is **not** a declared dependency — `package.json`
`devDependencies` lists only `@wordpress/icons`, `@wordpress/scripts`, `axe-core`,
`lucide-static`, `unicode-emoji-json`; `@babel/*` is present transitively via
`@wordpress/scripts`. That is an undeclared load-bearing dependency.

Everything else is regex over comment-stripped text:
`check-dead-controls.js:167-223` (`collectControlledAttrs`),
`check-control-ux.js:164-198` (`collectSetAttrsKeys`),
`check-duplicate-controls.js:199` (a third copy),
`audit-inspector-conformance.js:147-184` (regexes over **PHP** to find unconditional
`wp_enqueue_style` calls, with hand-rolled brace-depth balancing at
`audit-inspector-conformance.js:129-139`).

Parse-failure handling differs: `audit-inspector-conformance.js:275-280` sets
`errorRecovery: false` and the caller records the block in `unparseable[]`
(`audit-inspector-conformance.js:402-408`) — the block is then **silently unchecked for
all five AST rules** while still counting as "scanned" in the meta
(`audit-inspector-conformance.js:487-505` never surfaces unparseable blocks into the
`--check` gate at `:597-609`).

### 1.4 Shared-component resolution — nothing actually resolves them

`src/components/index.js` re-exports 20 shared controls (`ResponsiveControl`,
`DesignTokenPicker`, `SgsLinkControl`, `ShadowControl`, `SpacingControl`,
`StateToggleControl`, `TypographyControls`, `MediaGalleryPicker`, `IconPicker`, …). No
gate reads them:

- `check-control-ux.js:95-110` treats the *import path string* as a compliance signal —
  six hardcoded regexes plus four hardcoded JSX names. It never opens the component to
  confirm it actually wraps a `ResponsiveControl`.
- `audit-inspector-conformance.js:15-16` exempts `DesignTokenPicker` in a **comment**
  ("it defaults `enableAlpha` to `true`"). The exemption is implemented by simply not
  listing it in `RAW_COLOUR_PICKER_NAMES` (`audit-inspector-conformance.js:83-88`) — if
  that default ever changes, nothing notices.
- `check-duplicate-controls.js:229-240` and `check-control-ux.js:249,360` read a block's
  **own** `components/` subdir only.
- The single exception is `lint-responsive-controls.py:31-36`, which *discovers* sanctioned
  wrappers: "any component exported from `src/components/index.js` whose own source
  imports one of the two primitives … re-derived from the live source tree on every run".
  **That is the correct pattern and the one the unified scanner should generalise.**

`audit-block-file-consistency.py:77-80` builds a shared JS corpus (`src/components/**`,
`src/utils/**`, `src/blocks/extensions/**`) but concatenates it as *text* for
word-boundary consumption tests, not as a component→controls model.

### 1.5 `--check` vs report contract, and exit-code semantics

The house contract is `(default report | --check gate | --json machine)`, but every script
implements it slightly differently:

| Script | default exit | `--check` exit | quirk |
|---|---|---|---|
| `audit-inspector-conformance.js` | 0 (`:616`) | 1 on non-exempt `warn` (`:597-609`) | INFO severity never gates, by design (`:591-596`) |
| `check-dead-controls.js` | 0 | 1 on net-new (`:838-840`) | also has `--self-test` (`:989-993`) |
| `check-control-ux.js` | **1** on net-new | 1 | `( checkMode \|\| seedMode === false )` at `:535` makes the default mode gate too — the `--check` flag is decorative |
| `check-duplicate-controls.js` | 0 | 0 (`:826`) | `--check` accepted "for CLI symmetry", changes nothing (`:62-66`) |
| `check-universal-fit.js` | 0 | 0 (`:791`) | |
| `check-element-manifest-conformance.js` | 0 (`:738`) | n/a | no `--check` at all |
| `db-consistency/run.py` | 0 (`--report`) | 1 on new key (`:184-207`) | canonical `--report`/`--check`/`--update-baseline` mutex |

`db-consistency/run.py:184-207` is the cleanest of these and is the contract to copy.

### 1.6 Baseline / exception files — two different shapes

- **Keyed-list baseline** (net-new detection): `check-dead-controls.js:803-805` subtracts a
  `Set` of `findingKey(f)`; `check-control-ux.js:437-442` keys on
  `` `${block}:${violation}:${attr}` `` and `:506-508` subtracts;
  `db-consistency/run.py:97-113` stores a flat JSON list of `Violation.key`
  (`db-consistency/models.py:15-30`, with per-check key factories at `:37-80`);
  `check-box-family-guard.py:33-42` stores `{"hash":…, "keys":[…]}`.
- **Nested reason map** (exception, not baseline):
  `audit-inspector-conformance.js:46-49` — `{ "sgs/block": { "ruleKey": { "reason": … } } }`
  — applied at `:368-384`, and a matched pair is reported with `status: 'EXCEPTION'` rather
  than removed, so it stays visible in the report.

The nested-reason shape is better (a reason is mandatory, and exceptions remain visible);
the keyed-list shape is better for dedup and for `--update-baseline`. The unified scanner
should take **both**: keyed identity from the list shape, mandatory reason from the map
shape.

Live sizes: `inspector-conformance-baseline.json` 1.6KB, `dead-controls-baseline.json`
423B, `duplicate-controls-baseline.json` 3B (`{}`), `control-ux-baseline.json` 321B,
`hardcoded-render-defaults-baseline.json` 812B, `box-family-guard-baseline.json` 95B.

### 1.7 Reporting

Two output modes everywhere: human (`printHuman`, e.g.
`audit-inspector-conformance.js:507-555`) and `--json` with a `_meta` header
(`audit-inspector-conformance.js:487-505`, `:585-586`;
`check-element-manifest-conformance.js:711-733`). Findings are flat objects with
`{block, rule|check, severity, detail}` plus `status`. `db-consistency` adds the field the
JS side lacks: **`fix`** — "plain-English fix command a non-coder can act on"
(`db-consistency/models.py:22`, produced at `check_orphan_roles.py:53-58`). Given Bean is
the QC layer, `fix` should be mandatory in the unified format, not optional.

---

## 2. What is duplicated, and what is genuinely unique

### 2.1 The duplication (ranked by cost)

**#1 — the whole consumption analysis exists twice, in two languages.**
`audit-block-file-consistency.py` (50KB) is a Python re-implementation of
`check-dead-controls.js` (40KB). Its own header says so:
`audit-block-file-consistency.py:69-71` — "Ported verbatim from
check-dead-controls.js's PREFIXED_HELPER_SUFFIXES" — and `:72-74`, `:129-135` mirror the
responsive-variant and `KEY_NOISE` rules. Two copies of the same fragile heuristic set,
only one of which is wired, and they will drift. **This is the biggest single duplication
in the tree: ~90KB of parallel logic for one question ("is this attribute consumed?").**

**#2 — `collectControlledAttrs` written three times.**
`check-dead-controls.js:167-223`, `check-control-ux.js:164-198`,
`check-duplicate-controls.js:199`. All three parse `setAttributes({…})` with the same
`/setAttributes\(\s*\{\s*([^}]*)\}/g` regex — which cannot see past the first `}` and so
misses nested object values — plus `attrMap` literals and the house `update('attr', …)`
setter. `check-dead-controls.js:212-220` alone adds the `attr*="name"` JSX-prop shape;
the other two silently lack it, so they under-report on the same files.

**#3 — `stripComments` written four times, identically, and it is known-broken.**
`check-dead-controls.js:256-261`, `check-control-ux.js:135-140`,
`check-universal-fit.js:103-108`, `check-duplicate-controls.js` (same body). STOP-GATE-
COMMENT-STRIPPER (D339d, `.claude/STOP-CATALOGUE.md:685-689`) records the failure: a PHP
string literal containing `/*` swallows the rest of the file, producing both false
positives and **false negatives**. Four copies of one known-defective function.

**#4 — `isConsumed` / `referencesAttr`** — `check-dead-controls.js:268-273` and
`check-universal-fit.js:110-114` are the same word-boundary regex under two names.

**#5 — block.json reading + parse-error handling** re-implemented in every script
(`check-dead-controls.js:282-293`, `check-control-ux.js:461-470`,
`check-duplicate-controls.js:242-252`, `check-element-manifest-conformance.js:676-678`),
with three different failure behaviours (throw / `continue` with stderr / silent skip).

**#6 — the AST walk itself.** `audit-inspector-conformance.js:289-352` traverses each
`edit.js` **twice in one function** (a `JSXOpeningElement` pass at `:289` and a separate
`JSXElement` pass at `:328`). Across the suite an `edit.js` is read from disk by at least
five scripts and Babel-parsed by three. At 84 blocks this is ~420 file reads and ~250
parses per full sweep for what is one parse per file.

**#7 — `check-box-family-guard.py` runs twice per build** (`run-consistency-gates.py:120-125`
and `package.json` `prebuild`).

### 2.2 What each does uniquely (must not be lost)

| Script | Unique, non-duplicated capability |
|---|---|
| `audit-inspector-conformance.js` | Live detection of the framework-wide reduced-motion gate by reading `theme/sgs-theme/functions.php` + the enqueued CSS, with brace-depth conditionality analysis (`:129-216`). The `EXCEPTION`-with-reason status model (`:368-384`). Severity-split gating (`:597-613`). |
| `check-dead-controls.js` | Consumption corpus derived from *directory contents* rather than three filenames (`:296-336`), live-context-key liveness (`:753-774`), the shared-`ContainerWrapperControls` single-validation (`:732,788`), the CHECK-3 extensions surface (`:791-800`), and the only real `--self-test` in the family (`:844-987`). |
| `check-duplicate-controls.js` | Genuine AST resolution of `onChange` handlers to the attrs they write, with **ternary-exclusivity** so `cond ? <A/> : <B/>` is one slot not two (`:570-589`). Universal-hover-vs-private-hover reasoning incl. the `hideExtensions` / `className:false` opt-outs (`:258-272`). |
| `check-control-ux.js` | Responsive-family detection from block.json pairs (`:208-…`) + the unit-via-SelectControl proximity heuristic (`:36-46`). |
| `check-universal-fit.js` | Extension→block injection mapping derived from the extension source, the per-block universal-panel load ranking, and the no-opt-out architectural finding (`:20-63`). |
| `check-element-manifest-conformance.js` | The `supports.sgs.elements` manifest resolver: declared-cluster forward check, `attrMap` + `native:` paths, the responsive/unit/hover suffix-family claim rule, and backwards **ORPHAN** scanning (`:1-77`), plus FR-35-5 state counters (`:702-709`). 79 of 84 blocks carry a manifest. |
| `check-hardcoded-render-defaults.js` | The E1–E12 exemption ladder (selector context, variant scope, pseudo-states, `@media`, scoped-`<style>` specificity, Selectors API, HTML-attribute consumption, theme-element divergence). Irreplaceable domain knowledge. |
| `check-simple-surface-cap.js` | `ToolsPanelItem isShownByDefault` counting — "one labelled inspector row = one control", uncapped Advanced. This is a **strictly better** implementation of checklist item 3 than `audit-inspector-conformance.js:451-461`'s ">6 control-like descendants" heuristic. |
| `lint-responsive-controls.py` | Sanctioned-wrapper **discovery** from `src/components/index.js` (`:31-36`) + a `--self-test` that proves fail *and* pass. |
| `build-roster.py` | The DB→roster denominator with the `hideExtensions` opt-out-inversion fix (`:64-101`). |

---

## 3. Load-bearing hazards already hit — the new scanner must not reproduce them

Each is a real incident, not a theoretical risk.

**H1 — fail-open on missing input.** `check-universal-fit.js:443-448` exits **0** with
"cannot run" when `roster.json` is absent. `check-element-manifest-conformance.js:642-656`
exits 0 when `cluster-member-sets.json` is missing or invalid.
`db-consistency/run.py:220` exits 0 in *every* mode including `--check` when the DB is
absent (justified there — the DB is deliberately unversioned — but it is still a green
build over an unmeasured surface). Only `audit-inspector-conformance.js:562-569` gets this
right: missing roster ⇒ exit 1 **in `--check` mode**, with the reason spelled out in a
comment ("a gate whose input vanished has verified nothing"). *Rule for the new scanner:
a missing input is a FAIL in gate mode, always, per-rule.*

**H2 — silent swallow of malformed input.** `audit-inspector-conformance.js:101-108`
(`loadJson`) returns the fallback on any `JSON.parse` throw. A corrupted
`inspector-conformance-baseline.json` therefore degrades to `{}` — every exception silently
un-applied — and a corrupted roster degrades to `null`, which at least trips `:562`.
*Rule: malformed ≠ absent ≠ empty; all three are distinguishable and all three are loud.*

**H3 — the roster is a snapshot that goes stale, and staleness reads as PASS.** Live
today: `sgs/physics-canvas` invisible to the hard gate (§1.2). And the inverse has already
bitten — `build-roster.py:64-77` documents 2026-07-30, when a roster regeneration read the
`hideExtensions` **opt-out** list as a capability, flipped 18 blocks to `animation=true`,
and "turned 18 false-positive WARNs on a fail-closed gate". *Rule: the scanner must
reconcile roster ↔ disk on every run and treat any disagreement as a first-class finding,
not a footnote.*

**H4 — root/directory-only scoping misses the surface where the bug lives.**
`check-dead-controls.js:60-66` records exactly this: CHECK 1 iterates block *directories*
and skips `extensions`, "so … never reaches this surface at all, and neither has any other
guard in this project. That is the exact gap Spec 38's inspector panels … shipped
through." Same class as STOP-41 (a carve-out relocated to an ungated file escapes the
gate) and `a-gate-that-globs-a-directory-is-blind-outside-it`. *Rule: scope is declared
per-rule as an explicit file-set, and the scanner reports the resolved file count so a
silently-narrowing scope is visible.*

**H5 — the naive comment stripper both hides and fabricates findings.**
STOP-GATE-COMMENT-STRIPPER, `.claude/STOP-CATALOGUE.md:685-689`. Four copies live.
*Rule: one stripper, and for JS use the AST's comment table instead of regex (Babel
already gives it for free once we parse).*

**H6 — a gate that cannot fail reads green forever.** Only three of the scripts in scope
ship a `--self-test` (`check-dead-controls.js:989`, `lint-responsive-controls.py`,
`check-simple-surface-cap.js`; plus `audit-feature-parity.py`). STOP-31 requires that
widening a gate's scope is itself plant-tested. `check-dead-controls.js:912-924` shows the
right shape — it confirms the planted defect **landed on disk** before trusting any result
derived from it, because `sed`/write can silently no-op
(`confirm-a-negative-control-landed-before-trusting-it`).

**H7 — a finding collected but not printed.** `db-consistency/run.py:133-140` documents a
shipped bug: Check #8 was collected into `groups` but omitted from `_CHECK_ORDER`, so 45
real findings were invisible in the report while still counting in the total. *Rule: the
report must be generated by iterating the **rule registry**, never a second hand-written
order list.*

**H8 — an orchestrator that discards its child's output.**
`run-consistency-gates.py:94-104` greps the element-manifest checker's stdout for two
summary lines and throws the rest away; `:136-138` then discards its exit code as well.
The gate runs, produces findings, and nobody sees them.

**H9 — `--seed` as a mass-accept escape hatch.** `check-control-ux.js:481-503` writes
*every* current finding into the baseline with an auto-generated reason. Combined with
`check-dead-controls.js:44-45`'s warning ("If it false-positives a legit consumption
pattern, broaden … do NOT dump the finding into the baseline"), this is the exact hole the
baseline discipline exists to close. *Rule: bulk-seed is allowed only at rule
introduction, must stamp `seeded_at` + `rule_version`, and a seeded entry with no
human-written reason is itself reported as a finding.*

**H10 — self-healing / regeneration blinding detection.** `/sgs-update` regenerates the
DB, `build-roster.py` regenerates the roster, `generate-extension-attributes.js` regenerates
`extension-attributes.generated.php` — which `check-dead-controls.js:130-154` then reads as
ground truth, falling back to a *prefix heuristic* when the generated file is missing. A
regeneration that silently changes the input changes the verdict.
`consistency/check-reclassified-keys.py` exists as a "regeneration tripwire"
(`run-consistency-gates.py:145-148`) and is informational-only. *Rule: every generated
input the scanner consumes is fingerprinted (path + mtime + sha256) into the run manifest,
and a rule may not fall back to a weaker heuristic silently — a missing generated input is
H1.*

**H11 — the `&&` chain masks a stage.** STOP-EXIT-CODE-CHAIN
(`.claude/STOP-CATALOGUE.md:660-669`) — guard each stage's exit code explicitly. A
27-command `prebuild` chain is exactly the shape warned about. Collapsing nine of those
commands into one scanner invocation with a per-rule table is a direct mitigation.

**H12 — mode declared in prose drifts from reality.** `audit-feature-parity.py:29-31`
(§0). *Rule: `rules.json` is the only place a mode is written; the scanner prints it and
the `--self-test` asserts prose has not been used as a substitute.*

---

## 4. The unified scanner

### 4.0 Language + placement

**Node, at `plugins/sgs-blocks/scripts/inspector-scan/`.** Reasoning: 18 of the 21 end
conditions are questions about `edit.js` JSX, which only Babel answers reliably; five of the
seven working gates are already Node; and the AST cache (§4.3) is the design's main
performance and correctness lever. Python enforcers are **not rewritten** — they are wired
in as external rules through a subprocess adaptor (§4.2c), so `check-box-family-guard.py`'s
Python-`ast` converter scan and `audit-feature-parity.py`'s DB work stay exactly as built.

The structural precedent already in this repo is `scripts/db-consistency/` — a directory of
sibling check modules loaded by a `run.py`, sharing one `Violation` model and one baseline
(`db-consistency/run.py:48-88`, `models.py:15-30`). The new scanner is that shape, in Node,
with per-rule modes and per-rule baselines added.

### 4.1 Directory layout

```
plugins/sgs-blocks/scripts/inspector-scan/
├── run.js                     # the only entry point; CLI, orchestration, exit code
├── rules.json                 # THE mode + metadata table (§4.6) — data, not code
├── core/
│   ├── roster.js              # roster contract + disk reconciliation (§4.4)
│   ├── sources.js             # AST + text cache; one parse per file (§4.3)
│   ├── components.js          # shared-component model, discovered not hardcoded (§4.5)
│   ├── finding.js             # Finding shape + stable key factories
│   ├── baseline.js            # per-rule baseline load/subtract/update (§4.7)
│   ├── report.js              # human + --json emitters, driven by the registry (H7)
│   └── selftest.js            # the generic plant/confirm/assert harness (§4.9)
├── rules/
│   ├── 01-tab-group.js        # one file per DONE-checklist end condition
│   ├── 03-toolspanel-density.js
│   ├── …
│   └── external/
│       ├── 06-box-family.js   # subprocess adaptor → check-box-family-guard.py
│       └── T1-feature-parity.js
├── baselines/
│   ├── 01-tab-group.json      # one baseline per rule, never a shared bucket
│   └── …
└── fixtures/
    └── <rule-id>/             # per-rule self-test fixtures (synthetic blocks)
```

One baseline per rule is deliberate: a shared baseline lets rule A's accepted debt suppress
rule B's net-new finding if the key shapes ever collide (STOP-17, "key by full identity,
not a tier-blind join").

### 4.2 The rule-plugin interface

**(a) Every rule is a module exporting one object.** Adding an end-condition detector means
adding one file under `rules/` and one row in `rules.json`. `run.js` discovers rules by
reading `rules.json` and requiring the named file — the registry is the roster, so a rule
that exists on disk but is absent from `rules.json` is itself reported (the inverse of H7).

```js
// rules/14-media-upload-check.js — SHAPE ONLY
module.exports = {
  id: '14-media-upload-check',
  checklistItem: 14,
  title: 'Every MediaUpload is wrapped in MediaUploadCheck',
  scope: 'per-block',              // 'per-block' | 'per-file' | 'global'
  needs: [ 'ast:edit.js' ],        // declared inputs — the cache honours these
  run( ctx, block ) { /* returns Finding[] */ },
  selfTest: {                      // §4.9 — mandatory; run.js refuses to load a rule without it
    fixture: 'fixtures/14-media-upload-check',
    mustFlag: [ 'plantedDefect' ],
    mustNotFlag: [ 'wrappedCorrectly', 'noMediaUploadAtAll' ],
  },
};
```

**(b) `ctx` is the shared, read-only run context** — never a file read inside a rule:

```
ctx.roster            // reconciled roster entries (§4.4)
ctx.ast( file )       // cached Babel AST      (§4.3)
ctx.text( file )      // cached raw text
ctx.stripped( file )  // cached comment-stripped text — ONE implementation (H5)
ctx.blockJson( slug ) // cached, parse-error-typed
ctx.components        // discovered shared-component model (§4.5)
ctx.controlledAttrs( slug )  // the ONE collectControlledAttrs, absorbed from
                             // check-dead-controls.js:167-223 (the most complete of the three)
ctx.consumed( attr, slug )   // the ONE consumption test, absorbed from
                             // check-dead-controls.js:268-336
ctx.finding( {...} )  // factory that stamps rule id + stable key
```

**(c) External rules** wrap a standalone script that stays where it is:

```js
module.exports = {
  id: '06-box-family', external: true,
  command: [ 'python', '../check-box-family-guard.py', '--json' ],
  parse( stdout, exitCode ) { /* → Finding[] */ },
  selfTest: { delegate: [ 'python', '../check-box-family-guard.py', '--self-test' ] },
};
```

This satisfies "prefer absorbing proven logic over rewriting it" for the Python side and
kills the double-invocation of `check-box-family-guard.py` (§2.1 #7) at the same time.

**(d) Finding shape** — the JS `{block, rule, severity, detail, status}` model plus
`db-consistency`'s mandatory `fix`:

```
{ rule, checklistItem, block, file, line, severity, detail,
  fix,        // MANDATORY plain-English action — a non-coder must be able to act on it
  key,        // stable dedup identity: rule + block + file + attr/component
  status }    // FLAGGED | EXCEPTION | BASELINED
```

`fix` being mandatory is enforced by the self-test harness, not by review.

### 4.3 The shared parse/AST cache

`core/sources.js` holds three `Map`s keyed by absolute path: raw text, comment-stripped
text, and Babel AST. Every read goes through it, so a file is read once and parsed once per
run regardless of how many rules want it. At 84 blocks × (block.json, edit.js, render.php,
save.js, style.css, view.js) that turns today's ~420 reads / ~250 parses into ~500 reads and
84 parses.

Three properties matter more than the speed:

1. **One parser configuration.** Absorbed from `audit-inspector-conformance.js:275-280`
   (`sourceType: 'module'`, plugins `jsx, classProperties, objectRestSpread,
   optionalChaining, nullishCoalescingOperator`). Every rule sees the same tree.
2. **Parse failure is a first-class finding, not a silent skip.** Today
   `audit-inspector-conformance.js:402-408` records it in `unparseable[]` and the `--check`
   gate at `:597` never looks at it — a block with a syntax error passes every AST rule.
   In the new scanner an unparseable file emits a `parse-error` finding attributed to
   **every** rule that declared `ast:` in `needs`, so the coverage loss is counted where it
   happened.
3. **Comments come from Babel** (`ast.comments`), not the regex at
   `check-dead-controls.js:256-261` — H5 dissolved for JS. The regex stripper survives only
   for PHP/CSS, in one place, with the STOP-GATE-COMMENT-STRIPPER caveat in its docblock and
   a `--self-test` case for the `/*`-in-string-literal shape.

The cache also builds the **run manifest** (H10): for every file and generated input
consumed, `{path, bytes, mtime, sha256}`, emitted in `--json` under `_meta.inputs`. A
regeneration that changes the verdict becomes diff-able after the fact.

### 4.4 The roster contract

`core/roster.js` owns the denominator, and the contract is explicitly *reconciliation*, not
consumption:

1. Read `consistency/roster.json`. Absent or malformed ⇒ **exit 1 in gate mode**
   (`audit-inspector-conformance.js:562-569`'s behaviour, generalised; H1/H2).
2. Enumerate `src/blocks/*/block.json` from disk.
3. Emit `roster-drift` findings for both directions:
   - **on disk, not in roster** — today `sgs/physics-canvas`. Severity `error`: a
     block nothing audits is worse than a block that fails an audit.
   - **in roster, not on disk** — a retired block still in the DB.
4. `ctx.roster` = the **union**, each entry tagged `{inRoster, onDisk, surfaces}`. Rules
   that need DB surface flags (e.g. rule 17 needs `surfaces.animation`) skip disk-only
   entries but do so **with a recorded `skipped-no-surface-data` finding**, never silently.
5. `_meta.denominator` in the report states all three counts (roster / disk / union) so a
   "0 findings across the roster" claim can never again be a claim about the wrong 83.

`build-roster.py` stays as-is — it is the DB→roster generator and is correct; its
`hideExtensions` fix (`build-roster.py:64-101`) is exactly the sort of logic not to
re-derive. The scanner should additionally warn when `roster.json` is older than the newest
`block.json` on disk (the mechanical form of H3).

### 4.5 Shared-component resolution

Generalise `lint-responsive-controls.py:31-36`. `core/components.js` builds, on every run:

- the export map from `src/components/index.js` (20 exports today);
- for each exported component, its own source AST;
- derived facts rules can query, each derived rather than asserted:
  `wrapsResponsiveControl` (imports `ResponsiveControl`/`ResponsiveOverride`),
  `defaultProps` (so `DesignTokenPicker`'s `enableAlpha: true` is **read**, not asserted in
  a comment as at `audit-inspector-conformance.js:15-16`), `writesAttrsFrom` (which props
  carry attr names), `rendersControlKinds`.

Then a rule asking "does this colour control have alpha?" resolves through the component
rather than pattern-matching a tag name, and the day `DesignTokenPicker` changes its
default, the exemption evaporates on its own. Same mechanism serves item 5 (UnitControl),
item 8 (`SgsLinkControl`), item 11 (`ResponsiveControl`), item 12 (`StateToggleControl`) —
four end conditions that are all "did you use the shared component" questions.

A block's **own** `components/` subdir is folded into the same model, scoped to that block
(absorbing `check-duplicate-controls.js:229-240` / `check-control-ux.js:249,360`).

### 4.6 Per-rule gate modes — declared data

`rules.json` is the single source of truth. It is the answer to H12 and to Bean's
"report-only first, then flip each rule individually".

```jsonc
{
  "_meta": { "spec": "35", "checklist": ".claude/plans/spec-35-inspector-DONE-checklist.md" },
  "rules": [
    {
      "id": "14-media-upload-check", "checklistItem": 14, "file": "rules/14-media-upload-check.js",
      "mode": "gate",                       // "gate" | "advisory" | "off"
      "gatingSeverities": [ "error", "warn" ],
      "promotedOn": "2026-07-28",
      "openBacklog": 0
    },
    {
      "id": "01-tab-group", "checklistItem": 1, "file": "rules/01-tab-group.js",
      "mode": "advisory",
      "advisoryReason": "6 of 84 blocks emit any `group=` prop; `group=\"advanced\"` appears nowhere in src/. Backlog must reach 0 before promotion.",
      "openBacklog": 78,
      "promotionCondition": "openBacklog === 0 with every remaining case in baselines/01-tab-group.json carrying a human reason"
    },
    { "id": "19-a11y-pass", "mode": "off",
      "offReason": "manual pass by policy — a11y-validation-feedback-informational-not-gate" }
  ]
}
```

Three modes, and the semantics are strict:

- **`gate`** — findings at `gatingSeverities` that are neither `EXCEPTION` nor `BASELINED`
  set exit 1. Missing inputs for this rule ⇒ exit 1 (H1).
- **`advisory`** — findings printed, counted, never affect the exit code. `advisoryReason`
  is **required** and non-empty; `run.js` refuses to start if an advisory rule lacks one.
- **`off`** — not executed; `offReason` required; still listed in the report so it cannot
  disappear quietly.

`run.js --modes` prints the visible advisory list Bean asked for:

```
MODE TABLE (24 rules)
GATE      (6):  03 07 08 13 14 17
ADVISORY (16):  01  tab-split via `group` — 6/84 blocks emit any group prop; backlog 78
                02  element-first panels — no detector for panel↔part mapping yet; backlog n/a
                05  real units — UnitControl adoption at N/84; backlog M
                …
OFF       (2):  19 a11y (manual by policy) · 20 pattern templateLock (pattern audit owns it)
```

Promotion is a one-line edit to `rules.json` (`"mode": "advisory"` → `"gate"`) plus a
`promotedOn` date — no code change, no chain edit in `package.json`. That is the whole
point of making mode data.

### 4.7 Per-rule baselines

`baselines/<rule-id>.json`, one file per rule, in the hybrid shape:

```jsonc
{
  "_meta": { "rule": "14-media-upload-check", "ruleVersion": 3, "updated": "2026-08-03" },
  "entries": [
    { "key": "14|sgs/hero|edit.js|MediaUpload@212",
      "reason": "…why this is genuinely acceptable…",     // MANDATORY, human-written
      "seededAt": null,                                    // non-null ⇒ bulk-seeded, unreviewed
      "expires": "2026-09-30" }                            // optional
  ]
}
```

Rules:

- Identity is the full tuple (`rule|block|file|locus`) — STOP-17.
- A `reason` shorter than a threshold, or matching the auto-generated seed template
  (`check-control-ux.js:492`'s "Baselined on seed run …"), produces a
  `baseline-reason-missing` finding at the rule's own severity. This closes H9.
- `--update-baseline <rule-id>` is **per-rule and explicit**; there is no global
  `--seed`.
- `ruleVersion` bumps invalidate the baseline: when a detector is widened (STOP-31), old
  accepted keys are re-presented for review rather than silently carried.
- Expired entries are reported.

### 4.8 Reporting format

Human output is generated **by iterating `rules.json`** — never a second order list (H7).
Every rule appears, including the ones with zero findings and the ones that are `off`, so a
rule that stopped producing output is visible as a suspicious zero rather than an absence.

```
[inspector-scan] Spec 35 — 24 rules · denominator: roster 83 / disk 84 / union 84
INPUTS: roster.json (2026-08-01 01:55, sha 9f2c…) · cluster-member-sets.json (…) · …

DRIFT (1 error)
  sgs/physics-canvas — on disk, absent from roster.json. Not audited by any roster-keyed
    rule. FIX: python scripts/consistency/build-roster.py

RULE 14 media-upload-check           [GATE]      0 flagged · 1 baselined · 0 exception
RULE 03 toolspanel-density           [GATE]      0 flagged
RULE 01 tab-group                    [ADVISORY]  78 flagged   (advisory: backlog must reach 0)
  sgs/accordion   src/blocks/accordion/edit.js:41
    InspectorControls with no `group` prop — Settings/Styles/Advanced not routed.
    FIX: add group="settings" to the behaviour panel and group="styles" to the appearance panel.
  …
RULE 19 a11y-pass                    [OFF]       manual pass by policy

SUMMARY  gate rules: 6 · gating findings: 0 → PASS
         advisory findings: 214 across 16 rules (never gate)
         off: 2
```

`--json` emits `{_meta:{denominator, inputs, modes}, rules:[…], findings:[…]}` — with
`_meta.modes` mirroring `rules.json` so a consumer can tell advisory from gating without
re-reading the table. Machine output is what the future "backlog reaches zero" tracking
reads, so it must carry `openBacklog` per rule computed live, not the value cached in
`rules.json` (that value is documentation; the report recomputes and flags divergence).

### 4.9 The generic `--self-test`

Bean's requirement — every rule ships proof it can still fail — is met by a **harness**, so
a rule author writes fixtures and expectations, not test plumbing. The harness generalises
`check-dead-controls.js:844-987`, which is the best example in the tree.

`node run.js --self-test [rule-id]` does, per rule:

1. **Materialise** the rule's fixture directory into a temp dir — a synthetic block
   (`block.json` + `edit.js` + whatever the rule's `needs` declares) containing at least
   one **planted defect** and at least one **negative control** (a correct construct that
   must not flag), plus any documented exemption case.
2. **Confirm the plant landed on disk** — read the fixture back and assert the defect text
   is present before trusting anything derived from it
   (`check-dead-controls.js:912-924`; memory
   `confirm-a-negative-control-landed-before-trusting-it`). A fixture whose plant is absent
   is a self-test FAIL, not a pass.
3. **Run the rule** against the temp dir with an isolated empty baseline and empty shared
   corpus, so the result cannot come from unrelated real files.
4. **Assert** `mustFlag` all flagged and `mustNotFlag` none flagged. Additionally assert
   every emitted finding carries a non-empty `fix` and a well-formed `key`.
5. **Baseline-suppression test** — re-run with the planted defect's key in the baseline and
   assert it becomes `BASELINED` and stops gating. This proves the *baseline path* works,
   which nothing tests today.
6. **Mode test** — run the rule forced to `advisory` and assert exit 0 despite the flag;
   forced to `gate` and assert exit 1. This is the structural proof that §4.6's mode data is
   load-bearing rather than decorative (the `check-control-ux.js:535` bug, where `--check`
   changes nothing, is exactly what this catches).
7. **Live scan, informational** — run the rule against the real tree and print what it
   finds, so "zero findings" has evidence behind it rather than an assumption.

`run.js --self-test` with no argument runs all rules and **fails if any rule has no
`selfTest` block** — a rule cannot be registered without one. External rules delegate to
the wrapped script's own `--self-test`
(`check-box-family-guard.py`, `audit-feature-parity.py`, `lint-responsive-controls.py`
already have one).

The harness itself needs a negative control: one deliberately broken meta-fixture
(`fixtures/_harness/always-passes-rule.js` — a rule that never flags anything) which the
harness must report as FAILING its own `mustFlag`. Without that, the harness is a gate that
cannot fail (H6 applied to the tester).

---

## 5. Rule roster mapped to the 21 + 3 end conditions

Proposed initial `rules.json`. "Source" names the logic to absorb; "new" means genuinely no
detector exists.

| # | End condition | Source of logic | Initial mode |
|---|---|---|---|
| 1 | Tab split via `group` | **new** (trivial AST: `InspectorControls` `group` prop) | advisory — 6/84 blocks emit any `group=`; `group="advanced"` absent from `src/` |
| 2 | Element-first panels | **new** (needs `supports.sgs.elements` ↔ panel-structure mapping; `check-element-manifest-conformance.js` supplies the manifest half) | advisory |
| 3 | ToolsPanel on dense panels | **`check-simple-surface-cap.js`** row-counting (better than `audit-inspector-conformance.js:451-461`) | advisory until re-baselined on the better counter, then gate |
| 4 | Alpha + clearable colour | `audit-inspector-conformance.js:296-301` + `report-colour-alpha.py`, re-based on §4.5 component resolution | gate (already gating) |
| 5 | Real units / token scale | **new**, but §4.5 makes it cheap (`UnitControl` vs raw `RangeControl` on length attrs) | advisory |
| 6 | 4-value props are box-families | external → `check-box-family-guard.py` | gate (already gating) |
| 7 | Real builders (shadow/border) | `audit-inspector-conformance.js:315-321` + `ShadowControl` resolution | advisory (fuzzy today: label regex) |
| 8 | LinkControl for links | `audit-inspector-conformance.js:303-309` + `SgsLinkControl` resolution | gate (already gating) |
| 9 | Full image controls | external → `audit-feature-parity.py` | gate (already gating) |
| 10 | Multi-item data array-shaped | external → `audit-feature-parity.py` + `MediaGalleryPicker` resolution | advisory |
| 11 | 768/1024 device switcher | external → `lint-responsive-controls.py` (+ `check-control-ux.js` check (a)) | gate (already gating) |
| 12 | StateToggleControl for states | **new** via §4.5 + `check-duplicate-controls.js:258-272` hover reasoning | advisory |
| 13 | hideExtensions for irrelevant universals | **`check-universal-fit.js`** load-ranking + inappropriate-fit | advisory (informational by design) |
| 14 | MediaUploadCheck | `audit-inspector-conformance.js:311-313,432-439` | gate (already gating) |
| 15 | No duplicated native-supports panel | `check-duplicate-controls.js` CHECK 1/2/3 | advisory (never wired ⇒ unknown backlog) |
| 16 | Native over hand-rolled | external → `audit-feature-parity.py` | advisory |
| 17 | Reduced-motion gate | `audit-inspector-conformance.js:110-216,464-478` | gate (already gating) |
| 18 | Decorative-image + ARIA-label | **new** | advisory |
| 19 | A11y pass | — | **off** (policy: informational, never a gate) |
| 20 | Client patterns `templateLock` | **new** (theme `patterns/*.php` scan; `check-dead-pattern-attrs.py` already parses that markup) | advisory |
| 21 | No Part-F anti-patterns | composite of the above + `check-control-ux.js` (b) | advisory |
| T1 | Feature-parity | external → `audit-feature-parity.py` | gate (already gating) |
| T2 | Shrink-to-fit | external → `audit-shrink-to-fit.js` (live DOM) | **off** in the static run; separate `--live` mode |
| T3 | Media-controls competitor set | manual/register | off |

Also always-on, not a checklist item: **`roster-drift`** (§4.4) and **`parse-error`**
(§4.3), both `gate`.

That is 6–8 gating rules from day one (all already gating today, so promotion costs
nothing) and the rest advisory with a stated reason — exactly Bean's "report-only first,
flip individually" shape.

---

## 6. Absorb / keep standalone / migration order

### ABSORB into `inspector-scan/` (script deleted afterwards)

| Script | Why | Rewrite or port? |
|---|---|---|
| `audit-inspector-conformance.js` | It *is* the prototype: roster-keyed, Babel, exception-with-reason, severity-split gating. Its six rules become six rule files. | **Port** the rules verbatim; the reduced-motion theme detector (`:110-216`) ports whole — do not re-derive it. |
| `check-duplicate-controls.js` | Never wired; its AST `onChange` resolution + ternary-exclusivity (`:542-591`) is the best writer-resolution in the tree and belongs in `ctx.controlledAttrs`. | **Port**, and the port is what finally wires it. |
| `check-control-ux.js` | Two rules (responsive-family, unit-select) that are §4.5 questions; its `collectSetAttrsKeys` (`:164-198`) is a weaker duplicate to delete, and its `--seed`/exit-code bugs (`:481-503`, `:535`) are fixed by the shared contract. | **Port the two detectors; discard the plumbing.** |
| `check-universal-fit.js` | Never wired; supplies item 13. | **Port**. |
| `check-simple-surface-cap.js` | Its ToolsPanel row-counter is the correct implementation of item 3. | **Port the counter**; keep the FR-37-27 cap rule as its own rule with its own mode. |
| `check-element-manifest-conformance.js` | Supplies item 2 and is currently reduced to two grep'd summary lines by the orchestrator (H8). Absorbing it restores its output. | **Port**. |
| `consistency/report-colour-alpha.py` | Informational half of item 4, duplicated by the ported rule 4. | Retire after rule 4 is re-baselined. |

### KEEP standalone, wired as external rules

| Script | Why it stays out |
|---|---|
| `check-dead-controls.js` | It is not an *inspector-conformance* rule — it answers "does anything render this attr", spans render.php/save.js/view.js/`includes/`/extensions, and is a proven, currently-gating build guard with a real self-test. Absorbing it would fold a large, differently-scoped corpus model into the scanner for no checklist item. **But `ctx` should import its `collectControlledAttrs` (`:167-223`) and consumption test (`:268-336`) as the shared implementation** — one module, two consumers. |
| `check-hardcoded-render-defaults.js` | Same reasoning, more so: E1–E12 (`:1-70`) is render-side CSS-competition knowledge, not inspector UX. Enormous absorption risk, zero checklist gain. |
| `check-box-family-guard.py` | Python `ast` over the **converter** tree — a different codebase entirely. Wire as external; **and remove its duplicate invocation** (`run-consistency-gates.py:120-125` vs `package.json`). |
| `audit-feature-parity.py` | DB-backed, has `--self-test`, serves items 9/10/16 + T1. External. |
| `lint-responsive-controls.py` | Has `--self-test`, has the discovery pattern §4.5 generalises, serves item 11. External. |
| `audit-shrink-to-fit.js` | Live-DOM Playwright — different runtime, T2. External, `--live` mode only. |
| `consistency/build-roster.py` | The generator, not a checker. Unchanged. |

### DELETE (duplicate of a kept script)

`audit-block-file-consistency.py` — a 50KB Python re-implementation of
`check-dead-controls.js`, never wired, self-declared as a port
(`audit-block-file-consistency.py:69-71`). Before deleting, diff its exemption list
(`:60-80`) against the JS one and port anything the JS lacks — its theme-pattern-markup
consumption rule (`:60-66`) in particular may be a genuine JS gap. **This is the one place
a genuine rewrite is warranted in the other direction**: fold its extra exemptions into
`check-dead-controls.js`, then delete the Python.

### Migration order

1. **Scaffold with zero rules.** `run.js`, `rules.json`, `core/*`, `--self-test` harness +
   its meta-fixture. Prove the harness can fail. *Nothing wired yet.*
2. **Port `audit-inspector-conformance.js`'s six rules**, all in `gate` mode (they already
   gate, so behaviour is unchanged), baselines migrated from
   `inspector-conformance-baseline.json` split per rule. Replace the `prebuild` entry with
   `node scripts/inspector-scan/run.js --check`. Delete the old script.
   **Verification: byte-identical finding set before/after on the current tree.**
3. **Turn on `roster-drift` + `parse-error`** as gating rules. This immediately surfaces
   `sgs/physics-canvas` — the first real value the scanner delivers.
4. **Wire the four external rules** (box-family, feature-parity, responsive-controls,
   shrink-to-fit-as-`off`). Remove the duplicate `check-box-family-guard.py` invocation and
   the now-redundant `prebuild` entries.
5. **Absorb the three never-wired JS gates** (duplicate-controls, universal-fit,
   simple-surface-cap) as `advisory`. First run produces the real backlog numbers for
   `rules.json`.
6. **Absorb element-manifest-conformance**, removing `run-consistency-gates.py:135-138`'s
   summary-grep (H8).
7. **Absorb control-ux's two detectors**; delete `check-control-ux.js` and its `--seed`.
8. **Write the 7 genuinely-new detectors** (items 1, 2, 5, 12, 18, 20, and the item-21
   composite), each `advisory` on arrival.
9. **Fold `audit-block-file-consistency.py`'s extra exemptions into
   `check-dead-controls.js`**, then delete the Python.
10. **Promote rules individually** as each backlog hits zero — a one-line `rules.json` edit
    with a `promotedOn` date.

Steps 1–4 leave the build's gating behaviour *exactly* as it is today while collapsing nine
`prebuild` chain entries into one (mitigating H11); every subsequent step only adds
advisory signal until Bean chooses to promote.

---

## 7. The single riskiest part of this design

**Step 2 — porting the six currently-gating rules while claiming equivalence.**

Everything else is additive: a new advisory rule that is wrong prints noise. Step 2 is the
only step that can *lose* enforcement, and it can do so while reading green. The specific
mechanism: the ported rules change denominator (roster-only → roster ∪ disk), change
comment-stripping (regex → Babel comment table), change component resolution (hardcoded
name lists → discovered model), and split one exception file into six baselines — four
simultaneous changes to what a rule *sees*. A finding that silently stops being produced is
indistinguishable from a finding that was fixed, and the report will say `PASS` either way.
That is precisely the class the repo has been bitten by:
`a-test-can-pass-the-defect-it-was-written-to-catch`, `a-gate-that-cannot-fail-reads-green-forever`,
and `db-consistency/run.py:133-140`'s invisible Check #8.

The mitigation is a **hard equivalence gate on step 2**, before the old script is deleted:
run both implementations over the identical tree, `--json` both, and diff the finding sets
by key. Any difference must be explained, in writing, as either (a) a deliberate
denominator/scope widening — in which case the *new* findings are listed individually — or
(b) a defect in the port. A step-2 commit with an unexplained delta does not land. Deleting
`audit-inspector-conformance.js` happens in a **separate, later commit** than the one that
adds the port, so the comparison is reproducible from git rather than from a claim in a
report.

Second-order risk worth naming: `@babel/parser` is an **undeclared** dependency (§1.3) and
the whole design leans harder on it than today's scripts do. It should be added explicitly
to `devDependencies` in step 1, not assumed to survive the next `@wordpress/scripts` bump.
