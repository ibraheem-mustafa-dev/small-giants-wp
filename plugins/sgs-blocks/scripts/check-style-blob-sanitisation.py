#!/usr/bin/env python3
"""Gate: every render.php `<style>` blob echo must pass through wp_strip_all_tags().

WHAT THIS CLOSES (Spec 32 §5 rule 2, re-confirmed open 2026-09-04)
    Spec 32 §5 names two CSS-injection sanitisation rules. Rule 1 (free-text
    keyword attrs must be allowlist-filtered before concatenation into a CSS
    declaration) is already covered gate-wide by check-editor-render-parity.js
    CHECK B (css-keyword-enums.json) plus per-property local allowlists (the
    `in_array( $raw, $allowed, true )` idiom repeated verbatim at every
    borderStyle emission site — verified 2026-09-04, zero unvalidated sites
    found). Rule 2 (the assembled <style> blob itself must be stripped of tags
    before echo, so no attribute value can close </style> and open <script>)
    had NO gate at all.

    class-sgs-css-registry.php already wraps the WHOLE collected frontend
    buffer in wp_strip_all_tags() before the consolidated footer <style> — but
    that filter runs on `render_block` output, which only fires on the real
    frontend request. The editor preview (ServerSideRender REST call — no
    wp_footer flush, helpers-scoped-instance-vars.php's own docblock says so)
    renders each block's own <style> tag exactly as its render.php assembled
    it, with no central safety net. So the real remaining gap is narrower than
    "no gate anywhere": it is specifically whether each render.php's OWN
    <style> assembly is safe when rendered directly.

WHAT THE SURVEY FOUND (2026-09-04)
    68 of 83 render.php files emit a literal <style> tag. 67 already wrap the
    assembled CSS string in wp_strip_all_tags() at the point of echo — either
    `printf( '<style...>%s</style>', wp_strip_all_tags( $css ) )`,
    `echo '<style>' . wp_strip_all_tags( $css ) . '</style>'`, or the heredoc
    shape (`<style>` as literal HTML, `<?php echo wp_strip_all_tags( $css ); ?>`,
    `</style>` as literal HTML). ONE did not: src/blocks/text/render.php:628
    was a bare `printf( '<style>%s</style>', $responsive_css )` with no wrap —
    the single outlier against an otherwise-universal convention. Every value
    feeding $responsive_css there is independently constrained (length/colour/
    keyword-allowlist helpers), so it was not exploitable *today*, but it had
    no blob-level safety net against a future addition, unlike every sibling
    block. Fixed in the same commit that added this gate.

    sgs_append_scoped_var_style() (helpers-scoped-instance-vars.php) already
    calls wp_strip_all_tags() internally — any render.php that only emits via
    that helper needs no local wrap and is excluded from findings.

    The generic `render_custom_css()` filter (includes/custom-css.php) already
    wraps the sgsCustomCss free-text residual in wp_strip_all_tags() correctly.
    src/blocks/nav-menu/render.php ALSO inlines sgsCustomCss into its own $css
    (line 1727, stripped only of <script> tags by a local preg_replace) before
    that filter runs — but nav-menu's own final echo (line 1757) wraps the
    WHOLE $css blob in wp_strip_all_tags() too, so the </style> breakout this
    gate exists to catch is already closed there by the blob-level wrap. Not a
    finding under this gate's contract (which checks the blob-level wrap, not
    every intermediate string) — recorded here so a future reader does not
    re-discover and re-flag the same non-issue.

WHAT THIS SCRIPT DOES NOT DO
    It does not sanitise CSS keyword values (that is CHECK B's job, already
    shipped). It does not touch class-sgs-css-registry.php or
    helpers-scoped-instance-vars.php (both already correct — see Spec 32 §5).
    It has no --fix mode beyond the one-line wrap this survey found — adding a
    codemod for a single known site would be over-engineering; the fix is
    applied directly and --fix here is kept for shape-consistency with the
    project's survey/fix/check/self-test triad and any future finding.

    python check-style-blob-sanitisation.py --survey | --fix [--apply] | --check | --self-test
"""
import argparse
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOCKS_GLOB = os.path.join(ROOT, 'src', 'blocks', '*', 'render.php')

