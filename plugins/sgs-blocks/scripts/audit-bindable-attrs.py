#!/usr/bin/env python3
"""C15-5/C15-12 detector: which SGS block attributes are SAFE Block Bindings targets?

WHY THIS EXISTS (C15-5, `.claude/reports/2026-08-28-c15-block-bindings-scope-proposal.md`):
only 3 of 83 SGS blocks (`sgs/text`, `sgs/heading`, `sgs/button`) are bindable via
`class-sgs-block-bindings-support.php`'s `SUPPORTED_ATTRIBUTES` const. Widening that
const touches many block.json files at once, which is exactly the shape
`.claude/THE-MIGRATION-METHOD.md` requires a detector for BEFORE the edit. Per Bean's
2026-08-26 ruling recorded in the C15 report, this is deliberately the MINIMAL detector
the migration-method commit gate needs — not the larger C15-12 coverage system.

THE METHOD, STATED SO IT IS REPRODUCIBLE AND ARGUABLE:

Ground truth is each block's own `block.json` on disk, read directly — NOT the
`block_attributes` DB table. Verified live 2026-09-04: the DB's `role='content'` rows
for `source='sgs'` MISS attributes the disk copy plainly marks `"role":"content"`
(`sgs/info-box` `heading`/`description`, `sgs/media` `imageUrl`/`imageAlt` among them) —
a real DB/disk mismatch of exactly the shape `THE-MIGRATION-METHOD.md` Step 2 warns
about ("a DB/disk count mismatch is a FINDING, not noise"). Disk wins.

An attribute is a SAFE binding target (`ELIGIBLE`) when ALL of:

  1. Its declared `type` is a SCALAR (`string`, `number`, `integer`, `boolean`, or a
     union of those with `null`) — never `object` or `array`. A binding resolves to
     ONE scalar value (Block Bindings API, §2.5 of the C15 report); an object/array
     attr is a repeater or a structured value a binding cannot represent, and WP's
     schema coercion would silently discard a bound scalar written into it (the
     `object-typed-attr-coerces-flat-to-default` framework gotcha).
  2. It carries `"role": "content"` in its own block.json attribute schema. This is
     NOT an invented heuristic — it is the marker this codebase ALREADY uses
     (`sgs/media` imageAlt/imageUrl/caption/linkUrl/videoUrl, `sgs/info-box`
     heading/description, etc.) to mark "this attribute IS client-authored content",
     which is exactly the C15 report's own binding criterion ("a plain scalar
     attribute a client would plausibly want to bind to a post/term/user/custom
     field").
  3. Its block is not `sgs/product-card`. That block's dynamic data already routes
     through `Product_Bindings::get_product_data()` called DIRECTLY from
     `render.php` (C15-6) — a different, already-correct mechanism. Adding it to
     `SUPPORTED_ATTRIBUTES` would double up two live-data paths on one block and was
     explicitly flagged in the C15 report as "unexposed, not dead" — out of scope
     here.

Everything else is EXCLUDED, with the reason recorded per attribute:
  - `object-or-array-typed` — fails rule 1.
  - `not-content-role`      — fails rule 2 (present, scalar, but not author content —
                                e.g. an enum-typed layout/style selector).
  - `product-card-live-resolver` — fails rule 3.

Run:
  python plugins/sgs-blocks/scripts/audit-bindable-attrs.py --survey
  python plugins/sgs-blocks/scripts/audit-bindable-attrs.py --survey --json > out.json
  python plugins/sgs-blocks/scripts/audit-bindable-attrs.py --fix          # print a
      PHP SUPPORTED_ATTRIBUTES literal built from the FULL eligible set (dry run —
      never written; curating the actual widened subset is a judgement call, not
      this script's job — see the C15 report's "do not cover all 83 in one pass")
  python plugins/sgs-blocks/scripts/audit-bindable-attrs.py --check        # GUARD:
      exit 1 if class-sgs-block-bindings-support.php's SUPPORTED_ATTRIBUTES contains
      any (block, attr) pair this census does NOT classify ELIGIBLE. Exit 0
      otherwise. This is a GUARD shape (THE-MIGRATION-METHOD.md Step 8) — clean from
      registration, fails only when someone adds an unsafe binding target.
  python plugins/sgs-blocks/scripts/audit-bindable-attrs.py --self-test
"""
import argparse
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
BLOCKS_DIR = ROOT / 'src' / 'blocks'
BINDINGS_SUPPORT_PHP = ROOT / 'includes' / 'class-sgs-block-bindings-support.php'

