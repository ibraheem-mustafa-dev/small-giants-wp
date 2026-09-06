#!/usr/bin/env python3
"""Move the overlay's responsive tier axis OFF colour and ONTO opacity (D739).

WHY: `backgroundOverlayColour{Tablet,Mobile}` were the ONLY responsive colour
attributes in the whole framework (8 blocks; no other colour attr across 83
blocks carries a tier suffix). Meanwhile `backgroundOverlayOpacity` — the
property a client actually varies per device ("heavier scrim on mobile") — was
single-value, so that need was inexpressible.

Crossing tier x state also produced an incoherent control: the colour row sat
inside the global device switcher AND carried Normal/Hover tabs AND a per-state
Solid/Gradient toggle. Three axes for one property, two of them in different
places on screen. Bean flagged the seam: a hover tab visible only on desktop.

After this the colour row has exactly the golden shape every other colour
control has, and the device axis lives on opacity — a plain RangeControl that
nests under the device switcher without conflict.
"""
import argparse, json, io, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
BLOCKS = ['container', 'cta-section', 'hero', 'multi-button', 'physics-canvas',
          'site-footer', 'site-header', 'trust-bar']
DROP = ['backgroundOverlayColourTablet', 'backgroundOverlayColourMobile',
        'overlayGradientTablet', 'overlayGradientMobile']
ADD = ['backgroundOverlayOpacityTablet', 'backgroundOverlayOpacityMobile']

def path_for(b):
    return ROOT / 'src' / 'blocks' / b / 'block.json'

def read(b):
    p = path_for(b)
    return p, io.open(p, encoding='utf-8', newline='').read()

def transform(raw):
    """SURGICAL text edit, never a re-serialise.

    json.dumps() over the whole file reformats every untouched key and, on a
    CRLF checkout, rewrites every line ending — a whole-file diff that hides
    the real change. Both are recorded failure modes here, so this edits the
    exact attribute blocks as text and leaves the rest byte-identical.
    """
    out, changed = raw, False
    for k in DROP:
        pat = re.compile('\n\t\t"' + re.escape(k) + '": [{].*?\n\t\t[}],', re.S)
        out2, n = pat.subn('', out)
        if n:
            out, changed = out2, True
    anchor = '\n\t\t"backgroundOverlayOpacity": {'
    if anchor in out:
        end = out.find('\n\t\t},', out.index(anchor)) + len('\n\t\t},')
        ins = ''
        for k in ADD:
            if '"' + k + '"' not in out:
                ins += '\n\t\t"' + k + '": {\n\t\t\t"type": "number"\n\t\t},'
                changed = True
        if ins:
            out = out[:end] + ins + out[end:]
    return out, changed

def survey():
    print('%-16s%-14s%s' % ('block', 'to-drop', 'tier-opacity present'))
    for b in BLOCKS:
        _, raw = read(b)
        a = json.loads(raw)['attributes']
        print('%-16s%-14d%d' % (b, len([d for d in DROP if d in a]),
                                len([k for k in ADD if k in a])))

def fix(apply):
    for b in BLOCKS:
        p, raw = read(b)
        out, changed = transform(raw)
        if not changed:
            print('  %s: already migrated' % b); continue
        try:
            json.loads(out)
        except Exception as e:
            print('  %s: REFUSED, would emit invalid JSON: %s' % (b, e)); sys.exit(2)
        if apply:
            io.open(p, 'w', encoding='utf-8', newline='').write(out)
            print('  %s: migrated' % b)
        else:
            print('  %s: would drop %d, add %d (dry run)' % (b, len(DROP), len(ADD)))

def check():
    bad = []
    for b in BLOCKS:
        _, raw = read(b)
        a = json.loads(raw)['attributes']
        bad += ['%s: still declares %s' % (b, k) for k in DROP if k in a]
        bad += ['%s: missing %s' % (b, k) for k in ADD if k not in a]
    if bad:
        print('[overlay-tier-axis] FAIL')
        for x in bad: print('  ' + x)
        return 1
    print('[overlay-tier-axis] PASS - %d blocks: tier axis on opacity, not colour' % len(BLOCKS))
    return 0

def self_test():
    b = BLOCKS[0]; p = path_for(b)
    original = io.open(p, encoding='utf-8', newline='').read()
    try:
        assert check() == 0, 'tree must be clean before the negative control'
        broken = original.replace('\n\t\t"backgroundOverlayOpacity": {',
            '\n\t\t"backgroundOverlayColourTablet": {\n\t\t\t"type": "string"\n\t\t},'
            '\n\t\t"backgroundOverlayOpacity": {', 1)
        assert broken != original, 'injection did not land'
        io.open(p, 'w', encoding='utf-8', newline='').write(broken)
        rc = check()
        assert rc == 1, 'NEGATIVE CONTROL DID NOT LAND - check returned %r, expected 1' % rc
        print('  negative control: reintroduced tier-colour attr -> RED (correct)')
    finally:
        io.open(p, 'w', encoding='utf-8', newline='').write(original)
    assert check() == 0, 'restore failed'
    print('  restored -> GREEN')
    print('[overlay-tier-axis] SELF-TEST PASS')
    return 0

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--fix', action='store_true')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    n = ap.parse_args()
    if n.survey: survey()
    elif n.fix: fix(n.apply)
    elif n.check: sys.exit(check())
    elif n.self_test: sys.exit(self_test())
    else: ap.print_help()
