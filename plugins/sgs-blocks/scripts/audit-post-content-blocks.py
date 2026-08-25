#!/usr/bin/env python3
"""Audit stored post_content for SGS blocks that can no longer render their content.

WHY THIS EXISTS
---------------
Two silent content-loss classes, both proven live on the Indus homepage (page 13,
palestine-lives.org, 2026-07-14/15):

  1. STRANDED CONTENT (the D270/D271 hole): a block migrated from scalar content
     attrs to InnerBlocks renders ONLY its children ($content). A post still stored
     in the old self-closing shape renders an empty shell — every word intact in
     wp_posts.post_content, unreadable to the renderer. No error, no failing test.

  2. UNDECLARED ATTRS (the D338 class): a block attribute the block.json does
     not declare is silently DROPPED FROM THE EDITOR (the schema JS builds
     `attributes` from never includes it — the client can't see or edit it),
     but PHP does NOT drop it before render.php runs, so it may render fine
     right now (see check-dead-pattern-attrs.py's module docstring for the
     PHP-vs-JS mechanism). The danger is the FIRST editor save round-trip:
     that re-serialises the block from the JS-side (schema-filtered) state
     and permanently deletes the value from post_content — silent, no error,
     no failing test.

This scanner is READ-ONLY: it takes post_content text (exported via the guard-
sanctioned `wp post get <id> --field=post_content`) and reports findings against
the LOCAL block.json schemas — i.e. the code about to be deployed. Wire it into
the deploy path (build-deploy.py step_oldshape_audit) so a renderer that abandons
a stored shape can never ship silently again (the gate D182 used and D271 skipped).

DETECTION (all schema/source-derived — no hardcoded block lists, R-31-1)
------------------------------------------------------------------------
* undeclared-attr : attr key absent from block.json attributes and not a WP-native
                    / SGS-extension key.
* type-mismatch   : stored attribute value type does not match the declared type
                    (e.g. string "48px" stored for an object-type attr). WP silently
                    substitutes the default on render; the authored value vanishes.
* enum-violation  : stored attribute value is the correct type but not in the
                    declared enum list (e.g. layout:"grid" where enum:["full","split"]).
                    WP silently substitutes the default; the authored value vanishes.
* stranded-content: SELF-CLOSING instance of a block whose save.js emits
                    <InnerBlocks.Content /> (i.e. content is child-rendered) while
                    the instance carries populated content — a `role:"content"`
                    attr, or a declared array attr holding objects (legacy
                    repeater data, e.g. testimonial-slider `testimonials`).
* empty-innerblocks: self-closing InnerBlocks block with no stranded content.
                    Informational (renders empty; may be a deliberate placeholder).

USAGE
-----
  python audit-post-content-blocks.py <file-or-dir> [...] [--check] [--json]
                                      [--baseline <file.json>]

Files are raw post_content dumps (one post per file; the filename is used as the
post label). Directories are scanned for *.txt. `--check` exits 1 if any HIGH
finding exists (gate mode). `--json` emits machine-readable findings on stdout.

`--baseline` points at a JSON file of ACCEPTED findings (documented debt — the
dead-controls-baseline.json pattern): {"accepted": {"<post>|<block>|<type>|<attr>":
"<reason + register ref>"}}. Baselined findings are reported but do not fail
--check; every NEW finding still does. Never dump a fresh casualty into the
baseline instead of migrating it — entries need a register reference.
"""

import json
import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parents[3]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
# The server-side mirror of every JS-registered extension attr, regenerated on
# each build by plugins/sgs-blocks/scripts/generate-extension-attributes.js.
GENERATED_EXT_ATTRS = (
    REPO / 'plugins' / 'sgs-blocks' / 'includes' / 'extension-attributes.generated.php'
)

# Attrs WP accepts on ANY block via supports/global machinery.
NATIVE = {
    'align', 'className', 'style', 'backgroundColor', 'textColor', 'gradient',
    'fontSize', 'fontFamily', 'borderColor', 'lock', 'metadata', 'anchor', 'layout',
    'textAlign',  # WP-native typography.textAlign support (2026-07-25) — else blocks
                  # declaring supports.typography.textAlign false-flag once content sets it.
}
# SGS universal extensions injected server-side.
#
# These two constants are the FALLBACK only. The authoritative list is read from
# includes/extension-attributes.generated.php by _load_extension_attrs() below.
EXT_PREFIXES = ('sgsHideOn', 'sgsAnim')
EXT_EXACT = {'sgsCustomCss'}

# Attr names in the generated server mirror, e.g. "\t'fxStart' => array( ... )".
_GENERATED_ATTR_RE = re.compile(r"^\s*'([A-Za-z][A-Za-z0-9]*)'\s*=>", re.M)


