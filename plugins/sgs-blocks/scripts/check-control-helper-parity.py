#!/usr/bin/env python3
"""Which shared controls ship the standard helper pair, and which still don't.

WHY THIS EXISTS
---------------
Bean, 2026-08-26: *"make a standard helper for each of your controls so we can
insert these controls in with little effort."*

Measured that day, the cost of mounting one shared control in one block is
THREE hand-kept copies of the same attribute names:

  1. `block.json`   — the attribute keys, hand-declared
  2. `edit.js`      — the same keys, hand-passed to the component
  3. `render.php`   — the same keys again, hand-read and composed

Nothing binds the three. They drift, and this repo has already paid for that:
D805 (2026-08-26) was a PHP roster and a JS roster of the same eleven block
names disagreeing, with eight blocks getting hover motion no client could
switch off. Four gates exist to CATCH control-wiring mistakes
(`check-control-ux`, `check-dead-controls`, `check-duplicate-controls`,
`check-inert-controls`); nothing PREVENTS them.

⭐ THE FIX IS NOT AN INVENTION — ONE CONTROL ALREADY HAS IT.
`TypographyControls` ships the complete pattern:

    JS   `typographyAttrName( prefix, base )`  + `typographyAttrKeys( prefix )`
    PHP  `sgs_typography_attr( $prefix, $base )` + `sgs_typography_css_rule( … )`

A block spreads the canonical key set instead of hand-declaring keys, and the
PHP derives the SAME keys from the SAME rule. One owner, no drift. This script
measures which other controls have caught up.

WHAT IT CHECKS (derived from disk, never from a hardcoded roster — R-31-1)
--------------------------------------------------------------------------
The corpus is every `src/components/*.js` that at least one block's `edit.js`
actually mounts. A component nothing mounts is reported separately rather than
failed — an unmounted component is a different finding (possibly dead code),
not a missing helper.

  R1  JS NAME HELPER  — the component exports a function whose name matches
      `*AttrName` / `*AttrKeys`, so callers derive keys instead of typing them.
  R2  PHP TWIN        — a `sgs_*` function exists under `includes/` that
      derives or consumes that control's attribute keys.

⛔ R2 IS A HEURISTIC AND SAYS SO. It matches on the control's slug, so a PHP
helper named unlike its component reads as ABSENT. That is why `--check`
enforces a RATCHET against a recorded baseline rather than demanding parity
everywhere: a false ABSENT costs a baseline line, never a blocked commit, and
`--survey` is the mode meant for judgement.

USAGE
-----
  python check-control-helper-parity.py --survey      # the census (default)
  python check-control-helper-parity.py --check       # ratchet gate
  python check-control-helper-parity.py --self-test   # prove it can FAIL
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

PLUGIN = Path(__file__).resolve().parent.parent
COMPONENTS = PLUGIN / "src" / "components"
BLOCKS = PLUGIN / "src" / "blocks"
INCLUDES = PLUGIN / "includes"
BASELINE = Path(__file__).resolve().parent / "control-helper-parity-baseline.json"

# A scan that finds nothing must FAIL, never pass. Both counts were watched
# failing at 0 while the globs were wrong during this script's own build.
MIN_COMPONENTS = 10
MIN_BLOCKS = 20

NAME_HELPER_RE = re.compile(r"export\s+function\s+(\w*(?:AttrName|AttrKeys))\b")
# APPLICABILITY, added 2026-08-26 after the FIRST version of this script
# reported 19 "gaps" that CANNOT EXIST. A name-deriving helper only means
# anything for a control that takes an ATTRIBUTE NAME KEY - `prefix` or
# `attrNames`. Measured across src/components: 21 controls are mounted, 10 are
# attribute-aware (they take `setAttributes`), and only FOUR are name-keyed
# (GradientOverlayControl, ResponsiveBoxControl, ShadowControl,
# TypographyControls). The other 17 take a `value`/`values`/`rows` prop and
# never see an attribute name at all - for them there is no naming rule to own,
# so "missing a JS name helper" is not a gap, it is a category error.
#
# Reporting a gap where none can exist is WORSE than reporting nothing: it
# inflates the backlog and sends the next person to write a helper that can
# have no caller. Same shape as the recorded failure
# `a-derived-field-used-as-a-scope-predicate-is-self-fulfilling`.
NAME_KEY_RE = re.compile(r"\b(prefix|attrNames)\b")
ATTR_AWARE_RE = re.compile(r"\bsetAttributes\b")

# STRIP COMMENTS BEFORE CLASSIFYING — added 2026-08-26 after this script
# classified `ResponsiveBoxControl` as NAME-KEYED on the strength of FOUR
# occurrences that are all inside its docblock: three `setAttributes` lines in a
# usage example, and the word "prefix" in the phrase "`__experimental` prefix
# needed". Its real signature is `{ label, values, onChange }` — value-based.
# The false positive SURVIVED the 19->2 narrowing, keeping a control on the
# backlog that can never have a helper, so "real backlog is 2" was itself one
# too high. The true backlog is GradientOverlayControl alone.
#
# This repo already had the answer: `surveys/survey-control-mounts.py` strips
# comments for exactly this reason — "a docblock naming a component is not a
# mount". Same rule one level up: a docblock naming a PROP is not a prop.
# Sibling of the recorded failure `resolve-every-match-back-to-its-owner`.
BLOCK_COMMENT_RE = re.compile(r"/\*.*?\*/", re.S)
LINE_COMMENT_RE = re.compile(r"(?<![:'\"])//[^\n]*")


def strip_comments(text: str) -> str:
    """Remove block + line comments so prose cannot be read as code."""
    return LINE_COMMENT_RE.sub("", BLOCK_COMMENT_RE.sub("", text))


def camel_to_slug(name: str) -> str:
    """`ShadowControl` -> `shadow`; `ResponsiveBoxControl` -> `responsive_box`."""
    stem = re.sub(r"(Control|Controls|Picker|Panel|Field)$", "", name)
    snake = re.sub(r"(?<!^)(?=[A-Z])", "_", stem).lower()
    return snake.replace("sgs_", "", 1) if snake.startswith("sgs_") else snake


def load_php_functions() -> set[str]:
    fns: set[str] = set()
    for php in INCLUDES.rglob("*.php"):
        try:
            fns.update(re.findall(r"function\s+(sgs_\w+)", php.read_text(encoding="utf-8", errors="replace")))
        except OSError:
            continue
    return fns


def mounts_by_component() -> dict[str, list[str]]:
    """Which blocks mount which component, read from every block's edit.js."""
    edits = sorted(BLOCKS.glob("*/edit.js"))
    if len(edits) < MIN_BLOCKS:
        raise SystemExit(
            f"[control-helper-parity] VACUOUS SCAN: found {len(edits)} block edit.js files, "
            f"expected >= {MIN_BLOCKS}. A scan that sees nothing must fail, never pass."
        )
    out: dict[str, list[str]] = {}
    for edit in edits:
        # Comments stripped here too: `sgs/info-box` carries a 14-line docblock
        # DISCUSSING GradientOverlayControl and mounts no such thing, which this
        # scan counted as a mount until 2026-08-26. Third instance of one bug in
        # this file - prose read as code - so the fix belongs at every read site,
        # not just the one that was noticed.
        text = strip_comments(edit.read_text(encoding="utf-8", errors="replace"))
        block = edit.parent.name
        for comp in COMPONENT_NAMES:
            # Word-boundary match so `SgsBoxControl` does not count a
            # `ResponsiveBoxControl` mention, and vice versa.
            if re.search(rf"\b{re.escape(comp)}\b", text):
                out.setdefault(comp, []).append(block)
    return out


