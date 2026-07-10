"""styling_helpers.py — ported helper functions for the styling-attr lift.

Faithful port of the following from orchestrator/converter_v2/convert.py,
behaviour-IDENTICAL (Spec 31 §1/§3.B1, D246):

  - ``_VAR_TOKEN_RE``               (convert.py:56)   → ``_VAR_TOKEN_RE``
  - ``_IMPORTANT_RE``               (convert.py:55)   → ``_IMPORTANT_RE``
  - ``_DECL_RE``                    (convert.py:54)   → ``_DECL_RE``
  - ``_strip_important``            (convert.py:377)  → ``strip_important``
  - ``_extract_token_or_hex``       (convert.py:443)  → ``extract_token_or_hex``
  - ``_split_value_unit``           (convert.py:568)  → ``split_value_unit``
  - ``_collect_css_decls_for_element`` (convert.py:585) → ``collect_css_decls_for_element``
  - ``_css_value_to_attr``          (convert.py:1359) → ``css_value_to_attr``
  - ``_css_selector_has_class``     (convert.py:5243) → ``css_selector_has_class``

Internal helper re-ported here (not exposed publicly):
  - ``_parse_decls``                (convert.py:367)  → ``_parse_decls``
  - ``_colour_value_to_style``      (convert.py:460)  → ``_colour_value_to_style``
  - ``_CSS_NAMED_COLOURS``          (convert.py:454)  → ``_CSS_NAMED_COLOURS``

No block-slug literals. No import from convert.py.
Only ``from converter.db import db_lookup`` is used (moved off the frozen
tree in EXECUTION Step 9, Phase 3, 2026-07-04).
"""
from __future__ import annotations

import logging
import re
from typing import Any

from bs4 import Tag

from converter.db import db_lookup
from converter.models import ResidualBand

_LOG = logging.getLogger("sgs.converter.styling")


# ---------------------------------------------------------------------------
# Media-query cascade helper (Spec 31 §3 F-fork / FR-31-5.2)
# ---------------------------------------------------------------------------

_MEDIA_MIN_RE = re.compile(r"min-width\s*:\s*(\d+)")
_MEDIA_MAX_RE = re.compile(r"max-width\s*:\s*(\d+)")


def _media_condition_applies_at(media_cond: str, width: int) -> bool:
    """True if a ``width``px viewport satisfies the @media condition.

    Handles the common single-constraint and ``... and ...`` cases (ALL min/max
    constraints in a part must hold) plus a comma OR-list (any part applies).
    A part with no width constraint (e.g. a bare ``@media screen``) is treated as
    always-applies so its declarations are not spuriously dropped.

    Spec 31 §3 F-fork / FR-31-5.2 — the cascade evaluates each device-tier sample
    width against every matched @media rule to derive the effective per-tier value.
    """
    for part in media_cond.split(","):
        if all(width >= int(m.group(1)) for m in _MEDIA_MIN_RE.finditer(part)) and all(
            width <= int(m.group(1)) for m in _MEDIA_MAX_RE.finditer(part)
        ):
            return True
    return False


# ---------------------------------------------------------------------------
# Regex constants (convert.py:54-56 — verbatim copies)
# ---------------------------------------------------------------------------

_DECL_RE = re.compile(r"\s*([\w-]+)\s*:\s*([^;]+);?\s*", re.DOTALL)
_IMPORTANT_RE = re.compile(r"\s*!important\s*$", re.IGNORECASE)
_VAR_TOKEN_RE = re.compile(r"var\(--(?:wp--preset--color--)?([a-z0-9-]+)\)")


# ---------------------------------------------------------------------------
# Draft `var(--X)` colour resolution → theme-token snap (P-DRAFT-CSSVAR)
# ---------------------------------------------------------------------------
#
# A draft mockup declares its colours as `var(--X)` referencing custom
# properties in its own `:root { }` block (e.g. `--border:#E8D5C0`). Those are
# DRAFT-scoped names, NOT WordPress theme tokens. Emitting `var:preset|color|X`
# for a bare draft name renders `var(--wp--preset--color--X)` on the page, which
# does not resolve when the theme has no token of that exact slug — it falls to
# `currentColor` (the proven ghost-button dark-border bug: draft `--border`
# maps to the theme token slug `border-subtle`, not bare `border`).
#
# Resolution (all runtime DATA — R-31-1, no hardcoded colour dicts):
#   1. Build the draft `:root` colour map {slug: hex} once per run from the
#      draft CSS.
#   2. Build the theme palette map {hex: theme-slug} once per run from the
#      client's `theme-snapshot.json` colours.
#   3. For each colour value: a `var(--wp--preset--color--Y)` is left UNCHANGED
#      (already a theme token). A bare `var(--X)` whose X is a draft `:root`
#      colour prop is resolved to the concrete hex, then EXACT-HEX snapped to
#      the theme palette → `var(--wp--preset--color--{theme-slug})`; if no exact
#      palette match, the concrete hex literal is emitted (still resolves on the
#      page). Any other `var(--X)` is left unchanged (current behaviour).
#
# The feature is GATED on a non-empty theme palette (its required input): with
# no palette configured there is nothing to snap against, so resolution is inert
# and every colour value passes through byte-identically to prior behaviour.

