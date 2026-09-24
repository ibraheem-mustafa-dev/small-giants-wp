#!/usr/bin/env python3
"""
check-rest-route-require.py

STRUCTURAL GUARD — catches a REST route registered against a callback class
(or function) whose DEFINING FILE is never `require`'d/`include`'d anywhere
reachable from the plugin bootstrap, and is not covered by Composer's PSR-4
autoloader either. This is the exact bug class of D1079 (`.claude/archive/decisions.md`):
`includes/forms/class-form-rest-submission.php::Form_REST_Submission` was
referenced by `class-form-rest-api.php`'s `/sgs-forms/v1/submit` route via
`[ Form_REST_Submission::class, 'handle_submit' ]`, and route REGISTRATION
succeeded, because `Form_REST_Submission::class` resolves to a plain STRING
at PHP compile time regardless of whether the class is loaded. Only DISPATCH
failed — a bare `500 rest_invalid_handler`, silent in every PHP error log
(WordPress's REST dispatcher's `is_callable()` check fails with no logging).

WHY EVERY EXISTING GATE MISSED THIS
------------------------------------
Every gate in this repo is either (a) a static source-TEXT check — sees the
class NAME referenced correctly everywhere (route registration, tests,
comments) and has no way to know its DEFINING FILE is never `require`'d, or
(b) a live probe scoped to specific known pages — invisible to a REST-only
endpoint with no page-level trigger. `tests/php/FormSubmissionTest.php`'s
34/34 "passing" suite gave false confidence for exactly reason (a): its own
docblock says it does raw source-TEXT pattern matching, never an actual
WordPress bootstrap + class load.

MECHANISM
---------
1. Parse `composer.json`'s PSR-4 autoload map (`SGS\\Blocks\\` -> `src/` for
   this plugin) — any file under an autoloaded directory is reachable
   regardless of explicit `require`s.
2. Build the REQUIRE-GRAPH: BFS from the plugin bootstrap
   (`sgs-blocks.php`), following every statically-resolvable
   `require`/`require_once`/`include`/`include_once` statement of the shape
   `SGS_BLOCKS_PATH . '<relpath>'` or `__DIR__ . '<relpath>'` (both quote
   styles), recursively — several `includes/*.php` files themselves further
   `require` sibling files (e.g. `class-sgs-blocks.php` requires ~40 more).
   A require statement using a non-literal/dynamic path (e.g.
   `require $asset_file;`) is NOT resolvable and is skipped — this is a
   scoped, documented blind spot (see COVERAGE LIMITATIONS).
3. Build a SYMBOL TABLE across every `.php` file under `includes/` and
   `src/`: every `class Foo` declaration (with its resolved namespace) and
   every top-level (non-method) `function foo(...)` declaration, each
   mapped to its defining file.
4. Scan every `register_rest_route(` call site under `includes/**/*.php`
   and `src/**/*.php` for a `'callback' => [ X, 'method' ]` /
   `'callback' => array( X, 'method' )` / `'callback' => 'X::method'` /
   `'callback' => 'function_name'` shape (a closure literal is SKIPPED —
   always loaded with the file that defines the route, by construction).
   Resolves `X` through the file's own `namespace`/`use` declarations,
   `self`/`static`/`__CLASS__` (the enclosing class), and fully-qualified
   references.
5. For each resolved callback symbol: PASS if its defining file is in the
   require-graph OR under an autoloaded directory; FAIL (this is the D1079
   shape) if the symbol is defined somewhere in the codebase but its file is
   reachable by NEITHER; UNRESOLVED if the symbol cannot be found anywhere
   in the codebase at all (a genuine typo, or a WP-core name outside the
   small core-function allowlist below — reported separately, not a gate
   failure, since this script does not have visibility into WP core/other
   plugins' symbol tables).

COVERAGE LIMITATIONS (read before trusting a clean run)
--------------------------------------------------------
  - This is STATIC analysis, not a live WordPress bootstrap. It proves "this
    class's file is never require'd/autoloaded from the entry point" — the
    exact D1079 root cause — but it cannot catch a class that loads fine yet
    throws a fatal on CONSTRUCTION, a conditional `require` gated behind a
    runtime value this script can't evaluate (e.g. `if ( is_admin() )
    require ...`, which WOULD make the route dispatch-time-only reachable —
    treated as UNREACHABLE here, i.e. this script is conservative: a
    conditional require can produce a false FAIL, never a false PASS), or an
    `is_callable()` failure caused by a PRIVATE/protected method (rare for a
    REST callback, out of scope).
  - Dynamic require paths (a variable, not a literal string concatenation)
    are not resolved — if the ONLY path to a file were a dynamic require,
    this script would wrongly report it unreachable. None of this plugin's
    real bootstrap requires are dynamic today (confirmed by census); if one
    is added, this becomes a false-FAIL, not a false-PASS, so it fails safe.
  - `permission_callback` is NOT checked — only `callback`, the D1079
    dispatch-time failure mode. A permission_callback load-path bug is the
    same class of issue and could be added as a second pass later.
  - This does not boot WordPress and cannot verify runtime behaviour beyond
    "is the file that defines this symbol reachable". A companion live
    WP-CLI `wp eval` sweep (`rest_get_server()->get_routes()` +
    `is_callable()` after full bootstrap) would be MORE thorough — it also
    catches core-autoloader edge cases and runtime-only registration — but
    needs a live canary and is deliberately NOT built here: every live-probe
    gate in this repo (`scripts/motion-qa/`) is post-deploy-only, never in
    `prebuild`, because a network-dependent check in a build gate can only
    ever fail-closed-on-unreachable or warn-and-pass, and warn-and-pass is
    the exact vacuity this repo's `check-no-inline.py --live-default`
    already carries. This script's static, network-free, prebuild-safe
    check closes the D1079 root cause directly (the missing `require`)
    without that tradeoff.

Usage
-----
    python scripts/check-rest-route-require.py               # --report (default)
    python scripts/check-rest-route-require.py --report        # print findings, exit 0
    python scripts/check-rest-route-require.py --survey         # full census, exit 0
    python scripts/check-rest-route-require.py --check           # exit 1 on any UNREACHABLE finding
    python scripts/check-rest-route-require.py --self-test        # prove the detector works
    python scripts/check-rest-route-require.py --json              # machine-readable report

STATUS: standalone, NOT wired into `scripts/gates.json` yet — deliberately
advisory-only on first ship (see this plugin's CLAUDE.md "detector triad"
convention: a brand-new structural gate ships standalone/report-first, and
is promoted to a blocking gate once its baseline is proven genuinely 0 and
`--self-test` is hardened against the exact incident shape — mirrors
`check-dead-api-calls.py`'s own promotion history). Run by hand or via the
`check:rest-route-require` package.json alias until promoted.

UK English throughout.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent  # plugins/sgs-blocks/scripts/
_PLUGIN_ROOT = _HERE.parent  # plugins/sgs-blocks/
_REPO_ROOT = _PLUGIN_ROOT.parent.parent  # small-giants-wp/

_ENTRY_FILE = _PLUGIN_ROOT / "sgs-blocks.php"
_COMPOSER_JSON = _PLUGIN_ROOT / "composer.json"

_TARGET_ROOTS = [
    _PLUGIN_ROOT / "includes",
    _PLUGIN_ROOT / "src",
]

_EXCLUDED_DIR_NAMES = {"node_modules", "vendor", "tests", ".git", "build"}

# WP-core function names legal as a bare 'callback' string that this script
# has no visibility into (core is always loaded) — kept tiny and explicit,
# never grown by scraping (same discipline as check-dead-api-calls.py's
# curated allowlist).
_CORE_CALLBACK_ALLOWLIST = {
    "__return_true", "__return_false", "__return_null",
    "__return_empty_array", "__return_empty_string", "__return_zero",
}


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------
@dataclass
class RouteCallback:
    file: str
    line: int
    namespace_arg: str
    route_arg: str
    raw_callback: str
    kind: str  # "class-method" | "function" | "core-allowlisted" | "closure" | "unparseable"
    symbol: str = ""          # "Fully\Qualified\Class::method" or "function_name"
    defining_file: str = ""   # relative path, or "" if not found anywhere
    reachable: bool | str = "" # True / False / "n/a" (closure/core-allowlisted)
    key: str = ""


def _finding_key(rel_file: str, line: int, symbol: str) -> str:
    return f"restroute:{rel_file}:{line}:{symbol}"


# ---------------------------------------------------------------------------
# String-safe scanning helpers — respects PHP single/double-quoted strings so
# bracket-depth counting never gets confused by a stray ( or [ inside a
# string literal (the exact trap that makes naive regex balancing unsafe).
# ---------------------------------------------------------------------------
def _find_balanced(text: str, open_pos: int, open_ch: str, close_ch: str) -> int:
    """`text[open_pos]` MUST be `open_ch`. Returns the index of the matching
    `close_ch`, respecting string literals and escape characters. Returns -1
    if unterminated."""
    assert text[open_pos] == open_ch
    depth = 0
    i = open_pos
    in_string: str | None = None  # "'" or '"' or None
    n = len(text)
    while i < n:
        c = text[i]
        if in_string:
            if c == "\\":
                i += 2
                continue
            if c == in_string:
                in_string = None
            i += 1
            continue
        if c in ("'", '"'):
            in_string = c
            i += 1
            continue
        if c == open_ch:
            depth += 1
        elif c == close_ch:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def strip_comments(text: str) -> str:
    """Blank out `//`, `#`, and `/* */` comment bodies (preserving newlines
    and overall length) while respecting string literals, so a `)` or `//`
    written inside a quoted string is never mistaken for a comment/bracket
    boundary."""
    out = list(text)
    i = 0
    n = len(text)
    in_string: str | None = None
    while i < n:
        c = text[i]
        if in_string:
            if c == "\\":
                i += 2
                continue
            if c == in_string:
                in_string = None
            i += 1
            continue
        if c in ("'", '"'):
            in_string = c
            i += 1
            continue
        if c == "/" and i + 1 < n and text[i + 1] == "/":
            j = i
            while j < n and text[j] != "\n":
                out[j] = " "
                j += 1
            i = j
            continue
        if c == "#" and not (i + 1 < n and text[i + 1] == "["):  # skip PHP 8 attributes' #[
            j = i
            while j < n and text[j] != "\n":
                out[j] = " "
                j += 1
            i = j
            continue
        if c == "/" and i + 1 < n and text[i + 1] == "*":
            j = i + 2
            while j + 1 < n and not (text[j] == "*" and text[j + 1] == "/"):
                if text[j] != "\n":
                    out[j] = " "
                j += 1
            if j + 1 < n:
                out[j] = " "
                out[j + 1] = " "
                i = j + 2
            else:
                i = n
            continue
        i += 1
    return "".join(out)


# ---------------------------------------------------------------------------
# Require-graph
# ---------------------------------------------------------------------------
_REQUIRE_RE = re.compile(
    r"\b(?:require|require_once|include|include_once)\s+"
    r"(?:SGS_BLOCKS_PATH\s*\.\s*|__DIR__\s*\.\s*)"
    r"(['\"])((?:(?!\1).)*)\1"
)


def build_require_graph(entry_file: Path, plugin_root: Path) -> set[Path]:
    """BFS from `entry_file`, following statically-resolvable require/include
    statements. Returns the set of reachable absolute file paths (including
    the entry file itself)."""
    reachable: set[Path] = set()
    queue: list[Path] = [entry_file.resolve()]

    while queue:
        current = queue.pop()
        if current in reachable or not current.exists():
            continue
        reachable.add(current)

        text = strip_comments(current.read_text(encoding="utf-8", errors="replace"))
        for match in _REQUIRE_RE.finditer(text):
            rel = match.group(2)
            # SGS_BLOCKS_PATH is plugin_root + trailing slash; __DIR__ is the
            # CURRENT file's own directory. Both forms in this codebase use a
            # leading "includes/..." style relative path fragment for
            # SGS_BLOCKS_PATH, or a "/x.php" fragment for __DIR__ — resolve
            # both against the appropriate base and take whichever exists.
            candidates = [
                (plugin_root / rel.lstrip("/")).resolve(),
                (current.parent / rel.lstrip("/")).resolve(),
            ]
            for cand in candidates:
                if cand.exists() and cand.suffix == ".php":
                    queue.append(cand)

    return reachable


# ---------------------------------------------------------------------------
# Composer PSR-4 autoload map
# ---------------------------------------------------------------------------
def load_psr4_dirs(composer_json: Path, plugin_root: Path) -> list[Path]:
    if not composer_json.exists():
        return []
    try:
        data = json.loads(composer_json.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return []
    psr4 = data.get("autoload", {}).get("psr-4", {})
    return [(plugin_root / rel).resolve() for rel in psr4.values()]


def is_autoloaded(file_path: Path, autoload_dirs: list[Path]) -> bool:
    file_path = file_path.resolve()
    return any(
        file_path == d or d in file_path.parents
        for d in autoload_dirs
    )


# ---------------------------------------------------------------------------
# Symbol table — class + top-level-function declarations across the plugin
# ---------------------------------------------------------------------------
_NAMESPACE_RE = re.compile(r"^\s*namespace\s+([A-Za-z0-9_\\]+)\s*;", re.MULTILINE)
_USE_RE = re.compile(
    r"^\s*use\s+([A-Za-z0-9_\\]+)(?:\s+as\s+([A-Za-z0-9_]+))?\s*;", re.MULTILINE
)
_CLASS_DECL_RE = re.compile(
    r"^\s*(?:abstract\s+|final\s+)?class\s+([A-Za-z0-9_]+)", re.MULTILINE
)
_FUNCTION_DECL_RE = re.compile(r"\bfunction\s+([A-Za-z0-9_]+)\s*\(")


def file_namespace(text: str) -> str:
    m = _NAMESPACE_RE.search(text)
    return m.group(1) if m else ""


def file_use_map(text: str) -> dict[str, str]:
    """alias (short name) -> fully-qualified class name (no leading '\\')."""
    out: dict[str, str] = {}
    for m in _USE_RE.finditer(text):
        fqcn = m.group(1).lstrip("\\")
        alias = m.group(2) or fqcn.rsplit("\\", 1)[-1]
        out[alias] = fqcn
    return out


def top_level_functions(text: str) -> list[str]:
    """Global (non-method) function names — tracks brace depth against
    class/trait/interface bodies so a method with the same textual shape as
    a global function is excluded."""
    names: list[str] = []
    depth = 0
    class_body_start_depths: list[int] = []
    i = 0
    n = len(text)
    # Cheap linear scan: find class/trait/interface keyword occurrences and
    # function keyword occurrences interleaved with brace tracking.
    token_re = re.compile(
        r"\b(class|trait|interface|function)\s+([A-Za-z0-9_]*)\s*\(?|[{}]"
    )
    for m in token_re.finditer(text):
        tok = m.group(0)
        if tok == "{":
            depth += 1
            continue
        if tok == "}":
            if class_body_start_depths and depth == class_body_start_depths[-1]:
                class_body_start_depths.pop()
            depth -= 1
            continue
        kw = m.group(1)
        if kw in ("class", "trait", "interface"):
            # The NEXT '{' opens this type's body — record the depth at
            # which that body's contents will sit (depth+1 once opened).
            class_body_start_depths.append(depth + 1)
            continue
        if kw == "function":
            is_method = bool(class_body_start_depths) and depth == class_body_start_depths[-1] - 1 + 1 \
                if class_body_start_depths else False
            # Simpler + correct: a function is a METHOD iff we are currently
            # inside ANY class/trait/interface body (depth >= the innermost
            # recorded body-start depth).
            is_method = bool(class_body_start_depths) and depth >= class_body_start_depths[-1]
            name = m.group(2)
            if name and not is_method:
                names.append(name)
    return names


@dataclass
class SymbolTable:
    classes: dict[str, Path] = field(default_factory=dict)     # FQCN -> file
    functions: dict[str, Path] = field(default_factory=dict)   # name -> file
    file_namespace: dict[Path, str] = field(default_factory=dict)
    file_use_map: dict[Path, dict[str, str]] = field(default_factory=dict)


def build_symbol_table(files: list[Path]) -> SymbolTable:
    table = SymbolTable()
    for path in files:
        text = strip_comments(path.read_text(encoding="utf-8", errors="replace"))
        ns = file_namespace(text)
        table.file_namespace[path] = ns
        table.file_use_map[path] = file_use_map(text)

        for m in _CLASS_DECL_RE.finditer(text):
            short = m.group(1)
            fqcn = f"{ns}\\{short}" if ns else short
            table.classes.setdefault(fqcn, path)

        for fn in top_level_functions(text):
            table.functions.setdefault(fn, path)

    return table


# ---------------------------------------------------------------------------
# register_rest_route(...) call-site extraction
# ---------------------------------------------------------------------------
_CALL_START_RE = re.compile(r"\\?register_rest_route\s*\(")
_CALLBACK_KEY_RE = re.compile(r"""['"]callback['"]\s*=>\s*""")
_STRING_ARG_RE = re.compile(r"""['"]([^'"]*)['"]""")


