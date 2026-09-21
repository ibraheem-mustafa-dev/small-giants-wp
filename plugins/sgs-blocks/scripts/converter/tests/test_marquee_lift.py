"""test_marquee_lift.py -- a draft's seamless-marquee animation becomes the block's own marquee attrs.

The signature (converter/resolvers/marquee.py): the element holding the block's repeated items runs an
INFINITE animation whose @keyframes translate along X only. The block names its attrs by ROLE in the DB
(marquee-toggle / marquee-below / marquee-duration), so the lift fires for any block that declares them and
for none that does not. Every fixture is draft-agnostic: invented class and keyframe names, no client copy.

Each behaviour has a NEGATIVE CONTROL: the near-miss draft that must NOT lift (finite, Y travel, a tier set
that cannot be said as "below a width", a block with no marquee roles, keyframes that are not in the CSS).

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_marquee_lift.py -q -p no:cacheprovider
"""
from __future__ import annotations

import json
import re

import pytest

from converter.db import db_lookup
from converter.entry import convert_section
from converter.resolvers import marquee
from converter.services import content_gap_collector as gap_collector

ROW = '<span class="sgs-trust-bar__item"><span class="sgs-trust-bar__label">Claim {n}</span></span>'
TICKER = '<div class="sgs-trust-bar"><div class="sgs-trust-bar__track">{items}</div></div>'.format(
    items="".join(ROW.format(n=n) for n in range(4))
)
DRIFT = "@keyframes drift{from{transform:translateX(0)}to{transform:translateX(-50%)}}"
BOB = "@keyframes bob{from{transform:translateY(0)}to{transform:translateY(-8px)}}"


@pytest.fixture(autouse=True)
def _clean_gaps():
    gap_collector.clear()
    yield
    gap_collector.clear()


def _block(css: str, html: str = TICKER, slug: str = "trust-bar") -> tuple["dict | None", list[dict]]:
    res = convert_section(html=html, css=css, media_map={}, boundary_id="b1", section_id="s1")
    m = re.search(r"<!-- wp:sgs/%s (\{.*?\}) /?-->" % slug, res["block_markup"], re.S)
    return (json.loads(m.group(1)) if m else None), [g for g in res["content_gaps"] if "marquee" in g.get("where", "")]


def _marquee(attrs: "dict | None") -> dict:
    return {k: v for k, v in (attrs or {}).items() if k.startswith("autoScroll")}


# ---- the lift: which device tiers the animation is active on -> the "below" value ---------------------

def test_mobile_only_marquee_writes_toggle_below_768_and_the_duration():
    attrs, gaps = _block(DRIFT + "@media (max-width:767px){.sgs-trust-bar__track{animation:drift 30s linear infinite}}")
    assert _marquee(attrs) == {"autoScroll": True, "autoScrollBelow": 768, "autoScrollDuration": 30}
    assert gaps == []


def test_mobile_and_tablet_marquee_writes_below_1024():
    attrs, _ = _block(DRIFT + "@media (max-width:1023px){.sgs-trust-bar__track{animation:drift 12s linear infinite}}")
    assert _marquee(attrs) == {"autoScroll": True, "autoScrollBelow": 1024, "autoScrollDuration": 12}


def test_every_width_marquee_writes_no_below_because_zero_is_the_default():
    attrs, _ = _block(DRIFT + ".sgs-trust-bar__track{animation:drift 20s linear infinite}")
    assert _marquee(attrs) == {"autoScroll": True, "autoScrollDuration": 20}


def test_the_animation_may_sit_on_a_wrapper_above_the_items_row():
    html = '<div class="sgs-trust-bar"><div class="sgs-trust-bar__belt"><div class="sgs-trust-bar__track">%s</div></div></div>' % (
        "".join(ROW.format(n=n) for n in range(4))
    )
    attrs, _ = _block(DRIFT + ".sgs-trust-bar__belt{animation:drift 9s linear infinite}", html)
    assert _marquee(attrs).get("autoScroll") is True and _marquee(attrs).get("autoScrollDuration") == 9


