#!/usr/bin/env python3
"""Find saved old-shape (scalar) values of attributes that became per-breakpoint objects.

The rules are derived, not listed (FP-1): every block.json attribute of type object that belongs to a family in
scripts/data/scalar-tier-families.json (or is listed there as migrated by an earlier batch) is a rule;
a saved scalar value of it is a defect (footer framework batch, .claude/plans/2026-11-02-footer-framework-batch.md
rule 2; shared code in scripts/lib/scalar_tier_rules.py). The same files that migrate-scalar-tier.py moves to type
object are what this keeps fixed, so they are the same detector (migration-scripts.md triad).

Four readers: JSON trees (walked as data; rewritten with the file's own formatting when it round-trips), block-comment
markup in PHP/HTML patterns (`<!-- wp:sgs/x {...} -->`, members rewritten as text so every other byte stays), and
JS/MJS/PY literals (the key inside the block's own region). PHP array literals cannot be rewritten mechanically: they
are reported as MANUAL and fail the check.

Usage:
  find-scalar-tier-attrs.py --check      exit 1 on any hit
  find-scalar-tier-attrs.py --write      rewrite every hit to the object shape
  (a line carrying the comment `scalar-tier-allow` is skipped: a test feeding the old shape on purpose)
  find-scalar-tier-attrs.py --survey     census including attributes still scalar in block.json (the migration targets)
  find-scalar-tier-attrs.py --rules      print the derived rules as JSON (input of migrate-scalar-tier-live.php);
                                         --rules-all also lists attributes still scalar in block.json (pre-migration census)
  find-scalar-tier-attrs.py --self-test  fixtures incl. a negative control that must stay untouched
"""
import collections
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
import scalar_tier_rules as R  # noqa: E402

ROOT = R.ROOT
SCOPES = ['sites', 'theme/sgs-theme/parts', 'theme/sgs-theme/patterns', 'theme/sgs-theme/templates', 'plugins/sgs-blocks/tests',
          'plugins/sgs-blocks/scripts/nav-qa',
          'plugins/sgs-blocks/scripts/migrate-core-blocks', 'scripts/computed-route']
SKIP_PARTS = ('/node_modules/', '/mockups/', '/research/', '/handoff/')
EXTS = ('.json', '.php', '.html', '.mjs', '.js', '.py')
MARKUP_RE = re.compile(r'<!--\s*wp:(sgs/[a-z0-9-]+)(\s*)(\{.*?\})(\s*/?-->)', re.S)
LITERAL_BLOCK_RE = re.compile(r'''(['"])((?:sgs|core)/[a-z0-9-]+)\1''')


def tracked_files(root=ROOT, scopes=SCOPES):
    out = subprocess.check_output(['git', 'ls-files', '-z', '--'] + scopes, cwd=root).decode('utf8')
    return [f for f in out.split('\0') if f.endswith(EXTS) and not any(p in '/' + f for p in SKIP_PARTS)]


def walk_json(node, rules, conv, hits, fix):
    if isinstance(node, dict):
        name = node.get('name', node.get('blockName'))
        if isinstance(name, str) and name in rules:
            for bag_key in ('attributes', 'attrs', 'props'):
                bag = node.get(bag_key)
                if isinstance(bag, dict):
                    for attr in rules[name]:
                        if attr in bag and R.is_scalar(bag[attr]):
                            hits.append((name, attr, bag[attr], 'json'))
                            if fix:
                                bag[attr] = R.convert(name, attr, bag[attr], conv)
        for key, v in node.items():
            # Fixture shape: { "sgs/x": { "attributes": { ... } } }.
            if key in rules and isinstance(v, dict) and isinstance(v.get('attributes'), dict):
                bag = v['attributes']
                for attr in rules[key]:
                    if attr in bag and R.is_scalar(bag[attr]):
                        hits.append((key, attr, bag[attr], 'json'))
                        if fix:
                            bag[attr] = R.convert(key, attr, bag[attr], conv)
            walk_json(v, rules, conv, hits, fix)
    elif isinstance(node, list):
        for v in node:
            walk_json(v, rules, conv, hits, fix)


