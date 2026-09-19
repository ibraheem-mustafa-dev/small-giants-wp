"""Tests for sync-business-info.py (Spec 33 FR-33-14) and the upload_and_patch.py helpers around it.

Run: cd plugins/sgs-blocks/scripts && python -m pytest tests/test_sync_business_info.py -q

No network. The hyphenated CLI script is loaded with importlib; the logic modules are imported
from the `business_info` package.
"""
from __future__ import annotations

import importlib.util
import inspect
import json
import sys
from pathlib import Path

import pytest

SCRIPTS = Path(__file__).resolve().parents[1]
REPO = SCRIPTS.parents[2]
MAMAS_DRAFT = REPO / "sites" / "mamas-munches" / "mockups" / "homepage" / "index.html"
EYE_DRAFT = (
    REPO / "sites" / "eye-care-ward-end" / "design_handoff_ward_end_eye_care" / "Eye Care Birmingham.dc.html"
)


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


sbi = _load("sync_business_info_under_test", SCRIPTS / "sync-business-info.py")

from business_info import credentials as bi_credentials  # noqa: E402  (the CLI put SCRIPTS on sys.path)
from business_info import extract as bi_extract  # noqa: E402
from business_info import shapes as bi_shapes  # noqa: E402
from business_info import script_source as bi_script_source  # noqa: E402
from business_info import vocabulary as bi_vocabulary  # noqa: E402


def _script(data_object: str) -> str:
    return f'<script type="text/x-dc">const C = {{ {data_object} }};</script>'


# --- regression: static-draft output must not change --------------------------------

# Recorded from the extractor BEFORE the Spec 33 upgrade (2026-09-19), Mama's homepage draft.
MAMAS_EXPECTED = {
    "email": "Zainab@mamasmunches.com",
    "socials.instagram": "https://www.instagram.com/mamasmunches/",
    "copyright": "© 2026 Mama's Munches. Registered Food Business, Birmingham.",
}


@pytest.mark.skipif(not MAMAS_DRAFT.is_file(), reason="Mama's draft absent")
def test_mamas_output_unchanged():
    html = MAMAS_DRAFT.read_text(encoding="utf-8", errors="replace")
    assert sbi.extract_business_info(html) == MAMAS_EXPECTED
    assert sbi.find_unmapped(html) == {}


# --- the real Eye Care draft ---------------------------------------------------------

@pytest.mark.skipif(not EYE_DRAFT.is_file(), reason="Eye Care draft absent")
def test_eye_care_real_draft():
    html = EYE_DRAFT.read_text(encoding="utf-8", errors="replace")
    fields = sbi.extract_business_info(html)
    expected = {
        "phone": "0121 729 8233",
        "email": "hello@eyecarebirmingham.co.uk",
        "address": "644 Washwood Heath Rd, Birmingham B8 2HQ",
        "socials.whatsapp": "https://wa.me/4479605978",
        "socials.instagram": "https://www.instagram.com/eyecare.birmingham/",
        "socials.google": "https://share.google/9YZzTiRj2gvW1Xrpr",
        "copyright": "© 2026 Eye Care Birmingham · GOC-registered · All brand names are trademarks of their owners",
    }
    for day in ("mon", "tue", "wed", "thu", "fri", "sat"):
        expected[f"opening_hours.{day}"] = "9.30–17.30"
    assert fields == expected
    assert "opening_hours.sun" not in fields
    assert "maps_cid" not in fields
    assert sbi.find_unmapped(html) == {
        "mapHref": "https://maps.google.com/?q=644+Washwood+Heath+Rd+Birmingham+B8+2HQ"
    }
    pmap = sbi.build_placeholder_map(html)
    assert pmap["{{ phone }}"] == {"key": "phone", "as": "text"}
    assert pmap["{{ phoneHref }}"] == {"key": "phone", "as": "tel-href"}
    assert pmap["{{ igHref }}"] == {"key": "socials.instagram", "as": "url"}
    assert pmap["{{ gmbHref }}"] == {"key": "socials.google", "as": "url"}
    assert pmap["{{ mapHref }}"] == {"key": None, "as": "url"}


