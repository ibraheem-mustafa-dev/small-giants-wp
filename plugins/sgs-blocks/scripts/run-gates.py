#!/usr/bin/env python3
"""
run-gates.py — the consolidated gate runner.

WHY THIS EXISTS
---------------
`prebuild` used to be 61 `&&`-joined commands in one 3,353-character
`package.json` string. Because `&&` is FAIL-FAST, a change tripping five gates
showed you ONE failure per build — five builds to see five defects. That serial
loop, not the gates themselves, was the cost.

This runner executes EVERY gate in a tier, collects EVERY failure, and prints
one consolidated report. One build -> all defects -> one fix pass.

It also replaces a string that could not be diffed, blamed per gate, or
reordered. The roster now lives in `scripts/gates.json`, one record per gate:
`{id, cmd, tier, added_D, added_commit, budget_ms, order}`.

TIERS
-----
    fast    every cheap gate; runs on every build via `prebuild`
    full    the heavyweights; runs pre-deploy via `npm run gate:full`, which
            `build-deploy.py` invokes as `step_gate_full()`

⛔ `full` is NOT optional and NOT weaker. Every gate that blocked before still
blocks — the only change is WHEN. A gate moved to `full` without a matching
call in `build-deploy.py` would be enforcement laundering, so
`--assert-wired` exists to prove that call is present, and the deploy runs
`--tier full` before it ships anything.

⛔ Generators (`clean:build`, `generate-icons`, `generate-extension-attributes`,
`run-motion-fx-generators`, `consistency/build-roster.py`) are deliberately NOT
in here. They produce inputs the gates read, they must run in order, and a
failing generator must stop the build immediately rather than being collected
alongside gate failures. They stay as a serial `&&` chain in `prebuild`.

MODEL
-----
Shape copied from `scripts/consistency/run-consistency-gates.py` — same
blocking/consolidated-banner pattern, same `__file__`-relative path resolution
so the caller's cwd never matters.

USAGE
-----
    python scripts/run-gates.py --tier fast        # every build
    python scripts/run-gates.py --tier full        # pre-deploy
    python scripts/run-gates.py --tier all         # everything
    python scripts/run-gates.py --time             # measure, write budget_ms
    python scripts/run-gates.py --list             # print the roster
    python scripts/run-gates.py --only <id> [...]  # re-run named gates
    python scripts/run-gates.py --assert-wired     # prove build-deploy calls full
    python scripts/run-gates.py --self-test        # prove the runner can fail

UK English throughout.
"""
from __future__ import annotations

import argparse
import json
import re
import shlex
import subprocess
import sys
import time
from pathlib import Path

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths — resolved from this file, so cwd never matters.
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent        # plugins/sgs-blocks/scripts/
_PLUGIN_DIR = _HERE.parent                     # plugins/sgs-blocks/
_GATES_JSON = _HERE / "gates.json"
_BUILD_DEPLOY = _HERE / "build-deploy.py"

_RULE = "=" * 78
_THIN = "-" * 78

# Only interpreters we are prepared to launch. `npm` is deliberately absent:
# it is a shell shim on Windows and every command it would have run is a
# generator that stays in `prebuild`.
_ALLOWED_EXE = {"python", "node"}

# Every command in the chain carries one of these. `generator` records a
# command that RUNS IN `prebuild`, not here — it is in the roster so the whole
# chain stays diffable in one file, but this runner never executes it.
_TIERS = ("generator", "fast", "full")


# ---------------------------------------------------------------------------
# Roster
# ---------------------------------------------------------------------------
def load_gates() -> list[dict]:
    if not _GATES_JSON.exists():
        sys.exit(f"[run-gates] FATAL: roster missing: {_GATES_JSON}")
    gates = json.loads(_GATES_JSON.read_text(encoding="utf-8"))

    ids = [g["id"] for g in gates]
    dupes = sorted({i for i in ids if ids.count(i) > 1})
    if dupes:
        sys.exit(f"[run-gates] FATAL: duplicate gate ids in roster: {dupes}")

    # ⛔ A `--check` in tier `generator` runs on NO tier: select() excludes
    # generators from fast, full and all. It would print in gate:list and pass
    # --assert-wired (which only inspects `full`), so it looks wired and gates
    # nothing. Changing one word in Step 8's template produced that. Refuse it.
    laundered = [g["id"] for g in gates
                 if g.get("tier") == "generator" and "--check" in g.get("cmd", "")]
    if laundered:
        sys.exit(
            "[run-gates] FATAL: generator-tier record(s) carrying `--check`: "
            f"{laundered}. A generator produces inputs; it never gates. Move it "
            "to `fast` or `full`, or drop the --check."
        )

    untiered = [g["id"] for g in gates if g.get("tier") not in _TIERS]
    if untiered:
        # A gate with no tier runs on no build. Fail closed rather than skip:
        # silently dropping a gate is exactly the laundering this replaces.
        sys.exit(
            "[run-gates] FATAL: gate(s) with no tier — they would run on no "
            f"build: {untiered}"
        )
    return sorted(gates, key=lambda g: g.get("order", 0))


