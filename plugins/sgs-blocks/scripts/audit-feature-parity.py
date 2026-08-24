#!/usr/bin/env python3
"""
Spec 35 UNIT A — feature-parity audit.

Every SGS block must expose AT LEAST the capabilities of the core block(s) it replaces
(memory `sgs-block-feature-parity-with-replaced-core`). A core capability with no SGS
equivalent = a GAP → closed OR recorded in feature-parity-exceptions.json with a Wave.

CORE-CAPABILITY SOURCE (PED-7, corrected 2026-07-19): the DB's `native_wp` block rows
(block_supports + block_attributes where source='native_wp') — ALREADY INGESTED at the
sandbox WP core version (WP 7.0.1). This is DB-first (R-31-1); `@wordpress/block-library`
is NOT installed in node_modules, so it was never a viable source. Re-ingest via /sgs-update
when WP 7.1 lands (19 Aug 2026).

MODES
-----
    python audit-feature-parity.py               # human report, always exits 0 (observational)
    python audit-feature-parity.py --json         # machine report to stdout, always exits 0
    python audit-feature-parity.py --check        # GATING mode: exits 1 on any unexplained
                                                   # finding (GAP / SOURCE-MISSING / an exception
                                                   # entry missing reason or wave), exits 0 only
                                                   # once every finding is closed or excepted.
    python audit-feature-parity.py --self-test    # proves the gate can fail. Never touches the
                                                   # real DB, roster, or exceptions file.

✅ WIRED INTO `prebuild` — `python scripts/audit-feature-parity.py --check` runs on every
   `npm run build` (see `plugins/sgs-blocks/package.json`'s `prebuild` chain). This line
   previously said "NOT YET WIRED" after the wiring step landed; corrected 2026-08-24 —
   verify against `package.json` before trusting a wiring claim in a header again.
"""
import json
import sqlite3
import sys
from pathlib import Path

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding is None or sys.stderr.encoding.lower() != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent
DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
ROSTER = HERE / "consistency" / "roster.json"
EXCEPTIONS = HERE / "feature-parity-exceptions.json"

SOURCE_MISSING_CAP = "(none)"  # sentinel capability key used when a replaced core block has
                                # zero native_wp rows in the DB — see load_exceptions() shape.


# Case-only / spelling normalisation so textColour==textColor (D338) and Colour==Color
# don't false-positive. NOT a capability-alias dict — genuinely-different-name equivalents
# are recorded (with a reason) in the exceptions file, human-reviewed, not hardcoded here.
def norm(name: str) -> str:
    return name.strip().lower().replace("colour", "color").replace("-", "").replace("_", "")


def q(conn, sql, params=()):
    return [dict(r) for r in conn.execute(sql, params).fetchall()]


def capabilities_from_db(conn, slug: str, source: str) -> set[str]:
    """A block's capability set = its attr names ∪ support names ∪ sgs sub-support flags."""
    caps: set[str] = set()
    for a in q(conn, "SELECT attr_name FROM block_attributes WHERE block_slug=? AND source=?", (slug, source)):
        caps.add(norm(a["attr_name"]))
    for s in q(conn, "SELECT support_name, support_value FROM block_supports WHERE block_slug=? AND source=?", (slug, source)):
        caps.add(norm(s["support_name"]))
        # unpack the custom `sgs` support object flags (imageControls, etc.)
        if s["support_name"] == "sgs" and s.get("support_value"):
            try:
                for k in json.loads(s["support_value"]).keys():
                    caps.add(norm(k))
            except (json.JSONDecodeError, AttributeError):
                pass
    return caps


def core_capabilities_named_from_db(conn, core_slug: str) -> dict[str, str]:
    """normalised-name -> original-name for a native_wp block's attrs+supports. Empty dict
    means the core block has zero native_wp rows (SOURCE-MISSING)."""
    named: dict[str, str] = {}
    for a in q(conn, "SELECT attr_name FROM block_attributes WHERE block_slug=? AND source='native_wp'", (core_slug,)):
        named[norm(a["attr_name"])] = a["attr_name"]
    for s in q(conn, "SELECT support_name FROM block_supports WHERE block_slug=? AND source='native_wp'", (core_slug,)):
        named[norm(s["support_name"])] = s["support_name"]
    return named


class ExceptionsMissing(Exception):
    """Raised when feature-parity-exceptions.json does not exist. Under --check this is
    ALWAYS a hard-fail regardless of gap count (a missing exceptions file means every single
    finding is silently unexplained, and reading {} would hide that)."""


