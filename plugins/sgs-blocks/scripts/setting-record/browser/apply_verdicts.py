#!/usr/bin/env python3
"""Apply the browser pass's verdicts (browser/verdicts/<block>.json) to the committed records, without re-running the offline proof.

check.py applies the verdicts while it proves a block; a record on disk holds the entries as the proof wrote them, so after a
browser pass the verdicts have to reach the record files too. This reads each record, runs check.py::apply_browser_verdicts on
its entries (a proved entry loses `unproved` and takes the verdict's kind, a removed one goes, a re-filed one moves to the
part the browser found), checks the result with check.py::schema_errors(need_kind=True) and writes it. `stamp`, `proofKeys`,
`parts` and `accounted` are left as they are. A block whose verdicts are stale (the block's folder or src/shared changed since the
measurement) is refused, never half applied.

  python apply_verdicts.py [--records-dir DIR] [--plugin DIR] [--dry-run] [block ...]     (no block: every file in verdicts/)
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

import check as K  # noqa: E402


def apply_block(short: str, plugin: Path, records_dir: Path, dry: bool, verdicts: Path | None = None) -> dict:
    f = records_dir / f'{short}.json'
    doc = json.loads(f.read_text(encoding='utf-8'))
    entries = {K.key(e): e for e in doc['entries']}
    if len(entries) != len(doc['entries']):
        raise SystemExit(f'{short}: the record holds two entries with one key')
    before = len(entries)
    res = K.apply_browser_verdicts(short, plugin, entries, verdicts or K.BROWSER_VERDICTS)
    if res is None:
        raise SystemExit(f'{short}: no verdicts file')
    if res.get('stale'):
        raise SystemExit(f'{short}: the verdicts were measured on code that has changed since (hash {res["scriptHash"]}, now {res["currentHash"]})')
    doc['entries'] = sorted(entries.values(), key=lambda e: json.dumps(K.key(e)))
    errs = K.schema_errors(doc, need_kind=True)
    if errs:
        raise SystemExit(f'{short}: schema errors after applying: {errs}')
    if not dry:
        f.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
    left = [e for e in doc['entries'] if e.get('unproved') in K.BROWSER_CAUSES and not e.get('accepted')]
    return {'block': f'sgs/{short}', 'proved': res['proved'], 'removed': len(res['removed']), 'refiled': len(res['refiled']),
            'unmatched': len(res['unmatched']), 'entriesBefore': before, 'entriesAfter': len(doc['entries']), 'stillUnproved': len(left)}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('blocks', nargs='*')
    ap.add_argument('--records-dir', type=Path, default=K.RECORDS)
    ap.add_argument('--plugin', type=Path, default=HERE.parents[2])
    ap.add_argument('--verdicts-dir', type=Path, default=K.BROWSER_VERDICTS)
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args(argv)
    blocks = a.blocks or sorted(p.stem for p in a.verdicts_dir.glob('*.json'))
    for b in blocks:
        print(json.dumps(apply_block(b, a.plugin, a.records_dir, a.dry_run, a.verdicts_dir)))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
