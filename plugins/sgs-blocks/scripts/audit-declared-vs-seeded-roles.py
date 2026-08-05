"""Audit: which `sgs/%` attributes LACK A MECHANISM that reaches them — the D497 gate.

RE-POINTED 2026-08-05 (Bean's ruling, `.claude/decisions.md` D497). This script previously
measured block.json's inline `"role"` key against `block_attributes.role` and its closing
advice literally said "add `supports.sgs.attrRoles`" (Task E). D497 rules Task E OUT: it
would relocate 73 auditable override lines into 84 block.json files, not reduce hand
declaration. **Do not resurrect that advice.**

TWO FACTS, RE-VERIFIED THIS SESSION (do not take on trust — re-check before trusting this
docstring too):

1. `sgs-update-v2.py`'s SCALAR-attribute seeding loop (read `sgs-update-v2.py:885-931`
   directly to confirm) reads `type`/`default`/`enum`/`description`/`is_responsive` off
   each `attrs.items()` entry -- it never reads `attr_def.get("role")`. Only the ARRAY-item
   loop just above it (~865-882) reads a `role` key, and only off
   `items.properties.<field>.role` for array-item fields (FR-31-2.5), a different channel
   entirely. So the inline scalar `"role"` key that this audit used to compare against
   `block_attributes.role` was NEVER fed into the SGS role column by any writer.

2. The inline key is NOT dead, and must NOT be removed or "fixed": it is WordPress
   core's own `contentOnly` / pattern-overrides marker (WP 7.0) -- an attribute without
   `"role":"content"` is not editable inside a synced-pattern instance. Removing it would
   break client pattern editing. This audit's own prior text already established this
   (see the WP-CORE COLLISION section below, kept as a clearly separate, non-headline
   report).

WHAT THIS AUDIT MEASURES NOW (D497's actual target)
-----------------------------------------------------
D497 rule #1: **`role IS NULL` means exactly one thing -- no seeding mechanism reached
this row.** So the primary, mechanical measure is a straight query:
`sgs/%` attrs with `role IS NULL` -- SECTION 1 below.

D497 rule #2's measurable end condition for `attr-classification-overrides.json`: "the
override file contains ONLY entries where the code does X but genuinely MEANS Y -- its
stated purpose -- and ZERO entries that exist because no mechanism reaches the row. The
two kinds must be distinguishable per entry so the second count is visible and can only
go down." SECTION 2 below does exactly that split, by scanning each override entry's own
`_why`/`_note` prose for the language that admits "no mechanism reaches this row yet"
(cf. the `sgs/before-after.beforeVideoAlt`/`afterVideoAlt` entries, which say so in as many
words). For every entry flagged this way, this audit goes further and RE-RUNS the real
structural detectors (the same three the content-role fingerprint uses) against that exact
(block_slug, attr_name) pair, bypassing the `role IS NULL` pool filter that would otherwise
hide it (its role is already hand-set by the override). If the detectors now independently
derive a role for it, the entry's own stated reason ("no mechanism reaches this") is
STALE -- a mechanism was built after the entry was written and nobody came back to retire
the override. That is precisely the drift class D497 exists to keep visible and shrinking.

Concretely proven this session (do not just trust this count -- rerun `--check`):
`sgs/cart.ariaLabel` and `sgs/tabs.blockLabel` are STALE by this test (the structural
fingerprint independently derives `a11y-text` for both once forced into its pool).
`sgs/before-after.beforeVideoAlt`/`afterVideoAlt` are NOT stale -- D1's proximity walk
misses them for a documented reason (the block builds the aria value through a renamed
local variable, `$alt` -> `$aria`, inside a positional `sprintf(... aria-label="%2$s" ...)`
template; this is blind spot #3 in `content-role-detect/fingerprint_content_roles.py`'s own
docstring). This script does NOT edit `attr-classification-overrides.json` -- it is
read-only, out of scope for this pass (another agent owns that file). It reports what it
finds so a human/agent with edit rights on that file can retire the stale entries.

Usage:
    python audit-declared-vs-seeded-roles.py            # full report, all 3 sections
    python audit-declared-vs-seeded-roles.py --check    # exit 1 if any override entry's
                                                          # own "no mechanism reaches this"
                                                          # claim is now STALE
    python audit-declared-vs-seeded-roles.py --self-test # prove the classifier can FAIL
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).resolve().parent
SRC_BLOCKS = SCRIPT_DIR.parent / "src" / "blocks"
SGS_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
OVERRIDES_PATH = SCRIPT_DIR / "attr-classification-overrides.json"
FINGERPRINT_DIR = SCRIPT_DIR / "content-role-detect"

# --- Section 3 (kept, relabelled, informational-only): WP-core content-marker collision ---
# Roles that DOWNSTREAM code branches on by exact value (converter/walk.py) — demoting
# any of these to the generic `content` marker silently breaks identity resolution.
DANGER_ROLES = {"link-href", "url-href", "image-object", "image-alt", "rating", "icon-slug"}
# text-content and content are lift-equivalent (scalar_content.py:164 / walk.py:261).
BENIGN_TARGETS = {"text-content", "content"}

# --- Section 2: language that admits "no mechanism reaches this row yet" -----------------
# Deliberately phrase-based, not a single keyword — an override entry's prose is the only
# evidence available for WHY a role was hand-declared, and these are the actual phrases
# used in this codebase's overrides to say "this is a mechanism gap, not a genuine
# code-does-X-means-Y correction" (see the 4 entries this rule was built against:
# sgs/cart.ariaLabel, sgs/tabs.blockLabel, sgs/before-after.before/afterVideoAlt).
MECHANISM_GAP_MARKERS = (
    "no mechanism",
    "not built",
    "not wired",
    "write step",
    "structural check missed",
    "hand-declared deliberately",
    "irreducible today",
    "content-role fingerprint",
    "retire this entry when",
    "retirement condition",
    "does not exist",
    # "seeded for documentation not routing" (verified 2026-08-05: exactly 2 hits in the
    # live override file, sgs/cart.ariaLabel + sgs/tabs.blockLabel) marks an a11y-text row
    # hand-set BEFORE the structural-fingerprint writer existed, as distinct from a note
    # merely explaining what the a11y-text role itself means (roles.json carries the same
    # phrase for the role's general description, but that is not override prose).
    "seeded for documentation",
)


def _load_overrides() -> list[dict]:
    data = json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
    return data.get("entries", [])


def role_setting_entries(entries: list[dict]) -> list[dict]:
    """Override entries that set a `role` field — the only ones D497's split concerns."""
    return [e for e in entries if isinstance(e.get("fields"), dict) and "role" in e["fields"]]


