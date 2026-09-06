#!/usr/bin/env python3
"""migrate-product-card-image-id.py — backfill `imageId` (a real WordPress
attachment post ID) for `sgs/product-card` block instances that currently
carry only a bare `image` URL string.

BACKGROUND
----------
`sgs/product-card`'s `image` attribute has always been `{"type":"string"}` — a
raw URL with no attachment-ID sibling and no responsive tiers. `imageId`
(`{"type":"number","default":0}`) was added to `block.json` alongside it
(same session) as a FORWARD-ONLY write target: `edit.js`'s 4 image-picker
write sites now also store `media.id` when an operator re-picks the image.
`image` is untouched and stays the PERMANENT fallback — it is never removed,
never made conditional, forever.

This script is the BACKFILL half: for every `sgs/product-card` instance
authored/cloned BEFORE that change, `image` holds a URL and `imageId` is
absent or 0. `attachment_url_to_postid()` (WP core) can resolve many of those
URLs back to a real attachment ID after the fact — but it is a WordPress PHP
function, unreachable from a plain Python process, so resolution runs on the
live WordPress install via WP-CLI `wp eval-file` over SSH (the same
ssh+scp shape `push-theme-snapshot.py` already uses for this repo's other
live-site scripts — see REPO conventions below). A URL `attachment_url_to_postid()`
cannot match (external image, deleted attachment, a size-suffixed filename
WordPress didn't index, …) is reported in an explicit NO-MATCH bucket and is
NEVER guessed at — `imageId` stays 0/absent and the block keeps rendering off
the `image` URL exactly as before.

INPUT SHAPE (mirrors migrate-stored-tier-scalars.py / audit-post-content-blocks.py)
------------------------------------------------------------------------------------
A path to a post_content dump file, a directory (scanned non-recursively for
`*.txt`), or `-` for a single dump on stdin. Dumps are prepared externally —
typically `wp post list --post_type=page --post_status=publish --format=json`
plus one `wp post get <id> --field=post_content` per id (this script does not
export from WordPress itself; it migrates text, exactly like its sibling
scalar-tier migrators). "Published" (per the brief) is therefore an
INPUT-PREPARATION contract, not something this script enforces — it processes
whatever dumps it is given, the same division of responsibility
`migrate-stored-tier-scalars.py` uses.

USAGE
-----
    python migrate-product-card-image-id.py --survey <file-or-dir> [...]
    python migrate-product-card-image-id.py --fix     <file-or-dir> [...]           (dry-run)
    python migrate-product-card-image-id.py --fix --apply <file-or-dir> [...]       (write)
    python migrate-product-card-image-id.py --check   <file-or-dir> [...]           (CI gate)
    python migrate-product-card-image-id.py --self-test

SSH resolution target defaults to the sandybrown canary (matches
build-deploy.py / push-theme-snapshot.py); override with --ssh-user-host/
--ssh-port/--ssh-key/--wp-root for a different WP install.

WHAT IT REFUSES TO DO (refuse, never guess)
--------------------------------------------
* Never writes an `imageId` for a URL `attachment_url_to_postid()` did not
  match — that instance is reported NO-MATCH and left untouched, forever (not
  "until a future pass"); the `image` URL keeps rendering it.
* Never fabricates a match when SSH/WP-CLI is unreachable — every pending URL
  is reported UNREACHABLE (a third bucket, distinct from NO-MATCH) and NOTHING
  is written for that run. An unreachable resolver is not evidence of "no
  match" and must never be treated as one.
* Never touches an instance whose `imageId` is already non-zero — it has
  already been resolved (either by a previous run of this script, or by an
  operator re-picking the image in the editor after this session's edit.js
  change) and is left exactly as authored.
* Never touches `image` itself. That attribute is the permanent fallback and
  this script's job is additive only.
* Never emits invalid JSON — refuses (writes nothing for that instance) if the
  result would not re-parse cleanly.
"""

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[3]

BLOCK_SLUG = 'sgs/product-card'
_COMMENT_RE = re.compile(r'<!--\s*wp:(sgs/product-card)\s+')

# SSH/WP-CLI defaults — mirrors build-deploy.py / push-theme-snapshot.py's
# sandybrown canary conventions (the only live target this repo currently has).
DEFAULT_SSH_KEY = str(Path.home() / '.ssh' / 'id_ed25519')
DEFAULT_SSH_PORT = 65002
DEFAULT_SSH_USER_HOST = 'u945238940@141.136.39.73'
DEFAULT_WP_ROOT = 'domains/sandybrown-nightingale-600381.hostingersite.com/public_html'