def test_longhand_animation_properties_are_read_too():
    css = DRIFT + (".sgs-trust-bar__track{animation-name:drift;animation-duration:15s;"
                   "animation-iteration-count:infinite;animation-timing-function:linear}")
    attrs, _ = _block(css)
    assert _marquee(attrs) == {"autoScroll": True, "autoScrollDuration": 15}


def test_a_millisecond_duration_is_converted_to_seconds():
    attrs, _ = _block(DRIFT + ".sgs-trust-bar__track{animation:drift 2500ms linear infinite}")
    assert _marquee(attrs)["autoScrollDuration"] == 2.5


# ---- NEGATIVE CONTROLS: near misses that must not lift ------------------------------------------------

def test_a_finite_animation_is_not_a_marquee():
    attrs, gaps = _block(DRIFT + ".sgs-trust-bar__track{animation:drift 20s linear 3}")
    assert _marquee(attrs) == {} and gaps == []


def test_keyframes_that_travel_on_y_are_not_a_marquee():
    attrs, gaps = _block(BOB + ".sgs-trust-bar__track{animation:bob 2s ease-in-out infinite}")
    assert _marquee(attrs) == {} and gaps == []


def test_keyframes_missing_from_the_css_cannot_be_proven_so_nothing_lifts():
    attrs, gaps = _block(".sgs-trust-bar__track{animation:ghost 20s linear infinite}")
    assert _marquee(attrs) == {} and gaps == []


def test_animation_none_is_not_a_marquee():
    attrs, gaps = _block(DRIFT + ".sgs-trust-bar__track{animation:none}")
    assert _marquee(attrs) == {} and gaps == []


def test_a_static_ticker_writes_no_marquee_attr_at_all():
    attrs, gaps = _block(".sgs-trust-bar__track{display:flex}")
    assert _marquee(attrs) == {} and gaps == []


# ---- NEVER INVENTED: what cannot be carried is reported with a reason ---------------------------------

def test_a_non_device_tier_breakpoint_is_reported_and_nothing_is_snapped():
    attrs, gaps = _block(DRIFT + "@media (max-width:600px){.sgs-trust-bar__track{animation:drift 30s linear infinite}}")
    assert _marquee(attrs) == {}
    assert len(gaps) == 1 and "non-device-tier marquee breakpoint" in gaps[0]["detail"] and "600px" in gaps[0]["detail"]


def test_a_marquee_on_desktop_only_cannot_be_said_as_below_a_width_so_nothing_is_written():
    attrs, gaps = _block(DRIFT + "@media (min-width:1024px){.sgs-trust-bar__track{animation:drift 30s linear infinite}}")
    assert _marquee(attrs) == {}
    assert len(gaps) == 1 and "'below a width'" in gaps[0]["detail"] and "['Desktop']" in gaps[0]["detail"]


def test_tiers_that_disagree_on_duration_keep_the_toggle_but_write_no_duration():
    css = DRIFT + (".sgs-trust-bar__track{animation:drift 20s linear infinite}"
                   "@media (max-width:767px){.sgs-trust-bar__track{animation:drift 8s linear infinite}}")
    attrs, gaps = _block(css)
    assert _marquee(attrs) == {"autoScroll": True}
    assert len(gaps) == 1 and "differs by tier" in gaps[0]["detail"]


# ---- universality: the roles, not a block name, decide -------------------------------------------------

def test_a_block_with_no_marquee_role_never_lifts_even_for_a_perfect_marquee_draft():
    html = '<section class="sgs-container"><div class="sgs-container__row">%s</div></section>' % "".join(
        '<div class="sgs-container__cell"><p>Cell %d</p></div>' % n for n in range(4)
    )
    css = DRIFT + ".sgs-container__row{animation:drift 20s linear infinite}"
    attrs, gaps = _block(css, html, slug="container")
    assert _marquee(attrs) == {} and "scrolling" not in (attrs or {}) and gaps == []
    assert db_lookup.marquee_attrs_for("sgs/container") == {}