# Module-level per-run resolution maps. Populated by
# ``configure_colour_resolution`` / ``configure_colour_resolution_from_run``
# (once per run — never per declaration). Empty = feature inactive.
_DRAFT_ROOT_COLOUR_MAP: dict[str, str] = {}   # draft :root slug (lower) → hex (lower)
_THEME_PALETTE_MAP: dict[str, str] = {}       # hex (lower) → theme palette slug

# Cache key so ``configure_colour_resolution_from_run`` (called once per
# section) rebuilds the maps only when the (client, css) inputs change.
_RESOLUTION_CACHE_KEY: tuple | None = None

# Per-run client button-preset map (snapshot ``settings.custom.buttonPresets``):
# ``{variant: {css-key: value}}``. Populated once per run alongside the colour
# maps (same snapshot file, same memoisation). Empty = no client snapshot preset
# → the converter falls back to the framework block.json variation seed.
_BUTTON_PRESETS_MAP: dict[str, dict] = {}

_ROOT_BLOCK_RE = re.compile(r":root\s*\{([^}]*)\}", re.DOTALL)
_CUSTOM_PROP_RE = re.compile(r"--([a-zA-Z0-9-]+)\s*:\s*([^;]+);", re.DOTALL)
_HEX_RE = re.compile(r"^#[0-9a-fA-F]{3,8}$")


def build_draft_root_colour_map(css: str) -> dict[str, str]:
    """Parse `--name:#hex` pairs from every `:root { }` block in ``css``.

    Returns ``{name(lower): hex(lower)}`` for custom properties whose value is a
    literal hex colour. Non-hex values (e.g. ``var(--other)``, keywords) are
    skipped — the snap needs a concrete hex.
    """
    out: dict[str, str] = {}
    if not css:
        return out
    for block in _ROOT_BLOCK_RE.findall(css):
        for m in _CUSTOM_PROP_RE.finditer(block):
            name = m.group(1).strip().lower()
            val = m.group(2).strip()
            if _HEX_RE.match(val):
                out[name] = val.lower()
    return out


def build_theme_palette_map(palette: list) -> dict[str, str]:
    """Build ``{hex(lower): slug}`` from a theme-snapshot colour palette list.

    Each entry is ``{"slug": ..., "color": ...}``. Only entries with a literal
    hex ``color`` are indexed (slug-alias entries whose ``color`` is another slug
    are skipped). First slug wins on a duplicate hex (palette order).
    """
    out: dict[str, str] = {}
    for entry in palette or []:
        if not isinstance(entry, dict):
            continue
        slug = entry.get("slug")
        colour = entry.get("color") or entry.get("colour")
        if slug and isinstance(colour, str) and _HEX_RE.match(colour.strip()):
            out.setdefault(colour.strip().lower(), slug)
    return out


def configure_colour_resolution(
    draft_root_map: dict[str, str] | None,
    theme_palette_map: dict[str, str] | None,
) -> None:
    """Set the per-run draft-var resolution maps (built from runtime data)."""
    global _DRAFT_ROOT_COLOUR_MAP, _THEME_PALETTE_MAP
    _DRAFT_ROOT_COLOUR_MAP = dict(draft_root_map or {})
    _THEME_PALETTE_MAP = dict(theme_palette_map or {})


def reset_colour_resolution() -> None:
    """Clear the resolution maps (feature inactive → pass-through)."""
    global _DRAFT_ROOT_COLOUR_MAP, _THEME_PALETTE_MAP, _RESOLUTION_CACHE_KEY, _BUTTON_PRESETS_MAP
    _DRAFT_ROOT_COLOUR_MAP = {}
    _THEME_PALETTE_MAP = {}
    _RESOLUTION_CACHE_KEY = None
    _BUTTON_PRESETS_MAP = {}


