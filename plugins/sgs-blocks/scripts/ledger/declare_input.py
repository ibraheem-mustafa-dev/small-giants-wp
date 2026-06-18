"""
ledger.declare_input — F2 draft-derived CSS Accounting Ledger (input parser).

Spec ref: .claude/plans/2026-06-18-f2-css-accounting-ledger-design.md §4-§8

INDEPENDENCE CONTRACT:
  This module must NOT import css_router, convert, or db_lookup.
  Must NOT query the converter DB tables (no DB access of any kind).
  Owns its own independent tinycss2 parse.

Usage (CLI):
  python declare_input.py [--fixtures-dir <path>] [--out-dir <path>] [--check] [--regenerate]

  --check       Re-run and diff against committed goldens; exit-nonzero on drift
                or if any per-fixture row_count DECREASES vs committed golden.
  --regenerate  Overwrite goldens and append reason to _ledger/REGEN-LOG.md
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import textwrap
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterator

import tinycss2  # type: ignore[import]

# Support both package import (from ledger.declare_input import ...) and
# direct script execution (python declare_input.py).
try:
    from .models import DeclKind, InputDecl, LedgerParseError, MediaKind
except ImportError:
    # Direct script execution — add parent to path
    import sys as _sys
    _sys.path.insert(0, str(Path(__file__).parent.parent))
    from ledger.models import DeclKind, InputDecl, LedgerParseError, MediaKind  # type: ignore[no-redef]

# ---------------------------------------------------------------------------
# Module provenance (written into every artefact)
# ---------------------------------------------------------------------------

MODULE_VERSION = "0.1.0"
TINYCSS2_VERSION = tinycss2.__version__

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Google Fonts and other well-known font CDNs are allowed @import targets.
# Everything else → LedgerParseError (fail-closed).
_FONT_IMPORT_ALLOW_RE = re.compile(
    r"(fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit|use\.fontawesome)",
    re.IGNORECASE,
)

# Tier breakpoint thresholds (all units px, per SGS device-tier spec).
#
# CANONICAL-THRESHOLD MATCHING (not a <= range) — D228 /
# device-tier-vs-visual-breakpoints-are-distinct. An arbitrary VISUAL breakpoint
# (max-width:600/640/481/781, min-width:768-alone, min-width:1280) is NOT a device
# tier and MUST NOT be snapped into one — that is a CHEAT (rt-media-600.expected.md
# line 47). Only the exact SGS device-tier threshold values match a tier:
#   max-width in {767, 767.98, 768}              → Mobile
#   min-width 768 AND max-width in {1023, 1024}  → Tablet
#   min-width 1024, no max-width                 → Desktop
#   EVERYTHING ELSE                              → Other:<verbatim-condition>
_MOBILE_MAX_CANONICAL = {767.0, 767.98, 768.0}
_TABLET_MIN_CANONICAL = {768.0}
_TABLET_MAX_CANONICAL = {1023.0, 1024.0}
_DESKTOP_MIN_CANONICAL = {1024.0}

# ---------------------------------------------------------------------------
# Inline HTML parser — extracts <style> blocks and style="" attributes
# ---------------------------------------------------------------------------

class _HTMLExtractor(HTMLParser):
    """Lightweight HTML parser that collects:

    - Every <style> element's text content, in document order.
      Skips content inside <template> elements.
    - Every style="" attribute as a synthetic inline-style entry.
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.style_blocks: list[str] = []
        self.inline_styles: list[tuple[str, str]] = []  # (element_path, css_text)
        self._in_style = False
        self._in_template = 0
        self._style_buf: list[str] = []
        self._tag_stack: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag_lower = tag.lower()
        self._tag_stack.append(tag_lower)

        if tag_lower == "template":
            self._in_template += 1
            return

        if self._in_template:
            return

        if tag_lower == "style":
            self._in_style = True
            self._style_buf = []
            return

        # Collect style="" attributes on any element.
        attr_dict = {k.lower(): v for k, v in attrs}
        if "style" in attr_dict and attr_dict["style"]:
            # Build a synthetic element path for the selector field.
            path = self._element_path(tag_lower, attrs)
            self.inline_styles.append((path, attr_dict["style"]))

    def handle_endtag(self, tag: str) -> None:
        tag_lower = tag.lower()
        if tag_lower == "template":
            self._in_template = max(0, self._in_template - 1)
        if tag_lower == "style" and self._in_style:
            self._in_style = False
            self.style_blocks.append("".join(self._style_buf))
        if self._tag_stack and self._tag_stack[-1] == tag_lower:
            self._tag_stack.pop()

    def handle_data(self, data: str) -> None:
        if self._in_style and not self._in_template:
            self._style_buf.append(data)

    def _element_path(self, tag: str, attrs: list[tuple[str, str | None]]) -> str:
        """Build a human-readable element path for inline-style selector field."""
        attr_dict = {k.lower(): v for k, v in attrs}
        classes = attr_dict.get("class", "")
        id_ = attr_dict.get("id", "")
        parts = [tag]
        if id_:
            parts.append(f"#{id_}")
        if classes:
            for cls in classes.split():
                parts.append(f".{cls}")
        return "".join(parts)


