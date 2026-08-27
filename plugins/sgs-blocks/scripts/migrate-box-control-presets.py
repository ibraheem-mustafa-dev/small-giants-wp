#!/usr/bin/env python3
"""migrate-box-control-presets.py -- roll the C16 spacing-preset dropdown out from its
`sgs/container` pilot (padding/margin/border-width, D-2026-08-27) onto every other
`<ResponsiveBoxControl>` mount in the plugin.

GROUND-TRUTH: source=file evidence=live-read src/components/SgsBoxControl.js (the
`presets` prop, `true` = full scale / array = restricted subset) + src/components/
ResponsiveBoxControl.js (`presets` forwarded opaquely) + src/blocks/container/edit.js
(the pilot mounts, lines ~613/635/714) + a live census
(`grep -rlE "<ResponsiveBoxControl([^A-Za-z]|$)" */edit.js"` inside src/blocks/ -- 48
files, 104 mounts tree-wide; sgs/container carries 3, already migrated).

WHY A PYTHON TEXT SCAN, NOT THE JS AST DETECTOR'S OWN --json OUTPUT
--------------------------------------------------------------------
`inspector-scan/rules/36-box-control-presets-missing.js` already finds every qualifying
mount (its self-test independently confirms 101 findings). This script does NOT shell out
to `node run.js --json` to consume that list: a live check found `run.js --json` to be
NON-DETERMINISTIC on this machine -- two consecutive runs against an identical tree
returned 21 and 22 of the 24 registered rules respectively, always dropping whichever
rules sit LAST in registration order (a large-single-`console.log`-write race, not
anything in rule 36's own logic -- `node run.js --check`'s human-readable output, and the
rule's own `--self-test`, are both consistently complete and agree at 101). Depending on
that path here would make this script's own results flaky. This script instead walks
`src/blocks/*/edit.js` directly with its own bracket-balanced scan for `<ResponsiveBoxControl`
(exact JSX name -- the plural sibling `<ResponsiveBoxControls>` is a different, unrelated
component and is excluded by the same word-boundary discipline as the JS rule).

WHAT IT DOES
------------
For each qualifying mount, resolves the bound attribute from its `values={ { base: ... } }`
expression, looks up `block_attributes.box_family` (read-only sqlite) for that attribute
(and its Tablet/Mobile siblings, since box_family is sometimes only seeded on the sibling
rows -- see block_attributes for sgs/container.padding, whose OWN row is NULL but whose
`paddingTablet` row carries box_family='padding'), and inserts:
  - `presets={ [ '10', '20', '30' ] }` (theme.json spacing-scale SLUGS for XXS/XS/S --
    SgsBoxControl.js filters by slug, not display name; the display-name form was shipped
    2026-08-27 and silently no-op'd across all 13 affected files -- fixed same day, live-
    verified) when the resolved family is border-width shaped
    (box_family == 'borderWidth' or ends with the literal suffix 'BorderWidth', e.g.
    'ctaBorderWidth', 'splitMediaBorderWidth')
  - bare `presets` (boolean shorthand, matching this codebase's existing style at
    container/edit.js:613) for every other family (padding/margin and all their
    compound siblings -- cardPadding, contentBandPadding, tagPadding, ...)

WHAT IT REFUSES TO DO (refuse, never guess)
--------------------------------------------
* Any mount whose `values=` base expression cannot be resolved to a single identifier by
  one of five known shapes (native `style?.spacing?.{padding,margin}`, `attributes.X`,
  a bare destructured var, or a tiered var accessed as `X?.desktop`/`X?.tier`) is reported
  as a REFUSAL, never guessed at.
* A mount whose self-closing `/>` cannot be located within a bounded scan window (bracket
  depth never returns to 0) is reported as a REFUSAL.
* A mount that already carries a truthy `presets` (bare shorthand, `presets={true}`, or a
  non-empty array literal) is left untouched.

USAGE
-----
    python migrate-box-control-presets.py --survey        # census; writes nothing
    python migrate-box-control-presets.py --fix           # dry run, prints a unified diff
    python migrate-box-control-presets.py --fix --apply   # write
    python migrate-box-control-presets.py --check         # gate: exit 1 if any qualifying mount lacks presets
    python migrate-box-control-presets.py --self-test
"""

import argparse
import difflib
import os
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[3]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
DB_PATH = Path(os.path.expanduser('~/.claude/skills/sgs-wp-engine/sgs-framework.db'))

