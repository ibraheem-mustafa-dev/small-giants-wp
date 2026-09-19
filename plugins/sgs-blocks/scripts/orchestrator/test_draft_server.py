"""Stage 11.6 draft-server helper (D1116): a DSL draft is detected by content, served over
HTTP from its ORIGINAL folder, and the server always shuts down."""
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from draft_server import is_dsl_draft, serve_dir  # noqa: E402


def test_dsl_signals_are_detected_by_content():
    assert is_dsl_draft('<x-dc name="Home"><div></div></x-dc>')
    assert is_dsl_draft('<script data-dc-script>class A {}</script>')
    assert is_dsl_draft('<sc-for list="{{ a }}" as="t"><span>x</span></sc-for>')
    assert is_dsl_draft('<SC-IF value="{{ x }}"><p>y</p></SC-IF>')


def test_plain_static_draft_is_not_dsl():
    assert not is_dsl_draft('<section class="sgs-hero"><h1>Hello</h1></section>')


def test_serve_dir_serves_the_folder_and_shuts_down(tmp_path):
    (tmp_path / "draft.dc.html").write_text("<x-dc>ok</x-dc>", encoding="utf-8")
    with serve_dir(tmp_path) as base:
        assert base.startswith("http://127.0.0.1:")
        assert urllib.request.urlopen(f"{base}/draft.dc.html", timeout=5).read() == b"<x-dc>ok</x-dc>"
    try:
        urllib.request.urlopen(f"{base}/draft.dc.html", timeout=2)
        raise AssertionError("server still answering after the context exited")
    except OSError:
        pass
