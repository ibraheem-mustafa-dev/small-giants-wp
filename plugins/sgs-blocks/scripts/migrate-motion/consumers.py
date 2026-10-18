"""Consumer census for the M6.6 removal groups (Spec 38A section 13.2 step 4, unit M6.6C).

WHAT THIS DOES
    Finds every place in the repo that still names a path or an old attribute that M6.6-G0 to G5 delete,
    and assigns each hit to the group that must fix it, so no wired gate, prebuild generator, theme pattern,
    client build tree or live doc breaks after a deletion. Read-only. `migrate_motion.py --consumers` runs it.

DATA
    consumer-groups.json beside this file:
      deleted_paths     {path, group, action: delete|modify|split, kind?: dir}. Only `delete` and `split`
                        paths are searched for; a `modify` path exists to give the hits INSIDE it a group.
      assignment_rules  ordered {glob, group, reason}; the first glob that matches the file decides.
                        A `reason` starting `judgement:` is a call the unit map does not make; the report lists them.

CLASSIFICATION
    A hit's group is the deleted_paths entry for its file (exact file, else longest directory), then the first
    assignment rule, else None. Exit 1 while any hit has group None.

SEARCH
    `git grep -I -n -F -f <needles>` over tracked files, then a regex pass that applies token boundaries
    (so `fx` finds `fxMorph` but not `suffix`). Build trees under `sites/*/build` are partly untracked, so the
    untracked files in them are walked directly and merged in.
"""
import datetime
import glob
import json
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN = os.path.dirname(os.path.dirname(HERE))
REPO = os.path.dirname(os.path.dirname(PLUGIN))
DATA_FILE = os.path.join(HERE, 'consumer-groups.json')
PLUGIN_REL = 'plugins/sgs-blocks/'
ROOTS = ['plugins', 'scripts', 'theme', '.claude', 'sites/*/build/*']
EXCLUDE = ['.claude/specs/archive', '.claude/reports', '.claude/archive', '.claude/plans/archive',
           'plugins/sgs-blocks/scripts/migrate-motion', 'plugins/sgs-blocks/build']