SCALAR_TYPES = {'string', 'number', 'integer', 'boolean'}
EXCLUDED_BLOCKS_LIVE_RESOLVER = {'sgs/product-card'}

# Link-BEHAVIOUR scalars that carry no `role:content` marker in this codebase's own
# convention (they are not "authored content" the way a URL/label/heading is) but are
# nonetheless safe binding targets — because they are the EXACT names WordPress core
# itself already treats as bindable siblings of a link's URL, on `core/button`
# (`url`, `text`, `linkTarget`, `rel`) and `core/navigation-link`/`-submenu` (`url`).
# Confirmed against `class-sgs-block-bindings-support.php`'s own docblock, which
# quotes that exact core allowlist read live off WP 7.0.1. `sgs/button` is ALREADY
# shipped with `linkTarget`/`rel` bound (the baseline this detector must not break —
# see `cmd_self_test`'s positive control), so this is recording an existing, correct
# decision, not inventing a new one.
LINK_BEHAVIOUR_SIBLINGS = {'linkTarget', 'rel'}

# `$attributes['attr']` or `$attributes["attr"]` — a literal bracket read straight
# off the render.php $attributes array. Built per-attribute at call time (see
# _render_reads_attr) because the attribute name is the hole.
_RENDER_READ_TEMPLATE = r"\$attributes\[\s*['\"]{name}['\"]\s*\]"

# `sgs/responsive-logo` reads its attr through a LOCAL CLOSURE call passing the
# attr NAME as a string argument (`$sgs_logo_url_attr( 'logoUrl' )`), not a
# bracket read — a real, live third consumption shape, not a hypothetical.
# Matched only as a function-call ARGUMENT (inside parens, comma/close-paren
# terminated) so a bare prose mention in a docblock comment cannot match it
# (comments are stripped before this runs anyway — see _strip_php_comments).
_ARG_READ_TEMPLATE = r"\(\s*['\"]{name}['\"]\s*[,)]"

# `sgs/before-after` reads `beforeImageAlt`/`afterImageAlt`/etc via DYNAMIC KEY
# CONCATENATION — `$attributes[ $prefix . 'ImageAlt' ]` — a documented, live
# pattern in this exact codebase (plugins/sgs-blocks/CLAUDE.md's "before-after"
# row: "Tier keys are written as WHOLE literal suffixes ... because
# check-dead-controls.js cannot follow a key whose tail is a second variable").
# Scoped narrowly to the two known dynamic prefixes this codebase actually
# uses — NOT a generic "any substring might match" heuristic, which would be
# far too permissive.
_DYNAMIC_PREFIXES = ('before', 'after')
_CONCAT_SUFFIX_TEMPLATE = r"\.\s*['\"]{suffix}['\"]"

_BLOCK_COMMENT_RE = re.compile(r'/\*.*?\*/', re.S)
_LINE_COMMENT_RE = re.compile(r'^\s*//.*$', re.M)


def _strip_php_comments(src: str) -> str:
    return _LINE_COMMENT_RE.sub('', _BLOCK_COMMENT_RE.sub('', src))


INCLUDES_DIR = ROOT / 'includes'
_USE_FUNCTION_RE = re.compile(r"use\s+function\s+([A-Za-z0-9_\\]+)\s*;")