TAG_RE = re.compile(r'<ResponsiveBoxControl(?![A-Za-z])')
PRESETS_ATTR_RE = re.compile(
    r'\bpresets\b'
    r'(?:\s*=\s*\{\s*'
    r'(?P<expr>true|false|\[[^\]]*\])'
    r'\s*\})?'
)
BASE_KEY_RE = re.compile(r'\bbase\s*:\s*')
RESTRICTED_PRESETS = "presets={ [ '10', '20', '30' ] }"
FULL_PRESETS = 'presets'

# ── Bound-attribute resolution, in priority order (mirrors the shapes verified live
#    across accordion/hero/icon/label/separator/button/multi-button/card-grid/
#    container/edit.js). Accepts BOTH `??` and `||` as the fallback operator -- most
#    mounts use `??`, but card-grid/edit.js:783 uses `cardBorderWidth || {}`. ──
ATTR_PATTERNS = [
    ('native-spacing', re.compile(r'^attributes\.style\?\.spacing\?\.(padding|margin)\b')),
    ('native-spacing-destructured', re.compile(r'^style\?\.spacing\?\.(padding|margin)\b')),
    ('attributes-member', re.compile(r'^attributes\.([A-Za-z_][A-Za-z0-9_]*)\b')),
    ('tiered-var', re.compile(r'^([A-Za-z_][A-Za-z0-9_]*)\?\.')),
    ('bare-var', re.compile(r'^([A-Za-z_][A-Za-z0-9_]*)\s*(?:\?\?|\|\||$)')),
]


def extract_base_expr(tag_text):
    """Depth-aware extraction of the `base:` value expression from a mount's tag text.

    A plain regex terminator like `\\}\\s*\\}` breaks on a value containing its OWN
    balanced braces (e.g. `cardBorderWidth || {}` -- the empty-object literal's own
    closing brace falsely matches a "}\\s*}" terminator before reaching the REAL end of
    the base expression, truncating it to `cardBorderWidth || {`). This walks character
    by character instead, tracking `{`/`(` depth, and stops at the first top-level comma
    or the first unbalanced closing bracket (the enclosing `values={ { ... } }` object's
    own close) -- whichever comes first.
    """
    m = BASE_KEY_RE.search(tag_text)
    if not m:
        return None
    i = m.end()
    depth = 0
    j = i
    n = len(tag_text)
    while j < n:
        ch = tag_text[j]
        if ch in '{(':
            depth += 1
        elif ch in '})':
            if depth == 0:
                break  # the enclosing object/tag's own close -- stop before it
            depth -= 1
        elif ch == ',' and depth == 0:
            break
        j += 1
    return tag_text[i:j].strip()


class Mount:
    def __init__(self, block, file, tag_start, tag_end_exclusive, tag_text, line):
        self.block = block
        self.file = file
        self.tag_start = tag_start
        self.tag_end_exclusive = tag_end_exclusive  # index just past the closing '/>'
        self.tag_text = tag_text
        self.line = line
        self.attr = None
        self.attr_origin = None
        self.family = None
        self.restricted = None
        self.refusal = None
        self.already_ok = False


def find_tag_span(text, start):
    """Bracket-balanced scan from `<ResponsiveBoxControl` to its own self-closing `/>`.

    Returns (end_exclusive) or None if the tag never returns to depth 0 within a bounded
    window (2000 chars -- generous; every real mount in this tree is well under 800).
    """
    depth = 0
    i = start
    limit = min(len(text), start + 2000)
    # Skip past the tag identifier itself so we never match a `/>` before any attribute.
    name_end = start + len('<ResponsiveBoxControl')
    i = name_end
    while i < limit:
        ch = text[i]
        if ch in '{(':
            depth += 1
        elif ch in '})':
            depth -= 1
        elif depth == 0 and text[i:i + 2] == '/>':
            return i + 2
        elif depth == 0 and ch == '>':
            # Non-self-closing element -- not a shape this tree uses for this
            # component; refuse rather than guess at a children-based close.
            return None
        i += 1
    return None


def resolve_attr(base_expr):
    for origin, pat in ATTR_PATTERNS:
        m = pat.match(base_expr.strip())
        if m:
            return origin, m.group(1)
    return None, None


def presets_is_truthy(tag_text):
    m = PRESETS_ATTR_RE.search(tag_text)
    if not m:
        return False
    expr = m.group('expr')
    if expr is None:
        return True  # bare shorthand `presets`
    if expr == 'true':
        return True
    if expr == 'false':
        return False
    if expr.startswith('['):
        inner = expr[1:-1].strip()
        return bool(inner)
    return False