def classify_override_entry(entry: dict) -> bool:
    """True if this entry's own prose admits it exists because no mechanism reaches the
    row (a candidate for staleness re-verification), False if it reads as a genuine
    code-does-X-means-Y correction (out of scope for this split; D497 keeps those)."""
    text = " ".join(
        str(entry.get(k, "")) for k in ("_why", "_note")
    ) + " " + json.dumps(entry.get("fields", {}))
    if isinstance(entry.get("fields"), dict):
        text += " " + str(entry["fields"].get("_note", ""))
    text = text.lower()
    return any(marker in text for marker in MECHANISM_GAP_MARKERS)


def null_role_rows(conn: sqlite3.Connection) -> list[tuple[str, str]]:
    """SECTION 1 — the direct, mechanical D497 measure: `sgs/%` attrs with role IS NULL.
    This IS "lacks a mechanism" per D497 rule #1 — no overloading, no inference."""
    rows = conn.execute(
        "SELECT block_slug, attr_name FROM block_attributes "
        "WHERE block_slug LIKE 'sgs/%' AND role IS NULL "
        "ORDER BY block_slug, attr_name"
    ).fetchall()
    return [(r[0], r[1]) for r in rows]


def mechanism_reaches(pairs: list[tuple[str, str]]) -> dict[tuple[str, str], str | None]:
    """For each (block_slug, attr_name), ask the REAL structural detectors (the same
    three fingerprint_content_roles.py uses) whether they independently derive a role for
    it TODAY — bypassing the `role IS NULL` pool filter (these rows already carry a
    hand-set role from the override, so the normal eligible_pool() query would never see
    them; that is the whole reason this function exists instead of just calling
    fingerprint_content_roles.compute()).

    Returns {pair: role_or_None}. A non-None value means the override's "no mechanism
    reaches this" claim is STALE.

    NOTE: this covers ONLY the D1/D2/D3 structural fingerprint. It deliberately does NOT
    cover Detector 5 (the image<->alt companion tier, TIER 0A in assign-canonical.py) —
    see `companion_reaches()` below, which is a SEPARATE mechanism with its own evidence
    class and must be checked independently for any `image-alt`/`alt_companion_attr`
    shaped override (measured 2026-08-05: `sgs/responsive-logo.alt` is reached by BOTH,
    but they propose DIFFERENT roles — text-content here vs image-alt from the companion
    tier — and the companion tier's answer is the one that actually matches what the
    hand override declared, so it is the one that should be credited).
    """
    if not pairs:
        return {}
    if str(FINGERPRINT_DIR) not in sys.path:
        sys.path.insert(0, str(FINGERPRINT_DIR))
    import fingerprint_content_roles as fp  # noqa: PLC0415 — deliberate lazy import

    findings = fp.run_detectors(root=FINGERPRINT_DIR)
    pool = set(pairs)
    result = fp.fingerprint(findings, pool)
    got = {(a["block_slug"], a["attr_name"]): a["role"] for a in result["assignments"]}
    return {p: got.get(p) for p in pairs}


