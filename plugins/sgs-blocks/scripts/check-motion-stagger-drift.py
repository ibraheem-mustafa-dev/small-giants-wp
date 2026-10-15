#!/usr/bin/env python3
"""check-motion-stagger-drift.py - stored stagger delays must match what the helper would write (Spec 38A FR-38A-25).

A container whose `sgsMotion.stagger` settings exist gives every child with an entrance a stored delay (`values.delay`
on Desktop, `devices.tablet.delay` / `devices.mobile.delay` where a tier differs from the tier above). The delay for
child N is a function of the settings, the child count and the container's stored grid columns, so a stored delay that
differs from that function is DRIFT: a child was moved, removed or hand-edited without the helper re-running. A child
whose layer lists `values.delay` in `customised` is skipped (the client chose that delay), as is a tier whose
`devices.<tier>.delay` is customised. A child with no entrance layer is skipped but still holds its position.

  --check      drift in the fixture trees under scripts/fixtures/motion-stagger-drift/ (or --dir), plus parity of this
               script's port of the delay function with tests/fixtures/motion/stagger-parity-cases.json, the file the
               JS (src/components/motion/stagger-delays.js) and PHP (Sgs_Motion_Stagger) implementations also run.
  --site NAME  by hand only: the same drift check over a site's pages, posts, patterns and templates, read through the
               REST API with .claude/secrets/NAME.env (GET requests only; nothing is written).
  --self-test  plants an out-of-order delay in a copy of a fixture and requires --check to report it, a customised
               plant to be skipped, an unplanted copy to be clean, and a wrong expectation to fail the parity.

Exits 1 on drift or a parity mismatch. Run from anywhere:  python plugins/sgs-blocks/scripts/check-motion-stagger-drift.py --check
"""
from __future__ import annotations

import argparse
import base64
import copy
import json
import math
import re
import sys
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

sys.stdout.reconfigure(encoding="utf-8")
PLUGIN = Path(__file__).resolve().parents[1]
REPO = PLUGIN.parents[1]
FIXTURES = PLUGIN / "scripts" / "fixtures" / "motion-stagger-drift"
PARITY_CASES = PLUGIN / "tests" / "fixtures" / "motion" / "stagger-parity-cases.json"
GRID_COLUMNS = PLUGIN / "src" / "blocks" / "extensions" / "motion" / "stagger" / "generated-grid-columns.json"
SECRETS = REPO / ".claude" / "secrets"
TIERS = ("desktop", "tablet", "mobile")
ORDERS = ("row-first", "column-first", "from-centre", "reverse", "flatten")
# What the helper shows for a setting the client has not set (StaggerHelper.js::STAGGER_DEFAULTS).
DEFAULTS = {"apply": False, "offset": 0, "step": 80, "order": "row-first", "perRow": True}


def _number(value: Any) -> float:
    """JS Number( value ) for the inputs a settings object carries."""
    if value is None:
        return 0.0
    if isinstance(value, bool):
        return 1.0 if value else 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return 0.0
        try:
            return float(text)
        except ValueError:
            return math.nan
    return math.nan


def _count(value: Any) -> int:
    num = _number(value)
    return int(max(0, math.floor(num))) if math.isfinite(num) else 0


def _blank(value: Any) -> bool:
    return value is None or value == ""


def _ms(value: Any, fallback: float) -> float:
    if _blank(value):
        return fallback
    num = _number(value)
    return max(0.0, num) if math.isfinite(num) else fallback


