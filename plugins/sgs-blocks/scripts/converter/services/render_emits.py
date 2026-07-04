"""render_emits — source-derived per-element nested-content signal (the render_reads gate).

Design ref: the 2026-07-04 content-fork unification design + /qc-council validation.
Companion to `has_inner.py`: where has_inner derives the BLOCK-level fork (does the block
compose children) from save.js + render.php, this derives the PER-ELEMENT fork — does the
block's own render EMIT a given BEM element from a typed attribute (→ NESTED built-in
element) or delegate it to `$content` (→ CHILD InnerBlock).

Signal (source only, NOT the DB — the DB role is a lossy derivation, proven 2026-07-04):
  a block renders a NESTED element `<... class="sgs-<slug>__<element>">` when its render.php
  (or a render-side require'd helper) emits an `$attributes['<attr>']` value inside/for that
  element. The attr's block.json `type` (string/rich-text/object/array) types the lift.

This module ONLY reads source; it never mutates. It is import-safe for the converter
(no frozen-engine import). Used to gate the Mechanism-B walker's per-node child-vs-scalar
decision: element resolves to a render-emitted attr → lift scalar/array; else → child block.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

# scripts/converter/services/render_emits.py -> plugins/sgs-blocks/
_PLUGIN_DIR = Path(__file__).resolve().parents[3]
_BLOCKS_DIR = _PLUGIN_DIR / "src" / "blocks"
_INCLUDES_DIR = _PLUGIN_DIR / "includes"

_REQUIRE_RE = re.compile(r"require(?:_once)?\s*\(?[^;]*?['\"]([^'\"]+\.php)['\"]", re.I)
# a render-side style/background context — such an attr is STYLING, not a content element.
_STYLE_CTX_RE = re.compile(r"background|url\s*\(|style\s*=|__video-bg|-bg\b|overlay|parallax|ken.?burns|backdrop", re.I)


def _short(slug: str) -> str:
    return slug.split("/")[-1]


def _render_source(slug: str) -> str:
    """render.php + resolved require'd .php helpers (block-local + includes/)."""
    bd = _BLOCKS_DIR / _short(slug)
    rp = bd / "render.php"
    if not rp.exists():
        return ""
    src = rp.read_text(encoding="utf-8", errors="replace")
    out = [src]
    for m in _REQUIRE_RE.finditer(src):
        base = m.group(1).split("/")[-1]
        for cand in [bd / base, _INCLUDES_DIR / base, *list(_INCLUDES_DIR.rglob(base))[:1]]:
            if cand.exists():
                out.append(cand.read_text(encoding="utf-8", errors="replace"))
                break
    return "\n".join(out)


def _block_attr_types(slug: str) -> dict[str, str]:
    bj = _BLOCKS_DIR / _short(slug) / "block.json"
    if not bj.exists():
        return {}
    try:
        meta = json.loads(bj.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return {}
    return {a: (s.get("type") or "") for a, s in (meta.get("attributes") or {}).items() if isinstance(s, dict)}


def _reads(src: str, attr: str) -> bool:
    return bool(re.search(r"\$attributes\s*\[\s*['\"]" + re.escape(attr) + r"['\"]\s*\]", src))


def _immediate_vars(src: str, attr: str) -> list[str]:
    """$vars directly assigned from $attributes['attr'] — to follow one hop of aliasing."""
    return [m.group(1) for m in re.finditer(
        r"(\$[a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*[^\n;]*\$attributes\s*\[\s*['\"]" + re.escape(attr) + r"['\"]", src)]


def _is_styling_media(src: str, attr: str) -> bool:
    """A media attr used only in a background/CSS context is STYLING, not a content element."""
    toks = [re.escape(attr)] + [re.escape(v) for v in _immediate_vars(src, attr)]
    tok_re = re.compile("|".join(toks))
    return any(tok_re.search(line) and _STYLE_CTX_RE.search(line) for line in src.splitlines())


@lru_cache(maxsize=256)
def render_emitted_content_attrs(slug: str) -> tuple:
    """Return a tuple of (attr, attr_type) the block's own render EMITS as a content element.

    NESTED signal per attr: the attr is read from $attributes in render source, its type is a
    content type (string/rich-text/object/array), and — for media (object) — it is not used
    only as a CSS background. Config scalars (number/boolean) are excluded. The result is the
    universal per-element nested set: any element resolving to one of these attrs is a NESTED
    built-in element; everything else the walker sees is a CHILD InnerBlock.
    """
    src = _render_source(slug)
    if not src:
        return ()
    types = _block_attr_types(slug)
    out: list[tuple[str, str]] = []
    for attr, t in types.items():
        if t not in ("string", "rich-text", "object", "array"):
            continue  # config numbers/booleans are not content elements
        if not _reads(src, attr):
            continue  # not emitted by render → not a nested element (child/legacy)
        if t == "object" and _is_styling_media(src, attr):
            continue  # a section background, not a content element (styling axis)
        out.append((attr, t))
    return tuple(out)


def is_render_emitted_content_attr(slug: str, attr: str) -> bool:
    """True iff the block's own render emits this attr as a NESTED content element."""
    return any(a == attr for a, _ in render_emitted_content_attrs(slug))


@lru_cache(maxsize=1024)
def render_reads_attr(slug: str, attr: str) -> bool:
    """True iff the block's render source reads `$attributes[attr]` — the RAW nested
    signal for the emit_shape seeder (FR-31-2.6).

    Unlike `render_emitted_content_attrs`, this applies NO attr-TYPE filter and NO
    styling-media exclusion: the seeder has ALREADY narrowed to content-ROLE attrs
    (the content-vs-styling filter, FR-31-2.2), so the only remaining question is
    nested-vs-child = "does the block's own render emit this attr". Dropping the type
    filter fixes number-typed content (e.g. a `rating` star-count read as
    `(float) $attributes['ratingStars']`), which the type-filtered set wrongly missed.
    Media content-vs-styling is NOT re-decided here — the pipeline's existing routing
    separates a CSS `background-image` (CSS/root-supports path) from an `<img>` content
    element (content lift), so a background attr never reaches the content walk and its
    value is inert. Reads `render.php` + require'd helpers; catches one alias hop via
    the whole-source scan.
    """
    src = _render_source(slug)
    return bool(src) and _reads(src, attr)
