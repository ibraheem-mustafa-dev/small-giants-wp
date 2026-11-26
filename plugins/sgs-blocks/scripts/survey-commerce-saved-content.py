#!/usr/bin/env python3
"""survey-commerce-saved-content.py - counts the saved instances Stage E3's commerce change will touch, on every mirror and in the repo.

Track W6 (shop and choice-flow blocks, plan Task 13) removes the product card's "Frame card" block style (Bean, 2026-11-26). The
survey counts every post, template or repo file that still holds `is-style-frame-card` on an `sgs/product-card`, and each W6 block's
total instances; `--check` exits 1 while any is left. (The product card's button count and the choice flow's picture size are
deferred by Bean, 2026-11-26, so their shapes are not surveyed.) Same method as scripts/migrate-spacing-attrs: survey, fix, check, self-test.

Sources: the rows of each local mirror's posts table (read through scripts/dump-sgs-posts.php with `wp eval-file`, read-only), and
the repo: sites/*/build trees and HTML, theme templates, parts and patterns, plugin patterns, and (counted apart as "backup") the
dated backups under .claude/backups and sites/*/build/backups.

USAGE (from plugins/sgs-blocks)
  python scripts/survey-commerce-saved-content.py --survey [--mirrors a,b] [--no-repo] [--reuse] [--json out.json]
  python scripts/survey-commerce-saved-content.py --check  [--mirrors a,b] [--no-repo] [--reuse]
  python scripts/survey-commerce-saved-content.py --self-test
`--reuse` reads the dumps a previous run left in the temp folder instead of asking each mirror again.
"""
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
PLUGIN = Path(__file__).resolve().parents[1]
REPO = PLUGIN.parents[1]
MIRRORS = ("local-mamas", "local-indus", "local-eye-care", "local-sandybrown", "local-mediatest-eyecaretest")
BLOCKS = (
    "product-card", "buybox", "cart", "account", "choice-flow", "choice-flow-question", "choice-flow-result", "option-picker",
    "wishlist-link", "wishlist-panel", "store-selector", "product-search", "gift-order", "order-items", "commerce-note",
    "pay-later-message", "free-delivery-bar", "filter-search", "product-faq", "product-faq-item",
)
COMMENT = re.compile(r"<!--\s+wp:(sgs/[a-z0-9-]+)(?:\s+(\{.*?\}))?\s+/?-->", re.S)


def present(v):
    """True for a stored value that says something: not None, '', {} or []."""
    return v not in (None, "", {}, [])


# (key, block, label, test(attrs) -> bool, what the sweep does, counted_by_check)
RULES = (
    ("frame-card", "sgs/product-card", "frame-card style", lambda a: "is-style-frame-card" in str(a.get("className", "")), "equivalent settings or none", True),
)


def iter_blocks_comments(text):
    for m in COMMENT.finditer(text):
        try:
            attrs = json.loads(m.group(2)) if m.group(2) else {}
        except ValueError:
            attrs = {}
        yield m.group(1), attrs


def iter_blocks_tree(node):
    if isinstance(node, dict):
        name = node.get("name") or node.get("blockName")
        attrs = node.get("attributes", node.get("attrs"))
        if isinstance(name, str) and name.startswith("sgs/") and isinstance(attrs, dict):
            yield name, attrs
        for v in node.values():
            yield from iter_blocks_tree(v)
    elif isinstance(node, list):
        for v in node:
            yield from iter_blocks_tree(v)


def blocks_in_text(text, as_json=False):
    if as_json:
        try:
            yield from iter_blocks_tree(json.loads(text))
        except ValueError:
            yield from iter_blocks_comments(text)
    else:
        yield from iter_blocks_comments(text)


def tally(blocks):
    """{'total': {block: n}, 'rules': {key: n}} for an iterable of (block name, attrs)."""
    total, rules = {}, {r[0]: 0 for r in RULES}
    for name, attrs in blocks:
        if name.removeprefix("sgs/") in BLOCKS:
            total[name] = total.get(name, 0) + 1
        for key, blk, _label, test, _sweep, _chk in RULES:
            if name == blk and test(attrs):
                rules[key] += 1
    return {"total": total, "rules": rules}


def merge(into, other):
    for k, v in other["total"].items():
        into["total"][k] = into["total"].get(k, 0) + v
    for k, v in other["rules"].items():
        into["rules"][k] = into["rules"].get(k, 0) + v


def empty():
    return {"total": {}, "rules": {r[0]: 0 for r in RULES}}


def wsl_path(p):
    p = str(Path(p).resolve())
    return "/mnt/" + p[0].lower() + p[2:].replace("\\", "/")


def temp_dir():
    t = Path(os.environ.get("TEMP") or os.environ.get("TMPDIR") or ".")
    d = t / "w6-saved-content-dumps"
    d.mkdir(parents=True, exist_ok=True)
    return d


def dump_mirror(mirror, reuse):
    out = temp_dir() / f"{mirror}.jsonl"
    if reuse and out.exists():
        return out
    script = wsl_path(PLUGIN / "scripts" / "dump-sgs-posts.php")
    cmd = ["wsl", "-d", "Ubuntu", "-u", "root", "--", "wp", "--allow-root", f"--path=/var/www/{mirror}", "eval-file", script, wsl_path(out)]
    r = subprocess.run(cmd, capture_output=True, text=True, env={**os.environ, "MSYS_NO_PATHCONV": "1"})
    if r.returncode != 0 or not out.exists():
        raise RuntimeError(f"dump of {mirror} failed: {(r.stderr or r.stdout).strip()[-300:]}")
    return out


