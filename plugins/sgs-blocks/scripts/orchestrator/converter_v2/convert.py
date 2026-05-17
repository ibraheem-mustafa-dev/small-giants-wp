#!/usr/bin/env python3
"""Deterministic draft-to-SGS converter — prototype v2 (DB-backed).

Replaces the hardcoded CLASS_TO_BLOCK list with three live DB lookups:
  - sgs-framework.db `blocks`           → which sgs/<name> are registered
  - sgs-framework.db `slot_synonyms`    → canonical slots + html semantic tag
  - sgs-framework.db `modifier_suffixes` → canonical BEM modifiers
  - uimax            `naming_conventions` → SGS-BEM parsing regex

Architecture (per Spec 15 §3 + §4):
  1. Parse the source CSS into {selector: declarations}.
  2. Walk the DOM depth-first.
  3. For each node, parse its sgs-* class via the canonical SGS-BEM regex.
  4. If the block portion matches a registered slug AND no element → emit that block.
  5. If the block matches AND there's an element → that element is a slot within
     the block's children OR an attribute on the parent. Recurse into children.
  6. Otherwise emit sgs/container with className preserved. CSS for the selector
     lifts into the variation buffer.
  7. Atoms (h*, p, img, a, button) fall back to core/* or sgs/button.

Usage:
    python convert.py <section.html> <section.css> > output.html
"""
from __future__ import annotations

import functools
import json
import sys
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString, Tag

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# Package-relative import (production path — sys.path.insert not needed here).
# When executed directly as a script (python convert.py), fall back to same-dir import.
try:
    from . import db_lookup as db  # noqa: E402
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent))
    import db_lookup as db  # type: ignore[no-redef]  # noqa: E402

# CSS parsing helpers from prior iteration
import re
_RULE_RE = re.compile(r"([^{}]+)\{([^{}]+)\}", re.DOTALL)
_MEDIA_RE = re.compile(r"@media[^{]+\{((?:[^{}]+\{[^{}]+\})+)\}", re.DOTALL)
_DECL_RE = re.compile(r"\s*([\w-]+)\s*:\s*([^;]+);?\s*", re.DOTALL)

# ============================================================================
# P-CSS-IMPORTANT-STRIP (closed 2026-05-17)
# Strip `!important` from CSS declaration values before equality checks.
# `display: grid !important` must compare equal to "grid" or the
# css_driven_container branch silently skips the whole section.
# ============================================================================
_IMPORTANT_RE = re.compile(r"\s*!important\s*$", re.IGNORECASE)

# ============================================================================
# Universal alignment / width-mode lift (Branch B, 2026-05-19)
# Module-level context populated by `main()` before the per-block lift loop so
# `_lift_root_supports_to_style` can compare mockup `max-width` declarations
# against the active theme's contentSize / wideSize and emit a semantic
# `widthMode` instead of an inline literal-pixel `style.dimensions.maxWidth`.
#
# Universal — derives everything from theme.json + the active style variation;
# no client-specific literals anywhere in this module.
# ============================================================================
_LIFT_CONTEXT: dict = {}

# Fuzzy-match tolerance (percent) used when comparing a mockup max-width to the
# theme's contentSize / wideSize. 1000px vs 1050px should still count as "wide"
# when wideSize is 1000. Configurable here, never buried in logic.
_WIDTH_MATCH_TOLERANCE_PCT: float = 5.0

# Selector regex for SGS-BEM BLOCK ROOT — used by `_detect_client_layout_widths`
# to filter the CSS rule set down to top-level section roots (no __element, no
# --modifier, no descendant combinators).
_SGS_BEM_BLOCK_ROOT_RE = re.compile(r"^\.sgs-[a-z][a-z0-9]*(-[a-z0-9]+)*$")

# CSS lengths we treat as "full-bleed" rather than as a contentSize/wideSize
# candidate. Used by both detection (skip these in clustering) and width-mode
# matching (map directly to `widthMode: full`).
_FULL_BLEED_WIDTH_VALUES = {"none", "100%", "100vw", "auto"}


def _strip_important(value: str) -> str:
    """Remove trailing `!important` (case-insensitive) and any surrounding
    whitespace from a CSS declaration value.

    Closes parking entry P-CSS-IMPORTANT-STRIP (2026-05-17).
    """
    return _IMPORTANT_RE.sub("", value).strip()


# ============================================================================
# P-MULTI-CLASS-BEM-PRIMARY-DISAMBIG (closed 2026-05-17)
# When a node carries multiple sgs-* classes (e.g. `sgs-brand sgs-section
# sgs-section--alt`), pick ONE as the canonical primary BEM block.  Remaining
# classes travel as className additions only.
#
# Selection heuristic (CSS source order wins, subject to filters):
#   1. Strip leading `sgs-`
#   2. Reject BEM modifiers (`--` suffix)
#   3. Reject BEM element qualifiers (`__` suffix)
#   4. Reject known utility-class prefixes (see _UTILITY_PREFIXES below)
#   5. Prefer the first candidate that is a registered block in the DB
#   6. If none registered, take the first passing candidate
#   7. If none pass, return the first sgs-* class unchanged (safe fallback)
# ============================================================================
_UTILITY_PREFIXES: tuple[str, ...] = (
    "utility-",
    "helper-",
    "section",   # bare "section" and "section--alt" etc. are layout utilities
    "grid",
    "flex",
)


def _pick_primary_sgs_block(classes: list[str]) -> tuple[str, list[str]]:
    """Choose the canonical primary BEM-block class from a list of sgs-* classes.

    Returns ``(primary_class, remaining_classes)`` where *primary_class* is the
    chosen class string (e.g. ``"sgs-brand"``) and *remaining_classes* is the
    original list minus that one entry.

    Closes parking entry P-MULTI-CLASS-BEM-PRIMARY-DISAMBIG (2026-05-17).
    """
    sgs = [c for c in classes if c.startswith("sgs-")]
    if not sgs:
        # No sgs-* classes at all — caller should not reach here but be safe.
        return ("", list(classes))
    if len(sgs) == 1:
        remaining = [c for c in classes if c != sgs[0]]
        return (sgs[0], remaining)

    candidates: list[str] = []
    for cls in sgs:
        slug = cls[len("sgs-"):]          # strip "sgs-" prefix
        if "--" in slug:                   # BEM modifier → skip
            continue
        if "__" in slug:                   # BEM element → skip
            continue
        if any(slug == pref.rstrip("-") or slug.startswith(pref)
               for pref in _UTILITY_PREFIXES):
            continue
        candidates.append(cls)

    if not candidates:
        # All classes were modifiers/utilities — fall back to first sgs-* class.
        remaining = [c for c in classes if c != sgs[0]]
        return (sgs[0], remaining)

    # Prefer the first candidate that resolves to a registered block.
    for cls in candidates:
        slug = cls[len("sgs-"):]
        if db.block_exists(f"sgs/{slug}"):
            remaining = [c for c in classes if c != cls]
            _trace("primary_class_picked", primary_class=cls, method="db_registered",
                   all_sgs_classes=sgs)
            return (cls, remaining)

    # No DB match — take the first passing candidate (CSS source order).
    chosen = candidates[0]
    remaining = [c for c in classes if c != chosen]
    _trace("primary_class_picked", primary_class=chosen, method="first_candidate",
           all_sgs_classes=sgs)
    return (chosen, remaining)


# ============================================================================
# Trace emitter (debug-trace evidence chain)
# ============================================================================
# Per-section trace for /systematic-debugging: emits walker_branch_taken,
# attr_skipped, db_lookup_miss events to convert-trace-<boundary>.jsonl when
# the caller (orchestrator) has set a Trace via set_trace(). Defaults to no-op.
_TRACE = None  # type: ignore[assignment]
_TRACE_BOUNDARY = ""  # tagged on every event so cross-file diffs stay coherent


def set_trace(tr, boundary_id: str = "") -> None:
    """Bind a per-section Trace + boundary tag. Pass tr=None to disable.

    Called once per section from the orchestrator dispatch (or convert_section
    when run standalone with --debug-trace). All trace emit calls inside this
    module AND db_lookup reference the bound trace until the next set_trace
    call — single chokepoint binds both modules in one go.
    """
    global _TRACE, _TRACE_BOUNDARY
    _TRACE = tr
    _TRACE_BOUNDARY = boundary_id or ""
    # Bind db_lookup to the same trace so db_lookup_miss events land in the
    # same per-section file as walker_branch_taken / attr_skipped. db_lookup
    # is shipped with convert; if set_trace is missing here it's a deploy bug
    # we WANT to surface rather than swallow. Sonnet QC finding 2026-05-17.
    db.set_trace(tr, boundary_id)


def _trace(stage: str, **kwargs) -> None:
    """Soft-fail trace emission. No-op when no trace is bound."""
    if _TRACE is None:
        return
    try:
        kwargs.setdefault("boundary_id", _TRACE_BOUNDARY)
        _TRACE.event(stage=stage, **kwargs)
    except Exception:  # noqa: BLE001 — trace emission must never break convert
        pass


# ============================================================================
# Media-map resolution + image-optimiser hook
# ============================================================================
# Per Bean (2026-05-14): when source HTML has e.g. <img src="../../research/
# photography/wp-media-library/cookies-stacked.jpeg">, we look the basename up
# in the client's media-map (sites/<client>/research/<client>-media-map.json)
# and substitute the registered WP attachment URL. The media-map is the source
# of truth — it's populated when assets are uploaded to the staging WP site.
#
# /image-optimiser hook: when the converter is wired into the orchestrator as
# the Stage 4 replacement, the orchestrator-side upload step (Stage 4i media-
# sideload) is where /image-optimiser fires. The converter itself stays pure —
# it just does URL substitution. The actual image processing happens at the
# upload boundary so it runs once per asset, not once per use in markup.

_MEDIA_MAP: dict[str, dict] = {}


def load_media_map(media_map_path: Path | None) -> None:
    """Load a client's media-map (flat dict {filename: {id, url}}) into the
    module-level cache. Subsequent _resolve_media_url calls use this map."""
    global _MEDIA_MAP
    if not media_map_path or not media_map_path.exists():
        _MEDIA_MAP = {}
        return
    _MEDIA_MAP = json.loads(media_map_path.read_text(encoding="utf-8"))


def _resolve_media_url(src: str) -> str:
    """Resolve a mockup `src` against the active media-map. Returns the WP
    attachment URL when a basename match is found, otherwise returns the
    original src unchanged.

    Hook point: when the orchestrator's media-sideload runs /image-optimiser
    on the uploaded asset, the media-map entry is the canonical URL — so
    nothing to do here at converter time.
    """
    if not src or not _MEDIA_MAP:
        return src
    # Extract basename — strip query strings and dir prefix
    basename = src.split("?", 1)[0].rstrip("/").rsplit("/", 1)[-1]
    entry = _MEDIA_MAP.get(basename)
    if entry and entry.get("url"):
        return entry["url"]
    return src


def parse_css(css_text: str) -> dict[str, dict[str, str]]:
    """Parse CSS into {selector: {prop: value}}. Media queries flatten with marker.

    Uses a brace-balanced scanner so nested ``@media`` blocks of any size are
    extracted correctly. Inner rules under a media block are stored as
    ``"<media-condition> :: <selector>"`` keys; non-media rules are stored bare.

    Replaces an earlier regex-only implementation whose ``_MEDIA_RE`` pattern
    silently failed on every real-world ``@media`` block (verified 2026-05-17 —
    13 ``@media`` queries in Mama's mockup, 0 captured). Captured at parking
    P-PHASE8-NEW-4 and blub.db row 207 measurement-vs-eye discipline.
    """
    rules: dict[str, dict[str, str]] = {}
    css_text = re.sub(r"/\*.*?\*/", "", css_text, flags=re.DOTALL)

    def _ingest_rules_text(text: str, media_cond: str = "") -> None:
        """Parse a chunk of CSS containing top-level ``selector { decls }`` pairs."""
        for inner in _RULE_RE.finditer(text):
            sel = inner.group(1).strip()
            decls = inner.group(2)
            # Skip @-rule directives that slipped through (e.g. @font-face inside).
            if sel.startswith("@"):
                continue
            key = f"{media_cond} :: {sel}" if media_cond else sel
            rules.setdefault(key, {}).update(_parse_decls(decls))

    # Walk the source extracting @media blocks via brace counting, ingesting
    # the surrounding text as plain rules.
    i = 0
    n = len(css_text)
    plain_start = 0
    while i < n:
        if css_text.startswith("@media", i):
            # Ingest everything before this @media as plain rules
            _ingest_rules_text(css_text[plain_start:i])
            brace_open = css_text.find("{", i)
            if brace_open == -1:
                break
            cond = css_text[i:brace_open].strip()
            # Brace-balanced scan for the matching closing brace
            depth = 1
            j = brace_open + 1
            while j < n and depth > 0:
                ch = css_text[j]
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                j += 1
            if depth != 0:
                # Malformed CSS — bail out, ingest the rest as plain
                break
            body = css_text[brace_open + 1 : j - 1]
            _ingest_rules_text(body, media_cond=cond)
            i = j
            plain_start = j
            continue
        i += 1
    # Tail
    _ingest_rules_text(css_text[plain_start:])
    return rules


