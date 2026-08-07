#!/usr/bin/env python3
"""
SGS Block Uniformity Audit
Scans all SGS block.json files for non-uniform patterns.
Exits 1 if issues found, 0 if clean.

Usage:
    python plugins/sgs-blocks/scripts/audit-block-uniformity.py
    python plugins/sgs-blocks/scripts/audit-block-uniformity.py --self-test
"""
import sys, json
from pathlib import Path

# Findings quote attribute names and CSS property keys; the default Windows
# console codepage (cp1252) cannot encode them all.
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except AttributeError:  # pragma: no cover — pre-3.7 streams
    pass

# Find repo root (look for plugins/sgs-blocks/src/blocks)
script_dir = Path(__file__).resolve().parent
repo_root = script_dir.parent.parent.parent  # scripts/ -> sgs-blocks/ -> plugins/ -> repo root
blocks_dir = repo_root / "plugins" / "sgs-blocks" / "src" / "blocks"

if not blocks_dir.exists():
    print(f"ERROR: blocks dir not found at {blocks_dir}", file=sys.stderr)
    sys.exit(2)

# Static blocks where source:html is INTENTIONAL (have save.js, not render.php)
SOURCE_HTML_EXEMPT = {"sgs/certification-bar", "sgs/counter", "sgs/notice-banner"}

# Blocks intentionally without supports.color.
#
# EMPTY, AND IT SHOULD STAY EMPTY. An entry here means the MANIFEST is wrong —
# fix the manifest (`supports.sgs.elements`), not this list.
#
# History: this check used to be NAME-KEYED — it flagged any attribute whose
# name contained "colour". WP's `supports.color` only ever styles the BLOCK
# ROOT, so a PER-ELEMENT colour (a nav link, a burger icon, a close control, a
# border) physically could not satisfy it, and every such block had to be
# exempted forever. The list grew 2 → 3 → 4 and one entry's own comment conceded
# the heuristic was a false positive. As of 2026-08-07 the check is ROLE-KEYED on
# the Spec 35 element manifest (see colour_findings() below) and all four
# entries — sgs/nav-menu, sgs/nav-drawer, sgs/mega-panel, sgs/mega-aside — are
# resolved by the mechanism rather than by exemption.
SUPPORTS_COLOR_EXEMPT = set()

# Cluster members whose CSS property WP's `supports.color` can actually express,
# and the suffixes the Spec 35 default `{prefix}{Suffix}` convention resolves
# them through. Kept in sync with scripts/consistency/cluster-member-sets.json's
# `css:color` / `css:background-color` members, plus the American spellings — the
# whole point of role-keying is that it also catches a hand-rolled `textColor` on
# a wrapper, which the old substring heuristic missed entirely.
ROOT_COLOUR_MEMBERS = {
    "css:color": ("Colour", "TextColour", "Color", "TextColor"),
    "css:background-color": ("BackgroundColour", "BackgroundColor", "Bg", "Background"),
}


def _is_colour_attr(attr_name):
    """
    Is this attribute name a COLOUR VALUE at all?

    This is the same substring test the old rule used, but its JOB has changed
    completely. It used to be the whole decision ("has a colour attr → must
    declare supports.color"), which is what made the false-positive class
    permanent. It is now only a cheap PRE-FILTER over the population the check
    has always governed — naming an attribute `*Colour`/`*Color` is a reliable
    signal that its VALUE is a colour. The ROLE decision (does it target the
    block ROOT?) is made by the manifest, below.

    ⚠ KNOWN RESIDUAL, DOCUMENTED RATHER THAN BURIED (2026-08-07). This pre-filter
    does NOT match a root background named without the word "colour" —
    `sgs/mega-panel.panelBg`, `sgs/mega-aside.asideBg`, `sgs/nav-drawer.drawerBg`.
    All three ARE mapped by their own manifests to `css:background-color` on an
    `isWrapper: true` element while the block declares no `supports.color`, so
    dropping this pre-filter flags all three immediately (measured, not assumed).
    Separately, `sgs/nav-menu.navColour` sets `color:` on the block root
    (render.php:713-725, `$uid_sel`) but its wrapper element does not claim it in
    `attrMap`, so it is invisible either way.
    These four are a REAL divergence from the framework norm — sgs/site-header
    and sgs/site-footer carry the same root background through
    `supports.color` + `__experimentalSkipSerialization`. Closing them means
    migrating three-to-four blocks to native colour supports and wiring the
    scoped serialisation, which is a block migration, not an audit change, and
    this audit runs from the shared pre-commit hook — failing it would block
    every commit in every session until that migration lands. Raise it with Bean
    as its own task; do NOT re-add an exemption entry to route around it.
    """
    low = attr_name.lower()
    return "colour" in low or "color" in low


