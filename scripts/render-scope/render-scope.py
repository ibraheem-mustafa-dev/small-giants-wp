#!/usr/bin/env python3
"""What a plugin or theme change can alter on a visitor's page, read from two built checkouts in seconds.

    python scripts/render-scope/render-scope.py --before <checkout> --after <checkout>
        [--mirrors local-mamas,local-indus,local-eye-care] [--used-by <changed file>=<block>[,<block>]]...
    python scripts/render-scope/render-scope.py --self-test

The render check (scripts/render-check/) proves a change alters nothing by rendering every page of a site twice, which
takes half an hour a site. Most changes cannot reach most pages, and that is decidable from the files: this script
lists every file a visitor's page can load that differs between the two builds, names the blocks they belong to, and
with --mirrors asks each local mirror (read only) which saved posts hold those blocks.

Each changed file is one of:
  editor     a block's editor script or editor stylesheet (build/blocks/<block>/index.*): no visitor's page loads it.
  settings   a block.json whose only changes add settings or change editor metadata: nothing renders differently
             until render.php, a stylesheet or a view script reads them, and those are files of their own.
  block      a block's render.php, front-end stylesheet or view script, or a block.json that changes an existing
             setting's type, default or source: only a page holding that block can change.
  shared     anything else a page can load (plugin includes, assets, shared build chunks, the theme): any page can
             change, unless --used-by names the blocks that are the file's only loaders (say how you know in the commit).

Exit 0: no visitor's page can change (nothing to check). 1: only pages holding the named blocks can change; with
--mirrors, each mirror's line is either "no saved post holds these blocks" or the render-check command for the pages
that do (a block in a template, header, footer or other site-wide post means the whole mirror). 2: any page can change:
run the render check on every mirror. 3: a checkout has no build.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import subprocess
import sys
import tempfile

PLUGIN = pathlib.PurePosixPath("plugins/sgs-blocks")
THEME = pathlib.PurePosixPath("theme/sgs-theme")
# Folders of a checkout whose files a visitor's page can load.
ROOTS = (PLUGIN / "build", PLUGIN / "includes", PLUGIN / "assets", THEME)
SKIP_DIRS = {"node_modules", "tests", ".git"}
# A block's editor-only build files.
EDITOR = {"index.js", "index.asset.php", "index.css", "index-rtl.css"}
# The keys of one setting in block.json that decide what an unset or saved value renders as.
RENDER_KEYS = ("type", "default", "enum", "source", "selector", "attribute", "items")
# The top-level block.json keys that never change a visitor's page on their own.
EDITOR_KEYS = {"attributes", "example", "variations", "styles", "keywords", "description", "title", "icon", "category",
               "editorScript", "editorStyle", "textdomain", "$schema", "version"}
HERE = pathlib.Path(__file__).resolve().parent


def files_of(checkout: pathlib.Path) -> dict:
    """{repo-relative posix path: sha256} for every file a page can load."""
    out = {}
    for root in ROOTS:
        base = checkout / root
        if not base.is_dir():
            continue
        for path in base.rglob("*"):
            if not path.is_file() or SKIP_DIRS & set(path.relative_to(checkout).parts):
                continue
            rel = path.relative_to(checkout).as_posix()
            if rel.endswith("build/.postbuild-done"):
                continue
            out[rel] = hashlib.sha256(path.read_bytes()).hexdigest()
    for path in (checkout / PLUGIN).glob("*.php"):
        out[path.relative_to(checkout).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    return out


def block_json_kind(before: pathlib.Path | None, after: pathlib.Path | None) -> str:
    """'settings' when the two block.json files differ only by added settings and editor metadata, else 'block'."""
    if before is None or after is None or not before.is_file() or not after.is_file():
        return "block"
    try:
        a, b = json.loads(before.read_text(encoding="utf-8")), json.loads(after.read_text(encoding="utf-8"))
    except ValueError:
        return "block"
    for key in set(a) | set(b):
        if key not in EDITOR_KEYS and a.get(key) != b.get(key):
            return "block"
    was, now = a.get("attributes") or {}, b.get("attributes") or {}
    for name, spec in was.items():
        if name not in now:
            return "block"
        for key in RENDER_KEYS:
            if (spec or {}).get(key) != (now[name] or {}).get(key):
                return "block"
    return "settings"


def classify(rel: str, before: pathlib.Path, after: pathlib.Path, used_by: dict) -> tuple:
    """(kind, blocks) for one changed file."""
    parts = pathlib.PurePosixPath(rel).parts
    blocks_at = len(PLUGIN.parts) + 1
    if parts[: blocks_at + 1] == (*PLUGIN.parts, "build", "blocks") and len(parts) > blocks_at + 2:
        block, name = "sgs/" + parts[blocks_at + 1], parts[-1]
        if len(parts) == blocks_at + 3 and name in EDITOR:
            return "editor", [block]
        if len(parts) == blocks_at + 3 and name == "block.json":
            return block_json_kind(before / rel, after / rel), [block]
        return "block", [block]
    if rel in used_by:
        return "block", used_by[rel]
    return "shared", []


def scope(before: pathlib.Path, after: pathlib.Path, used_by: dict | None = None) -> dict:
    a, b = files_of(before), files_of(after)
    rows = []
    for rel in sorted(set(a) | set(b)):
        if a.get(rel) != b.get(rel):
            kind, blocks = classify(rel, before, after, used_by or {})
            rows.append({"file": rel, "kind": kind, "blocks": blocks})
    blocks = sorted({x for r in rows if r["kind"] == "block" for x in r["blocks"]})
    shared = [r["file"] for r in rows if r["kind"] == "shared"]
    return {"rows": rows, "blocks": blocks, "shared": shared, "exit": 2 if shared else 1 if blocks else 0}


def posts_holding(mirror: str, blocks: list, run=subprocess.run) -> list:
    """The mirror's saved posts holding one of the blocks: [{type, name, id, front}] (read only, wp-cli in WSL)."""
    script = "/mnt/" + HERE.as_posix()[0].lower() + HERE.as_posix()[2:] + "/posts-holding.php"
    r = run(["wsl", "-d", "Ubuntu", "-u", "root", "--", "bash", "-c",
             f"cd /var/www/{mirror} && wp --allow-root eval-file {script} {' '.join(blocks)}"],
            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=300)
    if r.returncode != 0:
        raise RuntimeError(f"{mirror}: could not list posts ({(r.stderr or r.stdout).strip()[:200]})")
    return json.loads(r.stdout.strip().splitlines()[-1])