def _parse_decls(decl_text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for m in _DECL_RE.finditer(decl_text):
        prop = m.group(1).strip()
        val = m.group(2).strip()
        if prop and val:
            out[prop] = val
    return out


# ============================================================================
# Block-target classification — DB-driven, replaces the hardcoded table
# ============================================================================

# Atomic HTML tags that map to blocks (core where no SGS equivalent exists,
# SGS where a dedicated atomic block ships).
ATOMIC_TAG_MAP: dict[str, str] = {
    "h1": "core/heading", "h2": "core/heading", "h3": "core/heading",
    "h4": "core/heading", "h5": "core/heading", "h6": "core/heading",
    "p": "core/paragraph",
    "img": "core/image",
    "hr": "sgs/divider",
}

# Canonical slot → standalone block routing is now sourced from
# sgs-framework.db.slot_synonyms.standalone_block (column added 2026-05-16).
# Look up via db.standalone_block_for(canonical_slot). The DB row is the single
# source of truth: synonym vocabulary AND standalone-block routing both live in
# slot_synonyms now. e.g. label→sgs/label, badge→sgs/label, card→sgs/info-box.

# Source classes that should emit as sgs/container with specific layout attrs,
# overriding any block-root or pass-through routing. Two use cases:
#   1. Grid-wrapper divs whose className carries display:grid CSS — preserving
#      the wrapper is essential because the lifted CSS needs an element to bind.
#   2. Sections that ARE compositions (e.g. Brand Story = 2-col image+content),
#      not atomic blocks. Per Bean's 2026-05-15 redirect: heritage-strip belongs
#      as a pattern (sgs/container 2-col with standard blocks inside), not as a
#      monolithic sgs/heritage-strip block.
#
# Per Bean's SGS-BEM convention, these class names are framework-canonical, not
# Mama's-specific — any client mockup using the same compositional pattern will
# carry these classes.
# Semantic HTML tags that are WP template-part territory — skip at top level.
# The theme renders parts/header.html / parts/footer.html on every page
# automatically. Emitting them into post content produces double chrome.
# Tag-based detection (not class-based) so this generalises across every client.
SKIP_TOP_LEVEL_TAGS: set[str] = {"header", "footer", "nav"}


def _detect_grid_container_from_css(
    classes: list[str], css_rules: dict
) -> dict | None:
    """CSS-driven sgs/container attr detection.

    Reads the source mockup's own CSS rules for each of the node's classes.
    If any class has `display: grid` or `display: flex`, returns a dict of
    sgs/container attrs (layout, gridTemplateColumns variants, gap, columns).
    Handles `@media (min-width: 768px)` overrides so mobile + tablet/desktop
    each get the right template.

    Generic across clients: any mockup whose CSS expresses a grid container
    is detected regardless of class name or grid ratio. Replaces the
    2026-05-15 hardcoded SECTION_AS_CONTAINER_OVERRIDES dict that mapped
    specific Mama's class names to specific ratios — that approach was
    architecturally an extract.py-trap repeat.
    """
    def _count_tracks(template: str) -> int:
        # Count whitespace-separated tokens in a grid-template-columns value.
        # Each token represents one column track (e.g. "5fr 3fr" → 2 tracks,
        # "1fr 1fr 1fr" → 3 tracks). Strips parens content for minmax(), etc.
        cleaned = re.sub(r"\([^)]*\)", "X", template)
        return max(1, len([t for t in cleaned.split() if t]))

    def _normalise_gap(gap: str) -> str:
        # sgs/container.gap attr expects a token slug or bare number; strip 'px'
        return gap.replace("px", "").replace(" ", "")

    for cls in classes:
        decls = css_rules.get(f".{cls}", {})
        # P-CSS-IMPORTANT-STRIP (2026-05-17): strip `!important` so
        # `display: grid !important` compares equal to "grid".
        display = _strip_important(decls.get("display", ""))
        if display not in ("grid", "flex"):
            continue
        # When display:flex + flex-direction:column[-reverse], the semantic
        # is "stack" (sgs/container.layout=stack renders as
        # `display:flex;flex-direction:column`). Using layout=flex on these
        # emits flex-wrap:wrap which spreads items horizontally — wrong for
        # column-stack containers. Captured 2026-05-17 during brand walkdown.
        # 2026-05-17 follow-up (QC rater 4): also accept `column-reverse` —
        # mobile-first authored mockups commonly use this. The reverse-order
        # semantic is lost in the stack mapping (sgs/container has no reverse
        # flag yet) — captured as a known follow-up.
        flex_dir = _strip_important(decls.get("flex-direction", ""))
        if display == "flex" and flex_dir in ("column", "column-reverse"):
            layout = "stack"
        else:
            layout = display
        attrs: dict = {"layout": layout}

        # Base (mobile-first) declarations
        gtc = decls.get("grid-template-columns", "").strip()
        gap = decls.get("gap", "").strip()
        if gtc:
            attrs["gridTemplateColumnsMobile"] = gtc
            attrs["columnsMobile"] = _count_tracks(gtc)
        if gap:
            attrs["gap"] = _normalise_gap(gap)

        # @media (min-width: X) overrides — capture desktop-ish breakpoint
        for media_key, media_decls in css_rules.items():
            if "::" not in media_key:
                continue
            sel_part = media_key.split("::", 1)[1].strip()
            if sel_part != f".{cls}":
                continue
            gtc_md = media_decls.get("grid-template-columns", "").strip()
            gap_md = media_decls.get("gap", "").strip()
            if gtc_md:
                attrs["gridTemplateColumns"] = gtc_md
                attrs["columns"] = _count_tracks(gtc_md)
                # Reuse for tablet — most mockups use a single @media breakpoint
                attrs.setdefault("gridTemplateColumnsTablet", gtc_md)
                attrs.setdefault("columnsTablet", attrs["columns"])
            if gap_md and "gap" not in attrs:
                attrs["gap"] = _normalise_gap(gap_md)

        # If no media override, mobile rules become the default
        if "gridTemplateColumns" not in attrs and attrs.get("gridTemplateColumnsMobile"):
            attrs["gridTemplateColumns"] = attrs["gridTemplateColumnsMobile"]
            attrs["columns"] = attrs.get("columnsMobile", 1)
        return attrs
    return None


def get_block_for_node(node: Tag) -> tuple[str, db.BemParse | None]:
    """Decide the target block for a single DOM node. Returns (slug, bem_parse).

    Decision order:
      1. SGS-BEM class match: parse sgs-X class → look up block in DB
         - If `block` portion is a registered SGS block AND no element → emit it
         - If element + block exists → recurse into children (this node is a slot)
         - Mismatch / unknown → sgs/container
      2. Tag fallback for atoms (h*, p, img, button, <a>+sgs-button-class)
      3. Default → sgs/container
    """
    classes: list[str] = node.get("class", []) or []

    # 1. Atomic HTML tags ALWAYS win over class-based matching. An <img> is a
    # core/image regardless of its sgs-product-card__image className. The class
    # travels as className. Same for h*, p. This prevents the "block exists +
    # element → container" path from swallowing real atomic content.
    if node.name in ATOMIC_TAG_MAP:
        # Try to find the parent block context for the BEM parse so attrs lift
        # cleanly (e.g. anchor for headings).
        first_bem = None
        for cls in classes:
            p = db.parse_sgs_bem(cls)
            if p and p.block:
                first_bem = p
                break
        return (ATOMIC_TAG_MAP[node.name], first_bem)

    # 2. SGS-BEM class match — try each class until one resolves
    first_bem: db.BemParse | None = None
    for cls in classes:
        parsed = db.parse_sgs_bem(cls)
        if not parsed or not parsed.block:
            continue
        if first_bem is None:
            first_bem = parsed  # remember first valid parse for fallback below

        candidate_slug = f"sgs/{parsed.block}"

        if db.block_exists(candidate_slug):
            if parsed.element is None:
                # Bare block match — this node IS the block (e.g. sgs-product-card)
                return (candidate_slug, parsed)
            # Block exists + element → slot wrapper. Emit sgs/container; slot
            # intent travels via className. Future: lift into parent block attr.
            return ("sgs/container", parsed)
    # No registered block matched, but we may still have a usable BEM parse
    # (e.g. sgs-section-heading__label — block doesn't exist but the element
    # 'label' is meaningful for standalone-block routing in the caller).
    if first_bem is not None:
        return ("sgs/container", first_bem)
    if node.name == "a":
        if any(c.startswith("sgs-button") for c in classes):
            return ("sgs/button", None)
        # Plain link — render as inline within paragraph; container handles it
        return ("sgs/container", None)
    if node.name == "button":
        # Source <button> tags (e.g. pill picker) — emit sgs/button
        return ("sgs/button", None)

    # 3. Default — wrapper container
    return ("sgs/container", None)


def lift_attrs_for_block(block_slug: str, node: Tag, bem: db.BemParse | None,
                          classes: list[str]) -> dict:
    """Lift relevant attributes from the source node onto the target block."""
    attrs: dict = {}

    # Always preserve sgs-* classNames so the variation CSS still binds.
    # P-MULTI-CLASS-BEM-PRIMARY-DISAMBIG (2026-05-17): when multiple sgs-*
    # classes are present, pick one canonical primary for downstream routing.
    # All sgs-* classes still travel as className (variation CSS binds to all).
    sgs_classes = [c for c in classes if c.startswith("sgs-")]
    if sgs_classes:
        attrs["className"] = " ".join(sgs_classes)
        if len(sgs_classes) > 1:
            primary, _remaining = _pick_primary_sgs_block(sgs_classes)
            if primary:
                attrs["_primaryBemClass"] = primary  # routing hint — stripped before emit

    # Lift the source HTML id as anchor (especially for headings)
    if node.get("id"):
        attrs["anchor"] = node["id"]

    if block_slug == "core/heading":
        attrs["level"] = int(node.name[1]) if node.name and node.name.startswith("h") else 2

    elif block_slug == "core/image":
        src = node.get("src")
        if src:
            attrs["url"] = src
            attrs["alt"] = node.get("alt", "")
            if str(node.get("width", "")).isdigit():
                attrs["width"] = int(node["width"])
            if str(node.get("height", "")).isdigit():
                attrs["height"] = int(node["height"])

    elif block_slug == "sgs/button":
        if node.name == "a":
            attrs["url"] = node.get("href", "#")
            attrs["label"] = node.get_text(strip=True)
        elif node.name == "button":
            attrs["label"] = node.get_text(strip=True)
            attrs["type"] = node.get("type", "button")

        # Lift canonical modifier (--primary, --secondary, --tertiary) into variant
        for c in classes:
            parsed = db.parse_sgs_bem(c)
            if parsed and parsed.modifier:
                kind = db.modifier_kind(parsed.modifier)
                if kind == "variant":
                    attrs["variant"] = parsed.modifier
                    break

    return attrs


# ============================================================================
# DOM walker
# ============================================================================

def emit_wp_block(slug: str, attrs: dict, inner: list[str], self_closing: bool = False) -> str:
    """Emit a single WP block markup string."""
    attr_json = ""
    if attrs:
        # Strip internal routing-hint keys (underscore-prefixed) that must
        # never appear in the emitted WP block comment. Currently:
        #   _primaryBemClass — added by P-MULTI-CLASS-BEM-PRIMARY-DISAMBIG
        # Closed parking entry P-MULTI-CLASS-BEM-PRIMARY-DISAMBIG (2026-05-17).
        clean = {
            k: v for k, v in attrs.items()
            if v not in (None, "", [], {}) and not k.startswith("_")
        }
        if clean:
            attr_json = " " + json.dumps(clean, separators=(",", ":"), ensure_ascii=False)
    if self_closing and not inner:
        return f"<!-- wp:{slug}{attr_json} /-->"
    inner_str = "\n".join(inner)
    return f"<!-- wp:{slug}{attr_json} -->\n{inner_str}\n<!-- /wp:{slug} -->"


# ============================================================================
# Array-of-objects lift patterns (Change 2)
# Keyed by attr name — when a block has an array attr matching one of these
# keys, we walk child elements and build a list of dicts from them.
# Each pattern specifies: which child tag/class to find, and how to extract
# each field from that child (selector string + extractor kind).
# ============================================================================
ARRAY_LIFT_PATTERNS: dict[str, dict] = {
    "testimonials": {
        "child_tag": "article",
        "child_class_contains": "sgs-testimonial",
        "fields": {
            # WP block attr name → (extractor_kind, css_selector_or_None)
            # "text_of_first" — CSS-style multi-selector, first match wins
            # "count_stars"  — count ★ chars in the element
            "quote": ("text_of_first", "p.sgs-testimonial__text,blockquote,p"),
            "name":  ("text_of_first", "p.sgs-testimonial__author,cite,.sgs-testimonial__author,strong"),
            "role":  ("text_of_first", ".sgs-testimonial__role,.sgs-testimonial__meta"),
            "rating": ("count_stars", None),
        },
    },
    "badges": {
        "child_tag": "div",
        "child_class_contains": "sgs-badge",
        "fields": {
            "icon":  ("text_of_first", ".sgs-badge__icon"),
            "label": ("text_of_first", ".sgs-badge__label,h4,h5"),
        },
    },
}


def _array_lift_text_of_first(child: Tag, selector: str) -> str:
    """Find the first element matching a comma-separated CSS-like selector
    within `child` and return its stripped text. Returns '' if nothing found.

    Only supports simple tag / .class selectors — no combinators. This is
    intentional: the patterns above use simple, stable selectors.
    """
    for part in selector.split(","):
        part = part.strip()
        if not part:
            continue
        # Resolve tag name and optional class from "tag.class" or ".class" or "tag"
        if "." in part:
            tag_part, cls_part = part.split(".", 1)
            tag_name = tag_part or True  # True = any tag
            cls_name = cls_part
            found = child.find(tag_name, class_=cls_name)
        else:
            found = child.find(part)
        if found:
            return found.get_text(strip=True)
    return ""


def _array_lift_count_stars(child: Tag) -> int:
    """Count ★ characters in all text content of `child`.
    Falls back to counting child elements with 'star' in their class."""
    text = child.get_text()
    star_count = text.count("★")
    if star_count:
        return star_count
    # Fallback: count elements whose class list contains 'star'
    star_els = child.find_all(class_=lambda c: c and any("star" in x for x in c))
    return len(star_els) if star_els else 0


def _lift_array_attr(node: Tag, attr_name: str, pattern: dict) -> list:
    """Walk descendants of `node` matching pattern['child_tag'] and
    pattern['child_class_contains'], extract each field per pattern['fields'],
    and return a list of dicts."""
    child_tag = pattern["child_tag"]
    child_cls = pattern["child_class_contains"]
    fields: dict = pattern["fields"]

    children = node.find_all(
        child_tag,
        class_=lambda c: c and child_cls in (" ".join(c) if isinstance(c, list) else c),
    )

    results = []
    for child in children:
        item: dict = {}
        for field_name, (extractor_kind, extractor_arg) in fields.items():
            if extractor_kind == "text_of_first":
                val = _array_lift_text_of_first(child, extractor_arg or "")
                if val:
                    item[field_name] = val
            elif extractor_kind == "count_stars":
                count = _array_lift_count_stars(child)
                if count:
                    item[field_name] = count
        if item:
            results.append(item)
    return results


@functools.lru_cache(maxsize=128)
def _block_json_item_keys(block_slug: str, attr_name: str) -> tuple[str, ...]:
    """Return the ordered field keys from the first default item in block.json
    for `attr_name` on `block_slug`. Used to map BEM element names to item-schema
    field names when the DB doesn't have per-item sub-field info.

    Returns an empty tuple if block.json is not found or the default is not a
    list of dicts. Cached so each block.json is read at most once per run.
    """
    import json as _json
    block_name = block_slug.split("/", 1)[-1]  # "sgs/trust-bar" → "trust-bar"
    # Resolve relative to this file's location (converter_v2/) then walk up
    _here = Path(__file__).resolve().parent
    # Typical layout: plugins/sgs-blocks/build/blocks/<name>/block.json
    _repo_root = _here
    for _ in range(6):
        _repo_root = _repo_root.parent
        candidate = _repo_root / "plugins" / "sgs-blocks" / "build" / "blocks" / block_name / "block.json"
        if candidate.exists():
            try:
                data = _json.loads(candidate.read_text(encoding="utf-8"))
                default = data.get("attributes", {}).get(attr_name, {}).get("default")
                if isinstance(default, list) and default and isinstance(default[0], dict):
                    return tuple(default[0].keys())
            except Exception:
                pass
            break
    return ()


def _lift_bem_child_array(node: "Tag", parent_slug: str,
                          attr_name: str, schema: dict) -> list | None:
    """Universal BEM-child array lifter (P-PHASE8-2, 2026-05-16).

    For any block whose mockup uses BEM-child elements as array items
    (e.g. sgs-trust-bar__badge × N), discovers the repeating element group,
    maps each item's descendant text slots to schema field names, and returns
    a list of item dicts — without any hardcoded class names.

    Algorithm:
      1. Derive parent BEM tail from block slug  (e.g. "trust-bar")
      2. Collect all descendants carrying an sgs-<parent-tail>__<element> class
      3. Group by element name — find the group with count > 1 (the array)
      4. For each item in that group (skipping hidden/aria-hidden AT ITEM LEVEL):
           - Walk item's descendants for sgs-<parent-tail>__<field-or-alias> classes
           - Map via canonical_slot_for() to schema field names
           - Collect text content per field
      5. Return list of dicts (only populated fields), or None if nothing detected.

    Falls back gracefully to None so the caller can skip cleanly.
    """
    parent_bem = parent_slug.rsplit("/", 1)[-1]   # "sgs/trust-bar" → "trust-bar"
    prefix = f"sgs-{parent_bem}__"

    # --- Step 1: collect ALL BEM descendants ---
    def has_parent_bem_element(tag_classes) -> bool:
        if not tag_classes:
            return False
        classes = tag_classes if isinstance(tag_classes, list) else [tag_classes]
        return any(c.startswith(prefix) for c in classes)

    all_bem_descendants = node.find_all(
        True, class_=has_parent_bem_element
    )

    # --- Step 2: group by element name (using the FIRST matching class) ---
    from collections import Counter
    element_counts: Counter = Counter()
    for el in all_bem_descendants:
        classes = el.get("class") or []
        for c in classes:
            parsed = db.parse_sgs_bem(c)
            if parsed and parsed.block == parent_bem and parsed.element:
                element_counts[parsed.element] += 1
                break  # only count the primary BEM class

    if not element_counts:
        return None

    # --- Step 3: pick the most-repeated element with count > 1 ---
    candidates = [(el, cnt) for el, cnt in element_counts.items() if cnt > 1]
    if not candidates:
        return None
    # Sort by count desc; break ties alphabetically for determinism
    candidates.sort(key=lambda x: (-x[1], x[0]))
    array_element_name = candidates[0][0]  # e.g. "badge"

    # --- Step 4: collect items from that element group ---
    item_nodes = []
    for el in all_bem_descendants:
        classes = el.get("class") or []
        for c in classes:
            parsed = db.parse_sgs_bem(c)
            if parsed and parsed.block == parent_bem and parsed.element == array_element_name:
                item_nodes.append(el)
                break

    if not item_nodes:
        return None

    # --- Step 5: determine schema field names from default item shape ---
    # The default of an array attr is a list of dicts; the keys of the first
    # dict are the expected field names. We also try alias resolution for each.
    attr_info = schema.get(attr_name, {})
    # attr_info doesn't carry the default — we need block.json for that.
    # However, we can discover field names from the DB's block_attributes for the
    # parent block. Trust-bar has items as a flat array — the sub-fields are not
    # in the DB as separate rows. Fall back: try all text-bearing BEM elements
    # that appear inside the item nodes.

    # Build a field-name → BEM-element-names lookup by trying:
    #   a) direct: field_name == BEM element name
    #   b) alias:  canonical_slot_for(BEM element) == canonical_slot_for(field_name)
    # We discover the field names dynamically from the child BEM elements present
    # in the first item node (avoids needing block.json at runtime).
    first_item = item_nodes[0]
    child_elements: list[str] = []
    for desc in first_item.find_all(True):
        desc_classes = desc.get("class") or []
        for c in desc_classes:
            parsed = db.parse_sgs_bem(c)
            if parsed and parsed.block == parent_bem and parsed.element and parsed.element != array_element_name:
                if parsed.element not in child_elements:
                    child_elements.append(parsed.element)
                break

    if not child_elements:
        return None  # no sub-elements to lift from

    # --- Step 6: build item dicts ---
    results: list[dict] = []
    for item_node in item_nodes:
        # Skip items that are hidden AT THE ITEM LEVEL (not inside it)
        if item_node.get("hidden") is not None:
            continue
        if item_node.get("aria-hidden") == "true":
            continue

        item: dict = {}
        for child_el_name in child_elements:
            # Find the matching BEM descendant inside this item
            def _has_this_child(tag_classes, _el=child_el_name, _bem=parent_bem):
                if not tag_classes:
                    return False
                classes = tag_classes if isinstance(tag_classes, list) else [tag_classes]
                return any(
                    db.parse_sgs_bem(c) and
                    db.parse_sgs_bem(c).block == _bem and
                    db.parse_sgs_bem(c).element == _el
                    for c in classes
                )
            found = item_node.find(True, class_=_has_this_child)
            if not found:
                continue
            text = found.get_text(strip=True)
            if not text:
                continue

            # Map child element name → schema field name.
            # Resolution order:
            #   (a) direct: attr_name_for_slot_or_alias (DB-backed)
            #   (b) canonical slot alias chain
            #   (c) block.json item default shape keys — try normalised match
            #       (e.g. BEM "text" → item key "label" when "label" is the
            #       primary text field in the default array item dict)
            #   (d) BEM element name as-is (last resort)
            field_name = db.attr_name_for_slot_or_alias(parent_slug, child_el_name)
            if not field_name:
                canonical = db.canonical_slot_for(child_el_name)
                if canonical:
                    field_name = db.attr_name_for_slot_or_alias(parent_slug, canonical)
            if not field_name:
                # Try block.json item default shape — look for a key whose
                # normalised form matches the BEM element name or its canonical slot.
                item_schema_keys = _block_json_item_keys(parent_slug, attr_name)
                norm_el = db._normalise(child_el_name)
                norm_canonical = db._normalise(db.canonical_slot_for(child_el_name) or "")
                # Pass 1: direct or canonical normalised match
                for key in item_schema_keys:
                    norm_key = db._normalise(key)
                    if norm_key == norm_el or (norm_canonical and norm_key == norm_canonical):
                        field_name = key
                        break
                # Pass 2: primary text slot heuristic — BEM element is a text-bearing
                # slot (canonical "text" or "label") and item schema has "label" key but
                # not the BEM element name. Map the text content to "label".
                if not field_name and item_schema_keys:
                    _text_canonicals = {"text", "label", "body"}
                    _el_canonical = db.canonical_slot_for(child_el_name) or child_el_name
                    if _el_canonical in _text_canonicals and child_el_name not in item_schema_keys:
                        # Find the most label-like key in item schema
                        for _preferred in ("label", "text", "title", "name"):
                            if _preferred in item_schema_keys:
                                field_name = _preferred
                                break
            # (d) last resort: use the BEM element name as-is
            if not field_name:
                field_name = child_el_name

            item[field_name] = text

        if item:
            results.append(item)

    return results if results else None


# ============================================================================
# InnerBlocks emission patterns (Change 3)
# Keyed by block slug — when a block uses InnerBlocks rather than a flat array
# attr, we detect child elements and emit each as a nested self-closing block.
# ============================================================================
INNER_BLOCK_PATTERNS: dict[str, dict] = {
    "sgs/feature-grid": {
        # Each sgs-info-box div becomes a sgs/info-box inner block
        "child_class": "sgs-info-box",
        "inner_block_slug": "sgs/info-box",
        "lift_fields": {
            # info-box attr name → CSS selector within the child element
            # (comma-separated, first match wins)
            "mediaEmoji": ".sgs-info-box__icon",
            "heading":    "h4,h3,h2",
            "description": "p",
        },
        # mediaType detected per-child from source DOM (see _detect_media_type
        # in _lift_inner_blocks). Removed the unconditional emoji default
        # 2026-05-15 after the multi-model panel flagged it would corrupt
        # any non-emoji info-box (SVG icons → empty emoji + wrong type).
        "media_type_selector": ".sgs-info-box__icon",
    },
}


def _detect_media_type(icon_el) -> str | None:
    """Inspect an icon container element and return one of 'image'/'icon'/'emoji'.

    - <img> child  → 'image'
    - <svg> child  → 'icon'  (treats inline SVG and Lucide-style icons the same)
    - text-only with at least one non-ASCII codepoint → 'emoji'
    - text-only ASCII (e.g. an icon-font character)  → 'icon'
    - empty / no element found                       → None (skip set)

    Detection is per-icon, so a feature-grid with mixed emoji + SVG renders
    each child correctly.
    """
    if icon_el is None:
        return None
    if icon_el.find("img"):
        return "image"
    if icon_el.find("svg"):
        return "icon"
    text = icon_el.get_text(strip=True)
    if not text:
        return None
    # Any character above U+007F (non-ASCII) signals an emoji or pictograph
    if any(ord(ch) > 127 for ch in text):
        return "emoji"
    return "icon"


def _lift_inner_blocks(node: Tag, pattern: dict) -> list[str]:
    """Walk child elements matching pattern['child_class'] within `node` and
    emit each as a self-closing WP inner block. Returns a list of markup strings.
    """
    child_cls = pattern["child_class"]
    inner_slug = pattern["inner_block_slug"]
    lift_fields: dict[str, str] = pattern.get("lift_fields", {})
    set_attrs: dict = pattern.get("set_attrs", {})
    media_type_selector: str | None = pattern.get("media_type_selector")

    children = node.find_all(
        True,
        class_=lambda c: c and child_cls in (" ".join(c) if isinstance(c, list) else c),
    )

    # Deduplicate: skip children that are descendants of another matched child
    top_level_children = []
    for child in children:
        is_nested = any(
            other is not child and (child in other.descendants)
            for other in children
        )
        if not is_nested:
            top_level_children.append(child)

    blocks = []
    for child in top_level_children:
        item_attrs: dict = dict(set_attrs)  # start with fixed attrs
        for attr_name, selector in lift_fields.items():
            val = _array_lift_text_of_first(child, selector)
            if val:
                item_attrs[attr_name] = val
        # Per-child mediaType detection from source DOM content. Replaces the
        # 2026-05-15-removed unconditional `mediaType="emoji"` default which
        # would have corrupted SVG/image icons across non-emoji client mockups.
        if media_type_selector:
            icon_el = None
            for sel in (s.strip() for s in media_type_selector.split(",")):
                if sel.startswith("."):
                    icon_el = child.find(class_=lambda c: c and sel[1:] in (
                        " ".join(c) if isinstance(c, list) else c))
                else:
                    icon_el = child.find(sel)
                if icon_el:
                    break
            mt = _detect_media_type(icon_el)
            if mt:
                item_attrs["mediaType"] = mt
                # If the icon is image-typed, also lift the src into mediaImage
                if mt == "image" and icon_el is not None:
                    img = icon_el.find("img") or icon_el
                    if img.name == "img" and img.get("src"):
                        item_attrs["mediaImage"] = {
                            "id": None,
                            "url": _resolve_media_url(img.get("src", "").strip()),
                            "alt": img.get("alt", "").strip(),
                        }
                        # When using image, clear any emoji we might have lifted
                        item_attrs.pop("mediaEmoji", None)
        # Preserve sgs-* classes on the inner block
        sgs_cls = [c for c in (child.get("class") or []) if c.startswith("sgs-")]
        if sgs_cls:
            item_attrs["className"] = " ".join(sgs_cls)
        blocks.append(emit_wp_block(inner_slug, item_attrs, [], self_closing=True))
    return blocks


# ============================================================================
# CSS-driven styling-attribute lifter
# ============================================================================

# CSS property → (attr_suffix, value_kind) — DB-driven via db.css_property_suffixes()
# value_kind: 'colour' | 'number_px' | 'number_unitless' | 'string' | 'number_px_or_em'
#
# Refactored 2026-05-17 (blub.db row 260 — DB-first lookups rule). Previously a
# hardcoded 21-row list that duplicated property_suffixes table. Now reads the
# canonical 99-row DB table via db.css_property_suffixes() — 48 rows survive the
# CSS-driven filter (rows with css_property NOT NULL + kind inferable). The
# remaining 51 DB rows are behaviour/select-from-enum/content attrs that aren't
# CSS-lifted and are filtered out by _kind_for() returning None.
#
# Wrap the DB call in a module-level lazy load so the import path is cheap and
# the lookup is cached for the run.
def _css_prop_to_suffix() -> list[tuple[str, str, str]]:
    """DB-driven replacement for the old _CSS_PROP_TO_SUFFIX list constant.

    Returns the same (css_property, suffix, kind) tuple shape callers expect.
    Cached by db.css_property_suffixes()'s @lru_cache.
    """
    return db.css_property_suffixes()


# Breakpoint marker → attr name suffix — DB-driven via db.breakpoint_suffix_rules().
# Suffix vocabulary canonical in modifier_suffixes table (kind='breakpoint');
# marker→suffix mapping verified at module load against the DB.
def _breakpoint_suffixes() -> list[tuple[str, list[str]]]:
    """DB-verified replacement for the old _BREAKPOINT_SUFFIXES list constant."""
    return db.breakpoint_suffix_rules()

_VAR_TOKEN_RE = re.compile(r"var\(--(?:wp--preset--color--)?([a-z0-9-]+)\)")


def _extract_token_or_hex(value: str) -> str | None:
    """Extract a colour token slug or hex from a CSS value string.

    - ``var(--text)``                         → ``"text"``
    - ``var(--wp--preset--color--primary)``   → ``"primary"``
    - ``#F5C2C8``                             → ``"#F5C2C8"``
    - ``rgb(…)``                              → None (skip — too ambiguous)
    - Anything else containing ``var(``       → raw string (non-colour var)
    """
    v = value.strip()
    m = _VAR_TOKEN_RE.search(v)
    if m:
        return m.group(1)
    if v.startswith("#"):
        return v.split()[0]  # strip trailing junk
    return None


def _support_allows(supports: dict, top_key: str, sub_key: str | None = None) -> bool:
    """Return True when the block's supports map allows the given property.

    supports.color = True               → _support_allows(s, 'color') is True
    supports.color = {"background":True} → _support_allows(s, 'color', 'background') is True
    Missing key → False (gate closed).
    """
    if top_key not in supports:
        return False
    val = supports[top_key]
    if val is True:
        return True
    if isinstance(val, dict):
        if sub_key is None:
            # Asked top-level; consider True if any sub-key is True
            return any(v is True for v in val.values())
        return bool(val.get(sub_key))
    return False


def _set_in(target: dict, path: list[str], value) -> None:
    """Set `value` at nested dict path inside `target`, never overwriting an existing leaf.
    Intermediate non-dict entries are left alone (caller's existing data wins)."""
    cur = target
    for key in path[:-1]:
        nxt = cur.get(key)
        if not isinstance(nxt, dict):
            if nxt is not None:
                return  # Don't clobber existing non-dict value
            nxt = {}
            cur[key] = nxt
        cur = nxt
    leaf = path[-1]
    if leaf in cur:
        return  # never overwrite — caller's pre-set values win
    cur[leaf] = value


def _colour_value_to_style(raw: str) -> str | None:
    """Convert a CSS colour expression to the WP `style.*` colour form.

    Palette token  → 'var:preset|color|<slug>'
    Hex literal    → '#RRGGBB'
    rgb(...)       → None (ambiguous — let caller skip)
    """
    if not raw:
        return None
    token_or_hex = _extract_token_or_hex(raw)
    if token_or_hex is None:
        return None
    if token_or_hex.startswith("#"):
        return token_or_hex
    # Palette slug
    return f"var:preset|color|{token_or_hex}"


def _preserve_unit(raw: str) -> str | None:
    """Return the trimmed CSS value as-is when it looks like a single dimension/literal.

    Used for non-numeric WP style fields (border.radius, border.width, padding values,
    blockGap) that accept the raw CSS string ('22px', '1.5rem', '12px', '0.5em').
    Returns None for empty or clearly compound expressions we can't normalise.
    """
    if not raw:
        return None
    v = raw.strip().rstrip(";")
    if not v:
        return None
    # Reject CSS var() refs and rgb()/hsl() — caller should handle colour path separately
    # but allow simple identifiers like 'solid', '1px', '12px', '1.5rem', '50%'.
    return v


# Static mapping table: which CSS property → (supports gate keys, style.* path builder)
# Used by _lift_root_supports_to_style. Universal — no block-specific keys.
# Each entry: (supports_top, supports_sub_or_None, style_path_fn, value_converter)
def _root_lift_rules():
    """Return the canonical CSS-property → WP style.* mapping list.

    Each rule: (css_prop, supports_top, supports_sub, style_path, kind)
      kind ∈ {"colour", "unit"} — controls value conversion.
    Padding/margin shorthand handled separately in caller (multi-value parsing).
    """
    return [
        # spacing.padding / margin — long-hand sides
        ("padding-top",    "spacing",            "padding", ["spacing", "padding", "top"],    "unit"),
        ("padding-right",  "spacing",            "padding", ["spacing", "padding", "right"],  "unit"),
        ("padding-bottom", "spacing",            "padding", ["spacing", "padding", "bottom"], "unit"),
        ("padding-left",   "spacing",            "padding", ["spacing", "padding", "left"],   "unit"),
        ("margin-top",     "spacing",            "margin",  ["spacing", "margin", "top"],     "unit"),
        ("margin-right",   "spacing",            "margin",  ["spacing", "margin", "right"],   "unit"),
        ("margin-bottom",  "spacing",            "margin",  ["spacing", "margin", "bottom"],  "unit"),
        ("margin-left",    "spacing",            "margin",  ["spacing", "margin", "left"],    "unit"),
        # spacing.blockGap
        ("gap",            "spacing",            "blockGap",["spacing", "blockGap"],          "unit"),
        # border.* (under __experimentalBorder)
        ("border-radius",  "__experimentalBorder", "radius",["border", "radius"],             "unit"),
        ("border-width",   "__experimentalBorder", "width", ["border", "width"],              "unit"),
        ("border-style",   "__experimentalBorder", "style", ["border", "style"],              "unit"),
        ("border-color",   "__experimentalBorder", "color", ["border", "color"],              "colour"),
        # color.*
        ("background-color", "color",            "background", ["color", "background"],      "colour"),
        ("color",            "color",            "text",       ["color", "text"],            "colour"),
    ]


def _parse_padding_shorthand(value: str) -> dict[str, str] | None:
    """Parse 'padding: 22px 16px' → {'top':'22px','right':'16px','bottom':'22px','left':'16px'}.

    Returns None if the value can't be parsed as 1-4 space-separated tokens. CSS
    rules: 1 token = all sides; 2 tokens = top/bottom + left/right; 3 = top, l/r, bottom;
    4 = top right bottom left.
    """
    if not value:
        return None
    parts = value.strip().split()
    if not parts or len(parts) > 4:
        return None
    # Reject if any token contains a comma/paren (e.g. 'var(--x)' is fine; '0, 0' is not)
    if any("," in p for p in parts):
        return None
    if len(parts) == 1:
        t = r = b = l = parts[0]
    elif len(parts) == 2:
        t = b = parts[0]
        r = l = parts[1]
    elif len(parts) == 3:
        t, lr, b = parts
        r = l = lr
    else:
        t, r, b, l = parts
    return {"top": t, "right": r, "bottom": b, "left": l}


# ---------------------------------------------------------------------------
# CSS property → WP core block style.* path mapping
# Data-driven: one module-level dict, consumed by _lift_core_block_style.
# Keys are CSS property names (US-English per CSS spec).
# Values: (style_path, kind)
#   style_path — list of dict keys into the WP `style` object, OR the
#                special strings "TOP_LEVEL" / "ASPECT_RATIO" for attrs that
#                go at the top level of block attributes, not inside `style`.
#   kind       — "colour" | "unit" | "str_passthrough" | "object_fit"
#                 | "aspect_ratio"
# ---------------------------------------------------------------------------
_CORE_BLOCK_STYLE_MAP: dict[str, tuple] = {
    # colour.*
    "color":              (["color", "text"],       "colour"),
    "background-color":   (["color", "background"], "colour"),
    # typography.*
    "font-size":          (["typography", "fontSize"],       "unit"),
    "font-weight":        (["typography", "fontWeight"],     "str_passthrough"),
    "line-height":        (["typography", "lineHeight"],     "str_passthrough"),
    "letter-spacing":     (["typography", "letterSpacing"],  "unit"),
    "font-style":         (["typography", "fontStyle"],      "str_passthrough"),
    "text-decoration":    (["typography", "textDecoration"], "str_passthrough"),
    "text-transform":     (["typography", "textTransform"],  "str_passthrough"),
    # spacing.margin — long-hand sides
    "margin-top":         (["spacing", "margin", "top"],    "unit"),
    "margin-right":       (["spacing", "margin", "right"],  "unit"),
    "margin-bottom":      (["spacing", "margin", "bottom"], "unit"),
    "margin-left":        (["spacing", "margin", "left"],   "unit"),
    # spacing.padding — long-hand sides
    "padding-top":        (["spacing", "padding", "top"],    "unit"),
    "padding-right":      (["spacing", "padding", "right"],  "unit"),
    "padding-bottom":     (["spacing", "padding", "bottom"], "unit"),
    "padding-left":       (["spacing", "padding", "left"],   "unit"),
    # border.*
    "border-radius":             (["border", "radius"],       "unit"),
    "border-top-left-radius":    (["border", "radius", "topLeft"],     "unit"),
    "border-top-right-radius":   (["border", "radius", "topRight"],    "unit"),
    "border-bottom-left-radius": (["border", "radius", "bottomLeft"],  "unit"),
    "border-bottom-right-radius":(["border", "radius", "bottomRight"], "unit"),
    "border-color":       (["border", "color"], "colour"),
    "border-width":       (["border", "width"], "unit"),
    "border-style":       (["border", "style"], "str_passthrough"),
    # dimensions (core/image only — guarded inside _lift_core_block_style)
    "max-height":         (["dimensions", "maxHeight"], "unit"),
    # core/image-specific top-level attrs
    "object-fit":         ("OBJECT_FIT",    "object_fit"),
    "aspect-ratio":       ("ASPECT_RATIO",  "aspect_ratio"),
}

# Allowed values for str_passthrough attrs that only accept a closed set
_STR_PASSTHROUGH_ALLOWED: dict[str, set[str]] = {
    "font-style":      {"italic", "normal"},
    "text-decoration": {"none", "underline", "line-through"},
    "text-transform":  {"none", "uppercase", "lowercase", "capitalize"},
    "border-style":    {"none", "solid", "dashed", "dotted"},
    "font-weight":     set(),  # empty = accept any
    "line-height":     set(),
    "letter-spacing":  set(),
}


def _split_value_unit(raw, default_unit: str = "px") -> tuple:
    """Split a CSS value like '28px' into ('28', 'px').

    Returns (val, unit) as strings. For CSS function values like
    `calc(100% - 40px)`, `clamp(1rem, 2vw, 3rem)`, `min(600px, 90vw)`,
    `max(...)`, `var(...)`, the whole expression is returned as the value
    with empty-string unit — these CSS functions carry their own units
    and concatenating a default-unit would produce invalid CSS like
    `calc(100% - 40px)px`. Caller must detect empty-unit case and emit
    the value without unit suffix. Captured 2026-05-17 by QC rater 3.

    For unrecognised plain forms returns (raw_string, default_unit).
    """
    if raw is None or raw == "":
        return ("", default_unit)
    s = str(raw).strip()
    # CSS function values — pass through whole expression, no unit.
    # The function body carries its own units; appending another would
    # produce invalid CSS.
    if re.match(r"^(calc|clamp|min|max|var|fit-content|minmax)\s*\(", s, re.IGNORECASE):
        return (s, "")
    m = re.match(r"^([\d.]+)\s*(px|em|rem|%|vh|vw|svh|svw|ch)?$", s)
    if not m:
        return (s, default_unit)
    val = m.group(1)
    unit = m.group(2) or default_unit
    return (val, unit)


def _flatten_wp_style_to_sgs_flat(style_dict: dict, extra_top: dict,
                                  target_block: str) -> dict:
    """Map a WP nested `style` dict + top-level extras to flat SGS attrs.

    Used by the atomic converter branches when emitting sgs/media or sgs/text
    instead of their core/* counterparts. The flat shape matches the schema
    those two blocks declare in their block.json.

    Returns a dict {attr_name: value} to merge into the block's attrs.
    Empty dict if style_dict is empty/None.
    """
    flat: dict = {}
    if not style_dict:
        if "aspectRatio" in (extra_top or {}):
            flat["aspectRatio"] = extra_top["aspectRatio"]
        return flat

    # Colour normalisation — handle THREE input shapes:
    # 1. `var:preset|color|<slug>` form from _lift_core_block_style — STRIP
    #    to bare slug since sgs_colour_value() re-wraps slugs as
    #    var(--wp--preset--color--X). Double-wrap produced
    #    `var(--wp--preset--color--varpresetcolortext-muted)` (initial bug).
    # 2. `var(--wp--preset--color--X)` form — same strip to bare slug.
    # 3. Raw CSS colour values (#hex / rgb() / rgba() / hsl() / named) — pass
    #    through UNCHANGED. sgs_colour_value()'s `sgs_is_css_colour` branch
    #    detects these and escapes them as-is. Without this passthrough a
    #    raw `#F5C2C8` becomes `var(--wp--preset--color--#f5c2c8)` (invalid).
    #    Captured 2026-05-17 by QC rater 3+4.
    def _normalise_colour(raw: str) -> str:
        if not raw:
            return raw
        s = str(raw).strip()
        # `var:preset|color|text-muted` -> bare slug
        if s.startswith("var:preset|color|"):
            return s[len("var:preset|color|"):]
        # `var(--wp--preset--color--xxx)` -> bare slug
        m = re.match(r"^var\(--wp--preset--color--([a-z0-9-]+)\)$", s)
        if m:
            return m.group(1)
        # Raw CSS colour shapes — leave untouched for the PHP-side
        # sgs_colour_value() to detect via sgs_is_css_colour.
        if re.match(r"^#[0-9a-fA-F]{3,8}$", s):
            return s
        if re.match(r"^(rgba?|hsla?)\s*\(", s, re.IGNORECASE):
            return s
        if s.lower() in ("transparent", "currentcolor", "inherit", "initial",
                         "unset", "white", "black"):
            return s
        return s

    color_obj = style_dict.get("color") or {}
    if color_obj.get("text"):
        flat["textColour"] = _normalise_colour(color_obj["text"])
    if color_obj.get("background") and target_block == "sgs/text":
        flat["backgroundColour"] = _normalise_colour(color_obj["background"])

    # Typography (sgs/text only — sgs/media has no typography)
    if target_block == "sgs/text":
        typo = style_dict.get("typography") or {}
        if typo.get("fontSize"):
            v, u = _split_value_unit(typo["fontSize"])
            flat["fontSize"] = v
            flat["fontSizeUnit"] = u
        if typo.get("fontWeight"):
            flat["fontWeight"] = typo["fontWeight"]
        if typo.get("lineHeight"):
            v, u = _split_value_unit(typo["lineHeight"], default_unit="em")
            flat["lineHeight"] = v
            flat["lineHeightUnit"] = u
        if typo.get("letterSpacing"):
            v, u = _split_value_unit(typo["letterSpacing"], default_unit="em")
            flat["letterSpacing"] = v
            flat["letterSpacingUnit"] = u
        if typo.get("fontStyle"):
            flat["fontStyle"] = typo["fontStyle"]
        if typo.get("textDecoration"):
            flat["textDecoration"] = typo["textDecoration"]
        if typo.get("textTransform"):
            flat["textTransform"] = typo["textTransform"]

    # Spacing — margin/padding per-side. sgs/text supports both; sgs/media
    # has no spacing controls in schema (rely on parent container's gap).
    if target_block == "sgs/text":
        spacing = style_dict.get("spacing") or {}
        margin = spacing.get("margin") or {}
        m_unit_seen = None
        for side in ("top", "right", "bottom", "left"):
            if side in margin:
                v, u = _split_value_unit(margin[side])
                flat[f"margin{side.capitalize()}"] = v
                m_unit_seen = u
        if m_unit_seen:
            flat["marginUnit"] = m_unit_seen
        padding = spacing.get("padding") or {}
        p_unit_seen = None
        for side in ("top", "right", "bottom", "left"):
            if side in padding:
                v, u = _split_value_unit(padding[side])
                flat[f"padding{side.capitalize()}"] = v
                p_unit_seen = u
        if p_unit_seen:
            flat["paddingUnit"] = p_unit_seen

    # Border radius — both blocks support it
    border = style_dict.get("border") or {}
    radius = border.get("radius")
    if isinstance(radius, str) and radius:
        v, u = _split_value_unit(radius)
        flat["borderRadius"] = v
        flat["borderRadiusUnit"] = u
    elif isinstance(radius, dict):
        corner_map = {"topLeft": "TL", "topRight": "TR",
                      "bottomLeft": "BL", "bottomRight": "BR"}
        unit_seen = None
        for corner, short in corner_map.items():
            if corner in radius:
                v, u = _split_value_unit(radius[corner])
                flat[f"borderRadius{short}"] = v
                unit_seen = u
        if unit_seen:
            flat["borderRadiusUnit"] = unit_seen

    # Image-only: dimensions + object-fit + aspect-ratio
    if target_block == "sgs/media":
        dim = style_dict.get("dimensions") or {}
        if dim.get("maxHeight"):
            v, u = _split_value_unit(dim["maxHeight"])
            flat["maxHeight"] = v
            flat["maxHeightUnit"] = u
        if dim.get("maxWidth"):
            v, u = _split_value_unit(dim["maxWidth"])
            flat["maxWidth"] = v
            flat["maxWidthUnit"] = u
        if style_dict.get("scale"):
            flat["objectFit"] = style_dict["scale"]
    if (extra_top or {}).get("aspectRatio") and target_block == "sgs/media":
        flat["aspectRatio"] = extra_top["aspectRatio"]

    return flat


def _lift_core_block_style(
    node: "Tag",
    classes: list[str],
    css_rules: dict,
    block_slug: str,
) -> tuple[dict, dict]:
    """Lift CSS declarations targeting `node`'s classes into a WP core block
    ``style`` attribute dict, plus optional top-level extra attrs.

    Used for atomic core blocks (core/heading, core/paragraph, core/image)
    that sit at SGS-BEM leaf positions. The slot-aware path handled by
    ``_lift_styling_attrs`` covers block-rooted composites (sgs/hero etc.);
    this function covers the case where the walker emits a raw core/image,
    core/heading, or core/paragraph and the CSS targeting that element's
    class was previously dropped silently.

    Returns:
        style_dict    — dict shaped for ``attributes.style`` (may be empty)
        extra_top     — dict of extra top-level attrs, e.g. ``aspectRatio``
                        for core/image (may be empty)

    Soft-fail: any malformed CSS value emits a ``css_decl_skipped`` trace
    event and continues — never raises.

    Tag-selector blast-radius guard: this helper fires ONLY when the node
    carries at least one ``sgs-`` class. Tag-only rules like ``p { color: ... }``
    or ``blockquote { font-style: ... }`` match every element of that tag in
    ``_collect_css_decls_for_element`` and would silently corrupt unrelated
    paragraphs/headings. The intent of this lift is per-class CSS targeting
    BEM children; without the SGS-class gate, a single bare-tag rule could
    overwrite styling across the whole document. Captured 2026-05-19 by QC
    rater 3 (adversarial lens) — pattern_key core-block-lift-requires-sgs-class.
    """
    style: dict = {}
    extra_top: dict = {}

    # Tag-selector blast-radius guard. See docstring for the corruption
    # scenario this prevents (rater 3 blocking finding 2026-05-19).
    has_sgs_class = any(c.startswith("sgs-") for c in (classes or []))
    if not has_sgs_class:
        _trace("css_decl_skipped", target_block=block_slug,
               css_prop="*", reason="no_sgs_bem_class_on_node")
        return style, extra_top

    # Collect base (desktop/default) CSS declarations for this element.
    # _collect_css_decls_for_element handles inline style + direct class
    # selectors + parent-qualified selectors.
    try:
        base_decls, _bp = _collect_css_decls_for_element(node, css_rules)
    except Exception:  # noqa: BLE001
        return style, extra_top

    if not base_decls:
        return style, extra_top

    # Normalise `background` shorthand → `background-color` before the loop
    # so the standard mapping handles it.
    if "background" in base_decls and "background-color" not in base_decls:
        bg = base_decls["background"].strip()
        if bg and "url(" not in bg and "gradient" not in bg:
            for tok in bg.split():
                if _extract_token_or_hex(tok) is not None:
                    base_decls["background-color"] = tok
                    break
            else:
                if len(bg.split()) == 1:
                    base_decls["background-color"] = bg

    # Expand padding/margin shorthands so the per-side long-hand paths work.
    for shorthand in ("padding", "margin"):
        if shorthand in base_decls and f"{shorthand}-top" not in base_decls:
            sides = _parse_padding_shorthand(base_decls[shorthand])
            if sides:
                for side, val in sides.items():
                    base_decls.setdefault(f"{shorthand}-{side}", val)

    # Expand `border` shorthand (e.g. `border: 1px solid #000`)
    if "border" in base_decls and "border-width" not in base_decls:
        _STYLE_KW = {"solid", "dashed", "dotted", "none"}
        for tok in base_decls["border"].strip().split():
            if tok in _STYLE_KW:
                base_decls.setdefault("border-style", tok)
            elif re.match(r"^[\d.]+(px|em|rem|%)$", tok):
                base_decls.setdefault("border-width", tok)
            else:
                base_decls.setdefault("border-color", tok)

    is_image = block_slug == "core/image"

    for css_prop, raw in base_decls.items():
        entry = _CORE_BLOCK_STYLE_MAP.get(css_prop)
        if entry is None:
            _trace("css_decl_skipped", target_block=block_slug,
                   css_prop=css_prop, reason="not_in_core_style_map")
            continue

        style_path, kind = entry

        # Guard: dimensions/object-fit/aspect-ratio are image-only
        if css_prop in ("max-height", "object-fit", "aspect-ratio") and not is_image:
            _trace("css_decl_skipped", target_block=block_slug,
                   css_prop=css_prop, reason="image_only_prop")
            continue

        try:
            if kind == "colour":
                converted = _colour_value_to_style(raw)
                if converted is None:
                    _trace("css_decl_skipped", target_block=block_slug,
                           css_prop=css_prop, reason="colour_not_resolved")
                    continue
                _set_in(style, style_path, converted)
                _trace("core_style_lifted", target_block=block_slug,
                       css_prop=css_prop, style_path=".".join(str(p) for p in style_path),
                       value=converted)

            elif kind == "unit":
                preserved = _preserve_unit(raw)
                if preserved is None:
                    _trace("css_decl_skipped", target_block=block_slug,
                           css_prop=css_prop, reason="unit_not_preserved")
                    continue
                _set_in(style, style_path, preserved)
                _trace("core_style_lifted", target_block=block_slug,
                       css_prop=css_prop, style_path=".".join(str(p) for p in style_path),
                       value=preserved)

            elif kind == "str_passthrough":
                val = raw.strip().rstrip(";")
                allowed = _STR_PASSTHROUGH_ALLOWED.get(css_prop, set())
                if allowed and val not in allowed:
                    _trace("css_decl_skipped", target_block=block_slug,
                           css_prop=css_prop, reason=f"value_not_in_allowed_set:{val}")
                    continue
                _set_in(style, style_path, val)
                _trace("core_style_lifted", target_block=block_slug,
                       css_prop=css_prop, style_path=".".join(str(p) for p in style_path),
                       value=val)

            elif kind == "object_fit":
                # object-fit → style.scale (WP core/image native attr)
                val = raw.strip().lower()
                _VALID_SCALE = {"cover", "contain", "fill", "none", "scale-down"}
                if val not in _VALID_SCALE:
                    _trace("css_decl_skipped", target_block=block_slug,
                           css_prop=css_prop, reason=f"unknown_object_fit:{val}")
                    continue
                _set_in(style, ["scale"], val)
                _trace("core_style_lifted", target_block=block_slug,
                       css_prop=css_prop, style_path="scale", value=val)

            elif kind == "aspect_ratio":
                # aspect-ratio → top-level aspectRatio attr on core/image
                val = raw.strip().replace(" / ", "/").replace(" /", "/").replace("/ ", "/")
                extra_top["aspectRatio"] = val
                _trace("core_style_lifted", target_block=block_slug,
                       css_prop=css_prop, style_path="[top-level]aspectRatio", value=val)

        except Exception as exc:  # noqa: BLE001
            _trace("css_decl_skipped", target_block=block_slug,
                   css_prop=css_prop, reason=f"exception:{exc}")
            continue

    return style, extra_top


# ============================================================================
# Universal width-mode helpers (Branch B, 2026-05-19)
#
# Goal: when mockup CSS declares a section `max-width` that matches the theme's
# contentSize / wideSize (per the active style variation), lift it as a
# semantic `widthMode` so WP's native alignment chain takes over and per-client
# theme variations win. Falls back to the existing inline-style
# `style.dimensions.maxWidth` path for arbitrary literal widths.
# ============================================================================
def _parse_px_length(raw: str) -> float | None:
    """Return the numeric px-equivalent of a CSS length, or None if unsupported.

    Accepts px / em / rem (em + rem treated as 16px = 1 unit, matching WP's
    default root font-size). Rejects %, vw, vh, calc(), var(), and `none` /
    `auto` — those are handled separately by the full-bleed path.
    """
    if raw is None:
        return None
    v = _strip_important(str(raw)).strip().lower().rstrip(";")
    if not v or v in _FULL_BLEED_WIDTH_VALUES:
        return None
    m = re.match(r"^([\d.]+)\s*(px|em|rem)$", v)
    if not m:
        return None
    try:
        num = float(m.group(1))
    except ValueError:
        return None
    unit = m.group(2)
    if unit == "px":
        return num
    # em / rem → assume 1 unit == 16px (WP / browser default root font size)
    return num * 16.0


def _detect_client_layout_widths(css_rules: dict) -> dict:
    """Detect content/wide section widths from mockup CSS.

    Universal: scans the CSS rule set for selectors matching `.sgs-<block>`
    block roots (NOT classes that look like utility / element helpers), groups
    their `max-width` declarations, and returns {contentSize, wideSize} as
    Python strings with the px unit preserved.

    Heuristic: contentSize = the smaller cluster centre; wideSize = the larger
    cluster centre. When only one distinct width is found, both keys carry it.

    Returns {} when no usable widths found (insufficient evidence — caller
    falls back to theme.json defaults).
    """
    if not css_rules:
        return {}

    # Collect (px_value, raw_value) pairs for every block-root selector.
    candidates: list[tuple[float, str]] = []
    for sel, decls in css_rules.items():
        if not isinstance(decls, dict):
            continue
        # Skip media-query-scoped rules — those are responsive overrides, not
        # the base canonical width. parse_css() prefixes them with `<cond> :: `.
        if " :: " in sel:
            continue
        sel_clean = sel.strip()
        if not _SGS_BEM_BLOCK_ROOT_RE.match(sel_clean):
            continue
        raw = decls.get("max-width")
        if raw is None:
            continue
        px = _parse_px_length(raw)
        if px is None:
            continue
        candidates.append((px, _strip_important(str(raw)).strip().rstrip(";")))

    if not candidates:
        return {}

    # Distinct px buckets (rounded to nearest pixel — small float jitter
    # shouldn't split a cluster).
    distinct: dict[int, str] = {}
    for px, raw in candidates:
        key = int(round(px))
        # Prefer the first raw we saw — keeps original unit if multiple rules
        # declared the same logical width.
        distinct.setdefault(key, raw)

    if not distinct:
        return {}

    sorted_keys = sorted(distinct.keys())

    if len(sorted_keys) == 1:
        only = distinct[sorted_keys[0]]
        return {"contentSize": only, "wideSize": only}

    # Two or more distinct widths: smallest → contentSize, largest → wideSize.
    return {
        "contentSize": distinct[sorted_keys[0]],
        "wideSize": distinct[sorted_keys[-1]],
    }


def _write_client_layout_widths(
    client_slug: str,
    widths: dict,
    repo_root: Path,
) -> bool:
    """Merge detected widths into `theme/sgs-theme/styles/{client_slug}.json`.

    Idempotent: never overwrites a value the operator has already set. Returns
    True if the file was modified, False on no-op (file missing, no keys to
    merge, or values already present).
    """
    if not client_slug or not widths:
        return False

    variation_path = (
        repo_root / "theme" / "sgs-theme" / "styles" / f"{client_slug}.json"
    )
    if not variation_path.exists():
        return False

    try:
        data = json.loads(variation_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False

    settings = data.setdefault("settings", {})
    layout = settings.setdefault("layout", {})

    modified = False
    for key in ("contentSize", "wideSize"):
        if key in widths and key not in layout:
            layout[key] = widths[key]
            modified = True

    if not modified:
        return False

    variation_path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False, sort_keys=False) + "\n",
        encoding="utf-8",
    )
    return True


