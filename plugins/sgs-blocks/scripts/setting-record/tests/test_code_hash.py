"""stamp.py::code_hash: the hash a record's stamp and a site look's key take of the check's own Python code. A comment, a
blank line or a docstring is not code, so editing one moves no stamp; any change to what runs moves it."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import stamp as ST  # noqa: E402

BASE = '''"""Module docstring."""
import os  # why os


def f(x):
    """What f does."""
    # a note
    if x:
        return os.sep + 'a'
    return 'b'
'''


def h(tmp_path, text, name='m.py'):
    f = tmp_path / name
    f.write_text(text, encoding='utf-8')
    return ST.code_hash(f)


def test_comment_blank_line_and_docstring_edits_keep_the_hash(tmp_path):
    """MUST FAIL before 2026-11-23: the hash was the file's raw bytes, so a comment edit re-proved every record."""
    base = h(tmp_path, BASE)
    assert h(tmp_path, BASE.replace('# why os', '# another reason')) == base
    assert h(tmp_path, BASE.replace('    # a note\n', '    # a longer note\n    # over two lines\n')) == base
    assert h(tmp_path, BASE.replace('"""What f does."""', '"""What f does, said\n    over two lines."""')) == base
    assert h(tmp_path, BASE.replace('\n\ndef f', '\n\n\n\ndef f')) == base
    assert h(tmp_path, BASE.replace('\n', '\r\n')) == base


def test_every_code_change_moves_the_hash(tmp_path):
    base = h(tmp_path, BASE)
    for edit in (BASE.replace("'a'", "'c'"), BASE.replace('if x:', 'if not x:'), BASE.replace("    return 'b'", "        return 'b'"),
                 BASE.replace('import os  # why os', 'import os, re'), BASE + 'X = 1\n', BASE.replace("return os.sep + 'a'", "return os.sep + 'a'  # x\n        x = 2")):
        assert h(tmp_path, edit) != base, edit


def test_a_bare_string_inside_an_expression_is_code(tmp_path):
    base = h(tmp_path, "X = (\n    'a'\n    'b'\n)\n")
    assert h(tmp_path, "X = (\n    'a'\n    'c'\n)\n") != base


def test_check_hash_ignores_a_comment_edit_in_the_check_and_follows_a_code_edit(tmp_path):
    plugin = tmp_path / 'plugin'
    sr = plugin / 'scripts' / 'setting-record'
    sr.mkdir(parents=True)
    (sr / 'mod.py').write_text(BASE, encoding='utf-8')
    (sr / 'hook.php').write_text('<?php // x\n', encoding='utf-8')
    base = ST.check_hash(plugin)
    (sr / 'mod.py').write_text(BASE.replace('# a note', '# a changed note'), encoding='utf-8')
    assert ST.check_hash(plugin) == base
    (sr / 'mod.py').write_text(BASE.replace("'a'", "'z'"), encoding='utf-8')
    assert ST.check_hash(plugin) != base


def test_a_file_that_does_not_parse_is_hashed_as_text(tmp_path):
    assert h(tmp_path, 'def (:\n') != h(tmp_path, 'def (:\n  # c\n')
