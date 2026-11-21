"""Prove the setting-record check can fail: plant four faults, one per scratch copy of the plugin, and see the check name each.

  python check.py --self-test [--plugin P] [--fixtures F] [--instances-dir D | --instances PLAN] [--no-proof] [--out DIR]

1. The clean copy: the check writes sgs/button's record from the code, then compares the code with that record. It must pass.
2. Four faults, each in its own copy, chosen from the code and the record at run time (no fixed strings), each changing one place:
     delete-rule       one declaration in the button's style.css that a record entry rests on is deleted
     rename-selector   one `:hover` in style.css, on a rule a hover entry rests on, becomes `:active`
     add-declaration   style.css gains an `outline-color` rule on a printed part, reading a custom property a setting writes
     drop-part-class   a printed part's class is taken out of the PHP that prints it
3. The four checks run at the same time against the clean record. A fault is killed when the check exits 1 and its report names
   the finding that fault should produce. The exit code is 0 only when the clean copy passes and all four are killed.

The copies live under <cache root>/self-test and go when the run ends (SGS_SETTING_RECORD_KEEP=1 keeps them). Each fault renders into its
own cache folder inside its copy's folder, so a faulty render is never reused and nothing stays in the shared cache.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import stat
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import render as RN  # noqa: E402

BLOCK = 'sgs/button'
SHORT = 'button'
# properties a printed part's rule never sets today are tried in this order for add-declaration
PROBE_PROPS = ('outline-color', 'text-decoration-color', 'caret-color', 'accent-color', 'column-rule-color')


class NoCandidate(Exception):
    """The code or the record offers nothing to plant this fault on; the self-test fails with the reason."""


# ---------------------------------------------------------------- reading a stylesheet
def blank_comments(css: str) -> str:
    """The stylesheet with every comment turned into spaces (same length, newlines kept), so offsets still match the original."""
    return re.sub(r'/\*.*?\*/', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), css, flags=re.S)


def norm_sel(s: str) -> str:
    return re.sub(r'\s+', ' ', s.strip())


def split_top(text: str, sep: str) -> list:
    """Split at `sep` outside parentheses, brackets and strings; returns [(start, end)] offsets."""
    out, depth, quote, start = [], 0, '', 0
    for i, ch in enumerate(text):
        if quote:
            if ch == quote and text[i - 1] != '\\':
                quote = ''
        elif ch in '"\'':
            quote = ch
        elif ch in '([':
            depth += 1
        elif ch in ')]':
            depth -= 1
        elif ch == sep and depth == 0:
            out.append((start, i))
            start = i + 1
    out.append((start, len(text)))
    return out


def top_rules(css: str) -> list:
    """Every depth-0 style rule: {prelude: (a, b), selectors: [normalised], body: (a, b), decls: [{prop, value, span}]}.
    At-rules (@media, @supports, @keyframes) are skipped whole: the faults are planted on plain rules only."""
    flat = blank_comments(css)
    rules, i, n = [], 0, len(flat)
    while i < n:
        j = flat.find('{', i)
        if j < 0:
            break
        prelude = (i, j)
        depth, k, quote = 1, j + 1, ''
        while k < n and depth:
            ch = flat[k]
            if quote:
                if ch == quote and flat[k - 1] != '\\':
                    quote = ''
            elif ch in '"\'':
                quote = ch
            elif ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
            k += 1
        body = (j + 1, k - 1)
        text = flat[prelude[0]:prelude[1]]
        stripped = text.strip()
        # a `;`-ended statement (@import, @charset) swept into the prelude is cut off it
        last = text.rfind(';')
        if last >= 0:
            prelude = (prelude[0] + last + 1, prelude[1])
            stripped = flat[prelude[0]:prelude[1]].strip()
        i = k
        if not stripped or stripped.startswith('@'):
            continue
        sels = [norm_sel(flat[prelude[0] + a:prelude[0] + b]) for a, b in split_top(flat[prelude[0]:prelude[1]], ',')]
        decls = []
        for a, b in split_top(flat[body[0]:body[1]], ';'):
            seg = flat[body[0] + a:body[0] + b]
            m = re.match(r'\s*([-\w]+)\s*:\s*(.+?)\s*$', seg, flags=re.S)
            if not m:
                continue
            lead = len(seg) - len(seg.lstrip())
            end = body[0] + b + (1 if body[0] + b < body[1] and flat[body[0] + b] == ';' else 0)
            decls.append({'prop': m.group(1).lower(), 'value': m.group(2), 'span': (body[0] + a + lead, end)})
        rules.append({'prelude': prelude, 'selectors': sels, 'body': body, 'decls': decls})
    return rules


def written_vars(plugin: Path) -> set:
    """Custom properties the block's PHP names (render.php and the shared helpers): a setting writes these."""
    names = set()
    files = [plugin / 'src' / 'blocks' / SHORT / 'render.php', *sorted((plugin / 'includes').rglob('*.php'))]
    for f in files:
        if f.is_file():
            names.update(re.findall(r'(--[a-z][a-z0-9-]*)', f.read_text(encoding='utf-8', errors='ignore')))
    return names


