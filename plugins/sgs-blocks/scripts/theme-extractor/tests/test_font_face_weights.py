"""A self-hosted VARIABLE Google font must be emitted with a weight RANGE, never one weight.

Proven live on the Eye Care test site: Outfit and Playfair Display were self-hosted from their
variable files but written with ``fontWeight`` "300" / "400", so the browser synthesised bold for
every heavier weight. These tests replace ``urllib.request.urlopen`` (no real request is ever made;
an unexpected URL raises) and pass a ``tmp_path`` repo root (nothing is written into the real
``theme/sgs-theme/assets/fonts/``).

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_font_face_weights.py -q
"""
from __future__ import annotations

import copy
import json
import pathlib
import sys
import urllib.error

import pytest

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
REPO = PKG.parent.parents[2]
sys.path.insert(0, str(PKG))

import extract  # noqa: E402
import font_weights  # noqa: E402
import presets  # noqa: E402

REAL_FONTS = REPO / "theme" / "sgs-theme" / "assets" / "fonts"
AXIS_OUTFIT = "https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap"
GENERIC_OUTFIT = ("https://fonts.googleapis.com/css2?family=Outfit"
                  ":wght@300;400;500;600;700;800;900&display=swap")
OUTFIT_LINK = ("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700"
               "&family=Outfit:wght@300;400;500;600&display=swap")
LATIN_URL = "https://fonts.gstatic.com/s/outfit/v15/latin.woff2"
LATIN_EXT_URL = "https://fonts.gstatic.com/s/outfit/v15/latinext.woff2"


def face(family: str, weight: str, url: str, subset: str = "latin") -> str:
    return (f"/* {subset} */\n@font-face {{\n  font-family: '{family}';\n  font-style: normal;\n"
            f"  font-weight: {weight};\n  font-display: swap;\n  src: url({url}) format('woff2');\n"
            "  unicode-range: U+0000-00FF;\n}\n")


class Net:
    """A fake network: ``routes`` maps URL -> text/bytes (or an exception to raise). Any URL not in
    ``routes`` fails the test loudly, so a stray real request cannot pass unnoticed."""

    def __init__(self, routes: dict):
        self.routes = routes
        self.requested: list[str] = []

    def urlopen(self, req, timeout=None):
        url = req.full_url if hasattr(req, "full_url") else str(req)
        self.requested.append(url)
        if url not in self.routes:
            raise AssertionError(f"unexpected network request: {url}")
        body = self.routes[url]
        if isinstance(body, Exception):
            raise body
        data = body.encode("utf-8") if isinstance(body, str) else body
        return _Resp(data)


class _Resp:
    def __init__(self, data: bytes):
        self._data = data

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def read(self):
        return self._data


def bad_request(url: str) -> urllib.error.HTTPError:
    return urllib.error.HTTPError(url, 400, "Bad Request", None, None)  # type: ignore[arg-type]


@pytest.fixture
def real_fonts_snapshot():
    """The real fonts folder's (path, size, mtime) list — must be identical after every test."""
    def snap():
        return sorted((str(p), p.stat().st_size, p.stat().st_mtime_ns)
                      for p in REAL_FONTS.rglob("*") if p.is_file())
    before = snap()
    yield
    assert snap() == before, "a test wrote into the real theme/sgs-theme/assets/fonts/"


def host(monkeypatch, routes: dict) -> Net:
    net = Net(routes)
    monkeypatch.setattr(extract.urllib.request, "urlopen", net.urlopen)
    return net


def run(family, links, tmp_path, facts=None):
    trace: list = []
    faces = extract._self_host_google_font(family, links, tmp_path, trace, facts=facts)
    return faces, trace


