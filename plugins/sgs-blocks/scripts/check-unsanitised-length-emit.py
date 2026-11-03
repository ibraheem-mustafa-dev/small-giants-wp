#!/usr/bin/env python3
"""Gate: a responsive length emitter is never fed raw tier values without a unit or a sanitiser.

WHAT THIS CLOSES
    `includes/helpers-responsive.php::sgs_emit_responsive_css` (and `sgs_responsive_css_rule`) print each tier
    value through `sgs_responsive_format_atom_value`. A bare number (a tier object saved as {"desktop":56}) gets
    the entry's `unit_default` appended; with no `unit_default` and no `transform` it prints as `min-height:56;`,
    which the browser drops. A render.php that validates the value with `sgs_css_length_value()` but then hands
    the ORIGINAL value to the emitter has the same fault: the check passes, the print is raw.

WHAT IT FINDS
    entry    a property entry of an emitter call in src/blocks/*/render.php or includes/*.php whose `css` is a
             length property (width, height, min-/max-, gap, padding, margin, inset, border-radius, font-size,
             letter-spacing and the like) and which declares neither `unit_default` nor `transform`
    allowed  an entry listed in ALLOW with the reason its values can never be a bare number

    python check-unsanitised-length-emit.py --survey [--json]
    python check-unsanitised-length-emit.py --check          exit 1 while any entry remains
    python check-unsanitised-length-emit.py --self-test

THE REPAIR
    Give the entry `'transform' => static function ( $raw ) { return sgs_css_length_value( (string) $raw ); }`
    so every tier prints the sanitised length (a bare number becomes px), or `'unit_default' => 'px'` when the
    values are plain numbers by contract.
"""
import argparse
import json
import re
import sys
from pathlib import Path

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except (AttributeError, ValueError):
        pass

PLUGIN = Path(__file__).resolve().parent.parent

EMITTERS = ('sgs_emit_responsive_css', 'sgs_responsive_css_rule')

LENGTH_PROP = re.compile(
    r'^(?:(?:min-|max-)?(?:width|height)|(?:row-|column-)?gap|padding(?:-[a-z-]+)?|margin(?:-[a-z-]+)?'
    r'|top|right|bottom|left|inset(?:-[a-z-]+)?|border-radius|border-(?:top|bottom)-(?:left|right)-radius'
    r'|border-width|font-size|letter-spacing|word-spacing|text-indent|flex-basis|outline-offset|scroll-margin(?:-[a-z-]+)?'
    r'|scroll-padding(?:-[a-z-]+)?)$'
)

# (relative path, css property) -> reason the values can never be a bare number.
ALLOW = {
    ('src/blocks/measured-diagram/render.php', 'max-width'): 'tiers come from sgs_measured_diagram_length_tiers(), which sanitises every tier first',
    ('src/blocks/measured-diagram/render.php', 'gap'): 'tiers come from sgs_measured_diagram_length_tiers(), which sanitises every tier first',
    ('src/blocks/modal/render.php', 'max-width'): 'the values are the literal calc() clamp the file builds itself, never a stored number',
    ('includes/product-filter-chips-gap.php', 'gap'): 'every tier is already sanitised by sgs_css_single_length_value() before it reaches the emitter',
}


def strip_comments(src):
    """Blank PHP comments, keeping offsets and newlines, leaving string literals untouched."""
    out = []
    i = 0
    n = len(src)
    while i < n:
        c = src[i]
        two = src[i:i + 2]
        if c in ('"', "'"):
            j = i + 1
            while j < n and src[j] != c:
                j += 2 if src[j] == '\\' else 1
            out.append(src[i:j + 1])
            i = j + 1
        elif two == '/*':
            j = src.find('*/', i + 2)
            j = n if j < 0 else j + 2
            out.append(re.sub(r'[^\n]', ' ', src[i:j]))
            i = j
        elif two == '//' or c == '#':
            if c == '#' and two == '#[':
                out.append(c)
                i += 1
                continue
            j = src.find('\n', i)
            j = n if j < 0 else j
            out.append(' ' * (j - i))
            i = j
        else:
            out.append(c)
            i += 1
    return ''.join(out)


def balanced_end(src, open_idx):
    """Index after the bracket that closes the one at open_idx; -1 when unbalanced."""
    pairs = {'(': ')', '[': ']'}
    stack = []
    i = open_idx
    n = len(src)
    while i < n:
        c = src[i]
        if c in ('"', "'"):
            j = i + 1
            while j < n and src[j] != c:
                j += 2 if src[j] == '\\' else 1
            i = j + 1
            continue
        if c in pairs:
            stack.append(pairs[c])
        elif c in ')]':
            if not stack or stack.pop() != c:
                return -1
            if not stack:
                return i + 1
        i += 1
    return -1


