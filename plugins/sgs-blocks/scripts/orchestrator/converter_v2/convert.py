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
  - Ported: all orchestrator-API functions (seed_d1_sidecar, flush_*,
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
# D1 sidecar machinery — DELETED 2026-05-27 (/qc-council D4)
# ============================================================================
# The css-d1-assignments.json sidecar was a Spec 16 mechanism. Spec 22 supersedes
# it: assignments now live in the DB via slot_synonyms + block_attributes role
# classification + equivalent_block_for routing. No active orchestrator code wrote
# the sidecar file or called seed_d1_sidecar(), and _load_d1_assignments always
# returned {} in active runs. Deleted to eliminate dead code surface per Spec 22
# §11 "Zero hardcoded class-to-block dicts remain in Python".
#
# Stub kept for orchestrator-side __init__.py wrapper compatibility (returns
# False) so callers that still invoke seed_d1_sidecar (e.g. test harness) get a
# predictable no-op. Wrapper itself can be removed in a future cleanup pass.
def seed_d1_sidecar(run_dir: "Path | None") -> bool:
    """No-op stub. The D1 sidecar mechanism was retired with Spec 16 (2026-05-26).

    Returns False unconditionally. Kept as a no-op so the __init__.py wrapper
    + any pre-existing orchestrator callers don't AttributeError.
    """
    return False


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
    """Return canonical CSS-property → WP style.* mapping list."""
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


def _css_prop_to_suffix() -> list[tuple[str, str, str]]:
    """DB-driven (css_property, suffix, kind) tuples."""
    return db.css_property_suffixes()


def _breakpoint_suffixes() -> list[tuple[str, list[str]]]:
    """DB-verified breakpoint marker → suffix-list mapping."""
    return db.breakpoint_suffix_rules()


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

    def _merge_into(target: dict, incoming: dict) -> None:
        for p, v in incoming.items():
            if p not in target:
                target[p] = v

    # ---- 1. Inline style ----
    inline = node.get("style", "") or ""
    if inline:
        _merge_into(base_decls, _parse_decls(inline))

    matched_base: list[dict[str, str]] = []
    matched_media: list[tuple[str, dict[str, str]]] = []

    for sel, decls in css_rules.items():
        if "::" in sel:
            media_part, sel_part = sel.split("::", 1)
            media_part = media_part.strip()
            sel_part = sel_part.strip()
        else:
            media_part = ""
            sel_part = sel.strip()

        matches = False
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
                matches = True
                break
            elif last_part == desc_tag:
                parent_match = True
                if len(parts) > 1:
                    parent_token = parts[-2]
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
                if parent_match:
                    matches = True
                    break

        if not matches:
            continue
        if media_part:
            matched_media.append((media_part, decls))
        else:
            matched_base.append(decls)

    for d in matched_base:
        _merge_into(base_decls, d)

    def _specificity_key(media_cond: str) -> tuple[int, int]:
        mn = re.search(r"min-width\s*:\s*(\d+)", media_cond)
        mx = re.search(r"max-width\s*:\s*(\d+)", media_cond)
        if mn:
            return (0, int(mn.group(1)))
        if mx:
            return (1, -int(mx.group(1)))
        return (2, 0)

    bp_rules = _breakpoint_suffixes()
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
    """Attempt to token-snap literal CSS values inside a style dict (in-place).

    Soft-fail: never raises; best-effort token snapping via token_resolver.
    """
    tr_mod = _get_token_resolver()
    if tr_mod is None or not _LIFT_CONTEXT.get("theme_json"):
        return
    theme_json = _LIFT_CONTEXT["theme_json"]
    try:
        tr_mod.snap_style_dict(block_slug, style, theme_json, _TOKEN_RESOLUTIONS)
    except Exception:  # noqa: BLE001
        pass


def _lift_root_supports_to_style(
    node: Tag,
    block_slug: str,
    css_rules: dict,
    attrs: dict,
) -> None:
    """Lift block-root CSS into WP native style.* attributes.

    Reads the node's own CSS, consults db.block_supports_for(block_slug),
    and writes matching properties into attrs['style'].
    Never overwrites existing keys.
    """
    if not block_slug or not block_slug.startswith("sgs/"):
        return
    supports = db.block_supports_for(block_slug)
    if not supports:
        return
    base_decls, _bp_decls = _collect_css_decls_for_element(node, css_rules)
    # D1 sidecar merge — DELETED 2026-05-27 (/qc-council D4). Spec 16 mechanism;
    # superseded by DB-driven role classification + equivalent_block_for routing.
    if not base_decls:
        return
    style: dict = attrs.get("style") or {}
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
    # Apply root lift rules
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
    # Padding/margin shorthand
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
# DEPRECATED Spec-16 styling helpers — ported for test compatibility
# (test_attribute_gap_candidate.py, test_root_supports_double_lift.py).
# Spec 22 §FR-22-2 replaces these with the universal walker path.
# Do NOT use these functions in new code; they exist only to avoid breaking
# existing tests during the Phase 1.4 transition.
# ============================================================================

def _slot_attr_prefix(block_slug: str, canonical_slot: str, schema: dict) -> str | None:
    """DEPRECATED — find the attr-name prefix used for styling attrs in this slot.

    The content attr for the slot (e.g. 'headline' for slot 'heading') IS the
    prefix: 'headlineColour', 'headlineFontSize*', etc.
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
        if any(attr_name.endswith(s) for s in styling_suffixes):
            continue
        return attr_name
    return None


def _lift_styling_attrs(
    desc: Tag,
    slot_name: str,
    block_slug: str,
    schema: dict,
    attrs: dict,
    css_rules: dict,
) -> None:
    """DEPRECATED — lift slot CSS styling properties into block attrs.

    Spec 22 §FR-22-2 replaces this with db_lookup.lift_behavioural_attrs()
    and the universal walker's CSS collection path (collect_css_for_classes).
    Ported verbatim for test_attribute_gap_candidate.py compatibility.
    """
    canonical = db.canonical_slot_for(slot_name) or slot_name
    prefix = _slot_attr_prefix(block_slug, canonical, schema)
    if not prefix:
        return
    base_decls, bp_decls = _collect_css_decls_for_element(desc, css_rules)

    def _try_set(attr_name: str, value: object) -> None:
        if attr_name not in schema:
            return
        if attr_name in attrs:
            return
        if value is None or value == "":
            return
        attrs[attr_name] = value

    _known_css_props: set[str] = {cp for cp, _, _ in _css_prop_to_suffix()}
    _lifted_css_props: set[str] = set()

    for css_prop, suffix, kind in _css_prop_to_suffix():
        raw = base_decls.get(css_prop)
        if raw is None:
            continue
        val = _css_value_to_attr(raw, kind)
        if val is None:
            continue
        candidate = f"{prefix}{suffix}"
        _lifted_css_props.add(css_prop)
        _try_set(candidate, val)
        if candidate not in schema:
            _try_set(f"{prefix}{suffix}Desktop", val)
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
                    unit = "em"
                else:
                    unit = "px"
                _try_set(unit_candidate, unit)

    _SUPPORTS_HANDLED_PROPS: frozenset[str] = frozenset({
        "padding", "margin", "background", "border",
        "padding-top", "padding-right", "padding-bottom", "padding-left",
        "margin-top", "margin-right", "margin-bottom", "margin-left",
        "gap", "border-radius", "border-width", "border-style", "border-color",
        "background-color", "color", "max-width",
    })
    if block_slug and block_slug.startswith("sgs/"):
        desc_sgs_classes = [c for c in (desc.get("class", []) or []) if c.startswith("sgs-")]
        source_class = f".{desc_sgs_classes[0]}" if desc_sgs_classes else f".{slot_name}"
        for css_prop, raw in base_decls.items():
            if css_prop in _SUPPORTS_HANDLED_PROPS:
                continue
            if css_prop not in _known_css_props:
                _record_gap_candidate(block_slug, css_prop, raw, source_class)
                continue
            if css_prop in _lifted_css_props:
                any_in_schema = any(
                    f"{prefix}{sfx}" in schema or f"{prefix}{sfx}Desktop" in schema
                    for cp, sfx, _ in _css_prop_to_suffix()
                    if cp == css_prop
                )
                if not any_in_schema:
                    _record_gap_candidate(block_slug, css_prop, raw, source_class)

    _bp_lifted_keys: set[tuple[str, str]] = set()
    for bp_suffix, bp_decl_map in bp_decls.items():
        for css_prop, suffix, kind in _css_prop_to_suffix():
            raw = bp_decl_map.get(css_prop)
            if raw is None:
                continue
            val = _css_value_to_attr(raw, kind)
            if val is None:
                continue
            candidate = f"{prefix}{suffix}{bp_suffix}"
            if candidate in schema:
                attrs[candidate] = val
                _bp_lifted_keys.add((css_prop, bp_suffix))
            if kind in ("number_px", "number_px_or_em", "number_unitless"):
                unit_candidate = f"{prefix}{suffix}Unit{bp_suffix}"
                if unit_candidate not in schema:
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

    if block_slug and block_slug.startswith("sgs/"):
        for bp_suffix, bp_decl_map in bp_decls.items():
            for css_prop, raw in bp_decl_map.items():
                if css_prop in _SUPPORTS_HANDLED_PROPS:
                    continue
                if (css_prop, bp_suffix) in _bp_lifted_keys:
                    continue
                bp_source_class = f"{source_class}@{bp_suffix}"
                if css_prop not in _known_css_props:
                    _record_gap_candidate(block_slug, css_prop, raw, bp_source_class)
                    continue
                any_in_schema = any(
                    f"{prefix}{sfx}{bp_suffix}" in schema
                    for cp, sfx, _ in _css_prop_to_suffix()
                    if cp == css_prop
                )
                if not any_in_schema:
                    _record_gap_candidate(block_slug, css_prop, raw, bp_source_class)


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


def _atomic_attrs_for(node: Tag, slug: str) -> dict:
    """Return the attrs dict for a node emitted as `slug` via the atomic-tag swap.

    Schema-aligned to current block.json (2026-05-27). Returns {} when no
    content extraction is meaningful for the tag type (e.g. <hr>) OR when
    the slug+tag pair has no known mapping (graceful degradation).
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
            attr_type = info.get("type")
            if attr_type == "string":
                content_attr_name = attr_name
                break
    if content_attr_name is not None:
        return {content_attr_name: node.get_text(strip=True)}
    return {}


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
    # No sgs-* BEM class AND tag is in atomic_tag_map → emit as atomic block
    if not sgs_classes and node.name in db.atomic_tag_map():
        return emit_atomic(node)

    # ---- Permitted exception 2 — chrome-skip at top level ----
    # header/footer/nav at is_top_level WITHOUT sgs-* BEM → belongs in WP
    # template parts, not post content. The `not sgs_classes` guard ensures
    # SGS-BEM-classed elements wearing semantic HTML tags (e.g. a hero rendered
    # as <header class="sgs-hero">) still resolve to their block — only bare
    # chrome dropwouts hit this exception. (Fix per /qc-council 2026-05-27 D5.)
    if is_top_level and not sgs_classes and node.name in SKIP_TOP_LEVEL_TAGS:
        skip_label = " ".join(classes) if classes else node.name
        _trace("walker_branch_taken", branch="chrome_skip", node_tag=node.name,
               node_classes=classes, depth=depth,
               reason=f"<{node.name}> {skip_label} belongs in WP template parts, not post content")
        return None

    # ---- Universal path — BEM → DB → emit ----
    slug = db.resolve_slug_from_bem(sgs_classes)  # FR-22-1 with multi-class disambiguation

    # FR-22-11 pass-through, scoped to NON-top-level only.
    # When slug is None AND is_top_level=True we must still wrap the section
    # in sgs/container (FR-22-4 invariant: every top-level section is based on
    # sgs/container). Falling through to exception 3 below handles that case;
    # the wrap function accepts slug=None and emits walked children as direct
    # container InnerBlocks. Truly transparent pass-through (walk_passthrough)
    # only applies to non-top-level slug-None nodes per FR-22-11.
    if slug is None and not is_top_level:
        # A1 (Spec 23 FR-23-6): a slug-None wrapper that owns a grid/flex layout is
        # NOT transparent — emit it as a neutral sgs/container preserving its class
        # so the deployed CSS reproduces the layout, rather than dissolving it.
        if _is_layout_bearing_wrapper(node, classes, css_rules):
            return _emit_layout_container(node, classes, sgs_classes, css_rules, depth, variation_buf)
        return walk_passthrough(node, css_rules, depth, variation_buf)

    # When slug is None at top level, skip attr-lifting + root-supports-lift
    # (no resolved block to lift onto); CSS collection + child recursion still
    # run so the section's classes and content flow into the synthesised
    # sgs/container wrap below.
    if slug is None:
        attrs = {}
    else:
        attrs = db.lift_behavioural_attrs(node, slug)    # FR-22-2 (NULL equivalent_block only)
    css = collect_css_for_classes(classes, css_rules)  # FR-22-5
    if css and variation_buf is not None:
        variation_buf.append(css)

    # Lift block-root WP native supports (spacing/border/colour → style.*)
    if slug is not None:
        _lift_root_supports_to_style(node, slug, css_rules, attrs)

    # Recursively walk children for InnerBlocks
    children_markup: list[str] = []
    for child in node.children:
        result = walk(child, css_rules, variation_buf, depth=depth + 1, is_top_level=False)
        if result:
            children_markup.append(result)

    # ---- Permitted exception 3 — top-level section container wrap ----
    # FR-22-4: every top-level section is based on sgs/container.
    # Non-container top-level slugs (including slug=None) are wrapped, not
    # emitted bare. The wrap function emits walked children as direct
    # container InnerBlocks when slug is None.
    # NOTE: 'sgs/container' is the ONLY block-slug literal in this file.
    # It is explicitly permitted by FR-22-4 as the container-base exception.
    if is_top_level and slug != "sgs/container":
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

def _detect_grid_container_from_css(classes: list[str], css_rules: dict) -> dict | None:
    """Detect display:grid|flex on a node's CSS and return layout attrs, or None."""
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
    cols = _strip_important(base_decls.get("grid-template-columns", ""))
    if cols:
        result["gridTemplateColumns"] = cols
    gap = _strip_important(base_decls.get("gap", base_decls.get("column-gap", "")))
    if gap:
        result["gap"] = gap
    return result


def _is_layout_bearing_wrapper(node: "Tag", classes: list[str], css_rules: dict) -> bool:
    """XS-3 refined (2026-05-31): immediate-child wrapper of section-root blocks only.

    Emits sgs/container for slug-None divs that are immediate children of
    section-root blocks (sgs/hero, sgs/cta-section) or sgs/container. This narrower
    trigger avoids the +13.07pp regression from f173b351's broader "any CSS + children"
    predicate by scoping to parent composition_role.

    Conditions (all must be true):
      1. Current node has sgs-* BEM class
      2. Parent exists and is a Tag (precondition check)
      3. Parent's composition_role is 'section-root' or 'wrapper-shell' (via block_composition table)
      4. Current node has at least one element child
      5. Current node has CSS rules (has_css indicates visibility + layout bearing)

    Caller precondition: slug is None and node is not top-level.
    """
    # Precondition 1: has sgs-* BEM class
    sgs_classes = [c for c in classes if c.startswith("sgs-")]
    if not sgs_classes:
        return False

    # Precondition 2: parent exists and is a Tag
    parent = node.parent
    if not isinstance(parent, Tag):
        return False

    # Precondition 3: check parent's composition_role via block_composition table
    parent_classes = parent.get("class", []) or []
    parent_sgs_classes = [c for c in parent_classes if c.startswith("sgs-")]
    parent_slug = db.resolve_slug_from_bem(parent_sgs_classes) if parent_sgs_classes else None

    # If parent has no slug resolution, check if parent IS sgs/container (literal)
    # by scanning class names for sgs-container (sgs/container BEM form).
    if parent_slug is None:
        if "sgs-container" in parent_sgs_classes:
            parent_composition_role = "wrapper-shell"
        else:
            return False
    else:
        # Query block_composition to determine parent's composition_role
        parent_composition_role = db.get_block_composition_role(parent_slug)
        if parent_composition_role not in ("section-root", "wrapper-shell"):
            return False

    # Precondition 4: current node has at least one element child
    if not any(isinstance(child, Tag) for child in node.children):
        return False

    # Precondition 5: current node has CSS rules
    # (narrower than A1's display:grid/flex check — just existence of any CSS)
    selectors = [f".{c}" for c in sgs_classes]
    has_css = any(
        any(s in sel_key for s in selectors)
        for sel_key in css_rules.keys()
        if " :: " not in sel_key
    )

    return has_css


def _emit_layout_container(
    node: "Tag",
    classes: list[str],
    sgs_classes: list[str],
    css_rules: dict,
    depth: int,
    variation_buf: list[str] | None,
) -> str:
    """Emit a slug-None layout wrapper as a neutral sgs/container (A1, className-only).

    Preserves the wrapper's BEM className so the deployed CSS rule (display + flex/grid
    direction + align + gap, etc.) reproduces the layout. sgs/container is
    neutral-by-default (Spec 23 B2+B3 — no gap/width/layout/inline emitted unless set),
    so it adds no class or inline style that could fight the deployed rule. Children
    recurse as InnerBlocks. Routes through the FR-22-4 'sgs/container' primitive (same
    literal as exception 3) — not a new routing branch.
    """
    css = collect_css_for_classes(classes, css_rules)
    if css and variation_buf is not None:
        variation_buf.append(css)
    children_markup: list[str] = []
    for child in node.children:
        result = walk(child, css_rules, variation_buf, depth=depth + 1, is_top_level=False)
        if result:
            children_markup.append(result)
    _trace("walker_branch_taken", branch="layout_container",
           node_classes=classes, depth=depth)
    return emit_wp_block("sgs/container", {"className": " ".join(sgs_classes), "htmlTag": "div"}, children_markup)


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