# --- shape validators (synthetic) ----------------------------------------------------

def test_non_email_after_email_label_is_rejected():
    html = '<div><div style="x">Email</div>call us any time</div>'
    assert "email" not in sbi.extract_business_info(html)


def test_email_label_accepts_email_shape():
    html = '<div><div>Email</div>hi@example.co.uk</div>'
    assert sbi.extract_business_info(html)["email"] == "hi@example.co.uk"


def test_social_on_unknown_host_is_rejected():
    html = _script("igHref:'https://evil.example/eyecare'")
    assert "socials.instagram" not in sbi.extract_business_info(html)


def test_social_on_the_wrong_network_is_rejected():
    html = _script("igHref:'https://www.facebook.com/somebody'")
    assert "socials.instagram" not in sbi.extract_business_info(html)


def test_social_host_match_is_not_a_substring_match():
    # "x.com" is a substring of "netflix.com"; the data-object path must not treat it as twitter.
    html = _script("twitterHref:'https://netflix.com/title'")
    assert "socials.twitter" not in sbi.extract_business_info(html)


def test_social_requires_https():
    html = _script("fbHref:'http://www.facebook.com/page'")
    assert "socials.facebook" not in sbi.extract_business_info(html)


def test_google_review_hosts_map_to_socials_google():
    for url in ("https://share.google/abc", "https://g.page/r/xyz", "https://goo.gl/maps/q"):
        assert sbi.extract_business_info(_script(f"reviewsUrl:'{url}'"))["socials.google"] == url


def test_address_needs_postcode_or_three_words():
    assert "address" not in sbi.extract_business_info(_script("address:'Ask us'"))
    assert sbi.extract_business_info(_script("address:'B8 2HQ'"))["address"] == "B8 2HQ"
    assert sbi.extract_business_info(_script("address:'1 High Street Leeds'"))["address"] == "1 High Street Leeds"
    assert "address" not in sbi.extract_business_info(_script("address:'write to me@example.com today'"))


def test_phone_shape_and_binding_placeholders_rejected():
    assert "phone" not in sbi.extract_business_info(_script("phone:'call us'"))
    assert "phone" not in sbi.extract_business_info('<div><div>Phone</div><a href="{{ phoneHref }}">{{ phone }}</a></div>')
    assert sbi.extract_business_info(_script("phone:'+44 121 729 8233'"))["phone"] == "+44 121 729 8233"


def test_phone_from_href_only_strips_the_scheme():
    assert sbi.extract_business_info(_script("phoneHref:'tel:01217298233'"))["phone"] == "01217298233"


def test_hours_expand_a_day_range_and_ignore_trailing_prose():
    html = '<div><div>Hours</div>Mon–Sat 9.30–17.30<br>Collections by arrangement</div>'
    fields = sbi.extract_business_info(html)
    assert {k: v for k, v in fields.items() if k.startswith("opening_hours.")} == {
        f"opening_hours.{d}": "9.30–17.30" for d in ("mon", "tue", "wed", "thu", "fri", "sat")
    }


def test_hours_single_day_and_meridiem_and_non_hours_text():
    assert sbi.extract_business_info(_script("hours:'Sun 10am-4pm'")) == {"opening_hours.sun": "10am-4pm"}
    assert not [k for k in sbi.extract_business_info('<div><div>Hours</div>Ask in store</div>') if k.startswith("opening")]


def test_clinic_label_joins_lines_into_an_address():
    html = '<div><div>Clinic</div>644 Washwood Heath Rd<br>Birmingham B8 2HQ</div>'
    assert sbi.extract_business_info(html)["address"] == "644 Washwood Heath Rd, Birmingham B8 2HQ"


def test_label_must_be_exact_and_short():
    assert "email" not in sbi.extract_business_info('<div><div>Email us for anything at all</div>hi@example.com</div>')