def select(gates: list[dict], tier: str, only: list[str] | None) -> list[dict]:
    if only:
        known = {g["id"] for g in gates}
        unknown = [o for o in only if o not in known]
        if unknown:
            sys.exit(f"[run-gates] FATAL: unknown gate id(s): {unknown}")
        return [g for g in gates if g["id"] in only]
    if tier == "all":
        # Never the generators: they belong to `prebuild`, run in order, and
        # must stop the build outright rather than be collected.
        return [g for g in gates if g["tier"] != "generator"]
    return [g for g in gates if g["tier"] == tier]


# ---------------------------------------------------------------------------
# Execution
# ---------------------------------------------------------------------------
def run_one(gate: dict) -> tuple[int, str, float]:
    """Run one gate from the PLUGIN dir. Returns (exit_code, output, seconds)."""
    argv = shlex.split(gate["cmd"], posix=True)
    if not argv or argv[0] not in _ALLOWED_EXE:
        return 2, f"[run-gates] refusing to run unrecognised command: {gate['cmd']}", 0.0

    started = time.perf_counter()
    try:
        proc = subprocess.run(
            argv,
            cwd=str(_PLUGIN_DIR),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        code, out, errtext = proc.returncode, proc.stdout, proc.stderr
    except FileNotFoundError as exc:
        return 2, f"[run-gates] executable not found: {exc}", time.perf_counter() - started
    except OSError as exc:
        return 2, f"[run-gates] failed to launch: {exc}", time.perf_counter() - started

    elapsed = time.perf_counter() - started
    if errtext:
        out += ("\n" if out and not out.endswith("\n") else "") + errtext
    return code, out, elapsed


def execute(gates: list[dict], label: str, verbose: bool) -> tuple[list[dict], float]:
    """Run every gate. Never short-circuits — that is the entire point."""
    print(_RULE)
    print(f"RUNNING {len(gates)} gate(s) — {label}")
    print(_RULE)

    results: list[dict] = []
    total = 0.0
    for n, gate in enumerate(gates, 1):
        code, out, secs = run_one(gate)
        total += secs
        results.append({"gate": gate, "code": code, "output": out, "secs": secs})
        mark = "ok  " if code == 0 else "FAIL"
        print(f"  [{n:>2}/{len(gates)}] {mark} {gate['id']:<42} {secs:6.2f}s")
        if verbose and out.strip():
            print("\n".join("        " + ln for ln in out.rstrip().splitlines()))
    return results, total


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
def report(results: list[dict], total: float, label: str) -> int:
    failures = [r for r in results if r["code"] != 0]

    print()
    print(_RULE)
    if not failures:
        print(f"PASS — all {len(results)} gate(s) passed  ·  {label}  ·  {total:.1f}s")
        print(_RULE)
        return 0

    print(f"FAIL — {len(failures)} of {len(results)} gate(s) failed  ·  {label}  ·  {total:.1f}s")
    print(_RULE)
    print("Every gate ran. This is the COMPLETE list of failures, not the first one.")
    print()
    for r in failures:
        print(f"  - {r['gate']['id']}  (exit {r['code']}, {r['secs']:.2f}s)")
        print(f"      {r['gate']['cmd']}")
    print()

    for r in failures:
        print(_THIN)
        print(f"OUTPUT — {r['gate']['id']}  (exit {r['code']})")
        print(_THIN)
        text = r["output"].rstrip() or "(no output)"
        print(text)
        print()

    print(_RULE)
    print(f"FAIL — {len(failures)} of {len(results)} gate(s) failed. Fix all of them, then rebuild once.")
    print(_RULE)
    return 1


# ---------------------------------------------------------------------------
# --time : measure, then write budget_ms back
# ---------------------------------------------------------------------------
def do_time(write: bool) -> int:
    gates = [g for g in load_gates() if g["tier"] != "generator"]
    results, total = execute(gates, "TIMING PASS (all tiers)", verbose=False)

    ranked = sorted(results, key=lambda r: r["secs"], reverse=True)
    print()
    print(_RULE)
    print(f"TIMING — {len(results)} gates, {total:.1f}s total")
    print(_RULE)
    cumulative = 0.0
    for r in ranked:
        cumulative += r["secs"]
        share = (r["secs"] / total * 100) if total else 0
        print(f"  {r['secs']:7.2f}s  {share:5.1f}%  {cumulative / total * 100 if total else 0:5.1f}% cum  "
              f"{r['gate']['tier']:<5} {r['gate']['id']}")

    for tier in ("fast", "full"):
        sub = [r for r in results if r["gate"]["tier"] == tier]
        print(f"\n  tier {tier:<5} {len(sub):>2} gates  {sum(r['secs'] for r in sub):7.2f}s")

    if write:
        raw = json.loads(_GATES_JSON.read_text(encoding="utf-8"))
        by_id = {r["gate"]["id"]: r for r in results}
        for g in raw:
            if g["id"] in by_id:
                g["budget_ms"] = round(by_id[g["id"]]["secs"] * 1000)
        _GATES_JSON.write_text(json.dumps(raw, indent=2) + "\n", encoding="utf-8")
        print(f"\n[run-gates] budget_ms written from THIS run into {_GATES_JSON.name}")

    failed = [r for r in results if r["code"] != 0]
    if failed:
        print(f"\n[run-gates] note: {len(failed)} gate(s) failed during timing: "
              f"{[r['gate']['id'] for r in failed]}")
    return 0


# ---------------------------------------------------------------------------
# --assert-wired : a gate moved to `full` that nothing calls is laundering
# ---------------------------------------------------------------------------
def do_assert_wired() -> int:
    gates = load_gates()
    full = [g for g in gates if g["tier"] == "full"]
    print(_RULE)
    print("ASSERT-WIRED — is the `full` tier actually reachable?")
    print(_RULE)
    print(f"  gates in tier full : {len(full)}")

    if not _BUILD_DEPLOY.exists():
        print(f"  FAIL — {_BUILD_DEPLOY.name} not found")
        return 1

    text = _BUILD_DEPLOY.read_text(encoding="utf-8", errors="replace")
    calls = re.search(r'["\']gate:full["\']', text) or re.search(r"--tier[\"'],\s*[\"']full", text)
    step = re.search(r"def\s+step_gate_full\b", text)

    print(f"  build-deploy.py invokes gate:full : {'yes' if calls else 'NO'}")
    print(f"  build-deploy.py defines step_gate_full() : {'yes' if step else 'NO'}")

    pkg = json.loads((_PLUGIN_DIR / "package.json").read_text(encoding="utf-8"))["scripts"]
    has_alias = "gate:full" in pkg

    # Generators run from the `prebuild` STRING, not from this roster. A
    # generator record whose cmd is absent from that string is unreachable —
    # the same laundering as an unrun `full`, one tier over.
    prebuild = pkg.get("prebuild", "")
    orphan_gen = [g["id"] for g in gates
                  if g["tier"] == "generator" and g["cmd"] not in prebuild]
    print(f"  generator records reachable from prebuild : "
          f"{'yes' if not orphan_gen else 'NO — ' + str(orphan_gen)}")
    print(f"  package.json defines gate:full : {'yes' if has_alias else 'NO'}")

    if orphan_gen:
        print()
        print(f"  FAIL — generator record(s) not in the prebuild chain: {orphan_gen}")
        print("         They run on no build. That is the same laundering as an")
        print("         unrun `full` tier, one tier over.")
        print(_RULE)
        return 1
    if full and not (calls and step and has_alias):
        print()
        print("  FAIL — gates are parked in tier `full` but nothing runs that tier.")
        print("         That is enforcement laundering, not a tier split.")
        print(_RULE)
        return 1
    print()
    print("  PASS — tier `full` is reachable from the deploy path.")
    print(_RULE)
    return 0


# ---------------------------------------------------------------------------
# --self-test : a runner that has never been seen to fail is not a gate
# ---------------------------------------------------------------------------
_SELF_TEST_PASS = "import sys; sys.exit(0)"
_SELF_TEST_FAIL = "import sys; print('DELIBERATE FAILURE'); sys.exit(1)"


def do_self_test() -> int:
    failures: list[str] = []

    def check(name: str, cond: bool, detail: str = "") -> None:
        print(f"  {'ok  ' if cond else 'FAIL'} {name}" + (f" — {detail}" if detail and not cond else ""))
        if not cond:
            failures.append(name)

    print(_RULE)
    print("SELF-TEST")
    print(_RULE)

    # 1. The real roster loads, is complete, and every gate is tiered.
    try:
        gates = load_gates()
        check("roster loads and every gate is tiered", True)
    except SystemExit as exc:
        print(f"  FAIL roster: {exc}")
        return 1

    # ⛔ This used to assert `len(gates) == 61`. gates.json reached 63 and the
    # assertion went RED — and because gate:selftest sits in no tier, nobody ran
    # it, so a self-test failed silently for the life of two commits. A hardcoded
    # count in a test rots exactly like a hardcoded count in prose. Derive.
    runnable = [g for g in gates if g["tier"] != "generator"]
    check("generators are recorded but excluded from `all`",
          len(select(gates, "all", None)) == len(runnable) < len(gates))

    missing = [g["id"] for g in gates
               if g["tier"] != "generator"
               and (m := re.search(r"(?:\.\./)*scripts/[\w\-/\.]+\.(?:py|js)", g["cmd"]))
               and not (_PLUGIN_DIR / m.group(0)).resolve().exists()]
    check("every gated script exists on disk", not missing, str(missing))

    pkg_scripts = json.loads((_PLUGIN_DIR / "package.json").read_text(encoding="utf-8"))["scripts"]
    orphan_gen = [g["id"] for g in gates
                  if g["tier"] == "generator" and g["cmd"] not in pkg_scripts.get("prebuild", "")]
    check("every generator is reachable from prebuild", not orphan_gen, str(orphan_gen))

    laundered = [g["id"] for g in gates
                 if g["tier"] == "generator" and "--check" in g["cmd"]]
    check("no --check gate is parked in tier generator", not laundered, str(laundered))
    check("every gate has a cmd", all(g.get("cmd") for g in gates))
    check("ids are unique", len({g["id"] for g in gates}) == len(gates))

    # 2. POSITIVE CONTROL — a passing command is reported as passing.
    code, _, _ = run_one({"id": "_st_pass", "cmd": f'python -c "{_SELF_TEST_PASS}"'})
    check("positive control: exit 0 is seen as pass", code == 0, f"got exit {code}")

    # 3. NEGATIVE CONTROL — a failing command is reported as failing, and its
    #    output is captured. Without this, a runner that stopped running
    #    anything at all would report PASS on an empty set, indistinguishable
    #    from a clean tree.
    code, out, _ = run_one({"id": "_st_fail", "cmd": f'python -c "{_SELF_TEST_FAIL}"'})
    check("negative control: exit 1 is seen as fail", code == 1, f"got exit {code}")
    check("negative control: output is captured", "DELIBERATE FAILURE" in out)

    # 4. The report must return 1 when ANY gate failed, and must list EVERY
    #    failure rather than stopping at the first.
    fake = [
        {"gate": {"id": "a", "cmd": "x"}, "code": 0, "output": "", "secs": 0.1},
        {"gate": {"id": "b", "cmd": "y"}, "code": 1, "output": "boom-b", "secs": 0.1},
        {"gate": {"id": "c", "cmd": "z"}, "code": 1, "output": "boom-c", "secs": 0.1},
    ]
    import io
    import contextlib
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        rc = report(fake, 0.3, "self-test")
    text = buf.getvalue()
    check("two simultaneous failures both reported", "boom-b" in text and "boom-c" in text)
    check("report exits 1 when any gate failed", rc == 1, f"got {rc}")
    check("report names the count", "2 of 3" in text)

    # 5. An unrecognised interpreter is refused, not shelled out blindly.
    code, out, _ = run_one({"id": "_st_bad", "cmd": "rm -rf /"})
    check("unrecognised command is refused", code == 2 and "refusing" in out)

    # 6. A gate with no tier fails the roster closed rather than being skipped.
    import tempfile
    import os
    global _GATES_JSON
    original = _GATES_JSON
    tmp = Path(tempfile.mkdtemp()) / "gates.json"
    tmp.write_text(json.dumps([{"id": "x", "cmd": "python -c pass", "tier": "bogus", "order": 0}]),
                   encoding="utf-8")
    _GATES_JSON = tmp
    try:
        load_gates()
        check("untiered gate fails closed", False, "load_gates accepted a null tier")
    except SystemExit:
        check("untiered gate fails closed", True)
    finally:
        _GATES_JSON = original
        try:
            os.unlink(tmp)
            os.rmdir(tmp.parent)
        except OSError:
            pass

    # 7. A record missing the optional `order` key must not crash --list.
    #    load_gates() tolerates it; do_list() must too, or the two disagree.
    import io as _io
    import contextlib as _ctx
    original2 = _GATES_JSON
    tmp2 = Path(tempfile.mkdtemp()) / "gates.json"
    tmp2.write_text(json.dumps([{"id": "no-order", "cmd": "python -c pass",
                                 "tier": "fast"}]), encoding="utf-8")
    _GATES_JSON = tmp2
    try:
        buf2 = _io.StringIO()
        with _ctx.redirect_stdout(buf2):
            rc2 = do_list()
        check("a record with no `order` does not crash --list", rc2 == 0)
    except Exception as exc:
        check("a record with no `order` does not crash --list", False, repr(exc))
    finally:
        _GATES_JSON = original2
        try:
            os.unlink(tmp2)
            os.rmdir(tmp2.parent)
        except OSError:
            pass

    print()
    print(_RULE)
    if failures:
        print(f"SELF-TEST FAIL — {len(failures)} assertion(s): {failures}")
        print(_RULE)
        return 1
    print("SELF-TEST PASS — all assertions, including both controls")
    print(_RULE)
    return 0


# ---------------------------------------------------------------------------
def do_list() -> int:
    gates = load_gates()
    print(f"{'#':>3}  {'tier':<5} {'id':<42} {'D':<7} {'budget':>8}")
    print(_THIN)
    for g in gates:
        ms = f"{g['budget_ms']}ms" if g.get("budget_ms") else "-"
        # .get(), not bracket: load_gates() already tolerates a missing `order`
        # (it sorts with g.get("order", 0)), so bracket access here made the two
        # disagree — a roster record written from the documented template, which
        # omitted `order`, crashed `npm run gate:list` with KeyError while the
        # runner itself ran it fine. Caught by an adversarial review, 2026-08-24.
        order = g.get("order")
        print(f"{'-' if order is None else order:>3}  {g['tier'] or '-':<5} "
              f"{g['id']:<42} {g.get('added_D') or '-':<7} {ms:>8}")
    for tier in ("fast", "full"):
        sub = [g for g in gates if g["tier"] == tier]
        budget = sum(g.get("budget_ms") or 0 for g in sub)
        print(f"\n  tier {tier:<5} {len(sub):>2} gates  {budget / 1000:.1f}s measured")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Consolidated SGS gate runner.")
    ap.add_argument("--tier", choices=("fast", "full", "all"), default="fast")
    ap.add_argument("--only", nargs="+", metavar="ID", help="run just these gate ids")
    ap.add_argument("--time", action="store_true", help="measure every gate, write budget_ms")
    ap.add_argument("--no-write", action="store_true", help="with --time, do not write budget_ms")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--assert-wired", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("-v", "--verbose", action="store_true", help="stream output of passing gates too")
    args = ap.parse_args()

    if args.self_test:
        return do_self_test()
    if args.list:
        return do_list()
    if args.assert_wired:
        return do_assert_wired()
    if args.time:
        return do_time(write=not args.no_write)

    gates = select(load_gates(), args.tier, args.only)
    if not gates:
        # An empty selection reporting PASS is the vacuity this runner must
        # never have: it is indistinguishable from every gate passing.
        print(f"[run-gates] FATAL: no gates selected (tier={args.tier}, only={args.only})")
        return 1

    label = f"tier: {args.tier}" if not args.only else f"only: {' '.join(args.only)}"
    results, total = execute(gates, label, args.verbose)
    return report(results, total, label)


if __name__ == "__main__":
    raise SystemExit(main())
