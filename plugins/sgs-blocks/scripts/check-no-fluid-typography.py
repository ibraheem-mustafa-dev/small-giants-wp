#!/usr/bin/env python3
"""check-no-fluid-typography.py — "WordPress's fluid type engine stays off".

THE RULE (D1007, Spec 01 "Binding decision: draft type is copied as written", Bean 2026-11-03):
font sizes change per device through the SGS tier system (helpers-responsive.php)
and theme/sgs-theme/assets/css/type-scale.css, never through WordPress's fluid
engine. While `settings.typography.fluid` is on, WordPress rewrites every literal
px font size into clamp(14px, ..., 16px) and every preset without `fluid: false`
into a viewport curve, so body text shrinks on phones where the draft holds it.
A size meant to scale is written into the preset `size` itself as the draft's own
clamp(), verbatim (Spec 32 FR-32-16), which needs no engine.

WHAT IT FLAGS, in the framework theme.json, every deployed sites/<client>/theme-snapshot*.json
(not the extractor's scratch *.generated.json) and the extractor's expected and fixture snapshots:
  - `settings.typography.fluid` set to anything but false (true or a viewport-bounds object);
  - a `settings.typography.fontSizes` entry whose `fluid` is an object (a per-preset
    min/max curve, which only works with the engine on).

THE TRIAD
  --survey     list every file and its state
  --check      exit 1 on any instance
  --self-test  positive and negative fixtures, proving it can still fail

Run from plugins/sgs-blocks:  python scripts/check-no-fluid-typography.py --check
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PLUGIN = Path(__file__).resolve().parents[1]
REPO = PLUGIN.parents[1]


def targets() -> list[Path]:
    files = [REPO / "theme" / "sgs-theme" / "theme.json"]
    # *.generated.json is the extractor's scratch output (extract.py's default --out); nothing deploys or reads it.
    files += sorted(f for f in (REPO / "sites").glob("*/theme-snapshot*.json") if not f.name.endswith(".generated.json"))
    files += sorted((PLUGIN / "scripts" / "theme-extractor" / "expected").glob("*.json"))
    files += sorted((PLUGIN / "scripts" / "theme-extractor" / "tests" / "fixtures").glob("*snapshot*.json"))
    return [f for f in files if f.is_file()]


def problems(doc: dict) -> list[str]:
    out = []
    typo = (doc.get("settings") or {}).get("typography") or {}
    if "fluid" in typo and typo["fluid"] is not False:
        out.append(f"settings.typography.fluid is {json.dumps(typo['fluid'])}; set it to false")
    for entry in typo.get("fontSizes") or []:
        if isinstance(entry, dict) and isinstance(entry.get("fluid"), dict):
            out.append(f"fontSizes '{entry.get('slug')}' carries a fluid min/max curve; write the draft's clamp() into its size instead")
    return out


def scan() -> dict[str, list[str]]:
    found = {}
    for f in targets():
        try:
            doc = json.loads(f.read_text(encoding="utf-8"))
        except (OSError, ValueError) as exc:
            found[str(f.relative_to(REPO))] = [f"unreadable: {exc}"]
            continue
        found[str(f.relative_to(REPO))] = problems(doc)
    return found


def self_test() -> int:
    cases = [
        ({"settings": {"typography": {"fluid": {"minViewportWidth": "375px"}}}}, 1),
        ({"settings": {"typography": {"fluid": True}}}, 1),
        ({"settings": {"typography": {"fluid": False, "fontSizes": [{"slug": "hero", "size": "50px", "fluid": {"min": "33px", "max": "50px"}}]}}}, 1),
        ({"settings": {"typography": {"fluid": False, "fontSizes": [{"slug": "regular", "size": "16px", "fluid": False}]}}}, 0),
        ({"settings": {"typography": {"fontSizes": [{"slug": "hero", "size": "clamp(2.0625rem, 1.6rem + 1.5vw, 3.125rem)"}]}}}, 0),
        ({"settings": {}}, 0),
    ]
    failed = 0
    for i, (doc, want) in enumerate(cases, 1):
        got = len(problems(doc))
        if got != want:
            failed += 1
            print(f"self-test case {i}: expected {want} finding(s), got {got}")
    print("self-test: OK" if not failed else f"self-test: {failed} case(s) failed")
    return 1 if failed else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--survey", action="store_true")
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    found = scan()
    bad = {f: p for f, p in found.items() if p}
    if args.survey:
        for f, p in found.items():
            print(f"{'FLUID' if p else 'ok   '}  {f}" + (f"  ({'; '.join(p)})" if p else ""))
        print(f"{len(found)} file(s), {len(bad)} with fluid type")
        return 0
    if bad:
        for f, p in bad.items():
            for line in p:
                print(f"FAIL {f}: {line}")
        print(f"check-no-fluid-typography: FAIL ({len(bad)} file(s))")
        return 1
    print(f"check-no-fluid-typography: OK ({len(found)} file(s), fluid type off everywhere)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