# ---------------------------------------------------------------------------
# Tier derivation (§5)
# ---------------------------------------------------------------------------

def _extract_media_features(condition: str) -> dict[str, float | None]:
    """Parse numeric min-width / max-width values from a @media condition string.

    Returns dict with keys 'min_width' and 'max_width' (float or None).
    Handles e.g. '(max-width: 767px)', '(min-width: 768px) and (max-width: 1023px)'.
    Only px units are recognised for tier classification.
    """
    result: dict[str, float | None] = {"min_width": None, "max_width": None}

    max_match = re.search(r"max-width\s*:\s*([\d.]+)px", condition, re.IGNORECASE)
    if max_match:
        result["max_width"] = float(max_match.group(1))

    min_match = re.search(r"min-width\s*:\s*([\d.]+)px", condition, re.IGNORECASE)
    if min_match:
        result["min_width"] = float(min_match.group(1))

    return result


def _derive_tier(media: str | None, media_kind: MediaKind) -> str:
    """Derive the accounting-only device tier label per §5 (D228-corrected).

    CANONICAL-THRESHOLD matching — a device tier matches ONLY the exact SGS
    threshold values, NOT a <= range. An arbitrary visual breakpoint
    (max-width:600/640/481/781, min-width:768-alone, min-width:1280) is NOT a
    device tier; snapping it into one is a CHEAT (D228 /
    device-tier-vs-visual-breakpoints-are-distinct, rt-media-600.expected.md L47).

    Base    : media is None, or media_kind != media
    Mobile  : max-width in {767, 767.98, 768} and no min-width
    Tablet  : min-width 768 AND max-width in {1023, 1024}
    Desktop : min-width 1024 and no max-width
    Other:X : EVERYTHING ELSE — verbatim condition preserved

    A standalone @media (min-width:768px) is Other: by design — it spans Tablet+Desktop.
    A @media (max-width:600px) is Other: by design — a visual breakpoint, not a tier.
    """
    if media is None or media_kind != MediaKind.media:
        return "Base"

    features = _extract_media_features(media)
    min_w = features["min_width"]
    max_w = features["max_width"]

    # Mobile: a canonical max-width threshold, no min-width component.
    if min_w is None and max_w is not None and max_w in _MOBILE_MAX_CANONICAL:
        return "Mobile"

    # Tablet: canonical min-width 768 AND canonical max-width (1023/1024).
    if (
        min_w is not None
        and max_w is not None
        and min_w in _TABLET_MIN_CANONICAL
        and max_w in _TABLET_MAX_CANONICAL
    ):
        return "Tablet"

    # Desktop: canonical min-width 1024 with no max-width.
    if min_w is not None and min_w in _DESKTOP_MIN_CANONICAL and max_w is None:
        return "Desktop"

    # Everything else is Other — preserve the verbatim condition.
    return f"Other:{media}"


# ---------------------------------------------------------------------------
# At-rule classifier
# ---------------------------------------------------------------------------

def _classify_at_rule(at_keyword: str, prelude_text: str) -> DeclKind:
    """Return the DeclKind for a structural at-rule."""
    kw = at_keyword.lower().strip()
    if kw == "keyframes" or kw.endswith("-keyframes"):
        return DeclKind.at_keyframes
    if kw == "font-face":
        return DeclKind.at_fontface
    if kw == "import":
        return DeclKind.at_import
    return DeclKind.at_other


