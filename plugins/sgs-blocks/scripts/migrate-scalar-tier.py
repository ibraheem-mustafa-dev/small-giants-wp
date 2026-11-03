#!/usr/bin/env python3
"""migrate-scalar-tier.py - turn a scalar block.json attribute family into per-breakpoint objects.

    "textAlign": { "type": "string", "enum": [...], "default": "" }      ->  { "type": "object", "default": {} }
    "alignItems": { "type": "string", "default": "stretch" }             ->  { "type": "object", "default": { "desktop": "stretch" } }

The scalar twin of migrate-tier-object.py (which only folds flat <prop>/<prop>Tablet/<prop>Mobile trios, so a lone scalar
classifies ABSENT there). Footer framework batch FW-F; families come from scripts/data/scalar-tier-families.json, the
attributes from each block.json (FP-1), nothing is listed in this file. The triad (migration-scripts.md):

  --survey            census: pending attributes per block and family, the files that read each one (render.php, edit.js,
                      preview-style.js, view.js, style.css), shared includes that read the bare key, and the writers
                      (computed-route, migrate-core-blocks) that emit it. Writes nothing.
  --fix               print the proposed block.json change for every pending attribute (dropped enums are listed: the control
                      keeps its own option list). Writes nothing without --apply.
  --fix --apply       edit block.json as text: only the attribute's own span changes, every other byte stays.
  --check             exit 1 when a family marked "done" in the families file still has a scalar attribute.
  --self-test         synthetic blocks incl. a negative control that must stay byte-identical.

Selection: --family <id> (alignItems, textAlign, prefixedTextAlign), --block <sgs/name>.
It never touches render.php, edit.js or saved content: those are the family's own commits, and saved content is rewritten
by find-scalar-tier-attrs.py --write plus migrate-scalar-tier-live.php (FP-14: no scalar fallback in any render).
"""
import argparse
import json
import re
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
import scalar_tier_rules as R  # noqa: E402

PLUGIN = R.ROOT / 'plugins' / 'sgs-blocks'
READER_FILES = ('render.php', 'edit.js', 'preview-style.js', 'view.js', 'style.css')
WRITER_SCOPES = ('scripts/computed-route', 'plugins/sgs-blocks/scripts/migrate-core-blocks')


def new_spec(old):
    """The object attribute spec for an old scalar spec: type object, no enum, default {} or {desktop: old default}."""
    spec = {k: v for k, v in old.items() if k not in ('type', 'enum', 'default')}
    default = old.get('default')
    obj = {} if default in (None, '') else {'desktop': default}
    return {'type': 'object', **spec, 'default': obj}


def span_of(text, attr, expected):
    """(start, end, key_indent) of `"attr": { ... }` in block.json text whose parsed body equals `expected`."""
    for m in re.finditer(r'(?m)^([ \t]*)"%s"\s*:\s*\{' % re.escape(attr), text):
        i, depth = m.end() - 1, 0
        j = i
        while j < len(text):
            c = text[j]
            if c == '"':
                j += 1
                while text[j] != '"':
                    j += 2 if text[j] == '\\' else 1
            elif c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    break
            j += 1
        try:
            if json.loads(text[i:j + 1]) == expected:
                return i, j + 1, m.group(1)
        except ValueError:
            pass
    return None


def render_spec(spec, key_indent, unit):
    """The spec as JSON text indented to sit under key_indent, one member per line like the rest of block.json."""
    out = json.dumps(spec, indent=unit, ensure_ascii=False)
    return out.replace('\n', '\n' + key_indent)


def rewrite_block_json(path, targets):
    """Apply to one block.json; returns (new_text, dropped_enums, refused) without writing."""
    text = Path(path).read_bytes().decode('utf8')
    nl = '\r\n' if '\r\n' in text else '\n'
    work = text.replace('\r\n', '\n')
    attrs = json.loads(work).get('attributes', {})
    dropped, refused = [], []
    for attr in targets:
        old = attrs[attr]
        found = span_of(work, attr, old)
        if found is None:
            refused.append((attr, 'attribute span not found as text'))
            continue
        start, end, indent = found
        unit = '\t' if '\t' in indent or work.startswith('{\n\t') else '    '
        spec = new_spec(old)
        if 'enum' in old:
            dropped.append((attr, old['enum']))
        work = work[:start] + render_spec(spec, indent, unit) + work[end:]
    json.loads(work)  # refuse rather than emit invalid JSON
    return work.replace('\n', nl), dropped, refused