def first_var(value: str) -> str | None:
    m = re.search(r'var\(\s*(--[a-z][a-z0-9-]*)', value)
    return m.group(1) if m else None


# ---------------------------------------------------------------- choosing the faults
def pick_delete_rule(css: str, record: dict, plugin: Path) -> dict:
    """A declaration a stateless, always-on record entry rests on: the entry's selector is a rule's selector in style.css,
    and the rule declares the entry's one property once, from a custom property a setting writes."""
    rules = top_rules(css)
    count = {}
    for r in rules:
        for s in r['selectors']:
            for d in r['decls']:
                count[(s, d['prop'])] = count.get((s, d['prop']), 0) + 1
    written = written_vars(plugin)
    found = []
    for e in sorted(record['entries'], key=lambda e: json.dumps([e['setting'], e['part'], e['props']])):
        if e.get('runner') or e['state'] is not None or e['tiers'] or len(e['props']) != 1 or not e.get('selector'):
            continue
        sel = norm_sel(e['selector'])
        for r in rules:
            if sel not in r['selectors']:
                continue
            for d in r['decls']:
                if d['prop'] != e['props'][0] or count[(sel, d['prop'])] != 1:
                    continue
                v = first_var(d['value'])
                found.append((0 if (v and v in written) else 1, len(r['selectors']), e, d, v))
    if not found:
        raise NoCandidate('no always-on record entry with one property sits on a single declaration in style.css')
    _, _, e, d, v = min(found, key=lambda t: t[:2])
    a, b = d['span']
    return {'file': 'src/blocks/button/style.css', 'edit': ('cut', a, b), 'line': css.count('\n', 0, a) + 1,
            'what': f'deleted `{css[a:b].strip()[:70]}` (rule `{e["selector"]}`)',
            'expect': {'kind': 'remove', 'setting': e['setting'], 'part': e['part'], 'props': e['props']}}


def pick_rename_selector(css: str, record: dict) -> dict:
    """One `:hover` of a rule a hover record entry rests on becomes `:active`: the entry's selector is one selector of the rule,
    has a single `:hover`, and no other rule in the file carries that selector."""
    rules = top_rules(css)
    seen = {}
    for r in rules:
        for s in r['selectors']:
            seen[s] = seen.get(s, 0) + 1
    for e in sorted(record['entries'], key=lambda e: json.dumps([e['setting'], e['part'], e['props']])):
        if e.get('runner') or e['state'] != 'hover' or e['tiers'] or not e.get('selector'):
            continue
        sel = norm_sel(e['selector'])
        if seen.get(sel) != 1 or sel.count(':hover') != 1:
            continue
        r = next(r for r in rules if sel in r['selectors'])
        a, b = r['prelude']
        prelude = blank_comments(css)[a:b]
        # the selector as written in the prelude (its whitespace may differ from the normalised form)
        parts = split_top(prelude, ',')
        hit = [(x, y) for x, y in parts if norm_sel(prelude[x:y]) == sel]
        if len(hit) != 1:
            continue
        x, y = hit[0]
        at = prelude.find(':hover', x, y)
        if at < 0 or prelude.count(':hover', x, y) != 1:
            continue
        return {'file': 'src/blocks/button/style.css', 'edit': ('sub', a + at, a + at + len(':hover'), ':active'), 'line': css.count('\n', 0, a + at) + 1,
                'what': f'renamed `:hover` to `:active` in selector `{sel}`',
                'expect': {'kind': 'state', 'setting': e['setting'], 'part': e['part'], 'state': 'active'}}
    raise NoCandidate('no hover record entry rests on a style.css rule whose selector is unique and has one :hover')


