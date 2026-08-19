"""Re-measure every control-population figure Spec 35 Part O asserts.

Run from the plugin root:  python scripts/surveys/survey-control-mounts.py .

Reports MOUNTS (JSX occurrences), never REACH. A component mounted once inside a
shared panel or an extension reaches many blocks; that is a different number and
this script does not claim it — see the sibling survey-control-reach.py, which
does, and reports the two side by side.

Comments are stripped (block + line) before counting, because a docblock naming a
component is not a mount.

⛔ STATE THE PREDICATE beside every figure. Three different true numbers exist for
`imageControls` alone — 15 blocks DECLARE the key, 7 set it true, 8 set it false —
and quoting one under another's name is how Spec 35 accumulated six stale figures.
Not in `prebuild`, and must not be added: this is a census with no `--check` mode,
and a non-gating script inside a gate chain is enforcement theatre.
"""
import re
import glob
import os
import sys
import json
import collections

BASE = sys.argv[1] if len(sys.argv) > 1 else '.'

COMPS = [
    # SGS canonical
    'DesignTokenPicker', 'SgsColourPanel', 'SgsGradientPicker', 'GradientOverlayControl',
    'GradientCapableColourControl', 'LinkPopoverField', 'LinkPopoverContent', 'SgsLinkControl',
    'ResponsiveControl', 'ResponsiveOverride', 'ResponsiveTriStateControl',
    'ResponsiveBoxControl', 'ResponsiveBoxControls', 'ResponsiveBorderRadiusControl',
    'TypographyControls', 'ShadowControl', 'IconPicker', 'MediaPicker', 'MediaGalleryPicker',
    'StateToggleControl', 'SpacingControl', 'AnimationControl', 'ScaleAxisControl', 'DeviceTabs',
    # core primitives
    'SelectControl', 'ToggleGroupControl', 'ToggleControl', 'TextControl', 'RangeControl',
    'UnitControl', 'NumberControl', 'BoxControl', 'CheckboxControl', 'TextareaControl',
    'FocalPointPicker', 'FormTokenField', 'ComboboxControl', 'MediaUpload', 'RadioControl',
    'DateTimePicker', 'ColorPalette', 'PanelColorSettings', 'GradientPicker', 'LinkControl',
    'URLInput',
]


def strip(src):
    """Blank out comments, preserving length so offsets stay valid.

    ORDER IS LOAD-BEARING: line comments FIRST. A `//` comment citing a glob
    path — `src/blocks/*/block.json` — contains the substring `/*/`, which holds
    BOTH `/*` and `*/` sharing one asterisk. Run the block-comment pass first and
    it opens a comment there, cannot close on the overlapping `*/`, and runs on to
    the next `*/` far later in the file, masking hundreds of lines of real code.
    Measured 2026-08-19: that under-counted <SgsColourPanel by 2 (58 vs a true 60)
    and named two live mounts as "commented out". Strip the `//` line first and
    the offending text is gone before the block pass ever sees it.
    """
    out = list(src)

    def blank(match):
        for i in range(match.start(), match.end()):
            if out[i] != '\n':
                out[i] = ' '

    for m in re.finditer(r'^[ \t]*//.*$', src, flags=re.M):
        blank(m)
    for m in re.finditer(r'/\*.*?\*/', ''.join(out), flags=re.S):
        blank(m)
    return ''.join(out)


