#!/usr/bin/env python3
"""generate-fx-qualifying-blocks.py — derives the block -> qualifying-fx-effects
map, replacing the hand-curated `FX_BLOCKS` array that used to live in
src/blocks/extensions/fx.js.

Spec ref: .claude/specs/38-SGS-MOTION-SYSTEM.md §2 (placement taxonomy) + §7
(inspector panel). Task: "Replace a hardcoded block roster with a DERIVED one"
(2026-07-29) — the owner's own framing: "an easy way to judge which effects
qualify for which blocks" is exactly Spec 38 §2's Level/Exposure-surface/
Conditions columns, already captured as `fx_effects.scope`/`requires` by
seed-motion-fx-registry.py (extended by this same task). This script is the
SECOND half: turn "what an effect requires" + "what a block provides" into a
concrete per-block roster, DERIVED, never hand-typed.

WHY A SEPARATE ARTEFACT FROM generated-fx-effects.php
----------------------------------------------------------------------------
generated-fx-effects.php answers "what GSAP plugins does effect X need" —
keyed by EFFECT, consumed by the server-side plugin-loading registry.
This script answers "which effects can block Y even offer" — keyed by BLOCK,
consumed by BOTH the editor (does this block get the fx panel + which options
does its SelectControl list) and the render layer (is a `data-sgs-fx` value
on this block's markup even legitimate, or has it drifted from a block whose
capabilities changed since the client set it). Two different keys, two
different consumers — a single merged structure would force one side to
filter the other's shape.

WHAT COUNTS AS "PROVIDING" A REQUIREMENT (ground truth, not invented)
----------------------------------------------------------------------------
- 'section'  <- block.json `supports.sgs.containerKind === "section"`
                (mirrors block_composition.container_kind, populated by
                sync-container-wrapping-blocks.py from the SAME flag — see
                the DB-vs-block.json gap note below) OR the block IS
                `sgs/container` itself (the container never declares its own
                containerKind — nothing wraps it, it wraps others — but
                pin-scrub's own §2 row names it explicitly: "Inspector panel
                on `sgs/container` + section-KIND composites").
- 'text'     <- the block's edit.js imports/uses `RichText` (WordPress's own
                rich-text-editing component) — "the block owns and renders
                its own text" ground-tested as "does it render an editable
                RichText field", not a name-matching heuristic over
                attribute names (which over-matches: `role: "content"` scalar
                string attrs also cover url/label/id-shaped values on ~40
                unrelated blocks — verified via a throwaway scan before
                settling on this test).
- 'svg'      <- block_slug is one of the 4 blocks §2's DrawSVG row NAMES
                explicitly: sgs/responsive-logo, sgs/icon, sgs/separator,
                sgs/decorative-image. HONEST EXCEPTION to "derive, don't
                hardcode": no structural block.json flag or DB role unifies
                these 4 (verified — `<svg` literal markup appears in a dozen
                unrelated blocks for chevrons/star icons, wildly over-
                matching), and the spec itself gives a closed, named list
                rather than a detectable rule. Citing the spec's own literal
                roster is not the same failure mode as inventing one.
- 'track'    <- block.json `supports.sgs.fx.draggable === true`. Zero blocks
                declare this today (verified via grep) — the roster for
                'draggable' is honestly EMPTY until a block opts in, per §2's
                own "Roster-gated" language.
- 'item-set' <- block.json `supports.sgs.fx.pairedFilter === true`. Zero
                blocks declare this today either — Flip's roster is honestly
                EMPTY (and Flip's scope='paired' excludes it from this
                generic map anyway — see below).
- 'none'     <- always satisfied (scrub, image-sequence).

STRUCTURAL SCOPE GATE (the task's Hard Constraint)
----------------------------------------------------------------------------
Only `fx_effects` rows with scope IN ('block', 'element') are even considered
for this map — 'site' (ScrollSmoother, page-transitions), 'paired' (Flip),
and 'flavour' rows are excluded at the SQL/filter level, before any
block-provision check runs. This is what makes "ScrollSmoother can never
reach a block inspector" a property of the generator's control flow, not a
comment someone could forget to keep true.

A KNOWN DB-VS-BLOCK.JSON GAP (flagged, not silently patched over)
----------------------------------------------------------------------------
`block_composition.container_kind` (DB) has MORE 'section'/'layout' rows than
block.json's `containerKind` support declares (verified: sgs/cta-section had
container_kind='section' in the DB, `is_section_root: true` in block.json,
but NO `containerKind` key at all — the same gap hero/trust-bar do NOT have.
FIXED for cta-section as part of this task, since it is directly the
task's own acceptance check. NOT fixed for the ~12 other DB-only 'layout'
blocks (card-grid, gallery, accordion, tabs, pricing-table, google-reviews,
post-grid, multi-button, form-field-tiles, trustpilot-reviews,
content-collection, adaptive-nav) — none of the current 'block'/'element'-
scope effects require 'item-set' (only Flip does, and Flip is scope='paired',
excluded above), so this gap has ZERO effect on the current output. Flagged
here so it is not silently rediscovered as a "mystery gap" later: if a future
wave adds a 'block'-scope effect with requires='item-set', these block.json
files need their containerKind declared first, or they will wrongly appear
absent from that effect's roster despite being DB-registered layout
composites.

This script reads block.json + edit.js FILES directly (never the SQLite DB)
for block-provision facts — those files are what ships (block.json IS
deployed and readable at runtime; the DB is not, verified: no PHP in this
project opens SQLite). It reads the DB ONLY for `fx_effects.scope`/`requires`
(the effect side), since that table has no block.json equivalent.

OUTPUT (two files, ONE computation, deterministic, no timestamps)
----------------------------------------------------------------------------
1. src/blocks/extensions/generated-fx-qualifying-blocks.json — plain JSON,
   `{ "sgs/heading": ["scrub", "split-reveal"], ... }`, imported directly by
   fx.js (webpack bundles .json imports natively — no codegen step needed).
2. includes/generated-fx-qualifying-blocks.php — the identical map as a PHP
   array behind `sgs_get_fx_qualifying_blocks()`, mirroring
   generate-fx-effects-php.py's shape exactly (same no-timestamp rationale —
   see that file's own comment on why: a dirty-always file makes the
   deploy-gate's dirty check meaningless).

Run: python plugins/sgs-blocks/scripts/generate-fx-qualifying-blocks.py
"""
from __future__ import annotations

