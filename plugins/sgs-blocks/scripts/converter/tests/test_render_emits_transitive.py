"""render_reads_attr follows require/include transitively (Eye Care sgs/google-reviews, 2026-09-21).

Cause, proven: stage 1 seeds `block_attributes.emit_shape` from `render_emits.render_reads_attr`, which read
`_render_source(slug)`, and that follows ONE `require` hop (render.php -> includes/render-helpers.php). sgs/google-reviews
reads averageRating / reviewCount / businessName / reviews in includes/helpers-reviews-inline.php, which render-helpers.php
requires: two hops down. So the scan said "the block never reads it", the seeder wrote emit_shape='child', and walk.py
refuses to scalar-lift a 'child' attribute: the header figures never reached the emitted block.

Fix: `render_emits._render_reach_source` (require-following, visited set, depth limit) used by `render_reads_attr` ONLY.
`_render_source` is untouched because recogniser/render_repeater_seeder.py hashes it; widening it would re-hash every block.

QC-council fix (2026-09-21): the transitive scan flips 77 attributes False->True across the roster (a shared
helper such as includes/helpers-box.php reads a generic `$attributes['borderRadius']` for every block), while the
docstring claimed "the block's render source reads it". The DEFINED contract now: the default (transitive) answer
is exact for a content-bearing attribute (its only caller's question: exactly the four sgs/google-reviews flips)
and an over-approximation for anything else; `own_source_only=True` is the block's own source (zero flips over
every attribute). The census below runs over EVERY block.json attribute, not only content roles.

Run from plugins/sgs-blocks/scripts:
  python -m pytest converter/tests/test_render_emits_transitive.py -q -p no:cacheprovider
"""
from __future__ import annotations

import functools
import hashlib
import re
from pathlib import Path

import pytest

from converter.db import db_lookup
from converter.services import render_emits as re_mod

_SLUG = "sgs/google-reviews"
_HEADER_ATTRS = ("averageRating", "reviewCount", "businessName")

# THE census: every content-role attribute whose render-read is found by the transitive scan but was missed by the
# one-hop scan. All four are read in includes/helpers-reviews-inline.php::sgs_reviews_resolve (verified below by reading
# that file), which render-helpers.php requires and sgs/google-reviews' render.php reaches through it. A flip means "a
# value the block really reads via a helper", which is the correct answer. A new entry here must be justified the same way.
_EXPECTED_FLIPS = {
    (_SLUG, "reviews"),
    (_SLUG, "averageRating"),
    (_SLUG, "reviewCount"),
    (_SLUG, "businessName"),
}


# ---------------------------------------------------------------------------
# The ORIGINAL one-hop path, kept verbatim here as the reference for "unchanged"
# ---------------------------------------------------------------------------

@functools.lru_cache(maxsize=None)
def _original_render_source(slug: str) -> str:
    bd = re_mod._BLOCKS_DIR / re_mod._short(slug)
    rp = bd / "render.php"
    if not rp.exists():
        return ""
    src = rp.read_text(encoding="utf-8", errors="replace")
    out = [src]
    for m in re_mod._REQUIRE_RE.finditer(src):
        base = m.group(1).split("/")[-1]
        for cand in [bd / base, re_mod._INCLUDES_DIR / base, *list(re_mod._INCLUDES_DIR.rglob(base))[:1]]:
            if cand.exists():
                out.append(cand.read_text(encoding="utf-8", errors="replace"))
                break
    return "\n".join(out)


@functools.lru_cache(maxsize=None)
def _sgs_slugs() -> tuple[str, ...]:
    return tuple(sorted(s for s in db_lookup.registered_block_slugs() if s.startswith("sgs/")))


@functools.lru_cache(maxsize=None)
def _content_attrs() -> list[tuple[str, str]]:
    roles = db_lookup._content_bearing_roles()
    return [(s, a) for s in _sgs_slugs() for a, meta in db_lookup.block_attrs(s).items() if meta.get("role") in roles]


@functools.lru_cache(maxsize=None)
def _all_attrs() -> list[tuple[str, str]]:
    return [(s, a) for s in _sgs_slugs() for a in db_lookup.block_attrs(s)]


