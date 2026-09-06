#!/usr/bin/env python3
"""Sweep colour-token slugs that no palette defines onto the real token they mean.

WHAT THIS DOES
    A block can ask for a theme colour by SLUG. If no palette defines that slug,
    nothing errors: `sgs_colour_value()` happily emits
    `var(--wp--preset--color--<slug>)`, the browser cannot resolve it, and the
    declaration is dropped. When that rule ALSO out-ranks a base rule carrying a
    hardcoded fallback, the element paints nothing at all.

    That is live today. `border-subtle` is asked for in 23 places across
    src/ + includes/ + the theme, and is defined in NO palette:
    not theme.json, not any style variation, not any client theme-snapshot.

WHY `border` AND NOT `border-light` (evidence, not preference)
    The canary is built from the Mama's Munches draft. That draft defines
        --border-subtle: #E8D5C0
    in mockups/Claude App Design .../mamas-munches-mockup.html:31, and the LATER
    drafts (mockups/homepage/index.html:25) rename that SAME hex to `--border`.
    sites/mamas-munches/theme-extract-trace.json records the tie-break verbatim
    ("name-tiebreak 'border'->border-subtle"), and the live snapshot carries
    `border: #e8d5c0` with no `border-subtle` slug at all.
    `border-light` (#E5E7EB) is the framework's generic grey and was never a
    Mama's colour. So `border-subtle` IS `border`, under its draft-era name.

    ⛔ A stale comment in sgs-card-grid-variations.php:64 claims the slug lives at
    "theme.json line 73". It does not — line 73 is `surface`. Checked before this
    script was written; do not take that comment as evidence it exists.

WHY A SCRIPT AND NOT sed, AND WHY IT REFUSES RATHER THAN GUESSES
    The slug appears in SIX syntactically distinct forms, and in PROSE that must
    survive untouched. Four style.css files mention `border-subtle` only to
    explain why they STOPPED using it (measured contrast fixes, 2026-08-01). A
    blanket find/replace rewrites that history into a lie — it would leave a
    comment saying "border gave 1.32:1 contrast" about a colour never measured.

    So: every match is classified, comment context is excluded structurally
    (not by a "does the line start with //" guess), and any match that does not
    fit a known form is REPORTED and REFUSED, never rewritten.

    python migrate-phantom-colour-token.py --survey | --fix [--apply] | --check | --self-test
"""
import argparse
import json
import os
import re
import sys

PLUGIN_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_ROOT = os.path.dirname(os.path.dirname(PLUGIN_ROOT))
THEME_JSON = os.path.join(REPO_ROOT, 'theme', 'sgs-theme', 'theme.json')

# The one mapping this script owns. slug -> replacement slug.
# Adding a row here is a design decision, not a lint tweak: it must be justified
# by a draft/palette, the way `border-subtle` is in the docblock above.
PHANTOM_TOKENS = {
    'border-subtle': 'border',
}

# Directories swept. Deliberately EXCLUDES build/ (generated), sites/ (client
# artefacts + dated backups, which are history and must not be rewritten) and
# any *.md (documentation states what WAS true).
SCAN_DIRS = [
    os.path.join(PLUGIN_ROOT, 'src'),
    os.path.join(PLUGIN_ROOT, 'includes'),
    os.path.join(REPO_ROOT, 'theme', 'sgs-theme'),
]
SCAN_EXTS = ('.php', '.js', '.jsx', '.json', '.css', '.scss', '.html')
SKIP_DIR_PARTS = (os.sep + 'build' + os.sep, os.sep + 'node_modules' + os.sep,
                  os.sep + 'vendor' + os.sep)