def _load_theme_palette_map(client_slug: str, repo_root: Any) -> dict[str, str]:
    """Load ``{hex: slug}`` from ``<repo_root>/sites/<client>/theme-snapshot.json``.

    Best-effort: a missing/unreadable/malformed snapshot returns ``{}`` (feature
    stays inert rather than breaking the run).
    """
    if not client_slug or repo_root is None:
        return {}
    import json
    import pathlib
    path = pathlib.Path(repo_root) / "sites" / client_slug / "theme-snapshot.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    palette = (
        ((data.get("settings") or {}).get("color") or {}).get("palette")
    ) or []
    return build_theme_palette_map(palette)


def configure_colour_resolution_from_run(
    css: str,
    client_slug: str = "",
    repo_root: Any = None,
) -> None:
    """Build + install the resolution maps for a converter run (memoised).

    Called once per section by ``converter.entry.convert_section``; the maps are
    rebuilt only when the (client, css) inputs change, so a multi-section run
    parses the draft `:root` + theme snapshot ONCE, not per declaration.
    """
    global _RESOLUTION_CACHE_KEY
    key = (client_slug or "", hash(css or ""))
    if key == _RESOLUTION_CACHE_KEY:
        return
    draft_map = build_draft_root_colour_map(css or "")
    palette_map = _load_theme_palette_map(client_slug, repo_root)
    configure_colour_resolution(draft_map, palette_map)
    configure_button_presets(_load_button_presets(client_slug, repo_root))
    _RESOLUTION_CACHE_KEY = key


# ---------------------------------------------------------------------------
# Client button-preset colour routing (snapshot settings.custom.buttonPresets)
# ---------------------------------------------------------------------------
#
# A draft's ``.sgs-button--{variant}`` encodes a style preset. The client's
# ``theme-snapshot.json`` ``settings.custom.buttonPresets`` defines that preset's
# colours + hover (the per-client design-system source of truth — see the
# snapshot audit 2026-07-07). The converter routes those COLOUR values into the
# button's own colour attrs so a clone paints the client's real button look AND
# its hover lands (the base CSS pass deliberately skips ``:hover``). The preset's
# GEOMETRY (radius/padding/font-size/min-height) is intentionally NOT routed
# here — the draft's own per-instance CSS supplies it faithfully. All runtime
# DATA (R-31-1): loaded per run from the client snapshot, never a hardcoded dict.

# Structural map: snapshot buttonPreset colour keys → SGS button colour attrs.
# A fixed schema binding between the snapshot's design-token keys and the block's
# attr names (an inherent structural constant like SKIP_TOP_LEVEL_TAGS, not a
# drift-prone recognition vocabulary).
_BTN_PRESET_COLOUR_ATTR: dict[str, str] = {
    "background": "colourBackground",
    "text": "colourText",
    "border": "colourBorder",
    "hover-background": "colourBackgroundHover",
    "hover-text": "colourTextHover",
    "hover-border": "colourBorderHover",
}


def configure_button_presets(presets: dict | None) -> None:
    """Install the per-run client button-preset map (snapshot buttonPresets)."""
    global _BUTTON_PRESETS_MAP
    _BUTTON_PRESETS_MAP = dict(presets or {})


def _load_button_presets(client_slug: str, repo_root: Any) -> dict:
    """Load ``settings.custom.buttonPresets`` from the client theme-snapshot.

    Best-effort: a missing/unreadable/malformed snapshot returns ``{}`` (the
    converter then falls back to the framework block.json variation seed).
    """
    if not client_slug or repo_root is None:
        return {}
    import json
    import pathlib
    path = pathlib.Path(repo_root) / "sites" / client_slug / "theme-snapshot.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    presets = (
        ((data.get("settings") or {}).get("custom") or {}).get("buttonPresets")
    ) or {}
    return presets if isinstance(presets, dict) else {}


def button_preset_colour_attrs(variant: str) -> dict[str, str]:
    """Map the client snapshot ``buttonPresets[variant]`` COLOUR + hover values to
    SGS button colour attrs (token-slug form).

    Only the six colour roles (base + hover) are mapped — geometry keys in the
    preset are ignored (the draft CSS supplies geometry). A ``transparent`` /
    empty / ``none`` value maps to ``''`` (render emits no colour → transparent).
    A ``var(--wp--preset--color--X)`` / bare ``var(--X)`` value yields the slug
    ``X``; a raw hex passes through verbatim (render's ``sgs_colour_value``
    honours a literal hex). Returns ``{}`` when the client has no preset for the
    variant (caller falls back to the framework seed).
    """
    preset = _BUTTON_PRESETS_MAP.get(variant)
    if not isinstance(preset, dict):
        return {}
    out: dict[str, str] = {}
    for css_key, attr in _BTN_PRESET_COLOUR_ATTR.items():
        if css_key not in preset:
            continue
        raw = str(preset[css_key]).strip()
        if raw in ("", "transparent", "none"):
            out[attr] = ""
            continue
        m = _VAR_TOKEN_RE.search(raw)
        out[attr] = m.group(1) if m else raw
    return out


