#!/usr/bin/env python3
"""migrate-container-flexwrap-and-stack-candidates.py — census + safe single-apply for TWO
distinct `sgs/container` flex-row populations. They are NOT the same population and must not
be conflated (see D774, `.claude/decisions.md`):

  POPULATION A — STORED `flexWrap`-missing containers (live WordPress DB, post_content).
      `flexWrap`'s default moved from a hidden PHP fallback into each block.json's own
      `"default": "wrap"` (2026-08-24, see reports/visual-diff/container-2026-08-24.md).
      WordPress backfills a MISSING attribute with its declared schema default at render
      time (`WP_Block_Type::prepare_attributes_for_render()`), so a stored container with no
      `flexWrap` key already RENDERS as "wrap" today — this population is a data-hygiene
      gap (the stored JSON doesn't say what it does), not a live rendering bug. Confirm this
      against the real DB rather than assume: `--survey-missing-flexwrap` reports the actual
      count, and the script refuses to claim more than the evidence shows.

  POPULATION B — FILE-AUTHORED flex rows that may really be a stack (theme patterns/
      templates/parts, D774's own re-run). `survey-flex-row-shape.py` skips any container
      that ALREADY has an explicit `flexWrap` (its own line ~109) — D774 proved that filter
      hides real candidates: the 2026-08-24 flexWrap-default commit authored an EXPLICIT
      `flexWrap:"wrap"` on 80 containers, which removed them from that script's population
      WITHOUT making them any less of an accidental flex row. This script reproduces D774's
      exact re-run — same classifier, filter removed — and reports the SAME two numbers
      D774 recorded (125 total, 83 non-NO-OP) as the expected figures to reconcile against.

⛔ **Neither population gets a batch `--apply`.** Population A's fix is mechanical (write the
literal string "wrap" into a JSON key) but still touches live content across 38 posts/pages —
`--apply` only ever writes to ONE post, named explicitly on the command line, never a loop.
Population B has NO apply path at all: converting `layout` to a stacked/grid primitive is a
visible redesign (content-sized children become full-width) that needs Bean's screenshot-by-
screenshot sign-off per CLAUDE.md rule 4a (measurement vs eye) — this script only reports
candidates for that review, exactly like `survey-flex-row-shape.py` already refuses to.

GATE FIXTURES ARE EXCLUDED FROM BOTH LISTS, AUTOMATICALLY.
`[GATE - DO NOT DELETE]` / `[GATE — DO NOT DELETE]` (either dash) pages are load-bearing QA
canaries for the live motion/a11y probes (see `plugins/sgs-blocks/CLAUDE.md` "LOAD-BEARING
CANARY FIXTURES" — pages 2103/2109/2113/2603 at minimum, and any other post carrying the same
title marker). `is_gate_fixture(title)` is the single predicate both populations' filters call.

USAGE
-----
    # Population A — stored content, live canary (read-only pull, cached locally)
    python migrate-container-flexwrap-and-stack-candidates.py --pull
    python migrate-container-flexwrap-and-stack-candidates.py --survey-missing-flexwrap
    python migrate-container-flexwrap-and-stack-candidates.py --survey-missing-flexwrap --json
    python migrate-container-flexwrap-and-stack-candidates.py --apply --container-id <post_id>:<n>

    # Population B — theme files, D774 re-run
    python migrate-container-flexwrap-and-stack-candidates.py --survey-stack-candidates
    python migrate-container-flexwrap-and-stack-candidates.py --survey-stack-candidates --json

    python migrate-container-flexwrap-and-stack-candidates.py --self-test

Dry-run is the ONLY default behaviour. `--apply` requires `--container-id` naming exactly one
post-block pair; anything else (a bare `--apply`, a comma list, a wildcard) is refused.
"""

import argparse
import io
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[3]
THEME_DIRS = ('theme/sgs-theme/patterns', 'theme/sgs-theme/templates', 'theme/sgs-theme/parts')
CACHE_DIR = REPO / 'reports' / 'flexwrap-migration'

SSH_KEY = str(Path.home() / '.ssh' / 'id_ed25519')
SSH_HOST = 'u945238940@141.136.39.73'
SSH_PORT = '65002'
WP_DIR = 'domains/sandybrown-nightingale-600381.hostingersite.com/public_html'

_GATE_RE = re.compile(r'\[\s*GATE\s*[-—–]\s*DO NOT DELETE\s*\]', re.I)

