"""check-motion-bundle-budget.py — Spec 38 (Motion System) Tier G bundle-size budget gate.

Spec ref: .claude/specs/38-SGS-MOTION-SYSTEM.md §4.4 (conditional-loading contract) +
FR-38-24 (verification canaries + budget gates).

WHY THIS GATE EXISTS AND WHY IT DOES NOT USE THE §4.4 TABLE DIRECTLY
----------------------------------------------------------------------------------------
§4.4 publishes a size table (min+gzip) that the spec itself labels an ESTIMATE from the
GSAP 3.12/3.13 docs — "verified + recorded at the Wave A build; the build fails if a
bundle exceeds its budget by >20%". FR-38-24's done-criteria are explicit: "breach = >20%
over the §4.4 figures AS VERIFIED + RECORDED AT THE WAVE A BUILD (the §4.4 numbers are
estimates until then; the gate compares against the recorded actuals, not the estimates)".

Concretely, one of the three modules already proves the estimate is wrong: the measured
gsap-scrolltrigger.js actual (17,470 gzip bytes) is 25% over the spec's ~14 KB estimate.
Gating on the estimate would fail the build on day one for zero real regression — a
false-positive gate that would either get bypassed or get everyone used to ignoring it.
So this gate reads a COMMITTED BASELINE FILE (motion-bundle-baseline.json) containing the
actuals measured from the real Wave A build output, and compares future builds against
THAT — never the spec table.

GATE SHAPE (matches this project's other prebuild gates, e.g. check-box-family-guard.py)
----------------------------------------------------------------------------------------
- Default (no flag): observational report, exit 0 regardless of findings.
- --check: gating mode. Exits 1 if any module exceeds baseline by >20%, if the build
  directory is missing, or if a baselined module has gone missing from the build output.
- --update-baseline: deliberately re-records current actuals as the new baseline. This is
  a HUMAN decision (a real, reviewed bundle change) — never run automatically from CI.
- --self-test: proves the gate can actually fail. A GATE THAT CANNOT FAIL READS GREEN
  FOREVER (project rule, captured after prior gates were found to be structurally unable
  to catch the thing they claimed to guard). Synthesises an oversized module inside a
  temp build tree, confirms --check catches it and reports the correct verdict, then
  cleans up. No mutation of the real build/ directory ever happens in this mode.

WHERE IT LOOKS
----------------------------------------------------------------------------------------
Two directories, globbed (never hardcoded per-file) because new Tier G effect modules are
landing throughout Wave A/B/C and the gate must pick them up with zero edits:
  - build/vendor-modules/*.js        (GSAP core + plugin bundles, webpack externals output)
  - build/shared/effects/gsap/*.js   (house Tier G effect modules, e.g. fx-scrub.js)
  - build/shared/effects/*.js        (site-level motion modules that are NOT GSAP-backed,
                                      e.g. smooth-scroll.js — Lenis, D422. Added 2026-07-30
                                      because the two globs above were blind to it: the
                                      module built, shipped and was enqueued while the gate
                                      reported PASS having never measured it. A budget gate
                                      that cannot see a module cannot fail on it.)
`.asset.php` sidecars and any `*.js.map` are skipped — only the shipped JS payload counts
toward the byte budget actually downloaded by a browser.

UNBASELINED MODULES — JUDGMENT CALL (documented per the task's request for reasoning)
----------------------------------------------------------------------------------------
A module present in the build with NO baseline entry does NOT fail --check on its own.
Reasoning: the effect modules are landing continuously today (fx-scrub.js already exists,
more are coming); a "no baseline = fail" rule would make every single new-effect commit
break the gate the moment the module is built, forcing --update-baseline to be bundled
into unrelated feature commits — exactly the kind of friction that gets a real gate
disabled. Instead an unbaselined module is REPORTED PROMINENTLY (its own section, both
modes) so it is never silently invisible, and --update-baseline records it. The trade-off
this accepts: a genuinely oversized brand-new module can land once before the baseline
captures it. That is judged acceptable because (a) FR-38-24's own §5 canary obligation
means each shipped wave gets a canary page + human review before going live, which is the
real check on a first-time bloated module, and (b) the moment --update-baseline is run
(expected as a normal step when landing a new effect), the 20%-drift budget starts
applying to it from then on. This mirrors the house box-family-guard.py baseline pattern,
which also treats "no baseline entry yet" as reportable-not-failing.

--PAGE-BUDGET: A DIFFERENT QUESTION FROM EVERYTHING ABOVE (added 2026-08-21, D479/D555)
----------------------------------------------------------------------------------------
Everything above answers "did any ONE module regress against its own history". It has no
concept of a PAGE total, so D479's named 120KB Tier W page allowance was documented
nowhere and enforced nowhere — a page using surface-treatment could ship any size at all
and this gate would stay silent, because no single module breached its own 20% band.

`--page-budget <tier>` answers the other question: "how many bytes would a page using
tier <tier> actually pull, summed, and is that under the named allowance". It:
  1. Reads `motion-bundle-baseline.json`'s new `page_budgets` object (bytes, gzip) — data,
     not a number typed into this script.
  2. Parses `includes/class-sgs-motion-registry.php`'s `MODULES` const (never a
     hand-copied duplicate of that dependency graph) to find every module ID + its
     declared `deps`.
  3. Walks the graph from the tier's entry module(s) — see `_TIER_ENTRY_MODULES` below,
     the one judgement call this feature makes, documented there — collecting every
     transitively-required module ID.
  4. Sums the real gzip bytes of each resolved module's BUILT file under `build/`.
  5. Exits 1 if the total exceeds the tier's budget.

⚠ BUILD-GZIP BYTES AND WIRE-TRANSFERRED BYTES ARE DIFFERENT INSTRUMENTS. This gate (both
the per-module baseline above and `--page-budget`) measures `gzip.compress()` on the
built file's own bytes at COMPRESSLEVEL 9 — the theoretical floor a browser could achieve
decompressing that exact payload alone. It is NOT what a browser's dev-tools Network panel
reports for a live page load: real HTTP compression settings, TLS framing, HTTP/2 header
overhead, and — for `--page-budget` specifically — the fact that several of a page's
modules may already be resident from an earlier navigation (script-module caching) are
all invisible to this number. A delta between this gate's figure and a Lighthouse/DevTools
measurement of the SAME page is not evidence of a regression in either tool; they are
measuring different things and must never be diffed against each other as if a mismatch
were a finding.
"""
from __future__ import annotations

