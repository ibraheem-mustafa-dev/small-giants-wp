"""Block source-file resolver shared by the gate scripts.

A block's behaviour is no longer only in `render.php` and `edit.js`: render.php
includes partials with a plain `require __DIR__ . '/x.php';` (they run in
render.php's scope) and edit.js imports components by relative path. This module
returns the full set of files, or their joined text, so a gate that reads
`render.php` or `edit.js` by name sees the code that moved out of it. Plain
require/include targets inside the block folder are followed transitively
(depth cap 5); require_once/include_once load function files and are not
followed. JS imports are followed only when they resolve inside the block folder.
Use `block_php_files` when function files should be read too.

Self-test: python scripts/lib/block_source_files.py --self-test
"""
import os
import re
import sys
import shutil
import tempfile
from pathlib import Path
from typing import List, Optional, Set

MAX_DEPTH = 5

PARTIAL_REQUIRE_RE = re.compile(
    r"(?<![\w$>:])(?:require|include)(?!_once)\s*\(?\s*__DIR__\s*\.\s*['\"]/([\w./-]+\.php)['\"]\s*\)?\s*;"
)

JS_IMPORT_RE = re.compile(
    r"""(?:\bimport\s+(?:[\w$*{}\s,]*?\s+from\s+)?|\bexport\s+(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s+from\s+)['"]([^'"]+)['"]""",
    re.S,
)


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def _inside(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def _partial_target(rel: str, including_file: Path, block_dir: Path) -> Optional[Path]:
    """The partial a require names (relative to the including file's folder), or
    None when it is missing or resolves outside the block folder."""
    if ".." in rel.split("/"):
        return None
    target = Path(os.path.normpath(including_file.parent / rel))
    if target.is_file() and _inside(target, block_dir):
        return target
    return None


def render_files(block_dir: Path) -> List[Path]:
    """render.php first, then each own-folder partial it plain-requires, transitively."""
    block_dir = Path(block_dir)
    render = block_dir / "render.php"
    if not render.is_file():
        return []
    out: List[Path] = [render]
    seen: Set[Path] = {render.resolve()}

    def walk(f: Path, depth: int) -> None:
        if depth > MAX_DEPTH:
            return
        for m in PARTIAL_REQUIRE_RE.finditer(_read(f)):
            t = _partial_target(m.group(1), f, block_dir)
            if t is None or t.resolve() in seen:
                continue
            seen.add(t.resolve())
            out.append(t)
            walk(t, depth + 1)

    walk(render, 1)
    return out


def _inline(src: str, f: Path, block_dir: Path, depth: int) -> str:
    if depth > MAX_DEPTH:
        return src

    def repl(m: "re.Match[str]") -> str:
        t = _partial_target(m.group(1), f, block_dir)
        if t is None:
            return m.group(0)
        body = re.sub(r"\A\s*<\?php", "", _read(t))
        return "\n" + _inline(body, t, block_dir, depth + 1) + "\n?><?php\n"

    return PARTIAL_REQUIRE_RE.sub(repl, src)


def render_source(block_dir: Path) -> str:
    """render.php's text with each own-folder plain require/include replaced by the partial's code."""
    block_dir = Path(block_dir)
    render = block_dir / "render.php"
    if not render.is_file():
        return ""
    return _inline(_read(render), render, block_dir, 1)


def block_php_files(block_dir: Path) -> List[Path]:
    """Every .php file in the block folder, recursively, sorted."""
    return sorted(Path(block_dir).rglob("*.php"))


def _resolve_js(base: Path, spec: str, block_dir: Path) -> Optional[Path]:
    raw = Path(os.path.normpath(base.parent / spec))
    candidates = [raw] if raw.suffix in (".js", ".jsx", ".mjs") else []
    candidates += [Path(str(raw) + ".js"), raw / "index.js"]
    for c in candidates:
        if c.is_file() and _inside(c, block_dir):
            return c
    return None


def _js_entry_files(block_dir: Path, entry_name: str) -> List[Path]:
    block_dir = Path(block_dir)
    edit = block_dir / entry_name
    if not edit.is_file():
        return []
    out: List[Path] = [edit]
    seen: Set[Path] = {edit.resolve()}
    i = 0
    while i < len(out):
        f = out[i]
        i += 1
        for m in JS_IMPORT_RE.finditer(_read(f)):
            spec = m.group(1)
            if not spec.startswith("."):
                continue
            t = _resolve_js(f, spec, block_dir)
            if t is None or t.resolve() in seen:
                continue
            seen.add(t.resolve())
            out.append(t)
    return out


def _join_source(block_dir: Path, files: List[Path]) -> str:
    parts = []
    for f in files:
        rel = f.resolve().relative_to(block_dir.resolve()).as_posix()
        parts.append("/* ==== " + rel + " ==== */\n" + _read(f))
    return "\n".join(parts)


def edit_files(block_dir: Path) -> List[Path]:
    """edit.js first, then every relative import inside the block folder, transitively."""
    return _js_entry_files(block_dir, "edit.js")


def edit_source(block_dir: Path) -> str:
    """edit_files joined, each prefixed with a `/* ==== relative path ==== */` line."""
    return _join_source(Path(block_dir), edit_files(block_dir))


def view_files(block_dir: Path) -> List[Path]:
    """view.js first, then every relative import inside the block folder, transitively."""
    return _js_entry_files(block_dir, "view.js")


def view_source(block_dir: Path) -> str:
    """view_files joined, each prefixed with a `/* ==== relative path ==== */` line."""
    return _join_source(Path(block_dir), view_files(block_dir))


# ---------------------------------------------------------------- self-test

def _build_fixture(root: Path, part_a_code: str = "$a = 1;", view_code: str = "1") -> Path:
    b = root / "demo"
    (b / "nested").mkdir(parents=True)
    (b / "components").mkdir()
    (root / "other").mkdir(exist_ok=True)
    (b / "render.php").write_text(
        "<?php\n$x = 0;\nrequire __DIR__ . '/part-a.php';\n"
        "require_once __DIR__ . '/funcs.php';\n"
        "include __DIR__ . '/part-c.php';\n"
        "require __DIR__ . '/missing.php';\n"
        "require __DIR__ . '/../other/x.php';\n",
        encoding="utf-8")
    (b / "part-a.php").write_text("<?php\n" + part_a_code + "\nrequire __DIR__ . '/nested/part-b.php';\n", encoding="utf-8")
    (b / "nested" / "part-b.php").write_text("<?php\n$b = 2;\n", encoding="utf-8")
    (b / "part-c.php").write_text("<?php\n$c = 3;\n", encoding="utf-8")
    (b / "funcs.php").write_text("<?php\nfunction demo_fn() {}\n", encoding="utf-8")
    (root / "other" / "x.php").write_text("<?php\n$outside = 1;\n", encoding="utf-8")
    (b / "edit.js").write_text(
        "import { PanelBody } from '@wordpress/components';\n"
        "import Panel from './components/Panel';\n"
        "import Shared from '../../../components/Shared';\n"
        "export { X } from './reexp';\n"
        "export default function Edit() {}\n",
        encoding="utf-8")
    (b / "components" / "Panel.js").write_text(
        "import {\n  A,\n  B,\n} from '../constants.js';\nimport '@wordpress/components';\n", encoding="utf-8")
    (b / "constants.js").write_text("export const A = 1; export const B = 2;\n", encoding="utf-8")
    (b / "reexp.js").write_text("export const X = 1;\n", encoding="utf-8")
    (b / "view.js").write_text(
        "import { store } from '@wordpress/interactivity';\n"
        "import { fetchIt } from './view-fetch.js';\n"
        "import Outside from '../../../components/Outside';\n"
        "store(\"demo\", {});\n",
        encoding="utf-8")
    (b / "view-fetch.js").write_text(
        "import { help } from './view-helpers';\nexport const fetchIt = () => help();\n", encoding="utf-8")
    (b / "view-helpers.js").write_text("export const help = () => " + view_code + ";\n", encoding="utf-8")
    return b


def _self_test() -> int:
    fails = 0

    def check(label: str, ok: bool) -> None:
        nonlocal fails
        print(("PASS" if ok else "FAIL") + "  " + label)
        if not ok:
            fails += 1

    tmp = Path(tempfile.mkdtemp(prefix="bsf-py-"))
    try:
        b = _build_fixture(tmp)
        names = [p.relative_to(b).as_posix() for p in render_files(b)]
        check("render_files list", names == ["render.php", "part-a.php", "nested/part-b.php", "part-c.php"])
        src = render_source(b)
        check("render_source has part-a code", "$a = 1;" in src)
        check("render_source has nested part-b code", "$b = 2;" in src)
        check("render_source has part-c code (include)", "$c = 3;" in src)
        check("render_source drops inlined require lines", "part-a.php" not in src and "part-b.php" not in src and "part-c.php" not in src)
        check("render_source keeps require_once verbatim", "require_once __DIR__ . '/funcs.php';" in src)
        check("render_source keeps missing require verbatim", "require __DIR__ . '/missing.php';" in src)
        check("render_source keeps outside require verbatim, no outside code", "../other/x.php" in src and "$outside" not in src)
        check("render_source joiner exact", "\n$a = 1;\nrequire" not in src and "\n?><?php\n" in src)
        check("render_files excludes funcs.php", "funcs.php" not in names)
        check("block_php_files sorted, all php",
              [p.relative_to(b).as_posix() for p in block_php_files(b)] ==
              ["funcs.php", "nested/part-b.php", "part-a.php", "part-c.php", "render.php"])
        en = [p.relative_to(b).as_posix() for p in edit_files(b)]
        check("edit_files list", en == ["edit.js", "components/Panel.js", "reexp.js", "constants.js"])
        es = edit_source(b)
        check("edit_source headers", "/* ==== edit.js ==== */" in es and "/* ==== constants.js ==== */" in es
              and es.startswith("/* ==== edit.js ==== */\n"))
        check("edit_source has no outside/bare code", "Shared" in es and "components/Shared" in es and "export const A" in es)
        check("view_files list", [p.relative_to(b).as_posix() for p in view_files(b)] ==
              ["view.js", "view-fetch.js", "view-helpers.js"])
        vs = view_source(b)
        check("view_source headers and submodule code", vs.startswith("/* ==== view.js ==== */\n")
              and "/* ==== view-helpers.js ==== */" in vs and "export const help = () => 1;" in vs)
        check("view_source has no outside/bare code", "components/Outside" in vs and "export const A" not in vs)
        empty = tmp / "empty"
        empty.mkdir()
        check("missing view.js -> []", view_files(empty) == [] and view_source(empty) == "")
        check("missing render.php -> [] and ''", render_files(empty) == [] and render_source(empty) == "")
        check("missing edit.js -> []", edit_files(empty) == [] and edit_source(empty) == "")
        b2 = _build_fixture(tmp / "v2", "$a = 99;", "77")
        v2 = view_source(b2)
        check("negative control: changed view submodule changes view_source",
              v2 != vs and "=> 77;" in v2 and "=> 1;" not in v2)
        s2 = render_source(b2)
        check("negative control: changed partial changes render_source", s2 != src and "$a = 99;" in s2 and "$a = 1;" not in s2)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print("RESULT: " + ("FAIL (%d)" % fails if fails else "ALL PASS"))
    return 1 if fails else 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if "--self-test" in sys.argv:
        sys.exit(_self_test())
    print(__doc__)
    sys.exit(2)