def pick_add_declaration(css: str, record: dict, plugin: Path) -> dict:
    """A rule appended on the first printed part, setting a property the record holds for no setting on that part, from a custom
    property a setting writes (read off a stateless record entry's declaration in style.css)."""
    if not record['parts']:
        raise NoCandidate('the record names no printed part')
    part = record['parts'][0]
    taken = {p for e in record['entries'] if e['part'] == part for p in e['props']}
    prop = next((p for p in PROBE_PROPS if p not in taken), None)
    if not prop:
        raise NoCandidate(f'the record already holds every probe property on {part}')
    written = written_vars(plugin)
    rules = top_rules(css)
    var = None
    for e in sorted(record['entries'], key=lambda e: json.dumps([e['setting'], e['part'], e['props']])):
        if e.get('runner') or e['state'] is not None or e['tiers'] or e.get('kind', 'value') != 'value' or not e.get('selector'):
            continue
        sel = norm_sel(e['selector'])
        for r in rules:
            if sel in r['selectors']:
                for d in r['decls']:
                    v = first_var(d['value'])
                    if v and v in written and d['prop'] in e['props'] and re.search(r'\bsgs-', v):
                        var = var or v
    if not var:
        raise NoCandidate('no style.css declaration of a value entry reads a custom property the PHP writes')
    rule = f'\n.sgs-{SHORT} .{part} {{ {prop}: var({var}); }}\n'
    return {'file': 'src/blocks/button/style.css', 'edit': ('append', rule), 'line': css.count('\n') + 2,
            'what': f'appended `{rule.strip()}`', 'expect': {'kind': 'add', 'part': part, 'prop': prop}}


def pick_drop_part_class(plugin: Path, record: dict) -> dict:
    """A printed part's class taken out of the PHP that prints it: the first record part with exactly one `class="…part…"` in the
    block's render.php or the plugin's includes/."""
    files = [plugin / 'src' / 'blocks' / SHORT / 'render.php', *sorted((plugin / 'includes').rglob('*.php'))]
    texts = {f: f.read_text(encoding='utf-8') for f in files if f.is_file()}
    for part in record['parts']:
        pat = re.compile(r'(?P<pre>\bclass=(?P<q>\\?["\']))(?P<val>[^"\']*?)(?<![\w-])' + re.escape(part) + r'(?![\w-])(?P<post>[^"\']*)(?P=q)')
        hits = [(f, m) for f, t in texts.items() for m in pat.finditer(t)]
        if len(hits) != 1:
            continue
        f, m = hits[0]
        t = texts[f]
        before, after = m.group('val'), m.group('post')
        a, b = m.span()
        if not before.strip() and not after.strip():
            # the class attribute is only this part: take the whole attribute (and the space before it)
            a2 = a - 1 if a > 0 and t[a - 1] == ' ' else a
            edit = ('cut', a2, b)
        else:
            tok = m.start() + len(m.group('pre')) + len(before)
            edit = ('cut', tok, tok + len(part) + (1 if after.startswith(' ') else 0))
        return {'file': f.relative_to(plugin).as_posix(), 'edit': edit, 'line': t.count('\n', 0, edit[1]) + 1,
                'what': f'removed the class `{part}` from `{t[a:b][:80]}`', 'expect': {'kind': 'part', 'part': part}}
    raise NoCandidate('no record part is printed by exactly one literal class="…" in render.php or includes/')


def apply_edit(path: Path, edit: tuple) -> None:
    text = path.read_text(encoding='utf-8')
    if edit[0] == 'cut':
        new = text[:edit[1]] + text[edit[2]:]
    elif edit[0] == 'sub':
        new = text[:edit[1]] + edit[3] + text[edit[2]:]
    else:
        new = text + edit[1]
    if new == text:
        raise NoCandidate(f'the edit changed nothing in {path.name}')
    path.write_text(new, encoding='utf-8', newline='')


# ---------------------------------------------------------------- reading what the check says
def short_entry(e: dict) -> str:
    return f"{e['setting']} {e['part']} {'|'.join(e['props'])[:30]} {e.get('state')} {(e.get('tiers') or [''])[0]}".strip()