import argparse
import gzip
import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

_SCRIPT_DIR = Path(__file__).resolve().parent
_PLUGIN_ROOT = _SCRIPT_DIR.parent  # plugins/sgs-blocks
_BUILD_DIR = _PLUGIN_ROOT / "build"
_BASELINE_PATH = _SCRIPT_DIR / "motion-bundle-baseline.json"
_MOTION_REGISTRY_PHP = _PLUGIN_ROOT / "includes" / "class-sgs-motion-registry.php"

# Directories (relative to build/) globbed for Tier G modules. Never a hardcoded file
# list — new effect modules land without needing this gate edited.
_WATCHED_SUBDIRS = ("vendor-modules", "shared/effects/gsap", "shared/effects")

_BREACH_THRESHOLD_PCT = 20.0

# ---------------------------------------------------------------------------
# --page-budget: entry-module selection per tier. See the docstring's
# "--PAGE-BUDGET" section for what this feature answers.
#
# THE ONE JUDGEMENT CALL --page-budget makes: which module ID is "the tier" for
# graph-walking purposes. Everything downstream of an entry ID (the transitive
# `deps` set) is DERIVED by parsing `class-sgs-motion-registry.php`'s MODULES
# const — never hand-copied — but the entry ID itself has to be picked, because
# the registry has no "this module IS the tier" flag of its own.
#   'tier_w'  -> '@sgs/fx-surface-treatment'. Unambiguous: it is the ONLY Tier W
#                module in MODULES (see that module's own comment in the PHP
#                source — "Surface treatment (Tier W / WebGL)"), and its `deps`
#                are empty (no GSAP import at all, per that same comment), so
#                the tier_w page total is exactly this one module's bytes.
#   'default' -> '@sgs/fx-scrub'. Not spec-cited — a judgement call, flagged as
#                one rather than presented as derived: `scrub` is the generic,
#                broadly-offered Tier G effect (fx_effects.requires='none',
#                seed-motion-fx-registry.py), so it is the most representative
#                "a page picked ONE ordinary Tier G effect" case. Its resolved
#                chain (gsap-core + gsap-scrolltrigger + provider + fx-scrub)
#                is also the heaviest 4-module chain sharing only ScrollTrigger
#                among the requires='none'/'text' effects, which is why the
#                'default' budget in motion-bundle-baseline.json was set with
#                headroom above it rather than below.
_TIER_ENTRY_MODULES: dict[str, tuple[str, ...]] = {
    "tier_w": ("@sgs/fx-surface-treatment",),
    "default": ("@sgs/fx-scrub",),
}