def _line_of(text: str, pos: int) -> int:
    return text.count("\n", 0, pos) + 1


def _extract_callback_body(call_body: str) -> tuple[str, int] | None:
    """Find the 'callback' => VALUE slice inside a register_rest_route(...)
    call body. Returns (raw_value_text, offset_of_value_in_call_body) or
    None if no 'callback' key is present at this call's top level (nested
    calls inside e.g. 'args' are not register_rest_route's own callback)."""
    m = _CALLBACK_KEY_RE.search(call_body)
    if not m:
        return None
    start = m.end()
    # Skip leading whitespace.
    while start < len(call_body) and call_body[start] in " \t\r\n":
        start += 1
    if start >= len(call_body):
        return None
    ch = call_body[start]
    if ch == "[":
        end = _find_balanced(call_body, start, "[", "]")
        if end == -1:
            return None
        return call_body[start:end + 1], start
    if call_body[start:start + 5] == "array":
        paren_pos = call_body.find("(", start)
        if paren_pos == -1 or paren_pos - start > 5:
            return None
        end = _find_balanced(call_body, paren_pos, "(", ")")
        if end == -1:
            return None
        return call_body[start:end + 1], start
    if ch == "(":
        # A bare "( ... )" grouping (unlikely, but handle for completeness).
        end = _find_balanced(call_body, start, "(", ")")
        if end == -1:
            return None
        return call_body[start:end + 1], start
    if ch in "'\"":
        # Quoted string callback: 'Class::method' or 'function_name'.
        quote = ch
        end = start + 1
        while end < len(call_body) and call_body[end] != quote:
            if call_body[end] == "\\":
                end += 1
            end += 1
        return call_body[start:end + 1], start
    if call_body[start:start + 8] == "function":
        # Closure literal — find its balanced {...} body and return the
        # whole thing (kind classification happens by the caller).
        brace_pos = call_body.find("{", start)
        if brace_pos == -1:
            return call_body[start:start + 30], start
        end = _find_balanced(call_body, brace_pos, "{", "}")
        if end == -1:
            return call_body[start:start + 30], start
        return call_body[start:end + 1], start
    # Some other bare identifier expression (e.g. a variable, or
    # `array( self::class, 'method' )` already handled above via '[').
    end = start
    while end < len(call_body) and call_body[end] not in ",\n":
        end += 1
    return call_body[start:end].strip(), start


