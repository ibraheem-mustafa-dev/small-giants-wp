"""The pre-deploy old-shape audit (audit-post-content-blocks.py) and the box-string rule.

Run from the repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_box_string_audit.py -v

SGS_SCRIPTS_DIR points the tests at another copy of scripts/ (used to show they are red on the tree before the wiring).
"""
import importlib.util
import os
import sys
from pathlib import Path

import pytest

SCRIPTS = Path(os.environ.get('SGS_SCRIPTS_DIR') or Path(__file__).resolve().parents[1])
sys.path.insert(0, str(SCRIPTS / 'lib'))
import scalar_tier_rules as R  # noqa: E402

pytestmark = pytest.mark.skipif(not R.DB_PATH.exists(), reason='framework DB absent')

_spec = importlib.util.spec_from_file_location('audit_post_content_blocks', SCRIPTS / 'audit-post-content-blocks.py')
A = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(A)

BAD = '<!-- wp:sgs/container {"padding":{"desktop":"40px"}} /-->'
GOOD = '<!-- wp:sgs/container {"padding":{"desktop":{"top":"40px","right":"40px","bottom":"40px","left":"40px"}}} /-->'


def box_findings(markup):
    return [f for f in A.scan_text('t/1', markup, A.load_schemas()) if f['type'] == 'box-string']


def test_report_only_by_default_is_info(monkeypatch):
    monkeypatch.delenv('SGS_BOX_STRING_RULE', raising=False)
    found = box_findings(BAD)
    assert len(found) == 1 and found[0]['severity'] == 'INFO'


def test_flip_on_refuses_with_high(monkeypatch):
    monkeypatch.delenv('SGS_BOX_STRING_RULE', raising=False)
    monkeypatch.setattr(R, 'BOX_STRING_ENFORCED', True)
    found = box_findings(BAD)
    assert len(found) == 1 and found[0]['severity'] == 'HIGH'


def test_kill_switch_downgrades_the_flip(monkeypatch):
    monkeypatch.setattr(R, 'BOX_STRING_ENFORCED', True)
    monkeypatch.setenv('SGS_BOX_STRING_RULE', 'report')
    assert box_findings(BAD)[0]['severity'] == 'INFO'


def test_clean_content_has_no_finding(monkeypatch):
    monkeypatch.setattr(R, 'BOX_STRING_ENFORCED', True)
    assert box_findings(GOOD) == []
    assert box_findings('<!-- wp:sgs/container {"gap":{"desktop":"1rem"}} /-->') == []