def main():
    scopes = collections.OrderedDict()
    scopes['edit'] = sorted(glob.glob(BASE + '/src/blocks/*/edit.js'))
    sub = [f for f in sorted(glob.glob(BASE + '/src/blocks/*/components/*.js'))]
    sub += [f for f in sorted(glob.glob(BASE + '/src/blocks/*/*.js'))
            if not f.endswith('edit.js')]
    scopes['sub'] = sub
    scopes['ext'] = sorted(glob.glob(BASE + '/src/blocks/extensions/*.js'))
    shared = sorted(glob.glob(BASE + '/src/components/*.js'))
    shared += sorted(glob.glob(BASE + '/src/components/*/*.js'))
    scopes['shared'] = shared

    total = collections.Counter()
    blocks = collections.defaultdict(set)
    per = collections.defaultdict(collections.Counter)

    for name, files in scopes.items():
        for f in files:
            src = strip(open(f, encoding='utf-8', errors='replace').read())
            for c in COMPS:
                n = len(re.findall(r'<' + c + r'\b', src))
                if not n:
                    continue
                per[name][c] += n
                total[c] += n
                if name == 'edit':
                    blocks[c].add(os.path.basename(os.path.dirname(f)))

    print('MOUNT CENSUS  (comments stripped; mounts != reach)')
    print('%-31s %5s %5s %5s %6s %6s %7s' % (
        'COMPONENT', 'edit', 'sub', 'ext', 'shared', 'TOTAL', 'blocks'))
    for c in COMPS:
        if total[c]:
            print('%-31s %5d %5d %5d %6d %6d %7d' % (
                c, per['edit'][c], per['sub'][c], per['ext'][c],
                per['shared'][c], total[c], len(blocks[c])))
    dead = [c for c in COMPS if not total[c]]
    print()
    print('ZERO MOUNTS ANYWHERE: ' + (', '.join(dead) if dead else '(none)'))
    print()

    # ---- block.json derived ----
    files = sorted(glob.glob(BASE + '/src/blocks/*/block.json'))
    enums = collections.Counter()
    elements = 0
    declaring = 0
    st = collections.Counter()
    multi_state = 0
    el_states = 0
    supports_color = 0
    color_flag_true = 0
    imagectl = 0
    imagectl_true = 0
    boxfam = 0
    print('BLOCK.JSON DERIVED   (files: %d)' % len(files))
    for f in files:
        d = json.load(open(f, encoding='utf-8'))
        sup = d.get('supports') or {}
        sgs = sup.get('sgs') or {}
        els = sgs.get('elements')
        if isinstance(els, dict):
            declaring += 1
            elements += len(els)
            for v in els.values():
                s = (v or {}).get('states')
                if isinstance(s, dict) and s:
                    el_states += 1
                    for k in s:
                        st[k] += 1
                    if len(s) > 1:
                        multi_state += 1
        # STATE THE PREDICATE. Three different true numbers exist here and they
        # get confused: 15 blocks DECLARE the key, 7 set it true, 8 set it false.
        # Spec 35 §7.5's "15 blocks declaring" is the DECLARE count and is correct.
        if 'imageControls' in sgs:
            imagectl += 1
            if sgs['imageControls'] is True:
                imagectl_true += 1
        if sgs.get('boxFamilies'):
            boxfam += 1
        col = sup.get('color')
        if isinstance(col, dict):
            supports_color += 1
            if any(v is True for v in col.values()):
                color_flag_true += 1
        for spec in (d.get('attributes') or {}).values():
            if isinstance(spec, dict) and isinstance(spec.get('enum'), list) and spec['enum']:
                enums[len(spec['enum'])] += 1
    print('  declaring supports.sgs.elements : %d of %d' % (declaring, len(files)))
    print('  total declared elements         : %d' % elements)
    print('  elements declaring any state    : %d  (%s)  multi-state: %d'
          % (el_states, dict(st), multi_state))
    print('  declares supports.color         : %d   (>=1 sub-flag true: %d)'
          % (supports_color, color_flag_true))
    print('  declares supports.sgs.imageControls : %d  (set true: %d)'
          % (imagectl, imagectl_true))
    print('  declares supports.sgs.boxFamilies   : %d' % boxfam)
    tot_enum = sum(enums.values())
    print('  declared enums                  : %d' % tot_enum)
    run = 0
    for n in sorted(enums):
        run += enums[n]
        print('      %d options: %3d  (cum %4.1f%%)' % (n, enums[n], 100 * run / tot_enum))

    # ---- roster surfaces ----
    rp = BASE + '/scripts/consistency/roster.json'
    if os.path.exists(rp):
        r = json.load(open(rp, encoding='utf-8'))
        rows = r.get('blocks') or []
        surf = collections.Counter()
        for b in rows:
            s = b.get('surfaces') or {}
            for k, v in s.items():
                if v is True:
                    surf[k] += 1
        print()
        print('ROSTER SURFACES (blocks: %d)' % len(rows))
        for k in sorted(surf):
            print('  surfaces.%-16s %d' % (k, surf[k]))


main()