def _resolve_draft_colour_var(raw: str) -> str:
    """Rewrite draft `var(--X)` colours to a theme token (or concrete hex).

    Inert (returns ``raw`` unchanged) unless a theme palette is configured — the
    feature's required snap input. See the module block comment above.
    """
    if not raw or not _THEME_PALETTE_MAP or "var(--" not in raw:
        return raw

    def _repl(m: "re.Match[str]") -> str:
        full = m.group(0)
        slug = m.group(1)
        if "wp--preset--color--" in full:
            return full  # already a WP theme token — leave slug intact
        hexval = _DRAFT_ROOT_COLOUR_MAP.get(slug.lower())
        if hexval is None:
            return full  # not a known draft :root colour prop — unchanged
        theme_slug = _THEME_PALETTE_MAP.get(hexval.lower())
        if theme_slug:
            return f"var(--wp--preset--color--{theme_slug})"
        return hexval  # no palette match → concrete hex literal (resolves on page)

    return _VAR_TOKEN_RE.sub(_repl, raw)


# ---------------------------------------------------------------------------
# _parse_decls (convert.py:367 — ported verbatim, private)
# ---------------------------------------------------------------------------

def _parse_decls(decl_text: str) -> dict[str, str]:
    """Parse a CSS declaration block text into a {property: value} dict."""
    out: dict[str, str] = {}
    for m in _DECL_RE.finditer(decl_text):
        prop = m.group(1).strip()
        val = m.group(2).strip()
        if prop and val:
            out[prop] = val
    return out


# ---------------------------------------------------------------------------
# strip_important (convert.py:377 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def strip_important(value: str) -> str:
    """Strip ``!important`` from a CSS value string."""
    return _IMPORTANT_RE.sub("", value).strip()


# ---------------------------------------------------------------------------
# extract_token_or_hex (convert.py:443 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def extract_token_or_hex(value: str) -> str | None:
    """Extract a colour token slug or hex from a CSS value string.

    Returns the token slug (e.g. ``'primary'`` from ``var(--wp--preset--color--primary)``),
    the raw hex (e.g. ``'#ff0000'``), or ``None`` when neither pattern matches.

    A draft-scoped ``var(--X)`` (X ∈ the draft `:root` colour map) is first
    resolved to its concrete hex + snapped to the theme palette slug — see
    ``_resolve_draft_colour_var`` (inert unless a theme palette is configured).
    """
    v = _resolve_draft_colour_var(value.strip())
    m = _VAR_TOKEN_RE.search(v)
    if m:
        return m.group(1)
    if v.startswith("#"):
        return v.split()[0]
    return None


# ---------------------------------------------------------------------------
# _CSS_NAMED_COLOURS + _colour_value_to_style (convert.py:454/460 — private)
# ---------------------------------------------------------------------------

_CSS_NAMED_COLOURS: dict[str, str] = {
    "white": "#ffffff",
    "black": "#000000",
}


def _colour_value_to_style(raw: str) -> str | None:
    """Convert a CSS colour expression to WP style.* colour form (private helper)."""
    if not raw:
        return None
    v = raw.strip()
    if v in _CSS_NAMED_COLOURS:
        return _CSS_NAMED_COLOURS[v]
    token_or_hex = extract_token_or_hex(raw)
    if token_or_hex is None:
        return None
    if token_or_hex.startswith("#"):
        return token_or_hex
    return f"var:preset|color|{token_or_hex}"


# ---------------------------------------------------------------------------
# split_value_unit (convert.py:568 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def split_value_unit(raw: Any, default_unit: str = "px") -> tuple:
    """Split ``'22px'`` → ``(22.0, 'px')``. Returns ``(None, None)`` on parse failure."""
    if not raw:
        return None, None
    s = str(raw).strip().rstrip(";")
    m = re.match(r"^([+-]?[\d.]+)\s*([a-zA-Z%]*)$", s)
    if not m:
        return None, None
    try:
        num = float(m.group(1))
        unit = m.group(2) or default_unit
        return num, unit
    except ValueError:
        return None, None