EXCLUDE_GLOBS = ['**/node_modules/**', '**/vendor/**', '**/.phpunit.cache/**']
GROUPS = ('G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'M6.7-docs', 'keep')
WALK_EXT = {'.php', '.js', '.mjs', '.json', '.css', '.scss', '.html', '.md', '.py', '.txt', '.svg'}
BOUND_L, BOUND_R = r'(?<![A-Za-z0-9_-])', r'(?![A-Za-z0-9_-])'
MAX_TEXT = 200
CHUNK = 24
WALK_MAX = 1000000
WALK_SKIP_DIRS = {'node_modules', 'vendor', 'cache', '.cache'}


def glob_re(glob):
    """A repo-relative glob as a regex: `**/` any depth, `*` within a segment, `?` one character, `{a,b}` alternatives."""
    out, i = '', 0
    while i < len(glob):
        if glob.startswith('**/', i):
            out, i = out + '(?:.*/)?', i + 3
        elif glob.startswith('**', i):
            out, i = out + '.*', i + 2
        elif glob[i] == '*':
            out, i = out + '[^/]*', i + 1
        elif glob[i] == '?':
            out, i = out + '[^/]', i + 1
        elif glob[i] == '{' and '}' in glob[i:]:
            end = glob.index('}', i)
            out, i = out + '(?:' + '|'.join(re.escape(a) for a in glob[i + 1:end].split(',')) + ')', end + 1
        else:
            out, i = out + re.escape(glob[i]), i + 1
    return re.compile('^' + out + '$')


def load_data(path=DATA_FILE):
    with open(path, encoding='utf-8') as fh:
        data = json.load(fh)
    for row in data['deleted_paths']:
        assert row['group'] in GROUPS and row['action'] in ('delete', 'modify', 'split'), row
    for row in data['assignment_rules']:
        assert row['group'] in GROUPS + ('@subject',) and row.get('reason'), row
    return data


def git(args, repo=REPO):
    out = subprocess.run(['git', '-c', 'core.quotepath=off'] + args, cwd=repo, capture_output=True, text=True,
                         encoding='utf-8', errors='replace')
    if out.returncode not in (0, 1):
        sys.exit('git %s failed: %s' % (' '.join(args[:3]), out.stderr.strip()[:300]))
    return out.stdout


def basename_counts(repo=REPO):
    counts = {}
    for line in git(['ls-files'], repo).splitlines():
        base = line.rsplit('/', 1)[-1]
        counts[base] = counts.get(base, 0) + 1
    return counts


def make_needle(text, subject, kind, family=None, token=True, literal=None):
    """A needle: `literal` is what git grep searches for, `rx` the boundary-checked match."""
    return {'literal': literal or text, 'rx': re.compile((BOUND_L if token else '') + re.escape(text) + (BOUND_R if token else '')),
            'text': text, 'subject': subject, 'kind': kind, 'family': family}


def path_needles(row, counts):
    """Needles for one deleted path: the repo path, the path inside the plugin or `src/`, the basename when it is unique
    in the repo, and for a script or component the extensionless forms an import statement uses."""
    path, found = row['path'], []
    inner = path[len(PLUGIN_REL):] if path.startswith(PLUGIN_REL) else path
    forms = {path, inner}
    if inner.startswith('src/'):
        forms.add(inner[4:])
    if row.get('kind') != 'dir':
        base = path.rsplit('/', 1)[-1]
        if counts.get(base, 0) <= 1:
            forms.add(base)
        stem = base.rsplit('.', 1)[0]
        if base.endswith(('.js', '.mjs')) and (inner[4:] if inner.startswith('src/') else inner) != base:
            forms.add((inner[4:] if inner.startswith('src/') else inner).rsplit('.', 1)[0])
            if stem[:1].isupper() and len(stem) >= 8 and counts.get(base, 0) <= 1:
                forms.add(stem)
    for form in sorted(forms, key=len, reverse=True):
        found.append(make_needle(form, path, 'path'))
    return found


def attribute_needles():
    """One needle per CATALOGUE attribute name; a prefix-family regex searches its literal prefix then verifies the shape."""
    sys.path.insert(0, HERE)
    import migrate_motion
    found, seen = [], set()
    for names, family, blocks in migrate_motion.CATALOGUE:
        if hasattr(names, 'match'):
            body = names.pattern.lstrip('^')
            literals = body.strip('()').split('|') if body.startswith('(') else [re.match(r'[A-Za-z0-9_]+', body).group(0)]
            for literal in literals:
                found.append({'literal': literal, 'rx': re.compile(BOUND_L + body), 'text': names.pattern, 'subject': names.pattern,
                              'kind': 'attribute', 'family': family, 'blocks': blocks})
            continue
        for name in names:
            if migrate_motion.kept_everywhere(name):
                continue
            if (name, family, blocks) not in seen:
                seen.add((name, family, blocks))
                needle = make_needle(name, name, 'attribute', family)
                needle['blocks'] = blocks
                found.append(needle)
    return found


def build_needles(data, counts):
    needles = []
    counts = dict(counts)
    for row in data['deleted_paths']:
        if row['action'] in ('delete', 'split') and row.get('kind') != 'dir' and not os.path.exists(os.path.join(REPO, row['path'])):
            base = row['path'].rsplit('/', 1)[-1]
            counts[base] = counts.get(base, 0) + 1  # a deleted file's name is shared with any live file of that name
    for row in data['deleted_paths']:
        if row['action'] in ('delete', 'split'):
            needles.extend(path_needles(row, counts))
    return needles + attribute_needles()


def grep(needles, repo=REPO, no_index=False, roots=None):
    """Raw (file, line, text) rows from `git grep -F -f` over every needle literal. git grep slows sharply as the pattern
    list grows (one call with every literal took ten minutes), so the literals go in chunks of CHUNK, de-duplicated."""
    literals = sorted({n['literal'] for n in needles})
    spec = ['--'] + (roots or ROOTS) + [':(exclude)' + e for e in EXCLUDE] + [':(exclude,glob)' + g for g in EXCLUDE_GLOBS]
    rows, seen = [], set()
    for start in range(0, len(literals), CHUNK):
        with tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False, encoding='utf-8', newline='\n') as fh:
            fh.write('\n'.join(literals[start:start + CHUNK]) + '\n')
        try:
            out = git(['grep', '-I', '-n', '-F', '-f', fh.name] + (['--no-index'] if no_index else []) + spec, repo)
        finally:
            os.unlink(fh.name)
        for line in out.splitlines():
            name, num, text = line.split(':', 2) if line.count(':') >= 2 else (line, '0', '')
            if (name, num) not in seen:
                seen.add((name, num))
                rows.append((name, int(num) if num.isdigit() else 0, text))
    return rows


