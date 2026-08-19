"""Extract the REQUIRED props (and the __next* opt-ins) from Gutenberg's own
component READMEs, so each golden can state the native contract rather than our
recollection of it.

Input:  a directory of README.md / *.types.ts files fetched by
        fetch-native-control-contracts.sh
Usage:  python scripts/surveys/extract-native-contracts.py /tmp/native-contracts
        python scripts/surveys/extract-native-contracts.py --self-test

⚠ VERSION CAVEAT — carry it into any golden built from this. @wordpress/components
is NOT an npm dependency of this plugin; WordPress supplies it at runtime, so the
governing version is whatever WP ships (7.0.2 on the canary), not package.json.
This reads Gutenberg TRUNK. Required props and the __next* opt-ins are stable
across recent versions, but re-verify against the live editor before gating.

── FORMATS THIS PARSER UNDERSTANDS (found empirically 2026-08-19 across the 17
   fetched components + the 2 types.ts fallbacks — do not add a format without
   a fixture proving it in --self-test) ──

  FORMAT A/B (unified) — a `###`/`####` heading naming one prop, EITHER bare
    (### followed by a backticked prop name) or with the type inline on the
    same heading line (### name, colon, backticked type — used by RangeControl/UnitControl/
    FontSizePicker/DateTimePicker/ColorPalette/TextareaControl), followed by a
    body that contains a `- Required: Yes|No` bullet before the next heading.
    This is what the ORIGINAL parser handled — but only the bare-heading half.
    The name-only regex silently returned zero matches for every component
    using the combined `name: type` heading, which is why 7 of 17 files
    reported 0 required props: not "none required", but "regex didn't match
    the heading shape at all".

  FORMAT C (bullet list, no Required field) — a flat `-   \`propName\` -
    description` list under a `## Properties` heading with NO "Required:"
    marker anywhere (FormTokenField's README is the only one of the 17 that
    does this). There is no requiredness SIGNAL in this format at all — every
    prop name is recorded but flagged `required_unknown: true` rather than
    silently defaulting to not-required. Do not guess from prose.

  FORMAT D (types.ts) — no README exists (ToggleGroupControl,
    BorderBoxControl on trunk as of 2026-08). Parses the exported TS prop
    type for the top-level component (the one whose name matches
    `<ComponentName>Props`, PascalCase from the file's own directory) and
    reads required/optional off the TS `?:` marker.

── FAILURE CONTRACT ──
A component that could not be understood by ANY of the above emits
`"status": "PARSE-FAILED"` with `required/optional/futureFlags: null` — never
a silent empty list. A component that WAS understood but genuinely has zero
required props (or, for FORMAT C, no requiredness signal at all) is
distinguishable in the JSON via `status` + `required_unknown`.
"""
import os
import re
import sys
import json

SRC = None

# ── FORMAT A/B: unified heading regex ───────────────────────────────────────
# Heading is either `### `propName`` (bare) or `### `propName`: `Type`` (type
# inline on the same line). Capture the body up to the next heading of the
# same-or-shallower level range (##-####).
PROP = re.compile(
    r'^#{2,4}[ \t]*`?(?P<name>[A-Za-z_][\w]*)`?'
    r'(?:[ \t]*:[ \t]*`[^\n]*?`)?'   # optional inline `: `Type`` suffix
    r'[ \t]*\n'
    r'(?P<body>(?:(?!^#{2,4}[ \t]).*\n?)*)',
    re.M)
REQUIRED = re.compile(r'^[ \t]*[-*][ \t]*Required:[ \t]*(Yes|No)', re.M | re.I)
TYPE = re.compile(r'^[ \t]*[-*][ \t]*Type:[ \t]*`?([^`\n]+)`?', re.M | re.I)
DEFAULT = re.compile(r'^[ \t]*[-*][ \t]*Default:[ \t]*`?([^`\n]+)`?', re.M | re.I)

PROPS_SECTION = re.compile(r'^#{1,3}[ \t]*(Props|Properties)\b', re.M | re.I)

# ── FORMAT C: flat bullet list, no Required field (FormTokenField shape) ───
# `-   `propName` - description...` (backticked name right after the bullet).
BULLET_PROP = re.compile(
    r'^[ \t]*[-*][ \t]+`(?P<name>[A-Za-z_][\w]*)`[ \t]*-[ \t]*(?P<desc>.*)$',
    re.M)