def component_files() -> list[Path]:
    files = sorted(p for p in COMPONENTS.glob("*.js") if p.stem != "index")
    if len(files) < MIN_COMPONENTS:
        raise SystemExit(
            f"[control-helper-parity] VACUOUS SCAN: found {len(files)} components, "
            f"expected >= {MIN_COMPONENTS}."
        )
    return files


COMPONENT_NAMES: list[str] = []



ATTRNAMES_RE = re.compile(r"attrNames=\{\s*\{(.*?)\}\s*\}", re.S)
KV_RE = re.compile(r"(\w+)\s*:\s*'([^']+)'")

# The naming rules the shadow helper pair encodes, as ENUMERATED against every
# real mount on 2026-08-26 — not generalised from one block. `hover` is absent
# deliberately: zero editor mounts pass a hover SHAPE key today, so there is
# nothing to conform to and asserting one would be vacuous.
SHADOW_RULES = {
    "colour": lambda base: base + "Colour",
    "hoverColour": lambda base: base + "ColourHover",
}


def shadow_mount_maps() -> list[tuple[str, dict]]:
    """Every `attrNames={{...}}` map in the tree that names a `base`."""
    out = []
    for edit in sorted(BLOCKS.glob("*/edit.js")):
        text = edit.read_text(encoding="utf-8", errors="replace")
        for m in ATTRNAMES_RE.finditer(text):
            d = dict(KV_RE.findall(m.group(1)))
            if "base" in d:
                out.append((edit.parent.name, d))
    return out


