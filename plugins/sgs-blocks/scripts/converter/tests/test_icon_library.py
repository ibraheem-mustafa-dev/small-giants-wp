"""
test_icon_library.py — SGS icon library: three-state lookup, opt-in proposals,
promote / reject, and the generator that feeds ``sgs_get_lucide_icon()``.

Every test is hermetic: proposals, library, provenance and generator output all
live under ``tmp_path``. Nothing tracked is ever written (the autouse fixture
also points the resolver's default proposals path and library path at tmp).

Negative controls: each behaviour below has a mutation that must make its named
test fail. They are run in-process by the QC runner (see the report), never by
editing tracked files.
"""
from __future__ import annotations

import importlib.util
import json
import os
import shutil
import subprocess
import sys

import pytest
from bs4 import BeautifulSoup

from converter.services import icon_resolver as ir

SCRIPTS = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
GENERATOR = os.environ.get("SGS_TEST_GENERATOR") or os.path.join(SCRIPTS, "generate-icons.js")
NEEDS_NODE = pytest.mark.skipif(
    shutil.which("node") is None or shutil.which("php") is None, reason="node and php required"
)

# Not a Lucide / WordPress icon (asserted below): a framed square with a bar.
PIN_SVG = (
    '<svg viewBox="0 0 24 24" fill="none" stroke="#123456" stroke-width="3" class="x">'
    '<path d="M3 3h18v18H3z"/><path d="M8 12h8"/></svg>'
)
OTHER_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#123456"><path d="M4 20 12 4l8 16z"/></svg>'


def node(markup: str):
    return BeautifulSoup(markup, "html.parser").find("svg")


def promote_module():
    """Load promote-icon.py (hyphenated name); reuse a runner-injected module if present."""
    if "promote_icon" in sys.modules:
        return sys.modules["promote_icon"]
    spec = importlib.util.spec_from_file_location("promote_icon", os.path.join(SCRIPTS, "promote-icon.py"))
    mod = importlib.util.module_from_spec(spec)
    sys.modules["promote_icon"] = mod
    spec.loader.exec_module(mod)
    return mod


def read_rows(path) -> list[dict]:
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as fh:
        return [json.loads(line) for line in fh if line.strip()]


@pytest.fixture(autouse=True)
def isolated(tmp_path, monkeypatch):
    monkeypatch.delenv(ir.PROPOSALS_ENV, raising=False)
    monkeypatch.setattr(ir, "_SGS_JSON", str(tmp_path / "sgs-icons.json"))
    monkeypatch.setattr(ir, "_PROPOSALS_DEFAULT", str(tmp_path / "default-proposals.jsonl"))
    ir._reset_caches()
    yield
    ir._reset_caches()


@pytest.fixture
def log(tmp_path, monkeypatch) -> str:
    path = str(tmp_path / "proposals" / "icon-proposals.jsonl")
    monkeypatch.setenv(ir.PROPOSALS_ENV, path)
    return path


def record(svg: str, run: str, draft: str = "draft-a.html") -> dict:
    return ir.record_icon_proposal(ir.resolve_icon(node(svg)), draft, run)


# ---------------------------------------------------------------------------
# The fixtures really are unknown icons (otherwise every test below is vacuous)
# ---------------------------------------------------------------------------

def test_fixture_icons_are_not_in_the_framework_set():
    for svg in (PIN_SVG, OTHER_SVG):
        res = ir.resolve_icon(node(svg))
        assert res["confidence"] == "none" and res["state"] == "new" and res["fingerprint"]


def test_existing_result_keys_unchanged_and_extra_keys_added():
    res = ir.resolve_icon(node('<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>'))
    assert (res["slug"], res["confidence"], res["raw_svg"]) == ("check", "high", None)
    assert res["state"] == "library" and len(res["fingerprint"]) == 40
    assert ir.resolve_icon(None) == {
        "slug": None, "confidence": "none", "raw_svg": None, "state": "new", "fingerprint": None,
    }