def _load_theme_widths(client_slug: str | None, repo_root: Path) -> dict:
    """Return the active {contentSize, wideSize} for width-mode matching.

    Reads theme.json `settings.layout` as the base, then overlays the active
    style variation's `settings.layout` (if it exists and declares either key).
    Universal — when `client_slug` is None / empty, returns theme.json values.
    """
    result: dict = {}
    theme_path = repo_root / "theme" / "sgs-theme" / "theme.json"
    if theme_path.exists():
        try:
            theme = json.loads(theme_path.read_text(encoding="utf-8"))
            base_layout = (theme.get("settings") or {}).get("layout") or {}
            for k in ("contentSize", "wideSize"):
                v = base_layout.get(k)
                if v:
                    result[k] = v
        except (OSError, json.JSONDecodeError):
            pass

    if client_slug:
        variation_path = (
            repo_root / "theme" / "sgs-theme" / "styles" / f"{client_slug}.json"
        )
        if variation_path.exists():
            try:
                variation = json.loads(variation_path.read_text(encoding="utf-8"))
                var_layout = (variation.get("settings") or {}).get("layout") or {}
                for k in ("contentSize", "wideSize"):
                    v = var_layout.get(k)
                    if v:
                        result[k] = v
            except (OSError, json.JSONDecodeError):
                pass

    return result