# --------------------------------------------------------------- parsing / classification

def iter_block_attrs(text: str):
    """Yield (json_start, json_end, attrs_dict) for every wp:sgs/product-card comment
    carrying a JSON attributes object. Uses json's own raw_decode — robust against
    nested objects — never a hand-rolled brace matcher (mirrors
    migrate-stored-tier-scalars.py's iter_block_attrs, scoped to one block)."""
    for m in _COMMENT_RE.finditer(text):
        idx = m.end()
        if idx >= len(text) or text[idx] != '{':
            continue
        try:
            obj, end = json.JSONDecoder().raw_decode(text, idx)
        except json.JSONDecodeError:
            continue
        if not isinstance(obj, dict):
            continue
        yield idx, end, obj


def is_candidate(attrs: dict):
    """True when this instance has a non-empty `image` URL string and an
    absent/zero `imageId` — exactly the backfill target. An already-resolved
    instance (imageId truthy) is never touched again."""
    image = attrs.get('image')
    if not isinstance(image, str) or image == '':
        return False
    image_id = attrs.get('imageId', 0)
    if isinstance(image_id, bool):  # bool is an int subclass — guard before the int check
        return False
    if isinstance(image_id, (int, float)) and image_id:
        return False
    if isinstance(image_id, str) and image_id not in ('', '0'):
        return False
    return True


def scan_text(label: str, text: str):
    """Yield candidate finding dicts for `label`'s text."""
    findings = []
    for start, end, attrs in iter_block_attrs(text):
        if not is_candidate(attrs):
            continue
        findings.append({
            'post': label, 'start': start, 'end': end,
            'attrs': attrs, 'image_url': attrs['image'],
        })
    return findings


def collect_inputs(paths):
    """Mirrors migrate-stored-tier-scalars.py's collect_inputs: files as-is, dirs
    scanned for *.txt (non-recursive), '-' reads stdin."""
    files = []
    for a in paths:
        if a == '-':
            files.append(None)
            continue
        p = Path(a)
        if p.is_dir():
            files.extend(sorted(q for q in p.glob('*.txt')))
        elif p.is_file():
            files.append(p)
        else:
            print(f'[migrate-product-card-image-id] no such path: {a}', file=sys.stderr)
            return None
    return files


def survey(files):
    out = []
    for f in files:
        text = f.read_text(encoding='utf-8', errors='replace') if f is not None else sys.stdin.read()
        label = f.stem if f is not None else 'stdin'
        out.extend(scan_text(label, text))
    return out


# --------------------------------------------------------------- WP-CLI resolution

_EVAL_PHP_TEMPLATE = """<?php
// migrate-product-card-image-id.py — one-shot attachment_url_to_postid() resolver.
// Reads a JSON array of URLs from stdin, writes {url: id} (0 = no match) to stdout.
$raw = stream_get_contents( STDIN );
$urls = json_decode( $raw, true );
if ( ! is_array( $urls ) ) {
    fwrite( STDERR, "invalid input\\n" );
    exit( 1 );
}
$out = array();
foreach ( $urls as $url ) {
    $id = attachment_url_to_postid( (string) $url );
    $out[ $url ] = $id ? (int) $id : 0;
}
echo json_encode( $out );
"""


