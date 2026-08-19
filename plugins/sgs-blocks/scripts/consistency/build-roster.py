#!/usr/bin/env python3
"""
Spec 35 UNIT A0 — enumerate the block roster + per-block surface flags from the DB.

This is the audit DENOMINATOR: every later "0 findings across the roster" claim is keyed to
roster.json's block set. DB-first (R-31-1) — never hardcode the count. Re-run after /sgs-update.

Modes: (no args) write roster.json | --check freshness gate (DB vs on-disk, full payload
compare — the roster-freshness gate closing the gap behind D523 + the 2026-07-30 18-block
false-positive incident) | --self-test proves --check genuinely fails on stale input and
clears on regen (temp copy only — never touches the real roster.json or the DB).

Surface flags (a block is "in scope" for an audit dimension if the flag is true):
  styling   — declares any of color/spacing/__experimentalBorder/typography/shadow support
  colour    — declares the `color` support (component colour pickers are the enableAlpha target)
  link      — has a url/link/href attribute (LinkControl migration target)
  media     — declares sgs.imageControls, OR has an image/media/video attribute (media-controls target)
  animation — declares a parallax/animation support or attribute (reduced-motion-gate target)

`qualifies` (per block, ADDITIVE — does not touch `surfaces`):
  paintDeclarations     — count of colour-paint CSS declarations in the block's own style.css
  replacedCoreSupports  — WP core support families the block's `replaces` core block(s) ENABLE,
                           e.g. ["color", "spacing"]. This is the feature-parity evidence
                           survey-golden-conformance.js's `qualifiesFor()` cannot compute itself
                           (it has no access to core block.json). See `support_enabled()` below
                           for the exact "enabled" rule per family.
"""
import json
import re
import sqlite3
import sys
from pathlib import Path

# Same DB the sgs-db.py CLI uses: skills/sgs-wp-engine/scripts/../sgs-framework.db
DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
OUT = Path(__file__).parent / "roster.json"
BLOCKS_DIR = Path(__file__).parent.parent.parent / "src" / "blocks"

# Same paint-declaration pattern the survey uses for `paintsOwnSurface`
# (survey-golden-conformance.js `qualifiesFor()`), duplicated here rather than
# shared cross-language — kept identical on purpose so the two counts never
# silently diverge in meaning.
PAINT_DECLARATION_RE = re.compile(r'(?:background(?:-color)?|border-color|[^-\w]color)\s*:')

# Sub-flags that mean core's `color` support paints REAL UI, not just the
# ability to declare one. Verified 2026-08-19 against live DB rows:
# core/site-logo has `color: {"enabled":true, background:false, text:false,
# link:null, gradients:null, button:null, heading:null}` — `enabled:true` alone
# with every sub-flag false/null renders NO colour UI at all. core/paragraph
# has `gradients:true, link:true` alongside `enabled:true` — real UI. So
# `enabled:true` is necessary but not sufficient for `color`; at least one of
# these six must be `=== true`.
COLOUR_UI_SUBFLAGS = ("background", "text", "link", "gradients", "button", "heading")


def support_enabled(support_name: str, raw_value: str) -> bool:
    """Whether a WP core support FAMILY is ENABLED (real user-facing UI), not
    merely present/declared.

    Rule (documented per the two shapes actually observed in block_supports):
      - `color`: `support_value` must parse as a JSON object with
        `enabled === true` AND at least one of COLOUR_UI_SUBFLAGS `=== true`.
        `enabled:true` with every sub-flag false/null (core/site-logo) is NOT
        enabled — it is the ability to declare a colour, never exercised.
      - Every other family: a bare JSON boolean `true`, OR a JSON object
        carrying `enabled === true` (e.g. spacing/border/typography's
        `{"enabled":true, ...}` shape). Enum/list-shaped values (e.g.
        `align: ["left","center",...]`) are never treated as "enabled" — they
        describe allowed values, not a UI capability.
    """
    try:
        parsed = json.loads(raw_value)
    except (ValueError, TypeError):
        return False

    if support_name == "color":
        if not isinstance(parsed, dict) or parsed.get("enabled") is not True:
            return False
        return any(parsed.get(f) is True for f in COLOUR_UI_SUBFLAGS)

    if isinstance(parsed, bool):
        return parsed is True
    if isinstance(parsed, dict):
        return parsed.get("enabled") is True
    return False


