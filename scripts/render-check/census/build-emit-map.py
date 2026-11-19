#!/usr/bin/env python3
"""Build emit-map.json: for each block type that carries Custom CSS, which selector and property each of its settings really prints.

  python build-emit-map.py --site <wsl-site-folder> [--out <dir>] [--jobs 6] [--only sgs/cart,sgs/account]

It reads <out>/posts-raw.json (export-custom-css.py writes it) and writes <out>/emit-map.json; the probe's inputs and logs sit in <out> too.

It takes each block type's saved settings from the export (the instance with the most settings, so mode switches such as a drawer are on),
lists every attribute the framework database records for the block with a few probe values by type, and runs emit-probe.php on the mirror
(`wp eval-file`, rendering only: no post, option or meta is written). The probe changes one setting at a time and keeps the CSS rules that
change. Run it on a scratch copy of the site (a `local-*` mirror), not the site being audited.
"""
import argparse
import importlib.util
import json
import os
import re
import subprocess
import sys

from census_common import HERE, add_site_args, popen_php, resolve, to_wsl

spec = importlib.util.spec_from_file_location('detector', os.path.join(HERE, 'check-custom-css-has-setting.py'))
det = importlib.util.module_from_spec(spec)
spec.loader.exec_module(det)


def box(v):
    return dict(top=v, right=v, bottom=v, left=v)


STRINGS = ['#010203', '7px', 'solid', '700', 'none', 'center']   # a string setting whose property the database does not record
# Probe values by the kind of value a CSS property takes (CSS knowledge, not framework knowledge).
BY_PROPERTY = [
    (r'color$|^stroke$|^fill$', ['#010203']),
    (r'^font-weight$', ['700']), (r'^font-style$', ['italic']), (r'^font-family$', ['body', 'Georgia']), (r'^text-transform$', ['uppercase']),
    (r'^text-decoration', ['underline']), (r'^text-align$', ['center']), (r'^box-shadow$', ['sm', 'md', '4px 4px 0 0 #010203']),
    (r'style$', ['solid']), (r'^(align|justify)-', ['center', 'flex-start']), (r'^background-image$', ['linear-gradient(90deg,#010203,#040506)']),
    (r'width$|height$|padding|margin|gap$|radius$|size$|spacing$|^(top|right|bottom|left|inset)$|offset$|thickness$', ['7px', '7']),
    (r'^line-height$', ['1.7', '7px']), (r'^opacity$', ['0.7']), (r'^z-index$|^order$|^flex', ['7']),
]
OBJECTS = [
    dict(desktop='7px', tablet='5px', mobile='3px'),
    dict(desktop=box('7px'), tablet=box('5px'), mobile=box('3px')),
    box('7px'),
    dict(desktop=dict(width='7px', style='solid', colour='#010203'), tablet=dict(width='5px', style='solid', colour='#010203'), mobile=dict(width='3px', style='solid', colour='#010203')),
    dict(width='7px', style='solid', colour='#010203'),
    dict(desktop=7, tablet=5, mobile=3),
    dict(desktop='center', tablet='center', mobile='center'),
    dict(desktop='top', tablet='top', mobile='top'),
    dict(desktop='underline', tablet='underline', mobile='underline'),
    dict(topLeft='7px', topRight='7px', bottomLeft='7px', bottomRight='7px'),
]


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    add_site_args(ap)
    ap.add_argument('--only', help='comma-separated block names')
    ap.add_argument('--jobs', type=int, default=6)
    a = ap.parse_args()
    out_dir = resolve(a)
    posts_path, emit_path = os.path.join(out_dir, 'posts-raw.json'), os.path.join(out_dir, 'emit-map.json')
    if not os.path.exists(posts_path):
        sys.exit('%s is missing: run export-custom-css.py --site %s first.' % (posts_path, a.site))
    fw = det.Framework()
    records = det.records_from_posts(det.load_posts(posts_path))
    base = {}
    for r in records:
        # A visibility condition (signed in only, hidden on a device) can stop the probe's render; it is not a look setting.
        base.setdefault(r['block'], []).append({k: v for k, v in r['attrs'].items() if not k.startswith(('sgsCondition', 'sgsHideOn'))})
    for block in base:
        base[block] = sorted(base[block], key=lambda x: -len(x))[:8]   # the instance with the most settings first
    only = set(a.only.split(',')) if a.only else None
    probe_in = {}
    for block, attrs in sorted(base.items()):
        if only and block not in only:
            continue
        rows = fw.con.execute('select attr_name, attr_type, enum_values, css_property from block_attributes where block_slug=?', (block,)).fetchall()
        probes = []
        for name, atype, enum, css_property in rows:
            if name.startswith('sgsCustomCss') or atype in ('array', 'rich-text'):
                continue
            try:
                enum = list(json.loads(enum)) if enum else []
            except ValueError:
                enum = []
            if atype == 'boolean':
                cands, mode = [True, False], 'all'
            elif atype in ('number', 'integer'):
                cands, mode = [7, 3], 'first'
            elif atype == 'object':
                cands, mode = ([dict(desktop=e, tablet=e, mobile=e) for e in enum if e != ''] + OBJECTS), 'first'
            else:
                prop = css_property
                if not prop:
                    derived = fw.property_of(name)
                    prop = derived[0] if derived else ''
                typed = next((v for pat, v in BY_PROPERTY if prop and re.search(pat, prop)), None)
                cands, mode = ([e for e in enum if isinstance(e, str)] or typed or STRINGS), ('all' if enum else 'first')
            probes.append([name, cands, mode])
        if probes:
            probe_in[block] = dict(bases=attrs, probes=probes)
    # One process per share of the blocks, the largest blocks spread first, so the probe uses every core it is given.
    shares = [dict() for _ in range(max(1, a.jobs))]
    for block in sorted(probe_in, key=lambda b: -len(probe_in[b]['probes'])):
        min(shares, key=lambda sh: sum(len(v['probes']) for v in sh.values()))[block] = probe_in[block]
    procs = []
    for i, share in enumerate(s for s in shares if s):
        in_path, out_path = os.path.join(out_dir, 'probe-input.%d.json' % i), os.path.join(out_dir, 'emit-map.%d.json' % i)
        json.dump(share, open(in_path, 'w', encoding='utf-8'), ensure_ascii=False)
        if os.path.exists(out_path):
            os.remove(out_path)
        log = open(os.path.join(out_dir, 'emit-probe.%d.log' % i), 'w', encoding='utf-8')
        procs.append((popen_php(a.site, os.path.join(HERE, 'emit-probe.php'), [to_wsl(in_path), to_wsl(out_path)], stdout=log, stderr=subprocess.STDOUT), out_path, in_path, log))
    merged, code = {}, 0
    for proc, out_path, in_path, log in procs:
        code = proc.wait() or code
        log.close()
        if os.path.exists(out_path):
            merged.update(json.load(open(out_path, encoding='utf-8')))
            os.remove(out_path)
        os.remove(in_path)
    if only and os.path.exists(emit_path):
        merged = dict(json.load(open(emit_path, encoding='utf-8')), **merged)   # --only refreshes those blocks and keeps the rest
    json.dump(merged, open(emit_path, 'w', encoding='utf-8'), ensure_ascii=False)
    for block, row in sorted(merged.items()):
        print('%-40s %s' % (block, 'not rendered' if not row.get('rendered') else '%d settings print CSS, %d renders, %ss' % (len(row['attrs']), row.get('renders', 0), row.get('seconds'))))
    return code


if __name__ == '__main__':
    sys.exit(main())