# ---------------------------------------------------------------------------
# Match forms. Each entry is (name, compiled regex with a single `slug` group).
# A match whose slug is a phantom token is a CODE finding; the group is what
# gets rewritten, so surrounding syntax is preserved byte-for-byte.
# ---------------------------------------------------------------------------
def _forms(slug):
    esc = re.escape(slug)
    return [
        # 'border-subtle' / "border-subtle" as a bare quoted slug value.
        ('quoted-slug', re.compile(r"(?P<pre>['\"])(?P<slug>" + esc + r")(?P=pre)")),
        # var( --wp--preset--color--border-subtle )  (CSS + PHP heredoc CSS)
        ('css-var', re.compile(r"(?P<pre>--wp--preset--color--)(?P<slug>" + esc + r")(?P<post>[\s,)])")),
        # var:preset|color|border-subtle   (block-comment attribute syntax)
        ('preset-ref', re.compile(r"(?P<pre>var:preset\|color\|)(?P<slug>" + esc + r")(?P<post>[\"'\s])")),
    ]


COMMENT_SCANNERS = {
    # (block_open, block_close, line_prefixes)
    '.php':  (('/*',), ('*/',), ('//', '#')),
    '.js':   (('/*',), ('*/',), ('//',)),
    '.jsx':  (('/*',), ('*/',), ('//',)),
    '.css':  (('/*',), ('*/',), ()),
    '.scss': (('/*',), ('*/',), ('//',)),
    '.html': (('<!--',), ('-->',), ()),
    '.json': ((), (), ()),   # JSON has no comments
}


def comment_spans(text, ext):
    """Return a list of (start, end) character spans that are COMMENTS.

    Structural, not a line-prefix guess. This is the load-bearing half of the
    script: `.html` and theme `.php` patterns carry live block markup INSIDE
    `<!-- ... -->`, so an HTML comment is NOT treated as prose there — see
    `html_comment_is_code` below.
    """
    opens, closes, line_prefixes = COMMENT_SCANNERS.get(ext, ((), (), ()))
    spans = []
    for o, c in zip(opens, closes):
        idx = 0
        while True:
            s = text.find(o, idx)
            if s == -1:
                break
            e = text.find(c, s + len(o))
            e = len(text) if e == -1 else e + len(c)
            spans.append((s, e))
            idx = e
    for p in line_prefixes:
        idx = 0
        while True:
            s = text.find(p, idx)
            if s == -1:
                break
            e = text.find('\n', s)
            e = len(text) if e == -1 else e
            spans.append((s, e))
            idx = e
    return spans


def html_comment_is_code(text, span):
    """A WordPress block delimiter lives inside an HTML comment but IS code.

    `<!-- wp:sgs/site-footer-row {...} -->` is parsed by WordPress and its JSON
    attributes reach render.php. Treating it as prose would silently skip the
    three footer patterns, which are the whole reason the footer divider is
    invisible.
    """
    return re.match(r'<!--\s*/?\s*wp:', text[span[0]:span[0] + 40]) is not None


def in_comment(pos, spans, text, ext):
    for span in spans:
        if span[0] <= pos < span[1]:
            if ext in ('.html', '.php') and text[span[0]:span[0] + 4] == '<!--':
                if html_comment_is_code(text, span):
                    return False
            return True
    return False


def iter_files():
    for base in SCAN_DIRS:
        for dirpath, _dirnames, filenames in os.walk(base):
            padded = dirpath + os.sep
            if any(p in padded for p in SKIP_DIR_PARTS):
                continue
            for fn in sorted(filenames):
                if fn.endswith(SCAN_EXTS):
                    yield os.path.join(dirpath, fn)


def scan_text(text, ext, slug):
    """Yield (form, start, end, is_comment, line_no) for every slug occurrence."""
    spans = comment_spans(text, ext)
    seen = set()
    for form, rx in _forms(slug):
        for m in rx.finditer(text):
            s, e = m.span('slug')
            if (s, e) in seen:
                continue
            seen.add((s, e))
            yield (form, s, e, in_comment(s, spans, text, ext),
                   text.count('\n', 0, s) + 1)
    # Anything left over — the slug present in a shape none of the forms
    # recognised. Reported, never rewritten.
    for m in re.finditer(re.escape(slug), text):
        s, e = m.span()
        if (s, e) in seen:
            continue
        seen.add((s, e))
        yield ('UNRECOGNISED', s, e, in_comment(s, spans, text, ext),
               text.count('\n', 0, s) + 1)