def assert_db_healthy(conn: sqlite3.Connection) -> None:
    """Fail loud, never silent, on the two known decoy-DB traps.

    Two 0-byte `sgs-framework.db` files sit INSIDE this repo
    (`plugins/sgs-blocks/scripts/sgs-framework.db`, repo-root `sgs-framework.db`).
    A relative path resolving to either lands on an empty file that "passes
    clean forever" — every query returns zero rows and every downstream
    predicate reads as legitimately-absent rather than DB-not-found. DB_PATH
    above already resolves to the canonical out-of-repo DB, so this is a
    guard against future path-logic drift, not a workaround for a bug today.
    """
    if not DB_PATH.exists() or DB_PATH.stat().st_size == 0:
        sys.exit(f"DB at {DB_PATH} is missing or 0 bytes — refusing to build a roster from a decoy DB")
    tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    if "block_supports" not in tables:
        # Report the file THIS CONNECTION actually opened, not DB_PATH. They are
        # normally the same, but naming DB_PATH unconditionally would send the
        # reader to the canonical DB when the decoy is somewhere else entirely —
        # a guard that misnames the bad file is worse than one that says nothing.
        opened = next(
            (r[2] for r in conn.execute("PRAGMA database_list").fetchall() if r[1] == "main"),
            str(DB_PATH),
        )
        sys.exit(f"DB at {opened} has no `block_supports` table — refusing to build a roster from a decoy DB")


def q(sql: str):
    """Run a query directly against sgs-framework.db (the CLI's --json is a no-op)."""
    if not DB_PATH.exists():
        sys.exit(f"DB not found at {DB_PATH}")
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        assert_db_healthy(conn)
        rows = conn.execute(sql).fetchall()
    finally:
        conn.close()
    return [dict(r) for r in rows]


def build_payload() -> dict:
    """Query the live DB and build the roster payload exactly as `main()` would write it.

    Factored out of `main()` (2026-08-12, closing the roster-freshness gap behind
    D523 + the 2026-07-30 18-block false-positive incident) so `--check`, the normal
    write path, and `--self-test` all share ONE query, never three copies that could
    silently drift apart from each other.
    """
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
    # `native_wp` is the source value core blocks carry in this table (verified
    # 2026-08-19 — the other value present is `sgs`). 119 distinct core/* slugs
    # currently have rows; a `replaces` entry naming a core slug NOT in this set
    # (e.g. core/stack, core/row, core/form-submit-button — genuinely not
    # separately-registered core blocks) is legitimately absent, not a bug.
    core_supports = q(
        "SELECT block_slug, support_name, support_value FROM block_supports "
        "WHERE source='native_wp' AND is_stale=0 AND block_slug LIKE 'core/%';"
    )
    core_sup_by_block: dict[str, dict[str, str]] = {}
    for s in core_supports:
        core_sup_by_block.setdefault(s["block_slug"], {})[s["support_name"]] = s.get("support_value") or ""

    def replaced_core_supports(replaces_csv: str | None) -> list[str]:
        """Union of WP support families ENABLED (support_enabled()) across every
        core block named in a `replaces` value. `replaces` can be comma-joined
        (e.g. "core/accordion-item,core/details") — split before lookup."""
        if not replaces_csv:
            return []
        families: set[str] = set()
        for core_slug in (s.strip() for s in replaces_csv.split(",")):
            if not core_slug:
                continue
            for name, raw_value in core_sup_by_block.get(core_slug, {}).items():
                if support_enabled(name, raw_value):
                    families.add(name)
        return sorted(families)

    def paint_declarations(slug: str) -> int:
        """Count of colour-paint CSS declarations in the block's own style.css —
        the same pattern the survey uses for `paintsOwnSurface`. `slug` carries
        the `sgs/` prefix (DB shape); `src/blocks/` directories are bare."""
        bare = slug.split("/", 1)[1] if "/" in slug else slug
        css_path = BLOCKS_DIR / bare / "style.css"
        try:
            css = css_path.read_text(encoding="utf-8")
        except OSError:
            return 0
        return len(PAINT_DECLARATION_RE.findall(css))

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
            "qualifies": {
                "paintDeclarations": paint_declarations(b["slug"]),
                "replacedCoreSupports": replaced_core_supports(b.get("replaces")),
            },
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
    return payload