def selection(args, blocks_dir=R.BLOCKS_DIR, families_file=R.FAMILIES_FILE):
    _o, pending, _c = R.derive(blocks_dir, families_file)
    return [p for p in pending if (not args.family or p[2] == args.family) and (not args.block or p[0] == args.block)]


def readers(block_dir, attrs):
    out = {}
    for fn in READER_FILES:
        f = block_dir / fn
        if f.exists():
            t = f.read_text(encoding='utf8', errors='replace')
            n = sum(len(re.findall(r'\b%s\b' % re.escape(a), t)) for a in attrs)
            if n:
                out[fn] = n
    return out


def survey(args):
    sel = selection(args)
    by_block = {}
    for b, a, f, t, d in sel:
        by_block.setdefault(b, []).append((a, f, t, d))
    dirs = {name: p.parent for name, (p, _a) in R.read_blocks().items()}
    print(f'{len(sel)} pending scalar attributes across {len(by_block)} blocks')
    non_empty = [(b, a, d) for b, a, _f, _t, d in sel if d not in (None, '')]
    for b, items in sorted(by_block.items()):
        r = readers(dirs[b], [a for a, *_ in items])
        names = ', '.join(f'{a}{"=" + repr(d) if d not in (None, "") else ""}' for a, _f, _t, d in items)
        print(f'  {b}: {len(items)} [{names}]  readers {r}')
    print(f'\nnon-empty defaults (become the desktop tier, need an absent-resolves-to-default test): {non_empty}')
    keys = sorted({a for _b, a, *_ in sel})
    inc = PLUGIN / 'includes'
    shared = {}
    for f in sorted(inc.glob('*.php')):
        t = f.read_text(encoding='utf8', errors='replace')
        n = sum(len(re.findall(r"""['"]%s['"]""" % re.escape(a), t)) for a in keys if not a.endswith('TextAlign') or a == 'textAlign')
        if n:
            shared[f.name] = n
    print(f'\nshared includes that name a bare key: {shared}')
    import subprocess
    pat = '|'.join(sorted({a for a in keys if a in ("textAlign", "alignItems")} | {'TextAlign'}))
    for scope in WRITER_SCOPES:
        out = subprocess.run(['git', 'grep', '-l', '-E', pat, '--', scope], cwd=R.ROOT, capture_output=True, text=True).stdout.split()
        print(f'writers in {scope}: {len(out)} files')
        for f in out:
            print(f'    {f}')
    return 0


def fix(args):
    sel = selection(args)
    by_block = {}
    for b, a, *_ in sel:
        by_block.setdefault(b, []).append(a)
    files = {name: p for name, (p, _a) in R.read_blocks().items()}
    changed = 0
    for b, attrs in sorted(by_block.items()):
        new, dropped, refused = rewrite_block_json(files[b], attrs)
        for a, why in refused:
            print(f'REFUSED {b}.{a}: {why}')
        print(f'{"WRITE" if args.apply else "WOULD CHANGE"} {b}: {", ".join(attrs)}' + (f'  (enums dropped: {dropped})' if dropped else ''))
        if args.apply:
            files[b].write_bytes(new.encode('utf8'))
        changed += 1
    print(f'{changed} block.json file(s) {"rewritten" if args.apply else "proposed"}')
    return 0


def check(args):
    families = json.loads(R.FAMILIES_FILE.read_text(encoding='utf8'))['families']
    done = {f['id'] for f in families if f.get('done')}
    bad = [p for p in selection(args) if p[2] in done]
    for b, a, f, t, d in bad:
        print(f'SCALAR {b}.{a} ({f} is marked done)')
    print(f'{len(bad)} scalar attribute(s) in finished families; done families: {sorted(done) or "none"}')
    return 1 if bad else 0


