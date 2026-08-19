"""Extract the REQUIRED props (and the __next* opt-ins) from Gutenberg's own
component READMEs, so each golden can state the native contract rather than our
recollection of it.

Input:  a directory of README.md files fetched by fetch-native-control-contracts.sh
Usage:  python scripts/surveys/extract-native-contracts.py /tmp/native-contracts

⚠ VERSION CAVEAT — carry it into any golden built from this. @wordpress/components
is NOT an npm dependency of this plugin; WordPress supplies it at runtime, so the
governing version is whatever WP ships (7.0.2 on the canary), not package.json.
This reads Gutenberg TRUNK. Required props and the __next* opt-ins are stable
across recent versions, but re-verify against the live editor before gating.
"""
import os
import re
import sys
import json

SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/native-contracts'

# README prop blocks look like:
#   ### `propName`
#   - Type: `string`
#   - Required: Yes
#   - Default: ...
PROP = re.compile(
    r'^#{2,4}\s*`?(?P<name>[A-Za-z_][\w]*)`?\s*$'
    r'(?P<body>(?:\n(?!#{2,4}\s).*)*)',
    re.M)
REQUIRED = re.compile(r'^\s*[-*]\s*Required:\s*(Yes|No)', re.M | re.I)
TYPE = re.compile(r'^\s*[-*]\s*Type:\s*`?([^`\n]+)`?', re.M | re.I)
DEFAULT = re.compile(r'^\s*[-*]\s*Default:\s*`?([^`\n]+)`?', re.M | re.I)


def parse(path):
    src = open(path, encoding='utf-8', errors='replace').read()
    required, optional, nexts = [], [], []
    for m in PROP.finditer(src):
        name = m.group('name')
        body = m.group('body') or ''
        req = REQUIRED.search(body)
        typ = TYPE.search(body)
        dflt = DEFAULT.search(body)
        rec = {
            'name': name,
            'type': typ.group(1).strip() if typ else None,
            'default': dflt.group(1).strip() if dflt else None,
        }
        if name.startswith('__next') or name.startswith('__experimental'):
            nexts.append(rec)
        elif req and req.group(1).lower() == 'yes':
            required.append(rec)
        elif req:
            optional.append(rec)
    return required, optional, nexts


def main():
    if not os.path.isdir(SRC):
        print('no such directory: %s' % SRC)
        sys.exit(1)
    out = {}
    files = sorted(f for f in os.listdir(SRC) if f.endswith('.md'))
    print('NATIVE CONTROL CONTRACTS  (Gutenberg trunk — re-verify against WP 7.0.x)')
    print()
    for f in files:
        comp = f[:-3]
        req, opt, nxt = parse(os.path.join(SRC, f))
        out[comp] = {'required': req, 'optional': opt, 'futureFlags': nxt}
        print('%-24s required=%-2d optional=%-3d __next/__experimental=%d'
              % (comp, len(req), len(opt), len(nxt)))
        if req:
            print('     REQUIRED: ' + ', '.join(
                '%s:%s' % (r['name'], (r['type'] or '?')) for r in req))
        if nxt:
            print('     OPT-INS : ' + ', '.join(r['name'] for r in nxt))
    with open(os.path.join(SRC, '_contracts.json'), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, indent=2)
    print()
    print('wrote %s' % os.path.join(SRC, '_contracts.json'))


main()