def shadow_rule_conformance() -> dict:
    """Does each helper rule reproduce the key EVERY real mount actually uses?

    This is the check that caught the first draft: `hoverColour` was written as
    `<base>HoverColour`, generalised from one block, and scored 0/10 here.
    """
    maps = shadow_mount_maps()
    result = {}
    for key, rule in SHADOW_RULES.items():
        rows = [(b, d) for b, d in maps if key in d]
        bad = [(b, d["base"], d[key], rule(d["base"])) for b, d in rows if d[key] != rule(d["base"])]
        result[key] = {"checked": len(rows), "mismatched": bad}
    return result


def helpers_by_slug() -> dict:
    """Every `*AttrName`/`*AttrKeys` export in `src/components/`, keyed by SLUG.

    R1 originally looked for the pair in the MOUNTED component's own file, which
    assumes one file owns both the naming and the UI. A layer that deliberately
    SPLITS those does not fit: the media element keeps naming in
    `MediaElementControls.js` (L1, zero JSX) and dispatch in
    `MediaElementPanel.js` (L3). Both derive the slug `media_element`, the PHP
    twin `sgs_media_element_attr` matches it, and the family is complete — but
    the panel's own file exports no helper, so the old lookup reported a missing
    half that was never missing.

    Keying by slug fixes that WITHOUT weakening the rule: the pair must still
    exist, still be name-keyed, and still have its PHP twin. Only the assumption
    that it lives in one particular file is dropped.
    """
    found: dict = {}
    for path in component_files():
        hits = NAME_HELPER_RE.findall(path.read_text(encoding="utf-8", errors="replace"))
        if hits:
            found.setdefault(camel_to_slug(path.stem), []).extend(hits)
    return found


def survey() -> dict:
    php_fns = load_php_functions()
    mounts = mounts_by_component()
    slug_helpers = helpers_by_slug()

    rows = []
    for path in component_files():
        comp = path.stem
        text = path.read_text(encoding="utf-8", errors="replace")
        # Own file first; then a sibling sharing this slug (see helpers_by_slug).
        helpers = NAME_HELPER_RE.findall(text) or slug_helpers.get(camel_to_slug(comp), [])
        code = strip_comments(text)
        attr_aware = bool(ATTR_AWARE_RE.search(code))
        name_keyed = attr_aware and bool(NAME_KEY_RE.search(code))
        slug = camel_to_slug(comp)
        # R2 heuristic: any sgs_* function whose name carries the control's slug.
        twin = sorted(f for f in php_fns if slug and slug in f)
        blocks = mounts.get(comp, [])
        rows.append(
            {
                "component": comp,
                "mountedIn": len(blocks),
                "jsNameHelper": helpers,
                "phpTwin": twin[:3],
                "hasJs": bool(helpers),
                "hasPhp": bool(twin),
                "attrAware": attr_aware,
                "nameKeyed": name_keyed,
            }
        )
    return {"rows": rows}