def self_test():
    ok = True

    def expect(label, cond):
        nonlocal ok
        print(('PASS ' if cond else 'FAIL ') + label)
        ok = ok and cond

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        (tmp / 'families.json').write_text(json.dumps({'families': [
            {'id': 'alignItems', 'match': '^alignItems$'}, {'id': 'textAlign', 'match': '^textAlign$'},
            {'id': 'prefixed', 'match': '^[a-z][A-Za-z0-9]*TextAlign$'}]}))
        blocks = tmp / 'blocks'
        mk = {
            'target': {"name": "sgs/target", "attributes": {"textAlign": {"type": "string", "enum": ["", "left", "right"], "default": ""},
                       "alignItems": {"type": "string", "default": "stretch"}, "titleTextAlign": {"type": "string", "enum": ["", "left"], "default": ""}}},
            'negative': {"name": "sgs/negative", "attributes": {"textAlignment": {"type": "string", "default": ""}, "layout": {"type": "string", "default": "grid"},
                         "name": {"type": "string", "default": "alignItems"}, "textAlign": {"type": "object", "default": {}}}},
        }
        (blocks / 'target').mkdir(parents=True)
        (blocks / 'negative').mkdir()
        tgt = '{\n\t"name": "sgs/target",\n\t"title": "Caf\\u00e9",\n\t"attributes": {\n\t\t"textAlign": {\n\t\t\t"type": "string",\n\t\t\t"enum": [\n\t\t\t\t"",\n\t\t\t\t"left",\n\t\t\t\t"right"\n\t\t\t],\n\t\t\t"default": ""\n\t\t},\n\t\t"alignItems": {\n\t\t\t"type": "string",\n\t\t\t"default": "stretch"\n\t\t},\n\t\t"titleTextAlign": { "type": "string", "enum": ["", "left"], "default": "" }\n\t}\n}\n'
        neg = json.dumps(mk['negative'], indent='\t') + '\n'
        (blocks / 'target' / 'block.json').write_bytes(tgt.encode())
        (blocks / 'negative' / 'block.json').write_bytes(neg.encode())
        args = argparse.Namespace(family=None, block=None, apply=True)
        _o, pending, _c = R.derive(blocks, tmp / 'families.json')
        expect('survey finds the three target attributes and nothing in the negative control',
               sorted((b, a) for b, a, *_ in pending) == [('sgs/target', 'alignItems'), ('sgs/target', 'textAlign'), ('sgs/target', 'titleTextAlign')])
        new, dropped, refused = rewrite_block_json(blocks / 'target' / 'block.json', ['textAlign', 'alignItems', 'titleTextAlign'])
        d = json.loads(new)['attributes']
        expect('textAlign becomes an object with default {} and no enum', d['textAlign'] == {'type': 'object', 'default': {}})
        expect('non-empty default becomes the desktop tier', d['alignItems'] == {'type': 'object', 'default': {'desktop': 'stretch'}})
        expect('inline-formatted attribute is handled and enum reported', d['titleTextAlign']['type'] == 'object' and len(dropped) == 2 and not refused)
        expect('other bytes kept (escape sequence, tabs)', '"Caf\\u00e9"' in new and new.startswith('{\n\t"name"'))
        (blocks / 'target' / 'block.json').write_bytes(new.encode())
        _o, pending2, _c = R.derive(blocks, tmp / 'families.json')
        expect('idempotent: nothing pending afterwards', pending2 == [])
        expect('negative control block.json byte-identical (never written)', (blocks / 'negative' / 'block.json').read_bytes() == neg.encode())
        expect('object rules now cover the migrated attributes', set(_o.get('sgs/target', {})) == {'textAlign', 'alignItems', 'titleTextAlign'})
    return 0 if ok else 1


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--fix', action='store_true')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    ap.add_argument('--family')
    ap.add_argument('--block')
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if a.survey:
        return survey(a)
    if a.fix:
        return fix(a)
    if a.check:
        return check(a)
    ap.print_help()
    return 2


if __name__ == '__main__':
    sys.exit(main())