# ── evidence 1: the range Google's own response declares ───────────────────────────────────────
def test_axis_range_from_google_css(monkeypatch, tmp_path, real_fonts_snapshot):
    net = host(monkeypatch, {
        GENERIC_OUTFIT: face("Outfit", "300", LATIN_URL),      # discrete request: one weight per block
        AXIS_OUTFIT: face("Outfit", "400 900", LATIN_URL),     # variable axis: a range
        LATIN_URL: b"woff2-bytes",
    })
    faces, trace = run("Outfit", [], tmp_path)
    assert faces[0]["fontWeight"] == "400 900"
    assert AXIS_OUTFIT in net.requested
    assert "weight_source" not in trace[-1]
    # nothing outside the temp repo, and the file landed where the src says
    assert (tmp_path / "theme/sgs-theme/assets/fonts/outfit/outfit-variable-latin.woff2").read_bytes() \
        == b"woff2-bytes"
    assert faces[0]["src"] == ["file:./assets/fonts/outfit/outfit-variable-latin.woff2"]


# ── evidence 2: the weights the draft's font link requests ─────────────────────────────────────
@pytest.mark.parametrize("link", [
    OUTFIT_LINK,                                                                   # 300;400;500;600
    "https://fonts.googleapis.com/css2?family=Outfit:wght@300..600&display=swap",  # a range
])
def test_range_from_draft_link_when_google_gives_one_weight(monkeypatch, tmp_path, link,
                                                             real_fonts_snapshot):
    host(monkeypatch, {
        link: face("Outfit", "300", LATIN_URL),
        AXIS_OUTFIT: face("Outfit", "300", LATIN_URL),   # variable answer that still names one weight
        LATIN_URL: b"x",
    })
    faces, trace = run("Outfit", [link], tmp_path, facts={"body": {"fontFamily": "Outfit", "fontWeight": "900"}})
    assert faces[0]["fontWeight"] == "300 600"   # the link wins over the measured 900
    assert trace[-1]["weight_source"] == "draft-link"


def test_multi_word_family_in_the_draft_link_is_found(monkeypatch, tmp_path, real_fonts_snapshot):
    """``Playfair+Display`` in a link never matched the old ``family=Playfair Display`` regex, so the
    draft's own weights were ignored and a generic request was sent instead."""
    axis = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@100..900&display=swap"
    net = host(monkeypatch, {
        OUTFIT_LINK: face("Playfair Display", "500", "https://fonts.gstatic.com/s/p/latin.woff2"),
        axis: face("Playfair Display", "500", "https://fonts.gstatic.com/s/p/latin.woff2"),
        "https://fonts.gstatic.com/s/p/latin.woff2": b"p",
    })
    faces, _ = run("Playfair Display", [OUTFIT_LINK], tmp_path)
    assert net.requested[0] == OUTFIT_LINK
    assert faces[0]["fontWeight"] == "500 700"


# ── evidence 3: the weights measured on the rendered draft ─────────────────────────────────────
def test_range_from_measured_weights_when_link_has_no_evidence(monkeypatch, tmp_path,
                                                                real_fonts_snapshot):
    host(monkeypatch, {
        GENERIC_OUTFIT: face("Outfit", "300", LATIN_URL),
        AXIS_OUTFIT: face("Outfit", "300", LATIN_URL),
        LATIN_URL: b"x",
    })
    facts = {
        "body": {"fontFamily": "Outfit, system-ui, sans-serif", "fontWeight": "400"},
        "headings": {"h1": {"fontFamily": "\"Playfair Display\", serif", "fontWeight": "900"}},
        "buttons": [{"rest": {"fontFamily": "Outfit", "fontWeight": "700"},
                     "hover": {"fontFamily": "Outfit", "fontWeight": "bold"}}],
    }
    faces, trace = run("Outfit", [], tmp_path, facts=facts)
    assert faces[0]["fontWeight"] == "400 700"      # the other family's 900 is not counted
    assert trace[-1]["weight_source"] == "measured"


def test_variable_font_with_no_second_weight_keeps_the_single_weight(monkeypatch, tmp_path,
                                                                     real_fonts_snapshot):
    host(monkeypatch, {
        GENERIC_OUTFIT: face("Outfit", "300", LATIN_URL),
        AXIS_OUTFIT: face("Outfit", "300", LATIN_URL),
        LATIN_URL: b"x",
    })
    faces, _ = run("Outfit", [], tmp_path, facts={"body": {"fontFamily": "Outfit", "fontWeight": "400"}})
    assert faces[0]["fontWeight"] == "300"


# ── a static face keeps exactly the single weight it had ───────────────────────────────────────
PF = "Playfair Display"
PF_FILE = "https://fonts.gstatic.com/s/p/latin.woff2"