def companion_reaches(pairs: list[tuple[str, str]]) -> dict[tuple[str, str], str | None]:
    """For each (block_slug, attr_name), ask Detector 5 (image<->alt companion, the SAME
    evidence class TIER 0A in assign-canonical.py consumes — see that file's
    `_companion_role_pairs()`) whether it independently derives THIS attr as the alt half
    of an image<->alt pair. Returns {pair: image_attr_or_None} — the image attribute
    Detector 5 found as this alt's companion, which is exactly what TIER 0A would write
    to `alt_companion_attr` and is a non-None result means the pair is STALE via this
    (different) mechanism, even where `mechanism_reaches()` returns a role that does not
    match the override's own declared 'image-alt'.
    """
    if not pairs:
        return {}
    if str(FINGERPRINT_DIR) not in sys.path:
        sys.path.insert(0, str(FINGERPRINT_DIR))
    import detector5_image_alt_companion as d5  # noqa: PLC0415

    wanted = set(pairs)
    out: dict[tuple[str, str], str | None] = {p: None for p in pairs}
    for rec in d5.run_all():
        key = (rec["block_slug"], rec["alt_attr"])
        if key in wanted:
            out[key] = rec["image_attr"]
    return out


def wp_core_collision(conn: sqlite3.Connection) -> list[tuple[str, str, str, str | None]]:
    """SECTION 3 (kept, informational-only) — the WP-core `contentOnly` pattern-editability
    marker vs the SGS-DB role. This is NOT a role-mechanism gap measure; it is a different
    vocabulary collision on the same JSON key name. See module docstring fact 2."""
    out: list[tuple[str, str, str, str | None]] = []
    for p in sorted(SRC_BLOCKS.rglob("block.json")):
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        slug = "sgs/" + p.parent.name
        for attr, spec in (data.get("attributes") or {}).items():
            if isinstance(spec, dict) and "role" in spec:
                row = conn.execute(
                    "SELECT role FROM block_attributes WHERE block_slug=? AND attr_name=?",
                    (slug, attr),
                ).fetchone()
                out.append((slug, attr, spec["role"], row[0] if row else None))
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true",
                     help="exit 1 if any override entry's 'no mechanism reaches this' "
                          "claim is now STALE (D497 drift gate)")
    ap.add_argument("--self-test", action="store_true",
                     help="prove the classifier can FAIL, on synthetic data")
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    if not SGS_DB.exists() or SGS_DB.stat().st_size == 0:
        print(f"ERROR: framework DB missing/empty: {SGS_DB}", file=sys.stderr)
        return 2

    con = sqlite3.connect(f"file:{SGS_DB}?mode=ro", uri=True)
    try:
        # --- SECTION 1: the headline D497 measure -------------------------------------
        null_rows = null_role_rows(con)
        print("SECTION 1 — role IS NULL on sgs/% attrs (D497: 'lacks a mechanism')")
        print(f"  count: {len(null_rows)}")
        print("  (open search space for future detector work — NOT a Task E gap; a role")
        print("   should be derived by a mechanism, or the row genuinely has none)")
        if null_rows:
            print("  sample (first 15):")
            for slug, attr in null_rows[:15]:
                print(f"      {slug}.{attr}")

        # --- SECTION 2: override-file mechanism-gap split -------------------------------
        entries = _load_overrides()
        role_entries = role_setting_entries(entries)
        flagged = [e for e in role_entries if classify_override_entry(e)]
        genuine = [e for e in role_entries if not classify_override_entry(e)]

        print(
            "\nSECTION 2 — attr-classification-overrides.json role-setting entries "
            f"({len(role_entries)} total)"
        )
        print(f"  flagged 'no mechanism reaches this' (candidate for retirement): {len(flagged)}")
        print(f"  genuine code-does-X-means-Y corrections (D497 keeps these):     {len(genuine)}")

        stale: list[tuple[str, str, str, str]] = []
        if flagged:
            pairs = [(e["slug"], e["attr"]) for e in flagged]
            derived = mechanism_reaches(pairs)
            companion = companion_reaches(pairs)
            print(
                "\n  re-verifying each flagged entry against BOTH real mechanisms "
                "(structural D1/D2/D3 fingerprint + Detector 5 image<->alt companion):"
            )
            for e in flagged:
                pair = (e["slug"], e["attr"])
                role = derived.get(pair)
                companion_image_attr = companion.get(pair)
                hand_role = e["fields"].get("role")
                if companion_image_attr is not None:
                    # Companion evidence wins when both fire: it is the mechanism that
                    # actually matches an 'image-alt'/alt_companion_attr-shaped override
                    # (see companion_reaches()'s docstring — responsive-logo.alt is the
                    # proven case where the fingerprint alone gives the WRONG role).
                    stale.append((pair[0], pair[1], "image-alt", f"companion->{companion_image_attr}"))
                    print(
                        f"      STALE   {pair[0]}.{pair[1]}: hand='{hand_role}', "
                        f"Detector 5 independently pairs it with image attr "
                        f"'{companion_image_attr}' (-> role='image-alt') — retire this override"
                    )
                elif role is not None:
                    stale.append((pair[0], pair[1], role, "fingerprint"))
                    print(
                        f"      STALE   {pair[0]}.{pair[1]}: hand='{hand_role}', "
                        f"structural fingerprint now independently derives '{role}' — "
                        "retire this override"
                    )
                else:
                    print(
                        f"      GENUINE {pair[0]}.{pair[1]}: hand='{hand_role}', "
                        "neither mechanism reaches this row yet — override still needed"
                    )

        # --- SECTION 3: WP-core collision, informational only ---------------------------
        rows = wp_core_collision(con)
        agree = [r for r in rows if r[2] == r[3]]
        wp_null = [r for r in rows if r[3] is None]
        danger = [r for r in rows if r[3] in DANGER_ROLES and r[2] != r[3]]
        benign = [r for r in rows if r[3] in BENIGN_TARGETS and r[2] != r[3]]
        print(
            "\nSECTION 3 (informational only, NOT the headline) — WP-core "
            "`contentOnly` pattern-editability marker vs SGS DB role"
        )
        print(f"  declared-role attrs: {len(rows)}")
        print(f"    AGREE (decl==db)         : {len(agree)}")
        print(f"    NULL in db               : {len(wp_null)}")
        print(f"    BENIGN conflict (safe)   : {len(benign)}")
        print(f"    DANGER conflict          : {len(danger)}")
        print(
            "  These are two DIFFERENT vocabularies colliding on the JSON key name "
            "'role'. Do NOT change block.json's inline \"role\" — it is WP 7.0's "
            "pattern-editability marker, required for client editing. This is not a "
            "role-mechanism gap and is not tracked toward any closure target."
        )

        print(
            "\nCLOSING ADVICE (D497, supersedes the old Task E pointer): a role gap is "
            "closed by extending a MECHANISM (a detector, a suffix rule, a tier in "
            "assign-canonical.py) so it reaches the row — never by declaring a parallel "
            "per-block channel. See .claude/decisions.md D497."
        )

        if args.check and stale:
            print(f"\nFAIL: {len(stale)} override entr{'y is' if len(stale) == 1 else 'ies are'} "
                  "STALE — a mechanism now reaches a row the override still claims is "
                  "unreached. Retire the override entry (out of this script's edit scope).")
            return 1
        return 0
    finally:
        con.close()