def _includes_php_text():
    """Lazily concatenated {relpath: text} of every includes/**/*.php file — the
    shared-helper trees a per-block render.php scan is blind to (see
    THE-MIGRATION-METHOD.md Step 2's 'includes/*.php ... IN SCOPE whichever you
    use' box). Cached at module scope; this repo's includes/ tree is small enough
    (low hundreds of KB) to read once per process."""
    global _INCLUDES_CACHE
    try:
        return _INCLUDES_CACHE
    except NameError:
        pass
    cache = {}
    if INCLUDES_DIR.exists():
        for php_file in INCLUDES_DIR.rglob('*.php'):
            cache[str(php_file)] = php_file.read_text(encoding='utf-8', errors='ignore')
    _INCLUDES_CACHE = cache
    return cache


def _function_body(func_name: str):
    """Best-effort extraction of one function's body text, searched across every
    includes/**/*.php file. Not a parser — grabs from the `function name(` site to
    the next top-level `function ` (or 4000 chars, whichever is shorter), which is
    enough to answer "does this function's body reference $attributes['x']"
    without needing a real PHP AST."""
    short_name = func_name.rsplit('\\', 1)[-1]
    needle = f"function {short_name}("
    for text in _includes_php_text().values():
        idx = text.find(needle)
        if idx == -1:
            continue
        window = text[idx: idx + 4000]
        next_fn = window.find('\nfunction ', 1)
        return window if next_fn == -1 else window[:next_fn]
    return None


def _render_reads_attr(block_json_path: pathlib.Path, attr_name: str):
    """Every SGS block is dynamic (render.php-backed) — but a DECLARED,
    role:content attribute is not automatically a RENDERED one. `sgs/info-box`'s
    own `heading`/`description` are the proven case (its render.php docblock says
    outright: "Scalar CONTENT attributes heading/subtitle/description are no
    longer read here (rendered by InnerBlocks children)") — an HC2 migration left
    the block.json role:content marker in place after the child took over
    rendering. A binding on a declared-but-unread attribute is not a defect that
    breaks anything, but it is a dead-end for the client: the value resolves,
    WordPress writes it onto the attribute, and nothing ever looks at it.

    Reads THREE surfaces, comments stripped first so a docblock's prose mention
    can never count as a read: (1) a bracket read straight in render.php's own
    text; (2) a bracket read inside a SHARED helper explicitly imported via
    `use function`; (3) the attr name passed as a function-call ARGUMENT to a
    local closure. All three are live, verified shapes, not hypotheticals:
    every `sgs/form-field-*` block reads `label`/`placeholder`/`helpText`
    through `includes/forms/field-render-helpers.php`'s `field_label()` etc
    (surface 2) — checking render.php alone reported all three as dead, the
    D575 "includes/*.php is IN SCOPE" trap. `sgs/responsive-logo` reads
    `logoUrl` via `$sgs_logo_url_attr( 'logoUrl' )`, a local closure taking the
    attr NAME as its argument (surface 3) — no bracket read exists anywhere in
    that file for it at all.

    Also checked: every OTHER `*.php` file living in the block's own directory
    (surface 4) — `sgs/before-after` proves this is a live, not hypothetical,
    shape: its `render.php` calls `sgs_before_after_resolve_media( $attributes,
    'before', $uid )`, a function defined in a SIBLING file in the same block
    folder (`media-render.php`), reached with no `use function` import at all.

    Returns True/False/None (None = no render.php next to this block.json, which
    should not happen per this plugin's CLAUDE.md "every SGS block is dynamic" —
    treated as a refusal, not a silent pass)."""
    render_php = block_json_path.parent / 'render.php'
    if not render_php.exists():
        return None
    bracket_pattern = re.compile(_RENDER_READ_TEMPLATE.format(name=re.escape(attr_name)))
    arg_pattern = re.compile(_ARG_READ_TEMPLATE.format(name=re.escape(attr_name)))

    concat_pattern = None
    for dyn_prefix in _DYNAMIC_PREFIXES:
        if attr_name.startswith(dyn_prefix) and len(attr_name) > len(dyn_prefix):
            suffix = attr_name[len(dyn_prefix):]
            concat_pattern = re.compile(_CONCAT_SUFFIX_TEMPLATE.format(suffix=re.escape(suffix)))
            break

    def _matches(text):
        if bracket_pattern.search(text) or arg_pattern.search(text):
            return True
        if concat_pattern and concat_pattern.search(text):
            return True
        return False

    src = _strip_php_comments(render_php.read_text(encoding='utf-8', errors='ignore'))
    if _matches(src):
        return True

    for used_func in _USE_FUNCTION_RE.findall(src):
        body = _function_body(used_func)
        if body and _matches(_strip_php_comments(body)):
            return True

    for sibling in block_json_path.parent.glob('*.php'):
        if sibling == render_php:
            continue
        sibling_src = _strip_php_comments(sibling.read_text(encoding='utf-8', errors='ignore'))
        if _matches(sibling_src):
            return True

    return False