def check_against(out_path: Path, payload: dict) -> bool:
    """Compare a live-computed `payload` against whatever's on disk at `out_path`.

    This IS the freshness gate: a full payload comparison is a strict superset of a
    hash/fingerprint check (it also tells you what to fix, not just that something
    drifted), computed from the exact same query `build_payload()` uses for the
    normal write path — so there is no second parallel definition of "fresh" to let
    drift between itself and the generator (the class of bug this whole gate exists
    to close). Returns True on PASS, False on FAIL/missing/malformed; never raises.
    """
    if not out_path.exists():
        print(f"[FAIL] roster.json does not exist at {out_path}")
        return False
    try:
        current = json.loads(out_path.read_text(encoding="utf-8"))
    except (ValueError, OSError) as exc:
        print(f"[FAIL] roster.json at {out_path} is unreadable/malformed: {exc}")
        return False

    if current == payload:
        print(f"[PASS] roster.json is in sync with DB ({payload['_meta']['count']} blocks)")
        return True

    print(f"[FAIL] roster.json is STALE (DB: {payload['_meta']['count']} blocks, "
          f"File: {current.get('_meta', {}).get('count', '?')} blocks)")
    print("  roster.json is stale — run `python scripts/consistency/build-roster.py` before continuing.")
    return False


def self_test() -> int:
    """Prove the freshness gate can genuinely fail, and clears on regeneration.

    Never touches the real roster.json or the DB — reads the DB once (read-only,
    same as every other mode) to get a real live payload, then does all mutation
    against a throwaway temp copy. Modelled on this project's other --self-test
    scripts (e.g. check-fx-list-drift.py): perturb a known-good state, assert the
    gate catches it, then assert a fresh write clears it.
    """
    import tempfile

    payload = build_payload()
    ok = True

    with tempfile.TemporaryDirectory(prefix="roster-freshness-selftest-") as tmp:
        tmp_out = Path(tmp) / "roster.json"

        # Case 1: no file at all -> FAIL.
        if check_against(tmp_out, payload):
            print("[self-test] FAIL — missing roster.json was not caught as stale")
            ok = False
        else:
            print("[self-test] case 1/3 (missing file) — correctly caught as FAIL")

        # Case 2: a fresh, correct write -> PASS.
        tmp_out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        if not check_against(tmp_out, payload):
            print("[self-test] FAIL — a byte-for-byte-fresh roster.json was reported stale")
            ok = False
        else:
            print("[self-test] case 2/3 (fresh write) — correctly PASSED")

        # Case 3: simulate the real incident shape — the DB has moved on (one more
        # block, a flipped surfaces.link flag) but the on-disk file is the OLD state.
        stale = json.loads(json.dumps(payload))  # deep copy
        stale["_meta"]["count"] = stale["_meta"]["count"] - 1
        if stale["blocks"]:
            stale["blocks"][0]["surfaces"]["link"] = not stale["blocks"][0]["surfaces"]["link"]
            stale["blocks"].pop()
        tmp_out.write_text(json.dumps(stale, indent=2), encoding="utf-8")
        if check_against(tmp_out, payload):
            print("[self-test] FAIL — a stale roster.json (flipped flag + dropped block) was reported PASS")
            ok = False
        else:
            print("[self-test] case 3/3 (stale: flipped flag + missing block) — correctly caught as FAIL")

        # Regeneration clears it — write the live payload back and confirm PASS again.
        tmp_out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        if not check_against(tmp_out, payload):
            print("[self-test] FAIL — regenerating did not clear the stale finding")
            ok = False
        else:
            print("[self-test] case 2b (regenerated) — correctly cleared back to PASS")

    if ok:
        print("[self-test] ALL PASS — the freshness gate genuinely detects staleness and clears on regen.")
    return 0 if ok else 1


def main():
    args = sys.argv[1:]
    check_mode = "--check" in args
    self_test_mode = "--self-test" in args

    if self_test_mode:
        sys.exit(self_test())

    payload = build_payload()
    roster = payload["blocks"]

    if check_mode:
        sys.exit(0 if check_against(OUT, payload) else 1)

    # Normal mode: write roster
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def cnt(flag):
        return sum(1 for b in roster if b["surfaces"][flag])

    print(f"roster.json written: {len(roster)} SGS built blocks")
    print(f"  styling={cnt('styling')} colour={cnt('colour')} link={cnt('link')} "
          f"media={cnt('media')} animation={cnt('animation')}")
    with_replaces = sum(1 for b in roster if b["replaces"])
    print(f"  with a `replaces` map (feature-parity scope): {with_replaces}")


if __name__ == "__main__":
    main()