def judge(fault: dict, rep: dict) -> tuple:
    """(killed, got): does the check's report hold the finding this fault should produce?"""
    x = fault['expect']
    add, rem, chg, parts = rep.get('add') or [], rep.get('remove') or [], rep.get('change') or [], rep.get('parts') or {}
    order = parts.get('orderChanged')
    first = lambda it: it.get('setting') != x.get('setting')  # noqa: E731  (the planted setting's findings lead the short lists)
    add, rem, chg = sorted(add, key=first), sorted(rem, key=first), sorted(chg, key=first)
    got = {'add': [short_entry(e) for e in add][:6], 'remove': [short_entry(e) for e in rem][:6],
           'change': [f"{c['setting']} {c['part']} {'|'.join(c['props'])[:30]} record {c['record']} code {c['code']}" for c in chg][:6],
           'orderChanged': order, 'declaredNotPrinted': parts.get('declaredNotPrinted'), 'printedNotDeclared': parts.get('printedNotDeclared')}
    if x['kind'] == 'remove':
        ok = any(e['setting'] == x['setting'] and e['part'] == x['part'] and e['props'] == x['props'] for e in rem) or \
            any(c['setting'] == x['setting'] and c['part'] == x['part'] and c['props'] == x['props'] for c in chg)
    elif x['kind'] == 'state':
        ok = any(c['setting'] == x['setting'] and c['part'] == x['part'] and any(s[0] == x['state'] for s in c['code']) for c in chg) or \
            any(e['setting'] == x['setting'] and e['part'] == x['part'] and e['state'] == x['state'] for e in add)
    elif x['kind'] == 'add':
        ok = any(e['part'] == x['part'] and x['prop'] in e['props'] for e in add)
    else:
        part = x['part']
        ok = bool(order and part in (order.get('record') or []) and part not in (order.get('code') or [])) or \
            any(part in (d.get('selector') or '') for d in (parts.get('declaredNotPrinted') or [])) or part in (parts.get('printedNotDeclared') or [])
    return ok, got


def expected_text(fault: dict) -> str:
    x = fault['expect']
    if x['kind'] == 'remove':
        return f"remove (or change): {x['setting']} on {x['part']} {'|'.join(x['props'])}"
    if x['kind'] == 'state':
        return f"change (or add): {x['setting']} on {x['part']} now in state {x['state']}"
    if x['kind'] == 'add':
        return f"add: a setting on {x['part']} with {x['prop']}"
    return f"parts: {x['part']} gone from the printed parts"


# ---------------------------------------------------------------- the run
def copy_code(src: Path, dst: Path) -> None:
    """A real copy (never a link) of every folder a render reads."""
    def unlock(fn, p, _exc):
        os.chmod(p, stat.S_IWRITE)
        fn(p)
    if dst.exists():
        shutil.rmtree(dst, onerror=unlock)
    for root in RN.CODE_ROOTS:
        s, d = src / root, dst / root
        if s.is_dir():
            shutil.copytree(s, d, ignore=shutil.ignore_patterns('__pycache__', 'node_modules'))
        elif s.is_file():
            d.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(s, d)


def check_cmd(args, plugin: Path, out: Path, *mode: str) -> list:
    cmd = [sys.executable, str(HERE / 'check.py'), BLOCK, '--plugin', str(plugin), '--fixtures', str(args.fixtures), '--out', str(out), *mode]
    if args.instances:
        cmd += ['--instances', str(args.instances)]
    if args.instances_dir:
        cmd += ['--instances-dir', str(args.instances_dir)]
    if args.no_proof:
        cmd.append('--no-proof')
    return cmd


def run_one(cmd: list, env: dict) -> dict:
    t0 = time.time()
    p = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', env=env)
    return {'exit': p.returncode, 'stdout': p.stdout.strip()[-1500:], 'stderr': p.stderr.strip()[-1500:], 'seconds': round(time.time() - t0, 1)}


