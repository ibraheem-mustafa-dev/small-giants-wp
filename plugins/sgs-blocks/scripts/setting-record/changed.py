"""Which blocks the setting check runs on in a build gate (check.py --changed): only those a change can touch, never the
whole library.

Every committed record (scripts/data/setting-records/<block>.json) carries a stamp (stamp.py). stamp.py::select names
each record whose inputs moved, as `own` (the block's folder, fixture, stylesheets as shipped, the helpers it loads, the
theme rules that reach its elements) or `core` (the PHP files every block loads, the check's own code and the offline
runner). The gate then checks:

  - every block with an `own` change, in full against its record;
  - for a `core` change only, the canary blocks (CANARIES): their renders run again and are compared with the stamp's
    output hash; a canary whose output moved is checked in full. A core file reaches every block the same way, so the
    canaries, which carry every shared extension setting, stand for the rest;
  - that every block has a record, unless the pending list (PENDING) names it with an owner and a date it lapses, and
    that no record is left for a block that no longer exists.

`python check.py --restamp <block>...` refreshes a record's stamp once its check passes, so a change that moved no
entry stops selecting the block.
"""
from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
PENDING = HERE.parent / 'data' / 'setting-record-pending.json'
# Task 2's proved blocks and heading: between them every shared extension and helper route (setting-record plan, Task 3)
CANARIES = ('sgs/heading', 'sgs/button')


def load_records(records_dir: Path) -> dict:
    """{block name: record document} of every record file."""
    out = {}
    for f in sorted(Path(records_dir).glob('*.json')):
        doc = json.loads(f.read_text(encoding='utf-8'))
        out[doc.get('block') or f'sgs/{f.stem}'] = doc
    return out


def load_pending(path: Path | None = None) -> dict:
    """{block: {owner, reason, until}}: blocks another session is changing whose record is rewritten when it lands."""
    path = path or PENDING
    if not Path(path).is_file():
        return {}
    return json.loads(Path(path).read_text(encoding='utf-8')).get('blocks') or {}


def plan(plugin: Path, records_dir: Path, fixtures_file: Path, today: dt.date | None = None) -> dict:
    """{'full': [blocks checked in full], 'canary': [canaries whose outputs are compared first], 'reasons': {block:
    reasons}, 'problems': [messages that fail the gate on their own]}."""
    import seed_fixtures as SF
    import stamp as ST
    import theme as TH
    today = today or dt.date.today()
    records = load_records(records_dir)
    pending = load_pending()
    roster = set(SF.roster(plugin))
    problems = []
    for block, p in sorted(pending.items()):
        try:
            until = dt.date.fromisoformat(str(p.get('until')))
        except ValueError:
            problems.append(f'{block}: the pending list gives no valid `until` date ({PENDING.name})')
            continue
        if until < today:
            problems.append(f'{block}: its place on the pending list lapsed on {until} (owner {p.get("owner")}): '
                            f'write its record ({fix_command(block)}) and take it off {PENDING.name}')
    for block in sorted(roster - set(records) - set(pending)):
        problems.append(f'{block} has no record: {fix_command(block)}')
    for block in sorted(set(records) - roster):
        problems.append(f'{block} has a record but no block: delete {Path(records_dir).name}/{block.split("/", 1)[1]}.json')
    fixtures = json.loads(Path(fixtures_file).read_text(encoding='utf-8')) if Path(fixtures_file).is_file() else {}
    live = {b: d for b, d in records.items() if b in roster and b not in pending}
    sel = ST.select(plugin, live, fixtures, Path(fixtures_file).parent, TH.theme_css(Path(plugin).resolve().parents[1]))
    full = sorted(b for b, r in sel.items() if r['own'])
    core = any(r['core'] for r in sel.values())
    canary = [b for b in CANARIES if core and b in live and b not in full]
    return {'full': full, 'canary': canary, 'reasons': sel, 'problems': problems, 'staleVerdicts': stale_verdicts(plugin, live)}


def stale_verdicts(plugin: Path, live) -> list:
    """[(block, why)] for each block whose browser verdicts (browser/verdicts/<block>.json) were measured on code that has
    changed since (check.py::script_hash: its folder, front-end scripts included, and src/shared). Its record still holds
    the browser's kinds; the offline check cannot see a script's effect, so only the browser pass, or a rewrite that
    turns those entries back to unproven, makes it true again."""
    import check as CK
    out = []
    for f in sorted(CK.BROWSER_VERDICTS.glob('*.json')):
        block = f'sgs/{f.stem}'
        if block not in live:
            continue
        doc = json.loads(f.read_text(encoding='utf-8'))
        if doc.get('scriptHash') != CK.script_hash(Path(plugin), f.stem):
            out.append((block, f'its browser verdicts were measured on code that has changed since (src/blocks/{f.stem} or '
                               f'src/shared): run the browser pass for it (setting-record/browser/README.md), or rewrite the '
                               f'record so those entries are unproven again: {fix_command(block)}'))
    return out


def fix_command(block: str) -> str:
    short = block.split('/', 1)[1]
    return (f'python plugins/sgs-blocks/scripts/setting-record/check.py {block} '
            f'--write plugins/sgs-blocks/scripts/data/setting-records/{short}.json')