def _find_attr_ci(attrs, candidate):
    """Case-insensitive attribute lookup. Returns the real key, or None."""
    if candidate in attrs:
        return candidate
    low = candidate.lower()
    for k in attrs:
        if k.lower() == low:
            return k
    return None


def colour_findings(name, block):
    """
    ROLE-KEYED colour check (Spec 35 element manifest).

    Returns a list of (category, message) findings:

      * ``unmanifested`` — the block declares no `supports.sgs.elements` at all,
        so a colour attribute's ROLE cannot be determined. Reported by NAME, never
        skipped silently: a silent skip is the fail-open shape this whole register
        keeps finding. An EMPTY manifest (`"elements": {}`) is a deliberate
        assertion ("nothing here is styleable" — see sgs/form-field-hidden) and
        counts as manifested.

      * ``supports_color_missing`` — a colour attribute is claimed by the manifest's
        ROOT element (`isWrapper: true`) as `css:color` or `css:background-color`,
        the two properties WP's `supports.color` exists to provide, yet the block
        declares no `supports.color`. That is the real violation.

    A colour attribute claimed by a NON-root element (a nav link, a burger icon, a
    × control) is correct as a block-owned attribute and is never flagged — WP's
    `supports.color` could not express it. A BORDER colour (`css:border-color`) is
    likewise never flagged: it belongs to `supports.__experimentalBorder.color`.

    STATES are deliberately excluded from the root determination. `supports.color`
    covers the RESTING state only; a `backgroundColourHover` on the root is not
    something the native support could ever have carried.

    An attribute claimed by NO element is NOT this check's business — orphan
    detection is `scripts/check-element-manifest-conformance.js`'s job (63 such
    attributes exist today: hover states, overlays, shape dividers, enum
    selectors). Duplicating it here would put a second, weaker orphan detector on
    the shared pre-commit path.
    """
    attrs = block.get("attributes", {})
    sup = block.get("supports", {})
    elements = sup.get("sgs", {}).get("elements")

    if elements is None:
        return [(
            "unmanifested",
            f"{name}: no supports.sgs.elements — colour role cannot be determined; "
            "seed the manifest",
        )]

    if "color" in sup:
        return []  # native colour support is declared; nothing to require.

    findings = []
    seen = set()  # (attr, element, css_key) — attrMap and the default convention can both match
    for element_key, element in elements.items():
        if not isinstance(element, dict) or not element.get("isWrapper"):
            continue

        claims = []  # (attr_name, css_key)

        # (a) explicit attrMap — authoritative. `native:` targets name a supports
        #     path, not an attribute, so they are not block-owned colour attrs.
        for css_key, target in (element.get("attrMap") or {}).items():
            if css_key not in ROOT_COLOUR_MEMBERS:
                continue
            if not isinstance(target, str) or target.startswith("native:"):
                continue
            real = _find_attr_ci(attrs, target)
            if real:
                claims.append((real, css_key))

        # (b) default {prefix}{Suffix} convention. `prefix: ""` is an explicit
        #     opt-out (it means "my attributes are bare"), and `!= ""` is the
        #     right test — `is not None` would reinstate the matching the author
        #     asked to suppress.
        prefix = element.get("prefix")
        effective = element_key if prefix is None else prefix
        if effective != "":
            for css_key, suffixes in ROOT_COLOUR_MEMBERS.items():
                for suffix in suffixes:
                    real = _find_attr_ci(attrs, effective + suffix)
                    if real:
                        claims.append((real, css_key))
                        break

        for attr_name, css_key in claims:
            if not _is_colour_attr(attr_name):
                continue
            key = (attr_name, element_key, css_key)
            if key in seen:
                continue
            seen.add(key)
            findings.append((
                "supports_color_missing",
                f"{name}: `{attr_name}` targets the ROOT element "
                f"'{element_key}' as {css_key}, but the block declares no "
                "supports.color",
            ))

    return findings


