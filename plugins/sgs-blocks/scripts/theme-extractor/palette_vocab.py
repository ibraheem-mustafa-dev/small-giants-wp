"""Spec 33 declared-design vocabulary: every role word and threshold as DATA, in one place.

``site_palette`` (README colour rows, overlay), ``variant_sets`` (accent-set inner keys),
``declared_layout`` (radius), ``declared_reconcile`` (computed-wins, measured primary) and
``usage_roles`` (usage-proposed fallback roles) read these tables. Nothing here names a client.
"""
from __future__ import annotations

import re

# --------------------------------------------------------------------------- README row roles

# README row (name + " " + use) matched case-insensitively. First matching row wins, so order runs
# from the most specific phrase to the most general.
SKIP_TABLE = (
    (r"\bfaint\b|\bplaceholder\b|\bdisabled\b", "placeholder-tier role: no palette slot"),
    (r"\bgoogle\b|\bwidget\b|\bthird[- ]party\b", "third-party widget colour: stays literal"),
    (r"\bordered in\b|\bout of stock\b|\bout-of-stock\b|\bbackorder", "status colour with no base slug"),
)
# (pattern, slugs, property families the role legitimately covers)
ALL_FAMILIES = ("text", "background", "border", "fill")
ROLE_TABLE = (
    (r"\bwhats\s?app\b", ("whatsapp",), ALL_FAMILIES),
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
                               "error-light", "info", "info-light", "whatsapp"})
# Reasons in SKIP_TABLE-style skips that keep a README colour out of every slot, proposals included.
PROPOSAL_EXCLUDING_SKIPS = tuple(reason for _pattern, reason in SKIP_TABLE)


def trace_row(trace: list, kind: str, what: str, reason: str, value: str | None = None, **extra) -> None:
    """Append one decision to the extractor trace (``value`` and extra keys only when given)."""
    trace.append({"kind": kind, "what": what, **({"value": value} if value else {}), **extra,
                  "reason": reason})
