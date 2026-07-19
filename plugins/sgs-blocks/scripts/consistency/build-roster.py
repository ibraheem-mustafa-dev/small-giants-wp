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
        sgs_val = sup.get("sgs", "") or ""
        blk_attrs = attrs_by_block.get(slug, [])

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
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    # Summary to stdout
    def cnt(flag):
        return sum(1 for b in roster if b["surfaces"][flag])
    print(f"roster.json written: {len(roster)} SGS built blocks")
    print(f"  styling={cnt('styling')} colour={cnt('colour')} link={cnt('link')} "
          f"media={cnt('media')} animation={cnt('animation')}")
    with_replaces = sum(1 for b in roster if b["replaces"])
    print(f"  with a `replaces` map (feature-parity scope): {with_replaces}")


if __name__ == "__main__":
    main()
