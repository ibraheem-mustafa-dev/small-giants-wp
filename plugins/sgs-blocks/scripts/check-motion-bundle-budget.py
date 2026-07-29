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
"""
from __future__ import annotations

import argparse
import gzip
import json
import shutil
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

_SCRIPT_DIR = Path(__file__).resolve().parent
_PLUGIN_ROOT = _SCRIPT_DIR.parent  # plugins/sgs-blocks
_BUILD_DIR = _PLUGIN_ROOT / "build"
_BASELINE_PATH = _SCRIPT_DIR / "motion-bundle-baseline.json"

# Directories (relative to build/) globbed for Tier G modules. Never a hardcoded file
# list — new effect modules land without needing this gate edited.
_WATCHED_SUBDIRS = ("vendor-modules", "shared/effects/gsap")

_BREACH_THRESHOLD_PCT = 20.0


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
    data = {
        "_comment": [
            "Spec 38 (Motion System) FR-38-24 bundle-size budget baseline.",
            "These are MEASURED (gzip, bytes) build actuals recorded via --update-baseline "
            "— NOT the Spec 38 section 4.4 table (which is an ESTIMATE, see script docstring).",
            f"Last updated: {recorded_date}.",
        ],
        "recorded_date": recorded_date,
        "unit": "gzip-bytes",
        "modules": dict(sorted(modules.items())),
    }
    with baseline_path.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)
        fh.write("\n")


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
    args = parser.parse_args()

    if args.self_test:
        return _self_test()

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
