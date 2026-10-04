"""Mechanisms from the second Task 2 review (one test per mechanism, each with a
negative control beside it; prove_rules_can_fail.py checks each turns red when
its mechanism is removed).

Population: values forwarded into a nested block, a paint declaration a toggle
fixes in the block it guards, control dependence through a reassigned variable.
Value flow: closures inside array literals, the query boundary, keyed call
returns, dynamic indexes. Consumers: the L6 / L6-token split, concatenated BEM
selectors. Inputs: postbuild injectors, build/ paths, invalid block.json. The
front-end pass gives the same result in a pool as in one process."""
from __future__ import annotations

import json
import re
from pathlib import Path

import pytest
from wf_testkit import make_roots, record

import wf_pass
from wf_channel import ChannelAnalyser, attr_seeds
from wf_css import CssIndex, build_css_index, injector_globs, stylesheet_files
from wf_editor import BlockEditor
from wf_inputs import load_blockjson
from wf_links import ADVISORY, LinkEnv, assess
from wf_paint import PaintClassifier
from wf_php import PhpIndex
from wf_tokens import Channel, constant_paint_props


def _index(tmp_path: Path, php: str) -> tuple[PhpIndex, object]:
    f = tmp_path / "render.php"
    f.write_text("<?php\n" + php, encoding="utf-8")
    index = PhpIndex([f])
    return index, index.files[f.as_posix()]


def flow(tmp_path: Path, php: str, attr: str) -> tuple[Channel, ChannelAnalyser]:
    index, t = _index(tmp_path, php)
    an = ChannelAnalyser(index, {"card", "grid"})
    ch = Channel()
    an.flow(t, attr_seeds(t, attr), attr, ch)
    return ch, an


# ---- A1(1). a value forwarded into a nested block paints through the attribute it lands in

def test_forwarded_toggle_paints_through_the_nested_blocks_class_rule(report):
    rec = record(report, "sgs/fwd-parent", "pickerTick")
    assert rec["category"] == "css" and rec["forwards"] == ["sgs/fwd-child::showTick"]
    # Negative control: forwarded into the nested block's content attribute, it is content.
    assert record(report, "sgs/fwd-parent", "pickerItems")["category"] == "not"


def test_forwards_found_inline_and_through_a_keyed_variable(tmp_path):
    inline = "echo render_block( array( 'blockName' => 'sgs/kid', 'attrs' => array( 'tick' => $attributes['showTick'], 'n' => 1 ) ) );\n"
    keyed = ("$a = array( 'tick' => (bool) $attributes['showTick'], 'other' => $x );\n"
             "echo render_block( array( 'blockName' => 'sgs/kid', 'attrs' => $a ) );\n")
    assert flow(tmp_path, inline, "showTick")[0].forwards == {("sgs/kid", "tick")}
    assert flow(tmp_path, keyed, "showTick")[0].forwards == {("sgs/kid", "tick")}
    # Negative control: another setting in the same attrs array is not forwarded under this key.
    assert flow(tmp_path, keyed.replace("$x", "$attributes['otherSetting']"), "otherSetting")[0].forwards == {("sgs/kid", "other")}


def test_a_closure_inside_an_array_literal_keeps_the_assignment_head(tmp_path):
    php = ("$a = array(\n\t'items' => array_map( static function ( $t ) {\n\t\treturn $t;\n\t}, $list ),\n"
           "\t'tick' => $attributes['showTick'],\n);\n"
           "echo render_block( array( 'blockName' => 'sgs/kid', 'attrs' => $a ) );\n")
    assert flow(tmp_path, php, "showTick")[0].forwards == {("sgs/kid", "tick")}
    # Negative control: the closure's own statements never taint the outer target.
    assert flow(tmp_path, php, "list")[0].forwards == set()