# ---------------------------------------------------------------------------
# collect_css_decls_for_element (convert.py:585 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def collect_css_decls_for_element(
    node: Tag,
    css_rules: dict,
    residual_sink: list[ResidualBand] | None = None,
) -> tuple[dict[str, str], dict[str, dict[str, str]]]:
    """Collect CSS declarations targeting this element, resolved to device tiers.

    Returns ``(base_decls, bp_decls)`` where:

    - ``base_decls`` — the EFFECTIVE ``{prop: val}`` at DESKTOP (the SGS base /
      unsuffixed tier). This is the value after cascading the element's non-media
      rules + every @media rule that applies at the desktop sample width — NOT the
      raw non-media rules (a mobile-first draft's base CSS is the mobile value, so
      returning it raw would land the mobile layout on the desktop base attr).
    - ``bp_decls``   — ``{tier: {prop: val}}`` for the ``Tablet`` / ``Mobile`` tiers,
      containing ONLY the properties whose effective value at that tier DIFFERS from
      ``base_decls`` (a tier that matches base inherits it — no redundant attr).

    Sources for the non-media cascade (in priority order):

    1. Inline style attribute on the element (highest specificity)
    2. Direct class selectors (``.sgs-hero__sub``)
    3. Parent-qualified selectors (``.sgs-hero__copy h1``)
    4. Grouped selectors (``h1, h2, h3``)

    Responsive resolution (Spec 31 §3 F-fork / FR-31-5.2): the CSS cascade is
    sampled at one representative interior width per device tier
    (``db_lookup.device_tier_samples`` — Desktop 1440 / Tablet 800 / Mobile 375).
    ``min-width:X`` = "X and up" therefore naturally populates every tier whose
    sample ≥ X; ``max-width:X`` = "X and down" every tier whose sample ≤ X — one
    symmetric calculation, both directions. A non-device threshold (∉ 767/768/
    1023/1024) that falls inside a tier's range is preserved as an F-ii residual
    (logged, never snapped, never silently dropped — D228).

    Ported from convert.py:585 (selector-matching behaviour-identical); the
    breakpoint routing is REPLACED by the FR-31-5.2 device-tier cascade.
    """
    desc_classes: list[str] = node.get("class", []) or []
    desc_tag: str = node.name or ""

    base_decls: dict[str, str] = {}
    bp_decls: dict[str, dict[str, str]] = {}

    # CSS specificity (ids, classes/attrs/pseudo-class, tags/pseudo-element) of one
    # comma-split selector — used to apply the cascade CORRECTLY so a more specific
    # rule (.sgs-testimonial__text) beats a generic one (blockquote p) regardless of
    # source order. The old first-wins merge ignored specificity AND source order,
    # silently letting an earlier generic rule corrupt an element's real values.
    def _sel_specificity(sel: str) -> tuple[int, int, int]:
        ids = len(re.findall(r"#[\w-]+", sel))
        cls = len(re.findall(r"\.[\w-]+|\[[^\]]+\]|:[\w-]+", sel))
        tags = len(re.findall(r"(?:^|[\s>+~])([a-zA-Z][\w-]*)", sel))
        return (ids, cls, tags)

    matched_base: list[tuple[tuple[int, int, int], int, dict[str, str]]] = []
    matched_media: list[tuple[str, dict[str, str]]] = []
    _src_order = 0

    for sel, decls in css_rules.items():
        _src_order += 1
        # The @media sentinel is the SPACED ' :: ' (convert.py:431 — the port must
        # stay behaviour-identical). Splitting on bare '::' mis-parsed any
        # pseudo-element selector ('.x::before' → media='.x', sel='before'), which
        # both dropped the pseudo rule as junk-media AND, for a comma rule
        # ('.x::before, .y'), routed the plain '.y' half through the always-true
        # junk-media path — bypassing the base cascade's specificity ordering.
        if " :: " in sel:
            media_part, sel_part = sel.split(" :: ", 1)
            media_part = media_part.strip()
            sel_part = sel_part.strip()
        else:
            media_part = ""
            sel_part = sel.strip()

        matched_sel: str | None = None
        for individual_sel in sel_part.split(","):
            individual_sel = individual_sel.strip()
            if not individual_sel:
                continue
            # Strip leading .page-id-N scope prefix
            individual_sel = re.sub(r"^\.page-id-\d+\s+", "", individual_sel)
            if not individual_sel:
                continue
            parts = individual_sel.split()
            if not parts:
                continue
            last_part = parts[-1]
            # Match the final compound simple-selector's CLASS tokens. A pure compound
            # class selector (`.a.b`) matches ONLY if the element carries EVERY class —
            # `last_part[1:]` would be `a.b` (a dot inside), never a single class name, so
            # the old single-membership test silently dropped it. This left the draft's
            # selected-state rule `.sgs-x__pill.sgs-x__pill--active` unmatched, so every
            # pill-selected colour resolved to the RESTING `.__pill` value (2026-07-10 bug).
            # A state/pseudo selector (`.a:hover`) keeps a ':' → excluded (unchanged; a
            # static draft element has no live pseudo-state). Higher class-count raises the
            # `_sel_specificity` cls score, so the compound rule correctly beats the
            # single-class base rule in the cascade below.
            _last_compound = (
                [c for c in last_part.split(".") if c]
                if last_part.startswith(".") and ":" not in last_part
                else []
            )
            if _last_compound and all(c in desc_classes for c in _last_compound):
                # CLASS match: verify every ancestor token in parts[:-1] resolves
                # to a real ancestor of node (fixes GF-B.2 cross-section CSS bleed).
                # A compound single-element selector (no whitespace tokens before the
                # final class) means parts[:-1] is empty → no ancestor required → MATCH.
                ancestor_tokens = parts[:-1]
                class_match = True
                if ancestor_tokens:
                    idx = len(ancestor_tokens) - 1
                    while idx >= 0:
                        token = ancestor_tokens[idx]
                        if token in (">", "+", "~"):
                            idx -= 1
                            continue
                        if token.startswith("."):
                            req_cls = token[1:]
                            ancestor = node.parent
                            found = False
                            while ancestor and ancestor.name:
                                if req_cls in (ancestor.get("class", []) or []):
                                    found = True
                                    break
                                ancestor = ancestor.parent
                            if not found:
                                class_match = False
                                break
                        elif token and not token.startswith(("#", "[", ":")):
                            # Tag ancestor token
                            ancestor = node.parent
                            found = False
                            while ancestor and ancestor.name:
                                if ancestor.name == token:
                                    found = True
                                    break
                                ancestor = ancestor.parent
                            if not found:
                                class_match = False
                                break
                        idx -= 1
                if class_match:
                    matched_sel = individual_sel
                    break
            elif last_part == desc_tag:
                parent_match = True
                if len(parts) > 1:
                    parent_token = parts[-2]
                    if parent_token in (">", "+", "~"):
                        parent_token = parts[-3] if len(parts) > 2 else ""
                    if parent_token.startswith("."):
                        parent_cls = parent_token[1:]
                        ancestor = node.parent
                        ancestor_match = False
                        while ancestor and ancestor.name:
                            if parent_cls in (ancestor.get("class", []) or []):
                                ancestor_match = True
                                break
                            ancestor = ancestor.parent
                        parent_match = ancestor_match
                    elif parent_token and not parent_token.startswith(("#", "[", ":")):
                        # TAG ancestor (e.g. 'blockquote p') — REQUIRE a real ancestor
                        # with this tag. Previously skipped, so 'blockquote p' matched
                        # EVERY <p>, pulling wrong values onto unrelated elements.
                        ancestor = node.parent
                        ancestor_match = False
                        while ancestor and ancestor.name:
                            if ancestor.name == parent_token:
                                ancestor_match = True
                                break
                            ancestor = ancestor.parent
                        parent_match = ancestor_match
                if parent_match:
                    matched_sel = individual_sel
                    break

        if matched_sel is None:
            continue
        if media_part:
            matched_media.append((media_part, decls))
        else:
            matched_base.append((_sel_specificity(matched_sel), _src_order, decls))

    # Apply base rules in CASCADE order: ascending specificity then source order;
    # later/more-specific OVERRIDES earlier (last-wins). Inline style wins over all.
    matched_base.sort(key=lambda x: (x[0], x[1]))
    for _spec_key, _ord, d in matched_base:
        base_decls.update(d)
    inline = node.get("style", "") or ""
    if inline:
        base_decls.update(_parse_decls(inline))

    def _specificity_key(media_cond: str) -> tuple[int, int]:
        mn = re.search(r"min-width\s*:\s*(\d+)", media_cond)
        mx = re.search(r"max-width\s*:\s*(\d+)", media_cond)
        if mn:
            return (0, int(mn.group(1)))
        if mx:
            return (1, -int(mx.group(1)))
        return (2, 0)

    # ---- Whole-tier folding (Spec 31 §3 F-fork / FR-31-5.2) -------------------
    # SGS blocks are DESKTOP-BASE (the unsuffixed attr IS the desktop value), but
    # mockups are usually mobile-first (base CSS = mobile + `min-width` overrides).
    # Compute each device tier's EFFECTIVE value by folding base + every @media rule
    # that applies across the tier's ENTIRE [lo, hi] range (tested at BOTH ends —
    # db_lookup.device_tier_ranges), then map Desktop→base_decls, Tablet/Mobile→bp.
    #
    # WHOLE-TIER (not single-interior-width) is what keeps a non-device threshold
    # that SPLITS a tier from being silently absorbed into that tier's value. The
    # old single-sample cascade sampled Desktop at 1440, so a `min-width:1280` rule
    # (active at 1440) was folded into the Desktop BASE — burying the true 1024-1279
    # value. Folding only rules that hold across the whole [1024, ∞) range excludes
    # min-width:1280 from base (it fails at 1024) → base is the correct 1024-1279
    # value, and 1280 is peeled as an F-ii residual below. Direction-agnostic: a
    # `max-width:1200` band inside Desktop (holds at 1024, fails at ∞) is peeled the
    # same way. A rule that DOES span a whole tier (min-width:768 over Tablet; the
    # min-width:600 over Tablet+Desktop) still folds in — inverting a mobile-first
    # draft exactly as before.
    #
    # Fold order among applicable media rules: min-width ascending / max-width
    # widest-first (_specificity_key) so a narrower breakpoint last-wins in the fold.
    matched_media.sort(key=lambda mc: _specificity_key(mc[0]))

    tier_effective: dict[str, dict[str, str]] = {}
    for tier, lo, hi in db_lookup.device_tier_ranges():
        eff = dict(base_decls)
        for media_cond, media_decls in matched_media:
            if _media_condition_applies_at(
                media_cond, lo
            ) and _media_condition_applies_at(media_cond, hi):
                eff.update(media_decls)
        tier_effective[tier] = eff

    # Desktop is the SGS BASE (unsuffixed) tier — collapse it onto base_decls.
    out_base: dict[str, str] = dict(tier_effective.get("Desktop", dict(base_decls)))
    out_bp: dict[str, dict[str, str]] = {}
    for tier, _lo, _hi in db_lookup.device_tier_ranges():
        if tier == "Desktop":
            continue
        for prop, val in tier_effective.get(tier, {}).items():
            # Emit a tier override only where it DIFFERS from the base — a tier that
            # matches base inherits it (no redundant …Tablet/…Mobile attr).
            if out_base.get(prop) != val:
                out_bp.setdefault(tier, {})[prop] = val

    # ---- F-ii residual: non-device thresholds (D228; never snap, never drop) ---
    # A media threshold outside the canonical device set (767/768/1023/1024) falls
    # strictly inside a tier's range → a sub-tier band the 3-tier attr model cannot
    # represent (e.g. min-width:1280's band above Desktop; min-width:600's 4-col
    # band for 600–767 of Mobile). Whole-tier folding above captures the rule
    # everywhere it spans a whole tier; the residual band is CAPTURED here (never
    # silently dropped) and — when a ``residual_sink`` is supplied by the caller —
    # routed to the owning block's ``sgsCustomCss`` (Additional-CSS) via a
    # ResidualBand (FR-31-5.2 passthrough channel, now built). Still logged for
    # observability. The band's selector is the ELEMENT'S OWN SGS-BEM class (the
    # rendered clone preserves the draft class by construction) so no hardcoded
    # string / DB lookup is needed (R-31-1).
    device_thresholds = db_lookup.device_tier_thresholds()
    residual_selector = _residual_selector_for(node) if residual_sink is not None else ""
    for media_cond, media_decls in matched_media:
        thresholds = [
            int(v) for v in re.findall(r"(?:min|max)-width\s*:\s*(\d+)", media_cond)
        ]
        if any(t not in device_thresholds for t in thresholds):
            _LOG.info(
                "F-ii residual (non-device breakpoint preserved, not snapped): "
                "%s → %s [→ sgsCustomCss per FR-31-5.2]",
                media_cond.strip(), sorted(media_decls),
            )
            if residual_sink is not None:
                residual_sink.append(
                    ResidualBand(
                        selector=residual_selector,
                        media_cond=media_cond.strip(),
                        decls=dict(media_decls),
                    )
                )

    return out_base, out_bp


