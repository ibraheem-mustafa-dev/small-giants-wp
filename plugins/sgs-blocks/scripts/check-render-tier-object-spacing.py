#!/usr/bin/env python3
"""GUARD gate (Step 8 shape 2 — 'compares a derived copy to its source; 0
from registration, 1 only on divergence'), not a backlog. Written 2026-09-06
after fixing the tier-object padding/margin migration's render.php side
across 29 blocks (fix-render-tier-object-spacing.py, commits e863203d7 +
75b8dd657) and hitting a REAL production fatal while doing it:
"Call to undefined function sgs_responsive_normalise_object()" — the
normalisation call ran before the require that defines it had executed.
Deployed once, broke the sandybrown canary, rolled back within ~2 minutes.

This script guards against BOTH halves of that incident recurring, for
ANY render.php under src/blocks — not just the 29 already fixed, so a
future block reusing the same tier-object-normalise pattern (or a future
attribute migration folding a flat *Tablet/*Mobile pair into a tier
object) gets the same protection automatically:

1. LOAD-ORDER: if a file calls `sgs_responsive_normalise_object(`, some
   `require_once` naming `helpers-responsive.php` OR `render-helpers.php`
   (which itself requires helpers-responsive.php) must appear at an
   EARLIER LINE NUMBER than the first call. Calling a function before the
   file that defines it has been required is a PHP fatal, not a warning —
   `php -l` cannot catch it because the syntax is valid; only tracing
   execution order catches it, which is exactly what this check does
   structurally (by line number) rather than by executing PHP.

2. DEAD-FLAT-ATTR: `$attributes['paddingTablet']` / `['paddingMobile']`
   / `['marginTablet']` / `['marginMobile']` read as a literal string key
   in a render.php whose block.json does NOT declare that attribute name
   is a dead read — the exact bug class this migration fixed. Declared-in
   block.json is checked PER BLOCK (not assumed from a hardcoded roster),
   so a block that genuinely still has the flat shape (not yet migrated)
   is correctly exempted, and a block that already migrated but grew a
   NEW stray read of the dead name is correctly caught.

BASELINE (added 2026-09-06, mirroring scripts/audit-block-file-consistency.py's
sanctioned pattern -- see that script's own docstring for the precedent): this
gate is wired into gates.json's `fast` tier and runs on EVERY build for EVERY
concurrent session in this shared codebase. Extending DEAD_FLAT_ATTRS to cover
borderRadius surfaced 96 pre-existing findings across ~48 OTHER blocks that
were never in scope for the border-radius render fix -- they carry the same
bug, but fixing them is separate, un-scoped work. Without a baseline, the gate
would go red for every other concurrent session's build the moment that fix
landed. A finding already accepted into the baseline is still computed and
reported (see "Baselined" in the summary), but does not fail `--check` -- only
a NET-NEW finding (not in the baseline) does. `--update-baseline` is the ONLY
sanctioned way to grow the baseline.

Usage:
  python scripts/check-render-tier-object-spacing.py --check           # gate: exit 1 on any NET-NEW finding
  python scripts/check-render-tier-object-spacing.py                    # same scan, exit 0 always (report)
  python scripts/check-render-tier-object-spacing.py --self-test        # fixture-based, exit 1 on failed assertion
  python scripts/check-render-tier-object-spacing.py --update-baseline  # accepts every CURRENT finding into
                                                                          # the baseline and exits 0
"""
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = Path(__file__).resolve().parent
PLUGIN_DIR = SCRIPT_DIR.parent
BLOCKS_DIR = PLUGIN_DIR / 'src' / 'blocks'
BASELINE_FILE = SCRIPT_DIR / 'render-tier-object-spacing-baseline.json'

# Shared trees eligible for the SAME two bug classes as render.php, extended
# 2026-09-06 after finding the wrapper itself (class-sgs-container-wrapper.php)
# had the identical dead-flat-attr bug that had already been fixed in all 29
# block-private render.php files -- the original guard only scanned
# `src/blocks/*/render.php` and would never have caught it. A shared file has
# no single owning block.json to check declarations against, so the
# dead-flat-attr check here uses a GLOBAL declaration set (is this attr name
# declared by ANY block.json in the tree?) rather than a per-block one.
SHARED_PHP_FILES = [
    PLUGIN_DIR / 'includes' / 'class-sgs-container-wrapper.php',
    PLUGIN_DIR / 'includes' / 'helpers-box.php',
    PLUGIN_DIR / 'includes' / 'helpers-responsive.php',
    PLUGIN_DIR / 'includes' / 'media' / 'atoms' / 'media-padding.php',
    PLUGIN_DIR / 'includes' / 'media' / 'atoms' / 'box-shape.php',
]