def _match_theme_width(value_str: str, theme_widths: dict) -> str | None:
    """Compare a CSS length to theme contentSize / wideSize with fuzzy tolerance.

    Returns:
        "default" — matches contentSize (±_WIDTH_MATCH_TOLERANCE_PCT)
        "wide"    — matches wideSize    (±_WIDTH_MATCH_TOLERANCE_PCT)
        None      — no match (caller falls back to inline-style literal)

    When contentSize == wideSize (single-width variation), prefers "default".
    """
    if not value_str or not theme_widths:
        return None
    value_px = _parse_px_length(value_str)
    if value_px is None:
        return None

    tol = _WIDTH_MATCH_TOLERANCE_PCT / 100.0

    def _within(target_str: str | None) -> bool:
        if not target_str:
            return False
        target_px = _parse_px_length(target_str)
        if target_px is None or target_px <= 0:
            return False
        return abs(value_px - target_px) <= target_px * tol

    content_size = theme_widths.get("contentSize")
    wide_size = theme_widths.get("wideSize")

    if _within(content_size):
        return "default"
    if _within(wide_size):
        return "wide"
    return None


def _lift_root_supports_to_style(
    node: Tag,
    block_slug: str,
    css_rules: dict,
    attrs: dict,
) -> None:
    """Lift block-root CSS into WP native `style.*` attributes.

    Reads the node's own CSS (inline + class selectors targeting this element),
    consults `db.block_supports_for(block_slug)`, and writes matching properties
    into `attrs['style']`. Universal — every block whose CSS defines root-level
    spacing/border/colour gets it lifted onto the emitted block instead of being
    silently dropped on the variation-CSS lift.

    Never overwrites existing keys in `attrs['style']`. Other code paths still win.
    """
    if not block_slug or not block_slug.startswith("sgs/"):
        return

    supports = db.block_supports_for(block_slug)
    if not supports:
        return

    # Collect base (non-media-query) declarations targeting this element's own classes.
    base_decls, _bp_decls = _collect_css_decls_for_element(node, css_rules)
    if not base_decls:
        return

    style: dict = attrs.get("style") or {}

    # ---- 0. Colour shorthand: `background: <colour>` (without -color suffix)
    #         and `border: <width> <style> <colour>` are common in hand-authored
    #         mockup CSS. Normalise them BEFORE the rule table runs so the same
    #         supports gates apply.
    if "background" in base_decls and "background-color" not in base_decls:
        # Only treat as colour if it looks like a single colour value (no images / gradients)
        bg = base_decls["background"].strip()
        if bg and "url(" not in bg and "gradient" not in bg:
            # Take the first space-separated token that resolves to a colour
            for tok in bg.split():
                if _extract_token_or_hex(tok) is not None or tok in (
                    "white", "black", "transparent",
                ):
                    base_decls["background-color"] = tok
                    break
            else:
                # Single named colour we don't recognise via _extract_token_or_hex (e.g. 'white')
                if len(bg.split()) == 1:
                    base_decls["background-color"] = bg

    if "border" in base_decls and "border-width" not in base_decls:
        # `border: 1px solid var(--border)` → width=1px, style=solid, color=var(--border)
        parts = base_decls["border"].strip().split()
        # Pick out width (first token with unit), style (keyword), colour (rest)
        _STYLE_KW = {"solid", "dashed", "dotted", "double", "groove", "ridge",
                     "inset", "outset", "none", "hidden"}
        for tok in parts:
            if tok in _STYLE_KW:
                base_decls.setdefault("border-style", tok)
            elif re.match(r"^[\d.]+(px|em|rem|%)$", tok):
                base_decls.setdefault("border-width", tok)
            else:
                # Anything else is treated as the colour token
                base_decls.setdefault("border-color", tok)

    # Named CSS colours we accept as-is (parse_css strips quoting; _colour_value_to_style
    # otherwise returns None for non-hex/non-var values).
    _NAMED_COLOURS = {"white": "#FFFFFF", "black": "#000000"}
    for k in ("background-color", "color", "border-color"):
        v = base_decls.get(k)
        if v and v.strip().lower() in _NAMED_COLOURS:
            base_decls[k] = _NAMED_COLOURS[v.strip().lower()]

    # ---- 1. Padding/margin shorthand: expand BEFORE long-hand lookup so the
    #         long-hand pass below can also overlay specific sides if present.
    for shorthand_prop, side_top in (("padding", "padding"), ("margin", "margin")):
        raw = base_decls.get(shorthand_prop)
        if raw is None:
            continue
        if not _support_allows(supports, "spacing", side_top):
            continue
        # P-CSS-IMPORTANT-STRIP (2026-05-17): strip before shorthand parse.
        raw = _strip_important(raw)
        sides = _parse_padding_shorthand(raw)
        if not sides:
            continue
        for side, val in sides.items():
            unit_val = _preserve_unit(val)
            if unit_val is None:
                continue
            _set_in(style, ["spacing", shorthand_prop, side], unit_val)

    # ---- 2. Long-hand + colour + border + gap pass via the rule table.
    for css_prop, sup_top, sup_sub, path, kind in _root_lift_rules():
        if css_prop not in base_decls:
            continue
        if not _support_allows(supports, sup_top, sup_sub):
            continue
        # P-CSS-IMPORTANT-STRIP (2026-05-17): strip `!important` so values like
        # "22px !important" pass cleanly into _preserve_unit / _colour_value_to_style.
        raw = _strip_important(base_decls[css_prop])
        if kind == "colour":
            converted = _colour_value_to_style(raw)
        else:
            converted = _preserve_unit(raw)
        if converted is None:
            continue
        _set_in(style, path, converted)

    # ---- 3. max-width lift → widthMode emission (universal-alignment system,
    # Branch B 2026-05-19). When mockup CSS declares a section max-width that
    # matches the theme's contentSize / wideSize (per the active style
    # variation), emit a semantic `widthMode` value that the sgs/container
    # render path translates into WP-native alignwide / alignfull / inherit.
    # Falls back to the existing inline-style style.dimensions.maxWidth lift
    # for arbitrary widths. Universal across any container-rooted block.
    if "max-width" in base_decls:
        mw_raw = _strip_important(base_decls["max-width"]).strip().lower()
        if mw_raw in _FULL_BLEED_WIDTH_VALUES:
            # Section authored as full-bleed → emit widthMode: full and skip
            # the literal-pixel fallback (no meaningful max-width to preserve).
            attrs.setdefault("widthMode", "full")
        else:
            mw = _preserve_unit(base_decls["max-width"])
            if mw is not None:
                theme_widths = _LIFT_CONTEXT.get("theme_widths") or {}
                matched = _match_theme_width(mw, theme_widths)
                if matched in ("default", "wide"):
                    attrs.setdefault("widthMode", matched)
                else:
                    # Arbitrary literal — fall back to the legacy inline-style
                    # path so existing converter runs keep their current output.
                    _set_in(style, ["dimensions", "maxWidth"], mw)

    if style:
        attrs["style"] = style