def _load_extension_attrs() -> set:
    """Attr names the SGS extensions register on blocks, from the generated mirror.

    WHY THIS IS READ RATHER THAN HARDCODED (fixed 2026-07-29, Spec 38 Wave A):
    extension attrs are added by JS filters, so they are invisible to a
    block.json-only scan and every one of them looks "undeclared" here. The
    previous hardcoded ('sgsHideOn', 'sgsAnim') + {'sgsCustomCss'} list meant
    each NEW extension silently began raising false HIGH findings against real,
    correct stored content — Spec 38's `fx*` attrs did exactly that, and a HIGH
    here aborts the deploy.

    `includes/extension-attributes.generated.php` is regenerated from the
    extension JS on every build and is already the single source of truth the
    SERVER uses to mirror these attrs (it exists because ServerSideRender
    rejects any attr missing from the server schema). Reading it makes this gate
    self-updating: a new extension attr is recognised the moment it is
    generated, with no list to remember to edit.

    Falls back to the hardcoded constants if the file is absent, so the gate
    keeps working on a fresh clone rather than silently accepting everything.
    """
    if not GENERATED_EXT_ATTRS.exists():
        return set(EXT_EXACT)
    try:
        text = GENERATED_EXT_ATTRS.read_text(encoding='utf-8')
    except OSError:
        return set(EXT_EXACT)
    return set(_GENERATED_ATTR_RE.findall(text)) | set(EXT_EXACT)

OPEN_RE = re.compile(r'<!--\s*wp:(sgs/[\w-]+)(\s+\{)?')


JS_COMMENT_RE = re.compile(r'/\*.*?\*/|//[^\n]*', re.S)


