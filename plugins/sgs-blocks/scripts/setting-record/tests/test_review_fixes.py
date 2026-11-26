"""Must-fail tests for the defects the code review of Task 1 confirmed (setting-record plan, Task 2 step 1). Each test
names the old behaviour it breaks on."""
import json
import subprocess
import sys
import types
from pathlib import Path

import soupsieve as sv
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import cascade as C  # noqa: E402
import check  # noqa: E402
import diff as D  # noqa: E402
import proof as PR  # noqa: E402
import render as RN  # noqa: E402
import selftest as ST  # noqa: E402


# ---------------------------------------------------------------- cascade.PSEUDO_EL
def test_must_fail_placeholder_shown_rule_is_kept():
    # Breaks on the old pattern: `placeholder` matched inside `:placeholder-shown` and the rule was dropped.
    rules = C.flatten('.a:placeholder-shown + .b{color:red}', 1, 0)
    assert [(r.selector, r.pseudo) for r in rules] == [('.a:placeholder-shown + .b', None)]


def test_must_fail_webkit_pseudo_class_is_not_a_pseudo_element():
    # Breaks on the old pattern: `:-webkit-autofill` (one colon) was read as a pseudo-element and the rule dropped.
    rules = C.flatten('input:-webkit-autofill{color:red}', 1, 0)
    assert [(r.selector, r.pseudo) for r in rules] == [('input:-webkit-autofill', None)]


def test_pseudo_elements_still_read():
    got = {r.pseudo for r in C.flatten('.a::placeholder{color:red}.b:before{color:red}.c::-webkit-scrollbar{width:1px}', 1, 0)}
    assert got == {'placeholder', 'before', '-webkit-scrollbar'}


# ---------------------------------------------------------------- cascade.media_holds
def test_must_fail_not_print_holds_on_screen():
    # Breaks on the old code: any prelude containing `print` without `screen` failed, `not print` included.
    assert C.media_holds(('not print',), 375)


def test_must_fail_comma_list_is_or():
    # Breaks on the old code: the width tests of every query in the list had to hold together.
    assert C.media_holds(('(max-width: 400px), (min-width: 1024px)',), 1440)
    assert C.media_holds(('(max-width: 400px), (min-width: 1024px)',), 375)
    assert not C.media_holds(('(max-width: 400px), (min-width: 1024px)',), 768)


def test_must_fail_not_of_a_condition_holds_at_rest():
    # Breaks on the old code: `not ... (prefers-reduced-motion: reduce)` failed on a plain screen.
    assert C.media_holds(('not all and (prefers-reduced-motion: reduce)',), 768)
    assert not C.media_holds(('not all and (prefers-reduced-motion: reduce)',), 768, {'prefers-reduced-motion-reduce'})


def test_conditions_and_types():
    assert not C.media_holds(('print',), 768)
    assert C.media_holds(('print',), 768, {'print'})
    assert C.media_holds(('(forced-colors: active), print',), 768, {'forced-colors'})
    assert not C.media_holds(('(prefers-reduced-motion: no-preference)',), 768, {'prefers-reduced-motion-reduce'})
    assert C.media_holds(('(prefers-reduced-motion: no-preference)',), 768)
    assert not C.media_holds(('screen and (min-width: 768px)',), 768, {'print'})
    assert not C.media_holds(('speech',), 768)


def test_proof_sets_only_the_conditions_a_tier_needs():
    # `not print` needs nothing; a comma list needs its first condition only.
    assert PR.conditions_of(['@media not print']) == set()
    assert PR.conditions_of(['@media (forced-colors:active),print']) == {'forced-colors'}


# ---------------------------------------------------------------- cascade.resting
def test_must_fail_checked_follows_the_markup():
    # Breaks on the old code: :checked was a dynamic state and never matched unless held.
    soup = BeautifulSoup('<input class="a" type="checkbox" checked><span class="b">x</span>', 'html.parser')
    assert sv.select(C.resting('.a:checked + .b'), soup)
    soup2 = BeautifulSoup('<input class="a" type="checkbox"><span class="b">x</span>', 'html.parser')
    assert not sv.select(C.resting('.a:checked + .b'), soup2)