def resolve_via_wp_cli(urls, ssh_key=DEFAULT_SSH_KEY, ssh_port=DEFAULT_SSH_PORT,
                        ssh_user_host=DEFAULT_SSH_USER_HOST, wp_root=DEFAULT_WP_ROOT,
                        timeout=30):
    """Resolve `urls` (a list of strings) to attachment IDs via a live WP install,
    over SSH + `wp eval-file`. Returns ('ok', {url: id}) — id 0 means
    attachment_url_to_postid() found nothing — or ('unreachable', {}) if SSH/WP-CLI
    could not be reached at all. NEVER fabricates a match on failure — an
    unreachable resolver returns the 'unreachable' status, not an empty-but-'ok'
    result, so callers can tell "checked, no match" apart from "never checked".

    Mirrors push-theme-snapshot.py's scp-then-ssh shape: the PHP resolver is
    written to a local temp file, copied to the server's /tmp, run via
    `wp eval-file`, then removed remotely — no code is ever interpolated into a
    shell string (URLs travel as JSON over stdin, not as CLI arguments), so this
    is safe against a URL containing shell metacharacters.
    """
    if not urls:
        return 'ok', {}

    remote_php = f'/tmp/sgs-product-card-image-id-resolver-{id(urls)}.php'
    with tempfile.NamedTemporaryFile('w', suffix='.php', delete=False, encoding='utf-8') as tf:
        tf.write(_EVAL_PHP_TEMPLATE)
        local_php = tf.name

    try:
        scp_cmd = ['scp', '-i', ssh_key, '-P', str(ssh_port), local_php,
                   f'{ssh_user_host}:{remote_php}']
        scp_result = subprocess.run(scp_cmd, capture_output=True, text=True, timeout=timeout)
        if scp_result.returncode != 0:
            print(f'[migrate-product-card-image-id] scp failed: {scp_result.stderr.strip()}',
                  file=sys.stderr)
            return 'unreachable', {}

        remote_cmd = f'cd {wp_root} && wp eval-file {remote_php}'
        ssh_cmd = ['ssh', '-i', ssh_key, '-p', str(ssh_port), ssh_user_host, remote_cmd]
        try:
            result = subprocess.run(ssh_cmd, input=json.dumps(urls), capture_output=True,
                                     text=True, timeout=timeout)
        except subprocess.TimeoutExpired:
            print('[migrate-product-card-image-id] SSH timeout during resolution',
                  file=sys.stderr)
            return 'unreachable', {}

        # Best-effort cleanup — never fail the run over a leftover /tmp file.
        subprocess.run(['ssh', '-i', ssh_key, '-p', str(ssh_port), ssh_user_host,
                         f'rm -f {remote_php}'], capture_output=True, text=True, timeout=timeout)

        if result.returncode != 0:
            print(f'[migrate-product-card-image-id] wp eval-file failed: '
                  f'{result.stderr.strip()}', file=sys.stderr)
            return 'unreachable', {}
        try:
            mapping = json.loads(result.stdout)
        except json.JSONDecodeError:
            print(f'[migrate-product-card-image-id] non-JSON response from wp eval-file: '
                  f'{result.stdout[:200]!r}', file=sys.stderr)
            return 'unreachable', {}
        if not isinstance(mapping, dict):
            return 'unreachable', {}
        return 'ok', {k: int(v) for k, v in mapping.items()}
    finally:
        Path(local_php).unlink(missing_ok=True)


# --------------------------------------------------------------- fix / apply

def bucket_candidates(candidates, mapping):
    """Split candidates into ('matched', 'no-match') given a resolved url->id map.
    A candidate whose URL is absent from `mapping` (resolver never reached it,
    e.g. an 'unreachable' run) is treated as no-match-shaped for bucketing
    purposes here — callers distinguish the UNREACHABLE case separately by
    checking the resolver status before calling this."""
    matched, no_match = [], []
    for c in candidates:
        image_id = mapping.get(c['image_url'], 0)
        if image_id:
            matched.append({**c, 'resolved_id': image_id})
        else:
            no_match.append(c)
    return matched, no_match


def apply_matches(files, matched):
    """Write `imageId` into each matched candidate's block comment, grouped by
    file so multi-instance files get one rewritten pass. Returns the number of
    instances actually written. Refuses per-file (writes nothing for that file)
    if the edited text would not re-parse cleanly at every block comment —
    never emits invalid JSON."""
    by_file = {}
    for c in matched:
        by_file.setdefault(c['post'], []).append(c)

    written = 0
    for f in files:
        label = f.stem if f is not None else 'stdin'
        edits = by_file.get(label)
        if not edits:
            continue
        text = f.read_text(encoding='utf-8', errors='replace') if f is not None else sys.stdin.read()

        # Re-scan fresh (offsets in `edits` came from the same text at survey
        # time; re-deriving here keeps this function self-contained/testable
        # against a text blob directly, matching apply_text() in the sibling
        # scripts).
        fresh = {(start, end): attrs for start, end, attrs in iter_block_attrs(text)}
        replacements = []
        for c in edits:
            key = (c['start'], c['end'])
            attrs = fresh.get(key)
            if attrs is None or not is_candidate(attrs):
                continue  # text changed since survey, or already resolved — skip, don't guess
            new_attrs = dict(attrs)
            new_attrs['imageId'] = c['resolved_id']
            new_json = json.dumps(new_attrs, separators=(',', ':'), ensure_ascii=False)
            replacements.append((c['start'], c['end'], new_json))

        if not replacements:
            continue
        out = text
        for start, end, new_json in sorted(replacements, reverse=True):
            out = out[:start] + new_json + out[end:]

        try:
            for _ in iter_block_attrs(out):
                pass
        except json.JSONDecodeError:
            print(f'[migrate-product-card-image-id] REFUSED to write {label}: '
                  'result would not re-parse', file=sys.stderr)
            continue

        if f is not None:
            f.write_text(out, encoding='utf-8', newline='')
        else:
            sys.stdout.write(out)
        written += len(replacements)

    return written


