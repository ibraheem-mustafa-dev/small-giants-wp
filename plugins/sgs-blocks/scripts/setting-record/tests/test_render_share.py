"""The render cache is shared by processes that render the same key at once (a sweep's workers each building a block's
look): each writer's side files carry its own name, and a rename Windows refuses onto a cached render is not an error."""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import render as RN  # noqa: E402

FIXTURES = Path(__file__).resolve().parent.parent / 'fixtures.json'
windows_only = pytest.mark.skipif(sys.platform != 'win32', reason='Windows refuses a rename onto a file another handle holds open')


@windows_only
def test_must_fail_a_refused_rename_onto_a_cached_file_is_not_an_error(tmp_path):
    # Breaks with a bare os.replace: a second process finishing the same render while the first's file is open raised
    # PermissionError and lost the whole look (product-card, 2026-11-27).
    f = tmp_path / 'key.json'
    f.write_text('{"first": true}', encoding='utf-8')
    with open(f, 'rb'):
        RN.write_whole(f, '{"second": true}')
    assert json.loads(f.read_text(encoding='utf-8')) == {'first': True}
    assert [p.name for p in tmp_path.iterdir()] == ['key.json']


def test_must_fail_a_render_leaves_no_side_file_in_the_shared_cache(tmp_path, monkeypatch):
    # Breaks with the side files named by key alone: two processes rendering one key wrote and read the same attrs and
    # included-files lists, and one process's PHP list could be read by the other.
    monkeypatch.setattr(RN, 'CACHE_ROOT', tmp_path)
    fixture = json.loads(FIXTURES.read_text(encoding='utf-8'))['sgs/heading']
    rn = RN.Renderer(RN.DEFAULT_PLUGIN, fixture, FIXTURES.parent, 'heading')
    res = rn.render('sgs/heading', RN.with_defaults(RN.DEFAULT_PLUGIN, 'heading', RN.fill(fixture.get('attributes') or {})))
    assert res.get('ok'), res.get('error')
    left = sorted(p.name for p in rn.cache.iterdir() if p.is_file())
    assert left and all(n.count('.') == 1 and n.endswith('.json') for n in left), left