def load_exceptions(check_mode: bool) -> dict:
    if not EXCEPTIONS.exists():
        if check_mode:
            raise ExceptionsMissing(str(EXCEPTIONS))
        print(f"[feature-parity] WARNING: exceptions file missing ({EXCEPTIONS}) — "
              f"every finding will read as unexplained. Report-only mode, not failing.",
              file=sys.stderr)
        return {}
    return json.loads(EXCEPTIONS.read_text(encoding="utf-8"))


def get_exception(exceptions: dict, block: str, replaces: str, cap_original: str) -> dict | None:
    """Look up an exception by the 3-tuple (block, replaces, capability), matching the
    capability by normalised name (same fold the audit itself uses)."""
    block_exc = exceptions.get(block, {})
    replaces_exc = block_exc.get(replaces, {})
    target = norm(cap_original)
    for k, v in replaces_exc.items():
        if norm(k) == target:
            return v
    return None


def evaluate(
    roster: list[dict],
    exceptions: dict,
    get_sgs_caps,
    get_core_caps_named,
) -> list[dict]:
    """Pure classification logic, independent of the DB connection so --self-test can drive
    it with synthetic in-memory data. Returns the full findings list (OK / FRAMEWORK-UNIVERSAL
    / EXCEPTION / GAP / SOURCE-MISSING / INVALID-EXCEPTION)."""
    fw = exceptions.get("_framework_universal", {})
    framework_universal = {norm(c) for c in fw.get("capabilities", [])}

    findings = []
    for b in roster:
        replaces = b.get("replaces")
        if not replaces:
            continue  # only blocks with a `replaces` map are in parity scope
        slug = b["slug"]
        sgs_caps = get_sgs_caps(slug)
        for core_slug in [c.strip() for c in replaces.split(",") if c.strip()]:
            core_caps_named = get_core_caps_named(core_slug)

            if not core_caps_named:
                # SOURCE-MISSING — the audit has no data to check parity against. This used
                # to be silently DISCARDED (never reached the `gaps` filter). Now it is a
                # first-class finding: it must be closed (DB re-ingested) or excepted like
                # any other, never invisible.
                exc = get_exception(exceptions, slug, core_slug, SOURCE_MISSING_CAP)
                if exc and exc.get("reason") and exc.get("wave"):
                    status = "EXCEPTION"
                elif exc is not None:
                    status = "INVALID-EXCEPTION"
                else:
                    status = "SOURCE-MISSING"
                findings.append({
                    "block": slug, "replaces": core_slug, "capability": SOURCE_MISSING_CAP,
                    "status": status,
                    "note": f"{core_slug} has no native_wp rows in the DB — re-run /sgs-update",
                })
                continue

            for ncap, orig in sorted(core_caps_named.items()):
                if ncap in sgs_caps:
                    status = "OK"
                elif ncap in framework_universal:
                    status = "FRAMEWORK-UNIVERSAL"
                else:
                    exc = get_exception(exceptions, slug, core_slug, orig)
                    if exc is None:
                        status = "GAP"
                    elif exc.get("reason") and exc.get("wave"):
                        status = "EXCEPTION"
                    else:
                        # Exception entry EXISTS but is missing reason/wave (or either is
                        # empty) — this used to silently count as suppressed (:85 only
                        # checked key presence). Now it counts as unexplained.
                        status = "INVALID-EXCEPTION"

                if status in ("GAP", "SOURCE-MISSING", "INVALID-EXCEPTION"):
                    findings.append({"block": slug, "replaces": core_slug,
                                      "capability": orig, "status": status})

    return findings


def unexplained(findings: list[dict]) -> list[dict]:
    return [f for f in findings if f["status"] in ("GAP", "SOURCE-MISSING", "INVALID-EXCEPTION")]


def _print_report(findings: list[dict], blocks_in_scope: int, as_json: bool):
    gaps = unexplained(findings)
    payload = {
        "_meta": {
            "audit": "feature-parity",
            "source": "sgs-framework.db native_wp rows (PED-7, WP 7.0.1)",
            "blocks_in_scope": blocks_in_scope,
            "unexplained_gaps": len(gaps),
        },
        "gaps": gaps,
    }
    if as_json:
        print(json.dumps(payload, indent=2))
        return payload

    print(f"Feature-parity audit — {blocks_in_scope} blocks in scope (have a `replaces` map)")
    print(f"UNEXPLAINED FINDINGS: {len(gaps)}  "
          f"(each must be closed OR added to feature-parity-exceptions.json with a reason+wave)\n")
    by_block: dict[str, list] = {}
    for g in gaps:
        by_block.setdefault(g["block"], []).append(g)
    for slug in sorted(by_block):
        caps = ", ".join(f"{g['capability']} (vs {g['replaces']}, {g['status']})" for g in by_block[slug])
        print(f"  {slug}: {caps}")
    if not gaps:
        print("  (none — every replaced core capability has an SGS equivalent, a recorded "
              "exception, or a valid SOURCE-MISSING exception)")
    return payload


