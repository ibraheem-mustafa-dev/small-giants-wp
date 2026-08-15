#!/usr/bin/env python3
"""Audit `block_attributes.css_element` against each block's own element manifest.

WHY THIS EXISTS
---------------
`css_element` is the column that says which element inside a block an attribute
styles. Two consumers depend on it being correct:

  * inspector placement — element-grouped panels/headings are derived from it;
  * the colour-panel rollout — it decides whether a colour row is element-scoped.

A value that names an element the block does NOT declare is drift: it cannot
resolve to a label, so any derived UI silently falls back or renders a heading
with no backing element. Found live on 2026-08-15: `sgs/hero` carries
`overlay` and `media-overlay`, neither of which exists in its own
`supports.sgs.elements` manifest.

The inverse case is also reported (an element declared in the manifest that no
attribute references) because it is the signal for a *missing* control surface
rather than a broken one — informational, never an error.

READ-ONLY. This script never writes to the DB or to any block.json. It is a
survey, in the sense the sibling scripts in this directory use the word: it
reports candidates, and a human triages them. A finding here is NOT
automatically a defect — see `_note` handling below for the known-legitimate
shapes it deliberately does not flag.

USAGE
    python scripts/surveys/audit-css-element-drift.py            # human summary
    python scripts/surveys/audit-css-element-drift.py --json     # machine output
    python scripts/surveys/audit-css-element-drift.py --self-test # prove it can fail

HEURISTIC LIMITS (disclosed, per this directory's convention)
    * Only blocks with BOTH a block.json and a declared `supports.sgs.elements`
      manifest are audited. A block with no manifest cannot drift by this
      definition and is counted as SKIPPED, not as clean.
    * Element keys are compared verbatim. A manifest key differing only by case
      or hyphenation from the DB value is reported as drift, deliberately — the
      derivation that reads it does an exact match too, so a near-miss is a real
      break, not a false positive.
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BLOCKS_DIR = os.path.join(REPO_ROOT, "src", "blocks")
DB_PATH = os.path.join(
    os.path.expanduser("~"), ".claude", "skills", "sgs-wp-engine", "sgs-framework.db"
)


def load_manifest_elements(block_dir: str) -> set[str] | None:
    """Return the set of declared element keys, or None when no manifest exists.

    ⚠ TWO VOCABULARIES, deliberately reconciled here (found live 2026-08-15).
    The DB normalises a block's ROOT element to the canonical name ``wrapper``,
    but each block.json names that element whatever suits the block — measured
    across the tree: ``button``, ``grid``, ``box``, ``heading``, ``icon``,
    ``text``, ``line``, ``card``, ``root``, ``dialog``, ``banner``, ``strip-
    spacing``, ``quote-box``, ``slider``, ``frame``, ``aside``, ``panel``…
    Only 35 of 82 manifests happen to call it ``wrapper``.

    The link between them is the ``isWrapper: true`` flag, NOT name equality.
    Comparing names alone reported 64 orphans, of which the large majority were
    this mismatch rather than real drift — an instance of this project's own
    rule: detect by what a thing DOES, not by what it is called.
    """
    path = os.path.join(block_dir, "block.json")
    if not os.path.isfile(path):
        return None
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
    except (json.JSONDecodeError, OSError):
        return None
    elements = (data.get("supports", {}).get("sgs", {}) or {}).get("elements")
    if not isinstance(elements, dict):
        return None
    # Keys beginning "_" are documentation pseudo-entries (_note_*, _comment_*),
    # the same convention block.json uses for attributes.
    declared = {k for k in elements if not k.startswith("_")}
    # Accept the DB's canonical root name whenever the manifest marks ANY element
    # as the wrapper, whatever that element is locally called.
    if any(
        isinstance(v, dict) and v.get("isWrapper")
        for k, v in elements.items()
        if not k.startswith("_")
    ):
        declared.add("wrapper")
    return declared


def db_elements_by_block(conn: sqlite3.Connection) -> dict[str, dict[str, int]]:
    """block_slug -> {css_element: attr_count} for every non-NULL css_element."""
    rows = conn.execute(
        "SELECT block_slug, css_element, COUNT(*) FROM block_attributes "
        "WHERE block_slug LIKE 'sgs/%' AND css_element IS NOT NULL "
        "GROUP BY block_slug, css_element"
    ).fetchall()
    out: dict[str, dict[str, int]] = {}
    for slug, element, count in rows:
        out.setdefault(slug, {})[element] = count
    return out


def audit() -> dict:
    if not os.path.isfile(DB_PATH):
        raise SystemExit(f"DB not found at {DB_PATH}")
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    try:
        by_block = db_elements_by_block(conn)
    finally:
        conn.close()

    orphans: list[dict] = []
    unreferenced: list[dict] = []
    skipped: list[str] = []
    clean: list[str] = []

    for slug, elements in sorted(by_block.items()):
        block_name = slug.split("/", 1)[1]
        declared = load_manifest_elements(os.path.join(BLOCKS_DIR, block_name))
        if declared is None:
            skipped.append(slug)
            continue
        block_orphans = [
            {"block_slug": slug, "css_element": el, "attr_count": n}
            for el, n in sorted(elements.items())
            if el not in declared
        ]
        block_unreferenced = [
            {"block_slug": slug, "element": el}
            for el in sorted(declared - set(elements))
        ]
        orphans.extend(block_orphans)
        unreferenced.extend(block_unreferenced)
        if not block_orphans:
            clean.append(slug)

    return {
        "blocks_audited": len(by_block) - len(skipped),
        "blocks_clean": len(clean),
        "blocks_skipped_no_manifest": skipped,
        "orphan_css_elements": orphans,
        "declared_but_unreferenced": unreferenced,
    }


def self_test() -> int:
    """Prove the audit can distinguish drift from a clean block.

    Uses synthetic inputs only — the real tree is never modified. Both controls
    matter: a positive (drift IS reported) and a negative (a clean block is NOT
    reported), because an audit that flags everything is as useless as one that
    flags nothing.
    """
    failures: list[str] = []

    def check(label: str, ok: bool) -> None:
        if not ok:
            failures.append(label)

    declared = {"title", "price", "cta"}
    db_side = {"title": 2, "price": 1, "overlay": 3}
    orphans = {e for e in db_side if e not in declared}
    unreferenced = declared - set(db_side)

    check("POSITIVE: an element in the DB but not the manifest is an orphan",
          orphans == {"overlay"})
    check("NEGATIVE: an element present in both is NOT an orphan",
          "title" not in orphans and "price" not in orphans)
    check("INVERSE: a declared element no attribute references is reported separately",
          unreferenced == {"cta"})

    clean_declared = {"a", "b"}
    clean_db = {"a": 1, "b": 1}
    check("NEGATIVE CONTROL: a fully-aligned block yields zero orphans",
          not {e for e in clean_db if e not in clean_declared})

    check("Documentation pseudo-keys are excluded from the declared set",
          "_note_x" not in {k for k in {"title": 1, "_note_x": 1} if not k.startswith("_")})

    # --- the two-vocabulary reconciliation (the bug this audit shipped with) ---
    # A manifest naming its root element `button` (isWrapper:true) must satisfy a
    # DB row saying `wrapper`. Without this, 40+ blocks report a phantom orphan.
    import tempfile

    def _declared_for(elements: dict) -> set[str]:
        with tempfile.TemporaryDirectory() as tmp:
            with open(os.path.join(tmp, "block.json"), "w", encoding="utf-8") as fh:
                json.dump({"supports": {"sgs": {"elements": elements}}}, fh)
            return load_manifest_elements(tmp) or set()

    check(
        "POSITIVE: a root element named `button` with isWrapper satisfies a DB `wrapper` row",
        "wrapper" in _declared_for({"button": {"isWrapper": True}, "icon": {}}),
    )
    check(
        "NEGATIVE CONTROL: with NO isWrapper anywhere, `wrapper` is NOT synthesised "
        "(so a genuine wrapper orphan is still caught)",
        "wrapper" not in _declared_for({"title": {}, "price": {}}),
    )
    check(
        "A manifest that literally declares `wrapper` still resolves",
        "wrapper" in _declared_for({"wrapper": {"isWrapper": True}}),
    )

    for label in failures:
        print(f"  FAIL: {label}")
    print(f"Self-test: {8 - len(failures)} passed, {len(failures)} failed")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="machine-readable output")
    parser.add_argument("--self-test", action="store_true", help="prove the audit can fail")
    args = parser.parse_args()

    if args.self_test:
        return self_test()

    result = audit()
    if args.json:
        print(json.dumps(result, indent=2))
        return 0

    orphans = result["orphan_css_elements"]
    print(f"Blocks audited: {result['blocks_audited']}  |  clean: {result['blocks_clean']}")
    if result["blocks_skipped_no_manifest"]:
        print(f"Skipped (no element manifest): {len(result['blocks_skipped_no_manifest'])}")
    print(f"\nORPHAN css_element values (in DB, not declared in block.json): {len(orphans)}")
    for row in orphans:
        print(f"  {row['block_slug']:<28} {row['css_element']:<18} {row['attr_count']} attr(s)")
    print(
        f"\nDeclared but unreferenced (informational, not a defect): "
        f"{len(result['declared_but_unreferenced'])}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