def walk_untracked(needles, repo=REPO):
    """Rows from build-tree files git does not track (only lines that carry a needle literal), plus a count of what was
    read and what was skipped. Caches, files over WALK_MAX bytes and non-text extensions are skipped and counted."""
    literals = sorted({n['literal'] for n in needles})
    tracked = set(git(['ls-files', '--', 'sites'], repo).splitlines())
    rows, stats = [], {'read': 0, 'skipped_oversize': 0, 'skipped_extension': 0, 'skipped_cache_dir': 0}
    for build in sorted(glob.glob(os.path.join(repo, 'sites', '*', 'build'))):
        for base, dirs, names in os.walk(build):
            stats['skipped_cache_dir'] += len([d for d in dirs if d in WALK_SKIP_DIRS])
            dirs[:] = [d for d in dirs if d not in WALK_SKIP_DIRS]
            for name in names:
                full = os.path.join(base, name)
                rel = os.path.relpath(full, repo).replace(os.sep, '/')
                if rel in tracked:
                    continue
                if os.path.splitext(name)[1].lower() not in WALK_EXT:
                    stats['skipped_extension'] += 1
                elif os.path.getsize(full) > WALK_MAX:
                    stats['skipped_oversize'] += 1
                else:
                    try:
                        with open(full, encoding='utf-8') as fh:
                            text = fh.read()
                    except (UnicodeDecodeError, OSError):
                        stats['skipped_extension'] += 1
                        continue
                    stats['read'] += 1
                    if any(l in text for l in literals):
                        rows.extend((rel, num, line) for num, line in enumerate(text.splitlines(), 1) if any(l in line for l in literals))
    return rows, stats


def attribute_kept(block, attr):
    """True when migrate_motion.KEPT leaves this attribute on this block (the mapper reports it and it stays)."""
    sys.path.insert(0, HERE)
    import migrate_motion
    return bool(migrate_motion.kept_reason(block, attr))


def block_slug(path):
    m = re.match(r'^plugins/sgs-blocks/src/blocks/([^/]+)/', path)
    return m.group(1) if m else None


def file_owner(path, data):
    """The deleted_paths entry that covers a file (the file itself, else the longest directory), or None."""
    best = None
    for row in data['deleted_paths']:
        p = row['path']
        if path == p or (row.get('kind') == 'dir' and path.startswith(p.rstrip('/') + '/')):
            if best is None or len(p) > len(best['path']):
                best = row
    return best


def rule_match(rule, rx, hit):
    """A rule applies when its glob matches the file and every optional field it carries (kind, subject, family) matches the hit."""
    if not rx.match(hit['file']) or ('kind' in rule and rule['kind'] != hit['kind']):
        return False
    subj = rule.get('subject')
    if subj is not None and hit['subject'] not in ([subj] if isinstance(subj, str) else subj):
        return False
    fam = rule.get('family')
    return fam is None or hit['family'] in ([fam] if isinstance(fam, str) else fam)