TOK = re.compile(r'<!--\s*(/?)wp:([a-z0-9-]+(?:/[a-z0-9-]+)?)([^>]*?)(/?)-->', re.S)
_DEC = json.JSONDecoder()


def is_gate_fixture(title: str) -> bool:
    """The one predicate both populations' exclusion filters call. Matches the em-dash and
    hyphen variants seen in this repo's own titles (`[GATE - DO NOT DELETE]` /
    `[GATE — DO NOT DELETE]`)."""
    return bool(_GATE_RE.search(title or ''))


# --------------------------------------------------------------------------------------
# Shared block-comment parsing (deliberately re-implemented, not imported, matching this
# repo's own stated convention — see migrate-stored-tier-scalars.py's module docstring on
# why sibling census scripts don't import each other: different input shape, same logic
# kept in sync by inspection rather than a shared module that would blur which script
# owns which target).
# --------------------------------------------------------------------------------------

def parse_attrs(raw: str) -> dict:
    raw = raw.strip()
    if not raw.startswith('{'):
        return {}
    try:
        attrs, _ = _DEC.raw_decode(raw)
        return attrs if isinstance(attrs, dict) else {}
    except Exception:
        return {}


def iter_container_tokens(text: str):
    """Yield (match, attrs) for every OPENING `wp:sgs/container` token in `text`, whether
    or not it is self-closing."""
    for m in TOK.finditer(text):
        if m.group(1) or m.group(2) != 'sgs/container':
            continue
        yield m, parse_attrs(m.group(3))


def direct_children(toks, i):
    """Block names of the DIRECT children of toks[i] — copied verbatim from
    survey-flex-row-shape.py (same nesting-depth walk); kept in sync by inspection."""
    if toks[i].group(4):
        return []
    depth, kids = 0, []
    for n in toks[i + 1:]:
        closing, name, _, selfclose = n.groups()
        if closing:
            if depth == 0:
                break
            depth -= 1
        else:
            if depth == 0:
                kids.append(name)
            if not selfclose:
                depth += 1
    return kids


def classify_shape(kids):
    """Same 3-way verdict as survey-flex-row-shape.py: NO-OP / CARD-SHAPED / FLEX-ROW."""
    if len(kids) < 2:
        return 'NO-OP'
    uniq = set(kids)
    if len(kids) >= 3 and len(uniq) == 1:
        return 'CARD-SHAPED'
    return 'FLEX-ROW'


# --------------------------------------------------------------------------------------
# Population A — stored post_content, live canary
# --------------------------------------------------------------------------------------

def _ssh_run(remote_cmd: str, timeout: int = 90) -> str:
    proc = subprocess.run(
        ['ssh', '-i', SSH_KEY, '-p', SSH_PORT, SSH_HOST, remote_cmd],
        capture_output=True, text=True, timeout=timeout,
    )
    if proc.returncode != 0:
        raise RuntimeError(f'ssh command failed (exit {proc.returncode}): {proc.stderr.strip()[:800]}')
    return proc.stdout


def pull_posts_dump(cache_path: Path = None, include_trash: bool = False) -> Path:
    """Read-only wp-cli pull of every post's ID/title/status/type/content in ONE call, so
    Population A never needs an N+1 round trip. Cached to disk (text-in/text-out discipline
    for everything downstream — survey/apply both read the cache, never SSH again on their
    own) with a UTC timestamp in the filename.

    ⚠ **`--post_type=any --post_status=any` does NOT include trashed posts** — verified
    2026-08-27: 29 trashed page/post/product posts on the canary carry 64 more
    missing-flexWrap instances across 13 more posts (100/28 live-only -> 164/41 with trash
    included). Default is live-only (trashed content isn't a migration priority); pass
    `--include-trash` to widen the pull if reconciling against a wider historical count."""
    remote_cmd = (
        f'cd {WP_DIR} && wp post list --post_type=any --post_status=any '
        f'--fields=ID,post_title,post_status,post_type,post_content --format=json'
    )
    raw = _ssh_run(remote_cmd)
    posts = json.loads(raw)
    if include_trash:
        trash_cmd = (
            f'cd {WP_DIR} && wp post list --post_type=page,post,product --post_status=trash '
            f'--fields=ID,post_title,post_status,post_type,post_content --format=json'
        )
        posts += json.loads(_ssh_run(trash_cmd))
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H%M%SZ')
    path = cache_path or (CACHE_DIR / f'posts-dump-{stamp}.json')
    path.write_text(json.dumps(posts, indent=2), encoding='utf-8')
    print(f'pulled {len(posts)} posts -> {path}')
    return path