# ── FORMAT D: types.ts prop-type field ──────────────────────────────────────
# `propName?: Type;` (optional) or `propName: Type;` (required), skipping
# comment lines. Only scans the FIRST top-level `export type <X>Props = ... {
# ... };` block (the component's own primary props type, not a sub-component's
# — e.g. BorderBoxControlProps, not LinkedButtonProps).
TS_PROPS_TYPE = re.compile(
    r'export type (?P<typename>\w*Props)\s*=.*?\{(?P<body>.*?)\n[ \t]*\};',
    re.S)
TS_FIELD = re.compile(
    r'^\s*(?P<name>[A-Za-z_]\w*)(?P<optional>\?)?\s*:\s*',
    re.M)


def _component_name_from_filename(fname):
    # e.g. border-box-control -> BorderBoxControl
    return ''.join(w.capitalize() for w in fname.split('-'))


def parse_readme_md(src):
    """Try FORMAT A/B first (heading-per-prop with Required: marker), then
    FORMAT C (bullet list, no Required marker) as a fallback within a
    confirmed Props/Properties section. Returns (status, required, optional,
    nexts, required_unknown) — status is 'ok', 'ok-no-required-field', or
    'PARSE-FAILED'."""
    has_props_section = bool(PROPS_SECTION.search(src))

    required, optional, nexts = [], [], []
    matched_any_heading_prop = False

    for m in PROP.finditer(src):
        name = m.group('name')
        body = m.group('body') or ''
        req = REQUIRED.search(body)
        # A heading only counts as a genuine prop entry if its body actually
        # carries a Required: marker — otherwise it's a prose subsection
        # (e.g. "### Usage", "#### Labels") that happens to be a single
        # bare word, which is NOT a prop. This is the negative-control
        # discipline: prose headings must not be silently promoted to props.
        if not req:
            continue
        matched_any_heading_prop = True
        typ = TYPE.search(body)
        dflt = DEFAULT.search(body)
        rec = {
            'name': name,
            'type': typ.group(1).strip() if typ else None,
            'default': dflt.group(1).strip() if dflt else None,
        }
        if name.startswith('__next') or name.startswith('__experimental'):
            nexts.append(rec)
        elif req.group(1).lower() == 'yes':
            required.append(rec)
        else:
            optional.append(rec)

    if matched_any_heading_prop:
        return 'ok', required, optional, nexts, False

    # FORMAT A/B found nothing — try FORMAT C inside a confirmed Props section.
    if has_props_section:
        section_start = PROPS_SECTION.search(src).end()
        section = src[section_start:]
        # Stop at the next H1/H2 (## Usage, ## Related components, etc.)
        next_heading = re.search(r'^#{1,2}[ \t]', section, re.M)
        if next_heading:
            section = section[:next_heading.start()]
        bullets = [m.group('name') for m in BULLET_PROP.finditer(section)]
        if bullets:
            names = []
            for n in bullets:
                if n not in names:
                    names.append(n)
            optional = [{'name': n, 'type': None, 'default': None,
                         'required_unknown': True} for n in names]
            return 'ok-no-required-field', [], optional, [], True

    if has_props_section:
        # There IS a Props/Properties section, but neither format matched
        # anything inside it — genuine parse failure, not "zero required".
        return 'PARSE-FAILED', None, None, None, None

    # No Props/Properties heading at all — legitimately nothing to parse
    # (shouldn't happen for the 17 components this script targets, but kept
    # honest rather than assumed-impossible).
    return 'no-props-section', [], [], [], False


def parse_types_ts(src, comp_slug):
    """FORMAT D — a types.ts fallback when no README exists."""
    expected_type = _component_name_from_filename(comp_slug) + 'Props'
    block = None
    for m in TS_PROPS_TYPE.finditer(src):
        if m.group('typename') == expected_type:
            block = m.group('body')
            break
    if block is None:
        # Fall back to the FIRST Props type in the file if the exact
        # expected name isn't found (still deterministic, still logged).
        m = TS_PROPS_TYPE.search(src)
        if m:
            block = m.group('body')
    if block is None:
        return 'PARSE-FAILED', None, None, None

    # Strip block comments (/** ... */) so their prose doesn't get scanned
    # as field lines.
    block_no_comments = re.sub(r'/\*.*?\*/', '', block, flags=re.S)

    required, optional = [], []
    seen = set()
    for m in TS_FIELD.finditer(block_no_comments):
        name = m.group('name')
        if name in seen:
            continue
        seen.add(name)
        rec = {'name': name, 'type': None, 'default': None}
        if m.group('optional'):
            optional.append(rec)
        else:
            required.append(rec)
    return 'ok-types-ts', required, optional, []