def pf_axis(extent: str) -> str:
    return f"https://fonts.googleapis.com/css2?family=Playfair+Display:wght@{extent}&display=swap"


def test_static_face_keeps_a_single_weight(monkeypatch, tmp_path, real_fonts_snapshot):
    """Static only when EVERY extent is refused: 100..900, 400..900 and 300..700 (the link names
    another family, so there is no link extent)."""
    def axis(extent):
        return f"https://fonts.googleapis.com/css2?family=DM+Serif+Display:wght@{extent}&display=swap"
    generic = ("https://fonts.googleapis.com/css2?family=DM+Serif+Display"
               ":wght@300;400;500;600;700;800;900&display=swap")
    net = host(monkeypatch, {
        generic: face("DM Serif Display", "400", "https://fonts.gstatic.com/s/d/latin.woff2"),
        axis("100..900"): bad_request(axis("100..900")),
        axis("400..900"): bad_request(axis("400..900")),
        axis("300..700"): bad_request(axis("300..700")),
        "https://fonts.gstatic.com/s/d/latin.woff2": b"d",
    })
    facts = {"body": {"fontFamily": "DM Serif Display", "fontWeight": "400"},
             "headings": {"h1": {"fontFamily": "DM Serif Display", "fontWeight": "700"}}}
    faces, trace = run("DM Serif Display", [OUTFIT_LINK], tmp_path, facts=facts)
    assert faces[0]["fontWeight"] == "400"
    assert net.requested[1:4] == [axis("100..900"), axis("400..900"), axis("300..700")]
    assert trace[-1]["kind"] == "font-loading"
    assert trace[-1]["weight_source"] == "static"


def test_full_axis_refused_then_the_draft_links_extent_marks_it_variable(monkeypatch, tmp_path,
                                                                        real_fonts_snapshot):
    """Playfair axis is 400..900: 100..900 is HTTP 400, the draft link extent 500..700 is 200."""
    net = host(monkeypatch, {
        OUTFIT_LINK: face(PF, "500", PF_FILE),                      # the draft discrete request
        pf_axis("100..900"): bad_request(pf_axis("100..900")),
        pf_axis("500..700"): face(PF, "500 700", PF_FILE),
        PF_FILE: b"p",
    })
    faces, trace = run(PF, [OUTFIT_LINK], tmp_path)
    assert faces[0]["fontWeight"] == "500 700"
    assert net.requested[:3] == [OUTFIT_LINK, pf_axis("100..900"), pf_axis("500..700")]
    assert "weight_source" not in trace[-1]         # Google's own declared range


def test_retry_extents_run_in_order_after_the_link_extent(monkeypatch, tmp_path, real_fonts_snapshot):
    net = host(monkeypatch, {
        OUTFIT_LINK: face(PF, "500", PF_FILE),
        pf_axis("100..900"): bad_request(pf_axis("100..900")),
        pf_axis("500..700"): bad_request(pf_axis("500..700")),
        pf_axis("400..900"): face(PF, "400 900", PF_FILE),
        PF_FILE: b"p",
    })
    faces, _ = run(PF, [OUTFIT_LINK], tmp_path)
    assert faces[0]["fontWeight"] == "400 900"
    assert net.requested[1:4] == [pf_axis("100..900"), pf_axis("500..700"), pf_axis("400..900")]


def test_last_extent_300_700_is_tried_last(monkeypatch, tmp_path, real_fonts_snapshot):
    net = host(monkeypatch, {
        OUTFIT_LINK: face(PF, "500", PF_FILE),
        pf_axis("100..900"): bad_request(pf_axis("100..900")),
        pf_axis("500..700"): bad_request(pf_axis("500..700")),
        pf_axis("400..900"): bad_request(pf_axis("400..900")),
        pf_axis("300..700"): face(PF, "300 700", PF_FILE),
        PF_FILE: b"p",
    })
    faces, _ = run(PF, [OUTFIT_LINK], tmp_path)
    assert faces[0]["fontWeight"] == "300 700"
    assert net.requested[1:5] == [pf_axis(e) for e in ("100..900", "500..700", "400..900", "300..700")]