def test_must_fail_placeholder_shown_follows_the_markup():
    # Breaks on the old code: :placeholder-shown never matched, so :not(:placeholder-shown) always did.
    soup = BeautifulSoup('<input class="a" placeholder=" "><span class="b">x</span>', 'html.parser')
    assert sv.select(C.resting('.a:placeholder-shown + .b'), soup)
    assert not sv.select(C.resting('.a:not(:placeholder-shown) + .b'), soup)


def test_held_markup_state_is_always_true():
    assert C.resting('.a:checked', {'checked'}) == '.a:is(*)'


# ---------------------------------------------------------------- diff.read_css
def test_must_fail_nested_selector_joins_every_parent():
    # Breaks on the old join: `.x, .y` + `& .z` gave `.x, .y .z` (the .x branch lost its .z).
    rules = D.read_css('.x, .y { & .z { color: red } .w { color: blue } }')
    sels = {r[0] for r in rules if r[1].strip()}
    assert sels == {'.x .z, .y .z', '.x .w, .y .w'}


def test_must_fail_nested_at_rules_keep_both_conditions():
    # Breaks on the old reader: only the inner at-rule was kept as the condition.
    rules = D.read_css('@media (min-width: 768px) { @supports (display: grid) { .a { color: red } } }')
    assert [D.tiers_of(r[2]) for r in rules] == [['@media (min-width: 768px)', '@supports (display: grid)']]


def test_must_fail_keyframes_are_not_rules():
    # Breaks on the old reader: `from` and `to` frames were read as selectors.
    assert D.read_css('@keyframes k { from { opacity: 0 } to { opacity: 1 } } @font-face { font-family: x }') == []


def test_rule_in_one_at_rule_has_one_tier():
    rules = D.read_css('@media (max-width: 767.98px) { .a { color: red } }')
    assert D.tiers_of(rules[0][2]) == ['@media (max-width: 767.98px)']
    assert D.placement('.a', 'color', rules[0][2], 'a', 'run-css', 'x')['tiers'] == ['@media (max-width: 767.98px)']


# ---------------------------------------------------------------- render.Renderer.render
def _renderer(tmp_path, monkeypatch):
    plugin = tmp_path / 'plugin'
    (plugin / 'src' / 'blocks' / 'demo').mkdir(parents=True)
    (plugin / 'src' / 'blocks' / 'demo' / 'block.json').write_text('{"name": "sgs/demo"}', encoding='utf-8')
    monkeypatch.setattr(RN, 'CACHE_ROOT', tmp_path / 'cache')
    return RN.Renderer(plugin, {}, tmp_path, 'demo')


def test_must_fail_failed_render_is_not_cached(tmp_path, monkeypatch):
    # Breaks on the old code: a failed render was written to the cache and returned as failed on every later run.
    r = _renderer(tmp_path, monkeypatch)
    outs = iter([types.SimpleNamespace(stdout='PHP Fatal error: x', stderr='Fatal', returncode=255),
                 types.SimpleNamespace(stdout='{"ok": true, "html": "<p></p>", "css": ""}', stderr='', returncode=0)])

    def run(*a, **k):  # the runner's hook reports the render.php the render loaded (a render naming none is never cached)
        Path(k['env']['SGS_SETTING_RECORD_INCLUDED']).write_text(json.dumps([str(r.plugin / 'src/blocks/demo/render.php')]), encoding='utf-8')
        return next(outs)
    monkeypatch.setattr(RN.subprocess, 'run', run)
    assert r.render('sgs/demo', {})['ok'] is False
    assert r.render('sgs/demo', {})['ok'] is True
    monkeypatch.setattr(RN.subprocess, 'run', lambda *a, **k: (_ for _ in ()).throw(AssertionError('not cached')))
    assert r.render('sgs/demo', {})['ok'] is True