REQUIRE_DEFINER_RE = re.compile(
    r"require(?:_once)?[^\n]*(?:helpers-responsive\.php|render-helpers\.php)['\"]"
)
NORMALISE_CALL_RE = re.compile(r"\bsgs_responsive_normalise_object\s*\(")

DEAD_FLAT_ATTRS = ('paddingTablet', 'paddingMobile', 'marginTablet', 'marginMobile', 'borderRadiusTablet', 'borderRadiusMobile')
DEAD_FLAT_RE = {
    name: re.compile(r"\$attributes\[\s*['\"]" + re.escape(name) + r"['\"]\s*\]")
    for name in DEAD_FLAT_ATTRS
}
# The ONE sanctioned read of the dead names: none — they should never appear
# as a literal $attributes[...] key at all once a block has migrated. The
# normalise call reads 'padding'/'margin' (the tier-object attr), never the
# flat *Tablet/*Mobile siblings, so there is no exemption to carve out here.


BLOCK_COMMENT_RE = re.compile(r"/\*.*?\*/", re.DOTALL)
LINE_COMMENT_RE = re.compile(r"//[^\n]*")


def strip_comments(text):
    """Blank out (not delete — preserves line numbers) block and line
    comments so a docblock/prose mention of a function or attribute name
    (e.g. "sgs_responsive_normalise_object() lives in..." or
    "reads $attributes['paddingTablet'] etc.") cannot be mistaken for a
    real call or a real read. Replacing with spaces (not removing) keeps
    every line number identical to the original file, which line-based
    reporting below depends on. Earned 2026-09-06: the first version of
    this script matched exactly such a comment and reported a false
    load-order violation on all 29 already-fixed blocks."""
    def blank(m):
        # Preserve embedded newlines (line-number-critical), blank everything else.
        return ''.join('\n' if c == '\n' else ' ' for c in m.group(0))

    text = BLOCK_COMMENT_RE.sub(blank, text)
    text = LINE_COMMENT_RE.sub(blank, text)
    return text


# ---------------------------------------------------------------------------
# Baseline (ratchet -- see module docstring)
# ---------------------------------------------------------------------------

# The finding strings this script emits are either:
#   "<file>: reads $attributes['<attr>'] Nx but block.json does not declare
#    '<attr>' -- dead flat-attribute read"          (dead-flat-attr findings)
#   "<file>: ..."                                    (load-order findings)
# A dead-flat-attr finding's count (`Nx`) is NOT part of the identity -- a
# render.php growing a second read of the same already-known-dead attr must
# still be treated as the SAME baselined finding, not a new one. So the key
# is derived from file path + attribute name only, dropping the count. A
# load-order finding has no attribute name and its file path alone is a
# stable-enough identity (there is at most one load-order finding per file).
DEAD_FLAT_KEY_RE = re.compile(
    r"^(?P<file>[^:]+): reads \$attributes\['(?P<attr>[^']+)'\]"
)


def finding_key(finding):
    """Derive a stable key from a finding STRING (not a dict, unlike
    audit-block-file-consistency.py's dict-shaped findings -- this script's
    findings are plain human-readable strings). Keyed on file path + attr
    name for dead-flat-attr findings (count-independent, so a growing count
    of an already-known-dead read doesn't look new); keyed on the file path
    alone for a load-order finding (there's only ever one per file)."""
    m = DEAD_FLAT_KEY_RE.match(finding)
    if m:
        return f"dead_flat_attr:{m.group('file')}:{m.group('attr')}"
    file_part = finding.split(':', 1)[0]
    return f"load_order:{file_part}"