def test_a_reference_inside_a_closure_follows_the_outer_assignment_on(tmp_path):
    php = ("$min = $attributes['minRating'];\n"
           "$kept = array_filter( $all, function ( $r ) use ( $min ) {\n\tif ( $r < $min ) {\n\t\treturn false;\n\t}\n\treturn true;\n} );\n"
           "foreach ( $kept as $k ) {\n\techo '<li class=\"sgs-card__row--kept\">' . $k . '</li>';\n}\n")
    assert "sgs-card__row--kept" in flow(tmp_path, php, "minRating")[0].classes
    # Negative control: a variable never reaching the filter has no channel through it.
    assert "sgs-card__row--kept" not in flow(tmp_path, php.replace("use ( $min )", "use ( $none )")
                                              .replace("$r < $min", "$r < $none"), "minRating")[0].classes


# ---- A1(2). a paint declaration the toggle fixes in the block it guards

def test_constant_paint_declarations_only():
    assert constant_paint_props("{border-top:1px solid ' . sgs_colour_value( 'border' ) . ';margin:8px 0;}") == {"border-top"}
    # Negative controls: show/hide and box properties, and a value another setting carries.
    assert constant_paint_props("{display:block;width:1px;clip-path:inset(50%);}") == set()
    assert constant_paint_props("{color:' . $label_colour . ';}") == set()


def test_toggle_population_end_to_end(report):
    assert record(report, "sgs/toggle-paint", "hairline")["basis"] == "toggle-paint-decl"
    assert record(report, "sgs/toggle-paint", "smartContrast")["basis"] == "toggle-paint-decl"
    # Negative controls: a guarded display rule, a guarded rule with another setting's colour.
    assert record(report, "sgs/toggle-paint", "showBox")["category"] == "not"
    assert record(report, "sgs/toggle-paint", "showCaption")["category"] == "not"


def test_gate_paint_reads_the_guarded_block(tmp_path):
    php = "if ( ! empty( $attributes['hairline'] ) ) {\n\t$css[] = '.x{border-top:1px solid #ccc;}';\n}\n"
    assert flow(tmp_path, php, "hairline")[0].gate_paint == {"border-top"}
    assert flow(tmp_path, php.replace("border-top:1px solid #ccc", "display:block"), "hairline")[0].gate_paint == set()


# ---- A1(3). control dependence: a toggle that reassigns a value a later declaration writes

def test_control_paint_follows_a_reassignment_only(tmp_path):
    reassign = ("$colour = $attributes['itemColour'];\n$smart = ! empty( $attributes['smart'] );\n"
                "if ( $smart ) {\n\t$colour = pick( $colour );\n}\n$css[] = '.x{color:' . $colour . ';}';\n")
    ch, an = flow(tmp_path, reassign, "smart")
    assert an.control_paint(ch.gate_sites)
    # Negative control: a variable the guarded block introduces (its own content's styling).
    introduce = ("$show = ! empty( $attributes['smart'] );\nif ( $show ) {\n\t$label = $attributes['labelColour'];\n"
                 "\t$css[] = '.x{color:' . $label . ';}';\n}\n")
    ch, an = flow(tmp_path, introduce, "smart")
    assert not an.control_paint(ch.gate_sites)


def test_toggle_paint_classifies_as_css():
    pc = PaintClassifier([])
    row = {"attr_name": "stockLineHairline", "role": "boolean-visibility", "css_property": None}
    assert pc.classify(row, {"toggle_paint": True}) == ("css", "toggle-paint-decl")
    assert pc.classify(row, {"decl_channel": True})[0] == "not"


# ---- query boundary, keyed returns, dynamic indexes

def test_a_query_result_does_not_carry_the_setting_on(tmp_path):
    php = ("$q = new WP_Query( array( 'post_type' => $attributes['contentType'] ) );\n"
           "foreach ( $q->posts as $p ) {\n\techo '<li class=\"sgs-grid__item--' . $p->post_type . '\">';\n}\n")
    assert flow(tmp_path, php, "contentType")[0].classes == set()
    # Negative control: the same shape through a plain helper carries it.
    assert flow(tmp_path, php.replace("new WP_Query(", "my_args("), "contentType")[0].classes == {"sgs-grid__item--"}


