#!/usr/bin/env python3
"""Detector: a `named` extension's attributes are registered on its named blocks only.

  python plugins/sgs-blocks/scripts/check-named-extension-scope.py --survey --site <local mirror or scratch copy>
  python plugins/sgs-blocks/scripts/check-named-extension-scope.py --check --site <local mirror or scratch copy>
  python plugins/sgs-blocks/scripts/check-named-extension-scope.py --self-test

A `named` extension (src/blocks/extensions/extension-roster.json, rule mode "named") gives its attributes to the blocks
its rule names, such as the commerce look on woocommerce/cart and woocommerce/checkout. The server registers extension
attributes for the editor (includes/extension-attrs-rest-register.php), and every attribute it registers on a block
type is sent to the editor with that type's settings, so a named attribute registered on every block type multiplies
the editor's block settings payload by the number of block types. This reads the roster, asks the site's live block
registry (WP-CLI, read-only) which block types carry a named attribute they are not named for, and which named blocks
lack one of theirs, and prints the payload size.

--survey prints the findings and exits 0 whatever they are. --check exits 0 when every named attribute is on its named
blocks only, 1 when a block type carries one it is not named for or a named block lacks one, and 2 when the site could
not be read. There is nothing to fix in place: the fix is the generated scope file and the registration filter
(includes/extension-attrs-rest-register.php::sgs_extension_attribute_schema_for), so there is no --fix.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROSTER = HERE.parent / "src/blocks/extensions/extension-roster.json"


def named_scope(roster: dict) -> dict[str, list[str]]:
    """Each attribute of a named extension, mapped to the blocks its rule names."""
    scope: dict[str, list[str]] = {}
    for ext in roster["extensions"]:
        if ext["rule"].get("mode") != "named":
            continue
        for attr in ext["attributes"]:
            scope[attr] = sorted(set(scope.get(attr, [])) | set(ext["rule"]["blocks"]))
    return scope


def to_wsl(p: Path) -> str:
    s = str(p.resolve()).replace("\\", "/")
    m = re.match(r"^([A-Za-z]):/(.*)$", s)
    return f"/mnt/{m.group(1).lower()}/{m.group(2)}" if m else s


def probe(site: str, scope: dict) -> dict:
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, dir=Path("E:/sgs-tmp") if Path("E:/sgs-tmp").exists() else None, encoding="utf-8") as f:
        json.dump(scope, f)
        scope_file = Path(f.name)
    try:
        cmd = f"cd /var/www/{site} && sudo -u www-data wp --path=/var/www/{site} eval-file {to_wsl(HERE / 'named-extension-scope-probe.php')} {to_wsl(scope_file)}"
        r = subprocess.run(["wsl", "-d", "Ubuntu", "-u", "root", "--", "bash", "-c", cmd], capture_output=True, timeout=600)
    finally:
        scope_file.unlink(missing_ok=True)
    lines = [ln for ln in r.stdout.decode("utf-8", "replace").splitlines() if ln.startswith("{")]
    if r.returncode != 0 or not lines:
        raise RuntimeError(f"probe failed on {site}: {r.stderr.decode('utf-8', 'replace')[-600:]}")
    return json.loads(lines[-1])


def verdict(res: dict) -> tuple[int, list[str]]:
    out = [f"{res['block_types']} block types; editor block settings payload {res['payload_bytes']:,} bytes"]
    if res["wrong_total"]:
        worst = sorted(res["wrong"].items(), key=lambda kv: -kv[1])[:5]
        out.append(f"{res['wrong_total']:,} named attributes on {len(res['wrong'])} block types not named for them, e.g. " + ", ".join(f"{k} ({v})" for k, v in worst))
    if res["missing"]:
        out.append(f"{len(res['missing'])} named attributes missing from their own blocks, e.g. " + ", ".join(res["missing"][:5]))
    return (1 if res["wrong_total"] or res["missing"] else 0), out


def self_test() -> int:
    roster = {"extensions": [
        {"id": "x", "rule": {"mode": "named", "blocks": ["woo/a"]}, "attributes": {"sgsA": {}}},
        {"id": "y", "rule": {"mode": "universal"}, "attributes": {"sgsU": {}}},
    ]}
    assert named_scope(roster) == {"sgsA": ["woo/a"]}
    ok = {"block_types": 3, "wrong": {}, "wrong_total": 0, "missing": [], "payload_bytes": 10}
    bad = dict(ok, wrong={"core/paragraph": 1}, wrong_total=1)
    gone = dict(ok, missing=["woo/a: sgsA"])
    assert verdict(ok)[0] == 0 and verdict(bad)[0] == 1 and verdict(gone)[0] == 1
    print("self-test: ok")
    return 0


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--site", help="a WSL site folder under /var/www (a local mirror or scratch copy)")
    ap.add_argument("--survey", action="store_true", help="print the findings and exit 0")
    ap.add_argument("--check", action="store_true", help="exit 1 on a finding")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if a.survey == a.check:
        ap.error("pass exactly one of --survey, --check or --self-test")
    if not a.site or not re.fullmatch(r"local-[a-z0-9-]+", a.site):
        ap.error("--site must be a local mirror or scratch copy (local-...)")
    scope = named_scope(json.loads(ROSTER.read_text(encoding="utf-8")))
    try:
        res = probe(a.site, scope)
    except (RuntimeError, subprocess.TimeoutExpired) as e:
        print(f"check-named-extension-scope: {e}", file=sys.stderr)
        return 2
    code, lines = verdict(res)
    print(f"{len(scope)} named attributes in the roster; " + "; ".join(lines))
    return code if a.check else 0


if __name__ == "__main__":
    sys.exit(main())
