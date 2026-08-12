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

WHAT "ALREADY MIGRATED" MEANS (Spec 35 P1 design + 2026-08-12 PHP-evidence fix)
================================================================================
A property's phase starts from block.json's attribute `type` — never the DB,
never a runtime switch such as `responsive_model`/`container_queries` (an
earlier draft got this wrong; sgs/gallery opts into container queries yet is
still mid-migration on other properties) — but block.json ALONE is NOT
sufficient, per a 2026-08-12 fix described below.

  OBJECT (candidate) = the base attribute is declared `"type": "object"` in
                        block.json, with NO `<attr>Tablet` / `<attr>Mobile`
                        sibling attributes also declared, AND the attribute's
                        own name does not itself end in a breakpoint suffix
                        (see BUG 1 below).
  FLAT   (not yet)    = the base attribute is declared as a scalar type
                        (string/number/boolean/etc.) WITH those siblings
                        declared.

A base attribute typed `"object"` that DOES still have Tablet/Mobile
siblings (e.g. an object-shaped media picker with per-tier variants) is
NOT the migrated single-object-attr shape this gate is about — it's left
alone.

⛔ BUG 1 (fixed 2026-08-12) — SUFFIX-NAMED SIBLINGS WERE SELF-PROMOTED.
An attribute whose OWN name ends in a breakpoint suffix (`marginTablet`,
`paddingMobile`) is itself a per-tier SIBLING of some other (possibly
undeclared) base property — never a migrated base property in its own
right. The original block.json-only scan wrongly added `marginTablet` /
`marginMobile` / `paddingTablet` / `paddingMobile` themselves to the
migrated set on `sgs/text`, purely because EACH has no further
Tablet/Mobile sibling OF ITS OWN (verified live: `sgs/text` declares
`marginTablet`/`marginMobile` as real, still-active object-typed box
overrides with NO base `margin` attribute at all). Fixed by excluding any
OBJECT candidate whose own name ends in a DB-derived breakpoint suffix
(`_breakpoint_suffixes()`, R-31-1 — never a hardcoded `{Tablet,Mobile,...}`
dict).

