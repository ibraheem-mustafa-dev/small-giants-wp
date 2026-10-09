"""render_emits -- does a block's own render emit a given attribute?

Source-only signal (never the DB, never mutates): ``render_reads_attr(slug, attr)`` is True when
``$attributes['attr']`` is read in the block's ``render.php`` or in a helper reachable from it by a
statically-resolvable ``require`` / ``include``. ``lib/emit_shape.py`` uses it as the first test when it
decides how a content-bearing attribute is carried (``sgs-update-v2.py::_populate_emit_shape`` stores the
result in ``block_attributes.emit_shape``).
"""
from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

# scripts/lib/render_emits.py -> plugins/sgs-blocks/
_PLUGIN_DIR = Path(__file__).resolve().parents[2]
_BLOCKS_DIR = _PLUGIN_DIR / "src" / "blocks"
_INCLUDES_DIR = _PLUGIN_DIR / "includes"

_REQUIRE_RE = re.compile(r"require(?:_once)?\s*\(?[^;]*?['\"]([^'\"]+\.php)['\"]", re.I)


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

    A strict superset of `_render_source` (its text comes first), so a read found in the block's own
    source is still found; a read two or three hops down is found too.
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


def _reads(src: str, attr: str) -> bool:
    return bool(re.search(r"\$attributes\s*\[\s*['\"]" + re.escape(attr) + r"['\"]\s*\]", src))


@lru_cache(maxsize=512)
def _own_source(slug: str) -> str:
    """``_render_source`` memoised for the ``own_source_only`` answer (which asks once per attribute)."""
    return _render_source(slug)


@lru_cache(maxsize=1024)
def render_reads_attr(slug: str, attr: str, own_source_only: bool = False) -> bool:
    """The emit_shape seeder's nested-vs-child signal (FR-31-2.6): does the block's render emit this attr?

    CONTRACT.

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