def parse(path):
    src = open(path, encoding='utf-8', errors='replace').read()
    if path.endswith('.types.ts'):
        comp_slug = os.path.basename(path)[: -len('.types.ts')]
        status, required, optional, nexts = parse_types_ts(src, comp_slug)
        return status, required, optional, nexts, False
    status, required, optional, nexts, required_unknown = parse_readme_md(src)
    return status, required, optional, nexts, required_unknown


def _component_key(fname):
    if fname.endswith('.types.ts'):
        return fname[: -len('.types.ts')]
    return fname[:-3]  # .md


def main():
    if not os.path.isdir(SRC):
        print('no such directory: %s' % SRC)
        sys.exit(1)
    out = {}
    files = sorted(
        f for f in os.listdir(SRC)
        if f.endswith('.md') or f.endswith('.types.ts')
    )
    print('NATIVE CONTROL CONTRACTS  (Gutenberg trunk — re-verify against WP 7.0.x)')
    print()
    failed = []
    for f in files:
        comp = _component_key(f)
        status, req, opt, nxt, req_unknown = parse(os.path.join(SRC, f))
        out[comp] = {
            'status': status,
            'required': req,
            'optional': opt,
            'futureFlags': nxt,
            'requiredUnknown': req_unknown,
            'source': f,
        }
        if status == 'PARSE-FAILED':
            failed.append(comp)
            print('%-24s PARSE-FAILED (source=%s)' % (comp, f))
            continue
        req_n = len(req) if req is not None else 0
        opt_n = len(opt) if opt is not None else 0
        nxt_n = len(nxt) if nxt is not None else 0
        flag = ' [%s]' % status if status != 'ok' else ''
        print('%-24s required=%-2d optional=%-3d __next/__experimental=%d%s'
              % (comp, req_n, opt_n, nxt_n, flag))
        if req:
            print('     REQUIRED: ' + ', '.join(
                '%s:%s' % (r['name'], (r['type'] or '?')) for r in req))
        if req_unknown and opt:
            print('     PROPS (requiredness NOT stated in source): ' + ', '.join(
                r['name'] for r in opt))
        if nxt:
            print('     OPT-INS : ' + ', '.join(r['name'] for r in nxt))
    with open(os.path.join(SRC, '_contracts.json'), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, indent=2)
    print()
    print('wrote %s' % os.path.join(SRC, '_contracts.json'))
    if failed:
        print()
        print('PARSE-FAILED (%d): %s' % (len(failed), ', '.join(failed)))


# ─────────────────────────────────────────────────────────────────────────
# SELF-TEST — one fixture per format this parser claims to handle, plus a
# negative control (prose section that must yield nothing).
# ─────────────────────────────────────────────────────────────────────────

FIXTURE_FORMAT_A_BARE = """# ExampleControl

## Props

### `value`

The current value.

-   Required: Yes
-   Type: `string`

### `onChange`

Callback.

-   Required: No
-   Default: `undefined`
"""

FIXTURE_FORMAT_B_INLINE_TYPE = """# ExampleControl

## Props

### `value`: `number | string`

Current value.

-   Required: No

### `onChange`: `( value: string ) => void`

A function that receives the new value.

-   Required: Yes

### `rows`: `number`

The number of rows.

-   Required: No
-   Default: 4
"""

FIXTURE_FORMAT_C_BULLET_NO_REQUIRED = """# FormTokenField

## Properties

-   `value` - An array of strings or objects to display as tokens.
-   `onChange` - Function to call when the tokens have changed.
-   `suggestions` - An array of strings to present to the user.

## Usage

```jsx
<FormTokenField />
```
"""

FIXTURE_NEGATIVE_CONTROL_PROSE_ONLY = """# SelectControl

## Design guidelines

### Usage

#### When to use a select control

Use a select control when you want users to select one or more options.
This paragraph is Required: No relation to any real prop — a prose section
must never be promoted to a prop entry just because it contains the words
"Required:" somewhere in its body text; only a genuine `### `propName`` (or
`### `propName`: `Type``) heading immediately followed by a Required bullet
counts.

### Behavior

A SelectControl includes a double-arrow indicator.
"""

FIXTURE_PARSE_FAILED_UNRECOGNISED = """# WeirdControl

## Props

This component's props are documented in a table elsewhere and this README
was generated in some future format this parser has never seen, with no
`### `name`` headings and no bullet list of backticked names at all.

| Prop | Required |
|------|----------|
| value | yes |
"""