import json
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
PLUGIN_ROOT = Path(__file__).resolve().parent.parent
BLOCKS_DIR = PLUGIN_ROOT / "src" / "blocks"
JSON_OUTPUT = BLOCKS_DIR / "extensions" / "generated-fx-qualifying-blocks.json"
PHP_OUTPUT = PLUGIN_ROOT / "includes" / "generated-fx-qualifying-blocks.php"

# The one honest hardcoded exception — see module docstring's 'svg' section.
# Spec 38 §2 DrawSVG row, Exposure-surface column, cited verbatim.
SVG_BEARING_BLOCKS = frozenset({
    "sgs/responsive-logo",
    "sgs/icon",
    "sgs/separator",
    "sgs/decorative-image",
})

# sgs/container never declares its own containerKind (nothing wraps it) but
# is the explicit target of pin-scrub's §2 row. See module docstring.
CONTAINER_BLOCK = "sgs/container"

# A second honest hardcoded exception: image-sequence's §2 row target IS the
# new dedicated block itself ("New block `sgs/image-sequence` inspector"),
# NOT "any block" the way requires='none' means for scrub. Modelling this as
# a plain 'none' requirement (as the DB row's `requires` column literally
# says — there is genuinely nothing on the TARGET side to qualify, the
# qualifier is "is this block sgs/image-sequence") would make it appear
# against all ~80 blocks, which contradicts the spec's own framing. This
# exact-match table overrides the requires-based check for named effects
# only; every other effect still resolves purely from block provisions.
EXACT_MATCH_BLOCKS: dict[str, frozenset[str]] = {
    # sgs/image-sequence does not exist yet (verified: no such directory
    # under src/blocks) — so this effect's roster is honestly EMPTY today,
    # by construction, rather than accidentally universal.
    "image-sequence": frozenset(),
}