def assign(hit, data, rules, owners):
    """(group, why) for one hit: its file's deleted_paths entry first, then the first matching rule, else (None, None).
    A rule group of `@subject` means the group that deletes the path the hit names."""
    if hit['file'] not in owners:
        owners[hit['file']] = file_owner(hit['file'], data)
    row = owners[hit['file']]
    if row:
        return row['group'], 'deleted_paths: %s (%s)' % (row['path'], row['action'])
    for rule, rx in rules:
        if rule_match(rule, rx, hit):
            return (hit['subject_group'] if rule['group'] == '@subject' else rule['group']), rule['reason']
    return None, None


def classify(rows, needles, data):
    """Raw rows to the census structure; pure, so the self-test can inject rows."""
    rules = [(r, glob_re(r['glob'])) for r in data['assignment_rules']]
    own = {r['path']: r for r in data['deleted_paths'] if r['action'] in ('delete', 'split')}
    hits, self_refs, seen, owners, dropped = [], {}, set(), {}, {'scope': 0, 'unquoted': 0}
    by_literal = {}
    for needle in needles:
        by_literal.setdefault(needle['literal'], []).append(needle)
    literals = sorted(by_literal)

    def add_hit(name, num, text, needle):
        key = (name, num, needle['subject'])
        if key in seen:
            return
        seen.add(key)
        if needle['kind'] == 'path' and (name == needle['subject'] or
                                          (own[needle['subject']].get('kind') == 'dir' and name.startswith(needle['subject'] + '/'))):
            self_refs[name] = self_refs.get(name, 0) + 1
            return
        scoped = needle['kind'] == 'attribute' and needle.get('blocks')
        slug = block_slug(name)
        if needle['kind'] == 'attribute' and slug and attribute_kept('sgs/' + slug, needle['subject']):
            dropped['kept'] = dropped.get('kept', 0) + 1
            return
        if scoped and slug and 'sgs/' + slug not in needle['blocks']:
            dropped['scope'] += 1
            return
        if scoped and not (slug and 'sgs/' + slug in needle['blocks']) and not re.search('["\'`]' + re.escape(needle['text']) + '["\'`]', text):
            dropped['unquoted'] += 1
            return
        hit = {'file': name, 'line': num, 'needle': needle['text'], 'subject': needle['subject'], 'kind': needle['kind'],
               'family': needle['family'], 'text': text.strip()[:MAX_TEXT],
               'subject_group': own[needle['subject']]['group'] if needle['kind'] == 'path' else None}
        hit['group'], hit['why'] = assign(hit, data, rules, owners)
        hits.append(hit)

    for name, num, text in rows:
        for literal in sorted((l for l in literals if l in text), key=len, reverse=True):
            for needle in by_literal[literal]:
                if needle['rx'].search(text):
                    add_hit(name, num, text, needle)
    hits.sort(key=lambda h: (h['file'], h['line'], h['needle']))
    return {'hits': hits, 'self_references': self_refs, 'out_of_scope_attribute_hits': dropped['scope'],
            'unquoted_scoped_attribute_hits': dropped['unquoted']}


def exit_code(result):
    return 1 if any(h['group'] is None for h in result['hits']) else 0


def summarise(result):
    table = {}
    for h in result['hits']:
        row = table.setdefault(h['group'] or 'UNASSIGNED', {'hits': 0, 'files': set()})
        row['hits'] += 1
        row['files'].add(h['file'])
    return {g: {'hits': r['hits'], 'files': len(r['files'])} for g, r in sorted(table.items())}


def missing_paths(data):
    return [r['path'] for r in data['deleted_paths'] if not os.path.exists(os.path.join(REPO, r['path']))]


def census(repo=REPO, data=None):
    data = data or load_data()
    needles = build_needles(data, basename_counts(repo))
    tracked_rows = grep(needles, repo)
    walked, walk_stats = walk_untracked(needles, repo)
    result = classify(tracked_rows + walked, needles, data)
    result.update({'date': datetime.date.today().isoformat(), 'needles': len(needles), 'summary': None,
                   'missing_paths': missing_paths(data), 'untracked_build_walk': walk_stats,
                   'tracked_build_files': len([f for f in git(['ls-files', '--', 'sites'], repo).splitlines() if '/build/' in f])})
    result['summary'] = summarise(result)
    from consumers_report import evidence
    result['evidence'] = evidence(result, data)
    return result