STRIP = 'wp_strip_all_tags('

# Shape A/B2: (printf|sprintf)( 'FORMAT', arg0, arg1, … )  — FORMAT may carry
# MORE THAN ONE %s (e.g. `'<style id="%s">%s</style>'` — id first, content
# second, testimonial-slider's real shape). Matched as a two-step: find the
# call + its format string here, then resolve which ARG maps to the
# CONTENT placeholder via placeholder position, with balanced-paren arg
# splitting — see `printf_call_content_expr()`.
RE_PRINTF_CALL = re.compile(
    r"(?P<func>printf|sprintf)\(\s*'(?P<fmt>(?:[^'\\]|\\.)*<style(?:[^'\\]|\\.)*)'\s*,",
    re.S,
)
# Shape C: heredoc-style literal <style> ... <?php echo EXPR; ?> ... </style>,
# opening tag on its OWN line with no PHP-interpolated attribute (id, if any,
# is a plain literal — modal's `id="<?php echo esc_attr($uid); ?>"` shape is
# handled by RE_HEREDOC_INTERP_ID below instead, since the `?>` inside the
# opening tag defeats this regex's `[^>]*` boundary).
RE_HEREDOC = re.compile(
    r"<style[^>]*>\s*(?:\?>)?\s*<\?php\s*(?:echo\s+)?(?P<expr>[^;]+?);.*?</style>",
    re.S,
)
# Shape C2: single-line heredoc whose OPENING tag itself interpolates PHP
# (e.g. `<style id="<?php echo esc_attr( $uid ); ?>">`) — modal's real shape.
# The opening tag's own PHP is irrelevant to this gate (it is an id, not
# content); what matters is the `<?php echo EXPR; ?>` between `>` and `</style>`.
RE_HEREDOC_INTERP_ID = re.compile(
    r"<style\b[^\n]*?>\s*<\?php\s*echo\s+(?P<expr>[^;]+?);.*?\?>\s*</style>",
    re.S,
)


def split_top_level_args(s):
    """Split a PHP argument list on top-level commas only (respects
    (), [], and both quote styles) — a non-greedy regex cannot do this
    correctly once an arg itself contains a function call with commas."""
    args, depth, cur, i, in_str, str_ch = [], 0, '', 0, False, ''
    while i < len(s):
        ch = s[i]
        if in_str:
            cur += ch
            if ch == '\\' and i + 1 < len(s):
                i += 1
                cur += s[i]
            elif ch == str_ch:
                in_str = False
        elif ch in ("'", '"'):
            in_str = True
            str_ch = ch
            cur += ch
        elif ch in '([':
            depth += 1
            cur += ch
        elif ch in ')]':
            if depth == 0:
                break  # end of the call's own arg list
            depth -= 1
            cur += ch
        elif ch == ',' and depth == 0:
            args.append(cur.strip())
            cur = ''
        else:
            cur += ch
        i += 1
    if cur.strip():
        args.append(cur.strip())
    return args