def _iter_modules(build_dir: Path) -> list[Path]:
    """Return every *.js file (excluding source maps) under the watched subdirs,
    as paths relative to build_dir, in stable sorted order."""
    found: list[Path] = []
    for sub in _WATCHED_SUBDIRS:
        sub_dir = build_dir / sub
        if not sub_dir.is_dir():
            continue
        for js_file in sub_dir.glob("*.js"):
            if js_file.name.endswith(".js.map"):
                continue
            found.append(js_file.relative_to(build_dir))
    return sorted(found, key=lambda p: p.as_posix())


def _gzip_size(path: Path) -> int:
    """Gzip-compressed byte size of a file's contents — the metric §4.4 and FR-38-24
    both use ("min+gzip"), since that is what actually crosses the wire."""
    raw = path.read_bytes()
    return len(gzip.compress(raw, compresslevel=9))


def _load_baseline(baseline_path: Path) -> dict:
    if not baseline_path.exists():
        return {"modules": {}}
    with baseline_path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _save_baseline(baseline_path: Path, modules: dict[str, int], recorded_date: str) -> None:
    # page_budgets is a SIBLING data object to `modules` (added 2026-08-21) — carried
    # forward from whatever is already on disk rather than reset here, so an
    # --update-baseline run (a per-module maintenance action) can never silently drop
    # the page-total budgets this file also now holds. This function otherwise already
    # resets `_comment` to a generic line on every run (pre-existing behaviour, not
    # changed here) — page_budgets deliberately does NOT share that fate, because unlike
    # the comment prose it is load-bearing data `--page-budget` reads back.
    existing = _load_baseline(baseline_path)
    page_budgets = existing.get("page_budgets", {})
    data = {
        "_comment": [
            "Spec 38 (Motion System) FR-38-24 bundle-size budget baseline.",
            "These are MEASURED (gzip, bytes) build actuals recorded via --update-baseline "
            "— NOT the Spec 38 section 4.4 table (which is an ESTIMATE, see script docstring).",
            f"Last updated: {recorded_date}.",
        ],
        "recorded_date": recorded_date,
        "unit": "gzip-bytes",
        "page_budgets": page_budgets,
        "modules": dict(sorted(modules.items())),
    }
    with baseline_path.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)
        fh.write("\n")


class MotionRegistryParseError(Exception):
    """Raised when `MODULES` cannot be located/parsed in class-sgs-motion-registry.php.

    Same "must not pass vacuously" discipline as check-fx-list-drift.py: a parser that
    silently matched nothing would make --page-budget compare an empty module set
    against the budget and read PASS forever, exactly the failure mode this feature
    exists to close for D479's page allowance.
    """