def scan_mirror(mirror, reuse):
    t = empty()
    posts = 0
    for line in dump_mirror(mirror, reuse).read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        posts += 1
        merge(t, tally(blocks_in_text(row["post_content"])))
    t["posts"] = posts
    return t


def repo_files():
    """(kind, path) for every repo file a saved block can sit in. kind: 'repo' or 'backup'."""
    roots = [
        (REPO / "sites", ("*.json", "*.html", "*.php", "*.txt")),
        (REPO / "theme" / "sgs-theme", ("*.html", "*.php", "*.json")),
        (REPO / "plugins" / "sgs-blocks" / "patterns", ("*.html", "*.php", "*.json")),
        (REPO / ".claude" / "backups", ("*.json", "*.html", "*.txt")),
    ]
    skip = ("node_modules", ".git")
    for root, pats in roots:
        if not root.exists():
            continue
        for pat in pats:
            for p in root.rglob(pat):
                parts = p.parts
                if any(s in parts for s in skip) or "stackable" in parts or not p.is_file():
                    continue
                kind = "backup" if ("backups" in parts) else "repo"
                yield kind, p


def scan_repo():
    out = {"repo": empty(), "backup": empty()}
    files = {"repo": 0, "backup": 0}
    for kind, p in repo_files():
        try:
            text = p.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if "sgs/" not in text:
            continue
        files[kind] += 1
        merge(out[kind], tally(blocks_in_text(text, as_json=p.suffix == ".json")))
    for k in out:
        out[k]["files"] = files[k]
    return out


def report(results):
    cols = list(results)
    lines = []
    w = max(len(r[2]) for r in RULES) + 2
    lines.append("OLD SHAPES (one column per source)")
    lines.append(" " * w + "".join(f"{c[-17:]:>19}" for c in cols))
    for key, blk, label, _t, sweep, chk in RULES:
        lines.append(f"{label:<{w}}" + "".join(f"{results[c]['rules'][key]:>19}" for c in cols) + f"   [{blk.removeprefix('sgs/')}] {sweep}")
    lines.append("")
    lines.append("INSTANCES PER BLOCK")
    lines.append(" " * 24 + "".join(f"{c[-17:]:>19}" for c in cols))
    for b in BLOCKS:
        n = "sgs/" + b
        if any(results[c]["total"].get(n) for c in cols):
            lines.append(f"{b:<24}" + "".join(f"{results[c]['total'].get(n, 0):>19}" for c in cols))
    lines.append("")
    lines.append("posts / files read: " + ", ".join(f"{c}={results[c].get('posts', results[c].get('files'))}" for c in cols))
    return "\n".join(lines)


def left_over(results):
    return {c: {r[2]: results[c]["rules"][r[0]] for r in RULES if r[5] and results[c]["rules"][r[0]]} for c in results}


def gather(mirrors, with_repo, reuse):
    results = {}
    for m in mirrors:
        results[m] = scan_mirror(m, reuse)
    if with_repo:
        r = scan_repo()
        results["repo"] = r["repo"]
        results["repo-backups"] = r["backup"]
    return results


def self_test():
    fails = []

    def ok(label, cond):
        print(f"  {'PASS' if cond else 'FAIL'}  {label}")
        if not cond:
            fails.append(label)

    old = '<!-- wp:sgs/product-card {"className":"is-style-frame-card extra"} /-->'
    ok("counts a product card holding the frame-card style", tally(iter_blocks_comments(old))["rules"]["frame-card"] == 1)
    ok("a plain product card is clean", tally(iter_blocks_comments('<!-- wp:sgs/product-card {"className":"x"} /-->'))["rules"]["frame-card"] == 0)
    ok("the class on another block is not counted", tally(iter_blocks_comments('<!-- wp:sgs/container {"className":"is-style-frame-card"} /-->'))["rules"]["frame-card"] == 0)
    ok("an unparseable attribute blob does not crash and counts the block", tally(iter_blocks_comments("<!-- wp:sgs/product-card {oops} /-->"))["total"].get("sgs/product-card") == 1)
    tree = {"name": "sgs/container", "innerBlocks": [{"name": "sgs/product-card", "attributes": {"className": "is-style-frame-card"}}]}
    ok("reads the route's JSON tree shape", tally(iter_blocks_tree(tree))["rules"]["frame-card"] == 1)
    ok("a block of another owner is not counted", "sgs/container" not in tally(iter_blocks_tree(tree))["total"])
    clean = {"x": {"rules": {r[0]: 0 for r in RULES}, "total": {}}}
    dirty = {"x": {"rules": {"frame-card": 2}, "total": {}}}
    ok("left_over is empty on a clean source and names a dirty one", not left_over(clean)["x"] and left_over(dirty)["x"] == {"frame-card style": 2})
    print("\n[survey-commerce-saved-content --self-test] " + ("ALL ASSERTIONS PASS." if not fails else f"{len(fails)} FAILURE(S)."))
    return 0 if not fails else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--survey", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--mirrors", default=",".join(MIRRORS))
    ap.add_argument("--no-repo", action="store_true")
    ap.add_argument("--reuse", action="store_true")
    ap.add_argument("--json")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if not (a.survey or a.check):
        ap.print_usage()
        return 2
    mirrors = [m for m in a.mirrors.split(",") if m]
    results = gather(mirrors, not a.no_repo, a.reuse)
    if a.json:
        Path(a.json).write_text(json.dumps(results, indent=1), encoding="utf-8")
    print(report(results))
    if a.check:
        left = left_over({k: v for k, v in results.items() if k != "repo-backups"})
        bad = {k: v for k, v in left.items() if v}
        for k, v in bad.items():
            print(f"FINDING {k}: {v}")
        return 1 if bad else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