# ---------------------------------------------------------------------------
# F-ii residual passthrough → sgsCustomCss (FR-31-5.2)
# ---------------------------------------------------------------------------

# Marker comments wrapping the converter-authored residual CSS inside sgsCustomCss.
# A re-clone finds-and-replaces ONLY the marked block (never clobbering any
# client-authored Additional-CSS that sits outside the markers), and the block is
# idempotent across re-clones (replace, not append-again).
_RESIDUAL_MARKER_START = "/* SGS-CONVERTER-RESIDUAL:start */"
_RESIDUAL_MARKER_END = "/* SGS-CONVERTER-RESIDUAL:end */"


def _residual_selector_for(node: Tag) -> str:
    """The element's own SGS-BEM element class as a CSS selector, or '' if the node
    is the block ROOT (a root-level residual scopes to the block wrapper directly).

    The rendered clone preserves the draft's BEM element class by construction (SGS
    render.php emits ``.sgs-<block>__<element>``), so the draft node's OWN class IS
    the stable render selector — no hardcoded string, no DB lookup (R-31-1). A node
    whose class carries no SGS-BEM ELEMENT (block root, or a non-BEM node) yields ''
    so the band targets the wrapper via a bare ``&selector``.
    """
    for cls in node.get("class", []) or []:
        bem = db_lookup.parse_sgs_bem(cls)
        if bem and bem.element:
            return "." + cls
    return ""


