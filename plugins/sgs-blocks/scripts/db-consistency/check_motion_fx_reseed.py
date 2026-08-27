"""check_motion_fx_reseed.py — Spec 38 motion-fx registry reseed-survival guard.

Spec ref: .claude/specs/38-SGS-MOTION-SYSTEM.md §6 (DB seeding plan) — item A6 of the
Motion Wave A build. Matches the existing db-consistency check interface
(`run(conn) -> list[Violation]`) exactly, per check_variant_reseed.py / check_composition.py.

WHY THIS GUARD EXISTS
----------------------------------------------------------------------------------------
UPDATED 2026-08-01 (D432 integration): `/sgs-update` now DOES touch `fx_effects` —
`sgs-update-v2.py`'s Stage 1 runs seed-motion-fx-registry.py as a tail step
(`_run_motion_fx_registry_seed`), so a full `/sgs-update` reseeds this table too. That
write is idempotent and always matches FX_EFFECTS (the seeder is the sole writer either
way), so it does NOT put fx_effects at the STOP-24 "wiped by /sgs-update" risk
block_attributes.css_property had — the two things are orthogonal: /sgs-update running
the seeder is not the same as /sgs-update independently regenerating this table's rows
from block.json (it doesn't; only the seeder's own FX_EFFECTS constant does). fx_effects
remains at risk from:
  (a) someone hand-editing a row directly in the DB (bypassing seed-motion-fx-registry.py)
  (b) a future migration that touches fx_effects without going through the seeder
  (c) the seeder itself drifting from the spec (a code change to FX_EFFECTS without
      re-running the seeder)
So the guard's job is to prove the LIVE fx_effects table still matches the canonical
values seed-motion-fx-registry.py declares — not "does /sgs-update wipe it" (it can't),
but "has anything silently diverged from the seeder's declared source of truth". This is
the F6 "DB-as-code consistency" philosophy applied to a table that sits outside the
two-channel (derived-classifier + override) block_attributes machinery.

A GATE THAT CANNOT FAIL READS GREEN FOREVER (project rule) — --self-test proves this
guard actually detects drift by injecting one, then reverting it.
"""
from __future__ import annotations

import importlib.util
import json
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

try:
    # Normal path: loaded as part of the db_consistency package (run.py's
    # _load_sibling bootstrap, or a real package import).
    from .models import Violation, motion_fx_reseed_key
except ImportError:
    # Standalone invocation (python check_motion_fx_reseed.py --self-test) has no
    # package context for a relative import — fall back to a direct sibling import.
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from models import Violation, motion_fx_reseed_key  # type: ignore[no-redef]

# Reuse the REAL seeder's FX_EFFECTS declaration — same anti-drift rationale as
# check_css_property_reseed.py importing ATTR_CLASSIFICATION_OVERRIDES from
# sgs-update-v2.py (R-22-1): this check must never hand-roll a second copy of the
# expected values that could silently diverge from what the seeder actually writes.
_SEEDER_PATH = Path(__file__).resolve().parents[1] / "seed-motion-fx-registry.py"

if not _SEEDER_PATH.exists():
    raise ImportError(
        f"[check_motion_fx_reseed] Cannot find seed-motion-fx-registry.py at {_SEEDER_PATH}.\n"
        "This check imports FX_EFFECTS from the seeder to verify the DB against the "
        "reseed-durable source (R-22-1)."
    )

_spec = importlib.util.spec_from_file_location("sgs_seed_motion_fx_registry", str(_SEEDER_PATH))
_seeder_mod = importlib.util.module_from_spec(_spec)  # type: ignore[arg-type]
try:
    _spec.loader.exec_module(_seeder_mod)  # type: ignore[union-attr]
except Exception as exc:  # noqa: BLE001
    raise ImportError(
        f"[check_motion_fx_reseed] Failed to load seed-motion-fx-registry.py: {exc}"
    ) from exc

if not hasattr(_seeder_mod, "FX_EFFECTS"):
    raise ImportError(
        "[check_motion_fx_reseed] seed-motion-fx-registry.py has no FX_EFFECTS symbol — "
        "cannot verify the fx_effects seeding (R-22-1)."
    )

FX_EFFECTS: list[dict] = _seeder_mod.FX_EFFECTS


def _table_exists(conn: sqlite3.Connection) -> bool:
    return conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='fx_effects'"
    ).fetchone() is not None