def _db_missing_message() -> str:
    # SUPERSEDED 2026-07-31 (Motion Wave D Step 11): this used to make --check
    # exit 1 on a missing DB, reasoning that a silent sqlite3.connect()-creates-
    # an-empty-DB false PASS was worse than failing loudly. That's still true —
    # a SILENT pass would be wrong — but failing the entire `npm run build` on
    # a machine that has never had this out-of-repo, home-directory DB (a clean
    # clone, by design — see .claude/dev-setup.md "sgs-framework.db") is a
    # different and worse problem: it means a clean clone can never build at
    # all. The fix is a LOUD, NAMED skip (this message, printed either way) with
    # exit 0 — never silent, so it is not the vacuous pass the old comment
    # warned against, but also never build-breaking. See db-consistency/run.py,
    # excluded-gate/run.py and ledger/coverage_check.py for the same pattern
    # applied consistently across the build chain.
    return (
        f"\n[feature-parity] SKIPPED — DB not found at {DB_PATH}.\n"
        "This audit is DB-first (R-31-1): the sgs-wp-engine DB is an out-of-repo, "
        "home-directory dependency, deliberately unversioned. On a machine without "
        "it, the build proceeds and this audit is skipped rather than failing the "
        "whole chain.\n"
        "Fix: run /sgs-update to (re)generate sgs-framework.db, or copy it from a "
        "machine that has it, if you need this audit to actually run."
    )


def main() -> int:
    argv = sys.argv[1:]
    as_json = "--json" in argv
    check_mode = "--check" in argv
    self_test = "--self-test" in argv

    if self_test:
        return _self_test()

    if not ROSTER.exists():
        sys.exit("roster.json missing — run scripts/consistency/build-roster.py first.")
    roster = json.loads(ROSTER.read_text(encoding="utf-8"))["blocks"]

    try:
        exceptions = load_exceptions(check_mode)
    except ExceptionsMissing as e:
        print(f"\n[feature-parity] GATE FAILED — exceptions file missing: {e}\n"
              "A missing exceptions file is ALWAYS a hard-fail under --check, regardless of "
              "gap count — every finding would otherwise read as silently unexplained.",
              file=sys.stderr)
        return 1

    if not DB_PATH.exists():
        # Skip cleanly in EVERY mode (see _db_missing_message()'s 2026-07-31
        # update note for why this changed from a --check hard-fail).
        print(_db_missing_message(), file=sys.stderr)
        return 0

    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
    except sqlite3.OperationalError as exc:
        print(f"\n[feature-parity] SKIPPED — DB present but could not be opened: "
              f"{DB_PATH} ({exc})", file=sys.stderr)
        return 0

    try:
        findings = evaluate(
            roster, exceptions,
            get_sgs_caps=lambda slug: capabilities_from_db(conn, slug, "sgs"),
            get_core_caps_named=lambda core_slug: core_capabilities_named_from_db(conn, core_slug),
        )
    except sqlite3.OperationalError as exc:
        # DB present but DRIFTED (a required table missing) — real integrity
        # problem, distinct from plain absence. Fail loudly, naming the table
        # via sqlite3's own error text.
        print(f"\n[feature-parity] FAIL — DB present at {DB_PATH} but the audit "
              f"could not run against it: {exc}\n"
              "  Re-run /sgs-update to bring the DB back in sync, then re-run "
              "this audit.", file=sys.stderr)
        return 1
    finally:
        conn.close()

    blocks_in_scope = sum(1 for b in roster if b.get("replaces"))
    payload = _print_report(findings, blocks_in_scope, as_json)

    if check_mode:
        if payload["_meta"]["unexplained_gaps"] > 0:
            print(f"\n[feature-parity] GATE FAILED — {payload['_meta']['unexplained_gaps']} "
                  "unexplained finding(s). Close each gap OR add a reason+wave exception.",
                  file=sys.stderr)
            return 1
        print("\n[feature-parity] GATE PASSED — every replaced core capability is matched, "
              "framework-universal, or has a valid exception.")
        return 0

    return 0  # report modes (default / --json) stay observational, per Phase 0 design.