FIXTURE_TS_TYPES = """import type { ReactNode } from 'react';

export type ExampleControlProps = ColorProps &
	Pick<
		SomeOtherProps,
		'enableStyle'
	> & {
		/**
		 * Label for the control.
		 */
		label: string;
		/**
		 * Callback when a segment is selected.
		 */
		onChange?: ( value: string | number | undefined ) => void;
		/**
		 * The selected value.
		 */
		value?: string | number;
		children: ReactNode;
	};

export type SiblingButtonProps = {
	isLinked: boolean;
	onClick: () => void;
};
"""


def _assert(cond, msg):
    if not cond:
        print('SELF-TEST FAIL: %s' % msg)
        return False
    return True


def self_test():
    ok = True

    # Format A: bare heading, Required bullet.
    status, req, opt, nxt, req_unknown = parse_readme_md(FIXTURE_FORMAT_A_BARE)
    ok &= _assert(status == 'ok', 'format A status')
    ok &= _assert([r['name'] for r in req] == ['value'], 'format A required=[value]')
    ok &= _assert([r['name'] for r in opt] == ['onChange'], 'format A optional=[onChange]')

    # Format B: heading with inline `: `Type`` — this is the exact shape that
    # silently produced 0 required props for 6 of the 7 broken components.
    status, req, opt, nxt, req_unknown = parse_readme_md(FIXTURE_FORMAT_B_INLINE_TYPE)
    ok &= _assert(status == 'ok', 'format B status')
    ok &= _assert(set(r['name'] for r in req) == {'onChange'}, 'format B required={onChange}')
    ok &= _assert(set(r['name'] for r in opt) == {'value', 'rows'}, 'format B optional={value,rows}')

    # Format C: bullet list, no Required field at all (the true 7th broken
    # component — form-token-field — has NO requiredness signal in source).
    status, req, opt, nxt, req_unknown = parse_readme_md(FIXTURE_FORMAT_C_BULLET_NO_REQUIRED)
    ok &= _assert(status == 'ok-no-required-field', 'format C status flagged, not silent ok')
    ok &= _assert(req == [], 'format C required=[] (no signal, never guessed)')
    ok &= _assert(req_unknown is True, 'format C requiredUnknown=True')
    ok &= _assert(set(r['name'] for r in opt) == {'value', 'onChange', 'suggestions'},
                  'format C props captured despite no Required field')

    # Negative control: prose-only doc, including a paragraph that contains
    # the literal substring "Required: No" inside running prose (not a
    # bullet under a real prop heading) — must yield NOTHING.
    status, req, opt, nxt, req_unknown = parse_readme_md(FIXTURE_NEGATIVE_CONTROL_PROSE_ONLY)
    ok &= _assert(req == [] and opt == [] and nxt == [],
                  'negative control: prose section yields nothing')

    # PARSE-FAILED: a Props section exists but neither format matches inside it.
    status, req, opt, nxt, req_unknown = parse_readme_md(FIXTURE_PARSE_FAILED_UNRECOGNISED)
    ok &= _assert(status == 'PARSE-FAILED', 'unrecognised format reports PARSE-FAILED, not silent 0')
    ok &= _assert(req is None and opt is None, 'PARSE-FAILED carries null, not empty lists')

    # Format D: types.ts fallback (ToggleGroupControl/BorderBoxControl shape).
    status, req, opt, nxt = parse_types_ts(FIXTURE_TS_TYPES, 'example-control')
    ok &= _assert(status == 'ok-types-ts', 'format D status')
    ok &= _assert(set(r['name'] for r in req) == {'label', 'children'}, 'format D required={label,children}')
    ok &= _assert(set(r['name'] for r in opt) == {'onChange', 'value'}, 'format D optional={onChange,value}')
    all_names = {r['name'] for r in req} | {r['name'] for r in opt}
    ok &= _assert('isLinked' not in all_names and 'onClick' not in all_names,
                  'format D: indented-brace close does not leak the SIBLING type\'s fields '
                  '(regression control for the border-box-control bug caught before shipping: '
                  'a bare \\n}; regex matched past the real indented close and merged in '
                  'LinkedButtonProps)')

    if ok:
        print('SELF-TEST: all assertions passed (5 formats: A, B, C, D, negative control; '
              'PARSE-FAILED distinguishability checked)')
        return 0
    print('SELF-TEST: FAILURES ABOVE')
    return 1


if __name__ == '__main__':
    if '--self-test' in sys.argv:
        sys.exit(self_test())
    SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/native-contracts'
    main()
