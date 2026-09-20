#!/usr/bin/env python3
"""check-fixture-fidelity.py - compare the nav-drawer POC content plan to the harvest.

Offline, stdlib only. For every variant in `poc-content-plan.json` it finds the
reference site it clones (the plan's `reference`, matched to a harvest file's
`site`), then checks:
  a. primary link COUNT equals the harvest's `counts.primary` and `len(primary_links)`;
  b. every primary label equals the harvest text exactly (case-sensitive; the
     harvest records the authored text, `css_uppercase` is informational);
  c. every secondary block's `exact_text` is in the plan's copy for that variant
     (each " / "-separated part). A block with NO part in the plan is reported
     NOT-CARRIED (the plan does not model it); a block with only SOME parts is a
     mismatch. Decorative and dynamic blocks are skipped and named;
  d. anything the plan's `_known_fidelity_limits` documents is KNOWN-LIMIT.

Exit: 0 all pass, 1 mismatch, 2 usage/unreadable input, 3 vacuous (0 variants).
"""
from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[3]
DEFAULT_PLAN = HERE / "poc-content-plan.json"
DEFAULT_LABELS = REPO_ROOT / ".claude" / "reports" / "2026-07-28-drawer-code-extraction"
NON_COPY_KEYS = {"url", "link", "platform", "iconSource", "iconName"}


class InputError(Exception):
    """Unreadable or malformed input (exit 2)."""


def read_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as err:
        raise InputError(f"cannot read {path}: {err}") from err


def load_harvests(labels_dir: Path) -> dict:
    files = sorted(labels_dir.glob("labels-*.json"))
    if not files:
        raise InputError(f"no labels-*.json under {labels_dir}")
    return {read_json(f).get("site", f.stem): read_json(f) for f in files}


def collect_copy(node, out: list) -> list:
    """Every authored string in a child block's attrs, in document order."""
    if isinstance(node, str):
        out.append(node)
    elif isinstance(node, list):
        for item in node:
            collect_copy(item, out)
    elif isinstance(node, dict):
        for key, value in node.items():
            if key not in NON_COPY_KEYS:
                collect_copy(value, out)
    return out


def site_key(reference: str) -> str:
    return reference.split(".")[0].lower()


def limit_for(limits: list, key: str, text: str, dynamic: bool = False):
    for limit in limits:
        low = limit.lower()
        if key in low and (text.lower() in low or (dynamic and "dynamic" in low)):
            return limit
    return None


def check_secondary(harvest_desktop: dict, copy_pieces: list, limits: list, key: str):
    joined = " ".join(copy_pieces)
    failures, not_carried, skipped = [], [], []
    for block in harvest_desktop.get("secondary_blocks", []):
        text = block.get("exact_text", "")
        note = str(block.get("note", ""))
        kind = str(block.get("kind", ""))
        if kind.startswith("decorative") or text.startswith("(no text"):
            skipped.append(f"decorative: {text}")
            continue
        if "dynamic" in note.lower():
            found = limit_for(limits, key, text, dynamic=True)
            skipped.append(f"dynamic: {text}" + (" [KNOWN-LIMIT]" if found else ""))
            continue
        parts = [p.strip() for p in text.split(" / ") if p.strip()]
        present = [p for p in parts if p in copy_pieces or p in joined]
        absent = [p for p in parts if p not in present]
        if not present:
            not_carried.append(text)
        elif absent:
            for part in absent:
                found = limit_for(limits, key, part)
                failures.append(f"secondary '{part}' (in '{text}')" + (" [KNOWN-LIMIT]" if found else ""))
    return failures, not_carried, skipped


def check_variant(variant: dict, harvests: dict, limits: list) -> dict:
    name, ref = variant.get("name", "?"), variant.get("reference", "")
    key = site_key(ref)
    row = {"variant": name, "site": ref, "expected": None, "actual": 0, "missing": [],
           "extra": [], "failures": [], "known_limits": [], "not_carried": [], "skipped": []}
    harvest = harvests.get(ref)
    labels = [m.get("text", "") for m in variant.get("menuLabels", [])]
    row["actual"] = len(labels)
    if harvest is None:
        row["failures"].append(f"missing harvest file for reference '{ref}'")
        return row
    desktop = harvest.get("desktop", {})
    links = desktop.get("primary_links", [])
    expected = [p.get("text", "") for p in links]
    row["expected"] = len(expected)
    if desktop.get("opened") is not True or not links:
        row["failures"].append("harvest unusable (desktop.opened is not true or no primary_links)")
        return row
    counted = desktop.get("counts", {}).get("primary")
    if counted != len(links):
        row["failures"].append(f"harvest inconsistent: counts.primary={counted} vs {len(links)} links")
    if len(labels) != len(expected):
        row["failures"].append(f"count: plan has {len(labels)}, harvest has {len(expected)}")
    row["missing"] = [t for t in expected if t not in labels]
    row["extra"] = [t for t in labels if t not in expected]
    for text in row["missing"] + row["extra"]:
        found = limit_for(limits, key, text)
        (row["known_limits"] if found else row["failures"]).append(
            f"label '{text}' " + ("differs" if not found else "differs [KNOWN-LIMIT]"))
    if not row["missing"] and not row["extra"] and labels != expected:
        row["failures"].append(f"label order differs: plan {labels} vs harvest {expected}")
    pieces = collect_copy([c.get("attrs", {}) for c in variant.get("children", [])], [])
    sec_fail, row["not_carried"], row["skipped"] = check_secondary(desktop, pieces, limits, key)
    for message in sec_fail:
        (row["known_limits"] if "[KNOWN-LIMIT]" in message else row["failures"]).append(message)
    return row


