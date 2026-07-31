#!/usr/bin/env python3
"""oracle.element_probe — resolve a DRAFT selector to the CLONE element to measure.

Why this module exists
----------------------
The oracle attributes a draft CSS declaration to the section that contains it,
then measures that declaration's value on the live clone. Historically it always
measured the SECTION ROOT. That is correct only for declarations that genuinely
target the root box; for a declaration on a DESCENDANT
(``.sgs-info-box__heading { font-size: 28px }``) it compares the heading's draft
value against the SECTION's computed value. For CSS-inherited properties
(font-size, color, font-weight, line-height — 153 of the corpus's descendant
cells) those two frequently coincide, so the cell scores LANDED without the
transfer ever having been tested. Spec 31 §7b names this the
"coincidental-default match" false win and forbids it.

So every attributed cell must carry its own probe target, or be marked
unmeasurable. This module answers exactly one question:

    given a draft selector and the block slug of the section containing it,
    which element on the RENDERED CLONE carries that declaration's value?

Resolution is DB-first (R-31-1) — there is no hardcoded element vocabulary here.
An element token counts as one this block renders iff the DB says so, via either
of the two columns that record it:

  * ``block_attributes.derived_selector`` — the draft selector an attribute
    lifts FROM (e.g. ``sgs/info-box.heading`` → ``.sgs-info-box__heading``).
    This is the mechanism C1 identified; ``css_element`` alone is not it.
  * ``block_attributes.css_element`` — the element token a declarative CSS
    route targets, synthesised to ``.sgs-<short-slug>__<token>`` exactly as
    ``converter.resolvers.styling_content._short_bem_selector`` does.

A token in NEITHER column is NOT resolvable, and the caller must mark that cell
unmeasurable rather than fall back to the section root. Falling back is the bug
this module exists to prevent. Worked case: ``rt-centred-maxwidth``'s draft
authors its cards as ``.sgs-team-member-grid__photo`` while the section
recognises as ``sgs/container`` — the container renders no ``__photo`` element,
so those 16 cells are honestly UNVERIFIED, not silently measured on the section
box.

Selector shapes handled
-----------------------
    .sgs-info-box__heading          plain element class
    .sgs-trust-bar__icon svg        element class + a descendant tail (kept)
    .sgs-info-box::before           pseudo-element (measured via
                                    getComputedStyle(el, '::before'))
    .sgs-info-box                   the section's own root class → root probe
"""
from __future__ import annotations

import functools
import re
import sqlite3
from pathlib import Path
from typing import NamedTuple, Optional

# The converter's DB layer owns the database location; read it from there rather
# than re-deriving a path (R-31-1 — one source of truth for where the DB lives).
_HERE = Path(__file__).resolve().parent
_SCRIPTS = _HERE.parent
import sys  # noqa: E402

if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from converter.db.db_lookup import SGS_DB  # noqa: E402

# ``css_element`` values that mean "the block's own root box", not a named child.
# Mirrors db_lookup's own OWN-ROOT set (db_lookup.py:740) — the same vocabulary,
# read from the same place conceptually, not a new invention.
_OWN_ROOT_ELEMENTS = frozenset({"", "root", "self", "wrapper"})

# A leading simple class token: ".sgs-info-box__heading" out of
# ".sgs-info-box__heading > span". Deliberately anchored at the START only — the
# remainder is preserved verbatim as the descendant tail.
_LEADING_CLASS_RE = re.compile(r"^\.([A-Za-z0-9_-]+)")

# A BLOCK-level BEM modifier sitting before the element separator:
#   .sgs-hero--video__heading   ->   .sgs-hero__heading
#   .sgs-cta-section--bg__inner ->   .sgs-cta-section__inner
# A draft variant and its base render the SAME element; the DB registers the
# base form, so without this the whole variant's elements read as unregistered.
# The ``--`` must come BEFORE the ``__`` — an ELEMENT modifier
# (``.sgs-hero__title--large``) qualifies the element and is left alone.
# Each segment is an alphanumeric run joined by SINGLE hyphens, so a doubled
# ``--`` can only ever be the modifier separator. Written this way rather than
# with a lazy ``[A-Za-z0-9-]+?`` because that form backtracks super-linearly on
# a long hyphenated class (flagged by the linter).
_SEG = r"[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*"
_BLOCK_MODIFIER_RE = re.compile(rf"^(\.{_SEG})--{_SEG}(__[A-Za-z0-9_-]+)$")


def strip_block_modifier(selector: str) -> Optional[str]:
    """``.sgs-hero--video__heading`` → ``.sgs-hero__heading``; None if N/A."""
    m = _BLOCK_MODIFIER_RE.match(selector)
    return f"{m.group(1)}{m.group(2)}" if m else None


class ProbeTarget(NamedTuple):
    """Where a cell's value must be read on the rendered clone.

    ``selector`` is None when the cell targets the section root (the caller
    then uses the section's own native selector). ``resolvable`` is False when
    no clone element could be identified — the caller MUST then mark the cell
    unmeasurable (``written=False``), never fall back to the root.
    """
    selector: Optional[str]
    pseudo: Optional[str]
    resolvable: bool
    reason: str