def dump_like(original, data):
    """json.dumps variants; the one that reproduces the untouched file, or None."""
    for kw in ({'indent': 2}, {'indent': 4}, {'indent': 1}, {'separators': (',', ':')}):
        text = json.dumps(data, ensure_ascii=False, **kw)
        for tail in ('', '\n'):
            if text + tail == original.replace('\r\n', '\n'):
                return kw, tail, '\r\n' in original
    return None


def scan_text(rel, text, rules, conv, fix):
    """Returns (hits, new_text)."""
    hits = []
    new = text
    if rel.endswith('.json'):
        try:
            data = json.loads(text)
        except ValueError:
            data = None
        if data is not None:
            found = []
            walk_json(data, rules, conv, found, False)
            if not found:
                return [], text
            hits.extend(found)
            if not fix:
                return hits, text
            style = dump_like(text, data)
            if style:
                kw, tail, crlf = style
                walk_json(data, rules, conv, [], True)
                out = json.dumps(data, ensure_ascii=False, **kw) + tail
                return hits, out.replace('\n', '\r\n') if crlf else out
            hits = []  # no round trip: the text pass below rewrites it and keeps formatting
    # Block-comment markup.
    def markup_sub(m):
        name = m.group(1)
        if name not in rules:
            return m.group(0)
        text2, got = R.rewrite_members(m.group(3), set(rules[name]), lambda a, v: R.convert(name, a, v, conv))
        for attr, old in got:
            hits.append((name, attr, old, 'markup'))
        return m.group(0) if not got else '<!-- wp:' + name + m.group(2) + text2 + m.group(4)
    new = MARKUP_RE.sub(markup_sub, new)
    # Literals.
    if not rel.endswith('.json') or hits == []:
        marks = [(m.start(), m.group(2)) for m in LITERAL_BLOCK_RE.finditer(new)]
        edits = []
        for i, (pos, name) in enumerate(marks):
            if name not in rules:
                continue
            end = marks[i + 1][0] if i + 1 < len(marks) else len(new)
            attrs = '|'.join(re.escape(a) for a in sorted(rules[name]))
            rx = re.compile(r'''(["']?)(%s)\1(\s*(?:[:=]|=>)\s*)(true|false|True|False|-?\d+(?:\.\d+)?|"[^"\n]*"|'[^'\n]*')''' % attrs)
            for m in rx.finditer(new[pos:end]):
                edits.append((pos + m.start(4), pos + m.end(4), name, m.group(2), m.group(4), m.group(3)))
        php = rel.endswith('.php')
        for start, end, name, attr, raw, sep in sorted(edits, reverse=True):
            eol = new.find(chr(10), end)
            line = new[new.rfind(chr(10), 0, start) + 1:eol if eol >= 0 else len(new)]
            if 'scalar-tier-allow' in line:
                continue  # a test that passes the old shape on purpose to prove it is ignored
            low = raw.lower()
            value = True if low == 'true' else False if low == 'false' else \
                json.loads(raw) if raw[0] in '"-0123456789' else raw.strip("'")
            if php and '=>' in sep:
                hits.append((name, attr, value, 'MANUAL'))
                continue
            hits.append((name, attr, value, 'literal'))
            obj = R.convert(name, attr, value, conv)
            lit = repr(obj) if rel.endswith('.py') else json.dumps(obj, separators=(',', ':'))
            new = new[:start] + lit + new[end:]
    return hits, new


def _box_bag(name, bag, box_rules, scalar_rules, hits, refused, fix):
    """One attribute bag of block `name`: record (and with fix, convert) each included box attribute defect."""
    for attr, shape in box_rules[name].items():
        if attr not in bag:
            continue
        issues = R.box_string_issues(bag[attr])
        # A bare scalar for an attribute the scalar-tier rule already covers is reported there (still enforced).
        if issues and issues[0][0] is None and not isinstance(bag[attr], dict) and attr in scalar_rules.get(name, {}):
            continue
        for tier, raw in issues:
            hits.append((name, attr, f'{tier or "whole"}: {raw!r}', 'box-string'))
        if fix and issues:
            new, ref = R.convert_box(shape, bag[attr])
            bag[attr] = new
            refused.extend((name, attr, t or 'whole', raw) for t, raw in ref)
        elif issues:
            refused.extend((name, attr, t or 'whole', raw) for t, raw in issues if R.expand_box(raw) is None)


