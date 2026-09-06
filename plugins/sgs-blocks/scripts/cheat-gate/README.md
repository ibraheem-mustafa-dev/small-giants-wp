# `cheat-gate/` — the F5 cheat-detection gate

**What it is.** A static scanner that fails a commit when the converter starts taking a
shortcut instead of genuinely converting. It encodes the project's 7 non-negotiable rules
(root `CLAUDE.md`) as executable checks, so "no cheats" is enforced rather than asserted.

Spec ref: Spec 31 §7a / §12.7 (F5).

---

## Entry point

```bash
python plugins/sgs-blocks/scripts/cheat-gate/run.py                    # --report (default), exit 0
python plugins/sgs-blocks/scripts/cheat-gate/run.py --check            # exit 1 on any NEW violation
python plugins/sgs-blocks/scripts/cheat-gate/run.py --update-baseline  # grandfather current keys
python plugins/sgs-blocks/scripts/cheat-gate/run.py --run-dir <path>   # supply a pipeline-state run dir
```

`--check` is the gating mode and runs from `.githooks/sgs-gates.sh` on commit.

---

## Structure

| Path | Role |
|---|---|
| `run.py` | Runner. Loads each check module, groups findings, applies the baseline, decides the exit code. |
| `models.py` | The shared `Violation` shape every check returns. |
| `check_*.py` | One module per check — the actual detection logic. **Eight of them.** |
| `cheat-gate-baseline.json` | A JSON list of violation KEYS that are grandfathered. |
| `tests/` | Per-check tests. |

### The eight checks

Registered in `_CHECK_ORDER` in `run.py`, which is the authoritative list:

`slug_literal` · `hardcoded_dict` · `important_render` · `parallel_bp` · `d2_when_d1` ·
`sentinel` · `bound_emit` · `converter_source`

⚠ **`run.py`'s own docstring says "7 Checks implemented". It loads and runs EIGHT** — there
are 8 `check_*.py` files, 8 `_load_sibling( "check_…" )` calls and 8 entries in
`_CHECK_ORDER`. The docstring is stale. Read `_CHECK_ORDER`, not the prose; this repo has
several headers that are provably false about their own wiring.

### Check #5 is not here, and that is deliberate

The numbering in the report skips to #9 because **check #5 (mirror-emit / `sourceMode='bound'`
/ BEM-element `className`) lives in `orchestrator/check_no_mirror.py`**, wired via
`pipeline-stage-gate.py`. It needs converter OUTPUT (`extract.json`) rather than source text,
so it runs post-Stage-9 in the cloning pipeline instead of at commit time. `run.py` prints a
note saying so on every run rather than letting the gap look like an omission.

---

## How the baseline works

A violation is identified by a stable `key` string. Keys already in
`cheat-gate-baseline.json` are treated as known legacy debt: `--report` still prints them
(marked `[baselined]`), `--check` does not fail on them. **Only a NEW key fails the gate.**

STOP-14 requires the gate to be GREEN immediately after `--update-baseline`. Legacy
violations are baselined, not deleted — they disappear as the code that causes them is
replaced.

⚠ **`--update-baseline` is not a way to make a finding go away.** It grandfathers whatever
exists at that moment. If you baseline a genuine new cheat you have disabled the check for
that cheat permanently and silently. Fix the finding; baseline only a deliberate,
recorded carry-over.

---

## Adding a check

1. Write `check_<name>.py` exposing the same interface the existing eight use (read one for
   the shape — they return a list of `Violation`).
2. Add a `_load_sibling( "check_<name>" )` line in `run.py`.
3. **Add the name to `_CHECK_ORDER`** and give it a label in `_CHECK_LABELS`.
4. Add a test under `tests/`, including a fixture that the check MUST flag. A check with no
   must-flag fixture cannot be shown to still work — a silently-disabled rule returns zero
   findings, which is indistinguishable from a clean tree.

⚠ **There is no unregistered-check guard.** Unlike `inspector-scan/`, which enforces
registration via `rules.json` plus a mandatory `selfTest` export, nothing here notices a
`check_*.py` that exists but was never added to `_CHECK_ORDER` — it would simply never run,
silently. **All 8 modules are wired today**, so this is a latent hazard with zero live
instances, not a current defect. If you add a ninth check, step 3 is the one that actually
matters.

---

## Reading a finding

Each violation prints a File, a Problem, a Fix and a Key. The Fix line is specific and
usually correct — but it is a suggestion written when the check was authored, not a verdict
about your change. Confirm the finding against the code before acting on it.