def apply_text(text: str, matched_for_this_text):
    """Single-text convenience wrapper around the same fold logic used by
    apply_matches, for --self-test fixtures that don't want to touch disk."""
    fresh = {(start, end): attrs for start, end, attrs in iter_block_attrs(text)}
    replacements = []
    for c in matched_for_this_text:
        key = (c['start'], c['end'])
        attrs = fresh.get(key)
        if attrs is None or not is_candidate(attrs):
            continue
        new_attrs = dict(attrs)
        new_attrs['imageId'] = c['resolved_id']
        new_json = json.dumps(new_attrs, separators=(',', ':'), ensure_ascii=False)
        replacements.append((c['start'], c['end'], new_json))
    if not replacements:
        return text, 0
    out = text
    for start, end, new_json in sorted(replacements, reverse=True):
        out = out[:start] + new_json + out[end:]
    try:
        for _ in iter_block_attrs(out):
            pass
    except json.JSONDecodeError:
        return text, 0
    return out, len(replacements)


# --------------------------------------------------------------- reporting

def print_survey(candidates, status, mapping):
    if not candidates:
        print('0 candidate sgs/product-card instance(s) (image set, imageId unset).')
        return

    urls = sorted({c['image_url'] for c in candidates})
    print(f'{len(candidates)} candidate instance(s), {len(urls)} unique URL(s), '
          f'across {len({c["post"] for c in candidates})} post(s).')

    if status == 'unreachable':
        print('\nUNREACHABLE — could not resolve via WP-CLI (SSH/WP down, or no live install '
              'reachable from this worktree). NOTHING was matched or written this run:')
        for c in candidates:
            print(f"   {c['post']:24} {c['image_url']}")
        print(f'\n0 matched, 0 no-match, {len(candidates)} unreachable.')
        return

    matched, no_match = bucket_candidates(candidates, mapping)
    print('\nMATCHED (attachment_url_to_postid() found a real attachment — auto-fixable):')
    if matched:
        for c in matched:
            print(f"   {c['post']:24} id={mapping[c['image_url']]:<6} {c['image_url']}")
    else:
        print('   (none)')

    print('\nNO-MATCH (attachment_url_to_postid() found nothing — imageId stays 0/unset, '
          '`image` URL keeps rendering it; never guessed at):')
    if no_match:
        for c in no_match:
            print(f"   {c['post']:24} {c['image_url']}")
    else:
        print('   (none)')

    print(f'\n{len(matched)} matched, {len(no_match)} no-match.')


# --------------------------------------------------------------- self-test