def palette_slugs():
    """Every colour slug the theme actually defines. Fails closed."""
    with open(THEME_JSON, encoding='utf-8') as fh:
        data = json.load(fh)
    slugs = {p['slug'] for p in data['settings']['color']['palette']}
    variations = os.path.join(REPO_ROOT, 'theme', 'sgs-theme', 'styles')
    if os.path.isdir(variations):
        for fn in sorted(os.listdir(variations)):
            if not fn.endswith('.json'):
                continue
            with open(os.path.join(variations, fn), encoding='utf-8') as fh:
                v = json.load(fh)
            for p in (v.get('settings', {}).get('color', {}).get('palette') or []):
                if isinstance(p, dict) and 'slug' in p:
                    slugs.add(p['slug'])
    return slugs


def collect():
    """Return (code_findings, comment_findings, unrecognised)."""
    code, comments, unknown = [], [], []
    for path in iter_files():
        ext = os.path.splitext(path)[1]
        # ⛔ newline='' IS LOAD-BEARING, not tidiness. Python's default universal
        # newlines collapses CRLF to LF, so every offset computed here would be
        # one byte short per preceding CRLF once rewrite_file() (which must
        # preserve CRLF) re-reads the real bytes. Measured: with the default
        # mode this corrupted star-rating/block.json, turning
        #   "starColour": {\r\n\t\t\t"type": "string",
        # into
        #   "starColoborderype": "string",
        # because the drift had accumulated to ~24 bytes by line 117. Both reads
        # MUST use the same newline mode. The self-test asserts this.
        try:
            with open(path, encoding='utf-8', newline='') as fh:
                text = fh.read()
        except (UnicodeDecodeError, OSError):
            continue
        for slug in PHANTOM_TOKENS:
            if slug not in text:
                continue
            for form, s, e, is_comment, line in scan_text(text, ext, slug):
                rel = os.path.relpath(path, REPO_ROOT).replace(os.sep, '/')
                rec = {'file': rel, 'line': line, 'form': form, 'slug': slug,
                       'path': path, 'start': s, 'end': e}
                # Comment status is tested FIRST and deliberately. Prose rarely
                # matches a code form, so ordering these the other way round
                # files every comment mention as "unrecognised" and makes --fix
                # refuse a tree that is actually clean.
                if is_comment:
                    comments.append(rec)
                elif form == 'UNRECOGNISED':
                    unknown.append(rec)
                else:
                    code.append(rec)
    return code, comments, unknown


def rewrite_file(path, findings):
    """Rewrite only the `slug` spans, right-to-left so offsets stay valid."""
    with open(path, encoding='utf-8', newline='') as fh:
        text = fh.read()
    for rec in sorted(findings, key=lambda r: r['start'], reverse=True):
        text = text[:rec['start']] + PHANTOM_TOKENS[rec['slug']] + text[rec['end']:]
    with open(path, 'w', encoding='utf-8', newline='') as fh:
        fh.write(text)


# ---------------------------------------------------------------------------
# Modes
# ---------------------------------------------------------------------------
def cmd_survey():
    defined = palette_slugs()
    print('Palette slugs defined by the theme: %d' % len(defined))
    for slug, target in PHANTOM_TOKENS.items():
        state = 'DEFINED (not phantom!)' if slug in defined else 'NOT DEFINED - phantom'
        tgt = 'DEFINED' if target in defined else 'MISSING - refusing'
        print('  %-16s %-24s ->  %-12s %s' % (slug, state, target, tgt))
    code, comments, unknown = collect()
    print('\nCODE occurrences (will be rewritten): %d' % len(code))
    for r in code:
        print('  %-70s :%-5d %s' % (r['file'], r['line'], r['form']))
    print('\nCOMMENT occurrences (left verbatim): %d' % len(comments))
    for r in comments:
        print('  %-70s :%-5d' % (r['file'], r['line']))
    print('\nUNRECOGNISED shapes (refused): %d' % len(unknown))
    for r in unknown:
        print('  %-70s :%-5d' % (r['file'], r['line']))
    return 0