def _parse_motion_registry_modules(registry_php_path: Path, floor: int = 10) -> dict[str, dict]:
    """Parse `class-sgs-motion-registry.php`'s `MODULES` const into
    `{module_id: {'path': str, 'deps': [module_id, ...]}}` — never a hand-copied
    duplicate of that dependency graph (this file's docstring's --PAGE-BUDGET section).

    `floor` defaults to 10 for the real registry (26 entries as of D555) but is
    lowered by `--self-test`'s synthetic 2-module fixture, which is deliberately
    minimal and would otherwise trip the vacuity floor meant for a reshaped REAL file.
    """
    if not registry_php_path.exists():
        raise MotionRegistryParseError(f"{registry_php_path} does not exist.")
    text = registry_php_path.read_text(encoding="utf-8")

    match = re.search(r"private\s+const\s+MODULES\s*=\s*array\s*\(", text)
    if match is None:
        raise MotionRegistryParseError(
            f"{registry_php_path}: could not locate `private const MODULES = array(`. "
            "It has been renamed or reshaped — --page-budget would silently walk an "
            "empty graph."
        )
    # Balanced paren scan from the opening '(' the match ends on.
    start = text.find("(", match.end() - 1)
    depth = 0
    end = None
    for index in range(start, len(text)):
        if text[index] == "(":
            depth += 1
        elif text[index] == ")":
            depth -= 1
            if depth == 0:
                end = index
                break
    if end is None:
        raise MotionRegistryParseError(f"{registry_php_path}: `MODULES` array is never closed.")
    body = text[start + 1:end]

    modules: dict[str, dict] = {}
    # Each top-level entry: 'id' => array( 'path' => '...', 'deps' => array( ... ) ),
    for entry_match in re.finditer(
        r"'(@sgs/[a-zA-Z0-9_-]+)'\s*=>\s*array\s*\(\s*"
        r"'path'\s*=>\s*'([^']+)'\s*,\s*"
        r"'deps'\s*=>\s*array\s*\(([^)]*)\)",
        body,
    ):
        module_id, path, deps_body = entry_match.groups()
        deps = re.findall(r"'(@sgs/[a-zA-Z0-9_-]+)'", deps_body)
        modules[module_id] = {"path": path, "deps": deps}

    if len(modules) < floor:
        raise MotionRegistryParseError(
            f"{registry_php_path}: parsed only {len(modules)} MODULES entr(y/ies), "
            f"expected at least {floor}. The construct has almost certainly been "
            "renamed or reshaped — fix the parser in check-motion-bundle-budget.py, do "
            "NOT lower this floor to make a thin parse pass."
        )
    return modules


def _resolve_transitive_modules(modules: dict[str, dict], entry_ids: tuple[str, ...]) -> set[str]:
    """Every module ID reachable from `entry_ids` by following `deps`, entries included.
    Cycle-safe (a `seen` set, not recursion) even though the registry's graph is a DAG
    in practice."""
    seen: set[str] = set()
    stack = list(entry_ids)
    while stack:
        module_id = stack.pop()
        if module_id in seen:
            continue
        seen.add(module_id)
        for dep in modules.get(module_id, {}).get("deps", []):
            if dep not in seen:
                stack.append(dep)
    return seen


def evaluate_page_budget(
    build_dir: Path,
    registry_php_path: Path,
    tier: str,
    budgets: dict[str, int],
    entry_modules: dict[str, tuple[str, ...]] = _TIER_ENTRY_MODULES,
    registry_floor: int = 10,
):
    """Sum the gzip bytes of every module a page using `tier` would pull.

    `build_dir` must be the `build/` directory itself; module paths in the registry
    (e.g. `build/vendor-modules/gsap-core.js`) are resolved against `build_dir.parent`
    — the same "plugin root" `build/` normally lives under — so a self-test can point
    both `registry_php_path` and `build_dir` at an isolated temp tree with no risk of
    ever touching the real plugin directory.

    Returns (total_bytes, per_module: dict[module_id, bytes], missing_modules: list[str],
    unknown_tier: bool, budget: int | None).
    `missing_modules` are resolved module IDs whose built file is absent — a page-budget
    total is meaningless (and fails closed, see main()) if any required module didn't
    actually build.
    """
    plugin_root = build_dir.parent

    if tier not in entry_modules or tier not in budgets:
        return 0, {}, [], True, None

    modules = _parse_motion_registry_modules(registry_php_path, floor=registry_floor)
    resolved = _resolve_transitive_modules(modules, entry_modules[tier])

    per_module: dict[str, int] = {}
    missing: list[str] = []
    for module_id in sorted(resolved):
        entry = modules.get(module_id)
        if entry is None:
            # An entry module (or a dep) named in _TIER_ENTRY_MODULES/deps that the
            # registry itself does not define — a real drift, not a build gap.
            missing.append(module_id)
            continue
        module_path = plugin_root / entry["path"]
        if not module_path.exists():
            missing.append(module_id)
            continue
        per_module[module_id] = _gzip_size(module_path)

    total = sum(per_module.values())
    return total, per_module, missing, False, budgets[tier]