def _css_value_to_attr(value: str, kind: str) -> object | None:
    """Convert a raw CSS value string to the Python value for a block attr.

    Returns None when the value cannot be meaningfully converted (e.g. a CSS
    ``var()`` expression for a numeric attr — we don't want "var(--spacing-4)"
    stored in a number field).
    """
    v = value.strip()
    if kind == "colour":
        return _extract_token_or_hex(v)
    if kind == "number_px":
        # strip 'px', 'em', 'rem' → numeric
        num = re.sub(r"[a-zA-Z%]+$", "", v)
        try:
            return float(num) if "." in num else int(num)
        except ValueError:
            return None
    if kind == "number_unitless":
        # line-height: 1.65 → 1.65
        try:
            return float(v) if "." in v else int(v)
        except ValueError:
            num = re.sub(r"[a-zA-Z%]+$", "", v)
            try:
                return float(num) if "." in num else int(num)
            except ValueError:
                return None
    if kind == "number_px_or_em":
        # letter-spacing: -1px or -0.05em
        num = re.sub(r"[a-zA-Z%]+$", "", v)
        try:
            return float(num) if "." in num else int(num)
        except ValueError:
            return None
    if kind == "string":
        # font-family: clean surrounding quotes
        return v.strip("'\"") if v else None
    return None


def _collect_css_decls_for_element(
    desc: Tag,
    css_rules: dict,
) -> tuple[dict[str, str], dict[str, dict[str, str]]]:
    """Collect CSS declarations that target `desc`.

    Returns two dicts:
      base_decls   — {prop: value} from the element's own classes (desktop/base)
      bp_decls     — {breakpoint_suffix: {prop: value}} for each recognised breakpoint

    Sources (in priority order):
      1. Inline ``style`` attribute on the element (highest specificity)
      2. Direct class selectors  (``.sgs-hero__sub``)
      3. Parent-qualified selectors (``.sgs-hero__copy .sgs-hero__sub``,
         ``.sgs-hero__copy h1``) — common in mockups where mobile vs desktop
         rules live under a context class.
    Media-keyed rules are routed to bp_decls by breakpoint keyword.
    """
    desc_classes: list[str] = desc.get("class", []) or []
    desc_tag: str = desc.name or ""

    base_decls: dict[str, str] = {}
    bp_decls: dict[str, dict[str, str]] = {}

    def _merge_into(target: dict, incoming: dict) -> None:
        """Merge `incoming` into `target`, preserving existing entries (inline > CSS)."""
        for p, v in incoming.items():
            if p not in target:
                target[p] = v

    # Collect matching selectors first so media-keyed rules can be applied in
    # ascending specificity order (more-specific breakpoint overrides broader).
    matched_base: list[dict[str, str]] = []
    matched_media: list[tuple[str, dict[str, str]]] = []

    # ---- 1. Inline style ----
    inline = desc.get("style", "") or ""
    if inline:
        _merge_into(base_decls, _parse_decls(inline))

    # ---- 2. Direct class selectors & parent-qualified selectors ----
    for sel, decls in css_rules.items():
        # Separate media qualifier from selector text
        if "::" in sel:
            media_part, sel_part = sel.split("::", 1)
            media_part = media_part.strip()
            sel_part = sel_part.strip()
        else:
            media_part = ""
            sel_part = sel.strip()

        # Check whether this selector targets our element. We accept:
        #   (a) ".sgs-hero__sub"           → direct class match
        #   (b) ".sgs-hero__copy h1"       → parent class + descendant tag
        #   (c) ".sgs-hero__copy .sgs-x"   → parent class + descendant class
        matches = False
        parts = sel_part.split()
        if not parts:
            continue

        last_part = parts[-1]

        # Direct class match
        if last_part.startswith(".") and last_part[1:] in desc_classes:
            matches = True
        # Direct tag match
        elif last_part == desc_tag and len(parts) >= 1:
            matches = True

        if not matches:
            continue

        # If a parent qualifier exists, confirm this element is inside that parent
        if len(parts) > 1 and matches:
            parent_token = parts[-2]
            if parent_token.startswith("."):
                parent_cls = parent_token[1:]
                # Walk up DOM to see if any ancestor has this class
                ancestor = desc.parent
                ancestor_match = False
                while ancestor and ancestor.name:
                    if parent_cls in (ancestor.get("class", []) or []):
                        ancestor_match = True
                        break
                    ancestor = ancestor.parent
                if not ancestor_match:
                    matches = False

        if not matches:
            continue

        # Route to base or breakpoint bucket (buffered for ordered apply)
        if media_part:
            matched_media.append((media_part, decls))
        else:
            matched_base.append(decls)

    # Apply base decls (CSS source order, preserve first)
    for d in matched_base:
        _merge_into(base_decls, d)

    # Apply media decls in ascending specificity so the most-specific
    # breakpoint wins for each suffix. min-width: 1280 must override
    # min-width: 768 for the Desktop bucket. max-width works in reverse —
    # smaller max-width is more specific (max-width: 640 over max-width: 767).
    def _specificity_key(media_cond: str) -> tuple[int, int]:
        """Lower tuple = applied first (so it gets overwritten by later)."""
        mn = re.search(r"min-width\s*:\s*(\d+)", media_cond)
        mx = re.search(r"max-width\s*:\s*(\d+)", media_cond)
        if mn:
            # smaller min-width first → larger overwrites
            return (0, int(mn.group(1)))
        if mx:
            # larger max-width first → smaller overwrites
            return (1, -int(mx.group(1)))
        return (2, 0)

    bp_rules = _breakpoint_suffixes()
    matched_media.sort(key=lambda mc: _specificity_key(mc[0]))
    for media_part, decls in matched_media:
        for bp_substr, bp_suffix_list in bp_rules:
            if bp_substr in media_part:
                for bp_suffix in bp_suffix_list:
                    bucket = bp_decls.setdefault(bp_suffix, {})
                    # overwrite — later (more specific) wins
                    bucket.update(decls)
                break

    return base_decls, bp_decls


