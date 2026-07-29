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

import json
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
OUTPUT_FILE = Path(__file__).resolve().parent.parent / "includes" / "generated-fx-effects.php"


def _php_string_literal(value: str) -> str:
    """Escape a string for a single-quoted PHP literal."""
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def _php_array_of_strings(values: list[str]) -> str:
    if not values:
        return "array()"
    items = ", ".join(_php_string_literal(v) for v in values)
    return f"array( {items} )"


def main() -> int:
    if not DB_PATH.exists():
        print(f"[generate-fx-effects-php] DB not found: {DB_PATH}", file=sys.stderr)
        return 1

    con = sqlite3.connect(str(DB_PATH))
    cur = con.cursor()

    if not cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='fx_effects'"
    ).fetchone():
        print(
            "[generate-fx-effects-php] fx_effects table not found — run "
            "plugins/sgs-blocks/scripts/seed-motion-fx-registry.py first.",
            file=sys.stderr,
        )
        con.close()
        return 1

    rows = cur.execute(
        "SELECT effect, plugin_set, owns_scroll_transform FROM fx_effects ORDER BY effect"
    ).fetchall()
    con.close()

    if not rows:
        print(
            "[generate-fx-effects-php] fx_effects table is empty — run "
            "plugins/sgs-blocks/scripts/seed-motion-fx-registry.py first.",
            file=sys.stderr,
        )
        return 1

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

    for effect, plugin_set_json, owns_scroll_transform in rows:
        plugin_set = json.loads(plugin_set_json)
        owns_bool = "true" if int(owns_scroll_transform) else "false"
        lines.append(f"\t\t\t{_php_string_literal(effect)} => array(")
        lines.append(f"\t\t\t\t'plugin_set'            => {_php_array_of_strings(plugin_set)},")
        lines.append(f"\t\t\t\t'owns_scroll_transform' => {owns_bool},")
        lines.append("\t\t\t),")

    lines.extend([
        "\t\t);",
        "\t}",
        "\treturn $effects;",
        "}",
        "",
    ])

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"[generate-fx-effects-php] Generated {OUTPUT_FILE} with {len(rows)} effects.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
