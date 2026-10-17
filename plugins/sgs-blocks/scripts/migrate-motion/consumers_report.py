#!/usr/bin/env python3
"""The M6.6C census report: the unit-map evidence counts and the markdown writer. Split from consumers.py to keep each file to one job."""
import re

from consumers import GROUPS, block_slug, file_owner


def evidence(result, data):
    """Counts for the four classes the unit map's risk grep named, to print beside its numbers."""
    g0 = {r['path'] for r in data['deleted_paths'] if r['group'] == 'G0' and r['action'] in ('delete', 'split')}
    hits = result['hits']
    return {
        'scripts_naming_g0_files': len({h['file'] for h in hits if h['kind'] == 'path' and h['subject'] in g0
                                        and re.match(r'^(plugins/sgs-blocks/)?scripts/.*\.(py|js|mjs)$', h['file'])}),
        'theme_patterns_with_fx_attributes': len({h['file'] for h in hits if h['file'].startswith('theme/') and '/patterns/' in h['file']
                                                  and h['kind'] == 'attribute' and h['family'] == 'fx'}),
        'site_build_trees_with_hits': len({'/'.join(h['file'].split('/')[:3]) for h in hits if re.match(r'^sites/[^/]+/build/', h['file'])}),
        'live_specs_with_hits': len({h['file'] for h in hits if re.match(r'^\.claude/specs/[^/]+\.md$', h['file'])}),
        'dev_setup_has_hits': any(h['file'] == '.claude/dev-setup.md' for h in hits),
        'unlisted_block_dirs': sorted({block_slug(h['file']) for h in hits if block_slug(h['file']) not in (None, 'extensions') and file_owner(h['file'], data) is None}),
        'cross_group': sorted({'%s file names a %s path' % (h['group'], h['subject_group']) for h in hits if h['subject_group']
                               and h['group'] != h['subject_group'] and h['group'] in GROUPS[:6]})}