def gaps(rows: list[dict]) -> list[dict]:
    """Mounted, NAME-KEYED controls missing either half.

    Scope is `nameKeyed`, NOT merely `mounted` - see the applicability note by
    NAME_KEY_RE. A value-based control has no attribute-name contract to own, so
    it can never be "missing" a name helper. Unmounted controls are excluded
    too: that is a separate finding, not a missing helper.
    """
    return [
        r for r in rows
        if r["mountedIn"] > 0 and r["nameKeyed"] and not (r["hasJs"] and r["hasPhp"])
    ]


def print_survey(data: dict) -> None:
    rows = sorted(data["rows"], key=lambda r: (-r["mountedIn"], r["component"]))
    print("\n  CONTROL HELPER PARITY — the standard pair per shared control")
    print("  " + "-" * 74)
    print(f"  {'component':<26}{'mounts':>7} {'shape':>11}  {'JS':>3} {'PHP':>4}   helper")
    print("  " + "-" * 74)
    for r in rows:
        if not r["mountedIn"]:
            continue
        # A helper pair is only MEANINGFUL for a name-keyed control. Anything
        # else is marked n/a rather than shown as a missing half.
        if not r["nameKeyed"]:
            shape = "value-based" if not r["attrAware"] else "attr, no key"
            print(f"  {r['component']:<26}{r['mountedIn']:>7} {shape:>11}  {'n/a':>3} {'n/a':>4}   —")
            continue
        js = "yes" if r["hasJs"] else " NO"
        php = "yes" if r["hasPhp"] else " NO"
        helper = (r["jsNameHelper"] or r["phpTwin"] or ["—"])[0]
        print(f"  {r['component']:<26}{r['mountedIn']:>7} {'name-keyed':>11}  {js:>3} {php:>4}   {helper}")

    unmounted = [r["component"] for r in rows if not r["mountedIn"]]
    g = gaps(rows)
    print("  " + "-" * 74)
    keyed = [r for r in rows if r["mountedIn"] and r["nameKeyed"]]
    aware = [r for r in rows if r["mountedIn"] and r["attrAware"]]
    print(f"  {len(rows) - len(unmounted)} mounted control(s); {len(aware)} attribute-aware; "
          f"{len(keyed)} NAME-KEYED (the only shape a helper pair fits).")
    print(f"  Of those {len(keyed)}: {len(keyed) - len(g)} complete, {len(g)} missing a half.")
    if g:
        print("    still owed: " + ", ".join(r["component"] for r in g))
    if unmounted:
        print(f"  {len(unmounted)} mounted by NO block (a separate finding, not a gap):")
        print("    " + ", ".join(unmounted))
    print()


def main() -> int:
    global COMPONENT_NAMES
    COMPONENT_NAMES = [p.stem for p in sorted(COMPONENTS.glob("*.js")) if p.stem != "index"]

    if "--self-test" in sys.argv:
        return self_test()

    data = survey()
    if "--json" in sys.argv:
        print(json.dumps(data, indent=2))
        return 0
    print_survey(data)

    if "--check" not in sys.argv:
        return 0

    current = {r["component"] for r in gaps(data["rows"])}
    if not BASELINE.exists():
        BASELINE.write_text(json.dumps({"accepted": sorted(current)}, indent="\t") + "\n", encoding="utf-8")
        print(f"  [baseline] seeded with {len(current)} known gap(s).")
        return 0
    accepted = set(json.loads(BASELINE.read_text(encoding="utf-8"))["accepted"])
    net_new = current - accepted
    if net_new:
        print(f"  FAIL — {len(net_new)} control(s) newly missing a helper half: {sorted(net_new)}")
        print("  Add the pair (see TypographyControls for the canonical shape), or")
        print("  record it in control-helper-parity-baseline.json with a reason.")
        return 1
    print(f"  PASS — {len(current)} gap(s), all baselined; 0 net-new.")
    return 0