@functools.lru_cache(maxsize=256)
def block_element_selectors(block_slug: str) -> frozenset[str]:
    """Every draft element selector the DB says this block renders.

    Union of the two recording columns (see module docstring):
      * distinct non-NULL ``derived_selector`` values, and
      * ``.sgs-<short-slug>__<css_element>`` for each named ``css_element``.

    Own-root element tokens are excluded — they address the block's own root
    box, which is already the default probe, not a named child.
    """
    short = block_slug.split("/", 1)[-1]
    out: set[str] = set()
    try:
        conn = sqlite3.connect(SGS_DB)
    except sqlite3.Error:
        return frozenset()
    try:
        try:
            rows = conn.execute(
                "SELECT derived_selector, css_element FROM block_attributes "
                "WHERE block_slug = ?",
                (block_slug,),
            ).fetchall()
        except sqlite3.OperationalError:
            # Pre-seed DB without the css_element column — degrade to
            # derived_selector alone rather than crashing the measurement.
            rows = [
                (ds, None)
                for (ds,) in conn.execute(
                    "SELECT derived_selector FROM block_attributes WHERE block_slug = ?",
                    (block_slug,),
                ).fetchall()
            ]
    finally:
        conn.close()

    for derived_selector, css_element in rows:
        if derived_selector and isinstance(derived_selector, str):
            # A derived_selector may hold a COMMA-SEPARATED fallback chain —
            # ``.sgs-hero__headline, h1, h2`` is a real stored value. Two sibling
            # consumers of this same column already split it before use
            # (``db_lookup._extract_bem_element``, ``assign-canonical.py``);
            # storing it unsplit here meant a draft rule on the plain
            # ``.sgs-hero__headline`` never matched the literal three-part
            # string, so every hero/cta headline typography rule was forced
            # UNVERIFIED. Safe direction, but a real loss of coverage.
            for part in derived_selector.split(","):
                part = part.strip()
                # Keep only class-led fragments: the bare tag fallbacks (h1, h2)
                # in such a chain are not this block's own element identity and
                # would match any heading on the page.
                if part.startswith("."):
                    out.add(part)
        if css_element and css_element not in _OWN_ROOT_ELEMENTS:
            out.add(f".sgs-{short}__{css_element}")
    return frozenset(s for s in out if s)


def split_pseudo(selector: str) -> tuple[str, Optional[str]]:
    """Split ``.x::before`` into ``('.x', '::before')``; no pseudo → (sel, None)."""
    sel = selector.strip()
    if "::" not in sel:
        return sel, None
    base, _, tail = sel.partition("::")
    return base.strip(), f"::{tail.strip()}"


def resolve_probe(
    selector: str,
    block_slug: str,
    native_selector: str,
    root_classes: frozenset[str] | set[str],
) -> ProbeTarget:
    """Resolve one draft selector to its clone-side probe target.

    Args:
        selector:         the draft rule's selector, verbatim from F2.
        block_slug:       the containing section's recognised block slug.
        native_selector:  the section's clone-side root selector
                          (e.g. ``.wp-block-sgs-info-box``).
        root_classes:     every class on the section's own draft root node —
                          how a root-targeting declaration is recognised
                          WITHOUT assuming the root class is the BEM block name
                          (``rt-centred-maxwidth``'s root is the authored
                          ``.sgs-team-member-grid``, not ``.sgs-container``).
    """
    base, pseudo = split_pseudo(selector)
    base = base.strip()

    m = _LEADING_CLASS_RE.match(base)
    if not m:
        # No leading class token at all (bare tag, ``:root``, ``[attr]``…).
        # Nothing identifies a clone element, so this is unmeasurable — said
        # plainly rather than measured on the wrong node.
        return ProbeTarget(None, pseudo, False,
                           f"no leading class token in {selector!r}")

    leading_class = m.group(1)
    tail = base[m.end():].strip()

    # Case 1 — the declaration targets the section's own root box.
    if leading_class in root_classes and not tail:
        return ProbeTarget(None, pseudo, True, "section root")

    leading_selector = f".{leading_class}"

    # Case 2 — a named element this block renders (DB-confirmed). The draft may
    # carry a BLOCK-level variant modifier the clone does not; both name the
    # same element, so retry against the base form before giving up.
    registered = block_element_selectors(block_slug)
    for candidate, why in (
        (leading_selector, f"DB-registered element {leading_selector}"),
        (strip_block_modifier(leading_selector),
         f"DB-registered element (block modifier stripped from {leading_selector})"),
    ):
        if candidate and candidate in registered:
            probe = f"{native_selector} {candidate}"
            if tail:
                probe = f"{probe} {tail}"
            return ProbeTarget(probe, pseudo, True, why)

    # Case 3 — a descendant of the section root whose element token this block
    # does NOT render (an authored semantic class, e.g.
    # ``.sgs-team-member-grid__photo`` inside an ``sgs/container``). It belongs
    # to the section, but there is no clone element to read it on.
    return ProbeTarget(None, pseudo, False,
                       f"element token {leading_selector} not registered for {block_slug}")
