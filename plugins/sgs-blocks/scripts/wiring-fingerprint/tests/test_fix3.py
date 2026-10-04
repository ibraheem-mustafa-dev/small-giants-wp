"""Third Task 2 review: two population rules that overreached.

1. A name suffix (`Order` is CSS `order`) or a layout role must not make a setting
   paint when its value only reaches a query/collection call, or its options are all
   data-source keywords (`name`, `count`, `term_order`).
2. A media-element playback attribute (`loop`, `autoplay`, `muted`, `controls`,
   `playsinline`) is behaviour; only a runtime that drives a visual effect (Lottie,
   parallax, magnet) makes a toggle paint.

Each mechanism has a negative control beside it; prove_rules_can_fail.py checks each
turns red when its mechanism is removed."""
from __future__ import annotations

from test_fix2 import flow
from wf_testkit import record

from wf_paint import PaintClassifier

SUFFIXES = [("Order", "order"), ("Radius", "border-radius")]


def classify(attr: str, role: str | None, signals: dict, css_property: str | None = None) -> tuple[str, str]:
    return PaintClassifier(SUFFIXES).classify({"attr_name": attr, "role": role, "css_property": css_property}, signals)


# ---- 1a. value flow: the query flag

def test_a_value_in_a_query_argument_key_sets_the_query_flag(tmp_path):
    php = "$terms = get_terms( array( 'taxonomy' => 'brand', 'orderby' => $attributes['sortBy'] ) );\n"
    ch, _an = flow(tmp_path, php, "sortBy")
    assert ch.query and not ch.kinds()
    # Negative control: the same value under a non-query key of a plain helper is not a query read.
    ch, _an = flow(tmp_path, "$x = my_args( array( 'gap' => $attributes['sortBy'] ) );\n", "sortBy")
    assert not ch.query


def test_a_value_passed_to_a_query_call_or_static_query_method_sets_the_query_flag(tmp_path):
    assert flow(tmp_path, "$q = new WP_Query( $attributes['args'] );\n", "args")[0].query
    assert flow(tmp_path, "$r = \\SGS\\Blocks\\CPT_Collection_Query::get_results( $attributes['args'] );\n", "args")[0].query
    # Negative control: a helper that merely resembles a query name is not a query.
    assert not flow(tmp_path, "$r = my_get_terms_label( $attributes['args'] );\n", "args")[0].query


def test_a_static_query_method_result_does_not_carry_the_setting_on(tmp_path):
    php = ("$res = \\SGS\\Blocks\\CPT_Collection_Query::get_results( $attributes, array( 'paged' => $attributes['pg'] ) );\n"
           "foreach ( $res['posts'] as $p ) {\n\techo '<li class=\"sgs-grid__item--' . $p->post_type . '\">';\n}\n")
    assert flow(tmp_path, php, "pg")[0].classes == set()
    # Negative control: through a plain helper the class reads the value.
    plain = php.replace("\\SGS\\Blocks\\CPT_Collection_Query::get_results(", "my_args(")
    assert flow(tmp_path, plain, "pg")[0].classes == {"sgs-grid__item--"}


# ---- 1b. classification

def test_a_query_only_setting_is_not_paint_whatever_its_role_or_name():
    assert classify("brandOrder", "layout", {"query_only": True}) == ("not", "query-only")
    assert classify("brandOrder", None, {"query_only": True}) == ("not", "query-only")
    # Negative control: without the query signal the same role and name still paint.
    assert classify("brandOrder", "layout", {})[0] == "css"
    assert classify("brandOrder", None, {}) == ("css", "suffix:Order")


def test_an_all_data_source_enum_overrides_the_name_suffix_and_the_role():
    sort = ["name", "count", "term_order"]
    assert classify("brandOrder", None, {"enum": sort}) == ("not", "data-source-enum")
    assert classify("brandOrder", "layout", {"enum": sort}) == ("not", "data-source-enum")
    # Negative controls: a CSS `order` enum, a mixed enum and a DB css_property all still paint.
    assert classify("cardOrder", None, {"enum": ["first", "last"]}) == ("css", "suffix:Order")
    assert classify("brandOrder", None, {"enum": ["name", "first"]}) == ("css", "suffix:Order")
    assert classify("brandOrder", None, {"enum": sort}, css_property="order") == ("css", "db-css-property")


def test_the_query_rule_end_to_end_through_the_gate(report):
    for attr in ("listOrder", "listPaged"):
        rec = record(report, "sgs/query-order", attr)
        assert (rec["category"], rec["basis"]) == ("not", "query-only"), attr
    # Its options are sort keywords and it reaches no query: the enum alone decides.
    sort = record(report, "sgs/query-order", "listSort")
    assert (sort["category"], sort["basis"]) == ("not", "data-source-enum")
    # Negative control: CSS `order` written into a declaration still paints.
    assert record(report, "sgs/query-order", "rowOrder")["category"] == "css"


# ---- 2. media-element playback attributes are behaviour

def test_media_playback_toggles_are_behaviour_even_when_a_runtime_reads_their_data_attribute():
    runtime = {"fx_data_consumed": True}
    for attr in ("videoLoop", "videoLoopTablet", "audioAutoplay", "videoMuted", "videoControlsMobile", "videoPlaysInline"):
        assert classify(attr, "boolean-visibility", runtime) == ("not", "media-playback-behaviour"), attr


def test_a_visual_effect_runtime_toggle_stays_paint():
    runtime = {"fx_data_consumed": True}
    for attr in ("bgLottieLoop", "itemMagnetEnabled", "bgParallaxLoop", "heroLottieAutoplay"):
        assert classify(attr, "boolean-visibility", runtime) == ("js", "effect-toggle-runtime"), attr
    # Negative control: a playback toggle no runtime reads is not paint either way.
    assert classify("videoLoop", "boolean-visibility", {"fx_data_consumed": False})[0] == "not"