def line_of(text, index):
    return text.count('\n', 0, index) + 1


def scan_file(block_slug, path):
    """Returns a list of Mount objects for every <ResponsiveBoxControl> mount in `path`
    that does not already carry a truthy `presets` -- plus the already-ok ones, so the
    caller can report a full census."""
    text = path.read_text(encoding='utf-8')
    mounts = []
    for m in TAG_RE.finditer(text):
        start = m.start()
        end = find_tag_span(text, start)
        if end is None:
            mounts.append(_unresolved_span(block_slug, path, text, start))
            continue
        tag_text = text[start:end]
        mount = Mount(block_slug, path, start, end, tag_text, line_of(text, start))
        if presets_is_truthy(tag_text):
            mount.already_ok = True
            mounts.append(mount)
            continue
        base_expr = extract_base_expr(tag_text)
        if not base_expr:
            mount.refusal = 'no `values={ { base: ... } }` expression found in the mount'
            mounts.append(mount)
            continue
        origin, attr = resolve_attr(base_expr)
        if not attr:
            mount.refusal = (
                "unresolvable `base:` binding %r -- none of the five known shapes matched"
                % base_expr
            )
            mounts.append(mount)
            continue
        mount.attr = attr
        mount.attr_origin = origin
        mounts.append(mount)
    return mounts


def _unresolved_span(block_slug, path, text, start):
    mount = Mount(block_slug, path, start, None, text[start:start + 80], line_of(text, start))
    mount.refusal = 'could not locate a self-closing `/>` for this mount within the scan window'
    return mount


def open_db_ro():
    if not DB_PATH.exists():
        return None
    return sqlite3.connect('file:%s?mode=ro' % DB_PATH.as_posix(), uri=True)


def resolve_box_family(con, block_slug, attr_name, family_lookup=None):
    """Resolve whether `attr_name` on `block_slug` is border-width shaped.

    `family_lookup` is INJECTABLE for --self-test (a plain dict of
    {(block_slug, candidate_attr_name): box_family}), so the classification logic is
    testable without a live DB connection -- mirrors this repo's standing convention for
    a DB-backed migration's self-test (see migrate-tier-object.py's dbWriter injection
    note in plugins/sgs-blocks/CLAUDE.md).

    Returns True (restricted, border-width) or False (full scale). NEVER raises on a
    missing DB row -- falls back to a name-suffix check, since native `style.spacing.*`
    bindings and freshly-authored attributes are never declared in block_attributes at
    all, and 'the attribute is undeclared' is not evidence that it is a border-width.
    """
    candidates = [attr_name, attr_name + 'Tablet', attr_name + 'Mobile']
    family = None
    if family_lookup is not None:
        for c in candidates:
            v = family_lookup.get((block_slug, c))
            if v:
                family = v
                break
    elif con is not None:
        cur = con.cursor()
        for c in candidates:
            cur.execute(
                'SELECT box_family FROM block_attributes WHERE block_slug=? AND attr_name=? '
                'AND box_family IS NOT NULL LIMIT 1',
                (block_slug, c),
            )
            row = cur.fetchone()
            if row and row[0]:
                family = row[0]
                break
    if family is None:
        # Fallback for undeclared/native bindings: classify by name suffix only.
        family = attr_name
    return family == 'borderWidth' or family.endswith('BorderWidth')


def all_edit_files():
    for block_dir in sorted(BLOCKS_DIR.iterdir()):
        edit_js = block_dir / 'edit.js'
        if not edit_js.is_file():
            continue
        yield 'sgs/%s' % block_dir.name, edit_js


def census(family_lookup=None):
    """Returns (to_fix, already_ok, refusals) -- three lists of Mount."""
    con = None if family_lookup is not None else open_db_ro()
    try:
        to_fix, already_ok, refusals = [], [], []
        for block_slug, path in all_edit_files():
            for mount in scan_file(block_slug, path):
                if mount.refusal:
                    refusals.append(mount)
                    continue
                if mount.already_ok:
                    already_ok.append(mount)
                    continue
                mount.restricted = resolve_box_family(con, block_slug, mount.attr, family_lookup)
                to_fix.append(mount)
        return to_fix, already_ok, refusals
    finally:
        if con is not None:
            con.close()


