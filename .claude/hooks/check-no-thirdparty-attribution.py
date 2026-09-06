"""Gate: no named third-party company references in TRACKED SHIPPED SOURCE.

WHY THIS EXISTS
----------------
Modelled directly on `check-no-third-party-glsl.py` (same repo-root discipline, same
fail-closed-on-empty-file-list discipline). That gate scans TRACKED DOCUMENTATION for
reproduced shader source. This one scans TRACKED SHIPPED SOURCE (`plugins/` + `theme/`,
`.js`/`.php`/`.css`) for named third-party companies, starting with "stripe" — a docblock
or comment that casually names a competitor/vendor by name, outside a genuine integration
or a licence-required attribution, is not something this framework should ship.

WHAT IT CHECKS
--------------
Every tracked `.js` / `.php` / `.css` file under `plugins/` or `theme/`, for the literal
substring "stripe" (case-insensitive), with two allowed categories:

  1. GENUINE PAYMENT INTEGRATION — a path or line that is clearly Stripe-the-payment-
     processor context (`stripe-settings.php`, `stripe_payment_id`, `stripe_checkout`,
     an API/secret/publishable key, a webhook/customer/subscription/intent reference).
     This project does real Stripe payment work; that is not third-party ATTRIBUTION,
     it is a legitimate integration reference.
  2. AN EXPLICIT MIT-ATTRIBUTION ALLOWLIST — `MIT_ALLOWLIST` below, keyed by exact
     repo-relative path (forward slashes, matching `git ls-files` output) + an inclusive
     1-based line range. The MIT licence for `sa3dany/wave-gradient` REQUIRES retaining
     its attribution notice, and that notice itself quotes "stripe" as the technique's
     historical provenance ("based on the original vertex shader used by stripe for
     their gradient"). Deleting that quote would violate the licence; keeping it is not
     the kind of unattributed/misleading reference this gate exists to catch.

Everything else that names "stripe" in shipped source — a stray docblock comparison, a
casual mention, an inspired-by note outside the two categories above — FAILS. That is
deliberate: the live run of this gate is currently EXPECTED to fail, because
`wave-gradient.js` carries several "stripe" mentions in its docblock OUTSIDE the
MIT-required attribution paragraph (historical-context prose explaining what the
technique is and is not), and those have not been cleaned up yet.

TWO FAILURE MODES THIS PROJECT HAS HIT BEFORE ON SIMILAR GATES — BOTH AVOIDED HERE:
  * A gate that scans nothing must FAIL, not pass. `main()` exits 1 with a
    "check the glob" message if the tracked-file list comes back empty.
  * `dirname(dirname(__file__))` from `.claude/hooks/` lands on `.claude/`, not the repo
    root. `_repo_root()` asks git via `git rev-parse --show-toplevel`, exactly like the
    GLSL gate.

Usage:  python .claude/hooks/check-no-thirdparty-attribution.py            # gate
        python .claude/hooks/check-no-thirdparty-attribution.py --self-test # prove it can do both
"""

import os
import re
import subprocess
import sys

# Windows' default console codepage (cp1252) cannot encode several characters that show
# up verbatim in this repo's source comments (e.g. U+26D4). Force UTF-8 stdout/stderr so
# printing a matched line never crashes the gate itself.
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except AttributeError:
    pass


