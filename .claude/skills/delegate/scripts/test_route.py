#!/usr/bin/env python3
"""
Unit tests for route.py rule evaluation.

Runs 14 scenarios covering every decision_rule in routing-table.json (all-Claude fleet v5).
Exit 0 = all pass; exit 1 = any failed.

Usage:
  python scripts/test_route.py
  python scripts/test_route.py --verbose
"""
import json
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

ROUTE_PY = Path(__file__).parent / 'route.py'


def run_route(descriptor: dict) -> dict:
    """Run route.py with the descriptor, return parsed result."""
    args = ['python', str(ROUTE_PY), 'route']
    for key, val in descriptor.items():
        flag = '--' + key.replace('_', '-')
        if isinstance(val, bool):
            if val:
                args.append(flag)
        elif val is not None:
            args.extend([flag, str(val)])
    result = subprocess.run(args, capture_output=True, text=True, timeout=10)
    if result.returncode not in (0, 1):
        raise RuntimeError(f'route.py exit {result.returncode}: {result.stderr}')
    return json.loads(result.stdout) if result.stdout.strip() else {}


SCENARIOS = [
    # (name, descriptor, expected_primary_model, expected_in_fallback, must_exclude)
    # All-Claude fleet (2026-07-15 v5): haiku (cheap/mechanical), sonnet (mid + 1M ctx), inline (main thread).
    ('small_code_gen_picks_haiku',
     {'task_shape': 'code_gen', 'input_size_kb': 5, 'expected_output_tokens': 2000},
     'haiku', ['sonnet'], []),

    ('very_large_input_excludes_haiku',
     {'task_shape': 'code_gen', 'input_size_kb': 500, 'expected_output_tokens': 2000},
     'sonnet', [], ['haiku']),

    ('large_output_excludes_haiku',
     {'task_shape': 'code_gen', 'input_size_kb': 10, 'expected_output_tokens': 20000},
     'sonnet', [], ['haiku']),

    ('batch_synthesis_routes_to_sonnet',
     {'task_shape': 'batch_synthesis', 'input_size_kb': 140, 'expected_output_tokens': 20000},
     'sonnet', ['inline'], ['haiku']),

    ('fast_classification_routes_to_haiku',
     {'task_shape': 'classification', 'input_size_kb': 5,
      'expected_output_tokens': 500, 'time_sensitivity': 'high'},
     'haiku', ['sonnet'], []),

    ('code_review_routes_to_sonnet',
     {'task_shape': 'code_review', 'input_size_kb': 15, 'expected_output_tokens': 3000},
     'sonnet', ['haiku'], []),

    ('mcp_required_routes_to_sonnet',
     {'task_shape': 'code_gen', 'input_size_kb': 5,
      'expected_output_tokens': 2000, 'needs_mcp': True},
     'sonnet', ['haiku'], []),

    ('web_search_routes_inline',
     {'task_shape': 'research', 'input_size_kb': 5,
      'expected_output_tokens': 2000, 'needs_web_search': True},
     'inline', [], []),

    ('destructive_routes_to_sonnet_with_isolation',
     {'task_shape': 'code_gen', 'input_size_kb': 10,
      'expected_output_tokens': 3000, 'destructive': True},
     'sonnet', ['haiku'], []),

    ('offline_capability_retired_stays_inline',
     {'task_shape': 'code_gen', 'input_size_kb': 5,
      'expected_output_tokens': 2000, 'offline_required': True},
     'inline', [], []),

    ('secrets_stay_inline',
     {'task_shape': 'code_gen', 'input_size_kb': 5,
      'expected_output_tokens': 2000, 'contains_secrets': True},
     'inline', [], []),

    ('persona_panel_routes_to_sonnet',
     {'task_shape': 'persona_panel', 'input_size_kb': 4, 'expected_output_tokens': 1500},
     'sonnet', ['haiku'], []),

    ('qc_review_of_inline_work_gets_cold_sonnet',
     {'task_shape': 'qc_review', 'input_size_kb': 10,
      'expected_output_tokens': 2000, 'original_model': 'inline'},
     'sonnet', ['haiku'], []),

    ('default_fallback_to_sonnet',
     {'task_shape': 'extraction', 'input_size_kb': 10, 'expected_output_tokens': 3000},
     'sonnet', [], []),
]


def run_tests(verbose: bool = False) -> int:
    passed = 0
    failed = 0
    for name, desc, expected_primary, expected_in_fallback, must_exclude in SCENARIOS:
        try:
            result = run_route(desc)
        except (RuntimeError, json.JSONDecodeError, subprocess.TimeoutExpired) as e:
            print(f'  FAIL {name}: exception {e}')
            failed += 1
            continue

        errors = []
        primary = result.get('primary_model')
        if expected_primary is not None and primary != expected_primary:
            errors.append(f'primary_model {primary!r} != expected {expected_primary!r}')

        fallback = result.get('fallback_chain', [])
        for must_have in expected_in_fallback:
            if must_have not in fallback and primary != must_have:
                errors.append(f'{must_have!r} missing from fallback chain {fallback}')

        excluded = set(result.get('excluded', []))
        for should_exclude in must_exclude:
            if should_exclude not in excluded:
                errors.append(f'{should_exclude!r} not in excluded set {excluded}')

        if errors:
            failed += 1
            print(f'  FAIL {name}:')
            for e in errors:
                print(f'    - {e}')
            if verbose:
                print(f'    full: {json.dumps(result, indent=2)}')
        else:
            passed += 1
            if verbose:
                print(f'  PASS {name} -> primary={primary}, fallback={fallback}')

    total = len(SCENARIOS)
    print(f'\nResults: {passed}/{total} passed, {failed} failed')
    return 0 if failed == 0 else 1


if __name__ == '__main__':
    verbose = '--verbose' in sys.argv or '-v' in sys.argv
    sys.exit(run_tests(verbose=verbose))
