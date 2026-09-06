"""Assert a diff changed COMMENTS ONLY — no executable code.

Used to verify a documentation-scoped agent stayed in scope. A comment-only
brief does not constrain what an agent actually edits; only a check does.

Method: for each changed file, strip comments and normalise whitespace from the
BEFORE (git HEAD) and AFTER (working tree) versions. If the stripped forms are
identical, the change was comments only. If they differ, print the first
divergence — that is executable code that moved.

Usage: python scripts/assert-comment-only-diff.py <file> [<file> ...]
"""
import re
import sys
import subprocess

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


def strip_js(src):
    """Blank comments, preserving nothing else. LINE COMMENTS FIRST — a `//`
    comment citing a glob path (`src/blocks/*/block.json`) contains `/*/`,
    which holds both `/*` and `*/` sharing one asterisk; the block pass would
    open a comment there and swallow real code, making a genuine code change
    look like a comment change. That is the exact failure this check exists to
    catch, so getting the order wrong here would defeat its own purpose."""
    out = list(src)

    def blank(m):
        for i in range(m.start(), m.end()):
            if out[i] != '\n':
                out[i] = ' '

    for m in re.finditer(r'^[ \t]*//.*$', src, flags=re.M):
        blank(m)
    for m in re.finditer(r'/\*.*?\*/', ''.join(out), flags=re.S):
        blank(m)
    text = ''.join(out)
    # Normalise whitespace so re-indentation is not reported as a code change.
    return [ln.strip() for ln in text.splitlines() if ln.strip()]


def head_version(path):
    """Read HEAD's copy as BYTES, then decode UTF-8 — never text=True.

    ⛔ text=True decodes with the platform default (cp1252 on Windows) while the
    working copy is opened as UTF-8. The same bytes then differ: an em-dash reads
    as `—` on one side and `â€”` on the other, and this checker reports CODE
    CHANGED on a file nobody touched. Measured 2026-08-19 — it produced two false
    positives on its first run. Changing the measurement tool between the two
    sides of a comparison manufactures a regression that is not there.
    """
    r = subprocess.run(['git', 'show', 'HEAD:' + path], capture_output=True)
    if r.returncode != 0:
        return None
    return r.stdout.decode('utf-8', errors='replace')


def main():
    paths = sys.argv[1:]
    if not paths:
        print(__doc__)
        sys.exit(2)
    bad = 0
    for p in paths:
        before = head_version(p)
        if before is None:
            print('%-62s NEW FILE (nothing to compare)' % p)
            continue
        try:
            after = open(p, encoding='utf-8', errors='replace').read()
        except OSError:
            print('%-62s UNREADABLE' % p)
            bad += 1
            continue
        a, b = strip_js(before), strip_js(after)
        if a == b:
            print('%-62s COMMENTS ONLY' % p)
            continue
        bad += 1
        print('%-62s ⛔ CODE CHANGED' % p)
        # Show the first divergence so it can be judged, not just flagged.
        for i in range(max(len(a), len(b))):
            av = a[i] if i < len(a) else '<absent>'
            bv = b[i] if i < len(b) else '<absent>'
            if av != bv:
                print('     first divergence at stripped line %d:' % (i + 1))
                print('       HEAD: %s' % av[:140])
                print('       NOW : %s' % bv[:140])
                break
    print()
    print('%d file(s) checked, %d with code changes' % (len(paths), bad))
    sys.exit(1 if bad else 0)


main()