def printf_call_content_expr(text, call_match):
    """Given a matched printf/sprintf(...) call whose FORMAT string contains
    `<style`, return the arg expression that fills the %s placeholder
    immediately before `</style>` in the format string (the CSS content),
    or None if the format has no `</style>` (still-open composite tag built
    across two calls — not this shape)."""
    fmt = call_match.group('fmt')
    close_idx = fmt.find('</style>')
    if close_idx == -1:
        return None
    # Which %s (0-based) is the one immediately preceding </style>?
    before = fmt[:close_idx]
    placeholder_positions = [m.start() for m in re.finditer(r'%s', fmt)]
    if not placeholder_positions:
        return None
    content_idx = None
    for i, pos in enumerate(placeholder_positions):
        if pos == len(before) - 2:  # the %s directly abutting </style>
            content_idx = i
            break
    if content_idx is None:
        content_idx = len(placeholder_positions) - 1  # fallback: last placeholder
    # Args start right after the match (which ends at the comma after the format string).
    args_start = call_match.end()
    depth = 1  # we're already inside the outer call's parens
    i = args_start
    in_str, str_ch = False, ''
    while i < len(text) and depth > 0:
        ch = text[i]
        if in_str:
            if ch == '\\':
                i += 2
                continue
            if ch == str_ch:
                in_str = False
        elif ch in ("'", '"'):
            in_str = True
            str_ch = ch
        elif ch in '([':
            depth += 1
        elif ch in ')]':
            depth -= 1
        i += 1
    args_str = text[args_start:i - 1]
    args = split_top_level_args(args_str)
    if content_idx >= len(args):
        return None
    raw_arg = args[content_idx]
    expr = raw_arg.strip()
    if not expr:
        return None
    # Locate expr's exact span within the original text (not just the args
    # substring) so a fix can replace THIS occurrence positionally, never a
    # same-named variable elsewhere in the file (e.g. its own assignment
    # line — the false "fixed" the first cut of --fix silently produced).
    lead_ws = len(raw_arg) - len(raw_arg.lstrip())
    arg_start_in_text = args_start + args_str.find(raw_arg)
    start = arg_start_in_text + lead_ws
    end = start + len(expr)
    return (expr, start, end)


def split_top_level_dots_with_spans(s, base_offset):
    """Split a PHP `.`-concatenation chain into (operand_text, start, end)
    tuples at the TOP level only (respects quotes and balanced parens) —
    absolute offsets via base_offset so callers can slice the ORIGINAL text
    positionally rather than doing a substring search-replace."""
    parts, depth, cur_start, i, in_str, str_ch = [], 0, 0, 0, False, ''
    while i < len(s):
        ch = s[i]
        if in_str:
            if ch == '\\' and i + 1 < len(s):
                i += 2
                continue
            if ch == str_ch:
                in_str = False
        elif ch in ("'", '"'):
            in_str = True
            str_ch = ch
        elif ch in '(':
            depth += 1
        elif ch in ')':
            depth -= 1
        elif ch == '.' and depth == 0:
            operand = s[cur_start:i]
            if operand.strip():
                lead = len(operand) - len(operand.lstrip())
                trail = len(operand) - len(operand.rstrip())
                parts.append((operand.strip(), base_offset + cur_start + lead, base_offset + i - trail))
            cur_start = i + 1
        i += 1
    operand = s[cur_start:i]
    if operand.strip():
        lead = len(operand) - len(operand.lstrip())
        trail = len(operand) - len(operand.rstrip())
        parts.append((operand.strip(), base_offset + cur_start + lead, base_offset + i - trail))
    return parts


def concat_chain_content_exprs(text):
    """Find every `… . '</style>'` concatenation chain (echo, assignment,
    `.=`, or ternary-branch — ANY statement shape, since what matters is the
    concatenation chain itself, not what precedes it) whose chain also
    contains a `'<style` opening literal, and return the OPERAND immediately
    before the `'</style>'` literal — the CSS content expression — as
    (expr, start, end). Covers plain two-operand concatenation
    (`'<style>' . EXPR . '</style>'`), multi-part opening tags with an
    interpolated id (`'<style id="' . esc_attr($uid) . '-native">' . EXPR .
    '</style>'`), and ternary-wrapped assignments
    (`$var = COND ? '<style>' . EXPR . '</style>' : '';`) — all found live
    in this tree (card-grid, product-card, team-member, trust-bar)."""
    results = []
    for close_m in re.finditer(r"'</style>'", text):
        close_start = close_m.start()
        # Walk back to the start of the enclosing statement first (previous
        # `;`, `{`, or `}`), THEN find the NEAREST `'<style` literal inside
        # that statement and start the window THERE — not at the statement
        # start. A ternary/grouping paren wrapping the whole chain
        # (`COND ? ( '<style>' . EXPR . '</style>' ) : ''`, team-member's
        # real shape) sits BEFORE the '<style literal, so excluding it from
        # the window keeps the chain's own dots at TRUE top level for the
        # paren-depth-based splitter below, unaffected by the outer group.
        stmt_start = max(text.rfind(';', 0, close_start), text.rfind('{', 0, close_start), text.rfind('}', 0, close_start)) + 1
        style_open = text.rfind("'<style", stmt_start, close_start)
        if style_open == -1:
            continue  # this </style>' isn't part of a <style>-opening chain
        window = text[style_open:close_start + len("'</style>'")]
        parts = split_top_level_dots_with_spans(window, style_open)
        # Find the operand that IS the '</style>' literal itself.
        close_idx = None
        for idx, (op, s, e) in enumerate(parts):
            if op == "'</style>'":
                close_idx = idx
                break
        if close_idx is None or close_idx == 0:
            continue
        expr, start, end = parts[close_idx - 1]
        if not expr or expr.startswith("'<style"):
            continue  # two-part-only chain with nothing between (rare/malformed)
        results.append((expr, start, end))
    return results


