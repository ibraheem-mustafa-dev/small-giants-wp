"""Phase 3 Steps 2 + 3 + 4 — build Layer 1, populate block_compositions, emit Layer 4.

Idempotent: re-running produces byte-identical JSON if inputs unchanged.
"""
from __future__ import annotations
import json, os, re, sqlite3, sys
from datetime import datetime, timezone

DB_PATH = os.path.expanduser('~/.claude/skills/sgs-wp-engine/sgs-framework.db')
PROJECT = os.path.expanduser('~/Projects/small-giants-wp')
OUT_DIR = os.path.join(PROJECT, 'plugins/sgs-blocks/scripts/fingerprint-builder/output')

os.makedirs(OUT_DIR, exist_ok=True)

# Deterministic generation timestamp (commit hash > wall clock for byte-identical re-runs)
# Use a fixed token; Step 8 will replace with git rev-parse HEAD if invoked from build-catalogue.py
GENERATED_AT = 'phase-3-initial-build'


def block_name_from_marker(php_body: str) -> list[str]:
    """Extract WP block names from `<!-- wp:namespace/name ... -->` markers (top-level + nested).

    Anchors only on the `wp:NAME` opener to avoid regex backtracking on nested JSON
    attribute bodies (e.g. ``{"style":{"spacing":{"padding":...}}}``).
    """
    pat = re.compile(r'<!--\s*wp:([A-Za-z][\w/-]*)\b')
    return pat.findall(php_body)


# ---------------------------------------------------------------------------
# Step 2 — Layer 1 envelopes
# ---------------------------------------------------------------------------
def step2_layer1(db: sqlite3.Connection) -> int:
    rows = list(db.execute(
        "SELECT slug, title, category, blocks_used, industry "
        "FROM patterns ORDER BY slug"
    ))
    envelopes: dict[str, dict] = {}
    for slug, title, category, blocks_used, industry in rows:
        # Pattern slug `sgs/footer-mamas-munches` → wrapper class `.sgs-footer-mamas-munches`
        # (SGS-BEM canonical convention per spec 13)
        slug_dashed = slug.replace('sgs/', 'sgs-').replace('/', '-')
        envelopes[slug] = {
            'pattern_slug': slug,
            'wrapper_class': f'.{slug_dashed}',
            'confidence': 1.0,
            'category': category,
            'industry': industry,
            'title': title,
        }
    out = {
        'generated_at': GENERATED_AT,
        'source': 'sgs-framework.db patterns table',
        'schema_version': 1,
        'envelope_count': len(envelopes),
        'envelopes': envelopes,
    }
    path = os.path.join(OUT_DIR, 'layer-1-envelopes.json')
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(out, f, indent=2, sort_keys=True, ensure_ascii=False)
        f.write('\n')
    return len(envelopes)


# ---------------------------------------------------------------------------
# Step 3 — populate block_compositions from theme/sgs-theme/patterns/*.php
# ---------------------------------------------------------------------------
def step3_block_compositions(db: sqlite3.Connection) -> tuple[int, list[tuple]]:
    rows = list(db.execute(
        "SELECT bc.id, bc.composition_name, bc.auto_pattern_slug, p.file_path "
        "FROM block_compositions bc "
        "LEFT JOIN patterns p ON bc.auto_pattern_slug = p.slug "
        "WHERE bc.block_slugs IS NULL OR bc.block_slugs = '[]'"
    ))
    skipped: list[tuple] = []
    populated = 0
    for bc_id, comp_name, slug, file_path in rows:
        if not file_path:
            skipped.append((bc_id, comp_name, slug, 'no-pattern-row-or-null-file-path'))
            continue
        full = file_path if os.path.isabs(file_path) else os.path.join(PROJECT, file_path)
        if not os.path.exists(full):
            skipped.append((bc_id, comp_name, slug, f'missing-file:{file_path}'))
            continue
        try:
            with open(full, encoding='utf-8') as fp:
                body = fp.read()
        except Exception as e:
            skipped.append((bc_id, comp_name, slug, f'read-error:{e}'))
            continue
        names = block_name_from_marker(body)
        # Prefix bare names with sgs/ if pattern body uses bare core blocks too
        # Keep as-is; bare names like `core/group` or `sgs/heading` are both valid identifiers
        db.execute(
            'UPDATE block_compositions SET block_slugs = ? WHERE id = ?',
            (json.dumps(names, ensure_ascii=False), bc_id),
        )
        populated += 1
    db.commit()
    return populated, skipped