def evaluate(build_dir: Path, baseline_path: Path):
    """Core evaluation logic, reusable by --check, report mode, and --self-test.

    Returns (rows, breaches, missing_build, missing_baselined_modules) where:
      rows      — list of dicts: module, actual, baseline, delta_pct, verdict
      breaches  — subset of rows where verdict == 'BREACH'
      missing_build — True if build_dir does not exist at all
      missing_baselined_modules — baselined module paths absent from the build output
    """
    if not build_dir.is_dir():
        return [], [], True, []

    baseline = _load_baseline(baseline_path)
    baseline_modules: dict[str, int] = baseline.get("modules", {})

    present = _iter_modules(build_dir)
    present_keys = {p.as_posix() for p in present}

    rows = []
    for rel_path in present:
        key = rel_path.as_posix()
        actual = _gzip_size(build_dir / rel_path)
        baseline_size = baseline_modules.get(key)

        if baseline_size is None:
            rows.append({
                "module": key,
                "actual": actual,
                "baseline": None,
                "delta_pct": None,
                "verdict": "UNBASELINED",
            })
            continue

        if baseline_size <= 0:
            delta_pct = float("inf") if actual > 0 else 0.0
        else:
            delta_pct = ((actual - baseline_size) / baseline_size) * 100.0

        verdict = "BREACH" if delta_pct > _BREACH_THRESHOLD_PCT else "OK"
        rows.append({
            "module": key,
            "actual": actual,
            "baseline": baseline_size,
            "delta_pct": delta_pct,
            "verdict": verdict,
        })

    # A baselined module that has vanished from the build output is itself a finding —
    # a gate that only checks present modules would pass vacuously if a Tier G bundle
    # silently stopped being built (e.g. a webpack externals misconfiguration).
    missing_baselined = sorted(set(baseline_modules) - present_keys)

    breaches = [r for r in rows if r["verdict"] == "BREACH"]
    rows.sort(key=lambda r: r["module"])
    return rows, breaches, False, missing_baselined


def _print_report(rows, missing_build, missing_baselined, build_dir: Path) -> None:
    print("[motion-bundle-budget] Spec 38 FR-38-24 — Tier G bundle-size budget report")
    print(f"[motion-bundle-budget] build dir: {build_dir}")

    if missing_build:
        print(
            "[motion-bundle-budget] BUILD DIRECTORY MISSING — cannot measure any module. "
            "Run `npm run build` first."
        )
        return

    if not rows:
        print(
            "[motion-bundle-budget] No Tier G modules found under "
            f"{', '.join(_WATCHED_SUBDIRS)} — nothing to measure."
        )

    for r in rows:
        if r["verdict"] == "UNBASELINED":
            print(
                f"  UNBASELINED  {r['module']}: {r['actual']} bytes gzip "
                "(no baseline entry — run --update-baseline once this is a deliberate build)"
            )
        else:
            sign = "+" if r["delta_pct"] >= 0 else ""
            print(
                f"  {r['verdict']:<10} {r['module']}: actual={r['actual']} "
                f"baseline={r['baseline']} delta={sign}{r['delta_pct']:.1f}%"
            )

    if missing_baselined:
        print()
        print("[motion-bundle-budget] BASELINED MODULES MISSING FROM BUILD OUTPUT:")
        for key in missing_baselined:
            print(f"  MISSING    {key}: has a baseline entry but was not found in the build.")


