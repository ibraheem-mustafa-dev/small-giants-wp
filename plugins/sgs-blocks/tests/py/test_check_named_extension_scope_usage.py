"""check-named-extension-scope.py asked for without a site says how to run it, and the npm line passes a site through.

Run with: python -m pytest plugins/sgs-blocks/tests/py/test_check_named_extension_scope_usage.py
"""
import json
import pathlib
import subprocess
import sys

PLUGIN = pathlib.Path(__file__).resolve().parents[2]
SCRIPT = PLUGIN / 'scripts' / 'check-named-extension-scope.py'
NPM_LINE = 'npm run check:named-extension-scope -- --site local-<mirror>'


def run(*args):
    return subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True, timeout=60)


def test_check_without_a_site_exits_2_and_names_the_npm_line():
    result = run('--check')
    assert result.returncode == 2
    assert NPM_LINE in result.stderr


def test_survey_without_a_site_names_the_npm_line_too():
    result = run('--survey')
    assert result.returncode == 2
    assert NPM_LINE in result.stderr


def test_a_site_that_is_not_a_local_mirror_is_refused():
    result = run('--check', '--site', 'sandybrown')
    assert result.returncode == 2
    assert 'local-' in result.stderr


def test_the_npm_script_is_the_bare_check_so_a_site_added_after_double_dash_reaches_the_script():
    scripts = json.loads((PLUGIN / 'package.json').read_text(encoding='utf-8'))['scripts']
    assert scripts['check:named-extension-scope'] == 'python scripts/check-named-extension-scope.py --check'
