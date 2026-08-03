#!/usr/bin/env python3
"""
Spec 35 UNIT A0 — enumerate the block roster + per-block surface flags from the DB.

This is the audit DENOMINATOR: every later "0 findings across the roster" claim is keyed to
roster.json's block set. DB-first (R-31-1) — never hardcode the count. Re-run after /sgs-update.

Surface flags (a block is "in scope" for an audit dimension if the flag is true):
  styling   — declares any of color/spacing/__experimentalBorder/typography/shadow support
  colour    — declares the `color` support (component colour pickers are the enableAlpha target)
  link      — has a url/link/href attribute (LinkControl migration target)
  media     — declares sgs.imageControls, OR has an image/media/video attribute (media-controls target)
  animation — declares a parallax/animation support or attribute (reduced-motion-gate target)
"""
import json
import sqlite3
import sys
from pathlib import Path

# Same DB the sgs-db.py CLI uses: skills/sgs-wp-engine/scripts/../sgs-framework.db
DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
OUT = Path(__file__).parent / "roster.json"


def q(sql: str):
    """Run a query directly against sgs-framework.db (the CLI's --json is a no-op)."""
    if not DB_PATH.exists():
        sys.exit(f"DB not found at {DB_PATH}")
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(sql).fetchall()
    finally:
        conn.close()
    return [dict(r) for r in rows]


def main():
    # Parse command-line args
    check_mode = "--check" in sys.argv

    blocks = q(
        "SELECT slug, title, category, tier, replaces, has_render_php "
        "FROM blocks WHERE source='sgs' AND status='built' AND is_stale=0 ORDER BY slug;"
    )
    if not blocks:
        sys.exit("0 SGS built blocks returned — is /sgs-update stale? Aborting (no partial file).")

    supports = q(
        "SELECT block_slug, support_name, support_value FROM block_supports "
        "WHERE source='sgs' AND is_stale=0;"
    )
    attrs = q(
        "SELECT block_slug, attr_name, role, inspector_control_type FROM block_attributes "
        "WHERE source='sgs';"
    )

    STYLING = {"color", "spacing", "__experimentalBorder", "typography", "shadow"}
    sup_by_block: dict[str, dict[str, str]] = {}
    for s in supports:
        sup_by_block.setdefault(s["block_slug"], {})[s["support_name"]] = s.get("support_value") or ""

    attrs_by_block: dict[str, list[dict]] = {}
    for a in attrs:
        attrs_by_block.setdefault(a["block_slug"], []).append(a)

    def flags(slug: str) -> dict:
        sup = sup_by_block.get(slug, {})
        blk_attrs = attrs_by_block.get(slug, [])

        # `supports.sgs.hideExtensions` is an opt-OUT list: a block listing "animation"
        # there is declaring it does NOT want the animation extension. A naive substring
        # test over the raw JSON reads that exclusion as a capability and INVERTS the
        # semantics — which is exactly what happened on 2026-07-30, when a roster
        # regeneration flipped 18 form-field/accordion-item/tab blocks to animation=true
        # and turned 18 false-positive WARNs on a fail-closed gate. Strip the opt-out
        # list before any substring matching below.
        raw_sgs = sup.get("sgs", "") or ""
        try:
            _parsed = json.loads(raw_sgs) if raw_sgs else {}
            if isinstance(_parsed, dict) and "hideExtensions" in _parsed:
                _parsed = {k: v for k, v in _parsed.items() if k != "hideExtensions"}
                sgs_val = json.dumps(_parsed)
            else:
                sgs_val = raw_sgs
        except (ValueError, TypeError):
            sgs_val = raw_sgs  # not JSON — fall back to the raw string

        def attr_hit(*needles):
            for a in blk_attrs:
                hay = f"{a.get('attr_name','')}|{a.get('role','')}|{a.get('inspector_control_type','')}".lower()
                if any(n in hay for n in needles):
                    return True
            return False

        styling = any(k in sup for k in STYLING)
        colour = "color" in sup or attr_hit("colour", "color")
        link = attr_hit("url", "link", "href")
        media = ("imagecontrols" in sgs_val.lower()) or attr_hit("image", "media", "video", "svg", "logo")
        animation = ("_comment_parallax" in sup) or ("animation" in sgs_val.lower()) or attr_hit("animation", "parallax")
        return {
            "styling": styling, "colour": colour, "link": link,
            "media": media, "animation": animation,
        }

    roster = []
    for b in blocks:
        roster.append({
            "slug": b["slug"],
            "title": b["title"],
            "category": b["category"],
            "tier": b["tier"],
            "replaces": b.get("replaces") or None,
            "has_render_php": bool(b.get("has_render_php")),
            "surfaces": flags(b["slug"]),
        })

    payload = {
        "_meta": {
            "purpose": "Spec 35 UNIT A0 roster — the audit denominator. DB-first, regenerate after /sgs-update.",
            "source": "sgs-framework.db blocks(source=sgs,status=built,is_stale=0)",
            "count": len(roster),
            "generator": "scripts/consistency/build-roster.py",
        },
        "blocks": roster,
    }

    # Summary helper
    def cnt(flag):
        return sum(1 for b in roster if b["surfaces"][flag])

    if check_mode:
        # Drift check: compare on-disk roster against what would be generated
        if not OUT.exists():
            print(f"[FAIL] roster.json does not exist at {OUT}")
            sys.exit(1)

        current = json.loads(OUT.read_text(encoding="utf-8"))
        # Compare payloads (ignore formatting differences)
        if current == payload:
            print(f"[PASS] roster.json is in sync with DB ({len(roster)} blocks)")
            sys.exit(0)
        else:
            print(f"[FAIL] roster.json is STALE (DB: {len(roster)} blocks, "
                  f"File: {current.get('_meta', {}).get('count', '?')} blocks)")
            print(f"  Run: python scripts/consistency/build-roster.py")
            sys.exit(1)
    else:
        # Normal mode: write roster
        OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")

        print(f"roster.json written: {len(roster)} SGS built blocks")
        print(f"  styling={cnt('styling')} colour={cnt('colour')} link={cnt('link')} "
              f"media={cnt('media')} animation={cnt('animation')}")
        with_replaces = sum(1 for b in roster if b["replaces"])
        print(f"  with a `replaces` map (feature-parity scope): {with_replaces}")


if __name__ == "__main__":
    main()
