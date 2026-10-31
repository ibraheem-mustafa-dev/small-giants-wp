"""Spec 33 declared-design vocabulary: every role word and threshold as DATA, in one place.

``site_palette`` (README colour rows, overlay), ``variant_sets`` (accent-set inner keys),
``declared_layout`` (radius), ``declared_reconcile`` (computed-wins, measured primary) and
``usage_roles`` (usage-proposed fallback roles) read these tables. Nothing here names a client.
"""
from __future__ import annotations

import json
import os
import re
import sqlite3
from functools import lru_cache
from pathlib import Path

# --------------------------------------------------------------------------- brand colours

BRAND_REGISTRY = Path(__file__).resolve().parents[2] / "includes" / "data" / "brand-registry.json"


@lru_cache(maxsize=1)
def brands_with_colour() -> tuple:
    """The brand registry's entries that carry a colour (FP-1: read from ``includes/data/brand-registry.json``, never listed here).

    A brand's colour is painted by the block that shows the brand, so it takes no palette slot and no custom colour
    (Spec 48 FR-48-31)."""
    data = json.loads(BRAND_REGISTRY.read_text(encoding="utf-8"))
    return tuple(b for b in data.get("brands", []) if re.fullmatch(r"#[0-9a-fA-F]{6}", str(b.get("colour", ""))))


def brand_colours() -> frozenset:
    """Lower-case hex of every registry brand's colour."""
    return frozenset(b["colour"].lower() for b in brands_with_colour())


