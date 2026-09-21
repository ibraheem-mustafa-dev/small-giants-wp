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


# A STATEMENT-level require/include of a literal path. Anchored to the start of a line so a docblock
# ("(also requires helpers-x.php)") or a trailing comment never matches; the prefix is the closed set of
# forms this repo uses: `__DIR__`, `dirname( __DIR__, N )`, `dirname( __FILE__, N )`, `SGS_BLOCKS_PATH`.
_STATIC_REQUIRE_RE = re.compile(
    r"^[ \t]*(?:require|include)(?:_once)?[ \t]*\(?[ \t]*"
    r"(?P<prefix>__DIR__|SGS_BLOCKS_PATH|dirname\(\s*(?:__DIR__|__FILE__)\s*(?:,\s*(?P<levels>\d+)\s*)?\))"
    r"[ \t]*\.[ \t]*['\"](?P<lit>[^'\"$]+\.php)['\"]",
    re.M,
)
_MAX_REQUIRE_HOPS = 3


def _static_require_targets(path: Path, src: str) -> list[Path]:
    """Files `src` (living at `path`) statically requires. A path that cannot be resolved statically
    (a variable, ABSPATH, a missing file) is skipped, never an error."""
    out: list[Path] = []
    for m in _STATIC_REQUIRE_RE.finditer(src):
        prefix = m.group("prefix")
        if prefix == "SGS_BLOCKS_PATH":
            base = _PLUGIN_DIR
        elif prefix == "__DIR__":
            base = path.parent
        else:
            base = path.parent if "__DIR__" in prefix else path
            for _ in range(int(m.group("levels") or 1)):
                base = base.parent
        cand = base / m.group("lit").lstrip("/\\")
        if cand.is_file():
            out.append(cand)
    return out


@lru_cache(maxsize=256)
def _render_reach_source(slug: str) -> str:
    """`_render_source` plus every file reachable from render.php by statically-resolvable
    require/include, up to `_MAX_REQUIRE_HOPS` hops (visited set, so a cycle terminates).

    Used by `render_reads_attr` ONLY. `_render_source` is left exactly as it was: the render-repeater
    seeder hashes it (`recogniser/render_repeater_seeder.py::source_sha`), so widening it would re-hash
    every block. This is a strict superset of it (its text comes first, unchanged), so a read the old
    one found is still found: the only change is that a read two or three hops down is now found too.
    """
    base = _render_source(slug)
    if not base:
        return ""
    rp = (_BLOCKS_DIR / _short(slug) / "render.php").resolve()
    seen = {rp}
    frontier = [(rp, rp.read_text(encoding="utf-8", errors="replace"))]
    extra: list[str] = []
    for _ in range(_MAX_REQUIRE_HOPS):
        nxt: list[tuple[Path, str]] = []
        for path, text in frontier:
            for target in _static_require_targets(path, text):
                target = target.resolve()
                if target in seen:
                    continue
                seen.add(target)
                body = target.read_text(encoding="utf-8", errors="replace")
                extra.append(body)
                nxt.append((target, body))
        frontier = nxt
    return "\n".join([base, *extra])


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


@lru_cache(maxsize=512)
def _own_source(slug: str) -> str:
    """``_render_source`` memoised for the ``own_source_only`` answer (which asks once per attribute)."""
    return _render_source(slug)


@lru_cache(maxsize=1024)
def render_reads_attr(slug: str, attr: str, own_source_only: bool = False) -> bool:
    """The emit_shape seeder's nested-vs-child signal (FR-31-2.6): does the block's render emit this attr?

    CONTRACT (QC-council 2026-09-21: the earlier docstring claimed more than the code did).

    * Default (``own_source_only=False``): True when ``$attributes['attr']`` (or ``["attr"]``) is read in
      ``render.php`` or in any helper reachable from it by statically-resolvable ``require`` / ``include``,
      up to ``_MAX_REQUIRE_HOPS`` hops (``_render_reach_source``): sgs/google-reviews reads its header
      figures two hops down. This is EXACT for a content-bearing attribute, which is the only thing its sole
      caller (``sgs-update-v2.py::_populate_emit_shape``, already narrowed to content-role attrs, FR-31-2.2)
      asks about, and it is an OVER-APPROXIMATION for anything else: a shared helper that reads a same-named
      generic attribute on behalf of every block it serves (``$attributes['borderRadius']`` in
      includes/helpers-box.php, ``transitionDuration`` in helpers-tokens.php) makes every block that requires
      it "read" that attribute. Measured across every block.json attribute, the default answer differs from
      the one-hop answer for 77 attributes, of which only the four sgs/google-reviews content attributes are
      real reads.
    * ``own_source_only=True``: only ``render.php`` plus the helpers it requires directly (``_render_source``)
      -- the block's OWN source. Any caller that is not asking about a content-bearing attribute passes this.

    Unlike ``render_emitted_content_attrs`` this applies NO attr-TYPE filter and NO styling-media exclusion
    (the seeder has ALREADY narrowed to content-ROLE attrs): the only question left is nested vs child =
    "does the block's own render emit this attr". Dropping the type filter fixes number-typed content (a
    ``rating`` star count read as ``(float) $attributes['ratingStars']``). Media content-vs-styling is not
    re-decided here: the pipeline's routing separates a CSS ``background-image`` from an ``<img>`` content
    element, so a background attr never reaches the content walk. Catches one alias hop via the whole-source
    scan.
    """
    src = _own_source(slug) if own_source_only else _render_reach_source(slug)
    return bool(src) and _reads(src, attr)
