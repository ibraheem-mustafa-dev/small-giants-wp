#!/usr/bin/env python3
"""
check_attr_schema_conformance.py — Task 3 (G2): fail closed when the converter
emits an attribute a block does not declare.

BACKGROUND
==========
Bean's ruling (decisions.md, this branch): the pipeline must FAIL CLOSED when
it is about to write a shape a block does not declare. Two real bugs shipped
silently for a fortnight before anyone caught them:

  Task 1 (commit c6ecb9f40 and follow-ups) — a root-domain OUTER-layer guard
  let a child attr masquerade as the block's own root attr (a MISROUTING bug —
  the attribute existed, but a resolver wrote it onto the wrong element).

  Task 2 (commits 4aee732d4 / 6e5170762) — assembly.py step 3b wrote an
  arrangement.layout_attrs CSS-signature-derived value straight into a
  block's attrs with no check against that block's OWN declared enum, so a
  value outside the block's closed vocabulary (e.g. "flex" written into
  sgs/gallery's ["grid","masonry","carousel"] enum) was written through and
  WP's own schema validation silently coerced it to the enum's first member
  at render time.

Both were fixed INSIDE the converter's internal resolvers (services/validate.py's
``validate()`` — attr-existence + enum-membership — is now called from every
resolver that writes a candidate value: content_band, grid, typography,
outer_box, state_value_lift, tier_object, tier_suffix, and now arrangement/
assembly step 3b). This gate is deliberately NOT another internal resolver
check — Bean's ruling asks for the GENERAL case: an independent, converter-
OUTPUT gate that re-derives the same two questions (does this attribute exist
on this block? if it has an enum, is the emitted value a member?) from the
block's OWN block.json schema, and checks the FINAL emitted markup — so a
THIRD resolver that forgets to call ``validate()`` tomorrow is still caught,
without needing a matching internal fix inside that resolver.

WHAT THIS CHECKS
================
For every ``<!-- wp:sgs/<slug> {...} -->`` instance in a clone run's
extract.json / extract.patched.json ``block_markup``:

(a) TYPE — the instance's JSON attrs contain a key that is not a legal
    attribute name for that block. "Legal" is the union of:
      1. the block's own declared ``attributes`` in ``src/blocks/<slug>/block.json``;
      2. the universal SGS editor-extension attributes
         (``includes/extension-attributes.generated.php`` — the SAME
         generated, code-derived file the live PHP filter
         ``sgs_register_extension_attrs_for_rest()`` in
         ``extension-attrs-rest-register.php`` merges onto every block that
         supports ``className``; mirrored here rather than re-declared, so
         this gate can never drift from what WP itself will actually accept),
         gated OFF only when the block's own ``supports.className`` is
         explicitly ``false`` — the exact gate the PHP filter itself applies;
      3. WordPress-core-registered attributes that are NOT declared in
         block.json's own ``attributes`` object but that WP's block-supports
         system auto-injects at registration time from the block's
         ``supports`` declaration (``align`` when ``supports.align`` is
         truthy, ``anchor`` when ``supports.anchor`` is ``true``,
         ``backgroundColor``/``textColor``/``gradient`` when the
         corresponding ``supports.color.*`` sub-flag is truthy,
         ``fontSize``/``fontFamily`` when ``supports.typography.fontSize`` /
         ``.fontFamily`` is truthy) plus the attributes WP registers on
         EVERY block regardless of supports (``className``, ``style``,
         ``lock``, ``metadata``). This mapping is WP-core's own fixed
         registration schema (wp-includes/block-supports/*.php) — a
         documented R-31-1 permitted-constant exception in the same spirit
         as ``root_supports.py``'s own CSS→style-path table, not a
         hand-maintained SGS vocabulary.

    An emitted key outside all three groups means the converter wrote a
    shape the block cannot legally hold — WP will either silently drop it
    (a plain unregistered key is simply ignored at parse/render) or, worse,
    collide with something else. Either way it is a bug to catch before
    deploy, not after.

(b) ENUM — the instance's JSON attrs contain a key that IS one of the
    block's own declared attributes, that attribute has a declared
    ``"enum"`` array in block.json, and the emitted value (only checked
    when it is a plain scalar — string/number/boolean, never a dict/list,
    since no migrated tier-object or repeater attr carries an ``enum``)
    is NOT a member of that array. WP's schema validation would otherwise
    silently coerce it to the enum's first member at render — the exact
    failure mode Task 2 fixed for one resolver; this is the general,
    output-side backstop for every resolver, present and future.

WHY BLOCK.JSON, NOT THE SHARED sgs-framework.db
================================================
services/validate.py (the Task 1/2 internal gate) reads its schema from
``block_attributes`` in the shared, concurrently-mutated sgs-framework.db —
appropriate there, since it runs mid-conversion inside the same process that
already opened that connection. This gate runs post-clone, standalone, and
is meant to be a trustworthy final backstop — it must not inherit the shared
DB's classifier-drift noise (the same ~85-row concurrent-session drift that
forced ``--no-verify`` on both Task 1 and Task 2's commits; see those commits'
messages). block.json is the block's own on-disk schema declaration, the
same source ``check_flat_tier_regression.py`` already reads for the parallel
Spec 35 gate, and does not depend on the live DB's current mutation state.

EXIT CODES (--enforce mode, the mode pipeline-stage-gate.py uses)
==================================================================
0 — no TYPE/ENUM violations found
1 — one or more violations found
2 — usage error (missing/unreadable extract.json, missing run_dir)

EXIT CODES (--report mode, default when run standalone)
=========================================================
Always 0. Violations printed for information only.

USAGE
=====
    # Report mode (default) — safe to run any time, never blocks
    python check_attr_schema_conformance.py [<run_dir>]

    # Enforce mode — the mode pipeline-stage-gate.py invokes
    python check_attr_schema_conformance.py [<run_dir>] --enforce

    # Self-test — proves the detector can both fire and stay silent, using
    # the checked-in fixtures under scripts/fixtures/attr-schema-gate/, PLUS
    # a real historical clone run (Task 3 brief requirement #5)
    python check_attr_schema_conformance.py --self-test

    # <run_dir> defaults to the most-recent directory under pipeline-state/

WIRING
======
Wired into pipeline-stage-gate.py as ``gate_attr_schema_conformance()``,
called from ``run_all_gates()`` right after the Spec 35 flat-tier gate, using
the same post-Stage-9 extract.json chokepoint as the other two gates.
``--skip-attr-schema-gate`` (mirroring the pre-existing
``--skip-flat-tier-gate`` shape) opts out for diagnostic-only runs.

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
INCLUDES_DIR = REPO_ROOT / "plugins" / "sgs-blocks" / "includes"
EXTENSION_ATTRS_PHP = INCLUDES_DIR / "extension-attributes.generated.php"
FIXTURES_DIR = HERE.parent / "fixtures" / "attr-schema-gate"

# Reuse the structural (never comment-text) block-markup parser + loader from
# the sibling R-31-15 gate rather than re-implementing JSON extraction.
sys.path.insert(0, str(HERE))
from check_no_mirror import load_block_markup, parse_block_markup  # noqa: E402


# ---------------------------------------------------------------------------
# WP-core native-supports attribute map (R-31-1 permitted-constant exception —
# this is WordPress-core's OWN fixed block-supports registration schema,
# wp-includes/block-supports/*.php, not an SGS DB vocabulary — the same
# exception class root_supports.py's own CSS->style-path table documents).
# ---------------------------------------------------------------------------

# Attributes WP registers on every block regardless of its own `supports`
# declaration.
ALWAYS_LEGAL_NATIVE_ATTRS: frozenset[str] = frozenset(["className", "style", "lock", "metadata"])

# supports-key -> (subkey-or-None, attribute name). subkey=None means the
# support itself just needs to be truthy (True, a non-empty list/dict).
_CONDITIONAL_NATIVE_ATTRS: tuple[tuple[str, str | None, str], ...] = (
    ("align", None, "align"),
    ("anchor", None, "anchor"),
    ("color", "background", "backgroundColor"),
    ("color", "text", "textColor"),
    ("color", "gradients", "gradient"),
    ("typography", "fontSize", "fontSize"),
    ("typography", "fontFamily", "fontFamily"),
    ("__experimentalBorder", "color", "borderColor"),
    ("shadow", None, "shadow"),
)


def _supports_truthy(supports: dict, top_key: str, sub_key: str | None) -> bool:
    """Mirror root_supports.py's ``_support_allows`` truthiness rule."""
    if top_key not in supports:
        return False
    val = supports[top_key]
    if sub_key is None:
        if isinstance(val, dict):
            return True  # a supports dict presence is itself the flag (e.g. align/anchor never nest)
        return bool(val)
    if val is True:
        return True
    if isinstance(val, dict):
        return bool(val.get(sub_key))
    return False