def test_map_link_is_unmapped_never_invented():
    html = _script("mapHref:'https://maps.google.com/?q=1+High+St'")
    assert sbi.extract_business_info(html) == {}
    assert sbi.find_unmapped(html) == {"mapHref": "https://maps.google.com/?q=1+High+St"}


# --- precedence ----------------------------------------------------------------------

def test_precedence_script_over_label_over_literal():
    literal = '<a href="tel:01111111111">call</a>'
    label = '<div><div>Phone</div>0222 222 2222</div>'
    script = _script("phone:'0333 333 3333'")
    assert sbi.extract_business_info(literal)["phone"] == "01111111111"
    assert sbi.extract_business_info(literal + label)["phone"] == "0222 222 2222"
    assert sbi.extract_business_info(literal + label + script)["phone"] == "0333 333 3333"


def test_display_key_beats_link_key_within_the_script():
    html = _script("phoneHref:'tel:01217298233', phone:'0121 729 8233'")
    assert sbi.extract_business_info(html)["phone"] == "0121 729 8233"


def test_one_value_per_key_first_valid_wins():
    html = _script("igHref:'https://instagram.com/a', instagram:'https://instagram.com/b'")
    # the unsuffixed key ranks first, and only one value is ever written
    assert sbi.extract_business_info(html)["socials.instagram"] == "https://instagram.com/b"


def test_escaped_quote_in_a_script_value():
    assert sbi.extract_business_info(_script(r"address:'Nan\'s Kitchen, 5 Lane, Leeds'"))["address"] == (
        "Nan's Kitchen, 5 Lane, Leeds"
    )


# --- placeholder map -----------------------------------------------------------------

def test_placeholder_map_only_lists_resolved_bindings():
    html = (
        '<a href="{{ phoneHref }}">{{ phone }}</a> {{ a.phone }} {{ title }} {{ igHref }} {{ waHref }} {{ mapHref }}'
        + _script("phone:'0121 729 8233', phoneHref:'tel:01217298233', igHref:'https://instagram.com/x', "
                  "mapHref:'https://maps.google.com/?q=x', title:'Hello there'")
    )
    pmap = sbi.build_placeholder_map(html)
    assert pmap == {
        "{{ phone }}": {"key": "phone", "as": "text"},
        "{{ a.phone }}": {"key": "phone", "as": "text"},
        "{{ phoneHref }}": {"key": "phone", "as": "tel-href"},
        "{{ igHref }}": {"key": "socials.instagram", "as": "url"},
        "{{ mapHref }}": {"key": None, "as": "url"},
    }
    assert sbi.build_placeholder_map(html) == pmap


def test_placeholder_map_skips_a_key_whose_value_fails_its_shape():
    html = "{{ address }}" + _script("address:'Ask us'")
    assert sbi.build_placeholder_map(html) == {}


def test_map_out_flag_writes_sorted_json(tmp_path, monkeypatch, capsys):
    draft = tmp_path / "d.html"
    draft.write_text("{{ phone }}{{ email }}" + _script("phone:'0121 729 8233', email:'a@b.co'"), encoding="utf-8")
    out = tmp_path / "sub" / "map.json"
    monkeypatch.setattr(sys, "argv", ["sync-business-info.py", "--draft", str(draft), "--map-out", str(out)])
    assert sbi.main() == 0
    text = out.read_text(encoding="utf-8")
    assert text.endswith("\n")
    assert json.loads(text) == {
        "{{ email }}": {"as": "text", "key": "email"},
        "{{ phone }}": {"as": "text", "key": "phone"},
    }
    assert text.index('"{{ email }}"') < text.index('"{{ phone }}"')


# --- credentials (temporary secrets directory) ---------------------------------------

