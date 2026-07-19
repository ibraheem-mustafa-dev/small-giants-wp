#!/usr/bin/env python3
"""
Spec 35 UNIT A — feature-parity audit (STATIC).

Every SGS block must expose AT LEAST the capabilities of the core block(s) it replaces
(memory `sgs-block-feature-parity-with-replaced-core`). A core capability with no SGS
equivalent = a GAP → closed OR recorded in feature-parity-exceptions.json with a Wave.

CORE-CAPABILITY SOURCE (PED-7, corrected 2026-07-19): the DB's `native_wp` block rows
(block_supports + block_attributes where source='native_wp') — ALREADY INGESTED at the
sandbox WP core version (WP 7.0.1). This is DB-first (R-31-1); `@wordpress/block-library`
is NOT installed in node_modules, so it was never a viable source. Re-ingest via /sgs-update
when WP 7.1 lands (19 Aug 2026).

WARN-ONLY in Phase 0: always exits 0. Promotion to a hard gate = Spec close (plan Gate 3).

Usage:
    python audit-feature-parity.py            # human report
    python audit-feature-parity.py --json     # machine report to stdout
"""
import json
import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).parent
DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
ROSTER = HERE / "consistency" / "roster.json"
EXCEPTIONS = HERE / "feature-parity-exceptions.json"

# Case-only / spelling normalisation so textColour==textColor (D338) and Colour==Color
# don't false-positive. NOT a capability-alias dict — genuinely-different-name equivalents
# are recorded (with a reason) in the exceptions file, human-reviewed, not hardcoded here.
def norm(name: str) -> str:
    return name.strip().lower().replace("colour", "color").replace("-", "").replace("_", "")


def q(conn, sql, params=()):
    return [dict(r) for r in conn.execute(sql, params).fetchall()]


def capabilities(conn, slug: str, source: str) -> set[str]:
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


def load_exceptions() -> dict:
    if EXCEPTIONS.exists():
        return json.loads(EXCEPTIONS.read_text(encoding="utf-8"))
    return {}


def main():
    as_json = "--json" in sys.argv
    if not ROSTER.exists():
        sys.exit("roster.json missing — run scripts/consistency/build-roster.py first.")
    roster = json.loads(ROSTER.read_text(encoding="utf-8"))["blocks"]
    exceptions = load_exceptions()
    # Global suppression: core capabilities SGS provides framework-wide by architecture
    # (styling contract + universal extensions + rejected inline-colour attrs). Policy-as-data.
    fw = exceptions.get("_framework_universal", {})
    framework_universal = {norm(c) for c in fw.get("capabilities", [])}

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    findings = []
    for b in roster:
        replaces = b.get("replaces")
        if not replaces:
            continue  # only blocks with a `replaces` map are in parity scope
        sgs_caps = capabilities(conn, b["slug"], "sgs")
        exc_for_block = {norm(k) for k in exceptions.get(b["slug"], {}).keys()}
        for core_slug in [c.strip() for c in replaces.split(",") if c.strip()]:
            core_caps_named = {}
            for a in q(conn, "SELECT attr_name FROM block_attributes WHERE block_slug=? AND source='native_wp'", (core_slug,)):
                core_caps_named[norm(a["attr_name"])] = a["attr_name"]
            for s in q(conn, "SELECT support_name FROM block_supports WHERE block_slug=? AND source='native_wp'", (core_slug,)):
                core_caps_named[norm(s["support_name"])] = s["support_name"]
            if not core_caps_named:
                findings.append({"block": b["slug"], "replaces": core_slug,
                                 "capability": "(none)", "status": "SOURCE-MISSING",
                                 "note": f"{core_slug} has no native_wp rows in the DB — re-run /sgs-update"})
                continue
            for ncap, orig in sorted(core_caps_named.items()):
                if ncap in sgs_caps:
                    status = "OK"
                elif ncap in framework_universal:
                    status = "FRAMEWORK-UNIVERSAL"
                elif ncap in exc_for_block:
                    status = "EXCEPTION"
                else:
                    status = "GAP"
                if status in ("GAP", "SOURCE-MISSING"):
                    findings.append({"block": b["slug"], "replaces": core_slug,
                                     "capability": orig, "status": status})

    conn.close()

    gaps = [f for f in findings if f["status"] == "GAP"]
    payload = {
        "_meta": {
            "audit": "feature-parity",
            "source": "sgs-framework.db native_wp rows (PED-7, WP 7.0.1)",
            "warn_only": True,
            "blocks_in_scope": sum(1 for b in roster if b.get("replaces")),
            "unexplained_gaps": len(gaps),
        },
        "gaps": gaps,
    }

    if as_json:
        print(json.dumps(payload, indent=2))
    else:
        print(f"Feature-parity audit — {payload['_meta']['blocks_in_scope']} blocks in scope "
              f"(have a `replaces` map)")
        print(f"UNEXPLAINED GAPS: {len(gaps)}  (each must be closed OR added to feature-parity-exceptions.json with a Wave)\n")
        by_block: dict[str, list] = {}
        for g in gaps:
            by_block.setdefault(g["block"], []).append(g)
        for slug in sorted(by_block):
            caps = ", ".join(f"{g['capability']} (vs {g['replaces']})" for g in by_block[slug])
            print(f"  {slug}: {caps}")
        if not gaps:
            print("  (none — every replaced core capability has an SGS equivalent or a recorded exception)")

    # WARN-only: never fail the build in Phase 0.
    sys.exit(0)


if __name__ == "__main__":
    main()