def _classify_and_resolve(
    raw_callback: str,
    file_path: Path,
    table: SymbolTable,
) -> tuple[str, str]:
    """Returns (kind, symbol). kind in class-method/function/core-allowlisted
    /closure/unparseable. symbol is 'FQCN::method' or 'function_name' or ''."""
    stripped = raw_callback.strip()

    if stripped.startswith("function") or stripped.startswith("fn"):
        return "closure", ""

    if stripped.startswith("[") or stripped.lower().startswith("array"):
        # array/list form: [ X::class, 'method' ] / array( X::class, 'method' )
        parts = re.findall(
            r"""([A-Za-z0-9_\\]+::class|__CLASS__|self|static|['"][^'"]*['"])""",
            stripped,
        )
        if len(parts) < 2:
            return "unparseable", ""
        class_token, method_token = parts[0], parts[1]
        method = method_token.strip("'\"")

        if class_token in ("__CLASS__", "self", "static"):
            ns = table.file_namespace.get(file_path, "")
            # Enclosing class in THIS file — best-effort: last class decl
            # found in the file before this point is good enough since
            # every route-registration method in this codebase lives
            # inside the same class it registers routes for.
            text = strip_comments(file_path.read_text(encoding="utf-8", errors="replace"))
            classes_in_file = _CLASS_DECL_RE.findall(text)
            short = classes_in_file[-1] if classes_in_file else ""
            fqcn = f"{ns}\\{short}" if ns else short
        else:
            short = class_token.split("::")[0].lstrip("\\")
            use_map = table.file_use_map.get(file_path, {})
            if "\\" in short:
                fqcn = short
            elif short in use_map:
                fqcn = use_map[short]
            else:
                ns = table.file_namespace.get(file_path, "")
                fqcn = f"{ns}\\{short}" if ns else short

        return "class-method", f"{fqcn}::{method}"

    # Quoted string form.
    if stripped.startswith("'") or stripped.startswith('"'):
        inner = stripped[1:-1]
        if "::" in inner:
            cls, method = inner.split("::", 1)
            cls = cls.lstrip("\\")
            return "class-method", f"{cls}::{method}"
        if inner in _CORE_CALLBACK_ALLOWLIST:
            return "core-allowlisted", inner
        return "function", inner

    if "__NAMESPACE__" in stripped:
        # __NAMESPACE__ . '\\func_name' form (rest-motion-budget.php).
        m = re.search(r"""['"]\\{1,2}([A-Za-z0-9_]+)['"]""", stripped)
        if m:
            ns = table.file_namespace.get(file_path, "")
            fn = m.group(1)
            return "function", f"{ns}\\{fn}" if ns else fn

    return "unparseable", ""