def walk_json_box(node, box_rules, scalar_rules, hits, refused, fix):
    if isinstance(node, dict):
        name = node.get('name', node.get('blockName'))
        if isinstance(name, str) and name in box_rules:
            for bag_key in ('attributes', 'attrs', 'props'):
                if isinstance(node.get(bag_key), dict):
                    _box_bag(name, node[bag_key], box_rules, scalar_rules, hits, refused, fix)
        for key, v in node.items():
            if key in box_rules and isinstance(v, dict) and isinstance(v.get('attributes'), dict):
                _box_bag(key, v['attributes'], box_rules, scalar_rules, hits, refused, fix)
            walk_json_box(v, box_rules, scalar_rules, hits, refused, fix)
    elif isinstance(node, list):
        for v in node:
            walk_json_box(v, box_rules, scalar_rules, hits, refused, fix)


def scan_box_text(rel, text, box_rules, scalar_rules, fix):
    """The box-string rule over one file. Returns (hits, refused, new_text). JSON trees are walked as data (rewritten
    in the file's own formatting when it round-trips); block-comment markup has the attribute member replaced as text."""
    hits, refused, new = [], [], text
    if rel.endswith('.json'):
        try:
            data = json.loads(text)
        except ValueError:
            data = None
        if data is not None:
            walk_json_box(data, box_rules, scalar_rules, hits, refused, False)
            if hits and fix:
                style = dump_like(text, data)
                if style:
                    kw, tail, crlf = style
                    hits, refused = [], []
                    walk_json_box(data, box_rules, scalar_rules, hits, refused, True)
                    out = json.dumps(data, ensure_ascii=False, **kw) + tail
                    return hits, refused, out.replace('\n', '\r\n') if crlf else out
            else:
                return hits, refused, text
            hits, refused = [], []

    def markup_sub(m):
        name = m.group(1)
        if name not in box_rules:
            return m.group(0)
        attrs_text = m.group(3)
        edits = []
        for attr, a, b in R.member_spans(attrs_text, set(box_rules[name])):
            value = json.loads(attrs_text[a:b])
            bag = {attr: value}
            before = len(hits)
            _box_bag(name, bag, {name: {attr: box_rules[name][attr]}}, scalar_rules, hits, refused, fix)
            if fix and len(hits) > before and bag[attr] != value:
                edits.append((a, b, json.dumps(bag[attr], separators=(',', ':'), ensure_ascii=False)))
        if not edits:
            return m.group(0)
        for a, b, rep in sorted(edits, reverse=True):
            attrs_text = attrs_text[:a] + rep + attrs_text[b:]
        return '<!-- wp:' + name + m.group(2) + attrs_text + m.group(4)

    new = MARKUP_RE.sub(markup_sub, new)
    return hits, refused, new


def scan_file(rel, rules, conv, fix, root=ROOT, box_rules=None):
    """Returns (hits, box_hits, box_refused); a box hit is (rel, block, attr, description, 'box-string')."""
    path = Path(root) / rel
    try:
        text = path.read_bytes().decode('utf8')
    except (UnicodeDecodeError, OSError):
        return [], [], []
    hits, new = [], text
    if any(b in text for b in rules):
        hits, new = scan_text(rel, text, rules, conv, fix)
    bhits, refused = [], []
    if box_rules and any(b in new for b in box_rules):
        bhits, refused, new2 = scan_box_text(rel, new, box_rules, rules, fix)
        new = new2 if fix else new
    if fix and new != text:
        path.write_bytes(new.encode('utf8'))
    return [(rel, *h) for h in hits], [(rel, *h) for h in bhits], [(rel, *r) for r in refused]


def run(mode):
    object_rules, pending, conv = R.derive()
    rules = {b: dict(a) for b, a in object_rules.items()}
    if mode == '--survey':
        for b, a, _f, _t, d in pending:
            rules.setdefault(b, {})[a] = d
    box_rules = R.box_attrs_from_db() or {}
    all_hits, box_hits, box_refused = [], [], []
    for rel in tracked_files():
        h, bh, br = scan_file(rel, rules, conv, mode == '--write', box_rules=box_rules)
        all_hits.extend(h)
        box_hits.extend(bh)
        box_refused.extend(br)
    return all_hits, object_rules, pending, box_hits, box_refused