def _repo_root():
    """Ask git, rather than counting dirname() levels.

    Counting directory levels by hand from `.claude/hooks/` lands one level short of the
    repo root (`.claude/`) — see `check-no-third-party-glsl.py`'s own docblock for the
    incident that taught this. git already knows the answer.
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

SCAN_DIRS = ['plugins', 'theme']
EXTENSIONS = {'.js', '.php', '.css'}

STRIPE_RX = re.compile(r'\bstripe\b', re.I)  # word boundary — "striped"/"stripes" are not "stripe"

# Category 1 — genuine payment integration. Matched against EITHER the file's basename
# OR the individual matching line's text. Deliberately broad enough to cover the real
# Stripe payment vocabulary without requiring an exact phrase match.
PAYMENT_CONTEXT_RX = re.compile(
    r'stripe[_\s-]?('
    r'payment|checkout|charge|invoice|webhook|customer|subscription'
    r'|api[_-]?key|secret[_-]?key|publishable[_-]?key|settings|intent'
    r')',
    re.I,
)
PAYMENT_PATH_RX = re.compile(r'stripe[-_]?(settings|payment|checkout)', re.I)

# Category 2 — explicit MIT-attribution allowlist.
#
# `sa3dany/wave-gradient` is MIT-licensed and its own shader header states it is "based
# on the original vertex shader used by stripe for their gradient" — the MIT licence
# REQUIRES retaining that attribution notice verbatim. Confirmed against the live file
# before hardcoding this (`plugins/sgs-blocks/src/shared/effects/webgl/wave-gradient.js`,
# read 2026-08-26): the "── LICENCE PROVENANCE ──" paragraph runs lines 55-62, and the
# word "stripe" appears within it on lines 59 and 62 only. Every OTHER "stripe" mention
# in that file (docblock lines 8/9/12/13/21/22 correcting a prior false claim, and the
# `Stripe ships 3` comment at line 122) sits OUTSIDE this range and is NOT covered — it
# is expected to still fail this gate until cleaned up.
#
# Keyed by exact repo-relative path in `git ls-files` form (forward slashes). Extend this
# only after re-reading the source file and confirming the range still matches — do not
# widen it to "the whole file" or "the whole docblock".
MIT_ALLOWLIST = {
    'plugins/sgs-blocks/src/shared/effects/webgl/wave-gradient.js': [(55, 62)],
}


def _payment_context(rel_path, line_text):
    if PAYMENT_PATH_RX.search(os.path.basename(rel_path)):
        return True
    if PAYMENT_CONTEXT_RX.search(line_text):
        return True
    return False


def _mit_allowed(rel_path, line_no):
    key = rel_path.replace(os.sep, '/')
    for start, end in MIT_ALLOWLIST.get(key, []):
        if start <= line_no <= end:
            return True
    return False


def classify_file(rel_path, text):
    """Return [(line_no, snippet), ...] for every un-excluded "stripe" reference."""
    findings = []
    for i, line in enumerate(text.splitlines(), start=1):
        if not STRIPE_RX.search(line):
            continue
        if _payment_context(rel_path, line):
            continue
        if _mit_allowed(rel_path, i):
            continue
        findings.append((i, line.strip()[:160]))
    return findings


def tracked_source_files():
    # NB: a bare `*` pathspec does not recurse (the exact trap the GLSL gate's own
    # docblock records). List the tracked tree scoped to plugins/theme via git ls-files,
    # then filter by extension here — no globbing involved.
    out = subprocess.run(
        ['git', 'ls-files'] + SCAN_DIRS,
        cwd=ROOT, capture_output=True, text=True,
    )
    files = [p for p in out.stdout.splitlines() if p.strip()]
    return [p for p in files if os.path.splitext(p)[1].lower() in EXTENSIONS]


def self_test():
    flag_rel = 'plugins/sgs-blocks/.selftest-fixture-flag.js'
    pass_rel = 'plugins/sgs-blocks/.selftest-fixture-pass.php'
    flag_full = os.path.join(ROOT, flag_rel)
    pass_full = os.path.join(ROOT, pass_rel)
    written = []

    try:
        os.makedirs(os.path.dirname(flag_full), exist_ok=True)

        # MUST-FLAG: a shipped-source-shaped file naming Stripe outside any payment
        # context and outside the MIT allowlist — a plain "inspired by" mention.
        with open(flag_full, 'w', encoding='utf-8') as fh:
            fh.write(
                "// Motion timing inspired by the Stripe pricing page hover animation\n"
                "export const easing = 'ease-out';\n"
            )
        written.append(flag_full)
        with open(flag_full, encoding='utf-8') as fh:
            flag_text = fh.read()
        flag_findings = classify_file(flag_rel, flag_text)
        ok_flag = bool(flag_findings)
        print('self-test: MUST-FLAG fixture -> %d finding(s)  %s' %
              (len(flag_findings), 'OK' if ok_flag else 'BROKEN'))

        # MUST-PASS: same kind of file, but the only "stripe" text is genuine payment
        # integration content (stripe_payment_id).
        with open(pass_full, 'w', encoding='utf-8') as fh:
            fh.write(
                "<?php\n"
                "// Genuine payment integration below.\n"
                "$intent_id = get_post_meta( $order_id, 'stripe_payment_id', true );\n"
            )
        written.append(pass_full)
        with open(pass_full, encoding='utf-8') as fh:
            pass_text = fh.read()
        pass_findings = classify_file(pass_rel, pass_text)
        ok_pass = not pass_findings
        print('self-test: MUST-PASS fixture (payment context) -> %d finding(s)  %s' %
              (len(pass_findings), 'OK' if ok_pass else 'BROKEN — overmatches'))

        # MIT-ALLOWLIST NARROWNESS: a SYNTHETIC fixture proves the allowlist is a narrow
        # line-range exclusion, not a whole-file exemption.
        #
        # This was originally the LIVE wave-gradient.js file: assert its allowlisted lines
        # (59, 62 at the time) are excluded, while an "unrelated" stripe mention elsewhere
        # in the same file (line 8) still flags. That broke the moment the source-cleanup
        # task (this gate's own reason for existing) removed every non-allowlisted "stripe"
        # mention from the file — there was no longer an unrelated line left to prove
        # narrowness against. A live tracked file is a moving target, not a fixture: once
        # the very edit this gate enforces landed, the self-test's own assumption about that
        # file's content went stale. Use a synthetic fixture instead, so this check can never
        # be invalidated by a legitimate future edit to the real source file.
        mit_rel = 'plugins/sgs-blocks/.selftest-fixture-mit.js'
        mit_full = os.path.join(ROOT, mit_rel)
        saved_allowlist = MIT_ALLOWLIST.get(mit_rel)
        try:
            with open(mit_full, 'w', encoding='utf-8') as fh:
                fh.write(
                    "// line 1: unrelated stripe mention, must flag\n"
                    "// line 2: filler\n"
                    "// line 3: filler\n"
                    "// line 4: filler\n"
                    "// line 5: allowlisted lines 5-6 start here\n"
                    "// line 6: allowlisted, must NOT flag (mentions stripe)\n"
                    "// line 7: filler after the allowlisted range\n"
                )
            written.append(mit_full)
            MIT_ALLOWLIST[mit_rel] = [(5, 6)]
            with open(mit_full, encoding='utf-8') as fh:
                mit_text = fh.read()
            mit_findings = classify_file(mit_rel, mit_text)
            flagged_lines = {ln for ln, _ in mit_findings}
            allowlisted_excluded = 6 not in flagged_lines
            other_still_flagged = 1 in flagged_lines
            ok_mit = allowlisted_excluded and other_still_flagged
            mit_detail = 'allowlisted line 6 excluded=%s, unrelated line 1 still flagged=%s' % (
                allowlisted_excluded, other_still_flagged)
        finally:
            if saved_allowlist is None:
                MIT_ALLOWLIST.pop(mit_rel, None)
            else:
                MIT_ALLOWLIST[mit_rel] = saved_allowlist
        print('self-test: MIT-allowlist narrowness (synthetic fixture) -> %s  %s' %
              (mit_detail, 'OK' if ok_mit else 'BROKEN'))

        ok = ok_flag and ok_pass and ok_mit
        print('self-test: %s' % ('PASS' if ok else 'FAIL'))
        return 0 if ok else 1
    finally:
        for f in written:
            try:
                os.remove(f)
            except OSError:
                pass


def main():
    if '--self-test' in sys.argv:
        return self_test()

    files = tracked_source_files()
    if not files:
        print('check-no-thirdparty-attribution: no tracked plugins/theme .js/.php/.css files found — check the glob')
        return 1

    failed = 0
    total_findings = 0
    for rel in files:
        full = os.path.join(ROOT, rel)
        try:
            with open(full, encoding='utf-8') as fh:
                text = fh.read()
        except (OSError, UnicodeDecodeError):
            continue
        findings = classify_file(rel, text)
        if findings:
            failed += 1
            total_findings += len(findings)
            print('  [FAIL] %s' % rel)
            for line_no, snippet in findings[:20]:
                print('         line %-5d %s' % (line_no, snippet))

    print('-' * 70)
    if failed:
        print('  %d tracked file(s), %d reference(s) to "stripe" outside the payment/MIT-attribution allowlist.' %
              (failed, total_findings))
        print('  Fix: remove or rephrase the reference. If it is genuine payment integration or a')
        print('  licence-required attribution notice, extend PAYMENT_CONTEXT_RX / MIT_ALLOWLIST in')
        print('  this script deliberately, with the exact lines re-read first.')
        return 1
    print('  check-no-thirdparty-attribution: %d tracked files scanned, 0 un-attributed third-party references.' % len(files))
    return 0


if __name__ == '__main__':
    sys.exit(main())