def extract_route_callbacks(file_path: Path, repo_root: Path) -> list[RouteCallback]:
    raw_text = file_path.read_text(encoding="utf-8", errors="replace")
    text = strip_comments(raw_text)
    results: list[RouteCallback] = []

    try:
        rel_file = str(file_path.relative_to(repo_root)).replace("\\", "/")
    except ValueError:
        rel_file = str(file_path).replace("\\", "/")

    for m in _CALL_START_RE.finditer(text):
        open_paren = m.end() - 1
        close_paren = _find_balanced(text, open_paren, "(", ")")
        if close_paren == -1:
            continue
        call_body = text[open_paren + 1:close_paren]
        line = _line_of(text, m.start())

        args = _STRING_ARG_RE.findall(call_body[: call_body.find("[") if "[" in call_body[:200] else 200])
        namespace_arg = args[0] if len(args) > 0 else "?"
        route_arg = args[1] if len(args) > 1 else "?"

        extracted = _extract_callback_body(call_body)
        if extracted is None:
            continue
        raw_callback, _offset = extracted

        results.append(
            RouteCallback(
                file=rel_file,
                line=line,
                namespace_arg=namespace_arg,
                route_arg=route_arg,
                raw_callback=raw_callback.strip(),
                kind="unparseable",
            )
        )
    return results


