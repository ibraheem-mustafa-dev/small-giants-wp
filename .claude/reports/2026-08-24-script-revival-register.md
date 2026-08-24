---
doc_type: report
title: Script revival register — built, working, never wired
date: 2026-08-24
status: OPEN — nothing has been wired
source: audit-script-reachability.py + 3 triage agents + 3 QC agents, every verdict verified
---

# Script revival register

**27 scripts that were built, work, and nobody hooked up.** Bean's framing, which set the
whole exercise: *"a lot of the time they had a great use but we forgot to wire them in and
now they look dead but they may not be vestigial so it'd be worth reviving them."*

⛔ **NOTHING HERE HAS BEEN WIRED.** Adding any of these to a build or commit chain changes
what runs on every build and is a separate, deliberate decision each time.

**How this list was produced.** `audit-script-reachability.py` classified 503 scripts by
execution channel; 3 agents triaged the unwired ones; 3 more QC'd every *non*-revival
verdict by reading control flow rather than headers. That QC overturned **13 of 52** — a
25% error rate in the first pass — because agents were judging by directory name and
docstring. Every claim below was then re-verified against the code by the main thread.

---

## Tier 1 — a gate that is already MANDATORY and nobody runs

| Script | Why |
|---|---|
| `scripts/wc-pages-responsive-audit.js` | **Named as gate RA-1 in `.claude/specs/go-live-checklist.md:81`**, by path, with its exact command. RA-2 depends on its screenshots. Covers overflow + 44px targets + JS budget + axe-core WCAG 2.2 AA across 4 WooCommerce page types × 3 viewports. Nothing else in the repo covers that scope. This was sitting in a "not worth reviving" bucket. |

## Tier 2 — live findings sitting unactioned RIGHT NOW

Each was run read-only and produced real, current output.

| Script | Measured today |
|---|---|
| `behavioural-analyser/backfill-coarse-roles.py` | **229 refinements available.** Its own docstring (line 15) says *"Idempotent — re-running finds zero refinements"* — **that sentence is false**, and it is why the first pass filed it as spent. No durable tier exists in `assign-canonical.py`, so a full reseed regenerates all 1,077 coarse rows and needs this again. |
| `extract-comment-narrative.py` | **4,310 candidate lines across 89 files.** The FIND half of a find/fix/gate triad whose other halves never shipped. Working `--self-test`, 8/8. |
| `oracle/decompose_unattributed.py` | Only **29.6% of 582 declared CSS cells are measurable**; 393 land in ATTRIBUTED-NO-PROBE-TARGET. Derives everything live from the production attributor. A real, unresolved cloning-fidelity gap that nothing else surfaces. |
| `census-colour-paint-route.py` | DIRECT 28 / WRAPPER 18 / NEITHER 37 of 83 blocks. **Cited by path at `.claude/plans/phase-colour-conformance.md:285`** of a still-open plan as the documented way to regenerate these numbers. |

## Tier 3 — completed migrations whose regression guard was never wired

Each has a `--check` that exits non-zero, and a self-test. The migration landed; nothing
stops the next edit undoing it.

- `migrate-theme-native-spacing.py` — its own usage text calls itself *"CI gate"*. Schema-driven, so it auto-extends to future blocks. `check-dead-pattern-attrs.py` only *warns* about this class.
- `fanout-overlay-sibling-attrs.py` — guards the WP silent-undeclared-attribute drop (the D338/D704 class) across an 8-block family.
- `migrate-render-closures.py` — stops a new `render.php` reintroducing a local closure that duplicates a shared helper.
- `migrate-length-sanitiser.py` — stops the crude length sanitiser recurring. 18-assertion self-test.
- `colour-codemod/migrate-shadow-mounts.js` — `--check` exits 1 on any unmigrated mount; its own header says *"WRITTEN AS A RE-RUNNABLE TOOL, NOT A ONE-OFF SWEEP (D542)"*.
  ⚠ **Its docstring over-promises**: it advertises a `--self-test` mode that does not exist. Exactly one occurrence of that string in the file — the docstring line. A header can mislead in BOTH directions.

