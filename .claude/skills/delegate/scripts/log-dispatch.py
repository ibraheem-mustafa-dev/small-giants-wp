#!/usr/bin/env python3
"""
/delegate dispatch logger.

Appends a completed dispatch's metadata to the local dispatch log at
data/dispatch-log.jsonl (one JSON object per line, category=dispatch_log).
This is the data-driven calibration feedback loop: over time, the
routing-table can be tuned from the success-rate deltas this log captures.

2026-08-17: the sink was retargeted from the local dashboard's knowledge
HTTP API to this JSONL file — that dashboard was discontinued. The row shape
is unchanged, so check-budget.py reads the same fields it always did.

Usage:
  log-dispatch.py --task-shape code_gen --model haiku --success true \\
                  --tokens-in 1200 --tokens-out 3400 --duration-sec 8.2

Fields logged (all kebab-case in knowledge.tags for queryability):
  task_type, model, success, tokens_in, tokens_out, duration_sec,
  fallback_used, error_class, dispatch_justified, session_id
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).parent.parent
DISPATCH_LOG_PATH = ROOT / 'data' / 'dispatch-log.jsonl'


def post_dispatch(payload: dict) -> dict:
    """Append payload as one JSON line to the local dispatch log.

    Returns the written row (including its assigned `id`) on success, or
    {'error': ..., 'pending_upload': True} if the write failed.
    """
    row = dict(payload)
    row.setdefault('created_at', datetime.now(timezone.utc).isoformat())
    try:
        DISPATCH_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        # `id` = 1-based line number, so downstream readers keep a stable key.
        existing = 0
        if DISPATCH_LOG_PATH.exists():
            with open(DISPATCH_LOG_PATH, encoding='utf-8') as f:
                existing = sum(1 for line in f if line.strip())
        row['id'] = existing + 1
        with open(DISPATCH_LOG_PATH, 'a', encoding='utf-8', newline='') as f:
            f.write(json.dumps(row, ensure_ascii=False) + '\n')
    except OSError as e:
        return {'error': str(e), 'pending_upload': True}
    return row


def build_payload(args) -> dict:
    timestamp = datetime.now(timezone.utc).isoformat()
    tags = [
        f'model:{args.model}',
        f'task:{args.task_shape}',
        f'success:{str(args.success).lower()}',
    ]
    if args.fallback_used:
        tags.append(f'fallback:{args.fallback_used}')
    if args.error_class:
        tags.append(f'error:{args.error_class}')

    content = json.dumps({
        'timestamp': timestamp,
        'task_shape': args.task_shape,
        'model': args.model,
        'success': args.success,
        'tokens_in': args.tokens_in,
        'tokens_out': args.tokens_out,
        'duration_sec': args.duration_sec,
        'fallback_used': args.fallback_used,
        'error_class': args.error_class,
        'dispatch_justified': args.dispatch_justified,
        'session_id': args.session_id or os.environ.get('CLAUDE_SESSION_ID', 'unknown'),
    }, indent=2)

    return {
        'source': 'cc_delegate',
        'title': f'dispatch: {args.task_shape} -> {args.model} ({"ok" if args.success else "fail"})',
        'content': content,
        'category': 'dispatch_log',
        'tags': json.dumps(tags),
        'confidence': 1.0,
    }


def main() -> int:
    p = argparse.ArgumentParser(description='/delegate dispatch logger')
    p.add_argument('--task-shape', required=True)
    p.add_argument('--model', required=True)
    p.add_argument('--success', type=lambda v: v.lower() in ('true', '1', 'yes'), required=True)
    p.add_argument('--tokens-in', type=int, default=0)
    p.add_argument('--tokens-out', type=int, default=0)
    p.add_argument('--duration-sec', type=float, default=0.0)
    p.add_argument('--fallback-used', default=None)
    p.add_argument('--error-class', default=None, help='e.g. queue_exceeded, 503, timeout')
    p.add_argument('--dispatch-justified', type=lambda v: v.lower() in ('true', '1', 'yes'), default=True)
    p.add_argument('--session-id', default=None)
    args = p.parse_args()

    payload = build_payload(args)
    result = post_dispatch(payload)
    print(json.dumps(result, indent=2))
    return 0 if 'id' in result else 1


if __name__ == '__main__':
    sys.exit(main())