def insertion_text_for(mount):
    return RESTRICTED_PRESETS if mount.restricted else FULL_PRESETS


def apply_fixes_to_file(path, mounts_in_file, write):
    """mounts_in_file: Mount objects for ONE file, all needing a fix. Returns
    (changed: bool, diff: list[str])."""
    original = path.read_text(encoding='utf-8', newline='')
    lines = original.splitlines(keepends=True)

    # Sort by tag_start DESCENDING so earlier insertions never shift later offsets --
    # but we operate on LINES, not offsets, so sort by line number descending instead.
    ordered = sorted(mounts_in_file, key=lambda m: m.line, reverse=True)
    new_lines = list(lines)
    unresolved_inserts = []
    for mount in ordered:
        tag_line_idx = mount.line - 1  # 0-based
        # The next non-empty line is expected to be the `label=` line (verified live
        # across every real mount in this tree). Refuse rather than guess if it is not.
        if tag_line_idx + 1 >= len(new_lines):
            unresolved_inserts.append(mount)
            continue
        label_line = new_lines[tag_line_idx + 1]
        if 'label=' not in label_line:
            unresolved_inserts.append(mount)
            continue
        indent_match = re.match(r'[ \t]*', label_line)
        indent = indent_match.group(0) if indent_match else ''
        newline = '\r\n' if label_line.endswith('\r\n') else '\n'
        insert_line = '%s%s%s' % (indent, insertion_text_for(mount), newline)
        new_lines.insert(tag_line_idx + 2, insert_line)

    if not write and new_lines == lines:
        return False, [], unresolved_inserts

    # lineterm='\n': the content lines already carry their OWN original line ending
    # (embedded via splitlines(keepends=True)), so only difflib's own control lines
    # (---/+++/@@) need one added here. Printing with ''.join (not '\n'.join, which
    # would double every content line's newline) gives a clean, directly-readable diff --
    # the only artefact Bean, as QC-only, can inspect (Step 4's CLI-contract note).
    diff = list(
        difflib.unified_diff(
            lines, new_lines, fromfile=str(path), tofile=str(path) + ' (fixed)', lineterm='\n'
        )
    )
    if write and diff:
        tmp = path.with_suffix(path.suffix + '.tmp')
        tmp.write_text(''.join(new_lines), encoding='utf-8', newline='')
        os.replace(tmp, path)
    return bool(diff), diff, unresolved_inserts


def cmd_survey():
    to_fix, already_ok, refusals = census()
    by_family = {}
    for m in to_fix:
        key = 'restricted (border-width)' if m.restricted else 'full scale'
        by_family.setdefault(key, []).append(m)
    print('MOUNTS NEEDING presets: %d' % len(to_fix))
    for key, ms in sorted(by_family.items()):
        print('  %s: %d' % (key, len(ms)))
        for m in ms:
            print('    %s:%d  attr=%s (%s)' % (m.block, m.line, m.attr, m.attr_origin))
    print('ALREADY OK: %d' % len(already_ok))
    print('REFUSALS: %d' % len(refusals))
    for m in refusals:
        print('  REFUSED %s:%d -- %s' % (m.block, m.line, m.refusal))
    return 0


def cmd_fix(apply_):
    to_fix, _already_ok, refusals = census()
    by_file = {}
    for m in to_fix:
        by_file.setdefault(m.file, []).append(m)

    changed_files = 0
    total_inserted = 0
    total_unresolved = 0
    for path, mounts in sorted(by_file.items()):
        changed, diff, unresolved = apply_fixes_to_file(path, mounts, apply_)
        total_unresolved += len(unresolved)
        if changed:
            changed_files += 1
            total_inserted += len(mounts) - len(unresolved)
            if not apply_:
                sys.stdout.write(''.join(diff))
        for m in unresolved:
            print('  REFUSED (insert-site) %s:%d -- next line after the opening tag is not '
                  'a `label=` line; refusing to guess where to insert' % (m.block, m.line))

    for m in refusals:
        print('  REFUSED %s:%d -- %s' % (m.block, m.line, m.refusal))

    print(
        '\n%s -- %d file(s), %d mount(s) %s, %d refusal(s)'
        % (
            'APPLIED' if apply_ else 'DRY RUN',
            changed_files,
            total_inserted,
            'fixed' if apply_ else 'would be fixed',
            len(refusals) + total_unresolved,
        )
    )
    if not apply_:
        print('pass --apply to write')
    return 0