def main(args) -> int:
    t0 = time.time()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    root = RN.CACHE_ROOT / 'self-test'
    plugin = Path(args.plugin).resolve()
    keep = bool(os.environ.get('SGS_SETTING_RECORD_KEEP'))
    results, summary = [], {'clean': None, 'faults': 0, 'killed': 0}

    def finish(ok: bool, why: str = '') -> int:
        summary.update(ok=ok, why=why, seconds=round(time.time() - t0, 1))
        (out / 'self-test.json').write_text(json.dumps({'summary': summary, 'faults': results}, indent=1, default=str), encoding='utf-8')
        print(json.dumps({'self_test': summary}, default=str))
        if not keep and root.exists():
            shutil.rmtree(root, ignore_errors=True)
        return 0 if ok else 1

    # 1. the clean copy writes a record, then must pass against it
    clean = root / 'clean' / 'plugins' / 'sgs-blocks'
    copy_code(plugin, clean)
    record_file = out / 'self-test.clean-record.json'
    env = dict(os.environ)
    w = run_one(check_cmd(args, clean, out / 'clean-write', '--write', str(record_file)), env)
    if not record_file.is_file():
        summary['clean'] = {'step': 'write', **w}
        return finish(False, 'the check could not write the clean record: ' + (w['stderr'] or w['stdout'])[-300:])
    c = run_one(check_cmd(args, clean, out / 'clean-check', '--record', str(record_file)), env)
    summary['clean'] = {'writeSeconds': w['seconds'], 'checkSeconds': c['seconds'], 'exit': c['exit']}
    if c['exit'] != 0:
        rep = out / 'clean-check' / f'{SHORT}.check.json'
        summary['clean']['report'] = str(rep)
        return finish(False, f"the clean copy failed against its own record (exit {c['exit']}); see {rep}: " + (c['stderr'] or c['stdout'])[-300:])
    record = json.loads(record_file.read_text(encoding='utf-8'))

    # 2. choose the four faults from the code and the record
    css = (clean / 'src' / 'blocks' / SHORT / 'style.css').read_text(encoding='utf-8')
    pickers = [('delete-rule', lambda: pick_delete_rule(css, record, clean)),
               ('rename-selector', lambda: pick_rename_selector(css, record)),
               ('add-declaration', lambda: pick_add_declaration(css, record, clean)),
               ('drop-part-class', lambda: pick_drop_part_class(clean, record))]
    faults, missing = [], []
    for name, pick in pickers:
        try:
            f = pick()
        except NoCandidate as exc:
            results.append({'fault': name, 'planted': None, 'killed': False, 'got': {'error': str(exc)}})
            print(json.dumps(results[-1]))
            missing.append(f'{name}: {exc}')
            continue
        f['fault'] = name
        # each fault in its own copy
        dst = root / name / 'plugins' / 'sgs-blocks'
        copy_code(plugin, dst)
        apply_edit(dst / f['file'], f['edit'])
        f['plugin'] = dst
        faults.append(f)
    if missing:
        return finish(False, '; '.join(missing))

    # 3. the four checks at once against the clean record
    workers = str(max(2, (os.cpu_count() or 8) // 4))

    def run_fault(f: dict) -> dict:
        fenv = dict(os.environ, SGS_SETTING_RECORD_WORKERS=workers, SGS_SETTING_RECORD_CACHE=str(root / f['fault'] / 'cache'))
        fout = out / 'self-test' / f['fault']
        r = run_one(check_cmd(args, f['plugin'], fout, '--record', str(record_file)), fenv)
        rep_file = fout / f'{SHORT}.check.json'
        if not rep_file.is_file():
            return {'fault': f['fault'], 'planted': f"{f['file']}:{f['line']} {f['what']}", 'expected': expected_text(f), 'killed': False,
                    'exit': r['exit'], 'got': {'error': 'no report: ' + (r['stderr'] or r['stdout'])[-400:]}, 'seconds': r['seconds']}
        rep = json.loads(rep_file.read_text(encoding='utf-8'))
        named, got = judge(f, rep)
        return {'fault': f['fault'], 'planted': f"{f['file']}:{f['line']} {f['what']}", 'expected': expected_text(f),
                'killed': bool(r['exit'] == 1 and named), 'exit': r['exit'], 'got': got, 'seconds': r['seconds']}

    with ThreadPoolExecutor(len(faults)) as ex:
        for res in ex.map(run_fault, faults):
            results.append(res)
            print(json.dumps(res, default=str))
    summary.update(faults=len(results), killed=sum(1 for r in results if r['killed']))
    survivors = [r['fault'] for r in results if not r['killed']]
    return finish(not survivors, ('survived: ' + ', '.join(survivors)) if survivors else '')


if __name__ == '__main__':
    import check
    sys.exit(check.main(['--self-test', *sys.argv[1:]]))