def find_style_sites(text):
    """Return list of (shape, expr, start, end) for every emission site
    found by the known shapes — start/end are the CONTENT expression's exact
    character span in `text`, for positional (not substring) replacement. A
    file may legitimately have zero literal `<style` tags (not in
    BLOCKS_GLOB then) or more than one (composite blocks)."""
    sites = []
    claimed_spans = []  # (start, end) already attributed, to avoid double-counting
    for m in RE_PRINTF_CALL.finditer(text):
        found = printf_call_content_expr(text, m)
        if found is not None:
            expr, start, end = found
            sites.append(('printf', expr, start, end))
            claimed_spans.append((start, end))
    for expr, start, end in concat_chain_content_exprs(text):
        sites.append(('concat_chain', expr, start, end))
        claimed_spans.append((start, end))
    # Interpolated-id heredoc is the MORE SPECIFIC shape (an opening tag with
    # `<?php ... ?>` inside its own attributes) — try it before the plain
    # heredoc regex, and skip any plain-heredoc match whose span it already
    # covers, so a single <style> emission is never counted twice.
    for m in RE_HEREDOC_INTERP_ID.finditer(text):
        start, end = m.start('expr'), m.end('expr')
        sites.append(('heredoc_interp_id', m.group('expr').strip(), start, end))
        claimed_spans.append((start, end))
    for m in RE_HEREDOC.finditer(text):
        start, end = m.start('expr'), m.end('expr')
        if any(s <= start and end <= e for s, e in claimed_spans):
            continue
        sites.append(('heredoc', m.group('expr').strip(), start, end))
    return sites


def all_style_tag_count(text):
    """Literal `<style` occurrences in real code (not comments/docblocks)."""
    count = 0
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
            continue
        count += len(re.findall(r'<style\b', line))
    return count


def scan_file(path):
    """Return dict: {'sites', 'violations': [(expr,start,end),...], 'unclassified_tags'}."""
    text = open(path, encoding='utf-8', errors='ignore').read()
    sites = find_style_sites(text)
    violations = [(expr, start, end) for shape, expr, start, end in sites if STRIP not in expr]
    classified_tags = len(sites)
    literal_tags = all_style_tag_count(text)
    return {
        'sites': sites,
        'violations': violations,
        'classified_tags': classified_tags,
        'literal_tags': literal_tags,
    }


def scan():
    rows = []
    for f in sorted(glob.glob(BLOCKS_GLOB)):
        text = open(f, encoding='utf-8', errors='ignore').read()
        if '<style' not in text:
            continue
        result = scan_file(f)
        rows.append({
            'file': f,
            'block': os.path.basename(os.path.dirname(f)),
            **result,
        })
    return rows