def native_supports_attrs(block_json: dict) -> frozenset[str]:
    """Return the WP-core attribute names this block's own `supports` block
    causes WordPress to auto-register, on top of ALWAYS_LEGAL_NATIVE_ATTRS.
    """
    supports = block_json.get("supports") or {}
    names: set[str] = set()
    for top_key, sub_key, attr_name in _CONDITIONAL_NATIVE_ATTRS:
        if _supports_truthy(supports, top_key, sub_key):
            names.add(attr_name)
    return frozenset(names)


# ---------------------------------------------------------------------------
# Universal SGS editor-extension attributes (code-derived, never hand-copied)
# ---------------------------------------------------------------------------

def load_extension_attr_names(php_path: Path = EXTENSION_ATTRS_PHP) -> frozenset[str]:
    """Parse the generated PHP attribute-schema array's KEYS.

    Deliberately does not execute PHP — this is a static array literal
    (``'name' => array( 'type' => ... )``) generated by
    ``scripts/generate-extension-attributes.js`` from the extension JS, the
    same file ``extension-attrs-rest-register.php`` requires server-side.
    Reading it here (rather than re-declaring the ~90 fx*/sgs* names by
    hand) is what keeps this gate from drifting the moment a new extension
    attribute is added — mirrors this module's own R-31-1 discipline.
    """
    try:
        text = php_path.read_text(encoding="utf-8")
    except OSError:
        return frozenset()
    return frozenset(re.findall(r"'([A-Za-z0-9_]+)'\s*=>\s*array\(", text))


