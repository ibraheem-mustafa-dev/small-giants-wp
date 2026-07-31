#!/usr/bin/env python3
"""Generate + check the attribution GROUND TRUTH (the falsifiable control).

Why this exists
---------------
``attribute_cells_to_sections`` decides which section a declared CSS row belongs
to. Changing that logic changes the DENOMINATOR of the project's headline
fidelity metric, and the obvious acceptance test ("unattributed went down") is a
metric the change itself moves — it is satisfied just as well by attributing
every row to the nearest section, correctly or not.

So the control is derived by a DELIBERATELY DIFFERENT METHOD from the one under
test, or it could not falsify it:

    under test   class-set membership — is the selector's class in the section
                 ROOT node's own class list?
    control      real CSS-selector resolution (``soup.select``) + DOM ancestry —
                 which node(s) does this selector ACTUALLY match, and which
                 discovered section physically CONTAINS that node?

The control also records the **probe target**: the node a cell's value must be
measured on. That is the second half of the fix. Attributing a descendant cell to
a section without moving the probe means comparing the descendant's draft value
against the SECTION ROOT's computed value — and for CSS-inherited properties
(font-size, color, font-weight, line-height) those frequently coincide, scoring a
false LANDED. Spec 31 §7b already forbids exactly this as the
"coincidental-default match" false win.

Verdicts per row
----------------
    OWNED       selector resolves to node(s) inside exactly one section
    AMBIGUOUS   resolves into more than one section — must NOT be attributed
    ORPHAN      resolves, but to no node inside any discovered section
    NO-MATCH    selector matches nothing in the draft DOM (dead rule)

Usage
-----
    python scripts/oracle/attribution_ground_truth.py --generate   # write control
    python scripts/oracle/attribution_ground_truth.py --check      # fix vs control
    python scripts/oracle/attribution_ground_truth.py --self-test  # prove it can fail
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_SCRIPTS = _HERE.parent
for _p in (str(_SCRIPTS), str(_HERE)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from oracle.batch_runner import (  # noqa: E402
    _relevant_declared_rows,
    discover_fixtures,
    discover_sections,
)

_DEFAULT_PHASE_F = _SCRIPTS / "tests" / "fixtures" / "phase-f"
_DEFAULT_CONFORMANCE = _SCRIPTS / "tests" / "fixtures" / "conformance"
_CONTROL = _SCRIPTS / "tests" / "fixtures" / "phase-f" / "_render-oracle" / "attribution-ground-truth.json"

# Fixtures chosen to exercise every shape, not just the easy one:
#   mamas-trust-bar-real  a REAL client draft + 7 non-simple selectors
#   rt-centred-maxwidth   clean single-section zero-match case
#   sgs-team-member       element tokens NOT in the css_element vocabulary
#   rt-pseudo-before      pseudo-element selectors (permanently unattributable)
CONTROL_FIXTURES = (
    "mamas-trust-bar-real",
    "rt-centred-maxwidth",
    "sgs-team-member",
    "rt-pseudo-before",
)


def _node_path(node) -> str:
    """Stable structural address for a DOM node — independent of class names."""
    parts = []
    cur = node
    while cur is not None and getattr(cur, "name", None):
        parent = cur.parent
        if parent is None or not getattr(parent, "name", None):
            parts.append(cur.name)
            break
        sibs = [c for c in parent.find_all(cur.name, recursive=False)]
        idx = sibs.index(cur) if cur in sibs else 0
        parts.append(f"{cur.name}[{idx}]")
        cur = parent
    return "/".join(reversed(parts))


def _section_nodes(soup, sections: list[dict]) -> tuple[dict, list[str]]:
    """Resolve each discovered section to its real DOM node.

    Returns (section_id -> node, collisions). A COLLISION is two sections whose
    ``draft_selector`` resolves to the same node — the known
    ``soup.select_one(.{root_classes[0]})`` hazard. Recorded, never silently
    resolved to the first hit.
    """
    nodes: dict[str, object] = {}
    seen: dict[int, str] = {}
    collisions: list[str] = []
    for sec in sections:
        sel = sec.get("draft_selector") or ""
        matched = soup.select(sel) if sel else []
        node = None
        for cand in matched:
            if id(cand) not in seen:
                node = cand
                break
        if node is None and matched:
            node = matched[0]
            collisions.append(f"{sec['section_id']} collides on {sel}")
        if node is not None:
            nodes[sec["section_id"]] = node
            seen[id(node)] = sec["section_id"]
    return nodes, collisions


def _owning_section(node, section_nodes: dict) -> str | None:
    """Nearest ANCESTOR-OR-SELF section — never skips an intermediate section."""
    by_id = {id(n): sid for sid, n in section_nodes.items()}
    cur = node
    while cur is not None:
        if id(cur) in by_id:
            return by_id[id(cur)]
        cur = cur.parent
    return None


def build_control(fixtures_dir: Path, conformance_dir: Path,
                  only: tuple[str, ...] | None = CONTROL_FIXTURES) -> dict:
    from bs4 import BeautifulSoup

    out_fixtures: dict[str, dict] = {}
    tally: Counter = Counter()

    for stem, path in discover_fixtures(fixtures_dir, conformance_dir):
        if only and stem not in only:
            continue
        try:
            html = path.read_text(encoding="utf-8")
        except OSError:
            continue
        soup = BeautifulSoup(html, "html.parser")
        sections = discover_sections(html)
        sec_nodes, collisions = _section_nodes(soup, sections)
        try:
            rows = _relevant_declared_rows(html)
        except Exception as exc:  # pragma: no cover
            out_fixtures[stem] = {"error": str(exc)}
            continue

        entries = []
        for row in rows:
            sel = row.selector.strip()
            try:
                matched = soup.select(sel)
            except Exception:
                matched = []          # not a resolvable CSS selector at all
            # A selector that BeautifulSoup cannot resolve is not automatically a
            # dead rule. Two shapes resolve to a real element that simply is not
            # in this static draft's matched set, and conflating them with
            # genuinely-dead rules would understate what is recoverable:
            #   ::before / ::after  a pseudo-element has no DOM node by
            #                       definition, but its BASE element does, and it
            #                       is probeable via getComputedStyle(el, '::before')
            #   [state] / :state    a conditional-state rule whose state is not
            #                       present in a static draft — honestly not
            #                       comparable, never a silent drop
            pseudo = None
            base_sel = sel
            if "::" in sel:
                base_sel, _, pseudo_part = sel.partition("::")
                pseudo = f"::{pseudo_part}"
            state_conditional = (not matched) and ("[" in sel or ":" in base_sel)

            probe_base = matched
            if not probe_base and base_sel != sel:
                try:
                    probe_base = soup.select(base_sel)
                except Exception:
                    probe_base = []

            owners, targets = [], []
            for n in probe_base:
                owner = _owning_section(n, sec_nodes)
                if owner:
                    owners.append(owner)
                    targets.append(_node_path(n) + (pseudo or ""))
            uniq = sorted(set(owners))

            if uniq and len(uniq) == 1:
                verdict = "OWNED-PSEUDO" if (pseudo and not matched) else "OWNED"
                owner = uniq[0]
            elif len(uniq) > 1:
                verdict, owner = "AMBIGUOUS", None
            elif state_conditional:
                verdict, owner = "STATE-CONDITIONAL", None
            elif not probe_base:
                verdict, owner = "NO-MATCH", None
            else:
                verdict, owner = "ORPHAN", None

            tally[verdict] += 1
            entries.append({
                "selector": sel,
                "property": row.property,
                "tier": row.tier,
                "verdict": verdict,
                "owning_section": owner,
                "probe_targets": sorted(set(targets)),
                "match_count": len(matched),
            })

        out_fixtures[stem] = {
            "section_count": len(sections),
            "section_ids": [s["section_id"] for s in sections],
            "section_collisions": collisions,
            "row_count": len(entries),
            "rows": entries,
        }

    return {
        "tool": "attribution_ground_truth",
        "method": "soup.select() CSS resolution + DOM ancestry — deliberately NOT "
                  "class-set membership, so it can falsify the code under test",
        "fixtures_in_control": sorted(out_fixtures),
        "verdict_totals": dict(tally.most_common()),
        "fixtures": out_fixtures,
    }


def cmd_generate(args) -> int:
    ctrl = build_control(args.fixtures_dir, args.conformance_dir)
    _CONTROL.parent.mkdir(parents=True, exist_ok=True)
    _CONTROL.write_text(json.dumps(ctrl, indent=2), encoding="utf-8")
    print(f"control written: {_CONTROL}")
    print(f"fixtures: {', '.join(ctrl['fixtures_in_control'])}")
    print(f"verdict totals: {ctrl['verdict_totals']}")
    total = sum(ctrl["verdict_totals"].values())
    owned = ctrl["verdict_totals"].get("OWNED", 0)
    print(f"rows: {total}  OWNED: {owned}")
    for stem, f in ctrl["fixtures"].items():
        if f.get("section_collisions"):
            print(f"  !! {stem}: {f['section_collisions']}")
    return 0


def cmd_check(args) -> int:
    """Compare the LIVE attributor against the committed control."""
    if not _CONTROL.exists():
        print(f"[ground-truth] no control at {_CONTROL} — run --generate first", file=sys.stderr)
        return 1
    ctrl = json.loads(_CONTROL.read_text(encoding="utf-8"))

    from oracle.batch_runner import attribute_cells_to_sections

    mismatches, checked = [], 0
    for stem, f in ctrl["fixtures"].items():
        path = None
        for s, p in discover_fixtures(args.fixtures_dir, args.conformance_dir):
            if s == stem:
                path = p
                break
        if path is None:
            continue
        html = path.read_text(encoding="utf-8")
        sections = discover_sections(html)
        rows = _relevant_declared_rows(html)
        by_sec, _unattr = attribute_cells_to_sections(html, sections, rows)

        # Key on the FULL (property, tier, draft_value) triple. Keying on
        # (property, tier) alone collides — many rows share a property across
        # sections, and taking the first hit would manufacture both false
        # matches and false mismatches. Where even the triple is ambiguous
        # (the same declaration genuinely appears twice), record it as such
        # rather than guessing.
        live_owner: dict[tuple[str, str, str], set] = {}
        for sid, cells in by_sec.items():
            for c in cells:
                k = (c.property, c.tier, str(getattr(c, "draft_value", "")))
                live_owner.setdefault(k, set()).add(sid)

        row_values = {}
        for row in rows:
            row_values[(row.selector.strip(), row.property, row.tier)] = str(row.value)

        for r in f["rows"]:
            if r["verdict"] not in ("OWNED", "OWNED-PSEUDO"):
                continue
            checked += 1
            val = row_values.get((r["selector"], r["property"], r["tier"]), "")
            owners = live_owner.get((r["property"], r["tier"], val))
            if owners is None:
                got = None                      # not attributed at all today
            elif len(owners) == 1:
                got = next(iter(owners))
            else:
                got = f"AMBIGUOUS{sorted(owners)}"
            if got != r["owning_section"]:
                mismatches.append({
                    "fixture": stem, "selector": r["selector"], "property": r["property"],
                    "expected": r["owning_section"], "got": got,
                })

    print("=" * 66)
    print("  Attribution vs GROUND TRUTH")
    print("=" * 66)
    print(f"  OWNED rows in control : {checked}")
    print(f"  mismatches            : {len(mismatches)}")
    if mismatches:
        for m in mismatches[:20]:
            print(f"    {m['fixture']}: {m['selector']} {{{m['property']}}} "
                  f"expected={m['expected']} got={m['got']}")
        print("\n  FAIL — the attributor disagrees with independently-derived truth.")
        return 1 if args.check else 0
    print("\n  PASS — every OWNED row attributes to the section that physically contains it.")
    return 0


def cmd_self_test(args) -> int:
    """Prove the control can FAIL — a control that always passes is worthless."""
    from bs4 import BeautifulSoup
    html = """<html><body>
      <section class="sgs-hero"><div class="sgs-hero__title">A</div></section>
      <section class="sgs-cta-section"><div class="sgs-cta-section__title">B</div></section>
    </body></html>"""
    soup = BeautifulSoup(html, "html.parser")
    fake_sections = [
        {"section_id": "s1", "draft_selector": ".sgs-hero", "block_slug": "sgs/hero"},
        {"section_id": "s2", "draft_selector": ".sgs-cta-section", "block_slug": "sgs/cta-section"},
    ]
    nodes, _ = _section_nodes(soup, fake_sections)
    ok = True

    n = soup.select(".sgs-hero__title")[0]
    got = _owning_section(n, nodes)
    print(f"  case 1 descendant -> owning section : {got} (want s1)")
    ok &= got == "s1"

    n2 = soup.select(".sgs-cta-section__title")[0]
    got2 = _owning_section(n2, nodes)
    print(f"  case 2 sibling section, not the first: {got2} (want s2)")
    ok &= got2 == "s2"

    # A control that cannot distinguish these two would silently pass a fix that
    # attributes every descendant to whichever section it found first.
    print(f"  case 3 the two differ                : {got != got2} (want True)")
    ok &= got != got2

    orphan = BeautifulSoup("<div class='x'>y</div>", "html.parser").select(".x")[0]
    got3 = _owning_section(orphan, nodes)
    print(f"  case 4 node outside any section      : {got3} (want None)")
    ok &= got3 is None

    print("\n  SELF-TEST PASSED" if ok else "\n  SELF-TEST FAILED")
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    m = ap.add_mutually_exclusive_group(required=True)
    m.add_argument("--generate", action="store_true")
    m.add_argument("--check", action="store_true")
    m.add_argument("--self-test", action="store_true")
    ap.add_argument("--fixtures-dir", type=Path, default=_DEFAULT_PHASE_F)
    ap.add_argument("--conformance-dir", type=Path, default=_DEFAULT_CONFORMANCE)
    a = ap.parse_args()
    if a.generate:
        return cmd_generate(a)
    if a.self_test:
        return cmd_self_test(a)
    return cmd_check(a)


if __name__ == "__main__":
    raise SystemExit(main())
