#!/usr/bin/env python3
"""Find comment blocks that NARRATE CHANGES rather than describe behaviour.

WHY THIS EXISTS
    Comments here should explain what the code DOES. This project never
    deprecates, and git + .claude/decisions.md already hold the history, so
    prior-state narrative in a source file earns nothing and costs reading.

    A pilot proved the cut cannot be scripted: of 148 lines removed by hand,
    only 27% carried any detectable marker (a date, a D-number, a change verb).
    The other 73% were CONTINUATION lines of a paragraph whose first line had
    the marker — and deciding where the history ends and the behaviour
    description resumes is the whole judgement. A regex tuned to markers finds
    a quarter of the work; tuned to whole paragraphs it over-cuts into
    functional text, which destroys knowledge silently and permanently.

    So this script does NOT edit. It is the FIND half of the project's
    find/fix/gate triad: it locates and ranks candidate blocks and prints them
    with exact line ranges, so a judgement-capable reviewer reads ~200 lines of
    candidates instead of a 1,700-line file. The DECIDE half stays human/model.

    --survey  rank files by narrative density (worst value-per-effort first)
    --extract dump candidate blocks with file:line ranges, ready to work from
    --prohibitions  list every prohibition found, for the triage that matters
                    more than the line count: a rule a gate already enforces is
                    a copy that can rot; a rule NOTHING enforces is either
                    irreplaceable knowledge or a missing gate.
    --self-test
"""
import argparse, glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGETS = [(os.path.join(ROOT, 'src', 'blocks', '*', 'render.php'), 300),
           (os.path.join(ROOT, 'src', 'blocks', '*', 'edit.js'), 250)]

HIST = re.compile(r'\b(20\d\d-\d\d-\d\d|D\d{2,4}\b|previously|no longer|used to|renamed|'
                  r'retired|corrected|superseded|regression|formerly|the old |had been|'
                  r'wrongly|this session|stale|was deleted|re-?introduc|used to be)\b', re.I)
PROH = re.compile(r"(⛔|\bdo NOT\b|\bDo not\b|\bDon't\b|\bnever (add|use|call|emit|re-?introduce|"
                  r"change|remove|put|write|set|make|touch|rely|drop)|\bmust not\b|\bMUST CARRY\b)")
# A gate is an EXECUTABLE check. A STOP-catalogue reference is PROSE and is
# deliberately NOT counted: treating it as enforcement would mark unenforced
# rules as protected and hide the very list this script exists to surface.
GATE = re.compile(r'([a-z0-9-]+\.(?:py|js)\b|prebuild|--check)')


def comment_blocks(path):
    """Yield (start_line, end_line, [lines]) for every contiguous comment run."""
    lines = open(path, encoding='utf-8', errors='ignore').read().split('\n')
    cur, start, inblk = [], None, False
    for i, raw in enumerate(lines, 1):
        s = raw.strip()
        isc = False
        if inblk:
            isc = True
            if '*/' in s:
                inblk = False
        elif s.startswith('/*'):
            isc, inblk = True, '*/' not in s
        elif s.startswith(('//', '*', '#')):
            isc = True
        if isc:
            if start is None:
                start = i
            cur.append(raw)
        else:
            if cur:
                yield start, i - 1, cur
            cur, start = [], None
    if cur:
        yield start, len(lines), cur


def scan():
    out = []
    for pat, lim in TARGETS:
        for f in sorted(glob.glob(pat)):
            total = sum(1 for _ in open(f, encoding='utf-8', errors='ignore'))
            if total <= lim:
                continue
            blocks = []
            for a, b, ls in comment_blocks(f):
                if not any(HIST.search(x) for x in ls):
                    continue
                blocks.append({'start': a, 'end': b, 'lines': ls,
                               'proh': [x.strip() for x in ls if PROH.search(x)],
                               'gate': bool(any(GATE.search(x) for x in ls))})
            if blocks:
                out.append({'file': os.path.relpath(f, ROOT).replace(os.sep, '/'),
                            'block': os.path.basename(os.path.dirname(f)),
                            'total': total,
                            'cand_lines': sum(len(x['lines']) for x in blocks),
                            'blocks': blocks})
    # Rank by candidate lines — value per batch, not raw file size. A 1,758-line
    # file that is half documentation is a worse target than a dense 560-line one.
    out.sort(key=lambda r: -r['cand_lines'])
    return out


FIXTURE = """<?php
// Plain behaviour description, no history. Must NOT be flagged.
$a = 1;

// D649: the title carries `sgs-product-card__title` so styling keys on IDENTITY,
// not tag name. Bound markup previously emitted a bare tag, which forced
// style.css to enumerate `> h2, > h4`.
$b = 2;

// ⛔ do NOT reorder $attributes before hashing (STOP-NO-KSORT). Renamed 2026-08-01.
$c = 3;

// The no-inline contract: do NOT emit an inline style declaration — enforced
// by audit-inline-styling.js --check. Corrected 2026-08-13.
$d = 4;
"""