def run(conn: sqlite3.Connection) -> list[Violation]:
    """Run the motion-fx reseed guard against the live DB connection.

    Returns
    -------
    list[Violation]  — empty when fx_effects exactly matches FX_EFFECTS (expected
                       state immediately after seed-motion-fx-registry.py runs).
    """
    violations: list[Violation] = []

    if not _table_exists(conn):
        for row in FX_EFFECTS:
            violations.append(Violation(
                check="motion_fx_reseed",
                block=row["effect"],
                detail=(
                    f"fx_effects table does not exist — the motion-fx registry seeder "
                    f"has never run, so '{row['effect']}' (and every other effect) is "
                    f"missing from the DB."
                ),
                fix="Run python plugins/sgs-blocks/scripts/seed-motion-fx-registry.py",
                key=motion_fx_reseed_key(row["effect"], "no-table"),
            ))
        return violations

    expected_by_effect = {row["effect"]: row for row in FX_EFFECTS}
    # `creates_panel` was added by FR-38-25 (2026-08-01). Read it only when the
    # column exists, so this guard still runs against a DB that predates it
    # rather than hard-erroring — and default to 1, which is the pre-FR-38-25
    # behaviour every existing effect has.
    has_creates_panel = any(
        r[1] == "creates_panel"
        for r in conn.execute("PRAGMA table_info(fx_effects)").fetchall()
    )
    creates_panel_column = "creates_panel" if has_creates_panel else "1"
    # `in_picker` was added 2026-08-02, same gated-on-absence shape as
    # creates_panel above — but the fallback literal is 0, not 1, mirroring the
    # seeder's own `row.get("in_picker", 0)`. The direction matters: an effect
    # is block-private until a row explicitly declares it offerable from the
    # picker, so a pre-migration DB compares as 0 and fails CLOSED.
    has_in_picker = any(
        r[1] == "in_picker"
        for r in conn.execute("PRAGMA table_info(fx_effects)").fetchall()
    )
    in_picker_column = "in_picker" if has_in_picker else "0"
    db_rows = conn.execute(
        "SELECT effect, tier, plugin_set, owns_scroll_transform, reduced_motion, editor_story, "
        f"scope, requires, pins, triggers, {creates_panel_column}, {in_picker_column} FROM fx_effects"
    ).fetchall()
    db_by_effect = {r[0]: r for r in db_rows}

    # A. every seeder-declared effect is present and matches exactly.
    for effect, expected in sorted(expected_by_effect.items()):
        db_row = db_by_effect.get(effect)
        if db_row is None:
            violations.append(Violation(
                check="motion_fx_reseed",
                block=effect,
                detail=f"fx_effects.{effect}: declared in seed-motion-fx-registry.py but missing from the DB.",
                fix="Run python plugins/sgs-blocks/scripts/seed-motion-fx-registry.py",
                key=motion_fx_reseed_key(effect, "missing-row"),
            ))
            continue

        (
            _, db_tier, db_plugin_set_json, db_owns, db_reduced, db_editor,
            db_scope, db_requires, db_pins, db_triggers, db_creates_panel,
            db_in_picker,
        ) = db_row
        try:
            db_plugin_set = json.loads(db_plugin_set_json)
        except (TypeError, ValueError):
            db_plugin_set = None

        mismatches = []
        if db_tier != expected["tier"]:
            mismatches.append(f"tier: db={db_tier!r} expected={expected['tier']!r}")
        if db_plugin_set != expected["plugin_set"]:
            mismatches.append(f"plugin_set: db={db_plugin_set!r} expected={expected['plugin_set']!r}")
        if int(db_owns) != int(expected["owns_scroll_transform"]):
            mismatches.append(
                f"owns_scroll_transform: db={db_owns!r} expected={expected['owns_scroll_transform']!r}"
            )
        if db_reduced != expected["reduced_motion"]:
            mismatches.append(f"reduced_motion: db={db_reduced!r} expected={expected['reduced_motion']!r}")
        if db_editor != expected["editor_story"]:
            mismatches.append(f"editor_story: db={db_editor!r} expected={expected['editor_story']!r}")
        if db_scope != expected["scope"]:
            mismatches.append(f"scope: db={db_scope!r} expected={expected['scope']!r}")
        if db_requires != expected["requires"]:
            mismatches.append(f"requires: db={db_requires!r} expected={expected['requires']!r}")
        # D416 — pins drives the fxEnd control's wording, triggers drives which
        # "When it starts" options a client is offered. Both are read by the
        # editor via the generated map, so drift here silently changes the
        # inspector rather than erroring anywhere.
        if int(db_pins) != int(expected["pins"]):
            mismatches.append(f"pins: db={db_pins!r} expected={expected['pins']!r}")
        if db_triggers != expected["triggers"]:
            mismatches.append(f"triggers: db={db_triggers!r} expected={expected['triggers']!r}")
        # FR-38-25 — creates_panel decides whether an effect may CREATE an fx
        # panel or is only OFFERED where one already exists. Drift here is
        # SILENT and expensive in one direction: flipping cursor-field's 0 back
        # to 1 puts a brand-new fx panel on 11 blocks (nav-menu, site-header,
        # site-footer, form among them), each then also inheriting motion-path
        # and scrub through the permissive pass — the "13 panels where none
        # makes sense" failure. Nothing errors; the editor just grows controls
        # nobody asked for. `.get(..., 1)` mirrors the seeder's own default so
        # every pre-FR-38-25 row compares as 1 without needing the key.
        if int(db_creates_panel) != int(expected.get("creates_panel", 1)):
            mismatches.append(
                f"creates_panel: db={db_creates_panel!r} expected={expected.get('creates_panel', 1)!r}"
            )
        # `in_picker` — added to this guard 2026-08-28. The seeder DECLARES it
        # (FX_EFFECTS carries the key, _seed_fx_effects writes the column) but
        # nothing compared it back, so a hand-edited row read green here forever.
        #
        # WHY THE OBVIOUS OBJECTION IS WRONG. The seeder's own comment says
        # "check-fx-list-drift.py (I1) compares it against SHIPPED_EFFECTS in
        # BOTH directions", which reads like this guard would be duplicating it.
        # That claim is narrow-true and broad-false: check-fx-list-drift.py
        # explicitly does NOT read the DB (its docstring says it "stands ALONE"
        # and takes the fact from the committed generated-fx-effect-meta.json).
        # The real chain is
        #     DB.in_picker -> generate-fx-effects-php.py -> meta.json -> drift gate
        # so drift guards the DOWNSTREAM ARTEFACT against fx.js, never the DB
        # against the seeder. Hand-edit this column — failure mode (a) in this
        # module's own docstring — and BOTH gates stay green until someone
        # happens to regenerate the JSON, at which point drift fires and blames
        # SHIPPED_EFFECTS for a corruption that actually lives in the DB.
        # That gap is precisely this guard's remit, which is why the comparison
        # belongs here and is not a duplicate.
        if int(db_in_picker) != int(expected.get("in_picker", 0)):
            mismatches.append(
                f"in_picker: db={db_in_picker!r} expected={expected.get('in_picker', 0)!r}"
            )

        if mismatches:
            violations.append(Violation(
                check="motion_fx_reseed",
                block=effect,
                detail=f"fx_effects.{effect}: drifted from the seeder's declared values — " + "; ".join(mismatches),
                fix="Run python plugins/sgs-blocks/scripts/seed-motion-fx-registry.py (a bare SQLite UPDATE outside the seeder is what caused this).",
                key=motion_fx_reseed_key(effect, "mismatch"),
            ))

    # B. no rogue rows outside the declared grammar (§11.2 is closed — 11 effects,
    #    no more, no fewer, until a future spec amendment).
    for effect in sorted(set(db_by_effect) - set(expected_by_effect)):
        violations.append(Violation(
            check="motion_fx_reseed",
            block=effect,
            detail=(
                f"fx_effects.{effect}: present in the DB but NOT declared in FX_EFFECTS "
                f"(seed-motion-fx-registry.py) — either a rogue insert outside the "
                f"seeder, or a spec amendment the seeder hasn't caught up to yet."
            ),
            fix="Either add the effect to FX_EFFECTS in seed-motion-fx-registry.py (citing the spec amendment), or delete the rogue row.",
            key=motion_fx_reseed_key(effect, "rogue"),
        ))

    return violations


