"""The facts every client shares (site_look.py::shared_facts): the value forms and content facts are read once under the
theme's own theme.json and each client's look is assembled from them. The full proof is a whole-client comparison with
`--per-client-facts` (every block's look byte-identical); these tests hold the assembly, the key and the custom-CSS guard.

    python -m pytest plugins/sgs-blocks/scripts/site-look/tests/test_shared_facts.py
    SITE_LOOK_MUTATE=shared-guard python -m pytest ... -k guard        (must fail)
    SITE_LOOK_MUTATE=share-retry python -m pytest ... -k parallel     (must fail)
    SITE_LOOK_MUTATE=same-text python -m pytest ... -k same_text      (must fail)
    SITE_LOOK_MUTATE=node-oom python -m pytest ... -k out_of_memory   (must fail)
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
    # the shared forms and the client's own slug form, merged in the client's plan order
    plan = [{'setting': 'colour', 'marker': {'form': 'hex'}}, {'setting': 'colour', 'marker': {'form': 'slug'}},
            {'setting': 'only', 'marker': {'form': 'slug'}}, {'setting': 'size', 'marker': {'form': 'clamp'}},
            {'setting': 'size', 'marker': {'form': 'vw'}}]
    forms = {'colour': ['hex'], 'size': ['clamp']}
    record = {'colour': {'forms': ['slug']}, 'only': {'forms': ['slug']}, 'size': {'look': {'p': 1}}, 'hover': {'look': {'q': 2}}}
    got = SL.with_forms(forms, record, plan)
    assert json.dumps(got) == json.dumps({'colour': {'forms': ['hex', 'slug']}, 'only': {'forms': ['slug']}, 'size': {'forms': ['clamp'], 'look': {'p': 1}}, 'hover': {'look': {'q': 2}}})
    assert SL.with_forms({}, {}, plan) == {}
    # the per-setting facts: discovered, then text, presence, link, then noMarker
    facts = {'discovered': {'a': 1}, 'noMarker': ['x']}
    content = {'link': {'l': 1}, 'text': {'t': 1}}
    assert list(SL.with_content(facts, content)) == ['discovered', 'text', 'link', 'noMarker']
    assert SL.with_content({'discovered': {}}, {}) == {'discovered': {}}


def test_facts_view_leaves_out_only_the_parts_not_read():
    hexf, slug, clamp = ({'marker': {'form': f}} for f in ('hex', 'slug', 'clamp'))
    bridge = {'discover': [1], 'content': [2], 'forms': [hexf, slug, clamp], 'states': [4], 'enums': [5], 'noMarker': ['n'], 'stateLookProps': ['p']}
    client = SL.facts_view(bridge, SL.CLIENT_PARTS)
    assert client['forms'] == [slug], 'the slug marker is the client palette: read by the client'
    assert client['states'] == [4] and client['enums'] == [5] and client['discover'] == [1]
    shared = SL.facts_view(bridge, SL.SHARED_PARTS)
    assert shared['forms'] == [hexf, clamp] and shared['states'] == [] and shared['enums'] == [] and shared['discover'] == [1]
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


def test_shared_facts_with_a_failed_render_are_not_taken(tmp_path, monkeypatch):
    """MUST FAIL with SITE_LOOK_MUTATE=shared-errors: a render behind the shared facts that failed leaves a fact out, so the
    client reads them itself rather than take a shorter list."""
    calls = []
    monkeypatch.setattr(SL, 'build_block', lambda short, snap_file, wc, parts=None, shared=None: calls.append(parts) or {'forms': {}, 'content': {}, 'classes': [], 'renderErrors': {'b:x': 'php error'}, 'block': f'sgs/{short}', 'format': SL.SHARED_FORMAT})
    monkeypatch.setattr(SL, 'shared_key', lambda short, wc: 'K')
    monkeypatch.setenv('SGS_LOOK_STORE', '')
    plain = tmp_path / 'plain.json'
    plain.write_text('{}', encoding='utf-8')
    SL.build_look('heading', plain, False, tmp_path)
    assert calls == [SL.SHARED_PARTS, None]


WRITER = '''
import json, sys
sys.path.insert(0, sys.argv[1])
import site_look as SL
from pathlib import Path
store, local, mode = Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4]
doc = {'block': 'sgs/heading', 'format': SL.SHARED_FORMAT, 'key': 'K', 'forms': {}, 'content': {'text': {'x': 'y' * 4000000}}, 'classes': []}
text = json.dumps(doc, indent=1)
seen = set()
for _ in range(40):
    if mode == 'write':
        SL.atomic_write(local, text)
        SL.store_look(store, SL.SHARED_SITE, 'heading', 'K', text, check=SL.read_shared)
    for f in (local, SL.store_file(store, SL.SHARED_SITE, 'heading', 'K')):
        got = SL.read_shared(f, 'heading', 'K')
        if got is None:
            seen.add('LOST' if ('whole', f) in seen else 'none')  # a file once whole must never read as missing again
        else:
            seen.update({'whole', ('whole', f)} if got == text else {'PARTIAL'})
seen = {x for x in seen if isinstance(x, str)}
print(','.join(sorted(seen)))
'''


def test_parallel_writers_and_readers_of_one_shared_key_never_see_a_partial_file(tmp_path):
    """Several processes (the --jobs workers, or clients built at once) writing and reading one block's shared facts and
    its store copy: every write succeeds and every read is the whole file or none, never a part (atomic_write: a temp name
    per process, then a rename retried while Windows holds the target open)."""
    import subprocess
    script = tmp_path / 'writer.py'
    script.write_text(WRITER, encoding='utf-8')
    store, local = tmp_path / 'store', tmp_path / 'out' / SL.SHARED_SITE / 'heading.json'
    procs = [subprocess.Popen([sys.executable, str(script), str(HERE.parent), str(store), str(local), 'write' if n % 2 == 0 else 'read'],
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True) for n in range(8)]
    outs = [p.communicate(timeout=300) for p in procs]
    assert all(p.returncode == 0 for p in procs), [e[-600:] for _, e in outs]
    assert not any('PARTIAL' in o or 'LOST' in o for o, _ in outs), [o for o, _ in outs]
    assert SL.read_shared(local, 'heading', 'K') is not None
    assert [f.name for f in (store / SL.SHARED_SITE).iterdir()] == ['heading.K.json'], 'no temp file left behind'
    assert [f.name for f in local.parent.iterdir()] == ['heading.json'], 'no temp file left in the local folder'


def test_a_refused_rename_onto_the_same_text_is_done(tmp_path, monkeypatch):
    """MUST FAIL with SITE_LOOK_MUTATE=same-text: a rename Windows refuses (a reader holds the file open) is done when the
    file already holds the text being written; with other text it is refused after its tries."""
    import os
    import pytest
    if os.name != 'nt':
        pytest.skip('only Windows refuses a rename onto an open file')
    monkeypatch.setattr(SL, 'SHARE_TRIES', 2)
    f = tmp_path / 'heading.json'
    SL.atomic_write(f, 'same')
    with open(f, encoding='utf-8'):
        SL.atomic_write(f, 'same')
        with pytest.raises(PermissionError):
            SL.atomic_write(f, 'other')
    assert f.read_text(encoding='utf-8') == 'same'
    assert [x.name for x in tmp_path.iterdir()] == ['heading.json'], 'no temp file left behind'


OOM_JS = """const keep = []; for (;;) { keep.push(new Array(1e6).fill(Math.random())); }"""


def test_a_bridge_out_of_memory_is_a_memory_error_on_the_failed_line(tmp_path, monkeypatch, capsys):
    """MUST FAIL with SITE_LOOK_MUTATE=node-oom: Node's real out-of-memory output (a FATAL line, then ~1,000 characters of
    stack) is read whole, so the block's FAILED line names MemoryError and the route's prepareLooks builds it again alone
    (lib/setting-record.mjs::RESOURCE_FAILURE); any other bridge failure stays a RuntimeError."""
    bridge = tmp_path / 'oom.mjs'
    bridge.write_text(OOM_JS, encoding='utf-8')
    monkeypatch.setattr(SL, 'BRIDGE', bridge)
    monkeypatch.setenv('NODE_OPTIONS', '--max-old-space-size=16')
    monkeypatch.setattr(SL, 'write_block', lambda job: (job[0], SL.bridge_plan(f'sgs/{job[0]}', tmp_path / 'snap.json')))
    (tmp_path / 'snap.json').write_text('{}', encoding='utf-8')
    assert SL.main(['--snapshot', str(tmp_path / 'snap.json'), '--site', 't', '--out', str(tmp_path), '--blocks', 'sgs/google-reviews', '--jobs', '1']) == 1
    line = capsys.readouterr().out.strip().splitlines()[0]
    assert line.startswith('google-reviews: FAILED MemoryError: site-look-bridge plan sgs/google-reviews: Node ran out of memory'), line
    assert SL.node_out_of_memory(1, 'Error: Cannot find module x') == '', 'negative control: another failure is not memory'
    assert SL.node_out_of_memory(134, '') == 'exit 134'