def _extract_import_host(prelude_text: str) -> str:
    """Extract the host component from an @import prelude string.

    Handles:
    - url('https://host/path')
    - url("https://host/path")
    - url(https://host/path)
    - 'https://host/path'
    - "https://host/path"

    Returns the host only (lowercased), or the full prelude if no URL can be parsed.
    This prevents substring spoofing such as
    ``@import url('/evil.css?ref=fonts.googleapis.com')`` from passing the
    allow-list check (SF-2).
    """
    import urllib.parse

    # Strip url(...) wrapper if present
    stripped = prelude_text.strip()
    url_match = re.match(r'''url\(\s*['"]?([^'")\s]+)['"]?\s*\)''', stripped, re.IGNORECASE)
    if url_match:
        raw_url = url_match.group(1)
    else:
        # Bare quoted string: 'https://...' or "https://..."
        quote_match = re.match(r'''['"](.*?)['"]''', stripped)
        if quote_match:
            raw_url = quote_match.group(1)
        else:
            # Cannot parse URL — return the whole prelude so the allow-list check
            # will run against it (worst case: falls through to the raise).
            return prelude_text

    try:
        parsed = urllib.parse.urlparse(raw_url)
        host = parsed.netloc.lower()
        if host:
            return host
        # No host (relative URL or bare path) — no font CDN can match.
        # Return a sentinel that will never match the allow-list, triggering the raise.
        return "__no-host__"
    except Exception:
        return raw_url


def _check_import(prelude_text: str) -> None:
    """Raise LedgerParseError for non-font @import URLs (fail-closed per §4.4).

    SF-2: the allow-list is matched against the extracted HOST only, not as a
    substring anywhere in the full prelude string.  This prevents spoofing via
    query-string parameters such as ``url('/evil.css?ref=fonts.googleapis.com')``.
    """
    host = _extract_import_host(prelude_text)
    if _FONT_IMPORT_ALLOW_RE.search(host):
        return  # Google Fonts / Typekit — allowed
    raise LedgerParseError(
        f"@import outside font CDN is not allowed (fail-closed): {prelude_text!r}. "
        "F2 cannot account for imported declarations."
    )


# ---------------------------------------------------------------------------
# Declaration classifier
# ---------------------------------------------------------------------------

def _classify_declaration(prop: str) -> DeclKind:
    """Classify a property as box-css or custom-prop."""
    if prop.startswith("--"):
        return DeclKind.custom_prop
    return DeclKind.box_css


# ---------------------------------------------------------------------------
# Selector splitting (§4.5 — use tinycss2 prelude, not str.split(','))
# ---------------------------------------------------------------------------

def _split_selector_list(prelude: list) -> list[str]:
    """Split a tinycss2 prelude token list into individual selectors.

    tinycss2 represents comma-separated selectors as a flat token sequence
    with whitespace/delimiters.  We serialise and split on commas that are
    NOT inside parentheses (handles :is(.a,.b) etc.).
    """
    raw = tinycss2.serialize(prelude).strip()
    selectors: list[str] = []
    current: list[str] = []
    depth = 0
    for ch in raw:
        if ch in ("(", "["):
            depth += 1
            current.append(ch)
        elif ch in (")", "]"):
            depth = max(0, depth - 1)
            current.append(ch)
        elif ch == "," and depth == 0:
            sel = "".join(current).strip()
            if sel:
                selectors.append(sel)
            current = []
        else:
            current.append(ch)
    sel = "".join(current).strip()
    if sel:
        selectors.append(sel)
    return selectors if selectors else [raw]


# ---------------------------------------------------------------------------
# Core recursive CSS walker
# ---------------------------------------------------------------------------