def test_brand_strip_lifts_its_toggle_and_reports_the_duration_it_has_no_attribute_for():
    logos = "".join('<a class="sgs-brand-strip__logo" href="#"><img alt="B%d" src="b%d.png"></a>' % (n, n) for n in range(6))
    html = '<section class="sgs-brand-marquee"><div class="sgs-brand-strip">%s</div></section>' % logos
    attrs, gaps = _block(DRIFT + ".sgs-brand-strip{animation:drift 64s linear infinite}", html, slug="brand-strip")
    assert (attrs or {}).get("scrolling") is True
    assert len(gaps) == 1 and "no marquee-duration attribute" in gaps[0]["detail"]


# ---- the pure helpers ----------------------------------------------------------------------------------

@pytest.mark.parametrize("block, expected", [
    ("@keyframes a{to{transform:translateX(-50%)}}", True),
    ("@keyframes a{to{transform:translate(-100px,0)}}", True),
    ("@keyframes a{to{transform:translate3d(-25%,0,0)}}", True),
    ("@keyframes a{to{transform:translateX(0)}}", False),
    ("@keyframes a{to{transform:translate(-10px,-10px)}}", False),
    ("@keyframes a{to{transform:translateY(-8px)}}", False),
    ("@keyframes a{to{opacity:0}}", False),
])
def test_keyframes_translate_x_only(block, expected):
    assert marquee.keyframes_translate_x_only(block) is expected


# ---- a draft whose script gives the animation per device (template binding), no @media at all ----------

def test_a_per_device_template_binding_drives_the_same_lift():
    rows = "".join(ROW.format(n=n) for n in range(4))
    html = '<div class="sgs-trust-bar"><div style="animation: {{ beltAnim }}">%s</div></div>' % rows
    binding = {"beltAnim": {"mobile": "drift 30s linear infinite", "tablet": "none", "desktop": "none", "intra_tier": {}}}
    res = convert_section(html=html, css=DRIFT, media_map={}, boundary_id="b1", section_id="s1", tier_bindings=binding)
    m = re.search(r"<!-- wp:sgs/trust-bar (\{.*?\}) /?-->", res["block_markup"], re.S)
    assert _marquee(json.loads(m.group(1))) == {"autoScroll": True, "autoScrollBelow": 768, "autoScrollDuration": 30}



# ---- the absence sentinel can never be shadowed by a draft's own bare tag rule -------------------------
# A draft that already holds `ul { list-style:none }` (or div / section) used to REPLACE the sentinel rule
# (same dict key), so a tier with NO animation looked like it inherited the desktop one and the desktop-only
# marquee was written as if it ran everywhere. The result must not depend on which bare rules the draft has.

def _tagged_ticker(tag: str) -> str:
    rows = "".join(ROW.format(n=n) for n in range(4))
    return '<div class="sgs-trust-bar"><%s class="sgs-trust-bar__track">%s</%s></div>' % (tag, rows, tag)


DESKTOP_ONLY = DRIFT + "@media (min-width:1024px){.sgs-trust-bar__track{animation:drift 30s linear infinite}}"


@pytest.mark.parametrize("tag", ["div", "ul", "section"])
@pytest.mark.parametrize("bare_rule", ["", "{tag}{{list-style:none}}", "*{{box-sizing:border-box}}"])
def test_a_bare_tag_rule_in_the_draft_never_hides_that_a_tier_has_no_animation(tag, bare_rule):
    css = bare_rule.format(tag=tag) + DESKTOP_ONLY
    attrs, gaps = _block(css, _tagged_ticker(tag))
    assert _marquee(attrs) == {}, "a desktop-only marquee must write nothing, bare rule or not"
    assert len(gaps) == 1 and "'below a width'" in gaps[0]["detail"] and "['Desktop']" in gaps[0]["detail"]