def serialise_residual_bands(bands: list[ResidualBand]) -> str:
    """Serialise captured ResidualBands into ONE ``sgsCustomCss`` string (FR-31-5.2).

    Groups by ``media_cond`` then ``selector`` so each media query appears once with
    all its rules, using the ``&selector`` convention consumed by
    ``includes/custom-css.php`` (``&selector`` → the block's scoped wrapper class,
    ``&selector .sgs-x__y`` → a descendant). Wrapped in marker comments for
    idempotent re-clone replacement. Returns '' when there are no bands.
    """
    if not bands:
        return ""
    # Deterministic grouping: media_cond → selector → {prop: val} (last write wins,
    # matching CSS source-order within one collected element).
    grouped: dict[str, dict[str, dict[str, str]]] = {}
    order: list[str] = []
    for band in bands:
        if band.media_cond not in grouped:
            grouped[band.media_cond] = {}
            order.append(band.media_cond)
        sel_map = grouped[band.media_cond]
        sel_map.setdefault(band.selector, {}).update(band.decls)

    blocks: list[str] = []
    for media_cond in order:
        rules: list[str] = []
        for selector, decls in grouped[media_cond].items():
            target = "&selector" + (f" {selector}" if selector else "")
            body = "".join(f"{prop}:{val};" for prop, val in decls.items())
            rules.append(f"{target}{{{body}}}")
        blocks.append(f"{media_cond}{{{''.join(rules)}}}")

    return _RESIDUAL_MARKER_START + "\n" + "\n".join(blocks) + "\n" + _RESIDUAL_MARKER_END