def cmd_fix(apply_it):
    defined = palette_slugs()
    for slug, target in PHANTOM_TOKENS.items():
        if target not in defined:
            print('REFUSING: replacement token %r is not in the palette either.' % target)
            return 1
        if slug in defined:
            print('REFUSING: %r IS defined in the palette - it is not phantom.' % slug)
            return 1
    code, comments, unknown = collect()
    if unknown:
        print('REFUSING: %d occurrence(s) in an unrecognised shape. Classify them '
              'first - a blind rewrite is how prose gets corrupted.' % len(unknown))
        for r in unknown:
            print('  %s:%d' % (r['file'], r['line']))
        return 1
    by_file = {}
    for r in code:
        by_file.setdefault(r['path'], []).append(r)
    print('%s %d occurrence(s) across %d file(s); leaving %d comment mention(s).'
          % ('Rewriting' if apply_it else 'Would rewrite', len(code), len(by_file),
             len(comments)))
    for path, findings in sorted(by_file.items()):
        rel = os.path.relpath(path, REPO_ROOT).replace(os.sep, '/')
        print('  %-70s %d' % (rel, len(findings)))
        if apply_it:
            rewrite_file(path, findings)
    if not apply_it:
        print('\nDry run. Re-run with --apply to write.')
    return 0


def cmd_check():
    code, _comments, unknown = collect()
    if not code and not unknown:
        print('OK: no phantom colour token in code.')
        return 0
    for r in code + unknown:
        print('FAIL %s:%d  %r is not defined in any palette (%s)'
              % (r['file'], r['line'], r['slug'], r['form']))
    return 1