def latest_cache() -> Path:
    if not CACHE_DIR.exists():
        raise FileNotFoundError(
            f'{CACHE_DIR} does not exist — run --pull first (no cached dump to survey).')
    files = sorted(CACHE_DIR.glob('posts-dump-*.json'))
    if not files:
        raise FileNotFoundError(
            f'no posts-dump-*.json in {CACHE_DIR} — run --pull first.')
    return files[-1]


def survey_missing_flexwrap(posts: list) -> list:
    """Population A: every `sgs/container` block instance in every post's stored
    post_content that carries NO `flexWrap` key at all (whether or not it has any other
    attributes). `layout`/`flexDirection` are carried through so a reviewer can see whether
    the container is even flex-relevant (layout unset or "flex" — D742's own default flip —
    is the case where flexWrap actually paints something; other layouts carry the attr
    inertly and are still reported, never silently dropped)."""
    out = []
    for post in posts:
        title = post.get('post_title', '')
        if is_gate_fixture(title):
            continue
        content = post.get('post_content') or ''
        toks = list(TOK.finditer(content))
        idx_by_open = {}
        n = 0
        for m in toks:
            if m.group(1) or m.group(2) != 'sgs/container':
                continue
            attrs = parse_attrs(m.group(3))
            if 'flexWrap' in attrs:
                n += 1
                continue
            layout = attrs.get('layout', '')
            flex_direction = str(attrs.get('flexDirection', ''))
            flex_relevant = layout in ('', 'flex')
            out.append({
                'post_id': post.get('ID'),
                'post_title': title,
                'post_status': post.get('post_status'),
                'post_type': post.get('post_type'),
                'container_index': n,
                'layout': layout or '(unset -> flex, D742 default)',
                'flexDirection': flex_direction or '(unset -> row)',
                'flex_relevant': flex_relevant,
                'proposed_flexWrap': 'wrap',
                'note': (
                    'flex-relevant: WP already backfills the block.json default "wrap" at '
                    'render, so this is a stored-data-hygiene gap, not a live render bug'
                    if flex_relevant else
                    'layout is not flex — flexWrap has no visual effect on this instance, '
                    'reported for completeness, not a priority fix'
                ),
            })
            n += 1
    return out


def apply_single_flexwrap(post_id: int, container_index: int, dump_path: Path) -> int:
    """Write `flexWrap:"wrap"` into exactly ONE container instance, in exactly ONE post.
    Refuses (exit 1, no write) on any ambiguity: post not found, container index out of
    range, target already has flexWrap, or the post is a GATE fixture. This is the single
    load-bearing safety property the whole tool exists to provide — see module docstring."""
    posts = json.loads(dump_path.read_text(encoding='utf-8'))
    post = next((p for p in posts if p.get('ID') == post_id), None)
    if post is None:
        print(f'REFUSED: post {post_id} not found in {dump_path.name} — re-run --pull?')
        return 1
    title = post.get('post_title', '')
    if is_gate_fixture(title):
        print(f'REFUSED: post {post_id} ("{title}") is a GATE fixture — never auto-edited.')
        return 1

    content = post.get('post_content') or ''
    toks = list(TOK.finditer(content))
    container_opens = [m for m in toks if not m.group(1) and m.group(2) == 'sgs/container']
    if container_index < 0 or container_index >= len(container_opens):
        print(f'REFUSED: container_index {container_index} out of range '
              f'(post {post_id} has {len(container_opens)} sgs/container instances).')
        return 1
    m = container_opens[container_index]
    attrs = parse_attrs(m.group(3))
    if 'flexWrap' in attrs:
        print(f'REFUSED: post {post_id} container #{container_index} already has flexWrap '
              f'({attrs["flexWrap"]!r}) — nothing to apply.')
        return 1

    attrs['flexWrap'] = 'wrap'
    new_json = json.dumps(attrs, separators=(',', ':'))
    old_span = m.group(0)
    new_token = f'<!-- wp:sgs/container {new_json} -->'
    new_content = content[:m.start()] + new_token + content[m.end():]

    print(f'post {post_id} ("{title}") container #{container_index}:')
    print(f'  BEFORE: {old_span[:160]}')
    print(f'  AFTER : {new_token[:160]}')

    remote_cmd = (
        f"cd {WP_DIR} && wp post update {post_id} --post_content="
        + _shell_quote_remote(new_content)
    )
    _ssh_run(remote_cmd, timeout=60)
    print(f'APPLIED: post {post_id} updated.')
    return 0