def _walk_css(
    css_text: str,
    fixture_stem: str,
    counter: list[int],
    media_stack: list[tuple[str, MediaKind]],  # innermost last
    rows: list[InputDecl],
) -> None:
    """Recursively walk a tinycss2 AST, emitting InputDecl rows.

    counter[0] is the monotonic source_index, mutated in-place.
    media_stack tracks nested @media/@supports conditions.
    """
    try:
        parsed = tinycss2.parse_stylesheet(css_text, skip_comments=True, skip_whitespace=True)
    except Exception as exc:
        raise LedgerParseError(f"tinycss2 parse_stylesheet failed: {exc}") from exc

    # Current effective media context: innermost @media condition from the stack.
    # For tier, we use the innermost @media; if none, base.
    def effective_media() -> tuple[str | None, MediaKind]:
        """Return (serialised-condition, kind) for the current nesting context.

        MF-2: when there are ≥2 nesting levels (e.g. @supports inside @media or
        @media inside @supports), the FULL stack is serialised into the ``media``
        field as outer→inner joined with " && ".  Tier derivation still reads
        only the innermost @media condition so existing tier goldens are unchanged.
        """
        if not media_stack:
            return None, MediaKind.none

        if len(media_stack) == 1:
            return media_stack[0]

        # ≥2 levels: serialise the full stack (outer→inner) with " && ".
        # Determine the dominant kind for the returned MediaKind:
        # prefer 'media' over 'supports' so the tier algorithm sees @media conditions.
        full_condition = " && ".join(cond for cond, _ in media_stack)
        # The MediaKind for tier derivation comes from the *innermost* @media entry.
        innermost_media_kind = MediaKind.none
        for cond, kind in reversed(media_stack):
            if kind == MediaKind.media:
                innermost_media_kind = MediaKind.media
                break
            if kind == MediaKind.supports:
                innermost_media_kind = MediaKind.supports
                # Keep looking — there may be a @media further out.

        return full_condition, innermost_media_kind

    for node in parsed:
        if node.type == "qualified-rule":
            # Split selector list via prelude.
            try:
                selector_parts = _split_selector_list(node.prelude)
            except Exception as exc:
                raise LedgerParseError(f"Selector split failed: {exc}") from exc

            # Parse declarations from the rule body.
            try:
                decl_text = tinycss2.serialize(node.content)
                decl_tokens = tinycss2.parse_declaration_list(
                    decl_text, skip_comments=True, skip_whitespace=True
                )
            except Exception as exc:
                raise LedgerParseError(f"Declaration parse failed: {exc}") from exc

            for selector in selector_parts:
                med_cond, med_kind = effective_media()
                tier = _derive_tier(med_cond, med_kind)

                for token in decl_tokens:
                    if token.type == "error":
                        raise LedgerParseError(
                            f"Declaration parse error in selector {selector!r}: {token}"
                        )
                    if token.type in ("comment", "whitespace"):
                        # MF-3: harmless structural tokens — safe to skip.
                        continue
                    if token.type == "at-rule":
                        # MF-3: at-rule inside a declaration list is malformed — fail-closed.
                        raise LedgerParseError(
                            f"Unexpected at-rule inside declaration list for selector "
                            f"{selector!r} (fail-closed). CSS is malformed."
                        )
                    if token.type != "declaration":
                        # MF-3: any other unexpected token type — fail-closed.
                        raise LedgerParseError(
                            f"Unexpected token type {token.type!r} inside declaration list "
                            f"for selector {selector!r} (fail-closed)."
                        )

                    prop = token.name.lower().strip()
                    if not prop:
                        # MF-1: empty property name is malformed — fail-closed.
                        raise LedgerParseError(
                            f"Empty property name in declaration inside selector {selector!r} "
                            "(malformed CSS — fail-closed)."
                        )

                    # Serialise value, extract !important.
                    raw_value = tinycss2.serialize(token.value).strip()
                    important = bool(token.important)
                    # Scrub any residual !important text from value (defensive).
                    value = re.sub(r"\s*!important\s*$", "", raw_value, flags=re.IGNORECASE).strip()

                    # MF-1: empty VALUE is captured (ledger records it; gate decides).
                    # Do NOT silently drop it — a missing declaration is what F2 exists to catch.

                    kind = _classify_declaration(prop)
                    idx = counter[0]
                    counter[0] += 1

                    rows.append(InputDecl(
                        fixture=fixture_stem,
                        selector=selector,
                        property=prop,
                        value=value,
                        important=important,
                        media=med_cond,
                        media_kind=med_kind,
                        tier=tier,
                        source_index=idx,
                        shadowed=False,  # computed after all rows collected
                        kind=kind,
                        excluded_candidate=False,
                    ))

        elif node.type == "at-rule":
            kw = node.lower_at_keyword

            if kw in ("media", "supports"):
                try:
                    condition = tinycss2.serialize(node.prelude).strip()
                except Exception as exc:
                    raise LedgerParseError(f"@{kw} condition serialise failed: {exc}") from exc

                mk = MediaKind.media if kw == "media" else MediaKind.supports
                if not node.content:
                    # SF-1: blockless @media/@supports has no body — fail-closed.
                    raise LedgerParseError(
                        f"@{kw} {condition!r} has no content block (fail-closed). "
                        "A blockless at-rule cannot be accounted for."
                    )
                inner_css = tinycss2.serialize(node.content)
                media_stack.append((condition, mk))
                try:
                    _walk_css(inner_css, fixture_stem, counter, media_stack, rows)
                finally:
                    media_stack.pop()

            elif kw in ("keyframes", "-webkit-keyframes", "-moz-keyframes"):
                # Emit one row for the whole @keyframes block.
                med_cond, med_kind = effective_media()
                tier = _derive_tier(med_cond, med_kind)
                prelude = tinycss2.serialize(node.prelude).strip()
                idx = counter[0]
                counter[0] += 1
                rows.append(InputDecl(
                    fixture=fixture_stem,
                    selector=f"@keyframes {prelude}",
                    property="@keyframes",
                    value=prelude,
                    important=False,
                    media=med_cond,
                    media_kind=med_kind,
                    tier=tier,
                    source_index=idx,
                    shadowed=False,
                    kind=DeclKind.at_keyframes,
                    excluded_candidate=True,
                ))

            elif kw == "font-face":
                med_cond, med_kind = effective_media()
                tier = _derive_tier(med_cond, med_kind)
                idx = counter[0]
                counter[0] += 1
                rows.append(InputDecl(
                    fixture=fixture_stem,
                    selector="@font-face",
                    property="@font-face",
                    value="@font-face",
                    important=False,
                    media=med_cond,
                    media_kind=med_kind,
                    tier=tier,
                    source_index=idx,
                    shadowed=False,
                    kind=DeclKind.at_fontface,
                    excluded_candidate=True,
                ))

            elif kw == "import":
                prelude = tinycss2.serialize(node.prelude).strip()
                _check_import(prelude)  # raises on non-font imports
                med_cond, med_kind = effective_media()
                tier = _derive_tier(med_cond, med_kind)
                idx = counter[0]
                counter[0] += 1
                rows.append(InputDecl(
                    fixture=fixture_stem,
                    selector="@import",
                    property="@import",
                    value=prelude,
                    important=False,
                    media=med_cond,
                    media_kind=med_kind,
                    tier=tier,
                    source_index=idx,
                    shadowed=False,
                    kind=DeclKind.at_import,
                    excluded_candidate=True,
                ))

            elif kw == "layer":
                # @layer is structural — emit as at-other, don't recurse into it
                # (it may contain qualified rules but we treat it as an at-other block).
                # If it has content (block @layer), emit one at-other row.
                med_cond, med_kind = effective_media()
                tier = _derive_tier(med_cond, med_kind)
                prelude = tinycss2.serialize(node.prelude).strip()
                idx = counter[0]
                counter[0] += 1
                rows.append(InputDecl(
                    fixture=fixture_stem,
                    selector=f"@layer {prelude}",
                    property="@layer",
                    value=prelude,
                    important=False,
                    media=med_cond,
                    media_kind=med_kind,
                    tier=tier,
                    source_index=idx,
                    shadowed=False,
                    kind=DeclKind.at_other,
                    excluded_candidate=True,
                ))

            else:
                # Unknown at-rule — fail-closed.
                raise LedgerParseError(
                    f"Unknown at-rule @{kw} — cannot account for its declarations "
                    f"(fail-closed). Add to the allowlist in declare_input.py if intentional."
                )

        elif node.type == "error":
            raise LedgerParseError(f"CSS parse error node: {node}")

        # whitespace / comment nodes are ignored (skip_whitespace=True above, but be safe)