# ---------------------------------------------------------------------------
# Block schema loading (block.json is the source of truth — never the shared,
# concurrently-mutated sgs-framework.db; see module docstring)
# ---------------------------------------------------------------------------

def load_block_json(slug: str, blocks_dir: Path = BLOCKS_DIR) -> dict | None:
    block_dir_name = slug.split("/")[-1]
    path = blocks_dir / block_dir_name / "block.json"
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def legal_attr_names(
    block_json: dict,
    extension_attrs: frozenset[str],
) -> frozenset[str]:
    """Union of every attribute name legally emittable on this block."""
    declared = frozenset((block_json.get("attributes") or {}).keys())
    supports = block_json.get("supports") or {}

    # Mirror sgs_register_extension_attrs_for_rest()'s own opt-out gate
    # exactly: extension attrs are withheld ONLY when supports.className is
    # explicitly False.
    class_name_support = supports.get("className")
    extension_names = frozenset() if class_name_support is False else extension_attrs

    return declared | extension_names | native_supports_attrs(block_json) | ALWAYS_LEGAL_NATIVE_ATTRS


def declared_enum(block_json: dict, attr_name: str) -> list | None:
    attrs = block_json.get("attributes") or {}
    schema = attrs.get(attr_name)
    if not isinstance(schema, dict):
        return None
    enum = schema.get("enum")
    if isinstance(enum, list) and enum:
        return enum
    return None


# ---------------------------------------------------------------------------
# Violation detection (structural — dict keys/values only, never raw text)
# ---------------------------------------------------------------------------