SPLIT = ("function split_rows( $rows, int $before, int $cart = 0 ): array {\n\t$b = '';\n\t$c = '';\n\t$i = 0;\n"
         "\tforeach ( $rows as $row ) {\n\t\tif ( $i < $before ) {\n\t\t\t$b .= $row;\n\t\t} elseif ( $i < $before + $cart ) {\n"
         "\t\t\t$c .= $row;\n\t\t}\n\t\t++$i;\n\t}\n\treturn array( 'before' => $b, 'cart' => $c );\n}\n"
         "$s = split_rows( $inner, $attributes['beforeCount'], $attributes['cartCount'] );\n"
         "echo '<div class=\"sgs-card__extras--before\">' . $s['before'] . '</div>';\n"
         "echo '<div class=\"sgs-card__extras--cart\">' . $s['cart'] . '</div>';\n")


def test_keyed_return_carries_the_value_under_its_own_keys(tmp_path):
    assert flow(tmp_path, SPLIT, "cartCount")[0].classes == {"sgs-card__extras--cart"}
    assert flow(tmp_path, SPLIT, "beforeCount")[0].classes == {"sgs-card__extras--before", "sgs-card__extras--cart"}
    # Negative control: a call that is not the whole right-hand side taints the whole result.
    whole = SPLIT.replace("$s = split_rows( $inner, $attributes['beforeCount'], $attributes['cartCount'] );",
                          "$s = split_rows( $inner, $attributes['beforeCount'], $attributes['cartCount'] ) + $extra;")
    assert flow(tmp_path, whole, "cartCount")[0].classes == {"sgs-card__extras--before", "sgs-card__extras--cart"}


def test_a_dynamic_index_reads_the_keys_it_resolves_to(tmp_path):
    php = ("function tiers( $v ) {\n\treturn array( 'desktop' => $v, 'mobile' => $v );\n}\n"
           "$t = tiers( $attributes['burgerWidth'] );\n"
           "foreach ( array( 'desktop', 'mobile' ) as $k ) {\n\t$w = $t[ $k ];\n\t$css .= '.x{width:' . $w . ';}';\n}\n")
    assert flow(tmp_path, php, "burgerWidth")[0].decl
    # Negative control: a suffix concatenation names only the keys ending in that suffix.
    opts = ("$p = array( 'showTitle' => $attributes['showTitle'], 'titleColour' => $c );\n"
            "foreach ( array( 'title' ) as $el ) {\n\t$css .= '.x{color:' . $p[ $el . 'Colour' ] . ';}';\n}\n")
    assert not flow(tmp_path, opts, "showTitle")[0].decl


# ---- A2. L6 only when no live paint channel is left; a dead token on a working attribute is L6-token

def _assess(ch: Channel, css: CssIndex) -> list[str]:
    env = LinkEnv(css=css, js="", root_class_re=re.compile(r"\.sgs-(card)(?![\w-])"))
    be = BlockEditor(control={"x": "c"}, canvas={"x": {"whole": True, "tiers": set(), "flag": False}}, real_prop={"x"})
    return assess({"attr_name": "x", "role": "styling"}, "css", ch, {}, be, False, set(), env)["missing"]


def test_l6_split_by_live_channel():
    css = CssIndex()
    assert "L6" in _assess(Channel(read=True, cps={"--sgs-dead"}), css)
    missing = _assess(Channel(read=True, decl=True, classes={"sgs-card--dead"}), css)
    assert "L6-token" in missing and "L6" not in missing and "L6-token" in ADVISORY
    # A data attribute in a statement that merely mentions a runtime is not a live effect channel.
    noisy = Channel(read=True, classes={"sgs-card__item--disabled"}, data={"data-nav-path"}, fx_data={"data-nav-path"})
    assert "L6" in _assess(noisy, css)


# ---- A3. a selector built from a variable block root and a BEM tail

def test_concatenated_bem_selector_resolves_its_root_through_callers(tmp_path):
    inc = tmp_path / "inc.php"
    inc.write_text("<?php\nfunction featured_css( $attributes, $uid, $bem_root ) {\n"
                   "\treturn $uid . ' .' . $bem_root . '__item--featured .' . $bem_root . '__link{color:red}';\n}\n"
                   "function state_css( $attributes, $uid, $bem_root ) {\n\treturn featured_css( $attributes, $uid, $bem_root );\n}\n",
                   encoding="utf-8")
    blk = tmp_path / "render.php"
    blk.write_text("<?php\n$css = state_css( $attributes, '.u', 'sgs-nav-bar' );\n", encoding="utf-8")
    index = PhpIndex([inc, blk])
    css = build_css_index(tmp_path / "none", tmp_path / "none", list(index.files.values()))
    assert css.has_class("sgs-nav-bar__item--featured")
    # Negative control: a root no caller passes is not invented.
    assert not css.has_class("sgs-nav-drawer__item--featured")


