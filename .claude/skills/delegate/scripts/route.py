#!/usr/bin/env python3
"""
/delegate routing engine.

Reads data/routing-table.json, applies decision rules (ordered by priority
descending) to a task descriptor, returns the primary model + effort +
fallback chain + justification, plus the fan-out budget and the lines every
dispatch brief must carry.

Usage:
  route.py --descriptor <path-to-json>
  route.py --task-shape <shape> [--input-size-kb N] [--expected-output-tokens N] ...
  route.py list-models
  route.py explain <model-name>

Exit codes:
  0 - recommendation produced
  1 - no capable model under constraints
  2 - invalid input or missing routing-table
"""
import argparse
import json
import os
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

ROUTING_TABLE_PATH = Path(__file__).parent.parent / 'data' / 'routing-table.json'


def load_table() -> dict:
    if not ROUTING_TABLE_PATH.is_file():
        print(f'ERROR: routing-table.json not found at {ROUTING_TABLE_PATH}', file=sys.stderr)
        sys.exit(2)
    try:
        with open(ROUTING_TABLE_PATH, encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        print(f'ERROR: failed to parse routing-table.json: {e}', file=sys.stderr)
        sys.exit(2)


def rule_matches(rule_when: dict, descriptor: dict) -> bool:
    """Return True if every condition in rule_when matches descriptor."""
    for key, expected in rule_when.items():
        # Membership and numeric comparison operators encoded in key suffix
        if key.endswith('_in'):
            if descriptor.get(key[:-3]) not in expected:
                return False
        elif key.endswith('_gt'):
            field = key[:-3]
            actual = descriptor.get(field)
            if actual is None or not (isinstance(actual, (int, float)) and actual > expected):
                return False
        elif key.endswith('_gte'):
            field = key[:-4]
            actual = descriptor.get(field)
            if actual is None or not (isinstance(actual, (int, float)) and actual >= expected):
                return False
        elif key.endswith('_lt'):
            field = key[:-3]
            actual = descriptor.get(field)
            if actual is None or not (isinstance(actual, (int, float)) and actual < expected):
                return False
        elif key.endswith('_lte'):
            field = key[:-4]
            actual = descriptor.get(field)
            if actual is None or not (isinstance(actual, (int, float)) and actual <= expected):
                return False
        else:
            # Exact-match
            if descriptor.get(key) != expected:
                return False
    return True


def apply_rules(descriptor: dict, table: dict) -> dict:
    """Walk decision_rules by descending priority; return {primary_model, justifications, excluded}."""
    rules = sorted(table['decision_rules'], key=lambda r: -r.get('priority', 0))
    excluded: set[str] = set()
    primary_model: str | None = None
    justifications: list[str] = []
    extras: dict = {}
    requires: dict = {}
    rule_fallback: list[str] | None = None
    rule_effort: str | None = None

    def refusal(reason: str) -> dict:
        return {
            'primary_model': None,
            'primary_command': None,
            'effort': None,
            'fallback_chain': [],
            'excluded': sorted(excluded),
            'justifications': justifications + [reason],
            'extras': extras,
            'requires': requires,
        }

    for rule in rules:
        if not rule_matches(rule.get('when', {}), descriptor):
            continue
        then = rule.get('then', {})
        j = then.get('justification', f'rule {rule.get("name", "?")} matched')
        if 'exclude_models' in then:
            newly_excluded = [m for m in then['exclude_models'] if m not in excluded]
            if newly_excluded:
                excluded.update(newly_excluded)
                justifications.append(f'exclude {newly_excluded}: {j}')
        if 'requires' in then and primary_model is None:
            for key, val in then['requires'].items():
                requires.setdefault(key, val)
        if 'routing_by_original_model' in then and primary_model is None:
            original = descriptor.get('original_model')
            routing = then['routing_by_original_model']
            if not original:
                return refusal(
                    f'rule {rule.get("name", "?")} requires --original-model '
                    f'(cross-tier QC needs the authoring model); refusing to route without it'
                )
            sub = routing.get(original)
            if sub is None:
                return refusal(
                    f'rule {rule.get("name", "?")}: unknown original_model {original!r}. '
                    f'Known: {sorted(routing.keys())}'
                )
            candidate = sub.get('primary_model')
            if candidate and candidate not in excluded:
                primary_model = candidate
                justifications.append(f'primary={candidate}: {j} (original_model={original})')
                rule_fallback = sub.get('fallback_chain', [])
                rule_effort = sub.get('effort')
        if 'primary_model' in then and primary_model is None:
            candidate = then['primary_model']
            if candidate not in excluded:
                primary_model = candidate
                justifications.append(f'primary={candidate}: {j}')
                if 'isolation' in then:
                    extras['isolation'] = then['isolation']
                if 'fallback_chain' in then:
                    rule_fallback = then['fallback_chain']
                rule_effort = then.get('effort')
        if primary_model and all(
            (r.get('priority', 0) <= rule.get('priority', 0))
            for r in rules if r is not rule
        ):
            break

    # Fallback: if no primary chosen (e.g. all rules with primary produced excluded models),
    # pick the highest-reliability non-excluded model with matching capabilities.
    if primary_model is None:
        candidates = [
            (name, meta)
            for name, meta in table['models'].items()
            if name not in excluded
        ]
        if not candidates:
            return refusal('no model survives the exclusion filters')
        # Prefer highest reliability
        reliability_rank = {'high': 3, 'medium-high': 2.5, 'medium': 2, 'low': 1, 'unreliable': 0}
        candidates.sort(key=lambda c: -reliability_rank.get(c[1].get('reliability', 'medium'), 2))
        primary_model = candidates[0][0]
        justifications.append(f'primary={primary_model}: default to highest-reliability survivor')

    primary_meta = table['models'].get(primary_model, {})
    effort = rule_effort or primary_meta.get('default_effort')
    primary_command = primary_meta.get('command')
    if primary_command and primary_command.startswith('Agent tool') and effort:
        primary_command = f'{primary_command}, effort: {effort}'

    # Build fallback chain: rule-specified chain first (filtered), then extend
    # by walking each model's fallback_to, skipping excluded and deduping.
    fallback_chain: list[str] = [
        m for m in (rule_fallback or [])
        if m != primary_model and m not in excluded and m in table['models']
    ]
    seen = {primary_model, *fallback_chain}
    current = fallback_chain[-1] if fallback_chain else primary_model
    depth = len(fallback_chain)
    while depth < 4:
        fb_list = table['models'].get(current, {}).get('fallback_to', [])
        next_model = next((m for m in fb_list if m not in seen and m not in excluded), None)
        if not next_model:
            break
        fallback_chain.append(next_model)
        seen.add(next_model)
        current = next_model
        depth += 1

    return {
        'primary_model': primary_model,
        'primary_command': primary_command,
        'effort': effort,
        'fallback_chain': fallback_chain,
        'excluded': sorted(excluded),
        'justifications': justifications,
        'extras': extras,
        'requires': requires,
        'fanout': table.get('fanout', {}),
        'brief_must_include': table.get('brief_must_include', []) if primary_model != 'inline' else [],
    }


def cmd_route(args) -> int:
    table = load_table()

    if args.descriptor:
        try:
            with open(args.descriptor, encoding='utf-8') as f:
                descriptor = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            print(f'ERROR: failed to read descriptor: {e}', file=sys.stderr)
            return 2
    else:
        descriptor = {
            'task_shape': args.task_shape,
            'input_size_kb': args.input_size_kb,
            'expected_output_tokens': args.expected_output_tokens,
            'time_sensitivity': args.time_sensitivity,
            'needs_mcp': args.needs_mcp,
            'needs_web_search': args.needs_web_search,
            'destructive': args.destructive,
            'code_only': args.code_only,
            'expected_minutes': args.expected_minutes,
            'dispatch_justified': args.dispatch_justified,
            'pii_detected': args.pii_detected,
            'contains_secrets': args.contains_secrets,
            'jailbreak_signal': args.jailbreak_signal,
            'high_complexity': args.high_complexity,
            'original_model': args.original_model,
            'parallel_count': args.parallel_count,
        }

    result = apply_rules(descriptor, table)
    result['descriptor'] = descriptor
    print(json.dumps(result, indent=2))
    return 0 if result['primary_model'] else 1


def cmd_list_models(_args) -> int:
    table = load_table()
    print(f'{"MODEL":<10} {"TIER":<12} {"MODEL ID":<20} {"EFFORT":<10} COMMAND')
    print('-' * 80)
    for name, meta in table['models'].items():
        print(
            f'{name:<10} {meta.get("tier", "?"):<12} {meta.get("model_id", "?"):<20} '
            f'{meta.get("default_effort", "?"):<10} {meta.get("command", "-")}'
        )
    return 0


def cmd_explain(args) -> int:
    table = load_table()
    name = args.model_name
    if name not in table['models']:
        print(f'ERROR: unknown model {name!r}. Known: {sorted(table["models"].keys())}', file=sys.stderr)
        return 2
    print(json.dumps(table['models'][name], indent=2))
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description='/delegate routing engine')
    sub = p.add_subparsers(dest='cmd', required=True)

    r = sub.add_parser('route', help='Route a task to a model')
    r.add_argument('--descriptor', help='Path to a JSON descriptor file')
    r.add_argument('--task-shape', default='code_gen',
                   help='code_gen, debugging, code_review, batch_synthesis, research, find_list, '
                        'classification, extraction, summarise, mechanical_edit, persona_panel, qc_review')
    r.add_argument('--input-size-kb', type=float, default=5.0)
    r.add_argument('--expected-output-tokens', type=int, default=2000)
    r.add_argument('--time-sensitivity', default='normal', choices=['low', 'normal', 'high'])
    r.add_argument('--needs-mcp', action='store_true')
    r.add_argument('--needs-web-search', action='store_true')
    r.add_argument('--destructive', action='store_true')
    r.add_argument('--code-only', action='store_true',
                   help='Needs nothing outside GitHub: no live site, framework DB, secrets, MCP or ~/.claude')
    r.add_argument('--expected-minutes', type=int, default=None,
                   help='Rough wall-clock estimate; 20 or more with --code-only routes to a cloud session')
    r.add_argument('--dispatch-justified', action='store_true', default=True,
                   help='Set False to force inline recommendation')
    # Content signals
    r.add_argument('--pii-detected', action='store_true',
                   help='Task contains personally identifiable information')
    r.add_argument('--contains-secrets', action='store_true',
                   help='Task contains API keys, passwords, tokens')
    r.add_argument('--jailbreak-signal', action='store_true',
                   help='Suspicious prompt injection or jailbreak attempt detected')
    r.add_argument('--high-complexity', action='store_true',
                   help='Task requires multi-hop reasoning or has ambiguous requirements')
    r.add_argument('--original-model', default=None,
                   choices=['inline', 'opus', 'sonnet', 'haiku'],
                   help='For task_shape=qc_review: which model authored the work under review '
                        '(cross-tier QC routes the reviewer to a different Claude tier)')
    r.add_argument('--parallel-count', type=int, default=None,
                   help='For persona_panel dispatches: how many parallel personas are planned '
                        '(compare against the returned requires.max_parallel)')
    r.set_defaults(func=cmd_route)

    sub.add_parser('list-models', help='Show the routing table models').set_defaults(func=cmd_list_models)

    e = sub.add_parser('explain', help='Show a model\'s full config')
    e.add_argument('model_name')
    e.set_defaults(func=cmd_explain)

    args = p.parse_args()
    return args.func(args)


if __name__ == '__main__':
    sys.exit(main())
