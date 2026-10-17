#!/usr/bin/env python3
"""
/delegate routing-table validator.

Runs on edits to data/routing-table.json. Refuses malformed tables that
would break route.py downstream. Attach as a PostToolUse hook on Edit/Write
events that touch data/routing-table.json.

Checks:
  - JSON parses
  - Every model entry has required keys (tier, provider, model_id, default_effort, reliability)
  - fanout and brief_must_include are present and well-formed
  - Every decision_rule has (name, priority, when, then)
  - No model references a non-existent fallback_to target
  - priority is an integer
"""
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

TABLE_PATH = Path(__file__).parent.parent / 'data' / 'routing-table.json'

REQUIRED_MODEL_KEYS = ['tier', 'provider', 'model_id', 'default_effort', 'reliability']
REQUIRED_RULE_KEYS = ['name', 'priority', 'when', 'then']


def validate() -> tuple[bool, list[str]]:
    errors: list[str] = []

    if not TABLE_PATH.is_file():
        return False, [f'routing-table.json not found at {TABLE_PATH}']

    try:
        with open(TABLE_PATH, encoding='utf-8') as f:
            table = json.load(f)
    except json.JSONDecodeError as e:
        return False, [f'JSON parse error: {e}']

    models = table.get('models', {})
    if not models:
        errors.append('No models declared in routing-table.json')

    # Model integrity
    for name, meta in models.items():
        for key in REQUIRED_MODEL_KEYS:
            if key not in meta:
                errors.append(f'Model {name!r} missing required key: {key}')
        for fb in meta.get('fallback_to', []):
            if fb not in models:
                errors.append(f'Model {name!r} has fallback_to {fb!r} which is not a declared model')

    fanout = table.get('fanout', {})
    for key in ('max_concurrent', 'session_soft_cap'):
        if not isinstance(fanout.get(key), int):
            errors.append(f'fanout.{key} must be an integer')
    brief = table.get('brief_must_include')
    if not isinstance(brief, list) or not brief or not all(isinstance(b, str) and b for b in brief):
        errors.append('brief_must_include must be a non-empty list of strings')

    # Rule integrity
    for i, rule in enumerate(table.get('decision_rules', [])):
        for key in REQUIRED_RULE_KEYS:
            if key not in rule:
                errors.append(f'Rule #{i} missing required key: {key}')
        if 'priority' in rule and not isinstance(rule['priority'], int):
            errors.append(f'Rule {rule.get("name", "?")!r} priority is not an integer')
        then = rule.get('then', {})
        if 'effort' in then and then['effort'] not in ('low', 'medium', 'high', 'xhigh', 'max'):
            errors.append(f'Rule {rule.get("name", "?")!r} sets an unknown effort {then["effort"]!r}')
        if 'primary_model' in then and then['primary_model'] not in models and then['primary_model'] != 'inline':
            errors.append(f'Rule {rule.get("name", "?")!r} sets primary_model={then["primary_model"]!r} which is not a declared model')
        if 'exclude_models' in then:
            for m in then['exclude_models']:
                if m not in models:
                    errors.append(f'Rule {rule.get("name", "?")!r} excludes model {m!r} which is not declared')

    return len(errors) == 0, errors


def main() -> int:
    ok, errors = validate()
    if ok:
        print('OK: routing-table.json is valid')
        return 0
    print('FAIL: routing-table.json has errors:', file=sys.stderr)
    for e in errors:
        print(f'  - {e}', file=sys.stderr)
    return 1


if __name__ == '__main__':
    sys.exit(main())