def _run_page_budget(tier: str) -> int:
    """`--page-budget TIER` against the real tree. See evaluate_page_budget()'s own
    docstring + this file's --PAGE-BUDGET section for the mechanism."""
    baseline = _load_baseline(_BASELINE_PATH)
    budgets: dict[str, int] = baseline.get("page_budgets", {})

    if tier not in _TIER_ENTRY_MODULES or tier not in budgets:
        known = sorted(set(_TIER_ENTRY_MODULES) & set(budgets))
        print(
            f"[motion-bundle-budget --page-budget] GATE FAILED — unknown tier '{tier}'. "
            f"Known tiers (declared in BOTH _TIER_ENTRY_MODULES here and "
            f"page_budgets in {_BASELINE_PATH.name}): {', '.join(known) or '(none)'}."
        )
        return 1

    try:
        total, per_module, missing, unknown_tier, budget = evaluate_page_budget(
            _BUILD_DIR, _MOTION_REGISTRY_PHP, tier, budgets
        )
    except MotionRegistryParseError as exc:
        print(f"\n[motion-bundle-budget --page-budget] GATE FAILED — {exc}")
        return 1

    print(f"[motion-bundle-budget --page-budget] tier '{tier}' — resolved module graph:")
    for module_id in sorted(per_module):
        print(f"    {module_id}: {per_module[module_id]} bytes gzip")
    if missing:
        print("[motion-bundle-budget --page-budget] MISSING (resolved but not found in "
              f"the build output or the registry): {', '.join(sorted(missing))}")
        print(
            "\n[motion-bundle-budget --page-budget] GATE FAILED — a resolved module is "
            "missing; the page total below would be an undercount, so this fails closed "
            "rather than reporting a false PASS. Run `npm run build` first."
        )
        return 1

    verdict = "BREACH" if total > budget else "OK"
    print(
        f"[motion-bundle-budget --page-budget] total: {total} bytes gzip / budget: "
        f"{budget} bytes gzip — {verdict}"
    )
    if verdict == "BREACH":
        print(
            f"\n[motion-bundle-budget --page-budget] GATE FAILED — tier '{tier}' page "
            f"total ({total} bytes) exceeds its budget ({budget} bytes) by "
            f"{total - budget} bytes."
        )
        return 1
    print(f"\n[motion-bundle-budget --page-budget] GATE PASSED — tier '{tier}' within budget.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Tier G (GSAP) bundle-size budget gate — fails when a Tier G module's "
            "gzip size exceeds its recorded Wave A baseline by more than 20% "
            "(Spec 38 §4.4 / FR-38-24)."
        )
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", default=False,
                       help="Gating mode: exit 1 on any breach, missing build dir, or "
                            "a baselined module missing from the build output.")
    mode.add_argument("--update-baseline", action="store_true", default=False,
                       help="Re-record current actuals as the baseline and exit 0.")
    mode.add_argument("--self-test", action="store_true", default=False,
                       help="Prove the gate can fail: synthesise an oversized module, "
                            "confirm --check catches it, then clean up.")
    mode.add_argument("--page-budget", metavar="TIER", default=None,
                       help="Gating mode: sum the gzip bytes of every module a page "
                            "using TIER would pull (walking class-sgs-motion-registry."
                            "php's MODULES dependency graph) and exit 1 if the total "
                            "exceeds motion-bundle-baseline.json's page_budgets[TIER] "
                            "(D479's named Tier W page allowance).")
    args = parser.parse_args()

    if args.self_test:
        return _self_test()

    if args.page_budget:
        return _run_page_budget(args.page_budget)

    if args.update_baseline:
        rows, _breaches, missing_build, _missing_baselined = evaluate(_BUILD_DIR, _BASELINE_PATH)
        if missing_build:
            print(
                "[motion-bundle-budget] Cannot --update-baseline — build directory "
                f"missing: {_BUILD_DIR}. Run `npm run build` first."
            )
            return 1
        new_modules = {r["module"]: r["actual"] for r in rows}
        import datetime
        _save_baseline(_BASELINE_PATH, new_modules, datetime.date.today().isoformat())
        print(
            f"[motion-bundle-budget] Baseline updated — {len(new_modules)} module(s) "
            f"recorded to {_BASELINE_PATH}"
        )
        return 0

    rows, breaches, missing_build, missing_baselined = evaluate(_BUILD_DIR, _BASELINE_PATH)
    _print_report(rows, missing_build, missing_baselined, _BUILD_DIR)

    if not args.check:
        return 0

    # --check (gating mode)
    if missing_build:
        print(
            "\n[motion-bundle-budget] GATE FAILED — build directory missing. A gate "
            "whose input vanished has verified nothing; failing closed rather than "
            "passing vacuously."
        )
        return 1

    if missing_baselined:
        print(
            "\n[motion-bundle-budget] GATE FAILED — "
            f"{len(missing_baselined)} baselined module(s) missing from the build "
            "output (see MISSING list above)."
        )
        return 1

    if breaches:
        print(f"\n[motion-bundle-budget] GATE FAILED — {len(breaches)} module(s) breached the 20% budget.")
        return 1

    print("\n[motion-bundle-budget] GATE PASSED — all modules within budget.")
    return 0