def write_refused(refused):
    """sites/<client>/build/box-string-refused.json per client; refused values elsewhere are only listed."""
    by_site = collections.defaultdict(list)
    for rel, block, attr, tier, raw in refused:
        parts = rel.split('/')
        if parts[0] == 'sites' and len(parts) > 2:
            by_site[parts[1]].append({'path': rel, 'block': block, 'attribute': attr, 'tier': tier, 'value': raw})
    for site, items in by_site.items():
        out = ROOT / 'sites' / site / 'build' / 'box-string-refused.json'
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(items, indent=1, ensure_ascii=False) + '\n', encoding='utf8')
        print(f'wrote {len(items)} refused value(s): {out.relative_to(ROOT).as_posix()}')


def box_rules_payload(values_file=None):
    """The box part of rules.json: the included attributes with their shape and, when a values file (the live dry run's
    distinct strings) is given, the Python-expanded boxes (null = refused). PHP only substitutes."""
    payload = {'attrs': R.box_attrs_from_db() or {}}
    if values_file:
        values = json.loads(Path(values_file).read_text(encoding='utf8'))
        payload['expansions'] = {str(v): R.expand_box(v) for v in values if isinstance(v, (str, int, float))}
    return payload


def survey(hits, object_rules, pending):
    fam = {a: f for _b, a, f, _t, _d in pending}
    by_block = collections.Counter(p[0] for p in pending)
    print(f'pending scalar attributes in block.json: {len(pending)} across {len(by_block)} blocks')
    by_family = collections.Counter(f for _b, _a, f, _t, _d in pending)
    for f, n in sorted(by_family.items()):
        print(f'  family {f}: {n} attributes')
    print(f'object-typed rules already in force: {sum(len(v) for v in object_rules.values())} attributes')
    sites = collections.Counter()
    kinds = collections.Counter()
    files = collections.defaultdict(set)
    for rel, name, attr, val, kind in hits:
        top = rel.split('/')
        scope = '/'.join(top[:2]) if top[0] == 'sites' else '/'.join(top[:3]) if top[0] in ('theme', 'plugins') else '/'.join(top[:2])
        sites[scope] += 1
        kinds[kind] += 1
        files[scope].add(rel)
    print(f'\nsaved scalar values: {len(hits)} in {len({h[0] for h in hits})} files  (by reader: {dict(kinds)})')
    for scope, n in sorted(sites.items(), key=lambda kv: -kv[1]):
        print(f'  {scope}: {n} values in {len(files[scope])} files')
    print('\nby attribute family (saved values):')
    fc = collections.Counter()
    for _rel, _n, attr, _v, _k in hits:
        fc[fam.get(attr) or R.family_of(attr, R.load_families()[0]) or 'tier-object-other'] += 1
    for f, n in fc.most_common():
        print(f'  {f}: {n}')
    pc = collections.Counter(f'{n} {a}' for _r, n, a, _v, _k in hits)
    print('\ntop block.attribute pairs:')
    for k, n in pc.most_common(25):
        print(f'  {k}: {n}')