def audit_block(name, block):
    """All uniformity findings for one block, as (category, message) pairs."""
    findings = []
    attrs = block.get("attributes", {})
    sup = block.get("supports", {})

    # 1. viewScript (legacy) should be viewScriptModule
    if "viewScript" in block:
        findings.append(("viewScript", name))

    # 2. source:html on dynamic blocks (those with render field)
    if "render" in block:
        html_src = [k for k, v in attrs.items() if isinstance(v, dict) and v.get("source") == "html"]
        if html_src and name not in SOURCE_HTML_EXEMPT:
            findings.append(("source_html", f"{name}: {html_src}"))

    # 3. Typography duplicated in supports + custom attrs
    typo_sup = sup.get("typography", {})
    dup = [k for k in ["letterSpacing", "textTransform"] if typo_sup.get(k) and k in attrs]
    if dup:
        findings.append(("typo_dup", f"{name}: {dup}"))

    # 4. Root-targeted colour attrs without native supports.color (+ unmanifested)
    if name not in SUPPORTS_COLOR_EXEMPT:
        findings.extend(colour_findings(name, block))

    return findings


CATEGORIES = ["viewScript", "source_html", "typo_dup", "supports_color_missing", "unmanifested"]


def report(issues):
    """Print findings; return the process exit code."""
    fail = False
    for category in CATEGORIES:
        items = issues.get(category) or []
        if items:
            fail = True
            print(f"\n[{category}] FAIL:")
            for item in items:
                print(f"  - {item}")

    if fail:
        print("\nSGS block uniformity audit FAILED. Fix the above before committing.", file=sys.stderr)
        return 1
    print("SGS block uniformity audit: CLEAN")
    return 0


# ---------------------------------------------------------------------------
# SELF-TEST — a gate that cannot fail reads green forever.
# ---------------------------------------------------------------------------

def self_test():
    """Four cases, run against synthetic blocks. Returns the process exit code."""
    # Deliberately AMERICAN-spelled: the old name-keyed rule looked for "colour"
    # only and missed a hand-rolled `textColor` on a wrapper entirely. The
    # role-keyed rule catches it.
    wrapper_attrmap = {
        "name": "test/root-mapped",
        "attributes": {"panelTextColor": {"type": "string"}},
        "supports": {"sgs": {"elements": {
            "panel": {"isWrapper": True, "prefix": "",
                      "attrMap": {"css:color": "panelTextColor"}},
        }}},
    }
    descendant_only = {
        "name": "test/descendant-only",
        "attributes": {"itemColour": {"type": "string"},
                       "toggleCloseColour": {"type": "string"}},
        "supports": {"sgs": {"elements": {
            "wrapper": {"isWrapper": True, "prefix": ""},
            "item": {"prefix": "item"},
            "close": {"prefix": "toggleClose"},
        }}},
    }
    no_manifest = {
        "name": "test/no-manifest",
        "attributes": {"someColour": {"type": "string"}},
        "supports": {"sgs": {}},
    }

    cases = [
        # (label, block, mutate, expected categories)
        ("root-targeted colour + no supports.color → FAIL (negative control)",
         wrapper_attrmap, None, {"supports_color_missing"}),
        ("root-targeted colour + supports.color → pass",
         wrapper_attrmap, lambda b: b["supports"].update({"color": {"background": True}}), set()),
        ("descendant-only colour + no supports.color → pass",
         descendant_only, None, set()),
        ("no manifest → pass the colour rule, warn `unmanifested`",
         no_manifest, None, {"unmanifested"}),
    ]

    failures = 0
    for label, base, mutate, expected in cases:
        block = json.loads(json.dumps(base))  # deep copy — cases must not leak
        if mutate:
            mutate(block)
        got = {c for c, _ in audit_block(block["name"], block)}
        ok = got == expected
        failures += 0 if ok else 1
        print(f"  [{'PASS' if ok else 'FAIL'}] {label}")
        print(f"         expected={sorted(expected) or '(none)'} got={sorted(got) or '(none)'}")

    print()
    if failures:
        print(f"SELF-TEST FAILED: {failures} of {len(cases)} cases.", file=sys.stderr)
        return 1
    print(f"SELF-TEST: {len(cases)} of {len(cases)} cases PASS")
    return 0


def main():
    if "--self-test" in sys.argv:
        return self_test()

    issues = {c: [] for c in CATEGORIES}
    for p in sorted(blocks_dir.glob("*/block.json")):
        try:
            b = json.loads(p.read_text(encoding='utf-8'))
        except json.JSONDecodeError as e:
            print(f"INVALID JSON: {p}: {e}", file=sys.stderr)
            return 2
        for category, message in audit_block(b.get("name"), b):
            issues[category].append(message)
    return report(issues)


sys.exit(main())
