"""Gate: a setting painted under a state selector MUST carry a `css_state` in the derived layer.

A setting whose paint sits in a state rule (hover, focus, active, current, open, disabled, scrolled, shrunk) but whose
`block_attributes.css_state` is NULL is read as a resting setting. The route then writes a state look into the resting
rule, the render code paints the state at the block root, and the editor shows the control as an ordinary one.

Evidence of "painted under a state selector", all read-only, none re-implemented here:

  1. MANIFEST. `src/blocks/<block>/block.json` `supports.sgs.elements.<el>.states.<state>.attrMap` names the attributes
     that paint the element under <state>; an element that itself declares `"state": "<state>"` puts every attribute of
     its `attrMap` under that state.
  2. NAME TOKEN. An attribute that carries a real CSS property and a state word as a camel-case word (`quoteColourHover`,
     `menuActiveTextColour`, `itemColourOpen`). The words come from the DB (`modifier_suffixes` kind `state`, plus every
     state the DB already records in `block_attributes.css_state`), never from a list in this file. This is the original
     hover rule, widened to every state word.
  3. SELECTOR. A `derived_selector` the classifier's own vocabulary (`behavioural-analyser/state_vocabulary.py::derive_state`)
     reads as a state selector.

A name-token finding is exempt when no resting twin exists (the state word removed from the name gives no CSS attribute):
a state-only attribute cannot be declared under `states.<state>` without manufacturing a STATE_WITHOUT_BASE finding
(FR-35-5), as `sgs/gallery.overlayColourHover` and `sgs/business-info.linkHoverBackgroundImage`. Manifest and selector
evidence need no twin.

Known exceptions live in `data/state-classification-allowlist.json`, each with a reason.

DO NOT fix a finding by hand-setting `css_state` in the derived layer (it is regenerated). Declare the attribute on its
element in `block.json` (`states.<state>.attrMap`, or `"state"` on the element) and reseed.

Usage:
    python scripts/check-state-classification.py            # report
    python scripts/check-state-classification.py --check    # gate: exit 1 on any finding
    python scripts/check-state-classification.py --self-test
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from pathlib import Path
from typing import Iterable, NamedTuple

SCRIPTS = Path(__file__).resolve().parent
BLOCKS_DIR = SCRIPTS.parent / "src" / "blocks"
ALLOWLIST = SCRIPTS / "data" / "state-classification-allowlist.json"
SGS_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

sys.path.insert(0, str(SCRIPTS / "behavioural-analyser"))
import state_vocabulary  # noqa: E402

_CAMEL_WORD_RE = re.compile(r"[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])")


class Row(NamedTuple):
    """One `block_attributes` row, narrowed to the columns this gate reads."""

    block_slug: str
    attr_name: str
    css_property: str | None
    css_element: str | None
    css_state: str | None
    derived_selector: str | None = None


class Finding(NamedTuple):
    row: Row
    why: str


def name_words(attr_name: str) -> list[str]:
    return [w.lower() for w in _CAMEL_WORD_RE.findall(attr_name)]


def resting_sibling_name(attr_name: str, word: str) -> str:
    """The name the resting twin would have: the state word removed wherever it sits (`quoteColourHover`,
    `linkHoverTextColour`, `menuActiveTextColour`), the next word's capital restored when it opens the name."""
    out = re.sub(word.capitalize(), "", attr_name, count=1) if word.capitalize() in attr_name else re.sub(word, "", attr_name, count=1)
    return out[:1].lower() + out[1:] if out and attr_name[:1].islower() else out


