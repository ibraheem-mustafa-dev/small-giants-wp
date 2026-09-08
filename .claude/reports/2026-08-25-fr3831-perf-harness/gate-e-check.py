"""Gate E — enumerate third-party material in this scratch tree, by CONTENT not by filename.

WHY A SCRIPT AND NOT A HAND-WRITTEN LIST
----------------------------------------
A hand-counted manifest is exactly the failure this project has hit repeatedly: a list that looks
complete, passes every correctness check, and quietly omits items. This session already proved the
specific hazard here — `blend-live-full.png` is byte-identical to `blend-fixed.png` and is a RIG
render, not a live capture, while its name says the opposite. Classifying by name would put a file
we own on the deletion list and leave a real capture off it.

So classification is done by content wherever content can decide:

  * .glsl anywhere               -> third-party shader source          (DELETE at Gate E)
  * assets/palette-*             -> third-party artwork                (DELETE at Gate E)
  * any screenshot closer to a known-LIVE capture than to a known-RIG  (DELETE at Gate E)
      render, by mean absolute difference
  * vendor/three*                -> MIT, notice intact                 (KEEP — doctrine, not licence)
  * everything else              -> ours                               (KEEP)

WHAT GATE E IS, CORRECTED
-------------------------
D783 framed deletion as closing a licence exposure. That framing was too blunt. CDPA s.50BA makes
studying a program to determine its underlying ideas a PERMITTED ACT that a licence cannot
override, so holding this material for study was never unlawful. The real risk is PROPAGATION: a
scratch file drifting into tracked git, a snippet pasted into shipped code, an agent reproducing it
in a document.

That risk is now largely retired by construction, because the durable asset has been extracted:
`.claude/reports/2026-08-25-generative-background-engine-technique-spec.md` describes every mechanism in our
own words, with no third-party source, so the originals are no longer load-bearing.

Usage:  python perf/gate-e-check.py            # report
        python perf/gate-e-check.py --manifest # write perf/gate-e-manifest.txt
"""

import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Content anchors, both verified this session:
#   gateb-live.png  — a real screenshot of the live page
#   FINAL-rig.png   — a local render (byte-identical to 11 other local captures)
ANCHOR_LIVE = 'gateb-live.png'
ANCHOR_RIG = 'FINAL-rig.png'

IMAGE_EXT = {'.png', '.webp', '.jpg', '.jpeg'}

# Files whose origin is DOCUMENTED, for cases content-comparison cannot decide because their
# geometry differs from the anchors (crops, and DPR-2 captures). Listed explicitly with the
# reason, rather than left "undecided" — an unresolved entry on a deletion manifest is how a
# real capture gets left behind.
KNOWN_LIVE = {
    'gateb-clean-live.png': 'crop of gateb-live.png, produced by verify-council.py',
    'gateb-crop-live.png': 'crop of gateb-live.png, produced by gate-b.mjs',
    'perf/heldout-live-dpr2.png': 'DPR-2 capture of stripe.com, produced by perf/capture-heldout.mjs',
}


def arr(path):
    return np.asarray(Image.open(path).convert('RGB'), dtype=np.int16)


def diff(a, b):
    return 100.0 * np.abs(a - b).mean() / 255.0


def classify():
    live = arr(os.path.join(ROOT, ANCHOR_LIVE))
    rig = arr(os.path.join(ROOT, ANCHOR_RIG))

    delete, keep, undecided = [], [], []

    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in ('.git', 'node_modules')]
        for fn in filenames:
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, ROOT).replace('\\', '/')
            ext = os.path.splitext(fn)[1].lower()

            if rel in KNOWN_LIVE:
                delete.append((rel, 'live capture — documented provenance: %s' % KNOWN_LIVE[rel]))
                continue
            if ext == '.glsl':
                delete.append((rel, 'third-party shader source'))
                continue
            if rel.startswith('assets/palette-'):
                delete.append((rel, 'third-party palette artwork'))
                continue
            if rel.startswith('vendor/'):
                keep.append((rel, 'three.js — MIT, SPDX notice intact; doctrine concern only'))
                continue
            if ext in IMAGE_EXT:
                try:
                    a = arr(full)
                except Exception as e:
                    undecided.append((rel, 'unreadable: %s' % e))
                    continue
                if a.shape != live.shape:
                    # Different geometry: cannot be compared against the anchors. Decide by the
                    # only other signal available, and SAY it is name-based so it is auditable.
                    if 'live' in fn.lower() or 'stripe' in fn.lower():
                        undecided.append((rel, 'size %s differs from anchors; name suggests live capture — CHECK BY HAND' % (a.shape,)))
                    else:
                        keep.append((rel, 'size %s differs from anchors; treated as ours' % (a.shape,)))
                    continue
                dl, dr = diff(a, live), diff(a, rig)
                if dl < dr:
                    delete.append((rel, 'screenshot of the live page (%.2f%% from live vs %.2f%% from rig)' % (dl, dr)))
                else:
                    keep.append((rel, 'local render (%.2f%% from rig vs %.2f%% from live)' % (dr, dl)))
                continue

            keep.append((rel, 'ours'))

    return delete, keep, undecided


def main():
    delete, keep, undecided = classify()
    delete.sort()
    undecided.sort()

    print('=' * 78)
    print('GATE E — third-party material in .claude/scratch/stripe-hero-poc/')
    print('=' * 78)
    print('\nDELETE AT GATE E (%d files)\n' % len(delete))
    for rel, why in delete:
        print('  %-42s  %s' % (rel, why))

    if undecided:
        print('\n*** UNDECIDED — resolve by hand before firing Gate E (%d) ***\n' % len(undecided))
        for rel, why in undecided:
            print('  %-42s  %s' % (rel, why))

    print('\nKEEP: %d files (ours, or MIT with notice intact)' % len(keep))
    print('\nPRECONDITIONS for firing Gate E:')
    print('  1. The technique spec exists and is buildable-from:')
    print('     .claude/reports/2026-08-25-generative-background-engine-technique-spec.md')
    print('  2. Q6 measured                     — DONE 2026-08-25')
    print('  3. Held-out fidelity validated     — DONE 2026-08-25')
    print('  Gate E is gated on a satisfied precondition, not a calendar date. A date drifts.')

    if '--manifest' in sys.argv:
        out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gate-e-manifest.txt')
        with open(out, 'w') as fh:
            fh.write('# Gate E deletion manifest — generated by perf/gate-e-check.py\n')
            fh.write('# Classified by CONTENT, not by filename. Re-run the script to regenerate;\n')
            fh.write('# never hand-edit, and never trust this list without re-running it first.\n\n')
            for rel, why in delete:
                fh.write('%s\n' % rel)
            if undecided:
                fh.write('\n# UNDECIDED — resolve by hand:\n')
                for rel, why in undecided:
                    fh.write('# %s  (%s)\n' % (rel, why))
        print('\nwritten: perf/gate-e-manifest.txt')


if __name__ == '__main__':
    main()