def _flips(hops: int | None = None, monkeypatch=None, attrs=None) -> set[tuple[str, str]]:
    if hops is not None:
        monkeypatch.setattr(re_mod, "_MAX_REQUIRE_HOPS", hops)
        re_mod._render_reach_source.cache_clear()
        re_mod.render_reads_attr.cache_clear()
    try:
        return {
            (s, a) for s, a in (attrs if attrs is not None else _content_attrs())
            if re_mod.render_reads_attr(s, a) and not re_mod._reads(_original_render_source(s), a)
        }
    finally:
        if hops is not None:
            monkeypatch.undo()
            re_mod._render_reach_source.cache_clear()
            re_mod.render_reads_attr.cache_clear()


@pytest.fixture(autouse=True)
def _fresh_caches():
    re_mod._render_reach_source.cache_clear()
    re_mod._own_source.cache_clear()
    re_mod.render_reads_attr.cache_clear()
    yield
    re_mod._render_reach_source.cache_clear()
    re_mod._own_source.cache_clear()
    re_mod.render_reads_attr.cache_clear()


# ---------------------------------------------------------------------------
# The real block
# ---------------------------------------------------------------------------

def test_the_header_attributes_are_read_two_hops_down_and_the_gate_now_sees_them():
    helper = (re_mod._INCLUDES_DIR / "helpers-reviews-inline.php").read_text(encoding="utf-8")
    for attr in (*_HEADER_ATTRS, "reviews"):
        assert re_mod._reads(helper, attr), f"{attr} is not read in helpers-reviews-inline.php"
        assert not re_mod._reads(_original_render_source(_SLUG), attr), "the one-hop scan already saw it: premise gone"
        assert re_mod.render_reads_attr(_SLUG, attr) is True


def test_a_value_the_block_really_does_not_read_is_still_not_read():
    """Negative control on the other side: the transitive scan is not 'True for everything'."""
    assert re_mod.render_reads_attr(_SLUG, "definitelyNotAnAttribute") is False
    assert re_mod.render_reads_attr("sgs/does-not-exist", "averageRating") is False


def test_the_db_shape_the_seeder_would_now_write_is_nested_for_the_header_figures():
    """The seeder's decision (`nested` iff render_reads_attr) for the block's content attrs."""
    attrs = db_lookup.block_attrs(_SLUG)
    roles = db_lookup._content_bearing_roles()
    content = [a for a, m in attrs.items() if m.get("role") in roles]
    for attr in _HEADER_ATTRS:
        assert attr in content
        assert ("nested" if re_mod.render_reads_attr(_SLUG, attr) else "child") == "nested"


# ---------------------------------------------------------------------------
# What must NOT change: the seeder's hash input
# ---------------------------------------------------------------------------

def test_render_source_is_byte_identical_to_the_original_for_every_block():
    """render_repeater_seeder.source_sha hashes `_render_source`; a change would re-hash every block."""
    from recogniser import render_repeater_seeder as seeder

    slugs = sorted(p.parent.name for p in re_mod._BLOCKS_DIR.glob("*/render.php"))
    assert len(slugs) > 50
    for short in slugs:
        slug = f"sgs/{short}"
        want = _original_render_source(slug)
        assert re_mod._render_source(slug) == want, slug
        assert seeder.source_sha(slug) == hashlib.sha256(want.encode("utf-8")).hexdigest(), slug


def test_the_reach_source_is_a_strict_superset_that_keeps_the_original_text_first():
    for short in sorted(p.parent.name for p in re_mod._BLOCKS_DIR.glob("*/render.php")):
        slug = f"sgs/{short}"
        assert re_mod._render_reach_source(slug).startswith(_original_render_source(slug)), slug


# ---------------------------------------------------------------------------
# The census: exactly the expected flips, nothing else
# ---------------------------------------------------------------------------

def test_census_only_the_four_google_reviews_attributes_flip():
    flips = _flips()
    assert flips == _EXPECTED_FLIPS, (
        f"unexpected: {sorted(flips - _EXPECTED_FLIPS)}; missing: {sorted(_EXPECTED_FLIPS - flips)}"
    )


