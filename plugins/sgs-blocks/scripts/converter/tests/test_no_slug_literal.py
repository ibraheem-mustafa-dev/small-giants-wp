"""test_no_slug_literal.py — proves the A7 carve-out AST gate catches every form.

Run from plugins/sgs-blocks/scripts:  python -m pytest converter/tests/test_no_slug_literal.py

Each planted-carve-out case (STOP-16: prove the FAILURE path) writes a synthetic
resolver file into a tmp dir and asserts the gate flags it. The clean-code cases
assert zero false positives — including the legitimate `decl.property == "max-width"`
comparison a real resolver makes.
"""
from __future__ import annotations

from pathlib import Path

from converter.gates.no_slug_literal import run


def _scan(tmp_path: Path, source: str) -> list[dict]:
    d = tmp_path / "resolvers"
    d.mkdir(parents=True)
    (d / "probe.py").write_text(source, encoding="utf-8")
    return run(scan_dirs=[d])


# ---------------------------------------------------------------------------
# Planted carve-outs the gate MUST catch
# ---------------------------------------------------------------------------

def test_catches_direct_attr_compare(tmp_path):
    v = _scan(tmp_path, "def r(ctx):\n    return ctx.block_slug == 'sgs/hero'\n")
    assert len(v) == 1
    assert "block_slug" in v[0]["src"]


def test_catches_namespace_stripped_compare(tmp_path):
    # ctx.block_slug.split('/')[1] == 'hero' — the sgs/ literal gate misses this.
    v = _scan(tmp_path, "def r(ctx):\n    return ctx.block_slug.split('/')[1] == 'hero'\n")
    assert len(v) == 1


def test_catches_membership_tuple(tmp_path):
    v = _scan(tmp_path, "def r(ctx):\n    return ctx.block_slug in ('sgs/hero', 'sgs/cta')\n")
    assert len(v) == 1


def test_catches_aliased_local(tmp_path):
    src = "def r(ctx):\n    slug = ctx.block_slug\n    return slug == 'hero'\n"
    v = _scan(tmp_path, src)
    assert len(v) == 1


def test_catches_chained_alias(tmp_path):
    src = (
        "def r(ctx):\n"
        "    a = ctx.block_slug\n"
        "    b = a\n"
        "    return b == 'sgs/hero'\n"
    )
    v = _scan(tmp_path, src)
    assert len(v) == 1


def test_catches_smuggled_set_membership(tmp_path):
    src = (
        "_SPECIAL = {'hero', 'cta'}\n"
        "def r(ctx):\n"
        "    return ctx.variant_value in _SPECIAL\n"
    )
    v = _scan(tmp_path, src)
    assert len(v) == 1


def test_catches_variant_attr(tmp_path):
    v = _scan(tmp_path, "def r(ctx):\n    return ctx.variant_attr == 'layout'\n")
    assert len(v) == 1


def test_catches_getattr_dodge(tmp_path):
    # getattr(ctx, "block_slug") == "hero" — string-named attribute dodge.
    v = _scan(tmp_path, "def r(ctx):\n    return getattr(ctx, 'block_slug') == 'hero'\n")
    assert len(v) == 1


def test_catches_match_statement(tmp_path):
    src = (
        "def r(ctx):\n"
        "    match ctx.block_slug:\n"
        "        case 'sgs/hero':\n"
        "            return 1\n"
        "        case _:\n"
        "            return 0\n"
    )
    v = _scan(tmp_path, src)
    assert len(v) == 1


# ---------------------------------------------------------------------------
# Slot-name carve-outs (new cheat surface — content-extraction stage keys on slots)
# These tests FAIL before _TARGET_IDENTS includes slot/slot_name/canonical_slot
# and PASS after (Task 1).
# ---------------------------------------------------------------------------

def test_catches_slot_compare(tmp_path):
    # if slot == "quote": ... — per-slot carve-out via bare `slot` identifier.
    v = _scan(tmp_path, "def r(slot):\n    return slot == 'quote'\n")
    assert len(v) >= 1
    assert any("slot" in vi["src"] for vi in v)


def test_catches_canonical_slot_compare(tmp_path):
    # if canonical_slot == "heading": ... — carve-out via canonical_slot identifier.
    v = _scan(tmp_path, "def r(canonical_slot):\n    return canonical_slot == 'heading'\n")
    assert len(v) >= 1
    assert any("canonical_slot" in vi["src"] for vi in v)


def test_catches_slot_name_membership(tmp_path):
    # slot_name in ("quote", "heading") — membership form.
    v = _scan(tmp_path, "def r(slot_name):\n    return slot_name in ('quote', 'heading')\n")
    assert len(v) >= 1


def test_catches_modifier_literal_compare(tmp_path):
    # _mod == "ghost" — the assembly.py Check-#9-evasion shape (QC 2026-07-05).
    # A BEM-modifier literal comparison is the same carve-out class as a slug
    # comparison; the synonym belongs in the slots alias→default_attrs channel.
    v = _scan(tmp_path, "def r(_mod):\n    if _mod == 'ghost':\n        return 'outline'\n")
    assert len(v) >= 1
    assert any("ghost" in vi["src"] for vi in v)


