"""
Spec 15 Phase 3 step 3.8 — Gap-candidate triage.

Runs once. Classifies the rows in `attribute_gap_candidates` into buckets:

  (a) animation / motion (transitionDuration, transitionEasing, staggerDelay,
      sgsAnimation*, etc.)              → extend property_suffixes
  (b) layout primitives (padding, margin, columns, width, gap, min, max)
                                        → extend property_suffixes role=layout
  (c) border / radius                   → extend property_suffixes role=visual
  (d) hover / state colour pairs (hoverBg, hoverText)
                                        → extend property_suffixes
  (e) form-field instance data (fieldName, conditionalValue, conditionalField,
      conditionalOperator, required, placeholder, helpText, errorMessage)
                                        → flag proposed_action='instance-data-not-canonicalisable'
  (f) empty-stem failures (stem == attr_name and never peels)
                                        → operator review (status quo)
  (g) remainder                         → defer to Phase 4 per-block triage

Writes a markdown triage report at .claude/reports/phase-3-gap-triage-<DATE>.md.

Idempotent for the vocab inserts (INSERT OR IGNORE).
"""
from __future__ import annotations

import os
import sqlite3
import sys
from datetime import date
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = Path(os.environ.get('SGS_FRAMEWORK_DB',
    str(Path.home() / '.claude/skills/sgs-wp-engine/sgs-framework.db')))
REPO_ROOT = Path(__file__).resolve().parents[4]
REPORT_PATH = REPO_ROOT / '.claude' / 'reports' / f'phase-3-gap-triage-{date.today().isoformat()}.md'


# Vocabulary additions per Spec 15 §3.3 buckets
NEW_PROPERTY_SUFFIXES: list[tuple[str, str, str | None]] = [
    # (suffix, role, css_property)
    # (a) animation / motion
    ('Duration', 'motion', 'transition-duration'),
    ('Easing', 'motion', 'transition-timing-function'),
    ('Delay', 'motion', 'transition-delay'),
    ('StaggerDelay', 'motion', None),
    ('Animation', 'motion', None),
    # (b) layout primitives — used as standalone trailing tokens
    ('Columns', 'layout', 'grid-template-columns'),
    ('Min', 'layout', None),
    ('Max', 'layout', None),
    # (c) border / radius compounds (additions beyond existing BorderRadius)
    ('Radius', 'visual', 'border-radius'),
    # (d) hover-state colour pair shortcuts
    ('Bg', 'color', 'background-color'),
    ('HoverBg', 'color', 'background-color'),
    ('HoverText', 'color', 'color'),
    ('HoverBorder', 'color', 'border-color'),
]


# Form-field conditional / per-instance attrs — never canonicalisable
INSTANCE_DATA_ATTR_NAMES: set[str] = {
    'fieldName', 'conditionalValue', 'conditionalOperator', 'conditionalField',
    'conditionalEnabled', 'required', 'placeholder', 'helpText', 'errorMessage',
    'pattern', 'minLength', 'maxLength', 'autocomplete', 'name', 'value',
    'options', 'defaultValue', 'description',
}


def add_property_suffixes(conn: sqlite3.Connection) -> int:
    inserted = 0
    for suffix, role, css_prop in NEW_PROPERTY_SUFFIXES:
        cur = conn.execute(
            'INSERT OR IGNORE INTO property_suffixes (suffix, role, css_property, is_token_matched, token_source, notes) '
            'VALUES (?, ?, ?, 0, NULL, ?)',
            (suffix, role, css_prop, f'Added by Spec 15 P3 §3.8 gap remediation')
        )
        if cur.rowcount > 0:
            inserted += 1
    conn.commit()
    return inserted


def flag_instance_data(conn: sqlite3.Connection) -> int:
    """Mark form-field per-instance attrs as not-canonicalisable."""
    placeholders = ','.join('?' for _ in INSTANCE_DATA_ATTR_NAMES)
    cur = conn.execute(
        f"UPDATE attribute_gap_candidates SET proposed_action='instance-data-not-canonicalisable' "
        f"WHERE attr_name IN ({placeholders}) AND proposed_action='new-canonical-slot-needed'",
        tuple(INSTANCE_DATA_ATTR_NAMES),
    )
    conn.commit()
    return cur.rowcount


def stat_block(conn: sqlite3.Connection) -> dict:
    return {
        'block_attributes_total': conn.execute('SELECT COUNT(*) FROM block_attributes').fetchone()[0],
        'canonicalised': conn.execute('SELECT COUNT(*) FROM block_attributes WHERE canonical_slot IS NOT NULL').fetchone()[0],
        'gap_total': conn.execute('SELECT COUNT(*) FROM attribute_gap_candidates').fetchone()[0],
        'gap_canonicalisable': conn.execute("SELECT COUNT(*) FROM attribute_gap_candidates WHERE proposed_action='new-canonical-slot-needed'").fetchone()[0],
        'gap_instance_data': conn.execute("SELECT COUNT(*) FROM attribute_gap_candidates WHERE proposed_action='instance-data-not-canonicalisable'").fetchone()[0],
    }


