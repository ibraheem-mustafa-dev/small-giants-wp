"""Entries accepted because the same shape is proved on another block (Bean, 2026-11-22: the certainty an entry needs).

An unproven entry (it carries `unproved`) is accepted when another block's record holds a proved entry of the same shape
(setting, element role, properties, state and media conditions) and no block's proof removed that shape. The element
role is ROOT, a shared part (a helper's or another block's class: the same element wherever it is drawn) or the block's
own part by its element name (the text after `__`). Accepted entries keep their `unproved` cause and gain
`accepted: "proved on sgs/a, sgs/b"`; a reader may act on their kind. Measured on the first library run (2026-11-22):
of 7,973 decided entries the rule would accept, the proof had removed 31 (0.39%).

A removed shape is read from each record's `proofKeys` (the keys before the proof) less its entries, so an entry the
proof re-filed under another key also counts as removed: the rule errs towards not accepting.

  python accept.py DIR        mark every record in DIR against the others (the library's first fill)
check.py --write marks the record it writes against the records beside it.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


def part_role(block: str, part: str) -> str:
    short = block.split('/', 1)[1]
    if part == 'ROOT':
        return 'ROOT'
    base = part.split()[0]
    own = base == f'sgs-{short}' or base.startswith((f'sgs-{short}__', f'sgs-{short}--'))
    if not own:  # another block's class that only shares the prefix (sgs-form-review__term on sgs/form) is shared
        return 'shared:' + part
    return 'own:' + (base.split('__', 1)[1] if '__' in base else base)


def shape(block: str, setting: str, part: str, props, state, tiers) -> tuple:
    return (setting, part_role(block, part), tuple(props), state or '', tuple(tiers or []))


def library(docs: dict) -> tuple[dict, dict]:
    """({shape: blocks proving it}, {shape: blocks whose proof removed it}) over the given records."""
    proved, removed = {}, {}
    for block, d in docs.items():
        kept = set()
        for e in d.get('entries') or []:
            k = shape(block, e['setting'], e['part'], e['props'], e.get('state'), e.get('tiers'))
            kept.add((e['setting'], e['part'], tuple(e['props']), e.get('state'), tuple(e.get('tiers') or [])))
            if not e.get('unproved'):
                proved.setdefault(k, set()).add(block)
        for s, p, props, state, tiers in d.get('proofKeys') or []:
            if (s, p, tuple(props), state, tuple(tiers or [])) not in kept:
                removed.setdefault(shape(block, s, p, props, state, tiers), set()).add(block)
    return proved, removed


def mark(doc: dict, proved: dict, removed: dict) -> int:
    """Sets or clears `accepted` on the record's unproven entries; returns how many are accepted."""
    block, n = doc['block'], 0
    for e in doc.get('entries') or []:
        e.pop('accepted', None)
        if not e.get('unproved'):
            continue
        k = shape(block, e['setting'], e['part'], e['props'], e.get('state'), e.get('tiers'))
        refs = sorted(proved.get(k, set()) - {block})
        if refs and not (removed.get(k, set()) - {block}):
            e['accepted'] = 'proved on ' + ', '.join(refs[:5])
            n += 1
    return n


def is_record(d) -> bool:
    """Whether a parsed JSON file is a setting record (record.schema.json: a block, a schema version and its entries), not
    a check report or a self-test summary that may share its folder."""
    return isinstance(d, dict) and isinstance(d.get('block'), str) and 'schemaVersion' in d and isinstance(d.get('entries'), list)


def mark_against_folder(doc: dict, folder: Path) -> int:
    """Marks one record against the other records in its folder (check.py --write); other JSON there is left out."""
    others = {}
    for f in sorted(Path(folder).glob('*.json')):
        d = json.loads(f.read_text(encoding='utf-8'))
        if is_record(d) and d['block'] != doc['block']:
            others[d['block']] = d
    return mark(doc, *library(others))


def main(argv) -> int:
    folder = Path(argv[0])
    docs = {f: d for f in sorted(folder.glob('*.json')) if is_record(d := json.loads(f.read_text(encoding='utf-8')))}
    files = list(docs)
    proved, removed = library({d['block']: d for d in docs.values()})
    total = 0
    for f, d in docs.items():
        total += mark(d, proved, removed)
        f.write_text(json.dumps(d, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'{total} unproven entries accepted as proved on another block, over {len(files)} records')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