def print_result(result, as_json):
    if as_json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return
    print('Consumer census: %d needle(s), %d hit(s), %d self-reference(s), %d out-of-scope attribute hit(s) dropped'
          % (result['needles'], len(result['hits']), sum(result['self_references'].values()), result['out_of_scope_attribute_hits']))
    print('  sites/*/build: %d tracked file(s) searched with git grep, %d untracked text file(s) walked (skipped: %s)'
          % (result['tracked_build_files'], result['untracked_build_walk']['read'], result['untracked_build_walk']))
    for group, row in result['summary'].items():
        print('  %-10s %5d hit(s) in %4d file(s)' % (group, row['hits'], row['files']))
    for path in result['missing_paths']:
        print('  note: deleted_paths entry not on disk (already gone or mistyped): %s' % path)
    bad = [h for h in result['hits'] if h['group'] is None]
    for h in bad[:200]:
        print('  UNASSIGNED %s:%d  %s [%s]  %s' % (h['file'], h['line'], h['needle'], h['kind'], h['text'][:100]))
    print('consumers FAILED: %d hit(s) have no group.' % len(bad) if bad else 'consumers ok: every hit is assigned to a group.')


def run(as_json=False, write_report=None, command=''):
    result = census()
    print_result(result, as_json)
    if write_report:
        from consumers_report import write
        write(result, write_report, command, load_data())
        print('report written: %s' % write_report)
    return exit_code(result)