# ---------------------------------------------------------------------------
# Self-test. The negative controls are the point: a comment-only mention and a
# real, DEFINED token must both survive untouched.
# ---------------------------------------------------------------------------
def cmd_selftest():
    fails = []

    def ok(label, cond):
        print(('  PASS  ' if cond else '  FAIL  ') + label)
        if not cond:
            fails.append(label)

    print('Self-test: comment detection')
    php = "<?php\n// border-subtle was measured at 1.32:1\n$c = 'border-subtle';\n"
    got = list(scan_text(php, '.php', 'border-subtle'))
    line2 = [r for r in got if r[4] == 2]
    line3 = [r for r in got if r[4] == 3]
    ok('line comment classified as comment',
       len(line2) == 1 and line2[0][3] is True)
    ok('code assignment classified as code',
       len(line3) == 1 and line3[0][3] is False and line3[0][0] == 'quoted-slug')

    css = "/*\n * previous hardcoded border-subtle gave 1.32:1 contrast\n */\n"
    got = list(scan_text(css, '.css', 'border-subtle'))
    ok('NEGATIVE CONTROL: block-comment prose is never code',
       len(got) >= 1 and all(r[3] for r in got))

    print('Self-test: WordPress block delimiter is CODE, not prose')
    html = ('<!-- wp:sgs/site-footer-row {"style":{"border":{"top":'
            '{"color":"var:preset|color|border-subtle","width":"1px"}}}} -->\n')
    got = list(scan_text(html, '.php', 'border-subtle'))
    ok('wp: delimiter inside <!-- --> is code',
       len(got) == 1 and not got[0][3] and got[0][0] == 'preset-ref')

    plain = '<!-- border-subtle is a nice colour -->\n'
    got = list(scan_text(plain, '.html', 'border-subtle'))
    ok('NEGATIVE CONTROL: a plain HTML comment is prose',
       len(got) == 1 and got[0][3])

    print('Self-test: rewrite preserves surrounding syntax')
    scss = '\t--sgs-connector-colour: var(--wp--preset--color--border-subtle, #0d5557);\n'
    recs = [{'start': s, 'end': e, 'slug': 'border-subtle'}
            for f, s, e, c, _l in scan_text(scss, '.scss', 'border-subtle') if not c]
    out = scss
    for r in sorted(recs, key=lambda r: r['start'], reverse=True):
        out = out[:r['start']] + 'border' + out[r['end']:]
    ok('css-var rewritten, fallback + tab + semicolon intact',
       out == '\t--sgs-connector-colour: var(--wp--preset--color--border, #0d5557);\n')

    jsonl = '\t\t\t"default": "border-subtle"\n'
    recs = [(s, e) for f, s, e, c, _l in scan_text(jsonl, '.json', 'border-subtle') if not c]
    out = jsonl
    for s, e in sorted(recs, reverse=True):
        out = out[:s] + 'border' + out[e:]
    ok('json default rewritten, quotes + indent intact',
       out == '\t\t\t"default": "border"\n')

    print('Self-test: unrecognised shapes are refused, not guessed')
    weird = "<?php\n$x = str_replace('border', 'subtle', 'border-subtle-ish');\n"
    got = list(scan_text(weird, '.php', 'border-subtle'))
    ok('a slug embedded in a longer token is not a quoted-slug match',
       all(r[0] != 'quoted-slug' for r in got))

    print('Self-test: CRLF offsets (the bug that corrupted a real file)')
    # An offset computed on LF-normalised text, applied to CRLF bytes, drifts one
    # byte per preceding line. Two CRLF lines before the match is enough to prove
    # it: an off-by-two rewrite eats the closing quote.
    crlf = '{\r\n\t"a": "x",\r\n\t"b": "border-subtle"\r\n}\r\n'
    recs = [(s, e) for f, s, e, c, _l in scan_text(crlf, '.json', 'border-subtle')
            if not c]
    out = crlf
    for s, e in sorted(recs, reverse=True):
        out = out[:s] + 'border' + out[e:]
    ok('CRLF file rewrites cleanly and keeps its line endings',
       out == '{\r\n\t"a": "x",\r\n\t"b": "border"\r\n}\r\n')
    lf = crlf.replace('\r\n', '\n')
    recs_lf = [(s, e) for f, s, e, c, _l in scan_text(lf, '.json', 'border-subtle')
               if not c]
    ok('NEGATIVE CONTROL: CRLF offsets differ from LF offsets, so the two read '
       'modes are not interchangeable',
       len(recs) == 1 and len(recs_lf) == 1 and recs[0][0] != recs_lf[0][0])

    print('Self-test: palette read is real and fails closed')
    try:
        slugs = palette_slugs()
        ok('theme palette parsed', len(slugs) > 10)
        ok('NEGATIVE CONTROL: `border` really is defined', 'border' in slugs)
        ok('`border-subtle` really is NOT defined', 'border-subtle' not in slugs)
    except Exception as exc:                      # noqa: BLE001
        ok('theme palette parsed (%s)' % exc, False)

    print('\n%d assertion(s) failed.' % len(fails) if fails else '\nAll assertions passed.')
    return 1 if fails else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--survey', action='store_true')
    g.add_argument('--fix', action='store_true')
    g.add_argument('--check', action='store_true')
    g.add_argument('--self-test', dest='selftest', action='store_true')
    ap.add_argument('--apply', action='store_true', help='with --fix, write the files')
    args = ap.parse_args()
    if args.survey:
        return cmd_survey()
    if args.fix:
        return cmd_fix(args.apply)
    if args.check:
        return cmd_check()
    return cmd_selftest()


if __name__ == '__main__':
    sys.exit(main())
