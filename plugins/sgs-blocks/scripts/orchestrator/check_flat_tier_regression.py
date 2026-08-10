#!/usr/bin/env python3
"""
check_flat_tier_regression.py — Spec 35 flat-to-object migration divergence gate.

BACKGROUND
==========
The SGS framework is migrating per-device block settings from THREE flat
attributes (`gap`, `gapTablet`, `gapMobile`) to ONE object-shaped attribute
(`gap: {"desktop":..., "tablet":..., "mobile":...}`), property by property
(decisions.md D554-A). The cloning converter still emits the OLD flat shape
and is NOT being shimmed to bridge the gap (D554-C, Bean-ruled 2026-08-10):

    "A check FAILS a clone run that emits a flat tier for a property already
    migrated on the target block. Divergence becomes loud instead of silent."
    "Rejected: a temporary converter shim. It would make the pipeline pace
    the standard ... and a shim written under time pressure becomes the
    permanent implementation."

This script is that check. It is a HARD, always-enforced gate — unlike the
R-31-15 anti-mirror gate (check_no_mirror.py), there is NO baseline and NO
grandfathering here: D554-C explicitly rejects a shim, so every emission of
a flat tier for an already-migrated property is a regression, not a known
legacy debt to tolerate.

WHAT "ALREADY MIGRATED" MEANS (Spec 35 P1 design, block.json-only signal)
==========================================================================
A property's phase is keyed on block.json's attribute `type`, and NOTHING
ELSE — never render.php, never the DB, never a runtime switch such as
`responsive_model`/`container_queries` (an earlier draft got this wrong;
sgs/gallery opts into container queries yet is still mid-migration on other
properties).

  OBJECT (migrated) = the base attribute is declared `"type": "object"` in
                       block.json, with NO `<attr>Tablet` / `<attr>Mobile`
                       sibling attributes also declared.
  FLAT   (not yet)   = the base attribute is declared as a scalar type
                       (string/number/boolean/etc.) WITH those siblings
                       declared.

A base attribute typed `"object"` that DOES still have Tablet/Mobile
siblings (e.g. an object-shaped media picker with per-tier variants) is
NOT the migrated single-object-attr shape this gate is about — it's left
alone.

WHAT THIS CHECKS
================
For every block instance emitted into a clone run's extract.json
`block_markup`:

(a) FLAT-TIER SIBLING KEY — the instance's JSON attrs contain a key
    `<property>Tablet` or `<property>Mobile` where `<property>` is a
    migrated (object-typed, sibling-free) attribute on that block. Emitting
    that key at all is the regression the converter must never repeat once
    a property has been migrated on the target block.

(b) SCALAR BASE VALUE — the instance's JSON attrs contain the migrated
    base property itself, but its emitted VALUE is a scalar (not an
    object/dict) — i.e. the converter emitted the old flat desktop value
    (`"gap": "24px"`) instead of the new object shape
    (`"gap": {"desktop": "24px", ...}`). This is a flat-tier emission too;
    it just doesn't carry a Tablet/Mobile suffix.

Both (a) and (b) parse the emitted attrs STRUCTURALLY — via
`json.loads()` on the `<!-- wp:slug {...} -->` comment's JSON blob, and by
walking the resulting dict's KEYS/VALUES. Text inside JSON string VALUES
(e.g. a heading's `content` mentioning "gapTablet" in passing) is never
matched — only real object keys are. (Two prior incidents in this project
came from exactly the naive-grep failure mode this avoids: a class-name
census matched the class name inside a comment recording its own removal,
and a stray `/*` inside a `//` comment corrupted two gates' input corpora.)

EXIT CODES (--enforce mode, the only mode pipeline-stage-gate.py uses)
========================================================================
0 — no flat-tier-on-migrated-property violations found
1 — one or more violations found
2 — usage error (missing/unreadable extract.json, missing run_dir)

EXIT CODES (--report mode, default when run standalone)
=========================================================
Always 0. Violations printed for information only.

USAGE
=====
    # Report mode (default) — safe to run any time, never blocks
    python check_flat_tier_regression.py [<run_dir>]

    # Enforce mode — the mode pipeline-stage-gate.py invokes
    python check_flat_tier_regression.py [<run_dir>] --enforce

    # Self-test — proves the detector can both fire and stay silent,
    # using the checked-in fixtures under scripts/fixtures/flat-tier-gate/
    python check_flat_tier_regression.py --self-test

    # <run_dir> defaults to the most-recent directory under pipeline-state/

WIRING
======
Wired into pipeline-stage-gate.py as `gate_flat_tier_regression()`, called
from `run_all_gates()` right after the R-31-15 anti-mirror gate, using the
same post-Stage-9 extract.json chokepoint. sgs-clone-orchestrator.py's
`--skip-flat-tier-gate` flag (mirroring the pre-existing `--skip-stage-gate`
shape) threads through to pipeline-stage-gate.py's own
`--skip-flat-tier-gate` flag for diagnostic-only bypass.

UK English in all output.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
HERE = Path(__file__).parent
REPO_ROOT = HERE.parent.parent.parent.parent  # plugins/sgs-blocks/scripts/orchestrator -> repo root
PIPELINE_STATE_DIR = REPO_ROOT / "pipeline-state"
BLOCKS_DIR = REPO_ROOT / "plugins" / "sgs-blocks" / "src" / "blocks"
FIXTURES_DIR = HERE.parent / "fixtures" / "flat-tier-gate"

# Reuse the structural (never comment-text) block-markup parser + loader from
# the sibling R-31-15 gate rather than re-implementing JSON extraction.
sys.path.insert(0, str(HERE))
from check_no_mirror import load_block_markup, parse_block_markup  # noqa: E402

# ---------------------------------------------------------------------------
# Flat-tier suffix pattern: <property>Tablet or <property>Mobile
# ---------------------------------------------------------------------------
FLAT_TIER_SUFFIX_RE = re.compile(r"^(.+)(Tablet|Mobile)$")


# ---------------------------------------------------------------------------
# Migrated-property map (block.json is the ONLY source, per Spec 35 P1)
# ---------------------------------------------------------------------------

def build_migrated_property_map(blocks_dir: Path = BLOCKS_DIR) -> dict[str, set[str]]:
    """Return {block_slug: {migrated_base_property_names}}.

    Scans every plugins/sgs-blocks/src/blocks/*/block.json. A base attribute
    counts as MIGRATED for a block when block.json declares it
    `"type": "object"` (or a type list containing "object") AND the block
    does NOT also declare a `<attr>Tablet` or `<attr>Mobile` sibling
    attribute. This is the block.json-only signal from Spec 35 P1 — never
    render.php, never the DB, never a runtime switch.
    """
    migrated: dict[str, set[str]] = {}
    if not blocks_dir.is_dir():
        return migrated

    for block_json_path in sorted(blocks_dir.glob("*/block.json")):
        try:
            data = json.loads(block_json_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        slug = data.get("name")
        attrs = data.get("attributes")
        if not slug or not isinstance(attrs, dict):
            continue

        migrated_props: set[str] = set()
        for prop_name, prop_schema in attrs.items():
            if not isinstance(prop_schema, dict):
                continue
            prop_type = prop_schema.get("type")
            type_list = prop_type if isinstance(prop_type, list) else [prop_type]
            if "object" not in type_list:
                continue
            has_tablet = f"{prop_name}Tablet" in attrs
            has_mobile = f"{prop_name}Mobile" in attrs
            if has_tablet or has_mobile:
                # Object-typed WITH siblings is not the migrated shape this
                # gate is about (e.g. a per-tier media-object attribute).
                continue
            migrated_props.add(prop_name)

        if migrated_props:
            migrated[slug] = migrated_props

    return migrated


# ---------------------------------------------------------------------------
# Violation detection (structural — dict keys/values only, never raw text)
# ---------------------------------------------------------------------------

def check_flat_tier_violations(
    blocks: list[tuple[str, dict]],
    migrated_map: dict[str, set[str]],
) -> list[dict]:
    """Return a list of violation dicts for every flat-tier emission found."""
    violations: list[dict] = []

    for slug, attrs in blocks:
        if not isinstance(attrs, dict):
            continue
        migrated_props = migrated_map.get(slug)
        if not migrated_props:
            continue

        # (a) Flat-tier sibling key: <property>Tablet / <property>Mobile.
        for key, value in attrs.items():
            m = FLAT_TIER_SUFFIX_RE.match(key)
            if not m:
                continue
            base, suffix = m.group(1), m.group(2)
            if base not in migrated_props:
                continue
            violations.append({
                "rule": "(a) flat-tier sibling key on migrated property",
                "block": slug,
                "property": base,
                "emitted_key": key,
                "value": value,
                "detail": (
                    f"wp:{slug} emitted flat-tier key '{key}' for property "
                    f"'{base}', but block.json declares '{base}' as an "
                    f"object-typed (migrated) attribute with no Tablet/Mobile "
                    f"siblings. The converter must emit "
                    f"'{base}': {{\"desktop\": ..., \"tablet\": ..., "
                    f"\"mobile\": ...}} instead of the retired flat-tier "
                    f"attribute '{key}'."
                ),
            })

        # (b) Scalar base value where an object is expected.
        for base in sorted(migrated_props):
            if base not in attrs:
                continue
            value = attrs[base]
            if isinstance(value, dict):
                continue
            violations.append({
                "rule": "(b) scalar base value on migrated property",
                "block": slug,
                "property": base,
                "emitted_key": base,
                "value": value,
                "detail": (
                    f"wp:{slug} emitted '{base}' as a scalar ({value!r}), "
                    f"but block.json declares '{base}' as an object-typed "
                    f"(migrated) attribute. Expected an object shape "
                    f"({{\"desktop\": ...}}), not a flat scalar."
                ),
            })

    return violations


# ---------------------------------------------------------------------------
# Report formatting
# ---------------------------------------------------------------------------

def _hr(char: str = "─", width: int = 72) -> str:
    return char * width


def print_report(
    run_dir_label: str,
    markup_source: str,
    violations: list[dict],
    enforce: bool,
) -> None:
    status_label = "FAIL" if violations else "PASS"
    mode_label = "--enforce" if enforce else "--report (informational)"

    print(_hr("═"))
    print("  Spec 35 flat-to-object migration — clone-output divergence gate")
    print(f"  Result   : {status_label}")
    print(f"  Run dir  : {run_dir_label}")
    print(f"  Mode     : {mode_label}")
    print(f"  Source   : {markup_source or '(not found)'}")
    print(_hr("═"))

    print(f"\n{len(violations)} violation(s)")
    if violations:
        print(_hr())
        by_key: dict[tuple[str, str], int] = {}
        for v in violations:
            by_key[(v["block"], v["property"])] = by_key.get((v["block"], v["property"]), 0) + 1
        for (blk, prop), count in sorted(by_key.items()):
            print(f"  [{count}×] wp:{blk} property='{prop}'")
        print(_hr())
        print("  Full list:")
        for i, v in enumerate(violations, 1):
            print(f"  {i:3}. {v['detail']}")

    print()
    print(_hr("─"))
    if not violations:
        print("  RESULT: PASS — no flat-tier emissions found for already-migrated properties.")
    else:
        if enforce:
            print(
                "  RESULT: FAIL — the converter emitted a flat tier for a property "
                "already migrated on the target block (decisions.md D554-C). No "
                "shim exists by design; fix the converter to emit the object "
                "shape for this property, or fix the extraction if this is a "
                "false read."
            )
        else:
            print("  RESULT: FAIL (report mode — exits 0, informational only).")
            print("  Run with --enforce to hard-gate the clone on this finding.")
    print(_hr("─"))


# ---------------------------------------------------------------------------
# Self-test — proves the detector can both fire and stay silent
# ---------------------------------------------------------------------------

def _load_fixture_blocks(fixture_name: str) -> list[tuple[str, dict]]:
    fixture_dir = FIXTURES_DIR / fixture_name
    markup, _source = load_block_markup(fixture_dir)
    if not markup:
        raise AssertionError(f"self-test fixture '{fixture_name}' has no block_markup at {fixture_dir}")
    return parse_block_markup(markup)


def run_self_test() -> int:
    """Run assertion-based self-checks. Returns 0 on pass, 1 on any failure.

    Every assertion here is falsifiable: a broken detector (e.g. the regex
    stops matching, or the migrated-property map stops reading block.json)
    flips at least one of these from pass to fail. This is what makes the
    gate provably not-vacuous, per the project's standing rule that a gate
    which cannot fail reads green forever.

    R-31-1 note: no block slug is hardcoded anywhere below. Every slug used
    in an assertion is READ from the fixture file it is validating (the
    checked-in JSON fixtures are DATA, not code) — never written as a
    Python string literal compared/looked-up against `migrated_map`. This
    keeps self-test code within the same DB-first / no-hardcoded-dicts rule
    the rest of the pipeline is held to; self-test is not an exemption.
    """
    failures: list[str] = []
    migrated_map = build_migrated_property_map()

    # --- Precondition: the live tree actually has migrated properties to
    # test against. If this ever goes empty, every other assertion below is
    # vacuous, so fail loudly rather than silently passing.
    if not migrated_map:
        failures.append(
            "PRECONDITION FAILED: build_migrated_property_map() returned no "
            "migrated properties from the live block.json tree — the "
            "detector has nothing to test against, which would make every "
            "other self-test assertion vacuous."
        )

    # --- 1. POSITIVE CONTROL: the fixture emits a flat Tablet/Mobile sibling
    # key for a property that block.json declares migrated (object-typed,
    # no siblings) on the SAME block the fixture names. The subject slug is
    # read from the fixture, never hardcoded.
    try:
        positive_blocks = _load_fixture_blocks("positive")
        if not positive_blocks:
            raise AssertionError("positive fixture parsed to zero block instances")
        fixture_slug, fixture_attrs = positive_blocks[0]

        # The fixture's own JSON attrs name which base property it is
        # testing: it's whichever declared attribute has a Tablet/Mobile
        # sibling key present in the SAME instance. Derive it structurally
        # instead of hardcoding a property name.
        subject_props = {
            m.group(1)
            for key in fixture_attrs
            if (m := FLAT_TIER_SUFFIX_RE.match(key))
        }
        if not subject_props:
            raise AssertionError(
                f"positive fixture's block ({fixture_slug}) carries no "
                f"Tablet/Mobile-suffixed key to derive a subject property from"
            )

        if fixture_slug not in migrated_map or not (subject_props & migrated_map.get(fixture_slug, set())):
            failures.append(
                f"PRECONDITION FAILED: expected the positive-control "
                f"fixture's block ({fixture_slug}) subject propert{'y' if len(subject_props) == 1 else 'ies'} "
                f"{sorted(subject_props)} to include at least one migrated "
                f"(object-typed, no Tablet/Mobile siblings) attribute per "
                f"the live block.json — none matched. Either the block was "
                f"un-migrated or the detector regressed."
            )

        positive_violations = check_flat_tier_violations(positive_blocks, migrated_map)
        if not positive_violations:
            failures.append(
                "POSITIVE CONTROL FAILED: fixtures/flat-tier-gate/positive/"
                f"extract.json emits a flat-tier key for {fixture_slug} (a "
                "flat tier on a migrated property) but "
                "check_flat_tier_violations() returned zero violations. "
                "The gate is not firing on a known-bad input."
            )
        elif not any(
            v["block"] == fixture_slug and v["property"] in subject_props
            for v in positive_violations
        ):
            failures.append(
                f"POSITIVE CONTROL FAILED: violations were returned for the "
                f"positive fixture, but none identify {fixture_slug}'s "
                f"subject propert{'y' if len(subject_props) == 1 else 'ies'} "
                f"{sorted(subject_props)} specifically — the detector fired "
                f"on the wrong thing."
            )
    except Exception as exc:  # noqa: BLE001
        failures.append(f"POSITIVE CONTROL raised an exception: {exc}")

    # --- 2. NEGATIVE CONTROL: a clean clone (object-shaped emissions only,
    # no flat tiers) must NOT fire, regardless of which blocks it names.
    # The negative fixture ALSO carries a still-flat property (Tablet/Mobile
    # siblings genuinely declared in block.json) alongside the clean
    # migrated one — so this control doubles as the sibling-exclusion proof:
    # if that rule regressed and started reporting the still-flat property
    # as migrated, its Tablet/Mobile keys would trip a violation here and
    # this assertion would fail.
    try:
        negative_blocks = _load_fixture_blocks("negative")
        negative_violations = check_flat_tier_violations(negative_blocks, migrated_map)
        if negative_violations:
            failures.append(
                "NEGATIVE CONTROL FAILED: fixtures/flat-tier-gate/negative/"
                f"extract.json is a clean clone (object-shaped emissions, no "
                f"flat tiers) but the detector returned "
                f"{len(negative_violations)} violation(s): {negative_violations!r}"
            )
    except Exception as exc:  # noqa: BLE001
        failures.append(f"NEGATIVE CONTROL raised an exception: {exc}")

    # --- 3. COMMENT-SAFETY CONTROL: a block whose STRING VALUE happens to
    # contain the literal text of a flat-tier key (e.g. authored copy
    # describing the very bug this gate hunts) must NOT be flagged — only
    # real JSON KEYS count.
    try:
        comment_blocks = _load_fixture_blocks("comment-safety")
        comment_violations = check_flat_tier_violations(comment_blocks, migrated_map)
        if comment_violations:
            failures.append(
                "COMMENT-SAFETY CONTROL FAILED: fixtures/flat-tier-gate/"
                "comment-safety/extract.json contains a flat-tier-shaped "
                "substring only inside a string VALUE (block content copy) "
                "or an HTML comment, not as a JSON key, but the detector "
                f"flagged {len(comment_violations)} violation(s) anyway — "
                f"it is keying on text, not structure: {comment_violations!r}"
            )
    except Exception as exc:  # noqa: BLE001
        failures.append(f"COMMENT-SAFETY CONTROL raised an exception: {exc}")

    # --- 4. SCALAR-BASE CONTROL: emitting a migrated base property itself as
    # a flat scalar (not wrapped in Tablet/Mobile) must ALSO fire (rule b).
    # The subject property/block are read from the fixture: whichever
    # migrated property (per the live block.json) the fixture's block emits
    # as a non-dict value.
    try:
        scalar_blocks = _load_fixture_blocks("scalar-base")
        if not scalar_blocks:
            raise AssertionError("scalar-base fixture parsed to zero block instances")
        scalar_slug, scalar_attrs = scalar_blocks[0]
        scalar_subject_props = {
            base for base in migrated_map.get(scalar_slug, set())
            if base in scalar_attrs and not isinstance(scalar_attrs[base], dict)
        }
        if not scalar_subject_props:
            raise AssertionError(
                f"scalar-base fixture's block ({scalar_slug}) carries no "
                f"migrated property emitted as a non-dict scalar value to "
                f"test rule (b) against"
            )
        scalar_violations = check_flat_tier_violations(scalar_blocks, migrated_map)
        if not any(
            v["rule"].startswith("(b)") and v["block"] == scalar_slug and v["property"] in scalar_subject_props
            for v in scalar_violations
        ):
            failures.append(
                f"SCALAR-BASE CONTROL FAILED: fixtures/flat-tier-gate/"
                f"scalar-base/extract.json emits {scalar_slug}'s "
                f"{sorted(scalar_subject_props)} as a flat scalar instead "
                f"of an object, but no matching rule-(b) violation was "
                f"returned: {scalar_violations!r}"
            )
    except Exception as exc:  # noqa: BLE001
        failures.append(f"SCALAR-BASE CONTROL raised an exception: {exc}")

    print(_hr("═"))
    print("  check_flat_tier_regression.py — self-test")
    print(_hr("═"))
    if failures:
        print(f"\n{len(failures)} self-test assertion(s) FAILED:\n")
        for i, f in enumerate(failures, 1):
            print(f"  {i}. {f}")
        print()
        print(_hr("─"))
        print("  RESULT: FAIL")
        print(_hr("─"))
        return 1

    print("\nAll self-test assertions PASSED:")
    print("  - precondition: live tree has a migrated property + a still-flat one to test against")
    print("  - positive control fires on a known-bad flat-tier emission")
    print("  - negative control stays silent on a clean object-shaped emission")
    print("  - comment-safety control ignores a string VALUE match, keys structurally only")
    print("  - scalar-base control fires on a flat base value for a migrated property")
    print(_hr("─"))
    print("  RESULT: PASS")
    print(_hr("─"))
    return 0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def latest_run_dir(state_dir: Path) -> Path | None:
    """Return the most-recently-modified pipeline-state sub-directory."""
    if not state_dir.is_dir():
        return None
    candidates = [d for d in state_dir.iterdir() if d.is_dir() and not d.name.startswith(".")]
    if not candidates:
        return None
    return max(candidates, key=lambda d: d.stat().st_mtime)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Spec 35 flat-to-object migration gate: fail a clone run that "
            "emits a flat tier for a property already migrated on the "
            "target block (decisions.md D554-C)."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "run_dir",
        nargs="?",
        default=None,
        help="Path to a pipeline-state/<run> directory (or a fixture dir "
             "containing extract.json). Defaults to the most recent run "
             "under pipeline-state/.",
    )
    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument(
        "--report",
        action="store_true",
        default=True,
        help="Informational mode (default): print violations, always exit 0.",
    )
    mode_group.add_argument(
        "--enforce",
        action="store_true",
        default=False,
        help="Enforce mode: exit non-zero on any violation. No baseline, no "
             "grandfathering (D554-C) — every violation blocks.",
    )
    parser.add_argument(
        "--self-test",
        action="store_true",
        default=False,
        help="Run built-in positive/negative/comment-safety/scalar-base "
             "assertions against the checked-in fixtures and exit. Ignores "
             "run_dir/--enforce/--report.",
    )
    args = parser.parse_args(argv)

    if args.self_test:
        return run_self_test()

    enforce = args.enforce

    if args.run_dir:
        run_dir = Path(args.run_dir)
        if not run_dir.is_dir():
            print(f"ERROR: run_dir not found: {run_dir}", file=sys.stderr)
            return 2
    else:
        run_dir = latest_run_dir(PIPELINE_STATE_DIR)
        if run_dir is None:
            print(
                f"ERROR: no pipeline-state runs found under {PIPELINE_STATE_DIR}",
                file=sys.stderr,
            )
            return 2

    markup, markup_source = load_block_markup(run_dir)
    if not markup:
        print(
            f"ERROR: no block markup found in {run_dir} "
            f"(checked extract.patched.json + extract.json)",
            file=sys.stderr,
        )
        return 2

    blocks = parse_block_markup(markup)
    migrated_map = build_migrated_property_map()
    violations = check_flat_tier_violations(blocks, migrated_map)

    print_report(
        run_dir_label=run_dir.name if hasattr(run_dir, "name") else str(run_dir),
        markup_source=markup_source,
        violations=violations,
        enforce=enforce,
    )

    if enforce and violations:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