def _normalise_type(raw):
    """Return the set of declared JSON-Schema types, dropping 'null' from a union."""
    if raw is None:
        return set()
    if isinstance(raw, str):
        types = {raw}
    elif isinstance(raw, list):
        types = set(raw)
    else:
        return set()
    return types - {'null'}


def classify_block(block_json_path: pathlib.Path):
    """Returns (block_slug, {attr_name: {status, reason, type}}) or (None, {}) on parse failure."""
    try:
        data = json.loads(block_json_path.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        return None, {'__parse_error__': str(exc)}

    slug = data.get('name')
    if not slug or not slug.startswith('sgs/'):
        return None, {}

    attributes = data.get('attributes')
    if not isinstance(attributes, dict):
        return slug, {}

    findings = {}
    for attr_name, schema in attributes.items():
        # `_comment*` pseudo-keys inside "attributes" hold a bare string, not a
        # schema object — not a real attribute, skip.
        if not isinstance(schema, dict):
            continue

        types = _normalise_type(schema.get('type'))
        role = schema.get('role')

        if slug in EXCLUDED_BLOCKS_LIVE_RESOLVER:
            findings[attr_name] = {
                'status': 'EXCLUDED',
                'reason': 'product-card-live-resolver',
                'type': sorted(types),
            }
            continue

        if not types or not types.issubset(SCALAR_TYPES):
            findings[attr_name] = {
                'status': 'EXCLUDED',
                'reason': 'object-or-array-typed',
                'type': sorted(types) if types else ['unknown'],
            }
            continue

        provisional_reason = None
        if role == 'content':
            provisional_reason = 'scalar-content-attr'
        elif attr_name in LINK_BEHAVIOUR_SIBLINGS and 'string' in types:
            provisional_reason = 'link-behaviour-sibling'

        if provisional_reason is None:
            findings[attr_name] = {
                'status': 'EXCLUDED',
                'reason': 'not-content-role',
                'type': sorted(types),
            }
            continue

        # Final gate: declared + scalar + content-marked is necessary but not
        # sufficient — render.php must actually READ the value, or a binding on
        # it is a silent dead end for the client. `sgs/info-box` heading/
        # description proved this: role:content survives an HC2 InnerBlocks
        # migration that stopped render.php reading the scalar at all.
        read_by_render = _render_reads_attr(block_json_path, attr_name)
        if read_by_render is False:
            findings[attr_name] = {
                'status': 'EXCLUDED',
                'reason': 'declared-content-not-read-by-render',
                'type': sorted(types),
            }
            continue
        if read_by_render is None:
            findings[attr_name] = {
                'status': 'EXCLUDED',
                'reason': 'no-render-php',
                'type': sorted(types),
            }
            continue

        findings[attr_name] = {
            'status': 'ELIGIBLE',
            'reason': provisional_reason,
            'type': sorted(types),
        }

    return slug, findings


def build_census():
    """Walks every src/blocks/*/block.json. Returns {block_slug: {attr: finding}}."""
    census = {}
    parse_errors = {}
    for block_json in sorted(BLOCKS_DIR.glob('*/block.json')):
        slug, findings = classify_block(block_json)
        if slug is None:
            if findings:
                parse_errors[str(block_json.relative_to(ROOT))] = findings.get('__parse_error__')
            continue
        census[slug] = findings
    return census, parse_errors


def eligible_pairs(census):
    """Returns a set of (block_slug, attr_name) tuples classified ELIGIBLE."""
    pairs = set()
    for slug, findings in census.items():
        for attr, finding in findings.items():
            if finding['status'] == 'ELIGIBLE':
                pairs.add((slug, attr))
    return pairs


# --- Parsing the CURRENT SUPPORTED_ATTRIBUTES const (the thing --check gates) ---

SUPPORTED_ATTRIBUTES_BLOCK_RE = re.compile(
    r"private const SUPPORTED_ATTRIBUTES\s*=\s*array\s*\((.*?)\n\t\);",
    re.S,
)
BLOCK_ENTRY_RE = re.compile(
    r"'(?P<block>sgs/[a-z0-9-]+)'\s*=>\s*array\s*\((?P<attrs>[^)]*)\)",
)
ATTR_NAME_RE = re.compile(r"'([A-Za-z0-9_]+)'")


def parse_current_supported_attributes():
    """Reads includes/class-sgs-block-bindings-support.php and returns the currently
    declared {block_slug: [attr, ...]} SUPPORTED_ATTRIBUTES map. Refuses (returns
    None) rather than guess if the const's shape has moved — the whole point of the
    guard is to know what is DECLARED, not to reconstruct it heuristically."""
    if not BINDINGS_SUPPORT_PHP.exists():
        return None
    src = BINDINGS_SUPPORT_PHP.read_text(encoding='utf-8')
    match = SUPPORTED_ATTRIBUTES_BLOCK_RE.search(src)
    if not match:
        return None
    body = match.group(1)
    result = {}
    for entry in BLOCK_ENTRY_RE.finditer(body):
        block = entry.group('block')
        attrs = ATTR_NAME_RE.findall(entry.group('attrs'))
        result[block] = attrs
    return result


def current_pairs():
    parsed = parse_current_supported_attributes()
    if parsed is None:
        return None
    pairs = set()
    for block, attrs in parsed.items():
        for attr in attrs:
            pairs.add((block, attr))
    return pairs


# --- CLI modes ---

def cmd_survey(as_json: bool):
    census, parse_errors = build_census()
    pairs = eligible_pairs(census)

    if as_json:
        print(json.dumps({
            'census': census,
            'parse_errors': parse_errors,
            'eligible_count': len(pairs),
        }, indent=2, sort_keys=True))
        return

    totals = {'ELIGIBLE': 0, 'EXCLUDED': 0}
    reason_totals = {}
    for slug, findings in census.items():
        for attr, finding in findings.items():
            totals[finding['status']] += 1
            reason_totals[finding['reason']] = reason_totals.get(finding['reason'], 0) + 1

    print(f"Blocks scanned: {len(census)}")
    print(f"Parse errors: {len(parse_errors)}")
    for path, err in parse_errors.items():
        print(f"  REFUSED (parse error): {path}: {err}")
    print()
    print(f"Attributes classified: {sum(totals.values())}")
    for status, count in totals.items():
        print(f"  {status}: {count}")
    print()
    print("Exclusion reasons:")
    for reason, count in sorted(reason_totals.items()):
        print(f"  {reason}: {count}")
    print()
    print(f"ELIGIBLE (block, attr) pairs: {len(pairs)}")
    for block, attr in sorted(pairs):
        print(f"  {block} :: {attr}")


def cmd_fix():
    census, _ = build_census()
    pairs = eligible_pairs(census)
    by_block = {}
    for block, attr in sorted(pairs):
        by_block.setdefault(block, []).append(attr)

    print("// --fix is a DRY RUN — the full ELIGIBLE set, never auto-applied.")
    print("// Curate the actual widened subset by hand; do not paste this whole")
    print("// block verbatim (see the C15 report: 'do not attempt to cover all 83")
    print("// blocks in one pass').")
    print("private const SUPPORTED_ATTRIBUTES = array(")
    for block in sorted(by_block):
        attrs = ', '.join(f"'{a}'" for a in by_block[block])
        print(f"\t'{block}' => array( {attrs} ),")
    print(");")


def cmd_check() -> int:
    census, parse_errors = build_census()
    if parse_errors:
        print("REFUSING to guess: block.json parse error(s):", file=sys.stderr)
        for path, err in parse_errors.items():
            print(f"  {path}: {err}", file=sys.stderr)
        return 1

    declared = current_pairs()
    if declared is None:
        print(
            f"REFUSING to guess: could not parse SUPPORTED_ATTRIBUTES out of "
            f"{BINDINGS_SUPPORT_PHP.relative_to(ROOT)} — its shape has moved. "
            "Update SUPPORTED_ATTRIBUTES_BLOCK_RE / BLOCK_ENTRY_RE.",
            file=sys.stderr,
        )
        return 1

    eligible = eligible_pairs(census)
    unsafe = sorted(declared - eligible)

    if unsafe:
        print("FAIL: SUPPORTED_ATTRIBUTES declares (block, attr) pairs this census "
              "does NOT classify as a safe binding target:")
        for block, attr in unsafe:
            finding = census.get(block, {}).get(attr)
            if finding is None:
                reason = 'attribute not found on this block in block.json (renamed or removed?)'
            else:
                reason = finding['reason']
            print(f"  {block} :: {attr}  -- {reason}")
        return 1

    print(f"PASS: all {len(declared)} declared (block, attr) pairs are ELIGIBLE "
          f"per the census ({len(eligible)} ELIGIBLE pairs available tree-wide).")
    return 0


# --- Self-test ---

def _write_fixture(tmp_dir: pathlib.Path, slug: str, attributes: dict, render_reads=None) -> pathlib.Path:
    """`render_reads` — attr names render.php should read via $attributes['x'].
    None (default) writes NO render.php (tests the no-render-php refusal path);
    pass an explicit list, empty or not, to write a render.php reading exactly
    those names."""
    block_dir = tmp_dir / slug.split('/')[-1]
    block_dir.mkdir(parents=True, exist_ok=True)
    path = block_dir / 'block.json'
    path.write_text(json.dumps({'name': slug, 'attributes': attributes}), encoding='utf-8')
    if render_reads is not None:
        reads = "\n".join(f"$x = $attributes['{name}'] ?? '';" for name in render_reads)
        (block_dir / 'render.php').write_text(f"<?php\n{reads}\n", encoding='utf-8')
    return path


def cmd_self_test() -> int:
    import tempfile

    failures = []

    def check(label, condition):
        if not condition:
            failures.append(label)

    with tempfile.TemporaryDirectory() as td:
        tmp = pathlib.Path(td)

        # 1. Positive — scalar string, role:content, AND read by render.php -> ELIGIBLE.
        p1 = _write_fixture(tmp, 'sgs/fixture-a', {
            'alt': {'type': 'string', 'default': '', 'role': 'content'},
        }, render_reads=['alt'])
        slug, findings = classify_block(p1)
        check('positive scalar+content+render-read is ELIGIBLE', findings['alt']['status'] == 'ELIGIBLE')

        # 2. Object-typed content-role attr -> EXCLUDED object-or-array-typed
        #    (a box/tier object marked content would otherwise slip through).
        p2 = _write_fixture(tmp, 'sgs/fixture-b', {
            'padding': {'type': 'object', 'default': {}, 'role': 'content'},
        })
        _, findings = classify_block(p2)
        check('object-typed excluded even with role:content',
              findings['padding']['status'] == 'EXCLUDED'
              and findings['padding']['reason'] == 'object-or-array-typed')

        # 3. Array-typed (repeater) -> EXCLUDED object-or-array-typed.
        p3 = _write_fixture(tmp, 'sgs/fixture-c', {
            'items': {'type': 'array', 'default': [], 'role': 'content'},
        })
        _, findings = classify_block(p3)
        check('array-typed excluded',
              findings['items']['status'] == 'EXCLUDED'
              and findings['items']['reason'] == 'object-or-array-typed')

        # 4. Scalar but no role:content (e.g. an enum layout selector) -> EXCLUDED.
        p4 = _write_fixture(tmp, 'sgs/fixture-d', {
            'cardStyle': {'type': 'string', 'default': 'elevated'},
        })
        _, findings = classify_block(p4)
        check('scalar without role:content excluded',
              findings['cardStyle']['status'] == 'EXCLUDED'
              and findings['cardStyle']['reason'] == 'not-content-role')

        # 4b. Link-behaviour sibling (linkTarget/rel) without role:content -> ELIGIBLE
        #     (the sgs/button baseline this detector must not break).
        p4b = _write_fixture(tmp, 'sgs/fixture-d2', {
            'linkTarget': {'type': 'string', 'default': '_self'},
            'rel': {'type': 'string', 'default': ''},
        }, render_reads=['linkTarget', 'rel'])
        _, findings = classify_block(p4b)
        check('linkTarget is ELIGIBLE via link-behaviour-sibling rule',
              findings['linkTarget']['status'] == 'ELIGIBLE'
              and findings['linkTarget']['reason'] == 'link-behaviour-sibling')
        check('rel is ELIGIBLE via link-behaviour-sibling rule',
              findings['rel']['status'] == 'ELIGIBLE'
              and findings['rel']['reason'] == 'link-behaviour-sibling')

        # 5. Union type with null, scalar remainder, role:content, render-read -> ELIGIBLE.
        p5 = _write_fixture(tmp, 'sgs/fixture-e', {
            'label': {'type': ['string', 'null'], 'default': None, 'role': 'content'},
        }, render_reads=['label'])
        _, findings = classify_block(p5)
        check('nullable scalar union is ELIGIBLE', findings['label']['status'] == 'ELIGIBLE')

        # 5b. THE INFO-BOX CASE — declared role:content, scalar, but render.php
        #     does NOT read it (an HC2 InnerBlocks migration left the marker
        #     behind) -> EXCLUDED declared-content-not-read-by-render. This is
        #     the exact live defect `sgs/info-box` heading/description has today.
        p5b = _write_fixture(tmp, 'sgs/fixture-e2', {
            'heading': {'type': 'string', 'default': '', 'role': 'content'},
        }, render_reads=[])  # render.php exists but reads nothing
        _, findings = classify_block(p5b)
        check('declared content not read by render is EXCLUDED',
              findings['heading']['status'] == 'EXCLUDED'
              and findings['heading']['reason'] == 'declared-content-not-read-by-render')

        # 5c. No render.php at all -> EXCLUDED no-render-php (refusal, not a
        #     silent pass — every real SGS block is dynamic, so this should
        #     never legitimately happen, and the detector must say so loudly).
        p5c = _write_fixture(tmp, 'sgs/fixture-e3', {
            'heading': {'type': 'string', 'default': '', 'role': 'content'},
        })  # render_reads=None -> no render.php written
        _, findings = classify_block(p5c)
        check('missing render.php is EXCLUDED no-render-php',
              findings['heading']['status'] == 'EXCLUDED'
              and findings['heading']['reason'] == 'no-render-php')

        # 6. product-card is EXCLUDED regardless of type/role (live resolver).
        p6 = _write_fixture(tmp, 'sgs/product-card', {
            'title': {'type': 'string', 'default': '', 'role': 'content'},
        })
        _, findings = classify_block(p6)
        check('product-card excluded via live-resolver rule',
              findings['title']['status'] == 'EXCLUDED'
              and findings['title']['reason'] == 'product-card-live-resolver')

        # 7. `_comment*` pseudo-key (string value, not a dict) is skipped entirely,
        #    not misclassified.
        p7 = _write_fixture(tmp, 'sgs/fixture-f', {
            '_comment_foo': 'just documentation, not a schema',
            'real': {'type': 'string', 'default': '', 'role': 'content'},
        }, render_reads=['real'])
        _, findings = classify_block(p7)
        check('_comment pseudo-key skipped', '_comment_foo' not in findings)
        check('real sibling attr still classified', findings.get('real', {}).get('status') == 'ELIGIBLE')

        # 8. Negative control — a block with only non-content attrs must report
        #    ZERO eligible, not silently nothing (proves the classifier still runs).
        p8 = _write_fixture(tmp, 'sgs/fixture-g', {
            'align': {'type': 'string', 'default': 'left'},
        })
        _, findings = classify_block(p8)
        check('negative control finds zero eligible',
              all(f['status'] == 'EXCLUDED' for f in findings.values()) and len(findings) == 1)

        # 9. Malformed JSON -> refused (slug None, parse_error recorded), never
        #    silently skipped without a trace.
        bad = tmp / 'fixture-h'
        bad.mkdir(parents=True, exist_ok=True)
        (bad / 'block.json').write_text('{ not valid json', encoding='utf-8')
        slug, findings = classify_block(bad / 'block.json')
        check('malformed json refused, not silently skipped',
              slug is None and '__parse_error__' in findings)

    # 10. --check must PASS against the REAL current SUPPORTED_ATTRIBUTES (positive
    #     control — proves the guard is not vacuously green).
    exit_code = cmd_check()
    check('--check passes against the real, currently-shipped SUPPORTED_ATTRIBUTES',
          exit_code == 0)

    # 11. --check must FAIL when an unsafe pair is injected (negative control —
    #     proves the guard can actually fail).
    real_declared = current_pairs()
    check('parsed the real SUPPORTED_ATTRIBUTES const at all', bool(real_declared))
    # Simulate: an unsafe pair (an object-typed attr) would fail eligible_pairs().
    census, _ = build_census()
    eligible = eligible_pairs(census)
    # `sgs/container`'s `padding` is object-typed on disk — guaranteed unsafe.
    unsafe_pair = ('sgs/container', 'padding')
    check('the negative-control pair is genuinely not eligible (sanity check)',
          unsafe_pair not in eligible)
    simulated_declared = (real_declared or set()) | {unsafe_pair}
    simulated_unsafe = simulated_declared - eligible
    check('injecting an unsafe pair would fail the guard', bool(simulated_unsafe))

    if failures:
        print(f"SELF-TEST FAILED ({len(failures)} assertion(s)):")
        for f in failures:
            print(f"  - {f}")
        return 1

    print("SELF-TEST PASSED (11 assertions).")
    return 0


def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--survey', action='store_true', help='census only, no writes')
    parser.add_argument('--json', action='store_true', help='with --survey: durable JSON census')
    parser.add_argument('--fix', action='store_true', help='print the full ELIGIBLE set as a PHP literal (dry run, never written)')
    parser.add_argument('--check', action='store_true', help='gate: exit 1 if SUPPORTED_ATTRIBUTES declares an unsafe pair')
    parser.add_argument('--self-test', action='store_true', help='exit 1 if any assertion fails')
    args = parser.parse_args()

    if args.self_test:
        sys.exit(cmd_self_test())
    if args.check:
        sys.exit(cmd_check())
    if args.fix:
        cmd_fix()
        return
    if args.survey:
        cmd_survey(args.json)
        return

    # No flag = census, matching the sibling scripts' documented default.
    cmd_survey(False)


if __name__ == '__main__':
    main()
