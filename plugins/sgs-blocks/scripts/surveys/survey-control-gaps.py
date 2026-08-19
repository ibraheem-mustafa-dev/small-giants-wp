"""survey-control-gaps.py — the SHOULD-BE census: a control weaker than its value.

Run:  python scripts/surveys/survey-control-gaps.py            # table
      python scripts/surveys/survey-control-gaps.py --json     # machine-readable
      python scripts/surveys/survey-control-gaps.py --self-test

WHAT THIS ANSWERS, AND WHY NOTHING ELSE DOES.
Three censuses already exist and each asks a different question:

  survey-control-mounts.py   how many `<X` tags exist          (currently-is)
  survey-control-reach.py    which blocks can REACH each `X`   (currently-is)
  survey-golden-conformance.js  per block x per ENCODED axis, is it conformant?

That third one is schema-driven — it iterates `golden-controls.json._meta.encoded`
— so by construction it CANNOT surface a control type that has no golden yet.
Neither can a role-driven pass: measured 2026-08-19, `countdown-timer.targetDate`
carries `role='text-content'` and `inspector_control_type='TextControl'`, i.e. the
data layer records it as perfectly conformant. It is a DATE, hand-typed as an ISO
string, and no existing detector can see it.

Rule 21 finds an attribute with NO control. check-dead-controls finds a control
with NO attribute. This finds the third case: a control that exists, renders,
saves — and is WEAKER THAN THE VALUE IT HOLDS.

THE SIGNAL. A free-text primitive whose own label/help/placeholder/default
declares a STRUCTURED format is asserting a contract it cannot enforce. The
client must type the format by hand, exactly, or the value silently fails. That
is the same defect Spec 35 already bans by name in two contracts — §11 SHADOW's
raw-CSS field ("e.g. 0 6px 24px rgba(0,0,0,0.15)") and §4 LENGTH's TextControl
standing in for a UnitControl ("e.g. 8px") — generalised to every value kind, so
it finds the ones no contract has been written for yet.

⛔ NOT A GATE. Census only: no --check, no exit code beyond run success. A
non-gating script inside the gate chain is enforcement theatre (plugin CLAUDE.md).

⛔ EVERY FINDING IS A CANDIDATE, NEVER A DEFECT LIST. Spec 35 §14 records a
survey leg whose false-positive rate was 7 of 7. Read the code before acting on
any row here.
"""
import re
import os
import sys
import json
import glob
import collections

# --------------------------------------------------------------------------
# Value-kind signals. DECLARED, not inferred silently — each carries the reason
# it is here so a future reader can falsify it. Keyed on what the control's own
# visible text promises, because that is the client-facing contract.
# --------------------------------------------------------------------------
FORMAT_CONTRACTS = [
    {
        'kind': 'date',
        'why': 'an ISO date/time typed by hand; one wrong character and the value silently fails',
        'patterns': [r'YYYY-MM-DD', r'\bISO\s*8601\b', r'\bdd/mm/yyyy\b'],
    },
    {
        'kind': 'length',
        'why': 'a CSS length behind free text; Spec 35 §4.3 bans a TextControl standing in for UnitControl',
        'patterns': [r'e\.g\.\s*\d+\s*(px|rem|em|%|vh|vw)\b', r'\b\d+px\b.*\bor\b.*\b\d+rem\b'],
    },
    {
        'kind': 'css-value',
        'why': 'raw CSS typed by a client; Spec 35 §11.3 bans it for shadow and it generalises',
        'patterns': [r'\braw CSS\b', r'box-shadow value', r'\bCSS\s+(shorthand|value)\b'],
    },
    {
        'kind': 'colour',
        'why': 'a colour as free text bypasses the theme token palette entirely',
        'patterns': [r'#RRGGBB', r'\bhex\s+colou?r\b', r'\brgba?\(\s*\)'],
    },
    {
        'kind': 'url',
        'why': 'a navigational URL belongs in the LINK contract, not a bare text field',
        'patterns': [r'https?://', r'\bfull URL\b'],
    },
]

# Primitives that accept anything the client types. A format contract on one of
# these is the finding; the same contract on a constrained primitive is not.
FREE_TEXT = {'TextControl', 'TextareaControl'}

JSX_TAG = re.compile(r'<([A-Z]\w*)')


def strip_comments(src):
    """Blank comments, preserving length. LINE COMMENTS FIRST — load-bearing.

    A `//` comment citing a glob path (`src/blocks/*/block.json`) contains the
    substring `/*/`, which holds BOTH `/*` and `*/` sharing one asterisk. Run the
    block pass first and it opens a comment there, cannot close on the overlapping
    `*/`, and runs to the next `*/` far later in the file — masking hundreds of
    lines of real code. Measured 2026-08-19: that under-counted <SgsColourPanel
    by 2 and reported two live mounts as commented out.
    """
    out = list(src)

    def blank(m):
        for i in range(m.start(), m.end()):
            if out[i] != '\n':
                out[i] = ' '

    for m in re.finditer(r'^[ \t]*//.*$', src, flags=re.M):
        blank(m)
    for m in re.finditer(r'/\*.*?\*/', ''.join(out), flags=re.S):
        blank(m)
    return ''.join(out)


def read(p):
    try:
        return open(p, encoding='utf-8', errors='replace').read()
    except OSError:
        return ''


