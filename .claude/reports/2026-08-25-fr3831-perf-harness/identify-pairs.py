"""Identify which stored PNGs actually correspond to the recorded 2x2 blend/colour-space cells.

WHY THIS EXISTS
---------------
compare.py was first pointed at `blend-live-full.png` vs `f-cs-none-BLEND.png` on the strength of
their FILENAMES, expecting the recorded 0.66% "none + live blend" cell. It returned 14.81% with a
sign-flipped bias — the signature of a different cell entirely.

Filenames are not evidence. This script finds the pairing by CONTENT: it scores every ordered
pair of same-size captures and matches the results against the four recorded cells, so the
comparator is validated against a known answer rather than an assumed one.

Recorded cells (from the anatomy report, signed bias = rig - live):
    none + live blend        0.66%   +0.02 / -0.30 / -0.45
    tex  + three.js default  2.65%   -1.9  / -9.6  / -7.8
    none + three.js default 10.11%   +1.6  / +37.5 / +34.9
    tex  + live blend       14.95%   -5.8  / -58.8 / -49.4
"""

import glob
import itertools
import sys

import numpy as np
from PIL import Image

CROP = (1150, 100, 1420, 600)

TARGETS = [
    ('none + live blend  (THE 0.66% CELL)', 0.66, (+0.02, -0.30, -0.45)),
    ('tex  + three.js default', 2.65, (-1.9, -9.6, -7.8)),
    ('none + three.js default', 10.11, (+1.6, +37.5, +34.9)),
    ('tex  + live blend', 14.95, (-5.8, -58.8, -49.4)),
]


def arr(path):
    im = Image.open(path).convert('RGB').crop(CROP)
    return np.asarray(im, dtype=np.int16)


def score(a, b):
    """b treated as the candidate/rig, a as the reference/live."""
    d = b - a
    signed = d.reshape(-1, 3).mean(axis=0)
    abs_mean = np.abs(d).mean()
    bias = np.abs(signed).mean() / abs_mean if abs_mean else 0.0
    chan_max = np.abs(d).max(axis=2)
    return {
        'pct': 100.0 * abs_mean / 255.0,
        'signed': signed,
        'bias': bias,
        'within8': 100.0 * (chan_max <= 8).mean(),
        'worst': int(chan_max.max()),
    }


def main():
    files = sorted(f for f in glob.glob('*.png') if Image.open(f).size == (1440, 900))
    print('candidate 1440x900 captures: %d' % len(files))
    for f in files:
        print('   ', f)
    print()

    cache = {f: arr(f) for f in files}
    rows = []
    for a, b in itertools.permutations(files, 2):
        s = score(cache[a], cache[b])
        rows.append((s['pct'], a, b, s))

    rows.sort(key=lambda r: r[0])

    print('=' * 96)
    print('ALL ORDERED PAIRS, cheapest difference first   (reference -> candidate)')
    print('=' * 96)
    for pct, a, b, s in rows[:12]:
        print('%7.2f%%  bias %.2f  within8 %5.1f%%  worst %3d  R%+7.2f G%+7.2f B%+7.2f   %-24s -> %s'
              % (pct, s['bias'], s['within8'], s['worst'],
                 s['signed'][0], s['signed'][1], s['signed'][2], a, b))

    print()
    print('=' * 96)
    print('MATCH AGAINST THE RECORDED CELLS')
    print('=' * 96)
    for name, want_pct, want_bias in TARGETS:
        best = None
        for pct, a, b, s in rows:
            # match on magnitude of the percentage AND the shape of the per-channel bias
            err = abs(pct - want_pct)
            berr = sum(abs(s['signed'][i] - want_bias[i]) for i in range(3))
            total = err * 10 + berr
            if best is None or total < best[0]:
                best = (total, pct, a, b, s)
        total, pct, a, b, s = best
        ok = abs(pct - want_pct) < 0.35
        print('%-40s want %6.2f%%  got %6.2f%%  %s' % (name, want_pct, pct, 'MATCH' if ok else 'NO MATCH'))
        print('        %s  ->  %s' % (a, b))
        print('        signed R%+.2f G%+.2f B%+.2f   (wanted R%+.2f G%+.2f B%+.2f)'
              % (s['signed'][0], s['signed'][1], s['signed'][2], *want_bias))
        print()


if __name__ == '__main__':
    main()
