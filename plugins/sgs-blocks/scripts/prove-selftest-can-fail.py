"""Prove a detector's --self-test is LOAD-BEARING, not decorative.

A passing self-test proves nothing on its own. This repo has a recorded case
where a literal backspace byte (0x08) replaced `\\b` in a regex: the rule matched
nothing, passed every run, and was indistinguishable from a clean tree. Only the
fixture caught it — and the identical byte recurred hours later in a second fix.

METHOD: copy the detector to a temp file, inject a break into its core matcher,
run its --self-test, and require it to FAIL. If the broken copy still passes, the
self-test is not testing the thing it claims to test.

⛔ Operates on a COPY. Never mutates a repo file as a fixture — D659 records an
agent doing exactly that and the defect shipping.

Usage: python scripts/prove-selftest-can-fail.py <script.py> <find> <replace>
"""
import os
import sys
import shutil
import subprocess
import tempfile

# Windows console defaults to cp1252 and dies on a non-latin-1 glyph mid-print,
# which would make THIS script crash exactly when reporting a failure.
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(2)
    target, find, replace = sys.argv[1], sys.argv[2], sys.argv[3]

    if not os.path.exists(target):
        print('FAIL: no such script: %s' % target)
        sys.exit(2)

    # 1. Baseline — the real script's self-test must PASS first, or the
    #    experiment proves nothing about the break.
    base = subprocess.run([sys.executable, target, '--self-test'],
                          capture_output=True, text=True)
    if base.returncode != 0:
        print('FAIL: baseline self-test does not pass; fix that first')
        print(base.stdout[-400:])
        sys.exit(1)
    print('baseline self-test        : PASS (exit 0)')

    tmpdir = tempfile.mkdtemp(prefix='selftest-proof-')
    copy = os.path.join(tmpdir, os.path.basename(target))
    shutil.copy2(target, copy)

    src = open(copy, encoding='utf-8').read()
    if find not in src:
        print('FAIL: break-string %r not found in the script — nothing injected, '
              'so a PASS below would be meaningless' % find)
        shutil.rmtree(tmpdir, ignore_errors=True)
        sys.exit(1)
    broken = src.replace(find, replace)
    if broken == src:
        print('FAIL: replacement produced an identical file')
        shutil.rmtree(tmpdir, ignore_errors=True)
        sys.exit(1)
    open(copy, 'w', encoding='utf-8').write(broken)
    print('injected break            : %r -> %r' % (find, replace))

    got = subprocess.run([sys.executable, copy, '--self-test'],
                         capture_output=True, text=True)
    shutil.rmtree(tmpdir, ignore_errors=True)

    if got.returncode == 0:
        print('broken-copy self-test     : PASS  <-- ⛔ THE SELF-TEST IS NOT '
              'LOAD-BEARING. It passes with the matcher broken.')
        sys.exit(1)
    print('broken-copy self-test     : FAIL (exit %d) — self-test is load-bearing'
          % got.returncode)
    tail = (got.stdout or got.stderr or '').strip().splitlines()[-2:]
    for line in tail:
        print('    %s' % line)
    sys.exit(0)


main()