def _load_block_jsons() -> dict[str, dict]:
    """block_slug -> parsed block.json contents, for every src/blocks/* block."""
    out: dict[str, dict] = {}
    for path in sorted(BLOCKS_DIR.glob("*/block.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            print(f"[generate-fx-qualifying-blocks] WARN: could not parse {path}: {exc}", file=sys.stderr)
            continue
        name = data.get("name")
        if name:
            out[name] = data
    return out


def _richtext_blocks() -> set[str]:
    """Blocks whose edit.js imports/uses RichText — the 'text' provision test."""
    found: set[str] = set()
    for edit_js in sorted(BLOCKS_DIR.glob("*/edit.js")):
        try:
            content = edit_js.read_text(encoding="utf-8")
        except OSError:
            continue
        if re.search(r"\bRichText\b", content):
            block_dir = edit_js.parent
            block_json_path = block_dir / "block.json"
            if block_json_path.exists():
                try:
                    name = json.loads(block_json_path.read_text(encoding="utf-8")).get("name")
                except (OSError, json.JSONDecodeError):
                    continue
                if name:
                    found.add(name)
    return found


def _block_provisions(block_slug: str, block_json: dict, richtext_blocks: set[str]) -> set[str]:
    """The set of requirement tokens this block satisfies."""
    provisions: set[str] = set()

    sgs_supports = (block_json.get("supports") or {}).get("sgs") or {}
    container_kind = sgs_supports.get("containerKind")
    if container_kind == "section" or block_slug == CONTAINER_BLOCK:
        provisions.add("section")

    if block_slug in richtext_blocks:
        provisions.add("text")

    if block_slug in SVG_BEARING_BLOCKS:
        provisions.add("svg")

    fx_supports = sgs_supports.get("fx") or {}
    if fx_supports.get("draggable") is True:
        provisions.add("track")
    if fx_supports.get("pairedFilter") is True:
        provisions.add("item-set")

    return provisions


def _load_qualifying_effects() -> list[tuple[str, str]]:
    """(effect, requires) pairs for every fx_effects row with a block-panel
    scope. Reads the DB — legitimate here because this is a BUILD-time
    generator (same shape as generate-fx-effects-php.py), and the DB is the
    only home for scope/requires (no block.json equivalent — those columns
    describe the EFFECT, not any one block)."""
    if not DB_PATH.exists():
        print(f"[generate-fx-qualifying-blocks] DB not found: {DB_PATH}", file=sys.stderr)
        raise SystemExit(1)
    con = sqlite3.connect(str(DB_PATH))
    try:
        if not con.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='fx_effects'"
        ).fetchone():
            print(
                "[generate-fx-qualifying-blocks] fx_effects table not found — run "
                "plugins/sgs-blocks/scripts/seed-motion-fx-registry.py first.",
                file=sys.stderr,
            )
            raise SystemExit(1)
        rows = con.execute(
            "SELECT effect, requires FROM fx_effects WHERE scope IN ('block', 'element') "
            "ORDER BY effect"
        ).fetchall()
    finally:
        con.close()
    return list(rows)


def compute_map() -> dict[str, list[str]]:
    """Compute the full block -> sorted qualifying-effects map. Pure function
    (no I/O side effects besides the DB read) so the gate can call it and
    diff against the shipped artefacts without re-running the generator's
    file-write path."""
    block_jsons = _load_block_jsons()
    richtext_blocks = _richtext_blocks()
    qualifying_effects = _load_qualifying_effects()

    result: dict[str, list[str]] = {}
    for block_slug, block_json in block_jsons.items():
        # Declarative per-block opt-out (supports.sgs.hideExtensions: ["fx"]).
        #
        # The editor already honours this at runtime via isExtensionHidden(), so
        # omitting it here would not put a panel on an opted-out block — but it
        # WOULD leave the generated map claiming blocks that never get one, and
        # a map that disagrees with the runtime is a map nobody can trust (the
        # PHP consumer reads the same file). Filtering here keeps the artefact
        # truthful for every consumer.
        #
        # This is the sanctioned exception route: `container_kind='section'` is
        # necessary but NOT sufficient — site chrome (site-header/footer,
        # mega-panel), overlays (modal), form fields and inner child blocks are
        # all structurally section- or text-shaped while being meaningless
        # scroll-effect targets. Each declares the opt-out in its OWN block.json
        # rather than appearing in a dict here (R-31-1), exactly as animation.js
        # does since its hardcoded denylist was retired.
        hidden = (
            block_json.get("supports", {}).get("sgs", {}).get("hideExtensions") or []
        )
        if "fx" in hidden:
            continue

        provisions = _block_provisions(block_slug, block_json, richtext_blocks)

        # PASS 1 — effects with a SPECIFIC target requirement. These are what
        # decide whether a block gets the fx panel at all.
        specific = []
        # PASS 2 candidates — effects that require nothing in particular.
        permissive = []

        for effect, requires in qualifying_effects:
            if effect in EXACT_MATCH_BLOCKS:
                if block_slug in EXACT_MATCH_BLOCKS[effect]:
                    specific.append(effect)
                continue
            if requires == "none":
                permissive.append(effect)
            elif requires in provisions:
                specific.append(effect)

        # A `requires='none'` effect adds NO BLOCK OF ITS OWN — it is offered
        # wherever the panel already exists, and never creates the panel.
        #
        # WHY (this was got wrong once, so the reasoning is recorded):
        # Spec 38 §2's last column is headed "Recommended → permitted" — a
        # TRAJECTORY, not a requirement. `scrub`'s entry reads "Any block → any
        # element WITH THE FX PANEL EXPOSED", and its authoritative Level column
        # says `block/element`. Treating "any block" as a present-tense
        # requirement put the panel on all 81 sgs/* blocks — nav menus, form
        # fields, separators, icons — which is both the permitted CEILING read as
        # the day-one default, and the "13 panels where none makes sense"
        # containment failure this project treats as a defect in its own right.
        #
        # The qualifier "with the fx panel exposed" is the operative clause: the
        # effect's availability is CONDITIONAL on the panel existing, so it
        # cannot be the thing that justifies the panel.
        if specific:
            result[block_slug] = sorted(specific + permissive)

    return result


def _php_string_literal(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def _write_json(fx_map: dict[str, list[str]]) -> None:
    JSON_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    # Sorted keys + 1-space item separator for deterministic byte-identical
    # output across runs (matches generate-fx-effects-php.py's determinism
    # rule — a dirty-always file defeats the deploy dirty-gate, D336's own
    # class of bug).
    JSON_OUTPUT.write_text(
        json.dumps(fx_map, indent="\t", sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _write_php(fx_map: dict[str, list[str]]) -> None:
    total_blocks = len(fx_map)
    lines = [
        "<?php",
        "/**",
        " * Auto-generated Spec 38 motion-fx block -> qualifying-effects map — DO NOT EDIT.",
        " *",
        " * Generated from block.json (containerKind / fx.draggable / fx.pairedFilter),",
        " * each block's edit.js (RichText usage), and the `fx_effects` DB table's",
        " * scope/requires columns by scripts/generate-fx-qualifying-blocks.py. To",
        " * change these values, edit the relevant block.json / seed-motion-fx-",
        " * registry.py, then re-run this generator.",
        " *",
        f" * Blocks with at least one qualifying effect: {total_blocks}",
        " *",
        " * Spec ref: .claude/specs/38-SGS-MOTION-SYSTEM.md §2 + §7.",
        " *",
        " * Auto-generated — exempt from the 300-line limit.",
        " *",
        " * @package SGS\\Blocks",
        " */",
        "",
        "defined( 'ABSPATH' ) || exit;",
        "",
        "/**",
        " * Return the Spec 38 fx block -> qualifying-effects map.",
        " *",
        " * Keyed by block name (e.g. `sgs/heading`). Each value is the list of",
        " * `data-sgs-fx` grammar values (Spec 38 §11.2) that block structurally",
        " * qualifies for — an effect whose `fx_effects.scope` is 'site', 'paired',",
        " * or 'flavour' NEVER appears here, by construction (see the generator's",
        " * module docstring \"STRUCTURAL SCOPE GATE\").",
        " *",
        " * Uses a static variable so the array is only built once per request.",
        " *",
        " * @return array<string,string[]>",
        " */",
        "function sgs_get_fx_qualifying_blocks() {",
        "\tstatic $map = null;",
        "\tif ( null === $map ) {",
        "\t\t$map = array(",
    ]
    for block_slug in sorted(fx_map):
        effects = fx_map[block_slug]
        effects_php = ", ".join(_php_string_literal(e) for e in effects)
        lines.append(f"\t\t\t{_php_string_literal(block_slug)} => array( {effects_php} ),")
    lines.extend([
        "\t\t);",
        "\t}",
        "\treturn $map;",
        "}",
        "",
    ])
    PHP_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    PHP_OUTPUT.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    fx_map = compute_map()
    _write_json(fx_map)
    _write_php(fx_map)
    print(
        f"[generate-fx-qualifying-blocks] Generated {JSON_OUTPUT} and {PHP_OUTPUT} "
        f"with {len(fx_map)} qualifying block(s)."
    )
    for block_slug in sorted(fx_map):
        print(f"  {block_slug}: {', '.join(fx_map[block_slug])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