def cmd_survey():
    rows = scan()
    print(f"[survey] {len(rows)} render.php files emit a literal <style> tag\n")
    unresolved = 0
    under_classified = 0
    for r in rows:
        flag = ''
        if r['violations']:
            flag = '  <-- VIOLATION (blob not wrapped in wp_strip_all_tags())'
            unresolved += len(r['violations'])
        note = ''
        if r['classified_tags'] < r['literal_tags']:
            note = f"  [unclassified: {r['literal_tags'] - r['classified_tags']} <style> tag(s) not matched by a known shape — manual review]"
            under_classified += 1
        print(f"  {r['block']:24s} sites={r['classified_tags']} literal_tags={r['literal_tags']}{flag}{note}")
    print(f"\n{unresolved} violation(s) across {len(rows)} files. {under_classified} file(s) have an unclassified <style> tag (not gated, needs eyes).")
    return 0


def cmd_fix(apply_):
    rows = scan()
    changed = []
    for r in rows:
        if not r['violations']:
            continue
        path = r['file']
        text = open(path, encoding='utf-8', errors='ignore').read()
        # Positional replacement by (start, end) SPAN, not a substring
        # search-replace — a violating expr's variable name (e.g.
        # `$responsive_css`) very often ALSO appears earlier in the same
        # file on its own assignment line, and a blind `.replace(expr, …,
        # 1)` rewrites that first occurrence instead of the actual printf
        # call site. Apply spans back-to-front so earlier offsets stay valid.
        new_text = text
        for expr, start, end in sorted(r['violations'], key=lambda v: v[1], reverse=True):
            if text[start:end] != expr:
                continue  # refuse — text shifted unexpectedly, do not guess
            wrapped = f"wp_strip_all_tags( {expr} )"
            new_text = new_text[:start] + wrapped + new_text[end:]
        if new_text != text:
            changed.append((path, text, new_text))
    if not changed:
        print('[fix] no violations found — nothing to do')
        return 0
    for path, old, new in changed:
        rel = os.path.relpath(path, ROOT)
        if apply_:
            with open(path, 'w', encoding='utf-8', newline='') as fh:
                fh.write(new)
            print(f"[fix --apply] wrote {rel}")
        else:
            print(f"[fix --dry-run] would modify {rel}")
            for old_line, new_line in zip(old.splitlines(), new.splitlines()):
                if old_line != new_line:
                    print(f"  - {old_line.strip()}")
                    print(f"  + {new_line.strip()}")
    return 0


def cmd_check():
    rows = scan()
    total_violations = sum(len(r['violations']) for r in rows)
    if total_violations:
        print(f"[check] FAIL — {total_violations} <style> blob(s) echoed without wp_strip_all_tags():")
        for r in rows:
            if r['violations']:
                print(f"  {r['file']}")
        return 1
    print(f"[check] PASS — {len(rows)} render.php files with a literal <style> tag, all blob-echo sites wrap wp_strip_all_tags()")
    return 0


# ---------------------------------------------------------------------------
# Self-test — positive control (must be flagged) + negative control (must not)
# ---------------------------------------------------------------------------
POSITIVE_FIXTURE = """<?php
defined( 'ABSPATH' ) || exit;
$responsive_css = $scope . '{color:' . $colour . '}';
if ( $responsive_css ) {
	printf( '<style>%s</style>', $responsive_css );
}
"""

NEGATIVE_FIXTURE_PRINTF = """<?php
defined( 'ABSPATH' ) || exit;
$responsive_css = $scope . '{color:' . $colour . '}';
if ( $responsive_css ) {
	printf( '<style>%s</style>', wp_strip_all_tags( $responsive_css ) );
}
"""

NEGATIVE_FIXTURE_ECHO_CONCAT = """<?php
defined( 'ABSPATH' ) || exit;
$css = $scope . '{color:red}';
echo '<style>' . wp_strip_all_tags( $css ) . '</style>';
"""

NEGATIVE_FIXTURE_HEREDOC = """<?php
defined( 'ABSPATH' ) || exit;
?>
<style>
	<?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); ?>
</style>
<?php
"""

# Regression control for the false positive this gate produced on its FIRST
# real run against the tree (2026-09-04): a format string with TWO %s
# placeholders (`id="%s"` then the content) — testimonial-slider's real
# shape. A naive "first arg after the format string" reading flags
# `esc_attr( $uid )` (the id arg, correctly unwrapped) instead of the actual
# content arg (correctly wrapped) — this must NOT be flagged.
NEGATIVE_FIXTURE_MULTI_PLACEHOLDER = """<?php
defined( 'ABSPATH' ) || exit;
$slider_style_tag = sprintf( '<style id="%s">%s</style>', esc_attr( $uid ), wp_strip_all_tags( $slider_scoped_css ) );
"""

