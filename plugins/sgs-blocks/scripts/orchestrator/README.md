# `orchestrator/` — the cloning pipeline's stage machinery and gates

**What it is.** The modules the cloning pipeline calls between converting a draft section and
landing it on a WordPress page: the pre-flight chain, the anti-cheat gates that run on
converter OUTPUT, the apply modules that stage changes without auto-mutating a live site, and
the autonomy gate that decides whether a run may proceed unattended.

It is **not** the converter. That lives in `scripts/converter/`. The orchestrator entry point
is one level up: `scripts/sgs-clone-orchestrator.py`.

⛔ `orchestrator/converter_v2/` was **deleted at D276 (2026-07-05)**. Several things still
reference that path — Gate A's trigger did until 2026-08-24, and the F5 baseline still carries
7 keys pointing at `converter_v2/convert.py`. If you find a reference, it is a fossil.

---

## Entry points

These are called by `sgs-clone-orchestrator.py`, not usually by hand:

```bash
python plugins/sgs-blocks/scripts/orchestrator/pipeline-stage-gate.py --run-dir <run>
python plugins/sgs-blocks/scripts/orchestrator/check_no_mirror.py --update-baseline
python plugins/sgs-blocks/scripts/orchestrator/check_flat_tier_regression.py
```

---

## Structure, grouped by role

**Gates — run on converter OUTPUT, and HARD-HALT the clone before deploy**

| File | What it stops |
|---|---|
| `pipeline-stage-gate.py` | The wrapper both gates below run inside (R-31-15). |
| `check_no_mirror.py` | The mirror cheat — a draft-class container, or a `sourceMode='bound'` emit not in the baseline. This is **cheat-gate's check #5**, homed here because it needs `extract.json` rather than source text. |
| `check_flat_tier_regression.py` | A flat tier emitted for a property already migrated to the object shape (Spec 35 / D554-C). **No shim and no baseline, by design** — every violation blocks. |
| `check-no-mirror-baseline.json` | The mirror gate's grandfathered keys. |

**Pipeline stages and chain**

`orchestrator_main.py` (the autonomy chain) · `preflight_chain.py` · `staged_merge.py` ·
`staged_output.py` · `autonomy_gate.py` · `stage1_boundary_hook.py` ·
`register_patterns.py` · `surface_pipeline_logs.py`

**Apply modules — operator-gated by FR21 contract; they stage and emit commands, never
auto-mutate live WordPress**

`media-sideload.py` · `attribute-staged-apply.py` · `functionality-bulk-apply.py`

**Support**

`css_router.py` · `lingua_franca.py` (live-scrape → SGS-BEM conversion) · `mutex.py` ·
`expected_rules.py` · `atomic-block-scaffold.py` · `critical-fix-verification.py` ·
`schemas/`

**Tests** — 17 `test_*.py`, one per module, alongside the code they cover.

---

## Data it reads and writes

**Reads:** `pipeline-state/<run-id>/` artefacts (`extract.json`, `trace.jsonl`, stage JSON),
each block's `block.json`, and `sgs-framework.db`.

**Writes:** into the run directory — staged output, surfaced logs (`errors.log`,
`warnings.log`, `summary.log`), `operator-review.html`, and the gates' baseline files when
explicitly asked.

⚠ The apply modules go to REAL upload mode only when `--deploy-target` is set. Without it they
produce a dry-run inventory and make no network calls.

---

## Why a clone currently hard-halts

If you run the pipeline today against a page using an object-migrated property, it will stop
before deploy with a `check_flat_tier_regression.py` FAIL. **That is D554-C working, not a
fault.** Bean ruled that the converter stays flat while its output gets gated, and explicitly
rejected a temporary shim, so cloning is blocked for migrated properties until Spec 39's
converter rework lands. Measured 2026-08-24: the Mama's homepage produced 97 such violations.

The orchestrator exits **1** in that case and does not deploy. Check the exit code properly —
`cmd ; echo $?` reports the `echo`'s status, not the command's.

---

## Adding a gate

1. Write the check as its own module here, taking a `--run-dir`.
2. Call it from `pipeline-stage-gate.py` so it runs at the Stage-9 boundary with the others.
3. Decide **deliberately** whether it gets a baseline. `check_no_mirror.py` has one because it
   inherited real legacy debt; `check_flat_tier_regression.py` deliberately has none, because
   a baseline there would be a hole rather than a carry-over.
4. Give it a fixture it MUST flag. A gate nobody can show failing is not a gate.