def _shell_quote_remote(s: str) -> str:
    """Single-quote for the remote POSIX shell, escaping embedded single quotes the
    standard `'\\''` way. Content is passed via a temp file when it's large, to avoid
    hitting an ARG_MAX limit on very long post_content — small containers fit inline."""
    escaped = s.replace("'", "'\\''")
    return f"'{escaped}'"


# --------------------------------------------------------------------------------------
# Population B — theme files, D774 re-run (filter removed: EVERY flex row, not just ones
# missing flexWrap)
# --------------------------------------------------------------------------------------

def theme_files():
    out = []
    for d in THEME_DIRS:
        for ext in ('*.php', '*.html'):
            out += (REPO / d).glob(ext)
    return sorted(out)


def survey_stack_candidates() -> list:
    """D774's exact re-run: same classifier as survey-flex-row-shape.py, but the line-109
    `if attrs.get('flexWrap', '') != '': continue` filter is REMOVED — a container that
    already has an explicit flexWrap is still an accidental flex row if its children are
    CARD-SHAPED or a genuine FLEX-ROW; having an explicit flexWrap value says nothing about
    whether that arrangement is the right one. NO-OP (fewer than 2 children) is excluded —
    wrap/no-wrap is definitionally inert there."""
    rows = []
    for f in theme_files():
        rel = f.relative_to(REPO).as_posix()
        s = io.open(f, encoding='utf-8', errors='replace').read()
        toks = list(TOK.finditer(s))
        for i, m in enumerate(toks):
            if m.group(1) or m.group(2) != 'sgs/container':
                continue
            attrs = parse_attrs(m.group(3))
            if attrs.get('layout', 'flex') != 'flex':
                continue
            if str(attrs.get('flexDirection', '')).startswith('column'):
                continue
            # (no flexWrap-unset filter here — this is the D774 re-run)
            kids = direct_children(toks, i)
            verdict = classify_shape(kids)
            if verdict == 'NO-OP':
                continue
            rows.append({
                'file': rel,
                'line': s[:m.start()].count('\n') + 1,
                'children': len(kids),
                'child_types': sorted(set(kids)),
                'verdict': verdict,
                'existing_flexWrap': attrs.get('flexWrap', '(unset -> default "wrap")'),
                'candidate_note': (
                    'CARD-SHAPED (3+ identical children) — candidate for a grid/stack '
                    'primitive instead of flex+wrap; needs a per-page screenshot review, '
                    'not an auto-conversion'
                    if verdict == 'CARD-SHAPED' else
                    'FLEX-ROW (2 children, or heterogeneous) — genuinely a row most of the '
                    'time; flag only, content-width-dependent, this script cannot see '
                    'rendered width'
                ),
                'screenshot_hint': (
                    f'render the page/pattern containing {rel}:{s[:m.start()].count(chr(10)) + 1} '
                    'at 375/768/1440 via Playwright before any conversion decision — this '
                    'script is static-only and cannot capture one itself'
                ),
            })
    return rows


# --------------------------------------------------------------------------------------
# Reporting
# --------------------------------------------------------------------------------------

def _print_flexwrap_report(rows, as_json):
    if as_json:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        out = CACHE_DIR / 'missing-flexwrap-report.json'
        out.write_text(json.dumps(rows, indent=2), encoding='utf-8')
        print(f'wrote {out} ({len(rows)} candidates)')
        return
    posts = sorted({r['post_id'] for r in rows})
    print(f'Population A — stored sgs/container instances missing flexWrap: {len(rows)}')
    print(f'  across {len(posts)} posts/pages')
    flex_relevant = sum(1 for r in rows if r['flex_relevant'])
    print(f'  flex-relevant (layout unset/"flex"): {flex_relevant}')
    print(f'  layout != flex (inert): {len(rows) - flex_relevant}')
    for r in rows[:40]:
        print(f"  post {r['post_id']:<6} #{r['container_index']:<3} "
              f"layout={r['layout']:<28} dir={r['flexDirection']}")
    if len(rows) > 40:
        print(f'  ... ({len(rows) - 40} more, use --json for the full list)')