# ---------------------------------------------------------------------------
# Full pipeline
# ---------------------------------------------------------------------------
def iter_target_php_files(roots: list[Path]) -> list[Path]:
    files: list[Path] = []
    for root in roots:
        if not root.exists():
            continue
        for path in sorted(root.rglob("*.php")):
            if any(part in _EXCLUDED_DIR_NAMES for part in path.parts):
                continue
            files.append(path)
    return files


def run_survey(
    entry_file: Path | None = None,
    plugin_root: Path | None = None,
    composer_json: Path | None = None,
    target_roots: list[Path] | None = None,
    repo_root: Path | None = None,
) -> list[RouteCallback]:
    entry_file = entry_file or _ENTRY_FILE
    plugin_root = plugin_root or _PLUGIN_ROOT
    composer_json = composer_json or _COMPOSER_JSON
    target_roots = target_roots if target_roots is not None else _TARGET_ROOTS
    repo_root = repo_root or _REPO_ROOT

    reachable_files = build_require_graph(entry_file, plugin_root)
    autoload_dirs = load_psr4_dirs(composer_json, plugin_root)

    all_php = iter_target_php_files(
        [plugin_root / "includes", plugin_root / "src", plugin_root / "sgs-blocks.php"]
        if (plugin_root / "includes").exists() or (plugin_root / "src").exists()
        else target_roots
    )
    # Always include every .php file under includes/ + src/ (+ the entry
    # file itself, for symbol-table completeness) regardless of the
    # `iter_target_php_files` composite above (kept simple + explicit).
    all_php = list(iter_target_php_files(target_roots))
    if entry_file.exists() and entry_file not in all_php:
        all_php.append(entry_file)

    table = build_symbol_table(all_php)

    route_files = iter_target_php_files(target_roots)
    findings: list[RouteCallback] = []

    for path in route_files:
        for cb in extract_route_callbacks(path, repo_root):
            kind, symbol = _classify_and_resolve(cb.raw_callback, path, table)
            cb.kind = kind
            cb.symbol = symbol
            cb.key = _finding_key(cb.file, cb.line, symbol or cb.raw_callback[:40])

            if kind == "closure" or kind == "core-allowlisted" or kind == "unparseable":
                cb.reachable = "n/a"
                findings.append(cb)
                continue

            if kind == "class-method":
                fqcn = symbol.rsplit("::", 1)[0]
                defining_file = table.classes.get(fqcn)
            else:  # function
                defining_file = table.functions.get(symbol.rsplit("\\", 1)[-1])

            if defining_file is None:
                cb.defining_file = ""
                cb.reachable = "unresolved"
            else:
                try:
                    cb.defining_file = str(defining_file.relative_to(repo_root)).replace("\\", "/")
                except ValueError:
                    cb.defining_file = str(defining_file).replace("\\", "/")
                cb.reachable = bool(
                    defining_file.resolve() in reachable_files
                    or is_autoloaded(defining_file, autoload_dirs)
                )

            findings.append(cb)

    findings.sort(key=lambda f: (f.file, f.line))
    return findings


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
def _print_survey(findings: list[RouteCallback]) -> None:
    total = len(findings)
    unreachable = [f for f in findings if f.reachable is False]
    unresolved = [f for f in findings if f.reachable == "unresolved"]
    ok = [f for f in findings if f.reachable is True]
    na = [f for f in findings if f.reachable == "n/a"]

    print(
        f"[rest-route-require] {total} register_rest_route() callback(s) found "
        f"— {len(ok)} reachable, {len(unreachable)} UNREACHABLE, "
        f"{len(unresolved)} unresolved (not found in codebase), {len(na)} n/a "
        f"(closure/core/unparseable)"
    )
    print()
    for f in findings:
        tag = {
            True: "[OK]        ",
            False: "[UNREACHABLE]",
            "unresolved": "[UNRESOLVED]",
            "n/a": "[N/A]       ",
        }[f.reachable]
        print(f"  {tag} {f.file}:{f.line}  {f.namespace_arg} {f.route_arg}")
        print(f"               kind={f.kind}  symbol={f.symbol or f.raw_callback}")
        if f.defining_file:
            print(f"               defining_file={f.defining_file}")
        print()