def enclosing_entry(src, pos, lo):
    """Span (start, end) of the array( ... ) / [ ... ] literal that directly holds position pos."""
    depth = 0
    i = pos
    while i > lo:
        i -= 1
        c = src[i]
        if c in ')]':
            depth += 1
        elif c in '([':
            if depth == 0:
                start = i
                if c == '(' and not re.search(r'array\s*$', src[max(lo, i - 12):i]):
                    return None
                end = balanced_end(src, start)
                return (start, end) if end > 0 else None
            depth -= 1
    return None


def scan_source(src):
    """List of findings (css property, line number) for one PHP source string."""
    clean = strip_comments(src)
    findings = []
    for name in EMITTERS:
        for m in re.finditer(r'(?<![\w>:])' + name + r'\s*\(', clean):
            open_idx = m.end() - 1
            end = balanced_end(clean, open_idx)
            if end < 0:
                continue
            body = clean[open_idx:end]
            for cm in re.finditer(r"""['"]css['"]\s*=>\s*['"]([a-z-]+)['"]""", body):
                prop = cm.group(1)
                if not LENGTH_PROP.match(prop):
                    continue
                span = enclosing_entry(body, cm.start(), 0)
                if span is None:
                    continue
                entry = body[span[0]:span[1]]
                if re.search(r"""['"](?:unit_default|transform)['"]\s*=>""", entry):
                    continue
                line = clean.count('\n', 0, open_idx + cm.start()) + 1
                findings.append((prop, line))
    return findings


def targets():
    files = sorted((PLUGIN / 'src' / 'blocks').glob('*/render.php'))
    files += sorted((PLUGIN / 'includes').glob('*.php'))
    return files


def survey():
    found = []
    allowed = []
    for path in targets():
        rel = path.relative_to(PLUGIN).as_posix()
        src = path.read_text(encoding='utf-8', newline='')
        for prop, line in scan_source(src):
            row = {'file': rel, 'line': line, 'css': prop}
            reason = ALLOW.get((rel, prop))
            if reason:
                row['reason'] = reason
                allowed.append(row)
            else:
                found.append(row)
    return found, allowed


FIXTURES = {
    'positive': (
        "<?php\n$css = sgs_emit_responsive_css( '.a', array( array( 'value' => $obj, 'css' => 'min-height' ) ) );\n",
        1,
    ),
    'positive_responsive_rule': (
        "<?php\n$x = sgs_responsive_css_rule( $a, array( array( 'attr' => 'w', 'css' => 'max-width' ) ), '.b' );\n",
        1,
    ),
    'negative_unit_default': (
        "<?php\n$css = sgs_emit_responsive_css( '.a', array( array( 'value' => $o, 'css' => 'gap', 'unit_default' => 'px' ) ) );\n",
        0,
    ),
    'negative_transform': (
        "<?php\n$css = sgs_emit_responsive_css( '.a', array( array( 'value' => $o, 'css' => 'width', "
        "'transform' => static function ( $r ) { return sgs_css_length_value( (string) $r ); } ) ) );\n",
        0,
    ),
    'negative_non_length': (
        "<?php\n$css = sgs_emit_responsive_css( '.a', array( array( 'value' => $o, 'css' => 'justify-content' ), "
        "array( 'value' => $o, 'css' => 'z-index' ), array( 'value' => $o, 'css' => '--sgs-x-width' ) ) );\n",
        0,
    ),
    'negative_commented': (
        "<?php\n// sgs_emit_responsive_css( '.a', array( array( 'css' => 'width' ) ) );\n",
        0,
    ),
    'edge_two_entries': (
        "<?php\n$css = sgs_emit_responsive_css( '.a', array(\n array( 'value' => $o, 'css' => 'padding-top', 'unit_default' => 'px' ),\n"
        " array( 'value' => $p, 'css' => 'margin-top' ),\n) );\n",
        1,
    ),
}


def self_test():
    failures = 0
    for name, (src, expected) in FIXTURES.items():
        got = len(scan_source(src))
        status = 'ok' if got == expected else 'FAIL'
        if got != expected:
            failures += 1
        print(f'  {status:4} {name}: expected {expected}, found {got}')
    # Every ALLOW entry must still point at an existing file.
    for (rel, prop) in ALLOW:
        if not (PLUGIN / rel).exists():
            failures += 1
            print(f'  FAIL allow entry for missing file {rel}')
    print('self-test: ' + ('PASS' if not failures else f'{failures} failure(s)'))
    return 0 if not failures else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    found, allowed = survey()
    if args.survey or not args.check:
        if args.json:
            print(json.dumps({'instances': found, 'allowed': allowed}, indent=2))
        else:
            for row in found:
                print(f"{row['file']}:{row['line']}  css={row['css']}")
            print(f'{len(found)} instance(s), {len(allowed)} allowed')
        return 0
    if found:
        for row in found:
            print(f"{row['file']}:{row['line']}  css={row['css']}  length emitter entry has no unit_default or transform")
        print(f'check-unsanitised-length-emit: {len(found)} instance(s)')
        return 1
    print('check-unsanitised-length-emit: clean')
    return 0


if __name__ == '__main__':
    sys.exit(main())