# ---------------------------------------------------------------- self test
def self_test():
    rules = {'sgs/x': {'textAlign': {}, 'justifyContent': {}}}
    conv = {}
    ok = True

    def expect(label, cond):
        nonlocal ok
        print(('PASS ' if cond else 'FAIL ') + label)
        ok = ok and cond

    j = json.dumps([{'name': 'sgs/x', 'attributes': {'textAlign': 'center', 'other': 'a'}},
                    {'name': 'sgs/neg', 'attributes': {'textAlign': 'center'}},
                    {'name': 'sgs/x', 'attributes': {'textAlign': {'desktop': 'left'}}}], indent=2) + '\n'
    hits, new = scan_text('a.json', j, rules, conv, True)
    d = json.loads(new)
    expect('json: scalar rewritten', d[0]['attributes']['textAlign'] == {'desktop': 'center'} and len(hits) == 1)
    expect('json: negative control block untouched', d[1]['attributes']['textAlign'] == 'center')
    expect('json: object value untouched and formatting kept', d[2]['attributes']['textAlign'] == {'desktop': 'left'} and new.endswith(']\n') and '\n  {' in new)
    hits2, new2 = scan_text('a.json', new, rules, conv, True)
    expect('json: idempotent', hits2 == [] and new2 == new)
    m = '<!-- wp:sgs/x {"textAlign":"center",  "style":{"textAlign":"x"},"n":1} /-->\n<!-- wp:sgs/neg {"textAlign":"center"} /-->'
    hits, new = scan_text('p.html', m, rules, conv, True)
    expect('markup: top-level member rewritten, nested key and other bytes kept',
           new.startswith('<!-- wp:sgs/x {"textAlign":{"desktop":"center"},  "style":{"textAlign":"x"},"n":1} /-->') and new.endswith('{"textAlign":"center"} /-->'))
    hits2, new2 = scan_text('p.html', new, rules, conv, True)
    expect('markup: idempotent', hits2 == [] and new2 == new)
    mjs = "const a = { name: 'sgs/x', textAlign: 'center' };\nconst b = { name: 'core/paragraph', textAlign: 'center' };"
    hits, new = scan_text('t.mjs', mjs, rules, conv, True)
    expect('literal: own region rewritten, core block after it untouched',
           "textAlign: {\"desktop\":\"center\"}" in new.splitlines()[0] and "textAlign: 'center'" in new.splitlines()[1])
    php = "array( 'blockName' => 'sgs/x', 'textAlign' => 'center' )"
    hits, new = scan_text('t.php', php, rules, conv, True)
    expect('php array literal: reported MANUAL, not rewritten', new == php and hits and hits[0][3] == 'MANUAL')
    expect('empty string becomes {}', R.convert('sgs/x', 'textAlign', '', {}) == {})
    expect('conversion table wins', R.convert('sgs/gallery', 'layout', 'grid', {'sgs/gallery.layout': {'grid': {}}}) == {})
    return 0 if ok else 1


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    mode = sys.argv[1] if len(sys.argv) > 1 else '--check'
    if mode == '--self-test':
        return self_test()
    argv = sys.argv[1:]
    if mode == '--fix':
        mode = '--write'
    if mode in ('--rules', '--rules-all'):
        object_rules, pending, conv = R.derive()
        merged = {b: set(a) for b, a in object_rules.items()}
        if mode == '--rules-all':
            for b, a, *_ in pending:
                merged.setdefault(b, set()).add(a)
        values = argv[argv.index('--box-values') + 1] if '--box-values' in argv else None
        print(json.dumps({'rules': {b: sorted(a) for b, a in sorted(merged.items())}, 'conversions': conv,
                          'box': box_rules_payload(values)}, indent=1))
        return 0
    if mode not in ('--check', '--write', '--survey'):
        print(__doc__)
        return 2
    hits, object_rules, pending, box_hits, box_refused = run(mode)
    if mode == '--survey':
        survey(hits, object_rules, pending)
        return 0
    for rel, name, attr, val, kind in hits:
        print(f"{'rewrote' if mode == '--write' else 'HIT'} [{kind}]: {rel}: {name}.{attr} = {val!r}")
    manual = [h for h in hits if h[4] == 'MANUAL']
    print(f"{len(hits)} scalar value(s) {'rewritten' if mode == '--write' else 'found'}")
    enforced = R.box_string_enforced()
    print(f"\n== box-string: a string where a per-device box needs top/right/bottom/left ({'ENFORCED' if enforced else 'report-only'}) ==")
    for rel, name, attr, desc, _k in box_hits:
        print(f"{'converted' if mode == '--write' else 'BOX'}: {rel}: {name}.{attr} {desc}")
    for rel, name, attr, tier, raw in box_refused:
        print(f'REFUSED (not certain, left as stored): {rel}: {name}.{attr} [{tier}] = {raw!r}')
    print(f'{len(box_hits)} box-string value(s), {len(box_refused)} refused')
    if mode == '--write':
        write_refused(box_refused)
        return 1 if manual else 0
    return 1 if hits or (enforced and box_hits) else 0


if __name__ == '__main__':
    sys.exit(main())