def test_must_fail_last_json_object_wins(tmp_path, monkeypatch):
    # Breaks on the old parse (from the first `{`): a notice holding a brace ahead of the result spoiled it.
    r = _renderer(tmp_path, monkeypatch)
    out = 'Warning: array {oops} in x.php\n{"ok": true, "html": "<style>.a{color:red}</style>", "css": ".a{color:red}"}\n'
    monkeypatch.setattr(RN.subprocess, 'run', lambda *a, **k: types.SimpleNamespace(stdout=out, stderr='', returncode=0))
    assert r.render('sgs/demo', {})['css'] == '.a{color:red}'


def test_must_fail_hung_render_times_out(tmp_path, monkeypatch):
    # Breaks on the old code: no timeout, so a hung render held the run for ever.
    r = _renderer(tmp_path, monkeypatch)
    seen = {}

    def hang(*a, **k):
        seen['timeout'] = k.get('timeout')
        raise subprocess.TimeoutExpired(a[0], k.get('timeout'))

    monkeypatch.setattr(RN.subprocess, 'run', hang)
    res = r.render('sgs/demo', {})
    assert res['ok'] is False and 'did not finish' in res['error'] and seen['timeout']
    assert not list((tmp_path / 'cache').rglob('*[0-9a-f].json'))


# ---------------------------------------------------------------- selftest: stale reports
def test_must_fail_a_stale_report_is_not_judged(tmp_path, monkeypatch):
    # Breaks on the old code: a fault's report left by an earlier run was read as this run's and could kill the fault.
    out = tmp_path / 'out'
    for name in ('delete-rule', 'rename-selector', 'add-declaration', 'drop-part-class'):
        d = out / 'self-test' / name
        d.mkdir(parents=True)
        (d / f'{ST.SHORT}.check.json').write_text(json.dumps({'remove': [{'x': 1}], 'add': [{'x': 1}], 'change': [{'x': 1}]}), encoding='utf-8')
    monkeypatch.setattr(ST.RN, 'CACHE_ROOT', tmp_path / 'cache')
    monkeypatch.setattr(ST, 'copy_code', lambda src, dst: (dst / 'src' / 'blocks' / ST.SHORT).mkdir(parents=True, exist_ok=True)
                        or (dst / 'src' / 'blocks' / ST.SHORT / 'style.css').write_text('.sgs-button{color:red}', encoding='utf-8'))
    monkeypatch.setattr(ST, 'apply_edit', lambda path, edit: None)
    fault = {'file': 'src/blocks/button/style.css', 'edit': ('append', ''), 'line': 1, 'what': 'x', 'expect': {'kind': 'add', 'part': 'ROOT', 'prop': 'color'}}
    for name in ('pick_delete_rule', 'pick_rename_selector', 'pick_add_declaration'):
        monkeypatch.setattr(ST, name, lambda *a, **k: dict(fault))
    monkeypatch.setattr(ST, 'pick_drop_part_class', lambda *a, **k: dict(fault))

    def fake_run(cmd, env):
        if '--write' in cmd:
            Path(cmd[cmd.index('--write') + 1]).write_text(json.dumps({'entries': [], 'parts': []}), encoding='utf-8')
            return {'exit': 0, 'stdout': '', 'stderr': '', 'seconds': 0}
        if any('clean-check' in str(c) for c in cmd):
            return {'exit': 0, 'stdout': '', 'stderr': '', 'seconds': 0}
        return {'exit': 1, 'stdout': '', 'stderr': 'crashed before writing', 'seconds': 0}  # a fault run that writes nothing

    monkeypatch.setattr(ST, 'run_one', fake_run)
    args = types.SimpleNamespace(out=str(out), plugin=str(tmp_path / 'p'), fixtures=tmp_path / 'f.json', instances=None, instances_dir=None, no_proof=True)
    assert ST.main(args) == 1
    faults = json.loads((out / 'self-test.json').read_text(encoding='utf-8'))['faults']
    assert faults and not any(f['killed'] for f in faults)


# ---------------------------------------------------------------- check.py
def test_must_fail_several_blocks_refuse_one_record_file(capsys):
    # Breaks on the old code: --record with several blocks checked every block against one block's file.
    try:
        check.main(['sgs/button', 'sgs/cart', '--record', 'x.json'])
    except SystemExit as exc:
        assert exc.code == 2
    else:
        raise AssertionError('several blocks with --record must be refused')