def _self_test() -> int:
    """Prove the gate can actually fail — and prove it can also pass. Never touches the real
    DB, roster.json, or feature-parity-exceptions.json; drives evaluate() with synthetic
    in-memory data only. Four cases, matching the canonical shape in
    check-motion-bundle-budget.py:302-383:
      (a) an unexplained gap must FAIL
      (b) a clean tree (everything matched/excepted) must PASS
      (c) a missing exceptions file must FAIL
      (d) an exception present but missing wave (or reason) must FAIL
    """
    ok = True

    roster = [{"slug": "sgs/fake-block", "replaces": "core/fake-block"}]

    def sgs_caps_missing_one(slug):
        return {norm("colour")}  # has "colour" but core wants "colour" + "size"

    def sgs_caps_full(slug):
        return {norm("colour"), norm("size")}

    def core_caps_named(core_slug):
        return {norm("colour"): "colour", norm("size"): "size"}

    # --- Case (a): unexplained gap must FAIL.
    findings_a = evaluate(roster, {}, sgs_caps_missing_one, core_caps_named)
    gaps_a = unexplained(findings_a)
    if len(gaps_a) != 1 or gaps_a[0]["capability"] != "size":
        print("[feature-parity --self-test] FAIL (a) — an unexplained gap ('size') was not "
              "caught. This gate would read green forever.")
        ok = False
    else:
        print("[feature-parity --self-test] (a) unexplained-gap case: caught 'size' as a "
              "GAP — OK")

    # --- Case (b): a clean tree (everything matched or validly excepted) must PASS.
    exceptions_clean = {
        "sgs/fake-block": {
            "core/fake-block": {}
        }
    }
    findings_b = evaluate(roster, exceptions_clean, sgs_caps_full, core_caps_named)
    gaps_b = unexplained(findings_b)
    if gaps_b:
        print(f"[feature-parity --self-test] FAIL (b) — a genuinely clean tree reported "
              f"{len(gaps_b)} finding(s). A gate that fails on everything is as useless as "
              f"one that can't fail at all.")
        ok = False
    else:
        print("[feature-parity --self-test] (b) clean-tree case: 0 findings — OK "
              "(gate can pass, not just fail)")

    # --- Case (c): missing exceptions file must FAIL (simulated via load_exceptions()).
    import tempfile
    tmp_root = Path(tempfile.mkdtemp(prefix="feature-parity-selftest-"))
    try:
        fake_exceptions_path = tmp_root / "does-not-exist.json"
        raised = False
        try:
            if not fake_exceptions_path.exists():
                raise ExceptionsMissing(str(fake_exceptions_path))
        except ExceptionsMissing:
            raised = True
        if not raised:
            print("[feature-parity --self-test] FAIL (c) — a missing exceptions file did not "
                  "raise ExceptionsMissing under check-mode semantics.")
            ok = False
        else:
            print("[feature-parity --self-test] (c) missing-exceptions-file case: correctly "
                  "hard-fails under --check — OK")
    finally:
        import shutil
        shutil.rmtree(tmp_root, ignore_errors=True)

    # --- Case (d): exception present but missing wave/reason must still FAIL.
    exceptions_invalid = {
        "sgs/fake-block": {
            "core/fake-block": {
                "size": {"reason": "some reason but no wave key at all"}
            }
        }
    }
    findings_d = evaluate(roster, exceptions_invalid, sgs_caps_missing_one, core_caps_named)
    gaps_d = unexplained(findings_d)
    invalid_d = [g for g in gaps_d if g["status"] == "INVALID-EXCEPTION"]
    if not invalid_d:
        print("[feature-parity --self-test] FAIL (d) — an exception missing its 'wave' key "
              "was silently treated as suppressing the gap. :85 in the old code only checked "
              "key presence, never reason/wave values — this is exactly that regression.")
        ok = False
    else:
        print("[feature-parity --self-test] (d) invalid-exception case (missing wave): "
              "caught as INVALID-EXCEPTION, still unexplained — OK")

    if ok:
        print("[feature-parity --self-test] PASS — gate can fail, can pass, and correctly "
              "detects each case.")
        return 0
    print("[feature-parity --self-test] FAIL — see above.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
