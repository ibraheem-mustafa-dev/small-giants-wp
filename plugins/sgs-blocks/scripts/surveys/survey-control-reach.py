"""REACH, not mounts: which blocks can actually reach each control component.

A mount census answers "how many `<X` tags exist". It systematically UNDER-counts
any control a block reaches through a shared panel, and is blind by construction to
controls injected by a universal extension (those arrive via a
`blocks.registerBlockType` filter, so they never appear in a block's edit.js at all).

Mirrors the precedence rule in the other track's `resolveComponentFiles()`
(inspector-scan/core/components.js, commit 002a5fcb): a file that DECLARES a name
beats one that only RE-EXPORTS it, regardless of readdir order. Without that, the
268-line `ContainerWrapperControls.js` facade claims `LayoutPanel`, `WidthPanel`
and four more whose contents moved out from under it.

Comment stripping order is load-bearing — see measure-controls.py's strip().
"""
import re
import os
import sys
import glob
import json
import collections

BASE = sys.argv[1] if len(sys.argv) > 1 else '.'
SRC = os.path.join(BASE, 'src')

DECL_EXPORT = re.compile(r'export\s+(?:default\s+)?(?:function|const|let|class)\s+([A-Z]\w*)')
LOCAL_DECL = re.compile(r'(?:^|\n)\s*(?:function|const|let|class)\s+([A-Z]\w*)')
EXPORT_LIST = re.compile(r'export\s*\{([^}]*)\}')
IMPORT_NAMED = re.compile(r'import\s*\{([^}]*)\}\s*from')
IMPORT_DEFAULT = re.compile(r'import\s+([A-Z]\w*)\s+from')
MOUNT = re.compile(r'<([A-Z]\w*)')


def strip(src):
    """Blank comments, preserving length. LINE COMMENTS FIRST — a `//` comment
    citing a glob path (`src/blocks/*/block.json`) contains `/*/`, which holds
    both `/*` and `*/` sharing one asterisk; running the block pass first opens a
    comment there and swallows hundreds of lines of real code."""
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
    """name -> defining file, declaration beating re-export."""
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


ALIAS = re.compile(r'\b(?:const|let|var)\s+([A-Z]\w*)\s*=\s*([^;\n]{0,200}(?:\n[^;]{0,200}){0,3})')


def mounts(path, cache={}):
    """Component names this file renders, INCLUDING variable-aliased ones.

    ⛔ A tag scan alone is not enough. SgsColourPanel.js:103-105 does

        const Control = row.gradientCapable
            ? GradientCapableColourControl
            : DesignTokenPicker;
        return <Control ... />;

    so the file renders NEITHER name as a literal tag. Measured 2026-08-19: a
    tag-only scan reported GradientCapableColourControl as having zero mounts
    tree-wide and called it dead code. It is live in 6 blocks. It also cut
    DesignTokenPicker's reach to 33 when SgsColourPanel alone puts it past 60.
    Resolve `const Tag = A : B` aliases and credit every capitalised identifier
    on the right-hand side.
    """
    if path in cache:
        return cache[path]
    src = strip(read(path))
    found = set(MOUNT.findall(src))
    aliases = {}
    for m in ALIAS.finditer(src):
        rhs = set(re.findall(r'\b([A-Z]\w*)\b', m.group(2)))
        if rhs:
            aliases[m.group(1)] = rhs
    for tag in list(found):
        if tag in aliases:
            found |= aliases[tag]
    cache[path] = found
    return found


def main():
    idx = build_index()
    blocks = sorted(glob.glob(os.path.join(SRC, 'blocks', '*', 'edit.js')))
    reach = collections.defaultdict(set)
    depth_found = collections.Counter()

    for bpath in blocks:
        slug = os.path.basename(os.path.dirname(bpath))
        seen = set()
        # (name, depth) — depth 0 = mounted directly in edit.js
        queue = [(n, 0) for n in mounts(bpath)]
        while queue:
            name, d = queue.pop()
            if name in seen:
                continue
            seen.add(name)
            reach[name].add(slug)
            if d == 0:
                depth_found[name] += 0
            f = idx.get(name)
            if f and d < 6:
                for child in mounts(f):
                    if child not in seen:
                        queue.append((child, d + 1))

    direct = {}
    for bpath in blocks:
        slug = os.path.basename(os.path.dirname(bpath))
        for n in mounts(bpath):
            direct.setdefault(n, set()).add(slug)

    watch = ['SgsColourPanel', 'DesignTokenPicker', 'GradientOverlayControl',
             'SgsGradientPicker', 'LinkPopoverField', 'ResponsiveControl',
             'ResponsiveOverride', 'ResponsiveBoxControl', 'ResponsiveBoxControls',
             'ResponsiveBorderRadiusControl', 'TypographyControls', 'ShadowControl',
             'IconPicker', 'MediaPicker', 'MediaGalleryPicker', 'SpacingControl',
             'UnitControl', 'BoxControl', 'SelectControl', 'ToggleControl',
             'TextControl', 'RangeControl', 'ToggleGroupControl', 'FocalPointPicker',
             'NumberControl', 'TextareaControl', 'CheckboxControl', 'MediaUpload',
             'FormTokenField', 'ComboboxControl', 'RadioControl']

    print('REACH vs DIRECT MOUNT   (denominator: %d blocks)' % len(blocks))
    print('%-32s %8s %8s %8s' % ('COMPONENT', 'direct', 'reach', 'hidden'))
    for n in watch:
        dcount = len(direct.get(n, ()))
        rcount = len(reach.get(n, ()))
        if dcount or rcount:
            print('%-32s %8d %8d %8d' % (n, dcount, rcount, rcount - dcount))

    print()
    print('EXTENSION SURFACE (injected by filter — NEVER in a block edit.js)')
    exts = sorted(glob.glob(os.path.join(SRC, 'blocks', 'extensions', '*.js')))
    for e in exts:
        name = os.path.basename(e)
        if name == 'index.js':
            continue
        m = mounts(e)
        ctrl = sorted(x for x in m if x in watch or x.endswith('Control')
                      or x.endswith('Picker') or x.endswith('Panel'))
        if ctrl:
            print('  %-32s %s' % (name, ', '.join(ctrl)))


main()