def _slot_attr_prefix(block_slug: str, canonical_slot: str, schema: dict) -> str | None:
    """Find the attr-name prefix used for styling attrs in this slot.

    The content attr for the slot (e.g. ``headline`` for slot ``heading``) IS
    the prefix: ``headlineColour``, ``headlineFontSize*``, etc.

    Strategy: find the first string attr in the slot whose attr_name does NOT
    end with a known styling suffix — that's the content/text attr and its name
    is the prefix.
    """
    styling_suffixes = (
        "Colour", "Color", "FontSize", "FontWeight", "LineHeight",
        "LetterSpacing", "TextTransform", "FontFamily", "PaddingTop",
        "PaddingRight", "PaddingBottom", "PaddingLeft", "BorderRadius",
        "MaxWidth", "BackgroundColour", "Unit", "Mobile", "Tablet", "Desktop",
        "MarginBottom", "TextDecoration", "HoverColour", "HoverBackground",
    )
    for attr_name, info in schema.items():
        if info.get("canonical_slot") != canonical_slot:
            continue
        # Skip non-string and clearly styling attrs
        if any(attr_name.endswith(s) for s in styling_suffixes):
            continue
        return attr_name  # first plain text attr → use as prefix
    return None


def _lift_styling_attrs(
    desc: Tag,
    slot_name: str,
    block_slug: str,
    schema: dict,
    attrs: dict,
    css_rules: dict,
) -> None:
    """For a slot-resolved descendant element, look at its inline style + CSS
    rules targeting its classes (including @media breakpoints) and lift each CSS
    property into the corresponding *Colour / *FontSize / etc. attr on the parent
    block.

    Generic across blocks: the slot_name + property_suffix → attr_name mapping
    is schema-driven, not hardcoded per block.

    ``slot_name`` is the canonical slot (e.g. 'heading', 'label', 'subheading').
    The attr-name PREFIX is resolved from the schema (e.g. slot 'heading' →
    prefix 'headline', slot 'subheading' → prefix 'subHeadline').
    """
    # Resolve the canonical slot to make sure we have the right form
    canonical = db.canonical_slot_for(slot_name) or slot_name

    # Find the prefix used for this slot's attrs in the schema
    prefix = _slot_attr_prefix(block_slug, canonical, schema)
    if not prefix:
        # Slot has no plain-text anchor attr — can't infer prefix safely. Skip.
        return

    # Collect base decls (inline + direct/parent-qualified CSS) + breakpoint decls
    base_decls, bp_decls = _collect_css_decls_for_element(desc, css_rules)

    def _try_set(attr_name: str, value: object) -> None:
        """Assign to attrs only if the attr exists in schema and not already set."""
        if attr_name not in schema:
            return
        if attr_name in attrs:
            return  # don't overwrite
        if value is None or value == "":
            return
        attrs[attr_name] = value

    # ---- Base (desktop/default) props ----
    for css_prop, suffix, kind in _css_prop_to_suffix():
        raw = base_decls.get(css_prop)
        if raw is None:
            continue
        val = _css_value_to_attr(raw, kind)
        if val is None:
            continue
        candidate = f"{prefix}{suffix}"
        _try_set(candidate, val)
        # Some blocks use {prefix}FontSizeDesktop instead of {prefix}FontSize as
        # the canonical base/desktop value (e.g. sgs/hero headlineFontSizeDesktop).
        # When the bare candidate doesn't exist in the schema, fall back to the
        # Desktop-suffixed variant.
        if candidate not in schema:
            desktop_candidate = f"{prefix}{suffix}Desktop"
            _try_set(desktop_candidate, val)
        # Also try with 'Unit' companion where applicable. Universal: every
        # numeric kind that has a paired *Unit attr in schema gets the unit
        # emitted. Inference rules:
        #   - explicit 'em'/'rem'/'%' suffix → use that literal unit
        #   - bare number on line-height → 'em' (CSS unitless multiplier convention,
        #     matches SGS hero schema default for *LineHeightUnit)
        #   - everything else → 'px' (matches SGS default for *FontSizeUnit etc.)
        # MaxWidth exclusion removed 2026-05-17 — its Unit attr (e.g.
        # contentMaxWidthUnit) was silently failing to lift in the hero
        # extraction_failed bucket. number_unitless added to set so LineHeight
        # emits a Unit alongside its numeric value.
        if kind in ("number_px", "number_px_or_em", "number_unitless"):
            unit_candidate = f"{prefix}{suffix}Unit"
            if unit_candidate in schema and unit_candidate not in attrs:
                raw_stripped = raw.strip().lower()
                if raw_stripped.endswith("rem"):
                    unit = "rem"
                elif raw_stripped.endswith("em"):
                    unit = "em"
                elif raw_stripped.endswith("%"):
                    unit = "%"
                elif kind == "number_unitless":
                    # line-height: 1.65 → unit "em" (CSS multiplier convention)
                    unit = "em"
                else:
                    unit = "px"
                _try_set(unit_candidate, unit)

    # ---- Breakpoint-specific overrides ----
    # Media-query declarations are more specific than the base rule for the
    # viewports they cover, so they OVERWRITE any same-attr value the base
    # loop emitted via its base→Desktop schema-fallback. Apply in ascending
    # specificity within each property: base-emitted Desktop (34) gets
    # overridden by min-width:768 (52), which gets overridden by
    # min-width:1280 (58). Ordering is already established in
    # _collect_css_decls_for_element via _specificity_key; bp_decls dict
    # iteration preserves that insertion order on Python 3.7+.
    for bp_suffix, bp_decl_map in bp_decls.items():
        for css_prop, suffix, kind in _css_prop_to_suffix():
            raw = bp_decl_map.get(css_prop)
            if raw is None:
                continue
            val = _css_value_to_attr(raw, kind)
            if val is None:
                continue
            # Construct e.g. headlineFontSizeTablet / headlineFontSizeDesktop
            candidate = f"{prefix}{suffix}{bp_suffix}"
            if candidate in schema:
                attrs[candidate] = val
            # Companion Unit attr (same inference rules as the base loop)
            if kind in ("number_px", "number_px_or_em", "number_unitless"):
                unit_candidate = f"{prefix}{suffix}Unit{bp_suffix}"
                if unit_candidate not in schema:
                    # Some schemas use {prefix}{suffix}{bp}Unit instead
                    unit_candidate = f"{prefix}{suffix}{bp_suffix}Unit"
                if unit_candidate in schema:
                    raw_stripped = raw.strip().lower()
                    if raw_stripped.endswith("rem"):
                        unit = "rem"
                    elif raw_stripped.endswith("em"):
                        unit = "em"
                    elif raw_stripped.endswith("%"):
                        unit = "%"
                    elif kind == "number_unitless":
                        unit = "em"
                    else:
                        unit = "px"
                    attrs[unit_candidate] = unit


def lift_subtree_into_block_attrs(node: Tag, block_slug: str,
                                  css_rules: dict | None = None) -> dict:
    """Walk all SGS-BEM-classed descendants of `node` and lift each into the
    matching typed attribute on `block_slug`.

    This is the "slot-aware extraction" path for block-rooted nodes. Instead of
    emitting a nested tree of containers + atomic blocks, we read the block's
    block.json schema (via block_attributes table) and assign descendants'
    content to typed attrs by canonical_slot. The result is a single block with
    all values lifted — way more editable in the WP editor than a nested tree.

    Special handling:
      - array attrs (e.g. packSizes): walks the pill-group children, builds
        [{label, selected}, ...] from button text + 'active' class presence
      - array attrs (generic): ARRAY_LIFT_PATTERNS covers testimonials, badges
      - string attrs that look like buttons: lifts BOTH text and url from a
        single <a> descendant
      - image/object attrs: lifted as {id, url, alt} objects (sgs/hero images)
      - variantStyle enum: detected from --modifier OR trialTag presence
      - (heritage-strip retired 2026-05-16; now lives as a pattern)

    The node itself is not consumed — caller still owns the className.
    """
    attrs: dict = {}
    schema = db.block_attrs(block_slug)

    # ---- 1. Detect variantStyle from BEM modifier or trialTag presence ----
    # Block-root class + sibling class modifiers all count
    classes: list[str] = node.get("class", []) or []
    variant_attr = "variantStyle" if "variantStyle" in schema else None
    if variant_attr:
        enum_vals: list[str] = []
        # Re-query for enum_values from the DB if we want to be strict;
        # for now, hard-code the known values that the product-card declares.
        # (block.json enum reading is the next refinement.)
        enum_vals = ["standard", "trial", "gift"]
        for cls in classes:
            parsed = db.parse_sgs_bem(cls)
            if parsed and parsed.modifier and parsed.modifier in enum_vals:
                attrs[variant_attr] = parsed.modifier
                break
        # Sibling class detection: --trial on a class whose block != block-root
        if variant_attr not in attrs:
            for cls in classes:
                parsed = db.parse_sgs_bem(cls)
                if parsed and parsed.modifier in enum_vals and f"sgs/{parsed.block}" != block_slug:
                    attrs[variant_attr] = parsed.modifier
                    break

    # ---- 1b. Defaults for variantStyle ----
    if variant_attr and variant_attr not in attrs:
        attrs[variant_attr] = "standard"

    # ---- 1c. Tag-based fallback for unclassed headings (h1-h4) ----
    # Generic — find the block's heading-like attr via canonical_slot lookup
    # rather than hardcoding to productName. For hero this resolves to
    # 'headline'; for product-card to 'productName'; for testimonial probably
    # something else again. The DB drives the mapping.
    heading_attr = db.attr_name_for_slot_or_alias(block_slug, "heading")
    if heading_attr and heading_attr not in attrs:
        for tag in ("h1", "h2", "h3", "h4"):
            h = node.find(tag)
            if h and not any(c.startswith("sgs-") for c in (h.get("class") or [])):
                attrs[heading_attr] = h.get_text(strip=True)
                # Lift styling for the heading slot from this unclassed element
                if css_rules:
                    _lift_styling_attrs(h, "heading", block_slug, schema, attrs, css_rules)
                break

    # ---- 1d. CTA lift: <a class="sgs-button"> patterns ----
    # Two shapes:
    #   - product-card style: single ctaText + ctaUrl
    #   - hero/cta-section style: ctaPrimaryText/Url + ctaSecondaryText/Url
    # Detect by schema membership; lift accordingly. --secondary/--tertiary
    # modifier routes to the secondary attrs when both shapes exist.
    ctas = node.find_all("a", class_=lambda c: c and "sgs-button" in c)
    if ctas:
        # Single-CTA shape (product-card)
        if "ctaText" in schema:
            primary_cta = next(
                (c for c in ctas if not any("--secondary" in cls or "--tertiary" in cls
                                              for cls in (c.get("class") or []))),
                ctas[0],
            )
            if "ctaText" not in attrs:
                attrs["ctaText"] = primary_cta.get_text(strip=True)
                if "ctaUrl" in schema:
                    attrs["ctaUrl"] = primary_cta.get("href", "").strip()
        # Primary/secondary shape (hero)
        elif "ctaPrimaryText" in schema:
            for cta in ctas:
                cls_str = " ".join(cta.get("class") or [])
                is_secondary = "--secondary" in cls_str or "--tertiary" in cls_str
                if is_secondary:
                    if "ctaSecondaryText" in schema and "ctaSecondaryText" not in attrs:
                        attrs["ctaSecondaryText"] = cta.get_text(strip=True)
                        if "ctaSecondaryUrl" in schema:
                            attrs["ctaSecondaryUrl"] = cta.get("href", "").strip()
                elif "ctaPrimaryText" not in attrs:
                    attrs["ctaPrimaryText"] = cta.get_text(strip=True)
                    if "ctaPrimaryUrl" in schema:
                        attrs["ctaPrimaryUrl"] = cta.get("href", "").strip()

    # ---- 1e. Generic array-of-objects lift (Change 2) ----
    # For blocks that have array-typed attrs matching ARRAY_LIFT_PATTERNS
    # (e.g. sgs/testimonial-slider → testimonials), walk child elements and
    # build the array before we hit the per-descendant BEM loop.
    for attr_name, pattern in ARRAY_LIFT_PATTERNS.items():
        if attr_name in schema and attr_name not in attrs:
            attr_type = schema[attr_name].get("attr_type", "string")
            if attr_type == "array":
                lifted_array = _lift_array_attr(node, attr_name, pattern)
                if lifted_array:
                    attrs[attr_name] = lifted_array

    # ---- 1e-B. Universal BEM-child array lifter (P-PHASE8-2, 2026-05-16) ----
    # For array attrs that have NO ARRAY_LIFT_PATTERNS entry (e.g. trust-bar's
    # `items`), try the generic BEM-child detector. Works for any block whose
    # mockup uses sgs-<parent>__<element> BEM children as array items.
    _bem_array_item_nodes: list = []  # track for exclusion in section 2
    for _attr_name_bem, _info_bem in schema.items():
        if _info_bem.get("attr_type") == "array" and _attr_name_bem not in attrs:
            _lifted_bem = _lift_bem_child_array(node, block_slug, _attr_name_bem, schema)
            if _lifted_bem:
                attrs[_attr_name_bem] = _lifted_bem
                # Record item-level nodes so section 2 skips their descendants
                _parent_bem = block_slug.rsplit("/", 1)[-1]
                _prefix = f"sgs-{_parent_bem}__"
                from collections import Counter as _C
                _ec: _C = _C()
                for _d in node.find_all(True, class_=lambda _c: _c and any(
                    _x.startswith(_prefix) for _x in (_c if isinstance(_c, list) else [_c])
                )):
                    _dclasses = _d.get("class") or []
                    for _dc in _dclasses:
                        _dp = db.parse_sgs_bem(_dc)
                        if _dp and _dp.block == _parent_bem and _dp.element:
                            _ec[_dp.element] += 1
                            break
                _array_el = max(
                    ((_el, _cnt) for _el, _cnt in _ec.items() if _cnt > 1),
                    key=lambda x: (-x[1], x[0]),
                    default=(None, 0),
                )[0]
                if _array_el:
                    for _item_node in node.find_all(True, class_=lambda _c: _c and any(
                        db.parse_sgs_bem(_x) and
                        db.parse_sgs_bem(_x).block == _parent_bem and
                        db.parse_sgs_bem(_x).element == _array_el
                        for _x in (_c if isinstance(_c, list) else [_c])
                    )):
                        _bem_array_item_nodes.append(_item_node)

    # ---- 1f. (retired 2026-05-16) — Heritage-strip lift guard removed ----
    # sgs/heritage-strip was deleted as a block; it lives as a pattern
    # (theme/sgs-theme/patterns/brand.php). The Stage 2 pattern matcher now
    # routes `sgs-heritage-strip` / `sgs-brand` class signatures through the
    # pattern path; there is no longer a block-root to lift body+image into.

    # ---- 1g. Hero image lift — object-typed image attrs (Change 1) ----
    # sgs/hero uses splitImage (desktop) and splitImageMobile (mobile) as
    # object-typed attrs ({id, url, alt}). The source DOM uses (in priority):
    #   - <img class="sgs-hero__split-image--desktop">  → splitImage (canonical SGS, matches block emission)
    #   - <img class="sgs-hero__split-image--mobile">   → splitImageMobile (canonical SGS)
    #   - <div class="sgs-hero__image"><img/></div>     → splitImage (LEGACY non-canonical)
    #   - <img class="sgs-hero__image--mobile">         → splitImageMobile (LEGACY non-canonical)
    # Canonical lookups take precedence so post-migration mockups (Spec 13
    # SGS-BEM naming) work correctly; legacy lookups remain for unmigrated
    # mockups. These don't route through the BEM slot lookup (element is
    # 'image' but the attr name on hero is 'splitImage' not 'image').
    if block_slug == "sgs/hero":
        if "splitImage" in schema and "splitImage" not in attrs:
            # Canonical SGS naming first (matches block emission)
            desktop_img = node.find("img", class_=lambda c: c and "sgs-hero__split-image--desktop" in c)
            if desktop_img is None:
                # Legacy fallback for pre-migration mockups
                img_wrapper = node.find(class_="sgs-hero__image")
                if img_wrapper:
                    desktop_img = img_wrapper.find("img") if img_wrapper.name != "img" else img_wrapper
            if desktop_img:
                attrs["splitImage"] = {
                    "id": None,
                    "url": _resolve_media_url(desktop_img.get("src", "").strip()),
                    "alt": desktop_img.get("alt", "").strip(),
                }
        if "splitImageMobile" in schema and "splitImageMobile" not in attrs:
            # Canonical SGS naming first
            mobile_img = node.find("img", class_=lambda c: c and "sgs-hero__split-image--mobile" in c)
            if mobile_img is None:
                # Legacy fallback for pre-migration mockups
                mobile_img = node.find("img", class_=lambda c: c and "sgs-hero__image--mobile" in c)
            if mobile_img:
                attrs["splitImageMobile"] = {
                    "id": None,
                    "url": _resolve_media_url(mobile_img.get("src", "").strip()),
                    "alt": mobile_img.get("alt", "").strip(),
                }
        # variant: prefer BEM modifier on the root node, fall back to image-presence
        # inference only when no explicit modifier is set.
        # Replaces 2026-05-15-removed unconditional `variant="split"` which would
        # misclassify a standard hero with a decorative image (e.g. Indus Foods
        # background-image hero) as a split hero.
        if "variant" in schema and "variant" not in attrs:
            root_classes = node.get("class", []) or []
            VARIANT_MODIFIERS = {
                "sgs-hero--split":         "split",
                "sgs-hero--standard":      "standard",
                "sgs-hero--video":         "video",
                "sgs-hero--svg-animated":  "svg-animated",
            }
            detected_variant = None
            for cls in root_classes:
                if cls in VARIANT_MODIFIERS:
                    detected_variant = VARIANT_MODIFIERS[cls]
                    break
            if detected_variant:
                attrs["variant"] = detected_variant
            elif attrs.get("splitImage"):
                # No explicit modifier — fall back to image-presence inference
                # ONLY when both splitImage AND a copy slot are present (a true
                # split hero has both panels). Bare background-image standard
                # heroes should NOT trigger this.
                if attrs.get("headline") or attrs.get("label"):
                    attrs["variant"] = "split"

    # ---- 2. Find descendants and lift each into an attr ----
    # We walk the FULL subtree, not just direct children, because BEM-classed
    # descendants can be nested arbitrarily deep within the block-root.
    #
    # Build a set of nodes that live INSIDE already-processed array children.
    # This prevents the slider's sgs-testimonial__stars (inside each article)
    # from being harvested as ratingColour on the parent slider block —
    # those elements were already consumed by the ARRAY_LIFT_PATTERNS pass.
    _array_child_descendants: set = set()
    for attr_name, pattern in ARRAY_LIFT_PATTERNS.items():
        if attr_name in attrs:  # only exclude if array was actually lifted
            child_tag = pattern["child_tag"]
            child_cls = pattern["child_class_contains"]
            matched_children = node.find_all(
                child_tag,
                class_=lambda c: c and child_cls in (" ".join(c) if isinstance(c, list) else c),
            )
            for mc in matched_children:
                _array_child_descendants.update(mc.descendants)
    # Also exclude descendants of BEM-child array items lifted by section 1e-B
    for _item_node in _bem_array_item_nodes:
        _array_child_descendants.add(_item_node)
        _array_child_descendants.update(_item_node.descendants)

    for desc in node.find_all(True):
        if desc is node:
            continue
        # Skip descendants that are inside an already-processed array child
        if desc in _array_child_descendants:
            continue
        desc_classes: list[str] = desc.get("class", []) or []

        # Detect trialTag: any descendant with class containing 'card-tag' inside
        # a trial variant — lift its text into trialTag attr.
        if "trialTag" in schema and attrs.get(variant_attr) == "trial":
            for c in desc_classes:
                if "card-tag" in c or "trial-tag" in c:
                    attrs["trialTag"] = desc.get_text(strip=True)
                    break

        # Find a SGS-BEM-classed element with a meaningful element name
        for cls in desc_classes:
            parsed = db.parse_sgs_bem(cls)
            if not parsed or not parsed.element:
                continue

            # Special: pill-group → packSizes array
            if "packSizes" in schema and "pill-group" in parsed.element:
                pills = []
                for btn in desc.find_all("button"):
                    btn_classes = btn.get("class", []) or []
                    pills.append({
                        "label": btn.get_text(strip=True),
                        "selected": "active" in btn_classes or btn.get("aria-pressed") == "true",
                    })
                if pills:
                    attrs["packSizes"] = pills
                break  # done with this descendant

            # Try direct slot → attr lookup
            target_attr = db.attr_name_for_slot_or_alias(block_slug, parsed.element)
            if not target_attr:
                # Canonical fallback (e.g. element 'image' → slot 'media' → attr 'image')
                canonical_for_lookup = db.canonical_slot_for(parsed.element)
                if canonical_for_lookup:
                    target_attr = db.attr_name_for_slot_or_alias(block_slug, canonical_for_lookup)
            if not target_attr:
                continue
            if target_attr in attrs:
                # Already lifted via an earlier matching descendant; don't overwrite
                break

            # Type-aware value extraction
            attr_type = schema[target_attr].get("attr_type", "string")
            value = _extract_attr_value(desc, target_attr, attr_type, schema)
            if value not in (None, "", []):
                attrs[target_attr] = value
                # If this is an image-family attr, also try to lift the alt
                if target_attr == "image" and desc.name == "img" and "imageAlt" in schema:
                    alt = desc.get("alt", "").strip()
                    if alt:
                        attrs["imageAlt"] = alt
                # If this is a CTA text attr, also try to lift the url
                if target_attr == "ctaText" and desc.name == "a" and "ctaUrl" in schema:
                    href = desc.get("href", "").strip()
                    if href:
                        attrs["ctaUrl"] = href

            # Lift CSS-driven styling attrs for this slot (colour, font-size, etc.)
            # Runs whether or not content was found — a slot element always carries
            # the styling even when its text is empty (e.g. an <img> wrapper).
            if css_rules:
                canonical_for_styling = db.canonical_slot_for(parsed.element) or parsed.element
                _lift_styling_attrs(desc, canonical_for_styling, block_slug, schema, attrs, css_rules)

            break  # done with this descendant

    # Emit attr_skipped roll-up: for every schema-declared attr that the
    # subtree lift did not fill, surface one event per skipped attr with the
    # reason inferred from current evidence. This is the cheapest way to
    # surface "what the schema wanted vs what we delivered" without inline
    # emits across this 600-line function. Stage 2 (expected-rules baseline)
    # compares these against the per-section CSS rule baseline to catch silent
    # misses (e.g. yesterday's @media regex bug emitted zero trace events).
    if _TRACE is not None:
        try:
            for _attr_name, _info in (schema or {}).items():
                if _attr_name in attrs:
                    continue
                _attr_type = _info.get("attr_type", "string")
                # value_empty is the default reason — no descendant matched the
                # canonical_slot for this attr. db_lookup_no_row would be
                # surfaced by db_lookup.py separately. kind_inference_failed
                # would need inline emits in _extract_attr_value (parked).
                _reason = "value_empty"
                if _attr_type == "array":
                    _reason = "array_no_pattern_match"
                _trace("attr_skipped",
                       block_slug=block_slug,
                       attr=_attr_name,
                       attr_type=_attr_type,
                       reason=_reason)
        except Exception:  # noqa: BLE001 — trace emission must never break convert
            pass

    return attrs