## Tier 4 — checks with no fixture or no wiring

- `oracle/attribution_ground_truth.py` — frozen, independently-written control protecting the fidelity metric's denominator. Fixture is real, at `scripts/tests/fixtures/phase-f/_render-oracle/attribution-ground-truth.json` (a triage agent cited the wrong path; the file exists).
- `qc-correctness-regression.py` — a complete golden-fixture harness for the **whole orchestrator**, not just the converter. **`reports/baselines/` does not exist** — it has never once been seeded.
- `surveys/check-control-parity-live.js` — closes the presence-vs-actually-looks-native gap in the already-wired static parity gate.
- `qa/check-colour-editor-roundtrip.js` — token-slug vs baked-hex and live hover repaint; self-provisioning probe page, "never fabricate a PASS".
- `surveys/audit-css-element-drift.py` — DB-driven drift census, same shape as its already-wired siblings; already caught a real `sgs/hero` bug by hand.
- `motion-qa/probe-horizontal-panel.js` — same shape as the 3 promoted motion probes, missing only a registered fixture page.
- `coverage-matrix/generate-coverage-matrix.py` — Spec 31 §5 coverage dashboard. Its test dir is NOT in prebuild's pytest paths, so it runs on no build.
- `lint-patterns-for-personal-data.py` — the **only** automated check for "never hardcode client data into base patterns". Zero-arg, exit-coded.
- `font-source-audit.js` — CDN font URLs that fail silently on CSP-locked servers. Zero-arg, exit-coded, gate-ready as-is.

## Tier 5 — a real capability gap

- `converter/services/button_group.py` — ported from the frozen engine; **zero callers, confirmed**. Loose `sgs/button` blocks are never auto-wrapped in `sgs/multi-button` on clone. The old engine did this; the new one silently dropped it.

## Tier 6 — generic tools misfiled by their FOLDER, not their code

All argv-driven, no hardcoded target. Disqualified because they live under
`migrate-core-blocks/` and are named `probe-*`.

- `probe-text-equivalence.js` — ⭐ a generic implementation of **CLAUDE.md's own rule 4a** (content-keyed computed-style comparison). Nothing else in the repo does this for arbitrary before/after URLs.
- `probe-columns-responsive.js` · `probe-heading-cascade.js` · `probe-overflow.js` — before/after geometry, cascade dumping, 375px overflow offenders.
- `qa/probe-row-gradient.js` — fully parameterised, self-restoring with a byte-identical restore check.
- `apply-block-attrs-batch.js` — plan-driven, any site/post/block, 7 distinct exit codes. Its header calls it a *"one-off companion … for the Indus homepage task"*; nothing in the code is Indus-specific.
- `qa/probe-native-colour-ui-close.js` — spent for its literal 5 blocks, but named in `.claude/plans/2026-08-23-colour-capability-grant-design.md:202` as the template the next batch generalises. Not disposable.

---

## Sharpened, NOT a revival

- `render-mobile-override-audit.js` → **SUPERSEDED**, proven by running it: `84 blocks audited, 0 critical`. Its defect class (inline style beating a non-`!important` `@media` rule) is now structurally impossible under Spec 32, and `audit-inline-styling.js --check` gates it. A clean detector whose premise was absorbed by an architectural rule.

## Method note — why the QC was worth running

The first triage pass reached its verdicts from docstrings and directory names. It produced
a fabricated evidence path used across eleven verdicts, a "zero references" claim for a
script with five, and two more miscited fixture paths. Its conclusions were often right;
its evidence frequently was not.

The decisive question is not "is it called" but **"if you ran it today, would it do
anything?"** A spent one-shot is inert. A live gate is not.