# Real shapes found live 2026-09-04 that the printf/echo-only detectors
# missed outright (card-grid, product-card, team-member, trust-bar, modal —
# all verified by eye as already-safe, all reported "unclassified" by the
# first cut of this gate). concat_chain_content_exprs() + RE_HEREDOC_INTERP_ID
# close that gap; these fixtures pin the fix.
NEGATIVE_FIXTURE_TERNARY_CONCAT = """<?php
defined( 'ABSPATH' ) || exit;
$sgs_grid_typo_tag = '' !== $sgs_grid_typo_css ? '<style>' . wp_strip_all_tags( $sgs_grid_typo_css ) . '</style>' : '';
"""

NEGATIVE_FIXTURE_MULTIPART_ID_CONCAT = """<?php
defined( 'ABSPATH' ) || exit;
$card_grid_native_style_tag = $card_grid_native_css ? '<style id="' . esc_attr( $uid ) . '-native">' . wp_strip_all_tags( $card_grid_native_css ) . '</style>' : '';
"""

NEGATIVE_FIXTURE_HEREDOC_INTERP_ID = """<?php
defined( 'ABSPATH' ) || exit; ?>
	<style id="<?php echo esc_attr( $uid ); ?>"><?php echo wp_strip_all_tags( $scoped_css ); ?></style>
<?php
"""

POSITIVE_FIXTURE_CONCAT_CHAIN = """<?php
defined( 'ABSPATH' ) || exit;
$sgs_card_html .= $scoped_css ? ( '<style>' . implode( '', $scoped_css ) . '</style>' ) : '';
"""

EXPECTED_FIX_OUTPUT = """<?php
defined( 'ABSPATH' ) || exit;
$responsive_css = $scope . '{color:' . $colour . '}';
if ( $responsive_css ) {
	printf( '<style>%s</style>', wp_strip_all_tags( $responsive_css ) );
}
"""


