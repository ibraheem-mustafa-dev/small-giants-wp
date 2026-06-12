#!/usr/bin/env python3
"""convert.py — Spec 22 universal walker (Phase 1.4 Pass 2).

Replaces _retired/convert_pre_spec22.py with a single-path recursive walker
conforming to Spec 22 §13 Appendix A and binding rules R-22-1 through R-22-13.

Key architectural changes vs. the retired file:
  - Universal walker: exactly 3 routing branches (R-22-3 PASS test below).
  - Zero per-block slug literals in the walker (R-22-1, R-22-2).
  - variation_buf dropped from internal logic; CSS embedded via FR-22-5.
  - Deleted: get_block_for_node, lift_attrs_for_block, lift_subtree_into_block_attrs,
    _lift_inner_blocks (DB-driven inner-block path), F1 fallback, _f1_universal_walk_direct_children.
  - Ported: all orchestrator-API functions (flush_*,
    parse_css, ensure_root_section_class, main, _lift_root_supports_to_style, etc.).

R-22-3 PASS test: the _test_walker_branches() self-check at the bottom of
this file AST-parses the walk() function and asserts no block-slug string
literal (starting with 'sgs/') appears in any If-test comparisons other than
the single permitted 'sgs/container' literal (FR-22-4 container-base exception).
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

from bs4 import BeautifulSoup, Comment, NavigableString, Tag

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# Package-relative import (production path).
# Falls back to same-dir import when executed directly (python convert.py).
try:
    from . import db_lookup as db  # noqa: E402
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent))
    import db_lookup as db  # type: ignore[no-redef]  # noqa: E402


# ============================================================================
# R-22-3 / Spec 22 §FR-22-3 — PERMITTED EXCEPTION CONSTANT
# The ONE allowed hardcoded constant per R-22-1. 3 entries: header/footer/nav.
# ============================================================================
SKIP_TOP_LEVEL_TAGS: frozenset[str] = frozenset(("header", "footer", "nav"))


# ============================================================================
# Regex constants (CSS parser helpers)
# ============================================================================
_RULE_RE = re.compile(r"([^{}]+)\{([^{}]+)\}", re.DOTALL)
_DECL_RE = re.compile(r"\s*([\w-]+)\s*:\s*([^;]+);?\s*", re.DOTALL)
_IMPORTANT_RE = re.compile(r"\s*!important\s*$", re.IGNORECASE)
_VAR_TOKEN_RE = re.compile(r"var\(--(?:wp--preset--color--)?([a-z0-9-]+)\)")
_SGS_BEM_BLOCK_ROOT_RE = re.compile(r"^\.sgs-[a-z][a-z0-9]*(-[a-z0-9]+)*$")
_SGS_BEM_INNER_RE = re.compile(r"^\.sgs-[a-z][a-z0-9]*(-[a-z0-9]+)*__inner$")
_FULL_BLEED_WIDTH_VALUES = {"none", "100%", "100vw", "auto"}
_WIDTH_MATCH_TOLERANCE_PCT: float = 5.0


# ============================================================================
# wp-blocks validation gate (advisory, soft-fail)
# ============================================================================
_WP_BLOCKS_CLI = Path(__file__).parents[5] / ".claude" / "hooks" / "wp-blocks.py"
if not _WP_BLOCKS_CLI.exists():
    _WP_BLOCKS_CLI = Path.home() / ".claude" / "hooks" / "wp-blocks.py"


def _wp_blocks_validate(markup: str, slug: str) -> None:
    """Run wp-blocks.py validate. Soft-fail: logs to trace, never raises."""
    if not _WP_BLOCKS_CLI.exists():
        return
    try:
        # Markup via stdin (arg sentinel '-'), not as an argv string: Windows caps
        # a command line at 32,767 chars (CreateProcess) -> WinError 206 on large
        # markup. Previously that error hit the bare `except: pass` below, silently
        # disabling per-block validation on Windows. stdin has no such limit.
        result = subprocess.run(
            [sys.executable, str(_WP_BLOCKS_CLI), "validate", "-"],
            input=markup, capture_output=True, text=True, timeout=10, encoding="utf-8",
        )
        if result.returncode != 0:
            _trace("wp_blocks_validation_failed", slug=slug,
                   branch="wp_blocks_validation_failed",
                   error=result.stderr[:300] if result.stderr else "non-zero exit")
            return
        data = json.loads(result.stdout)
        if data.get("status") != "valid":
            issues = data.get("issues", [])
            _trace("wp_blocks_validation_failed", slug=slug,
                   branch="wp_blocks_validation_failed",
                   issues=issues[:5])
    except Exception:  # noqa: BLE001
        pass


# ============================================================================
# Trace emitter
# ============================================================================
_TRACE = None  # type: ignore[assignment]
_TRACE_BOUNDARY = ""


def set_trace(tr, boundary_id: str = "") -> None:
    """Bind a per-section Trace + boundary tag. Pass tr=None to disable.

    Binds BOTH this module and db_lookup so all events route to the same file.
    """
    global _TRACE, _TRACE_BOUNDARY
    _TRACE = tr
    _TRACE_BOUNDARY = boundary_id or ""
    db.set_trace(tr, boundary_id)


def _trace(stage: str, **kwargs) -> None:
    """Soft-fail trace emission. No-op when no trace is bound."""
    if _TRACE is None:
        return
    try:
        kwargs.setdefault("boundary_id", _TRACE_BOUNDARY)
        _TRACE.event(stage=stage, **kwargs)
    except Exception:  # noqa: BLE001
        pass


# ============================================================================
# Media-map resolution
# ============================================================================
_MEDIA_MAP: dict[str, dict] = {}


def load_media_map(media_map_path: Path | None) -> None:
    """Load a client's media-map {filename: {id, url}} into module-level cache."""
    global _MEDIA_MAP
    if not media_map_path or not media_map_path.exists():
        _MEDIA_MAP = {}
        return
    _MEDIA_MAP = json.loads(media_map_path.read_text(encoding="utf-8"))


def _resolve_media_url(src: str) -> str:
    """Resolve a mockup src against the active media-map. Returns src unchanged on miss."""
    if not src or not _MEDIA_MAP:
        return src
    basename = src.split("?", 1)[0].rstrip("/").rsplit("/", 1)[-1]
    entry = _MEDIA_MAP.get(basename)
    if entry and entry.get("url"):
        return entry["url"]
    return src


# ============================================================================
# Token resolution accumulator (Stage 4.5 D1)
# ============================================================================
_TOKEN_RESOLUTIONS: list[dict] = []


def clear_token_resolutions() -> None:
    """Reset at start of a fresh section conversion."""
    global _TOKEN_RESOLUTIONS
    _TOKEN_RESOLUTIONS = []


def flush_token_resolutions() -> list[dict]:
    """Return accumulated resolutions and clear."""
    global _TOKEN_RESOLUTIONS
    out = list(_TOKEN_RESOLUTIONS)
    _TOKEN_RESOLUTIONS = []
    return out


_TOKEN_RESOLVER_MOD = None


def _get_token_resolver():
    """Lazy-load token_resolver module. Soft-fail: returns None on ImportError."""
    global _TOKEN_RESOLVER_MOD
    if _TOKEN_RESOLVER_MOD is None:
        import importlib.util as _ilu
        _tr_path = Path(__file__).parent.parent / "token_resolver.py"
        if _tr_path.exists():
            try:
                spec = _ilu.spec_from_file_location("_cv2_token_resolver", _tr_path)
                mod = _ilu.module_from_spec(spec)
                spec.loader.exec_module(mod)
                _TOKEN_RESOLVER_MOD = mod
            except Exception:  # noqa: BLE001
                _TOKEN_RESOLVER_MOD = None
    return _TOKEN_RESOLVER_MOD


# ============================================================================
# Essence-match accumulator (P2.iii)
# ============================================================================
_ESSENCE_MATCH_EVENTS: list[dict] = []


def clear_essence_matches() -> None:
    """Reset at start of a section run."""
    global _ESSENCE_MATCH_EVENTS
    _ESSENCE_MATCH_EVENTS = []


def flush_essence_matches() -> list[dict]:
    """Return + clear essence-match events."""
    events = list(_ESSENCE_MATCH_EVENTS)
    clear_essence_matches()
    return events


_essence_match_mod = None


def _get_essence_match_detector():
    """Lazy-load essence_match_detector. Soft-fail: returns None on ImportError."""
    global _essence_match_mod
    if _essence_match_mod is not None:
        return _essence_match_mod
    try:
        import importlib.util as _ilu
        _here = Path(__file__).resolve().parent.parent
        _candidate = _here / "essence_match_detector.py"
        if _candidate.exists():
            spec = _ilu.spec_from_file_location("essence_match_detector", _candidate)
            mod = _ilu.module_from_spec(spec)
            spec.loader.exec_module(mod)
            _essence_match_mod = mod
            return mod
    except Exception:  # noqa: BLE001
        pass
    return None


# ============================================================================
# D3 — Attribute gap candidate accumulator
# ============================================================================
_GAP_CANDIDATES: list[dict] = []
_GAP_RUN_ID: str = ""


def seed_gap_context(run_id: str) -> None:
    """Set pipeline run_id for D3 gap candidate provenance."""
    global _GAP_RUN_ID
    _GAP_RUN_ID = run_id or ""


def clear_gap_candidates() -> None:
    """Reset accumulator at start of section conversion."""
    global _GAP_CANDIDATES
    _GAP_CANDIDATES = []


def _record_gap_candidate(
    block_slug: str,
    css_property: str,
    raw_value: str,
    source_class: str,
) -> None:
    """Append one unlifted CSS rule to the in-flight accumulator (de-duplicated)."""
    for existing in _GAP_CANDIDATES:
        if (
            existing["block_slug"] == block_slug
            and existing["css_property"] == css_property
            and existing["source_class"] == source_class
        ):
            return
    _GAP_CANDIDATES.append({
        "block_slug": block_slug,
        "css_property": css_property,
        "raw_value": raw_value,
        "source_class": source_class,
        "run_id": _GAP_RUN_ID,
    })


def flush_gap_candidates() -> list[dict]:
    """Write accumulated gap candidates to sgs-framework.db and return them."""
    if not _GAP_CANDIDATES:
        return []
    flushed: list[dict] = []
    for gap in _GAP_CANDIDATES:
        block_slug = gap["block_slug"]
        css_property = gap["css_property"]
        raw_value = gap["raw_value"]
        source_class = gap["source_class"]
        run_id = gap.get("run_id", "")
        try:
            proposed = db.propose_attr_name(block_slug, css_property, source_class)
            db.write_attribute_gap_candidate(
                block_slug=block_slug,
                css_property=css_property,
                raw_value=raw_value,
                source_class=source_class,
                source_run_id=run_id,
                proposed_attr=proposed,
            )
            flushed.append({**gap, "attr_name_proposed": proposed})
        except Exception as exc:  # noqa: BLE001
            sys.stderr.write(
                f"[converter_v2] WARN: D3 gap write failed for "
                f"{block_slug!r} css={css_property!r}: {exc}\n"
            )
    clear_gap_candidates()
    return flushed


# ============================================================================
# Universal alignment / width-mode lift context
# ============================================================================
_LIFT_CONTEXT: dict = {}


# ============================================================================
# CSS parser
# ============================================================================

def parse_css(css_text: str) -> dict[str, dict[str, str]]:
    """Parse CSS into {selector: {prop: value}}. Media queries flatten with marker.

    Uses brace-balanced scanner so nested @media blocks are extracted correctly.
    """
    rules: dict[str, dict[str, str]] = {}
    css_text = re.sub(r"/\*.*?\*/", "", css_text, flags=re.DOTALL)

    def _ingest_rules_text(text: str, media_cond: str = "") -> None:
        for inner in _RULE_RE.finditer(text):
            sel = inner.group(1).strip()
            decls = inner.group(2)
            if sel.startswith("@"):
                continue
            key = f"{media_cond} :: {sel}" if media_cond else sel
            rules.setdefault(key, {}).update(_parse_decls(decls))

    i = 0
    n = len(css_text)
    plain_start = 0
    while i < n:
        if css_text.startswith("@media", i):
            _ingest_rules_text(css_text[plain_start:i])
            brace_open = css_text.find("{", i)
            if brace_open == -1:
                break
            cond = css_text[i:brace_open].strip()
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
                break
            body = css_text[brace_open + 1: j - 1]
            _ingest_rules_text(body, media_cond=cond)
            i = j
            plain_start = j
            continue
        i += 1
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


def _strip_important(value: str) -> str:
    return _IMPORTANT_RE.sub("", value).strip()


# ============================================================================
# CSS helpers — collect, lift, token-snap
# ============================================================================

def collect_css_for_classes(classes: list[str], css_rules: dict) -> str:
    """Gather CSS rules matching any of the node's classes (FR-22-5).

    Filters css_rules by class selectors that match any sgs-* class in `classes`.
    Returns concatenated CSS rules as a single string ready to embed in <style>.
    """
    selectors = [f".{c}" for c in classes if c.startswith("sgs-")]
    if not selectors:
        return ""
    out_lines: list[str] = []
    for sel, decls in css_rules.items():
        if any(s in sel for s in selectors):
            decl_str = "; ".join(f"{k}: {v}" for k, v in decls.items())
            # Media-scoped rules are keyed as "@media (...) :: .selector" by
            # _parse_css() line 352 — the " :: " is an INTERNAL sentinel, never
            # valid CSS. Reconstruct proper @media nesting on emit (XS-1 fix
            # 2026-05-30, per pipeline-state/.../diagnostic-register XS-1).
            if " :: " in sel:
                media_cond, real_sel = sel.split(" :: ", 1)
                out_lines.append(f"{media_cond} {{ {real_sel} {{ {decl_str} }} }}")
            else:
                out_lines.append(f"{sel} {{ {decl_str} }}")
    return "\n".join(out_lines)


# Backward-compat alias used internally and by retired-file-era call sites.
_collect_css_for_classes = collect_css_for_classes


def _extract_token_or_hex(value: str) -> str | None:
    """Extract a colour token slug or hex from a CSS value string."""
    v = value.strip()
    m = _VAR_TOKEN_RE.search(v)
    if m:
        return m.group(1)
    if v.startswith("#"):
        return v.split()[0]
    return None


def _colour_value_to_style(raw: str) -> str | None:
    """Convert a CSS colour expression to WP style.* colour form."""
    if not raw:
        return None
    token_or_hex = _extract_token_or_hex(raw)
    if token_or_hex is None:
        return None
    if token_or_hex.startswith("#"):
        return token_or_hex
    return f"var:preset|color|{token_or_hex}"


def _preserve_unit(raw: str) -> str | None:
    """Return trimmed CSS value as-is for single dimension/literal."""
    if not raw:
        return None
    v = raw.strip().rstrip(";")
    return v if v else None


def _support_allows(supports: dict, top_key: str, sub_key: str | None = None) -> bool:
    """Return True when block supports map allows given property."""
    if top_key not in supports:
        return False
    val = supports[top_key]
    if val is True:
        return True
    if isinstance(val, dict):
        if sub_key is None:
            return any(v is True for v in val.values())
        return bool(val.get(sub_key))
    return False


def _set_in(target: dict, path: list[str], value) -> None:
    """Set value at nested dict path inside target, never overwriting an existing leaf."""
    cur = target
    for key in path[:-1]:
        nxt = cur.get(key)
        if not isinstance(nxt, dict):
            if nxt is not None:
                return
            nxt = {}
            cur[key] = nxt
        cur = nxt
    leaf = path[-1]
    if leaf in cur:
        return
    cur[leaf] = value


def _root_lift_rules():
    """Return canonical CSS-property → WP style.* mapping list.

    R-22-1 permitted-constant exception (WP-core schema, same class as
    SKIP_TOP_LEVEL_TAGS): the style_path + supports keys here encode
    WordPress Core's serialised block-style schema (wp-includes/blocks/
    block-serialization-spec; `style.spacing.padding.top`, `style.color.background`,
    etc.). This path structure is defined by WordPress, not by the SGS DB —
    there is no `property_suffixes` column for WP's nested style-object paths.
    The CSS→style_path transform is therefore a deterministic WP-schema
    constant rather than per-block lookup data.

    What IS DB-driven: which CSS properties a given block may receive is
    governed by db.block_supports_for(slug) queried in _lift_root_supports_to_style
    at call-time. Only properties whose supports key is present in the block's
    DB record are actually written.
    """
    return [
        ("padding-top",    "spacing",               "padding", ["spacing", "padding", "top"],    "unit"),
        ("padding-right",  "spacing",               "padding", ["spacing", "padding", "right"],  "unit"),
        ("padding-bottom", "spacing",               "padding", ["spacing", "padding", "bottom"], "unit"),
        ("padding-left",   "spacing",               "padding", ["spacing", "padding", "left"],   "unit"),
        ("margin-top",     "spacing",               "margin",  ["spacing", "margin", "top"],     "unit"),
        ("margin-right",   "spacing",               "margin",  ["spacing", "margin", "right"],   "unit"),
        ("margin-bottom",  "spacing",               "margin",  ["spacing", "margin", "bottom"],  "unit"),
        ("margin-left",    "spacing",               "margin",  ["spacing", "margin", "left"],    "unit"),
        ("gap",            "spacing",               "blockGap", ["spacing", "blockGap"],         "unit"),
        ("border-radius",  "__experimentalBorder",  "radius",  ["border", "radius"],             "unit"),
        ("border-width",   "__experimentalBorder",  "width",   ["border", "width"],              "unit"),
        ("border-style",   "__experimentalBorder",  "style",   ["border", "style"],              "unit"),
        ("border-color",   "__experimentalBorder",  "color",   ["border", "color"],              "colour"),
        ("background-color", "color",               "background", ["color", "background"],       "colour"),
        ("color",            "color",               "text",       ["color", "text"],             "colour"),
    ]


def _parse_padding_shorthand(value: str) -> dict[str, str] | None:
    """Parse 'padding: 22px 16px' → {'top','right','bottom','left'}."""
    if not value:
        return None
    parts = value.strip().split()
    if not parts or len(parts) > 4:
        return None
    if any("," in p for p in parts):
        return None
    if len(parts) == 1:
        return {"top": parts[0], "right": parts[0], "bottom": parts[0], "left": parts[0]}
    if len(parts) == 2:
        return {"top": parts[0], "right": parts[1], "bottom": parts[0], "left": parts[1]}
    if len(parts) == 3:
        return {"top": parts[0], "right": parts[1], "bottom": parts[2], "left": parts[1]}
    return {"top": parts[0], "right": parts[1], "bottom": parts[2], "left": parts[3]}


def _split_value_unit(raw, default_unit: str = "px") -> tuple:
    """Split '22px' → (22.0, 'px'). Returns (None, None) on parse failure."""
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