⛔ BUG 2 (fixed 2026-08-12) — THE OBJECT-TYPED-CANDIDATE TEST CANNOT TELL A
MIGRATED TIER-OBJECT (SHAPE 2) FROM A BASE-ONLY BOX WITH NO TIER DESTINATION
AT ALL (SHAPE 3). Both are declared `"type":"object"` with no Tablet/Mobile
siblings; both can carry an IDENTICAL `box_family` column value and an
IDENTICAL `{}` default_value (verified live against sgs-framework.db
2026-08-12 — `sgs/container.gridItemPadding` [Shape 2, confirmed migrated —
see below] and `sgs/text.borderWidth` [Shape 3] are indistinguishable on
`attr_type`, `box_family`, `is_responsive` AND `default_value` alike). Only
the property's REAL PHP consumer tells them apart:

  SHAPE 2 (genuinely migrated) — the attribute's value reaches
  `sgs_responsive_normalise_object()` (directly, or indirectly via a
  `'value' => $attributes['<attr>']` entry collected into an
  `sgs_emit_responsive_css()` prop-map, or via the shared
  `sgs_typography_css_rule( $attributes, '<prefix>', … )` helper for a
  `<prefix>{FontSize,LineHeight,LetterSpacing,…}` attribute). Confirmed
  live for `sgs/container.gridItemPadding`: `class-sgs-container-wrapper.php`
  ~:2279-2287 collects it into `$obj_inner_props` and emits it via
  `sgs_emit_responsive_css()` (Spec 35 Phase 1.4b "STAGE 2", landed
  2026-08-10 — a comment a few lines above, ~:2204-2213, calls this same
  work "deferred", but that comment is now STALE: the code beneath it, at
  ~:2250, explicitly says so — "the STAGE 2 deferral comment above
  speculated [wrongly]" — and was verified by reading the merge branches).

  SHAPE 3 (base-only box, no tier destination) — the attribute's ONLY PHP
  read is a flat, direct one, e.g. `sgs/text.borderWidth`:
  `$border_width_obj = is_array( $attributes['borderWidth'] ?? null )
  ? $attributes['borderWidth'] : array();` (text/render.php:141) — never
  routed through the tier-normalisation pipeline anywhere.

`_attr_tier_consumer_evidence()` below implements this PHP-evidence check
by scanning the block's own render.php PLUS the shared
`class-sgs-container-wrapper.php`. A candidate that fails this check is
EXCLUDED from the migrated set — conservative by design: an honest narrower
gate beats a wrong broader one (a false positive here would hard-halt a
correct clone for a property the gate misunderstands).

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
import functools
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
HERE = Path(__file__).parent
_SCRIPTS_ROOT = HERE.parent  # .../plugins/sgs-blocks/scripts
REPO_ROOT = HERE.parent.parent.parent.parent  # plugins/sgs-blocks/scripts/orchestrator -> repo root
PIPELINE_STATE_DIR = REPO_ROOT / "pipeline-state"
BLOCKS_DIR = REPO_ROOT / "plugins" / "sgs-blocks" / "src" / "blocks"
INCLUDES_DIR = REPO_ROOT / "plugins" / "sgs-blocks" / "includes"
WRAPPER_PHP = INCLUDES_DIR / "class-sgs-container-wrapper.php"
HELPERS_TYPOGRAPHY_PHP = INCLUDES_DIR / "helpers-typography.php"
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
# DB-backed breakpoint suffix vocabulary (R-31-1 — never a hardcoded dict)
# ---------------------------------------------------------------------------

def _get_db_lookup():
    """Lazy-import converter.db.db_lookup (same pattern as css_router.py's
    _get_db()), so this module still loads without the converter package on
    sys.path (test isolation)."""
    if str(_SCRIPTS_ROOT) not in sys.path:
        sys.path.insert(0, str(_SCRIPTS_ROOT))
    from converter.db import db_lookup
    return db_lookup


@functools.lru_cache(maxsize=None)
def _breakpoint_suffixes() -> tuple[str, ...]:
    """{'Mobile', 'Tablet', 'Desktop'} from modifier_suffixes WHERE kind='breakpoint'.

    R-31-1: the breakpoint suffix vocabulary is DB-owned; hardcoding it here
    would be exactly the violation tier_suffix.py's own docstring records
    against its retired `_TIER_SUFFIX` literal dict.
    """
    return _get_db_lookup().modifier_suffixes("breakpoint")


# ---------------------------------------------------------------------------
# PHP-consumer evidence (2026-08-12 fix — see module docstring "BUG 2")
# ---------------------------------------------------------------------------

@functools.lru_cache(maxsize=None)
def _read_text_cached(path_str: str) -> str:
    try:
        return Path(path_str).read_text(encoding="utf-8")
    except OSError:
        return ""


@functools.lru_cache(maxsize=None)
def _typography_property_suffixes(helpers_path: Path = HELPERS_TYPOGRAPHY_PHP) -> frozenset[str]:
    """Derive the typography sub-property suffix vocabulary (FontSize,
    LineHeight, LetterSpacing, …) from helpers-typography.php itself —
    the ONE shared `sgs_typography_attr( $prefix, '<Suffix>' )` helper's own
    call sites inside `sgs_typography_css_rule()` ARE the source of truth,
    so this is code-derived, not a hardcoded property-name dict (R-31-1
    targets the DB-owned MODIFIER suffix grammar specifically; this is a
    different vocabulary — the shared PHP helper's own fixed parameter
    names — with no DB table of its own, so deriving it from the one place
    it is defined is the R-31-1-consistent choice over inventing either a
    literal list or a DB table for a two-file convention).

    Scan is bounded to `sgs_typography_css_rule()`'s own body (up to the
    next top-level `function `) so an unrelated later use of
    `sgs_typography_attr()` elsewhere in the file cannot smuggle in an
    unrelated suffix.
    """
    text = _read_text_cached(str(helpers_path))
    start = text.find("function sgs_typography_css_rule")
    if start == -1:
        return frozenset()
    end = text.find("\nfunction ", start + 1)
    if end == -1:
        end = len(text)
    body = text[start:end]
    return frozenset(re.findall(r"sgs_typography_attr\(\s*\$prefix\s*,\s*['\"]([A-Za-z]+)['\"]", body))


def _lcfirst(value: str) -> str:
    return value[:1].lower() + value[1:] if value else value


def _attr_tier_consumer_evidence(
    block_slug: str,
    attr_name: str,
    blocks_dir: Path = BLOCKS_DIR,
    wrapper_path: Path = WRAPPER_PHP,
) -> bool:
    """Return True when real PHP evidence shows `attr_name` on `block_slug`
    is genuinely read through the tier-normalisation pipeline
    (`sgs_responsive_normalise_object()` — directly, indirectly via a
    `'value' => $attributes['<attr>']` entry collected into an
    `sgs_emit_responsive_css()` prop-map, indirectly via a
    `'<attr>' => '<css-prop>'` array driving a `foreach ( … as $sgs_attr =>
    $sgs_css_prop )` DYNAMIC-KEY dispatch into the same prop-map (the
    class-sgs-container-wrapper.php "LAYOUT properties" loop —
    `gridTemplateRows` is the live example: its `'value' => $attributes[
    $sgs_attr ]` never contains the literal string 'gridTemplateRows', only
    the array key does), or via the shared `sgs_typography_css_rule()`
    helper) — i.e. is truly Shape 2 (a migrated tier-object), never merely
    Shape 3 (an object-typed, sibling-free box attribute with NO
    device-tier destination at all — see module docstring "BUG 2"). Scans
    the block's own render.php PLUS the shared
    class-sgs-container-wrapper.php, since composite blocks (container,
    hero, cta-section, trust-bar, accordion, …) delegate wrapper-level
    properties like `gap`/`gridItemPadding` to that one shared file rather
    than reading them inline. Also covers the sibling tier-boolean pair
    `sgs_resolve_on_tiers()` / `sgs_emit_tier_rules()` (helpers-responsive.php,
    same file as `sgs_responsive_normalise_object()`) — live example:
    `sgs/site-header.headerHideOnScroll` assigns `$sh_hide =
    $attributes['headerHideOnScroll']` then calls
    `sgs_resolve_on_tiers( $sh_hide, … )` several lines later, so the attr
    name never appears as a literal argument to the tier function itself —
    traced via the assigned variable name, not a literal-string match.
    """
    block_dir_name = block_slug.split("/")[-1]
    candidate_paths = [blocks_dir / block_dir_name / "render.php", wrapper_path]

    direct_re = re.compile(
        r"sgs_responsive_normalise_object\(\s*\$attributes\[\s*['\"]"
        + re.escape(attr_name) + r"['\"]\s*\]"
    )
    collected_re = re.compile(
        r"'value'\s*=>\s*\$attributes\[\s*['\"]" + re.escape(attr_name) + r"['\"]\s*\]"
    )
    dynamic_key_array_re = re.compile(
        r"['\"]" + re.escape(attr_name) + r"['\"]\s*=>\s*['\"][^'\"]*['\"]\s*,"
    )
    dynamic_key_dispatch_re = re.compile(r"'value'\s*=>\s*\$attributes\[\s*\$\w+\s*\]")
    emit_re = re.compile(r"sgs_emit_responsive_css\(")
    # $var = [is_array(]?[isset(]? $attributes['<attr>'] ... — captures the
    # variable name a value is assigned into, regardless of the guard idiom
    # wrapping it (is_array(...?...), isset(...)?...:, or a bare assignment).
    var_assign_re = re.compile(
        r"\$(\w+)\s*=[^;]*\$attributes\[\s*['\"]" + re.escape(attr_name) + r"['\"]\s*\]"
    )
    tier_fn_call_re = re.compile(r"sgs_(?:resolve_on_tiers|emit_tier_rules)\(")

    typo_suffixes = _typography_property_suffixes()
    # Longest suffix first so e.g. 'LineHeightUnit' is tried before 'LineHeight'.
    prefixed_matches = sorted(
        (s for s in typo_suffixes if attr_name.endswith(s) and attr_name != s),
        key=len, reverse=True,
    )
    # prefix='' case: sgs_typography_attr('', 'FontSize') === lcfirst('FontSize')
    # === 'fontSize' — the suffix's own casing doesn't appear as a literal
    # tail on the attr name here, so it needs its own equality check.
    base_level_suffix = next(
        (s for s in typo_suffixes if attr_name == _lcfirst(s)), None
    )

    for path in candidate_paths:
        if not path.is_file():
            continue
        text = _read_text_cached(str(path))
        if direct_re.search(text):
            return True
        if collected_re.search(text) and emit_re.search(text):
            return True
        if (
            dynamic_key_array_re.search(text)
            and dynamic_key_dispatch_re.search(text)
            and emit_re.search(text)
        ):
            return True
        for suffix in prefixed_matches:
            prefix = attr_name[: -len(suffix)]
            typo_re = re.compile(
                r"sgs_typography_css_rule\(\s*\$attributes\s*,\s*['\"]"
                + re.escape(prefix) + r"['\"]"
            )
            if typo_re.search(text):
                return True
        if base_level_suffix is not None:
            typo_re = re.compile(r"sgs_typography_css_rule\(\s*\$attributes\s*,\s*(''|\"\")")
            if typo_re.search(text):
                return True

        var_match = var_assign_re.search(text)
        if var_match:
            var_name = var_match.group(1)
            var_use_re = re.compile(r"\$" + re.escape(var_name) + r"\b")

            # sgs_resolve_on_tiers()/sgs_emit_tier_rules() — the tier-boolean
            # pair (helpers-responsive.php, same file as
            # sgs_responsive_normalise_object()). Live example:
            # sgs/site-header.headerHideOnScroll assigns $sh_hide then calls
            # sgs_resolve_on_tiers( $sh_hide, … ) several lines later.
            tier_fn_match = tier_fn_call_re.search(text)
            if tier_fn_match and var_use_re.search(text, tier_fn_match.start()):
                return True

            # 'value' => $var — the SAME collected-prop-map pattern as
            # `collected_re` above, but through an intermediate variable
            # (usually one carrying its own tier-shaped default, e.g.
            # sgs/mega-panel.groupGap: `$group_gap_obj = ... ?: array(
            # 'desktop' => '44px' ); … 'value' => $group_gap_obj`) rather
            # than the literal $attributes['<attr>'] expression.
            collected_var_re = re.compile(r"'value'\s*=>\s*\$" + re.escape(var_name) + r"\b")
            if collected_var_re.search(text) and emit_re.search(text):
                return True

    return False


# ---------------------------------------------------------------------------
# Migrated-property map (block.json is the ONLY source, per Spec 35 P1)
# ---------------------------------------------------------------------------

def _naive_object_candidates(attrs: dict, breakpoint_suffixes: tuple[str, ...]) -> set[str]:
    """Block.json-only candidate set — BEFORE the PHP-evidence filter.

    A property is a naive candidate when it is declared `"type": "object"`
    (or a type list containing "object"), has NO `<attr>Tablet` /
    `<attr>Mobile` sibling attribute, AND its own name does not itself end
    in a breakpoint suffix (BUG 1 — see module docstring). Exposed
    separately from `build_migrated_property_map()` so the self-test can
    derive "what WOULD naively qualify" without hardcoding a property name.
    """
    candidates: set[str] = set()
    for prop_name, prop_schema in attrs.items():
        if not isinstance(prop_schema, dict):
            continue
        prop_type = prop_schema.get("type")
        type_list = prop_type if isinstance(prop_type, list) else [prop_type]
        if "object" not in type_list:
            continue

        # BUG 1: a name ending in a breakpoint suffix IS itself a per-tier
        # sibling attribute (e.g. 'marginTablet') — never a migrated base
        # property in its own right, regardless of what siblings IT has.
        if any(
            prop_name.endswith(suf) and prop_name[: -len(suf)]
            for suf in breakpoint_suffixes
        ):
            continue

        has_tablet = f"{prop_name}Tablet" in attrs
        has_mobile = f"{prop_name}Mobile" in attrs
        if has_tablet or has_mobile:
            # Object-typed WITH siblings is not the migrated shape this
            # gate is about (e.g. a per-tier media-object attribute).
            continue
        candidates.add(prop_name)
    return candidates


def build_migrated_property_map(blocks_dir: Path = BLOCKS_DIR) -> dict[str, set[str]]:
    """Return {block_slug: {migrated_base_property_names}}.

    Scans every plugins/sgs-blocks/src/blocks/*/block.json for the naive
    OBJECT-typed, sibling-free, non-suffix-named candidates
    (`_naive_object_candidates()`), then keeps only those with real PHP
    evidence of tier consumption (`_attr_tier_consumer_evidence()` — BUG 2,
    see module docstring). block.json alone is NECESSARY but not
    SUFFICIENT: never render.php-blind, never the DB, never a runtime
    switch such as `responsive_model`/`container_queries`.
    """
    migrated: dict[str, set[str]] = {}
    if not blocks_dir.is_dir():
        return migrated

    breakpoint_suffixes = _breakpoint_suffixes()

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
        for prop_name in _naive_object_candidates(attrs, breakpoint_suffixes):
            if not _attr_tier_consumer_evidence(slug, prop_name, blocks_dir=blocks_dir):
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

    # --- 5. SHAPE-3 EXCLUSION CONTROL (added 2026-08-12): an object-typed,
    # sibling-free property with NO real PHP tier-consumer evidence — a
    # base-only box property such as sgs/text.borderWidth — must be EXCLUDED
    # from migrated_map altogether, and emitting it as a flat scalar must
    # NOT trigger a violation: it has no device-tier destination to be "out
    # of step" with. This is the exact false positive the naive
    # attr_type/box_family-only signal could not avoid — verified live
    # 2026-08-12 against sgs-framework.db that `box_family`/`attr_type`/
    # `default_value` are IDENTICAL for this property and a genuinely
    # migrated one (see module docstring "BUG 2"). The subject property is
    # derived from the fixture + the live block.json's NAIVE candidate set
    # (`_naive_object_candidates()`, i.e. the pre-PHP-evidence signal) —
    # never hardcoded.
    try:
        shape3_blocks = _load_fixture_blocks("shape3-exclusion")
        if not shape3_blocks:
            raise AssertionError("shape3-exclusion fixture parsed to zero block instances")
        shape3_slug, shape3_attrs = shape3_blocks[0]

        block_json_path = BLOCKS_DIR / shape3_slug.split("/")[-1] / "block.json"
        block_json_attrs = json.loads(block_json_path.read_text(encoding="utf-8")).get("attributes", {})
        naive_candidates = _naive_object_candidates(block_json_attrs, _breakpoint_suffixes())
        shape3_subject_props = {
            base for base in naive_candidates
            if base in shape3_attrs and not isinstance(shape3_attrs[base], dict)
        }
        if not shape3_subject_props:
            raise AssertionError(
                f"shape3-exclusion fixture's block ({shape3_slug}) carries no "
                f"NAIVE-candidate property (object-typed, no Tablet/Mobile "
                f"siblings) emitted as a flat scalar to test the PHP-evidence "
                f"exclusion against"
            )
        still_migrated = shape3_subject_props & migrated_map.get(shape3_slug, set())
        if still_migrated:
            failures.append(
                f"SHAPE-3 EXCLUSION CONTROL FAILED: {shape3_slug}'s "
                f"{sorted(still_migrated)} is STILL classified as migrated "
                f"despite having no PHP tier-consumer evidence — the naive "
                f"block.json-only false positive (BUG 2) has regressed."
            )
        shape3_violations = check_flat_tier_violations(shape3_blocks, migrated_map)
        if shape3_violations:
            failures.append(
                f"SHAPE-3 EXCLUSION CONTROL FAILED: fixtures/flat-tier-gate/"
                f"shape3-exclusion/extract.json emits a Shape-3 (no tier "
                f"destination) property as a flat scalar, which is CORRECT "
                f"behaviour for that property, but the gate raised "
                f"{len(shape3_violations)} violation(s) anyway: "
                f"{shape3_violations!r}"
            )
    except Exception as exc:  # noqa: BLE001
        failures.append(f"SHAPE-3 EXCLUSION CONTROL raised an exception: {exc}")

    # --- 6. SUFFIX-SELF-MATCH EXCLUSION CONTROL (added 2026-08-12, BUG 1):
    # no entry in migrated_map may itself be named with a trailing
    # breakpoint suffix (e.g. 'marginTablet', 'paddingMobile') — such a name
    # IS a per-tier SIBLING attribute of some other (possibly undeclared)
    # base property, never a migrated base property in its own right. A
    # regression here previously promoted sgs/text's marginTablet/
    # marginMobile/paddingTablet/paddingMobile (real, still-active box
    # overrides with NO base 'margin'/'padding' attr at all) to first-class
    # "migrated property" status, purely because each individually has no
    # Tablet/Mobile sibling OF ITS OWN. Live-tree check, no fixture needed.
    try:
        breakpoint_suffixes = _breakpoint_suffixes()
        self_matched = [
            (blk, prop)
            for blk, props in migrated_map.items()
            for prop in props
            for suf in breakpoint_suffixes
            if prop.endswith(suf) and prop[: -len(suf)]
        ]
        if self_matched:
            failures.append(
                "SUFFIX-SELF-MATCH EXCLUSION CONTROL FAILED: migrated_map "
                f"contains {len(self_matched)} entr{'y' if len(self_matched) == 1 else 'ies'} "
                f"whose property NAME itself ends in a breakpoint suffix (a "
                f"per-tier sibling attribute mistaken for a migrated base "
                f"property): {self_matched!r}"
            )
    except Exception as exc:  # noqa: BLE001
        failures.append(f"SUFFIX-SELF-MATCH EXCLUSION CONTROL raised an exception: {exc}")

    # --- 7. CONTAINER SHAPE-2 REGRESSION + INJECT/REVERT PROOF (added
    # 2026-08-12): proves the stricter PHP-evidence filter does NOT
    # over-exclude a genuinely migrated tier-of-box property, using the REAL
    # historical sgs/container clone-run fixture
    # (real-tree-injection/extract.json, landed 2026-08-11 alongside this
    # gate's first version but never wired into a runnable test until now —
    # its own `_fixture_purpose` already asserts gap/gridItemBorderRadius/
    # gridItemPadding are migrated on the live block.json). Confirmed live
    # 2026-08-12: `class-sgs-container-wrapper.php` ~:2279-2287 collects
    # gridItemPadding into `$obj_inner_props` and emits it via
    # `sgs_emit_responsive_css()` (Spec 35 Phase 1.4b "STAGE 2", landed
    # 2026-08-10) — genuine PHP tier-consumer evidence.
    try:
        real_tree_blocks = _load_fixture_blocks("real-tree-injection")
        if not real_tree_blocks:
            raise AssertionError("real-tree-injection fixture parsed to zero block instances")
        rt_slug, rt_attrs = real_tree_blocks[0]

        rt_dict_props = {
            k for k, v in rt_attrs.items()
            if isinstance(v, dict) and k in migrated_map.get(rt_slug, set())
        }
        if not rt_dict_props:
            failures.append(
                f"PRECONDITION FAILED: real-tree-injection fixture's block "
                f"({rt_slug}) carries no object-shaped property recognised as "
                f"migrated — either the fixture regressed or the PHP-evidence "
                f"filter is now too strict (over-excluding a real Shape 2 "
                f"property)."
            )
        else:
            clean_violations = check_flat_tier_violations(real_tree_blocks, migrated_map)
            if clean_violations:
                failures.append(
                    "CONTAINER SHAPE-2 REGRESSION: the real-tree-injection "
                    f"fixture (a CLEAN, correctly object-shaped historical "
                    f"clone) now raises {len(clean_violations)} violation(s): "
                    f"{clean_violations!r}"
                )

            # INJECT: flip one genuinely-migrated property to a flat scalar
            # and prove the gate fires — the fail-injection proof named in
            # the D554-C commit message, but never actually automated until
            # now.
            inject_prop = sorted(rt_dict_props)[0]
            injected_blocks = [(blk, dict(attrs)) for blk, attrs in real_tree_blocks]
            for blk, attrs in injected_blocks:
                if blk == rt_slug and inject_prop in attrs:
                    attrs[inject_prop] = "24px"  # flat scalar injection
            injected_violations = check_flat_tier_violations(injected_blocks, migrated_map)
            if not any(
                v["block"] == rt_slug and v["property"] == inject_prop
                for v in injected_violations
            ):
                failures.append(
                    f"INJECT/REVERT PROOF FAILED: flipping {rt_slug}'s "
                    f"'{inject_prop}' to a flat scalar did not trigger a "
                    f"violation — the gate cannot fire on a real historical "
                    f"clone run's migrated property."
                )

            # REVERT: re-checking the ORIGINAL (unmutated) blocks must still
            # be clean — proves the injection probe copied rather than
            # mutated shared state.
            revert_violations = check_flat_tier_violations(real_tree_blocks, migrated_map)
            if revert_violations:
                failures.append(
                    "INJECT/REVERT PROOF FAILED: the original fixture is no "
                    f"longer clean after the injection probe (mutation "
                    f"leaked): {revert_violations!r}"
                )
    except Exception as exc:  # noqa: BLE001
        failures.append(f"CONTAINER SHAPE-2 REGRESSION control raised an exception: {exc}")

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
    print("  - shape-3 exclusion control: a base-only box with no tier destination is never flagged")
    print("  - suffix-self-match exclusion: no migrated-property name is itself a tier sibling")
    print("  - container shape-2 regression + inject/revert proof on a REAL historical clone run")
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