def test_the_sentinel_key_is_unique_even_against_a_padded_draft_key():
    from bs4 import BeautifulSoup
    node = BeautifulSoup("<ul></ul>", "html.parser").ul
    rules = {"ul": {"list-style": "none"}, "ul ": {"margin": "0"}}
    probe = marquee._with_absence_sentinel(node, rules)
    assert all(rules[k] is probe[k] for k in rules), "no draft rule may be replaced"
    assert len(probe) == len(rules) + 1 and next(iter(probe)) not in rules


# ---- what is NOT a seamless marquee: direction, timing, travel, and whose animation it is --------------

def _kf(name: str, travel: str) -> str:
    return "@keyframes %s{from{transform:translateX(0)}to{transform:translateX(%s)}}" % (name, travel)


def _track(anim: str) -> str:
    return ".sgs-trust-bar__track{animation:%s}" % anim


def test_a_decorative_shake_is_not_a_marquee_and_says_why():
    shake = ("@keyframes shake{0%{transform:translateX(0)}25%{transform:translateX(-4px)}"
             "75%{transform:translateX(4px)}100%{transform:translateX(0)}}")
    attrs, gaps = _block(shake + _track("shake 0.6s ease-in-out infinite"))
    assert _marquee(attrs) == {}
    assert len(gaps) == 1 and "non-linear timing" in gaps[0]["detail"] and "not treated as a marquee" in gaps[0]["detail"]


def test_a_stepped_carousel_is_not_a_marquee():
    attrs, gaps = _block(_kf("carousel", "-50%") + _track("carousel 9s steps(3) infinite"))
    assert _marquee(attrs) == {} and len(gaps) == 1 and "non-linear timing (steps(3))" in gaps[0]["detail"]


def test_an_animation_with_no_timing_function_defaults_to_ease_and_is_not_a_marquee():
    attrs, gaps = _block(_kf("drift", "-50%") + _track("drift 12s infinite"))
    assert _marquee(attrs) == {} and len(gaps) == 1 and "non-linear timing (ease)" in gaps[0]["detail"]


@pytest.mark.parametrize("direction", ["alternate", "alternate-reverse"])
def test_an_alternating_animation_bounces_so_it_is_not_a_marquee(direction):
    attrs, gaps = _block(_kf("drift", "-50%") + _track("drift 12s linear infinite %s" % direction))
    assert _marquee(attrs) == {}
    assert len(gaps) == 1 and "bounces back and forth" in gaps[0]["detail"] and direction in gaps[0]["detail"]


def test_the_direction_and_timing_longhands_are_read_too():
    css = _kf("drift", "-50%") + (".sgs-trust-bar__track{animation-name:drift;animation-duration:15s;"
                                  "animation-iteration-count:infinite;animation-timing-function:ease-in-out}")
    attrs, gaps = _block(css)
    assert _marquee(attrs) == {} and len(gaps) == 1 and "non-linear timing" in gaps[0]["detail"]
    css = _kf("drift", "-50%") + (".sgs-trust-bar__track{animation-name:drift;animation-duration:15s;"
                                  "animation-iteration-count:infinite;animation-timing-function:linear;"
                                  "animation-direction:alternate}")
    attrs, gaps = _block(css)
    assert _marquee(attrs) == {} and len(gaps) == 1 and "bounces back and forth" in gaps[0]["detail"]


def test_a_px_travel_is_not_a_marquee():
    attrs, gaps = _block(_kf("drift", "-20px") + _track("drift 12s linear infinite"))
    assert _marquee(attrs) == {}
    assert len(gaps) == 1 and "not a percentage" in gaps[0]["detail"] and "-20px" in gaps[0]["detail"]


def test_a_small_percentage_travel_is_not_a_marquee():
    attrs, gaps = _block(_kf("nudge", "-10%") + _track("nudge 12s linear infinite"))
    assert _marquee(attrs) == {} and len(gaps) == 1 and "only 10%" in gaps[0]["detail"]