def test_census_own_source_only_over_every_attribute_has_no_flips_at_all():
    """The block's own source: identical to the one-hop scan for every attribute of every block."""
    attrs = _all_attrs()
    assert len(attrs) > 1000  # the census is over the whole roster, not a handful
    bad = [(s, a) for s, a in attrs
           if re_mod.render_reads_attr(s, a, own_source_only=True) != re_mod._reads(_original_render_source(s), a)]
    assert bad == []


def test_census_the_default_answer_over_content_attributes_is_exact_and_over_every_attribute_it_over_approximates():
    """Pins both halves of the documented contract with numbers: 4 real flips for content attributes, and the
    measured over-approximation for the rest (shared helpers), which is WHY the docstring says so."""
    assert _flips() == _EXPECTED_FLIPS
    every = _flips(attrs=_all_attrs())
    extra = every - _EXPECTED_FLIPS
    assert len(every) >= 70 and ("sgs/text", "borderRadius") in extra
    assert not any(re_mod.render_reads_attr(s, a, own_source_only=True) for s, a in extra
                   if not re_mod._reads(_original_render_source(s), a))


def test_negative_control_the_default_is_not_the_own_source_answer_for_the_google_reviews_header():
    """If the two modes were the same function the contract would be vacuous."""
    for attr in _HEADER_ATTRS:
        assert re_mod.render_reads_attr(_SLUG, attr) is True
        assert re_mod.render_reads_attr(_SLUG, attr, own_source_only=True) is False


def test_census_no_true_becomes_false():
    """Monotonic: anything the one-hop scan found the transitive scan still finds."""
    for slug, attr in _content_attrs():
        if re_mod._reads(_original_render_source(slug), attr):
            assert re_mod.render_reads_attr(slug, attr) is True, (slug, attr)


def test_census_control_with_the_hop_limit_at_one_the_flips_disappear(monkeypatch):
    """Negative control: break just the depth (the fix's reach) and the census sees no flips, so it is not vacuous."""
    assert _flips(hops=1, monkeypatch=monkeypatch) == set()


# ---------------------------------------------------------------------------
# Resolution mechanics, on a synthetic tree (nothing repo-tracked is written)
# ---------------------------------------------------------------------------

@pytest.fixture
def tree(tmp_path, monkeypatch):
    plugin = tmp_path / "plugin"
    blocks = plugin / "src" / "blocks"
    includes = plugin / "includes"
    (blocks / "demo").mkdir(parents=True)
    includes.mkdir(parents=True)
    monkeypatch.setattr(re_mod, "_PLUGIN_DIR", plugin)
    monkeypatch.setattr(re_mod, "_BLOCKS_DIR", blocks)
    monkeypatch.setattr(re_mod, "_INCLUDES_DIR", includes)
    return plugin