def load_baseline():
    if not BASELINE_FILE.exists():
        return set()
    try:
        data = json.loads(BASELINE_FILE.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return set()
    accepted = data.get('accepted', []) if isinstance(data, dict) else []
    return {finding_key(f) for f in accepted}


def save_baseline(all_findings):
    """Write every CURRENT finding into the baseline as 'accepted' (the ONLY
    sanctioned way to grow the baseline -- mirrors
    audit-block-file-consistency.py's save_baseline())."""
    payload = {'accepted': all_findings}
    BASELINE_FILE.write_text(json.dumps(payload, indent=2) + '\n', encoding='utf-8')


def declared_attrs(block_json_path):
    try:
        data = json.loads(block_json_path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return set()
    return set((data.get('attributes') or {}).keys())


FUNCTION_DEFINITION_RE = re.compile(r"function\s+sgs_responsive_normalise_object\s*\(")


def check_load_order(text, relpath):
    """Returns a finding string, or None."""
    call_match = NORMALISE_CALL_RE.search(text)
    if not call_match:
        return None
    if FUNCTION_DEFINITION_RE.search(text):
        # This file DEFINES the function (helpers-responsive.php itself) --
        # any call to it elsewhere in the same file needs no require, since
        # the whole file has already been parsed/executed by the time any
        # line in it runs. Earned 2026-09-06 extending the check to shared
        # files: this exact false positive fired on first run.
        return None
    require_match = REQUIRE_DEFINER_RE.search(text)
    if not require_match:
        return (f"{relpath}: calls sgs_responsive_normalise_object() but no "
                 f"require of helpers-responsive.php/render-helpers.php found "
                 f"anywhere in the file — will fatal at runtime")
    call_line = text.count('\n', 0, call_match.start()) + 1
    require_line = text.count('\n', 0, require_match.start()) + 1
    if require_line >= call_line:
        return (f"{relpath}: sgs_responsive_normalise_object() called at line "
                 f"{call_line} but the defining require is at line "
                 f"{require_line} — call precedes (or ties) its own require, "
                 f"will fatal at runtime (the exact 2026-09-06 incident shape)")
    return None


def check_dead_flat_attrs(text, relpath, declared):
    findings = []
    for name, pat in DEAD_FLAT_RE.items():
        if name in declared:
            continue  # this block genuinely still has the flat attr — not migrated, not a bug
        if pat.search(text):
            count = len(pat.findall(text))
            findings.append(
                f"{relpath}: reads $attributes['{name}'] {count}x but block.json "
                f"does not declare '{name}' — dead flat-attribute read"
            )
    return findings


def global_declared_attrs():
    """Union of every attribute name declared by ANY block.json in the tree.
    Used for the shared-file check: a shared file has no single owning block
    to check declarations against, so a flat-attr name is only exempt there
    if SOME block, somewhere, still genuinely declares it (not yet migrated)."""
    declared = set()
    if not BLOCKS_DIR.exists():
        return declared
    for block_dir in BLOCKS_DIR.iterdir():
        block_json = block_dir / 'block.json'
        if block_json.exists():
            declared |= declared_attrs(block_json)
    return declared


def scan_shared_files():
    """Extended 2026-09-06 after class-sgs-container-wrapper.php was found to
    have the identical dead-flat-attr bug already fixed in every render.php --
    the original guard only scanned src/blocks/*/render.php and would never
    have caught a shared file. Same two checks, applied to the shared PHP
    trees (includes/, media atoms) that many blocks route through."""
    findings = []
    declared = global_declared_attrs()
    scanned = 0
    for path in SHARED_PHP_FILES:
        if not path.exists():
            continue
        scanned += 1
        text = strip_comments(path.read_text(encoding='utf-8'))
        relpath = str(path.relative_to(PLUGIN_DIR)).replace('\\', '/')
        order_finding = check_load_order(text, relpath)
        if order_finding:
            findings.append(order_finding)
        findings.extend(check_dead_flat_attrs(text, relpath, declared))
    return findings, scanned


def scan():
    findings = []
    if not BLOCKS_DIR.exists():
        return findings, 0
    scanned = 0
    for block_dir in sorted(BLOCKS_DIR.iterdir()):
        render = block_dir / 'render.php'
        block_json = block_dir / 'block.json'
        if not render.exists() or not block_json.exists():
            continue
        scanned += 1
        text = strip_comments(render.read_text(encoding='utf-8'))
        relpath = f"src/blocks/{block_dir.name}/render.php"
        order_finding = check_load_order(text, relpath)
        if order_finding:
            findings.append(order_finding)
        declared = declared_attrs(block_json)
        findings.extend(check_dead_flat_attrs(text, relpath, declared))
    return findings, scanned


def self_test():
    failures = []

    # Fixture 1 — load order violated: call before require.
    bad_order = (
        "<?php\ndefined( 'ABSPATH' ) || exit;\n"
        "$x = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );\n"
        "require_once __DIR__ . '/helpers-responsive.php';\n"
    )
    if check_load_order(bad_order, 'fixture') is None:
        failures.append('self-test: bad_order fixture should have been flagged, was not')

    # Fixture 2 — load order correct: require before call.
    good_order = (
        "<?php\ndefined( 'ABSPATH' ) || exit;\n"
        "require_once __DIR__ . '/helpers-responsive.php';\n"
        "$x = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );\n"
    )
    if check_load_order(good_order, 'fixture') is not None:
        failures.append('self-test: good_order fixture should NOT have been flagged, was')

    # Fixture 3 — no normalise call at all: N/A, must not false-positive.
    no_call = "<?php\ndefined( 'ABSPATH' ) || exit;\n$x = 1;\n"
    if check_load_order(no_call, 'fixture') is not None:
        failures.append('self-test: no_call fixture should NOT have been flagged, was')

    # Fixture 4 — dead flat attr read, NOT declared -> flagged.
    dead_read = "<?php\n$t = $attributes['paddingTablet'] ?? null;\n"
    findings = check_dead_flat_attrs(dead_read, 'fixture', declared=set())
    if not findings:
        failures.append('self-test: dead_read fixture should have been flagged, was not')

    # Fixture 5 — same read, but attr genuinely still declared (not migrated) -> exempt.
    findings = check_dead_flat_attrs(dead_read, 'fixture', declared={'paddingTablet'})
    if findings:
        failures.append('self-test: dead_read fixture with declared attr should be exempt, was flagged')

    # Fixture 5b — dead flat attr read for borderRadius, NOT declared -> flagged.
    dead_radius_read = "<?php\n$t = $attributes['borderRadiusTablet'] ?? null;\n"
    findings = check_dead_flat_attrs(dead_radius_read, 'fixture', declared=set())
    if not findings:
        failures.append('self-test: dead_radius_read fixture should have been flagged, was not')

    # Fixture 5c — same read, but attr genuinely still declared (not migrated) -> exempt.
    findings = check_dead_flat_attrs(dead_radius_read, 'fixture', declared={'borderRadiusTablet'})
    if findings:
        failures.append('self-test: dead_radius_read fixture with declared attr should be exempt, was flagged')

    # Fixture 6 — idempotence: running the same text through both checks twice
    # yields the same finding set (checks are read-only / pure).
    f1 = check_load_order(bad_order, 'fixture')
    f2 = check_load_order(bad_order, 'fixture')
    if f1 != f2:
        failures.append('self-test: check_load_order is not idempotent')

    # Fixture 7 — EDGE, earned 2026-09-06: a docblock/comment that MENTIONS
    # the function name with a trailing '(' (prose, not a real call) must
    # NOT be treated as a call, and a comment mentioning the dead attr name
    # must not be treated as a real read. The first version of this script
    # got this wrong on all 29 already-fixed blocks (every one carries a
    # docblock explaining the fix, which names both the function and the
    # dead attrs) before strip_comments() was added.
    comment_only = (
        "<?php\ndefined( 'ABSPATH' ) || exit;\n"
        "// Fixed: sgs_responsive_normalise_object() lives in helpers-responsive.php\n"
        "// (reads $attributes['paddingTablet'] etc. via the wrapper)\n"
        "$x = 1;\n"
    )
    stripped = strip_comments(comment_only)
    if check_load_order(stripped, 'fixture') is not None:
        failures.append('self-test: comment-only mention of the function should not be a load-order finding')
    if check_dead_flat_attrs(stripped, 'fixture', declared=set()):
        failures.append('self-test: comment-only mention of the dead attr should not be a dead-flat-attr finding')
    # And strip_comments() must preserve line count (line-number reporting
    # depends on it) -- block comments in particular can span lines.
    multiline_comment = "<?php\n/* line one\nline two\nline three */\n$x = 1;\n"
    if strip_comments(multiline_comment).count('\n') != multiline_comment.count('\n'):
        failures.append('self-test: strip_comments must preserve line count across a multi-line block comment')

    # Fixture 9 -- EDGE, earned extending the check to shared files 2026-09-06:
    # the file that DEFINES sgs_responsive_normalise_object() calls it
    # elsewhere in the same file (helper composition) with no require at all
    # -- correctly not a bug, since the whole file has already executed by
    # then. First run of the shared-file scan false-positived on exactly this.
    self_defining_file = (
        "<?php\n"
        "function sgs_responsive_normalise_object( $raw, $is_box = false ) { return array(); }\n"
        "$x = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );\n"
    )
    if check_load_order(self_defining_file, 'fixture') is not None:
        failures.append('self-test: a call within the function-defining file itself should not be a load-order finding')

    # Fixture 10 -- THE ratchet itself, earned 2026-09-06 fixing the gate-
    # breaking regression from extending DEAD_FLAT_ATTRS to borderRadius: a
    # baseline mechanism that silently accepts everything is worse than no
    # gate at all, so prove it can still fail on something genuinely new.
    # (a) A finding whose key IS in the baseline must NOT count as net-new.
    baselined_finding = (
        "src/blocks/some-old-block/render.php: reads $attributes['borderRadiusTablet'] "
        "1x but block.json does not declare 'borderRadiusTablet' — dead flat-attribute read"
    )
    baseline_keys = {finding_key(baselined_finding)}
    net_new = [f for f in [baselined_finding] if finding_key(f) not in baseline_keys]
    if net_new:
        failures.append('self-test: a finding present in the baseline must not be net-new')
    # (b) A genuinely different finding (different file) must still be net-new
    # against that same baseline -- the ratchet must be able to fail.
    new_finding = (
        "src/blocks/some-new-block/render.php: reads $attributes['borderRadiusMobile'] "
        "1x but block.json does not declare 'borderRadiusMobile' — dead flat-attribute read"
    )
    net_new = [f for f in [new_finding] if finding_key(f) not in baseline_keys]
    if not net_new:
        failures.append('self-test: a finding NOT present in the baseline must be net-new (ratchet must be able to fail)')
    # (c) The count suffix ("1x" vs "3x") must not change the key -- growing
    # the count of an already-baselined dead read is still the SAME finding,
    # not a new one.
    same_finding_more_reads = baselined_finding.replace('1x', '3x')
    if finding_key(same_finding_more_reads) != finding_key(baselined_finding):
        failures.append('self-test: finding_key must be count-independent (1x vs 3x of the same file+attr must match)')
    # (d) A load-order finding's key must be file-based and stable.
    load_order_finding_1 = "includes/some-shared-file.php: calls sgs_responsive_normalise_object() but no require of..."
    load_order_finding_2 = "includes/some-shared-file.php: calls sgs_responsive_normalise_object() at line 9 but the defining require is at line 12..."
    if finding_key(load_order_finding_1) != finding_key(load_order_finding_2):
        failures.append('self-test: two load-order findings for the same file must share a key')

    if failures:
        for f in failures:
            print(f'[self-test] FAIL: {f}')
        return 1
    print('[self-test] all assertions passed')
    return 0


def main():
    args = sys.argv[1:]
    if '--self-test' in args:
        sys.exit(self_test())

    block_findings, blocks_scanned = scan()
    shared_findings, shared_scanned = scan_shared_files()
    findings = block_findings + shared_findings
    is_check = '--check' in args
    is_update_baseline = '--update-baseline' in args

    print(f'[check-render-tier-object-spacing] scanned {blocks_scanned} block(s) with both '
          f'render.php and block.json, plus {shared_scanned} shared file(s)')

    if is_update_baseline:
        save_baseline(findings)
        print(f'[check-render-tier-object-spacing] Baseline updated — {len(findings)} finding(s) accepted.')
        sys.exit(0)

    baseline = load_baseline()
    net_new = [f for f in findings if finding_key(f) not in baseline]
    accepted = [f for f in findings if finding_key(f) in baseline]

    if not findings:
        print('[check-render-tier-object-spacing] OK — 0 findings')
        sys.exit(0)

    if accepted:
        print(f'[check-render-tier-object-spacing] Baselined (pre-existing, not gating): {len(accepted)}')
    print(f'[check-render-tier-object-spacing] Net-new: {len(net_new)}')
    print(f'[check-render-tier-object-spacing] {len(findings)} finding(s) total:')
    for f in findings:
        tag = '(baselined)' if finding_key(f) in baseline else '(NET-NEW)'
        print(f'  - {tag} {f}')

    if is_check and net_new:
        print(f'[check-render-tier-object-spacing] --check FAILED: {len(net_new)} net-new finding(s) not in baseline.')
        sys.exit(1)
    sys.exit(0)


if __name__ == '__main__':
    main()