def test_retry_answering_one_weight_uses_the_links_min_and_max(monkeypatch, tmp_path,
                                                               real_fonts_snapshot):
    host(monkeypatch, {
        OUTFIT_LINK: face(PF, "500", PF_FILE),
        pf_axis("100..900"): bad_request(pf_axis("100..900")),
        pf_axis("500..700"): face(PF, "500", PF_FILE),               # labels a single weight
        PF_FILE: b"p",
    })
    faces, trace = run(PF, [OUTFIT_LINK], tmp_path)
    assert faces[0]["fontWeight"] == "500 700"
    assert trace[-1]["weight_source"] == "draft-link"


def test_an_unreachable_network_is_not_retried(monkeypatch, tmp_path, real_fonts_snapshot):
    net = host(monkeypatch, {
        OUTFIT_LINK: face(PF, "500", PF_FILE),
        pf_axis("100..900"): urllib.error.URLError("offline"),
        PF_FILE: b"p",
    })
    faces, _ = run(PF, [OUTFIT_LINK], tmp_path)
    assert faces[0]["fontWeight"] == "500"
    assert pf_axis("500..700") not in net.requested


def test_playfair_shape_end_to_end_with_the_file_already_on_disk(monkeypatch, tmp_path,
                                                                 real_fonts_snapshot):
    """The re-extraction case: both woff2 files already exist, so nothing is downloaded, yet the
    weights must still be decided (Playfair via the retry, Outfit via the full axis)."""
    baseline = json.loads((REPO / "theme/sgs-theme/theme.json").read_text(encoding="utf-8"))
    facts = json.loads((HERE / "fixtures/eye-care-computed-facts.json").read_text(encoding="utf-8"))
    for slug, name in (("outfit", "outfit-variable-latin.woff2"),
                       ("playfair-display", "playfair-display-variable-latin.woff2")):
        d = tmp_path / "theme/sgs-theme/assets/fonts" / slug
        d.mkdir(parents=True)
        (d / name).write_bytes(b"existing")
    net = host(monkeypatch, {
        OUTFIT_LINK: (face(PF, "500", PF_FILE) + face("Outfit", "300", LATIN_URL)),
        pf_axis("100..900"): bad_request(pf_axis("100..900")),
        pf_axis("500..700"): face(PF, "500 700", PF_FILE),
        AXIS_OUTFIT: face("Outfit", "100 900", LATIN_URL),
    })
    trace: list = []
    extract._overlay_font_families(baseline, facts, [OUTFIT_LINK], trace, tmp_path)
    by_slug = {f["slug"]: f for f in baseline["settings"]["typography"]["fontFamilies"]}
    assert by_slug["heading"]["fontFace"][0]["fontWeight"] == "500 700"
    assert by_slug["display"]["fontFace"][0]["fontWeight"] == "500 700"
    assert by_slug["body"]["fontFace"][0]["fontWeight"] == "100 900"
    assert PF_FILE not in net.requested and LATIN_URL not in net.requested


# ── the subset bug found beside it: the FIRST block is latin-ext, not latin ────────────────────
def test_the_latin_subset_is_the_one_self_hosted(monkeypatch, tmp_path, real_fonts_snapshot):
    css = (face("Outfit", "100 900", LATIN_EXT_URL, "latin-ext") + face("Outfit", "100 900", LATIN_URL))
    host(monkeypatch, {GENERIC_OUTFIT: css, LATIN_URL: b"LATIN", LATIN_EXT_URL: b"LATIN-EXT"})
    faces, _ = run("Outfit", [], tmp_path)
    assert faces[0]["fontWeight"] == "100 900"
    saved = tmp_path / "theme/sgs-theme/assets/fonts/outfit/outfit-variable-latin.woff2"
    assert saved.read_bytes() == b"LATIN"


# ── security: the host allowlist is untouched ──────────────────────────────────────────────────
def test_a_link_on_another_host_is_never_fetched(monkeypatch, tmp_path, real_fonts_snapshot):
    evil = "https://evil.example/css2?family=Outfit:wght@300..600"
    net = host(monkeypatch, {
        GENERIC_OUTFIT: face("Outfit", "400 900", LATIN_URL), LATIN_URL: b"x",
    })
    faces, _ = run("Outfit", [evil], tmp_path)
    assert evil not in net.requested
    assert faces[0]["fontWeight"] == "400 900"