def test_fingerprint_is_stable_across_whitespace_separators_and_path_order():
    a = '<svg><path d="M3  3h18v18H3z"/><path d="M8 12h8"/></svg>'
    b = '<svg><path d="M8,12 h8"/><path d="M3 3   h18v18 H3z"/></svg>'
    assert ir.fingerprint_of_svg(a) == ir.fingerprint_of_svg(b)
    assert ir._normalise_d("M20 6 9 17l-5-5") == ir._normalise_d("M20,6  9,17 l-5-5") == ir._normalise_d("M 20 6 9 17 l -5-5")


def test_path_command_case_is_significant_absolute_and_relative_never_collide():
    # `l-5-5` (relative lineto) is the Lucide `check`; `L-5-5` (ABSOLUTE lineto) is a different shape and used
    # to resolve to `check` at high confidence and to share its proposal fingerprint (case was lower-cased away).
    rel = '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>'
    absolute = '<svg viewBox="0 0 24 24"><path d="M20 6 9 17L-5-5"/></svg>'
    assert ir._normalise_d("M3 3h18") != ir._normalise_d("M3 3H18") != ir._normalise_d("m3 3h18")
    assert ir.fingerprint_of_svg(rel) != ir.fingerprint_of_svg(absolute)
    ok = ir.resolve_icon(node(rel))
    assert (ok["slug"], ok["confidence"]) == ("check", "high")
    wrong = ir.resolve_icon(node(absolute))
    assert wrong["slug"] is None and wrong["confidence"] == "none" and wrong["raw_svg"]
    assert wrong["fingerprint"] != ok["fingerprint"]


def test_the_own_svg_of_every_library_icon_still_resolves_high_after_the_case_fix():
    # the census the icon-library author ran: every Lucide icon's own SVG must still resolve (the index and the
    # lookup share the one normaliser, so keeping case must not lose a single icon that resolved before).
    lucide = ir.known_icons()["lucide"]
    misses = [n for n, svg in lucide.items()
              if ir._extract_paths_from_svg_str(svg) and ir.resolve_icon(node(svg))["confidence"] != "high"
              and ir._build_index().get(frozenset(ir._normalise_d(p) for p in ir._extract_paths_from_svg_str(svg))) is None]
    assert misses == []


# ---------------------------------------------------------------------------
# Proposals: recording rules
# ---------------------------------------------------------------------------

def test_identical_draft_twice_adds_zero_extra_rows(log):
    assert record(PIN_SVG, "run-1")["action"] == "added"
    assert record(PIN_SVG, "run-1")["action"] == "already-recorded"
    assert record(PIN_SVG, "run-1")["action"] == "already-recorded"
    rows = read_rows(log)
    assert len(rows) == 1
    assert rows[0]["status"] == "pending" and rows[0]["seen_in"] == ["run-1"]
    assert rows[0]["source_draft"] == "draft-a.html" and rows[0]["raw_svg"]


def test_pending_gets_seen_in_appended_not_a_new_row(log):
    record(PIN_SVG, "run-1")
    first = read_rows(log)[0]
    assert record(PIN_SVG, "run-2", "draft-b.html")["action"] == "seen"
    rows = read_rows(log)
    assert len(rows) == 1
    assert rows[0]["seen_in"] == ["run-1", "run-2"]
    assert rows[0]["first_seen"] == first["first_seen"]
    assert rows[0]["source_draft"] == "draft-a.html"  # first draft is kept
    assert rows[0]["last_seen"] >= first["last_seen"]


def test_seen_in_is_capped(log):
    for i in range(ir.SEEN_IN_CAP + 5):
        record(PIN_SVG, f"run-{i}")
    seen = read_rows(log)[0]["seen_in"]
    assert len(seen) == ir.SEEN_IN_CAP and seen[-1] == f"run-{ir.SEEN_IN_CAP + 4}"


