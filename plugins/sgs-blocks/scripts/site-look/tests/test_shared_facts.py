"""The facts every client shares (site_look.py::shared_facts): the value forms and content facts are read once under the
theme's own theme.json and each client's look is assembled from them. The full proof is a whole-client comparison with
`--per-client-facts` (every block's look byte-identical); these tests hold the assembly, the key and the custom-CSS guard.

    python -m pytest plugins/sgs-blocks/scripts/site-look/tests/test_shared_facts.py
    SITE_LOOK_MUTATE=shared-guard python -m pytest ... -k guard        (must fail)
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import site_look as SL  # noqa: E402


def snap(css):
    return {'styles': {'css': css}} if css is not None else {}


def test_custom_css_guard_reaches_only_a_page_carrying_every_class_it_requires():
    """MUST FAIL with SITE_LOOK_MUTATE=shared-guard: a client's custom CSS that could match a page the shared facts were
    read from has that client read them under its own CSS."""
    seen = {'sgs-site-header', 'sgs-business-info-wrap--phone', 'sgs-button'}
    rule = '@media (max-width: 1159px) { .sgs-site-header .sgs-business-info-wrap--phone { display: none; } }'
    assert SL.custom_css_reaches(snap(rule), seen) is True
    assert SL.custom_css_reaches(snap('.sgs-button { color: red }'), seen) is True
    # a rule needing no class (a tag, :root, an id) could match anything
    assert SL.custom_css_reaches(snap('a { color: red }'), {'x'}) is True
    assert SL.custom_css_reaches(snap('#menu { color: red }'), {'x'}) is True
    # a palette class is named by the client's own slugs, which the shared pages do not carry
    assert SL.custom_css_reaches(snap('.sgs-button.has-brand-color { color: red }'), {'sgs-button'}) is True


def test_custom_css_guard_negative_controls():
    # a rule whose classes are not all on the shared pages cannot match them; no custom CSS reaches nothing
    assert SL.custom_css_reaches(snap('.sgs-site-header .sgs-business-info-wrap--phone { display: none }'), {'sgs-site-header'}) is False
    assert SL.custom_css_reaches(snap('.sgs-other { color: red }'), {'sgs-button'}) is False
    assert SL.custom_css_reaches(snap(''), {'sgs-button'}) is False
    assert SL.custom_css_reaches(snap(None), {'sgs-button'}) is False


def test_assembly_keeps_one_build_order():
    # settingFacts: every setting with a form first in the order found, `forms` before a state look; a look-only setting after
    forms = {'colour': ['hex', 'slug'], 'size': ['clamp']}
    record = {'size': {'look': {'p': 1}}, 'hover': {'look': {'q': 2}}}
    got = SL.with_forms(forms, record)
    assert json.dumps(got) == json.dumps({'colour': {'forms': ['hex', 'slug']}, 'size': {'forms': ['clamp'], 'look': {'p': 1}}, 'hover': {'look': {'q': 2}}})
    assert SL.with_forms({}, {}) == {}
    # the per-setting facts: discovered, then text, presence, link, then noMarker
    facts = {'discovered': {'a': 1}, 'noMarker': ['x']}
    content = {'link': {'l': 1}, 'text': {'t': 1}}
    assert list(SL.with_content(facts, content)) == ['discovered', 'text', 'link', 'noMarker']
    assert SL.with_content({'discovered': {}}, {}) == {'discovered': {}}


def test_facts_view_leaves_out_only_the_parts_not_read():
    bridge = {'discover': [1], 'content': [2], 'forms': [3], 'states': [4], 'enums': [5], 'noMarker': ['n'], 'stateLookProps': ['p']}
    client = SL.facts_view(bridge, SL.CLIENT_PARTS)
    assert client['forms'] == [] and client['states'] == [4] and client['enums'] == [5] and client['discover'] == [1]
    shared = SL.facts_view(bridge, SL.SHARED_PARTS)
    assert shared['forms'] == [3] and shared['states'] == [] and shared['enums'] == [] and shared['discover'] == [1]
    assert shared['noMarker'] == ['n'] and shared['stateLookProps'] == ['p']
    assert SL.facts_view(bridge, SL.ALL_PARTS) == bridge


def test_shared_key_leaves_out_the_snapshot_only(tmp_path, monkeypatch):
    a, b = tmp_path / 'a.json', tmp_path / 'b.json'
    a.write_text('{"settings": {"color": {"palette": [{"slug": "x", "color": "#111"}]}}}', encoding='utf-8')
    b.write_text('{"settings": {"color": {"palette": [{"slug": "y", "color": "#222"}]}}}', encoding='utf-8')
    monkeypatch.setattr(SL, 'reach_hash', lambda: 'fixed')
    assert SL.look_key('heading', a, False) != SL.look_key('heading', b, False)
    assert SL.shared_key('heading', False) not in (SL.look_key('heading', a, False), SL.look_key('heading', b, False))
    assert SL.shared_key('heading', False) == SL.shared_key('heading', False)
    assert SL.shared_key('heading', True) != SL.shared_key('heading', False), 'the shop stylesheet stays in the key'
    assert SL.shared_key('heading', False) != SL.shared_key('button', False)


def test_shared_file_is_taken_only_for_its_block_and_key(tmp_path):
    f = tmp_path / 'heading.json'
    doc = {'block': 'sgs/heading', 'format': SL.SHARED_FORMAT, 'key': 'k1', 'forms': {}, 'content': {}, 'classes': []}
    f.write_text(json.dumps(doc), encoding='utf-8')
    assert SL.read_shared(f, 'heading', 'k1') is not None
    assert SL.read_shared(f, 'heading', 'k2') is None
    assert SL.read_shared(f, 'button', 'k1') is None
    f.write_text(json.dumps({**doc, 'classes': None}), encoding='utf-8')
    assert SL.read_shared(f, 'heading', 'k1') is None, 'a partial file is rebuilt'
    f.write_text('{"block": "sgs/heading", "key": "k1", "forms"', encoding='utf-8')
    assert SL.read_shared(f, 'heading', 'k1') is None


def test_a_client_look_is_assembled_from_the_shared_file(tmp_path, monkeypatch):
    """The client's own reading is asked for without the forms and content facts, which come from the shared file; a
    client whose custom CSS reaches the shared pages, or --per-client-facts, reads everything itself."""
    calls = []
    monkeypatch.setattr(SL, 'build_block', lambda short, snap_file, wc, parts=None, shared=None: calls.append((parts, shared)) or {'forms': {}, 'content': {}, 'classes': ['sgs-heading'], 'block': f'sgs/{short}', 'format': SL.SHARED_FORMAT})
    monkeypatch.setattr(SL, 'shared_key', lambda short, wc: 'K')
    monkeypatch.setenv('SGS_LOOK_STORE', '')
    plain = tmp_path / 'plain.json'
    plain.write_text('{}', encoding='utf-8')
    SL.build_look('heading', plain, False, tmp_path)
    assert [c[0] for c in calls] == [SL.SHARED_PARTS, SL.CLIENT_PARTS]
    assert calls[1][1]['classes'] == ['sgs-heading']
    assert (tmp_path / '_shared' / 'heading.json').is_file()
    calls.clear()
    SL.build_look('heading', plain, False, tmp_path)
    assert [c[0] for c in calls] == [SL.CLIENT_PARTS], 'the kept shared file is read, not built again'
    calls.clear()
    styled = tmp_path / 'styled.json'
    styled.write_text(json.dumps(snap('.sgs-heading { color: red }')), encoding='utf-8')
    SL.build_look('heading', styled, False, tmp_path)
    assert [c[0] for c in calls] == [None], 'custom CSS reaching the shared pages: read whole for the client'
    calls.clear()
    SL.build_look('heading', plain, False, tmp_path, per_client=True)
    assert [c[0] for c in calls] == [None]