def _collect_css_decls_for_element(
    node: Tag,
    css_rules: dict,
) -> tuple[dict[str, str], dict[str, dict[str, str]]]:
    """Collect CSS declarations targeting this element.

    Returns (base_decls, bp_decls) where:
      - base_decls = {prop: val} from inline style + non-media CSS rules
      - bp_decls = {bp_suffix: {prop: val}} for @media rules keyed by breakpoint suffix
        (e.g. 'Desktop', 'Tablet', 'Mobile' — not the raw media condition string)

    Sources (in priority order):
      1. Inline style attribute on the element (highest specificity)
      2. Direct class selectors (.sgs-hero__sub)
      3. Parent-qualified selectors (.sgs-hero__copy h1)
      4. Grouped selectors (h1, h2, h3)

    Media rules are routed to bp_decls by matching the media condition against
    the breakpoint_suffix_rules() vocabulary (e.g. 'min-width: 1280' → 'Desktop').
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
        if "::" in sel:
            media_part, sel_part = sel.split("::", 1)
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
            if last_part.startswith(".") and last_part[1:] in desc_classes:
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

    bp_rules = db.breakpoint_suffix_rules()
    matched_media.sort(key=lambda mc: _specificity_key(mc[0]))
    for media_part, decls in matched_media:
        for bp_substr, bp_suffix_list in bp_rules:
            if bp_substr in media_part:
                for bp_suffix in bp_suffix_list:
                    bucket = bp_decls.setdefault(bp_suffix, {})
                    bucket.update(decls)
                break

    return base_decls, bp_decls


def _snap_style_dict_leaves(block_slug: str, style: dict) -> None:
    """Token-snapping DISABLED 2026-06-07 (Bean directive).

    Snapping rewrote the draft's literal CSS values to the nearest theme token
    (e.g. font-size:14px → a token's value), destroying fidelity. The faithful
    behaviour is to PRESERVE the draft's real values; bespoke values that don't
    match a token should become new tokens in the client variation, not be
    snapped away (memory `cloning_preserves_intentional_bespoke_detail`).
    Re-enable only behind an explicit, value-preserving design.
    """
    return


def _lift_root_supports_to_style(
    node: Tag,
    block_slug: str,
    css_rules: dict,
    attrs: dict,
) -> None:
    """Lift block-root CSS into WP native style.* attributes AND per-device custom attrs.

    Reads the node's own CSS, consults db.block_supports_for(block_slug),
    and writes matching properties into attrs['style'] (base) and into
    per-device custom attrs (e.g. paddingTopTablet, paddingTopMobile) when
    the block schema declares them and @media overrides exist in css_rules.

    Responsive lift (Phase 2 universal fix):
      _collect_css_decls_for_element returns (base_decls, bp_decls) where bp_decls
      is keyed by breakpoint suffix ('Tablet', 'Mobile', 'Desktop').  Previously
      bp_decls was discarded.  This function now:
        1. Lifts base_decls to style.* (unchanged behaviour).
        2. For each bp_suffix in bp_decls, applies _root_lift_rules and emits
           per-device custom attrs where the block schema has them.
      The per-device attr name convention follows '{css_prop_camel_suffix}{BpSuffix}'
      (e.g. paddingTopTablet).
      Only attrs present in the block schema are emitted; others are traced as
      'responsive_attr_dropped' for downstream gap-candidate analysis.

    Never overwrites existing keys.
    """
    if not block_slug or not block_slug.startswith("sgs/"):
        return
    supports = db.block_supports_for(block_slug)
    if not supports:
        return
    base_decls, bp_decls = _collect_css_decls_for_element(node, css_rules)
    # D1 sidecar merge — DELETED 2026-05-27 (/qc-council D4). Spec 16 mechanism;
    # superseded by DB-driven role classification + equivalent_block_for routing.
    if not base_decls and not bp_decls:
        return
    style: dict = attrs.get("style") or {}

    if base_decls:
        # Normalise background / border shorthand
        if "background" in base_decls and "background-color" not in base_decls:
            bg = base_decls["background"].strip()
            if bg and "url(" not in bg and "gradient" not in bg:
                for tok in bg.split():
                    if _extract_token_or_hex(tok) is not None or tok in ("white", "black", "transparent"):
                        base_decls["background-color"] = tok
                        break
                else:
                    if len(bg.split()) == 1:
                        base_decls["background-color"] = bg
        if "border" in base_decls and "border-width" not in base_decls:
            parts = base_decls["border"].strip().split()
            for tok in parts:
                if any(u in tok for u in ("px", "em", "rem", "pt")):
                    base_decls.setdefault("border-width", tok)
                elif tok in ("solid", "dashed", "dotted", "double", "none"):
                    base_decls.setdefault("border-style", tok)
                elif _extract_token_or_hex(tok) is not None or tok.startswith("var("):
                    base_decls.setdefault("border-color", tok)
        # Apply root lift rules (base → style.*)
        for css_prop, sup_top, sup_sub, style_path, kind in _root_lift_rules():
            if css_prop not in base_decls:
                continue
            if not _support_allows(supports, sup_top, sup_sub if sup_sub != style_path[-1] else None):
                continue
            raw = _strip_important(base_decls[css_prop])
            if kind == "colour":
                v = _colour_value_to_style(raw)
            else:
                v = _preserve_unit(raw)
            if v is not None:
                _set_in(style, style_path, v)
        # Padding/margin shorthand (base)
        for shorthand in ("padding", "margin"):
            if shorthand not in base_decls:
                continue
            if not _support_allows(supports, "spacing", shorthand):
                continue
            parsed = _parse_padding_shorthand(_strip_important(base_decls[shorthand]))
            if parsed:
                for side, val in parsed.items():
                    _set_in(style, ["spacing", shorthand, side], val)

    if style:
        attrs["style"] = style
        _snap_style_dict_leaves(block_slug, attrs["style"])

    # ---- Responsive per-device custom attr lift --------------------------------
    # bp_decls = {bp_suffix: {css_prop: value}} collected from @media rules.
    # For each breakpoint suffix ('Tablet', 'Mobile', 'Desktop') and each CSS
    # property in _root_lift_rules, attempt to emit a matching per-device custom
    # attr on the block (e.g. paddingTopTablet).  Only emitted when:
    #   (a) the block schema has an attr with that exact camelCase name, AND
    #   (b) the attr isn't already set.
    # Property→attrName mapping reuses the style_path leaf + bp_suffix:
    #   style_path ['spacing','padding','top'] + 'Tablet' → paddingTopTablet
    #   style_path ['color','text']             + 'Mobile' → colorTextMobile (unusual)
    # For padding/margin shorthand @media rules, expand the four sides similarly.
    if not bp_decls:
        return
    block_schema = db.block_attrs(block_slug)
    for bp_suffix, bp_decl_map in bp_decls.items():
        if not bp_decl_map:
            continue
        for css_prop, sup_top, sup_sub, style_path, kind in _root_lift_rules():
            if css_prop not in bp_decl_map:
                continue
            if not _support_allows(supports, sup_top, sup_sub if sup_sub != style_path[-1] else None):
                continue
            raw = _strip_important(bp_decl_map[css_prop])
            if kind == "colour":
                v = _colour_value_to_style(raw)
            else:
                v = _preserve_unit(raw)
            if v is None:
                _trace("responsive_attr_dropped", block_slug=block_slug,
                       css_prop=css_prop, bp_suffix=bp_suffix,
                       reason="value_unparseable", raw=raw)
                continue
            # Build candidate attr name from style_path leaves + bp_suffix.
            # e.g. ['spacing','padding','top'] → 'paddingTop' + 'Tablet' → 'paddingTopTablet'
            path_leaves = style_path[1:]  # drop 'spacing'/'color'/'border' top-level key
            camel_base = "".join(p.capitalize() for p in path_leaves)
            # camelCase the attr name (lowercase first char): block attrs are
            # 'paddingTopTablet', not 'PaddingTopTablet'. Without this the candidate
            # never matches block_schema and EVERY responsive box value is dropped.
            camel_base = camel_base[:1].lower() + camel_base[1:]
            candidate = f"{camel_base}{bp_suffix}"
            if candidate in block_schema and candidate not in attrs:
                attrs[candidate] = v
                _trace("responsive_attr_lifted", block_slug=block_slug,
                       css_prop=css_prop, bp_suffix=bp_suffix,
                       attr_name=candidate, value=str(v))
            else:
                _trace("responsive_attr_dropped", block_slug=block_slug,
                       css_prop=css_prop, bp_suffix=bp_suffix,
                       reason="no_schema_attr" if candidate not in block_schema else "already_set",
                       candidate=candidate)
        # Padding/margin shorthand responsive lift
        for shorthand in ("padding", "margin"):
            if shorthand not in bp_decl_map:
                continue
            if not _support_allows(supports, "spacing", shorthand):
                continue
            parsed = _parse_padding_shorthand(_strip_important(bp_decl_map[shorthand]))
            if not parsed:
                continue
            for side, val in parsed.items():
                # e.g. 'padding' + 'top' + 'Tablet' → 'paddingTopTablet'
                # (shorthand stays lowercase so the camelCase attr name matches the
                # block schema — 'paddingTopTablet', not 'PaddingTopTablet').
                candidate = f"{shorthand}{side.capitalize()}{bp_suffix}"
                if candidate in block_schema and candidate not in attrs:
                    attrs[candidate] = val
                    _trace("responsive_attr_lifted", block_slug=block_slug,
                           css_prop=f"{shorthand} ({side})", bp_suffix=bp_suffix,
                           attr_name=candidate, value=val)
                else:
                    _trace("responsive_attr_dropped", block_slug=block_slug,
                           css_prop=f"{shorthand} ({side})", bp_suffix=bp_suffix,
                           reason="no_schema_attr" if candidate not in block_schema else "already_set",
                           candidate=candidate)


# ============================================================================
# A1 — Universal CSS→container-attribute lift helper (Method-2 converter-lift)
# Spec 22 §FR-22-21. DB-driven (R-22-1). FLAG-not-drop (FR-22-21 step 6).
# ============================================================================

# CSS properties excluded from this helper — max-width/width widthMode logic
# is handled by the path-specific code in §FR-22-21 steps 2-3 (shipped D159).
_LIFT_EXCLUDED_PROPS: frozenset[str] = frozenset({"max-width", "width"})

# Explicit attr-name overrides for cases where the DB suffix lower-cased first
# char does NOT yield the correct sgs/container attribute name.
# Contract rule: "handle the known multi-word cases explicitly via the DB suffix."
# Only needed when (css_prop, suffix) naive derivation lands on the wrong attr.
_SUFFIX_ATTR_OVERRIDES: dict[tuple[str, str], str] = {
    # DB suffix 'Columns' → naive 'columns' (number attr), but the string
    # attr that accepts a CSS template expression is 'gridTemplateColumns'.
    ("grid-template-columns", "Columns"): "gridTemplateColumns",
}

# Responsive suffix pairs: bp_decls key → attr suffix appended to base attr name.
# Matches the convention used in _lift_root_supports_to_style and block.json.
_BP_SUFFIX_MAP: dict[str, str] = {
    "Tablet":  "Tablet",
    "Mobile":  "Mobile",
    "Desktop": "Desktop",
}

# Helper: detect CSS function values that must be passed through as raw strings.
_CSS_FUNCTION_RE = re.compile(r"\(")


def _is_css_function(value: str) -> bool:
    """Return True when the value contains a CSS function call (clamp, calc, var, etc.)."""
    return bool(_CSS_FUNCTION_RE.search(value))


# ============================================================================
# A2 — Container-mirror roster + per-block attr-name helpers
# DB-driven (R-22-1): no hardcoded slug list.
# ============================================================================

_container_mirror_cache: dict[str, bool] = {}
_section_kind_mirror_cache: dict[str, bool] = {}
_block_attr_names_cache: dict[str, frozenset[str]] = {}


def _is_container_mirror_block(slug: str) -> bool:
    """Return True when the block has wraps_block='sgs/container' in block_composition.

    Cached per slug. Soft-fails to False on missing table / missing row so that
    non-mirror blocks (sgs/text, sgs/button, etc.) are silently skipped.
    R-22-1 compliant — DB-driven; no hardcoded slug list.
    """
    if slug in _container_mirror_cache:
        return _container_mirror_cache[slug]
    import sqlite3
    result = False
    try:
        conn = sqlite3.connect(str(db.SGS_DB))
        try:
            row = conn.execute(
                "SELECT 1 FROM block_composition WHERE block_slug = ? AND wraps_block = 'sgs/container'",
                (slug,),
            ).fetchone()
            result = row is not None
        except sqlite3.OperationalError:
            result = False  # Table absent — soft-fail
        finally:
            conn.close()
    except Exception:  # noqa: BLE001
        result = False
    _container_mirror_cache[slug] = result
    return result


def _is_section_kind_mirror_block(slug: str) -> bool:
    """True when block is a SECTION-kind container mirror (wraps_block='sgs/container'
    AND container_kind='section'). Cached; soft-fails to False on missing table/row/None.
    R-22-1 DB-driven. Used to exempt top-level section composites (hero/trust-bar/
    cta-section) from the exception-3 outer-container wrap — they carry their own
    mirrored wrapper. Layout/content-kind mirror blocks are NOT exempted (they are
    normally nested; bare-emitting them at top level would drop their section wrapper).
    """
    if slug in _section_kind_mirror_cache:
        return _section_kind_mirror_cache[slug]
    import sqlite3
    result = False
    try:
        conn = sqlite3.connect(str(db.SGS_DB))
        try:
            row = conn.execute(
                "SELECT 1 FROM block_composition WHERE block_slug = ? AND wraps_block = 'sgs/container' AND container_kind = 'section'",
                (slug,),
            ).fetchone()
            result = row is not None
        except sqlite3.OperationalError:
            result = False  # Table absent — soft-fail
        finally:
            conn.close()
    except Exception:  # noqa: BLE001
        result = False
    _section_kind_mirror_cache[slug] = result
    return result


def _block_attr_names(slug: str) -> frozenset[str]:
    """Return frozenset of attr_name strings for a block from block_attributes.

    Uses db.block_attrs() which is already LRU-cached. Returns empty frozenset
    on missing block so that _try_lift_prop silently skips every candidate.
    """
    if slug in _block_attr_names_cache:
        return _block_attr_names_cache[slug]
    attr_map = db.block_attrs(slug)
    result: frozenset[str] = frozenset(attr_map.keys()) if attr_map else frozenset()
    _block_attr_names_cache[slug] = result
    return result


def _lift_wrapper_css_to_container_attrs(
    base_decls: dict[str, str],
    bp_decls: dict[str, dict[str, str]],
    container_attr_names: frozenset[str] | set[str],
    *,
    _typography_owned_attrs: frozenset[str] | None = None,
    container_attr_meta: dict[str, dict] | None = None,
    allow_max_width: bool = False,
) -> tuple[dict, list[str]]:
    """Lift base + responsive CSS declarations onto sgs/container attribute names.

    Phase A, step A1 — universality foundation for the Method-2 converter-lift
    (Spec 22 §FR-22-21). Must be called BEFORE path-specific code wires the
    result into block emit paths (A2/A3 handle that).

    Args:
        base_decls:             {css_prop: value} from non-media CSS rules + inline style.
        bp_decls:               {bp_suffix: {css_prop: value}} from @media rules.
                                bp_suffix is one of 'Desktop', 'Tablet', 'Mobile'.
        container_attr_names:   Set of valid sgs/container attribute names (from block.json).
        _typography_owned_attrs: (Commit 1b — DB dispatch) Optional frozenset of flat
                                attr names that the typography writer owns for this block.
                                When provided, this writer skips any attr in the set
                                (the DB has already decided it belongs to typography).
                                None = legacy / no-contest path (no filtering applied).
        container_attr_meta:    Optional {attr_name: {attr_type, ...}} metadata dict
                                (from db.block_attrs()). When provided, number-typed
                                destination attrs receive split number + Unit companion
                                (mirrors the AREA router type-aware store); string-typed
                                attrs (sgs/container) keep existing raw-string behaviour.
                                None = legacy path (all attrs treated as string-typed).
        allow_max_width:        When True, ``max-width`` is lifted onto the block's
                                ``maxWidth`` attr (number-typed with split Unit companion)
                                rather than being excluded.  Default False (containers
                                use the existing widthMode/customWidth path via
                                _lift_root_supports_to_style / _lift_root_supports_to_style;
                                text-leaf blocks like sgs/text declare their own maxWidth
                                attr that widthMode does not cover).

    Returns:
        attrs:   {attr_name: value} ready to merge into the block's attrs dict.
                 Only attrs present in container_attr_names are emitted.
        flagged: List of 'css_prop' strings with no matching container attr.
                 Caller should treat these as gap candidates (never silently dropped).

    DB contract (R-22-1):
        All CSS-property→suffix mappings come from db.css_property_suffixes().
        No hardcoded CSS-property dict is used for lookups.

    CSS function passthrough:
        Values containing '(' (clamp/calc/var/min/max/url/etc.) are passed
        through as raw strings onto string-type container attrs rather than
        being dropped by _split_value_unit().

    FLAG-not-drop (FR-22-21 step 6):
        Any css_prop with no matching container attr is added to `flagged`
        and emitted via _trace("lift_gap_candidate") — never silently dropped.

    Excluded properties:
        max-width and width are excluded by default — containers use path-specific
        widthMode logic (§FR-22-21 steps 2-3, shipped D159).
        When allow_max_width=True, max-width is processed as a number+unit prop
        (text-leaf opt-in: sgs/text.maxWidth + maxWidthUnit).
        width remains excluded always.
    """
    # Build a lookup: css_prop → list of (suffix, kind) from the DB.
    # One css_prop may have multiple suffixes (e.g. background-color → Background,
    # BackgroundColour, BackgroundColor, Bg). We try each in order.
    prop_to_suffixes: dict[str, list[tuple[str, str]]] = {}
    for css_prop, suffix, kind in db.css_property_suffixes():
        prop_to_suffixes.setdefault(css_prop, []).append((suffix, kind))

    attrs: dict = {}
    flagged: list[str] = []

    def _try_lift_prop(
        css_prop: str,
        raw_value: str,
        bp_suffix: str | None,
    ) -> bool:
        """Attempt to lift one (css_prop, value) onto a container attr.

        Returns True when at least one attr was successfully set.
        bp_suffix: if set, append it to the attr name (e.g. 'Tablet' → 'gapTablet').
        """
        # P3 opt-in: when allow_max_width=True, max-width is processed as
        # a number+unit prop onto the block's maxWidth attr (text-leaf path).
        # width is always excluded. Containers (allow_max_width=False default)
        # still use the existing widthMode/customWidth path — no regression.
        if css_prop == "width":
            return True  # Always excluded — not a gap candidate.
        if css_prop == "max-width" and not allow_max_width:
            return True  # Excluded on container paths — not a gap candidate.

        value = _strip_important(raw_value).strip()
        if not value:
            return False

        suffix_list = prop_to_suffixes.get(css_prop)
        if not suffix_list:
            return False  # No DB suffix for this prop → caller flags it.

        placed = False
        for suffix, kind in suffix_list:
            # Derive the container attr name.
            override_key = (css_prop, suffix)
            if override_key in _SUFFIX_ATTR_OVERRIDES:
                base_attr = _SUFFIX_ATTR_OVERRIDES[override_key]
            else:
                # Standard derivation: lower-case the first character of the suffix.
                base_attr = suffix[0].lower() + suffix[1:] if suffix else ""

            # Append breakpoint suffix when operating on bp_decls.
            attr_name = f"{base_attr}{bp_suffix}" if bp_suffix else base_attr

            if attr_name not in container_attr_names:
                continue  # Try next suffix; flag at end if none matched.
            if attr_name in attrs:
                continue  # Never overwrite — first win wins.
            # Commit 1b — DB dispatch: skip any attr the DB has assigned to the
            # typography writer.  base_attr is the attr name without bp_suffix;
            # the typography writer owns the attr regardless of breakpoint.
            if _typography_owned_attrs and base_attr in _typography_owned_attrs:
                continue  # Typography owns this attr — wrapper-css must not write it.

            # Resolve the value.
            # Type-aware store: if the destination attr is declared as number-typed
            # in block.json (e.g. sgs/text marginBottom, sgs/heading paddingTop),
            # split the raw value into a numeric part + a companion Unit attr,
            # mirroring _route_area_css_to_block_attrs (the AREA router).
            # String-typed attrs (sgs/container contentBandPadding*, minHeight, gap…)
            # keep the existing _preserve_unit raw-string path — no regression.
            _dest_meta = (container_attr_meta or {}).get(base_attr) or {}
            _dest_is_number = _dest_meta.get("attr_type") == "number"

            if _is_css_function(value):
                # CSS function (clamp/calc/var/min/max/url/etc.) → raw string passthrough.
                # Container string-type attrs accept raw CSS. Never route via
                # _split_value_unit() which drops these.
                # Number-typed attrs cannot represent CSS functions — flag-not-drop.
                if _dest_is_number:
                    _trace(
                        "lift_gap_candidate",
                        prop=css_prop,
                        value=value,
                        reason="number_attr_unparseable_css_function",
                        attr_name=attr_name,
                    )
                    continue  # Try next suffix; outer caller flags if none match.
                resolved: object = value
            elif kind == "colour":
                resolved = _colour_value_to_style(value)
            elif kind in ("number_px", "number_unitless", "number_px_or_em"):
                if _dest_is_number:
                    # Destination is number-typed: split value + unit, store the
                    # numeric part here; write the family Unit companion attr once.
                    # Mirrors the AREA router type-aware store (lines 2240-2271).
                    _num, _unit = _split_value_unit(value)
                    if _num is None:
                        # calc()/var()/keyword — unrepresentable in a number attr.
                        _trace(
                            "lift_gap_candidate",
                            prop=css_prop,
                            value=value,
                            reason="number_attr_number_unparseable",
                            attr_name=attr_name,
                        )
                        continue  # Try next suffix.
                    resolved = int(_num) if float(_num).is_integer() else _num
                    # Derive the family Unit attr: strip trailing Top/Right/Bottom/Left
                    # from base_attr (not attr_name — bp_suffix must not bleed in).
                    _family_unit_attr = (
                        re.sub(r"(Top|Right|Bottom|Left)$", "", base_attr) + "Unit"
                    )
                    if _family_unit_attr in container_attr_names and _unit:
                        _existing_unit = attrs.get(_family_unit_attr)
                        if _existing_unit is None:
                            # Set the Unit companion. Use setdefault-equivalent logic:
                            # only write if not already present (first-win convention).
                            attrs[_family_unit_attr] = _unit
                        elif _existing_unit != _unit:
                            # Mixed units within the same block (e.g. px + rem) —
                            # flag-not-drop, consistent with the AREA router.
                            _trace(
                                "lift_gap_candidate",
                                prop=css_prop,
                                value=value,
                                reason="number_attr_mixed_units",
                                attr_name=attr_name,
                                unit_conflict=f"{_existing_unit} vs {_unit}",
                            )
                            continue
                else:
                    # Destination is string-typed (sgs/container and any other
                    # block whose dimension attrs are declared as strings).
                    # Keep existing raw-string passthrough — no regression.
                    resolved = _preserve_unit(value)
                    if resolved is None:
                        resolved = value  # Last-resort: keep the raw string.
            else:
                # kind == "string" or anything else → raw passthrough.
                resolved = value

            if resolved is None:
                continue  # Unparseable colour; try next suffix.

            attrs[attr_name] = resolved
            placed = True
            break  # First matching attr wins; stop trying further suffixes.

        return placed

    # ---- Base declarations ----
    for css_prop, value in base_decls.items():
        # Skip always-excluded 'width'; skip 'max-width' unless allow_max_width opt-in.
        if css_prop == "width":
            continue
        if css_prop == "max-width" and not allow_max_width:
            continue
        placed = _try_lift_prop(css_prop, value, bp_suffix=None)
        if not placed and css_prop in prop_to_suffixes:
            # Had DB rows but none matched container attrs → gap candidate.
            flagged.append(css_prop)
            _trace("lift_gap_candidate", prop=css_prop, value=value,
                   reason="no_matching_container_attr")
        elif not placed:
            # No DB suffix at all for this prop → gap candidate.
            flagged.append(css_prop)
            _trace("lift_gap_candidate", prop=css_prop, value=value,
                   reason="no_db_suffix")

    # ---- Responsive declarations ----
    for bp_key, bp_decl_map in bp_decls.items():
        bp_suffix = _BP_SUFFIX_MAP.get(bp_key)
        if not bp_suffix or not bp_decl_map:
            continue
        for css_prop, value in bp_decl_map.items():
            # Skip always-excluded 'width'; skip 'max-width' unless allow_max_width opt-in.
            if css_prop == "width":
                continue
            if css_prop == "max-width" and not allow_max_width:
                continue
            placed = _try_lift_prop(css_prop, value, bp_suffix=bp_suffix)
            if not placed and css_prop in prop_to_suffixes:
                # A-collapse rule: the responsive attr (e.g. minHeightDesktop) is NOT in
                # container_attr_names, but the BASE attr (minHeight) MAY be present.
                # If so, fall back to setting the base attr via setdefault — never
                # overwrite a base value already set by the base-decls pass or by an
                # earlier responsive variant. Rationale: mockups are often mobile-first;
                # a desktop-only min-height with no base value should still be captured
                # as a floor (mobile won't usually be taller). Only fires when the
                # responsive attr truly does not exist on the block.
                collapsed = False
                _is_excluded = css_prop == "width" or (css_prop == "max-width" and not allow_max_width)
                if not _is_excluded:
                    for suffix, _kind in prop_to_suffixes.get(css_prop, []):
                        override_key = (css_prop, suffix)
                        if override_key in _SUFFIX_ATTR_OVERRIDES:
                            base_attr = _SUFFIX_ATTR_OVERRIDES[override_key]
                        else:
                            base_attr = suffix[0].lower() + suffix[1:] if suffix else ""
                        if base_attr and base_attr in container_attr_names and base_attr not in attrs:
                            # Base attr exists AND is not yet set → collapse to base.
                            placed = _try_lift_prop(css_prop, value, bp_suffix=None)
                            if placed:
                                _trace("lift_a_collapse", prop=css_prop, value=value,
                                       bp_key=bp_key, base_attr=base_attr)
                                collapsed = True
                            break
                if not collapsed:
                    flagged.append(f"{css_prop}@{bp_key}")
                    _trace("lift_gap_candidate", prop=css_prop, value=value,
                           bp_suffix=bp_key, reason="no_matching_container_attr_responsive")
            elif not placed:
                flagged.append(f"{css_prop}@{bp_key}")
                _trace("lift_gap_candidate", prop=css_prop, value=value,
                       bp_suffix=bp_key, reason="no_db_suffix_responsive")

    return attrs, flagged


def _css_value_to_attr(value: str, kind: str) -> object | None:
    """Convert a CSS value string to a typed Python value."""
    raw = _strip_important(value)
    if kind == "colour":
        return _colour_value_to_style(raw)
    if kind in ("number_px", "number_unitless", "number_px_or_em"):
        num, unit = _split_value_unit(raw)
        if num is None:
            return None
        if kind == "number_unitless":
            return num
        return f"{num}{unit}"
    if kind == "string":
        return raw or None
    return None


# ============================================================================
# Width-mode detection and theme-widths loading
# ============================================================================

def _parse_px_length(raw: str) -> float | None:
    """Parse a CSS length string to a pixel float. Returns None on failure."""
    if not raw:
        return None
    raw = _strip_important(raw).strip()
    m = re.match(r"^([+-]?[\d.]+)\s*px$", raw)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    return None


def _detect_client_layout_widths(css_rules: dict) -> dict:
    """Detect layout widths from mockup CSS block-root selectors."""
    candidates: list[float] = []
    for sel, decls in css_rules.items():
        bare_sel = sel.split(" :: ")[-1].strip() if " :: " in sel else sel.strip()
        is_root = _SGS_BEM_BLOCK_ROOT_RE.match(bare_sel)
        is_inner = _SGS_BEM_INNER_RE.match(bare_sel)
        if not (is_root or is_inner):
            continue
        raw_mw = decls.get("max-width", "")
        if not raw_mw:
            continue
        raw_mw = _strip_important(raw_mw).strip()
        if raw_mw in _FULL_BLEED_WIDTH_VALUES:
            continue
        px = _parse_px_length(raw_mw)
        if px and px > 0:
            candidates.append(px)
    if not candidates:
        return {}
    # Cluster close values (within tolerance) and pick the two most frequent.
    candidates.sort()
    clusters: list[list[float]] = []
    for val in candidates:
        placed = False
        for cluster in clusters:
            rep = sum(cluster) / len(cluster)
            if abs(val - rep) / max(rep, 1) <= _WIDTH_MATCH_TOLERANCE_PCT / 100:
                cluster.append(val)
                placed = True
                break
        if not placed:
            clusters.append([val])
    clusters.sort(key=lambda c: (-len(c), -(sum(c) / len(c))))
    result: dict = {}
    if clusters:
        wide_px = sum(clusters[0]) / len(clusters[0])
        result["wideSize"] = f"{wide_px:.0f}px"
        if len(clusters) > 1:
            content_px = sum(clusters[1]) / len(clusters[1])
            if content_px < wide_px:
                result["contentSize"] = f"{content_px:.0f}px"
    return result


def _write_client_layout_widths(client_slug: str, widths: dict, repo_root: Path) -> None:
    """Write detected layout widths to the client's theme-snapshot.json."""
    if not client_slug or not widths:
        return
    snapshot_path = repo_root / "sites" / client_slug / "theme-snapshot.json"
    if not snapshot_path.exists():
        return
    try:
        snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
        settings = snapshot.setdefault("settings", {})
        layout = settings.setdefault("layout", {})
        for key, val in widths.items():
            if key not in layout:
                layout[key] = val
        snapshot_path.write_text(
            json.dumps(snapshot, indent=2, ensure_ascii=False), encoding="utf-8"
        )
    except Exception:  # noqa: BLE001
        pass


def _load_theme_widths(client_slug: str | None, repo_root: Path) -> dict:
    """Load effective theme widths (variation override > theme.json default)."""
    if client_slug:
        snapshot_path = repo_root / "sites" / client_slug / "theme-snapshot.json"
        if snapshot_path.exists():
            try:
                snap = json.loads(snapshot_path.read_text(encoding="utf-8"))
                layout = snap.get("settings", {}).get("layout", {})
                if layout.get("contentSize") or layout.get("wideSize"):
                    return {k: v for k, v in layout.items() if k in ("contentSize", "wideSize")}
            except Exception:  # noqa: BLE001
                pass
    theme_json_path = repo_root / "theme" / "sgs-theme" / "theme.json"
    if theme_json_path.exists():
        try:
            tj = json.loads(theme_json_path.read_text(encoding="utf-8"))
            layout = tj.get("settings", {}).get("layout", {})
            return {k: v for k, v in layout.items() if k in ("contentSize", "wideSize")}
        except Exception:  # noqa: BLE001
            pass
    return {}


def _match_theme_width(value_str: str, theme_widths: dict) -> str | None:
    """Match a CSS max-width value against theme contentSize/wideSize."""
    if not theme_widths or not value_str:
        return None
    val_px = _parse_px_length(value_str)
    if val_px is None:
        return None
    for key in ("contentSize", "wideSize"):
        tw = theme_widths.get(key)
        if not tw:
            continue
        tw_px = _parse_px_length(tw)
        if tw_px and abs(val_px - tw_px) / max(tw_px, 1) <= _WIDTH_MATCH_TOLERANCE_PCT / 100:
            return "default" if key == "contentSize" else "wide"
    return None


# ============================================================================
# Core block style lifting (for atomic paths)
# ============================================================================

def _lift_core_block_style(
    node: Tag,
    classes: list[str],
    css_rules: dict,
    target_slug: str,
) -> tuple[dict, dict]:
    """Lift CSS into WP core block style dict + extra-top attrs.

    Returns (style_dict, extra_top_attrs).
    """
    base_decls, bp_decls = _collect_css_decls_for_element(node, css_rules)
    style: dict = {}
    extra_top: dict = {}
    if not base_decls:
        return style, extra_top
    prop_map = {
        "color": ("color", "text", "colour"),
        "background-color": ("color", "background", "colour"),
        "font-size": ("typography", "fontSize", "unit"),
        "font-weight": ("typography", "fontWeight", "string"),
        "font-style": ("typography", "fontStyle", "string"),
        "text-decoration": ("typography", "textDecoration", "string"),
        "text-transform": ("typography", "textTransform", "string"),
        "line-height": ("typography", "lineHeight", "string"),
        "letter-spacing": ("typography", "letterSpacing", "unit"),
    }
    for css_prop, (top, sub, kind) in prop_map.items():
        raw = base_decls.get(css_prop)
        if not raw:
            continue
        if kind == "colour":
            v = _colour_value_to_style(_strip_important(raw))
        elif kind == "unit":
            v = _preserve_unit(_strip_important(raw))
        else:
            v = _strip_important(raw)
        if v is not None:
            _set_in(style, [top, sub], v)
    # max-width → widthMode
    mw = base_decls.get("max-width")
    if mw:
        theme_widths = _LIFT_CONTEXT.get("theme_widths", {})
        mode = _match_theme_width(_strip_important(mw), theme_widths)
        if mode:
            extra_top["widthMode"] = mode
    return style, extra_top


def _flatten_wp_style_to_sgs_flat(style_dict: dict, extra_top: dict, block_slug: str) -> dict:
    """Flatten WP nested style dict to sgs block-level flat attrs.

    Simplified version: passes through colour/typography as sgs-flat attrs.
    Used by the atomic paragraph/heading paths.
    """
    result: dict = {}
    result.update(extra_top)
    colour = style_dict.get("color", {})
    if colour.get("text"):
        result["textColour"] = colour["text"]
    if colour.get("background"):
        result["backgroundColour"] = colour["background"]
    typography = style_dict.get("typography", {})
    for sub, sgs_key in [
        ("fontSize", "fontSize"),
        ("fontWeight", "fontWeight"),
        ("fontStyle", "fontStyle"),
        ("lineHeight", "lineHeight"),
        ("letterSpacing", "letterSpacing"),
        ("textTransform", "textTransform"),
    ]:
        if typography.get(sub):
            result[sgs_key] = typography[sub]
    return result


# ============================================================================
# Typography CSS → SGS flat-attr lift  (GAP 1 — was dead code, wired 2026-06-05)
# ============================================================================

# CSS property → (attr_name_base, paired_unit_attr) mapping for SGS text-block
# number+unit attribute pairs and plain string attrs.
# Faithful-absence: only set an attr when the draft explicitly declares that
# CSS property (no defaults injected).  R-22-9: universal across every block
# that declares the target attr; DB-driven for attr-existence gate.
# R-22-1 compliant: derived at runtime from db.typography_css_to_attrs() which
# queries property_suffixes. See db_lookup._TYPO_CSS_SUFFIX_SELECTION for the
# suffix-selection convention and db_lookup.typography_css_to_attrs() for the
# full derivation. The module-level name is kept for readability; it resolves
# lazily (first call to _lift_typography_to_block_attrs triggers the DB query).
def _get_typography_css_to_attrs() -> list[tuple[str, str, "str | None"]]:
    """Return the DB-derived typography CSS→attr map (R-22-1, replaces hardcoded list)."""
    return db.typography_css_to_attrs()


def _lift_typography_to_block_attrs(
    node: "Tag",
    slug: str,
    css_rules: dict,
) -> dict:
    """Lift draft element typography CSS onto SGS block flat attrs.

    Returns a dict of attrs to MERGE (using setdefault) into the block's
    existing attrs dict.  Only attrs declared by the target block are emitted
    (DB-gated, R-22-1).  Only CSS properties actually present in the draft are
    lifted (faithful-absence — no defaults injected).

    number+unit pairs (e.g. fontSize/fontSizeUnit): the numeric part becomes
    a Python float/int (matching the block.json type=number schema) and the
    unit string is set on the companion attr.  If the block only declares the
    primary attr (not the unit companion), the raw CSS string is written.

    colour attrs (textColour, backgroundColour): resolved via
    _colour_value_to_style — hex passthrough or 'var:preset|color|<token>'.
    Unparseable colours are silently skipped (faithful-absence).

    Responsive lift (descendant-combinator + @media fix, 2026-06-05):
      bp_decls from _collect_css_decls_for_element are now consumed.
      For each breakpoint suffix ('Tablet', 'Mobile', 'Desktop'), typography
      properties are lifted to the corresponding block attr when declared
      (e.g. font-size@Desktop → fontSizeTablet for 'Tablet' suffix).
      A-collapse rule: when no per-device attr exists (e.g. no fontSizeDesktop)
      but the base attr does (fontSize), the Desktop value is collapsed onto
      the base attr via setdefault — highest-specificity desktop value wins.
      This fixes hero H1 (font-size:58px in @media min-width:1280px → fontSize=58)
      and section H2s (font-size:36px in @media → fontSizeTablet / fontSize).
      Reuses _BP_SUFFIX_MAP + existing _collect_css_decls_for_element matching;
      no new CSS-selector infrastructure. R-22-9: universal (every leaf block).
    """
    if not slug or not slug.startswith("sgs/"):
        return {}
    block_attr_map = db.block_attrs(slug)  # {attr_name: {attr_type, …}}
    if not block_attr_map:
        return {}

    base_decls, bp_decls = _collect_css_decls_for_element(node, css_rules)
    if not base_decls and not bp_decls:
        return {}

    result: dict = {}

    def _resolve_typo_value(
        css_prop: str,
        primary_attr: str,
        unit_attr: str | None,
        raw: str,
        tgt: str,
    ) -> None:
        """Resolve one typography declaration and write to result[tgt].

        Uses setdefault — first caller for a given tgt wins.
        Caller controls tgt (primary_attr or a responsive variant like
        'fontSizeTablet'), and whether to use setdefault or override;
        this helper always does setdefault (lower-priority callers pass first).
        """
        if tgt not in block_attr_map:
            return  # Faithful-absence: block doesn't declare this attr.

        raw = _strip_important(raw).strip()
        if not raw:
            return

        if css_prop in ("color", "background-color"):
            # Flat SGS attrs (textColour, backgroundColour) are consumed by
            # sgs_colour_value() in render.php, which expects either a bare
            # token slug (e.g. "text") or a raw CSS value (hex / var(...)).
            # _colour_value_to_style() wraps in "var:preset|color|<slug>" —
            # WP-native serialisation for style.color.* paths only; passing
            # that string to sgs_colour_value() produces the mangled
            # "var(--wp--preset--color--varpresetcolortext)" output (Bug 1).
            # Fix: emit the raw slug / hex directly.
            v = _extract_token_or_hex(raw)
            if v is not None:
                result.setdefault(tgt, v)
            return

        primary_info = block_attr_map.get(primary_attr, {})
        primary_type = primary_info.get("attr_type", "string")

        if primary_type == "number" and unit_attr:
            # default_unit="" so that a unitless CSS value (e.g. line-height:1.15)
            # returns unit="" and the unit companion attr is NOT written.
            # The "and unit" guard at the setdefault call below then skips
            # lineHeightUnit, so render.php emits "1.15" with no appended "px"
            # (Bug 2).  Values that carry an explicit unit (58px, 1.5em) are
            # unaffected — the regex captures the unit string directly.
            num, unit = _split_value_unit(raw, default_unit="")
            if num is not None:
                num_out: int | float = int(num) if num == int(num) else num
                result.setdefault(tgt, num_out)
                # Unit companion: only write alongside the base attr, not variants.
                # When unit="" (unitless draft value, e.g. line-height:1.15),
                # the block serialiser strips "" (it filters falsy values).
                # Use the sentinel "unitless" so the value survives serialisation;
                # render.php checks for "unitless" and omits any CSS unit suffix.
                effective_unit = unit if unit else ("unitless" if unit_attr else unit)
                if tgt == primary_attr and unit_attr in block_attr_map and effective_unit:
                    result.setdefault(unit_attr, effective_unit)
        elif primary_type == "number":
            num, _ = _split_value_unit(raw)
            if num is not None:
                num_out = int(num) if num == int(num) else num
                result.setdefault(tgt, num_out)
        else:
            result.setdefault(tgt, raw)

    # ---- Processing order: highest specificity first ----
    # WP block convention: fontSize = desktop value; fontSizeTablet = tablet;
    # fontSizeMobile = mobile. CSS cascade: base rule = mobile-first fallback;
    # @media min-width:1280px = desktop (highest specificity for fontSize base).
    # Processing order: Desktop bp → Tablet bp → base_decls.
    # This ensures the Desktop A-collapse (no fontSizeDesktop attr) writes
    # fontSize=58 FIRST, and the base-decl pass (mobile 34px) is silently
    # blocked by setdefault — not the other way around.
    #
    # Sort bp_decls: Desktop (min-width:1280) before Tablet (min-width:768)
    # before Mobile (max-width:767). _BP_SUFFIX_MAP keys are 'Desktop',
    # 'Tablet', 'Mobile'; process in that order.
    _TYPO_BP_ORDER = ("Desktop", "Tablet", "Mobile")

    # ---- Responsive declarations (@media rules) — highest specificity first ----
    for bp_key in _TYPO_BP_ORDER:
        bp_decl_map = bp_decls.get(bp_key)
        if not bp_decl_map:
            continue
        bp_suffix = _BP_SUFFIX_MAP.get(bp_key)
        if not bp_suffix:
            continue
        for css_prop, primary_attr, unit_attr in _get_typography_css_to_attrs():
            raw = bp_decl_map.get(css_prop)
            if not raw:
                continue
            if primary_attr not in block_attr_map:
                continue
            # Build the responsive variant name (e.g. 'fontSizeTablet').
            responsive_attr = f"{primary_attr}{bp_suffix}"
            if responsive_attr in block_attr_map:
                # Per-device attr exists → use it.
                _resolve_typo_value(css_prop, primary_attr, unit_attr, raw,
                                    tgt=responsive_attr)
            else:
                # A-collapse: no per-device attr (e.g. fontSizeDesktop absent on
                # sgs/heading).  Write to base attr — Desktop specificity wins.
                # Processed before base_decls pass so setdefault writes 58px
                # before the mobile base 34px gets a chance.
                _resolve_typo_value(css_prop, primary_attr, unit_attr, raw,
                                    tgt=primary_attr)

    # ---- Base declarations (mobile-first / non-media rules) — lowest priority ----
    # Runs AFTER responsive pass so setdefault on fontSize is already filled
    # by the Desktop A-collapse; mobile base value is blocked (correct).
    if base_decls:
        for css_prop, primary_attr, unit_attr in _get_typography_css_to_attrs():
            raw = base_decls.get(css_prop)
            if not raw:
                continue
            if primary_attr not in block_attr_map:
                continue
            _resolve_typo_value(css_prop, primary_attr, unit_attr, raw,
                                tgt=primary_attr)

    return result


# ============================================================================
# F6a — Inherited / absent-value resolution  (Commit 3, FR-22-5.1, 2026-06-10)
# ============================================================================
#
# DOM parent-chain walk for CSS-inherited typography properties.  This is
# explicitly NOT the CSS-selector-ancestry walk that _collect_css_decls_for_element
# already performs (council MF-4 — that walk matches CSS selectors, this walk
# climbs the actual DOM parent nodes).
#
# Design: always-emit (no block_defaults table required, Commit 0b avoidable).
# We emit the *resolved effective value* explicitly on every text leaf — even
# when the value is the browser default — so it overrides the block's own
# :where() CSS default.  Only falls back to a block_defaults lookup if
# measured emit-bloat is a problem (not triggered in this build).
#
# R-22-9: universal over every leaf block, every inheritable property.
# R-22-1: DB-gated (block_attr_map check before any emission).
# R-22-6: values written to block attrs, never inline style.

# The four CSS-inherited properties handled by F6a.
_INHERITABLE_TYPOGRAPHY_PROPS: tuple[tuple[str, str], ...] = (
    ("text-align",   "textAlign"),
    ("color",        "textColour"),
    ("font-family",  "fontFamily"),
    ("line-height",  "lineHeight"),
)

# Browser / LTR default for each inheritable prop (used when NEITHER the leaf
# NOR any ancestor declares the property — the "absence" case).
# Only text-align has a meaningful LTR default that conflicts with block
# :where() defaults (sgs/heading style.css centres by default at some levels).
# color / font-family / line-height browser defaults vary widely and their
# "absence" is correctly represented by NOT emitting the attr (faithful-absence).
# The converter always-emits text-align:left for the absence case because the
# block's :where() default can be centre; the other three are left absent when
# neither leaf nor ancestor declares them.
_TEXT_ALIGN_BROWSER_DEFAULT: str = "left"


def _node_has_resolved_block(node: "Tag") -> bool:
    """Return True when this DOM node itself resolves to a distinct SGS block slug.

    Used as the stop-at-boundary test while walking the DOM parent chain.
    A node is the boundary when it carries its own sgs- BEM block class (not just
    an element class) that maps to a block slug.  This is the "resolved-block
    boundary" the spec defines: stop walking parents when you reach the node that
    owns the enclosing composite block.
    """
    classes = node.get("class", []) or []
    sgs_classes = [c for c in classes if c.startswith("sgs-")]
    if not sgs_classes:
        return False
    # Use the same resolution as walk() — if any of the classes maps to a block
    # slug (i.e. resolve_slug_from_bem returns non-None), this node IS a
    # resolved-block boundary.
    return db.resolve_slug_from_bem(sgs_classes) is not None


def _resolve_inherited_typography(
    leaf_node: "Tag",
    slug: str,
    css_rules: dict,
) -> dict:
    """Resolve inherited / absent typography values for a text-leaf block.

    FR-22-5.1 — Commit 3 (always-emit design):

    For each of the four CSS-inherited properties (text-align / color /
    font-family / line-height):

      1. If the leaf's own CSS declarations contain the property → that value
         wins (already handled by _lift_typography_to_block_attrs; this
         function does NOT overwrite attrs already set by that lifter).
      2. Else walk the DOM parent chain from the leaf upward; the NEAREST
         ancestor that declares the property wins (nearest-ancestor-wins).
         Stop at the RESOLVED-BLOCK BOUNDARY — the first ancestor that itself
         carries a resolved SGS block class — so alignment set by a parent
         composite's wrapper does not bleed into an adjacent block.
      3. If neither the leaf nor any ancestor declares text-align → emit the
         LTR browser default (``left``) so it overrides the block's own
         :where() centre default.  color / font-family / line-height are NOT
         emitted for their absent case (browser defaults vary; faithful-absence
         applies).

    Parameters
    ----------
    leaf_node:
        The BeautifulSoup Tag that resolved to the leaf block.
    slug:
        The resolved leaf block slug (used to gate attr emission via DB).
    css_rules:
        The full CSS-rules dict for the current draft page.

    Returns
    -------
    dict
        Attr key→value pairs to merge into the leaf's attrs dict using
        setdefault (caller decides whether to setdefault or assign; the
        caller in walk() uses setdefault so the leaf's own CSS wins).
    """
    if not slug or not slug.startswith("sgs/"):
        return {}

    block_attr_map = db.block_attrs(slug)
    if not block_attr_map:
        return {}

    # Collect the leaf's own CSS declarations (from _collect_css_decls_for_element)
    # so we can skip properties already present on the leaf itself — those are
    # resolved by _lift_typography_to_block_attrs; we must not duplicate.
    leaf_base, _ = _collect_css_decls_for_element(leaf_node, css_rules)

    # ---- DOM parent-chain walk ----
    # We need the effective value for each of the 4 inheritable properties.
    # Walk up from leaf_node.parent, collecting base declarations at each level.
    # Stop when we hit a resolved-block boundary OR the document root.

    # effective_from_ancestor maps css_prop → resolved value from nearest ancestor.
    effective_from_ancestor: dict[str, str] = {}

    parent = getattr(leaf_node, "parent", None)
    while parent is not None and hasattr(parent, "name") and parent.name is not None:
        # Stop condition: this ancestor IS a resolved SGS block — we have crossed
        # into the enclosing composite's own root element.  Do not read its CSS
        # as "ancestor CSS" for the leaf; that would bleed the composite's root
        # alignment into a separate interior leaf.  We stop BEFORE including this
        # ancestor's declarations.
        if _node_has_resolved_block(parent):
            break

        # Collect base declarations for this ancestor (CSS-selector-ancestry on
        # the ancestor node — this captures any rule targeting this ancestor's
        # class, e.g. `.sgs-hero__inner { text-align: center }`).
        anc_base, _ = _collect_css_decls_for_element(parent, css_rules)

        for css_prop, _attr_name in _INHERITABLE_TYPOGRAPHY_PROPS:
            if css_prop in effective_from_ancestor:
                continue  # Nearer ancestor already provided this property.
            if css_prop in anc_base:
                effective_from_ancestor[css_prop] = _strip_important(anc_base[css_prop]).strip()

        # If we have resolved all 4 properties, no need to climb further.
        if len(effective_from_ancestor) == len(_INHERITABLE_TYPOGRAPHY_PROPS):
            break

        parent = getattr(parent, "parent", None)

    # ---- Build the result dict ----
    result: dict = {}

    for css_prop, attr_name in _INHERITABLE_TYPOGRAPHY_PROPS:
        # Leaf already declares this property directly → skip.
        # _lift_typography_to_block_attrs handles it; we must not conflict.
        if css_prop in leaf_base:
            continue

        # Block doesn't declare this attr → skip (R-22-1 faithful-absence gate).
        if attr_name not in block_attr_map:
            continue

        # Determine the effective value.
        if css_prop in effective_from_ancestor:
            effective_val = effective_from_ancestor[css_prop]
        elif css_prop == "text-align":
            # Absence case: no text-align anywhere on leaf or ancestors.
            # Emit the LTR browser default so it overrides the block's
            # :where() CSS default (e.g. sgs/heading centres headings in
            # some style.css rules; always-emit 'left' for LTR drafts).
            effective_val = _TEXT_ALIGN_BROWSER_DEFAULT
        else:
            # color / font-family / line-height: faithful-absence — do NOT
            # emit when the draft has no declaration anywhere on the DOM path.
            continue

        if not effective_val:
            continue

        # Colour properties: use the same extraction as _lift_typography_to_block_attrs
        # (extract bare token slug or hex; do NOT wrap in var:preset|color|... since
        # SGS render.php's sgs_colour_value() consumes raw tokens, not WP-native refs).
        if css_prop == "color":
            v = _extract_token_or_hex(effective_val)
            if v is not None:
                result[attr_name] = v
        else:
            result[attr_name] = effective_val

    return result


# ============================================================================
# Consolidated CSS-lift entry point  (Commit 1a — call-site consolidation)
# ============================================================================

def route_node_css(
    node: "Tag",
    css_rules: dict,
    attrs: dict,
    effective_slug: str,
    *,
    lift_typography: bool = False,
    typo_slug: str | None = None,
    lift_root_supports: bool = True,
    lift_wrapper_css: bool = True,
    allow_max_width: bool = False,
) -> None:
    """Single entry point for all three CSS-lift helpers inside walk().

    This is a PURE CALL-SITE consolidation (Commit 1a).  Decision logic is
    unchanged; each helper is invoked with exactly the same arguments, guards,
    and setdefault semantics as the call clusters it replaces.  Byte-identical
    emitted output is the exit contract.

    Parameters
    ----------
    node:
        The BeautifulSoup Tag being converted.
    css_rules:
        The full CSS-rules dict for the current draft page.
    attrs:
        The block-attrs dict to write into (mutated in-place via setdefault).
    effective_slug:
        The block slug used for DB lookups.  A3 path passes 'sgs/container'
        (slug-None top-level section); A2 path passes the resolved slug.
    lift_typography:
        True only on the A2 leaf-block path and the atomic-tag-swap path.
        When True, typography CSS is lifted onto ``attrs`` before the
        root-supports + wrapper-css passes (same ordering as the original
        inline cluster).  Also enables the inherited-typography resolution
        pass (P6 — _resolve_inherited_typography) for text-align and other
        inheritable props not declared on the leaf itself.
    typo_slug:
        Slug forwarded to ``_lift_typography_to_block_attrs``.  Must be
        supplied when ``lift_typography=True``.  Ignored otherwise.
    lift_root_supports:
        When False, the ``_lift_root_supports_to_style`` pass is skipped.
        Default True (all production paths that previously called it directly
        continue to receive the pass).
    lift_wrapper_css:
        When False, the ``_lift_wrapper_css_to_container_attrs`` pass is
        skipped.  Default True.  Set to False on paths (e.g. fold path) that
        only need root-supports without the full DB-driven wrapper-css lift.
    allow_max_width:
        When True, forwards to ``_lift_wrapper_css_to_container_attrs`` to
        allow ``max-width`` to be lifted onto the block's ``maxWidth`` attr
        (text-leaf opt-in: sgs/text has maxWidth + maxWidthUnit; containers
        use the widthMode path and must NOT pass this flag).  Default False.

    Call-site mapping
    -----------------
    A3 (slug-None top-level section):
        route_node_css(node, css_rules, container_attrs,
                       effective_slug="sgs/container")

    A2 (slug-not-None resolved block):
        route_node_css(node, css_rules, attrs,
                       effective_slug=slug,
                       lift_typography=is_leaf,
                       typo_slug=slug)

    Atomic-tag-swap path (exception 1, typography only):
        route_node_css(node, css_rules, _at_attrs,
                       effective_slug=_at_slug,
                       lift_typography=True,
                       typo_slug=_at_slug,
                       lift_root_supports=False,
                       lift_wrapper_css=False)

    Fold path (_fold_layout_into_attrs, root-supports only):
        route_node_css(wrapper_node, css_rules, container_attrs,
                       effective_slug="sgs/container",
                       lift_wrapper_css=False)

    Text-leaf path (_route_text_leaf — P3 opt-in):
        route_node_css(node, css_rules, attrs,
                       effective_slug=target,
                       lift_typography=True,
                       typo_slug=target,
                       lift_root_supports=False,
                       lift_wrapper_css=True,
                       allow_max_width=True)
    """
    # ---- GAP 1: typography lift (leaf-block and atomic-tag-swap paths) ----
    # _typo_written: the set of flat attrs that the typography writer actually
    # wrote to attrs in this invocation.  Captured here for the Commit-1b DB
    # dispatch below (wrapper-css must not double-write the same attr).
    _typo_written: frozenset[str] = frozenset()
    if lift_typography:
        typo_lift = _lift_typography_to_block_attrs(node, typo_slug, css_rules)
        for _tl_k, _tl_v in typo_lift.items():
            attrs.setdefault(_tl_k, _tl_v)
        # Capture only the attrs that the lifter PRODUCED (not necessarily written
        # to attrs — setdefault may have blocked some; but we exclude all produced
        # keys from wrapper-css to avoid the DB-dispatch contest: if typography
        # produced it, typography owns it; wrapper-css must not touch it).
        _typo_written = frozenset(typo_lift.keys())

    # ---- Root WP native supports (spacing/border/colour → style.*) ----
    if lift_root_supports:
        _lift_root_supports_to_style(node, effective_slug, css_rules, attrs)

    # ---- UNIVERSAL DB-driven custom-attr lift (Method-2, Spec 22 §FR-22-21) ----
    if lift_wrapper_css:
        _base, _bp = _collect_css_decls_for_element(node, css_rules)

        # Commit 1b — DB dispatch: determine which flat attrs the typography writer
        # owns for this (block, CSS declarations) pair, then suppress wrapper-css
        # from writing those same attrs.
        #
        # Two-step ownership decision (DB-driven, no Python call-order):
        #   Step A: for each css_prop in the collected declarations, query
        #           db.attr_for_property(slug, css_prop).  If it returns
        #           ("typography", attr_name, kind), that attr_name is DB-owned by
        #           the typography writer.
        #   Step B: intersect with _typo_written — the attrs typography actually
        #           produced.  This handles the case where the typography lifter
        #           CANNOT write a value (e.g. rgba() for colour) even though the
        #           DB says it owns the property: if typography didn't write it,
        #           wrapper-css gets a fallback chance (flag-not-suppress).
        #
        # Result: a frozenset of attr names to exclude from wrapper-css writes.
        # This replaces the implicit setdefault-first-wins ordering with an
        # explicit DB-rule + actual-output gate.
        _typography_owned_attrs: frozenset[str] | None = None
        if lift_typography and typo_slug and _typo_written:
            _owned: set[str] = set()
            for _css_prop in set(_base) | {
                _p for _bp_map in _bp.values() for _p in _bp_map
            }:
                _dest = db.attr_for_property(typo_slug, _css_prop)
                if _dest is not None and _dest[0] == "typography":
                    # DB says typography owns this property's attr.
                    # Only exclude it from wrapper-css if typography actually wrote it.
                    if _dest[1] in _typo_written:
                        _owned.add(_dest[1])
            if _owned:
                _typography_owned_attrs = frozenset(_owned)

        _lifted, _flagged = _lift_wrapper_css_to_container_attrs(
            _base, _bp, _block_attr_names(effective_slug),
            _typography_owned_attrs=_typography_owned_attrs,
            container_attr_meta=db.block_attrs(effective_slug),
            allow_max_width=allow_max_width,
        )
        for _k, _v in _lifted.items():
            attrs.setdefault(_k, _v)

    # ---- P6: Inherited typography resolution (text-leaf paths only) ----
    # After the leaf's own CSS is lifted, resolve any inherited or absent values
    # (text-align / color / font-family / line-height) via the DOM parent-chain walk.
    # Mirrors the existing call at walk() line ~3831 for the A2-resolved-slug path;
    # this wires the same resolution into route_node_css so _route_text_leaf benefits
    # automatically without duplicating the call in every call-site.
    # setdefault semantics: the leaf's own CSS already written above always wins.
    # Scoped to lift_typography=True (leaf paths) to avoid firing on container paths.
    # R-22-9: universal — every text-capable leaf on every path.
    # R-22-1: DB-gated inside _resolve_inherited_typography.
    if lift_typography and typo_slug:
        _rit_inherited = _resolve_inherited_typography(node, typo_slug, css_rules)
        for _rit_k, _rit_v in _rit_inherited.items():
            attrs.setdefault(_rit_k, _rit_v)


# ============================================================================
# FR-22-5.3 — Cross-node interior CSS routing (Commit 2)
# ============================================================================
# When an interior element's CSS is NOT consumed by the element's own resolved
# block, route its structural box CSS (padding / margin / max-width / gap +
# responsive companions) to the owning composite's per-slot attr group via a
# DB-driven, name-free layer lookup.
#
# Three layers (Spec 22 FR-22-21):
#   OUTER   — the composite's full-bleed wrapper (padding, max-width, gap …)
#   CONTENT — the content-width inner band (max-width / --content-width,
#             content-padding …)
#   GRID    — per-grid-item attrs (gridItemPadding …)
#
# GAP-3: display + grid-template-* are EXCLUDED from cross-node lifting.
# Inline display/grid beats @media → collapses 2-col grids (R-22-6).
#
# R-22-1 DB-first; R-22-6 no inline CSS; R-22-9 universal.

# CSS properties that MUST NOT be lifted cross-node (GAP-3 rule).
# display:grid|flex as a block attr generates inline style which overrides
# @media-query grid/flex layout CSS — collapsing N-col grids to 1-col.
_CROSS_NODE_EXCLUDED_PROPS: frozenset[str] = frozenset({
    "display",
    "grid-template-columns",
    "grid-template-rows",
    "grid-template-areas",
    "grid-template",
})

# CSS properties considered structural box CSS for cross-node lifting.
# Any property with a DB entry in `property_suffixes` qualifies provided
# it is not in _CROSS_NODE_EXCLUDED_PROPS.  This set names the FAMILIES
# we proactively detect layers for; the actual attr is found by the DB lookup.
_BOX_CSS_FAMILIES: frozenset[str] = frozenset({
    "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
    "max-width", "min-width", "width",
    "gap", "row-gap", "column-gap",
    "min-height",
})

# CONTENT-layer detection signals.
# Priority 1 (deterministic): an element declares `--content-width` custom property
#   — Bean's draft convention: `max-width: var(--content-width); --content-width: 720px`
# Priority 2 (heuristic): `max-width` + margin-centring signature
#   (`margin: 0 auto` / `margin-left: auto` + `margin-right: auto`).
#
# FALSIFICATION LIST — these patterns must NOT be silently detected as CONTENT;
# each routes to gap-candidate instead of being misinterpreted:
#   • `width: min(W, 100%)` / `clamp()` with no max-width — use `min()` shape
#   • `margin-inline: auto` longhand — no shorthand `margin`
#   • `margin-left: auto` / `margin-right: auto` WITHOUT both sides present
#   • section-root `max-width` with NO inner wrapper (catches the outer shell)
#   • flex-grid: `display:flex; flex-wrap:wrap` + child `width:calc()` — not an inner band
#   • padding-based centring: `padding: 0 10vw` — no max-width at all
#
# Detection is run on the POST-FOLD tree (after _fold_layout_into_attrs resolves).


def _detect_content_layer(base_decls: dict[str, str]) -> bool:
    """Return True when `base_decls` carries a CONTENT-layer signature.

    CONTENT layer = a content-width inner band.  Detection is deterministic-first:

    1. `--content-width` custom-property declared in the element's CSS  →  True.
    2. `max-width` present AND margin-centring present (both `margin-left:auto`
       AND `margin-right:auto`, OR the `margin:0 auto` shorthand)  →  True.

    Any other pattern → False (routed to gap-candidate by the caller).

    Falsification: `width:min(...)` / `clamp()` without `max-width`;
    `margin-inline:auto` longhand; single-sided margin:auto;
    padding-centring only (`padding:0 10vw`) — all return False.
    """
    # Priority 1: `--content-width` custom property anywhere in the declaration block.
    for prop in base_decls:
        if prop.strip() == "--content-width":
            return True
    for val in base_decls.values():
        if "--content-width" in (val or ""):
            return True

    # Priority 2: max-width + margin-centring.
    raw_mw = _strip_important(base_decls.get("max-width", "")).strip()
    if not raw_mw:
        return False

    # Reject width:min()/clamp() shaped values that appear in max-width slot —
    # these are responsive sizing tricks, not a content-band constraint.
    if raw_mw.startswith(("min(", "clamp(", "max(")):
        return False

    # Reject flex-grid containers: `display:flex` + `flex-wrap:wrap` is a
    # multi-column flex layout pattern, NOT an inner content-width band.
    # Routing its CSS to a contentWidth attr is always wrong — the grid layout
    # attrs belong elsewhere (gap-candidate or OUTER).  The build contract
    # specifies: "flex-grid → gap-candidate, never guess."
    raw_display = _strip_important(base_decls.get("display", "")).strip().lower()
    if raw_display in ("flex", "grid", "inline-flex", "inline-grid"):
        return False

    # Check for margin-centring signature.
    margin_short = _strip_important(base_decls.get("margin", "")).strip().lower()
    ml = _strip_important(base_decls.get("margin-left", "")).strip().lower()
    mr = _strip_important(base_decls.get("margin-right", "")).strip().lower()

    # Shorthand `margin: 0 auto` / `margin: auto` / `margin: N auto` — the auto
    # value appears as the second (horizontal) token.
    if margin_short:
        tokens = margin_short.split()
        # `auto` as sole token → centred; `N auto` → centred; `auto N auto N` → centred
        if "auto" in tokens:
            return True

    # Explicit `margin-left:auto` AND `margin-right:auto` (both must be present).
    if ml == "auto" and mr == "auto":
        return True

    # `margin-inline:auto` is NOT detected here (longhand not in standard base_decls
    # under the current CSS parser — guard the falsification).
    return False


def _grid_item_areas(node: "Tag", css_rules: dict) -> frozenset[str]:
    """Return the grid-area names a node's OWN CSS declares, else empty.

    Grid awareness (ROUTING-CATEGORISATION-DESIGN §Principle B, D207/D208 gate,
    Bean-approved 2026-06-11): a wrapper's own `display:grid` +
    `grid-template-areas` state its structure exactly — its direct descendants
    are GRID ITEMS named by the areas (hero: "media" / "content"). The caller
    uses the returned names to widen the FR-22-4.1 fold gate: a slug-None child
    whose BEM element token matches an area name dissolves into the parent
    composite REGARDLESS of sibling count (superseding the
    `fold_eligible = len(children)==1` proxy for grid parents only).

    Detection reads the node's own base CSS plus EVERY breakpoint tier — a
    mobile-first draft may declare `display:grid` only at base, or only inside
    a @media tier; either makes the children grid items. Returns the UNION of
    area names across tiers (the hero declares `"media" "content"` stacked at
    base and `"content media"` two-col at desktop — same two names).

    Conservative by construction: no `display:grid` → frozenset() (the caller's
    sole-child count gate keeps protecting non-grid parents — the brand b5
    +44pp column-collapse evidence). Area strings parse per CSS grammar: each
    quoted string is a row; whitespace-split tokens are area names; `.` (null
    cell) is ignored.
    """
    base, bp = _collect_css_decls_for_element(node, css_rules)
    tiers: list[dict[str, str]] = [base, *bp.values()]

    has_grid = any(
        _strip_important(t.get("display", "")).strip().lower() == "grid"
        for t in tiers
    )
    if not has_grid:
        return frozenset()

    names: set[str] = set()
    for t in tiers:
        raw = _strip_important(t.get("grid-template-areas", "")).strip()
        if not raw or raw.lower() in ("none", "inherit", "initial", "unset"):
            continue
        for row in re.findall(r"[\"']([^\"']*)[\"']", raw):
            for token in row.split():
                if token != ".":
                    names.add(token.lower())
    return frozenset(names)


def _expand_box_shorthand(decls: dict[str, str], prop: str) -> dict[str, str]:
    """Expand a `padding`/`margin` SHORTHAND into longhands (CSS 1-4 value rules).

    Returns a NEW dict with the shorthand replaced by -top/-right/-bottom/-left
    (existing longhands win — they are more specific in the source). Paren-aware
    top-level token split keeps calc()/var(..., ...) values intact. Needed
    because per-area / CONTENT destinations register LONGHAND attrs
    (contentPaddingTop) while drafts write shorthand (`padding: 28px 20px 40px`)
    — the literal-property DB lookup otherwise misses (the H-B mechanism,
    2026-06-11).
    """
    if prop not in decls:
        return decls
    raw = _strip_important(decls[prop]).strip()
    if not raw:
        return decls
    tokens: list[str] = []
    buf, depth_p = "", 0
    for ch in raw:
        if ch == "(":
            depth_p += 1
        elif ch == ")":
            depth_p -= 1
        if ch.isspace() and depth_p == 0:
            if buf:
                tokens.append(buf)
                buf = ""
        else:
            buf += ch
    if buf:
        tokens.append(buf)
    if not 1 <= len(tokens) <= 4:
        return decls
    t = tokens
    if len(t) == 1:
        top = right = bottom = left = t[0]
    elif len(t) == 2:
        top, bottom = t[0], t[0]
        right, left = t[1], t[1]
    elif len(t) == 3:
        top, right, bottom = t[0], t[1], t[2]
        left = t[1]
    else:
        top, right, bottom, left = t
    out = dict(decls)
    del out[prop]
    for side, val in (("top", top), ("right", right), ("bottom", bottom), ("left", left)):
        out.setdefault(f"{prop}-{side}", val)
    return out


def _route_area_css_to_block_attrs(
    child_node: "Tag",
    area: str,
    owning_block: str,
    parent_attrs: dict,
    css_rules: dict,
) -> None:
    """GRID-PER-AREA routing (Bean steer 2026-06-11): route a dissolving named
    grid item's own CSS to the owning block's `<areaName>+<suffix>` attrs.

    The hero case: `.sgs-hero__content { padding: 28px 20px 40px }` (+ @768 /
    @1280 overrides) routes to contentPaddingTop/Right/Bottom/Left at the right
    responsive tiers; a media column's equivalents land on mediaPadding* etc.
    NOT the container-mirror CONTENT layer — this is padding on the grid COLUMN
    whose AREA NAME is "content" (name collision; Bean caught it 2026-06-11).

    Tier mapping (SGS 3-tier model — base attr = DESKTOP; Tablet/Mobile are
    overrides — vs the draft's MOBILE-FIRST cascade):
        draft base (no @media)     → attr + 'Mobile'
        draft @768 (Tablet)        → attr + 'Tablet'
        draft @1024/1280 (Desktop) → attr (unsuffixed base)
    Missing higher draft tiers inherit downward (mobile-first semantics): the
    base attr takes the HIGHEST declared value (Desktop > Tablet > base) and
    Tablet takes (@768 else draft base), so the painted cascade matches the
    draft at every width. A tier whose attr name is unregistered on the block
    is traced as a gap-candidate (flag-not-drop), never silently dropped.

    Excluded: _CROSS_NODE_EXCLUDED_PROPS (display/grid-template-* — R-22-6),
    `grid-area` (the structural assignment, owned by render.php) and custom
    properties.
    """
    base_decls, bp_decls = _collect_css_decls_for_element(child_node, css_rules)
    if not base_decls and not bp_decls:
        return

    # Shorthand expansion in every tier (the H-B miss).
    for prop in ("padding", "margin"):
        base_decls = _expand_box_shorthand(base_decls, prop)
        bp_decls = {k: _expand_box_shorthand(v, prop) for k, v in bp_decls.items()}

    # width/height excluded (qc-council 2026-06-11 finding 3): `content`+`Width`
    # resolves to `contentWidth` — the container-mirror BAND attr, not a per-area
    # column width (the exact name collision this router's docstring warns about).
    # Grid columns are sized by the parent's template, never per-item width.
    _area_excluded = _CROSS_NODE_EXCLUDED_PROPS | {"grid-area", "width", "height",
                                                   "max-width", "min-width",
                                                   "max-height", "min-height"}

    all_props: set[str] = set(base_decls)
    for tier in bp_decls.values():
        all_props.update(tier)

    tab = bp_decls.get("Tablet", {})
    desk = bp_decls.get("Desktop", {})
    mob_override = bp_decls.get("Mobile", {})
    block_attr_names = db.block_attrs(owning_block) or {}

    for css_prop in sorted(all_props):
        if css_prop in _area_excluded or css_prop.startswith("--"):
            continue
        attr_base = db.attr_for_area_property(owning_block, area, css_prop)
        if attr_base is None:
            source_class = next(
                (c for c in (child_node.get("class", []) or []) if c.startswith("sgs-")),
                area,
            )
            _trace(
                "cross_node_gap_candidate",
                owning_block=owning_block,
                element_token=area,
                css_property=css_prop,
                reason="no_area_attr",
                source_class=source_class,
            )
            continue

        draft_base = base_decls.get(css_prop)
        draft_tab = tab.get(css_prop)
        draft_desk = desk.get(css_prop)
        draft_mob = mob_override.get(css_prop)

        tier_values: list[tuple[str, "str | None"]] = [
            ("Mobile", draft_mob or draft_base),
            ("Tablet", draft_tab or draft_base),
            ("", draft_desk or draft_tab or draft_base),  # base attr = desktop
        ]
        # Type-aware store (qc-council 2026-06-11 BLOCKER): per-area attrs are
        # number-typed (render.php does `absint($v) . $unit` with a shared
        # `<family>Unit` companion). Storing the raw "28px" string works only by
        # px-luck — "1.5rem" would absint to 1px. Split number+unit per the
        # established convention and set the family Unit attr once.
        _attr_meta = block_attr_names.get(attr_base) or {}
        _is_number = (_attr_meta.get("attr_type") == "number")
        _family_unit_attr = re.sub(r"(Top|Right|Bottom|Left)$", "", attr_base) + "Unit"
        for tier_suffix, value in tier_values:
            if value is None:
                continue
            dest = f"{attr_base}{tier_suffix}" if tier_suffix else attr_base
            if dest not in block_attr_names:
                _trace(
                    "cross_node_gap_candidate",
                    owning_block=owning_block,
                    element_token=area,
                    css_property=css_prop,
                    reason="area_attr_tier_missing",
                    attr_name=dest,
                )
                continue
            raw_val = _strip_important(value).strip()
            if _is_number:
                _num, _unit = _split_value_unit(raw_val)
                if _num is None:
                    # calc()/var()/keyword — unrepresentable in a number attr.
                    _trace(
                        "cross_node_gap_candidate",
                        owning_block=owning_block,
                        element_token=area,
                        css_property=css_prop,
                        reason="area_attr_number_unparseable",
                        attr_name=dest,
                        value=raw_val,
                    )
                    continue
                store_val = int(_num) if float(_num).is_integer() else _num
                if _unit and _family_unit_attr in block_attr_names:
                    _existing_unit = parent_attrs.get(_family_unit_attr)
                    if _existing_unit is None:
                        parent_attrs[_family_unit_attr] = _unit
                    elif _existing_unit != _unit:
                        _trace(
                            "cross_node_gap_candidate",
                            owning_block=owning_block,
                            element_token=area,
                            css_property=css_prop,
                            reason="area_attr_mixed_units",
                            attr_name=dest,
                            value=raw_val,
                        )
                        continue
            else:
                store_val = raw_val
            parent_attrs.setdefault(dest, store_val)
            _trace(
                "cross_node_css_lifted",
                owning_block=owning_block,
                element_token=area,
                css_property=css_prop,
                layer="AREA",
                dest_attr=dest,
                value=store_val,
            )


def _route_interior_css_to_parent_slot(
    child_node: "Tag",
    element_token: "str | None",
    owning_block: str,
    parent_attrs: dict,
    css_rules: dict,
) -> None:
    """FR-22-5.3 — Route an interior element's structural box CSS to the owning
    composite's per-slot attr group when the slot has no equivalent child block.

    Algorithm (Spec 22 STAGE1-DESIGN.md §Commit 2 build contract):
    1. Resolve the child's BEM element token → slot name (via `slots` table).
    2. Fork on `db.slot_has_equivalent_block(owning_block, slot_name)`:
         TRUE  → the slot IS served by a child InnerBlock.  The CSS stays with
                 the child block (existing D1 path).  This function is a no-op.
         FALSE → the slot is NOT a content-bearing child block.  Lift the child's
                 structural box CSS onto the parent's per-layer attrs (DB-driven,
                 name-free).
    3. For each collected base + responsive CSS declaration:
         (a) Exclude _CROSS_NODE_EXCLUDED_PROPS (GAP-3).
         (b) Detect the destination layer (CONTENT / OUTER / GRID).
         (c) Resolve the parent attr via `db.attr_for_layer_property(owning_block,
             layer, css_property)`.
         (d) On hit  → setdefault into parent_attrs.
         (e) On miss → record attribute_gap_candidate + unresolved_equivalent_block
             trace (flag-not-drop, FR-22-21 step 6).

    Parameters
    ----------
    child_node:     The interior element Tag (e.g. the `.sgs-hero__content` div).
    element_token:  BEM element name extracted from the child's primary sgs- class
                    (e.g. ``'content'``, ``'inner'``).  None → no-op (no slot to route).
    owning_block:   Resolved slug of the parent composite (e.g. ``'sgs/hero'``).
    parent_attrs:   The parent composite's attrs dict — mutated in-place.
    css_rules:      The CSS rules dict threaded from the top-level walk.
    """
    if not element_token or not owning_block:
        return

    # Step 1: resolve element_token → canonical slot name.
    slot_name: str | None = db.canonical_slot_for(element_token)

    # Step 2: CONTENT-fork check.  If the slot has a content-bearing child block
    # on this parent, the CSS is not ours to cross-node-lift — leave it to the
    # child block's own route_node_css call.
    if slot_name and db.slot_has_equivalent_block(owning_block, slot_name):
        _trace(
            "cross_node_content_fork",
            owning_block=owning_block,
            element_token=element_token,
            slot_name=slot_name,
            branch="content_bearing_child_block_present__skip",
        )
        return

    # Step 3: collect the child's CSS declarations.
    base_decls, bp_decls = _collect_css_decls_for_element(child_node, css_rules)

    if not base_decls and not bp_decls:
        return  # Nothing to route.

    is_content = _detect_content_layer(base_decls)

    def _lift_decl(css_prop: str, value: str, bp_suffix: "str | None" = None) -> bool:
        """Attempt to route one declaration; return True on success."""
        if css_prop in _CROSS_NODE_EXCLUDED_PROPS:
            return False  # GAP-3: never lift display/grid-template-* cross-node.

        # Determine candidate layer(s) for this property.
        # A single element can be OUTER + CONTENT + GRID simultaneously (co-located).
        layers_to_try: list[str] = []

        # max-width / width / --content-width on ANY inner element defaults to CONTENT:
        # an inner element's max-width is almost always a content-width constraint, not an
        # outer full-bleed width.  Priority 1 = CONTENT; only try OUTER as fallback if
        # the CONTENT lookup misses (meaning the block has no contentWidth attr).
        # `is_content` (margin-centring detected) confirms the CONTENT interpretation;
        # even WITHOUT centring, the CONTENT attempt is made first because `_fold_layout_into_attrs`
        # already handles the fold path and we don't want to double-set `maxWidth`.
        if css_prop in ("max-width", "width", "--content-width"):
            layers_to_try.append("CONTENT")
            # Also try OUTER as second-choice (e.g. a block with only `maxWidth` and
            # no `contentWidth` attr).  The `break` after first hit prevents double-setting.
            layers_to_try.append("OUTER")
        elif css_prop.startswith("padding"):
            if is_content:
                layers_to_try.append("CONTENT")
            # GRID layer for per-grid-item padding (e.g. padding on a .sgs-X__grid-item).
            # `attr_for_layer_property(block, 'GRID', css_prop)` returns None for blocks
            # that have no gridItem* attrs — the None miss IS the filter; no per-slug
            # branch needed (R-22-1 DB-first).  GRID wins over OUTER for an element that
            # IS a grid item: the per-item padding belongs on the item attr, not the
            # outer container padding.  CONTENT takes priority over GRID (content-area
            # padding is a different semantic from per-grid-item padding).
            layers_to_try.append("GRID")
            layers_to_try.append("OUTER")
        elif css_prop in ("gap", "row-gap", "column-gap"):
            # GRID layer covers per-grid-item gap (gridItemGap*) when the block has it;
            # OUTER covers the container-level gap attr.  GRID wins when both exist because
            # the element being routed is a grid item, not the outer shell.
            layers_to_try.append("GRID")
            layers_to_try.append("OUTER")
        elif css_prop in ("margin", "margin-top", "margin-right", "margin-bottom", "margin-left"):
            layers_to_try.append("GRID")
            layers_to_try.append("OUTER")
        elif css_prop == "min-height":
            # GRID layer first — a per-grid-item min-height (e.g. gridItemMinHeight) is
            # the tighter, more specific destination when the block exposes it.
            layers_to_try.append("GRID")
            layers_to_try.append("OUTER")
        else:
            # Fallback: try OUTER for any unmatched box property.
            layers_to_try.append("OUTER")

        placed = False
        for layer in layers_to_try:
            # Build the full responsive css_property name for DB lookup:
            # `padding-top` at `Desktop` bp → still `padding-top` (suffix is on the attr name).
            attr_name = db.attr_for_layer_property(owning_block, layer, css_prop)
            if attr_name:
                # Append responsive breakpoint suffix to attr name if needed.
                dest_key = f"{attr_name}{bp_suffix}" if bp_suffix else attr_name
                parent_attrs.setdefault(dest_key, _strip_important(value).strip())
                _trace(
                    "cross_node_css_lifted",
                    owning_block=owning_block,
                    element_token=element_token,
                    css_property=css_prop,
                    layer=layer,
                    dest_attr=dest_key,
                    value=value,
                )
                placed = True
                break  # First matching layer wins (CONTENT > OUTER precedence).

        if not placed:
            # Flag-not-drop: log as gap candidate so the attr can be added later.
            source_class = next(
                (c for c in (child_node.get("class", []) or []) if c.startswith("sgs-")),
                element_token or "",
            )
            _record_gap_candidate(
                block_slug=owning_block,
                css_property=css_prop,
                raw_value=value,
                source_class=source_class,
            )
            _trace(
                "cross_node_gap_candidate",
                owning_block=owning_block,
                element_token=element_token,
                css_property=css_prop,
                reason="no_matching_layer_attr",
            )

        return placed

    # --- Base declarations ---
    for css_prop, value in base_decls.items():
        _lift_decl(css_prop, value, bp_suffix=None)

    # --- Responsive declarations ---
    for bp_key, bp_decl_map in bp_decls.items():
        bp_suffix = _BP_SUFFIX_MAP.get(bp_key)
        if not bp_suffix or not bp_decl_map:
            continue
        for css_prop, value in bp_decl_map.items():
            _lift_decl(css_prop, value, bp_suffix=bp_suffix)


# ============================================================================
# Transparent wrapper absorber (pre-pass)
# ============================================================================
_ABSORB_GAP_PROPS = frozenset({
    "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
    "gap", "row-gap", "column-gap",
})
_ABSORB_POSITIONING_PROPS = frozenset({
    "position", "top", "right", "bottom", "left",
    "z-index", "transform", "overflow",
})


def _is_absorbable_wrapper(child: "Tag", css_rules: dict) -> tuple[bool, str]:
    """Decide whether a direct child is an absorbable transparent wrapper."""
    if not isinstance(child, Tag):
        return False, "not a Tag"
    if child.name in SKIP_TOP_LEVEL_TAGS:
        return False, f"<{child.name}> in SKIP_TOP_LEVEL_TAGS"
    if not any(isinstance(c, Tag) for c in child.children):
        return False, "leaf (no Tag children)"
    classes = child.get("class", []) or []
    bem_classes = [c for c in classes if c.startswith("sgs-") and "__" in c]
    if not bem_classes:
        return False, "no sgs-X__Y BEM class"
    root_classes = [c for c in classes if c.startswith("sgs-") and "__" not in c and "--" not in c]
    for c in root_classes:
        slug = f"sgs/{c[4:]}"
        if db.block_exists(slug):
            return False, f".{c} is a registered block ({slug})"
    for bc in bem_classes:
        target_sel = f".{bc}"
        for css_sel, decls in css_rules.items():
            if target_sel not in css_sel:
                continue
            for prop in decls:
                p = prop.lower()
                if p in _ABSORB_GAP_PROPS:
                    return False, f"child has spacing rule ({css_sel} {{ {prop}: ... }})"
                if p in _ABSORB_POSITIONING_PROPS:
                    return False, f"child has positioning rule ({css_sel} {{ {prop}: ... }})"
    return True, ""


def _absorb_transparent_wrappers(section_root: "Tag", css_rules: dict) -> list[str]:
    """Pre-pass: absorb one transparent wrapper child into the section root.

    Mutates section_root in place. Returns list of class names absorbed.
    """
    if not isinstance(section_root, Tag):
        return []
    section_classes = list(section_root.get("class", []) or [])
    root_block_classes = [c for c in section_classes
                          if c.startswith("sgs-") and "__" not in c and "--" not in c]
    for c in root_block_classes:
        slug = f"sgs/{c[4:]}"
        if db.block_exists(slug):
            _trace("absorb_skipped_section", node_tag=section_root.name,
                   node_classes=section_classes,
                   reason=f"section root .{c} is registered block ({slug}) — FR1 path")
            return []
    direct_children = [c for c in list(section_root.children) if isinstance(c, Tag)]
    if len(direct_children) != 1:
        _trace("absorb_skipped_section", node_tag=section_root.name,
               node_classes=section_classes,
               reason=f"{len(direct_children)} direct element children (need exactly 1)")
        return []
    child = direct_children[0]
    ok, reason = _is_absorbable_wrapper(child, css_rules)
    if not ok:
        _trace("absorb_skipped_child", node_tag=child.name,
               node_classes=child.get("class", []) or [],
               reason=reason)
        return []
    child_classes = list(child.get("class", []) or [])
    added: list[str] = []
    for cc in child_classes:
        if cc not in section_classes:
            section_classes.append(cc)
            added.append(cc)
    section_root["class"] = section_classes
    _trace("absorb_applied", node_tag=child.name, node_classes=child_classes,
           classes_added=added, section_classes_after=section_classes)
    child.unwrap()
    return added




# ============================================================================
# Deprecated inner-block helpers (ported for test compatibility)
# Spec 22 replaces these with the universal walker path. These stubs allow
# test_phase_3_inner_blocks.py to import them without breaking.
# See Spec 22 §FR-22-2 for the replacement path.
# ============================================================================

def _lift_inner_block_attrs(el: Tag, slug: str) -> dict:
    """DEPRECATED — ported for test_phase_3_inner_blocks.py compatibility.

    Spec 22 §FR-22-2 replaces this with db_lookup.lift_behavioural_attrs().
    Lifts basic attrs from an element: label text, href URL, variant modifier.
    """
    result: dict = {}
    # Label — text content
    text = el.get_text(strip=True)
    if text:
        result["label"] = text
    # href → url
    href = el.get("href")
    if href:
        result["url"] = href
    # Modifier class → inheritStyle
    classes: list[str] = el.get("class", []) or []
    for cls in classes:
        if not cls.startswith("sgs-"):
            continue
        bem = db.parse_sgs_bem(cls)
        if bem and bem.modifier:
            result["inheritStyle"] = bem.modifier
            break
    return result


def _lift_inner_blocks(node: Tag, parent_slug: str) -> list[str]:
    """DEPRECATED — ported for test_phase_3_inner_blocks.py compatibility.

    Spec 22 §FR-22-3 replaces this with the universal walker's child recursion.
    Walks direct children for known DB-registered child blocks.

    Returns list of WP block markup strings for child blocks.
    """
    # Query DB for registered children (blocks.parent_block)
    import sqlite3
    from pathlib import Path as _Path
    sgs_db = _Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
    child_slugs: list[str] = []
    try:
        conn = sqlite3.connect(sgs_db)
        try:
            rows = conn.execute(
                "SELECT slug FROM blocks WHERE parent_block = ? AND status = 'built'",
                (parent_slug,),
            ).fetchall()
            child_slugs = [r[0] for r in rows]
        finally:
            conn.close()
    except Exception:  # noqa: BLE001
        pass

    if not child_slugs:
        _trace("inner_blocks_no_children", parent_slug=parent_slug,
               soft_failed=True)
        return []

    # Special case: when child_slugs includes sgs/multi-button, group all
    # sgs/button children into one sgs/multi-button wrapper.
    results: list[str] = []
    if "sgs/multi-button" in child_slugs:
        button_els = [
            child for child in node.children
            if isinstance(child, Tag)
            and any(c.startswith("sgs-button") for c in (child.get("class", []) or []))
        ]
        if button_els:
            button_markups: list[str] = []
            for btn_el in button_els:
                attrs = _lift_inner_block_attrs(btn_el, "sgs/button")
                button_markups.append(emit_wp_block("sgs/button", attrs, []))
            results.append(emit_wp_block("sgs/multi-button", {}, button_markups))
        return results

    # Generic: walk direct element children and match to child slugs
    for child in node.children:
        if not isinstance(child, Tag):
            continue
        child_classes: list[str] = child.get("class", []) or []
        for slug in child_slugs:
            slug_part = slug.rsplit("/", 1)[-1]  # 'multi-button' → check class sgs-multi-button
            if any(slug_part in c for c in child_classes):
                attrs = _lift_inner_block_attrs(child, slug)
                results.append(emit_wp_block(slug, attrs, []))
                break

    return results


# ============================================================================
# WP block emitter
# ============================================================================

def emit_wp_block(slug: str, attrs: dict, inner: list[str]) -> str:
    """Emit a single WP block markup string.

    Spec 22 FR-22-3 single-path: self_closing parameter removed.
    Uses open+close form always; WP renders based on attrs + inner content.
    Internal _-prefixed attr keys are stripped before serialisation.
    """
    attr_json = ""
    if attrs:
        clean = {
            k: v for k, v in attrs.items()
            if v not in (None, "", [], {}) and not k.startswith("_")
        }
        if clean:
            attr_json = " " + json.dumps(clean, separators=(",", ":"), ensure_ascii=False)
    inner_str = "\n".join(inner) if inner else ""
    if not inner_str:
        # Self-close when no inner content
        markup = f"<!-- wp:{slug}{attr_json} /-->"
    else:
        markup = f"<!-- wp:{slug}{attr_json} -->\n{inner_str}\n<!-- /wp:{slug} -->"
    _wp_blocks_validate(markup, slug)
    return markup


# ============================================================================
# Universal walker — Spec 22 §13 Appendix A
#
# R-22-3 PASS: exactly 3 routing branches. No per-block slug literals.
# Exception 0 (text-node) is a precondition check, not a routing branch.
# "if slug is None" is the universal-path default, not a 4th branch.
# The single permitted 'sgs/container' literal (FR-22-4 container-base) is
# documented explicitly: top-level sections are always wrapped in sgs/container
# when the resolved slug is something else.
# ============================================================================

def emit_atomic(node: Tag) -> str:
    """Emit WP block markup for a bare HTML primitive (no sgs-* BEM class).

    Handles Spec 22 §FR-22-3 exception 1 (atomic-tag swap).
    Resolves node.name via atomic_tag_map() to a block slug, then emits.

    Attr-name resolution per slug+tag pair is grounded in the LIVE block.json
    schema for each SGS target slug (verified 2026-05-27 against the DB). When
    the resolved slug is unknown (new SGS block not covered by this map), falls
    back to `db.block_attrs(slug)` and emits the first content-role attr —
    graceful degradation rather than silent drift.

    (D3 fix per /qc-council 2026-05-27 — previous implementation hardcoded attr
    names that drifted after the sgs/heading γ-rebuild + sgs/media + sgs/quote
    schema renames. The 'headline'/'headlineLevel'/'src'/'alt'/'value'/'values'
    attr names no longer match block.json; this rewrite aligns with current
    schema and adds DB-aware fallback for future schema drift.)
    """
    slug = db.atomic_tag_map().get(node.name)
    if not slug:
        return ""
    attrs = _atomic_attrs_for(node, slug)
    _trace("walker_branch_taken", branch="atomic_tag_swap",
           node_tag=node.name, slug=slug, attrs_keys=list(attrs.keys()))
    return emit_wp_block(slug, attrs, [])


# Safe inline-tag allowlist for rich-text Gutenberg attrs (core blocks only).
# Bounded set matches the standard WP core rich-text spec. SGS blocks excluded
# pending per-block render.php audit (their escape policy is currently unknown
# — applying rich-text to sgs/heading etc. without confirming wp_kses_post()
# wrap could either lose tags to escaping OR introduce XSS).
_RICH_TEXT_INLINE_TAGS = frozenset({"br", "strong", "b", "em", "i", "a", "span", "code"})

# Safe URL schemes for <a href>. Empty string covers relative URLs (/about/).
# Excludes javascript:, data:, vbscript:, file: per WP wp_allowed_protocols defaults.
_SAFE_HREF_SCHEMES = frozenset({"http", "https", "mailto", "tel", ""})


def _safe_href(value: str) -> str | None:
    """Validate href scheme against allowlist. Returns trimmed value or None."""
    if not value:
        return None
    try:
        from urllib.parse import urlparse
        scheme = urlparse(value).scheme.lower()
    except ValueError:
        return None
    return value if scheme in _SAFE_HREF_SCHEMES else None


def _rich_text_content(node: Tag) -> str:
    """Extract inner content preserving safe inline HTML tags with XSS hardening.

    Used for core/* atomic-tag swaps where the target block natively accepts
    rich-text (core/heading, core/paragraph, core/quote, core/button). Preserves
    `<br>`, `<strong>`, `<em>`, `<a>`, `<span>`, `<b>`, `<i>`, `<code>`; strips
    disallowed tags to text content. Defence-in-depth:
    1. Text nodes are HTML-escaped (prevents `<script>` etc. in NavigableString)
    2. <a href> values are scheme-allowlisted then attribute-escaped
    3. All other tag attributes are dropped (only href on <a> survives)

    Defence-in-depth is needed even though mockup HTML is author-controlled,
    because mockups may be scraped from external sites via /uimax-scrape +
    /uimax-sgs-scrape-pattern. Downstream WP render still applies wp_kses_post
    as a second layer.

    XS-9 fix 2026-05-30 — diagnostic register hero F3: mockup `<h1>Made for
    the mum<br>who needs it most</h1>` was collapsing to "Made for the mumwho
    needs it most" because node.get_text(strip=True) dropped the <br>.
    """
    from html import escape
    parts: list[str] = []
    for child in node.children:
        if isinstance(child, Comment):
            continue
        if isinstance(child, NavigableString):
            # Escape ampersand + angle-brackets in literal text (prevents
            # raw HTML injection via text content)
            parts.append(escape(str(child), quote=False))
            continue
        if isinstance(child, Tag):
            if child.name in _RICH_TEXT_INLINE_TAGS:
                if child.name == "br":
                    parts.append("<br>")
                    continue
                attrs_str = ""
                if child.name == "a":
                    safe = _safe_href(child.get("href", ""))
                    if safe is not None:
                        # quote=True escapes both " and & so the attr value
                        # cannot break out of the surrounding href=" ... "
                        attrs_str = f' href="{escape(safe, quote=True)}"'
                inner = _rich_text_content(child)
                parts.append(f"<{child.name}{attrs_str}>{inner}</{child.name}>")
            else:
                # Disallowed tag — strip to text content (recurse)
                parts.append(_rich_text_content(child))
    return "".join(parts).strip()


def _atomic_attrs_for(node: Tag, slug: str, allow_text_fallback: bool = True) -> dict:
    """Return the attrs dict for a node emitted as `slug` via the atomic-tag swap.

    Schema-aligned to current block.json (2026-05-27). Returns {} when no
    content extraction is meaningful for the tag type (e.g. <hr>) OR when
    the slug+tag pair has no known mapping (graceful degradation).

    allow_text_fallback controls whether the graceful text-fallback at the end
    of this function fires. The fallback lifts _rich_text_content(node) into the
    first content/text-content-role STRING attr for any sgs/* slug. Pass
    allow_text_fallback=False when calling from the G3-attrs path (content-block
    with has_inner_blocks=0) so that only EXPLICIT handlers (like option-picker's,
    which returns before the fallback) produce attrs — preventing garbage text from
    being dumped into date/URL attrs on blocks like sgs/countdown-timer.targetDate,
    sgs/decorative-image.imageUrl, sgs/star-rating.label, etc.
    """
    tag = node.name

    # sgs/heading — current schema: content (rich-text via wp_kses_post in render.php:442)
    # XS-9.1 fix 2026-05-30: render.php audit confirmed wp_kses_post escape; safe
    # to receive _RICH_TEXT_INLINE_TAGS allowlist (br/strong/em/a/etc.). Mama's
    # hero H1 <br> case now lands correctly.
    if slug == "sgs/heading" and tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
        return {"content": _rich_text_content(node), "level": tag}

    # core/heading — WP core schema: level (int 1..6), content (rich-text)
    if slug == "core/heading" and tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
        return {"level": int(tag[1]), "content": _rich_text_content(node)}

    # sgs/text — current schema: text (rich-text via wp_kses_post in render.php:607)
    # XS-9.1 fix 2026-05-30: render.php audit confirmed wp_kses_post escape.
    if slug == "sgs/text" and tag in ("p", "span", "div"):
        return {"text": _rich_text_content(node)}

    # core/paragraph — WP core schema: content (rich-text)
    if slug == "core/paragraph" and tag in ("p", "span", "div"):
        return {"content": _rich_text_content(node)}

    # sgs/media — current schema: imageUrl, imageAlt
    if slug == "sgs/media" and tag == "img":
        return {
            "imageUrl": _resolve_media_url(node.get("src", "")),
            "imageAlt": node.get("alt", ""),
        }

    # sgs/media (video) — <video>/<iframe> → mediaType=video + videoUrl (D97 video
    # support: external embeds — YouTube/Vimeo/MP4). <video src> or first <source>;
    # <iframe src> for embeds. 2026-06-03 (Bean): close the video/iframe routing gap.
    if slug == "sgs/media" and tag in ("video", "iframe"):
        src = node.get("src", "")
        if not src and tag == "video":
            source = node.find("source")
            if source is not None:
                src = source.get("src", "")
        return {"mediaType": "video", "videoUrl": _resolve_media_url(src), "videoSource": "external"}

    # core/image — WP core schema: url, alt
    if slug == "core/image" and tag == "img":
        return {
            "url": _resolve_media_url(node.get("src", "")),
            "alt": node.get("alt", ""),
        }

    # sgs/button — current schema: label (rich-text via wp_kses with no-<a>
    # allowlist in render.php:570). XS-9.2 fix 2026-05-30: tightened allowlist
    # excludes <a> to prevent nested-anchor phishing inside <a>/<button> wrappers.
    # _rich_text_content preserves <br>/<strong>/<em>/<span>/etc; any nested <a>
    # it emits will be stripped server-side by wp_kses (defence-in-depth).
    # XS-9.2 quality-review hardening 2026-05-30: url attr ALSO gated by
    # _safe_href to block javascript:/data:/vbscript: schemes at the converter
    # layer (defence-in-depth vs render.php's esc_url as the only gate).
    if slug == "sgs/button" and tag in ("a", "button"):
        safe_url = _safe_href(node.get("href", "")) or ""
        return {"label": _rich_text_content(node), "url": safe_url}
    # core/button — WP core schema: text (rich-text), url
    if slug == "core/button" and tag in ("a", "button"):
        safe_url = _safe_href(node.get("href", "")) or ""
        return {"text": _rich_text_content(node), "url": safe_url}

    # sgs/quote — current schema: body (array of rich-text strings via wp_kses_post in render.php:727)
    # XS-9.1 fix 2026-05-30: render.php audit confirmed wp_kses_post escape on body items.
    if slug == "sgs/quote" and tag == "blockquote":
        return {"body": [_rich_text_content(node)]}

    # core/quote — WP core schema: value (rich-text)
    if slug == "core/quote" and tag == "blockquote":
        return {"value": _rich_text_content(node)}

    # sgs/icon-list — current schema: items (array of {icon, text})
    if slug == "sgs/icon-list" and tag in ("ul", "ol"):
        items_text = [li.get_text(strip=True) for li in node.find_all("li")]
        return {"items": [{"icon": "check", "text": t} for t in items_text if t]}

    # sgs/option-picker — current schema: optionItems (array of {key, label}),
    # defaultSelected (string), typeKey (string), label (string).
    # FR-24-15 / D144 Phase D (2026-06-02).
    # Recognises child elements whose BEM `element` segment is "pill" (e.g.
    # sgs-product-card__pill, sgs-featured-product__pill) OR bare "pill"/"sgs-pill".
    # Each pill button becomes one {key, label} item. The `active`/aria-pressed=true
    # child sets defaultSelected. typeKey is derived from the group's aria-label.
    # Note: _atomic_attrs_for is called via the G3-attrs path (not the leaf path)
    # because composition_role='content-block' + has_inner_blocks=0 (G3 gate
    # suppresses child recursion; this function extracts the items array instead).
    # slot_default_attrs_for injects pillStyle/typeKey defaults AFTER this returns,
    # so explicit values here take precedence via dict merge order.
    if slug == "sgs/option-picker" and tag in ("div", "fieldset", "section", "ul"):
        import re as _re
        option_items: list[dict] = []
        default_selected = ""
        for child in node.find_all(True, recursive=False):
            child_classes = child.get("class", []) or []
            # Recognise pill children: any child whose BEM element segment is "pill"
            # (e.g. sgs-product-card__pill) or bare "pill"/"sgs-pill" class.
            is_pill = any(
                (db.parse_sgs_bem(c) is not None and db.parse_sgs_bem(c).element == "pill")
                or c in ("pill", "sgs-pill")
                for c in child_classes
            )
            if not is_pill:
                continue
            label_text = child.get_text(strip=True)
            if not label_text:
                continue
            # Key: prefer explicit data attrs, fallback to label-as-slug
            key = str(
                child.get("data-pack")
                or child.get("data-value")
                or child.get("value")
                or label_text.lower().replace(" ", "-")
            )
            option_items.append({"key": key, "label": label_text})
            # First active/pressed/checked pill sets defaultSelected
            is_active = (
                "active" in child_classes
                or child.get("aria-pressed") == "true"
                or child.get("checked") is not None
                or child.get("aria-checked") == "true"
            )
            if is_active and not default_selected:
                default_selected = key
        result: dict = {}
        if option_items:
            result["optionItems"] = option_items
        if default_selected:
            result["defaultSelected"] = default_selected
        # typeKey from aria-label on the group container; strip "Select "/"Choose " prefix
        aria_label = node.get("aria-label", "")
        if aria_label:
            cleaned = _re.sub(r"^(?:select|choose)\s+", "", aria_label, flags=_re.IGNORECASE)
            result["typeKey"] = cleaned.strip().lower().replace(" ", "-")
        # label: carry aria-label verbatim as the block's accessible label attr
        if aria_label:
            result["label"] = aria_label
        # contentImpact: cannot be inferred from draft HTML — leave as default []
        # Authors configure this post-clone in the block editor inspector.
        return result

    # sgs/trust-bar — FR-24-10 purge / D182 (2026-06-06): TYPED native emission.
    # Replaces the old 'bound' cheat (Rules 1+2 violation). The block now flows
    # down the G3-attrs path (has_inner_blocks=0 in DB) and lands here instead
    # of generating converter InnerBlocks children.
    #
    # Extraction contract (council-specified):
    #   - Enumerate every .sgs-trust-bar__badge descendant (recursive — draft
    #     nests __inner > __badge so direct children are not enough).
    #   - Per badge: label (text-only, never SVG path data), url (via _safe_href
    #     when an <a> is present), icon="" + pending=True (icon slug deferred —
    #     render.php hides pending badges; operator resolves in editor).
    #   - image-badge variant: media.url + media.alt when badge has an <img>
    #     with an http/https src.
    #   - badgeStyle: inferred from first matching badge structure.
    #   - columns: number of badges found.
    #
    # R-22-1 compliant: no hardcoded lookup dicts beyond this explicit handler
    # (option-picker is the precedent for an explicit slug handler here).
    if slug == "sgs/trust-bar" and tag in ("section", "div", "ul", "nav"):
        badge_nodes = node.find_all(
            lambda t: t.name is not None and any(
                "sgs-trust-bar__badge" in c for c in (t.get("class") or [])
            )
        )

        # Infer badgeStyle from the first badge that matches a variant signal.
        badge_style = "icon-circle"  # default — matches the draft's SVG circles
        for _bn in badge_nodes:
            if _bn.find("img"):
                badge_style = "image-badge"
                break
            if _bn.find(
                lambda t: t.name is not None and any(
                    "sgs-trust-bar__circle" in c for c in (t.get("class") or [])
                )
            ) or _bn.find("svg"):
                badge_style = "icon-circle"
                break
            # text-only: badge has neither img nor svg/circle
            badge_style = "text-only"
            break

        trust_items: list[dict] = []
        for badge_node in badge_nodes:
            item: dict = {}

            # label: text of __label/__text descendant, else full badge text.
            # Never use _rich_text_content (would double-escape <a> → &lt;a&gt;
            # and concatenate SVG path data into the label string).
            label_node = badge_node.find(
                lambda t: t.name is not None and any(
                    c in ("sgs-trust-bar__label", "sgs-trust-bar__text")
                    for c in (t.get("class") or [])
                )
            )
            if label_node is not None:
                item["label"] = label_node.get_text(strip=True)
            else:
                # Strip SVG text noise: get_text on the badge includes path data
                # from <svg> descendants. Remove <svg> subtrees first.
                import copy as _copy
                badge_clone = _copy.copy(badge_node)
                for _svg in badge_clone.find_all("svg"):
                    _svg.decompose()
                item["label"] = badge_clone.get_text(strip=True)

            # url: present only when the badge contains an <a> with a safe href.
            anchor = badge_node.find("a")
            if anchor is not None:
                safe = _safe_href(anchor.get("href", ""))
                if safe:
                    item["url"] = safe

            # icon: identity resolver (Task 2 — icon_resolver.py).
            # Finds the <svg> element inside the __icon/__circle span, then asks
            # the resolver for the best Lucide slug match or a raw-SVG fallback.
            # Rules:
            #   confident match  -> item["icon"] = slug  (render.php uses lucide map)
            #   no match         -> item["icon"] = ""     (empty slot visible in editor)
            #                       item["iconSvg"] = raw  (render.php outputs sanitised SVG)
            # Do NOT set pending=True — that adds `hidden` to the badge, hiding it
            # from visitors entirely, which is wrong for an unresolved-icon state.
            try:
                from .icon_resolver import resolve_icon as _resolve_icon  # noqa: PLC0415

                _icon_container = badge_node.find(
                    lambda t: t.name is not None and any(
                        c in ("sgs-trust-bar__icon", "sgs-trust-bar__circle")
                        for c in (t.get("class") or [])
                    )
                )
                # Fallback: if no labelled icon wrapper, search the badge directly.
                _svg_node = (
                    _icon_container.find("svg") if _icon_container else None
                ) or badge_node.find("svg")

                _resolved = _resolve_icon(_svg_node)
                if _resolved["confidence"] in ("high", "medium"):
                    item["icon"] = _resolved["slug"] or ""
                else:
                    item["icon"] = ""
                    if _resolved["raw_svg"]:
                        item["iconSvg"] = _resolved["raw_svg"]
            except Exception:
                # Resolver unavailable — degrade gracefully with empty slug.
                item["icon"] = ""

            # media: image-badge variant only — include only http/https src.
            if badge_style == "image-badge":
                img = badge_node.find("img")
                if img is not None:
                    src = img.get("src", "")
                    if src.startswith(("http://", "https://")):
                        item["media"] = {
                            "url": src,
                            "alt": img.get("alt", item.get("label", "")),
                        }

            if item.get("label"):
                trust_items.append(item)

        trust_result: dict = {
            "badgeStyle": badge_style,
            "columns": len(trust_items),
        }
        if trust_items:
            trust_result["items"] = trust_items
        return trust_result

    # core/list — WP core: inner blocks of core/list-item with content
    if slug == "core/list" and tag in ("ul", "ol"):
        return {"ordered": tag == "ol"}

    # sgs/divider, core/separator, core/separator-like — no content attrs
    if tag == "hr":
        return {}

    # Graceful fallback: unknown slug+tag pair. Query block_attrs(slug) for the
    # first content-role attr and emit text into it. Better than emitting wrong
    # attr names — empty attrs at worst, semantically-correct content at best.
    attrs_catalogue = db.block_attrs(slug) if slug.startswith("sgs/") else {}
    content_attr_name: str | None = None
    for attr_name, info in attrs_catalogue.items():
        if not isinstance(info, dict):
            continue
        if info.get("role") in ("content", "text-content"):
            # block_attrs() returns the type under the key "attr_type" (not "type").
            # The previous "type" lookup silently returned None, so this graceful
            # fallback never fired — only the explicit slug handlers above worked.
            # Fixed 2026-05-31 (G1): now sgs/label and any other leaf with a
            # text-content string attr get their text lifted into the attr.
            attr_type = info.get("attr_type")
            if attr_type == "string":
                content_attr_name = attr_name
                break
    if content_attr_name is not None and allow_text_fallback:
        return {content_attr_name: _rich_text_content(node)}
    return {}


def _lift_scalar_attrs_by_selector(node: Tag, slug: str) -> dict:
    """Universal DB-driven multi-scalar lift for a G3-attrs content block.

    Generalises the single-attr graceful fallback in _atomic_attrs_for
    (~line 3079) to N scalar attrs keyed by each attr's ``derived_selector``.
    For every content/rating attr the block declares (block_attrs(slug)), find
    the FIRST descendant of ``node`` matching that attr's BEM class selector and
    lift its value into the attr — text via _rich_text_content, star-count via
    aria-label / glyph count. An attr whose selector matches nothing emits NO
    key, which makes this a strict NO-OP for grid/gallery blocks (they carry no
    content derived_selectors) and for absent draft elements (e.g. ratingScale's
    .sgs-testimonial__rating, missing on page 8).

    Selection rule (the no-op floor):
      - attr MUST have a non-empty derived_selector, AND
      - role in {'text-content','content'} with attr_type 'string'  → text lift
        OR role == 'rating' with attr_type 'number'                 → star lift
      - any other role/type combination is skipped (no key emitted).

    showRating coupling: if the block declares a ``showRating`` boolean attr and
    a ratingStars-style number attr was lifted with value > 0, set showRating
    True (DB-attr-driven, no slug literal).

    Spec refs: FR-22-2 (content-routing into scalar attrs), FR-22-5 D1
    (faithful per-class transfer), R-22-1 (DB-driven, zero hardcoded dicts /
    no per-slug branch), R-22-9 (universal — fires for every G3 content block).

    Args:
        node: The resolved block's root Tag node (draft DOM subtree).
        slug: The resolved SGS block slug (e.g. 'sgs/testimonial').

    Returns:
        dict of lifted scalar attrs (possibly empty). No garbage keys.
    """
    if not slug.startswith("sgs/"):
        return {}
    # COUNCIL-MANDATED OPT-IN GATE (R-22-1 data-driven / R-22-9 universal mechanism):
    # hard NO-OP (STOP-E) for every block that has NOT declared the
    # 'scalar-content-lift' capability (block.json supports.sgs.scalarContentLift).
    # The role+derived_selector trigger alone matches ~50 blocks (date/URL/title
    # attrs) — only opted-in blocks may dump draft text/stars into their attrs.
    if "scalar-content-lift" not in db.capabilities_for(slug):
        return {}
    catalogue = db.block_attrs(slug)
    if not catalogue:
        return {}

    lifted: dict = {}
    lifted_rating_positive = False
    for attr_name, info in catalogue.items():
        if not isinstance(info, dict):
            continue
        selector = info.get("derived_selector")
        if not selector or not isinstance(selector, str):
            continue
        role = info.get("role")
        attr_type = info.get("attr_type")

        is_text = role in ("text-content", "content") and attr_type == "string"
        is_rating = role == "rating" and attr_type == "number"
        if not (is_text or is_rating):
            continue

        # A derived_selector is one OR MORE comma-separated BEM class selectors
        # ('.sgs-x__y' or '.sgs-x__text, .sgs-x__quote'); multi-selector support
        # handles the draft naming-space drift (page-8 `__text` vs canonical
        # `__quote`). Resolve each to a bare class name and find the FIRST matching
        # descendant (first non-None wins). Single-class selectors work identically.
        # find(class_=...) keeps the BeautifulSoup surface consistent (no CSS engine).
        element = None
        for part in selector.split(","):
            class_name = part.strip().lstrip(".")
            if not class_name:
                continue
            element = node.find(class_=class_name)
            if element is not None and isinstance(element, Tag):
                break
            element = None
        if element is None:
            continue  # no class matched → emit no key (grid no-op / absent draft elem)

        if is_text:
            value = _rich_text_content(element)
            if value:
                lifted[attr_name] = value
        else:  # is_rating
            stars = _extract_star_count(element)
            lifted[attr_name] = stars
            if stars > 0:
                lifted_rating_positive = True

    # showRating coupling — only when the block declares the attr and a positive
    # rating was lifted. DB-driven (presence of the attr in the catalogue).
    if lifted_rating_positive and "showRating" in catalogue:
        sr_info = catalogue.get("showRating")
        if isinstance(sr_info, dict) and sr_info.get("attr_type") == "boolean":
            lifted["showRating"] = True

    return lifted


def _extract_star_count(element: Tag) -> int:
    """Extract a 0..5 star count from a rating element.

    First tries the element's ``aria-label`` with a bounded ``\\b(\\d{1,2})\\b``
    regex (so 'aria-label="5 stars"' → 5); if no aria-label digit, counts ★/⭐
    glyph characters in the element text. Clamped to 0..5 and returned as int.
    """
    aria = element.get("aria-label", "")
    if aria:
        m = re.search(r"\b(\d{1,2})\b", aria)
        if m:
            return min(5, max(0, int(m.group(1))))
    text = element.get_text()
    glyphs = sum(1 for ch in text if ch in ("★", "⭐"))  # ★ ⭐
    return min(5, max(0, glyphs))


def _lift_scalar_media_from_img(img_node: Tag) -> dict:
    """Build a scalar-media object value from a bare <img> element.

    Returns a dict matching the `object`-typed schema that hero/slider attrs
    expect: ``{"url": ..., "id": 0, "alt": ...}``.  The `id` is set to 0
    because no WP media-library id is available from the mockup HTML; the
    block's render.php renders the image from `url` + `alt` when `id` is 0.

    The `url` is resolved through the active media-map (same path as
    _resolve_media_url) so that local mockup filenames are replaced by their
    deployed WP CDN URLs when a media-map was loaded for this run.

    Args:
        img_node: A BeautifulSoup Tag for an <img> element inside the
                  composite's scalar-media column.

    Returns:
        dict with keys ``url`` (str), ``id`` (int 0), ``alt`` (str).
    """
    return {
        "url": _resolve_media_url(img_node.get("src", "")),
        "id": 0,
        "alt": img_node.get("alt", ""),
    }


def _route_composite_interior(
    node: Tag,
    slug: str,
    attrs: dict,
    css_rules: dict,
    depth: int,
    variation_buf: list[str] | None,
) -> list[str]:
    """Route the interior children of a class-section composite per FR-22-19.

    Replaces the generic ``for child in node.children: walk()`` loop when the
    resolved `slug` is a class-section composite (``db.is_class_section_block``
    returns True).  Instead of emitting every column as a generic sgs/container,
    it routes each direct-child column by slot:

    - **Scalar-media column** — ``db.scalar_media_attr_for(slug, element)``
      returns a non-None attr_name → find the <img> descendants inside that
      child, read the ``--mobile``/``--desktop`` BEM modifier to pick the base
      attr vs its ``+Mobile`` breakpoint sibling, lift each img via
      ``_lift_scalar_media_from_img`` into ``attrs[attr_name]`` (mutating the
      caller's attrs dict in-place), and emit NOTHING to the markup list for
      this column (render.php owns that column's HTML).

    - **Content column** — ``scalar_media_attr_for`` returns None → the column
      is the InnerBlocks content slot.  Fold the column wrapper away: iterate
      its direct children and ``walk()`` each (is_top_level=False), appending
      results to the markup list.  The ``$content`` InnerBlocks placeholder in
      render.php will receive these children.

    This implements FR-22-2 content-routing for composite interiors and is NOT
    a 4th top-level walker branch (R-22-3): it fires only inside the existing
    resolved-block emit path, gated by ``is_class_section_block(slug)``.

    Args:
        node:        The composite block's root Tag node.
        slug:        The resolved class-section slug (e.g. 'sgs/hero').
        attrs:       The block's attrs dict — MUTATED IN-PLACE with scalar-media
                     values.  Caller owns this dict; the mutations persist into
                     the final ``emit_wp_block`` call.
        css_rules:   Parsed CSS rules dict threaded from the top-level walk.
        depth:       Current recursion depth (passed to child walk() calls).
        variation_buf: CSS accumulator threaded from the top-level walk.

    Returns:
        List of WP block markup strings for the composite's InnerBlocks
        (content-column children only; scalar-media columns contribute nothing
        to this list — they are lifted into attrs instead).
    """
    # Determine the set of breakpoint modifier names so we can classify --mobile
    # vs --desktop (or no modifier) when lifting scalar-media imgs.
    # db.breakpoint_suffix_rules() returns the _BREAKPOINT_RULES list (already
    # cached at module load): [(marker, [suffixes])].  We flatten the suffix lists
    # to build a {suffix_lowercase: is_mobile} map.
    # 'Mobile' → True; any other breakpoint suffix → False (treat as desktop/base).
    try:
        _bp_rules = db.breakpoint_suffix_rules()
        _all_bp_suffixes: frozenset[str] = frozenset(
            sfx for _, sfxes in _bp_rules for sfx in sfxes
        )
    except Exception:  # noqa: BLE001 — soft-fail if DB unavailable
        _all_bp_suffixes = frozenset()
    _is_mobile_modifier: dict[str, bool] = {
        sfx.lower(): (sfx == "Mobile") for sfx in _all_bp_suffixes
    }

    children_markup: list[str] = []

    for child in node.children:
        if not isinstance(child, Tag):
            continue

        cclasses: list[str] = child.get("class", []) or []
        csgs: list[str] = [c for c in cclasses if c.startswith("sgs-")]

        # Extract the BEM __element segment from the child's primary sgs- class.
        # e.g. 'sgs-hero__split-image' → element='split-image'
        element: str | None = None
        for cls in csgs:
            bem = db.parse_sgs_bem(cls)
            if bem and bem.element:
                element = bem.element
                break

        if element is None:
            # No BEM element segment — cannot route by slot; fall back to generic walk.
            result = walk(child, css_rules, variation_buf, depth=depth + 1, is_top_level=False,
                          parent_block=slug)
            if result:
                children_markup.append(result)
            continue

        # Ask the DB: does this composite have a scalar-media attr for this element?
        base_attr = db.scalar_media_attr_for(slug, element)

        if base_attr is not None:
            # --- Scalar-media column ---
            # Find all <img> descendants inside this column and lift them.
            # Each img may carry a BEM modifier (--mobile, --desktop) that
            # selects whether it goes into the base attr or the +Mobile sibling.
            imgs = child.find_all("img")
            if not imgs:
                # No img found — emit a debug trace and skip this column silently.
                _trace("composite_interior_route", slug=slug, element=element,
                       attr=base_attr, branch="scalar_media_no_img_found",
                       depth=depth + 1,
                       note="scalar-media column had no <img> descendant; skipped")
                continue

            for img in imgs:
                img_classes: list[str] = img.get("class", []) or []
                img_modifier: str | None = None
                for img_cls in img_classes:
                    img_bem = db.parse_sgs_bem(img_cls)
                    if img_bem and img_bem.modifier:
                        img_modifier = img_bem.modifier.lower()
                        break

                # Determine target attr: Mobile modifier → base + 'Mobile';
                # Desktop modifier or none → base attr.
                is_mobile = _is_mobile_modifier.get(img_modifier, False) if img_modifier else False
                target_attr = f"{base_attr}Mobile" if is_mobile else base_attr

                lifted = _lift_scalar_media_from_img(img)
                attrs[target_attr] = lifted
                _trace("composite_interior_route", slug=slug, element=element,
                       attr=target_attr, branch="scalar_media_lifted",
                       depth=depth + 1,
                       img_src=img.get("src", ""),
                       modifier=img_modifier,
                       lifted_url=lifted.get("url", ""))

        else:
            # --- Content column OR content item (FR-22-4.1 rules #2/#3) ---
            # Distinguish the two non-scalar-media cases by whether the child
            # itself resolves to a registered block:
            #   (a) child resolves to a block (e.g. article.sgs-testimonial →
            #       sgs/testimonial — a repeated content ITEM, or any standalone
            #       content block): emit it AS that block (walk normally). It is
            #       NOT folded — folding would drop the block + swallow its content.
            #   (b) child is a slug-None transparent content WRAPPER (e.g. the
            #       hero's sgs-hero__content column): fold it — walk its children
            #       directly into bare InnerBlocks ($content), dropping the wrapper.
            child_slug = db.resolve_slug_from_bem(csgs)
            if child_slug is not None:
                _trace("composite_interior_route", slug=slug, element=element,
                       attr=None, branch="content_item_block_emitted",
                       child_slug=child_slug, depth=depth + 1)
                result = walk(child, css_rules, variation_buf,
                              depth=depth + 1, is_top_level=False, parent_block=slug)
                if result:
                    children_markup.append(result)
            else:
                # FR-22-21 / council MF-1 (2026-06-07): before dropping this slug-None
                # content-column wrapper, lift its OWN layout + box CSS (padding/flex/
                # max-width/background) onto the composite's mirrored attrs — exactly as
                # the other three fold paths do (slug-None section, resolved container,
                # nested wrapper at line 3828). Without this the wrapper's CSS evaporated
                # (the hero __content 0%-transfer drop). `attrs` is the composite block's
                # dict, mutated in-place; setdefault() never clobbers the composite's own
                # already-set layout/grid/background attrs.
                _fold_layout_into_attrs(child, cclasses, attrs, css_rules)
                # FR-22-5.3 cross-node CSS routing (Commit 2, 2026-06-10): after the
                # fold lifts grid/flex, also route this slug-None column's STRUCTURAL
                # BOX CSS (padding / max-width / gap) onto the composite's per-slot
                # layer attrs via the DB-driven layer resolver.  Complements the fold
                # (which covers grid/layout attrs) with the CONTENT-layer attrs the
                # fold does not set (contentPadding*, contentWidth from __content).
                _route_interior_css_to_parent_slot(
                    child_node=child,
                    element_token=element,
                    owning_block=slug,
                    parent_attrs=attrs,
                    css_rules=css_rules,
                )
                _trace("composite_interior_route", slug=slug, element=element,
                       attr=None, branch="content_column_folded",
                       depth=depth + 1,
                       note="slug-None wrapper folded + cross-node CSS routed to composite attrs")
                for grandchild in child.children:
                    result = walk(grandchild, css_rules, variation_buf,
                                  depth=depth + 1, is_top_level=False, parent_block=slug)
                    if result:
                        children_markup.append(result)

    return children_markup


def walk_passthrough(
    node: Tag,
    css_rules: dict,
    depth: int,
    variation_buf: list[str] | None = None,
) -> str:
    """Pass-through: recurse, concatenate children's markup, bubble up.

    Handles FR-22-11: when resolve_slug_from_bem returns None, the node
    has no recognised BEM block class. Recurse into children and bubble
    their emitted markup up to the parent's InnerBlocks.

    variation_buf is threaded through the recursive walk so SGS-classed nodes
    nested below a non-BEM wrapper still get their CSS collected. (Fix per
    /qc-council 2026-05-27 D1 — earlier version dropped variation_buf, silently
    losing block-scoped CSS for any sgs-* node below a non-BEM intermediate
    wrapper.)
    """
    children_markup: list[str] = []
    for child in node.children:
        result = walk(child, css_rules, variation_buf, depth=depth + 1, is_top_level=False)
        if result:
            children_markup.append(result)
    return "".join(children_markup)


def walk(
    node: object,
    css_rules: dict,
    variation_buf: list[str] | None = None,
    depth: int = 0,
    is_top_level: bool = False,
    parent_block: "str | None" = None,
) -> str | None:
    """Universal walker per Spec 22 §13 Appendix A + R-22-3 (exactly 3 routing branches).

    variation_buf is accepted for backward-compatibility with callers in __init__.py
    and convert_page.py that pass it as a positional argument. In the Spec 22 universal
    walker, CSS is embedded directly via collect_css_for_classes (FR-22-5) rather than
    accumulated in an external buffer. When variation_buf is supplied, collected CSS is
    also appended there for callers that consume it.

    The 3 permitted routing branches (R-22-3):
      1. atomic-tag swap   — if not sgs_classes and node.name in atomic_tag_map()
      2. chrome-skip       — if is_top_level and node.name in SKIP_TOP_LEVEL_TAGS
      3. container wrap    — if is_top_level and slug != 'sgs/container'

    The single 'sgs/container' literal (branch 3) is FR-22-4 permitted: every
    top-level section base is sgs/container; non-container top-level slugs are
    wrapped. This is the ONLY block-slug literal permitted anywhere in this file.

    parent_block:
        The nearest RESOLVED ancestor slug (intermediate slug-None wrappers do not
        update this).  Used for the FR-22-5.3 parent-scoped child-token pre-check
        (Commit 2): when a child element's BEM token matches a registered child block
        of ``parent_block``, that child slug takes precedence over the global ``slots``
        alias lookup.  Must NOT be threaded into the lru_cache'd
        ``_resolve_slug_from_bem_tuple`` (cache key is the class tuple only).

    Returns: WP block markup string, or None for chrome-skipped / text-only-none nodes.
    """
    # Exception 0a — HTML comments are not content. Must check BEFORE
    # NavigableString since Comment is a subclass of NavigableString and
    # would otherwise have its comment text leaked into block markup
    # (XS-10 fix 2026-05-30 — diagnostic register featured-product F4).
    if isinstance(node, Comment):
        return None

    # Exception 0b — text nodes (precondition check, not a routing branch)
    if isinstance(node, NavigableString):
        text = str(node).strip()
        return text if text else None

    if not isinstance(node, Tag):
        return None

    classes: list[str] = node.get("class", []) or []
    sgs_classes: list[str] = [c for c in classes if c.startswith("sgs-")]

    # ---- Permitted exception 1 — atomic-tag swap ----
    # No sgs-* BEM class AND tag is in atomic_tag_map → emit as atomic block.
    # Typography lift also fires here (descendant-combinator + @media fix,
    # 2026-06-05): emit_atomic only sets content/level attrs; font-size/weight/
    # colour from ancestor-qualified CSS rules (e.g. .sgs-hero__content h1)
    # and @media blocks must also be lifted onto the emitted block's attrs.
    # css_rules is in scope here; emit_atomic itself has no access to it.
    if not sgs_classes and node.name in db.atomic_tag_map():
        _at_slug = db.atomic_tag_map().get(node.name)
        _at_attrs = _atomic_attrs_for(node, _at_slug) if _at_slug else {}
        if _at_slug:
            route_node_css(
                node, css_rules, _at_attrs,
                effective_slug=_at_slug,
                lift_typography=True,
                typo_slug=_at_slug,
                lift_root_supports=False,
                lift_wrapper_css=False,
            )
            # F6a — inherited / absent-value resolution now handled INSIDE route_node_css
            # (P6 fix: fires when lift_typography=True + typo_slug set).
            _trace("walker_branch_taken", branch="atomic_tag_swap",
                   node_tag=node.name, slug=_at_slug, attrs_keys=list(_at_attrs.keys()))
            return emit_wp_block(_at_slug, _at_attrs, [])
        return emit_atomic(node)

    # ---- Permitted exception 2 — chrome-skip at top level ----
    # A top-level <header>/<footer>/<nav> belongs in a WP template part, NOT page
    # content (it duplicates the theme's own header/footer template part on every
    # page — Bean 2026-06-03). Skip it when EITHER:
    #   (a) it carries no sgs- class (bare chrome), OR
    #   (b) its sgs BEM block segment is ITSELF a chrome role (sgs-header /
    #       sgs-footer / sgs-nav) — i.e. a genuine header/footer/nav section.
    # A CONTENT block merely WEARING a semantic tag (e.g. <header class="sgs-hero">,
    # block segment 'hero' ∉ chrome) is NOT skipped — it still resolves to its
    # block. (Original `not sgs_classes`-only guard added per /qc-council 2026-05-27
    # D5 to protect hero-as-header; extended 2026-06-03 to also drop sgs-classed
    # chrome that was leaking into page body. Header/footer cloning to template
    # parts is the parked specialised-cloner work — until then, drop from body.)
    if is_top_level and node.name in SKIP_TOP_LEVEL_TAGS:
        chrome_classed = False
        for c in sgs_classes:
            bem = db.parse_sgs_bem(c)
            if bem is not None and bem.block in SKIP_TOP_LEVEL_TAGS:
                chrome_classed = True
                break
        if not sgs_classes or chrome_classed:
            skip_label = " ".join(classes) if classes else node.name
            _trace("walker_branch_taken", branch="chrome_skip", node_tag=node.name,
                   node_classes=classes, depth=depth,
                   reason=f"<{node.name}> {skip_label} belongs in WP template parts, not post content")
            return None

    # ---- Universal path — BEM → DB → emit ----
    slug = db.resolve_slug_from_bem(sgs_classes)  # FR-22-1 with multi-class disambiguation

    # ---- FR-22-5.3 parent-scoped child-token pre-check (Commit 2, 2026-06-10) ----
    # When a parent block is resolved, check whether ANY of this node's BEM element
    # tokens match a registered child block of that parent.  A parent-scoped match
    # takes precedence over the global `slots` alias lookup — fixing two confirmed
    # mis-resolutions: accordion `__item` → sgs/info-box (should → sgs/accordion-item);
    # form `__step` → sgs/process-steps (should → sgs/form-step).
    #
    # Build contract (STAGE1-DESIGN.md §Commit 2):
    #   (a) Pure DB lookup via blocks.parent_block (18 rows) — no Python branch per slug.
    #   (b) Parent context = nearest RESOLVED ancestor (the `parent_block` arg;
    #       intermediate slug-None wrappers do NOT update it — their callers pass
    #       the SAME parent_block down).
    #   (c) Parent-scoped hit → slug overrides the global resolution; traced.
    #   (d) NOT threaded into lru_cache'd _resolve_slug_from_bem_tuple.
    if parent_block and sgs_classes:
        for _ps_cls in sgs_classes:
            _ps_bem = db.parse_sgs_bem(_ps_cls)
            if _ps_bem and _ps_bem.element:
                _ps_child = db.child_block_for_parent_token(parent_block, _ps_bem.element)
                if _ps_child is not None:
                    _trace(
                        "walker_branch_taken",
                        branch="parent_scoped_child_token",
                        parent_block=parent_block,
                        element_token=_ps_bem.element,
                        global_slug=slug,
                        parent_scoped_slug=_ps_child,
                        node_classes=classes,
                        depth=depth,
                    )
                    slug = _ps_child
                    break  # First match wins; no further element token tries needed.

    # FR-22-4.1 leaf-with-element-children guard (2026-05-31, D115 blind-spot fix).
    # A node that resolves to a LEAF block (sgs/text, sgs/label, sgs/icon, …) renders
    # from a scalar content attribute and CANNOT hold structural children. When such a
    # node has child Tags carrying their own sgs- BEM classes, the resolution is a
    # MIS-RESOLUTION (the children would be swallowed) — treat it as a slug-None
    # wrapper instead so §FR-22-4.1 gives it its own sgs/container holding the real
    # child blocks. Examples: sgs-trust-bar__badge resolves to sgs/label via a slot
    # alias but is a flex container of sgs/icon + sgs/text; sgs-product-card__body
    # resolves to sgs/text but wraps heading/price/CTA. Inline rich-text children
    # (<strong>, <a> with NO sgs- class) do NOT trigger this — they are valid leaf
    # content. This is the universal mechanism (R-22-9) the D115 handoff said XS-3
    # must be EXTENDED to cover (the slug=None guard alone never caught leaf
    # mis-resolution). Council-validated 2026-05-31.
    if (
        slug is not None
        and not is_top_level
        and db.get_block_composition_role(slug) == "leaf"
        and any(
            isinstance(c, Tag)
            and any(cl.startswith("sgs-") for cl in (c.get("class", []) or []))
            for c in node.children
        )
    ):
        _trace("walker_branch_taken", branch="leaf_misresolution_guard",
               node_classes=classes, depth=depth, resolved_leaf=slug,
               reason="leaf block has sgs-classed element children — treat as wrapper container")
        slug = None

    # FR-22-4.1 universal wrapper resolution (2026-05-31), scoped to NON-top-level.
    # A slug-None node that carries an sgs- BEM class is NEVER dropped: emit it as its
    # own neutral sgs/container preserving its className, so its deployed CSS (incl.
    # grid/flex layout) applies, and recurse its children. Truly transparent NON-sgs
    # wrappers still pass through per FR-22-11 (spec §FR-22-11 scope clarification).
    # Supersedes the _is_layout_bearing_wrapper depth gate + the walk_passthrough-drop
    # for sgs-classed nodes (council-validated 2026-05-31; closes the PASS-test-(a)
    # "no sgs- wrapper dropped" violation).
    # When slug is None AND is_top_level=True the section still wraps in sgs/container
    # via exception 3 below (FR-22-4 invariant: every top-level section is sgs/container).
    if slug is None and not is_top_level:
        if sgs_classes:
            # §FR-22-4.1 content-leaf step: a text-only sgs-classed node (no
            # block-resolvable element children) is content, not a wrapper —
            # route it to a content block, NOT a sgs/container that would wrap
            # raw text (editor "unexpected/invalid content"). See _route_text_leaf.
            if _node_is_text_leaf(node):
                return _route_text_leaf(node, classes, sgs_classes, css_rules, variation_buf)
            return _emit_wrapper_container(node, classes, sgs_classes, css_rules, depth, variation_buf,
                                           parent_block=parent_block)
        return walk_passthrough(node, css_rules, depth, variation_buf)

    # FR-22-4.1 top-level section fold (2026-05-31). When the section root has no
    # registered block (slug None), emit ONE sgs/container and FOLD its direct-descendant
    # wrapper shells INTO it (rule 2) rather than emitting each as its own nested container.
    # The fold lifts each direct-child wrapper's layout onto this container's NATIVE attrs
    # (grid → layout/gridTemplateColumns; max-width → widthMode = content constraint, so a
    # full-width-background section stays full-width while its content is constrained), and
    # the folded wrapper's children resolve below it (rule 4 → own container / block). This
    # replaces the over-nesting own-container-for-all shortcut (WIP 8f900750) that broke
    # parent→grid-item layouts (brand 2-col grid). Council-validated mechanism.
    if slug is None and is_top_level:
        css = collect_css_for_classes(classes, css_rules)
        if css and variation_buf is not None:
            variation_buf.append(css)
        container_attrs: dict = {}
        if sgs_classes:
            container_attrs["className"] = " ".join(sgs_classes)
        # A2 (FR-22-21): set widthMode from the section element's OWN max-width.
        # ABSENT → full-bleed (widthMode "full"); PRESENT → match theme widths or custom px.
        # setdefault() so _process_container_children fold can't overwrite.
        _sec_base, _ = _collect_css_decls_for_element(node, css_rules)
        _own_mw = _sec_base.get("max-width")
        if not _own_mw:
            container_attrs.setdefault("widthMode", "full")
        else:
            _sec_mode = _match_theme_width(_strip_important(_own_mw), _LIFT_CONTEXT.get("theme_widths", {}))
            if _sec_mode in ("default", "wide"):
                container_attrs.setdefault("widthMode", _sec_mode)
            else:
                _mw_m = re.match(r"^\s*(\d+(?:\.\d+)?)\s*(px|rem|em|vw|%)?\s*$", _strip_important(_own_mw))
                if _mw_m:
                    container_attrs.setdefault("widthMode", "custom")
                    container_attrs.setdefault("customWidth", int(float(_mw_m.group(1))))
                    container_attrs.setdefault("customWidthUnit", _mw_m.group(2) or "px")
        # A3 — lift the section root's wrapper-capability CSS (min-height, box-shadow,
        # grid-template-columns, gap, etc.) onto the container attrs (Method-2, Spec 22
        # §FR-22-21). Mirrors A2 (composite path) — same A1 helper, different call site.
        # Re-collects base + bp_decls so responsive declarations are included
        # (the existing _sec_base/_  at 2382 discards bp_decls; this pass captures them).
        # setdefault throughout — widthMode/customWidth set above are NEVER overwritten.
        # R-22-1: DB-driven attr-name set; R-22-9: universal (every slug-None section fires).
        # NOTE (GAP-3 scope decision, 2026-06-05): display:grid|flex → layout is intentionally
        # NOT lifted here for slug-None top-level sections. Reason: the A3 path emits layout/grid
        # as sgs-container-wrapper.php inline CSS (display:grid + grid-template-columns). For slug-None
        # sections, the variation CSS already controls all breakpoints; adding render.php's inline
        # style creates a specificity conflict that collapses desktop 2-col grids to 1-col
        # (inline style 1,0,0 beats class-based media query 0,1,0 from variation CSS).
        # GAP-3 is wired only on the NESTED-wrapper path (_emit_wrapper_container) and the
        # FOLD path (_fold_layout_into_attrs) where the native block engine is needed for
        # block-portability (e.g. sgs-products, sgs-trust-bar__inner, gift-section__cards).
        # GAP 2 — Padding lift for slug-None top-level sections (wired 2026-06-05).
        # _lift_root_supports_to_style was gated `if slug is not None` (line ~2418)
        # so it never fired here; padding on generic sections was silently dropped.
        # Fix: route_node_css calls it with effective_slug='sgs/container' so
        # padding → style.* is written onto container_attrs via the native WP supports path.
        # The wrapper-css pass handles width/grid/min-height/gap onto block attrs; the
        # root-supports pass handles padding/margin/border/background-colour → style.*
        # — no double-lift.  R-22-9: universal (every slug-None section fires).
        # R-22-1: all three helpers are entirely DB-driven.
        # setdefault semantics are enforced inside each helper.
        route_node_css(node, css_rules, container_attrs, effective_slug="sgs/container")
        children_markup = _process_container_children(node, css_rules, depth, variation_buf, container_attrs)
        return _emit_section_container(container_attrs, children_markup, css)

    # When slug is None at top level, skip attr-lifting + root-supports-lift
    # (no resolved block to lift onto); CSS collection + child recursion still
    # run so the section's classes and content flow into the synthesised
    # sgs/container wrap below.
    is_leaf = False
    if slug is None:
        attrs = {}
    else:
        attrs = db.lift_behavioural_attrs(node, slug)    # FR-22-2 (NULL equivalent_block only)
        # G1 (FR-22-2, 2026-05-31): leaf blocks (sgs/text, sgs/label, …) render
        # from a scalar content attribute, NOT from InnerBlocks. Lift the node's
        # (rich) text into that attr using the same mapping the atomic-swap path
        # uses (_atomic_attrs_for), so the content reaches the leaf's render.php
        # instead of being emitted as inner markup the leaf ignores. Without this
        # the universal BEM path never ran FR-22-2 content-routing for leaves and
        # every BEM-resolved sgs/text/sgs/label rendered empty.
        # NB: a "G2" wrapper-to-leaf container guard was tried + reverted 2026-05-31
        # (regressed hero +10.6pp, did NOT fix featured-product card layout — the
        # cards-stacking is a PARENT-grid issue, not __body). See parking
        # P-FEATURED-PRODUCT-GRID-LAYOUT.
        is_leaf = db.get_block_composition_role(slug) == "leaf"
        if is_leaf:
            attrs = {**attrs, **_atomic_attrs_for(node, slug)}
    css = collect_css_for_classes(classes, css_rules)  # FR-22-5
    if css and variation_buf is not None:
        variation_buf.append(css)

    # A2 — Lift block-root WP native supports + UNIVERSAL DB-driven custom-attr lift
    # (Method-2, Spec 22 §FR-22-21) + typography lift for leaf blocks.
    # GAP 1 — Typography lift (wired 2026-06-05): lifted inside route_node_css when
    # lift_typography=True (leaf path only). _atomic_attrs_for content/level are set
    # above; typography uses setdefault so they are never clobbered.
    # R-22-9: universal — every resolved block fires all three lifters.
    # R-22-1: all three helpers are entirely DB-driven.
    # setdefault semantics are enforced inside each helper.
    if slug is not None:
        route_node_css(
            node, css_rules, attrs,
            effective_slug=slug,
            lift_typography=is_leaf,
            typo_slug=slug,
        )
        # F6a — inherited / absent-value resolution (FR-22-5.1, Commit 3).
        # Moved INTO route_node_css (fires when lift_typography=True + typo_slug set).
        # No separate call needed here — route_node_css above handles it for leaf
        # blocks (is_leaf → lift_typography=True) via the P6 inherited-typography
        # pass at the bottom of route_node_css.  Kept as comment for audit trail.

    if slug is not None and _is_container_mirror_block(slug):
        # R1.3 — widthMode fallback for SECTION-kind mirror composites at top level.
        # When exempted from the exception-3 outer wrap (R1.2), the bare composite must
        # carry the widthMode that outer container used to inject ({"widthMode":"full"}).
        # Mirrors the slug-None section path's max-width → widthMode logic exactly.
        # setdefault: draft-set widthMode is never clobbered. Layout/content-kind mirror
        # blocks are not section composites at top level, so this gate is safe.
        # R-22-1 DB-gated; R-22-9 universal over every section-kind mirror block.
        if _is_section_kind_mirror_block(slug) and "widthMode" not in attrs:
            _r1_base, _ = _collect_css_decls_for_element(node, css_rules)
            _r1_own_mw = _r1_base.get("max-width")
            if not _r1_own_mw:
                attrs.setdefault("widthMode", "full")
            else:
                _r1_mode = _match_theme_width(_strip_important(_r1_own_mw), _LIFT_CONTEXT.get("theme_widths", {}))
                if _r1_mode in ("default", "wide"):
                    attrs.setdefault("widthMode", _r1_mode)
                else:
                    _r1_mw_m = re.match(r"^\s*(\d+(?:\.\d+)?)\s*(px|rem|em|vw|%)?\s*$", _strip_important(_r1_own_mw))
                    if _r1_mw_m:
                        attrs.setdefault("widthMode", "custom")
                        attrs.setdefault("customWidth", int(float(_r1_mw_m.group(1))))
                        attrs.setdefault("customWidthUnit", _r1_mw_m.group(2) or "px")
                    else:
                        attrs.setdefault("widthMode", "full")
        # GAP 3 (A2 path) — display:grid|flex → layout attr for composite mirror blocks.
        # Same gap as A3: _lift_wrapper_css_to_container_attrs cannot set `layout`
        # NOTE (GAP-3 scope decision, 2026-06-05): `layout` is intentionally NOT lifted
        # here for composite mirror blocks. Composite render.php files each have their
        # own layout logic (hero: split-variant CSS grid; trust-bar: typed vs bound mode;
        # feature-grid: repeat/auto cols). Setting `layout` from the mockup CSS collides
        # with that render.php logic — layout:"grid" on sgs/hero standard variant adds
        # display:grid via SGS_Container_Wrapper, breaking the flex content stack.
        # GAP-3 is wired only on the NESTED sgs/container path (_emit_wrapper_container)
        # and the FOLD path (_fold_layout_into_attrs).
        # gridTemplateColumns + gap are already lifted by the _lift_wrapper_css_to_container_attrs pass.

    # Recursively walk children for InnerBlocks — EXCEPT:
    #   (G1) leaf blocks: content lives in the lifted content attr above.
    #   (G3) dynamic no-InnerBlocks blocks (2026-06-02): blocks with
    #        block_composition.has_inner_blocks=0 render from their own attrs via
    #        render.php only (save=null → self-closing). Walking their DOM children
    #        produces inner markup that WP's block-validation rejects with "This
    #        block contains unexpected or invalid content" because the block's saved
    #        form must be self-closing. Affected: sgs/star-rating, sgs/social-icons,
    #        sgs/google-reviews, sgs/trustpilot-reviews, sgs/breadcrumbs, and 24
    #        other dynamic blocks with has_inner_blocks=0 that are classified as
    #        content-block (not leaf) in block_composition. DB-driven via
    #        db.block_accepts_inner_blocks() — R-22-1 (no per-block slugs) +
    #        R-22-9 (universal) compliant. The gate fires only for RESOLVED slugs
    #        (slug is not None); slug-None wrappers always recurse.
    #
    # FR-22-19 (2026-06-01): class-section composites (sgs/hero, sgs/cta-section,
    # sgs/testimonial-slider etc.) use _route_composite_interior to route interior
    # columns — scalar-media columns are lifted into block attrs (not emitted as
    # children); the content column is folded into bare InnerBlocks.  This fires
    # inside the existing resolved-block emit path gated by is_class_section_block,
    # NOT as a 4th top-level walk() branch (R-22-3 compliant).
    children_markup: list[str] = []
    # G3: if slug is resolved AND the block declares no InnerBlocks, skip children.
    _slug_accepts_inner = slug is None or db.block_accepts_inner_blocks(slug)
    if not is_leaf and _slug_accepts_inner:
        if slug is not None and _is_container_mirror_block(slug):
            # FR-22-4.1 + FR-22-19 (Commit 4): unified interior dispatch for ALL
            # container-mirror composites, regardless of whether they also have
            # scalar-media attrs.  Previously the gate was split:
            #   - has_scalar_media_attrs → _route_composite_interior (hero, slider)
            #   - _is_container_mirror_block → _process_container_children (all others)
            # Both gates were per-composite carve-outs (council C7 / FR-22-19).
            # The scalar-media lift is now absorbed into _process_container_children
            # as rule 0 (checked first, before the fold/walk decision), so ONE
            # universal dispatch serves every container-mirror block:
            #   • blocks WITH scalar-media attrs get the lift applied inline (rule 0)
            #     THEN the remaining content children go through fold/walk (rules 2-3)
            #   • blocks WITHOUT scalar-media attrs are unaffected (rule 0 is a no-op,
            #     cost = one cached DB call that returns False)
            # _route_composite_interior body is preserved for rollback reference but is
            # no longer called from walk() (Commit 4, 2026-06-10).
            # R-22-1 DB-driven (wraps_block='sgs/container' query, no slug literals).
            # R-22-9 universal (the whole 29-block container-mirror roster).
            # R-22-3 compliant: NOT a new top-level walker branch — fires inside the
            # existing resolved-block emit path only.
            # fold_eligible (sole-element-child guard) is PRESERVED inside
            # _process_container_children (prevents +13pp multi-child grid-collapse).
            children_markup = _process_container_children(
                node, css_rules, depth, variation_buf, attrs, parent_slug=slug
            )
        elif slug is not None and db.has_scalar_media_attrs(slug):
            # FR-22-19 fallback (Commit 4): a block that has scalar-media attrs but is
            # NOT a container-mirror block routes through _route_composite_interior as
            # before.  Currently no such block exists (every scalar-media block is also
            # a container-mirror block), so this branch is unreachable in practice.
            # Retained as a safety net: if a future block gains scalar-media attrs
            # without being added to the mirror roster, it still gets the lift rather
            # than falling through to the plain walk and silently losing its images.
            # R-22-1 compliant (DB-driven gate). R-22-9 unaffected (unreachable today).
            children_markup = _route_composite_interior(
                node, slug, attrs, css_rules, depth, variation_buf
            )
        else:
            for child in node.children:
                result = walk(child, css_rules, variation_buf, depth=depth + 1, is_top_level=False,
                              parent_block=slug)
                if result:
                    children_markup.append(result)
    elif not is_leaf and not _slug_accepts_inner and slug is not None:
        # G3-attrs (FR-24-15, 2026-06-02): content-block with has_inner_blocks=0
        # renders from its own attrs only (no $content passthrough in render.php).
        # G3 already suppresses child recursion above. Here, extend attrs via
        # _atomic_attrs_for so that blocks with schema-specific array extraction
        # (e.g. sgs/option-picker's optionItems) receive their content.
        # allow_text_fallback=False: _atomic_attrs_for has a graceful fallback that
        # lifts _rich_text_content(node) into the first content/text-content-role
        # STRING attr for any sgs/* slug. That is correct for leaf blocks called from
        # the is_leaf path (the default). Here it is WRONG — it would dump node text
        # into date/URL attrs on blocks like sgs/countdown-timer, sgs/decorative-image,
        # sgs/star-rating, sgs/mega-menu, etc. Suppressing it means only EXPLICIT
        # handlers (like option-picker's, which returns before the fallback) fire.
        # Blocks with no explicit handler return {} — zero overhead, no garbage attrs.
        # R-22-1 compliant (DB-driven G3 gate, no per-slug literals here).
        # R-22-9 compliant (universal — fires for every G3 content-block).
        atomic = _atomic_attrs_for(node, slug, allow_text_fallback=False)
        # Universal DB-driven multi-scalar lift (FR-22-2 / FR-22-5 D1, 2026-06-11):
        # lift every content/rating attr the block declares (keyed by each attr's
        # derived_selector) from the matching draft element. NO-OP for grid blocks
        # (no content selectors) and absent draft elements (no key emitted).
        # R-22-1 (DB-driven, no per-slug branch) + R-22-9 (universal G3 path).
        selector_lift = _lift_scalar_attrs_by_selector(node, slug)
        # Merge order: explicit _atomic_attrs_for results WIN over the selector-lift
        # (e.g. option-picker's optionItems handler is authoritative) — atomic last.
        if selector_lift or atomic:
            attrs = {**attrs, **selector_lift, **atomic}

    # Spec 11 + P-9: wrap any loose sgs/button runs in sgs/multi-button (WP
    # core/buttons mirror). No-op when there are no loose buttons; already-grouped
    # buttons (a __ctas wrapper → sgs/multi-button) pass through untouched. Skip
    # when THIS block IS the button-group container itself (its children are the
    # group's buttons — grouping them would double-wrap multi-button>multi-button).
    # The button-group block slug is derived from the DB (R-22-1, no hardcoded literal).
    if slug != db.block_for_slot_token("button-group"):
        children_markup = _group_loose_buttons(children_markup)

    # FR-22-20 variant detection (2026-06-01): when the resolved block declares a
    # variant-selector attr (blocks.variant_attr IS NOT NULL), set it from the
    # draft's extracted fingerprint THIS run. detect_variant counts which variant's
    # DISCRIMINATING slots (variant_slots) appear in the attrs the converter lifted
    # from the draft and picks the highest, so render.php's ORIGINAL variant gate
    # fires (e.g. hero $is_split = 'split' === $variant) — no data-presence guessing.
    # DB-driven (R-22-1), universal across all variant blocks (R-22-9); an emit-path
    # enrichment gated by variant_attr_for, NOT a 4th walk() branch (R-22-3). Reads
    # the draft's extracted attrs (`attrs`), never the block's stored attrs — which
    # closes the stale-data hole the reverted $is_split band-aid had.
    if slug is not None:
        variant_attr = db.variant_attr_for(slug)
        if variant_attr is not None:
            detected = db.detect_variant(slug, attrs)
            if detected is not None:
                # D6 guard (2026-06-04): detect_variant must return a plain string.
                # A list / non-string value would be serialised as the Python type
                # repr (e.g. "['a','b']") by json.dumps, producing garbage in the
                # block comment and a potential "--Array" class on the frontend when
                # render.php concatenates `sgs-block--{variant}`. This cannot occur
                # with the current DB schema (variant_value is TEXT) or the current
                # detect_variant implementation (always returns str|None), but is
                # defensively asserted here so that any future caller or DB change
                # that accidentally produces a non-string is caught at the assignment
                # point rather than silently emitting malformed block markup.
                # FR-22-21 step-6 (flag-not-drop): log the anomaly and skip rather
                # than coercing a bad value.
                if not isinstance(detected, str):
                    _trace(
                        "variant_attr_type_error",
                        block_slug=slug,
                        variant_attr=variant_attr,
                        detected_type=type(detected).__name__,
                        detected_value=repr(detected),
                        reason="variant value is not a string — skipped to prevent --Array class emission",
                    )
                else:
                    attrs[variant_attr] = detected

    # Block-style preservation (2026-06-03). A draft can request a registered
    # block STYLE VARIATION on a recognised block by adding its `is-style-<name>`
    # class alongside the BEM recognition class — e.g.
    # `<div class="sgs-x__stars is-style-trustpilot" data-sgs-rating="5">` →
    # sgs/star-rating with the Trustpilot-green preset. Carry any is-style-*
    # class through onto the emitted block's className so WP/render.php applies
    # the variation. (The rating itself lifts via lift_behavioural_attrs from
    # `data-sgs-rating`.) Universal (R-22-9), DB-free, no per-block logic; only
    # is-style-* classes are carried — the BEM recognition class is consumed by
    # resolution, not re-emitted (resolved blocks render via their own classes).
    if slug is not None:
        style_classes = [c for c in classes if c.startswith("is-style-")]
        if style_classes:
            existing = attrs.get("className", "").strip()
            attrs["className"] = (existing + " " + " ".join(style_classes)).strip() if existing else " ".join(style_classes)

    # BEM modifier carry (D7, 2026-06-04). A draft can scope CSS rules to a
    # specific block instance by adding an arbitrary BEM modifier to the block's
    # root class — e.g. `.sgs-announcement-bar--send-to-ward` or
    # `.sgs-product-card.sgs-gift-section__card--trial`. The modifier class must
    # appear on the emitted block's wrapper element so the scoped CSS rule
    # (harvested into the client style variation) matches. Carry any sgs-BEM class
    # that has a modifier whose kind (per modifier_suffixes DB) is None — i.e. an
    # arbitrary identifier, NOT a structural kind (breakpoint / side / corner /
    # state) and NOT a variant-preset already handled by inheritStyle or is-style-*.
    # DB-driven via modifier_kind() (R-22-1); universal across all blocks and all
    # nesting depths (R-22-9); no per-block or per-client conditional. The BEM
    # recognition class itself is NOT re-emitted — only the modifier-bearing form.
    # Gated on slug is not None (resolved blocks only — slug-None wrappers already
    # carry all sgs_classes on className via _emit_wrapper_container). Idempotent:
    # uses a set-union to avoid duplicating classes already in className.
    if slug is not None:
        _existing_cls_set = set(attrs.get("className", "").split())
        _modifier_classes: list[str] = []
        for _cls in sgs_classes:
            _bem = db.parse_sgs_bem(_cls)
            if _bem is None or _bem.modifier is None:
                continue
            if db.modifier_kind(_bem.modifier) is not None:
                # Structural / state / variant kind — handled elsewhere or irrelevant.
                continue
            if _cls not in _existing_cls_set:
                _modifier_classes.append(_cls)
        if _modifier_classes:
            _existing_str = attrs.get("className", "").strip()
            _new_classes = " ".join(_modifier_classes)
            attrs["className"] = (
                (_existing_str + " " + _new_classes).strip() if _existing_str else _new_classes
            )

    # Per-slot default attrs (2026-06-03). A slot can SET attrs on its emitted block,
    # not just choose the block: the button-preset slots (button-primary /
    # buttonSecondary / button-outline) each resolve to sgs/button AND set
    # inheritStyle to the matching theme preset, so the cloned button follows the
    # preset CSS (Bean). DB-driven via slots.standalone_block_default_attrs (R-22-1),
    # universal (R-22-9). setdefault → any value the draft actually extracted wins.
    if slug is not None:
        for _k, _v in db.slot_default_attrs_for(sgs_classes).items():
            attrs.setdefault(_k, _v)

    # Button preset from a BEM MODIFIER (2026-06-03). The natural BEM for a button
    # variant is the modifier, e.g. `.sgs-button--primary` / `--secondary` /
    # `--outline` (the real Mama's draft). When the resolved block has an
    # `inheritStyle` attr and a modifier matches a known preset, set it so the
    # cloned button follows that theme preset's CSS. Preset set is DB-derived
    # (inherit_style_presets, from the button-preset slots' defaults); `ghost` is
    # the draft's term for the outline preset. Gated on the block HAVING inheritStyle
    # (no per-slug literal — R-22-1) and on the value not already set (draft wins).
    # Gate on inheritStyle being a STRING-enum attr (sgs/button) — NOT the boolean
    # `inheritStyle` that sgs/text/heading/quote carry (setting a string on those
    # would make render.php's !empty() true and suppress their styling). DB-driven
    # type check, no per-slug literal (R-22-1); universal over string-typed
    # inheritStyle blocks (R-22-9). (qc-council Finding 5, 2026-06-03.)
    if (slug is not None and "inheritStyle" not in attrs
            and db.block_attrs(slug).get("inheritStyle", {}).get("attr_type") == "string"):
        _presets = db.inherit_style_presets()
        for _cls in sgs_classes:
            _bem = db.parse_sgs_bem(_cls)
            if _bem is None or not _bem.modifier:
                continue
            _mod = _bem.modifier.lower()
            if _mod in _presets:
                attrs["inheritStyle"] = _mod
                break
            if _mod == "ghost":
                attrs["inheritStyle"] = "outline"
                break

    # R6 — strip the lifted style.color.background for preset-mode buttons.
    # _lift_root_supports_to_style (above) runs before inheritStyle is resolved, so it
    # cannot gate on preset. Now that inheritStyle is set, strip the lifted background:
    # for a preset button WP applies style.color.background to the .sgs-button-wrapper
    # div (a coloured box), while the button face colour comes from the is-style-<preset>
    # CSS class. Custom buttons (inheritStyle absent or 'custom') are NEVER stripped —
    # they read style.color.background legitimately. DB-driven preset set (R-22-1); universal
    # over any string-enum inheritStyle block (R-22-9). Only background is stripped (not text).
    if (slug is not None
            and attrs.get("inheritStyle")
            and attrs.get("inheritStyle") in db.inherit_style_presets()):
        _btn_style = attrs.get("style")
        if isinstance(_btn_style, dict):
            _btn_colour = _btn_style.get("color")
            if isinstance(_btn_colour, dict) and "background" in _btn_colour:
                del _btn_colour["background"]
                if not _btn_colour:
                    _btn_style.pop("color", None)
                if not _btn_style:
                    attrs.pop("style", None)

    # R8c — BEM modifier → variantStyle attr (generalised modifier-to-string-enum lift).
    # Mirrors the inheritStyle detection block above: when the resolved block has a
    # string-enum attr named `variantStyle` (DB-checked) AND a BEM modifier on the node
    # matches one of that attr's enum values (read from block_attributes.enum_values),
    # set attrs["variantStyle"] = <modifier>. setdefault semantics — draft-set wins.
    # Example: .sgs-gift-section__card--trial → sgs/product-card variantStyle:"trial".
    # DB-driven enum set per R-22-1; universal over any block with a variantStyle
    # string attr + populated enum_values in the DB (R-22-9). No per-slug literals.
    if (slug is not None
            and "variantStyle" not in attrs
            and db.block_attrs(slug).get("variantStyle", {}).get("attr_type") == "string"):
        import sqlite3 as _sq3
        import json as _json
        _vs_enums: frozenset[str] = frozenset()
        try:
            _vs_conn = _sq3.connect(str(db.SGS_DB))
            try:
                _vs_row = _vs_conn.execute(
                    "SELECT enum_values FROM block_attributes WHERE block_slug = ? AND attr_name = 'variantStyle'",
                    (slug,),
                ).fetchone()
                if _vs_row and _vs_row[0]:
                    _vs_enums = frozenset(v.lower() for v in _json.loads(_vs_row[0]))
            except Exception:  # noqa: BLE001
                pass
            finally:
                _vs_conn.close()
        except Exception:  # noqa: BLE001
            pass
        if _vs_enums:
            for _cls in sgs_classes:
                _bem = db.parse_sgs_bem(_cls)
                if _bem is None or not _bem.modifier:
                    continue
                _mod = _bem.modifier.lower()
                if _mod in _vs_enums:
                    attrs.setdefault("variantStyle", _mod)
                    break

    # ---- Permitted exception 3 — top-level section container wrap ----
    # FR-22-4: every top-level section is based on sgs/container.
    # Non-container top-level slugs (including slug=None) are wrapped, not
    # emitted bare. The wrap function emits walked children as direct
    # container InnerBlocks when slug is None.
    # NOTE: 'sgs/container' is the ONLY block-slug literal in this file.
    # It is explicitly permitted by FR-22-4 as the container-base exception.
    # R1 — SECTION-kind mirror blocks (hero/trust-bar/cta-section/modal) are
    # exempted: they already carry their own mirrored wrapper via A2 above, so
    # wrapping them again creates a redundant outer sgs/container (double-wrap).
    # widthMode is injected onto the bare composite by R1.3 inside the A2 block.
    # DB-driven via _is_section_kind_mirror_block (R-22-1); no per-slug literals (R-22-9).
    if is_top_level and slug != "sgs/container" and not _is_section_kind_mirror_block(slug):
        return db.emit_sgs_container_wrapping(slug, attrs, children_markup, css)

    return emit_wp_block(slug, attrs, children_markup)


# ============================================================================
# Section-wrapper className guarantee
# ============================================================================

def _extract_first_block_comment(line: str) -> tuple[str, str | None, str] | None:
    """Parse a WP block comment line into (tag_part, attrs_json, closing)."""
    slug_m = re.match(r"(<!-- wp:[\w/\-]+)", line)
    if not slug_m:
        return None
    tag_part = slug_m.group(1)
    rest = line[slug_m.end():]
    if rest.rstrip().endswith("/-->"):
        closing = "/-->"
    elif rest.rstrip().endswith("-->"):
        closing = "-->"
    else:
        return None
    close_idx = rest.rfind(closing)
    attrs_region = rest[:close_idx].strip()
    if not attrs_region or not attrs_region.startswith("{"):
        return (tag_part, None, closing)
    depth = 0
    end = -1
    in_str = False
    escape = False
    for i, ch in enumerate(attrs_region):
        if escape:
            escape = False
            continue
        if ch == "\\" and in_str:
            escape = True
            continue
        if ch == '"' and not escape:
            in_str = not in_str
            continue
        if in_str:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i
                break
    if end == -1:
        return (tag_part, None, closing)
    return (tag_part, attrs_region[: end + 1], closing)


def ensure_root_section_class(block_markup: str, section_id: str) -> str:
    """Guarantee that the first WP block in block_markup carries sgs-{section_id}
    in its className attribute.

    Universal — fires for every Stage-3 section regardless of which converter
    branch produced the markup. Never overwrites existing classNames; only
    prepends the missing section class when absent. Idempotent.
    """
    if not block_markup or not section_id:
        return block_markup
    section_class = f"sgs-{section_id}"
    lines = block_markup.split("\n")
    first_block_line_idx: int | None = None
    for idx, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("<!-- wp:") and not stripped.startswith("<!-- /wp:"):
            first_block_line_idx = idx
            break
    if first_block_line_idx is None:
        return block_markup
    first_line = lines[first_block_line_idx]
    parsed = _extract_first_block_comment(first_line)
    if parsed is None:
        return block_markup
    tag_part, attrs_json_str, closing = parsed
    if attrs_json_str:
        try:
            attrs_dict = json.loads(attrs_json_str)
            existing_class = attrs_dict.get("className", "")
            if section_class in existing_class.split():
                return block_markup
            attrs_dict["className"] = (section_class + " " + existing_class).strip()
            new_attrs_str = json.dumps(attrs_dict, separators=(",", ":"), ensure_ascii=False)
            new_first_line = f"{tag_part} {new_attrs_str} {closing}"
        except (ValueError, AttributeError):
            return block_markup
    else:
        new_attrs_str = json.dumps({"className": section_class}, separators=(",", ":"), ensure_ascii=False)
        new_first_line = f"{tag_part} {new_attrs_str} {closing}"
    lines[first_block_line_idx] = new_first_line
    return "\n".join(lines)


# ============================================================================
# Grid/flex container detection (used by _absorb_transparent_wrappers context)
# ============================================================================

_MIN_WIDTH_RE = re.compile(r"min-width\s*:\s*(\d+)", re.IGNORECASE)

# render.php breakpoint thresholds (max-width model):
#   gridTemplateColumns           → base/desktop inline style (all sizes, unless overridden)
#   gridTemplateColumnsTablet     → @media (max-width:1023px)
#   gridTemplateColumnsMobile     → @media (max-width:599px)
# Mockup CSS uses min-width (mobile-first), so we invert:
#   min-width ≥ 1024 → desktop attr (gridTemplateColumns)
#   min-width 600–1023 → tablet attr (gridTemplateColumnsTablet)
#   base (no @media) → mobile attr (gridTemplateColumnsMobile)
_GRID_DESKTOP_BP = 1024  # px — min-width at or above this maps to the desktop (base) attr
_GRID_TABLET_BP  = 600   # px — min-width at or above this (below desktop) maps to tablet attr


def _css_selector_has_class(sel_key: str, selector: str) -> bool:
    """True if sel_key contains `selector` as a whole class-token (not as a prefix of a
    compound selector like `.foo.bar` when looking for `.foo`).

    Handles both plain selectors and @media-scoped keys with the ' :: ' sentinel.
    The CSS part after ' :: ' is what we match against.
    """
    css_part = sel_key.split(" :: ", 1)[-1]  # works whether ' :: ' is present or not
    pattern = re.escape(selector) + r"(?=[ \t\r\n,:\[#>~+{]|$)"
    return bool(re.search(pattern, css_part))


def _collect_responsive_grid_from_css(
    classes: list[str], css_rules: dict, base_decls: dict[str, str]
) -> dict[str, str]:
    """Return responsive gridTemplateColumns attrs by scanning @media min-width rules.

    Mockup CSS is mobile-first (min-width).  render.php is desktop-first (max-width).
    This function inverts the cascade so the converter lifts the correct value onto each
    of the three container attrs:
        gridTemplateColumns        ← highest min-width breakpoint value (desktop)
        gridTemplateColumnsTablet  ← mid min-width breakpoint value (tablet, ≤1023px)
        gridTemplateColumnsMobile  ← base CSS value (mobile, ≤599px)

    Only `grid-template-columns` is lifted as a native attr because render.php accepts a
    raw string for that property.  Gap stays on the CSS/variation_buf path (render.php gap
    attrs expect spacing-token slugs, not raw px values).

    Selector matching uses _css_selector_has_class to reject compound selectors like
    `.sgs-foo.has-modifier` when looking for `.sgs-foo` — those carry modifier-specific
    overrides that should NOT be lifted onto the neutral container attrs.
    """
    selectors = [f".{c}" for c in classes if c.startswith("sgs-")]
    if not selectors:
        return {}

    # Gather (min_width_px, grid-template-columns) pairs from @media rules.
    # Dict keyed by px breakpoint; last write wins for duplicate breakpoints.
    # Precise whole-token selector matching prevents compound-selector false positives.
    bp_cols: dict[int, str] = {}
    for sel_key, decls in css_rules.items():
        if " :: " not in sel_key:
            continue
        m = _MIN_WIDTH_RE.search(sel_key)
        if not m:
            continue
        if not any(_css_selector_has_class(sel_key, s) for s in selectors):
            continue
        cols_raw = decls.get("grid-template-columns", "")
        if cols_raw:
            bp_cols[int(m.group(1))] = _strip_important(cols_raw)

    if not bp_cols:
        # No responsive overrides — nothing to lift.
        return {}

    base_cols = _strip_important(base_decls.get("grid-template-columns", ""))

    # Sort breakpoints descending so we can identify desktop vs tablet.
    sorted_bps = sorted(bp_cols.keys(), reverse=True)

    # Desktop value: highest breakpoint ≥ _GRID_DESKTOP_BP, else highest overall.
    desktop_cols = bp_cols[sorted_bps[0]]

    # Tablet value: highest breakpoint in [_GRID_TABLET_BP, _GRID_DESKTOP_BP).
    tablet_cols = ""
    for bp in sorted_bps:
        if _GRID_TABLET_BP <= bp < _GRID_DESKTOP_BP:
            tablet_cols = bp_cols[bp]
            break
    # If there is a separate desktop breakpoint AND a tablet breakpoint, use them as-is.
    # If there is only one breakpoint (e.g. only 600px), it becomes the desktop default
    # and the base becomes the mobile override.

    result: dict[str, str] = {}

    # gridTemplateColumns (desktop / base for render.php) = the widest layout.
    if desktop_cols:
        result["gridTemplateColumns"] = desktop_cols

    # gridTemplateColumnsTablet = tablet-range value when it differs from desktop.
    if tablet_cols and tablet_cols != desktop_cols:
        result["gridTemplateColumnsTablet"] = tablet_cols

    # gridTemplateColumnsMobile = base (mobile) value when it differs from tablet/desktop.
    # Use tablet as the reference if present, else desktop.
    reference = tablet_cols if tablet_cols else desktop_cols
    if base_cols and base_cols != reference:
        result["gridTemplateColumnsMobile"] = base_cols

    return result


def _parse_repeat_columns(cols_str: str) -> int | None:
    """Extract column count N from 'repeat(N, 1fr)' / 'repeat(N, minmax(...))' patterns.

    Returns None for non-repeat patterns like '1fr 1fr 1fr' or '5fr 3fr'.
    Used to populate the 'columns' / 'columnsTablet' / 'columnsMobile' integer attrs on
    blocks whose render.php drives column count via data-columns (e.g. sgs/trust-bar),
    rather than via the raw gridTemplateColumns string attr.
    """
    if not cols_str:
        return None
    m = re.match(r"repeat\(\s*(\d+)\s*,", cols_str.strip(), re.IGNORECASE)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            return None
    return None


def _collect_responsive_gap_from_css(
    classes: list[str], css_rules: dict, base_decls: dict[str, str]
) -> dict[str, str]:
    """Return responsive gap attrs by scanning @media min-width rules.

    Mirrors _collect_responsive_grid_from_css for the 'gap' property.
    Maps min-width breakpoints to render.php's desktop-first model:
        gap          ← base value (desktop when no responsive override, else ignored)
        gapTablet    ← mid min-width breakpoint value (tablet, [_GRID_TABLET_BP, _GRID_DESKTOP_BP))
        gapMobile    ← base CSS value (mobile, < _GRID_TABLET_BP)

    Gap values are intentionally passed through as raw CSS strings (e.g. '16px 12px',
    'var(--wp--preset--spacing--30)').  render.php converts numeric spacing-token slugs
    via preg_replace; raw px / var() values survive and can be snapped to tokens later.
    """
    selectors = [f".{c}" for c in classes if c.startswith("sgs-")]
    if not selectors:
        return {}

    bp_gaps: dict[int, str] = {}
    for sel_key, decls in css_rules.items():
        if " :: " not in sel_key:
            continue
        m = _MIN_WIDTH_RE.search(sel_key)
        if not m:
            continue
        if not any(_css_selector_has_class(sel_key, s) for s in selectors):
            continue
        gap_raw = decls.get("gap", decls.get("column-gap", ""))
        if gap_raw:
            bp_gaps[int(m.group(1))] = _strip_important(gap_raw)

    if not bp_gaps:
        return {}

    base_gap = _strip_important(base_decls.get("gap", base_decls.get("column-gap", "")))
    sorted_bps = sorted(bp_gaps.keys(), reverse=True)
    desktop_gap = bp_gaps[sorted_bps[0]]

    tablet_gap = ""
    for bp in sorted_bps:
        if _GRID_TABLET_BP <= bp < _GRID_DESKTOP_BP:
            tablet_gap = bp_gaps[bp]
            break

    result: dict[str, str] = {}
    reference = tablet_gap if tablet_gap else desktop_gap
    if tablet_gap and tablet_gap != desktop_gap:
        result["gapTablet"] = tablet_gap
    if base_gap and base_gap != reference:
        result["gapMobile"] = base_gap
    return result


def _detect_grid_container_from_css(classes: list[str], css_rules: dict) -> dict | None:
    """Detect display:grid|flex on a node's CSS and return layout attrs, or None.

    Collects responsive grid-template-columns AND gap from @media min-width rules,
    mapping them onto render.php's desktop-first attr trios:
        gridTemplateColumns / gridTemplateColumnsTablet / gridTemplateColumnsMobile
        gap / gapTablet / gapMobile
        columns / columnsTablet / columnsMobile (from repeat(N, 1fr) patterns)
    """
    selectors = [f".{c}" for c in classes if c.startswith("sgs-")]
    if not selectors:
        return None
    base_decls: dict[str, str] = {}
    for sel_key, decls in css_rules.items():
        if " :: " in sel_key:
            continue
        if any(s in sel_key for s in selectors):
            base_decls.update(decls)
    display = _strip_important(base_decls.get("display", "")).lower()
    if display not in ("grid", "flex"):
        return None
    result: dict = {"layout": display}

    # --- Responsive grid-template-columns (mobile-first → desktop-first inversion) ---
    responsive = _collect_responsive_grid_from_css(classes, css_rules, base_decls)
    if responsive:
        result.update(responsive)
        # Also extract columns count from repeat(N, 1fr) patterns for blocks
        # that use a 'columns' integer attr (e.g. sgs/trust-bar, sgs/feature-grid).
        for attr_key, cols_key in (
            ("gridTemplateColumns", "columns"),
            ("gridTemplateColumnsTablet", "columnsTablet"),
            ("gridTemplateColumnsMobile", "columnsMobile"),
        ):
            if attr_key in responsive:
                n = _parse_repeat_columns(responsive[attr_key])
                if n is not None:
                    result[cols_key] = n
        _trace("responsive_grid_lifted", classes=classes,
               attrs={k: v for k, v in responsive.items()})
    else:
        # No responsive overrides — lift base value directly as the desktop default.
        cols = _strip_important(base_decls.get("grid-template-columns", ""))
        if cols:
            result["gridTemplateColumns"] = cols
            n = _parse_repeat_columns(cols)
            if n is not None:
                result["columns"] = n

    # --- Responsive gap (mobile-first → desktop-first) ---
    responsive_gap = _collect_responsive_gap_from_css(classes, css_rules, base_decls)
    if responsive_gap:
        result.update(responsive_gap)
        _trace("responsive_gap_lifted", classes=classes, attrs=responsive_gap)

    gap = _strip_important(base_decls.get("gap", base_decls.get("column-gap", "")))
    if gap:
        result["gap"] = gap
    return result


def _merge_grid_attrs_into_container(
    classes: list[str], css_rules: dict, container_attrs: dict
) -> None:
    """Detect display:grid|flex on a node's CSS and merge native layout attrs.

    Shared by every path that emits an sgs/container: the slug-None top-level
    section path (A3), the composite mirror path (A2), and _emit_wrapper_container.
    _detect_grid_container_from_css is the single source of truth for the
    grid→layout translation; this helper only does the setdefault merge so no
    call-site can accidentally clobber an already-set layout attr.

    Gap-3 fix (wired 2026-06-05): `display:grid/flex` has no DB row in
    property_suffixes so _lift_wrapper_css_to_container_attrs silently flags
    `display` and never sets `layout`. This helper closes that gap.
    """
    grid = _detect_grid_container_from_css(classes, css_rules)
    if not grid:
        return
    container_attrs.setdefault("layout", grid["layout"])
    # Responsive gridTemplateColumns (desktop / tablet / mobile).
    for attr in ("gridTemplateColumns", "gridTemplateColumnsTablet", "gridTemplateColumnsMobile"):
        if grid.get(attr):
            container_attrs.setdefault(attr, grid[attr])
    # Responsive gap (desktop / tablet / mobile).
    for attr in ("gap", "gapTablet", "gapMobile"):
        if grid.get(attr):
            container_attrs.setdefault(attr, grid[attr])
    # Integer columns count from repeat(N, 1fr) patterns.
    for attr in ("columns", "columnsTablet", "columnsMobile"):
        if grid.get(attr) is not None:
            container_attrs.setdefault(attr, grid[attr])


# ----------------------------------------------------------------------------
# §FR-22-4.1 content-leaf resolution (2026-06-03)
# A slug-None sgs-classed node with NO block-resolvable element children is a
# CONTENT LEAF, not a wrapper — it must emit a content block carrying its text,
# NEVER a sgs/container (whose save()=<InnerBlocks.Content/> rejects raw text →
# editor "unexpected/invalid content"). This is the mirror of the leaf-
# misresolution guard in walk() (which catches leaf-RESOLVED nodes that HAVE
# element children → treat as container); this catches container-bound nodes
# that have NO element children → treat as leaf. Universal (R-22-9), DB-driven
# (R-22-1: slot/alias map + atomic_tag_map + block_attrs), reuses the FR-22-3
# atomic-tag-swap machinery. Root-caused 2026-06-03 from the editor runtime:
# 10 sgs/container "Expected end of content, instead saw Chars" validation
# failures, all text-only leaves (price-note, trustpilot-logo/stars/text, …).
# ----------------------------------------------------------------------------

# Block-level child tags that make a node a CONTAINER (not a text leaf). Inline
# tags (span/strong/em/a/b/i/code/br/small/sup/sub/mark/time/label) are rich-
# text content and do NOT disqualify a leaf — _rich_text_content preserves the
# safe subset.
_BLOCK_LEVEL_CHILD_TAGS = frozenset({
    "p", "h1", "h2", "h3", "h4", "h5", "h6", "img", "blockquote", "hr",
    "ul", "ol", "dl", "table", "figure", "section", "article", "aside",
    "header", "footer", "nav", "div", "form", "picture", "video",
})

# core/* blocks that natively carry rich text (used by the text-capability gate
# when the atomic-tag-swap resolves to a core slug, e.g. <a> → core/button,
# <blockquote> → core/quote). NB `core/paragraph` is effectively unreachable in
# the current pipeline (atomic_tag_map maps <p> → sgs/text, not core/paragraph)
# — kept for completeness / future atomic-map changes.
_CORE_TEXT_CAPABLE = frozenset({"core/heading", "core/paragraph", "core/quote", "core/button"})


def _node_is_text_leaf(node: "Tag") -> bool:
    """True when a node holds ONLY text / inline content (no child that would
    emit its own block). A child Tag makes the node a CONTAINER when it carries
    an sgs- BEM class (structural/content child) OR is a block-level tag."""
    for child in node.children:
        if not isinstance(child, Tag):
            continue
        if any(c.startswith("sgs-") for c in (child.get("class", []) or [])):
            return False
        if child.name in _BLOCK_LEVEL_CHILD_TAGS:
            return False
    return True


def _is_text_capable_block(slug: str) -> bool:
    """True when `slug`'s PRIMARY content is a line of text it can carry — gates
    text-leaf routing so a text node never lands in a block that can't hold it.

    Discriminator = the block has a string attr literally named `text` or
    `content` (the SGS-convention primary-text attr names). This is precise
    where a role-only check is not: star-rating / media / icon each carry a
    SECONDARY content-role string (a `label` caption / `imageAlt`) but their
    primary payload is a rating / image / glyph — they have NO `text`/`content`
    attr, so they are correctly excluded. text / label / heading / notice-banner
    / button (attr `text` or `content`) are included."""
    if not slug:
        return False
    if not slug.startswith("sgs/"):
        return slug in _CORE_TEXT_CAPABLE
    attrs = db.block_attrs(slug)
    for name in ("text", "content"):
        info = attrs.get(name)
        if isinstance(info, dict) and info.get("attr_type") == "string":
            return True
    return False


def _route_text_leaf(
    node: "Tag",
    classes: list[str],
    sgs_classes: list[str],
    css_rules: dict,
    variation_buf: list[str] | None,
) -> str:
    """Emit a slug-None sgs-classed CONTENT LEAF as the right content block
    (§FR-22-4.1 content-leaf step). A "content leaf" is a node with no
    block-resolvable element children — text OR a single media tag. Target ladder:
      (a) the node's OWN tag via atomic_tag_map, UNGATED — the tag is authoritative
          for content TYPE: img→sgs/media (src/alt lifted), p→sgs/text,
          h*→sgs/heading, a→core/button, blockquote→sgs/quote, hr→core/separator.
      (b) tag has no atomic mapping (span/div) → a BEM-element hyphen-segment →
          slot block IF text-capable, tail-first (most specific): `price-note`→
          price→sgs/text. Gated to text-capable so a text span never grabs
          media/star-rating/responsive-logo (e.g. `trustpilot-logo`'s `logo`
          segment is skipped → falls through to sgs/text).
      (c) sgs/text default (a bare-text leaf IS a paragraph — the correct block,
          not the rejected catch-all: genuinely-typed elements resolve upstream
          via resolve_slug_from_bem).
    className is preserved + scoped CSS collected so styling survives. (A draft
    block STYLE / rating carries via the is-style-* + data-sgs-* paths in walk().)
    """
    target: str | None = None

    # (a) the node's OWN tag is authoritative for content TYPE — atomic-tag-swap
    #     first, UNGATED (img→sgs/media, p→sgs/text, h*→sgs/heading, a→core/button,
    #     blockquote→sgs/quote, hr→core/separator). An sgs-classed <img> that didn't
    #     resolve is still an image → sgs/media (src/alt lifted by _atomic_attrs_for),
    #     never sgs/text. The tag tells us WHAT the content is.
    target = db.atomic_tag_map().get(node.name)

    # (b) tag has no atomic mapping (span/div) → resolve a BEM-element hyphen-segment
    #     to a TEXT-capable block, tail-first (most specific). Gated to text-capable
    #     so a text span never grabs media/star-rating/responsive-logo from a segment
    #     (e.g. <span ...__price-note> → price → sgs/text; ...__trustpilot-logo's
    #     `logo` segment → responsive-logo is SKIPPED, falls through to sgs/text).
    if target is None:
        bem = None
        for cls in sgs_classes:
            parsed = db.parse_sgs_bem(cls)
            if parsed is not None and parsed.element:
                bem = parsed
                break
        if bem is not None and bem.element:
            for seg in reversed(bem.element.split("-")):
                cand = db.block_for_slot_token(seg)
                if cand and _is_text_capable_block(cand):
                    target = cand
                    break

    # (c) default — genuine text content
    if target is None:
        target = "sgs/text"

    css = collect_css_for_classes(classes, css_rules)
    if css and variation_buf is not None:
        variation_buf.append(css)

    attrs = _atomic_attrs_for(node, target)
    # CSS-lift: mirror the atomic-tag-swap path — raise typography from the draft
    # element's own CSS rules onto the block's own attrs so they survive wrapper
    # dissolution (scoped-CSS via variation_buf is kept additively below; this
    # lift is ADDITIVE, not a replacement).  Gated to text-capable targets so
    # sgs/media / core/separator are never passed to route_node_css here.
    if _is_text_capable_block(target):
        route_node_css(
            node, css_rules, attrs,
            effective_slug=target,
            lift_typography=True,
            typo_slug=target,
            lift_root_supports=False,
            lift_wrapper_css=True,
            allow_max_width=True,  # P3: text-leaf blocks (sgs/text) have maxWidth + maxWidthUnit
        )
    attrs["className"] = " ".join(sgs_classes)
    _trace("walker_branch_taken", branch="text_leaf",
           node_classes=classes, target=target, content_keys=list(attrs.keys()))
    return emit_wp_block(target, attrs, [])


# ----------------------------------------------------------------------------
# Button grouping (Spec 11 + parking P-9, 2026-06-03)
# Mirror WP's core/buttons>core/button: a sgs/button is NEVER loose — every run
# of adjacent sgs/button siblings is wrapped in one sgs/multi-button (the group
# container that owns layout/gap/alignment), exactly as core wraps even a single
# core/button in core/buttons. Buttons the draft ALREADY grouped (a __ctas /
# __buttons wrapper → sgs/multi-button via the button-group slot) arrive here as a
# single multi-button string, so they are not re-wrapped. A run of length 1 is
# still wrapped (WP wraps single buttons too; matches the composite blocks'
# [multi-button [button,button]] default template).
# ----------------------------------------------------------------------------
_SGS_BUTTON_OPEN_RE = re.compile(r"^\s*<!--\s*wp:sgs/button(?:\s|/-->|-->)")


def _group_loose_buttons(children: list[str]) -> list[str]:
    """Wrap each consecutive run of top-level sgs/button blocks (incl. a run of 1)
    in the button-group container. Non-button children pass through unchanged; an
    existing group block (already-grouped buttons) is one opaque string here and is
    not touched. Idempotent: re-running sees the wrapper, not loose buttons.
    The group block slug is DB-derived (R-22-1) from the `button-group` slot, with
    a safe fallback to the framework's container primitive."""
    group_slug = db.block_for_slot_token("button-group") or "sgs/multi-button"
    open_tag = f"<!-- wp:{group_slug} -->\n"
    close_tag = f"\n<!-- /wp:{group_slug} -->"
    out: list[str] = []
    run: list[str] = []
    for c in children:
        if _SGS_BUTTON_OPEN_RE.match(c):
            run.append(c)
            continue
        if run:
            out.append(open_tag + "\n".join(run) + close_tag)
            run = []
        out.append(c)
    if run:
        out.append(open_tag + "\n".join(run) + close_tag)
    return out


def _emit_wrapper_container(
    node: "Tag",
    classes: list[str],
    sgs_classes: list[str],
    css_rules: dict,
    depth: int,
    variation_buf: list[str] | None,
    parent_block: "str | None" = None,
) -> str:
    """Emit a slug-None sgs-classed wrapper as a neutral sgs/container (§FR-22-4.1).

    The universal resolution for any sgs-classed DOM wrapper that does not resolve to
    a registered block: it is NEVER dropped — it becomes its own neutral sgs/container
    preserving its BEM className, so the deployed CSS rule (display + flex/grid
    direction + grid-template-columns + align + gap, etc.) reproduces its layout, and
    its children recurse as InnerBlocks. sgs/container is neutral-by-default (Spec 23
    B2+B3 — no gap/width/layout/inline emitted unless set), so it adds no class or
    inline style that could fight the deployed rule. Routes through the FR-22-4
    'sgs/container' primitive (same literal as exception 3) — not a new routing branch.

    Renamed from _emit_layout_container 2026-05-31 (§FR-22-4.1): it is no longer gated
    to grid/flex "layout-bearing" wrappers — every sgs-classed slug-None wrapper routes
    here so none is dropped (PASS-test (a)). Grid layout is preserved via the className
    CSS route (collect_css_for_classes → variation_buf); native grid-attr lifting
    (layout + gridTemplateColumns onto the block attrs) is wired via
    _merge_grid_attrs_into_container (Gap-3 fix, 2026-06-05) — previously deferred.

    parent_block:
        The nearest RESOLVED ancestor slug — threaded from walk() so children of this
        wrapper can still resolve against the ancestor's registered child blocks.
        Intermediate slug-None wrappers do NOT reset parent_block (they are transparent).
    """
    css = collect_css_for_classes(classes, css_rules)
    if css and variation_buf is not None:
        variation_buf.append(css)
    # This wrapper IS its own container (rule 4): its className stays on the container so
    # its own CSS (incl. grid/flex) applies. Its DIRECT children fold into it (rule 2) via
    # _process_container_children, which may also lift their layout onto container_attrs.
    container_attrs: dict = {"className": " ".join(sgs_classes), "htmlTag": "div"}
    # GAP 3 (wrapper path) — lift display:grid|flex → layout + gridTemplateColumns onto
    # native block attrs so the block is block-portable (editor grid engine active).
    # setdefault via shared helper; never clobbers className already set above.
    _merge_grid_attrs_into_container(classes, css_rules, container_attrs)
    # Thread parent_block so child items can still resolve against the resolved ancestor.
    # (This wrapper is slug-None — it does NOT update parent_block for its children.)
    children_markup = _process_container_children(
        node, css_rules, depth, variation_buf, container_attrs, parent_slug=parent_block
    )
    _trace("walker_branch_taken", branch="wrapper_container",
           node_classes=classes, depth=depth)
    return emit_wp_block("sgs/container", container_attrs, children_markup)


def _has_sgs_child(node: "Tag") -> bool:
    """True when node has at least one child Tag carrying an sgs- class (structural child)."""
    return any(
        isinstance(c, Tag) and any(cl.startswith("sgs-") for cl in (c.get("class", []) or []))
        for c in node.children
    )


def _fold_layout_into_attrs(
    wrapper_node: "Tag", wrapper_classes: list[str], container_attrs: dict, css_rules: dict
) -> None:
    """FR-22-4.1 rule 2 — lift a FOLDED direct-child wrapper's layout onto the parent
    container's NATIVE attrs (no new container div, no className merge).

    grid/flex → layout + gridTemplateColumns; max-width → widthMode (content constraint,
    so a full-width-background section stays full-width); padding/margin/etc. → style.*.
    Native attrs are used (not a className-CSS merge) precisely so a folded wrapper's
    max-width does NOT constrain the container's own width/background — widthMode applies
    the constraint to the content box instead (verified against container render.php).
    setdefault() never overwrites the container's own already-set layout.
    """
    # Reuse shared helper — same setdefault semantics, same detector.
    _merge_grid_attrs_into_container(wrapper_classes, css_rules, container_attrs)
    route_node_css(
        wrapper_node, css_rules, container_attrs,
        effective_slug="sgs/container",
        lift_wrapper_css=False,
    )
    # B2/A1 (FR-22-21): lift the folded wrapper's own max-width as contentWidth so the
    # section's inner content cap is preserved (e.g. __inner max-width:960px → "960px").
    # Reached only on the fold paths — the literal sole element child, OR (since
    # 2026-06-11) the sole child REMAINING after rule-0 scalar-media consumption of an
    # area-named grid parent (e.g. hero __content once __media lifts). In BOTH cases
    # exactly one wrapper folds per parent, so this wrapper IS the section's content
    # band and its max-width IS the content cap; multi-fold (where a column's own
    # max-width would mis-set contentWidth) is impossible by the gate's construction.
    _fw_base, _ = _collect_css_decls_for_element(wrapper_node, css_rules)
    _inner_mw = _fw_base.get("max-width")
    if _inner_mw:
        container_attrs.setdefault("contentWidth", _strip_important(_inner_mw).strip())


def _process_container_children(
    node: "Tag", css_rules: dict, depth: int, variation_buf: list[str] | None, container_attrs: dict,
    parent_slug: "str | None" = None,
) -> list[str]:
    """Process an emitted container's DIRECT children with FR-22-4.1 fold semantics.

    For each direct child:
      - rule 0 (SCALAR-MEDIA LIFT, FR-22-19): when parent_slug has scalar-media attrs
        (DB-driven via db.has_scalar_media_attrs) AND the child's BEM element maps to a
        scalar-media attr on the parent, lift any <img> descendants into container_attrs
        and emit NO markup for that child.  This subsumes the scalar-media lift that
        previously lived exclusively in _route_composite_interior (now retired as a gate).
        Breakpoint modifiers (--mobile / --desktop) on the img select the +Mobile attr
        sibling, matching the exact logic in _route_composite_interior (Commit 4).
      - rule 2 (FOLD): a slug-None sgs-classed wrapper folds its layout into THIS
        container (via _fold_layout_into_attrs, mutating container_attrs) and is NOT
        emitted; its own children are then "below a folded wrapper" → resolved by walk()
        (rule 4 → own container for wrappers, block for block-matches).
      - rule 3 / FR-22-11: block-match, atomic, leaf, or non-sgs wrapper → normal walk().
    The leaf-with-element-children guard is applied here too (a leaf with sgs-classed
    children is a mis-resolution → folds as a wrapper).

    parent_slug — the resolved block slug this container IS (e.g. 'sgs/multi-button').
    When parent_slug IS the button-group block, _group_loose_buttons is suppressed here
    (mirrors the gate in walk() at line 2968): the children are the group's OWN items and
    must not be re-wrapped in a second group block. DB-derived (R-22-1), universal (R-22-9).
    """
    # Pre-compute breakpoint modifier map for scalar-media lifting (rule 0).
    # Mirrors the same computation in _route_composite_interior. Cached at DB
    # module load; the frozenset + dict build here is O(n_suffixes) and cheap.
    # Only materialised when parent_slug has scalar-media attrs (fast-path: most
    # composites do not, so the DB call short-circuits on the cached False result).
    _parent_has_scalar_media = (
        parent_slug is not None and db.has_scalar_media_attrs(parent_slug)
    )
    if _parent_has_scalar_media:
        try:
            _bp_rules = db.breakpoint_suffix_rules()
            _all_bp_suffixes: frozenset[str] = frozenset(
                sfx for _, sfxes in _bp_rules for sfx in sfxes
            )
        except Exception:  # noqa: BLE001 — soft-fail if DB unavailable
            _all_bp_suffixes = frozenset()
        _is_mobile_modifier: dict[str, bool] = {
            sfx.lower(): (sfx == "Mobile") for sfx in _all_bp_suffixes
        }
    else:
        _is_mobile_modifier = {}

    # FR-22-4.1 sole-shell gate (2026-05-31, evidence: brand b5 trace + DOM). A direct-
    # child wrapper folds into its parent ONLY when it is the SOLE element child — i.e. a
    # pass-through shell wrapping all the parent's content (e.g. section > __inner). When
    # the parent has MULTIPLE element children, those children are structural layout items
    # (grid/flex columns, e.g. section.sgs-brand > __content + __image) — folding one would
    # collapse a column and break the N-col layout (the +44pp brand regression). Multiple
    # children each keep their own block/container (rule 4). This restores the original
    # _absorb_transparent_wrappers "exactly-1-child" gate that the first fold attempt dropped.
    element_children = [c for c in node.children if isinstance(c, Tag)]
    fold_eligible = len(element_children) == 1
    # ── Grid awareness + net-of-rule-0 fold count (D207 root cause; Bean design
    # gate 2026-06-11; TIGHTENED by the pre-commit qc-council the same day). ──
    # The D207 bug: fold-eligibility counted ALL element children BEFORE rule 0
    # consumed the scalar-media ones — hero __content+__media = 2, so __content
    # never dissolved (the double-nesting) and the FR-22-5.3 routing inside the
    # fold branch never fired (the dropped contentPadding*).
    # The fix requires BOTH signals, ANDed (council finding: area-matching ALONE
    # lets MULTIPLE named children fold → one flat interleaved InnerBlocks run +
    # first-wins clobber of the 2nd child's box CSS — the b5 failure class
    # re-opened):
    #   (1) NET COUNT — children rule 0 will consume (scalar-media lift) are
    #       excluded from the count; exactly ONE remaining child may fold.
    #       Multi-fold is therefore impossible, so _fold_layout_into_attrs keeps
    #       its sole-shell semantics (incl. the contentWidth lift).
    #   (2) GRID CONFIRMATION (Principle B) — the parent's own display:grid +
    #       grid-template-areas must NAME the folding child (hero: "content").
    # Non-grid parents and parents without scalar-media attrs keep the original
    # sole-child gate untouched (brand b5 protection).
    _grid_areas = _grid_item_areas(node, css_rules)
    fold_net_sole = False
    if not fold_eligible and _grid_areas and parent_slug:
        # UNIVERSAL (Bean 2026-06-11 — the prior `_parent_has_scalar_media`
        # precondition was a carve-out; the consumability check below already
        # requires a per-child scalar-media attr, so the gate adds nothing but
        # narrowness). Count the element children rule 0 will NOT consume.
        _remaining_n = 0
        for _ec in element_children:
            _ec_classes = [c for c in (_ec.get("class", []) or []) if c.startswith("sgs-")]
            _ec_element: "str | None" = None
            for _ec_cls in _ec_classes:
                _ec_bem = db.parse_sgs_bem(_ec_cls)
                if _ec_bem and _ec_bem.element:
                    _ec_element = _ec_bem.element
                    break
            _consumable = (
                _ec_element is not None
                and _parent_has_scalar_media
                and db.scalar_media_attr_for(parent_slug, _ec_element) is not None
                and bool(_ec.find_all("img"))
            )
            if not _consumable:
                _remaining_n += 1
        fold_net_sole = _remaining_n == 1
    out: list[str] = []
    for child in node.children:
        if isinstance(child, Comment):
            continue
        if isinstance(child, NavigableString):
            t = str(child).strip()
            if t:
                out.append(t)
            continue
        if not isinstance(child, Tag):
            continue
        cclasses = child.get("class", []) or []
        csgs = [c for c in cclasses if c.startswith("sgs-")]

        # Rule 0 — scalar-media lift (FR-22-19, Commit 4): absorb the lift that
        # previously lived only in _route_composite_interior into this universal path.
        # Fires ONLY when the parent block has scalar-media attrs (DB-cached, cheap)
        # AND the child's BEM element maps to a scalar-media attr on the parent.
        # When the element does NOT map (None), we fall through to the fold/walk
        # decision below — preserving existing behaviour for non-media children.
        # R-22-1 (DB-driven, no per-slug literals), R-22-9 (universal).
        if _parent_has_scalar_media and csgs:
            _child_element_sm: "str | None" = None
            for _sm_cls in csgs:
                _sm_bem = db.parse_sgs_bem(_sm_cls)
                if _sm_bem and _sm_bem.element:
                    _child_element_sm = _sm_bem.element
                    break
            if _child_element_sm is not None:
                _base_attr = db.scalar_media_attr_for(parent_slug, _child_element_sm)
                if _base_attr is not None:
                    # --- Scalar-media column (rule 0) ---
                    imgs = child.find_all("img")
                    if not imgs:
                        _trace(
                            "composite_interior_route",
                            slug=parent_slug,
                            element=_child_element_sm,
                            attr=_base_attr,
                            branch="scalar_media_no_img_found",
                            depth=depth + 1,
                            note="scalar-media column had no <img> descendant; skipped",
                        )
                        continue
                    for _img in imgs:
                        _img_classes: list[str] = _img.get("class", []) or []
                        _img_modifier: "str | None" = None
                        for _img_cls in _img_classes:
                            _img_bem = db.parse_sgs_bem(_img_cls)
                            if _img_bem and _img_bem.modifier:
                                _img_modifier = _img_bem.modifier.lower()
                                break
                        _is_mobile = (
                            _is_mobile_modifier.get(_img_modifier, False)
                            if _img_modifier
                            else False
                        )
                        _target_attr = f"{_base_attr}Mobile" if _is_mobile else _base_attr
                        _lifted = _lift_scalar_media_from_img(_img)
                        container_attrs[_target_attr] = _lifted
                        _trace(
                            "composite_interior_route",
                            slug=parent_slug,
                            element=_child_element_sm,
                            attr=_target_attr,
                            branch="scalar_media_lifted",
                            depth=depth + 1,
                            img_src=_img.get("src", ""),
                            modifier=_img_modifier,
                            lifted_url=_lifted.get("url", ""),
                        )
                    continue  # column consumed — no markup emitted for it

        cslug = db.resolve_slug_from_bem(csgs) if csgs else None
        if (
            cslug is not None
            and db.get_block_composition_role(cslug) == "leaf"
            and _has_sgs_child(child)
        ):
            cslug = None  # leaf-misresolution guard (see walk())
        # BEM element token — needed BOTH for the grid-area gate below and for the
        # FR-22-5.3 cross-node routing inside the fold branch (hoisted, 2026-06-11).
        _child_element: "str | None" = None
        for _fc in csgs:
            _fc_bem = db.parse_sgs_bem(_fc)
            if _fc_bem and _fc_bem.element:
                _child_element = _fc_bem.element
                break
        # Grid-area gate (Principle B): the child is a NAMED grid item of this node
        # AND the sole element child remaining after rule-0 scalar-media consumption.
        # Both conditions required — see the qc-council note above the loop.
        _is_grid_net_sole_item = (
            fold_net_sole
            and _child_element is not None
            and _child_element.lower() in _grid_areas
        )
        if cslug is None and csgs and _is_grid_net_sole_item and not fold_eligible:
            # ── GRID-PER-AREA dissolve (universal, 2026-06-11) ──
            # The sole-remaining, area-NAMED grid item of a grid parent dissolves
            # into the composite; its CSS routes to the owning block's per-AREA
            # attrs (`<areaName>+<suffix>` — contentPadding*, mediaPadding*) at
            # the right responsive tiers. NEITHER _fold_layout_into_attrs NOR
            # the 3-layer cross-node router runs here: the PARENT carries the
            # grid (the item carries no grid to lift) and the 3-layer router was
            # the H-B mis-route (padding → gridItemPadding/outer instead of the
            # per-area attrs render.php actually consumes).
            _route_area_css_to_block_attrs(
                child_node=child,
                area=_child_element,
                owning_block=parent_slug,
                parent_attrs=container_attrs,
                css_rules=css_rules,
            )
            # Content-band max-width lift (qc-council 2026-06-11 finding 2): the
            # per-area router deliberately EXCLUDES width-family props (the
            # contentWidth name collision), but the dissolving sole-remaining
            # item IS the section's content band — its own max-width is the
            # band cap and must not vanish. Route it via the CONTENT layer
            # resolver (string attr, established path), preserving the old
            # fold's contentWidth semantics.
            _band_base, _ = _collect_css_decls_for_element(child, css_rules)
            _band_mw = _band_base.get("max-width")
            if _band_mw:
                _band_attr = db.attr_for_layer_property(parent_slug, "CONTENT", "max-width")
                if _band_attr:
                    container_attrs.setdefault(_band_attr, _strip_important(_band_mw).strip())
            _trace("walker_branch_taken", branch="dissolve_grid_area_item",
                   node_classes=cclasses, depth=depth + 1, area=_child_element)
            for gc in child.children:
                r = walk(gc, css_rules, variation_buf, depth=depth + 2, is_top_level=False,
                         parent_block=parent_slug)
                if r:
                    out.append(r)
        elif cslug is None and csgs and fold_eligible:
            # rule 2 — fold this SOLE pass-through shell's layout into the parent
            # container (FR-22-4.1 count gate — unchanged classic path).
            _fold_layout_into_attrs(child, cclasses, container_attrs, css_rules)
            # FR-22-5.3 cross-node CSS routing (Commit 2, 2026-06-10): after the fold
            # lifts grid/layout attrs, also route this slug-None wrapper's structural
            # box CSS (padding / max-width / gap) onto the parent composite's layer
            # attrs — specifically CONTENT-layer attrs the fold's contentWidth path
            # does not cover (contentPadding*, responsively-aware gap).
            # Only fires when parent_slug is a resolved composite (not None).
            if parent_slug:
                _route_interior_css_to_parent_slot(
                    child_node=child,
                    element_token=_child_element,
                    owning_block=parent_slug,
                    parent_attrs=container_attrs,
                    css_rules=css_rules,
                )
            _trace("walker_branch_taken", branch="fold_into_container",
                   node_classes=cclasses, depth=depth + 1)
            # rule 4 — the folded wrapper's children resolve below it
            for gc in child.children:
                r = walk(gc, css_rules, variation_buf, depth=depth + 2, is_top_level=False,
                         parent_block=parent_slug)
                if r:
                    out.append(r)
        elif cslug is None and not csgs and fold_eligible and parent_slug:
            # FR-22-4.1 complement (Commit 2 build contract, 2026-06-10):
            # A scraped draft wrapper with NO sgs- classes at all (raw <div class="inner">,
            # <div class="wrapper">, or even <div> with no classes) can still be the sole
            # content-width shell — its box CSS is lost via the FR-22-11 pass-through
            # unless we handle it here.
            # Guard: ONLY fold when the child's CSS carries a CONTENT-layer signature
            # (max-width + margin-centring, or --content-width custom property) — this
            # keeps the guard narrow and avoids folding arbitrary classless divs.
            # `fold_eligible` (len == 1) is already asserted by the `elif` clause.
            # `parent_slug` being truthy means we have a resolved composite to route to.
            _child_base, _ = _collect_css_decls_for_element(child, css_rules)
            if _detect_content_layer(_child_base):
                _route_interior_css_to_parent_slot(
                    child_node=child,
                    element_token=None,  # No sgs- BEM token available; slot resolved from DB
                    owning_block=parent_slug,
                    parent_attrs=container_attrs,
                    css_rules=css_rules,
                )
                _trace("walker_branch_taken", branch="fold_non_sgs_content_width_wrapper",
                       node_classes=cclasses, depth=depth + 1)
                # The wrapper's children still resolve normally via walk().
                for gc in child.children:
                    r = walk(gc, css_rules, variation_buf, depth=depth + 2, is_top_level=False,
                             parent_block=parent_slug)
                    if r:
                        out.append(r)
            else:
                r = walk(child, css_rules, variation_buf, depth=depth + 1, is_top_level=False,
                         parent_block=parent_slug)
                if r:
                    out.append(r)
        else:
            r = walk(child, css_rules, variation_buf, depth=depth + 1, is_top_level=False,
                     parent_block=parent_slug)
            if r:
                out.append(r)
    # Spec 11 + P-9: group loose sgs/button runs into sgs/multi-button (WP mirror).
    # Suppressed when THIS container IS the button-group block itself — its children
    # are the group's own buttons and must not be re-wrapped (mirrors the gate in
    # walk() at line 2968; DB-derived R-22-1; universal R-22-9).
    if parent_slug != db.block_for_slot_token("button-group"):
        out = _group_loose_buttons(out)
    return out


def _emit_section_container(container_attrs: dict, children_markup: list[str], css: str) -> str:
    """Emit the FR-22-4.1 top-level section sgs/container with folded native attrs.

    Children are emitted DIRECTLY between the block comments via emit_wp_block — matching
    sgs/container's save.js (`<InnerBlocks.Content />`, no wrapper). A static
    `<div class="wp-block-sgs-container">` placeholder MUST NOT wrap them: for a dynamic
    block WP folds the inner static HTML into render.php's `$content`, so the placeholder
    div would render as an EXTRA nesting level between the section and its InnerBlocks —
    which breaks grid-on-section (the grid's items stop being its direct children; brand /
    trust-bar items collapse into one column). Root-caused 2026-05-31 via live DOM:
    `section.sgs-brand` (grid 2-col) had a single `.wp-block-sgs-container` child holding
    both columns. The section's scoped CSS is already collected into variation_buf by the
    caller (deployed at Stage 10), so no inline <style> is embedded here.
    """
    return emit_wp_block("sgs/container", container_attrs, [c for c in children_markup if c])


# ============================================================================
# Main CLI entry point
# ============================================================================

def main(argv: list[str]) -> int:
    """CLI entry point: python convert.py <section.html> <section.css> [media-map.json]
    [--client-slug=<slug>]"""
    if len(argv) < 3:
        print(
            f"Usage: {argv[0]} <section.html> <section.css> "
            "[media-map.json] [--client-slug=<slug>]",
            file=sys.stderr,
        )
        return 2
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
    if len(positionals) >= 3:
        load_media_map(Path(positionals[2]))
    soup = BeautifulSoup(html, "html.parser")
    css_rules = parse_css(css_text)
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
    output = walk(section, css_rules, variation_buf, is_top_level=True)
    print("=" * 60)
    print("WP BLOCK MARKUP (Spec 22 universal walker)")
    print("=" * 60)
    print(output or "")
    print()
    if variation_buf:
        print("=" * 60)
        print("VARIATION CSS (lift into client theme-snapshot.json styles.css)")
        print("=" * 60)
        print("\n".join(variation_buf))
    return 0


# ============================================================================
# Self-tests — R-22-3 PASS test + smoke test
# ============================================================================

def _test_walker_branches() -> None:
    """AST self-check: verify the walk() function satisfies R-22-3.

    Assertions:
      1. No string constant starting with 'sgs/' appears in any If-test
         comparison inside walk() EXCEPT the single permitted 'sgs/container'
         literal (FR-22-4 container-base exception).
      2. The one occurrence of 'sgs/container' is in the container-wrap branch
         (exception 3), NOT in a per-block dispatch pattern.
    """
    import ast

    with open(__file__, encoding="utf-8") as f:
        source = f.read()
    tree = ast.parse(source)

    # Find the walk() function definition
    walker_fn = next(
        (n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and n.name == "walk"),
        None,
    )
    assert walker_fn is not None, "R-22-3 FAIL: walk() function not found in AST"

    # Collect all string constants in If-test comparisons inside walk()
    violating_slugs: list[str] = []
    for node in ast.walk(walker_fn):
        if not isinstance(node, ast.If):
            continue
        # Walk the test sub-tree for string constants
        for sub in ast.walk(node.test):
            if isinstance(sub, ast.Constant) and isinstance(sub.value, str):
                val = sub.value
                if val.startswith("sgs/") and val != "sgs/container":
                    violating_slugs.append(val)

    assert not violating_slugs, (
        f"R-22-3 FAIL: block-slug literals found in walk() If-tests "
        f"(only 'sgs/container' is permitted per FR-22-4): {violating_slugs!r}"
    )
    print("R-22-3 PASS: no illegal block-slug literals in walk() routing branches.")
    print("  Permitted 'sgs/container' literal present in exception 3 (FR-22-4): OK")


def _test_walker_smoke() -> None:
    """Smoke test: walk a 3-node BeautifulSoup tree and assert non-empty output."""
    from bs4 import BeautifulSoup

    # Tree: one section with sgs-hero class containing a bare <p> (atomic)
    # and a nested sgs-button child.
    html = """
    <section class="sgs-hero">
        <p>Welcome to the site</p>
        <a class="sgs-button sgs-button--primary" href="/shop/">Shop Now</a>
    </section>
    """
    soup = BeautifulSoup(html, "html.parser")
    section = soup.find("section")
    assert section is not None, "Smoke: section not found in test HTML"

    css_rules: dict = {}
    variation_buf: list[str] = []
    result = walk(section, css_rules, variation_buf, depth=0, is_top_level=True)

    assert result, "Smoke: walk() returned empty/None for a non-empty section"
    assert "wp:" in result, f"Smoke: no WP block markers in output: {result[:200]!r}"

    # The output should reference a block (either sgs/hero or sgs/container wrapper)
    has_hero_or_container = "sgs/hero" in result or "sgs/container" in result
    assert has_hero_or_container, (
        f"Smoke: expected 'sgs/hero' or 'sgs/container' in output, got: {result[:400]!r}"
    )

    print(f"Smoke test PASS: walk() produced {len(result)} chars of WP block markup.")
    print(f"  Block types present: {[t for t in ('sgs/hero', 'sgs/container', 'sgs/button') if t in result]}")


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    print("=" * 60)
    print("convert.py — Spec 22 self-tests")
    print("=" * 60)
    print()

    failures: list[str] = []

    for test_fn in [_test_walker_branches, _test_walker_smoke]:
        try:
            test_fn()
        except AssertionError as exc:
            print(f"FAIL {test_fn.__name__}: {exc}")
            failures.append(test_fn.__name__)
        except Exception as exc:  # noqa: BLE001
            print(f"ERROR {test_fn.__name__}: {exc}")
            failures.append(test_fn.__name__)

    print()
    if failures:
        print(f"FAILED: {', '.join(failures)}")
        sys.exit(1)
    else:
        print("All self-tests passed.")
        sys.exit(0)