# ── Mama's stays byte-identical ────────────────────────────────────────────────────────────────
def test_mamas_fraunces_face_equals_the_committed_snapshot(monkeypatch, tmp_path, real_fonts_snapshot):
    """Mama's draft link already asks for a range, so the response is used as it always was and the
    variable-axis probe is never sent. The emitted Fraunces face must equal the committed one."""
    html = (REPO / "sites/mamas-munches/mockups/homepage/index.html").read_text(encoding="utf-8")
    links = presets.font_links(html)
    fraunces_link = next(u for u in links if "Fraunces" in u)
    baseline = json.loads((REPO / "theme/sgs-theme/theme.json").read_text(encoding="utf-8"))
    facts = json.loads((PKG / "mamas-computed-facts.json").read_text(encoding="utf-8"))
    fraunces_url = "https://fonts.gstatic.com/s/fraunces/v1/latin.woff2"
    net = host(monkeypatch, {
        fraunces_link: (face("Fraunces", "300 900", "https://fonts.gstatic.com/s/fraunces/v1/ext.woff2",
                             "latin-ext") + face("Fraunces", "300 900", fraunces_url)),
        fraunces_url: b"fraunces",
    })
    snap_baseline = copy.deepcopy(baseline)
    trace: list = []
    extract._overlay_font_families(snap_baseline, facts, links, trace, tmp_path)

    committed = json.loads((REPO / "sites/mamas-munches/theme-snapshot.json").read_text(encoding="utf-8"))
    committed_by_slug = {f["slug"]: f for f in committed["settings"]["typography"]["fontFamilies"]}
    got_by_slug = {f["slug"]: f for f in snap_baseline["settings"]["typography"]["fontFamilies"]}
    for slug in ("heading", "display"):
        assert got_by_slug[slug]["fontFace"] == committed_by_slug[slug]["fontFace"]
    assert got_by_slug["heading"]["fontFace"][0]["fontWeight"] == "300 900"
    # heading and display each resolve the face (the link twice, the file once); no axis probe, no Inter
    assert set(net.requested) == {fraunces_link, fraunces_url}
    assert all("weight_source" not in t for t in trace)


# ── font_weights units ─────────────────────────────────────────────────────────────────────────
def test_axis_probe_ranges_order_and_dedupe():
    assert font_weights.axis_probe_ranges([OUTFIT_LINK], "Playfair Display") == \
        ["100..900", "500..700", "400..900", "300..700"]
    assert font_weights.axis_probe_ranges([], "Outfit") == ["100..900", "400..900", "300..700"]
    one = ["https://x/css2?family=Outfit:wght@400"]
    assert font_weights.axis_probe_ranges(one, "Outfit") == ["100..900", "400..900", "300..700"]
    same = ["https://x/css2?family=Outfit:wght@400..900"]
    assert font_weights.axis_probe_ranges(same, "Outfit") == ["100..900", "400..900", "300..700"]


def test_variable_axis_url_shape():
    assert font_weights.variable_axis_url("Outfit") == AXIS_OUTFIT
    assert font_weights.variable_axis_url("Playfair Display", "500..700") == pf_axis("500..700")
    assert font_weights.variable_axis_url("Playfair Display") == \
        "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@100..900&display=swap"


def test_requested_weights_reads_every_link_shape():
    links = [OUTFIT_LINK, "https://x/css2?family=Fraunces:opsz,wght@9..144,300..900",
             "https://x/css2?family=Inter:ital,wght@0,400;1,700"]
    assert font_weights.requested_weights(links, "Outfit") == [300, 400, 500, 600]
    assert font_weights.requested_weights(links, "Playfair Display") == [500, 600, 700]
    assert font_weights.requested_weights(links, "Fraunces") == [300, 900]
    assert font_weights.requested_weights(links, "Inter") == [400, 700]


def test_parse_range():
    assert font_weights.parse_range("400 900") == (400, 900)
    assert font_weights.parse_range("400") is None
    assert font_weights.parse_range("500 500") is None