# ---- A4. a selector held in a variable: negative control beside test_selector_variable_feeds_the_child_selector_rules

def test_selector_variable_without_a_child_combinator_names_no_cell(tmp_path):
    php = ("function render( $attributes, $uid ) {\n"
           "\t$sel = '.' . $uid . '.sgs-grid--on .sgs-card';\n"
           "\t$decl = sgs_text_colour_decl( $attributes['cellTextHover'] );\n"
           "\t$css .= sgs_hover_state_rules( $sel, $decl . ';' );\n\treturn $css;\n}\n")
    assert flow(tmp_path, php, "cellTextHover")[0].child_sel == set()
    later = php.replace("\t$sel = '.' . $uid . '.sgs-grid--on .sgs-card';\n", "").replace(
        "\treturn $css;", "\t$sel = '.' . $uid . '.sgs-grid--on > .sgs-card';\n\treturn $css;")
    assert flow(tmp_path, later, "cellTextHover")[0].child_sel == set()


# ---- B4-B6. inputs

def test_postbuild_injectors_come_from_package_json(tmp_path, capsys):
    (tmp_path / "package.json").write_text(json.dumps({"scripts": {"postbuild": (
        "node scripts/copy-built-styles.js && node scripts/lift/run.js --build && node scripts/guard/run-transform.js"
        " && node scripts/lift/run.js --check && node scripts/check-assets.js --check")}}), encoding="utf-8")
    assert injector_globs(tmp_path) == ("scripts/lift/*.js", "scripts/guard/*.js")
    assert injector_globs(tmp_path / "absent") == ()
    (tmp_path / "package.json").write_text("{ not json", encoding="utf-8")
    assert injector_globs(tmp_path)
    assert "WARNING" in capsys.readouterr().err


def test_build_and_node_modules_are_skipped_relative_to_the_plugin(tmp_path):
    plugin = tmp_path / "build" / "plugin"
    for rel in ("src/blocks/a/style.css", "src/build/skip.css", "src/node_modules/x/skip.css"):
        (plugin / rel).parent.mkdir(parents=True, exist_ok=True)
        (plugin / rel).write_text(".a{}", encoding="utf-8")
    names = [f.relative_to(plugin).as_posix() for f in stylesheet_files(plugin, tmp_path / "no-theme")]
    assert names == ["src/blocks/a/style.css"]


def test_invalid_block_json_raises_its_parse_error(tmp_path):
    roots = make_roots(tmp_path)
    bad = roots.blocks / "broken" / "block.json"
    bad.parent.mkdir()
    bad.write_text('{ "name": "sgs/broken", }', encoding="utf-8")
    with pytest.raises(ValueError, match="broken/block.json"):
        load_blockjson(roots)


# ---- B8. the pool gives the in-process result

def test_front_end_pass_in_a_pool_matches_one_process(fixture_roots_dir, monkeypatch):
    from wf_inputs import load_inputs
    from wf_scan import jobs_for

    inp = load_inputs(fixture_roots_dir, with_dump=False)
    by_block: dict = {}
    for r in inp.rows:
        by_block.setdefault(r["block_slug"], []).append(r)
    jobs = jobs_for(fixture_roots_dir, inp, by_block)
    local = wf_pass.FrontPass(fixture_roots_dir)
    serial = wf_pass.PassRun(fixture_roots_dir, jobs).result(local)
    monkeypatch.setattr(wf_pass, "PARALLEL_MIN_BLOCKS", 0)
    run = wf_pass.PassRun(fixture_roots_dir, jobs)
    assert run._pool is not None
    pooled = run.result(local)

    def flat(res):
        return {(b, a): (sorted(ch.classes), sorted(ch.cps), ch.decl, w, tg)
                for b, r in res.items() for a, (ch, w, tg) in r.channels.items()}

    assert flat(pooled) == flat(serial)