def brand_words() -> frozenset:
    """The words a colour token's name uses for a registry brand (FR-32-28 excludes such a token from the palette): each
    brand's slug, the name inside its Site Info key, its label's words (at least three letters) and its aliases, plus the
    brand of every ``sgs/<brand>-reviews`` block in the framework DB (opened read-only; absent DB adds none)."""
    names: set = set()
    for b in brands_with_colour():
        key = re.match(r"^socials\.([a-z0-9-]+)$", str(b.get("siteInfoKey", "")), re.I)
        own = [b.get("slug", ""), key.group(1) if key else ""]
        names.update(str(n).lower() for n in own if len(str(n)) >= 3)
        names.update(w for w in re.split(r"[^a-z0-9]+", str(b.get("label", "")).lower()) if len(w) >= 3)
        names.update(str(n).lower() for n in b.get("aliases", []))
    db = Path(os.environ.get("SGS_FRAMEWORK_DB") or Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db")
    if db.is_file():
        conn = sqlite3.connect(f"file:{db.as_posix()}?mode=ro", uri=True)
        try:
            for (slug,) in conn.execute("SELECT slug FROM blocks WHERE slug LIKE 'sgs/%-reviews'"):
                m = re.fullmatch(r"sgs/([a-z0-9]+)-reviews", slug)
                if m:
                    names.add(m.group(1))
        finally:
            conn.close()
    return frozenset(names)


def brand_row_pattern() -> str:
    """A pattern matching a README row that names a registry brand: its slug, its label's words and its aliases, each at
    least three letters, as whole words."""
    names = set()
    for b in brands_with_colour():
        names.update(w for w in re.split(r"[^a-z0-9]+", str(b.get("label", "")).lower()) if len(w) >= 3)
        names.update(str(n).lower() for n in [b.get("slug", ""), *b.get("aliases", [])] if len(str(n)) >= 3)
    return r"\b(?:" + "|".join(sorted(re.escape(n) for n in names)) + r")\b"


# --------------------------------------------------------------------------- README row roles

# README row (name + " " + use) matched case-insensitively. First matching row wins, so order runs
# from the most specific phrase to the most general.
SKIP_TABLE = (
    (r"\bfaint\b|\bplaceholder\b|\bdisabled\b", "placeholder-tier role: no palette slot"),
    (r"\bgoogle\b|\bwidget\b|\bthird[- ]party\b", "third-party widget colour: stays literal"),
    (r"\bordered in\b|\bout of stock\b|\bout-of-stock\b|\bbackorder", "status colour with no base slug"),
    (brand_row_pattern(), "brand colour: the brand's own block paints it, so it has no palette slot"),
)
# (pattern, slugs, property families the role legitimately covers)
ALL_FAMILIES = ("text", "background", "border", "fill")
ROLE_TABLE = (
    (r"\baccent ink\b|\bink accent\b", ("accent-text",), ("text", "fill")),
    (r"\b(?:ink|text) on dark\b", ("text-inverse", "primary-text"), ("text", "fill")),
    (r"\bfooter (?:background|bg|surface)\b", ("footer-bg",), ("background", "fill")),
    (r"\bpage background\b|\bbody background\b", ("surface",), ("background", "fill")),
    (r"\bwhite surface\b|^surface\b|\bcards?\b|\bpanels?\b", ("surface-alt",), ("background", "fill")),
    (r"\bbody text\b|\bparagraphs?\b", ("text-muted",), ("text", "fill")),
    (r"\bmuted text\b|\bspec labels?\b|\blabels?\b", ("text-label",), ("text", "fill")),
    (r"\bhairline\b|\bborders?\b|\bdividers?\b", ("border",), ("border", "background")),
    (r"\bsoft fill\b|\btint(?:ed|s)?\b|\bwash\b", ("accent-light",), ("background", "border", "fill")),
    (r"^accent\b", ("accent",), ALL_FAMILIES),
    (r"\bin stock\b|\bsuccess\b", ("success",), ALL_FAMILIES),
    (r"\berror\b|\bdanger\b", ("error",), ALL_FAMILIES),
    (r"\binfo\b", ("info",), ALL_FAMILIES),
    (r"\bink\b|\bprimary text\b", ("text", "primary"), ALL_FAMILIES),
)
# A row whose "Use" text also names a place that has its own slot fills that slot too ("Page background:
# body, header, footer" also fills footer-bg). The role's own families still apply.
EXTRA_SLUG_TABLE = (
    (r"\b(?:background|surface)\b.*\bfooter\b|\bfooter\b.*\b(?:background|surface)\b", "footer-bg"),
)
# A colour whose census usage falls outside the role's families by more than this share drifts.
MAX_OFF_ROLE_SHARE = 0.25
# A README row needs at least this many census uses in its OWN role families.
MIN_ROW_USES = 1

# --------------------------------------------------------------------------- accent variant sets

# Inner key of a variant option -> palette slug. A key matching no row is LOGGED as unmapped, never
# silently dropped. First key to claim a slug wins.
VARIANT_KEY_TABLE = (
    (r"^(?:acc|accent|main|brand|primary|base|fill)$", "accent"),
    (r"^(?:ink|dark|deep|strong|text|on)$", "accent-text"),
    (r"^(?:soft|tint|light|wash|pale|bg)$", "accent-light"),
)
ACCENT_SLUGS = ("accent", "accent-light", "accent-text")

# --------------------------------------------------------------------------- role defaults

# A framework slug the draft gives no colour follows the client's own colour for a related slug (Spec 32
# FR-32-14's defaults), never the framework file's hex. (slug, the slug whose client colour it takes),
# in resolution order: a slug that another follows comes first.
ROLE_DEFAULT_TABLE = (
    ("heading", "text"),
    ("section-text", "text"),
    ("accent-text", "text"),
    ("primary-text", "text-inverse"),
    ("link", "primary"),
    ("link-hover", "primary-dark"),
    ("section", "surface-alt"),
)
# The ground each followed text slug is read on (Spec 32 section 12.2), traced with the WCAG ratio.
ROLE_DEFAULT_GROUND = {"heading": "surface", "section-text": "section", "accent-text": "accent-light",
                       "primary-text": "primary", "link": "surface", "link-hover": "surface"}
MIN_TEXT_CONTRAST = 4.5
# The status roles: a draft with no shade for one keeps the framework value as raw hex in ``settings.custom.colourRoles``.
STATUS_ROLE_RE = re.compile(r"^(?:success|error|info)(?:-light)?$")
# Short words a token name abbreviates, expanded in a shade's display name (the slug stays the exact token name).
DISPLAY_WORDS = {"acc": "accent", "bg": "background", "fg": "foreground", "wa": "whatsapp"}

# --------------------------------------------------------------------------- shape

SQUARE_RADIUS_RE = re.compile(r"^0+(?:px|rem|em)?(?![\d.])")
SQUARE_RADIUS_KEYS = ("small", "medium", "large")
# An explicit pixel radius in a README statement ("14px on cards", "border-radius: 12px").
PX_RADIUS_RE = re.compile(r"(?<![\w.])(\d+(?:\.\d+)?)\s*px\b", re.IGNORECASE)
PRIMARY_DARK_MIX = 0.25

# --------------------------------------------------------------------------- computed wins (FR-33-1)

# CIEDE2000 distance above which a README colour and the rendered one are different colours.
COMPUTED_WINS_DELTA_E = 1.0

# --------------------------------------------------------------------------- usage-proposed roles

# Relative luminance bands (0 black .. 1 white) that tell text and ground tones apart.
DARK_TEXT_MAX_LUMINANCE = 0.4
LIGHT_MIN_LUMINANCE = 0.6
MID_TONE_BAND = (0.08, 0.6)
# A proposal needs this share of a colour's uses inside its dominant family.
PROPOSAL_MIN_FAMILY_SHARE = 0.9
PROPOSAL_CONFIDENCE = 0.5
# Slugs that carry a hue with its own meaning: their colours are never proposed for a neutral role.
NON_NEUTRAL_SLUGS = frozenset({"accent", "accent-light", "accent-text", "success", "success-light", "error",
                               "error-light", "info", "info-light"})
# Reasons in SKIP_TABLE-style skips that keep a README colour out of every slot, proposals included.
PROPOSAL_EXCLUDING_SKIPS = tuple(reason for _pattern, reason in SKIP_TABLE)


def trace_row(trace: list, kind: str, what: str, reason: str, value: str | None = None, **extra) -> None:
    """Append one decision to the extractor trace (``value`` and extra keys only when given)."""
    trace.append({"kind": kind, "what": what, **({"value": value} if value else {}), **extra,
                  "reason": reason})
