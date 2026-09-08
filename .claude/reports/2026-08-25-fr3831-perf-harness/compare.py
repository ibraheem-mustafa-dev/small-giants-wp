"""The canonical fidelity comparator — metric, crop and tolerance fixed in code.

WHY THIS EXISTS
---------------
The adversarial council confirmed that the comparator which produced the 2.6% and 10.1%
figures "was never committed — run ad hoc, now gone". `gate-b.mjs` only captures screenshots;
`verify-council.py` is a one-off fact-check hardcoded to specific files and specific claims.
So the headline fidelity number could not be re-derived by anyone, including its author.

A fidelity number nobody can reproduce is not a measurement. This file is the fix.

WHAT IT REPORTS, AND WHY EACH PART
----------------------------------
* mean absolute difference        — the headline, and on its own it is misleading
* SIGNED mean per channel         — separates a directional colour cast from zero-mean noise
* bias/abs ratio                  — 1.0 = pure systematic error, 0.0 = pure noise. This is the
                                    statistic that exposed the compensating-error bug: the
                                    residual was 96% directional while being described as grain
* the DISTRIBUTION (4/8/16/32)    — a 6.61 mean once concealed a 137/255 worst case
* worst single channel            — the tail the mean hides

The 5% ceiling is applied as a PASS/FAIL line, but see the note printed with it: it is a local
convention adopted for this study, with no derivation and no precedent elsewhere in this
project. It is not a project standard and must not be cited as one.

USAGE
    python perf/compare.py <reference.png> <candidate.png> [--crop x0,y0,x1,y1] [--scale N]
                           [--label "..."] [--json out.json]

    --scale multiplies the crop box, for comparing DPR-2 captures against a DPR-1 crop spec.
"""

import argparse
import json
import os
import sys

try:
    import numpy as np
    from PIL import Image
except ImportError:
    sys.exit('Pillow and numpy are required:  pip install Pillow numpy')

# The text-free ribbon crop used by Gate B, in DPR-1 screenshot coordinates.
# Chosen because Stripe overlays hero copy on the left of the canvas; this box is pure effect.
# NOTE the council's finding: this box also avoids the ribbon's silhouette edges, which is
# exactly where a blend-mode difference would show. It is the harsher crop on colour and the
# softer crop on edges. Both facts belong with any number derived from it.
DEFAULT_CROP = (1150, 100, 1420, 600)

CEILING_PCT = 5.0


def load(path, box):
    im = Image.open(path).convert('RGB')
    if box:
        w, h = im.size
        x0, y0, x1, y1 = box
        if x1 > w or y1 > h:
            sys.exit('crop %s exceeds image %s for %s' % (box, (w, h), path))
        im = im.crop(box)
    return im


def compare(ref_path, cand_path, box, label):
    ref = load(ref_path, box)
    cand = load(cand_path, box)
    if ref.size != cand.size:
        sys.exit('size mismatch after crop: %s vs %s' % (ref.size, cand.size))

    a = np.asarray(ref, dtype=np.int16)
    b = np.asarray(cand, dtype=np.int16)
    n = a.shape[0] * a.shape[1]

    d = b - a
    signed = d.reshape(-1, 3).mean(axis=0)
    abs_mean = float(np.abs(d).mean())
    chan_max = np.abs(d).max(axis=2)
    worst = int(chan_max.max())
    within = {t: int((chan_max <= t).sum()) for t in (4, 8, 16, 32)}

    signed = [float(s) for s in signed]
    bias_ratio = (sum(abs(s) for s in signed) / 3 / abs_mean) if abs_mean else 0.0
    pct = 100 * abs_mean / 255

    return {
        'label': label,
        'reference': os.path.basename(ref_path),
        'candidate': os.path.basename(cand_path),
        'crop': list(box) if box else None,
        'pixels': n,
        'mean_abs_255': abs_mean,
        'mean_abs_pct': pct,
        'signed_mean': {'R': signed[0], 'G': signed[1], 'B': signed[2]},
        'bias_over_abs': bias_ratio,
        'within_pct': {str(k): 100.0 * v / n for k, v in sorted(within.items())},
        'reference_note': (
            'VERIFY WHICH FILE IS THE LIVE CAPTURE BY CONTENT, NOT BY NAME. '
            'gateb-live.png is the live stripe.com capture; blend-live-full.png is NOT '
            '(it is byte-identical to blend-fixed.png, a rig render).'
        ),
        'worst_single_channel_255': worst,
        'ceiling_pct': CEILING_PCT,
        'under_ceiling': pct < CEILING_PCT,
    }


def report(r):
    print('=' * 74)
    print('FIDELITY COMPARISON — %s' % r['label'])
    print('=' * 74)
    print('  reference : %s' % r['reference'])
    print('  candidate : %s' % r['candidate'])
    print('  crop      : %s   (%d pixels)' % (r['crop'], r['pixels']))
    print()
    print('  mean abs difference : %.2f/255  = %.2f%%' % (r['mean_abs_255'], r['mean_abs_pct']))
    s = r['signed_mean']
    print('  SIGNED mean (cand-ref): R %+.2f   G %+.2f   B %+.2f' % (s['R'], s['G'], s['B']))
    print('  bias / abs ratio    : %.2f   (1.0 = pure systematic, 0.0 = pure noise)'
          % r['bias_over_abs'])
    print()
    print('  DISTRIBUTION (the mean hides the tail — report both)')
    for k in ('4', '8', '16', '32'):
        print('    within %-3s/255 all channels : %5.1f%%' % (k, r['within_pct'][k]))
    print('    worst single channel       : %d/255' % r['worst_single_channel_255'])
    print()
    verdict = 'UNDER' if r['under_ceiling'] else 'OVER'
    print('  %s the %.0f%% ceiling.' % (verdict, r['ceiling_pct']))
    print('  NOTE: that ceiling is a LOCAL CONVENTION adopted for this study. It has no')
    print('        derivation and no precedent elsewhere in this project. Do not cite it as')
    print('        a project standard.')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('reference')
    ap.add_argument('candidate')
    ap.add_argument('--crop', default=None, help='x0,y0,x1,y1 (default: the Gate B ribbon crop)')
    ap.add_argument('--scale', type=float, default=1.0, help='multiply the crop box, e.g. 2 for DPR-2 captures')
    ap.add_argument('--label', default='unlabelled')
    ap.add_argument('--json', default=None)
    a = ap.parse_args()

    box = tuple(int(v) for v in a.crop.split(',')) if a.crop else DEFAULT_CROP
    if a.scale != 1.0:
        box = tuple(int(round(v * a.scale)) for v in box)

    r = compare(a.reference, a.candidate, box, a.label)
    r['crop_scale'] = a.scale
    report(r)

    if a.json:
        with open(a.json, 'w') as fh:
            json.dump(r, fh, indent=2)
        print('\n  written: %s' % a.json)


if __name__ == '__main__':
    main()