def _extract_attr_value(desc: Tag, attr_name: str, attr_type: str, schema: dict) -> object:
    """Pull the appropriate value off `desc` for an attribute of the given type."""
    if attr_type == "array":
        return None  # array types are handled by special-case extractors

    # Object-typed image/media attrs (Change 1) — e.g. splitImage, backgroundImage,
    # sideImage. Return a {id, url, alt} dict that WP block editor understands.
    if attr_type == "object" and ("image" in attr_name.lower() or "media" in attr_name.lower()):
        if desc.name == "img":
            return {
                "id": None,
                "url": _resolve_media_url(desc.get("src", "").strip()),
                "alt": desc.get("alt", "").strip(),
            }
        if desc.name == "picture":
            img = desc.find("img")
            if img:
                return {
                    "id": None,
                    "url": _resolve_media_url(img.get("src", "").strip()),
                    "alt": img.get("alt", "").strip(),
                }
        return None

    # Image-family: prefer src, then alt
    if attr_name == "image" or attr_name == "imageAlt":
        if desc.name == "img":
            raw_src = desc.get("src", "").strip()
            if attr_name == "image":
                # Resolve through the active media-map if loaded (sets WP attachment URL)
                return _resolve_media_url(raw_src)
            return desc.get("alt", "").strip()
    # CTA family: prefer text content for ctaText, href for ctaUrl
    if attr_name == "ctaText":
        return desc.get_text(strip=True)
    if attr_name == "ctaUrl":
        return desc.get("href", "").strip() if desc.name == "a" else ""

    # Skip wrapper elements: a layout div like `__body` contains many leaves —
    # taking its concatenated text would lift "title + body + buttons + price"
    # into a single `description` string. Only leaf elements (no Tag children)
    # are real content for string attributes.
    has_tag_children = any(isinstance(c, Tag) for c in desc.children)
    if has_tag_children:
        return None

    # Default: text content
    return desc.get_text(strip=True)