@pytest.mark.parametrize("travel, seconds", [("-50%", 30), ("-33.333%", 20), ("-25%", 64), ("-20%", 8)])
def test_every_copy_count_travel_from_two_to_five_copies_is_a_marquee(travel, seconds):
    attrs, gaps = _block(_kf("loop", travel) + _track("loop %ds linear infinite" % seconds))
    assert _marquee(attrs) == {"autoScroll": True, "autoScrollDuration": seconds} and gaps == []


def test_a_gap_corrected_percentage_travel_is_still_a_marquee():
    attrs, gaps = _block(_kf("loop", "calc(-50% - 8px)") + _track("loop 30s linear infinite"))
    assert _marquee(attrs) == {"autoScroll": True, "autoScrollDuration": 30} and gaps == []


def test_a_reverse_marquee_is_still_a_marquee():
    attrs, gaps = _block(_kf("loop", "-50%") + _track("loop 30s linear infinite reverse"))
    assert _marquee(attrs) == {"autoScroll": True, "autoScrollDuration": 30} and gaps == []


def test_the_eye_care_shapes_still_lift():
    ticker = _kf("marquee", "-50%") + "@media (max-width:767px){.sgs-trust-bar__track{animation:marquee 30s linear infinite}}"
    attrs, gaps = _block(ticker)
    assert _marquee(attrs) == {"autoScroll": True, "autoScrollBelow": 768, "autoScrollDuration": 30} and gaps == []
    logos = "".join('<a class="sgs-brand-strip__logo" href="#"><img alt="B%d" src="b%d.png"></a>' % (n, n) for n in range(6))
    html = '<section class="sgs-brand-marquee"><div class="sgs-brand-strip">%s</div></section>' % logos
    attrs, _ = _block(_kf("marquee", "-50%") + ".sgs-brand-strip{animation:marquee 64s linear infinite}", html, slug="brand-strip")
    assert (attrs or {}).get("scrolling") is True


# ---- whose animation it is: the row, or its single wrapper, never a busier ancestor --------------------

ANCESTOR_ANIM = _kf("wob", "-50%") + ".sgs-trust-bar{animation:wob 9s linear infinite}"


def test_a_section_level_animation_is_not_attributed_to_the_items_row():
    rows = "".join(ROW.format(n=n) for n in range(4))
    html = ('<div class="sgs-trust-bar"><h2 class="sgs-trust-bar__title">Title</h2>'
            '<div class="sgs-trust-bar__track">%s</div></div>' % rows)
    attrs, gaps = _block(ANCESTOR_ANIM, html)
    assert _marquee(attrs) == {} and gaps == []


def test_the_same_animation_on_the_row_itself_is_a_marquee_negative_control():
    rows = "".join(ROW.format(n=n) for n in range(4))
    html = ('<div class="sgs-trust-bar"><h2 class="sgs-trust-bar__title">Title</h2>'
            '<div class="sgs-trust-bar__track">%s</div></div>' % rows)
    attrs, _ = _block(_kf("wob", "-50%") + _track("wob 9s linear infinite"), html)
    assert _marquee(attrs) == {"autoScroll": True, "autoScrollDuration": 9}


def test_an_animation_two_wrappers_above_the_row_is_not_the_marquee():
    rows = "".join(ROW.format(n=n) for n in range(4))
    html = ('<div class="sgs-trust-bar"><div class="sgs-trust-bar__outer"><div class="sgs-trust-bar__belt">'
            '<div class="sgs-trust-bar__track">%s</div></div></div></div>' % rows)
    attrs, _ = _block(_kf("wob", "-50%") + ".sgs-trust-bar__outer{animation:wob 9s linear infinite}", html)
    assert _marquee(attrs) == {}
    attrs, _ = _block(_kf("wob", "-50%") + ".sgs-trust-bar__belt{animation:wob 9s linear infinite}", html)
    assert _marquee(attrs).get("autoScroll") is True


