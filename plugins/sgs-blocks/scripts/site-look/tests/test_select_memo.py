"""The site look's shared selections (site_look.py::SelectMemo, ::MemoCascade) and the states a choice's values are read in
(::enum_states, ::enum_reads). Fast: no render, no build.

    python -m pytest plugins/sgs-blocks/scripts/site-look/tests/test_select_memo.py
    SITE_LOOK_MUTATE=select-memo python -m pytest plugins/sgs-blocks/scripts/site-look/tests/test_select_memo.py   (the reuse tests fail)
"""
import sys
from pathlib import Path

from bs4 import BeautifulSoup

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import site_look as SL  # noqa: E402

C = SL.C
PLAIN = SL.MemoCascade.__mro__[1]  # cascade.py's own Cascade, which MemoCascade must agree with exactly

HTML = ('<div class="sgs-x"><a class="sgs-x__link" href="/a">one</a><span class="sgs-x__tag" aria-current="page">two</span>'
        '<details class="sgs-x__more" open><summary>s</summary></details><p class="is-lit">three</p></div>')
CSS = ('.sgs-x a{color:red}.sgs-x a:hover{color:blue}.sgs-x a:focus-visible{outline:1px solid}'
       '.sgs-x [aria-current="page"]{font-weight:700}.sgs-x__more[open] summary{color:green}.sgs-x .is-lit{opacity:.5}'
       '.sgs-x__missing .y{color:pink}.sgs-x :unknown-pseudo(3){color:black}p:nth-child(4){margin:0}')


def soup(html=HTML):
    return BeautifulSoup(html, 'html.parser')


def rules(css=CSS):
    return C.flatten(css, 1, 10_000)


def shape(cascade):
    """The cascade's matches as {element index in document order: [rule order]} and its error count."""
    els = cascade.soup.find_all(True)
    at = {id(e): n for n, e in enumerate(els)}
    return {at[k]: [r.order for r in v] for k, v in cascade.match.items()}, cascade.errors


def test_memo_cascade_matches_the_plain_cascade_in_every_state():
    SL.MemoCascade.memo = SL.SelectMemo()
    rs = rules()
    for held in [(), ('hover',), ('focus', 'focus-visible'), ('active',), ('current',), ('open',), ('.is-lit',), ('hover',)]:
        assert shape(SL.MemoCascade(soup(), rs, held)) == shape(PLAIN(soup(), rs, held)), held


def test_memo_is_used_for_a_page_of_the_same_markup():
    """MUST FAIL with SITE_LOOK_MUTATE=select-memo: the cascade module builds every Cascade through MemoCascade, and a held page
    of the same markup selects only the rules its state changes."""
    assert C.Cascade is SL.MemoCascade
    SL.MemoCascade.memo = memo = SL.SelectMemo()
    rs = rules()
    C.Cascade(soup(), rs)
    first, reused = memo.selects, memo.reused  # two rules resting to one selector already share an answer here
    assert first > 0
    C.Cascade(soup(), rs, ('hover',))
    assert memo.reused - reused >= first - 2, 'every rule the hover state leaves alone is answered from the memo'
    assert memo.selects - first <= 2, 'only the selectors hover changes are selected again'


def test_memo_never_answers_for_other_markup():
    """NEGATIVE CONTROL: a markup that differs (one element more) is selected afresh, and its answer is its own."""
    SL.MemoCascade.memo = memo = SL.SelectMemo()
    rs = rules('.sgs-x .y{color:red}')
    C.Cascade(soup('<div class="sgs-x"><b class="y"></b></div>'), rs)
    other = '<div class="sgs-x"><i></i><b class="y"></b><b class="y"></b></div>'
    before = memo.selects
    got = SL.MemoCascade(soup(other), rs)
    assert memo.selects == before + 1
    assert shape(got) == shape(PLAIN(soup(other), rs))


def test_memo_follows_a_settled_page_changed_in_place():
    """A page changed after parsing (settle moves the footer and adds the overlay scroll thumb) is another markup: its
    selections are its own, and a second page settled the same way shares them."""
    SL.MemoCascade.memo = SL.SelectMemo()
    rs = rules('.sgs-x > .sgs-thumb{color:red}.sgs-x a{color:blue}')

    def settled():
        s = soup()
        s.select_one('.sgs-x').append(s.new_tag('div', attrs={'class': 'sgs-thumb'}))
        return s
    C.Cascade(soup(), rs)
    a = SL.MemoCascade(settled(), rs)
    b = SL.MemoCascade(settled(), rs, ('hover',))
    assert shape(a) == shape(PLAIN(settled(), rs)) and shape(b) == shape(PLAIN(settled(), rs, ('hover',)))
    assert any(shape(a)[0].values()), 'the thumb rule matched'


def test_memo_keeps_a_bounded_number_of_markups():
    memo = SL.SelectMemo(keep=2)
    for n in range(5):
        memo.picks(soup(f'<p class="n{n}"></p>'))
    assert len(memo.docs) == 2


def test_enum_states_reads_every_state_the_placements_name():
    """MUST FAIL with SITE_LOOK_MUTATE=enum-extra-states: after rest, hover and focus, a choice's values are read in every other
    state its placements name (pressed, and the conditions an attribute or class holds)."""
    assert SL.enum_states({'': ['p'], 'hover': ['p'], 'open': ['p'], 'active': ['p'], '.is-lit': ['p']}) == ('', 'hover', 'focus', '.is-lit', 'active', 'open')
    assert SL.held_for('focus') == ('focus', 'focus-visible')
    assert SL.held_for('current') == ('current',)


def test_enum_reads_records_a_condition_reading(monkeypatch):
    """MUST FAIL with SITE_LOOK_MUTATE=enum-extra-states: a choice placed in the `open` condition records what each value paints
    with `open` held, beside its rest reading; NEGATIVE CONTROL: a state no placement names records nothing."""
    calls = []

    class Reader:
        def ok(self, job):
            return True

        def style(self, job, held=(), only=None):
            calls.append((job, tuple(held)))
            on = 'open' in held and job == 'b:v1'
            return {str(w): {'': {'transform': 'translateY(-100%)' if on else 'none'}} for w in SL.WIDTHS}

    bridge = {'enums': [{'key': 'v1', 'setting': 'labelRoll', 'enumValue': 'roll', 'enumDefault': 'none', 'props': ['transform'], 'variant': 0}],
              'discover': [{'key': 'd0', 'isDefault': True, 'variant': 0, 'attrs': {}}], 'stateLookProps': ['transform']}
    plan = bridge['discover'] + bridge['enums']
    out = SL.enum_reads(bridge, Reader(), {'labelRoll': {'': [''], 'open': ['']}}, plan)
    reads = out['labelRoll']
    assert reads['enumReads']['roll']['transform']['1440'] == 'none'
    assert reads['enumStateReads']['open']['roll']['transform']['1440'] == 'translateY(-100%)'
    assert reads['enumStateReads']['open']['none']['transform']['1440'] == 'none'
    assert ('b:v1', ('open',)) in calls
    assert 'hover' not in reads.get('enumStateReads', {}), 'no placement names hover: no hover reading'