def test_catches_modifier_membership(tmp_path):
    # modifier in ("ghost", "pill") — membership form of the same carve-out.
    v = _scan(tmp_path, "def r(modifier):\n    return modifier in ('ghost', 'pill')\n")
    assert len(v) >= 1


# ---------------------------------------------------------------------------
# Clean code the gate must NOT flag (zero false positives)
# ---------------------------------------------------------------------------

def test_allows_property_literal_compare(tmp_path):
    # A real resolver legitimately compares the CSS property to a literal.
    v = _scan(tmp_path, "def r(decl):\n    return decl.property == 'max-width'\n")
    assert v == []


def test_allows_db_driven_slug_use(tmp_path):
    # Passing block_slug to a DB lookup (no literal comparison) is fine.
    src = (
        "def r(ctx, attr_resolve):\n"
        "    return attr_resolve(ctx.block_slug, 'OUTER', 'max-width')\n"
    )
    v = _scan(tmp_path, src)
    assert v == []


def test_allows_slug_value_compare_non_target(tmp_path):
    # Comparing a NON-target variable to a literal is fine.
    v = _scan(tmp_path, "def r(layer):\n    return layer == 'OUTER'\n")
    assert v == []


# ---------------------------------------------------------------------------
# Baseline semantics: NEW vs baselined
# ---------------------------------------------------------------------------

def test_violation_key_is_line_independent(tmp_path):
    src_a = "def r(ctx):\n    return ctx.block_slug == 'sgs/hero'\n"
    src_b = "# a comment line\n# another\ndef r(ctx):\n    return ctx.block_slug == 'sgs/hero'\n"
    ka = _scan(tmp_path / "a", src_a)[0]["key"]
    kb = _scan(tmp_path / "b", src_b)[0]["key"]
    # Same node source, different line → keys must agree on the source-hash half.
    assert ka.split("::")[1] == kb.split("::")[1]


# ---------------------------------------------------------------------------
# db_lookup.py is in scope (QC-council 2026-09-21): slug LITERALS only, smoke-test block skipped
# ---------------------------------------------------------------------------

from converter.gates import no_slug_literal as _gate  # noqa: E402


def _scan_as_db_accessor(tmp_path: Path, monkeypatch, source: str) -> list[dict]:
    """Run the gate's default-scope ``run()`` with a planted file registered exactly as db_lookup.py is."""
    planted = tmp_path / "db_probe.py"
    planted.write_text(source, encoding="utf-8")
    monkeypatch.setattr(_gate, "_SCAN_FILES", [planted])
    monkeypatch.setattr(_gate, "_LITERAL_ONLY_FILES", [planted])
    return _gate.run()


def test_db_lookup_is_in_the_default_scan_and_is_clean():
    real = _gate._CONVERTER / "db" / "db_lookup.py"
    assert real in _gate._SCAN_FILES and real in _gate._LITERAL_ONLY_FILES
    assert [v for v in _gate.run() if v["file"].replace("\\", "/").endswith("db/db_lookup.py")] == []


def test_a_slug_literal_planted_in_the_db_accessor_fails_the_gate(tmp_path, monkeypatch):
    for src in (
        "def w(children):\n    return emit('sgs/container', {}, children)\n",   # bare slug literal in a return
        "def w(block_slug):\n    return block_slug == 'sgs/hero'\n",              # compared to a slug literal
        "def w(x):\n    default = 'sgs/container'\n    return x\n",                # assigned slug literal
    ):
        assert _scan_as_db_accessor(tmp_path, monkeypatch, src), src


def test_negative_control_without_the_registration_the_planted_literal_is_invisible(tmp_path, monkeypatch):
    """The gate's pre-fix blind spot: a file outside the scan lists is never read."""
    planted = tmp_path / "db_probe.py"
    planted.write_text("def w(children):\n    return emit('sgs/container', {}, children)\n", encoding="utf-8")
    monkeypatch.setattr(_gate, "_SCAN_FILES", [])
    monkeypatch.setattr(_gate, "_LITERAL_ONLY_FILES", [])
    assert _gate.run() == []


def test_the_db_accessor_may_compare_schema_names_and_enum_literals(tmp_path, monkeypatch):
    src = (
        "def w(cols, block_slug, mod_kind):\n"
        "    a = 'container_kind' not in cols\n"
        "    b = '/' in block_slug\n"
        "    c = mod_kind not in ('variant', 'state')\n"
        "    return a, b, c\n"
    )
    assert _scan_as_db_accessor(tmp_path, monkeypatch, src) == []
    # ... while the SAME source in a resolver (full mode) is still caught: the narrowing is per-file, not global.
    assert _scan(tmp_path / "resolvers_dir", "def r(block_slug):\n    return block_slug in ('sgs/hero',)\n")


def test_a_main_guard_smoke_test_is_not_scanned_but_module_level_code_after_it_is(tmp_path, monkeypatch):
    src = (
        "if __name__ == '__main__':\n"
        "    CASE = 'sgs/container'\n"
    )
    assert _scan_as_db_accessor(tmp_path, monkeypatch, src) == []
    assert _scan_as_db_accessor(tmp_path, monkeypatch, src.replace("if __name__ == '__main__':", "if True:"))