def _secrets(tmp_path: Path, monkeypatch) -> None:
    (tmp_path / "alpha.env").write_text(
        "WP_URL_ALPHA='https://alpha.example.test'\nWP_USER_ALPHA=\"alice\"\nWP_APP_PWD_ALPHA='aaaa bbbb cccc'\n",
        encoding="utf-8",
    )
    (tmp_path / "beta.env").write_text(
        "# comment\nWP_URL_BETA=https://beta.example.test/\nWP_USER_BETA=bob\nWP_APP_PWD_BETA=zzzz\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(bi_credentials, "secrets_dir", lambda: tmp_path)


def test_credentials_found_by_url_host(tmp_path, monkeypatch):
    _secrets(tmp_path, monkeypatch)
    assert sbi.resolve_credentials("alpha.example.test", None, None) == ("alice", "aaaabbbbcccc")
    assert sbi.resolve_credentials("https://beta.example.test", None, None) == ("bob", "zzzz")
    assert sbi.resolve_credentials("ALPHA.example.test", None, None) == ("alice", "aaaabbbbcccc")


def test_credentials_unknown_host_falls_back_to_flags_then_env(tmp_path, monkeypatch):
    _secrets(tmp_path, monkeypatch)
    monkeypatch.delenv("SGS_WP_APP_USER", raising=False)
    monkeypatch.delenv("SGS_WP_APP_PWD", raising=False)
    assert sbi.resolve_credentials("nobody.example.test", None, None) is None
    assert sbi.resolve_credentials("nobody.example.test", "u", "p q") == ("u", "pq")
    monkeypatch.setenv("SGS_WP_APP_USER", "envu")
    monkeypatch.setenv("SGS_WP_APP_PWD", "e n v")
    assert sbi.resolve_credentials("nobody.example.test", None, None) == ("envu", "env")


def test_credentials_domain_must_match_exactly_not_by_substring(tmp_path, monkeypatch):
    _secrets(tmp_path, monkeypatch)
    monkeypatch.delenv("SGS_WP_APP_USER", raising=False)
    monkeypatch.delenv("SGS_WP_APP_PWD", raising=False)
    assert sbi.resolve_credentials("alpha.example.test.evil.example", None, None) is None
    assert sbi.resolve_credentials("", None, None) is None


# --- universality --------------------------------------------------------------------

def test_vocabulary_is_module_level_data_and_code_carries_no_client_literals():
    assert isinstance(bi_vocabulary.VOCABULARY, dict) and isinstance(bi_vocabulary.LABELS, dict)
    assert bi_vocabulary.VOCABULARY["ig"][0] == "socials.instagram" and bi_vocabulary.VOCABULARY["map"][0] is None
    assert bi_vocabulary.LABELS["opening hours"][0] == "opening_hours"
    code = "".join(
        inspect.getsource(fn)
        for fn in (
            bi_extract.extract_business_info, bi_script_source.from_script, bi_extract._from_labels,
            bi_shapes.resolve, sbi.build_placeholder_map, sbi.find_unmapped,
            bi_credentials.resolve_credentials, bi_credentials._credentials_from_secrets,
        )
    ).lower()
    for literal in ("eyecare", "eye care", "mama", "sandybrown", "birmingham"):
        assert literal not in code


# --- upload_and_patch.py helpers -----------------------------------------------------

def _load_upload():
    try:
        return _load("upload_and_patch_under_test", SCRIPTS / "orchestrator" / "upload_and_patch.py")
    except (KeyError, OSError) as exc:  # the module reads .claude/secrets/<site>.env on import
        pytest.skip(f"deploy secrets not available: {exc!r}")


def test_default_snapshot_domain_follows_the_deploy_site():
    up = _load_upload()
    assert up.default_snapshot_domain(None, "https://ignored.example") == up.CANARY_DOMAIN
    assert up.default_snapshot_domain("", "https://ignored.example") == up.CANARY_DOMAIN
    assert up.default_snapshot_domain("eye-care-test", "https://darkcyan.example.test") == "darkcyan.example.test"
    assert up.default_snapshot_domain("x", "darkcyan.example.test") == "darkcyan.example.test"


def test_find_draft_order(tmp_path):
    up = _load_upload()
    explicit = tmp_path / "draft.dc.html"
    explicit.write_text("<html></html>", encoding="utf-8")
    assert up.find_draft("no-such-client-slug", explicit) == explicit
    assert up.find_draft("no-such-client-slug", tmp_path / "missing.html") is None
    assert up.find_draft("no-such-client-slug", None) is None
    if MAMAS_DRAFT.is_file():
        assert up.find_draft("mamas-munches", None) is not None
        assert up.find_draft("mamas-munches", explicit) == explicit


# --- structure: no module in the package grows past the file-length rule -------------

MAX_MODULE_LINES = 300


def test_every_business_info_module_is_at_most_300_lines():
    modules = sorted((SCRIPTS / "business_info").glob("*.py"))
    assert len(modules) >= 7  # __init__, vocabulary, shapes, script_source, extract, placeholder_map, credentials, push
    too_long = {m.name: n for m in modules if (n := len(m.read_text(encoding="utf-8").splitlines())) > MAX_MODULE_LINES}
    assert too_long == {}
    assert len((SCRIPTS / "sync-business-info.py").read_text(encoding="utf-8").splitlines()) <= MAX_MODULE_LINES


def test_repo_root_resolves_to_the_repository():
    assert bi_credentials.repo_root() == REPO
    assert sbi.repo_root() == REPO


# =====================================================================================
# Review fixes (F2): credentials resilience, placeholder / shape guards, label context,
# and the mutation guards that keep those defences from being quietly removed.
# =====================================================================================

from business_info import push as bi_push  # noqa: E402

INDUS_FORM = REPO / "sites" / "indus-foods" / "mockups" / "Indus-Foods-Trade-Application-V2.html"


# --- 4. one bad secrets file must not break resolution for every target --------------

def test_a_bad_secrets_file_is_skipped_and_a_later_good_one_still_resolves(tmp_path, monkeypatch, capsys):
    (tmp_path / "a-binary.env").write_bytes(b"WP_URL_A=https://a.example.test\n\xff\xfe\x80\x81garbage\n")
    (tmp_path / "b-bad-url.env").write_text("WP_URL_B=https://[::1\nWP_USER_B=leaky-user\nWP_APP_PWD_B=leaky-secret\n",
                                            encoding="utf-8")
    (tmp_path / "c-unreadable.env").write_text("WP_URL_C=https://c.example.test\n", encoding="utf-8")
    (tmp_path / "z-good.env").write_text(
        "WP_URL_GOOD=https://good.example.test\nWP_USER_GOOD=gina\nWP_APP_PWD_GOOD=p1 p2\n", encoding="utf-8")
    monkeypatch.setattr(bi_credentials, "secrets_dir", lambda: tmp_path)
    real_loader = bi_credentials._load_env_file

    def loader(path):
        if path.name == "c-unreadable.env":
            raise PermissionError("denied")
        return real_loader(path)

    monkeypatch.setattr(bi_credentials, "_load_env_file", loader)
    assert sbi.resolve_credentials("good.example.test", None, None) == ("gina", "p1p2")
    err = capsys.readouterr().err
    assert "leaky-secret" not in err and "leaky-user" not in err  # file contents never reach a message


def test_bad_secrets_files_still_fall_through_to_flags_and_environment(tmp_path, monkeypatch):
    (tmp_path / "bad.env").write_bytes(b"\xff\xfe\x80")
    (tmp_path / "bad2.env").write_text("WP_URL_X=https://[::1\n", encoding="utf-8")
    monkeypatch.setattr(bi_credentials, "secrets_dir", lambda: tmp_path)
    monkeypatch.delenv("SGS_WP_APP_USER", raising=False)
    monkeypatch.delenv("SGS_WP_APP_PWD", raising=False)
    assert sbi.resolve_credentials("nobody.example.test", None, None) is None
    assert sbi.resolve_credentials("nobody.example.test", "u", "p q") == ("u", "pq")
    monkeypatch.setenv("SGS_WP_APP_USER", "envu")
    monkeypatch.setenv("SGS_WP_APP_PWD", "e n v")
    assert sbi.resolve_credentials("nobody.example.test", None, None) == ("envu", "env")


# --- 5. placeholder and shape guards --------------------------------------------------

@pytest.mark.parametrize("shape,key,raw", [
    ("phone", "phone", "{{ phone }}"),
    ("phone", "phone", "0121 729 8233 }}"),
    ("email", "email", "{{ email }}@example.test"),
    ("address", "address", "12 High Street {{ town }} LS1 4AB"),
    ("address", "address", "12 High Street }} Leeds LS1 4AB"),
    ("social", "socials.instagram", "https://www.instagram.com/{{ handle }}"),
])
def test_a_template_binding_is_never_a_stored_value(shape, key, raw):
    assert bi_shapes.resolve(shape, key, raw) == {}


def test_literal_copyright_with_a_binding_is_not_stored():
    assert "copyright" not in bi_extract.extract_literal("<p>&copy; {{ year }} Some Business Ltd</p>")
    assert bi_extract.extract_literal("<p>&copy; 2026 Some Business Ltd</p>")["copyright"] == "© 2026 Some Business Ltd"


def test_literal_social_urls_require_an_http_or_https_scheme():
    for href in ("javascript://facebook.com/%0Aalert(1)", "//facebook.com/x", "www.facebook.com/x",
                 "data://instagram.com/x", "ftp://facebook.com/x"):
        assert bi_extract.extract_literal(f'<a href="{href}">x</a>') == {}, href
    assert bi_extract.extract_literal('<a href="http://facebook.com/x">x</a>')["socials.facebook"] == "http://facebook.com/x"
    assert bi_extract.extract_literal('<a href="https://facebook.com/x">x</a>')["socials.facebook"] == "https://facebook.com/x"


def test_script_address_html_is_reduced_to_plain_text_with_breaks_as_commas():
    got = bi_extract.extract_business_info(
        _script("address: '<b>12 High Street</b><br>Leeds<br/>LS1 4AB', email: 'hi@example.test'"))
    assert got["address"] == "12 High Street, Leeds, LS1 4AB"
    assert bi_shapes.resolve("address", "address", "<p>1 Mill Lane</p>\nBath &amp; North<br />BA1 1AA") == {
        "address": "1 Mill Lane, Bath & North, BA1 1AA"}
    got = bi_extract.extract_business_info(_script("address: '<span>1 Mill Lane, Bath BA1 1AA</span>'"))
    assert got["address"] == "1 Mill Lane, Bath BA1 1AA"


# --- 6. label context -----------------------------------------------------------------

REVIEW_SUMMARY = """
<div class="wizard-step" id="step-9">
  <div class="review-block">
    <div class="review-row"><span class="review-label">Email</span><span class="review-value">sample.person@example.test</span></div>
    <div class="review-row"><span class="review-label">Phone</span><span class="review-value">07700 900 000</span></div>
  </div>
</div>
"""
CONTACT_LIST = """
<section class="contact">
  <div><strong>Email</strong><span>hello@example.test</span></div>
  <div><strong>Phone</strong><span>0121 000 0000</span></div>
</section>
"""


def test_positive_control_a_plain_contact_list_still_yields_its_labelled_values():
    assert bi_extract._from_labels(CONTACT_LIST) == {"email": "hello@example.test", "phone": "0121 000 0000"}


def test_a_form_review_summary_is_not_a_source_of_business_details():
    assert bi_extract._from_labels(REVIEW_SUMMARY) == {}


def test_the_review_fixture_does_yield_values_when_the_context_check_is_disabled(monkeypatch):
    """Negative control: proves the fixture reproduces the false positive, so the test above is not vacuous."""
    monkeypatch.setattr(bi_extract, "label_is_usable", lambda tag: True)
    assert bi_extract._from_labels(REVIEW_SUMMARY) == {"email": "sample.person@example.test", "phone": "07700 900 000"}


@pytest.mark.parametrize("wrapper", [
    '<form class="x">{inner}</form>',
    '<dialog open>{inner}</dialog>',
    '<details><summary>More</summary>{inner}</details>',
    '<div aria-modal="true">{inner}</div>',
    '<div role="dialog">{inner}</div>',
    '<div class="signup-form">{inner}</div>',
])
def test_labels_inside_a_form_dialog_details_or_modal_are_ignored(wrapper):
    assert bi_extract._from_labels(wrapper.format(inner=CONTACT_LIST)) == {}


def test_a_label_whose_value_is_a_form_control_or_holds_one_is_ignored():
    assert bi_extract._from_labels('<div><span>Email</span><input type="text" value="a@b.example"></div>') == {}
    assert bi_extract._from_labels('<div><span>Phone</span><span><input value="0121 000 0000"></span></div>') == {}
    assert bi_extract._from_labels('<div><label>Email <input value="a@b.example"></label></div>') == {}
    assert bi_extract._from_labels('<div><span>Address</span><textarea>1 Mill Lane Bath BA1 1AA</textarea></div>') == {}


def test_information_is_not_mistaken_for_the_word_form():
    assert bi_extract._from_labels('<div class="information-panel">' + CONTACT_LIST + "</div>")


def test_the_real_indus_application_form_no_longer_yields_the_sample_applicants_details():
    if not INDUS_FORM.is_file():
        pytest.skip("Indus application mockup not present")
    fields = bi_extract.extract_business_info(INDUS_FORM.read_text(encoding="utf-8", errors="replace"))
    assert "email" not in fields and "phone" not in fields


# --- 7. mutation guards ---------------------------------------------------------------

def test_label_max_chars_is_enforced_on_the_whole_element():
    """A wrapper whose own text is 'Email' but which holds a long value in a child is not a label."""
    long_child = "x" * 40 + "@example.test"
    html = f'<div><p>Email<span>{long_child}</span></p><p>hello@example.test</p></div>'
    assert len(f"Email {long_child}") > bi_vocabulary.LABEL_MAX_CHARS
    assert bi_extract._from_labels(html) == {}
    assert bi_extract._from_labels("<div><p>Email</p><p>hello@example.test</p></div>") == {"email": "hello@example.test"}


class _Capture:
    def __init__(self):
        self.bodies: list[dict] = []

    def __call__(self, req, timeout=None):
        self.bodies.append(json.loads(req.data.decode("utf-8")))

        class _Resp:
            def __enter__(self_inner):
                return self_inner

            def __exit__(self_inner, *a):
                return False

            def read(self_inner):
                return b'{"overwrite": false, "result": {}}'
        return _Resp()


def test_the_pipeline_push_path_never_sends_overwrite_true(tmp_path, monkeypatch):
    draft = tmp_path / "d.html"
    draft.write_text("<p><a href='mailto:hello@example.test'>x</a></p>", encoding="utf-8")
    cap = _Capture()
    monkeypatch.setattr(bi_push.urllib.request, "urlopen", cap)
    monkeypatch.setattr(sbi, "resolve_credentials", lambda *a, **k: ("u", "p"))
    # exactly the arguments upload_and_patch.py builds: --push, never --overwrite
    monkeypatch.setattr(sys, "argv", ["sync-business-info.py", "--draft", str(draft),
                                      "--target-domain", "x.example.test", "--push"])
    assert sbi.main() == 0
    assert [b["overwrite"] for b in cap.bodies] == [False]
    assert cap.bodies[0]["fields"] == {"email": "hello@example.test"}


def test_push_sends_overwrite_only_when_asked(monkeypatch):
    cap = _Capture()
    monkeypatch.setattr(bi_push.urllib.request, "urlopen", cap)
    bi_push.push("x.example.test", {"email": "a@b.example"}, False, ("u", "p"))
    bi_push.push("x.example.test", {"email": "a@b.example"}, True, ("u", "p"))
    assert [b["overwrite"] for b in cap.bodies] == [False, True]


def test_upload_and_patch_never_builds_the_overwrite_flag():
    src = (SCRIPTS / "orchestrator" / "upload_and_patch.py").read_text(encoding="utf-8")
    code = "\n".join(line.split("#", 1)[0] for line in src.splitlines())
    assert "--overwrite" not in code