def walk(node: Tag, css_rules: dict, variation_buf: list[str], depth: int = 0,
         is_top_level: bool = False) -> str | None:
    """Recursively convert a DOM node into WP block markup.

    is_top_level: when True, an unmatched node emits sgs/container with className
    preserved. When False (the recursive default), unmatched nodes are walked
    THROUGH — their child blocks bubble up to the parent's inner_blocks list
    without an extra wrapper. This honours Bean's rule (2026-05-14):
    "containers were just supposed to be top-level class containers and not
    really supposed to be used elsewhere in an obligatory manner".
    """
    if isinstance(node, NavigableString):
        text = str(node).strip()
        return text if text else None

    if not isinstance(node, Tag):
        return None

    classes: list[str] = node.get("class", []) or []

    # ---- Tag-based skip: header / footer / nav at top level ----
    # WP template-part territory — the theme renders these via parts/*.html.
    # Tag-based (not class-based) so any client mockup's <header> is caught
    # regardless of its className.
    if is_top_level and node.name in SKIP_TOP_LEVEL_TAGS:
        skip_label = " ".join(classes) if classes else node.name
        _trace("walker_branch_taken", branch="chrome_skip", node_tag=node.name,
               node_classes=classes, depth=depth)
        return (
            f"<!-- sgs-converter: CHROME SKIPPED (<{node.name}> {skip_label}) -- "
            f"belongs in WP template parts, not post content -->"
        )

    target, bem = get_block_for_node(node)

    # ---- BLOCK-ROOT FAST PATH (FR1): lift subtree into typed attrs ----
    # When a node's first SGS-BEM class is a bare block reference (sgs-X with
    # no element) AND sgs/X is a registered block, this node IS that block.
    # Switch from "recurse and nest" to "harvest descendants into block attrs".
    #
    # PRECEDENCE: this MUST fire before the CSS-driven container override
    # (2026-05-16 fix). Previously, the CSS-driven override ran first and
    # absorbed every nested .sgs-product-card / .sgs-info-box / .sgs-testimonial-
    # slider that happened to have display:flex|grid in source CSS, emitting
    # sgs/container with className instead of the registered block. FR1 was
    # only firing at the top-level section. Spec 16 R3+FR1 says block-root
    # slot harvest happens AT EVERY DEPTH where the BEM class resolves to a
    # registered status='built' block — not just at section boundaries.
    if (target.startswith("sgs/") and target != "sgs/container"
            and bem and bem.element is None and db.block_exists(target)):
        _trace("walker_branch_taken", branch="fr1_block_root", node_tag=node.name,
               node_classes=classes, target_block=target, depth=depth)
        lifted = lift_subtree_into_block_attrs(node, target, css_rules=css_rules)
        wrapper_attrs = lift_attrs_for_block(target, node, bem, classes)
        merged = {**wrapper_attrs, **lifted}

        # P-PHASE9-4: lift block-root CSS (padding/border/background/colour) onto
        # WP native style.* attrs gated by block_supports.
        _lift_root_supports_to_style(node, target, css_rules, merged)

        # Change 3: InnerBlocks emission for blocks that use InnerBlocks
        # rather than flat array attrs (e.g. sgs/feature-grid → sgs/info-box).
        # When a pattern exists for the target, emit child blocks as inner markup
        # instead of emitting a self-closing block.
        if target in INNER_BLOCK_PATTERNS:
            inner_markup = _lift_inner_blocks(node, INNER_BLOCK_PATTERNS[target])
            if inner_markup:
                return emit_wp_block(target, merged, inner_markup, self_closing=False)

        return emit_wp_block(target, merged, [], self_closing=True)

    # ---- COMPOSITE-ELEMENT-TO-STANDALONE-BLOCK FAST PATH ----
    # When a node's BEM element resolves to a canonical slot that has a
    # standalone block in DB (e.g. `__card` → 'card' → sgs/info-box), AND the
    # node has element children (composite, not bare text), emit the standalone
    # block with descendants lifted via the same FR1 path. Added 2026-05-16
    # so `sgs-gift-section__card` etc. become sgs/info-box blocks rather than
    # pass-through wrappers losing their composition.
    #
    # This is intentionally distinct from the leaf-text path further below,
    # which handles single-line elements like <span class="sgs-foo__label">
    # by emitting sgs/label with just text+tag+variantStyle attrs. Composite
    # elements need full descendant lift — the FR1 mechanism is correct.
    if (target == "sgs/container" and bem and bem.element
            and any(isinstance(c, Tag) for c in node.children)):
        canonical = db.canonical_slot_for(bem.element)
        standalone = db.standalone_block_for(canonical) if canonical else None
        if not (standalone and db.block_exists(standalone)):
            # Outer composite_element guard fired but no standalone block
            # exists — node falls through to css_driven_container / sgs_bem_
            # wrapper / pass_through. Emit explicit signal so /systematic-
            # debugging can distinguish "never a candidate" from "candidate
            # but DB missed the slot mapping". Sonnet QC finding 2026-05-17.
            _trace("walker_branch_taken", branch="composite_element_no_standalone",
                   node_tag=node.name, node_classes=classes,
                   bem_element=bem.element, canonical_slot=canonical,
                   standalone_lookup=standalone, depth=depth)
        if standalone and db.block_exists(standalone):
            _trace("walker_branch_taken", branch="composite_element",
                   node_tag=node.name, node_classes=classes,
                   bem_element=bem.element, canonical_slot=canonical,
                   target_block=standalone, depth=depth)
            lifted = lift_subtree_into_block_attrs(node, standalone, css_rules=css_rules)
            wrapper_attrs = lift_attrs_for_block(standalone, node, bem, classes)
            merged = {**wrapper_attrs, **lifted}
            # P-PHASE9-4: lift block-root CSS onto WP native style.* attrs
            _lift_root_supports_to_style(node, standalone, css_rules, merged)
            # Empty-attrs safety net (QC panel finding 2026-05-16): if neither
            # the FR1 descent nor the wrapper attrs produced any content keys,
            # the block will render blank in WP. Warn so the operator surfaces
            # a missing canonical_slot mapping or a malformed source subtree
            # rather than silently shipping an invisible empty block.
            if not lifted and not any(k for k in wrapper_attrs if k != "className"):
                sys.stderr.write(
                    f"[converter_v2] WARN: composite-element path emitted "
                    f"{standalone} with no content attrs lifted from "
                    f"<{node.name} class=\"{' '.join(classes)}\">. "
                    f"Check slot_synonyms/block_attributes canonical_slot mapping "
                    f"for block_slug={standalone}.\n"
                )
            if standalone in INNER_BLOCK_PATTERNS:
                inner_markup = _lift_inner_blocks(node, INNER_BLOCK_PATTERNS[standalone])
                if inner_markup:
                    return emit_wp_block(standalone, merged, inner_markup, self_closing=False)
            return emit_wp_block(standalone, merged, [], self_closing=True)

    # ---- CSS-driven sgs/container detection (FALLBACK) ----
    # If the node's source CSS shows display:grid|flex AND no block-root /
    # composite-element route above claimed it, emit as sgs/container with
    # attrs (layout, gridTemplateColumns, gap) read from the mockup's own CSS.
    # Generic across any client mockup — no hardcoded class names or ratios.
    # Replaces the 2026-05-15 SECTION_AS_CONTAINER_OVERRIDES dict.
    container_override = _detect_grid_container_from_css(classes, css_rules)
    if container_override:
        _trace("walker_branch_taken", branch="css_driven_container",
               node_tag=node.name, node_classes=classes,
               layout=container_override.get("layout"), depth=depth)
        inner_blocks: list[str] = []
        for child in node.children:
            if isinstance(child, NavigableString):
                continue
            if isinstance(child, Tag):
                converted = walk(child, css_rules, variation_buf, depth + 1, is_top_level=False)
                if converted:
                    inner_blocks.append(converted)
        # Lift the className AND the container-override layout attrs.
        # P-MULTI-CLASS-BEM-PRIMARY-DISAMBIG (2026-05-17): when multiple
        # sgs-* classes are present (e.g. "sgs-brand sgs-section sgs-section--alt"),
        # pick a single canonical primary so downstream CSS rules don't
        # conflict. Remaining classes still travel as className additions.
        sgs_classes = [c for c in classes if c.startswith("sgs-")]
        cont_attrs: dict = dict(container_override)
        if sgs_classes:
            primary, _remaining = _pick_primary_sgs_block(sgs_classes)
            cont_attrs["className"] = " ".join(sgs_classes)
            if primary:
                cont_attrs["_primaryBemClass"] = primary  # routing hint — dropped before emit
        # P-PHASE9-4 sibling fix (2026-05-17): block-root supports lift was only
        # firing on FR1 / atomic_text_standalone / top_level_container branches.
        # css_driven_container (the path taken for `.sgs-brand` with display:grid)
        # was skipping the lift, so padding/max-width/background/etc. on the
        # section root were silently dropped. This caused the section to render
        # with default WP wide-alignment + zero padding instead of the mockup's
        # `padding: 64px 20px; max-width: 1000px; background: var(--surface-alt)`.
        schema = db.block_attrs("sgs/container")
        _lift_root_supports_to_style(node, "sgs/container", css_rules, cont_attrs)
        # Lift CSS targeting these classes into the variation buffer so the
        # source CSS still binds (the className is preserved on the container).
        decls = _collect_css_for_classes(classes, css_rules)
        if decls:
            variation_buf.append(decls)
        return emit_wp_block("sgs/container", cont_attrs, inner_blocks)

    # Atomic content blocks — emit with text content.
    # Path B swap (2026-05-19): when the source node carries an SGS-BEM class,
    # emit a server-rendered sgs/text or sgs/media instead of core/* so the
    # lifted style attrs apply on the frontend. core/* are STATIC blocks —
    # their save.js HTML is frozen in post_content, so JSON style attrs are
    # invisible to the renderer. SGS dynamic blocks build the HTML from
    # attrs at render time, making the lift visible.
    if target == "core/paragraph":
        _trace("walker_branch_taken", branch="atomic_paragraph",
               node_tag=node.name, node_classes=classes, depth=depth)
        text = node.get_text(strip=True)
        sgs_classes = [c for c in (classes or []) if c.startswith("sgs-")]
        if sgs_classes:
            # Swap to sgs/text — emits a styled <p> server-side.
            style_dict, extra_top = _lift_core_block_style(
                node, classes, css_rules, "core/paragraph"
            )
            flat = _flatten_wp_style_to_sgs_flat(
                style_dict, extra_top, "sgs/text"
            )
            text_attrs: dict = {
                "text": text,
                "tag": node.name if node.name in
                       ("p", "span", "div", "blockquote", "em", "strong") else "p",
                "className": " ".join(sgs_classes),
            }
            if node.get("id"):
                text_attrs["anchor"] = node["id"]
            text_attrs.update(flat)
            return emit_wp_block("sgs/text", text_attrs, [], self_closing=True)
        # No SGS class — keep core/paragraph (style won't apply but no swap candidate)
        attrs = lift_attrs_for_block(target, node, bem, classes)
        return emit_wp_block(target, attrs, [f"<p>{text}</p>"])

    if target == "core/heading":
        _trace("walker_branch_taken", branch="atomic_heading",
               node_tag=node.name, node_classes=classes, depth=depth)
        text = node.get_text(strip=True)
        sgs_classes_h = [c for c in (classes or []) if c.startswith("sgs-")]
        if sgs_classes_h:
            # Swap to sgs/heading (dynamic) so the SGS-flat headline* styling
            # attrs render as inline style on the <h2>. core/heading is STATIC —
            # its saved `<h2 class="wp-block-heading">` HTML is frozen and
            # never receives the JSON className, so mockup CSS like
            # `.sgs-brand__headline { color: var(--text) }` can never match.
            # Captured 2026-05-17 (Bean's directive in brand walkdown).
            heading_schema = db.block_attrs("sgs/heading")
            heading_attrs: dict = {
                "headline": text,
                "headlineLevel": int(node.name[1]) if node.name and node.name.startswith("h") else 2,
                "className": " ".join(sgs_classes_h),
                "labelEnabled": False,
                "subEnabled": False,
            }
            if node.get("id"):
                heading_attrs["headlineId"] = node["id"]
                heading_attrs["anchor"] = node["id"]
            # Lift CSS via the existing slot-aware path. _slot_attr_prefix
            # resolves slot="heading" to prefix="headline" on this schema.
            try:
                _lift_styling_attrs(
                    node, "heading", "sgs/heading",
                    heading_schema, heading_attrs, css_rules,
                )
            except Exception:  # noqa: BLE001
                pass
            # Also lift block-root supports (margin-bottom etc.) onto wrapper
            # style.* — sgs/heading has WP native spacing supports that render
            # on the wrapper <div>.
            try:
                _lift_root_supports_to_style(
                    node, "sgs/heading", css_rules, heading_attrs,
                )
            except Exception:  # noqa: BLE001
                pass
            return emit_wp_block("sgs/heading", heading_attrs, [], self_closing=True)
        # No SGS class — fall back to core/heading (static, but no swap candidate)
        attrs = lift_attrs_for_block(target, node, bem, classes)
        style_dict, extra_top = _lift_core_block_style(node, classes, css_rules, target)
        if style_dict:
            attrs["style"] = {**attrs.get("style", {}), **style_dict}
        attrs.update(extra_top)
        level = attrs.get("level", 2)
        anchor_attr = f' id="{attrs["anchor"]}"' if attrs.get("anchor") else ""
        return emit_wp_block(
            target, attrs,
            [f'<h{level}{anchor_attr} class="wp-block-heading">{text}</h{level}>'],
        )

    if target == "core/image":
        _trace("walker_branch_taken", branch="atomic_image",
               node_tag=node.name, node_classes=classes, depth=depth)
        sgs_classes = [c for c in (classes or []) if c.startswith("sgs-")]
        if sgs_classes:
            # Swap to sgs/media — server-rendered <figure><img></figure> with
            # styling applied per attrs (path B 2026-05-19).
            style_dict, extra_top = _lift_core_block_style(
                node, classes, css_rules, "core/image"
            )
            flat = _flatten_wp_style_to_sgs_flat(
                style_dict, extra_top, "sgs/media"
            )
            media_attrs: dict = {
                "imageUrl": node.get("src", ""),
                "imageAlt": node.get("alt", ""),
                "className": " ".join(sgs_classes),
            }
            if str(node.get("width", "")).isdigit():
                media_attrs["imageWidth"] = int(node["width"])
            if str(node.get("height", "")).isdigit():
                media_attrs["imageHeight"] = int(node["height"])
            if node.get("id"):
                media_attrs["anchor"] = node["id"]
            media_attrs.update(flat)
            return emit_wp_block("sgs/media", media_attrs, [], self_closing=True)
        # No SGS class — keep core/image (style won't apply but no swap candidate)
        attrs = lift_attrs_for_block(target, node, bem, classes)
        url = attrs.get("url", "")
        alt = attrs.get("alt", "")
        return emit_wp_block(
            target, attrs,
            [f'<figure class="wp-block-image"><img src="{url}" alt="{alt}"/></figure>'],
        )

    if target == "sgs/button":
        _trace("walker_branch_taken", branch="atomic_button",
               node_tag=node.name, node_classes=classes, depth=depth)
        attrs = lift_attrs_for_block(target, node, bem, classes)
        return emit_wp_block(target, attrs, [], self_closing=True)

    # Atomic-text-content fast path: leaf node (no element children) + has text
    # content. First check whether the BEM element canonical slot maps to a
    # standalone block (label → sgs/label, badge → sgs/label with pill variant).
    # Otherwise fall back to core/paragraph with className.
    has_element_children = any(isinstance(c, Tag) for c in node.children)
    text_content = node.get_text(strip=True)
    if not has_element_children and text_content and target == "sgs/container":
        # Slot-to-standalone-block routing — DB-driven via slot_synonyms.
        canonical = db.canonical_slot_for(bem.element) if bem and bem.element else None
        standalone = db.standalone_block_for(canonical) if canonical else None
        if standalone and db.block_exists(standalone):
            _trace("walker_branch_taken", branch="atomic_text_standalone",
                   node_tag=node.name, node_classes=classes,
                   canonical_slot=canonical, target_block=standalone, depth=depth)
            # Infer variantStyle from canonical slot (badge → pill-wrap by default)
            variant = "pill-wrap" if canonical == "badge" else "plain"
            label_attrs: dict = {
                "text": text_content,
                "tag": node.name if node.name in ("span", "p", "div") else "span",
                "variantStyle": variant,
            }
            sgs_classes = [c for c in classes if c.startswith("sgs-")]
            if sgs_classes:
                label_attrs["className"] = " ".join(sgs_classes)
            return emit_wp_block(standalone, label_attrs, [], self_closing=True)

        # Default fallback — same Path-B swap as atomic_paragraph (2026-05-19)
        _trace("walker_branch_taken", branch="atomic_text_fallback",
               node_tag=node.name, node_classes=classes,
               bem_element=(bem.element if bem else None), depth=depth)
        sgs_classes = [c for c in (classes or []) if c.startswith("sgs-")]
        if sgs_classes:
            style_dict, extra_top = _lift_core_block_style(
                node, classes, css_rules, "core/paragraph"
            )
            flat = _flatten_wp_style_to_sgs_flat(
                style_dict, extra_top, "sgs/text"
            )
            text_attrs2: dict = {
                "text": text_content,
                "tag": node.name if node.name in
                       ("p", "span", "div", "blockquote", "em", "strong") else "p",
                "className": " ".join(sgs_classes),
            }
            if node.get("id"):
                text_attrs2["anchor"] = node["id"]
            text_attrs2.update(flat)
            return emit_wp_block("sgs/text", text_attrs2, [], self_closing=True)
        # No SGS class
        attrs = lift_attrs_for_block("core/paragraph", node, bem, classes)
        return emit_wp_block("core/paragraph", attrs, [f"<p>{text_content}</p>"])

    # Container-or-composite blocks — walk children
    inner_blocks: list[str] = []
    # Children of an unmatched-wrapper-as-container ARE NOT top-level —
    # they pass through. Children of a real composite (sgs/feature-grid etc.)
    # also pass through unless we're at section root.
    for child in node.children:
        if isinstance(child, NavigableString):
            continue
        if isinstance(child, Tag):
            converted = walk(child, css_rules, variation_buf, depth + 1, is_top_level=False)
            if converted:
                # Multiple blocks per child (when child was a pass-through wrapper)
                # come back joined with \n. Append as-is — emit_wp_block handles join.
                inner_blocks.append(converted)

    # Preserve SGS-BEM grouping wrappers (e.g. sgs-brand__content) as nested
    # sgs/container blocks. The BEM __element signals authored structural
    # intent — the mockup explicitly wrapped these children, typically because
    # the receiving pattern's layout (grid column, stacked group, named slot)
    # expects that grouping. Pass-through would lose the contract and produce
    # flat-sibling output where the pattern wanted nested composition.
    # Inserted BEFORE the unnamed-wrapper PASS-THROUGH (2026-05-17, follow-up
    # to P-PHASE8-NEW-1 architectural finding: walker was unwrapping
    # sgs-brand__content into flat siblings of sgs-brand__image).
    if (target == "sgs/container" and not is_top_level
            and bem and bem.element
            and inner_blocks):
        _trace("walker_branch_taken", branch="sgs_bem_wrapper",
               node_tag=node.name, node_classes=classes,
               bem_element=bem.element, depth=depth)
        sgs_classes = [c for c in classes if c.startswith("sgs-")]
        cont_attrs: dict = {}
        if sgs_classes:
            cont_attrs["className"] = " ".join(sgs_classes)
        # P-PHASE9-4: lift block-root CSS onto sgs/container's WP native style.* attrs
        _lift_root_supports_to_style(node, "sgs/container", css_rules, cont_attrs)
        decls = _collect_css_for_classes(classes, css_rules)
        if decls:
            variation_buf.append(decls)
        return emit_wp_block("sgs/container", cont_attrs, inner_blocks)

    # PASS-THROUGH path: when this node would have been a generic sgs/container
    # AND has no BEM element (random unnamed wrapper) AND we're NOT at the top
    # level, drop the wrapper. Return children only. Their styling survives via
    # the variation CSS lift below (className-keyed selectors still target the
    # source class even without a markup wrapper).
    if target == "sgs/container" and not is_top_level:
        _trace("walker_branch_taken", branch="pass_through",
               node_tag=node.name, node_classes=classes,
               child_count=len(inner_blocks), depth=depth)
        # Lift the wrapper's CSS to variation buffer so styling survives.
        decls = _collect_css_for_classes(classes, css_rules)
        if decls:
            variation_buf.append(decls)
        if not inner_blocks:
            return None
        return "\n".join(inner_blocks)

    attrs = lift_attrs_for_block(target, node, bem, classes)

    # Top-level container — keep wrapper, lift CSS.
    if target == "sgs/container":
        _trace("walker_branch_taken", branch="top_level_container",
               node_tag=node.name, node_classes=classes, depth=depth)
        decls = _collect_css_for_classes(classes, css_rules)
        if decls:
            variation_buf.append(decls)
    else:
        _trace("walker_branch_taken", branch="fallback",
               node_tag=node.name, node_classes=classes,
               target_block=target, depth=depth)

    return emit_wp_block(target, attrs, inner_blocks)


def _collect_css_for_classes(classes: list[str], css_rules: dict) -> str:
    selectors = [f".{c}" for c in classes if c.startswith("sgs-")]
    if not selectors:
        return ""
    out_lines: list[str] = []
    for sel, decls in css_rules.items():
        if any(s in sel for s in selectors):
            decl_str = "; ".join(f"{k}: {v}" for k, v in decls.items())
            out_lines.append(f"{sel} {{ {decl_str} }}")
    return "\n".join(out_lines)


# ============================================================================
# Main
# ============================================================================

def main(argv: list[str]) -> int:
    if len(argv) < 3:
        print(
            f"Usage: {argv[0]} <section.html> <section.css> "
            "[media-map.json] [--client-slug=<slug>]",
            file=sys.stderr,
        )
        return 2

    # Separate positional args from flags so order is forgiving.
    positionals: list[str] = []
    client_slug: str | None = None
    for a in argv[1:]:
        if a.startswith("--client-slug="):
            client_slug = a.split("=", 1)[1].strip() or None
        else:
            positionals.append(a)

    if len(positionals) < 2:
        print(
            f"Usage: {argv[0]} <section.html> <section.css> "
            "[media-map.json] [--client-slug=<slug>]",
            file=sys.stderr,
        )
        return 2

    html = Path(positionals[0]).read_text(encoding="utf-8")
    css_text = Path(positionals[1]).read_text(encoding="utf-8")

    # Optional media-map for image URL resolution
    if len(positionals) >= 3:
        load_media_map(Path(positionals[2]))

    soup = BeautifulSoup(html, "html.parser")
    css_rules = parse_css(css_text)

    # ---- Universal width-mode pipeline (Branch B, 2026-05-19).
    # Detect mockup layout widths and lift into the client style variation
    # (idempotent — never overwrites operator-tuned values). Then load the
    # effective theme widths (variation override > theme.json default) into
    # `_LIFT_CONTEXT` so `_lift_root_supports_to_style` can emit semantic
    # widthMode values instead of literal-pixel max-width. Universal — fires
    # for ANY client whose mockup CSS has section max-widths.
    # convert.py → converter_v2 → orchestrator → scripts → sgs-blocks → plugins → repo
    repo_root = Path(__file__).resolve().parents[5]
    detected_widths = _detect_client_layout_widths(css_rules)
    if detected_widths and client_slug:
        _write_client_layout_widths(client_slug, detected_widths, repo_root)
    _LIFT_CONTEXT["theme_widths"] = _load_theme_widths(client_slug, repo_root)

    section = soup.find("section")
    if section is None:
        print("ERROR: no <section> in input", file=sys.stderr)
        return 1

    variation_buf: list[str] = []
    output = walk(section, css_rules, variation_buf)

    print("=" * 60)
    print("WP BLOCK MARKUP (v2 — DB-backed)")
    print("=" * 60)
    print(output or "")
    print()
    print("=" * 60)
    print("CLASSIFICATION TRACE (which DB lookups happened)")
    print("=" * 60)
    _trace_classifications(section)
    print()
    if variation_buf:
        print("=" * 60)
        print("VARIATION CSS (lift into mamas-munches.json styles.css)")
        print("=" * 60)
        print("\n".join(variation_buf))
    return 0


def _trace_classifications(section: Tag) -> None:
    """Walk the tree once more, printing what each class got classified as."""
    seen = set()
    for node in [section, *section.find_all(True)]:
        classes = node.get("class", []) or []
        for c in classes:
            if c in seen or not c.startswith("sgs-"):
                continue
            seen.add(c)
            parsed = db.parse_sgs_bem(c)
            if not parsed:
                continue
            slug = f"sgs/{parsed.block}" if parsed.block else "?"
            exists = "✓" if db.block_exists(slug) else "✗"
            elem_canonical = db.canonical_slot_for(parsed.element) if parsed.element else None
            mod_kind = db.modifier_kind(parsed.modifier) if parsed.modifier else None
            print(
                f"  {c:45} → block={slug}({exists})  "
                f"element={parsed.element or '-'}→{elem_canonical or '-'}  "
                f"modifier={parsed.modifier or '-'}→{mod_kind or '-'}"
            )


if __name__ == "__main__":
    sys.exit(main(sys.argv))