# ---------------------------------------------------------------------------
# css_value_to_attr (convert.py:1359 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def css_value_to_attr(value: str, kind: str) -> object | None:
    """Convert a CSS value string to a typed Python value.

    ``kind`` is the resolved ``kind`` column from ``property_suffixes`` (e.g.
    ``'colour'``, ``'number_px'``, ``'number_unitless'``, ``'string'``).

    Ported from convert.py:1359 (behaviour-identical).
    """
    raw = strip_important(value)
    if kind == "colour":
        return _colour_value_to_style(raw)
    if kind in ("number_px", "number_unitless", "number_px_or_em"):
        num, unit = split_value_unit(raw)
        if num is None:
            return None
        if kind == "number_unitless":
            return num
        return f"{num}{unit}"
    if kind == "string":
        return raw or None
    return None


# ---------------------------------------------------------------------------
# css_selector_has_class (convert.py:5243 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def css_selector_has_class(sel_key: str, selector: str) -> bool:
    """True if ``sel_key`` contains ``selector`` as a whole class-token.

    Handles both plain selectors and ``@media``-scoped keys with the
    ``' :: '`` sentinel. The CSS part after ``' :: '`` is what we match
    against.

    Ported from convert.py:5243 (behaviour-identical).
    """
    css_part = sel_key.split(" :: ", 1)[-1]  # works whether ' :: ' is present or not
    pattern = re.escape(selector) + r"(?=[ \t\r\n,:\[#>~+{]|$)"
    return bool(re.search(pattern, css_part))