def compute_delays(settings: dict) -> list[int]:
    """The one delay function (Spec 38A section 8), ported from Sgs_Motion_Stagger::compute_delays."""
    total = _count(settings.get("count"))
    columns = max(1, _count(settings.get("columns")))
    start = _ms(settings.get("offset"), 0.0)
    step = _ms(settings.get("step"), 0.0)
    cap = settings.get("cap")
    ceiling = math.inf if _blank(cap) else _ms(cap, math.inf)
    order = settings.get("order", "row-first")
    order = order if isinstance(order, str) and order in ORDERS else "row-first"
    per_row = settings.get("perRow", True)
    restart = columns > 1 and per_row is not False and order != "flatten"
    line = columns if restart else total
    rows = math.ceil(total / columns)
    out: list[int] = []
    for i in range(total):
        column, row = i % columns, i // columns
        in_line = column if restart else i
        if order == "column-first":
            position = i if columns == 1 else (row if restart else column * rows + row)
        elif order == "from-centre":
            position = math.floor(abs(in_line - (line - 1) / 2))
        elif order == "reverse":
            position = line - 1 - in_line
        elif order == "flatten":
            position = i
        else:
            position = in_line
        out.append(int(math.floor(min(start + position * step, ceiling) + 0.5)))
    return out


def compute_close_delays(delays: list[int], direction: str = "same") -> list[int]:
    if direction == "together":
        return [0] * len(delays)
    if direction != "reversed" or not delays:
        return list(delays)
    low, high = min(delays), max(delays)
    return [high + low - d for d in delays]


def columns_at(block: str, attrs: dict, tier: str, grid: dict) -> int | None:
    """The container's stored grid columns at a tier (entrance-facts.js::columnsAt)."""
    # A block with a layout choice has columns only in its grid layout; any other layout is one column (section 8).
    if isinstance(attrs.get("layout"), str) and attrs["layout"] != "grid":
        return None
    attribute = grid.get(block, {}).get(tier)
    stored = attrs.get(attribute) if attribute else None
    if isinstance(stored, (int, float)) and not isinstance(stored, bool):
        return int(stored)
    if not isinstance(stored, dict):
        return None
    chain = {"desktop": ["desktop"], "tablet": ["tablet", "desktop"], "mobile": ["mobile", "tablet", "desktop"]}[tier]
    for name in chain:
        num = _number(stored.get(name))
        if stored.get(name) not in (None, "") and math.isfinite(num):
            return int(num)
    return None


def entrance_layer(block: dict) -> dict | None:
    """The block's root entrance base layer, or None."""
    motion = (block.get("attributes") or {}).get("sgsMotion")
    base = (((motion or {}).get("elements") or {}).get("root") or {}).get("entrance", {}).get("base") if isinstance(motion, dict) else None
    if isinstance(base, list):
        base = base[0] if base else None
    return base if isinstance(base, dict) else None


def stored_tiers(layer: dict) -> dict[str, int]:
    """Effective stored delay per tier: a tier with no delay of its own takes the tier above."""
    desktop = _count((layer.get("values") or {}).get("delay"))
    devices = layer.get("devices") or {}
    tablet = _count(devices["tablet"]["delay"]) if isinstance(devices.get("tablet"), dict) and "delay" in devices["tablet"] else desktop
    mobile = _count(devices["mobile"]["delay"]) if isinstance(devices.get("mobile"), dict) and "delay" in devices["mobile"] else tablet
    return {"desktop": desktop, "tablet": tablet, "mobile": mobile}


def find_drift(blocks: list[dict], grid: dict, where: str = "") -> list[str]:
    """Every stored delay in the tree that differs from the helper's value, one line each."""
    found: list[str] = []
    for index, block in enumerate(blocks):
        if not isinstance(block, dict):
            continue
        name = block.get("name") or block.get("blockName") or "?"
        here = f"{where}/{name}[{index}]"
        kids = block.get("innerBlocks") or []
        attrs = block.get("attributes") or block.get("attrs") or {}
        motion = attrs.get("sgsMotion")
        stagger = motion.get("stagger") if isinstance(motion, dict) else None
        if isinstance(stagger, dict) and stagger and kids:
            settings = {**DEFAULTS, **stagger}
            expected = {
                tier: compute_delays({
                    "count": len(kids), "columns": columns_at(name, attrs, tier, grid), "offset": settings["offset"],
                    "step": settings["step"], "order": settings["order"], "perRow": settings["perRow"], "cap": settings.get("cap"),
                })
                for tier in TIERS
            }
            for position, kid in enumerate(kids):
                layer = entrance_layer({"attributes": kid.get("attributes") or kid.get("attrs") or {}})
                if layer is None or "values.delay" in (layer.get("customised") or []):
                    continue
                stored = stored_tiers(layer)
                for tier in TIERS:
                    if tier != "desktop" and f"devices.{tier}.delay" in (layer.get("customised") or []):
                        continue
                    if stored[tier] != expected[tier][position]:
                        found.append(f"{here}/child {position} {tier}: stored {stored[tier]}ms, the helper gives {expected[tier][position]}ms")
        found.extend(find_drift(kids, grid, here))
    return found


