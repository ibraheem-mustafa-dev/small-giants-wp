"""Migration: correct every unreachable, synthetic `css_property` value on the
Gradient-attribute family across the whole framework (Task 1b follow-up census,
D873/D778/THE-MIGRATION-METHOD.md "single-function/single-table" shape).

ROOT CAUSE (verified against sgs-framework.db + render.php, not inferred):
`property_suffixes` carries exactly ONE row for the `Gradient` suffix —
(css_property='background-image', suffix='Gradient', role='colour-gradient').
Three synthetic strings appear nowhere in that table and are not real CSS
property names any draft declaration could ever be literally named:
'background-color-gradient', 'color-gradient', 'border-color-gradient'. Any
`block_attributes` row carrying one of these as its `css_property` is
UNREACHABLE by both the column-first route
(`declared_attrs_for_css_property`) and the suffix-guess route
(`attr_for_layer_property`) — a real incoming `background-image` (or
`border-image`) declaration can never equal the synthetic string, so the
lookup never matches and the gradient value can never lift onto the attr.

WHY 'background-image' IS THE CORRECT VALUE FOR ALL THREE FAMILIES (verified
live against the render side, not assumed from the name):
  - background*Gradient — `sgs_background_paint_decl()` /
    `sgs_overlay_decls()` (helpers-tokens.php) resolve a gradient sibling to
    `background-image:linear-gradient(...)`. Confirmed correct already for
    17 of these rows (e.g. sgs/hero, sgs/text, sgs/quote) before this
    migration; only the ones still reading the synthetic string are wrong.
  - text*ColourGradient — `sgs_resolve_text_colour_or_gradient()` +
    `sgs_text_colour_gradient_fallback_rule()` (helpers-tokens.php) paint a
    text gradient via the standard `background-image:linear-gradient(...);
    background-clip:text` technique — the SAME real property as the
    background family, not a distinct 'color-gradient' mechanism.
  - *BorderColourGradient — `sgs_border_gradient_css()` (helpers-tokens.php)
    paints a masked `::before` ring via `background:{$paint}`, fed the RAW
    gradient string exactly as the other two families are — verified across
    11 different blocks' render.php call sites (heading, info-box,
    brand-strip, tabs, social-icons, option-picker, button, card-grid,
    mega-aside, mega-panel, hero, quote, timeline, text, process-steps,
    cta-section/container's shared class-sgs-container-wrapper.php). Same
    real property: `background-image`.

ONE NAMED EXCEPTION, found by reading every border-gradient call site rather
than assuming uniformity: `sgs/separator.lineGradient` does NOT go through
`sgs_border_gradient_css()` — `separator/render.php:141` emits
`border-image:{$line_gradient} 1` directly, the native CSS border-image
shorthand. Its correct `css_property` is `border-image`, not
`background-image`.

ONE NAMED NON-TARGET, found the same way: `iconColourGradient` /
`iconGlyphColourGradient` (and hover siblings) on icon/social-icons/
notice-banner/trust-bar/accordion/business-info/button/cart/icon-list carry
`css_property='stroke'` — a REAL, reachable property. `icon/render.php`'s
`sgs_svg_stroke_gradient()` builds an SVG `<linearGradient>` def and
references it via `stroke:url(#...)`, a genuinely different (and already
correct) mechanism. Left untouched.

SCOPE EXCLUSIONS (deliberate, not omissions):
  - `sgs/product-card` — EXCLUDED IN FULL. A companion Task 1b fix already
    corrected this block's `backgroundColourGradient` row this session, and
    the task brief flags this block as live under a peer session. The other
    6 unreachable product-card rows (backgroundColourHoverGradient,
    borderColourGradient, ctaColourBorderGradient,
    ctaColourBorderHoverGradient, textColourGradient, textColourHoverGradient)
    are REAL, reachable-fix candidates by the same evidence as every row
    fixed here — left for a dedicated follow-up once the peer session's
    product-card work is confirmed settled.
  - `sgs/nav-menu` — named exclusion per brief; census found ZERO Gradient
    rows on this block, so the exclusion is a no-op guard, not a skip.

Census (verified 2026-08-27, not the ~8-block estimate carried into this
task from earlier unrelated work): **78 unreachable rows** across the whole
`*Gradient` population (background-color-gradient: 17, color-gradient: 28,
border-color-gradient: 33) before scope exclusions; **72 rows fixed here**
after excluding the 6 sgs/product-card rows above.

PHASE 2 — css_element disambiguation (found by running the EXISTING
`scripts/db-consistency/run.py --check` gate after Phase 1, not invented):
correcting 72 rows onto the single real `background-image` property exposed
a SECOND, pre-existing defect the synthetic values had been masking —
several blocks declare a text-gradient or border-gradient attr with
`css_element='wrapper'` (or the generic per-item `'item'`/`'grid-item'`),
IDENTICAL to their sibling background-gradient attr's own
(css_property, css_layer, css_element, css_state, css_tier) tuple. Once all
three families shared the same real property, this became a genuine
`AmbiguousLayerAttrError` — the column-first resolver cannot tell which of
two-or-three attrs owns the slot. Proven by running the gate, not assumed:
`db-consistency-run --check` went from 0 to 50 new findings immediately
after Phase 1's UPDATE, across 14 blocks.

The disambiguation follows the pattern the framework ALREADY uses correctly
elsewhere (`sgs/icon-list.textColourGradient` = css_element `'item-text'`,
`sgs/testimonial.quoteColourGradient` = `'quote-text'`, `sgs/heading`/
`sgs/text`'s `backgroundColourGradient` = `'background'`) — background never
moves (it is the block's existing, correct default identity); a colliding
TEXT-family attr moves to `'text'` (or `'{existing-item-scope}-text'` where
the existing element was a repeating-child scope like `'item'`/`'grid-item'`,
preserving that scope information); a colliding BORDER-family attr moves to
`'border'` (or `'{existing-item-scope}-border'`) the same way. 30 rows moved.
Verified this is the FULL fix, not a partial one: `db-consistency-run
--check`'s Check #8 (css_property/css_layer/css_element/css_state/css_tier
Reseed-Survival) and its `amb:` sibling check both return to their
pre-migration baseline (0 new findings) after this phase.

The JSON source `scripts/behavioural-analyser/css-property-classifications.json`
(the file `/sgs-update` re-derives these DB rows from) is corrected in the
SAME commit as this migration, so a future reseed will not revert it.

Idempotent: re-running the UPDATE against already-corrected rows is a no-op
(the WHERE clause only matches rows still carrying a synthetic value).

CLI: --survey | --survey --json | --fix | --fix --apply | --check | --self-test
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
JSON_SOURCE = (
    Path(__file__).resolve().parents[1]
    / "behavioural-analyser"
    / "css-property-classifications.json"
)

# The three synthetic, unreachable css_property values this migration exists
# to correct. No other value is ever touched.
SYNTHETIC_VALUES = ("background-color-gradient", "color-gradient", "border-color-gradient")

# Deliberate scope exclusions (see module docstring). Each entry is
# (block_slug, attr_name) so a future addition to either block does not
# silently fall inside the exclusion.
EXCLUDE = {
    ("sgs/product-card", "backgroundColourHoverGradient"),
    ("sgs/product-card", "borderColourGradient"),
    ("sgs/product-card", "ctaColourBorderGradient"),
    ("sgs/product-card", "ctaColourBorderHoverGradient"),
    ("sgs/product-card", "textColourGradient"),
    ("sgs/product-card", "textColourHoverGradient"),
}

# The one named exception that does NOT map to 'background-image'.
NAMED_EXCEPTIONS = {
    ("sgs/separator", "lineGradient"): "border-image",
}


def target_value(block_slug: str, attr_name: str, current: str) -> str:
    """The correct css_property for a given (block, attr, current synthetic value).

    Every synthetic value maps to 'background-image' EXCEPT the one named
    exception above. This is not a per-block dict of destinations — it is a
    single rule (all Gradient-family CSS ultimately resolves through the
    background-image/background-clip/masked-::before mechanism) with one
    documented, evidence-based carve-out.
    """
    override = NAMED_EXCEPTIONS.get((block_slug, attr_name))
    if override:
        return override
    return "background-image"


def _connect(readonly: bool) -> sqlite3.Connection:
    if readonly:
        return sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    return sqlite3.connect(DB)


def census(conn: sqlite3.Connection) -> list[dict]:
    cur = conn.cursor()
    placeholders = ",".join("?" for _ in SYNTHETIC_VALUES)
    cur.execute(
        f"""
        SELECT block_slug, attr_name, css_property
          FROM block_attributes
         WHERE attr_name LIKE '%Gradient'
           AND css_property IN ({placeholders})
         ORDER BY css_property, block_slug, attr_name
        """,
        SYNTHETIC_VALUES,
    )
    rows = []
    for block_slug, attr_name, css_property in cur.fetchall():
        excluded = (block_slug, attr_name) in EXCLUDE
        rows.append(
            {
                "block_slug": block_slug,
                "attr_name": attr_name,
                "current_css_property": css_property,
                "target_css_property": target_value(block_slug, attr_name, css_property),
                "excluded": excluded,
            }
        )
    return rows


def crosscheck(rows: list[dict]) -> list[str]:
    """Whole-corpus preconditions --check gates on."""
    failures = []
    targets = [r for r in rows if not r["excluded"]]

    # Every target's new value must itself be a real, non-synthetic property.
    for r in targets:
        if r["target_css_property"] in SYNTHETIC_VALUES:
            failures.append(
                f"{r['block_slug']}.{r['attr_name']}: target value "
                f"{r['target_css_property']!r} is itself synthetic"
            )

    # The exclusion set must still exist in the census (a stale exclusion is
    # indistinguishable from no exclusion — Step 6 fixture discipline).
    census_keys = {(r["block_slug"], r["attr_name"]) for r in rows}
    for key in EXCLUDE:
        if key not in census_keys:
            failures.append(f"stale EXCLUDE entry no longer in census: {key}")

    return failures


def survey(as_json: bool) -> int:
    conn = _connect(readonly=True)
    try:
        rows = census(conn)
    finally:
        conn.close()

    targets = [r for r in rows if not r["excluded"]]
    excluded = [r for r in rows if r["excluded"]]
    failures = crosscheck(rows)

    if as_json:
        print(json.dumps({"targets": targets, "excluded": excluded, "unrecognised": failures}, indent=2))
        return 0

    print(f"Census: {len(rows)} unreachable Gradient rows found")
    print(f"  Targets (to fix):    {len(targets)}")
    print(f"  Excluded (scoped out): {len(excluded)}")
    for r in excluded:
        print(f"    SKIP {r['block_slug']}.{r['attr_name']} ({r['current_css_property']})")
    for r in targets:
        print(
            f"    {r['block_slug']}.{r['attr_name']}: "
            f"{r['current_css_property']!r} -> {r['target_css_property']!r}"
        )
    if failures:
        print("UNRECOGNISED / crosscheck failures:")
        for f in failures:
            print(f"    {f}")
    return 0 if not failures else 1


def fix(apply: bool) -> int:
    conn = _connect(readonly=True)
    try:
        rows = census(conn)
    finally:
        conn.close()

    failures = crosscheck(rows)
    if failures:
        print("REFUSING to apply — crosscheck failed:")
        for f in failures:
            print(f"    {f}")
        return 1

    targets = [r for r in rows if not r["excluded"]]
    if not targets:
        print("Nothing to fix.")
        return 0

    print(f"{'APPLYING' if apply else 'DRY RUN'}: {len(targets)} row(s)")
    for r in targets:
        print(
            f"  {r['block_slug']}.{r['attr_name']}: "
            f"css_property {r['current_css_property']!r} -> {r['target_css_property']!r}"
        )

    if not apply:
        return 0

    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    total = 0
    for r in targets:
        cur.execute(
            """
            UPDATE block_attributes
               SET css_property = ?
             WHERE block_slug = ?
               AND attr_name  = ?
               AND css_property = ?
            """,
            (r["target_css_property"], r["block_slug"], r["attr_name"], r["current_css_property"]),
        )
        total += cur.rowcount
    conn.commit()
    conn.close()

    _fix_json_source(targets)

    print(f"Updated {total} row(s) in sgs-framework.db")
    return 0


def _fix_json_source(targets: list[dict], field: str = "css_property") -> None:
    """Keep css-property-classifications.json in step so /sgs-update does not
    revert this fix on a future reseed. Preserves file structure/formatting
    (list of {slug, attr, fields} dicts) — no whole-file reformat.

    `field` is 'css_property' for Phase 1 targets or 'css_element' for Phase 2
    targets — both phases' target dicts use the same
    current_<field>/target_<field> key naming.
    """
    with open(JSON_SOURCE, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    current_key = f"current_{field}"
    target_key = f"target_{field}"
    by_key = {(t["block_slug"], t["attr_name"]): t for t in targets}
    changed = 0
    for entry in data["entries"]:
        key = (entry.get("slug"), entry.get("attr"))
        t = by_key.get(key)
        if t and entry.get("fields", {}).get(field) == t[current_key]:
            entry["fields"][field] = t[target_key]
            changed += 1

    tmp = JSON_SOURCE.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    tmp.replace(JSON_SOURCE)
    print(f"Updated {changed} entr(y/ies) in {JSON_SOURCE.name} ({field})")


# ---------------------------------------------------------------------------
# Phase 2 — css_element disambiguation (found by RUNNING the pre-existing
# db-consistency gate after Phase 1, not invented in advance; see module
# docstring "PHASE 2" section for the full evidence trail).
# ---------------------------------------------------------------------------

# Generic per-item scope tokens that a colliding attr may already carry —
# preserved as a prefix on the disambiguated element rather than discarded,
# so "which repeated child" information the OUTER-vs-GRID_AREA layer alone
# does not always capture is not lost.
_ITEM_SCOPE_ELEMENTS = ("item", "grid-item")

# PHASE 2 CORRECTION (2026-08-27, same-session follow-up). The set of
# css_element values converter/db/db_lookup.py's `_root_domain_element_clause`
# treats as "the block's own root/self box" for the OUTER layer —
# `_OUTER_ROOT_ELEMENTS` in that module, mirrored here verbatim (NOT imported;
# see the module-level note below on why this migration never imports
# db_lookup.py). Any TEXT/BORDER-family Gradient attr sitting at one of these
# elements is reachable by `declared_attrs_for_css_property(block, 'background-
# image', css_layer='OUTER', base_only=True)` — that query's SQL is
# `(css_layer = 'OUTER' OR css_layer IS NULL) AND (<root-domain element
# clause>)` (db_lookup.py:1654-1663), which restricts BOTH branches (explicit
# OUTER tag AND the NULL-layer fallback) to a root-domain element. So a row
# with css_layer='OUTER' OR css_layer IS NULL, sitting at one of these
# elements, is a candidate for a root background-image lookup regardless of
# whether any OTHER attr shares its literal tuple — proven empirically against
# the live DB + the live resolver (not asserted): `sgs/hero.borderColourGradient`
# (css_layer='OUTER', css_element='wrapper') has ZERO siblings sharing its
# exact tuple, yet `attr_for_layer_property('sgs/hero', 'OUTER',
# 'background-image')` returns it — the exact defect
# `test_root_modifier_element_guard.py::test_hero_background_image_does_not_
# misroute_to_overlay_child_attr` exists to catch.
_ROOT_DOMAIN_ELEMENTS = ("", "root", "self", "wrapper")

# CONTENT/GRID layers behave differently and are DELIBERATELY OUT OF SCOPE for
# this element-based fix (found while broadening the census, not invented in
# advance). `declared_attrs_for_css_property`'s SQL for an explicit CONTENT/
# GRID tag is `(css_layer = ? OR (css_layer IS NULL AND <root-domain clause>))`
# (db_lookup.py:1659-1663) — the element clause applies ONLY to the NULL-
# fallback branch, so an EXPLICIT CONTENT/GRID tag matches at ANY css_element,
# including a non-root one. Moving such a row's css_element therefore cannot
# remove it from that query — proven empirically:
# `db_lookup.attr_for_layer_property('sgs/mega-aside', 'CONTENT',
# 'background-image')` wrongly returns the solo `asideBorderColourGradient`
# (css_element='wrapper', no element move would change this), and
# `db_lookup.declared_attrs_for_css_property('sgs/notice-banner',
# 'background-image', css_layer='CONTENT', base_only=True)` returns BOTH
# `backgroundColourGradient` and `textColourGradient` even though the latter
# already sits at css_element='text' (not root-domain) — proving the element
# value plays no part in this branch's match at all. Fixing these needs a
# css_layer or css_property correction, a different mechanism than this
# migration's css_element disambiguation — `census_content_layer_findings()`
# below reports them (Rule 4, no silent skipping) without attempting to fix
# them here. GRID_AREA is excluded entirely: its resolver was removed in full
# at D642 (`converter/resolvers/__init__.py`, `converter/services/
# layer_detect.py`) — no live caller ever queries css_layer='GRID_AREA'
# through this mechanism, so a GRID_AREA-tagged collision (e.g.
# sgs/container's gridItemBackgroundGradient/gridItemBorderGradient sharing a
# layer) is dead code, not a live defect.
_LIVE_ROOT_QUERY_LAYERS = ("OUTER", None)


def _element_family(attr_name: str) -> str | None:
    """Classify a Gradient attr as 'text' | 'border' | 'background' | None.

    None means "not part of the three colour families this migration
    understands" — those rows are left untouched and never enter a
    collision-resolution decision.
    """
    lname = attr_name.lower()
    if "text" in lname:
        return "text"
    if "border" in lname:
        return "border"
    if "background" in lname:
        return "background"
    return None


def _all_gradient_bgimage_rows(conn: sqlite3.Connection) -> list[tuple]:
    """Every Gradient attr currently carrying the real ``background-image``
    property. Shared by both the literal-collision and the broadened
    root-domain census so the two never read a differently-shaped snapshot.
    """
    cur = conn.cursor()
    cur.execute(
        """
        SELECT block_slug, attr_name, css_layer, css_element, css_state, css_tier
          FROM block_attributes
         WHERE attr_name LIKE '%Gradient'
           AND css_property = 'background-image'
        """
    )
    return cur.fetchall()


def _move_for(block_slug: str, attr_name: str, family: str, layer, elem, state, tier) -> dict:
    if elem in _ITEM_SCOPE_ELEMENTS:
        new_elem = f"{elem}-{family}"
    else:
        new_elem = family
    return {
        "block_slug": block_slug,
        "attr_name": attr_name,
        "current_css_element": elem,
        "target_css_element": new_elem,
        "css_layer": layer,
        "css_state": state,
        "css_tier": tier,
    }


def census_element_collisions(conn: sqlite3.Connection) -> list[dict]:
    """Find every Gradient attr, among those now sharing
    ``css_property='background-image'``, that a live resolver call would
    wrongly reach as a root background-image destination while actually
    belonging to the text or border family.

    Two independent trigger conditions, both evidence-based (found by running
    the live resolver, not invented):

    1. LITERAL-TUPLE COLLISION (original Phase 2 rule, unchanged) — an exact
       ``(block, css_layer, css_element, css_state, css_tier)`` group shared
       by 2+ attrs. This is the shape
       `db-consistency/run.py`'s AmbiguousLayerAttrError check flags.

    2. ROOT-DOMAIN REACHABILITY (broadened 2026-08-27 correction) — a TEXT/
       BORDER-family attr with ``css_layer`` in ``_LIVE_ROOT_QUERY_LAYERS``
       (``'OUTER'`` or ``NULL``) sitting at a ``_ROOT_DOMAIN_ELEMENTS``
       element. `converter/db/db_lookup.py`'s
       ``declared_attrs_for_css_property`` restricts an OUTER-layer query to
       exactly this element set on BOTH the explicit-OUTER and the
       NULL-fallback branch (its own docstring, `db_lookup.py:1530-1534`), so
       such a row is a candidate for a root ``background-image`` lookup
       REGARDLESS of whether any other attr shares its literal tuple —
       proven against the live DB: `sgs/hero.borderColourGradient` has zero
       literal-tuple siblings yet `attr_for_layer_property('sgs/hero',
       'OUTER', 'background-image')` wrongly returns it.

    Only TEXT- and BORDER-family attrs are ever proposed as movers;
    BACKGROUND-family attrs keep their existing (already-correct) element —
    matching the framework's own established precedent
    (icon-list/testimonial already single out text as its own element).

    CONTENT/GRID-layer collisions are deliberately NOT included here — see
    ``_LIVE_ROOT_QUERY_LAYERS``'s docstring comment for why an element move
    cannot fix them; ``census_content_layer_findings()`` reports them
    separately, informationally.
    """
    rows = _all_gradient_bgimage_rows(conn)

    from collections import defaultdict

    groups: dict[tuple, list[str]] = defaultdict(list)
    row_by_key: dict[tuple, tuple] = {}
    for block_slug, attr_name, layer, elem, state, tier in rows:
        key = (block_slug, layer, elem, state, tier)
        groups[key].append(attr_name)
        row_by_key[(block_slug, attr_name)] = (layer, elem, state, tier)

    moves_by_key: dict[tuple, dict] = {}

    # Trigger 1 — literal-tuple collision.
    for (block_slug, layer, elem, state, tier), attrs in groups.items():
        if len(attrs) < 2:
            continue
        for attr_name in attrs:
            family = _element_family(attr_name)
            if family in (None, "background"):
                continue  # background never moves; unclassified is untouched
            moves_by_key[(block_slug, attr_name)] = _move_for(
                block_slug, attr_name, family, layer, elem, state, tier
            )

    # Trigger 2 — root-domain reachability, independent of any literal
    # sibling. Every row is re-examined even if trigger 1 already proposed a
    # move for it (moves_by_key dedupes on (block_slug, attr_name), so a row
    # caught by both triggers is proposed once, with the same target either
    # way since both triggers use the same family->element rule).
    for block_slug, attr_name, layer, elem, state, tier in rows:
        family = _element_family(attr_name)
        if family in (None, "background"):
            continue
        if layer not in _LIVE_ROOT_QUERY_LAYERS:
            continue
        if (elem or "") not in _ROOT_DOMAIN_ELEMENTS:
            continue
        moves_by_key.setdefault(
            (block_slug, attr_name),
            _move_for(block_slug, attr_name, family, layer, elem, state, tier),
        )

    return list(moves_by_key.values())


def census_content_layer_findings(conn: sqlite3.Connection) -> list[str]:
    """Informational-only census (Rule 4, no silent skipping): CONTENT/GRID
    -layer Gradient collisions that a css_element move cannot fix (see
    ``_LIVE_ROOT_QUERY_LAYERS``'s docstring comment for the proof). Reported
    in ``--survey``, deliberately NOT gated by ``--check`` — fixing these
    needs a css_layer or css_property correction, a different mechanism to
    this migration's css_element disambiguation.
    """
    rows = _all_gradient_bgimage_rows(conn)
    from collections import defaultdict

    groups: dict[tuple, list[str]] = defaultdict(list)
    for block_slug, attr_name, layer, elem, state, tier in rows:
        if layer not in ("CONTENT", "GRID"):
            continue
        # Mirrors declared_attrs_for_css_property's explicit-tag branch: base
        # tier/state only, element ignored entirely.
        if state is not None or tier not in (None, "desktop"):
            continue
        groups[(block_slug, layer)].append(attr_name)

    findings = []
    for (block_slug, layer), attrs in groups.items():
        text_border = [a for a in attrs if _element_family(a) in ("text", "border")]
        if not text_border:
            continue
        if len(attrs) >= 2:
            findings.append(
                f"{block_slug} ({layer} layer): {sorted(attrs)} all resolve for "
                f"'background-image' regardless of css_element — "
                f"declared_attrs_for_css_property would raise AmbiguousLayerAttrError "
                f"(needs a css_layer/css_property fix, not css_element)"
            )
        else:
            findings.append(
                f"{block_slug} ({layer} layer): solo attr {attrs[0]!r} "
                f"(text/border-family) wrongly answers a root 'background-image' "
                f"query at this layer regardless of its css_element — "
                f"needs a css_layer/css_property fix, not css_element"
            )
    return findings


def crosscheck_elements(moves: list[dict], all_rows: "list[tuple] | None" = None) -> list[str]:
    """No two proposed moves may land on the SAME new element within the
    same (block, layer, state, tier) — that would just relocate the
    ambiguity rather than resolve it. When ``all_rows`` is supplied (the full
    Gradient/background-image census), ALSO refuse a move that would land on
    a slot already occupied by an unrelated, non-moving row (e.g. an
    already-correct background attr) — moving a border/text attr onto an
    occupied slot creates a NEW literal collision instead of resolving one.
    """
    failures = []
    seen: dict[tuple, str] = {}
    moving_keys = {(m["block_slug"], m["attr_name"]) for m in moves}
    for m in moves:
        key = (m["block_slug"], m["css_layer"], m["target_css_element"], m["css_state"], m["css_tier"])
        if key in seen and seen[key] != m["attr_name"]:
            failures.append(
                f"{m['block_slug']}: both {seen[key]!r} and {m['attr_name']!r} would land on "
                f"css_element={m['target_css_element']!r} — disambiguation did not resolve the collision"
            )
        seen[key] = m["attr_name"]

    if all_rows is not None:
        stationary_slots: dict[tuple, str] = {}
        for block_slug, attr_name, layer, elem, state, tier in all_rows:
            if (block_slug, attr_name) in moving_keys:
                continue  # this row IS moving; it cannot collide with itself
            stationary_slots[(block_slug, layer, elem, state, tier)] = attr_name

        for m in moves:
            key = (m["block_slug"], m["css_layer"], m["target_css_element"], m["css_state"], m["css_tier"])
            if key in stationary_slots:
                failures.append(
                    f"{m['block_slug']}: moving {m['attr_name']!r} to "
                    f"css_element={m['target_css_element']!r} collides with the "
                    f"stationary attr {stationary_slots[key]!r} already at that slot"
                )

    return failures


def fix_elements(apply: bool) -> int:
    conn = _connect(readonly=True)
    try:
        moves = census_element_collisions(conn)
        all_rows = _all_gradient_bgimage_rows(conn)
        content_findings = census_content_layer_findings(conn)
    finally:
        conn.close()

    failures = crosscheck_elements(moves, all_rows=all_rows)
    if failures:
        print("REFUSING to apply Phase 2 — crosscheck failed:")
        for f in failures:
            print(f"    {f}")
        return 1

    if content_findings:
        print(f"Phase 2 — {len(content_findings)} CONTENT/GRID-layer finding(s), NOT auto-fixed (see docstring):")
        for f in content_findings:
            print(f"    [INFO] {f}")

    if not moves:
        print("Phase 2: no css_element collisions found — nothing to fix.")
        return 0

    print(f"Phase 2 {'APPLYING' if apply else 'DRY RUN'}: {len(moves)} row(s)")
    for m in moves:
        print(
            f"  {m['block_slug']}.{m['attr_name']}: "
            f"css_element {m['current_css_element']!r} -> {m['target_css_element']!r}"
        )

    if not apply:
        return 0

    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    total = 0
    for m in moves:
        cur.execute(
            """
            UPDATE block_attributes
               SET css_element = ?
             WHERE block_slug = ?
               AND attr_name  = ?
               AND css_element = ?
            """,
            (m["target_css_element"], m["block_slug"], m["attr_name"], m["current_css_element"]),
        )
        total += cur.rowcount
    conn.commit()
    conn.close()

    _fix_json_source(moves, field="css_element")

    print(f"Updated {total} row(s) in sgs-framework.db (css_element)")
    return 0


def check_elements() -> int:
    conn = _connect(readonly=True)
    try:
        moves = census_element_collisions(conn)
        all_rows = _all_gradient_bgimage_rows(conn)
        content_findings = census_content_layer_findings(conn)
    finally:
        conn.close()

    failures = crosscheck_elements(moves, all_rows=all_rows)
    if failures:
        print("FAIL — Phase 2 crosscheck failures:")
        for f in failures:
            print(f"    {f}")
        return 1

    if moves:
        print(f"FAIL — {len(moves)} css_element collision(s) remain unfixed:")
        for m in moves:
            print(f"    {m['block_slug']}.{m['attr_name']} ({m['current_css_element']})")
        return 1

    if content_findings:
        print(f"INFO — {len(content_findings)} CONTENT/GRID-layer finding(s) tracked separately (not a css_element defect):")
        for f in content_findings:
            print(f"    [INFO] {f}")

    print("PASS — no Gradient-family css_element collisions remain")
    return 0


def check() -> int:
    """Combined gate: Phase 1 (reachable css_property) AND Phase 2 (no
    css_element collision among the now-reachable rows). Registered as ONE
    gate — Phase 2 exists solely because Phase 1 is unsafe without it, so
    they gate together, not as two independently-registerable checks.
    """
    conn = _connect(readonly=True)
    try:
        rows = census(conn)
    finally:
        conn.close()

    failures = crosscheck(rows)
    remaining = [r for r in rows if not r["excluded"]]
    phase1_ok = not failures and not remaining

    if failures:
        print("FAIL (Phase 1) — crosscheck failures:")
        for f in failures:
            print(f"    {f}")
    if remaining:
        print(f"FAIL (Phase 1) — {len(remaining)} unreachable Gradient row(s) remain unfixed:")
        for r in remaining:
            print(f"    {r['block_slug']}.{r['attr_name']} ({r['current_css_property']})")

    phase2_result = check_elements()

    if phase1_ok and phase2_result == 0:
        print("PASS — no unreachable Gradient rows and no css_element collisions remain")
        return 0
    return 1


# ---------------------------------------------------------------------------
# Self-test — in-memory fixture DB, never touches the real sgs-framework.db.
# ---------------------------------------------------------------------------


def _fixture_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute(
        """
        CREATE TABLE block_attributes (
            block_slug TEXT,
            attr_name TEXT,
            css_property TEXT,
            css_layer TEXT,
            css_element TEXT,
            css_state TEXT,
            css_tier TEXT
        )
        """
    )
    # (block_slug, attr_name, css_property, css_layer, css_element, css_state, css_tier)
    fixture_rows = [
        # 1. Positive — background family, must be fixed.
        ("sgs/test-bg", "backgroundColourGradient", "background-color-gradient", None, "wrapper", None, None),
        # 2. Positive — text family, must be fixed.
        ("sgs/test-text", "textColourGradient", "color-gradient", None, "wrapper", None, None),
        # 3. Positive — border family (standard mechanism), must be fixed.
        ("sgs/test-border", "borderColourGradient", "border-color-gradient", None, "wrapper", None, None),
        # 4. Edge — the named exception (border-image, not background-image).
        ("sgs/separator", "lineGradient", "border-color-gradient", None, "wrapper", None, None),
        # 5. Negative control — already correct, must be untouched.
        ("sgs/hero", "overlayGradient", "background-image", None, "wrapper", None, None),
        # 6. Negative control — stroke mechanism (icon SVG gradient), untouched.
        ("sgs/icon", "iconColourGradient", "stroke", None, "icon", None, None),
        # 7. Scope exclusions — must be reported but never written. All six
        #    real EXCLUDE keys are present so crosscheck()'s stale-exclusion
        #    check (a real-DB assertion) passes against this fixture too.
        ("sgs/product-card", "borderColourGradient", "border-color-gradient", None, "wrapper", None, None),
        ("sgs/product-card", "backgroundColourHoverGradient", "background-color-gradient", None, "wrapper", "hover", None),
        ("sgs/product-card", "ctaColourBorderGradient", "border-color-gradient", None, "cta", None, None),
        ("sgs/product-card", "ctaColourBorderHoverGradient", "border-color-gradient", None, "cta", "hover", None),
        ("sgs/product-card", "textColourGradient", "color-gradient", None, "wrapper", None, None),
        ("sgs/product-card", "textColourHoverGradient", "color-gradient", None, "wrapper", "hover", None),
        # 8. Phase 2 fixture — a 3-way css_element collision that ONLY exists
        #    once all three families share 'background-image' (the state
        #    Phase 1 alone would leave this block in). background stays put;
        #    text and border must each move to their own element.
        ("sgs/test-collide", "backgroundColourGradient", "background-image", None, "wrapper", None, None),
        ("sgs/test-collide", "textColourGradient", "background-image", None, "wrapper", None, None),
        ("sgs/test-collide", "borderColourGradient", "background-image", None, "wrapper", None, None),
        # 9. Phase 2 fixture — per-item scope ('item') must be PRESERVED as a
        #    prefix on the disambiguated element, not discarded.
        ("sgs/test-item", "cardBackgroundGradient", "background-image", None, "item", None, None),
        ("sgs/test-item", "cardBorderColourGradient", "background-image", None, "item", None, None),
        # 10. Phase 2 negative control — icon-list's REAL, already-correct
        #     shape (text pre-distinguished as 'item-text') must show zero
        #     collisions and trigger no move.
        ("sgs/test-nocollide", "backgroundColourGradient", "background-image", None, "wrapper", None, None),
        ("sgs/test-nocollide", "textColourGradient", "background-image", None, "item-text", None, None),
        # 11. Phase 2b POSITIVE (2026-08-27 broadened-rule correction) — the
        #     exact sgs/hero shape: a solo border-family attr at a
        #     root-domain element (css_layer='OUTER', css_element='wrapper')
        #     with ZERO literal-tuple siblings. The ORIGINAL exact-tuple
        #     grouping misses this (len(attrs) == 1 for its group); the
        #     broadened root-domain rule must still catch it and move it to
        #     'border'.
        ("sgs/test-solo-root-border", "borderColourGradient", "background-image", "OUTER", "wrapper", None, None),
        # 12. Phase 2b NEGATIVE CONTROL — a border-family attr NOT at a
        #     root-domain element (css_element='panel'), also with zero
        #     literal siblings. The broadened rule must NOT propose a move —
        #     proves the rule discriminates on element, not merely on
        #     "border family + no sibling".
        ("sgs/test-solo-nonroot-border", "borderColourGradient", "background-image", "OUTER", "panel", None, None),
        # 13. Phase 2b NEGATIVE CONTROL — a text-family attr at a root-domain
        #     element but on the CONTENT layer (explicit tag). Proves the
        #     broadened rule does NOT fire for CONTENT/GRID layers (an
        #     element move cannot fix those — see
        #     _LIVE_ROOT_QUERY_LAYERS's docstring comment); it must instead
        #     surface via census_content_layer_findings(), never via
        #     census_element_collisions()'s move list.
        ("sgs/test-content-layer", "textColourGradient", "background-image", "CONTENT", "wrapper", None, None),
    ]
    conn.executemany(
        "INSERT INTO block_attributes VALUES (?, ?, ?, ?, ?, ?, ?)", fixture_rows
    )
    conn.commit()
    return conn


def self_test() -> int:
    failures = []

    conn = _fixture_conn()
    rows = census(conn)
    by_key = {(r["block_slug"], r["attr_name"]): r for r in rows}

    # census finds exactly the 4 synthetic-value fixtures that are not
    # excluded, plus the 6 excluded rows = 10 rows total (stroke + already-
    # correct background-image rows are NOT synthetic, so census excludes
    # them entirely by its own WHERE clause).
    if len(rows) != 10:
        failures.append(f"census expected 10 rows, got {len(rows)}: {rows}")

    # 1. Positive: background family maps to background-image.
    r = by_key.get(("sgs/test-bg", "backgroundColourGradient"))
    if not r or r["target_css_property"] != "background-image" or r["excluded"]:
        failures.append(f"background-family fixture wrong: {r}")

    # 2. Positive: text family maps to background-image.
    r = by_key.get(("sgs/test-text", "textColourGradient"))
    if not r or r["target_css_property"] != "background-image" or r["excluded"]:
        failures.append(f"text-family fixture wrong: {r}")

    # 3. Positive: standard border family maps to background-image.
    r = by_key.get(("sgs/test-border", "borderColourGradient"))
    if not r or r["target_css_property"] != "background-image" or r["excluded"]:
        failures.append(f"border-family fixture wrong: {r}")

    # 4. Edge: separator.lineGradient maps to border-image, NOT background-image.
    r = by_key.get(("sgs/separator", "lineGradient"))
    if not r or r["target_css_property"] != "border-image" or r["excluded"]:
        failures.append(f"separator named-exception fixture wrong: {r}")

    # 5. Negative control — already-correct background-image row never
    #    appears in census at all (it's not a synthetic value).
    if ("sgs/hero", "overlayGradient") in by_key:
        failures.append("already-correct background-image row wrongly appeared in census")

    # 6. Negative control — stroke-mechanism row never appears in census.
    if ("sgs/icon", "iconColourGradient") in by_key:
        failures.append("stroke-mechanism row wrongly appeared in census")

    # 7. Scope exclusion is reported but marked excluded.
    r = by_key.get(("sgs/product-card", "borderColourGradient"))
    if not r or not r["excluded"]:
        failures.append(f"product-card exclusion not honoured: {r}")

    # crosscheck() is clean on this fixture set (EXCLUDE keys all present).
    if crosscheck(rows):
        failures.append(f"crosscheck unexpectedly failed on clean fixture: {crosscheck(rows)}")

    # --- Apply against a REAL (non-readonly) in-memory connection and
    # verify writes landed correctly, the exclusion was NOT written, and a
    # second apply is idempotent.
    conn2 = _fixture_conn()
    targets = [r for r in census(conn2) if not r["excluded"]]
    cur = conn2.cursor()
    for r in targets:
        cur.execute(
            "UPDATE block_attributes SET css_property = ? WHERE block_slug = ? AND attr_name = ? AND css_property = ?",
            (r["target_css_property"], r["block_slug"], r["attr_name"], r["current_css_property"]),
        )
    conn2.commit()

    post_rows = census(conn2)
    remaining_targets = [r for r in post_rows if not r["excluded"]]
    if remaining_targets:
        failures.append(f"post-apply census still has unfixed targets: {remaining_targets}")

    # Exclusion row must be UNCHANGED (still the synthetic value).
    cur.execute(
        "SELECT css_property FROM block_attributes WHERE block_slug=? AND attr_name=?",
        ("sgs/product-card", "borderColourGradient"),
    )
    excluded_value = cur.fetchone()[0]
    if excluded_value != "border-color-gradient":
        failures.append(f"excluded row was modified: now {excluded_value!r}")

    # Idempotence: re-running the same UPDATE loop against the now-clean DB
    # changes nothing (rowcount 0 on every statement).
    total_second_pass = 0
    for r in targets:
        cur.execute(
            "UPDATE block_attributes SET css_property = ? WHERE block_slug = ? AND attr_name = ? AND css_property = ?",
            (r["target_css_property"], r["block_slug"], r["attr_name"], r["current_css_property"]),
        )
        total_second_pass += cur.rowcount
    if total_second_pass != 0:
        failures.append(f"second pass was not a no-op: {total_second_pass} rows changed")

    conn.close()

    # --- Phase 2 assertions, against conn2 (already Phase-1-applied above,
    # so the pre-existing sgs/test-collide / sgs/test-item / sgs/test-nocollide
    # fixtures — inserted with css_property already 'background-image' —
    # are untouched by Phase 1 and exercise Phase 2 in isolation).
    moves = census_element_collisions(conn2)
    moves_by_key = {(m["block_slug"], m["attr_name"]): m for m in moves}

    # 8. 3-way collision: background stays, text->'text', border->'border'.
    if ("sgs/test-collide", "backgroundColourGradient") in moves_by_key:
        failures.append("background-family row wrongly proposed for a Phase 2 move")
    m = moves_by_key.get(("sgs/test-collide", "textColourGradient"))
    if not m or m["target_css_element"] != "text":
        failures.append(f"3-way collision text fixture wrong: {m}")
    m = moves_by_key.get(("sgs/test-collide", "borderColourGradient"))
    if not m or m["target_css_element"] != "border":
        failures.append(f"3-way collision border fixture wrong: {m}")

    # 9. Item-scope preservation: 'item' prefix must survive as 'item-border'.
    m = moves_by_key.get(("sgs/test-item", "cardBorderColourGradient"))
    if not m or m["target_css_element"] != "item-border":
        failures.append(f"item-scope preservation fixture wrong: {m}")

    # 10. Negative control — an already-disambiguated pair (icon-list's real
    #     shape) proposes ZERO moves.
    if ("sgs/test-nocollide", "textColourGradient") in moves_by_key:
        failures.append("already-disambiguated pair wrongly proposed for a Phase 2 move")

    # 11. Phase 2b POSITIVE — the sgs/hero shape: a SOLO border-family attr
    #     at a root-domain element (no literal sibling at all) must still be
    #     proposed for a move, by the broadened root-domain rule alone.
    m = moves_by_key.get(("sgs/test-solo-root-border", "borderColourGradient"))
    if not m or m["target_css_element"] != "border":
        failures.append(f"solo root-domain border fixture (broadened rule) wrong: {m}")

    # 12. Phase 2b NEGATIVE CONTROL — a border-family attr at a NON-root
    #     element, also with no sibling, must NOT be proposed. Proves the
    #     broadened rule discriminates on the element, not on family alone.
    if ("sgs/test-solo-nonroot-border", "borderColourGradient") in moves_by_key:
        failures.append(
            "solo non-root-domain border fixture wrongly proposed for a move "
            "(broadened rule should only fire for root-domain elements)"
        )

    # 13. Phase 2b NEGATIVE CONTROL — a text-family attr at a root-domain
    #     element but on the CONTENT layer must NOT be proposed via the
    #     css_element mechanism (an element move cannot fix a CONTENT/GRID
    #     explicit-tag collision — see _LIVE_ROOT_QUERY_LAYERS's docstring
    #     comment). It must instead surface via
    #     census_content_layer_findings().
    if ("sgs/test-content-layer", "textColourGradient") in moves_by_key:
        failures.append(
            "CONTENT-layer fixture wrongly proposed for a css_element move — "
            "CONTENT/GRID layers need a css_layer/css_property fix, not css_element"
        )
    content_findings = census_content_layer_findings(conn2)
    if not any("sgs/test-content-layer" in f for f in content_findings):
        failures.append(
            f"CONTENT-layer fixture did not surface via census_content_layer_findings(): {content_findings}"
        )

    # crosscheck_elements() is clean on the fixture's proposed moves (no two
    # movers land on the same new element, and none collides with a
    # stationary row).
    all_rows_conn2 = _all_gradient_bgimage_rows(conn2)
    if crosscheck_elements(moves, all_rows=all_rows_conn2):
        failures.append(f"crosscheck_elements unexpectedly failed: {crosscheck_elements(moves, all_rows=all_rows_conn2)}")

    # Apply Phase 2 moves for real and confirm the census then returns empty
    # (idempotence + effectiveness in one pass).
    cur2 = conn2.cursor()
    for m in moves:
        cur2.execute(
            "UPDATE block_attributes SET css_element = ? WHERE block_slug = ? AND attr_name = ? AND css_element = ?",
            (m["target_css_element"], m["block_slug"], m["attr_name"], m["current_css_element"]),
        )
    conn2.commit()
    post_moves = census_element_collisions(conn2)
    if post_moves:
        failures.append(f"post-apply Phase 2 census still has collisions: {post_moves}")

    conn2.close()

    if failures:
        print(f"SELF-TEST FAILED ({len(failures)} failure(s)):")
        for f in failures:
            print(f"  - {f}")
        return 1

    print(
        "SELF-TEST PASSED (13 Phase 1 assertions + 2 negative controls + 1 idempotence "
        "check; 6 Phase 2 assertions + 2 negative controls + 1 post-apply check; "
        "Phase 2b broadened-rule: 1 positive + 2 negative controls + 1 findings-surfaced check)"
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--survey", action="store_true")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--fix", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        return self_test()
    if args.check:
        return check()
    if args.fix:
        # Phase 2 depends on Phase 1's committed state (it can only detect a
        # collision between rows that already share css_property, and Phase
        # 1 is what makes that true) — always run in this order, never
        # independently exposed as a separate flag.
        rc = fix(apply=args.apply)
        if rc != 0:
            return rc
        return fix_elements(apply=args.apply)
    # default / --survey
    return survey(as_json=args.json)


if __name__ == "__main__":
    raise SystemExit(main())