# ---- keyframes_translate_x_only has its OWN negative controls ------------------------------------------
# The Y-travel tests above also trip the later travel predicate ("no X travel"), so forcing this function to
# return True left them green. These call it directly, and the end-to-end cases are built so that ONLY this
# predicate can reject: the animation is infinite, linear, direction normal, and either has no translate at
# all (its later travel predicate would report a gap row, so the gap list must be EMPTY) or has a 50% X
# travel that the later predicates would happily accept (so only the Y move can stop it).

@pytest.mark.parametrize("block", [
    "@keyframes a{to{transform:rotate(360deg)}}",
    "@keyframes a{to{transform:scale(1.2)}}",
    "@keyframes a{to{transform:translateY(-30%)}}",
    "@keyframes a{from{transform:translate(0,0)}to{transform:translate(-50%,-10px)}}",
    "@keyframes a{from{transform:translateX(0)}50%{transform:translateX(-50%) translateY(-8px)}to{transform:translateX(0)}}",
    "@keyframes a{to{transform:translate3d(-50%,-4px,0)}}",
    "@keyframes a{to{transform:rotate(10deg) scale(2)}}",
])
def test_keyframes_translate_x_only_rejects_anything_that_is_not_pure_x_travel(block):
    assert marquee.keyframes_translate_x_only(block) is False


@pytest.mark.parametrize("name, frames", [
    ("spin", "@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}"),
    ("pulse", "@keyframes pulse{from{transform:scale(1)}to{transform:scale(1.5)}}"),
])
def test_an_infinite_linear_animation_with_no_x_translate_is_not_a_marquee_and_says_nothing(name, frames):
    # only keyframes_translate_x_only can reject this before the travel predicate would log a gap row
    attrs, gaps = _block(frames + _track("%s 20s linear infinite" % name))
    assert _marquee(attrs) == {} and gaps == []


def test_an_infinite_linear_animation_with_50_percent_x_and_a_y_move_is_not_a_marquee():
    frames = "@keyframes diag{from{transform:translate(0,0)}to{transform:translate(-50%,-12px)}}"
    attrs, gaps = _block(frames + _track("diag 20s linear infinite"))
    assert _marquee(attrs) == {} and gaps == []


# ---- the "below" value can only ever be a device-tier boundary, enum or no enum ------------------------
# Review suspicion: with no `enum` on the marquee-below attr the value is written unchecked, so an
# out-of-set number (800) could land. It cannot: `below_value` is derived from the device-tier table
# (the widest active tier's upper bound + 1), never from the draft's own breakpoint. A draft breakpoint
# that is not a device-tier boundary is reported as a residual and writes nothing (test above).

@pytest.mark.parametrize("media, expected_below", [
    ("(max-width:767px)", 768), ("(max-width:1023px)", 1024),
    # a draft breakpoint inside the Tablet tier still writes a tier boundary (768: the Mobile tier is fully
    # covered) and reports the partial-tablet remainder as a residual; it never writes 800 or 900.
    ("(max-width:800px)", 768), ("(max-width:900px)", 768), ("(max-width:600px)", None),
])
def test_without_an_enum_the_below_value_is_still_only_ever_a_device_tier_boundary(monkeypatch, media, expected_below):
    real = db_lookup.marquee_attrs_for

    def no_enum(slug):
        roles = real(slug)
        if "marquee-below" in roles:
            roles["marquee-below"] = {**roles["marquee-below"], "enum": None}
        return roles

    monkeypatch.setattr(db_lookup, "marquee_attrs_for", no_enum)
    attrs, _ = _block(DRIFT + "@media %s{.sgs-trust-bar__track{animation:drift 30s linear infinite}}" % media)
    below = _marquee(attrs).get("autoScrollBelow")
    assert below == expected_below and below in (768, 1024, None)