def self_test() -> int:
    """Prove each arm can FAIL. Pure over text — no disk writes."""
    global COMPONENT_NAMES
    COMPONENT_NAMES = [p.stem for p in sorted(COMPONENTS.glob("*.js")) if p.stem != "index"]
    failures = []

    # [1] R1 must detect a real exported name-helper.
    if not NAME_HELPER_RE.findall("export function typographyAttrKeys( prefix ) {"):
        failures.append("[1] R1 failed to match a real *AttrKeys export")
    # [2] R1 must NOT match a same-named local (non-exported) function.
    if NAME_HELPER_RE.findall("function typographyAttrKeys( prefix ) {"):
        failures.append("[2] R1 matched a NON-exported function (over-match)")
    # [3] R1 must not match an unrelated export.
    if NAME_HELPER_RE.findall("export function parseShadow( value ) {"):
        failures.append("[3] R1 matched an unrelated export")
    # [4] slug derivation must strip the suffix and snake the rest.
    for comp, want in (("ShadowControl", "shadow"), ("ResponsiveBoxControl", "responsive_box"),
                       ("TypographyControls", "typography"), ("SgsColourPanel", "colour")):
        got = camel_to_slug(comp)
        if got != want:
            failures.append(f"[4] camel_to_slug({comp}) = {got!r}, expected {want!r}")
    # [5] the live survey must actually see components and mounts.
    data = survey()
    if not any(r["mountedIn"] > 0 for r in data["rows"]):
        failures.append("[5] survey reported ZERO mounted controls — vacuous")
    # [6] NEGATIVE CONTROL: the known-good control must come back complete, or
    #     the detector is reporting absence for something that demonstrably has
    #     both halves and every other result is untrustworthy.
    typo = next((r for r in data["rows"] if r["component"] == "TypographyControls"), None)
    if not typo or not (typo["hasJs"] and typo["hasPhp"]):
        failures.append("[6] NEGATIVE CONTROL failed: TypographyControls should have BOTH halves")

    # [7] The shadow helper's rules must reproduce EVERY real mount. This is the
    #     case that caught the first draft (`<base>HoverColour`, 0/10).
    conf = shadow_rule_conformance()
    for key, r in conf.items():
        if r["checked"] == 0:
            failures.append(f"[7] {key}: 0 mounts checked — vacuous, the parser found nothing")
        elif r["mismatched"]:
            b, base, actual, expected = r["mismatched"][0]
            failures.append(
                f"[7] {key}: {len(r['mismatched'])}/{r['checked']} mounts disagree with the rule "
                f"(e.g. {b}: base={base!r} uses {actual!r}, rule says {expected!r})"
            )


    # [8] A PROP NAMED ONLY IN A DOCBLOCK IS NOT A PROP. Verbatim from
    #     ResponsiveBoxControl.js, which this script classified as NAME-KEYED
    #     on the strength of four comment-only occurrences until 2026-08-26.
    #     Its real signature is `{ label, values, onChange }`.
    docblock_only = (
        "/**\n"
        " * A block's edit.js wires this straight into setAttributes:\n"
        " *   `__experimental` prefix needed.\n"
        " */\n"
        "export default function ResponsiveBoxControl( { label, values = {}, onChange } ) {}\n"
    )
    code = strip_comments(docblock_only)
    if ATTR_AWARE_RE.search(code) or NAME_KEY_RE.search(code):
        failures.append(
            "[8] a prop named ONLY in a docblock was read as real "
            "- comments are not being stripped before classification"
        )
    # ...and the control arm: the SAME words outside a comment must still count.
    real = "export default function X( { attributes, setAttributes, prefix } ) {}"
    if not (ATTR_AWARE_RE.search(strip_comments(real)) and NAME_KEY_RE.search(strip_comments(real))):
        failures.append("[8] stripping went too far - real props no longer detected")

    for f in failures:
        print("  FAIL " + f)
    if failures:
        print(f"\n  self-test: {len(failures)} failure(s).")
        return 1
    checked = ", ".join(f"{k} {v['checked']}/{v['checked']}" for k, v in conf.items())
    print(f"  self-test: 8 case(s) passed, including a negative control. Shadow rules: {checked}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