def control_blocks(src):
    """Yield (component, text) for every JSX control element in the source.

    `text` is the element's own opening tag through to a bounded lookahead — the
    span that carries its label/help/placeholder. Deliberately bounded rather than
    brace-matched: an unbalanced heuristic over JSX is how a sibling survey
    attributed a value to the wrong element (Spec 35 §14.6, 7 of 7 false).
    """
    for m in JSX_TAG.finditer(src):
        name = m.group(1)
        # stop at the next JSX tag so text is never borrowed from a sibling
        nxt = JSX_TAG.search(src, m.end())
        end = min(nxt.start(), m.start() + 700) if nxt else m.start() + 700
        yield name, src[m.start():end], m.start()


def visible_text(span):
    """The strings a client actually reads on this control."""
    parts = []
    for attr in ('label', 'help', 'placeholder'):
        for m in re.finditer(attr + r'=\{?\s*(?:__\(\s*)?[\'"`]([^\'"`]{0,240})', span):
            parts.append(m.group(1))
    return ' | '.join(parts)


def classify(text):
    for spec in FORMAT_CONTRACTS:
        for pat in spec['patterns']:
            if re.search(pat, text, re.I):
                return spec['kind'], spec['why'], pat
    return None, None, None


def scan_source(path, slug):
    findings = []
    src = strip_comments(read(path))
    for name, span, off in control_blocks(src):
        if name not in FREE_TEXT:
            continue
        text = visible_text(span)
        if not text:
            continue
        kind, why, pat = classify(text)
        if not kind:
            continue
        findings.append({
            'block': slug,
            'file': path,
            'line': src[:off].count('\n') + 1,
            'control': name,
            'valueKind': kind,
            'why': why,
            'matched': pat,
            'visibleText': text[:120],
        })
    return findings


def survey(base):
    findings = []
    for p in sorted(glob.glob(os.path.join(base, 'src', 'blocks', '*', 'edit.js'))):
        findings.extend(scan_source(p, os.path.basename(os.path.dirname(p))))
    for p in sorted(glob.glob(os.path.join(base, 'src', 'blocks', '*', 'components', '*.js'))):
        findings.extend(scan_source(p, os.path.basename(os.path.dirname(os.path.dirname(p)))))
    for p in sorted(glob.glob(os.path.join(base, 'src', 'components', '*.js'))):
        findings.extend(scan_source(p, '(shared)'))
    for p in sorted(glob.glob(os.path.join(base, 'src', 'blocks', 'extensions', '*.js'))):
        findings.extend(scan_source(p, '(extension)'))
    return findings


# --------------------------------------------------------------------------
# Self-test. A survey with no self-test is one silent edit away from confidently
# reporting zero — this repo has a recorded case where a literal backspace byte
# replaced `\b` and a rule passed while detecting nothing, caught only by its
# fixture. Every case below is a real shape measured in this tree.
# --------------------------------------------------------------------------
CASES = [
    ('mustFlag/date',
     '<TextControl label={ __( "Target date/time" ) } help={ __( "Format: YYYY-MM-DDTHH:MM" ) } />',
     'date'),
    ('mustFlag/css-value',
     '<TextControl label="Shadow" help="A raw CSS box-shadow value, e.g. 0 6px 24px rgba(0,0,0,0.15)" />',
     'css-value'),
    ('mustFlag/length',
     '<TextControl label="Radius" help="e.g. 8px" />',
     'length'),
    # NEGATIVE CONTROLS
    ('mustNotFlag/constrained-primitive',
     '<UnitControl label="Radius" help="e.g. 8px" />',
     None),
    ('mustNotFlag/plain-text-field',
     '<TextControl label={ __( "Headline" ) } help={ __( "Shown above the image" ) } />',
     None),
    # THE COMMENT TRAP — the exact shape that cost a wrong figure today. The glob
    # path inside a // comment carries `/*/`; if line comments are not stripped
    # first, the block pass masks real code and this fixture stops flagging.
    ('mustNotFlag/commented-out-mount',
     '// Slugs verified against src/blocks/*/block.json.\n'
     '// <TextControl label="Date" help="Format: YYYY-MM-DD" />\n'
     'const X = 1;',
     None),
    ('mustFlag/live-mount-after-a-glob-comment',
     '// Slugs verified against src/blocks/*/block.json.\n'
     '<TextControl label="Date" help="Format: YYYY-MM-DD" />',
     'date'),
]


def self_test():
    failures = []
    for name, src, expect in CASES:
        stripped = strip_comments(src)
        got = None
        for comp, span, _ in control_blocks(stripped):
            if comp not in FREE_TEXT:
                continue
            kind, _, _ = classify(visible_text(span))
            if kind:
                got = kind
                break
        if got != expect:
            failures.append('  FAIL %-42s expected %-10s got %s'
                            % (name, expect, got))
        else:
            print('  PASS %-42s -> %s' % (name, got))
    if failures:
        print('\n'.join(failures))
        print('SELF-TEST FAILED (%d)' % len(failures))
        return 1
    print('SELF-TEST PASSED (%d cases)' % len(CASES))
    return 0


def main():
    args = sys.argv[1:]
    if '--self-test' in args:
        sys.exit(self_test())
    base = next((a for a in args if not a.startswith('--')), '.')
    findings = survey(base)
    if '--json' in args:
        print(json.dumps(findings, indent=2))
        return
    by_kind = collections.Counter(f['valueKind'] for f in findings)
    print('CONTROL-GAP CENSUS — a control weaker than the value it holds')
    print('(candidates, never a defect list — read the code before acting)')
    print()
    for kind, n in by_kind.most_common():
        print('  %-12s %d' % (kind, n))
    print('  %-12s %d' % ('TOTAL', len(findings)))
    print()
    for f in findings:
        print('  [%s] %s:%d  <%s>' % (f['valueKind'], f['file'], f['line'], f['control']))
        print('        %s' % f['visibleText'])


main()