def _w(path: Path, text: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


def _reads_via(tree_dir: Path, attr: str) -> bool:
    re_mod._render_reach_source.cache_clear()
    re_mod._own_source.cache_clear()
    re_mod.render_reads_attr.cache_clear()
    return re_mod.render_reads_attr("sgs/demo", attr)


def test_every_require_form_the_repo_uses_is_followed(tree):
    render = _w(tree / "src" / "blocks" / "demo" / "render.php", "\n".join([
        "<?php",
        "require_once dirname( __DIR__, 3 ) . '/includes/a.php';",
        "require_once dirname( __FILE__, 4 ) . '/includes/b.php';",
        "require_once SGS_BLOCKS_PATH . 'includes/c.php';",
        "require_once __DIR__ . '/local.php';",
        "include( __DIR__ . '/paren.php' );",
    ]))
    assert render.exists()
    for name in ("a", "b", "c"):
        _w(tree / "includes" / f"{name}.php", f"<?php $x = $attributes['{name}Attr'];")
    _w(tree / "src" / "blocks" / "demo" / "local.php", "<?php $x = $attributes['localAttr'];")
    _w(tree / "src" / "blocks" / "demo" / "paren.php", "<?php $x = $attributes['parenAttr'];")
    for attr in ("aAttr", "bAttr", "cAttr", "localAttr", "parenAttr"):
        assert _reads_via(tree, attr), attr


def test_a_read_three_hops_down_is_found_and_four_is_not(tree):
    _w(tree / "src" / "blocks" / "demo" / "render.php", "<?php\nrequire_once SGS_BLOCKS_PATH . 'includes/h1.php';")
    _w(tree / "includes" / "h1.php", "<?php\nrequire_once __DIR__ . '/h2.php';")
    _w(tree / "includes" / "h2.php", "<?php\nrequire_once __DIR__ . '/h3.php';")
    _w(tree / "includes" / "h3.php", "<?php\nrequire_once __DIR__ . '/h4.php';\n$x = $attributes['atThree'];")
    _w(tree / "includes" / "h4.php", "<?php $x = $attributes['atFour'];")
    assert _reads_via(tree, "atThree") is True
    assert _reads_via(tree, "atFour") is False


def test_a_cycle_terminates(tree):
    _w(tree / "src" / "blocks" / "demo" / "render.php", "<?php\nrequire_once SGS_BLOCKS_PATH . 'includes/x.php';")
    _w(tree / "includes" / "x.php", "<?php\nrequire_once __DIR__ . '/y.php';\n$a = $attributes['inX'];")
    _w(tree / "includes" / "y.php", "<?php\nrequire_once __DIR__ . '/x.php';\n$a = $attributes['inY'];")
    assert _reads_via(tree, "inX") and _reads_via(tree, "inY")


def test_own_source_only_ignores_a_shared_helper_two_hops_down_but_sees_the_blocks_own_reads(tree):
    NL = chr(10)
    _w(tree / "src" / "blocks" / "demo" / "render.php", "<?php" + NL + "require_once SGS_BLOCKS_PATH . 'includes/shared.php';"
       + NL + "$own = $attributes['ownConfig'];")
    _w(tree / "includes" / "shared.php", "<?php" + NL + "require_once __DIR__ . '/deep.php';")
    _w(tree / "includes" / "deep.php", "<?php $x = $attributes['borderRadius'];")
    re_mod._render_reach_source.cache_clear()
    re_mod._own_source.cache_clear()
    re_mod.render_reads_attr.cache_clear()
    assert re_mod.render_reads_attr("sgs/demo", "borderRadius") is True                        # default: reaches it
    assert re_mod.render_reads_attr("sgs/demo", "borderRadius", own_source_only=True) is False  # own source: no
    assert re_mod.render_reads_attr("sgs/demo", "ownConfig", own_source_only=True) is True


def test_what_cannot_be_resolved_statically_is_skipped_not_an_error(tree):
    _w(tree / "src" / "blocks" / "demo" / "render.php", "\n".join([
        "<?php",
        "require_once $file;",
        "require_once ABSPATH . 'wp-admin/includes/x.php';",
        "require_once __DIR__ . '/missing.php';",
        "require_once SGS_BLOCKS_PATH . 'includes/real.php';",
        " * (also requires commented.php)",
        "// require_once __DIR__ . '/commented.php';",
        "$own = $attributes['ownAttr'];",
    ]))
    _w(tree / "includes" / "real.php", "<?php $x = $attributes['realAttr'];")
    _w(tree / "src" / "blocks" / "demo" / "commented.php", "<?php $x = $attributes['commentedAttr'];")
    assert _reads_via(tree, "ownAttr") and _reads_via(tree, "realAttr")
    render = tree / "src" / "blocks" / "demo" / "render.php"
    targets = re_mod._static_require_targets(render, render.read_text(encoding="utf-8"))
    assert [t.name for t in targets] == ["real.php"]        # $file, ABSPATH, a missing file and comments: all skipped


def test_the_static_regex_does_not_match_a_docblock_or_a_dynamic_path():
    rx = re_mod._STATIC_REQUIRE_RE
    assert not rx.search(" * (also requires helpers-configurator-pricing.php)")
    assert not rx.search("// require_once __DIR__ . '/x.php';")
    assert not rx.search("require_once $file . '/x.php';")
    assert rx.search("\trequire_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';")
    assert re.search(r"levels", rx.pattern)