def parity_failures(cases: list[dict], mutate: bool = False) -> list[str]:
    """Cases whose expected values this port does not reproduce (mutate=True corrupts the expectation: a control)."""
    bad: list[str] = []
    for case in cases:
        expected = list(case["expected"])
        if mutate and expected:
            expected[0] += 1
        if case["kind"] == "delays":
            got = compute_delays(case["settings"])
        elif case["kind"] == "close":
            got = compute_close_delays(case["delays"], case.get("direction", "same"))
        else:
            bad.append(f"{case.get('name')}: unknown kind {case['kind']}")
            continue
        if got != expected:
            bad.append(f"{case['name']}: expected {expected}, got {got}")
    return bad


def load_grid() -> dict:
    return json.loads(GRID_COLUMNS.read_text(encoding="utf-8")).get("blocks", {})


def fixture_trees(directory: Path) -> dict[str, list]:
    return {p.name: json.loads(p.read_text(encoding="utf-8")) for p in sorted(directory.glob("*.json"))}


def run_check(directory: Path) -> int:
    trees = fixture_trees(directory)
    if not trees:
        print(f"check-motion-stagger-drift: no fixture trees in {directory}")
        return 1
    grid = load_grid()
    cases = json.loads(PARITY_CASES.read_text(encoding="utf-8"))["cases"]
    failed = 0
    for name, tree in trees.items():
        for line in find_drift(tree, grid, name):
            print(f"DRIFT {line}")
            failed += 1
    for line in parity_failures(cases):
        print(f"PARITY {line}")
        failed += 1
    print(f"check-motion-stagger-drift: {len(trees)} fixture trees, {len(cases)} parity cases, {failed} problems")
    return 1 if failed else 0


def plant(tree: list, customised: bool) -> list:
    """A copy of a tree with two children's desktop delays swapped (out of order); optionally customised."""
    planted = copy.deepcopy(tree)
    kids = [k for k in planted[0]["innerBlocks"] if entrance_layer(k)]
    first, second = entrance_layer(kids[1]), entrance_layer(kids[2])
    first["values"]["delay"], second["values"]["delay"] = second["values"]["delay"], first["values"]["delay"]
    if customised:
        first["customised"], second["customised"] = ["values.delay"], ["values.delay"]
    return planted


def self_test() -> int:
    base = fixture_trees(FIXTURES).get("ok-grid-row-first.json")
    if base is None:
        print("self-test: fixture ok-grid-row-first.json is missing")
        return 1
    problems: list[str] = []
    with tempfile.TemporaryDirectory() as scratch:
        for label, tree, want in (("clean copy", base, 0), ("out-of-order plant", plant(base, False), 1), ("customised plant", plant(base, True), 0)):
            folder = Path(scratch) / label.replace(" ", "-")
            folder.mkdir()
            (folder / "planted.json").write_text(json.dumps(tree), encoding="utf-8")
            print(f"self-test: {label}: --check on the copy")
            code = run_check(folder)
            if code != want:
                problems.append(f"{label}: --check returned {code}, wanted {want}")
    cases = json.loads(PARITY_CASES.read_text(encoding="utf-8"))["cases"]
    if not parity_failures(cases, mutate=True):
        problems.append("a corrupted parity expectation was not caught")
    if parity_failures(cases):
        problems.append("the port disagrees with the shared parity cases")
    for line in problems:
        print(f"SELF-TEST FAIL {line}")
    print("check-motion-stagger-drift --self-test: " + ("FAILED" if problems else "pass (the out-of-order plant was reported, the customised plant and the clean copy were not, the corrupted parity case was caught)"))
    return 1 if problems else 0