# ---------------------------------------------------------------------------
# Step 4 — Layer 4 inner-blocks JSON (Rosetta Stone, cross-platform)
# ---------------------------------------------------------------------------
SEMANTIC_TAG_HINTS = {
    'sgs/heading': 'h2',
    'sgs/paragraph': 'p',
    'sgs/button': 'a',
    'sgs/cta-button': 'a',
    'sgs/cta-buttons': 'div',
    'core/buttons': 'div',
    'core/button': 'a',
    'sgs/feature-grid': 'div',
    'sgs/card-grid': 'div',
    'sgs/hero': 'section',
    'sgs/section': 'section',
    'core/group': 'div',
    'core/columns': 'div',
    'core/column': 'div',
    'sgs/gallery': 'figure',
    'sgs/testimonial': 'blockquote',
    'sgs/team-member': 'article',
    'sgs/pricing-table': 'div',
    'sgs/tabs': 'div',
    'sgs/tab': 'section',
    'sgs/accordion': 'div',
    'sgs/timeline': 'ol',
    'sgs/star-rating': 'div',
    'sgs/countdown-timer': 'div',
    'sgs/icon-block': 'div',
}


def html_css_recipe(block_slugs: list[str]) -> str:
    """Generate a minimal semantic HTML scaffold matching the block sequence."""
    if not block_slugs:
        return '<div></div>'
    parts = []
    for s in block_slugs:
        tag = SEMANTIC_TAG_HINTS.get(s, 'div')
        cls = s.replace('/', '-')
        parts.append(f'<{tag} class="{cls}"></{tag}>')
    return '\n'.join(parts)


def step4_layer4(db: sqlite3.Connection) -> int:
    rows = list(db.execute(
        "SELECT bc.id, bc.composition_name, bc.auto_pattern_slug, bc.block_slugs, "
        "bc.industry, bc.page_type, bc.description "
        "FROM block_compositions bc "
        "WHERE bc.block_slugs IS NOT NULL AND bc.block_slugs != '[]' "
        "ORDER BY bc.auto_pattern_slug, bc.id"
    ))
    entries = []
    for bc_id, comp_name, slug, block_slugs_json, industry, page_type, desc in rows:
        try:
            block_slugs = json.loads(block_slugs_json)
        except Exception:
            block_slugs = []
        entries.append({
            'composition_id': bc_id,
            'composition_name': comp_name,
            'pattern_slug': slug,
            'block_slugs': block_slugs,
            'industry': industry,
            'page_type': page_type,
            'description': desc,
            'equivalent_implementations': {
                'sgs': {
                    'block_slugs': block_slugs,
                    'is_gap_candidate': False,
                },
                'html_css': {
                    'markup': html_css_recipe(block_slugs),
                    'is_gap_candidate': False,
                },
                'bootstrap': {'markup': None, 'is_gap_candidate': True,
                              'gap_reason': 'not-yet-mapped; surface via /uimax-sgs-scrape-pattern'},
                'tailwind': {'markup': None, 'is_gap_candidate': True,
                             'gap_reason': 'not-yet-mapped; surface via /uimax-sgs-scrape-pattern'},
                'shadcn': {'markup': None, 'is_gap_candidate': True,
                           'gap_reason': 'not-yet-mapped; surface via /uimax-sgs-scrape-pattern'},
                'react_generic': {'markup': None, 'is_gap_candidate': True,
                                  'gap_reason': 'not-yet-mapped; surface via /uimax-sgs-scrape-pattern'},
            },
        })
    out = {
        'generated_at': GENERATED_AT,
        'source': 'sgs-framework.db block_compositions table',
        'schema_version': 1,
        'entry_count': len(entries),
        'entries': entries,
    }
    path = os.path.join(OUT_DIR, 'layer-4-inner-blocks.json')
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(out, f, indent=2, sort_keys=True, ensure_ascii=False)
        f.write('\n')
    return len(entries)


# ---------------------------------------------------------------------------
def main() -> int:
    db = sqlite3.connect(DB_PATH)

    print('Step 2 — Layer 1 envelopes...')
    n1 = step2_layer1(db)
    print(f'  -> {n1} envelopes written')

    print('Step 3 — Populating block_compositions...')
    n3, skipped = step3_block_compositions(db)
    print(f'  -> {n3} rows populated')
    if skipped:
        print(f'  -> {len(skipped)} skipped:')
        for s in skipped: print(f'     {s}')

    print('Step 4 — Layer 4 JSON...')
    n4 = step4_layer4(db)
    print(f'  -> {n4} entries written')

    db.close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