def write(result, path, command, data):
    """The markdown report: summary, per-group files, self-references, judgement assignments and the build-tree finding."""
    by_group, per_file = {}, {}
    for h in result['hits']:
        per_file.setdefault((h['group'] or 'UNASSIGNED', h['file']), []).append(h)
    for (group, name), rows in per_file.items():
        by_group.setdefault(group, []).append((name, rows))
    ev, walk = result['evidence'], result['untracked_build_walk']
    out = ['# Motion removal consumer census', '',
           'Generated %s by `%s`. Read-only census for Spec 38A unit M6.6C: every file that still names a path or an old attribute that M6.6-G0 to G5 delete, assigned to the group that fixes it.' % (result['date'], command), '',
           'Needles: %d (paths from `consumer-groups.json` plus the old attribute names in `migrate_motion.py::CATALOGUE`). A hit is one needle on one line of one file. Excluded: `.claude/specs/archive/`, `.claude/reports/`, `.claude/archive/`, `.claude/plans/archive/`, the detector folder, `plugins/sgs-blocks/build/`, `node_modules`, `vendor`, `.phpunit.cache`.' % result['needles'], '',
           'Groups G0 to G5 are the M6.6 removal groups. `M6.7-docs` is the M6.7 doc sweep (plan R11). `keep` is a hit no removal group edits on purpose: the sweep tool and its tests read the old names to translate stored content, and dated backups, scratch output, memory snapshots, verification records and plugin reports are history.', '',
           '## Summary', '', '| Group | Hits | Files |', '|---|---|---|']
    out += ['| %s | %d | %d |' % (g, r['hits'], r['files']) for g, r in result['summary'].items()]
    out += ['', 'Hits dropped on purpose and counted: %d self-references (a file naming its own path), %d attribute hits inside a block outside that attribute\'s catalogued scope, and %d scoped-attribute hits outside any block folder that are not a quoted name (prose, not a key).' % (
                sum(result['self_references'].values()), result['out_of_scope_attribute_hits'], result['unquoted_scoped_attribute_hits']), '',
            '## Unit map evidence against this census', '',
            '- Scripts naming G0 files: the unit map found 22, this census finds %d. The unit map counted the wired gates and generators; this census also matches the extensionless and `src/`-relative forms and counts the inspector-scan fixtures, surveys, seeders and motion probes that name the same files.' % ev['scripts_naming_g0_files'],
            '- Theme patterns carrying `fx*` attributes: the unit map found 5, this census finds %d. Same set.' % ev['theme_patterns_with_fx_attributes'],
            '- `sites/*/build` trees: the unit map found 12, this census finds %d tree(s) with a hit. Only four `sites/*/build` folders exist, so twelve cannot be reproduced from `build`; the unit map may have counted `sites/*` project folders.' % ev['site_build_trees_with_hits'],
            '- Live specs citing deleted code: the unit map found 5 plus `dev-setup.md`, this census finds %d spec(s) and `dev-setup.md` %s. Plan R11 names six specs (02, 35A, 36, 37, 38, 48); the rest only mention an old attribute name or path in prose or a table.' % (ev['live_specs_with_hits'], 'with hits' if ev['dev_setup_has_hits'] else 'without hits'), '',
            '## Gaps in the group lists', '',
            'Block folders with old-attribute hits that no group names in its FILES list (their hits were given a group by family, see the judgement section): %s.' % (', '.join('`%s`' % b for b in ev['unlisted_block_dirs']) or 'none'), '',
            'Cross-group dependencies (a file one group edits that names a path another group deletes, so the deleting group must wait for the editing group): %s.' % ('; '.join(ev['cross_group']) or 'none'), '',
            '## sites/*/build: tracked or untracked', '',
            'The build trees are partly tracked: %d file(s) are tracked and were searched with `git grep`. The rest are untracked, so %d text file(s) were read directly (skipped and counted: %d over 1 MB, %d with a non-text extension, %d cache folders).' % (
                result['tracked_build_files'], walk['read'], walk['skipped_oversize'], walk['skipped_extension'], walk['skipped_cache_dir']), '']
    if result['missing_paths']:
        out += ['## Paths named by the unit map that are not on disk', ''] + ['- `%s`' % p for p in result['missing_paths']] + ['']
    for group in sorted(by_group):
        files = sorted(by_group[group])
        out += ['## %s: %d hit(s) in %d file(s)' % (group, result['summary'][group]['hits'], len(files)), '']
        for name, rows in files:
            needles = sorted({r['needle'] for r in rows})
            where = ' at line%s %s' % ('s' if len(rows) > 1 else '', ', '.join(str(r['line']) for r in rows)) if len(rows) <= 5 else ''
            out.append('- `%s`: %d hit(s)%s, needles: %s' % (name, len(rows), where, ', '.join('`%s`' % n for n in needles[:12]) + (' and %d more' % (len(needles) - 12) if len(needles) > 12 else '')))
        out.append('')
    out += ['## Self-references', '', '%d hit(s) in %d file(s) were files naming themselves by their own path and were not counted as consumers.' % (sum(result['self_references'].values()), len(result['self_references'])), '']
    out += ['## Judgement assignments', '', 'These rules assign a class of hit on a reading the unit map does not state: the group whose deletion makes the hit dead, or `keep` / `M6.7-docs` where no removal group edits it. Each is open to correction in `consumer-groups.json`.', '']
    used = {}
    for h in result['hits']:
        used[h['why']] = used.get(h['why'], 0) + 1
    for rule in data['assignment_rules']:
        if rule['reason'].startswith('judgement:'):
            scope = ' '.join(filter(None, [rule['glob'], rule.get('kind'), str(rule['family']) if 'family' in rule else None]))
            out.append('- `%s` goes to %s (%d hit(s)): %s' % (scope, rule['group'], used.get(rule['reason'], 0), rule['reason'][len('judgement:'):].strip()))
    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('\n'.join(out) + '\n')