def cmd_check():
    to_fix, _already_ok, refusals = census()
    if to_fix or refusals:
        print('FAIL -- %d mount(s) still missing presets, %d refusal(s)' % (len(to_fix), len(refusals)))
        return 1
    print('PASS -- every <ResponsiveBoxControl> mount carries a truthy presets prop')
    return 0


# ── Self-test ────────────────────────────────────────────────────────────────────────

FIXTURE_PADDING_MOUNT = '''\
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						values={ {
							base: attributes.padding ?? {},
							tablet: attributes.paddingTablet ?? {},
							mobile: attributes.paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {} }
					/>
'''

FIXTURE_BORDER_WIDTH_MOUNT = '''\
          <ResponsiveBoxControl
            label={ __( "Border width", "sgs-blocks" ) }
            values={ { base: borderWidth ?? {} } }
            showResponsive={ false }
            onChange={ ( _tier, next ) => setAttributes( { borderWidth: next } ) }
          />
'''

FIXTURE_OR_FALLBACK_BORDER_WIDTH_MOUNT = '''\
					<ResponsiveBoxControl
						label={ __( 'Border width', 'sgs-blocks' ) }
						showResponsive={ false }
						values={ { base: cardBorderWidth || {} } }
						onChange={ ( _tier, next ) =>
							setAttributes( { cardBorderWidth: next } )
						}
					/>
'''

FIXTURE_ALREADY_MIGRATED_MOUNT = '''\
          <ResponsiveBoxControl
            label={ __( "Padding", "sgs-blocks" ) }
            presets
            values={ {
              base: attributes.padding ?? {},
              tablet: attributes.paddingTablet ?? {},
              mobile: attributes.paddingMobile ?? {},
            } }
            onChange={ ( tier, next ) => {} }
          />
'''