COMMENT = re.compile(r"<!--\s+(/)?wp:([a-z][a-z0-9_-]*(?:/[a-z][a-z0-9_-]*)?)\s*(\{.*?\})?\s*(/)?-->", re.S)


def parse_blocks(markup: str) -> list[dict]:
    """The block tree of serialised post content (block comments only)."""
    root: dict = {"innerBlocks": []}
    stack = [root]
    for match in COMMENT.finditer(markup):
        closer, name, raw, selfclose = match.groups()
        if closer:
            if len(stack) > 1:
                stack.pop()
            continue
        try:
            attrs = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            attrs = {}
        node = {"name": name if "/" in name else f"core/{name}", "attributes": attrs, "innerBlocks": []}
        stack[-1]["innerBlocks"].append(node)
        if not selfclose:
            stack.append(node)
    return root["innerBlocks"]


def site_credentials(site: str) -> tuple[str, str, str]:
    path = SECRETS / f"{site}.env"
    if not path.is_file():
        raise SystemExit(f"no credentials file {path}")
    suffix = re.sub(r"[^A-Za-z0-9]", "", site).upper()
    env = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip().strip("\"'")
    missing = [k for k in (f"WP_USER_{suffix}", f"WP_APP_PWD_{suffix}", f"WP_URL_{suffix}") if k not in env]
    if missing:
        raise SystemExit(f"{path} lacks {', '.join(missing)}")
    return env[f"WP_URL_{suffix}"].rstrip("/"), env[f"WP_USER_{suffix}"], env[f"WP_APP_PWD_{suffix}"]


def rest_get(base: str, route: str, auth: str, page: int) -> tuple[list, int]:
    query = urllib.parse.urlencode({"context": "edit", "per_page": 100, "page": page, "_fields": "id,slug,title,content"})
    request = urllib.request.Request(f"{base}/wp-json/wp/v2/{route}?{query}", headers={"Authorization": f"Basic {auth}", "User-Agent": "sgs-stagger-drift/1.0"}, method="GET")
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8")), int(response.headers.get("X-WP-TotalPages", "1"))


def run_site(site: str) -> int:
    base, user, password = site_credentials(site)
    auth = base64.b64encode(f"{user}:{password}".encode()).decode()
    grid = load_grid()
    failed = scanned = 0
    for route in ("pages", "posts", "blocks", "template-parts", "templates"):
        page = total = 1
        while page <= total:
            try:
                rows, total = rest_get(base, route, auth, page)
            except Exception as error:  # a route the site lacks is reported, not fatal
                print(f"{route}: not read ({error})")
                break
            for row in rows:
                content = row.get("content") or {}
                markup = content.get("raw") if isinstance(content, dict) else None
                if not markup:
                    continue
                scanned += 1
                for line in find_drift(parse_blocks(markup), grid, f"{route}/{row.get('id')}"):
                    print(f"DRIFT {line}")
                    failed += 1
            page += 1
    print(f"check-motion-stagger-drift --site {site}: {scanned} documents read, {failed} drifted delays")
    return 1 if failed else 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="drift in the fixture trees, plus parity with the shared cases")
    parser.add_argument("--self-test", action="store_true", help="plant an out-of-order delay and require --check to report it")
    parser.add_argument("--site", metavar="NAME", help="by hand: read a site's content over REST (read-only)")
    parser.add_argument("--dir", type=Path, default=FIXTURES, help="fixture directory for --check")
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    if args.site:
        return run_site(args.site)
    if args.check:
        return run_check(args.dir)
    parser.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
