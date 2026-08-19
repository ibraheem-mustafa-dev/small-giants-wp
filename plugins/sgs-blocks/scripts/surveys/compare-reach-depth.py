"""Does resolution DEPTH change the answer? Measure, do not assume.

survey-golden-conformance.js resolves reach with exactly ONE hop: a block's own
JSX, then the mounts of each file those names resolve to. It stops there.
survey-control-reach.py walks up to 6 hops.

If depth 1 and depth N agree for every component the schema names as canonical,
the one-hop design is safe and the deeper walk is unnecessary complexity. If they
disagree, one-hop under-reports and reports CONFORMANT blocks as VIOLATION.

Usage: python scripts/surveys/compare-reach-depth.py [base]
"""
import os
import re
import sys
import glob
import collections

BASE = sys.argv[1] if len(sys.argv) > 1 else '.'
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


def mounts(path, resolve_alias):
    key = (path, resolve_alias)
    if key in CACHE:
        return CACHE[key]
    src = strip(read(path))
    found = set(MOUNT.findall(src))
    if resolve_alias:
        for m in ALIAS.finditer(src):
            if m.group(1) in found:
                found |= set(re.findall(r'\b([A-Z]\w*)\b', m.group(2)))
    CACHE[key] = found
    return found


def reach(bpath, idx, max_depth, resolve_alias):
    seen = set()
    queue = [(n, 0) for n in mounts(bpath, resolve_alias)]
    while queue:
        name, d = queue.pop()
        if name in seen:
            continue
        seen.add(name)
        f = idx.get(name)
        if f and d < max_depth:
            for child in mounts(f, resolve_alias):
                if child not in seen:
                    queue.append((child, d + 1))
    return seen


# The components the schema names, plus the ones a golden would name next.
WATCH = ['SgsColourPanel', 'DesignTokenPicker', 'GradientCapableColourControl',
         'SgsGradientPicker', 'GradientOverlayControl', 'LinkPopoverField',
         'ResponsiveBoxControl', 'ResponsiveBorderRadiusControl', 'ResponsiveControl',
         'ResponsiveOverride', 'TypographyControls', 'ShadowControl', 'IconPicker',
         'MediaPicker', 'BoxControl', 'ColorPalette', 'UnitControl']


def main():
    idx = build_index()
    blocks = sorted(glob.glob(os.path.join(SRC, 'blocks', '*', 'edit.js')))
    variants = {
        'depth1_noalias': (1, False),   # what survey-golden-conformance.js does
        'depth1_alias': (1, True),
        'depth6_alias': (6, True),      # what survey-control-reach.py does
    }
    counts = {k: collections.Counter() for k in variants}
    for b in blocks:
        slug = os.path.basename(os.path.dirname(b))
        for label, (d, a) in variants.items():
            for n in reach(b, idx, d, a):
                if n in WATCH:
                    counts[label][n] += 1

    print('REACH BY RESOLUTION STRATEGY  (blocks out of %d)' % len(blocks))
    print('%-32s %14s %12s %12s   %s' % (
        'COMPONENT', 'depth1_noalias', 'depth1_alias', 'depth6_alias', 'verdict'))
    for n in WATCH:
        a = counts['depth1_noalias'][n]
        b_ = counts['depth1_alias'][n]
        c = counts['depth6_alias'][n]
        if a == b_ == c:
            verdict = 'agree'
        elif a == b_:
            verdict = 'DEPTH matters (+%d)' % (c - b_)
        elif b_ == c:
            verdict = 'ALIAS matters (+%d)' % (b_ - a)
        else:
            verdict = 'BOTH matter (+%d alias, +%d depth)' % (b_ - a, c - b_)
        print('%-32s %14d %12d %12d   %s' % (n, a, b_, c, verdict))


main()