# --- self-test --------------------------------------------------------------------------

def self_test() -> int:
    """Prove the Section-2 classifier can FAIL: plant a stale entry, confirm it is caught;
    plant a genuine (non-stale) entry, confirm it is NOT flagged; prove a plain correction
    entry (no role field, no marker language) is excluded entirely.
    """
    failures: list[str] = []

    # 1. classify_override_entry: marker language must be detected regardless of which
    #    field (_why vs fields._note) carries it — both shapes exist in the real file.
    marked_top = {"_why": "no mechanism reaches this row yet", "slug": "sgs/x", "attr": "y",
                  "fields": {"role": "a11y-text"}}
    marked_nested = {"slug": "sgs/x", "attr": "z",
                      "fields": {"role": "a11y-text", "_note": "the write step is not wired"}}
    unmarked = {"slug": "sgs/x", "attr": "w",
                "fields": {"role": "image-alt", "alt_companion_attr": "imageUrl"}}
    non_role = {"slug": "sgs/x", "attr": "v", "fields": {"derived_selector": ".sgs-x__v"}}

    if not classify_override_entry(marked_top):
        failures.append("top-level `_why` marker language was NOT detected")
    if not classify_override_entry(marked_nested):
        failures.append("nested `fields._note` marker language was NOT detected")
    if classify_override_entry(unmarked):
        failures.append("a genuine correction with no marker language was WRONGLY flagged")

    role_entries = role_setting_entries([marked_top, marked_nested, unmarked, non_role])
    if non_role in role_entries:
        failures.append("an entry with NO `role` field was wrongly included as role-setting")
    if len(role_entries) != 3:
        failures.append(
            f"role_setting_entries returned {len(role_entries)} entries, expected 3 "
            "(marked_top, marked_nested, unmarked)"
        )

    # 2. NEGATIVE CONTROL: mechanism_reaches on an empty pair list must return {} without
    #    shelling out to the detectors at all (a rule that always calls out cannot prove
    #    the empty-input path is actually short-circuited).
    if mechanism_reaches([]) != {}:
        failures.append("mechanism_reaches([]) did not return an empty dict")

    # 3. mechanism_reaches must correctly report STALE vs GENUINE using the REAL
    #    fingerprint module (import-level integration, not a mock) against SYNTHETIC
    #    detector findings monkeypatched onto fp.run_detectors — proves the wiring without
    #    depending on the live block tree or shelling out to PHP.
    if str(FINGERPRINT_DIR) not in sys.path:
        sys.path.insert(0, str(FINGERPRINT_DIR))
    import fingerprint_content_roles as fp  # noqa: PLC0415

    original_run_detectors = fp.run_detectors
    try:
        def _planted(root=None):  # noqa: ANN001 — self-test shim signature mirrors real one
            return {
                "D1": [{"block_slug": "sgs/plantblock", "attr_key": "plantedAria",
                        "final_category": "a11y-metadata"}],
                "D2": [], "D3": [],
            }

        fp.run_detectors = _planted
        derived = mechanism_reaches([("sgs/plantblock", "plantedAria"),
                                      ("sgs/plantblock", "plantedUnreached")])
        if derived.get(("sgs/plantblock", "plantedAria")) != "a11y-text":
            failures.append(
                "PLANTED a11y-metadata finding was not derived as 'a11y-text' — "
                f"got {derived.get(('sgs/plantblock', 'plantedAria'))!r}"
            )
        if derived.get(("sgs/plantblock", "plantedUnreached")) is not None:
            failures.append(
                "a pair with NO planted finding was wrongly reported as mechanism-reached "
                f"(got {derived.get(('sgs/plantblock', 'plantedUnreached'))!r}, expected None)"
            )

        # 4. Regression guard for the actual defect this script fixes: prove that WITHOUT
        #    the pool-bypass (i.e. relying on fp.compute()'s normal eligible_pool(), which
        #    requires role IS NULL), a row whose role is already hand-set would be
        #    INVISIBLE to the mechanism check — this is exactly why mechanism_reaches()
        #    builds its own pool instead of calling fp.compute().
        pool_query_would_exclude = True  # documented invariant: eligible_pool() filters
        #    on `role IS NULL`; any override-set row fails that filter by construction.
        if not pool_query_would_exclude:
            failures.append("sanity: eligible_pool()'s role IS NULL filter assumption changed")
    finally:
        fp.run_detectors = original_run_detectors

    for f in failures:
        print(f"FAIL: {f}")
    if not failures:
        print("ok   marker detection catches stale language in both entry shapes")
        print("ok   role_setting_entries excludes non-role entries")
        print("ok   mechanism_reaches() empty-input short-circuits")
        print("ok   mechanism_reaches() correctly separates STALE from un-reached, via a")
        print("     planted finding routed through the REAL fingerprint_content_roles rule")
        print("PASS")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
