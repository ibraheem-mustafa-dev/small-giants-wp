#!/usr/bin/env python3
"""audit-live-script-closure.py - which scripts are TRANSITIVELY reachable from a live root.

WHY THIS EXISTS
---------------
audit-script-reachability.py answers "does ANY file mention this script?". That is one hop
deep, so a dead script that is mentioned only by another dead script reads as wired. This
tool answers the stronger question: starting from the things that genuinely run (npm
scripts, commit gates, Claude hooks, deploy, the DB updater, the computed-route and parity
trees, migrations, skills), which scripts can be reached by following references
transitively, and by what shortest chain? Anything not reached is a CANDIDATE for
review, never a verdict: "unreached" can mean superseded (retire it) or forgotten (revive
it). Only reading the code separates the two.

⚠ BIAS: the tool over-approximates reachability. A false "live" is acceptable (it hides a
candidate until a human looks); a false "unreached" is not (it would send someone to
delete a working tool). Wherever a choice existed, it was made in favour of "live".

LIVE ROOTS
----------
  npm       every script path in plugins/sgs-blocks/package.json "scripts"
  gate      plugins/sgs-blocks/scripts/gates.json (the whole manifest)
  commit    .githooks/*
  hook      .claude/hooks/*
  deploy    plugins/sgs-blocks/scripts/build-deploy.py
  updater   plugins/sgs-blocks/scripts/sgs-update-v2.py
  route     every runnable file under scripts/computed-route/ and scripts/parity/,
            EXCEPT scripts/parity/draft-vs-live/ (judged on reachability, not assumed live)
  migration every runnable file under plugins/sgs-blocks/scripts/migrate-core-blocks/ and
            plugins/sgs-blocks/scripts/migrations/
  skill     ~/.claude/skills/**/SKILL.md (scripts they name are followed) and everything
            under the repo's .claude/skills/
  test      test files (test_*.py, *_test.py, conftest.py, *.test.js/mjs, *.spec.*, anything
            in a tests/ directory) whose directory (or, for tests/, parent directory)
            holds a live non-test file. Test runners find these by naming convention, so
            nothing ever references them; judging them by references would be wrong.
            Resolved to a fixed point because a test can make nothing else live but its
            directory can become live through another root.
  --root-extra PATH  (repeatable) adds a file or directory as a root; used for negative controls.

EDGE TYPES FOLLOWED (from any live file, transitively)
------------------------------------------------------
  1. Path-like tokens ending .py .mjs .cjs .js .sh .php .json inside any string or command,
     covering subprocess/run/Popen/spawn/execFile calls, shell scripts, npm commands and
     manifests that list script paths (gates.json, inspector-scan/rules.json).
     Resolution: exact relative to the referencing file (for ./ and ../ forms), then repo
     root, plugin root and the plugin scripts dir, then a path-suffix match anywhere in
     the inventory. A bare filename matches the same directory, then ancestor directories,
     then every file of that name (except index.* and __init__.py).
  2. Python import / from-import, relative imports, dotted modules (matched by path suffix),
     `from pkg import submodule`, and single-name imports looked up in the file's
     directory, its ancestors and any directory named in a sys.path line or quoted string.
  3. Quoted bare stems (importlib / _load_sibling("x") / JSON manifests listing module
     names). Matched against files in the same directory (recursively for JSON). Safe to
     over-match because results are intersected with the real inventory.
  4. JS/MJS/CJS import, export-from, require and dynamic import() with relative specifiers
     (extension and index.* resolution).

KNOWN LIMITS (reported, not hidden)
-----------------------------------
  * Comments: only whole-line comments (# // * /*) are skipped. A filename in a trailing
    comment or a docstring still counts as a reference (over-approximation, false "live").
  * Paths assembled at run time from variables or globbed (`glob("check-*.py")`, a
    directory walked and every file executed) cannot be resolved. A directory runner
    that executes whatever it finds will show its targets as UNREACHED.
  * Entry points outside the listed roots (cron, CI, a human typing a path from a doc)
    are invisible by design: that is exactly what an unreached candidate is.
  * Files outside the repo and ~/.claude/skills (CI config, server-side crons) are not read.

Usage:
    python plugins/sgs-blocks/scripts/audit-live-script-closure.py
    python plugins/sgs-blocks/scripts/audit-live-script-closure.py --json
    python plugins/sgs-blocks/scripts/audit-live-script-closure.py --no-live
    python plugins/sgs-blocks/scripts/audit-live-script-closure.py --root-extra PATH

Read-only. Always exits 0. Output order is deterministic.
UK English throughout.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import deque
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

HERE = Path(__file__).resolve().parent
PLUGIN = HERE.parent
REPO = PLUGIN.parent.parent
SKILLS_HOME = Path.home() / ".claude" / "skills"

CANDIDATE_DIRS = [PLUGIN / "scripts", REPO / "scripts", REPO / "tools"]
RUNNABLE = {".py", ".mjs", ".cjs", ".js", ".sh", ".php"}
NODE_SUFFIXES = RUNNABLE | {".json"}
SKIP_PARTS = {"node_modules", "build", "__pycache__", "runs", ".git", ".pytest_cache"}
MAX_BYTES = 3_000_000
GENERIC_BASENAMES = {"__init__.py", "index.js", "index.mjs", "index.cjs", "index.php"}

PATH_TOKEN = re.compile(r"[\w@$~{}.\\/-]+[.](?:py|mjs|cjs|js|sh|php|json)(?![\w])")
PY_IMPORT = re.compile(r"^\s*import\s+([\w.]+(?:\s*,\s*[\w.]+)*)", re.M)
PY_FROM = re.compile(r"^\s*from\s+(\.*)([\w.]*)\s+import\s+(\(?[^\n#]*)", re.M)
JS_SPEC = [
    re.compile(r"""\bfrom\s*["'](\.{1,2}/[^"']*|\.{1,2})["']"""),
    re.compile(r"""\bimport\s*["'](\.{1,2}/[^"']*)["']"""),
    re.compile(r"""\bimport\s*\(\s*["'](\.{1,2}/[^"']*)["']"""),
    re.compile(r"""\brequire\s*\(\s*["'](\.{1,2}/[^"']*|\.{1,2})["']"""),
]
QUOTED = re.compile(r"""["']([\w][\w-]{2,})["']""")
QUOTED_ANY = re.compile(r"""["']([^"'\n]{1,80})["']""")
COMMENT_LINE = re.compile(r"^\s*(#|//|\*|/\*)")


def rel(p: Path) -> str:
    for base in (REPO, SKILLS_HOME.parent):
        try:
            r = p.resolve().relative_to(base)
            return ("~/.claude/" if base == SKILLS_HOME.parent else "") + r.as_posix()
        except ValueError:
            continue
    return p.as_posix()


def skipped(p: Path) -> bool:
    return bool(SKIP_PARTS & set(p.parts))


def walk(root: Path, suffixes: set[str]) -> list[Path]:
    if not root.exists():
        return []
    if root.is_file():
        return [root]
    return sorted(p for p in root.rglob("*")
                  if p.is_file() and p.suffix in suffixes and not skipped(p.relative_to(root)))


def is_test(p: Path) -> bool:
    n = p.name
    return (n.startswith("test_") or n.endswith("_test.py") or n == "conftest.py"
            or ".test." in n or ".spec." in n or "tests" in p.parts or "__tests__" in p.parts)


class Graph:
    def __init__(self) -> None:
        self.nodes: set[Path] = set()
        self.by_name: dict[str, list[Path]] = {}
        self.text: dict[Path, str] = {}
        self.virtual: dict[str, str] = {}      # label -> text (package.json scripts)
        self.edges: dict[object, list[object]] = {}

    def add(self, p: Path) -> None:
        p = p.resolve()
        if p in self.nodes or p.suffix not in NODE_SUFFIXES:
            return
        try:
            if p.stat().st_size > MAX_BYTES:
                return
        except OSError:
            return
        self.nodes.add(p)
        self.by_name.setdefault(p.name, []).append(p)

    def dirs_named(self) -> dict[str, set[Path]]:
        if not hasattr(self, "_dirs"):
            self._dirs: dict[str, set[Path]] = {}
            for p in self.nodes:
                par = p.parent
                self._dirs.setdefault(par.name, set()).add(par)
        return self._dirs

    def lookup(self, candidate: Path) -> Path | None:
        """Normalise without touching the disk (Path.resolve is slow on Windows)."""
        if not hasattr(self, "_norm"):
            self._norm = {os.path.normcase(str(n)): n for n in self.nodes}
        return self._norm.get(os.path.normcase(os.path.normpath(str(candidate))))

    def by_stem(self) -> dict[str, list[Path]]:
        if not hasattr(self, "_stems"):
            self._stems: dict[str, list[Path]] = {}
            for p in sorted(self.nodes):
                self._stems.setdefault(p.stem, []).append(p)
        return self._stems

    def read(self, p: Path) -> str:
        if p not in self.text:
            try:
                raw = p.read_text(encoding="utf-8", errors="replace")
            except OSError:
                raw = ""
            if p.suffix != ".json":
                raw = "\n".join(l for l in raw.splitlines() if not COMMENT_LINE.match(l))
            self.text[p] = raw
        return self.text[p]


def norm_token(tok: str) -> str:
    t = tok.replace("\\", "/")
    t = re.sub(r"^\$\{?[A-Za-z_]+\}?/", "", t)
    t = re.sub(r"^~/", "", t)
    t = t.replace("}", "")
    while t.startswith("./") or t.startswith("../"):
        t = t.split("/", 1)[1]
    return t.lstrip("/")


def resolve_path_token(g: Graph, src_dir: Path, tok: str) -> list[Path]:
    t = tok.replace("\\", "/")
    out: list[Path] = []
    if t.startswith("./") or t.startswith("../"):
        c = g.lookup(src_dir / t)
        if c:
            return [c]
    rel_t = norm_token(tok)
    if not rel_t:
        return []
    if "/" in rel_t:
        for base in (src_dir, REPO, PLUGIN, PLUGIN / "scripts", REPO / "scripts"):
            c = g.lookup(base / rel_t)
            if c:
                out.append(c)
        if out:
            return out
        for c in g.by_name.get(rel_t.rsplit("/", 1)[1], []):
            if c.as_posix().endswith("/" + rel_t):
                out.append(c)
        return out
    cands = g.by_name.get(rel_t, [])
    if not cands:
        return []
    pmap: dict[Path, list[Path]] = {}
    for c in cands:
        pmap.setdefault(c.parent, []).append(c)
    d = src_dir
    while True:
        up = pmap.get(d)
        if up:
            return up
        if d == d.parent or d == REPO:
            break
        d = d.parent
    return [] if rel_t in GENERIC_BASENAMES else list(cands)


def find_module(g: Graph, dotted: str, src_dir: Path, extra_dirs: list[Path],
                relative_level: int = 0) -> list[Path]:
    parts = dotted.split(".") if dotted else []
    out: list[Path] = []
    if relative_level:
        base = src_dir
        for _ in range(relative_level - 1):
            base = base.parent
        sub = "/".join(parts)
        if not sub:
            c = g.lookup(base / "__init__.py")
            return [c] if c else []
        for cand in (Path(str(base / sub) + ".py"), base / sub / "__init__.py"):
            c = g.lookup(cand)
            if c:
                out.append(c)
        return out
    if not parts:
        return out
    rel_py = "/".join(parts)
    last = parts[-1]
    if len(parts) > 1:
        for c in g.by_name.get(last + ".py", []):
            if c.as_posix().endswith("/" + rel_py + ".py"):
                out.append(c)
        for c in g.by_name.get("__init__.py", []):
            if c.as_posix().endswith("/" + rel_py + "/__init__.py"):
                out.append(c)
        return out
    dirs = [src_dir]
    d = src_dir
    while d != d.parent and d != REPO.parent:
        d = d.parent
        dirs.append(d)
    dirs.extend(extra_dirs)
    for base in dirs:
        for cand in (base / (last + ".py"), base / last / "__init__.py"):
            c = g.lookup(cand)
            if c:
                out.append(c)
    return out


def js_resolve(g: Graph, src_dir: Path, spec: str) -> list[Path]:
    base = src_dir / spec
    tries = [base] + [Path(str(base) + s) for s in (".js", ".mjs", ".cjs", ".json", ".php")]
    tries += [base / ("index" + s) for s in (".js", ".mjs", ".cjs")]
    found = [g.lookup(t) for t in tries]
    return [f for f in found if f]


def sys_path_dirs(g: Graph, text: str) -> list[Path]:
    words: set[str] = set()
    for line in text.splitlines():
        if "sys.path" in line or "path.insert" in line or "path.append" in line:
            words.update(re.findall(r"[\w-]{3,}", line))
    words.update(m for m in QUOTED_ANY.findall(text) if re.fullmatch(r"[\w-]{3,}", m))
    dirs: set[Path] = set()
    for w in words:
        dirs.update(g.dirs_named().get(w, ()))
    return sorted(dirs)


def edges_from_text(g: Graph, src_dir: Path, suffix: str, text: str) -> set[Path]:
    found: set[Path] = set()
    for m in PATH_TOKEN.finditer(text):
        found.update(resolve_path_token(g, src_dir, m.group(0)))
    if suffix == ".py":
        extra = sys_path_dirs(g, text)
        for m in PY_IMPORT.finditer(text):
            for mod in re.split(r"\s*,\s*", m.group(1)):
                found.update(find_module(g, mod.strip(), src_dir, extra))
        for m in PY_FROM.finditer(text):
            level, mod, names = len(m.group(1)), m.group(2), m.group(3)
            found.update(find_module(g, mod, src_dir, extra, level))
            for n in re.findall(r"\w+", names):
                if n in ("as",):
                    continue
                sub = (mod + "." + n) if mod else n
                found.update(find_module(g, sub, src_dir, extra, level))
    if suffix in {".js", ".mjs", ".cjs", ".php", ".sh", ".json"} or suffix == ".py":
        for rx in JS_SPEC:
            for m in rx.finditer(text):
                found.update(js_resolve(g, src_dir, m.group(1)))
    # Quoted bare stems: importlib / _load_sibling("x") / manifest module names.
    stems = set(QUOTED.findall(text))
    if stems:
        recursive = suffix == ".json"
        for stem in stems:
            for p in g.by_stem().get(stem, []):
                if p.suffix in RUNNABLE and (
                        p.parent == src_dir or (recursive and src_dir in p.parents)):
                    found.add(p)
    return found


def build_edges(g: Graph, node: object) -> list[object]:
    if node in g.edges:
        return g.edges[node]
    if isinstance(node, str):
        res = edges_from_text(g, PLUGIN, ".json", g.virtual[node])
    else:
        assert isinstance(node, Path)
        res = edges_from_text(g, node.parent, node.suffix, g.read(node))
        res.discard(node)
    g.edges[node] = sorted(res, key=lambda x: str(x))
    return g.edges[node]


def package_scripts_text() -> str:
    try:
        data = json.loads((PLUGIN / "package.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return ""
    return "\n".join(str(v) for _, v in sorted(data.get("scripts", {}).items()))


def collect_roots(g: Graph, extra: list[str]) -> dict[object, str]:
    roots: dict[object, str] = {}

    def add(p: Path, why: str) -> None:
        p = p.resolve()
        g.add(p)
        if p in g.nodes:
            roots.setdefault(p, why)

    g.virtual["plugins/sgs-blocks/package.json#scripts"] = package_scripts_text()
    roots["plugins/sgs-blocks/package.json#scripts"] = "npm"
    add(PLUGIN / "scripts" / "gates.json", "gate")
    for p in sorted((REPO / ".githooks").glob("*")):
        if p.is_file():
            roots.setdefault(_register_plain(g, p), "commit-hook")
    for p in walk(REPO / ".claude" / "hooks", NODE_SUFFIXES):
        add(p, "claude-hook")
    add(PLUGIN / "scripts" / "build-deploy.py", "deploy")
    add(PLUGIN / "scripts" / "sgs-update-v2.py", "updater")
    for p in walk(REPO / "scripts" / "computed-route", RUNNABLE):
        add(p, "computed-route")
    excluded = REPO / "scripts" / "parity" / "draft-vs-live"
    for p in walk(REPO / "scripts" / "parity", RUNNABLE):
        if excluded not in p.parents:
            add(p, "parity")
    for d in ("migrate-core-blocks", "migrations"):
        for p in walk(PLUGIN / "scripts" / d, RUNNABLE):
            add(p, "migration")
    for p in walk(REPO / ".claude" / "skills", NODE_SUFFIXES | {".md"}):
        add(p, "repo-skill")
    for p in sorted(SKILLS_HOME.glob("*/SKILL.md")) if SKILLS_HOME.exists() else []:
        roots[_register_plain(g, p)] = "skill"
    for e in extra:
        ep = Path(e)
        ep = ep if ep.is_absolute() else (REPO / ep)
        for p in walk(ep, NODE_SUFFIXES):
            add(p, "extra")
    return roots


def _register_plain(g: Graph, p: Path) -> Path:
    """Register a node that has no script suffix (a hook without extension, SKILL.md)."""
    p = p.resolve()
    g.nodes.add(p)
    return p


def bfs(g: Graph, roots: dict[object, str]) -> dict[object, object | None]:
    parent: dict[object, object | None] = {}
    q: deque[object] = deque()
    for r in sorted(roots, key=str):
        parent[r] = None
        q.append(r)
    while q:
        cur = q.popleft()
        for nxt in build_edges(g, cur):
            if nxt not in parent:
                parent[nxt] = cur
                q.append(nxt)
    return parent


def label(n: object) -> str:
    return n if isinstance(n, str) else rel(n)


def chain(parent: dict[object, object | None], n: object) -> str:
    out: list[str] = []
    cur: object | None = n
    while cur is not None:
        out.append(label(cur))
        cur = parent[cur]
    return " -> ".join(reversed(out))


def add_test_roots(g: Graph, roots: dict[object, str], parent: dict[object, object | None],
                   tests: list[Path]) -> bool:
    changed = False
    live_dirs = {n.parent for n in parent if isinstance(n, Path) and not is_test(n)}
    for t in tests:
        if t in roots:
            continue
        d = t.parent
        owner = d.parent if d.name in {"tests", "__tests__"} else d
        if d in live_dirs or owner in live_dirs:
            roots[t] = "test-by-convention"
            changed = True
    return changed


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    ap.add_argument("--no-live", action="store_true", help="hide the LIVE list")
    ap.add_argument("--root-extra", action="append", default=[], metavar="PATH",
                    help="extra live root file or directory (repeatable)")
    args = ap.parse_args()

    g = Graph()
    candidates: list[Path] = []
    for d in CANDIDATE_DIRS:
        for p in walk(d, NODE_SUFFIXES):
            g.add(p)
            if p.suffix in RUNNABLE:
                candidates.append(p.resolve())
    candidates = sorted(set(candidates))
    for sub in (REPO / ".githooks", REPO / ".claude" / "hooks", REPO / ".claude" / "skills"):
        for p in walk(sub, NODE_SUFFIXES):
            g.add(p)
    if SKILLS_HOME.exists():
        for p in walk(SKILLS_HOME, RUNNABLE):
            g.add(p)

    roots = collect_roots(g, args.root_extra)
    tests = [c for c in candidates if is_test(c)]
    parent = bfs(g, roots)
    while add_test_roots(g, roots, parent, tests):
        parent = bfs(g, roots)

    live = [c for c in candidates if c in parent]
    dead = [c for c in candidates if c not in parent]

    if args.json:
        payload = {
            "live_count": len(live), "unreached_count": len(dead),
            "roots": {label(k): v for k, v in sorted(roots.items(), key=lambda kv: label(kv[0]))},
            "unreached": [rel(p) for p in dead],
            "live": {rel(p): chain(parent, p) for p in live},
        }
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return 0

    print(f"live {len(live)}, unreached {len(dead)} (candidates {len(candidates)}, roots {len(roots)})")
    print("\nUNREACHED")
    by_dir: dict[str, list[str]] = {}
    for p in dead:
        by_dir.setdefault(rel(p.parent), []).append(p.name)
    for d in sorted(by_dir):
        print(f"  {d}/  ({len(by_dir[d])})")
        for n in sorted(by_dir[d]):
            print(f"    {n}")
    if not args.no_live:
        print("\nLIVE")
        for p in live:
            print(f"  {rel(p)} :: {chain(parent, p)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