# ---------------------------------------------------------------------------
# Inline style parser
# ---------------------------------------------------------------------------

def _parse_inline_style(
    css_text: str,
    element_path: str,
    fixture_stem: str,
    counter: list[int],
    rows: list[InputDecl],
) -> None:
    """Parse a style="" attribute value and emit InputDecl rows.

    Selector = '[inline:<element_path>]'
    media = None, media_kind = none, tier = Base, kind = inline-style.
    """
    selector = f"[inline:{element_path}]"
    try:
        tokens = tinycss2.parse_declaration_list(css_text, skip_comments=True, skip_whitespace=True)
    except Exception as exc:
        raise LedgerParseError(f"Inline style parse failed for {selector!r}: {exc}") from exc

    for token in tokens:
        if token.type == "error":
            raise LedgerParseError(
                f"Inline style parse error in {selector!r}: {token}"
            )
        if token.type in ("comment", "whitespace"):
            continue
        if token.type != "declaration":
            raise LedgerParseError(
                f"Unexpected token type {token.type!r} inside inline style for "
                f"{selector!r} (fail-closed)."
            )
        prop = token.name.lower().strip()
        if not prop:
            # MF-1: empty property name is malformed — fail-closed.
            raise LedgerParseError(
                f"Empty property name in inline style for {selector!r} "
                "(malformed CSS — fail-closed)."
            )
        raw_value = tinycss2.serialize(token.value).strip()
        important = bool(token.important)
        value = re.sub(r"\s*!important\s*$", "", raw_value, flags=re.IGNORECASE).strip()
        # MF-1: empty VALUE is captured (ledger records it; gate decides).

        idx = counter[0]
        counter[0] += 1
        rows.append(InputDecl(
            fixture=fixture_stem,
            selector=selector,
            property=prop,
            value=value,
            important=important,
            media=None,
            media_kind=MediaKind.none,
            tier="Base",
            source_index=idx,
            shadowed=False,
            kind=DeclKind.inline_style,
            excluded_candidate=False,
        ))