def self_test():
    import tempfile
    fails = []

    def chk(label, cond):
        print(('  PASS  ' if cond else '  FAIL  ') + label)
        if not cond:
            fails.append(label)

    with tempfile.TemporaryDirectory() as td:
        p = os.path.join(td, 'fixture.php')
        open(p, 'w', encoding='utf-8').write(FIXTURE)
        blocks = list(comment_blocks(p))
        hist = [b for b in blocks if any(HIST.search(x) for x in b[2])]

        chk('finds every comment run', len(blocks) == 4)
        # NEGATIVE CONTROL: a purely descriptive comment must not be flagged, or
        # the detector would sweep the whole file and prove nothing.
        chk('negative control: plain comment NOT flagged', len(hist) == 3)
        chk('flags the D-number block', any('D649' in ' '.join(b[2]) for b in hist))
        chk('flags the renamed/dated block', any('STOP-NO-KSORT' in ' '.join(b[2]) for b in hist))

        proh = [b for b in hist if any(PROH.search(x) for x in b[2])]
        chk('detects prohibitions inside history blocks', len(proh) == 2)

        gated = [b for b in proh if any(GATE.search(x) for x in b[2])]
        chk('separates GATE-BACKED from unenforced', len(gated) == 1)
        # A STOP-catalogue reference must NOT count as enforcement — that
        # misclassification would hide unenforced rules, the opposite of the goal.
        chk('STOP- prose is NOT treated as a gate',
            not any('STOP-NO-KSORT' in ' '.join(b[2]) for b in gated))

        # Line ranges must be usable as an address, not approximate.
        first = hist[0]
        chk('line range is exact', FIXTURE.split('\n')[first[0] - 1].strip().startswith('// D649'))
    return fails


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--extract', action='store_true')
    ap.add_argument('--prohibitions', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    ap.add_argument('--top', type=int, default=20)
    ap.add_argument('--only', help='comma-separated block slugs')
    ap.add_argument('--json', action='store_true')
    a = ap.parse_args()

    if a.self_test:
        f = self_test()
        print('\n' + ('SELF-TEST FAILED' if f else 'self-test: all assertions passed'))
        return 1 if f else 0

    rows = scan()
    if a.only:
        want = set(a.only.split(','))
        rows = [r for r in rows if r['block'] in want]
    else:
        rows = rows[:a.top]

    if a.prohibitions:
        gated = unenforced = 0
        print('PROHIBITIONS inside change-narrative blocks')
        print('  GATE-BACKED  = prose names a real check; the gate is the defence, prose can rot')
        print('  UNENFORCED   = nothing checks it; KEEP verbatim, or promote it to a gate\n')
        for r in rows:
            for b in r['blocks']:
                for line in b['proh']:
                    kind = 'GATE-BACKED' if b['gate'] else 'UNENFORCED '
                    gated += b['gate']
                    unenforced += (not b['gate'])
                    print(f'  [{kind}] {r["file"]}:{b["start"]}-{b["end"]}')
                    print(f'      {line[:150]}')
        print(f'\n  {gated} gate-backed | {unenforced} UNENFORCED (the ones worth promoting)')
        return 0

    if a.extract:
        for r in rows:
            print(f'\n{"="*74}\n{r["file"]}  ({r["total"]} lines, {r["cand_lines"]} candidate)\n{"="*74}')
            for b in r['blocks']:
                flag = ' [HAS PROHIBITION — keep it]' if b['proh'] else ''
                print(f'\n--- lines {b["start"]}-{b["end"]}{flag} ---')
                for i, l in enumerate(b['lines'], b['start']):
                    print(f'{i:>5}| {l}')
        return 0

    if a.json:
        print(json.dumps([{k: v for k, v in r.items() if k != 'blocks'} for r in rows], indent=1))
        return 0

    print(f'{"file":<44}{"total":>7}{"cand":>7}{"blocks":>8}{"proh":>6}')
    tot = 0
    for r in rows:
        p = sum(len(b['proh']) for b in r['blocks'])
        tot += r['cand_lines']
        print(f'{r["file"][11:]:<44}{r["total"]:>7}{r["cand_lines"]:>7}{len(r["blocks"]):>8}{p:>6}')
    allrows = scan()
    print(f'\n  shown {len(rows)} of {len(allrows)} files | candidate lines here {tot} '
          f'of {sum(x["cand_lines"] for x in allrows)} '
          f'({tot/sum(x["cand_lines"] for x in allrows)*100:.0f}%)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
