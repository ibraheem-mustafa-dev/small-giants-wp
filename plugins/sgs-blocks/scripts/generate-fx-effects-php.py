#!/usr/bin/env python3
"""generate-fx-effects-php.py — writes includes/generated-fx-effects.php from fx_effects.

Spec ref: .claude/specs/38-SGS-MOTION-SYSTEM.md §4.4 (conditional-loading registry) —
item A6 of the Motion Wave A build. Same "generate a shipped PHP file from an authoring
source" shape as scripts/generate-icons.js (icon SVGs -> includes/lucide-icons.php):
a DB table is the authoring source (never deployed — the DB is a LOCAL DEV knowledge
base, verified: no PHP anywhere in this project opens SQLite), so the plain PHP array
it implies for runtime use IS generated and shipped instead.

WHY THIS ONE MAP, AND ONLY THIS MAP
----------------------------------------------------------------------------------------
Spec 38 §4.4 draws a clear line: per-BLOCK fx *capabilities* (which blocks declare
`supports.sgs.fx.*`) are read at runtime straight from block.json via
`WP_Block_Type_Registry` — block.json IS deployed, so nothing needs generating for that
half. But the effect-to-plugin-set map (`fx_effects.plugin_set` /
`owns_scroll_transform`) is keyed by EFFECT NAME, not by block, and effect names live
only in the DB (fx_effects, seeded by seed-motion-fx-registry.py) — there is no other
deployed home for "does pin-scrub need ScrollTrigger" or "does scramble own the
element's scroll transform". That is the ONE map this generator produces.

OUTPUT SHAPE (per the task spec): ONLY `effect => { plugin_set, owns_scroll_transform }`
— nothing else. `tier` is not carried (every row is currently 'G' — see the seeder's
Wave-A note; a future Tier V row would need this regenerated, at which point the
consuming registry PHP would need updating too, a Wave-C-or-later concern) and
`reduced_motion`/`editor_story` are editor/JS-facing concerns already covered by the
provider + inspector (§5 FR-38-2/§7), not the runtime plugin-loading registry this file
serves.

Run: python plugins/sgs-blocks/scripts/generate-fx-effects-php.py
Wire into the build's prebuild step (recommended, see the exact command in the A6
session report — this script does NOT edit package.json itself, per the task's
ownership split).
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
OUTPUT_FILE = Path(__file__).resolve().parent.parent / "includes" / "generated-fx-effects.php"
# Editor-side mirror of the per-effect facts the inspector needs (D416).
JSON_OUTPUT_FILE = (
    Path(__file__).resolve().parent.parent
    / "src" / "blocks" / "extensions" / "generated-fx-effect-meta.json"
)


def _php_string_literal(value: str) -> str:
    """Escape a string for a single-quoted PHP literal."""
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def _php_array_of_strings(values: list[str]) -> str:
    if not values:
        return "array()"
    items = ", ".join(_php_string_literal(v) for v in values)
    return f"array( {items} )"


def _load_rows() -> list[tuple]:
    """Read the fx_effects rows this generator needs. Raises SystemExit(1) with
    a message naming DB_PATH on any failure mode — including the empty-table
    case, which must never be mistaken for "nothing to generate" (an empty
    read here would silently produce a PHP registry with zero effects and no
    error at all — the exact failure this generator must never reproduce)."""
    con = sqlite3.connect(str(DB_PATH))
    cur = con.cursor()

    if not cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='fx_effects'"
    ).fetchone():
        con.close()
        print(
            f"[generate-fx-effects-php] fx_effects table not found in {DB_PATH} — "
            "run plugins/sgs-blocks/scripts/seed-motion-fx-registry.py first.",
            file=sys.stderr,
        )
        raise SystemExit(1)

    rows = cur.execute(
        "SELECT effect, plugin_set, owns_scroll_transform, pins, triggers "
        "FROM fx_effects ORDER BY effect"
    ).fetchall()
    con.close()

    if not rows:
        print(
            f"[generate-fx-effects-php] fx_effects table in {DB_PATH} is EMPTY — "
            "this must never be treated as 'nothing to generate'. Run "
            "plugins/sgs-blocks/scripts/seed-motion-fx-registry.py first, or "
            "check the DB wasn't opened before seeding.",
            file=sys.stderr,
        )
        raise SystemExit(1)

    return rows


def _render(rows: list[tuple]) -> tuple[str, str]:
    """Pure function: rows -> (php_source, json_source). No I/O, so --check can
    call this and diff the result against the committed files without ever
    writing to disk."""
    # NO TIMESTAMP IN THE OUTPUT — deliberate, and load-bearing.
    #
    # This generator runs on every build. A "Last generated:" header would
    # rewrite the file each time, leaving it near-permanently dirty in git while
    # its actual PHP was unchanged. That matters because build-deploy.py gates
    # on dirty DEPLOYED files: a file that is always dirty makes --allow-dirty
    # reflexive, and a reflexive override is how that gate died before (D336 —
    # two client sites down ~2.5h with all three safety mechanisms inert).
    #
    # The alternative was adding this file to build-deploy's
    # DEPLOY_SKIP_BASENAMES, as lucide-icons.php had to be. That is strictly
    # worse: it would also hide a REAL change to the effect map from the gate.
    # Deterministic output keeps the file's dirtiness meaningful — if it differs
    # from HEAD, the DATA genuinely changed and someone should look.
    lines = [
        "<?php",
        "/**",
        " * Auto-generated Spec 38 motion-fx effect->plugin-set map — DO NOT EDIT.",
        " *",
        " * Generated from the `fx_effects` DB table (a LOCAL DEV knowledge base only —",
        " * never deployed; verified no PHP in this project opens SQLite) by",
        " * scripts/generate-fx-effects-php.py. The DB table itself is populated by",
        " * scripts/seed-motion-fx-registry.py. To change these values, edit FX_EFFECTS",
        " * in seed-motion-fx-registry.py, re-run it, then re-run this generator.",
        " *",
        f" * Effects: {len(rows)}",
        " *",
        " * Spec ref: .claude/specs/38-SGS-MOTION-SYSTEM.md §4.4 + §6.1/§11.2.",
        " *",
        " * Auto-generated — exempt from the 300-line limit.",
        " *",
        " * @package SGS\\Blocks",
        " */",
        "",
        "defined( 'ABSPATH' ) || exit;",
        "",
        "/**",
        " * Return the Spec 38 motion-fx effect registry.",
        " *",
        " * Keyed by the `data-sgs-fx` grammar value (Spec 38 §11.2). Each entry carries",
        " * ONLY plugin_set (GSAP plugin names the SGS_Motion_Registry must enqueue for",
        " * that effect, on top of gsap core which loads for any Tier G effect present)",
        " * and owns_scroll_transform (drives the Spec 38 §4.3 entrance-exclusion rule —",
        " * 1 when the effect owns an element's transform/opacity across a scroll range).",
        " *",
        " * Uses a static variable so the array is only built once per request.",
        " *",
        " * @return array<string,array{plugin_set:string[],owns_scroll_transform:bool}>",
        " */",
        "function sgs_get_motion_fx_effects() {",
        "\tstatic $effects = null;",
        "\tif ( null === $effects ) {",
        "\t\t$effects = array(",
    ]

    for effect, plugin_set_json, owns_scroll_transform, pins, triggers in rows:
        plugin_set = json.loads(plugin_set_json)
        owns_bool = "true" if int(owns_scroll_transform) else "false"
        pins_bool = "true" if int(pins) else "false"
        lines.append(f"\t\t\t{_php_string_literal(effect)} => array(")
        lines.append(f"\t\t\t\t'plugin_set'            => {_php_array_of_strings(plugin_set)},")
        lines.append(f"\t\t\t\t'owns_scroll_transform' => {owns_bool},")
        lines.append(f"\t\t\t\t'pins'                  => {pins_bool},")
        lines.append(
            f"\t\t\t\t'triggers'              => "
            f"{_php_array_of_strings([t for t in str(triggers).split(',') if t])},"
        )
        lines.append("\t\t\t),")

    lines.extend([
        "\t\t);",
        "\t}",
        "\treturn $effects;",
        "}",
        "",
    ])

    php_source = "\n".join(lines)

    # ------------------------------------------------------------------
    # Editor-side mirror (D416).
    #
    # The inspector needs two per-effect facts to build its controls:
    #   · pins     — chooses the fxEnd control's WORDING ("how long it stays
    #                stuck" vs "where it finishes")
    #   · triggers — the per-effect enum (Spec 38 §11.2) deciding which "When it
    #                starts" options a client is offered, so no dead option ever
    #                renders
    #   · owns_scroll_transform — drives the §4.3 entrance-exclusion Notice and
    #                the scrub-smoothing control's visibility. ADDED 2026-07-31:
    #                fx.js carried this as a hand-typed array (SCROLL_OWNING_FX)
    #                whose own comment conceded the DB was authoritative, which
    #                meant the editor could tell a client entrance animation was
    #                still on while the render layer had already suppressed it,
    #                with no gate anywhere to catch the disagreement. Mirroring
    #                it here makes the two sides read the same row. The PHP map
    #                above has always carried it; this only closes the JS half.
    #
    # Emitted as JSON rather than duplicated as hand-maintained arrays in fx.js.
    # That file used to carry two such lists (SHIPPED_EFFECTS, SCROLL_OWNING_FX)
    # that no gate cross-checked; SCROLL_OWNING_FX is now derived from this file
    # and gone, leaving SHIPPED_EFFECTS — which is deliberately hand-kept,
    # because it records which JS MODULES exist and no DB column knows that.
    # webpack bundles .json imports natively, so this needs no codegen step —
    # same route generated-fx-qualifying-blocks.json already uses.
    #
    # Deterministic, no timestamp — see the note above for why that is
    # load-bearing for build-deploy's dirty gate.
    # ------------------------------------------------------------------
    meta = {
        effect: {
            "pins": bool(int(pins)),
            "triggers": [t for t in str(triggers).split(",") if t],
            "owns_scroll_transform": bool(int(owns)),
        }
        for effect, _plugin_set_json, owns, pins, triggers in rows
    }
    json_source = json.dumps(meta, indent="\t", sort_keys=True) + "\n"

    return php_source, json_source


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help=(
            "Regenerate in memory and diff against the committed generated-"
            "fx-effects.php / generated-fx-effect-meta.json instead of writing. "
            "Exits 0 if they match, 1 (with a message naming both files) if "
            "the committed artefacts are stale. Never writes to disk."
        ),
    )
    args = parser.parse_args()

    if not DB_PATH.exists():
        # Deliberately unversioned — see .claude/dev-setup.md "sgs-framework.db".
        # Both the plain run and --check skip cleanly: with no DB there is
        # nothing to regenerate FROM, so the committed artefacts (already in
        # the repo) are simply left as the build input, exactly as intended.
        print(
            f"[generate-fx-effects-php] DB not found: {DB_PATH} — skipping "
            "(building off committed generated artefacts; see .claude/dev-setup.md)."
        )
        return 0

    rows = _load_rows()
    php_source, json_source = _render(rows)

    if args.check:
        stale = []
        if not OUTPUT_FILE.exists() or OUTPUT_FILE.read_text(encoding="utf-8") != php_source:
            stale.append(str(OUTPUT_FILE))
        if not JSON_OUTPUT_FILE.exists() or JSON_OUTPUT_FILE.read_text(encoding="utf-8") != json_source:
            stale.append(str(JSON_OUTPUT_FILE))
        if stale:
            print(
                "[generate-fx-effects-php] STALE — the committed generated "
                f"artefact(s) below no longer match `fx_effects` in {DB_PATH}:\n  "
                + "\n  ".join(stale)
                + "\nRe-run without --check to regenerate, then commit the result: "
                "python plugins/sgs-blocks/scripts/generate-fx-effects-php.py",
                file=sys.stderr,
            )
            return 1
        print(f"[generate-fx-effects-php] OK — committed artefacts match {DB_PATH} ({len(rows)} effects).")
        return 0

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(php_source, encoding="utf-8")
    print(f"[generate-fx-effects-php] Generated {OUTPUT_FILE} with {len(rows)} effects.")

    JSON_OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    JSON_OUTPUT_FILE.write_text(json_source, encoding="utf-8")
    print(f"[generate-fx-effects-php] Generated {JSON_OUTPUT_FILE} with {len(meta_count(json_source))} effects.")
    return 0


def meta_count(json_source: str) -> dict:
    """Small helper so the final print line can report a count without
    re-parsing the rows (keeps `main` readable)."""
    return json.loads(json_source)


if __name__ == "__main__":
    raise SystemExit(main())
