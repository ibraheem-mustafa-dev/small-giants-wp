#!/usr/bin/env python3
"""
Monthly budget check for the dispatchable Claude tiers (Sonnet + Haiku).

Reads the local dispatch log (data/dispatch-log.jsonl, written by
log-dispatch.py) for cumulative token spend this month. If any
paid model exceeds its threshold in data/routing-table.json -> budget_thresholds,
writes a state file that route.py reads and uses to activate the
"budget_triggered" rule set (which prefers free tiers for non-critical shapes).

Run as a cron every 2 hours: `python scripts/check-budget.py`.

Usage:
  python scripts/check-budget.py              # check + write state
  python scripts/check-budget.py --report     # read-only, print status
  python scripts/check-budget.py --reset      # clear budget-triggered state
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).parent.parent
TABLE_PATH = ROOT / 'data' / 'routing-table.json'
STATE_PATH = ROOT / 'data' / 'budget-state.json'
# 2026-08-17: source retargeted from the discontinued dashboard's HTTP
# knowledge API to this local JSONL log written by log-dispatch.py.
DISPATCH_LOG_PATH = ROOT / 'data' / 'dispatch-log.jsonl'


def load_table() -> dict:
    with open(TABLE_PATH, encoding='utf-8') as f:
        return json.load(f)


def load_dispatch_rows() -> list:
    """Read dispatch_log rows from the local JSONL log.

    Returns [] when the log doesn't exist yet (no dispatches recorded), which
    is a legitimate zero-spend state, not an error.
    """
    if not DISPATCH_LOG_PATH.exists():
        return []
    rows = []
    with open(DISPATCH_LOG_PATH, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if row.get('category') == 'dispatch_log':
                rows.append(row)
    return rows


def query_dispatch_log_month(model: str) -> dict:
    """Sum tokens_in + tokens_out for a model this calendar month."""
    month_prefix = datetime.now(timezone.utc).strftime('%Y-%m')
    try:
        rows = load_dispatch_rows()
    except OSError as e:
        return {'error': str(e), 'tokens_in': 0, 'tokens_out': 0, 'n_dispatches': 0}

    tokens_in = 0
    tokens_out = 0
    n = 0
    for row in rows:
        created = row.get('created_at', '')
        if not created.startswith(month_prefix):
            continue
        try:
            content = json.loads(row.get('content', '{}'))
        except json.JSONDecodeError:
            continue
        if content.get('model') != model:
            continue
        tokens_in += int(content.get('tokens_in', 0) or 0)
        tokens_out += int(content.get('tokens_out', 0) or 0)
        n += 1
    return {'tokens_in': tokens_in, 'tokens_out': tokens_out, 'n_dispatches': n}


def compute_spend_gbp(tokens_in: int, tokens_out: int, model_meta: dict) -> float:
    """Estimate cumulative spend in GBP this month for a model."""
    cost_in = model_meta.get('cost_per_1m_input_tokens', 0)
    cost_out = model_meta.get('cost_per_1m_output_tokens', 0)
    return (tokens_in / 1_000_000.0) * cost_in + (tokens_out / 1_000_000.0) * cost_out


def check() -> dict:
    table = load_table()
    thresholds = table.get('budget_thresholds', {})
    report = {'checked_at': datetime.now(timezone.utc).isoformat(), 'models': {}}
    budget_triggered = False

    for model_name, threshold_gbp in thresholds.items():
        meta = table['models'].get(model_name, {})
        usage = query_dispatch_log_month(model_name)
        if 'error' in usage:
            report['models'][model_name] = {'status': 'unknown', 'error': usage['error']}
            continue
        spend = compute_spend_gbp(usage['tokens_in'], usage['tokens_out'], meta)
        pct = (spend / threshold_gbp) * 100 if threshold_gbp > 0 else 0
        status = 'ok' if spend < threshold_gbp else 'exceeded'
        if status == 'exceeded':
            budget_triggered = True
        report['models'][model_name] = {
            'status': status,
            'spend_gbp': round(spend, 2),
            'threshold_gbp': threshold_gbp,
            'pct_used': round(pct, 1),
            'tokens_in': usage['tokens_in'],
            'tokens_out': usage['tokens_out'],
            'n_dispatches': usage['n_dispatches'],
        }

    report['budget_triggered'] = budget_triggered
    return report


def write_state(report: dict) -> None:
    with open(STATE_PATH, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)


def main() -> int:
    if '--reset' in sys.argv:
        if STATE_PATH.exists():
            STATE_PATH.unlink()
        print('Budget-triggered state reset')
        return 0

    if '--report' in sys.argv:
        if STATE_PATH.exists():
            with open(STATE_PATH, encoding='utf-8') as f:
                print(f.read())
        else:
            print('No budget state file yet (run without --report first)')
        return 0

    report = check()
    write_state(report)
    print(json.dumps(report, indent=2))
    return 2 if report.get('budget_triggered') else 0


if __name__ == '__main__':
    sys.exit(main())