def load_schemas():
    """{block name: {'attrs': {name: def}, 'innerblocks_save': bool, 'render': str}}

    innerblocks_save is checked on COMMENT-STRIPPED save.js — sgs/testimonial's
    save.js mentions InnerBlocks.Content only in its docblock (typed block, v8
    history note) and must not classify as InnerBlocks-rendered.
    """
    out = {}
    for bj in sorted(BLOCKS_DIR.glob('*/block.json')):
        try:
            d = json.loads(bj.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            continue
        if 'name' not in d:
            continue
        save = bj.parent / 'save.js'
        save_code = JS_COMMENT_RE.sub('', save.read_text(encoding='utf-8')) if save.exists() else ''
        render = bj.parent / 'render.php'
        out[d['name']] = {
            'attrs': d.get('attributes', {}),
            'innerblocks_save': 'InnerBlocks.Content' in save_code,
            'render': render.read_text(encoding='utf-8', errors='replace') if render.exists() else '',
        }
    return out


PHP_COMMENT_RE = re.compile(r'/\*.*?\*/|//[^\n]*|#[^\n]*', re.S)


def render_reads(schema, key):
    """True when render.php reads $attributes['key'] — i.e. the attr still renders.

    Comment-stripped and quote-agnostic: a commented-out mention must NOT count as
    a read (it would suppress a genuine stranded-content finding), and PHP accepts
    both $attributes['k'] and $attributes["k"].
    """
    code = PHP_COMMENT_RE.sub('', schema['render'])
    return re.search(r"""\$attributes\[\s*['"]""" + re.escape(key) + r"""['"]\s*\]""", code) is not None


def balanced_json_end(markup, start):
    """Index just past the JSON object opening at `start`, or -1 if unbalanced.

    STRING-AWARE. A naive brace-depth counter miscounts any literal '{' or '}'
    inside a string VALUE — e.g. copy that reads "use the } bracket" — and then
    silently yields attrs={}, which made a real casualty invisible to this scanner
    AND to the migration tool (QC council 2026-07-15, reproduced). Quotes and
    backslash escapes are tracked so only structural braces are counted.
    """
    depth, in_str, esc = 0, False, False
    for i in range(start, len(markup)):
        ch = markup[i]
        if in_str:
            if esc:
                esc = False
            elif ch == '\\':
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return i + 1
    return -1


def harvest_blocks(markup):
    """Yield (slug, attrs, self_closing, line, parse_error) per sgs/* block comment.

    parse_error is non-empty when the attrs JSON could not be read. It is NEVER
    swallowed: an unreadable block is reported as a HIGH finding, because a silent
    attrs={} makes a genuine casualty indistinguishable from a clean block.
    """
    for m in OPEN_RE.finditer(markup):
        slug, attrs, end, parse_error = m.group(1), {}, m.end(), ''
        if m.group(2):
            bs = markup.index('{', m.start())
            je = balanced_json_end(markup, bs)
            if je < 0:
                parse_error = 'attrs JSON never closes (unbalanced braces)'
            else:
                try:
                    attrs = json.loads(markup[bs:je])
                except ValueError as e:
                    parse_error = f'attrs JSON is unreadable: {e}'
                end = je
        self_closing = markup[end:end + 16].lstrip().startswith('/-->')
        line = markup[:m.start()].count('\n') + 1
        yield slug, attrs, self_closing, line, parse_error


def is_legit(key, declared):
    if key in declared or key in NATIVE or key in _extension_attrs():
        return True
    return key.startswith(EXT_PREFIXES)


def _extension_attrs():
    """Cached extension-attr allowlist (see _load_extension_attrs)."""
    if _extension_attrs.cache is None:
        _extension_attrs.cache = _load_extension_attrs()
    return _extension_attrs.cache


_extension_attrs.cache = None


def populated_content(attrs, schema):
    """Names of populated content-bearing attrs on this instance."""
    hits = []
    for key, val in attrs.items():
        spec = schema['attrs'].get(key)
        if spec is None:
            continue
        is_content = spec.get('role') == 'content' and val not in ('', None, [], {})
        is_repeater = (spec.get('type') == 'array' and isinstance(val, list) and val
                       and all(isinstance(v, dict) for v in val))
        # Only stranded if render.php no longer reads the attr (typed blocks like
        # sgs/testimonial read their content attrs directly — that shape is fine).
        if (is_content or is_repeater) and not render_reads(schema, key):
            hits.append(key)
    return hits


def _type_matches(val, wp_type):
    """Check if a Python value matches a WordPress type declaration.

    Type mapping: object→dict, array→list, string→str, number→int/float,
    boolean→bool, integer→int. Check bool BEFORE number/integer, since bool
    is a subclass of int in Python.
    """
    if wp_type == 'boolean':
        return isinstance(val, bool)
    elif wp_type == 'integer':
        return isinstance(val, int) and not isinstance(val, bool)
    elif wp_type == 'number':
        return isinstance(val, (int, float)) and not isinstance(val, bool)
    elif wp_type == 'string':
        return isinstance(val, str)
    elif wp_type == 'array':
        return isinstance(val, list)
    elif wp_type == 'object':
        return isinstance(val, dict)
    return False


def check_attr_type_and_enum(key, stored_val, spec, label, line, block_slug):
    """Yield type-mismatch and enum-violation findings for a single attribute.

    Type mismatch: stored type does not match declared type.
    Enum violation: stored value is correct type but not in enum list.
    Union types (declared type is a list) are legal and checked against all
    permitted types.
    """
    declared_type = spec.get('type')
    if declared_type is None:
        return

    # Handle union types (list of types) — these are legal; skip if matches any
    if isinstance(declared_type, list):
        matches_any = any(_type_matches(stored_val, t) for t in declared_type)
        if not matches_any:
            type_names = ', '.join(str(t) for t in declared_type)
            yield {
                'post': label, 'line': line, 'block': block_slug,
                'type': 'type-mismatch', 'severity': 'HIGH',
                'detail': f'"{key}" stored value type does not match declared union types [{type_names}] — '
                          'WP silently substitutes the default'
            }
        return

    # Single type — check conformance
    type_match = _type_matches(stored_val, declared_type)
    if not type_match:
        yield {
            'post': label, 'line': line, 'block': block_slug,
            'type': 'type-mismatch', 'severity': 'HIGH',
            'detail': f'"{key}" stored value type does not match declared type "{declared_type}" — '
                      'WP silently substitutes the default'
        }
        return

    # Check enum conformance (only if type matches and enum is declared)
    enum_vals = spec.get('enum')
    if enum_vals and stored_val not in enum_vals:
        yield {
            'post': label, 'line': line, 'block': block_slug,
            'type': 'enum-violation', 'severity': 'HIGH',
            'detail': f'"{key}" value "{stored_val}" not in allowed values {enum_vals} — '
                      'WP silently substitutes the default'
        }


def scan_text(label, markup, schemas):
    findings = []
    for slug, attrs, self_closing, line, parse_error in harvest_blocks(markup):
        if parse_error:
            findings.append({'post': label, 'line': line, 'block': slug,
                             'type': 'unparseable-attrs', 'severity': 'HIGH',
                             'detail': f'{parse_error} — this block CANNOT be audited; a '
                                       'casualty here would be invisible. Fix the stored JSON.'})
            continue
        schema = schemas.get(slug)
        if schema is None:
            findings.append({'post': label, 'line': line, 'block': slug,
                             'type': 'unknown-block', 'severity': 'HIGH',
                             'detail': 'no local block.json — renders a deleted-block placeholder'})
            continue
        for key, val in attrs.items():
            if not is_legit(key, schema['attrs']):
                findings.append({'post': label, 'line': line, 'block': slug,
                                 'type': 'undeclared-attr', 'severity': 'HIGH',
                                 'detail': f'"{key}" not declared in block.json — WP discards it; '
                                           'the next editor save DELETES it from post_content'})
            else:
                # Attr is declared; check type and enum conformance
                spec = schema['attrs'].get(key)
                if spec:
                    findings.extend(check_attr_type_and_enum(key, val, spec, label, line, slug))
        if self_closing and schema['innerblocks_save']:
            stranded = populated_content(attrs, schema)
            if stranded:
                findings.append({'post': label, 'line': line, 'block': slug,
                                 'type': 'stranded-content', 'severity': 'HIGH',
                                 'detail': 'old-shape (self-closing, no children) but render is '
                                           f'InnerBlocks-driven — stranded: {", ".join(stranded)}'})
            else:
                findings.append({'post': label, 'line': line, 'block': slug,
                                 'type': 'empty-innerblocks', 'severity': 'INFO',
                                 'detail': 'self-closing InnerBlocks block — renders an empty shell'})
    return findings


def collect_inputs(args):
    files = []
    for a in args:
        p = pathlib.Path(a)
        if p.is_dir():
            files.extend(sorted(q for q in p.rglob('*.txt') if not q.name.startswith('_')))
        elif p.is_file():
            files.append(p)
        else:
            print(f'[audit-post-content] no such path: {a}', file=sys.stderr)
            return None
    return files


def finding_key(x):
    """Stable identity for baselining: post|block|type|attr (line numbers drift)."""
    attr = ''
    if x['type'] in ('undeclared-attr', 'type-mismatch', 'enum-violation'):
        attr = x['detail'].split('"')[1]
    elif x['type'] == 'stranded-content':
        attr = x['detail'].split('stranded: ')[-1]
    return f"{x['post']}|{x['block']}|{x['type']}|{attr}"


def main():
    argv = sys.argv[1:]
    check = '--check' in argv
    as_json = '--json' in argv
    baseline_path = None
    if '--baseline' in argv:
        baseline_path = argv[argv.index('--baseline') + 1]
    skip_next = False
    paths = []
    for i, a in enumerate(argv):
        if skip_next:
            skip_next = False
            continue
        if a == '--baseline':
            skip_next = True
            continue
        if not a.startswith('--'):
            paths.append(a)
    if not paths:
        print(__doc__.strip().splitlines()[0])
        print('usage: audit-post-content-blocks.py <file-or-dir> [...] [--check] [--json] [--baseline <file>]')
        return 2
    files = collect_inputs(paths)
    if files is None:
        return 2
    accepted = {}
    if baseline_path:
        try:
            accepted = json.loads(pathlib.Path(baseline_path).read_text(encoding='utf-8')).get('accepted', {})
        except (OSError, json.JSONDecodeError) as e:
            print(f'[audit-post-content] cannot read baseline {baseline_path}: {e}', file=sys.stderr)
            return 2
    schemas = load_schemas()
    findings = []
    for f in files:
        label = f'{f.parent.name}/{f.stem if f.suffix == ".txt" else f.name}'
        findings.extend(scan_text(label,
                                  f.read_text(encoding='utf-8', errors='replace'), schemas))
    for x in findings:
        x['key'] = finding_key(x)
        x['baselined'] = x['key'] in accepted
    high = [x for x in findings if x['severity'] == 'HIGH' and not x['baselined']]
    baselined = [x for x in findings if x['baselined']]
    if as_json:
        print(json.dumps({'files_scanned': len(files), 'findings': findings,
                          'high': len(high), 'baselined': len(baselined)}, indent=1))
    elif not findings:
        print(f'[audit-post-content] OK — {len(files)} post(s) scanned, no findings.')
    else:
        print(f'[audit-post-content] {len(findings)} finding(s) '
              f'({len(high)} NEW HIGH, {len(baselined)} baselined) across {len(files)} post(s):\n')
        for x in findings:
            if x['baselined']:
                continue
            print(f'  [{x["severity"]}] post {x["post"]} line {x["line"]} — {x["block"]}')
            print(f'      {x["type"]}: {x["detail"]}\n')
        if baselined:
            print(f'  (+{len(baselined)} baselined finding(s) — documented debt, see the baseline file)\n')
        if high:
            print('NEW HIGH findings mean stored content will silently fail to render or be')
            print('deleted on the next editor save. Migrate the stored shape via the block')
            # REPO-ROOT scripts/, not plugins/sgs-blocks/scripts/ — this file lives in
            # the latter, and a bare `scripts/` here has already been read as the
            # wrong one and reported as a missing file. Two dirs share the name.
            print('editor (REPO-ROOT scripts/wp-migrate-oldshape-blocks.js — dry-run by')
            print('default) BEFORE')
            print('deploying, or baseline WITH a register reference if genuinely accepted.')
    return 1 if (check and high) else 0


if __name__ == '__main__':
    sys.exit(main())
