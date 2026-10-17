"""
run-qc.py — Standalone runner for the QC pipeline (non-interactive invocation).

Produces a run_id, creates the pipeline-state directory, and writes an
initial stage-0 skeleton so the pipeline can proceed.

Usage:
    python run-qc.py <target> [--type website|skill|feature|block|pipeline]

Output:
    ~/.claude/pipeline-state/qc/<run_id>/stage-0-detect.json
"""
import sys
import os
import json
import argparse
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

STATE_BASE = Path.home() / '.claude' / 'pipeline-state' / 'qc'

VALID_TYPES = {'website', 'skill', 'feature', 'block', 'pipeline'}


def make_run_id() -> str:
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d-%H%M%S')
    short = uuid.uuid4().hex[:6]
    return f'qc-{ts}-{short}'


def detect_type(target: str) -> str:
    """Best-effort type detection from target string."""
    if target.startswith(('http://', 'https://')):
        return 'website'
    if target.endswith('/SKILL.md') or 'skills/' in target:
        return 'skill'
    if target.endswith('.json') and 'pipeline' in target:
        return 'pipeline'
    if 'block' in target.lower():
        return 'block'
    return 'feature'


def write_artifact(run_dir: Path, stage_key: str, data: dict) -> None:
    artifact_path = run_dir / f'{stage_key}.json'
    with open(artifact_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print(f'Written: {artifact_path}')


def main():
    parser = argparse.ArgumentParser(description='QC pipeline runner')
    parser.add_argument('target', help='Target to QC (URL, file path, skill name)')
    parser.add_argument('--type', dest='target_type', choices=list(VALID_TYPES),
                        help='Target type (auto-detected if omitted)')
    args = parser.parse_args()

    # New run
    run_id = make_run_id()
    run_dir = STATE_BASE / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    detected_type = args.target_type or detect_type(args.target)

    # Probe reachability for website targets
    reachable = True
    if detected_type == 'website':
        try:
            import urllib.request
            req = urllib.request.Request(args.target, method='HEAD')
            urllib.request.urlopen(req, timeout=10)
        except Exception as e:
            reachable = False
            print(f'WARNING: Target may not be reachable: {e}', file=sys.stderr)
    elif detected_type in ('skill', 'feature', 'block', 'pipeline'):
        reachable = os.path.exists(args.target)

    artifact = {
        'stage': 'stage-0-detect',
        'status': 'complete',
        'run_id': run_id,
        'output': {
            'type': detected_type,
            'location': args.target,
            'reachable': reachable,
            'tech_stack': 'auto-detect',
            'run_id': run_id,
        },
        'errors': [],
        'timestamp': datetime.now(timezone.utc).isoformat(),
    }

    write_artifact(run_dir, 'stage-0-detect', artifact)

    print(f'Run ID: {run_id}')
    print(f'State dir: {run_dir}')
    print(f'Target type: {detected_type}')
    print(f'Reachable: {reachable}')
    print(f'Next: Stage 1 (goal-extract) — find the stated goal in target documentation')

    if not reachable:
        print('\nKILL GATE: target not reachable. Resolve before running Stage 1.')
        sys.exit(1)


if __name__ == '__main__':
    main()