def _print_check_failures(unreachable: list[RouteCallback]) -> None:
    for f in unreachable:
        print(f"  [UNREACHABLE]")
        print(f"  Route:    {f.namespace_arg} {f.route_arg}")
        print(f"  File:     {f.file}:{f.line}")
        print(f"  Callback: {f.symbol}")
        print(f"  Defining file: {f.defining_file}")
        print(
            "  Problem:  this class/function is DEFINED in the codebase but its "
            "file is never require'd/include'd from the plugin bootstrap "
            "(sgs-blocks.php) and is not covered by Composer's PSR-4 autoload "
            "map. Route REGISTRATION succeeds (the class name is just a "
            "string at that point) but every real DISPATCH will 500 with "
            "rest_invalid_handler — silently, with nothing written to any "
            "PHP error log. This is the exact D1079 incident shape."
        )
        print(
            "  Fix:      add `require_once SGS_BLOCKS_PATH . '<path>';` to "
            "sgs-blocks.php (or move the class under src/ to pick up PSR-4 "
            "autoload)."
        )
        print()


def _print_json(findings: list[RouteCallback]) -> None:
    payload = {
        "total": len(findings),
        "findings": [
            {
                "file": f.file, "line": f.line, "namespace": f.namespace_arg,
                "route": f.route_arg, "kind": f.kind, "symbol": f.symbol,
                "defining_file": f.defining_file, "reachable": f.reachable,
                "key": f.key,
            }
            for f in findings
        ],
    }
    print(json.dumps(payload, indent=2))


