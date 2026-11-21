"""The built-in button kit as a source of wiring links (wf_button_kit), with negative controls: a kit attribute is wired
when the block's editor mounts `BuiltinButtonPanel` for its prefix (L2) and its render path calls `sgs_button_kit_css` with
that prefix (L4, L5), and only for a group the declaration shows. Each case runs the whole gate over a miniature plugin."""
from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))

from wf_button_kit import ButtonKit  # noqa: E402
from wf_cli import run  # noqa: E402
from wf_testkit import COLUMNS, links_of, make_roots  # noqa: E402

REGISTRY = {
    "defaultGroups": ["colour", "border"],
    "groups": {
        "colour": [
            {"base": "ColourBackground", "type": "string", "role": "color", "css_property": "background-color", "css_state": None, "tier_shape": None},
            {"base": "ColourText", "type": "string", "role": "color", "css_property": "color", "css_state": None, "tier_shape": None},
        ],
        "border": [
            {"base": "BorderStyle", "type": "string", "role": "visual", "css_property": "border-style", "css_state": None, "tier_shape": None},
        ],
        "typography": [
            {"base": "TextTransform", "type": "string", "role": "typography", "css_property": "text-transform", "css_state": None, "tier_shape": None},
        ],
    },
}

EDIT = """import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import BuiltinButtonPanel from '../../components/BuiltinButtonPanel';
const PREFIX = 'cta';
export default function Edit( { attributes, setAttributes } ) {
	return ( <>
		<InspectorControls><p>x</p></InspectorControls>
		__MOUNT__
		<div { ...useBlockProps() }>x</div>
	</> );
}
"""
MOUNT = '<BuiltinButtonPanel attributes={ attributes } setAttributes={ setAttributes } blockName="sgs/{slug}" prefix="cta" />'
RENDER_LITERAL = "<?php\n$set = array_filter( $attributes );\necho '<style>' . sgs_button_kit_css( $set, 'cta', '.x' ) . '</style>';\n"
RENDER_NO_CALL = "<?php\necho '<div>' . esc_html( $attributes['ctaColourBackground'] ?? '' ) . '</div>';\n"

BASES = ("ColourBackground", "ColourText", "BorderStyle", "TextTransform")


def build(tmp: Path, blocks: dict[str, dict]):
    """The fixture gate tree plus one block per `blocks` entry: groups, editor mount (None = no panel), render source."""
    roots = make_roots(tmp)
    kit = roots.plugin / "src" / "components" / "button-kit"
    kit.mkdir(parents=True)
    (kit / "registry.json").write_text(json.dumps(REGISTRY), encoding="utf-8")
    db = sqlite3.connect(roots.db)
    for slug, spec in blocks.items():
        bdir = roots.plugin / "src" / "blocks" / slug
        bdir.mkdir(parents=True)
        decl = {"prefix": "cta", "part": "cta", "label": "CTA"}
        if spec.get("groups") is not None:
            decl["groups"] = spec["groups"]
        bases = spec.get("attrs", BASES)
        (bdir / "block.json").write_text(json.dumps({
            "apiVersion": 3, "name": f"sgs/{slug}", "title": slug,
            "supports": {"sgs": {"builtinButtons": [decl]}},
            "attributes": {"cta" + b: {"type": "string", "_generated": "button-kit"} for b in bases},
        }), encoding="utf-8")
        mount = spec["mount"].replace("{slug}", slug) if spec.get("mount") else ""
        (bdir / "edit.js").write_text(EDIT.replace("__MOUNT__", mount), encoding="utf-8")
        (bdir / "render.php").write_text(spec["render"], encoding="utf-8")
        by_base = {r["base"]: r for rs in REGISTRY["groups"].values() for r in rs}
        for b in bases:
            r = by_base[b]
            row = {"block_slug": f"sgs/{slug}", "attr_name": "cta" + b, "attr_type": "string", "css_property": r["css_property"],
                   "css_element": "cta", "css_state": None, "role": r["role"], "tier_shape": None, "box_family": None, "source": "sgs"}
            db.execute(f"INSERT INTO block_attributes VALUES ({', '.join('?' * len(COLUMNS))})", [row[c] for c in COLUMNS])
    db.commit()
    db.close()
    return roots


