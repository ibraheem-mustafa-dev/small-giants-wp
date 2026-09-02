#!/usr/bin/env python3
"""
check-dead-api-calls.py

STRUCTURAL GUARD — catches a call to a PHP/WordPress/WooCommerce function
that does not exist ("hallucinated API"), the class of bug that shipped
live on 2026-08-16: a subagent wrote `wc_get_price_html( $product )` as if
it were a real WooCommerce global function. It is not — WooCommerce has no
such function (only the unrelated `wc_get_price_html_from_text()`); the
real API is the INSTANCE METHOD `$product->get_price_html()`. It passed
every static gate in this codebase's ~50-gate prebuild chain (none of them
execute PHP, they only pattern-match source text) and broke live the
moment a real user's search matched a real product: an uncaught PHP
`Error` on every search with at least one result, WordPress serving its
generic "critical error" page instead of JSON. Caught only because Bean
personally tested the live site.

MECHANISM
---------
1. For every `.php` file under the three production source roots
   (`src/blocks/`, `includes/`, `theme/sgs-theme/`), invoke PHP's own
   tokenizer via `dead-api-checker/tokenize-calls.php` (see that file's
   header for why a real tokenizer beats regex here: it is immune to
   function-shaped text inside comments/strings/heredoc, and needs no
   keyword-exclusion list for `if(`/`array(`/`match(`/etc. — those are
   already distinct token types, never T_STRING).
2. Collect every GLOBAL function CALL (bare or namespaced identifier
   immediately followed by "(", excluding method calls `->`, static calls
   `::`, and `new Foo()` instantiation) and every GLOBAL function
   DEFINITION (`function name(` outside a class/trait/interface body).
3. Build an ALLOWLIST from three sources:
     a. PHP's own builtins — `php -r "echo implode(...get_defined_functions())"`.
     b. Every global function this codebase itself DEFINES (collected in
        step 2 across all scanned files — a call resolved by a sibling
        file counts).
     c. A hand-curated WordPress/WooCommerce function list —
        `dead-api-checker/wp-wc-function-allowlist.json` — see that
        file's own `_comment` for why it is HAND-VERIFIED rather than
        scraped from this codebase's own call sites (scraping would let
        an existing hallucinated call launder itself straight into the
        allowlist, defeating the entire point of this tool).
4. Any call whose name is in none of the three allowlist sources is a
   FINDING: file, line(s), function name, "did you mean an instance
   method?" hint.
5. Baseline/--check/--update-baseline follow this codebase's own
   house convention (mirrors check-box-family-guard.py): a brand-new gate
   ships with the CURRENT findings seeded into the baseline (§ genuinely
   real-but-uncurated WP/WC calls, e.g. `wc_get_gallery_image_html`-shaped
   functions this JSON hasn't caught up with yet), so --check fails only
   on NET-NEW findings from this point forward.

COVERAGE LIMITATIONS (read before trusting a clean run)
--------------------------------------------------------
  - Class METHODS are entirely out of scope by design (see the dispatch
    brief this tool was built from): a typo'd method call throws a clear
    "Call to undefined method" PHP fatal that is easy to spot in
    error-log triage, unlike a typo'd GLOBAL function call (tonight's
    bug), which is silent until the exact code path executes.
  - The curated WP/WC allowlist is NOT exhaustive — WordPress alone ships
    several thousand functions. A real-but-uncurated function will show
    as an ordinary finding on first sight and land in the baseline;
    extending the JSON over time (hand-verified only, never scraped) is
    how coverage grows without reintroducing the laundering risk in (3c).
  - Dynamic callables passed as STRINGS (`call_user_func('wc_x', ...)`,
    `array_map('wc_y', $arr)`) are invisible — the tokenizer only sees a
    string literal, not a call. Out of scope for this first version.
  - A baselined finding for a genuinely wrong function name stays SILENT
    forever unless the baseline entry is removed — the baseline absorbs
    "unverified but currently working" calls, which is a real, bounded,
    documented blind spot (same shape as every other baseline in this
    codebase).

Usage
-----
    python scripts/check-dead-api-calls.py                # --report (default)
    python scripts/check-dead-api-calls.py --report        # print findings, exit 0
    python scripts/check-dead-api-calls.py --check          # exit 1 on any NEW finding
    python scripts/check-dead-api-calls.py --update-baseline  # accept current findings
    python scripts/check-dead-api-calls.py --self-test       # prove the detector works
    python scripts/check-dead-api-calls.py --json             # machine-readable report

HARD GATE, wired into both `prestart` (package.json — direct `&&` chain, no
advisory fallback) and `prebuild`'s `fast` tier (`scripts/gates.json`,
promoted from `full` 2026-09-02 per P-DEAD-API-PROMOTE-TO-HARD-GATE): the
baseline is genuinely 0 findings (all real WP/WC calls curated into the
allowlist) and `--self-test` still catches the exact D641 incident call, so
nothing justifies leaving it advisory any longer. It also still runs at
`gate:full` pre-deploy as a second, deploy-time confirmation.

UK English throughout.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
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

_TOKENIZER = _HERE / "dead-api-checker" / "tokenize-calls.php"
_CURATED_ALLOWLIST = _HERE / "dead-api-checker" / "wp-wc-function-allowlist.json"
_BASELINE_PATH = _HERE / "dead-api-calls-baseline.json"

# Production PHP source roots this gate scans. Deliberately NOT scripts/
# (dev tooling — this file's own dependents included) and NOT any tests/
# or vendor/ directory (third-party code we don't own and can't fix).
_TARGET_ROOTS = [
    _PLUGIN_ROOT / "src" / "blocks",
    _PLUGIN_ROOT / "includes",
    _REPO_ROOT / "theme" / "sgs-theme",
]

_EXCLUDED_DIR_NAMES = {"node_modules", "vendor", "tests", ".git", "build"}


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------
@dataclass
class Finding:
    file: str
    function: str
    lines: list[int] = field(default_factory=list)
    key: str = ""


def _finding_key(rel_file: str, function_name: str) -> str:
    """Stable dedup key — file + function name (lower-cased), NOT line
    number, so re-formatting the file (shifting line numbers) does not
    invalidate an existing baseline entry. Matches the box-family-guard
    convention of keying on identity, not position."""
    return f"deadapi:{rel_file}:{function_name.lower()}"


# ---------------------------------------------------------------------------
# PHP builtins
# ---------------------------------------------------------------------------
def _find_php_binary() -> str | None:
    return shutil.which("php")


def get_php_builtins(php_binary: str) -> set[str]:
    """Every function PHP itself ships (core + loaded extensions), via
    `get_defined_functions()['internal']`. Lower-cased — PHP function
    names are case-insensitive."""
    proc = subprocess.run(
        [php_binary, "-r", "echo implode(PHP_EOL, get_defined_functions()['internal']);"],
        capture_output=True,
        text=True,
        check=True,
    )
    return {line.strip().lower() for line in proc.stdout.splitlines() if line.strip()}


def load_curated_allowlist(path: Path = _CURATED_ALLOWLIST) -> set[str]:
    if not path.exists():
        return set()
    data = json.loads(path.read_text(encoding="utf-8"))
    return {name.lower() for name in data.get("functions", [])}


# ---------------------------------------------------------------------------
# PHP tokenizer invocation
# ---------------------------------------------------------------------------
def tokenize_file(php_binary: str, file_path: Path) -> dict:
    """Run tokenize-calls.php against one PHP file. Returns
    {"calls": [...], "definitions": [...]}. Raises CalledProcessError on a
    tokenizer failure (e.g. an unreadable file) — callers should let this
    propagate; a silent skip would hide real files from the scan."""
    proc = subprocess.run(
        [php_binary, str(_TOKENIZER), str(file_path)],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(proc.stdout)


def iter_target_php_files(roots: list[Path] | None = None) -> list[Path]:
    roots = _TARGET_ROOTS if roots is None else roots
    files: list[Path] = []
    for root in roots:
        if not root.exists():
            continue
        for path in sorted(root.rglob("*.php")):
            if any(part in _EXCLUDED_DIR_NAMES for part in path.parts):
                continue
            files.append(path)
    return files


# ---------------------------------------------------------------------------
# Core scan
# ---------------------------------------------------------------------------
def scan_files(
    php_binary: str, files: list[Path], repo_root: Path
) -> tuple[list[Finding], set[str]]:
    """Tokenize every file, collect (a) every call site grouped into
    Findings keyed by (file, function-name) and (b) the set of GLOBAL
    (non-method) function names this scan's own files DEFINE — the
    caller folds (b) into the allowlist before deciding which findings
    from (a) survive.

    Returns (raw_call_findings, locally_defined_global_functions).
    raw_call_findings includes EVERY call site, not yet filtered against
    any allowlist — filtering happens in collect_violations() once the
    full local-definition set (which requires having tokenized every
    file first) is known.
    """
    calls_by_key: dict[str, Finding] = {}
    local_defined: set[str] = set()

    for path in files:
        try:
            result = tokenize_file(php_binary, path)
        except subprocess.CalledProcessError as exc:
            raise RuntimeError(
                f"tokenize-calls.php failed on {path}: {exc.stderr.strip()}"
            ) from exc
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                f"tokenize-calls.php produced invalid JSON for {path}: {exc}"
            ) from exc

        try:
            rel_file = str(path.relative_to(repo_root)).replace("\\", "/")
        except ValueError:
            rel_file = str(path).replace("\\", "/")

        for defn in result.get("definitions", []):
            if not defn.get("is_method", False):
                local_defined.add(defn["name"].lower())

        for call in result.get("calls", []):
            name = call["name"]
            key = _finding_key(rel_file, name)
            if key not in calls_by_key:
                calls_by_key[key] = Finding(file=rel_file, function=name, lines=[], key=key)
            calls_by_key[key].lines.append(call["line"])

    return list(calls_by_key.values()), local_defined


def collect_violations(
    php_binary: str | None = None,
    roots: list[Path] | None = None,
    repo_root: Path | None = None,
    extra_allowlist: set[str] | None = None,
) -> list[Finding]:
    """Full pipeline: tokenize target files, build the allowlist, return
    every call whose function name is in none of the allowlist sources.
    Pure-ish (roots/repo_root/extra_allowlist are injectable) so
    --self-test can exercise the exact same logic against a synthetic
    fixture tree instead of the real plugin/theme directories."""
    php_binary = php_binary or _find_php_binary()
    if not php_binary:
        raise RuntimeError(
            "No `php` binary found on PATH. This gate shells out to PHP's own "
            "tokenizer (token_get_all) for accurate call-site detection — "
            "install PHP CLI or pass --php-binary."
        )
    repo_root = repo_root or _REPO_ROOT
    files = iter_target_php_files(roots)

    raw_findings, local_defined = scan_files(php_binary, files, repo_root)

    allowlist = get_php_builtins(php_binary)
    allowlist |= load_curated_allowlist()
    allowlist |= local_defined
    if extra_allowlist:
        allowlist |= {name.lower() for name in extra_allowlist}

    violations = [f for f in raw_findings if f.function.lower() not in allowlist]
    violations.sort(key=lambda f: (f.file, f.function.lower()))
    return violations


# ---------------------------------------------------------------------------
# Baseline helpers (mirrors check-box-family-guard.py's self-blessing pattern)
# ---------------------------------------------------------------------------
def _compute_hash(keys: list[str]) -> str:
    payload = "\n".join(sorted(keys)).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _load_baseline(path: Path = _BASELINE_PATH) -> tuple[set[str], str | None]:
    if not path.exists():
        return set(), None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return set(data.get("keys", [])), data.get("hash")
        if isinstance(data, list):
            return set(data), None
    except Exception:  # noqa: BLE001
        pass
    return set(), None


def _save_baseline(keys: set[str], path: Path = _BASELINE_PATH) -> None:
    sorted_keys = sorted(keys)
    data = {"hash": _compute_hash(sorted_keys), "keys": sorted_keys}
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
def _print_report(violations: list[Finding], baseline: set[str]) -> None:
    if not violations:
        print("[dead-api-calls] All checks passed — 0 findings.")
        return

    new_findings = [v for v in violations if v.key not in baseline]
    base_findings = [v for v in violations if v.key in baseline]
    print(
        f"[dead-api-calls] {len(violations)} distinct call(s) to an "
        f"unrecognised function — {len(new_findings)} NEW, "
        f"{len(base_findings)} baselined"
    )
    print()
    for v in violations:
        is_new = v.key not in baseline
        tag = "[NEW]" if is_new else "[baselined]"
        lines_str = ", ".join(str(n) for n in sorted(set(v.lines)))
        print(f"  {tag}")
        print(f"  File:     {v.file}")
        print(f"  Function: {v.function}()")
        print(f"  Line(s):  {lines_str}")
        print(
            "  Problem:  this name is not a PHP builtin, not defined anywhere "
            "in this codebase, and not in the hand-curated WP/WC allowlist."
        )
        print(
            "  Fix:      confirm the real API — check the WordPress/"
            "WooCommerce developer reference (it is very often an INSTANCE "
            "METHOD, e.g. $product->get_price_html(), not a global "
            "function). If it IS a real, verified function, add it to "
            "dead-api-checker/wp-wc-function-allowlist.json."
        )
        print(f"  Key:      {v.key}")
        print()


def _print_json(violations: list[Finding], baseline: set[str]) -> None:
    payload = {
        "total": len(violations),
        "new": sum(1 for v in violations if v.key not in baseline),
        "baselined": sum(1 for v in violations if v.key in baseline),
        "findings": [
            {
                "file": v.file,
                "function": v.function,
                "lines": sorted(set(v.lines)),
                "key": v.key,
                "is_new": v.key not in baseline,
            }
            for v in violations
        ],
    }
    print(json.dumps(payload, indent=2))


# ---------------------------------------------------------------------------
# Self-test — proves the detector catches the EXACT incident it exists for,
# and does NOT flag a real call. Plants a synthetic fixture tree (via
# tempfile), runs collect_violations() against it directly (roots injected,
# not the real plugin dirs), asserts, cleans up.
# ---------------------------------------------------------------------------
def run_self_test() -> bool:
    php_binary = _find_php_binary()
    if not php_binary:
        print("[dead-api-calls] --self-test FAILED: no `php` binary on PATH.")
        return False

    ok = True

    with tempfile.TemporaryDirectory(prefix="dead-api-checker-selftest-") as tmp:
        tmp_root = Path(tmp)
        fixture_dir = tmp_root / "src" / "blocks" / "fake-block"
        fixture_dir.mkdir(parents=True)

        fixture_php = fixture_dir / "render.php"
        fixture_php.write_text(
            "<?php\n"
            "// Positive control: the EXACT hallucinated call from the real\n"
            "// incident (2026-08-16) — WooCommerce has no such global function.\n"
            "$html = wc_get_price_html( $product );\n"
            "\n"
            "// Negative control 1: a REAL, curated WooCommerce function.\n"
            "$real_product = wc_get_product( $id );\n"
            "\n"
            "// Negative control 2: a REAL PHP builtin.\n"
            "$lower = strtolower( 'x' );\n"
            "\n"
            "// Negative control 3: a locally-defined GLOBAL function, called\n"
            "// after its own declaration in the same fixture file.\n"
            "function my_local_helper() {\n"
            "\treturn true;\n"
            "}\n"
            "$ok = my_local_helper();\n"
            "\n"
            "// Negative control 4: text that LOOKS like a call but sits inside\n"
            "// a comment/string — must never be flagged (proves the tokenizer,\n"
            "// not a regex, is doing the work).\n"
            "// wc_totally_fake_call_in_a_comment();\n"
            "$css = \"prop: wc_totally_fake_call_in_a_string();\";\n",
            encoding="utf-8",
        )

        violations = collect_violations(
            php_binary=php_binary,
            roots=[tmp_root / "src" / "blocks"],
            repo_root=tmp_root,
        )
        flagged_names = {v.function.lower() for v in violations}

        # Assertion 1 — the exact incident function MUST be caught.
        if "wc_get_price_html" in flagged_names:
            print("[dead-api-calls] self-test PASS: caught the exact incident "
                  "call, wc_get_price_html().")
        else:
            print("[dead-api-calls] self-test FAIL: did NOT catch "
                  "wc_get_price_html() — the detector does not work for the "
                  "bug it exists to catch.")
            ok = False

        # Assertion 2 — a real, curated WooCommerce function must NOT be flagged.
        if "wc_get_product" not in flagged_names:
            print("[dead-api-calls] self-test PASS: did not flag the real "
                  "wc_get_product() call.")
        else:
            print("[dead-api-calls] self-test FAIL: false-positived on the "
                  "real wc_get_product() call.")
            ok = False

        # Assertion 3 — a real PHP builtin must NOT be flagged.
        if "strtolower" not in flagged_names:
            print("[dead-api-calls] self-test PASS: did not flag the PHP "
                  "builtin strtolower().")
        else:
            print("[dead-api-calls] self-test FAIL: false-positived on the "
                  "PHP builtin strtolower().")
            ok = False

        # Assertion 4 — a locally-defined function must NOT be flagged.
        if "my_local_helper" not in flagged_names:
            print("[dead-api-calls] self-test PASS: did not flag the "
                  "locally-defined my_local_helper() call.")
        else:
            print("[dead-api-calls] self-test FAIL: false-positived on the "
                  "locally-defined my_local_helper() call.")
            ok = False

        # Assertion 5 — comment/string text must never appear as a finding
        # (proves tokenizer-based extraction, not regex).
        if "wc_totally_fake_call_in_a_comment" not in flagged_names and \
           "wc_totally_fake_call_in_a_string" not in flagged_names:
            print("[dead-api-calls] self-test PASS: ignored comment/string "
                  "text that merely LOOKS like a call.")
        else:
            print("[dead-api-calls] self-test FAIL: flagged text inside a "
                  "comment or string as if it were a real call — the "
                  "tokenizer is not being used correctly.")
            ok = False

    return ok


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Dead/hallucinated-API-call guard — flags a call to a PHP/"
            "WordPress/WooCommerce global function that does not exist "
            "anywhere: not a PHP builtin, not defined in this codebase, "
            "not in the hand-curated WP/WC allowlist."
        )
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--report", action="store_true", default=False,
                       help="Print all findings and exit 0 (default).")
    mode.add_argument("--check", action="store_true", default=False,
                       help="Exit 1 if any finding key is NOT in the baseline.")
    mode.add_argument("--update-baseline", action="store_true", default=False,
                       help="Write current finding keys to the baseline and exit 0.")
    mode.add_argument("--self-test", action="store_true", default=False,
                       help="Run the synthetic-fixture regression test and exit.")
    parser.add_argument("--json", action="store_true", default=False,
                         help="Machine-readable output (combine with --report/--check).")
    parser.add_argument("--php-binary", default=None,
                         help="Path to the php CLI binary (default: first `php` on PATH).")
    args = parser.parse_args()

    if args.self_test:
        return 0 if run_self_test() else 1

    if not args.check and not args.update_baseline:
        args.report = True

    try:
        violations = collect_violations(php_binary=args.php_binary)
    except RuntimeError as exc:
        print(f"[dead-api-calls] ERROR: {exc}")
        return 1

    baseline, stored_hash = _load_baseline()

    if args.update_baseline:
        new_baseline = {v.key for v in violations}
        _save_baseline(new_baseline)
        print(
            f"[dead-api-calls] Baseline updated — {len(new_baseline)} "
            f"key(s) written to {_BASELINE_PATH}"
        )
        return 0

    if args.json:
        _print_json(violations, baseline)
    else:
        _print_report(violations, baseline)

    if args.check:
        if baseline and stored_hash is not None:
            expected_hash = _compute_hash(list(baseline))
            if expected_hash != stored_hash:
                print(
                    "\n[dead-api-calls] GATE FAILED — baseline file has "
                    "been TAMPERED.\n"
                    f"  Stored hash:   {stored_hash}\n"
                    f"  Expected hash: {expected_hash}\n"
                    "  Do NOT hand-edit the baseline JSON. Run "
                    "--update-baseline to produce a legitimate baseline."
                )
                return 1
        elif baseline and stored_hash is None:
            print(
                "[dead-api-calls] WARNING: baseline is in the legacy list "
                "format (no hash). Run --update-baseline to upgrade."
            )

        new_violations = [v for v in violations if v.key not in baseline]
        if new_violations:
            print(
                f"\n[dead-api-calls] GATE FAILED — {len(new_violations)} "
                "new call(s) to an unrecognised function.\n"
                "  Fix the problems above, or run --update-baseline to "
                "accept them as known (only after verifying each one is a "
                "REAL function, not a repeat of the exact incident this "
                "gate exists to catch)."
            )
            return 1
        if violations:
            print(
                f"[dead-api-calls] Gate passed — all {len(violations)} "
                "finding(s) are baselined."
            )
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