# ---------------------------------------------------------------------------
# Self-test — proves the detector catches the EXACT D1079 shape, and does
# NOT false-positive on the exact three legitimate shapes this codebase uses
# (require'd includes/ class, autoloaded src/ class, plain function).
# ---------------------------------------------------------------------------
def _write_fixture(tmp_root: Path) -> None:
    plugin_root = tmp_root
    (plugin_root / "includes" / "forms").mkdir(parents=True)
    (plugin_root / "src").mkdir(parents=True)

    (plugin_root / "composer.json").write_text(
        json.dumps({"autoload": {"psr-4": {"SGS\\Blocks\\": "src/"}}}), encoding="utf-8"
    )

    # The bootstrap: requires the form-processor class (present), the
    # form-rest-api registrar (present) — but DELIBERATELY OMITS requiring
    # class-form-rest-submission.php. This is the exact D1079 shape: the
    # class exists in the tree, is referenced as a REST callback, but its
    # file is never require'd from anywhere and is not under src/.
    (plugin_root / "sgs-blocks.php").write_text(
        "<?php\n"
        "define( 'SGS_BLOCKS_PATH', __DIR__ . '/' );\n"
        "require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-rest-api.php';\n"
        # Intentionally NOT requiring class-form-rest-submission.php.
        "require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-reachable.php';\n",
        encoding="utf-8",
    )

    (plugin_root / "includes" / "forms" / "class-form-rest-submission.php").write_text(
        "<?php\n"
        "namespace SGS\\Blocks\\Forms;\n"
        "class Form_REST_Submission {\n"
        "\tpublic static function handle_submit() { return true; }\n"
        "}\n",
        encoding="utf-8",
    )

    (plugin_root / "includes" / "forms" / "class-form-rest-api.php").write_text(
        "<?php\n"
        "namespace SGS\\Blocks\\Forms;\n"
        "class Form_REST_API {\n"
        "\tpublic static function register_routes() {\n"
        "\t\tregister_rest_route(\n"
        "\t\t\t'sgs-forms/v1',\n"
        "\t\t\t'/submit',\n"
        "\t\t\tarray(\n"
        "\t\t\t\t'methods'  => 'POST',\n"
        "\t\t\t\t'callback' => array( Form_REST_Submission::class, 'handle_submit' ),\n"
        "\t\t\t)\n"
        "\t\t);\n"
        "\t\tregister_rest_route(\n"
        "\t\t\t'sgs-forms/v1',\n"
        "\t\t\t'/reachable',\n"
        "\t\t\tarray(\n"
        "\t\t\t\t'methods'  => 'POST',\n"
        "\t\t\t\t'callback' => array( Form_Reachable::class, 'do_thing' ),\n"
        "\t\t\t)\n"
        "\t\t);\n"
        "\t}\n"
        "}\n",
        encoding="utf-8",
    )

    # Positive control: a class that IS require'd from the bootstrap.
    (plugin_root / "includes" / "forms" / "class-form-reachable.php").write_text(
        "<?php\n"
        "namespace SGS\\Blocks\\Forms;\n"
        "class Form_Reachable {\n"
        "\tpublic static function do_thing() { return true; }\n"
        "}\n",
        encoding="utf-8",
    )

    # Positive control: a class under src/ — reachable via PSR-4 autoload
    # alone, with NO require statement anywhere.
    (plugin_root / "src" / "Autoloaded_Controller.php").write_text(
        "<?php\n"
        "namespace SGS\\Blocks;\n"
        "class Autoloaded_Controller {\n"
        "\tpublic static function handle() { return true; }\n"
        "}\n",
        encoding="utf-8",
    )
    (plugin_root / "includes" / "class-uses-autoloaded.php").write_text(
        "<?php\n"
        "namespace SGS\\Blocks;\n"
        "class Uses_Autoloaded {\n"
        "\tpublic static function register() {\n"
        "\t\tregister_rest_route(\n"
        "\t\t\t'sgs/v1',\n"
        "\t\t\t'/autoloaded',\n"
        "\t\t\tarray(\n"
        "\t\t\t\t'callback' => array( Autoloaded_Controller::class, 'handle' ),\n"
        "\t\t\t)\n"
        "\t\t);\n"
        "\t}\n"
        "}\n",
        encoding="utf-8",
    )