def mirror_line(mirror: str, posts: list, before: str, after: str) -> str:
    if not posts:
        return f"{mirror}: no saved post holds these blocks: nothing to check"
    wide = [p for p in posts if p["type"] != "page"]
    if wide:
        names = ", ".join(sorted({f"{p['type']} {p['name']}" for p in wide})[:6])
        return (f"{mirror}: a site-wide or template post holds them ({names}): run the whole check: "
                f"python scripts/render-check/render-check.py --from {mirror} --before {before} --after {after}")
    states = sorted({"home" if p.get("front") else f"page-{p['name']}" for p in posts})
    return (f"{mirror}: {len(states)} page(s) hold them: python scripts/render-check/render-check.py --from {mirror} "
            f"--before {before} --after {after} --only {','.join(states)}")


def self_test() -> int:
    def make(root: pathlib.Path, files: dict):
        for rel, text in files.items():
            p = root / rel
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(text, encoding="utf-8")

    bj = lambda attrs, extra=None: json.dumps(dict({"name": "sgs/a", "attributes": attrs}, **(extra or {})))
    base = {
        "plugins/sgs-blocks/build/blocks/a/index.js": "1", "plugins/sgs-blocks/build/blocks/a/render.php": "1",
        "plugins/sgs-blocks/build/blocks/a/style-index.css": "1", "plugins/sgs-blocks/build/blocks/a/block.json": bj({"x": {"type": "string", "default": "p"}}),
        "plugins/sgs-blocks/includes/helpers.php": "1", "plugins/sgs-blocks/assets/css/a-extra.css": "1", "theme/sgs-theme/style.css": "1",
        "plugins/sgs-blocks/build/.postbuild-done": "t1",
    }
    cases = [
        ("identical builds: nothing can change", {}, {}, 0, []),
        ("the build stamp alone is no change", {"plugins/sgs-blocks/build/.postbuild-done": "t2"}, {}, 0, []),
        ("an editor script alone: no page loads it", {"plugins/sgs-blocks/build/blocks/a/index.js": "2"}, {}, 0, []),
        ("a new setting and editor metadata in block.json: nothing renders differently",
         {"plugins/sgs-blocks/build/blocks/a/block.json": bj({"x": {"type": "string", "default": "p", "label": "X"}, "y": {"type": "string"}})}, {}, 0, []),
        ("MUST FAIL: a changed default of an existing setting is the block's own change",
         {"plugins/sgs-blocks/build/blocks/a/block.json": bj({"x": {"type": "string", "default": "q"}})}, {}, 1, ["sgs/a"]),
        ("MUST FAIL: a removed setting is the block's own change", {"plugins/sgs-blocks/build/blocks/a/block.json": bj({})}, {}, 1, ["sgs/a"]),
        ("MUST FAIL: a changed supports key is the block's own change",
         {"plugins/sgs-blocks/build/blocks/a/block.json": bj({"x": {"type": "string", "default": "p"}}, {"supports": {"align": True}})}, {}, 1, ["sgs/a"]),
        ("MUST FAIL: render.php is the block's own change", {"plugins/sgs-blocks/build/blocks/a/render.php": "2"}, {}, 1, ["sgs/a"]),
        ("MUST FAIL: a front-end stylesheet is the block's own change", {"plugins/sgs-blocks/build/blocks/a/style-index.css": "2"}, {}, 1, ["sgs/a"]),
        ("MUST FAIL: a plugin include reaches any page", {"plugins/sgs-blocks/includes/helpers.php": "2"}, {}, 2, []),
        ("MUST FAIL: the theme reaches any page", {"theme/sgs-theme/style.css": "2"}, {}, 2, []),
        ("MUST FAIL: an asset reaches any page unless its only loaders are named", {"plugins/sgs-blocks/assets/css/a-extra.css": "2"}, {}, 2, []),
        ("an asset whose only loader is named is that block's change", {"plugins/sgs-blocks/assets/css/a-extra.css": "2"},
         {"plugins/sgs-blocks/assets/css/a-extra.css": ["sgs/a"]}, 1, ["sgs/a"]),
        ("MUST FAIL: a new shared file reaches any page", {"plugins/sgs-blocks/includes/new.php": "1"}, {}, 2, []),
    ]
    bad = 0
    for name, change, used_by, want_exit, want_blocks in cases:
        with tempfile.TemporaryDirectory() as tmp:
            a, b = pathlib.Path(tmp) / "a", pathlib.Path(tmp) / "b"
            make(a, base)
            make(b, dict(base, **change))
            got = scope(a, b, used_by)
            ok = got["exit"] == want_exit and got["blocks"] == want_blocks
            bad += not ok
            print(("ok   " if ok else "FAIL ") + name + ("" if ok else f" (exit {got['exit']}, blocks {got['blocks']})"))
    lines = [
        mirror_line("local-x", [], "B", "A"),
        mirror_line("local-x", [{"type": "page", "name": "faqs", "id": 1, "front": False}, {"type": "page", "name": "start", "id": 2, "front": True}], "B", "A"),
        mirror_line("local-x", [{"type": "page", "name": "faqs", "id": 1, "front": False}, {"type": "wp_template", "name": "single", "id": 3, "front": False}], "B", "A"),
    ]
    checks = ["nothing to check" in lines[0], lines[1].endswith("--only home,page-faqs"), "run the whole check" in lines[2] and "--only" not in lines[2]]
    for label, ok in zip(("a mirror with no post", "pages become --only states, the front page as home", "MUST FAIL: a template post means the whole mirror"), checks):
        bad += not ok
        print(("ok   " if ok else "FAIL ") + label)
    print("self-test " + ("passed" if not bad else f"FAILED ({bad})"))
    return 1 if bad else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--before")
    ap.add_argument("--after")
    ap.add_argument("--mirrors", default="")
    ap.add_argument("--used-by", action="append", default=[], metavar="FILE=BLOCK[,BLOCK]")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if not args.before or not args.after:
        ap.error("--before and --after are required")
    before, after = pathlib.Path(args.before), pathlib.Path(args.after)
    for side in (before, after):
        if not (side / PLUGIN / "build" / "blocks").is_dir():
            print(f"render-scope: {side} has no built plugin ({PLUGIN / 'build'}): build it first", file=sys.stderr)
            return 3
    used_by = {}
    for item in args.used_by:
        rel, _, blocks = item.partition("=")
        used_by[rel.replace("\\", "/")] = [b.strip() for b in blocks.split(",") if b.strip()]
    got = scope(before, after, used_by)
    for kind in ("editor", "settings", "block", "shared"):
        for r in [r for r in got["rows"] if r["kind"] == kind]:
            print(f"{kind:8} {r['file']}" + (f"  ({', '.join(r['blocks'])})" if r["blocks"] else ""))
    if got["exit"] == 0:
        print("render-scope: no file a visitor's page loads differs in a way that renders: nothing to check")
    elif got["exit"] == 2:
        print(f"render-scope: {len(got['shared'])} shared file(s) differ: any page can change, run the render check on every mirror")
    else:
        print("render-scope: only pages holding " + ", ".join(got["blocks"]) + " can change")
        for mirror in [m.strip() for m in args.mirrors.split(",") if m.strip()]:
            print(mirror_line(mirror, posts_holding(mirror, got["blocks"]), args.before, args.after))
    return got["exit"]


if __name__ == "__main__":
    sys.exit(main())
