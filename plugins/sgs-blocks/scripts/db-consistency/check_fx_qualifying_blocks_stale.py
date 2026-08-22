"""check_fx_qualifying_blocks_stale.py — Spec 38 fx qualifying-blocks map
staleness guard.

Spec ref: .claude/specs/38-SGS-MOTION-SYSTEM.md §2/§7. Task: "Replace a
hardcoded block roster with a DERIVED one" (2026-07-29), Task 3 — "the
previous hardcoded list went stale within hours... this is the whole point
of the exercise".

WHAT THIS GUARDS
----------------------------------------------------------------------------
scripts/generate-fx-qualifying-blocks.py computes a block -> qualifying-
effects map from THREE live sources: every block.json's containerKind/
fx.draggable/fx.pairedFilter support flags, every edit.js's RichText usage,
and the `fx_effects` DB table's scope/requires columns. It writes that map
to ONE shipped artefact:
  - src/blocks/extensions/generated-fx-qualifying-blocks.json (JS consumer)

⛔ There is no PHP mirror. includes/generated-fx-qualifying-blocks.php was
deleted: nothing required it and `sgs_get_fx_qualifying_blocks()` had zero
callers, so it regenerated on every run purely to be dead code. Do not
reinstate it — Spec 38 recommends deletion.

Any of the following can silently invalidate those artefacts WITHOUT the
generator being re-run:
  (a) a block.json gains/loses a containerKind or fx.* support flag
  (b) a block's edit.js starts/stops using RichText
  (c) a new block is added or an existing one is deleted
  (d) fx_effects.scope/requires drifts (already caught by
      check_motion_fx_reseed.py, but this check catches the DOWNSTREAM
      effect on the qualifying-blocks map specifically)

This guard recomputes the map fresh (calling the generator's own
`compute_map()` — never a second hand-rolled copy of the derivation logic,
same anti-drift rationale as check_motion_fx_reseed.py importing FX_EFFECTS
from the seeder) and compares it BYTE-FOR-BYTE against what the two shipped
files actually contain. Any difference means someone changed a source input
and forgot to re-run the generator — exactly the "went stale within hours"
failure this task exists to prevent.

A GATE THAT CANNOT FAIL READS GREEN FOREVER (project rule) — --self-test
proves this guard actually detects drift by injecting one, then reverting it.
"""
from __future__ import annotations

import importlib.util
import json
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

try:
    from .models import Violation, motion_fx_qualifying_key
except ImportError:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from models import Violation, motion_fx_qualifying_key  # type: ignore[no-redef]

_GENERATOR_PATH = Path(__file__).resolve().parents[1] / "generate-fx-qualifying-blocks.py"

if not _GENERATOR_PATH.exists():
    raise ImportError(
        f"[check_fx_qualifying_blocks_stale] Cannot find generate-fx-qualifying-blocks.py "
        f"at {_GENERATOR_PATH}."
    )

_spec = importlib.util.spec_from_file_location(
    "sgs_generate_fx_qualifying_blocks", str(_GENERATOR_PATH)
)
_generator_mod = importlib.util.module_from_spec(_spec)  # type: ignore[arg-type]
try:
    _spec.loader.exec_module(_generator_mod)  # type: ignore[union-attr]
except Exception as exc:  # noqa: BLE001
    raise ImportError(
        f"[check_fx_qualifying_blocks_stale] Failed to load generate-fx-qualifying-blocks.py: {exc}"
    ) from exc

for _sym in ("compute_map", "JSON_OUTPUT"):
    if not hasattr(_generator_mod, _sym):
        raise ImportError(
            f"[check_fx_qualifying_blocks_stale] generate-fx-qualifying-blocks.py has no "
            f"'{_sym}' symbol — cannot verify staleness."
        )