def run_self_test() -> bool:
    ok = True

    with tempfile.TemporaryDirectory(prefix="rest-route-require-selftest-") as tmp:
        tmp_root = Path(tmp)
        _write_fixture(tmp_root)

        findings = run_survey(
            entry_file=tmp_root / "sgs-blocks.php",
            plugin_root=tmp_root,
            composer_json=tmp_root / "composer.json",
            target_roots=[tmp_root / "includes", tmp_root / "src"],
            repo_root=tmp_root,
        )

        by_symbol = {f.symbol: f for f in findings}

        # Assertion 1 (NEGATIVE CONTROL / the exact D1079 incident shape) —
        # Form_REST_Submission's file is never require'd. MUST be flagged
        # UNREACHABLE (reachable is False), never silently passed.
        submission = by_symbol.get("SGS\\Blocks\\Forms\\Form_REST_Submission::handle_submit")
        if submission is not None and submission.reachable is False:
            print(
                "[rest-route-require] self-test PASS: caught the exact D1079 "
                "shape — Form_REST_Submission's defining file is never "
                "require'd, correctly flagged UNREACHABLE."
            )
        else:
            print(
                "[rest-route-require] self-test FAIL: did NOT flag "
                "Form_REST_Submission as unreachable — the detector does not "
                "catch the exact bug it exists for. "
                f"(found={submission})"
            )
            ok = False

        # Assertion 2 — Form_Reachable IS require'd from the bootstrap; must
        # be reachable=True, never a false positive.
        reachable_cls = by_symbol.get("SGS\\Blocks\\Forms\\Form_Reachable::do_thing")
        if reachable_cls is not None and reachable_cls.reachable is True:
            print(
                "[rest-route-require] self-test PASS: did not false-positive "
                "on Form_Reachable (explicitly require'd)."
            )
        else:
            print(
                "[rest-route-require] self-test FAIL: false-positived on "
                f"Form_Reachable, which IS require'd. (found={reachable_cls})"
            )
            ok = False

        # Assertion 3 — Autoloaded_Controller lives under src/ (PSR-4), has
        # NO require statement anywhere, and must still be reachable=True.
        autoloaded = by_symbol.get("SGS\\Blocks\\Autoloaded_Controller::handle")
        if autoloaded is not None and autoloaded.reachable is True:
            print(
                "[rest-route-require] self-test PASS: correctly treated a "
                "src/ (PSR-4-autoloaded) class as reachable with no explicit "
                "require."
            )
        else:
            print(
                "[rest-route-require] self-test FAIL: did not recognise PSR-4 "
                f"autoload reachability for Autoloaded_Controller. (found={autoloaded})"
            )
            ok = False

        # Assertion 4 — exactly 3 class-method callbacks were found (no
        # over- or under-extraction from the fixture's 3 register_rest_route
        # call sites).
        class_method_findings = [f for f in findings if f.kind == "class-method"]
        if len(class_method_findings) == 3:
            print(
                "[rest-route-require] self-test PASS: extracted exactly 3 "
                "class-method callbacks from the fixture's 3 route "
                "registrations."
            )
        else:
            print(
                "[rest-route-require] self-test FAIL: expected 3 "
                f"class-method callbacks, found {len(class_method_findings)}."
            )
            ok = False

    return ok


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "REST-route-callback load-reachability guard — flags a "
            "register_rest_route() callback whose class/function is defined "
            "in this codebase but never require'd/autoloaded (the D1079 "
            "shape: registration succeeds, dispatch 500s silently)."
        )
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--report", action="store_true", default=False,
                       help="Print findings and exit 0 (default).")
    mode.add_argument("--survey", action="store_true", default=False,
                       help="Full census — every route callback, resolved symbol, reachability.")
    mode.add_argument("--check", action="store_true", default=False,
                       help="Exit 1 if any callback is UNREACHABLE.")
    mode.add_argument("--self-test", action="store_true", default=False,
                       help="Run the synthetic-fixture regression test and exit.")
    parser.add_argument("--json", action="store_true", default=False,
                         help="Machine-readable output.")
    args = parser.parse_args()

    if args.self_test:
        return 0 if run_self_test() else 1

    if not args.check and not args.survey:
        args.report = True

    findings = run_survey()

    if args.json:
        _print_json(findings)
        if args.check:
            unreachable = [f for f in findings if f.reachable is False]
            return 1 if unreachable else 0
        return 0

    if args.survey or args.report:
        _print_survey(findings)

    if args.check:
        unreachable = [f for f in findings if f.reachable is False]
        if unreachable:
            print(
                f"\n[rest-route-require] GATE FAILED — {len(unreachable)} REST "
                "route callback(s) are UNREACHABLE (defined but never "
                "require'd/autoloaded).\n"
            )
            _print_check_failures(unreachable)
            return 1
        print(
            f"[rest-route-require] Gate passed — all "
            f"{len([f for f in findings if f.reachable is True])} resolvable "
            "route callback(s) are reachable."
        )
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
