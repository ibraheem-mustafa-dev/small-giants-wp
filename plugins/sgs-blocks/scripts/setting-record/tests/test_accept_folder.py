"""accept.py::mark_against_folder reads only the records in a folder (check.py --write marks the record it writes against
the records beside it)."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import accept as AC  # noqa: E402


def entry(setting, unproved=None):
    e = {'setting': setting, 'part': 'ROOT', 'props': ['color'], 'state': None, 'tiers': [], 'kind': 'value'}
    if unproved:
        e['unproved'] = unproved
    return e


def test_a_folder_holding_other_json_marks_against_the_records_only(tmp_path):
    """MUST FAIL before 2026-11-23: the self-test writes its clean record beside its own report (self-test.json, no
    `block`), and every JSON file was read as a record, so `check.py --self-test` stopped at its first write (KeyError)."""
    (tmp_path / 'self-test.json').write_text(json.dumps({'summary': {}, 'faults': []}), encoding='utf-8')
    (tmp_path / 'b.check.json').write_text(json.dumps({'block': 'sgs/b', 'instances': 3}), encoding='utf-8')
    (tmp_path / 'b.json').write_text(json.dumps({'block': 'sgs/b', 'schemaVersion': 2, 'parts': [], 'entries': [entry('colour')]}), encoding='utf-8')
    doc = {'block': 'sgs/a', 'schemaVersion': 2, 'parts': [], 'entries': [entry('colour', unproved='part-not-rendered')]}
    assert AC.mark_against_folder(doc, tmp_path) == 1
    assert doc['entries'][0]['accepted'] == 'proved on sgs/b'


def test_a_folder_with_no_other_record_accepts_nothing(tmp_path):
    (tmp_path / 'self-test.json').write_text('{"summary": {}}', encoding='utf-8')
    doc = {'block': 'sgs/a', 'schemaVersion': 2, 'parts': [], 'entries': [entry('colour', unproved='part-not-rendered')]}
    assert AC.mark_against_folder(doc, tmp_path) == 0
    assert 'accepted' not in doc['entries'][0]