def _self_test() -> int:
    """Prove the gate can actually fail. Builds a throwaway temp build/ tree (never
    touches the real build/ directory), synthesises one oversized module against a
    synthetic baseline, and confirms --check-equivalent evaluate() reports BREACH.
    Also proves the missing-build-dir and missing-baselined-module fail-closed paths.
    """
    ok = True
    tmp_root = Path(tempfile.mkdtemp(prefix="motion-bundle-selftest-"))
    try:
        # --- Case 1: missing build dir must fail closed, never pass vacuously.
        nonexistent = tmp_root / "does-not-exist"
        rows, breaches, missing_build, missing_baselined = evaluate(nonexistent, _BASELINE_PATH)
        if not missing_build:
            print("[motion-bundle-budget --self-test] FAIL — missing build dir was not detected as missing.")
            ok = False
        else:
            print("[motion-bundle-budget --self-test] missing-build-dir case: correctly flagged as missing — OK")

        # --- Case 2: a module well within budget must read OK.
        fake_build = tmp_root / "build"
        vendor_dir = fake_build / "vendor-modules"
        vendor_dir.mkdir(parents=True)
        small_module = vendor_dir / "gsap-core.js"
        small_module.write_bytes(b"/* tiny */" * 10)

        fake_baseline = tmp_root / "baseline.json"
        baseline_size = _gzip_size(small_module)
        _save_baseline(fake_baseline, {"vendor-modules/gsap-core.js": baseline_size}, "2026-07-29")

        rows, breaches, missing_build, missing_baselined = evaluate(fake_build, fake_baseline)
        if breaches:
            print("[motion-bundle-budget --self-test] FAIL — an unchanged module reported a false BREACH.")
            ok = False
        else:
            print("[motion-bundle-budget --self-test] unchanged-module case: 0 breaches — OK")

        # --- Case 3: inject an oversized module (>20% bigger) and confirm it's caught.
        # Pad with non-repeating content so gzip can't shrink it back under budget.
        import os
        oversized_payload = os.urandom(int(baseline_size * 2) + 4096)
        small_module.write_bytes(oversized_payload)

        rows, breaches, missing_build, missing_baselined = evaluate(fake_build, fake_baseline)
        target = [r for r in rows if r["module"] == "vendor-modules/gsap-core.js"]
        if not target or target[0]["verdict"] != "BREACH":
            print(
                "[motion-bundle-budget --self-test] FAIL — the gate did NOT catch an "
                "injected oversized module. This gate would read green forever."
            )
            ok = False
        else:
            print(
                f"[motion-bundle-budget --self-test] injected-breach case: caught "
                f"(+{target[0]['delta_pct']:.1f}%, threshold {_BREACH_THRESHOLD_PCT}%) — OK"
            )
        if not breaches:
            print("[motion-bundle-budget --self-test] FAIL — breach list empty despite a BREACH verdict.")
            ok = False

        # --- Case 4: a baselined module missing from the build output must fail closed.
        small_module.unlink()
        rows, breaches, missing_build, missing_baselined = evaluate(fake_build, fake_baseline)
        if "vendor-modules/gsap-core.js" not in missing_baselined:
            print(
                "[motion-bundle-budget --self-test] FAIL — a baselined module that "
                "vanished from the build output was not flagged as missing."
            )
            ok = False
        else:
            print("[motion-bundle-budget --self-test] vanished-module case: correctly flagged as missing — OK")

        # --- Case 5: --page-budget must catch an over-budget page total.
        # Synthesises an isolated registry.php + build tree (never the real ones) with a
        # tiny two-module chain (an entry depending on one other module) and a budget the
        # combined actual size is made to exceed — proving the gate can fail before
        # trusting that it enforces D479's real 120KB allowance.
        page_root = tmp_root / "page-budget"
        page_includes = page_root / "includes"
        page_build = page_root / "build" / "vendor-modules"
        page_includes.mkdir(parents=True)
        page_build.mkdir(parents=True)

        registry_php = page_includes / "class-sgs-motion-registry.php"
        registry_php.write_text(
            "<?php\n"
            "class SGS_Motion_Registry {\n"
            "\tprivate const MODULES = array(\n"
            "\t\t'@sgs/selftest-base' => array(\n"
            "\t\t\t'path' => 'build/vendor-modules/selftest-base.js',\n"
            "\t\t\t'deps' => array(),\n"
            "\t\t),\n"
            "\t\t'@sgs/selftest-entry' => array(\n"
            "\t\t\t'path' => 'build/vendor-modules/selftest-entry.js',\n"
            "\t\t\t'deps' => array( '@sgs/selftest-base' ),\n"
            "\t\t),\n"
            "\t);\n"
            "}\n",
            encoding="utf-8",
        )
        (page_build / "selftest-base.js").write_bytes(b"/* base */" * 20)
        (page_build / "selftest-entry.js").write_bytes(b"/* entry */" * 20)

        test_entry_modules = {"selftest-tier": ("@sgs/selftest-entry",)}
        base_actual = _gzip_size(page_build / "selftest-base.js")
        entry_actual = _gzip_size(page_build / "selftest-entry.js")
        combined_actual = base_actual + entry_actual

        # 5a — budget comfortably above the combined actual must read OK.
        generous_budgets = {"selftest-tier": combined_actual + 10_000}
        total, per_module, missing, unknown_tier, budget = evaluate_page_budget(
            page_root / "build", registry_php, "selftest-tier", generous_budgets,
            entry_modules=test_entry_modules, registry_floor=2,
        )
        if unknown_tier or missing or total > budget:
            print(
                "[motion-bundle-budget --self-test] FAIL — page-budget under-budget "
                f"case misfired (unknown_tier={unknown_tier}, missing={missing}, "
                f"total={total}, budget={budget})."
            )
            ok = False
        elif set(per_module) != {"@sgs/selftest-base", "@sgs/selftest-entry"}:
            print(
                "[motion-bundle-budget --self-test] FAIL — page-budget resolved the "
                f"wrong module set: {sorted(per_module)} (expected both selftest "
                "modules — the dependency walk did not include the transitive dep)."
            )
            ok = False
        else:
            print(
                f"[motion-bundle-budget --self-test] page-budget under-budget case: "
                f"{total} <= {budget} — OK"
            )

        # 5b — budget BELOW the combined actual must read BREACH. This is the case that
        # actually proves the gate can fail: D479's allowance is meaningless if this
        # gate can only ever report PASS.
        tight_budgets = {"selftest-tier": combined_actual - 1}
        total, per_module, missing, unknown_tier, budget = evaluate_page_budget(
            page_root / "build", registry_php, "selftest-tier", tight_budgets,
            entry_modules=test_entry_modules, registry_floor=2,
        )
        if unknown_tier or missing or total <= budget:
            print(
                "[motion-bundle-budget --self-test] FAIL — page-budget did NOT catch "
                f"an over-budget page total (total={total}, budget={budget}). This "
                "mode would read green forever."
            )
            ok = False
        else:
            print(
                f"[motion-bundle-budget --self-test] page-budget over-budget case: "
                f"caught ({total} > {budget}) — OK"
            )

        # 5c — a resolved-but-missing module must fail closed, not undercount silently.
        (page_build / "selftest-base.js").unlink()
        total, per_module, missing, unknown_tier, budget = evaluate_page_budget(
            page_root / "build", registry_php, "selftest-tier", generous_budgets,
            entry_modules=test_entry_modules, registry_floor=2,
        )
        if "@sgs/selftest-base" not in missing:
            print(
                "[motion-bundle-budget --self-test] FAIL — page-budget did not flag a "
                "resolved-but-unbuilt module as missing; a silent undercount would "
                "have reported a false PASS."
            )
            ok = False
        else:
            print(
                "[motion-bundle-budget --self-test] page-budget missing-module case: "
                "correctly flagged as missing — OK"
            )

    finally:
        shutil.rmtree(tmp_root, ignore_errors=True)
        # Never touches the real build/ or baseline — confirm no leakage.
        if not _BUILD_DIR.exists() or True:
            pass  # real build dir untouched by construction (only tmp_root was written to)

    if ok:
        print("[motion-bundle-budget --self-test] PASS — gate can fail, and correctly detects each case.")
        return 0
    print("[motion-bundle-budget --self-test] FAIL — see above.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