def check_attr_schema_violations(
    blocks: list[tuple[str, dict]],
    blocks_dir: Path = BLOCKS_DIR,
    extension_attrs: frozenset[str] | None = None,
) -> list[dict]:
    """Return a list of violation dicts for every TYPE/ENUM mismatch found."""
    if extension_attrs is None:
        extension_attrs = load_extension_attr_names()

    violations: list[dict] = []
    schema_cache: dict[str, dict | None] = {}

    for slug, attrs in blocks:
        if not isinstance(attrs, dict) or not slug.startswith("sgs/"):
            continue

        if slug not in schema_cache:
            schema_cache[slug] = load_block_json(slug, blocks_dir=blocks_dir)
        block_json = schema_cache[slug]
        if block_json is None:
            # No block.json found for this slug — nothing to validate against.
            # (Never a violation in its own right; a missing/renamed block is
            # a different problem this gate does not attempt to diagnose.)
            continue

        legal = legal_attr_names(block_json, extension_attrs)

        for key, value in attrs.items():
            # --- (a) TYPE: is this even a legal attribute name? ---
            if key not in legal:
                violations.append({
                    "rule": "(a) undeclared attribute",
                    "block": slug,
                    "attr": key,
                    "value": value,
                    "detail": (
                        f"wp:{slug} emitted attribute '{key}', which is not "
                        f"declared in {slug}'s block.json 'attributes', not a "
                        f"universal SGS extension attribute, and not a "
                        f"WP-core supports-injected attribute for this block. "
                        f"WP will silently ignore or mishandle this key at "
                        f"render — the converter wrote a shape this block "
                        f"does not declare."
                    ),
                })
                continue  # a key that isn't even legal has no enum to check

            # --- (b) ENUM: if constrained, is the value a member? ---
            enum = declared_enum(block_json, key)
            if enum is None:
                continue
            if isinstance(value, (dict, list)):
                continue  # migrated tier-objects/repeaters never carry an enum
            if value not in enum:
                violations.append({
                    "rule": "(b) out-of-enum value",
                    "block": slug,
                    "attr": key,
                    "value": value,
                    "enum": enum,
                    "detail": (
                        f"wp:{slug} emitted '{key}': {value!r}, but block.json "
                        f"declares '{key}' with enum {enum!r} — {value!r} is "
                        f"not a member. WP's schema validation silently "
                        f"coerces an out-of-enum value to the enum's first "
                        f"member at render time (the exact bug D554-era "
                        f"Task 2 fixed for one resolver — this is the "
                        f"general, output-side backstop)."
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
    print("  Attribute-schema conformance gate (Task 3 / G2 — fail closed on an undeclared shape)")
    print(f"  Result   : {status_label}")
    print(f"  Run dir  : {run_dir_label}")
    print(f"  Mode     : {mode_label}")
    print(f"  Source   : {markup_source or '(not found)'}")
    print(_hr("═"))

    type_violations = [v for v in violations if v["rule"].startswith("(a)")]
    enum_violations = [v for v in violations if v["rule"].startswith("(b)")]

    print(f"\nRule (a) Undeclared attribute (TYPE) : {len(type_violations)} violation(s)")
    print(f"Rule (b) Out-of-enum value (ENUM)    : {len(enum_violations)} violation(s)")

    if violations:
        print(_hr())
        print("  Full list:")
        for i, v in enumerate(violations, 1):
            print(f"  {i:3}. {v['detail']}")

    print()
    print(_hr("─"))
    if not violations:
        print("  RESULT: PASS — every emitted attribute is declared on its block, "
              "and every enum-constrained value is a member.")
    else:
        if enforce:
            print(
                "  RESULT: FAIL — the converter emitted a shape the target block "
                "does not declare. Fix the converter (the resolver that wrote this "
                "attribute/value), or fix the extraction if this is a false read."
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

    Every assertion is falsifiable: a broken detector (the legal-attr union
    stops reading block.json, the enum check stops firing, the PHP-parse
    regex breaks) flips at least one of these from pass to fail — the
    project's standing non-vacuity rule.
    """
    failures: list[str] = []
    warnings: list[str] = []
    extension_attrs = load_extension_attr_names()

    # --- Precondition: the extension-attrs file actually parsed something,
    # else every "legal because it's a universal extension attr" assumption
    # below is untested.
    if not extension_attrs:
        failures.append(
            "PRECONDITION FAILED: load_extension_attr_names() returned an "
            "empty set — either extension-attributes.generated.php is "
            "missing/unreadable, or the parse regex broke. Every fixture "
            "relying on a universal sgs*/fx* attribute being legal is "
            "untested."
        )

    # --- 1. POSITIVE CONTROL (TYPE): a fixture emits an attribute that is
    # not declared on its block, not a universal extension attr, and not a
    # WP-core supports-injected attr. Must be caught by rule (a).
    try:
        pos_type_blocks = _load_fixture_blocks("positive-type")
        if not pos_type_blocks:
            raise AssertionError("positive-type fixture parsed to zero block instances")
        slug, attrs = pos_type_blocks[0]
        block_json = load_block_json(slug)
        if block_json is None:
            raise AssertionError(f"positive-type fixture's block ({slug}) has no block.json — fixture is stale")
        legal = legal_attr_names(block_json, extension_attrs)
        bogus_keys = [k for k in attrs if k not in legal]
        if not bogus_keys:
            failures.append(
                f"PRECONDITION FAILED: positive-type fixture's block ({slug}) "
                f"carries no attribute outside the legal set — nothing for "
                f"rule (a) to catch. Either the fixture regressed or the "
                f"legal-attr union grew wide enough to legitimise it."
            )
        else:
            pos_violations = check_attr_schema_violations(pos_type_blocks, extension_attrs=extension_attrs)
            if not any(
                v["rule"].startswith("(a)") and v["block"] == slug and v["attr"] in bogus_keys
                for v in pos_violations
            ):
                failures.append(
                    f"POSITIVE CONTROL (TYPE) FAILED: fixtures/attr-schema-gate/"
                    f"positive-type/extract.json emits undeclared attribute(s) "
                    f"{bogus_keys} on {slug}, but check_attr_schema_violations() "
                    f"did not flag any of them: {pos_violations!r}"
                )
    except Exception as exc:  # noqa: BLE001
        failures.append(f"POSITIVE CONTROL (TYPE) raised an exception: {exc}")

    # --- 2. POSITIVE CONTROL (ENUM): a fixture emits a DECLARED attribute
    # with an out-of-enum scalar value. Must be caught by rule (b).
    try:
        pos_enum_blocks = _load_fixture_blocks("positive-enum")
        if not pos_enum_blocks:
            raise AssertionError("positive-enum fixture parsed to zero block instances")
        slug, attrs = pos_enum_blocks[0]
        block_json = load_block_json(slug)
        if block_json is None:
            raise AssertionError(f"positive-enum fixture's block ({slug}) has no block.json — fixture is stale")
        bad_enum_keys = [
            k for k, v in attrs.items()
            if not isinstance(v, (dict, list))
            and (enum := declared_enum(block_json, k)) is not None
            and v not in enum
        ]
        if not bad_enum_keys:
            failures.append(
                f"PRECONDITION FAILED: positive-enum fixture's block ({slug}) "
                f"carries no declared-enum attribute with an out-of-enum "
                f"scalar value — nothing for rule (b) to catch against the "
                f"live block.json. Either the fixture regressed or the "
                f"block's enum widened to include the fixture's value."
            )
        else:
            pos_violations = check_attr_schema_violations(pos_enum_blocks, extension_attrs=extension_attrs)
            if not any(
                v["rule"].startswith("(b)") and v["block"] == slug and v["attr"] in bad_enum_keys
                for v in pos_violations
            ):
                failures.append(
                    f"POSITIVE CONTROL (ENUM) FAILED: fixtures/attr-schema-gate/"
                    f"positive-enum/extract.json emits out-of-enum value(s) for "
                    f"{bad_enum_keys} on {slug}, but check_attr_schema_violations() "
                    f"did not flag any of them: {pos_violations!r}"
                )
    except Exception as exc:  # noqa: BLE001
        failures.append(f"POSITIVE CONTROL (ENUM) raised an exception: {exc}")

    # --- 3. NEGATIVE CONTROL: a clean clone (every emitted attribute
    # declared, or a universal/native attr; every enum-constrained value a
    # member) must NOT fire.
    try:
        negative_blocks = _load_fixture_blocks("negative")
        negative_violations = check_attr_schema_violations(negative_blocks, extension_attrs=extension_attrs)
        if negative_violations:
            failures.append(
                "NEGATIVE CONTROL FAILED: fixtures/attr-schema-gate/negative/"
                f"extract.json is a clean clone but the detector returned "
                f"{len(negative_violations)} violation(s): {negative_violations!r}"
            )
    except Exception as exc:  # noqa: BLE001
        failures.append(f"NEGATIVE CONTROL raised an exception: {exc}")

    # --- 4. COMMENT-SAFETY CONTROL: a block whose STRING VALUE (real block
    # content) happens to contain text shaped like an undeclared-attribute
    # name or an out-of-enum value must NOT be flagged — only real JSON
    # KEYS/VALUES on the enum-constrained attribute itself count.
    try:
        comment_blocks = _load_fixture_blocks("comment-safety")
        comment_violations = check_attr_schema_violations(comment_blocks, extension_attrs=extension_attrs)
        if comment_violations:
            failures.append(
                "COMMENT-SAFETY CONTROL FAILED: fixtures/attr-schema-gate/"
                "comment-safety/extract.json contains undeclared-attribute-"
                "shaped text only inside a string VALUE (block content copy), "
                "not as a real JSON key/value on a constrained attribute, but "
                f"the detector flagged {len(comment_violations)} violation(s) "
                f"anyway — it is keying on text, not structure: {comment_violations!r}"
            )
    except Exception as exc:  # noqa: BLE001
        failures.append(f"COMMENT-SAFETY CONTROL raised an exception: {exc}")

    # --- 5. REAL-CLONE-RUN REGRESSION + INJECT/REVERT PROOF (brief
    # requirement #5): a CHECKED-IN fixture holding the verbatim
    # block_markup from a real historical clone run
    # (pipeline-state/mamas-munches-homepage-qa-2849-2026-08-26-223048,
    # 77 block instances, verified 2026-08-27 to score zero violations
    # against the live block.json tree at commit time — see the fixture's
    # own _fixture_purpose) must score CLEAN (proves the gate does not
    # false-positive on real, correct converter output), and injecting a
    # single undeclared attribute into a copy of that real run's parsed
    # blocks must be caught (proves the gate is not vacuous against a real,
    # full-size clone — 77 instances, not a 1-2-block synthetic fixture),
    # and re-checking the ORIGINAL (unmutated) blocks afterwards must still
    # be clean (proves the injection probe copied rather than mutated
    # shared state). Checked in as a fixture (mirrors
    # check_flat_tier_regression.py's own "real-tree-injection" fixture)
    # rather than scanned live from pipeline-state/, because pipeline-state/
    # is gitignored working state — a fresh worktree/CI checkout legitimately
    # has none, and this control must not hard-fail there.
    try:
        real_blocks = _load_fixture_blocks("real-tree-injection")
        if not real_blocks:
            raise AssertionError("real-tree-injection fixture parsed to zero block instances")

        clean_violations = check_attr_schema_violations(real_blocks, extension_attrs=extension_attrs)
        if clean_violations:
            failures.append(
                "REAL-CLONE-RUN REGRESSION: fixtures/attr-schema-gate/"
                "real-tree-injection/extract.json (a real historical clone "
                f"run, expected clean) now raises {len(clean_violations)} "
                f"violation(s) — either the gate is over-broad (false "
                f"positive on real converter output) or the live block.json "
                f"tree diverged from this fixture's assumptions: "
                f"{clean_violations!r}"
            )

        # INJECT: add one undeclared attribute to a COPY of the first sgs/*
        # block instance, prove the gate fires against a real, full-size
        # clone run (77 instances), not just a small synthetic fixture.
        sgs_blocks = [(s, a) for s, a in real_blocks if s.startswith("sgs/")]
        if not sgs_blocks:
            raise AssertionError("real-tree-injection fixture has no sgs/* block instances to inject into")

        inject_slug, _inject_attrs = sgs_blocks[0]
        injected_blocks = [(s, dict(a)) for s, a in real_blocks]
        injected_once = False
        for s, a in injected_blocks:
            if s == inject_slug and not injected_once:
                a["__task3SelfTestBogusAttr"] = "nope"
                injected_once = True
                break
        injected_violations = check_attr_schema_violations(injected_blocks, extension_attrs=extension_attrs)
        if not any(
            v["rule"].startswith("(a)")
            and v["block"] == inject_slug
            and v["attr"] == "__task3SelfTestBogusAttr"
            for v in injected_violations
        ):
            failures.append(
                f"INJECT/REVERT PROOF FAILED: adding an undeclared attribute "
                f"to a copy of {inject_slug} from the real historical clone "
                f"run did not trigger a violation — the gate cannot fire on "
                f"real, full-size converter output."
            )

        # REVERT: the ORIGINAL (unmutated) parse must still be clean — proves
        # the injection probe copied rather than mutated shared state.
        revert_violations = check_attr_schema_violations(real_blocks, extension_attrs=extension_attrs)
        if revert_violations:
            failures.append(
                "INJECT/REVERT PROOF FAILED: the original real-run parse is "
                f"no longer clean after the injection probe (mutation "
                f"leaked): {revert_violations!r}"
            )
    except Exception as exc:  # noqa: BLE001
        failures.append(f"REAL-CLONE-RUN REGRESSION control raised an exception: {exc}")

    # --- 5b. BONUS (non-failing): if a LIVE pipeline-state/ run also happens
    # to be present locally (this repo's own worktree, or a developer running
    # the self-test straight after a real /sgs-clone), score it too and
    # report as a warning-only extra data point — never a self-test failure,
    # since pipeline-state/ content is not guaranteed to exist in every
    # checkout.
    try:
        live_run_dir = _find_real_verification_run_dir()
        if live_run_dir is not None:
            live_markup, _source = load_block_markup(live_run_dir)
            live_blocks = parse_block_markup(live_markup)
            live_violations = check_attr_schema_violations(live_blocks, extension_attrs=extension_attrs)
            if live_violations:
                warnings.append(
                    f"BONUS CHECK: live pipeline-state run {live_run_dir.name} "
                    f"(found locally, not part of the pass/fail gate) scored "
                    f"{len(live_violations)} violation(s) — worth a look, but "
                    f"not a self-test failure: {live_violations!r}"
                )
    except Exception as exc:  # noqa: BLE001
        warnings.append(f"BONUS live pipeline-state check raised an exception (non-fatal): {exc}")

    print(_hr("═"))
    print("  check_attr_schema_conformance.py — self-test")
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
    print("  - precondition: extension-attributes.generated.php parsed a non-empty attribute set")
    print("  - positive control (TYPE) fires on a known-undeclared attribute")
    print("  - positive control (ENUM) fires on a known out-of-enum value")
    print("  - negative control stays silent on a clean, fully-legal emission")
    print("  - comment-safety control ignores a string VALUE match, keys structurally only")
    print("  - real historical clone run (checked-in fixture, 77 instances) scores clean, "
          "and inject/revert proves the gate fires on it")
    if warnings:
        print(f"\n{len(warnings)} non-fatal warning(s):")
        for i, w in enumerate(warnings, 1):
            print(f"  {i}. {w}")
    print(_hr("─"))
    print("  RESULT: PASS")
    print(_hr("─"))
    return 0


def _find_real_verification_run_dir() -> Path | None:
    """Locate a real historical pipeline-state run to verify the gate
    against (brief requirement #5 — never a synthetic fixture alone).

    pipeline-state/ is a working directory, not tracked in git (each
    worktree/session accumulates its own runs), so this is deliberately a
    best-effort discovery rather than a hardcoded run name: any run under
    pipeline-state/ carrying a non-empty extract.json/extract.patched.json
    ``block_markup`` with at least one ``sgs/*`` instance qualifies. Picks
    the most recently modified candidate for determinism run-to-run.
    """
    if not PIPELINE_STATE_DIR.is_dir():
        return None
    candidates: list[tuple[float, Path]] = []
    for d in PIPELINE_STATE_DIR.iterdir():
        if not d.is_dir() or d.name.startswith("."):
            continue
        markup, _source = load_block_markup(d)
        if not markup or "wp:sgs/" not in markup:
            continue
        candidates.append((d.stat().st_mtime, d))
    if not candidates:
        return None
    candidates.sort(key=lambda t: t[0], reverse=True)
    return candidates[0][1]


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
            "Attribute-schema conformance gate: fail a clone run that emits "
            "an attribute a block does not declare, or an out-of-enum value "
            "for one it does (Task 3 / G2 — fail closed on an undeclared shape)."
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
             "grandfathering — every violation blocks.",
    )
    parser.add_argument(
        "--self-test",
        action="store_true",
        default=False,
        help="Run built-in positive/negative/comment-safety/real-run "
             "assertions and exit. Ignores run_dir/--enforce/--report.",
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
    violations = check_attr_schema_violations(blocks)

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