def run_check(plan: dict, harvests: dict) -> list:
    limits = plan.get("_known_fidelity_limits", [])
    return [check_variant(v, harvests, limits) for v in plan.get("variants", [])]


def exit_code(rows: list) -> int:
    if not rows:
        return 3
    return 1 if any(r["failures"] for r in rows) else 0


def render_table(rows: list) -> str:
    head = f"{'variant':<24}{'site':<18}{'exp':>4}{'act':>4}  {'status':<8} missing | extra"
    lines = [head, "-" * len(head)]
    for r in rows:
        status = "FAIL" if r["failures"] else ("LIMIT" if r["known_limits"] else "PASS")
        lines.append(f"{r['variant']:<24}{r['site']:<18}{str(r['expected']):>4}{r['actual']:>4}  "
                     f"{status:<8} {r['missing'] or '-'} | {r['extra'] or '-'}")
        for label, items in (("FAIL", r["failures"]), ("KNOWN-LIMIT", r["known_limits"]),
                             ("NOT-CARRIED", r["not_carried"]), ("SKIPPED", r["skipped"])):
            lines.extend(f"    {label}: {item}" for item in items)
    return "\n".join(lines)


def _pair():
    plan = {"_known_fidelity_limits": ["demo's Dribbble icon has no slug"],
            "variants": [{"name": "v1", "reference": "demo.com",
                          "menuLabels": [{"text": "Work"}, {"text": "About"}, {"text": "Contact"}],
                          "children": [{"block": "sgs/text", "attrs": {"text": "Hello there"}}]}]}
    harvest = {"demo.com": {"site": "demo.com", "desktop": {
        "opened": True, "counts": {"primary": 3},
        "primary_links": [{"text": "Work"}, {"text": "About"}, {"text": "Contact"}],
        "secondary_blocks": [{"kind": "other", "exact_text": "Hello there"}]}}}
    return plan, harvest


def self_test() -> int:
    plan, harvest = _pair()
    base = exit_code(run_check(plan, harvest))
    results = [("matching pair passes", base == 0)]

    def negative(name, mutate, holds, expect):
        p, h = copy.deepcopy(plan), copy.deepcopy(harvest)
        p, h = mutate(p, h)
        landed = holds(p, h)
        results.append((f"{name}: break landed", landed))
        results.append((f"{name}: check exits {expect}", landed and exit_code(run_check(p, h)) == expect))

    negative("dropped link", lambda p, h: (p["variants"][0]["menuLabels"].pop() and p, h),
             lambda p, h: len(p["variants"][0]["menuLabels"]) == 2, 1)
    negative("extra link", lambda p, h: (p["variants"][0]["menuLabels"].append({"text": "Extra"}) or p, h),
             lambda p, h: len(p["variants"][0]["menuLabels"]) == 4, 1)
    negative("changed label", lambda p, h: (p["variants"][0]["menuLabels"][1].update(text="about") or p, h),
             lambda p, h: p["variants"][0]["menuLabels"][1]["text"] != "About", 1)
    negative("missing harvest", lambda p, h: (p, {}), lambda p, h: not h, 1)
    negative("zero variants", lambda p, h: ({**p, "variants": []}, h), lambda p, h: not p["variants"], 3)
    negative("partial secondary", lambda p, h: (p, h["demo.com"]["desktop"]["secondary_blocks"].append(
        {"kind": "other", "exact_text": "Hello there / Missing part"}) or h) and (p, h),
        lambda p, h: len(h["demo.com"]["desktop"]["secondary_blocks"]) == 2, 1)
    p, h = copy.deepcopy(plan), copy.deepcopy(harvest)
    p["variants"][0]["menuLabels"][2]["text"] = "Dribbble"
    row = run_check(p, h)[0]
    results.append(("known limit is reported, not a failure",
                    any("Dribbble" in x for x in row["known_limits"])
                    and not any("Dribbble" in x for x in row["failures"])))
    bad = [name for name, ok in results if not ok]
    for name, ok in results:
        print(f"  {'ok  ' if ok else 'FAIL'} {name}")
    print(f"self-test: {len(results) - len(bad)}/{len(results)} passed")
    return 0 if not bad else 1


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--plan", type=Path, default=DEFAULT_PLAN)
    ap.add_argument("--labels-dir", type=Path, default=DEFAULT_LABELS)
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    ap.add_argument("--check", action="store_true", help="gate mode (same behaviour; exit code is the gate)")
    ap.add_argument("--self-test", action="store_true", help="prove the check can fail, then exit")
    args = ap.parse_args(argv)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if args.self_test:
        return self_test()
    try:
        plan, harvests = read_json(args.plan), load_harvests(args.labels_dir)
    except InputError as err:
        sys.stderr.write(f"check-fixture-fidelity: {err}\n")
        return 2
    rows = run_check(plan, harvests)
    code = exit_code(rows)
    if args.json:
        print(json.dumps({"exit": code, "variants": rows}, indent=2, ensure_ascii=False))
    else:
        print(render_table(rows) if rows else "check-fixture-fidelity: 0 variants compared (vacuous)")
        print(f"exit {code}")
    return code


if __name__ == "__main__":
    sys.exit(main())