@pytest.fixture(scope="module")
def report(tmp_path_factory):
    blocks = {
        "kit-ok": {"groups": ["colour"], "attrs": ("ColourBackground", "ColourText"), "mount": MOUNT, "render": RENDER_LITERAL},
        # The prefix reaches the kit through a variable, a helper parameter and a constant the panel is mounted with.
        "kit-var": {"groups": ["colour"], "attrs": ("ColourBackground",), "mount": "<BuiltinButtonPanel prefix={ PREFIX } />",
                    "render": "<?php\nfunction kit_var_css( $a, $p ) { return sgs_button_kit_css( $a, $p, '.x' ); }\n"
                              "echo '<style>' . kit_var_css( $attributes, 'cta' ) . '</style>';\n"},
        "kit-default": {"attrs": ("ColourBackground", "BorderStyle"), "mount": MOUNT, "render": RENDER_LITERAL},
        "kit-nopanel": {"groups": ["colour"], "attrs": ("ColourBackground", "ColourText"), "mount": None, "render": RENDER_LITERAL},
        "kit-wrongprefix": {"groups": ["colour"], "attrs": ("ColourBackground",), "mount": MOUNT.replace('"cta"', '"other"'), "render": RENDER_LITERAL},
        "kit-nocall": {"groups": ["colour"], "attrs": ("ColourBackground",), "mount": MOUNT, "render": RENDER_NO_CALL},
        "kit-othercall": {"groups": ["colour"], "attrs": ("ColourBackground",), "mount": MOUNT,
                          "render": RENDER_LITERAL.replace("'cta'", "'other'")},
        "kit-dynamic": {"groups": ["colour"], "attrs": ("ColourBackground",), "mount": MOUNT,
                        "render": RENDER_LITERAL.replace("'cta'", "$attributes['p']")},
        "kit-group": {"groups": ["colour"], "attrs": ("ColourBackground", "TextTransform"), "mount": MOUNT, "render": RENDER_LITERAL},
    }
    return run(build(tmp_path_factory.mktemp("kit"), blocks), with_dump=False)


def kit_links(report, slug: str) -> dict[str, set[str]]:
    out: dict[str, set[str]] = {}
    for f in report["findings"]:
        if f["block"] == f"sgs/{slug}":
            out.setdefault(f["attr"], set()).add(f["link"])
    return out


def test_a_fully_wired_kit_adopter_passes_l2_l4_and_l5(report):
    got = kit_links(report, "kit-ok")
    assert not (got.get("ctaColourBackground", set()) | got.get("ctaColourText", set())) & {"L2", "L4", "L5"}


def test_a_prefix_resolved_through_a_variable_a_helper_parameter_and_a_constant_is_wired(report):
    assert not links_of(report, "sgs/kit-var", "ctaColourBackground") & {"L2", "L4", "L5"}


def test_the_default_groups_apply_when_the_declaration_names_none(report):
    got = kit_links(report, "kit-default")
    assert not (got.get("ctaColourBackground", set()) | got.get("ctaBorderStyle", set())) & {"L2", "L4", "L5"}


def test_must_fail_the_panel_not_mounted_for_the_prefix_fails_l2(report):
    for slug in ("kit-nopanel", "kit-wrongprefix"):
        links = links_of(report, f"sgs/{slug}", "ctaColourBackground")
        assert "L2" in links, slug
        assert not links & {"L4", "L5"}, slug


def test_must_fail_no_kit_call_for_the_prefix_fails_the_front_end_level(report):
    for slug in ("kit-nocall", "kit-othercall", "kit-dynamic"):
        links = links_of(report, f"sgs/{slug}", "ctaColourBackground")
        # Without the kit call the render either never reads the attribute (L4) or reads it into no CSS (L5).
        assert links & {"L4", "L5"}, slug
        assert "L2" not in links, slug


def test_must_fail_a_group_the_declaration_leaves_out_is_not_counted(report):
    # The block declares only `colour`: a typography attribute is no kit attribute for it, so the kit earns it nothing.
    links = links_of(report, "sgs/kit-group", "ctaTextTransform")
    assert {"L2", "L4"} <= links
    assert not links_of(report, "sgs/kit-group", "ctaColourBackground") & {"L2", "L4", "L5"}


def test_the_kit_never_credits_the_editor_canvas(report):
    # The panel draws nothing in the canvas: L3 stays the block's own to earn.
    assert "L3" in links_of(report, "sgs/kit-ok", "ctaColourBackground")


def test_match_ignores_an_attribute_outside_a_declared_prefix(tmp_path):
    roots = build(tmp_path, {"kit-ok": {"groups": ["colour"], "attrs": ("ColourBackground",), "mount": MOUNT, "render": RENDER_LITERAL}})
    kit = ButtonKit(roots.plugin)
    bjson = {"supports": {"sgs": {"builtinButtons": [{"prefix": "cta", "part": "cta", "label": "x", "groups": ["colour"]}]}}}
    assert kit.match(bjson, "ctaColourText") == "cta"
    assert kit.match(bjson, "ctaBorderStyle") is None
    assert kit.match(bjson, "ctaColourTextHover") is None
    assert kit.match(bjson, "otherColourText") is None
    assert kit.match({}, "ctaColourText") is None
