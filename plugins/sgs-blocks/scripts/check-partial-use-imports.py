#!/usr/bin/env python3
"""
check-partial-use-imports.py: a render partial imports every class it names that its parent imports.

A block's render.php can `require __DIR__ . '/x.php'` a partial that shares its variables,
but a PHP `use` import belongs to one FILE: a partial that calls `Post_Grid_REST::render_card()`
while only render.php says `use SGS\\Blocks\\Post_Grid_REST;` dies with "Class not found" on every
page holding the block (sgs/post-grid on sandybrown, 2026-10-08). The PHPStan undefined-variable
gate inlines partials into render.php, so it sees render.php's imports and cannot catch this.

FAILS when a plain-required partial (scripts/lib/block_source_files.py::render_files) names a
class as `Name::` or `new Name` whose short name a file that requires it imports with `use`,
and the partial neither imports it nor writes it fully qualified.

Usage:
  python scripts/check-partial-use-imports.py --check
  python scripts/check-partial-use-imports.py --self-test
"""

from __future__ import annotations

import argparse
import re
import sys
import tempfile
from pathlib import Path

PLUGIN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PLUGIN / "scripts" / "lib"))
from block_source_files import render_files  # noqa: E402

USE_RE = re.compile(r"^\s*use\s+\\?([\w\\]+)(?:\s+as\s+(\w+))?\s*;", re.M)
REQUIRE_RE = re.compile(r"(?<![\w$>:])(?:require|include)(?!_once)\s*\(?\s*__DIR__\s*\.\s*['\"]/([\w./-]+\.php)['\"]")


def _strip_comments(src: str) -> str:
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    return re.sub(r"(?m)(^|[^:\\\w])//.*$|#.*$", r"\1", src)


def imported_names(src: str) -> set[str]:
    return {alias or path.rsplit("\\", 1)[-1] for path, alias in USE_RE.findall(src)}


def unresolved(parent_src: str, partial_src: str) -> list[str]:
    """Short names the parent imports that the partial uses without importing."""
    code = _strip_comments(partial_src)
    own = imported_names(partial_src)
    out = []
    for name in sorted(imported_names(parent_src) - own):
        if re.search(r"(?<![\w\\$])" + re.escape(name) + r"\s*::", code) or re.search(r"\bnew\s+" + re.escape(name) + r"\b", code):
            out.append(name)
    return out


def findings(blocks: Path) -> list[str]:
    out = []
    for block in sorted(p for p in blocks.iterdir() if p.is_dir()):
        files = render_files(block)
        texts = {f.resolve(): f.read_text(encoding="utf-8", errors="replace") for f in files}
        for f in files:
            src = texts[f.resolve()]
            for m in REQUIRE_RE.finditer(_strip_comments(src)):
                child = (f.parent / m.group(1)).resolve()
                if child not in texts:
                    continue
                for name in unresolved(src, texts[child]):
                    out.append(f"{block.name}/{child.relative_to(block.resolve()).as_posix()}: uses {name} "
                               f"but only {f.name} imports it (add `use ...{name};` to the partial)")
    return out


def self_test() -> int:
    failed = []

    def expect(label, got, want):
        ok = got == want
        print(f"  {'PASS' if ok else 'FAIL'} {label}: got {got}, want {want}")
        if not ok:
            failed.append(label)

    with tempfile.TemporaryDirectory() as tmp:
        b = Path(tmp) / "demo"
        b.mkdir()
        (b / "render.php").write_text(
            "<?php\nuse SGS\\Blocks\\Grid_Rest;\nuse SGS\\Blocks\\Pager as Pg;\n"
            "require __DIR__ . '/missing.php';\nrequire __DIR__ . '/ok.php';\n", encoding="utf-8")
        (b / "missing.php").write_text("<?php\necho Grid_Rest::card(); $p = new Pg();\n", encoding="utf-8")
        (b / "ok.php").write_text(
            "<?php\nuse SGS\\Blocks\\Grid_Rest;\necho Grid_Rest::card();\necho \\SGS\\Blocks\\Pager::x();\n"
            "// Pg:: in a comment\n", encoding="utf-8")
        got = findings(Path(tmp))
        expect("unimported class and aliased new", sorted(g.split(": uses ")[1].split(" ")[0] for g in got), ["Grid_Rest", "Pg"])
        expect("imported, fully qualified and commented uses pass", sum("ok.php" in g for g in got), 0)
    print("self-test:", "FAIL " + str(failed) if failed else "ok (negative and positive controls)")
    return 1 if failed else 0


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    found = findings(PLUGIN / "src" / "blocks")
    for f in found:
        print(f"  {f}")
    print(f"[partial-use-imports] {len(found)} finding(s).")
    return 1 if (args.check and found) else 0


if __name__ == "__main__":
    sys.exit(main())