def test_rejected_stays_rejected_and_no_row_is_added(log):
    record(PIN_SVG, "run-1")
    rows = read_rows(log)
    rows[0]["status"] = "rejected"
    with open(log, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(rows[0]) + "\n")
    before = open(log, "rb").read()
    ir._reset_caches()
    res = ir.resolve_icon(node(PIN_SVG))
    assert res["state"] == "rejected" and res["raw_svg"] and res["confidence"] == "none"
    assert record(PIN_SVG, "run-2")["action"] == "rejected"
    assert open(log, "rb").read() == before  # untouched, not even seen_in


def test_pending_state_is_reported_by_the_lookup(log):
    assert ir.resolve_icon(node(PIN_SVG))["state"] == "new"
    record(PIN_SVG, "run-1")
    assert ir.resolve_icon(node(PIN_SVG))["state"] == "pending"


def test_lookup_is_pure_it_never_writes(log, tmp_path):
    ir.resolve_icon(node(PIN_SVG))
    ir.resolve_icon(node(PIN_SVG))
    assert not os.path.exists(log)
    assert not os.path.exists(ir._PROPOSALS_DEFAULT)


def test_unset_env_writes_nothing_anywhere(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    assert record(PIN_SVG, "run-1")["action"] == "disabled"
    assert not os.path.exists(ir._PROPOSALS_DEFAULT)
    assert sorted(os.listdir(tmp_path)) == []  # nothing created in tmp or cwd


def test_blank_env_counts_as_unset(tmp_path, monkeypatch):
    monkeypatch.setenv(ir.PROPOSALS_ENV, "   ")
    assert record(PIN_SVG, "run-1")["action"] == "disabled"
    assert sorted(os.listdir(tmp_path)) == []


def test_svg_without_path_data_is_never_recorded(log):
    res = ir.resolve_icon(node('<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/></svg>'))
    assert res["fingerprint"] is None and res["state"] == "new"
    assert ir.record_icon_proposal(res, "d", "r")["action"] == "no-fingerprint"
    assert ir.record_icon_proposal(ir.resolve_icon(None), "d", "r")["action"] == "no-fingerprint"
    assert not os.path.exists(log)


def test_library_hit_returns_slug_state_library_and_records_nothing(log, tmp_path):
    lib = tmp_path / "sgs-icons.json"
    lib.write_text(json.dumps({"framed-bar": ir._strip_svg_wrapper_attrs(PIN_SVG)}), encoding="utf-8")
    ir._reset_caches()
    res = ir.resolve_icon(node(PIN_SVG))
    assert (res["slug"], res["confidence"], res["state"], res["raw_svg"]) == ("framed-bar", "high", "library", None)
    assert res["fingerprint"] == ir.fingerprint_of_svg(PIN_SVG)
    assert ir.record_icon_proposal(res, "d", "run-1")["action"] == "library"
    # Even a stale "new" result cannot sneak a row in: the library is re-checked at write time.
    stale = {**res, "slug": None, "confidence": "none", "raw_svg": PIN_SVG, "state": "new"}
    assert ir.record_icon_proposal(stale, "d", "run-1")["action"] == "library"
    assert not os.path.exists(log)


def test_lucide_hit_is_state_library_and_never_proposed(log):
    res = ir.resolve_icon(node('<svg><path d="M20 6 9 17l-5-5"/></svg>'))
    assert res["state"] == "library"
    assert ir.record_icon_proposal(res, "d", "r")["action"] == "library"
    assert not os.path.exists(log)


# ---------------------------------------------------------------------------
# Degrading gracefully
# ---------------------------------------------------------------------------

def test_corrupt_proposals_file_degrades_without_crashing(log, capsys):
    os.makedirs(os.path.dirname(log))
    good = {"fingerprint": "f" * 40, "status": "pending", "seen_in": ["x"], "raw_svg": "<svg/>"}
    with open(log, "w", encoding="utf-8") as fh:
        fh.write("this is not json\n" + json.dumps(good) + "\n{\"no_fingerprint\": 1}\n")
    ir._reset_caches()
    res = ir.resolve_icon(node(PIN_SVG))  # lookup survives
    assert res["state"] == "new"
    assert record(PIN_SVG, "run-1")["action"] == "added"  # record survives and adds its row
    text = open(log, encoding="utf-8").read().splitlines()
    assert "this is not json" in text and '{"no_fingerprint": 1}' in text  # garbage preserved, not destroyed
    assert sum(1 for r in read_rows_lenient(text) if r.get("status") == "pending") == 2
    assert "corrupt" in capsys.readouterr().err  # warned on stderr


def read_rows_lenient(lines: list[str]) -> list[dict]:
    out = []
    for line in lines:
        try:
            out.append(json.loads(line))
        except ValueError:
            pass
    return out


def test_unreadable_proposals_file_is_left_untouched(log, capsys):
    os.makedirs(os.path.dirname(log))
    with open(log, "wb") as fh:
        fh.write(b"\xff\xfe\x00\x81\x82 not utf-8 \xc3\x28\n")
    before = open(log, "rb").read()
    ir._reset_caches()
    assert ir.resolve_icon(node(PIN_SVG))["state"] == "new"
    assert record(PIN_SVG, "run-1")["action"] == "unreadable"
    assert open(log, "rb").read() == before
    assert "cannot read proposals file" in capsys.readouterr().err


def test_unwritable_location_reports_error_and_never_raises(tmp_path, monkeypatch):
    blocker = tmp_path / "a-file"
    blocker.write_text("x", encoding="utf-8")
    monkeypatch.setenv(ir.PROPOSALS_ENV, str(blocker / "sub" / "p.jsonl"))
    assert record(PIN_SVG, "run-1")["action"] == "error"


def test_corrupt_sgs_library_degrades_to_lucide_only(tmp_path, capsys):
    (tmp_path / "sgs-icons.json").write_text("{not json", encoding="utf-8")
    ir._reset_caches()
    res = ir.resolve_icon(node('<svg><path d="M20 6 9 17l-5-5"/></svg>'))
    assert res["slug"] == "check"
    assert "cannot read" in capsys.readouterr().err


# ---------------------------------------------------------------------------
# Reserved names
# ---------------------------------------------------------------------------

def test_library_slug_colliding_with_a_lucide_name_is_refused_by_the_resolver(tmp_path, capsys):
    (tmp_path / "sgs-icons.json").write_text(
        json.dumps({"check": '<svg><path d="M3 3h18v18H3z"/></svg>'}), encoding="utf-8"
    )
    ir._reset_caches()
    res = ir.resolve_icon(node('<svg><path d="M3 3h18v18H3z"/></svg>'))
    assert res["slug"] != "check" and res["state"] == "new"
    assert "reserved or invalid" in capsys.readouterr().err


def run_generator(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["node", GENERATOR, *args], capture_output=True, text=True, timeout=300)


@NEEDS_NODE
# star = Lucide only, close = WordPress only, user-group = built-in alias only (so each guard is
# exercised on its own), check = both libraries, Bad_Slug = format.
@pytest.mark.parametrize("slug", ["star", "close", "user-group", "check", "Bad_Slug"])
def test_generator_refuses_reserved_alias_or_invalid_slugs(tmp_path, slug):
    lib = tmp_path / "lib.json"
    lib.write_text(json.dumps({slug: '<svg><path d="M1 1h2"/></svg>'}), encoding="utf-8")
    proc = run_generator("--check", "--library", str(lib))
    assert proc.returncode != 0
    assert "refused" in proc.stderr and f'"{slug}"' in proc.stderr


@NEEDS_NODE
@pytest.mark.parametrize(
    "value",
    ['<svg><script>alert(1)</script></svg>', '<svg onload="x()"><path d="M1 1"/></svg>', "not svg", 5],
)
def test_generator_refuses_unsafe_svg_values(tmp_path, value):
    lib = tmp_path / "lib.json"
    lib.write_text(json.dumps({"fine-slug": value}), encoding="utf-8")
    assert run_generator("--check", "--library", str(lib)).returncode != 0


@NEEDS_NODE
def test_generator_writes_nothing_tracked_when_pointed_at_out_dir(tmp_path):
    out = tmp_path / "out"
    lib = tmp_path / "lib.json"
    lib.write_text(json.dumps({"fixture-pin": ir._strip_svg_wrapper_attrs(PIN_SVG)}), encoding="utf-8")
    proc = run_generator("--out-dir", str(out), "--library", str(lib))
    assert proc.returncode == 0, proc.stderr
    php = (out / "lucide-icons.php").read_text(encoding="utf-8")
    assert "'fixture-pin' =>" in php and "Plus 1 SGS library icons" in php
    lucide_json = json.loads((out / "assets" / "lucide-icons.json").read_text(encoding="utf-8"))
    assert "fixture-pin" not in lucide_json  # Lucide's own file never carries SGS icons


@NEEDS_NODE
def test_tracked_php_map_matches_a_fresh_generation_from_the_tracked_library(tmp_path):
    """includes/lucide-icons.php must equal generator output for the tracked sgs-icons.json."""
    out = tmp_path / "out"
    assert run_generator("--out-dir", str(out)).returncode == 0

    def body(path: str) -> list[str]:
        with open(path, encoding="utf-8") as fh:
            return [ln for ln in fh.read().splitlines() if "Last generated:" not in ln]

    tracked = os.path.join(SCRIPTS, "..", "includes", "lucide-icons.php")
    assert body(str(out / "lucide-icons.php")) == body(tracked)


# ---------------------------------------------------------------------------
# Normalisation (promote step)
# ---------------------------------------------------------------------------

@NEEDS_NODE
def test_normalise_strips_fixed_colours_and_keeps_the_fingerprint():
    p = promote_module()
    out = p.normalise_svg(PIN_SVG)
    assert "#123456" not in out and 'stroke="currentColor"' in out and 'fill="none"' in out
    assert "stroke-width=\"3\"" not in out and "class=" not in out
    assert ir.fingerprint_of_svg(out) == ir.fingerprint_of_svg(PIN_SVG)


@NEEDS_NODE
def test_normalise_scales_a_non_24_viewbox_without_touching_path_data():
    p = promote_module()
    out = p.normalise_svg('<svg viewBox="0 0 16 16" fill="none" stroke="red"><path d="M2 2h12v12H2z"/></svg>')
    assert 'viewBox="0 0 24 24"' in out and 'transform="scale(1.5)"' in out
    assert ir.fingerprint_of_svg(out) == ir.fingerprint_of_svg('<svg><path d="M2 2h12v12H2z"/></svg>')


@NEEDS_NODE
def test_normalise_filled_glyph_gets_a_filled_root():
    p = promote_module()
    out = p.normalise_svg('<svg viewBox="0 0 24 24" fill="#c00"><path d="M12 2l3 7h7l-6 5 2 8-6-4-6 4 2-8-6-5h7z"/></svg>')
    assert 'fill="currentColor"' in out and 'stroke="none"' in out and "stroke-width" not in out


@NEEDS_NODE
@pytest.mark.parametrize(
    "svg,needle",
    [
        ('<svg viewBox="0 0 24 24"><script>x</script><path d="M1 1"/></svg>', "script"),
        ('<svg viewBox="0 0 24 24" onload="x()" fill="none" stroke="red"><path d="M1 1h4"/></svg>', "event-handler"),
        ('<svg viewBox="0 0 24 24" fill="none" stroke="red"><a href="http://x"><path d="M1 1h4"/></a></svg>', "not allowed"),
        ('<svg viewBox="0 0 24 24" fill="none" stroke="red"><image href="http://x/y.png"/></svg>', "not allowed"),
        ('<svg viewBox="0 0 24 24" fill="none" stroke="red"><path href="http://x" d="M1 1h4"/></svg>', "href"),
        ('<svg viewBox="0 0 24 24" fill="url(#g)"><path d="M1 1h4"/></svg>', "gradient"),
        ('<svg viewBox="0 0 24 10" fill="none" stroke="red"><path d="M1 1h4"/></svg>', "square"),
        ('<svg viewBox="0 0 24 24"><path d="M1 1h4"/></svg>', "--paint"),
        ('<svg viewBox="0 0 24 24" fill="none" stroke="red"><text>x</text></svg>', "not allowed"),
        ("<div><svg/></div>", "root element"),
        ('<!DOCTYPE svg [<!ENTITY a "b">]><svg viewBox="0 0 24 24"/>', "DOCTYPE"),
        ("<svg><path", "well-formed"),
    ],
)
def test_normalise_refuses_unsafe_or_ambiguous_svg(svg, needle):
    p = promote_module()
    with pytest.raises(p.Refusal) as exc:
        p.normalise_svg(svg)
    assert needle in str(exc.value)


@NEEDS_NODE
def test_paint_flag_resolves_an_svg_whose_colours_lived_in_the_drafts_css():
    p = promote_module()
    bare = '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3z"/></svg>'
    assert 'stroke="currentColor"' in p.normalise_svg(bare, "outline")
    assert 'fill="currentColor"' in p.normalise_svg(bare, "filled")


# ---------------------------------------------------------------------------
# Promote / reject end to end (all paths under tmp; generator writes to tmp too)
# ---------------------------------------------------------------------------

def cli(tmp_path, *args: str) -> list[str]:
    return [
        "--proposals", str(tmp_path / "p" / "icon-proposals.jsonl"),
        "--library", str(tmp_path / "lib.json"),
        "--meta", str(tmp_path / "meta.json"),
        "--out-dir", str(tmp_path / "out"),
        *args,
    ]


@pytest.fixture
def promote(tmp_path, monkeypatch):
    p = promote_module()
    monkeypatch.setattr(p, "GENERATOR", GENERATOR)
    monkeypatch.setenv(ir.PROPOSALS_ENV, str(tmp_path / "p" / "icon-proposals.jsonl"))
    return p


def state_bytes(tmp_path) -> dict:
    return {
        name: (open(path, "rb").read() if os.path.exists(path) else None)
        for name, path in {
            "lib": tmp_path / "lib.json",
            "meta": tmp_path / "meta.json",
            "proposals": tmp_path / "p" / "icon-proposals.jsonl",
        }.items()
    }


@NEEDS_NODE
def test_promote_end_to_end_then_the_library_hit_and_php_function_work(tmp_path, promote, capsys):
    record(PIN_SVG, "run-1")
    fp = read_rows(tmp_path / "p" / "icon-proposals.jsonl")[0]["fingerprint"]
    assert promote.main(cli(tmp_path, "promote", fp[:12], "--slug", "framed-bar")) == 0

    lib = json.loads((tmp_path / "lib.json").read_text(encoding="utf-8"))
    assert list(lib) == ["framed-bar"] and ir.fingerprint_of_svg(lib["framed-bar"]) == fp
    meta = json.loads((tmp_path / "meta.json").read_text(encoding="utf-8"))
    assert meta["framed-bar"]["fingerprint"] == fp and meta["framed-bar"]["source_draft"] == "draft-a.html"
    row = read_rows(tmp_path / "p" / "icon-proposals.jsonl")[0]
    assert row["status"] == "approved" and row["slug"] == "framed-bar"

    php = subprocess.run(
        ["php", "-r", f'define("ABSPATH",1); require {json.dumps(str(tmp_path / "out" / "lucide-icons.php"))}; '
                      'echo sgs_get_lucide_icon("framed-bar");'],
        capture_output=True, text=True,
    )
    assert php.stdout.startswith("<svg") and 'stroke="currentColor"' in php.stdout and "#123456" not in php.stdout

    # The same draft, next run: now a library hit and no new proposal.
    (tmp_path / "sgs-icons.json").write_text(json.dumps(lib), encoding="utf-8")
    ir._reset_caches()
    res = ir.resolve_icon(node(PIN_SVG))
    assert (res["slug"], res["state"], res["confidence"]) == ("framed-bar", "library", "high")
    assert record(PIN_SVG, "run-2")["action"] == "library"
    assert len(read_rows(tmp_path / "p" / "icon-proposals.jsonl")) == 1


@NEEDS_NODE
@pytest.mark.parametrize("slug", ["star", "close", "user-group", "check", "Bad_Slug", "1st"])
def test_promote_refuses_reserved_alias_or_invalid_slug_and_changes_nothing(tmp_path, promote, capsys, slug):
    record(PIN_SVG, "run-1")
    fp = read_rows(tmp_path / "p" / "icon-proposals.jsonl")[0]["fingerprint"]
    before = state_bytes(tmp_path)
    assert promote.main(cli(tmp_path, "promote", fp, "--slug", slug)) == 2
    assert "REFUSED" in capsys.readouterr().err
    assert state_bytes(tmp_path) == before


@NEEDS_NODE
def test_promote_refuses_a_non_pending_proposal_and_a_duplicate_slug(tmp_path, promote, capsys):
    record(PIN_SVG, "run-1")
    record(OTHER_SVG, "run-1")
    rows = read_rows(tmp_path / "p" / "icon-proposals.jsonl")
    pin, other = rows[0]["fingerprint"], rows[1]["fingerprint"]
    assert promote.main(cli(tmp_path, "promote", pin, "--slug", "framed-bar")) == 0
    before = state_bytes(tmp_path)
    assert promote.main(cli(tmp_path, "promote", pin, "--slug", "another")) == 2  # already approved
    assert promote.main(cli(tmp_path, "promote", other, "--slug", "framed-bar")) == 2  # slug taken
    assert state_bytes(tmp_path) == before
    err = capsys.readouterr().err
    assert "not pending" in err and "already exists" in err


@NEEDS_NODE
def test_promote_refuses_unsafe_svg_and_changes_nothing(tmp_path, promote, capsys):
    path = tmp_path / "p" / "icon-proposals.jsonl"
    os.makedirs(path.parent)
    evil = '<svg viewBox="0 0 24 24" fill="none" stroke="red"><path d="M1 1h4"/><script>x()</script></svg>'
    fp = ir.fingerprint_of_svg(evil)
    path.write_text(json.dumps({"fingerprint": fp, "status": "pending", "seen_in": ["r"], "raw_svg": evil}) + "\n", encoding="utf-8")
    before = state_bytes(tmp_path)
    assert promote.main(cli(tmp_path, "promote", fp, "--slug", "evil-icon")) == 2
    assert "script" in capsys.readouterr().err
    assert state_bytes(tmp_path) == before


@NEEDS_NODE
def test_reject_flips_status_and_the_icon_is_never_proposed_again(tmp_path, promote, capsys):
    record(PIN_SVG, "run-1")
    fp = read_rows(tmp_path / "p" / "icon-proposals.jsonl")[0]["fingerprint"]
    assert promote.main(cli(tmp_path, "reject", fp, "--reason", "client logo")) == 0
    row = read_rows(tmp_path / "p" / "icon-proposals.jsonl")[0]
    assert row["status"] == "rejected" and row["reject_reason"] == "client logo"
    ir._reset_caches()
    assert ir.resolve_icon(node(PIN_SVG))["state"] == "rejected"
    assert record(PIN_SVG, "run-2")["action"] == "rejected"
    assert len(read_rows(tmp_path / "p" / "icon-proposals.jsonl")) == 1
    assert promote.main(cli(tmp_path, "promote", fp, "--slug", "framed-bar")) == 2  # rejected cannot be promoted


@NEEDS_NODE
def test_list_prints_pending_with_three_advisory_nearest_icons(tmp_path, promote, capsys):
    record(PIN_SVG, "run-1")
    assert promote.main(cli(tmp_path, "list")) == 0
    out = capsys.readouterr().out
    assert "ADVISORY" in out and ir.fingerprint_of_svg(PIN_SVG) in out
    assert out.count("nearest:") == 3


def test_fingerprint_prefix_must_be_long_enough_and_unambiguous(tmp_path, promote, capsys):
    record(PIN_SVG, "run-1")
    assert promote.main(cli(tmp_path, "reject", "ab")) == 2
    assert promote.main(cli(tmp_path, "reject", "0" * 12)) == 2
