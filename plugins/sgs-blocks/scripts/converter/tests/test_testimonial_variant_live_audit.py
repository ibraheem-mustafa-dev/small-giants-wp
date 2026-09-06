"""test_testimonial_variant_live_audit.py — live-verify sgs/testimonial's
variant discriminators, all 6 variants (+ minimal-quote default), through the
REAL pipeline (recognise() + build_block_markup()).

Originally written as a Task 2d audit file (task-2-testimonial-brief.md),
which found 3 real content-loss defects (classic-card's ratingStars,
rating-led's ratingScale/sourcePlatform/verified). Task 4
(task-4-testimonial-brief.md, 2026-09-05) fixed the underlying resolver/role
defects and PROMOTED this to a committed regression suite — the classic-card
and rating-led assertions now pin the FIXED behaviour, not the broken one. It
builds a minimal realistic draft HTML fragment per variant (matching the real
render.php DOM shape) and asserts BOTH the variant resolves AND each
discriminator attr lands with the draft's real value.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_testimonial_variant_live_audit.py -q -v
"""
from __future__ import annotations

import json
import re

from bs4 import BeautifulSoup

from converter.recognition import recognise
from converter.services.extraction import build_block_markup


def _node(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


def _root_attrs(markup: str) -> dict:
    """Parse the JSON attrs of the FIRST (root) block comment."""
    root = markup.split("-->", 1)[0]
    m = re.search(r"\{.*\}", root, re.S)
    return json.loads(m.group(0)) if m else {}


def _run(html: str) -> tuple[dict, str]:
    node = _node(html)
    rec = recognise(node)
    markup = build_block_markup(rec, node, media_map={}, css_rules={})
    return _root_attrs(markup), markup


# ---------------------------------------------------------------------------
# 1. avatar-spotlight -> avatarMedia, avatarDecorative
# ---------------------------------------------------------------------------

def test_avatar_spotlight():
    html = (
        '<div class="sgs-testimonial sgs-testimonial--avatar-spotlight">'
        '<blockquote class="sgs-testimonial__quote">Outstanding partner.</blockquote>'
        '<footer class="sgs-testimonial__footer">'
        '<div class="sgs-testimonial__avatar">'
        '<img src="/wp-content/uploads/jane.jpg" alt="Jane Doe">'
        '</div>'
        '<div class="sgs-testimonial__meta">'
        '<cite class="sgs-testimonial__name">Jane Doe</cite>'
        '<span class="sgs-testimonial__role">CEO</span>'
        '</div>'
        '</footer>'
        '</div>'
    )
    attrs, markup = _run(html)
    assert "sgs/testimonial" in markup
    assert attrs.get("variant") == "avatar-spotlight", attrs
    assert isinstance(attrs.get("avatarMedia"), dict), attrs
    assert attrs["avatarMedia"].get("url") == "/wp-content/uploads/jane.jpg", attrs
    # avatarDecorative is boolean-visibility with no derived_selector — it is an
    # OPERATOR TOGGLE, not draft-extractable content. Absence here is expected,
    # not a failure; asserted explicitly so the reasoning is on record.
    assert "avatarDecorative" not in attrs or attrs["avatarDecorative"] is False


# ---------------------------------------------------------------------------
# 2. case-study-media -> workMedia, workMediaDecorative
# ---------------------------------------------------------------------------

def test_case_study_media():
    html = (
        '<div class="sgs-testimonial sgs-testimonial--case-study-media">'
        '<blockquote class="sgs-testimonial__quote">We rebuilt our whole flow.</blockquote>'
        '<figure class="sgs-testimonial__work">'
        '<img src="/wp-content/uploads/case-study.jpg" alt="Before and after">'
        '</figure>'
        '<footer class="sgs-testimonial__footer">'
        '<cite class="sgs-testimonial__name">Sam Rivera</cite>'
        '</footer>'
        '</div>'
    )
    attrs, markup = _run(html)
    assert "sgs/testimonial" in markup
    assert attrs.get("variant") == "case-study-media", attrs
    assert isinstance(attrs.get("workMedia"), dict), attrs
    assert attrs["workMedia"].get("url") == "/wp-content/uploads/case-study.jpg", attrs


# ---------------------------------------------------------------------------
# 3. classic-card -> ratingStars
# ---------------------------------------------------------------------------

def test_classic_card():
    html = (
        '<div class="sgs-testimonial sgs-testimonial--classic-card">'
        '<blockquote class="sgs-testimonial__quote">Five stars, no notes.</blockquote>'
        '<div class="sgs-testimonial__rating sgs-testimonial__stars" role="img" '
        'aria-label="5 out of 5 stars"></div>'
        '<footer class="sgs-testimonial__footer">'
        '<cite class="sgs-testimonial__name">Priya Nair</cite>'
        '</footer>'
        '</div>'
    )
    attrs, markup = _run(html)
    assert "sgs/testimonial" in markup
    assert attrs.get("variant") == "classic-card", attrs
    # FIXED 2026-09-05 (Task 4): ratingStars' derived_selector was NULL, so
    # lift_scalar_content's selector-required gate (scalar_content.py:158-160)
    # skipped it unconditionally. derived_selector is now '.sgs-testimonial__stars'
    # (attr-classification-overrides.json), matching render.php:717's real
    # emitted class — the aria-label "5 out of 5 stars" now lifts correctly.
    assert attrs.get("ratingStars") == 5, attrs
    assert attrs.get("showRating") is True, attrs


# ---------------------------------------------------------------------------
# 4. corporate-logo -> orgLogo, orgLogoDecorative
# ---------------------------------------------------------------------------

def test_corporate_logo():
    html = (
        '<div class="sgs-testimonial sgs-testimonial--corporate-logo">'
        '<blockquote class="sgs-testimonial__quote">A trusted supplier.</blockquote>'
        '<footer class="sgs-testimonial__footer">'
        '<div class="sgs-testimonial__logo">'
        '<img src="/wp-content/uploads/acme-logo.png" alt="Acme Corp">'
        '</div>'
        '<cite class="sgs-testimonial__name">Procurement Lead</cite>'
        '<span class="sgs-testimonial__org">Acme Corp</span>'
        '</footer>'
        '</div>'
    )
    attrs, markup = _run(html)
    assert "sgs/testimonial" in markup
    assert attrs.get("variant") == "corporate-logo", attrs
    assert isinstance(attrs.get("orgLogo"), dict), attrs
    assert attrs["orgLogo"].get("url") == "/wp-content/uploads/acme-logo.png", attrs


# ---------------------------------------------------------------------------
# 5. pull-quote-editorial -> summaryPhrase
# ---------------------------------------------------------------------------

def test_pull_quote_editorial():
    html = (
        '<div class="sgs-testimonial sgs-testimonial--pull-quote-editorial">'
        '<blockquote class="sgs-testimonial__quote">The full long quote text.</blockquote>'
        '<p class="sgs-testimonial__summary">A total transformation.</p>'
        '<footer class="sgs-testimonial__footer">'
        '<cite class="sgs-testimonial__name">Morgan Lee</cite>'
        '</footer>'
        '</div>'
    )
    attrs, markup = _run(html)
    assert "sgs/testimonial" in markup
    assert attrs.get("variant") == "pull-quote-editorial", attrs
    assert attrs.get("summaryPhrase") == "A total transformation.", attrs


# ---------------------------------------------------------------------------
# 6. rating-led -> ratingScale, reviewDate, sourcePlatform, verified
# ---------------------------------------------------------------------------

def test_rating_led():
    html = (
        '<div class="sgs-testimonial sgs-testimonial--rating-led">'
        '<blockquote class="sgs-testimonial__quote">Reliable every time.</blockquote>'
        '<div class="sgs-testimonial__rating sgs-testimonial__rating--scale">'
        '<span class="sgs-testimonial__score">9.2</span>'
        '<span class="sgs-testimonial__score-max"> / 10</span>'
        '</div>'
        '<div class="sgs-testimonial__rating-meta">'
        '<span class="sgs-testimonial__verified">Verified</span>'
        '<span class="sgs-testimonial__source">Trustpilot</span>'
        '<span class="sgs-testimonial__date">14 March 2026</span>'
        '</div>'
        '<footer class="sgs-testimonial__footer">'
        '<cite class="sgs-testimonial__name">Alex Chen</cite>'
        '</footer>'
        '</div>'
    )
    attrs, markup = _run(html)
    assert "sgs/testimonial" in markup
    assert attrs.get("variant") == "rating-led", attrs
    # reviewDate — text-content, derived_selector=.sgs-testimonial__date -> lifts
    # (was already correct before this task).
    assert attrs.get("reviewDate") == "14 March 2026", attrs
    # FIXED 2026-09-05 (Task 4). ratingScale: role corrected select-from-enum ->
    # numeric-content (a continuous 0-100 score, not an enum pick), new role wired
    # into lift_scalar_content's gate, derived_selector narrowed to
    # '.sgs-testimonial__score' (the exact span, not the shared '.sgs-testimonial__rating'
    # ancestor also used by the unrelated star container).
    assert attrs.get("ratingScale") == 9.2, attrs
    assert attrs.get("showRating") is True, attrs
    # ratingType: also fixed alongside ratingScale (not itself one of the
    # original 4 root causes, but required for ratingScale to actually render —
    # render.php gates its numeric-score branch on ratingType === 'scale').
    # role corrected select-from-enum -> css-modifier (reads the BEM --modifier
    # suffix off the SAME matched element).
    assert attrs.get("ratingType") == "scale", attrs
    # sourcePlatform: derived_selector was NULL -> now '.sgs-testimonial__source'.
    assert attrs.get("sourcePlatform") == "Trustpilot", attrs
    # verified: role corrected boolean-visibility -> presence-boolean (a genuine
    # draft-side signal, not an editor-only toggle), AND derived_selector
    # corrected '.sgs-testimonial__text' (nonexistent) -> '.sgs-testimonial__verified'
    # (render.php's real emitted class).
    assert attrs.get("verified") is True, attrs


# ---------------------------------------------------------------------------
# 7. minimal-quote — implicit default, no discriminators (sanity check only)
# ---------------------------------------------------------------------------

def test_minimal_quote_default_no_modifier():
    html = (
        '<div class="sgs-testimonial">'
        '<blockquote class="sgs-testimonial__quote">Just a simple quote.</blockquote>'
        '<footer class="sgs-testimonial__footer">'
        '<cite class="sgs-testimonial__name">No Modifier</cite>'
        '</footer>'
        '</div>'
    )
    attrs, markup = _run(html)
    assert "sgs/testimonial" in markup
    # No discriminating slot fires for any variant (0-0 tie across all), and
    # minimal-quote has no variant_slots row to even enter the score table —
    # detect_variant returns None, so no `variant` key is set at all (render.php
    # falls back to its own 'classic-card' default, NOT 'minimal-quote').
    assert "variant" not in attrs, attrs