def self_test():
    fails = []

    def check(label, cond):
        print(('  PASS  ' if cond else '  FAIL  ') + label)
        if not cond:
            fails.append(label)

    print('[self-test] positive control (unwrapped printf blob)')
    sites = find_style_sites(POSITIVE_FIXTURE)
    violations = [expr for shape, expr, start, end in sites if STRIP not in expr]
    check('positive control: printf site found', len(sites) == 1)
    check('positive control: flagged as a violation', len(violations) == 1)

    print('[self-test] negative control A (wrapped printf)')
    sites = find_style_sites(NEGATIVE_FIXTURE_PRINTF)
    violations = [expr for shape, expr, start, end in sites if STRIP not in expr]
    check('negative A: printf site found', len(sites) == 1)
    check('negative A: NOT flagged (wrap present)', len(violations) == 0)

    print('[self-test] negative control B (wrapped echo-concat)')
    sites = find_style_sites(NEGATIVE_FIXTURE_ECHO_CONCAT)
    violations = [expr for shape, expr, start, end in sites if STRIP not in expr]
    check('negative B: echo_concat site found', len(sites) == 1)
    check('negative B: NOT flagged (wrap present)', len(violations) == 0)

    print('[self-test] negative control C (wrapped heredoc)')
    sites = find_style_sites(NEGATIVE_FIXTURE_HEREDOC)
    violations = [expr for shape, expr, start, end in sites if STRIP not in expr]
    check('negative C: heredoc site found', len(sites) == 1)
    check('negative C: NOT flagged (wrap present)', len(violations) == 0)

    print('[self-test] negative control D (multi-placeholder printf/sprintf — regression control)')
    sites = find_style_sites(NEGATIVE_FIXTURE_MULTI_PLACEHOLDER)
    violations = [expr for shape, expr, start, end in sites if STRIP not in expr]
    check('negative D: sprintf site found', len(sites) == 1)
    check('negative D: content arg resolved (not the id arg)', sites and 'slider_scoped_css' in sites[0][1])
    check('negative D: NOT flagged (content arg IS wrapped)', len(violations) == 0)

    print('[self-test] negative control E (ternary-wrapped concat chain)')
    sites = find_style_sites(NEGATIVE_FIXTURE_TERNARY_CONCAT)
    violations = [expr for shape, expr, s, e in sites if STRIP not in expr]
    check('negative E: concat_chain site found', len(sites) == 1)
    check('negative E: NOT flagged (wrap present)', len(violations) == 0)

    print('[self-test] negative control F (multi-part id concat chain)')
    sites = find_style_sites(NEGATIVE_FIXTURE_MULTIPART_ID_CONCAT)
    violations = [expr for shape, expr, s, e in sites if STRIP not in expr]
    check('negative F: concat_chain site found', len(sites) == 1)
    check('negative F: content arg resolved (not the id operand)', sites and 'card_grid_native_css' in sites[0][1])
    check('negative F: NOT flagged (wrap present)', len(violations) == 0)

    print('[self-test] negative control G (interpolated-id heredoc)')
    sites = find_style_sites(NEGATIVE_FIXTURE_HEREDOC_INTERP_ID)
    violations = [expr for shape, expr, s, e in sites if STRIP not in expr]
    check('negative G: heredoc_interp_id site found', len(sites) == 1)
    check('negative G: NOT flagged (wrap present)', len(violations) == 0)

    print('[self-test] positive control (unwrapped concat chain)')
    sites = find_style_sites(POSITIVE_FIXTURE_CONCAT_CHAIN)
    violations = [expr for shape, expr, s, e in sites if STRIP not in expr]
    check('positive concat_chain: site found', len(sites) == 1)
    check('positive concat_chain: flagged as a violation', len(violations) == 1)

    print('[self-test] --fix transform on the positive control (span-based, not substring)')
    fixed = POSITIVE_FIXTURE
    pos_violations = [(e, s, en) for _, e, s, en in find_style_sites(POSITIVE_FIXTURE) if STRIP not in e]
    for expr, start, end in sorted(pos_violations, key=lambda v: v[1], reverse=True):
        fixed = fixed[:start] + f"wp_strip_all_tags( {expr} )" + fixed[end:]
    check('fix output matches expected wrap', fixed == EXPECTED_FIX_OUTPUT)

    print('[self-test] span-based fix does not corrupt an EARLIER same-named assignment')
    # The actual bug the first cut of this gate shipped with: a substring
    # replace on `$responsive_css` hit the assignment line, not the printf
    # call, because the variable name appears twice in the same fixture.
    check('assignment line untouched', "$responsive_css = $scope . '{color:' . $colour . '}';" in fixed)
    check('printf call is the one that changed', 'printf( \'<style>%s</style>\', wp_strip_all_tags( $responsive_css ) );' in fixed)

    print('[self-test] real-tree regression control (the actual bug this gate was built for)')
    text_render = os.path.join(ROOT, 'src', 'blocks', 'text', 'render.php')
    if os.path.exists(text_render):
        result = scan_file(text_render)
        check('sgs/text render.php now has zero violations (post-fix)', len(result['violations']) == 0)
    else:
        print('  SKIP  sgs/text render.php not found in this tree')

    print(f"\n{'PASS' if not fails else 'FAIL'} — {len(fails)} failing assertion(s)")
    return 0 if not fails else 1


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument('--survey', action='store_true')
    g.add_argument('--fix', action='store_true')
    g.add_argument('--check', action='store_true')
    g.add_argument('--self-test', action='store_true')
    p.add_argument('--apply', action='store_true', help='with --fix, write changes (default: dry-run diff)')
    args = p.parse_args()

    if args.survey:
        return cmd_survey()
    if args.fix:
        return cmd_fix(args.apply)
    if args.check:
        return cmd_check()
    if args.self_test:
        return self_test()


if __name__ == '__main__':
    sys.exit(main())
