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

Usage: python scripts/prove-selftest-can-fail.py <script.py|script.js> <find> <replace>

A .js target is run with `node` instead of the Python interpreter. Its copy is
made INSIDE the target's own directory rather than the system temp dir, for two
reasons that both fail silently otherwise: a detector that `require`s a sibling
(e.g. `./check-undefined-refs.selftest.js`) cannot find it from an unrelated
directory, and Node resolves `node_modules` by walking UP from the file — from
the system temp dir there is no `@babel/parser` to find. Sibling files sharing
the target's stem are copied alongside it. It is still a COPY; no repo file is
ever mutated.
"""
import glob
import os
import sys
import shutil
import subprocess
import tempfile


def _cmd(script_path):
    """Interpreter for a target, chosen by extension."""
    if script_path.endswith('.js'):
        return ['node', script_path, '--self-test']
    return [sys.executable, script_path, '--self-test']

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
    base = subprocess.run(_cmd(target), capture_output=True, text=True)
    if base.returncode != 0:
        print('FAIL: baseline self-test does not pass; fix that first')
        print((base.stdout or base.stderr)[-400:])
        sys.exit(1)
    print('baseline self-test        : PASS (exit 0)')

    # A .js copy must sit inside the project so that both its sibling requires
    # and node_modules resolution still work; see the module docstring.
    target_dir = os.path.dirname(os.path.abspath(target))
    if target.endswith('.js'):
        tmpdir = tempfile.mkdtemp(prefix='.selftest-proof-', dir=target_dir)
    else:
        tmpdir = tempfile.mkdtemp(prefix='selftest-proof-')
    copy = os.path.join(tmpdir, os.path.basename(target))
    shutil.copy2(target, copy)

    # Carry across siblings sharing the target's stem (e.g. a split-out
    # `<stem>.selftest.js`), or the copy cannot require them.
    stem = os.path.splitext(os.path.basename(target))[0]
    for sibling in glob.glob(os.path.join(target_dir, stem + '.*')):
        if os.path.abspath(sibling) == os.path.abspath(target):
            continue
        if os.path.isfile(sibling):
            shutil.copy2(sibling, os.path.join(tmpdir, os.path.basename(sibling)))

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

    got = subprocess.run(_cmd(copy), capture_output=True, text=True)
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