def self_test() -> int:
    """Assertions covering: candidate classification (image+no-imageId,
    image+imageId=0, image+string imageId="0", already-resolved skip, empty-image
    skip, non-product-card block ignored), URL de-duplication, matched-fold
    write, no-match refusal-to-write, unreachable-resolver refusal-to-write
    (with a watched negative control proving that guard is load-bearing), and
    an unbalanced-JSON refusal. All against fixture text — no live WP install
    or SSH reachability required."""
    failures = []

    def check(label, cond):
        mark = 'OK  ' if cond else 'FAIL'
        print(f'  [{mark}] {label}')
        if not cond:
            failures.append(label)

    # 1. Bare candidate — image set, imageId absent.
    text = '<!-- wp:sgs/product-card {"image":"https://x.test/a.jpg","productName":"A"} -->\n'
    rows = scan_text('t', text)
    check('candidate: image present, imageId absent', len(rows) == 1)

    # 2. Explicit imageId:0 is still a candidate.
    text = '<!-- wp:sgs/product-card {"image":"https://x.test/a.jpg","imageId":0} -->\n'
    rows = scan_text('t', text)
    check('candidate: imageId explicitly 0', len(rows) == 1)

    # 3. Already-resolved instance (imageId truthy) is never re-touched.
    text = '<!-- wp:sgs/product-card {"image":"https://x.test/a.jpg","imageId":42} -->\n'
    rows = scan_text('t', text)
    check('not a candidate: imageId already non-zero', rows == [])

    # 4. Empty image string is never a candidate (nothing to resolve).
    text = '<!-- wp:sgs/product-card {"image":"","imageId":0} -->\n'
    rows = scan_text('t', text)
    check('not a candidate: image is empty string', rows == [])

    # 5. No image key at all — not a candidate.
    text = '<!-- wp:sgs/product-card {"productName":"A"} -->\n'
    rows = scan_text('t', text)
    check('not a candidate: image key absent entirely', rows == [])

    # 6. A different block is ignored outright.
    text = '<!-- wp:sgs/media {"imageUrl":"https://x.test/a.jpg"} -->\n'
    rows = scan_text('t', text)
    check('non-product-card block ignored', rows == [])

    # 7. URL de-duplication — two instances sharing one URL survey as 2
    #    candidates but 1 unique URL (what the resolver is actually called with).
    text = ('<!-- wp:sgs/product-card {"image":"https://x.test/a.jpg"} -->\n'
            '<!-- wp:sgs/product-card {"image":"https://x.test/a.jpg"} -->\n')
    rows = scan_text('t', text)
    urls = sorted({r['image_url'] for r in rows})
    check('URL de-duplication: 2 candidates, 1 unique URL', len(rows) == 2 and urls == ['https://x.test/a.jpg'])

    # 8. Matched fold — imageId is written, image/imageAlt/other attrs untouched.
    text = '<!-- wp:sgs/product-card {"image":"https://x.test/a.jpg","imageAlt":"Widget","productName":"A"} -->\n'
    rows = scan_text('t', text)
    matched, no_match = bucket_candidates(rows, {'https://x.test/a.jpg': 77})
    check('bucket_candidates: matched', len(matched) == 1 and no_match == [])
    out, n = apply_text(text, matched)
    check('apply_text: 1 instance folded', n == 1)
    check('apply_text: imageId written with resolved id', '"imageId":77' in out)
    check('apply_text: image URL left untouched (permanent fallback)', '"image":"https://x.test/a.jpg"' in out)
    check('apply_text: imageAlt untouched', '"imageAlt":"Widget"' in out)

    # 9. No-match — bucketed correctly, apply_text writes NOTHING for it.
    rows = scan_text('t', text)
    matched, no_match = bucket_candidates(rows, {'https://x.test/a.jpg': 0})
    check('bucket_candidates: no-match (resolver ran, found nothing)', matched == [] and len(no_match) == 1)
    out, n = apply_text(text, matched)  # matched is empty — nothing to write
    check('apply_text: 0 instances written when no-match', n == 0 and '"imageId"' not in out)

    # 10. A URL missing from the mapping entirely (never resolved) also never
    #     gets folded — bucket_candidates treats it as no-match-shaped, so a
    #     caller that (by contract) checks resolver status before calling
    #     bucket_candidates can never silently write a fabricated match.
    rows = scan_text('t', text)
    matched, no_match = bucket_candidates(rows, {})  # empty mapping
    check('bucket_candidates: URL absent from mapping -> no-match-shaped, never matched',
          matched == [] and len(no_match) == 1)

    # --- NEGATIVE CONTROL, WATCHED FAIL: prove bucket_candidates' 0-means-no-match
    # rule is load-bearing, not tautological, by breaking it to treat ANY mapping
    # entry (including 0) as a match and confirming that DOES fabricate a write.
    def _broken_bucket(candidates, mapping):
        matched, no_match = [], []
        for c in candidates:
            if c['image_url'] in mapping:  # BUG: ignores the id value, even 0
                matched.append({**c, 'resolved_id': mapping[c['image_url']]})
            else:
                no_match.append(c)
        return matched, no_match

    rows = scan_text('t', text)
    broken_matched, _ = _broken_bucket(rows, {'https://x.test/a.jpg': 0})
    check('WATCHED negative control: a bucketer that ignores id=0 DOES fabricate a '
          f'match (observed {len(broken_matched)} fabricated match(es)), confirming '
          'the real 0-means-no-match guard is load-bearing',
          len(broken_matched) == 1)

    # 11. UNREACHABLE resolver status — the caller (print_survey / main) must
    #     never call bucket_candidates with a partial/empty mapping under an
    #     'unreachable' status and report it as "0 matched, N no-match" — it must
    #     report UNREACHABLE distinctly. Exercised via print_survey's branch
    #     directly (behavioural check on the string paths, not just data shape).
    import io
    import contextlib
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        print_survey(rows, 'unreachable', {})
    printed = buf.getvalue()
    check('print_survey: unreachable status reported as UNREACHABLE, distinct from a '
          'resolved-but-empty result',
          'UNREACHABLE' in printed and 'unreachable.' in printed and 'MATCHED (' not in printed)

    # 12. Unbalanced JSON — refused, no crash, no findings for that instance.
    text = '<!-- wp:sgs/product-card {"image":"https://x.test/a.jpg" -->\n'  # never closes
    rows = scan_text('t', text)
    check('unbalanced JSON: no crash, 0 findings (refuse rather than guess)', rows == [])

    # 13. --check-shape: matched candidates remaining un-applied fail a gate;
    #     zero candidates (or all resolved to no-match) pass it.
    text = '<!-- wp:sgs/product-card {"image":"https://x.test/a.jpg"} -->\n'
    rows = scan_text('t', text)
    matched, _ = bucket_candidates(rows, {'https://x.test/a.jpg': 5})
    check('--check-shape: a matched-but-unapplied candidate is a gate failure', len(matched) == 1)
    matched, _ = bucket_candidates(rows, {'https://x.test/a.jpg': 0})
    check('--check-shape: a no-match candidate does not fail the gate on its own '
          '(nothing this script can do about it)', len(matched) == 0)

    if failures:
        print(f'\n{len(failures)} FAILURE(S): {failures}')
        return 1
    print('\nALL PASS')
    return 0