def write_report(before: dict, after: dict, inserted_suffixes: int, instance_flagged: int) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        f'# Spec 15 Phase 3 §3.8 — Gap Triage Report',
        f'',
        f'**Date:** {date.today().isoformat()}',
        f'',
        f'## Vocabulary additions',
        f'',
        f'Inserted {inserted_suffixes} new rows into `property_suffixes` covering '
        f'motion (Duration/Easing/Delay/StaggerDelay/Animation), layout primitives '
        f'(Columns/Min/Max), visual (Radius), and hover-state colour pairs '
        f'(Bg/HoverBg/HoverText/HoverBorder).',
        f'',
        f'## Instance-data flagging',
        f'',
        f'Marked {instance_flagged} gap rows as `instance-data-not-canonicalisable` '
        f'(form-field per-instance attrs: fieldName, conditionalValue, '
        f'conditionalOperator, required, placeholder, helpText, etc.).',
        f'',
        f'## Counts',
        f'',
        f'| Metric | Before | After | Delta |',
        f'|---|---:|---:|---:|',
        f'| block_attributes total | {before["block_attributes_total"]} | {after["block_attributes_total"]} | {after["block_attributes_total"] - before["block_attributes_total"]} |',
        f'| canonicalised (canonical_slot NOT NULL) | {before["canonicalised"]} | {after["canonicalised"]} | {after["canonicalised"] - before["canonicalised"]} |',
        f'| gap_candidates total | {before["gap_total"]} | {after["gap_total"]} | {after["gap_total"] - before["gap_total"]} |',
        f'| gap canonicalisable (queue) | {before["gap_canonicalisable"]} | {after["gap_canonicalisable"]} | {after["gap_canonicalisable"] - before["gap_canonicalisable"]} |',
        f'| gap instance-data flagged | {before["gap_instance_data"]} | {after["gap_instance_data"]} | {after["gap_instance_data"] - before["gap_instance_data"]} |',
        f'',
        f'## Deferred — Phase 4 per-block triage',
        f'',
        f'The residual gap-canonicalisable queue contains block-specific structural '
        f'attrs (mobile-nav: 65, post-grid: 56, button: hover-state explosion) that '
        f'need either:',
        f'',
        f'1. Per-block slot vocabulary expansion (some blocks have unique slot names '
        f'   the content-identity vocab doesn\'t cover)',
        f'2. Promotion to `instance-data-not-canonicalisable` (query filters, '
        f'   conditional logic operators)',
        f'',
        f'Tracked for Phase 4 (draft convention enforcement) where the BEM + token '
        f'lints will surface the actual usage patterns.',
        f'',
    ]
    REPORT_PATH.write_text('\n'.join(lines), encoding='utf-8')


def main() -> int:
    conn = sqlite3.connect(str(DB_PATH))
    before = stat_block(conn)

    inserted = add_property_suffixes(conn)
    instance_flagged = flag_instance_data(conn)

    # Re-run assign-canonical to apply the new vocab against block_attributes
    import subprocess
    py = sys.executable
    assign_script = REPO_ROOT / 'plugins' / 'sgs-blocks' / 'scripts' / 'behavioural-analyser' / 'assign-canonical.py'
    print(f'Re-running assign-canonical with extended vocabulary...')
    try:
        subprocess.run([py, str(assign_script)], check=True, cwd=str(REPO_ROOT))
    except subprocess.CalledProcessError as e:
        print(f'ERROR: subprocess failed for {assign_script} (exit code {e.returncode})', file=sys.stderr)
        raise

    # Re-run gap detection so newly-canonicalised attrs leave the queue
    detect_script = REPO_ROOT / 'plugins' / 'sgs-blocks' / 'scripts' / 'gap-detection' / 'detect.py'
    print(f'Re-running gap detection...')
    try:
        subprocess.run([py, str(detect_script)], check=True, cwd=str(REPO_ROOT))
    except subprocess.CalledProcessError as e:
        print(f'ERROR: subprocess failed for {detect_script} (exit code {e.returncode})', file=sys.stderr)
        raise

    # Re-open conn (assign-canonical may have committed)
    conn.close()
    conn = sqlite3.connect(str(DB_PATH))
    after = stat_block(conn)
    conn.close()

    write_report(before, after, inserted, instance_flagged)
    print()
    print('=== TRIAGE COMPLETE ===')
    print(f'  property_suffixes inserted: {inserted}')
    print(f'  instance-data flagged:      {instance_flagged}')
    print()
    print(f'  canonicalised:    {before["canonicalised"]:5} -> {after["canonicalised"]:5}  ({after["canonicalised"] - before["canonicalised"]:+d})')
    print(f'  gap queue:        {before["gap_canonicalisable"]:5} -> {after["gap_canonicalisable"]:5}  ({after["gap_canonicalisable"] - before["gap_canonicalisable"]:+d})')
    print(f'  gap instance-data:{before["gap_instance_data"]:5} -> {after["gap_instance_data"]:5}  ({after["gap_instance_data"] - before["gap_instance_data"]:+d})')
    print()
    print(f'Report written: {REPORT_PATH}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