# ---------------------------------------------------------------------------
# Shadowing computation
# ---------------------------------------------------------------------------

def _compute_shadowed(rows: list[InputDecl]) -> list[InputDecl]:
    """Mark cascade losers: for each (selector, property, media) group,
    all rows except the last (highest source_index) are shadowed.

    Only applies to box-css and custom-prop rows (not structural at-rules or inline-style).
    """
    # Build a map from (selector, property, media) → list of source_indexes, in order
    from collections import defaultdict
    key_to_indexes: dict[tuple, list[int]] = defaultdict(list)

    for row in rows:
        if row.kind in (DeclKind.box_css, DeclKind.custom_prop):
            key = (row.selector, row.property, row.media)
            key_to_indexes[key].append(row.source_index)

    # For each key, all but the max source_index are shadowed
    shadowed_indexes: set[int] = set()
    for indexes in key_to_indexes.values():
        if len(indexes) > 1:
            losers = sorted(indexes)[:-1]
            shadowed_indexes.update(losers)

    result: list[InputDecl] = []
    for row in rows:
        if row.source_index in shadowed_indexes:
            # Create a new frozen instance with shadowed=True
            result.append(InputDecl(
                fixture=row.fixture,
                selector=row.selector,
                property=row.property,
                value=row.value,
                important=row.important,
                media=row.media,
                media_kind=row.media_kind,
                tier=row.tier,
                source_index=row.source_index,
                shadowed=True,
                kind=row.kind,
                excluded_candidate=row.excluded_candidate,
            ))
        else:
            result.append(row)
    return result


# ---------------------------------------------------------------------------
# Sort (deterministic, codepoint-stable, locale='C' — §4.9)
# ---------------------------------------------------------------------------

def _sort_rows(rows: list[InputDecl]) -> list[InputDecl]:
    """Sort by (selector, media or '', property, source_index) — codepoint order."""
    return sorted(rows, key=lambda r: (r.selector, r.media or "", r.property, r.source_index))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def declare_input(raw_html: str, fixture_stem: str) -> list[InputDecl]:
    """Parse raw HTML and return the complete physical declare_input set.

    Takes raw HTML, extracts all <style> blocks and style="" attributes,
    parses each independently with tinycss2, and returns a sorted, shadowed-marked
    list of InputDecl rows.

    Raises LedgerParseError on:
    - tinycss2 parse/tokenise error
    - non-font @import
    - unknown at-rule
    - any parse error node in the token stream

    Does NOT decompose shorthands (v2 — physical declarations only).
    Does NOT import or query css_router, convert, db_lookup,
    or any converter DB table.
    """
    # Step 1: Extract CSS from HTML
    extractor = _HTMLExtractor()
    extractor.feed(raw_html)

    rows: list[InputDecl] = []
    counter = [0]  # monotonic, mutated in-place

    # Step 2: Parse each <style> block
    for css_text in extractor.style_blocks:
        _walk_css(css_text, fixture_stem, counter, [], rows)

    # Step 3: Parse inline style="" attributes
    for element_path, inline_css in extractor.inline_styles:
        _parse_inline_style(inline_css, element_path, fixture_stem, counter, rows)

    # Step 4: Compute shadowed flags
    rows = _compute_shadowed(rows)

    # Step 5: Sort deterministically
    rows = _sort_rows(rows)

    return rows


# ---------------------------------------------------------------------------
# Artefact helpers
# ---------------------------------------------------------------------------

def _by_kind_counts(rows: list[InputDecl]) -> dict[str, int]:
    """Return {kind_value: count} for all rows."""
    counts: dict[str, int] = {}
    for row in rows:
        k = row.kind.value
        counts[k] = counts.get(k, 0) + 1
    return counts


def _plain_summary(fixture_stem: str, rows: list[InputDecl]) -> str:
    """Generate a plain-English summary line for the non-coder QC owner."""
    total = len(rows)
    non_structural = [
        r for r in rows
        if not r.excluded_candidate and not r.shadowed
    ]
    by_tier: dict[str, int] = {}
    for r in non_structural:
        by_tier[r.tier] = by_tier.get(r.tier, 0) + 1

    tier_str = ", ".join(f"{t}={c}" for t, c in sorted(by_tier.items()))
    return (
        f"{fixture_stem}: {total} total declarations "
        f"({len(non_structural)} non-shadowed, non-structural); "
        f"tiers: {tier_str}. "
        f"[PREDICTION — confirmed by F5/F4 gate, not by this parser]"
    )