def _print_stack_report(rows, as_json):
    if as_json:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        out = CACHE_DIR / 'stack-candidates-report.json'
        out.write_text(json.dumps(rows, indent=2), encoding='utf-8')
        print(f'wrote {out} ({len(rows)} candidates)')
        return
    from collections import Counter
    tally = Counter(r['verdict'] for r in rows)
    print(f'Population B — file-authored non-NO-OP flex rows (D774 re-run): {len(rows)}')
    print(f"  CARD-SHAPED  {tally['CARD-SHAPED']:>4}   candidate for grid/stack, needs eye review")
    print(f"  FLEX-ROW     {tally['FLEX-ROW']:>4}   flagged, content-width-dependent")
    for r in rows[:40]:
        types = ','.join(t.replace('sgs/', '') for t in r['child_types'])[:44]
        print(f"  {r['file']}:{r['line']:<5} {r['verdict']:<12} children={r['children']:<3} [{types}]")
    if len(rows) > 40:
        print(f'  ... ({len(rows) - 40} more, use --json for the full list)')


# --------------------------------------------------------------------------------------
# Self-test
# --------------------------------------------------------------------------------------

def self_test() -> int:
    failures = []

    # 1. GATE-fixture predicate — both dash variants, and a negative control.
    gate_cases = [
        ('[GATE - DO NOT DELETE] Motion probe', True),
        ('[GATE — DO NOT DELETE] Motion probe', True),
        ('Regular page about wrap', False),
        ('gate to nowhere', False),  # "gate" alone must NOT match
        ('[GATE-DO NOT DELETE] tight spacing variant', True),
    ]
    for title, expected in gate_cases:
        got = is_gate_fixture(title)
        if got != expected:
            failures.append(f'is_gate_fixture({title!r}) expected {expected} got {got}')

    # 2. classify_shape — same fixtures as survey-flex-row-shape.py's own self-test,
    #    reused deliberately so the two scripts can never quietly disagree.
    shape_cases = [
        ([], 'NO-OP'), (['sgs/heading'], 'NO-OP'),
        (['sgs/card', 'sgs/card', 'sgs/card'], 'CARD-SHAPED'),
        (['sgs/card', 'sgs/card'], 'FLEX-ROW'),
        (['sgs/heading', 'sgs/button', 'sgs/text'], 'FLEX-ROW'),
        (['sgs/card', 'sgs/card', 'sgs/button'], 'FLEX-ROW'),
    ]
    for kids, expected in shape_cases:
        got = classify_shape(kids)
        if got != expected:
            failures.append(f'classify_shape({kids}) expected {expected} got {got}')

    # 3. survey_missing_flexwrap — a known synthetic fixture: 3 posts, one GATE-excluded,
    #    one with flexWrap already set (must be skipped), one genuinely missing it.
    fixture_posts = [
        {
            'ID': 1, 'post_title': 'Normal page', 'post_status': 'publish', 'post_type': 'page',
            'post_content': (
                '<!-- wp:sgs/container {"layout":"flex"} -->'
                '<!-- wp:sgs/heading {} /--><!-- wp:sgs/text {} /-->'
                '<!-- /wp:sgs/container -->'
            ),
        },
        {
            'ID': 2, 'post_title': '[GATE - DO NOT DELETE] Motion probe', 'post_status': 'publish',
            'post_type': 'page',
            'post_content': '<!-- wp:sgs/container {"layout":"flex"} /-->',
        },
        {
            'ID': 3, 'post_title': 'Already explicit', 'post_status': 'publish', 'post_type': 'page',
            'post_content': '<!-- wp:sgs/container {"layout":"flex","flexWrap":"nowrap"} /-->',
        },
    ]
    got_rows = survey_missing_flexwrap(fixture_posts)
    if len(got_rows) != 1 or got_rows[0]['post_id'] != 1:
        failures.append(
            f'survey_missing_flexwrap fixture expected exactly 1 finding on post 1, '
            f'got {[r["post_id"] for r in got_rows]}')

    # 4. apply_single_flexwrap — refusals, using the SAME fixture, no network.
    tmp_dump = CACHE_DIR / '_self_test_dump.json'
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    tmp_dump.write_text(json.dumps(fixture_posts), encoding='utf-8')
    try:
        # (a) GATE post must be refused.
        rc = apply_single_flexwrap(2, 0, tmp_dump)
        if rc != 1:
            failures.append('apply_single_flexwrap on a GATE post should refuse (exit 1)')
        # (b) already-explicit container must be refused.
        rc = apply_single_flexwrap(3, 0, tmp_dump)
        if rc != 1:
            failures.append('apply_single_flexwrap on an already-explicit container should refuse')
        # (c) unknown post id must be refused.
        rc = apply_single_flexwrap(999, 0, tmp_dump)
        if rc != 1:
            failures.append('apply_single_flexwrap on an unknown post id should refuse')
        # (d) out-of-range container index on a real post must be refused.
        rc = apply_single_flexwrap(1, 5, tmp_dump)
        if rc != 1:
            failures.append('apply_single_flexwrap with an out-of-range container index should refuse')
    finally:
        tmp_dump.unlink(missing_ok=True)

    # 5. survey_stack_candidates negative control — a NO-OP container (1 child) must
    #    never appear, even though it is a flex row.
    tmp_file = REPO / 'plugins' / 'sgs-blocks' / 'scripts' / '_flexwrap_selftest_fixture.php'
    tmp_file.write_text(
        '<!-- wp:sgs/container {"layout":"flex","flexWrap":"wrap"} -->'
        '<!-- wp:sgs/heading {} /-->'
        '<!-- /wp:sgs/container -->\n'
        '<!-- wp:sgs/container {"layout":"flex","flexWrap":"wrap"} -->'
        '<!-- wp:sgs/card {} /--><!-- wp:sgs/card {} /--><!-- wp:sgs/card {} /-->'
        '<!-- /wp:sgs/container -->\n',
        encoding='utf-8',
    )
    try:
        orig_theme_dirs = list(THEME_DIRS)
        # Point the scan at just this one scratch file by monkey-patching theme_files().
        global theme_files
        real_theme_files = theme_files

        def _fixture_only():
            return [tmp_file]

        theme_files = _fixture_only
        rows = survey_stack_candidates()
        theme_files = real_theme_files
        verdicts = sorted(r['verdict'] for r in rows)
        if verdicts != ['CARD-SHAPED']:
            failures.append(
                f'survey_stack_candidates fixture expected exactly one CARD-SHAPED row '
                f'(the explicit-flexWrap container must still be found, the 1-child one must '
                f'still be excluded), got {verdicts}')
    finally:
        tmp_file.unlink(missing_ok=True)

    total = len(gate_cases) + len(shape_cases) + 1 + 4 + 1
    passed = total - len(failures)
    print(f'self-test: {passed}/{total} pass')
    for f in failures:
        print(f'  FAIL {f}')
    return 1 if failures else 0