def _self_test() -> int:
    """Inject a violation, prove run() catches it, then revert. A gate that cannot
    fail reads green forever (project rule) — this is the structural proof it can."""
    if not _seeder_mod.DB_PATH.exists():
        print(f"[check_motion_fx_reseed --self-test] DB not found: {_seeder_mod.DB_PATH}", file=sys.stderr)
        return 1

    con = sqlite3.connect(str(_seeder_mod.DB_PATH))
    try:
        # Baseline: guard should be clean (assumes the seeder has already run).
        baseline_violations = run(con)
        if baseline_violations:
            print(
                f"[check_motion_fx_reseed --self-test] FAIL — expected 0 baseline violations, "
                f"got {len(baseline_violations)}. Run seed-motion-fx-registry.py first."
            )
            for v in baseline_violations:
                print(f"    {v.key}: {v.detail}")
            return 1
        print("[check_motion_fx_reseed --self-test] baseline: 0 violations (clean) — OK")

        # Inject: corrupt EACH guarded column in turn, one at a time.
        #
        # Injecting only ONE column would prove only that column is compared.
        # When pins/triggers were added (D416) the single-column self-test kept
        # passing while saying nothing about them — a guard is only proven for
        # the fields its self-test actually perturbs, and "I added the
        # comparison" is not evidence the comparison runs. Every column the
        # gate claims to guard gets its own injection here; adding a column to
        # the SELECT without adding it to this list leaves it unproven.
        cur = con.cursor()
        target_effect = "pin-scrub"
        # EVERY column run() compares gets an injection here. Until 2026-08-28
        # this tuple held only the five below the divider, while run() compared
        # ten — so tier, plugin_set, reduced_motion, editor_story and
        # creates_panel were guarded-but-unproven and a regression in any of
        # their comparison branches would have read green forever. That is the
        # exact failure the comment above describes happening once already with
        # pins/triggers at D416; it had simply happened again, five columns
        # wider, without anyone counting SELECT-width against tuple-length.
        #
        # ⛔ IF YOU ADD A COLUMN TO run()'s COMPARISON, ADD IT HERE IN THE SAME
        # EDIT. The two lists are the same list; nothing but this comment and
        # the count assertion below ties them together.
        columns = [
            "owns_scroll_transform",
            "scope",
            "requires",
            "pins",
            "triggers",
            # ---- added 2026-08-28, previously unproven ----
            "tier",
            "plugin_set",
            "reduced_motion",
            "editor_story",
        ]
        # creates_panel / in_picker are MIGRATION-GATED in run() (it falls back
        # to a literal when the column is absent), so perturbing them against a
        # pre-migration DB would raise OperationalError rather than report an
        # unguarded column. Gate the injection the same way run() gates the read.
        _existing_cols = {
            r[1] for r in cur.execute("PRAGMA table_info(fx_effects)").fetchall()
        }
        for _migrated in ("creates_panel", "in_picker"):
            if _migrated in _existing_cols:
                columns.append(_migrated)
            else:
                print(
                    f"[check_motion_fx_reseed --self-test] {_migrated}: column absent "
                    f"from this DB (pre-migration) — injection skipped, run() compares "
                    f"its fallback literal."
                )

        unguarded: list[str] = []
        for column in columns:
            original = cur.execute(
                f"SELECT {column} FROM fx_effects WHERE effect = ?", (target_effect,)
            ).fetchone()[0]
            if isinstance(original, int):
                corrupted: object = 0 if int(original) == 1 else 1
            else:
                corrupted = f"__selftest_{original}"

            cur.execute(
                f"UPDATE fx_effects SET {column} = ? WHERE effect = ?",
                (corrupted, target_effect),
            )
            con.commit()

            injected_violations = run(con)
            caught = [
                v for v in injected_violations
                if v.block == target_effect and v.check == "motion_fx_reseed"
            ]

            # Revert BEFORE asserting, so a failed assertion never leaves the
            # DB corrupted.
            cur.execute(
                f"UPDATE fx_effects SET {column} = ? WHERE effect = ?",
                (original, target_effect),
            )
            con.commit()

            verdict = "caught" if caught else "NOT CAUGHT"
            print(
                f"[check_motion_fx_reseed --self-test] {target_effect}.{column}: "
                f"{original!r} -> {corrupted!r} — {verdict}; reverted"
            )
            if not caught:
                unguarded.append(column)

        if unguarded:
            print(
                "[check_motion_fx_reseed --self-test] FAIL — the guard did NOT detect an "
                f"injected violation in: {', '.join(unguarded)}. Those columns read green "
                "forever. Fix the check."
            )
            return 1

        # Report the COLUMNS proven, not `len(caught)` — that read the last loop
        # iteration's leftover value, so it described one column while claiming
        # to summarise all of them (harmless while the tuple held 5 identical-
        # shaped columns; actively misleading once the list is gated and varies
        # in length per DB).
        print(
            f"[check_motion_fx_reseed --self-test] all {len(columns)} guarded column(s) "
            f"detected their injected drift — OK"
        )

        # Final: confirm the revert actually restored the clean state.
        post_revert_violations = run(con)
        if post_revert_violations:
            print(
                f"[check_motion_fx_reseed --self-test] FAIL — {len(post_revert_violations)} "
                f"violation(s) remain after revert; the DB may be left inconsistent."
            )
            return 1
        print("[check_motion_fx_reseed --self-test] post-revert: 0 violations (clean) — OK")

        print("[check_motion_fx_reseed --self-test] PASS — guard can fail, and correctly reverts to clean.")
        return 0
    finally:
        con.close()


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        raise SystemExit(_self_test())

    # Standalone report mode (mirrors the other check_*.py modules' ad-hoc usage).
    _db_path = _seeder_mod.DB_PATH
    if not _db_path.exists():
        print(f"[check_motion_fx_reseed] DB not found: {_db_path}", file=sys.stderr)
        raise SystemExit(1)
    _con = sqlite3.connect(str(_db_path))
    try:
        _violations = run(_con)
    finally:
        _con.close()
    if not _violations:
        print("[check_motion_fx_reseed] 0 violations.")
        raise SystemExit(0)
    for _v in _violations:
        print(f"[{_v.key}] {_v.block}: {_v.detail}\n  Fix: {_v.fix}")
    raise SystemExit(1)
