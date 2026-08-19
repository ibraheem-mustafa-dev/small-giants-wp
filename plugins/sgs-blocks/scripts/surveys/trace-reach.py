"""Trace WHY a block is credited with reaching a component. Debug aid for
survey-control-reach.py — prints the resolution path, so a suspicious number
can be confirmed or refuted instead of trusted.

Usage: python scripts/surveys/trace-reach.py <ComponentName> [block-slug]
"""
import os
import re
import sys
import glob

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib.util

spec = importlib.util.spec_from_file_location(
    'reach', os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          'survey-control-reach.py'))

TARGET = sys.argv[1] if len(sys.argv) > 1 else 'BoxControl'
ONLY = sys.argv[2] if len(sys.argv) > 2 else None
BASE = '.'
SRC = os.path.join(BASE, 'src')

MOUNT = re.compile(r'<([A-Z]\w*)')
ALIAS = re.compile(r'\b(?:const|let|var)\s+([A-Z]\w*)\s*=\s*([^;\n]{0,200}(?:\n[^;]{0,200}){0,3})')
DECL_EXPORT = re.compile(r'export\s+(?:default\s+)?(?:function|const|let|class)\s+([A-Z]\w*)')
LOCAL_DECL = re.compile(r'(?:^|\n)\s*(?:function|const|let|class)\s+([A-Z]\w*)')
EXPORT_LIST = re.compile(r'export\s*\{([^}]*)\}')
IMPORT_NAMED = re.compile(r'import\s*\{([^}]*)\}\s*from')
IMPORT_DEFAULT = re.compile(r'import\s+([A-Z]\w*)\s+from')


def strip(src):
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


def split_list(raw):
    for part in raw.split(','):
        n = re.split(r'\s+as\s+', part.strip())[-1].strip()
        if re.fullmatch(r'[A-Z]\w*', n):
            yield n


def build_index():
    strong, weak = {}, {}
    dirs = [os.path.join(SRC, 'components')]
    dirs += sorted(glob.glob(os.path.join(SRC, 'blocks', '*', 'components')))
    dirs.append(os.path.join(SRC, 'blocks', 'extensions'))
    for d in dirs:
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if not f.endswith('.js') or f == 'index.js':
                continue
            full = os.path.join(d, f)
            src = read(full)
            imported = set()
            for m in IMPORT_NAMED.finditer(src):
                imported.update(split_list(m.group(1)))
            for m in IMPORT_DEFAULT.finditer(src):
                imported.add(m.group(1))
            declared = set(DECL_EXPORT.findall(src)) | set(LOCAL_DECL.findall(src))
            listed = set()
            for m in EXPORT_LIST.finditer(src):
                listed.update(split_list(m.group(1)))
            for n in declared - imported:
                strong.setdefault(n, full)
            base = os.path.splitext(f)[0]
            if re.fullmatch(r'[A-Z]\w*', base):
                weak.setdefault(base, full)
            for n in listed:
                if n in declared and n not in imported:
                    continue
                weak.setdefault(n, full)
    idx = dict(weak)
    idx.update(strong)
    return idx


CACHE = {}


def mounts(path, explain=False):
    if path in CACHE and not explain:
        return CACHE[path]
    src = strip(read(path))
    found = set(MOUNT.findall(src))
    why = {}
    for m in ALIAS.finditer(src):
        rhs = set(re.findall(r'\b([A-Z]\w*)\b', m.group(2)))
        if m.group(1) in found:
            for r in rhs:
                if r not in found:
                    why[r] = 'alias via <%s> = %s' % (m.group(1), m.group(2).strip()[:60])
            found |= rhs
    CACHE[path] = found
    return (found, why) if explain else found


def main():
    idx = build_index()
    for bpath in sorted(glob.glob(os.path.join(SRC, 'blocks', '*', 'edit.js'))):
        slug = os.path.basename(os.path.dirname(bpath))
        if ONLY and slug != ONLY:
            continue
        seen = set()
        path_to = {}
        queue = [(n, 0, slug + '/edit.js') for n in mounts(bpath)]
        hit = None
        while queue:
            name, d, via = queue.pop()
            if name in seen:
                continue
            seen.add(name)
            path_to[name] = via
            if name == TARGET:
                hit = via
                break
            f = idx.get(name)
            if f and d < 6:
                for child in mounts(f):
                    if child not in seen:
                        queue.append((child, d + 1, via + ' -> <' + name + '> (' +
                                      os.path.basename(f) + ')'))
        if hit:
            print('%-26s %s' % (slug, hit))


main()