# --------------------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pull', action='store_true', help='SSH wp-cli pull of every post, cached locally')
    ap.add_argument('--include-trash', action='store_true',
                     help='with --pull, also include trashed page/post/product posts (see pull_posts_dump docstring)')
    ap.add_argument('--survey-missing-flexwrap', action='store_true', help='Population A census')
    ap.add_argument('--survey-stack-candidates', action='store_true', help='Population B census (theme files)')
    ap.add_argument('--json', action='store_true', help='write the full report to reports/flexwrap-migration/*.json')
    ap.add_argument('--apply', action='store_true', help='write flexWrap:"wrap" to ONE container (Population A only)')
    ap.add_argument('--container-id', metavar='POST_ID:INDEX',
                     help='exactly one "post_id:container_index" pair — required with --apply, refused otherwise')
    ap.add_argument('--dry-run', action='store_true', help='default behaviour; accepted for explicitness')
    ap.add_argument('--self-test', action='store_true')
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    if args.pull:
        pull_posts_dump(include_trash=args.include_trash)
        return 0

    if args.apply:
        if not args.container_id or ',' in args.container_id or ':' not in args.container_id:
            print('REFUSED: --apply requires exactly one --container-id POST_ID:INDEX '
                  '(no batches, no wildcards, no comma lists).')
            return 1
        post_id_s, idx_s = args.container_id.split(':', 1)
        try:
            post_id, idx = int(post_id_s), int(idx_s)
        except ValueError:
            print(f'REFUSED: --container-id {args.container_id!r} is not "POST_ID:INDEX".')
            return 1
        dump = latest_cache()
        return apply_single_flexwrap(post_id, idx, dump)

    if args.survey_missing_flexwrap:
        dump = latest_cache()
        posts = json.loads(dump.read_text(encoding='utf-8'))
        rows = survey_missing_flexwrap(posts)
        _print_flexwrap_report(rows, args.json)
        return 0

    if args.survey_stack_candidates:
        rows = survey_stack_candidates()
        _print_stack_report(rows, args.json)
        return 0

    ap.print_help()
    return 1


if __name__ == '__main__':
    sys.exit(main())
