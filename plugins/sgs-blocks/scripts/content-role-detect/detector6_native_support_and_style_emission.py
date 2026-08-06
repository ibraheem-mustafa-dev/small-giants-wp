#!/usr/bin/env python3
"""
Detector 6 -- "WP-core native support" + "value painted inside a <style> element".

Two narrow, provable mechanisms, both structural. Neither one looks at an
attribute's spelling to decide its role -- the same ban that governs every
detector in this programme (FR-31-2.1a).

MECHANISM A -- NATIVE SUPPORT ==> role "technical"
---------------------------------------------------
WordPress core auto-injects an `anchor` attribute when a block declares
`supports.anchor === true`, and a `className` attribute when the block does
NOT explicitly disable `supports.customClassName` (WP's own default is true).
Both are WordPress's own machine-facing plumbing -- an HTML `id`, a CSS class
list -- not client-authored content. The evidence is the block's OWN
`supports` declaration, read from its `block.json`, never the attribute name
alone: this detector only ever proposes `technical` for the literal names
`anchor` / `className`, and only when the matching supports key is found
explicitly TRUE in the file.

CRITICAL, measured 2026-08-06: `className` is NOT backed by `supports.className`
-- WP has no such key. It is backed by `supports.customClassName`. `sgs/button`
has no `supports.className` key at all but does have `supports.customClassName:
true`. Keying on the wrong name makes this detector silently inert; the
implementation below keys on `customClassName` for the `className` attribute
and never invents a `supports.className` lookup.

BLIND SPOT (documented, not fixed here): WP's *default* for `customClassName`
is true even when the key is ABSENT from block.json. This detector does NOT
claim the absent-key case -- there is no line in the file to point evidence at,
and "return nothing you cannot prove" outranks completeness here. A block that
relies on the implicit default stays unclassified by mechanism A; that is an
honest gap, not a bug.

MECHANISM B -- VALUE PAINTED INSIDE A <style> ELEMENT ==> role "styling"
--------------------------------------------------------------------------
If a block's render.php reads an attribute's value into a PHP variable, and
that variable (or a variable it is later concatenated into) is passed to a
`<style>...</style>` print statement, the attribute's value IS CSS text by
construction -- whatever it is named. This is traced as a small forward
data-flow: find the line that reads `$attributes['attr']` INTO a variable via
`$x = ...` or `$x .= ...`; seed a taint set with that variable; walk forward
looking for further `$y = /.= ...$x...` assignments that pull a tainted
variable into another (handles the common "$custom_css read, then merged into
$css" shape); then look for a line containing a literal `<style>` marker whose
printed argument references any tainted variable. Two hops (read -> merge ->
print) covers both target rows measured for this detector; a chain longer than
that is NOT traced and produces no claim, not a wrong one.

BLIND SPOTS (enumerated)
-------------------------
1. The read line must be a genuine assignment (`$x = ...` / `$x .= ...`) on
   the SAME line as the `$attributes['attr']` read. A read split across
   multiple lines (e.g. a multi-line ternary whose `$attributes[...]` sits on
   its own line) will not seed the taint set and the row stays unclaimed.
2. Only `render.php` is examined -- a style emitted from a shared included
   helper (rather than the block's own render.php) is invisible to this
   mechanism. Detector 4's wrapper-only carve-out is the tool for that shape.
3. The chain is variable-name-based, not scope-aware: a variable reused with
   an unrelated meaning elsewhere in the same file could in principle produce
   a false positive. Not observed on either target row, but not structurally
   ruled out either -- a human reviewing the reported evidence_line closes
   the gap the same way every other detector in this programme relies on
   read-the-diff review before a role lands in the DB.
4. A fabricated / nonexistent attribute name never seeds the taint set (no
   read line exists), so it always resolves to nothing -- proven in
   self_test().

READ-ONLY. Proposes; never writes to sgs-framework.db.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PLUGIN_ROOT = SCRIPT_DIR.parent.parent          # plugins/sgs-blocks
BLOCKS_DIR = PLUGIN_ROOT / "src" / "blocks"

_source_cache: dict[Path, str] = {}


def _read(path: Path) -> str:
    if path not in _source_cache:
        try:
            _source_cache[path] = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            _source_cache[path] = ""
    return _source_cache[path]


def _rel(path: Path) -> str:
    try:
        return str(path.relative_to(PLUGIN_ROOT.parent.parent)).replace("\\", "/")
    except ValueError:
        return str(path)


def _block_dir(block_slug: str) -> Path:
    return BLOCKS_DIR / block_slug.split("/", 1)[-1]


# ---------------------------------------------------------------------------
# Mechanism A -- native support.
# ---------------------------------------------------------------------------

# Maps the attribute NAME WordPress core wires from a `supports` key to
# (supports_key, role). `className` deliberately does NOT map to a `className`
# key -- see module docstring CRITICAL note.
#
# THE ROLE IS PER-KEY, NOT A CONSTANT (2026-08-06). It was hardcoded `technical`
# for every native support, which is right for `anchor`/`className` -- plumbing
# WordPress injects, carrying nothing a draft could be cloned from -- and WRONG
# for `align`. `align` is core's ALIGNMENT attribute (`supports.align`), and core
# paints it as `alignleft`/`aligncenter`/`alignright`/`alignwide` on the wrapper:
# it carries real layout information, so a draft with a centred logo SHOULD clone
# to `align: center`. Filing it `technical` (classification styling-behaviour,
# excluded from the content walk) would tell the pipeline to discard that.
# `property_suffixes` independently corroborates the family: every `margin-*`
# row it holds carries role `layout`, and align's only SGS-side effect is a
# margin rule (responsive-logo/render.php:201).
_NATIVE_SUPPORT_KEY = {
    "anchor": ("anchor", "technical"),
    "className": ("customClassName", "technical"),
    "align": ("align", "layout"),
}


def native_support_evidence(block_slug: str, attr: str) -> dict | None:
    """(evidence_file, evidence_line) if block.json explicitly declares the
    matching supports key TRUE. None if the block.json is missing, the key is
    absent, or the key is explicitly false.
    """
    entry = _NATIVE_SUPPORT_KEY.get(attr)
    if entry is None:
        return None
    support_key = entry[0]
    path = _block_dir(block_slug) / "block.json"
    if not path.is_file():
        return None
    text = _read(path)
    # Anchored to `"<key>": true|false` -- a supports boolean flag. This can
    # never collide with an `attributes.anchor` declaration (which is always
    # followed by `{`, an object) or with "anchor" appearing as a STRING
    # element inside a variants array (never followed by `:`).
    m = re.search(rf'"{re.escape(support_key)}"\s*:\s*(true|false)', text)
    if not m:
        # ARRAY FORM (2026-08-06). `supports.align` is declared as a LIST of
        # permitted alignments (`["left","center","right","wide"]`), never a
        # boolean, so the boolean pattern above cannot match it -- adding
        # `align` to the map without this would have been SILENTLY INERT, the
        # same shape as the `supports.className` trap in the module docstring.
        # A non-empty array is the "declared true" equivalent; an empty array
        # means the block permits no alignment at all and is treated as false.
        m_arr = re.search(rf'"{re.escape(support_key)}"\s*:\s*\[([^\]]*)\]', text)
        if not m_arr or not m_arr.group(1).strip():
            return None
        line = text[: m_arr.start()].count("\n") + 1
        return {"evidence_file": str(path), "evidence_line": line}
    if m.group(1) != "true":
        return None
    line_no = text.count("\n", 0, m.start()) + 1
    return {"evidence_file": _rel(path), "evidence_line": line_no}


# ---------------------------------------------------------------------------
# Mechanism B -- style-element emission (forward data-flow, 2-hop).
# ---------------------------------------------------------------------------

_ASSIGN = re.compile(r"^\s*\$([A-Za-z_]\w*)\s*(\.=|=)\s*")


def style_emission_evidence(block_slug: str, attr: str) -> dict | None:
    path = _block_dir(block_slug) / "render.php"
    if not path.is_file():
        return None
    text = _read(path)
    if attr not in text:
        return None
    lines = text.splitlines()
    read_pat = re.compile(rf"\$attributes\s*\[\s*['\"]{re.escape(attr)}['\"]\s*\]")

    seed_var = None
    read_line_no = None
    for i, line in enumerate(lines, 1):
        if attr not in line or not read_pat.search(line):
            continue
        m = _ASSIGN.match(line)
        if not m:
            continue
        seed_var = m.group(1)
        read_line_no = i
        break
    if seed_var is None:
        return None

    tainted = {seed_var}
    for line in lines[read_line_no:]:
        m = _ASSIGN.match(line)
        if not m:
            continue
        lhs = m.group(1)
        rhs = line[m.end():]
        if any(re.search(rf"\${re.escape(v)}\b", rhs) for v in tainted):
            tainted.add(lhs)

    for line in lines:
        if "<style>" not in line:
            continue
        if any(re.search(rf"\${re.escape(v)}\b", line) for v in tainted):
            return {"evidence_file": _rel(path), "evidence_line": read_line_no}
    return None


# ---------------------------------------------------------------------------
# Public API.
# ---------------------------------------------------------------------------

def detect(candidates: list[tuple[str, str]]) -> list[dict]:
    """candidates: [(block_slug, attr_name)] already filtered to role IS NULL."""
    out = []
    for slug, attr in candidates:
        if attr in _NATIVE_SUPPORT_KEY:
            evidence = native_support_evidence(slug, attr)
            if evidence:
                out.append({
                    "block_slug": slug,
                    "attr_name": attr,
                    "role": _NATIVE_SUPPORT_KEY[attr][1],
                    "mechanism": "native-support",
                    **evidence,
                })
            continue
        evidence = style_emission_evidence(slug, attr)
        if evidence:
            out.append({
                "block_slug": slug,
                "attr_name": attr,
                "role": "styling",
                "mechanism": "style-emission",
                **evidence,
            })
    return out


def self_test() -> int:
    """Prove the detector can FAIL, and that each guard is load-bearing."""
    failures = []

    # 1. Positive -- sgs/button.anchor: supports.anchor === true (block.json:18).
    r = native_support_evidence("sgs/button", "anchor")
    if not r or "block.json" not in r["evidence_file"]:
        failures.append(f"sgs/button.anchor did not resolve to native-support technical: {r}")

    # 2. Positive -- sgs/heading.anchor: supports.anchor === true (block.json:21).
    r = native_support_evidence("sgs/heading", "anchor")
    if not r:
        failures.append("sgs/heading.anchor did not resolve to native-support technical")

    # 3. Positive -- sgs/button.className: keyed on customClassName, NOT className
    #    (button.json has no "className" supports key at all -- if this detector
    #    were keying on the wrong name it would silently return nothing here).
    r = native_support_evidence("sgs/button", "className")
    if not r:
        failures.append(
            "sgs/button.className did not resolve -- likely keying on the wrong "
            "supports name (className instead of customClassName)."
        )

    # 3b. Positive, ARRAY FORM -- sgs/responsive-logo.align: supports.align is
    #     ["left","center","right","wide"], a LIST not a boolean. The boolean
    #     pattern cannot match it, so without the array branch this detector
    #     would be SILENTLY INERT for align -- the exact failure shape the
    #     module docstring records for supports.className. Also asserts the
    #     per-key role: align is `layout` (core paints alignleft/aligncenter/
    #     alignright/alignwide and the block adds a margin rule), NOT the
    #     `technical` that anchor/className get.
    r = native_support_evidence("sgs/responsive-logo", "align")
    if not r:
        failures.append(
            "sgs/responsive-logo.align did not resolve -- the ARRAY form of "
            "supports.align is not being matched, so the align rule is inert."
        )
    got = detect([("sgs/responsive-logo", "align")])
    if not got or got[0].get("role") != "layout":
        failures.append(
            f"sgs/responsive-logo.align role should be 'layout', got {got!r}. "
            "align carries real layout the converter must be able to target; "
            "'technical' would exclude it from the walk."
        )
    # And the per-key map must NOT have flipped anchor/className to layout.
    got_anchor = detect([("sgs/button", "anchor")])
    if not got_anchor or got_anchor[0].get("role") != "technical":
        failures.append(
            f"sgs/button.anchor role should still be 'technical', got {got_anchor!r} "
            "-- the per-key role map leaked layout onto WP plumbing."
        )

    # 4. NEGATIVE CONTROL -- sgs/nav-drawer.anchor: supports.anchor === FALSE
    #    (block.json:70, real and verified). Must NOT be claimed technical.
    r = native_support_evidence("sgs/nav-drawer", "anchor")
    if r:
        failures.append(
            f"sgs/nav-drawer.anchor resolved to {r} but supports.anchor is FALSE "
            "on this block -- the detector is claiming a row it must not."
        )

    # 5. Positive -- sgs/nav-drawer.sgsCustomCss: read into $custom_css, merged
    #    into $css, printed inside <style>...</style>.
    r = style_emission_evidence("sgs/nav-drawer", "sgsCustomCss")
    if not r:
        failures.append("sgs/nav-drawer.sgsCustomCss did not resolve to style-emission")

    # 6. Positive -- sgs/nav-menu.sgsCustomCss: read+merged into $css in one
    #    line, printed inside <style>...</style>.
    r = style_emission_evidence("sgs/nav-menu", "sgsCustomCss")
    if not r:
        failures.append("sgs/nav-menu.sgsCustomCss did not resolve to style-emission")

    # 7. Fabricated attribute name guard, mechanism A -- must resolve to
    #    nothing (name isn't 'anchor' or 'className').
    r = native_support_evidence("sgs/button", "zzzNotARealAttributeName")
    if r:
        failures.append(f"a fabricated attribute name resolved via mechanism A: {r}")

    # 8. Fabricated attribute name guard, mechanism B -- no read line exists,
    #    so the taint set is never seeded and nothing can be claimed.
    r = style_emission_evidence("sgs/nav-drawer", "zzzNotARealAttributeName")
    if r:
        failures.append(f"a fabricated attribute name resolved via mechanism B: {r}")

    if failures:
        print(f"DETECTOR-6 SELF-TEST FAILED ({len(failures)} checks)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("DETECTOR-6 SELF-TEST PASSED -- 8 checks green.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--candidates", help="JSON file: [[block_slug, attr_name], ...]")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if not args.candidates:
        print("nothing to do: pass --candidates <file.json> or --self-test", file=sys.stderr)
        return 2
    cands = [tuple(x) for x in json.loads(Path(args.candidates).read_text(encoding="utf-8"))]
    for row in detect(cands):
        print(json.dumps(row))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