def self_test():
    """Fixtures: all-assigned exits 0, a planted unassigned consumer exits 1 for the right hit, deleted_paths beats rules,
    kind / family / @subject rules work, prose is not an attribute hit, and a real git grep run honours the exclusions."""
    failures = []

    def expect(cond, label):
        print('%s  %s' % ('PASS' if cond else 'FAIL', label))
        if not cond:
            failures.append(label)

    P = PLUGIN_REL
    data = {'deleted_paths': [
        {'path': P + 'src/blocks/extensions/fx.js', 'group': 'G0', 'action': 'delete'},
        {'path': P + 'src/blocks/nav-drawer/MotionPanel.js', 'group': 'G5', 'action': 'delete'},
        {'path': P + 'src/blocks/hero', 'group': 'G1', 'action': 'modify', 'kind': 'dir'}],
        'assignment_rules': [{'glob': 'plugins/sgs-blocks/includes/motion/migrate/**', 'group': 'keep', 'reason': 'judgement: reader'},
                             {'glob': '.claude/specs/*.md', 'group': 'M6.7-docs', 'reason': 'plan R11: doc sweep'},
                             {'glob': '**', 'kind': 'path', 'group': '@subject', 'reason': 'unit map: the deleting group'},
                             {'glob': '**', 'kind': 'attribute', 'family': 'marquee', 'group': 'G3', 'reason': 'judgement: marquee'},
                             {'glob': 'plugins/sgs-blocks/scripts/**', 'kind': 'attribute', 'group': 'G0', 'reason': 'judgement: tooling'}]}
    needles = build_needles(data, {})
    rows = [('plugins/sgs-blocks/scripts/check-x.py', 3, "from 'blocks/extensions/fx' import x"),
            ('.claude/specs/38.md', 9, 'sgsAnimationDelay is retired'),
            (P + 'src/blocks/hero/render.php', 4, "$a['sgsParallax']"),
            (P + 'src/blocks/extensions/fx.js', 1, '// src/blocks/extensions/fx.js'),
            (P + 'src/blocks/card-grid/render.php', 5, "$a['burgerMorphDuration']"),
            (P + 'src/blocks/hero/view.js', 6, "import './MotionPanel.js'"),
            (P + 'includes/helpers.php', 7, "$a['autoScroll']"),
            (P + 'includes/prose.php', 8, '// the page is scrolling now, and a suffix is not a prefix'),
            (P + 'includes/motion/migrate/map.php', 9, "$a['sgsParallax']"),
            (P + 'scripts/gate.py', 10, "ATTRS = ['fxMorph']")]
    res = classify(rows, needles, data)
    got = {(h['file'].rsplit('/', 1)[-1], h['needle']): h for h in res['hits']}
    expect(exit_code(res) == 0 and all(h['group'] for h in res['hits']), 'every hit assigned: exit 0')
    expect(got[('check-x.py', 'blocks/extensions/fx')]['group'] == 'G0' and got[('38.md', 'sgsAnimationDelay')]['group'] == 'M6.7-docs',
           'an @subject rule gives a path hit the group that deletes the path, a glob rule gives a doc its group')
    expect(got[('render.php', 'sgsParallax')]['group'] == 'G1' and got[('view.js', 'MotionPanel.js')]['group'] == 'G1'
           and got[('view.js', 'MotionPanel.js')]['subject_group'] == 'G5',
           'a hit inside a deleted_paths directory takes that entry group, not a rule, and records the group of the path it names')
    expect(res['self_references'] == {P + 'src/blocks/extensions/fx.js': 1}, 'a file naming itself is counted as a self-reference')
    expect(res['out_of_scope_attribute_hits'] == 1 and ('render.php', 'burgerMorphDuration') not in got,
           'a block-scoped attribute inside another block folder is counted as out of scope')
    expect(got[('helpers.php', 'autoScroll')]['group'] == 'G3' and got[('map.php', 'sgsParallax')]['group'] == 'keep'
           and got[('gate.py', '^fx[A-Z0-9]')]['group'] == 'G0',
           'a family rule, a keep rule and a kind-plus-glob rule each decide their own hits')
    expect(not any(h['file'].endswith('prose.php') for h in res['hits']), 'the word scrolling and the end of suffix are not hits')
    planted = classify(rows + [('plugins/orphan/consumer.php', 2, "$x['sgsHoverLift']")], needles, data)
    bad = [h for h in planted['hits'] if h['group'] is None]
    print('      planted result: %d unassigned -> %s' % (len(bad), ['%s:%d %s' % (h['file'], h['line'], h['needle']) for h in bad]))
    expect(exit_code(planted) == 1 and [(h['file'], h['needle']) for h in bad] == [('plugins/orphan/consumer.php', 'sgsHoverLift')],
           'PLANTED FAULT: one attribute consumer in a file no rule matches turns the census red, and only that hit is unassigned')
    with tempfile.TemporaryDirectory() as tmp:
        for rel, body in (('plugins/a/use.js', "import x from '../components/MotionEasingControl';\n"),
                          ('plugins/a/clean.js', 'const suffix = 1;\n'),
                          ('.claude/reports/old.md', 'MotionEasingControl\n'),
                          ('plugins/a/node_modules/m.js', 'MotionEasingControl\n')):
            os.makedirs(os.path.dirname(os.path.join(tmp, rel)), exist_ok=True)
            with open(os.path.join(tmp, rel), 'w', encoding='utf-8') as fh:
                fh.write(body)
        small = {'deleted_paths': [{'path': P + 'src/components/MotionEasingControl.js', 'group': 'G0', 'action': 'delete'}],
                 'assignment_rules': [{'glob': 'plugins/a/**', 'group': 'G0', 'reason': 'fixture'}]}
        n2 = build_needles(small, {'MotionEasingControl.js': 1})
        real = classify(grep(n2, tmp, no_index=True), n2, small)
        expect(sorted({h['file'] for h in real['hits']}) == ['plugins/a/use.js'] and exit_code(real) == 0,
               'git grep finds the extensionless import and skips the reports folder, node_modules and a clean file')
        orphan = classify(grep(n2, tmp, no_index=True), n2, {'deleted_paths': small['deleted_paths'], 'assignment_rules': []})
        expect(exit_code(orphan) == 1 and [h['file'] for h in orphan['hits']] == ['plugins/a/use.js'],
               'the same tree with no rule for plugins/a exits 1 on exactly that file')
    print('\n%s' % ('consumers self-test FAILED: %d' % len(failures) if failures else 'consumers self-test passed'))
    return 1 if failures else 0