def manifest_states(blocks_dir: Path = BLOCKS_DIR) -> dict[tuple[str, str], str]:
    """(block slug, attribute) -> the state its manifest paints it under."""
    out: dict[tuple[str, str], str] = {}
    for path in sorted(blocks_dir.glob("*/block.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        slug = data.get("name") or f"sgs/{path.parent.name}"
        elements = ((data.get("supports") or {}).get("sgs") or {}).get("elements") or {}
        for el in elements.values():
            if not isinstance(el, dict):
                continue
            if isinstance(el.get("state"), str):
                for attr in (el.get("attrMap") or {}).values():
                    if isinstance(attr, str):
                        out.setdefault((slug, attr), el["state"])
            for state, decl in (el.get("states") or {}).items():
                for attr in ((decl or {}).get("attrMap") or {}).values():
                    if isinstance(attr, str):
                        out.setdefault((slug, attr), state)
    return out


def load_allowlist(path: Path = ALLOWLIST) -> dict[tuple[str, str], str]:
    if not path.exists():
        return {}
    entries = json.loads(path.read_text(encoding="utf-8"))["entries"]
    return {(e["block"], e["attribute"]): e["reason"] for e in entries}


def find_unclassified_states(
    rows: Iterable[Row],
    manifest: dict[tuple[str, str], str],
    state_words: frozenset[str],
    allowlist: dict[tuple[str, str], str] | None = None,
) -> list[Finding]:
    """THE detector. Pure: takes rows, manifest reading, state words and allowlist; touches no database or file."""
    rows = list(rows)
    allowlist = allowlist or {}
    css_attrs = {(r.block_slug, r.attr_name) for r in rows if r.css_property is not None}
    findings: list[Finding] = []
    for row in rows:
        key = (row.block_slug, row.attr_name)
        if row.css_property is None or row.css_state is not None or key in allowlist:
            continue
        if key in manifest:
            findings.append(Finding(row, f"manifest paints it under states.{manifest[key]}"))
            continue
        if row.derived_selector:
            state, token = state_vocabulary.derive_state(row.derived_selector)
            if state:
                findings.append(Finding(row, f"derived_selector carries {token} ({state})"))
                continue
        word = next((w for w in name_words(row.attr_name) if w in state_words), None)
        if word and (row.block_slug, resting_sibling_name(row.attr_name, word)) in css_attrs:
            findings.append(Finding(row, f"name carries the state word '{word}' and a resting twin exists"))
    return findings


def open_db() -> sqlite3.Connection:
    if not SGS_DB.exists():
        print(f"FAIL: framework DB not found at {SGS_DB}", file=sys.stderr)
        raise SystemExit(2)
    return sqlite3.connect(f"file:{SGS_DB}?mode=ro", uri=True)


def load_state_words(con: sqlite3.Connection) -> frozenset[str]:
    words = {r[0].lower() for r in con.execute("SELECT suffix FROM modifier_suffixes WHERE kind='state'")}
    words |= {r[0] for r in con.execute("SELECT DISTINCT css_state FROM block_attributes WHERE css_state IS NOT NULL")}
    return frozenset(words)


def load_rows(con: sqlite3.Connection) -> list[Row]:
    cur = con.execute(
        "SELECT block_slug, attr_name, css_property, css_element, css_state, derived_selector "
        "FROM block_attributes WHERE block_slug LIKE 'sgs/%'"
    )
    return [Row(*r) for r in cur.fetchall()]


def report(findings: list[Finding], checked: int) -> None:
    if not findings:
        print(f"PASS: every setting painted under a state selector carries a css_state ({checked} rows read).")
        return
    print(f"FAIL: {len(findings)} setting(s) are painted under a state selector but carry no css_state.\n")
    for f in sorted(findings, key=lambda x: (x.row.block_slug, x.row.attr_name)):
        r = f.row
        print(f"  {r.block_slug}.{r.attr_name}  (css_property={r.css_property}, css_element={r.css_element})")
        print(f"      {f.why}")
    print(
        "\n  FIX: declare it on its element in block.json (states.<state>.attrMap, or \"state\" on the element), then reseed."
        "\n       Do NOT hand-set the derived column. A genuine exception goes in data/state-classification-allowlist.json with a reason."
    )


def self_test() -> int:
    """Negative controls (a planted untagged row goes red, one per evidence kind) and positive controls (tagged stays green)."""
    words = frozenset({"hover", "focus", "active", "current", "open", "disabled"})
    checks: list[tuple[str, bool]] = []

    def run(rows: list[Row], manifest: dict | None = None, allow: dict | None = None) -> list[Finding]:
        return find_unclassified_states(rows, manifest or {}, words, allow)

    base = Row("sgs/fx", "widgetColour", "color", "widget", None)
    hov = Row("sgs/fx", "widgetColourHover", "color", None, None)
    checks.append(("MUST FAIL: untagged *Hover row with a resting twin", [f.row for f in run([base, hov])] == [hov]))
    checks.append(("positive: the same row tagged hover is green", run([base, hov._replace(css_state="hover")]) == []))
    act = Row("sgs/fx", "menuActiveTextColour", "color", "menuActive", None)
    checks.append(("MUST FAIL: manifest element state with an untagged attribute", [f.row for f in run([act], {("sgs/fx", "menuActiveTextColour"): "current"})] == [act]))
    checks.append(("positive: manifest state attribute tagged is green", run([act._replace(css_state="current")], {("sgs/fx", "menuActiveTextColour"): "current"}) == []))
    odd = Row("sgs/fx", "itemColourOpen", "color", "item", None)
    checks.append(("MUST FAIL: non-hover state word with a resting twin", [f.row for f in run([Row("sgs/fx", "itemColour", "color", "item", None), odd])] == [odd]))
    sel = Row("sgs/fx", "ringColour", "color", "ring", None, ".sgs-fx__ring:focus-visible")
    checks.append(("MUST FAIL: derived_selector carrying a vocabulary state token", [f.row for f in run([sel])] == [sel]))
    checks.append(("positive: a plain derived_selector is green", run([sel._replace(derived_selector=".sgs-fx__ring")]) == []))
    only = Row("sgs/fx", "overlayColourHover", "background-color", "wrap", None)
    checks.append(("state-only row with no resting twin is exempt", run([only]) == []))
    checks.append(("exemption discriminates: same row WITH a twin is caught", [f.row for f in run([Row("sgs/fx", "overlayColour", "background-color", "wrap", None), only])] == [only]))
    checks.append(("non-CSS flag (pauseOnHover) is not flagged", run([Row("sgs/fx", "pauseOnHover", None, None, None)]) == []))
    allow = {("sgs/fx", "widgetColourHover"): "recorded exception"}
    checks.append(("allowlisted row is green", run([base, hov], allow=allow) == []))
    checks.append(("allowlist is scoped to its own row", [f.row for f in run([base, hov, odd, Row("sgs/fx", "itemColour", "color", "item", None)], allow=allow)] == [odd]))

    failed = 0
    for name, ok in checks:
        print(f"  {'PASS' if ok else 'FAIL'}  {name}")
        failed += 0 if ok else 1
    print(f"\n{len(checks) - failed}/{len(checks)} self-test assertions passed.")
    return 1 if failed else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="exit 1 on any finding (gate mode)")
    parser.add_argument("--self-test", action="store_true", help="run the detector's own assertions")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    con = open_db()
    try:
        rows = load_rows(con)
        words = load_state_words(con)
    finally:
        con.close()
    findings = find_unclassified_states(rows, manifest_states(), words, load_allowlist())
    report(findings, len(rows))
    return 1 if (args.check and findings) else 0


if __name__ == "__main__":
    raise SystemExit(main())