def _read_json_map(path: Path) -> dict[str, list[str]] | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def run(conn: sqlite3.Connection) -> list[Violation]:  # noqa: ARG001 — conn unused, kept for the shared check interface
    """Run the fx qualifying-blocks staleness guard.

    Returns
    -------
    list[Violation] — empty when the shipped JSON exactly matches a fresh
                      recomputation from block.json/edit.js/fx_effects.
    """
    violations: list[Violation] = []

    try:
        fresh_map = _generator_mod.compute_map()
    except SystemExit:
        violations.append(Violation(
            check="fx_qualifying_blocks_stale",
            block="(all)",
            detail=(
                "generate-fx-qualifying-blocks.py could not compute the map (fx_effects "
                "table missing or DB unreachable) — cannot verify the shipped artefact "
                "is current."
            ),
            fix="Run python plugins/sgs-blocks/scripts/seed-motion-fx-registry.py, then "
                "python plugins/sgs-blocks/scripts/generate-fx-qualifying-blocks.py",
            key=motion_fx_qualifying_key("(all)", "compute-failed"),
        ))
        return violations

    shipped_json_path: Path = _generator_mod.JSON_OUTPUT
    shipped_map = _read_json_map(shipped_json_path)

    if shipped_map is None:
        violations.append(Violation(
            check="fx_qualifying_blocks_stale",
            block="(all)",
            detail=f"{shipped_json_path.name} does not exist or is not valid JSON.",
            fix="Run python plugins/sgs-blocks/scripts/generate-fx-qualifying-blocks.py",
            key=motion_fx_qualifying_key("(all)", "missing-artefact"),
        ))
        return violations

    if shipped_map != fresh_map:
        all_blocks = sorted(set(shipped_map) | set(fresh_map))
        for block_slug in all_blocks:
            shipped_effects = shipped_map.get(block_slug)
            fresh_effects = fresh_map.get(block_slug)
            if shipped_effects != fresh_effects:
                violations.append(Violation(
                    check="fx_qualifying_blocks_stale",
                    block=block_slug,
                    detail=(
                        f"generated-fx-qualifying-blocks.json is STALE for {block_slug}: "
                        f"shipped={shipped_effects!r} but block.json/edit.js/fx_effects "
                        f"currently compute {fresh_effects!r}. Something changed a source "
                        f"input (containerKind, fx.draggable/pairedFilter support, RichText "
                        f"usage in edit.js, or fx_effects.scope/requires) without "
                        f"re-running the generator."
                    ),
                    fix="Run python plugins/sgs-blocks/scripts/generate-fx-qualifying-blocks.py "
                        "and commit the regenerated files.",
                    key=motion_fx_qualifying_key(block_slug, "stale"),
                ))

    return violations


def _self_test() -> int:
    """Inject a violation, prove run() catches it, then revert. A gate that
    cannot fail reads green forever (project rule) — this is the structural
    proof it can."""
    con = sqlite3.connect(":memory:")  # run() ignores conn; DB access happens
                                        # inside compute_map() via its own DB_PATH.
    try:
        baseline_violations = run(con)
        if baseline_violations:
            print(
                f"[check_fx_qualifying_blocks_stale --self-test] FAIL — expected 0 baseline "
                f"violations, got {len(baseline_violations)}. Run "
                f"generate-fx-qualifying-blocks.py first."
            )
            for v in baseline_violations:
                print(f"    {v.key}: {v.detail}")
            return 1
        print("[check_fx_qualifying_blocks_stale --self-test] baseline: 0 violations (clean) — OK")

        json_path: Path = _generator_mod.JSON_OUTPUT
        original_text = json_path.read_text(encoding="utf-8")

        # Inject: corrupt the shipped JSON by removing one qualifying block's
        # entry entirely (simulates a block.json edit that changed its
        # provisions without the generator being re-run).
        original_map = json.loads(original_text)
        target_block = next(iter(original_map))
        corrupted_map = dict(original_map)
        del corrupted_map[target_block]
        json_path.write_text(
            json.dumps(corrupted_map, indent="\t", sort_keys=True) + "\n", encoding="utf-8"
        )
        print(f"[check_fx_qualifying_blocks_stale --self-test] injected: removed {target_block!r} from the shipped JSON")

        injected_violations = run(con)
        caught = [v for v in injected_violations if v.block == target_block]

        # Revert BEFORE asserting, so a failed assertion never leaves the
        # shipped artefact corrupted.
        json_path.write_text(original_text, encoding="utf-8")
        print(f"[check_fx_qualifying_blocks_stale --self-test] reverted: {target_block!r} restored")

        if not caught:
            print(
                "[check_fx_qualifying_blocks_stale --self-test] FAIL — the guard did NOT "
                "detect the injected staleness. This gate would read green forever. Fix the check."
            )
            return 1
        print(f"[check_fx_qualifying_blocks_stale --self-test] caught {len(caught)} violation(s) for the injected drift — OK")

        post_revert_violations = run(con)
        if post_revert_violations:
            print(
                f"[check_fx_qualifying_blocks_stale --self-test] FAIL — {len(post_revert_violations)} "
                f"violation(s) remain after revert; the artefact may be left inconsistent."
            )
            return 1
        print("[check_fx_qualifying_blocks_stale --self-test] post-revert: 0 violations (clean) — OK")

        print("[check_fx_qualifying_blocks_stale --self-test] PASS — guard can fail, and correctly reverts to clean.")
        return 0
    finally:
        con.close()


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        raise SystemExit(_self_test())

    _con = sqlite3.connect(":memory:")
    try:
        _violations = run(_con)
    finally:
        _con.close()
    if not _violations:
        print("[check_fx_qualifying_blocks_stale] 0 violations.")
        raise SystemExit(0)
    for _v in _violations:
        print(f"[{_v.key}] {_v.block}: {_v.detail}\n  Fix: {_v.fix}")
    raise SystemExit(1)
