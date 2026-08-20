"""Does resolution DEPTH change the answer? Measure, do not assume.

survey-golden-conformance.js resolves reach with exactly ONE hop: a block's own
JSX, then the mounts of each file those names resolve to. It stops there.
survey-control-reach.py walks up to 6 hops.

If depth 1 and depth N agree for every component the schema names as canonical,
the one-hop design is safe and the deeper walk is unnecessary complexity. If they
disagree, one-hop under-reports and reports CONFORMANT blocks as VIOLATION.

Usage: python scripts/surveys/compare-reach-depth.py [base]
       python scripts/surveys/compare-reach-depth.py --self-test
"""
import os
import re
import sys
import glob
import collections
import tempfile

BASE = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != '--self-test' else '.'
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
    # BFS, not DFS — deliberately FIFO (popleft), never a LIFO stack.
    #
    # ROOT CAUSE (2026-08-20, /systematic-debugging, proven by trace not
    # inferred): a name can be reachable via TWO paths of different depth in
    # the same walk (e.g. DesignTokenPicker is both a direct d=0 mount AND a
    # d=1 alias-resolved child of SgsColourPanel's runtime `const Control =
    # cond ? A : B` dispatch). With a LIFO stack (`queue.pop()`), a LATER-
    # appended, DEEPER duplicate can be popped and marked `seen` before the
    # EARLIER, SHALLOWER original — permanently capping that node's depth at
    # the worse value and silently blocking its own children (ColorPalette,
    # in the example above) from ever being explored within a tight
    # `max_depth`, even though a valid shorter path existed. Which duplicate
    # wins was ALSO non-deterministic run-to-run, because Python randomises
    # string-hash order per process by default, which shuffles the iteration
    # order of the (now-larger) alias-enriched `mounts()` sets that seed the
    # initial queue.
    #
    # A FIFO queue removes the race structurally: every depth-0 entry is
    # fully processed (and its children enqueued) before ANY depth-1 entry
    # is even considered, by construction — so the first time a name is
    # popped, it is always via its minimum depth. Standard BFS guarantee,
    # not a special case. Reproduced and fixed against the real `sgs/heading`
    # block via scripts/surveys/_diag_reach.py (throwaway, not committed) —
    # `ColorPalette` reach for depth1_alias went 0 -> 4, matching
    # depth1_noalias exactly, as it always should have.
    seen = set()
    queue = collections.deque((n, 0) for n in mounts(bpath, resolve_alias))
    while queue:
        name, d = queue.popleft()
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


def self_test():
    """Regression fixture for the 2026-08-20 LIFO-race bug: a name reachable
    both as a direct d=0 mount AND as a d=1 alias-resolved child (the real
    shape: DesignTokenPicker via SgsColourPanel's runtime ternary) must never
    lose reach to its OWN children when alias resolution is on — the
    monotonic-superset property (alias reach >= no-alias reach, always) must
    hold. Before the fix this failed non-deterministically depending on
    Python's per-process string-hash seed; run several times to catch a
    reintroduced race, not just once."""
    global CACHE
    ok = True
    with tempfile.TemporaryDirectory() as tmp:
        comp_dir = os.path.join(tmp, 'src', 'components')
        os.makedirs(comp_dir)
        # Root.js: the block's own edit.js analogue — mounts BOTH TargetA
        # directly (d=0) AND Wrapper (d=0, whose own alias resolution ALSO
        # reaches TargetA at d=1 — the race).
        open(os.path.join(comp_dir, 'Root.js'), 'w', encoding='utf-8').write(
            '<TargetA /><Wrapper />'
        )
        # Wrapper.js: mounts a variable via a runtime ternary whose branches
        # include TargetA — mirrors SgsColourPanel.js's real
        # `const Control = cond ? A : B` shape.
        open(os.path.join(comp_dir, 'Wrapper.js'), 'w', encoding='utf-8').write(
            'const Picked = cond ? TargetA : TargetB;\n<Picked />'
        )
        # TargetA.js: mounts a literal child — this is what must be found
        # within depth 1 via TargetA's d=0 occurrence, exactly like
        # DesignTokenPicker.js mounting <ColorPalette> for real.
        open(os.path.join(comp_dir, 'TargetA.js'), 'w', encoding='utf-8').write(
            '<Grandchild />'
        )
        open(os.path.join(comp_dir, 'TargetB.js'), 'w', encoding='utf-8').write('')

        global SRC
        old_src = SRC
        SRC = os.path.join(tmp, 'src')
        CACHE = {}
        try:
            idx = build_index()
            root = os.path.join(comp_dir, 'Root.js')
            no_alias = reach(root, idx, 1, False)
            alias = reach(root, idx, 1, True)
        finally:
            SRC = old_src
            CACHE = {}

    def check(name, cond):
        nonlocal ok
        status = 'OK' if cond else 'FAIL'
        if not cond:
            ok = False
        print('  [%s] %s' % (status, name))

    check(
        'TargetA reachable without alias (direct d=0 mount)',
        'TargetA' in no_alias,
    )
    check(
        'Grandchild reachable without alias (TargetA is d=0, its child is d=1, within max_depth=1)',
        'Grandchild' in no_alias,
    )
    check(
        'monotonic superset: alias reach is a SUPERSET of no-alias reach (the actual bug — this failed non-deterministically before the fix)',
        no_alias <= alias,
    )
    check(
        'Grandchild STILL reachable with alias on (the exact regression — TargetA must not get shadow-capped at d=1 by Wrapper\'s alias-resolved duplicate)',
        'Grandchild' in alias,
    )

    print('[compare-reach-depth] self-test %s.' % ('PASSED' if ok else 'FAILED'))
    return ok


if '--self-test' in sys.argv:
    sys.exit(0 if self_test() else 1)
else:
    main()
