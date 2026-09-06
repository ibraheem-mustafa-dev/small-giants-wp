"""Gate: no third-party shader source in TRACKED documentation.

WHY THIS EXISTS
---------------
On 2026-08-25 a report was written whose own PROVENANCE table promised "described here, never
reproduced" — while the same file contained two verbatim GLSL excerpts and two inline shader
expressions. It lived in `.claude/reports/`, which project policy makes PERMANENT, and it was
committed to twice that day under a stated definition-of-done that said "no third-party material
in any tracked file".

Nothing caught it, because the check was a sentence in a document rather than a program. An
adversarial council found it the next day.

⚠ THE LESSON, WHICH IS THE POINT OF THIS FILE: a self-certification of cleanliness is worthless
unless something actually greps the file it certifies. Prose cannot enforce prose.

WHAT IT CHECKS
--------------
TRACKED markdown under `.claude/` only. It deliberately does NOT scan `plugins/` or `theme/`:
those contain OUR OWN shader source, which is supposed to be there.

Two signals, because either alone is wrong:
  1. A fenced code block tagged as a shader language  -> always a failure.
  2. GLSL-specific tokens in prose above a threshold  -> a failure, so that stripping the fence
     while leaving the code is not a way to pass.

ALLOWED, deliberately:
  * naming a symbol to identify it (`u_time`, `blurAngular`) — names are not expression, and
    identifying what was studied is the entire job of an analysis document
  * a bare type declaration quoted as EVIDENCE that a symbol is dead (`attribute vec3 tangent`)
  * our own GL state capture logs — those are our measurements, not anyone's source

Usage:  python .claude/hooks/check-no-third-party-glsl.py            # gate
        python .claude/hooks/check-no-third-party-glsl.py --self-test # prove it can FAIL
"""

import os
import re
import subprocess
import sys
import tempfile

def _repo_root():
    """Ask git, rather than counting dirname() levels.

    The first version used dirname(dirname(__file__)), which resolves to `.claude/` — one level
    short of the repo root — so `git ls-files .claude` ran from inside `.claude` and looked for
    `.claude/.claude`. It found nothing. Counting directory levels by hand is how that happens;
    git already knows the answer.
    """
    out = subprocess.run(
        ['git', 'rev-parse', '--show-toplevel'],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        capture_output=True, text=True,
    )
    if out.returncode != 0:
        sys.exit('not inside a git repository')
    return out.stdout.strip()


ROOT = _repo_root()

SHADER_FENCE = re.compile(r'^```\s*(glsl|hlsl|vert|frag|shader|wgsl)\b', re.I | re.M)

# Tokens that indicate CODE rather than a mention. Each must be a syntactic construct, not a name.
CODE_TOKENS = [
    (re.compile(r'\bvec[234]\s+\w+\s*=', re.I), 'vec assignment'),
    (re.compile(r'\bgl_FragColor\s*='), 'gl_FragColor assignment'),
    (re.compile(r'\bgl_Position\s*='), 'gl_Position assignment'),
    (re.compile(r'\btexture2D\s*\([^)]*,'), 'texture2D() call with args'),
    (re.compile(r'\bsmoothstep\s*\(\s*[\d.]+\s*,'), 'smoothstep() call with literal args'),
    (re.compile(r'\bdFd[xy]\s*\([a-z_]'), 'dFdx/dFdy() call with an argument'),
    (re.compile(r'\bmix\s*\(\s*\w+\s*,\s*\w+\s*,'), 'mix() call with three args'),
    (re.compile(r'\bpow\s*\(\s*abs\s*\('), 'pow(abs(...)) composite'),
    (re.compile(r'^\s*(uniform|varying|attribute)\s+\w+\s+\w+\s*;', re.M), 'declaration statement'),
]

# A declaration quoted inline as evidence (inside backticks, on a table row) is allowed.
# Only an unquoted declaration on its own line is a failure — hence the ^\s* anchor above.

THRESHOLD = 2  # a single incidental token is a mention; two or more is an excerpt


def tracked_md():
    # NB: git pathspec `*` does NOT recurse, so `.claude/*.md` matched only the top level and the
    # first version of this function returned ZERO files — a gate that scans nothing. It failed
    # closed (see main()) rather than reporting a clean pass, which is the only reason it was
    # caught. List the whole tree and filter here.
    out = subprocess.run(
        ['git', 'ls-files', '.claude'],
        cwd=ROOT, capture_output=True, text=True,
    )
    return [p for p in out.stdout.splitlines() if p.strip().lower().endswith('.md')]


def scan_text(text):
    findings = []
    for m in SHADER_FENCE.finditer(text):
        line = text[:m.start()].count('\n') + 1
        findings.append((line, 'FENCE', 'code block tagged `%s`' % m.group(1)))
    hits = []
    for rx, label in CODE_TOKENS:
        for m in rx.finditer(text):
            line = text[:m.start()].count('\n') + 1
            hits.append((line, 'TOKEN', label))
    if len(hits) >= THRESHOLD:
        findings.extend(hits)
    return findings


def main():
    if '--self-test' in sys.argv:
        bad = (
            "# fixture\n\n```glsl\nvec4 c = texture2D(u_pal, v_uv);\n"
            "c.rgb = mix(a, b, t);\n```\n"
        )
        good = (
            "# fixture\n\nThe shader samples the palette at the fragment's own UV, then grades it:\n"
            "contrast, desaturation, hue rotation. Uniforms named `u_time` and `blurAngular` are\n"
            "identified but not reproduced.\n"
        )
        f_bad = scan_text(bad)
        f_good = scan_text(good)
        ok = bool(f_bad) and not f_good
        print('self-test: MUST-FLAG fixture -> %d finding(s)  %s' % (len(f_bad), 'OK' if f_bad else 'BROKEN'))
        print('self-test: MUST-PASS fixture -> %d finding(s)  %s' % (len(f_good), 'OK' if not f_good else 'BROKEN — overmatches'))
        print('self-test: %s' % ('PASS' if ok else 'FAIL'))
        return 0 if ok else 1

    files = tracked_md()
    if not files:
        print('check-no-third-party-glsl: no tracked .claude markdown found — check the glob')
        return 1

    failed = 0
    for rel in files:
        full = os.path.join(ROOT, rel)
        try:
            with open(full, encoding='utf-8') as fh:
                text = fh.read()
        except (OSError, UnicodeDecodeError):
            continue
        findings = scan_text(text)
        if findings:
            failed += 1
            print('  [FAIL] %s' % rel)
            for line, kind, what in findings[:8]:
                print('         line %-5d %-6s %s' % (line, kind, what))

    print('-' * 70)
    if failed:
        print('  %d tracked document(s) contain shader SOURCE, not just descriptions.' % failed)
        print('  Fix: replace the excerpt with a plain-English description of the mechanism.')
        print('  `reports/` is permanent — an excerpt committed here does not age out.')
        return 1
    print('  check-no-third-party-glsl: %d tracked documents scanned, 0 contain shader source.' % len(files))
    return 0


if __name__ == '__main__':
    sys.exit(main())