def self_test():
    failures = []
    total = [0]

    def check(name, cond):
        total[0] += 1
        if not cond:
            failures.append(name)

    # 1. Padding mount -> full presets, resolved via 'attributes-member'.
    mounts = scan_file('sgs/fixture', _fake_path(FIXTURE_PADDING_MOUNT))
    check('padding mount found', len(mounts) == 1)
    if mounts:
        m = mounts[0]
        check('padding not already-ok', not m.already_ok)
        check('padding attr resolved', m.attr == 'padding')
        check('padding origin', m.attr_origin == 'attributes-member')
        family_lookup = {('sgs/fixture', 'paddingTablet'): 'padding'}
        restricted = resolve_box_family(None, 'sgs/fixture', m.attr, family_lookup)
        check('padding classified full (not restricted)', restricted is False)

    # 2. Border-width mount -> restricted presets, resolved via 'bare-var'.
    mounts = scan_file('sgs/fixture', _fake_path(FIXTURE_BORDER_WIDTH_MOUNT))
    check('border-width mount found', len(mounts) == 1)
    if mounts:
        m = mounts[0]
        check('border-width attr resolved', m.attr == 'borderWidth')
        check('border-width origin', m.attr_origin == 'bare-var')
        family_lookup = {('sgs/fixture', 'borderWidth'): 'borderWidth'}
        restricted = resolve_box_family(None, 'sgs/fixture', m.attr, family_lookup)
        check('border-width classified restricted', restricted is True)
        # Also prove the no-DB-row fallback still classifies correctly by suffix.
        restricted_fallback = resolve_box_family(None, 'sgs/fixture', 'ctaBorderWidth', {})
        check('ctaBorderWidth fallback classified restricted', restricted_fallback is True)
        restricted_fallback2 = resolve_box_family(None, 'sgs/fixture', 'padding', {})
        check('padding fallback classified full', restricted_fallback2 is False)

    # 2b. Regression control for the real card-grid/edit.js:783 shape -- `X || {}`,
    #     which a naive "}\\s*}" terminator truncates to `X || {` (caught live, fixed
    #     by extract_base_expr's depth-aware walk).
    mounts = scan_file('sgs/fixture', _fake_path(FIXTURE_OR_FALLBACK_BORDER_WIDTH_MOUNT))
    check('|| fallback mount found', len(mounts) == 1)
    if mounts:
        m = mounts[0]
        check('|| fallback attr resolved (not truncated)', m.attr == 'cardBorderWidth')
        check('|| fallback origin', m.attr_origin == 'bare-var')

    # 3. Already-migrated mount -> untouched.
    mounts = scan_file('sgs/fixture', _fake_path(FIXTURE_ALREADY_MIGRATED_MOUNT))
    check('already-migrated mount found', len(mounts) == 1)
    if mounts:
        check('already-migrated is already_ok', mounts[0].already_ok is True)

    # 4. presets_is_truthy negative controls.
    check('presets={ false } is falsy', presets_is_truthy('<ResponsiveBoxControl presets={ false } />') is False)
    check('presets={ [] } (empty array) is falsy', presets_is_truthy("<ResponsiveBoxControl presets={ [] } />") is False)
    check('no presets attr at all is falsy', presets_is_truthy('<ResponsiveBoxControl label="x" />') is False)
    check('bare presets is truthy', presets_is_truthy('<ResponsiveBoxControl presets />') is True)
    check("presets={ [ 'XXS' ] } is truthy", presets_is_truthy("<ResponsiveBoxControl presets={ [ 'XXS' ] } />") is True)

    # 5. End-to-end apply on a temp file: padding gets bare `presets`, border-width gets
    #    the restricted array, already-migrated is byte-identical afterwards.
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp) / 'edit.js'
        tmp_path.write_text(FIXTURE_PADDING_MOUNT, encoding='utf-8', newline='')
        mounts = scan_file('sgs/fixture', tmp_path)
        mounts[0].restricted = False
        changed, _diff, unresolved = apply_fixes_to_file(tmp_path, mounts, write=True)
        check('padding apply changed the file', changed)
        check('padding apply had no insert-site refusals', len(unresolved) == 0)
        after = tmp_path.read_text(encoding='utf-8')
        check('padding apply inserted bare presets', re.search(r'^\s*presets\s*$', after, re.MULTILINE) is not None)

        tmp_path2 = Path(tmp) / 'edit2.js'
        tmp_path2.write_text(FIXTURE_BORDER_WIDTH_MOUNT, encoding='utf-8', newline='')
        mounts2 = scan_file('sgs/fixture', tmp_path2)
        mounts2[0].restricted = True
        changed2, _diff2, unresolved2 = apply_fixes_to_file(tmp_path2, mounts2, write=True)
        check('border-width apply changed the file', changed2)
        after2 = tmp_path2.read_text(encoding='utf-8')
        check('border-width apply inserted restricted array', RESTRICTED_PRESETS in after2)

        tmp_path3 = Path(tmp) / 'edit3.js'
        tmp_path3.write_text(FIXTURE_ALREADY_MIGRATED_MOUNT, encoding='utf-8', newline='')
        before3 = tmp_path3.read_text(encoding='utf-8')
        mounts3 = scan_file('sgs/fixture', tmp_path3)
        check('already-migrated fixture has 0 to-fix mounts', all(m.already_ok for m in mounts3))
        # Negative control: nothing to apply, file must be byte-identical.
        to_apply3 = [m for m in mounts3 if not m.already_ok]
        changed3, _diff3, _unresolved3 = apply_fixes_to_file(tmp_path3, to_apply3, write=True)
        after3 = tmp_path3.read_text(encoding='utf-8')
        check('already-migrated file untouched (negative control)', before3 == after3 and not changed3)

    ok = not failures
    print('\nSELF-TEST: %d assertion(s), %d failure(s)' % (total[0], len(failures)))
    for f in failures:
        print('  FAIL: %s' % f)
    print('SELF-TEST %s' % ('PASS' if ok else 'FAIL'))
    return 0 if ok else 1


def _fake_path(content):
    """A Path-like wrapper is overkill here -- scan_file() only calls .read_text() on
    what it's given, so a tiny stand-in object with that one method is sufficient and
    keeps the self-test filesystem-free for the pure-parsing assertions."""
    import tempfile

    tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8')
    tmp.write(content)
    tmp.close()
    return Path(tmp.name)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--survey', action='store_true', help='census; writes nothing')
    ap.add_argument('--fix', action='store_true', help='dry-run diff unless --apply is also given')
    ap.add_argument('--apply', action='store_true', help='actually write (only with --fix)')
    ap.add_argument('--check', action='store_true', help='THE GATE: exit 1 if any qualifying mount lacks presets')
    ap.add_argument('--self-test', action='store_true')
    args = ap.parse_args()

    if args.self_test:
        return self_test()
    if args.check:
        return cmd_check()
    if args.fix:
        return cmd_fix(args.apply)
    if args.survey:
        return cmd_survey()
    ap.error('one of --survey / --fix / --check / --self-test is required')


if __name__ == '__main__':
    sys.exit(main())