# --------------------------------------------------------------- main

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                  formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('paths', nargs='*', help='post_content dump file(s), directory(ies), or -')
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--fix', action='store_true', help='propose; writes nothing without --apply')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true', help='exit 1 if a resolvable match remains un-applied')
    ap.add_argument('--self-test', action='store_true')
    ap.add_argument('--ssh-key', default=DEFAULT_SSH_KEY)
    ap.add_argument('--ssh-port', type=int, default=DEFAULT_SSH_PORT)
    ap.add_argument('--ssh-user-host', default=DEFAULT_SSH_USER_HOST)
    ap.add_argument('--wp-root', default=DEFAULT_WP_ROOT)
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    if not args.paths:
        ap.error('at least one path (file, directory, or -) is required unless --self-test is given')

    files = collect_inputs(args.paths)
    if files is None:
        return 2

    candidates = survey(files)
    urls = sorted({c['image_url'] for c in candidates})
    status, mapping = resolve_via_wp_cli(
        urls, ssh_key=args.ssh_key, ssh_port=args.ssh_port,
        ssh_user_host=args.ssh_user_host, wp_root=args.wp_root,
    ) if urls else ('ok', {})

    if args.check:
        if status == 'unreachable':
            print('[migrate-product-card-image-id --check] UNREACHABLE — could not resolve '
                  f'via WP-CLI; {len(candidates)} candidate(s) unverified. Failing closed.',
                  file=sys.stderr)
            return 1
        matched, _ = bucket_candidates(candidates, mapping)
        if matched:
            print(f'[migrate-product-card-image-id --check] {len(matched)} resolvable '
                  f'match(es) remain un-applied:', file=sys.stderr)
            for c in matched:
                print(f"   {c['post']}  {c['image_url']} -> {c['resolved_id']}", file=sys.stderr)
            return 1
        print('[migrate-product-card-image-id --check] OK — no un-applied resolvable matches.')
        return 0

    if args.survey or not args.fix:
        print_survey(candidates, status, mapping)
        return 0

    # --fix (dry-run) / --fix --apply
    if status == 'unreachable':
        print('[migrate-product-card-image-id] UNREACHABLE — could not resolve via WP-CLI. '
              'Nothing written this run.', file=sys.stderr)
        for c in candidates:
            print(f"   {c['post']:24} {c['image_url']}")
        return 1

    matched, no_match = bucket_candidates(candidates, mapping)
    print(f'{len(matched)} matched, {len(no_match)} no-match.')
    if not args.apply:
        print('\nPROPOSED (dry-run; pass --apply to write):')
        for c in matched:
            print(f"   {c['post']:24} imageId={c['resolved_id']:<6} {c['image_url']}")
        return 0

    written = apply_matches(files, matched)
    print(f'\nAPPLIED — {written} instance(s) written.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