def _build_artefact(fixture_stem: str, rows: list[InputDecl]) -> dict:
    """Build the per-fixture JSON artefact."""
    return {
        "fixture": fixture_stem,
        "generated_by": {
            "module": "ledger.declare_input",
            "module_version": MODULE_VERSION,
            "tinycss2_version": TINYCSS2_VERSION,
        },
        "row_count": len(rows),
        "by_kind": _by_kind_counts(rows),
        "plain_summary": _plain_summary(fixture_stem, rows),
        "rows": [r.as_dict() for r in rows],
    }


def generate_goldens(
    fixtures_dir: Path,
    out_dir: Path,
) -> dict[str, dict]:
    """Parse all .draft.html and .html fixtures under fixtures_dir and write goldens.

    Returns {fixture_stem: artefact} for the aggregate.
    """
    out_dir.mkdir(parents=True, exist_ok=True)

    # Collect fixtures: phase-f .draft.html files + conformance .html files
    fixture_files: list[Path] = []
    for f in sorted(fixtures_dir.glob("*.draft.html")):
        fixture_files.append(f)

    # Also process conformance/*.html if passed a parent directory
    conformance_dir = fixtures_dir.parent / "conformance"
    if conformance_dir.exists():
        for f in sorted(conformance_dir.glob("*.html")):
            fixture_files.append(f)

    per_fixture: dict[str, dict] = {}

    for fpath in fixture_files:
        stem = fpath.stem
        # For .draft.html files, strip the .draft suffix to get the fixture stem
        if stem.endswith(".draft"):
            stem = stem[: -len(".draft")]

        raw_html = fpath.read_text(encoding="utf-8")
        rows = declare_input(raw_html, stem)
        artefact = _build_artefact(stem, rows)
        per_fixture[stem] = artefact

        out_path = out_dir / f"{stem}.declare-input.json"
        out_path.write_text(json.dumps(artefact, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"  wrote {out_path.name}  ({artefact['row_count']} rows)")

    # Aggregate artefact
    aggregate = {
        "generated_by": {
            "module": "ledger.declare_input",
            "module_version": MODULE_VERSION,
            "tinycss2_version": TINYCSS2_VERSION,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
        "fixture_count": len(per_fixture),
        "grand_total_rows": sum(a["row_count"] for a in per_fixture.values()),
        "by_kind_totals": _aggregate_kind_totals(per_fixture),
        "fixtures": {
            stem: {
                "row_count": art["row_count"],
                "by_kind": art["by_kind"],
                "plain_summary": art["plain_summary"],
            }
            for stem, art in sorted(per_fixture.items())
        },
    }
    agg_path = out_dir / "declare-input.aggregate.json"
    agg_path.write_text(json.dumps(aggregate, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  wrote {agg_path.name}  (grand total {aggregate['grand_total_rows']} rows across {aggregate['fixture_count']} fixtures)")

    return per_fixture


def _aggregate_kind_totals(per_fixture: dict[str, dict]) -> dict[str, int]:
    totals: dict[str, int] = {}
    for art in per_fixture.values():
        for kind, count in art["by_kind"].items():
            totals[kind] = totals.get(kind, 0) + count
    return totals


def check_goldens(fixtures_dir: Path, out_dir: Path) -> bool:
    """Re-run and diff against committed goldens.

    Returns True if all checks pass, False otherwise.
    Exits nonzero on: any drift, or any per-fixture row_count decrease.
    The count-DECREASE check is the ledger's own integrity guard —
    a silently shrinking ledger is the exact failure F2 exists to catch.
    """
    agg_path = out_dir / "declare-input.aggregate.json"
    if not agg_path.exists():
        print(f"ERROR: no committed aggregate found at {agg_path}")
        print("Run: python declare_input.py  (without --check) to generate goldens first.")
        return False

    committed = json.loads(agg_path.read_text(encoding="utf-8"))
    committed_counts: dict[str, int] = {
        stem: info["row_count"]
        for stem, info in committed.get("fixtures", {}).items()
    }

    # Re-run without writing
    fixture_files: list[Path] = []
    for f in sorted(fixtures_dir.glob("*.draft.html")):
        fixture_files.append(f)
    conformance_dir = fixtures_dir.parent / "conformance"
    if conformance_dir.exists():
        for f in sorted(conformance_dir.glob("*.html")):
            fixture_files.append(f)

    passed = True
    current_counts: dict[str, int] = {}

    for fpath in fixture_files:
        stem = fpath.stem
        if stem.endswith(".draft"):
            stem = stem[: -len(".draft")]
        raw_html = fpath.read_text(encoding="utf-8")
        rows = declare_input(raw_html, stem)
        current_counts[stem] = len(rows)

        # Check per-fixture golden file
        golden_path = out_dir / f"{stem}.declare-input.json"
        if not golden_path.exists():
            print(f"  DRIFT: no golden for {stem} — run without --check to generate")
            passed = False
            continue

        golden = json.loads(golden_path.read_text(encoding="utf-8"))
        if golden["row_count"] != len(rows):
            print(
                f"  DRIFT: {stem}  row_count {golden['row_count']} → {len(rows)} "
                f"({'DECREASE — ledger integrity FAIL' if len(rows) < golden['row_count'] else 'increase'})"
            )
            passed = False
        else:
            # Deep check rows
            current_rows = [r.as_dict() for r in _sort_rows(_compute_shadowed(rows))]
            if current_rows != golden["rows"]:
                print(f"  DRIFT: {stem}  row content changed (same count, different rows)")
                passed = False
            else:
                print(f"  OK: {stem}  ({len(rows)} rows)")

    # Count-floor check: no fixture may have decreased vs committed
    for stem, committed_count in committed_counts.items():
        current = current_counts.get(stem, 0)
        if current < committed_count:
            print(
                f"  COUNT-FLOOR FAIL: {stem} dropped from {committed_count} → {current}. "
                "A shrinking ledger is the exact failure F2 exists to catch."
            )
            passed = False

    if passed:
        print("--check: all goldens match.")
    else:
        print("--check: FAILED — drift or count-floor violation detected.")
    return passed


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def _build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="F2 CSS Accounting Ledger — input parser",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            Examples:
              python declare_input.py                          # generate goldens
              python declare_input.py --check                  # verify goldens
              python declare_input.py --regenerate --reason "Added new fixture"
        """),
    )
    p.add_argument(
        "--fixtures-dir",
        type=Path,
        default=None,
        help="Path to fixtures/phase-f/ directory (auto-detected if omitted)",
    )
    p.add_argument(
        "--out-dir",
        type=Path,
        default=None,
        help="Path to _ledger/ output directory (auto-detected if omitted)",
    )
    p.add_argument(
        "--check",
        action="store_true",
        help="Re-run and diff against committed goldens; exit-nonzero on drift",
    )
    p.add_argument(
        "--regenerate",
        action="store_true",
        help="Overwrite goldens and append reason to _ledger/REGEN-LOG.md",
    )
    p.add_argument(
        "--reason",
        type=str,
        default="",
        help="Reason for regeneration (used with --regenerate)",
    )
    return p


def _auto_detect_paths() -> tuple[Path, Path]:
    """Auto-detect fixtures_dir and out_dir relative to this file's location."""
    # This file: scripts/ledger/declare_input.py
    # Fixtures:  scripts/tests/fixtures/phase-f/
    # Out:       scripts/tests/fixtures/phase-f/_ledger/
    here = Path(__file__).parent
    scripts_dir = here.parent
    fixtures_dir = scripts_dir / "tests" / "fixtures" / "phase-f"
    out_dir = fixtures_dir / "_ledger"
    return fixtures_dir, out_dir


def main(argv: list[str] | None = None) -> int:
    parser = _build_arg_parser()
    args = parser.parse_args(argv)

    if args.fixtures_dir is None or args.out_dir is None:
        auto_fixtures, auto_out = _auto_detect_paths()
        fixtures_dir = args.fixtures_dir or auto_fixtures
        out_dir = args.out_dir or auto_out
    else:
        fixtures_dir = args.fixtures_dir
        out_dir = args.out_dir

    if not fixtures_dir.exists():
        print(f"ERROR: fixtures directory not found: {fixtures_dir}", file=sys.stderr)
        return 1

    if args.check:
        ok = check_goldens(fixtures_dir, out_dir)
        return 0 if ok else 1

    # Generate goldens
    print(f"Generating goldens from {fixtures_dir} -> {out_dir}")
    per_fixture = generate_goldens(fixtures_dir, out_dir)

    if args.regenerate:
        regen_log = out_dir / "REGEN-LOG.md"
        reason = args.reason or "(no reason given)"
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        with regen_log.open("a", encoding="utf-8") as f:
            f.write(f"\n## {timestamp}\n")
            f.write(f"- fixtures: {fixtures_dir}\n")
            f.write(f"- reason: {reason}\n")
            f.write(f"- fixtures processed: {len(per_fixture)}\n")
        print(f"  appended to {regen_log}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
