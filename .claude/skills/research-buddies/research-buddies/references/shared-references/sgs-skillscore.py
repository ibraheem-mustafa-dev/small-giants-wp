#!/usr/bin/env python3
"""
sgs-skillscore v2.0 — Rule-registry-based SGS artefact evaluator.
Supports skills, agents, and pipelines with type-aware checks, auto-fix, scaffolding, and ledger.

Usage:
    python sgs-skillscore.py ./path/to/skill/            # validate (auto-detect type)
    python sgs-skillscore.py validate ./path/            # explicit subcommand
    python sgs-skillscore.py validate ./path/ --type skill
    python sgs-skillscore.py validate ./path/ --fix
    python sgs-skillscore.py validate ./path/ --fix --dry-run
    python sgs-skillscore.py validate ./path/ --json
    python sgs-skillscore.py validate ./path/ --verbose
    python sgs-skillscore.py scaffold --type skill --name "my-skill"
    python sgs-skillscore.py scaffold --type agent --name "my-agent"
    python sgs-skillscore.py scaffold --type pipeline --name "my-pipeline"
    python sgs-skillscore.py ledger skill
    python sgs-skillscore.py ledger agent

Exit code 0 if >= threshold for type, 1 if below.
Type thresholds: skill=90%, agent=85%, pipeline=85%
"""
import sys
import os
import re
import json
import glob
import argparse
import difflib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Callable

sys.stdout.reconfigure(encoding='utf-8')

# ─────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────
VERSION = '2.0'

GRADE_MAP = [
    (95, 'A'),
    (90, 'A-'),
    (85, 'B+'),
    (80, 'B'),
    (75, 'B-'),
    (65, 'C'),
    (50, 'D'),
    (0,  'F'),
]

# Weights sum to 1.0 across the four SCORED tiers. FLOOR is weight 0.0: its checks
# still run and report (they catch a real *absence* of a load-bearing thing — a cheap
# pre-filter) but do NOT count toward the quality score. This is the 2026-07-17
# lean-ruler rebalance: structural-presence checks (6-Lens, template
# headings, references/hooks/scripts dirs, numbered-stages, HARD-GATE tags) were
# manufacturing Goodhart cruft — a skill scored high for ticking boxes regardless of
# outcome. Evidence: Anthropic context-engineering (lean + failure-matched), obra/superpowers
# writing-skills (prohibitions trended worse than nothing), reward-hacking-in-rubrics lit,
# and Bean's own `validate-grading-tool-against-gold-standard` lesson. Demoted to FLOOR:
# they inform, they don't score.
TIER_WEIGHTS = {
    'FATAL': 0.30,
    'QUALITY': 0.40,
    'ARCHITECTURE': 0.20,
    'HYGIENE': 0.10,
    'FLOOR': 0.0,
}

TIER_ORDER = ['FATAL', 'QUALITY', 'ARCHITECTURE', 'HYGIENE', 'FLOOR']

# Pass thresholds by artefact type.
# skill lowered 90 → 75 (2026-07-17 lean-ruler rebalance): with the 14 structural-presence
# "theatre" checks demoted to FLOOR (0%·info), the score now reflects a smaller set of REAL
# quality signals, so honest scores sit lower — 75 restores a meaningful pass line. The score
# is a SIGNAL, not a gate to optimise a skill toward (Goodhart). agent stays 85 (agent path was
# recalibrated + verified separately in §4, untouched here). pipeline/command are ALSO leaned
# (their theatre checks moved too) and likely want the same drop when next graded — flagged.
TYPE_THRESHOLDS = {
    'skill': 75,
    'agent': 85,
    'pipeline': 85,
    'command': 80,
}

UK_ENGLISH_PAIRS = [
    ('color', 'colour'),
    ('behavior', 'behaviour'),
    ('center', 'centre'),
    ('organization', 'organisation'),
    ('optimize', 'optimise'),
    ('analyze', 'analyse'),
    ('dialog', 'dialogue'),
    ('canceled', 'cancelled'),
    ('gray', 'grey'),
    ('traveling', 'travelling'),
    ('favor', 'favour'),
    ('realize', 'realise'),
    ('specialized', 'specialised'),
]

CSS_PROPERTY_EXCEPTIONS = {'color', 'background-color', 'border-color'}

STATUS_PASS = '✓'
STATUS_FAIL = '✗'
STATUS_WARN = '△'


# ─────────────────────────────────────────────
# Data structures
# ─────────────────────────────────────────────
@dataclass
class CheckResult:
    id: str
    tier: str
    passed: bool
    message: str
    fix_hint: str = ''
    line_number: Optional[int] = None
    fixable: bool = False


@dataclass
class Check:
    id: str
    tier: str
    artifact_types: list  # list of strings: ["skill","agent","pipeline"] or ["*"]
    fixable: bool
    fn: Callable  # (context: dict) -> CheckResult


@dataclass
class ValidationContext:
    path: str
    artifact_type: str
    raw_content: str
    fm: dict
    body: str
    body_start: int
    content_lines: list
    body_lines: list
    skill_dir: str  # the directory being validated
    strict_intra_refs: bool = False  # escalate intra-skill ref warnings to failures


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def score_to_grade(pct: float) -> str:
    for threshold, grade in GRADE_MAP:
        if pct >= threshold:
            return grade
    return 'F'


def progress_bar(pct: float, width: int = 20) -> str:
    filled = round(pct / 100 * width)
    empty = width - filled
    return '█' * filled + '░' * empty


def parse_frontmatter(content: str) -> tuple:
    """Returns (fields_dict, body_text, body_start_line)."""
    lines = content.split('\n')
    if not lines or lines[0].strip() != '---':
        return {}, content, 0

    end_idx = None
    for i, line in enumerate(lines[1:], start=1):
        if line.strip() == '---':
            end_idx = i
            break

    if end_idx is None:
        return {}, content, 0

    fm_lines = lines[1:end_idx]
    body_lines = lines[end_idx + 1:]
    body_start_line = end_idx + 2

    fields = {}
    current_key = None
    multiline_buffer = []
    in_multiline = False

    for line in fm_lines:
        key_match = re.match(r'^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)', line)
        if key_match and not line.startswith(' ') and not line.startswith('\t'):
            if in_multiline and current_key is not None:
                fields[current_key] = ' '.join(multiline_buffer).strip()
                multiline_buffer = []
                in_multiline = False
            current_key = key_match.group(1)
            value = key_match.group(2).strip()
            if value in ('>', '|-', '>-', '|'):
                in_multiline = True
            elif value == '':
                fields[current_key] = ''
            else:
                fields[current_key] = value
                current_key = None
        elif in_multiline and (line.startswith('  ') or line.startswith('\t')):
            multiline_buffer.append(line.strip())
        else:
            if in_multiline and current_key is not None:
                fields[current_key] = ' '.join(multiline_buffer).strip()
                multiline_buffer = []
                in_multiline = False
                current_key = None

    if in_multiline and current_key is not None:
        fields[current_key] = ' '.join(multiline_buffer).strip()

    body = '\n'.join(body_lines)
    return fields, body, body_start_line


def detect_artifact_type(path: str, raw_content: str, fm: dict) -> str:
    """Auto-detect whether path is a skill, agent, pipeline, or command."""
    normalised = path.replace('\\', '/')

    # Explicit frontmatter type wins for pipeline detection
    if fm.get('type', '').strip().lower() == 'pipeline':
        return 'pipeline'

    # Path-based: commands directory → command
    if '/commands/' in normalised:
        return 'command'

    # Path-based: if /agents/ in path OR it's a single .md file in an agents dir → agent
    if '/agents/' in normalised:
        return 'agent'

    # If it's a directory with SKILL.md → skill (default)
    return 'skill'


def is_in_code_block(lines: list, target_idx: int) -> bool:
    """Check if a line index (0-based) is inside a fenced code block."""
    in_block = False
    for i, line in enumerate(lines):
        if i == target_idx:
            return in_block
        if line.strip().startswith('```'):
            in_block = not in_block
    return False


# ─────────────────────────────────────────────
# ── UNIVERSAL CHECKS (all artifact types) ────
# ─────────────────────────────────────────────

def check_name_present(ctx: ValidationContext) -> CheckResult:
    has_name = bool(ctx.fm.get('name', '').strip())
    return CheckResult(
        id='fatal_name_present', tier='FATAL', passed=has_name,
        message='name field present in YAML frontmatter' if has_name else 'Missing name field in YAML frontmatter',
        fix_hint='Add: name: your-artefact-name to frontmatter',
        line_number=1 if not has_name else None,
    )


def check_description_present(ctx: ValidationContext) -> CheckResult:
    has_desc = bool(ctx.fm.get('description', '').strip())
    return CheckResult(
        id='fatal_description_present', tier='FATAL', passed=has_desc,
        message='description field present in YAML frontmatter' if has_desc else 'Missing description field in YAML frontmatter',
        fix_hint='Add a description field to frontmatter',
        line_number=1 if not has_desc else None,
    )


def check_name_format(ctx: ValidationContext) -> CheckResult:
    name_val = ctx.fm.get('name', '')
    name_valid = bool(re.match(r'^[a-z][a-z0-9-]{0,63}$', name_val)) if name_val else False
    return CheckResult(
        id='fatal_name_format', tier='FATAL', passed=name_valid,
        message=f'name "{name_val}" is lowercase-hyphen and ≤ 64 chars' if name_valid
                else f'name "{name_val}" is not lowercase-hyphen format or exceeds 64 chars',
        fix_hint='Use only lowercase letters, digits, and hyphens. Max 64 characters.',
        line_number=2 if not name_valid else None,
    )


def check_desc_third_person(ctx: ValidationContext) -> CheckResult:
    desc_val = ctx.fm.get('description', '')
    second_person_patterns = [
        r'(?i)^\s*use when',
        r'(?i)^\s*use this when',
        r'(?i)^\s*you should use',
        r'(?i)^\s*invoke when',
        r'(?i)^\s*trigger when',
    ]
    desc_second_person = any(re.search(p, desc_val) for p in second_person_patterns)
    return CheckResult(
        id='fatal_desc_third_person', tier='FATAL', passed=not desc_second_person,
        message='Description uses third-person voice' if not desc_second_person
                else 'Description uses second-person voice ("Use when..." style)',
        fix_hint='Rewrite as: "This skill should be used when..."',
        line_number=2 if desc_second_person else None,
    )


def check_negative_routing_desc(ctx: ValidationContext) -> CheckResult:
    desc_val = ctx.fm.get('description', '')
    has_neg = bool(re.search(r'(?i)do not (invoke|use|trigger)|do NOT (invoke|use|trigger)', desc_val))
    return CheckResult(
        id='fatal_negative_routing_desc', tier='FATAL', passed=has_neg,
        message='Description contains negative routing' if has_neg
                else 'Description missing negative routing ("Do NOT invoke for:")',
        fix_hint='Add: "Do NOT invoke for: [list alternatives with skill names]" to description',
        line_number=2 if not has_neg else None,
    )


def check_when_not_to_use(ctx: ValidationContext) -> CheckResult:
    has_when_not = bool(re.search(r'(?i)when not to use', ctx.body))
    return CheckResult(
        id='fatal_when_not_to_use', tier='FATAL', passed=has_when_not,
        message='"When NOT to use" section present' if has_when_not
                else 'Missing "When NOT to use" section in body',
        fix_hint='Add a "## When NOT to use" or "**When NOT to use:**" section listing 2-3 alternative skills',
    )


def check_no_hardcoded_paths(ctx: ValidationContext) -> CheckResult:
    hardcoded_lines = []
    in_code_block = False
    for idx, line in enumerate(ctx.content_lines, start=1):
        stripped = line.strip()
        if stripped.startswith('```'):
            in_code_block = not in_code_block
        if not in_code_block:
            if re.search(r'[A-Za-z]:\\', line):
                if not re.match(r'\s*(#|//|<!--)', stripped):
                    hardcoded_lines.append(idx)
    return CheckResult(
        id='fatal_no_hardcoded_paths', tier='FATAL', passed=not hardcoded_lines,
        message='No hardcoded Windows paths outside code comments' if not hardcoded_lines
                else f'Hardcoded Windows paths found outside code comments (lines: {hardcoded_lines[:3]})',
        fix_hint='Remove or move Windows-specific paths into code block comments only',
        line_number=hardcoded_lines[0] if hardcoded_lines else None,
    )


def check_no_platforms_field(ctx: ValidationContext) -> CheckResult:
    has_platforms = 'platforms' in ctx.fm
    return CheckResult(
        id='fatal_no_platforms_field', tier='FATAL', passed=not has_platforms,
        message='No "platforms:" field (correctly absent)' if not has_platforms
                else '"platforms:" field found in frontmatter — not a valid CC frontmatter attribute',
        fix_hint='Remove the platforms: field from YAML frontmatter entirely (--fix can remove it)',
        line_number=2 if has_platforms else None,
        fixable=True,
    )


def check_body_line_limit(ctx: ValidationContext) -> CheckResult:
    total = len(ctx.body_lines)
    passed = total <= 500
    return CheckResult(
        id='fatal_body_line_limit', tier='FATAL', passed=passed,
        message=f'Body is {total} lines (under 500 limit)' if passed
                else f'Body is {total} lines — exceeds 500 line limit',
        fix_hint='Move detailed content to references/, scripts/, or assets/ directories.',
    )


def check_goal_section(ctx: ValidationContext) -> CheckResult:
    has_goal = bool(re.search(r'(?im)^#+\s*Goal\b', ctx.body))
    return CheckResult(
        id='quality_goal_section', tier='QUALITY', passed=has_goal,
        message='"## Goal" section present' if has_goal else 'Missing "## Goal" section',
        fix_hint='Add: ## Goal\n[One-sentence user outcome] (--fix can add skeleton)',
        fixable=True,
    )


def check_common_mistakes(ctx: ValidationContext) -> CheckResult:
    has_mistakes = bool(re.search(r'(?im)^#+\s*Common Mistakes', ctx.body))
    return CheckResult(
        id='quality_common_mistakes', tier='QUALITY', passed=has_mistakes,
        message='"## Common Mistakes" section present' if has_mistakes else 'Missing "## Common Mistakes" table',
        fix_hint='Add: ## Common Mistakes\n| Mistake | Fix | (--fix can add skeleton)',
        fixable=True,
    )


def check_imperative_voice(ctx: ValidationContext) -> CheckResult:
    second_person_lines = []
    for idx, line in enumerate(ctx.body_lines, start=ctx.body_start):
        if re.search(r'\byou should\b|\byou need to\b|\byou can\b|\byou must\b|\byou will\b', line, re.I):
            if not re.search(r'\|\s*you', line, re.I):
                second_person_lines.append(idx)
    passed = len(second_person_lines) == 0
    return CheckResult(
        id='quality_imperative_voice', tier='QUALITY', passed=passed,
        message='Body uses imperative voice (no second-person)' if passed
                else f'Body uses second-person voice on {len(second_person_lines)} line(s) (first: line {second_person_lines[0]})',
        fix_hint='Replace "you should X" with "X" (imperative). Replace "you need to X" with "X".',
        line_number=second_person_lines[0] if second_person_lines else None,
    )


def check_references_dir(ctx: ValidationContext) -> CheckResult:
    references_dir = os.path.join(ctx.skill_dir, 'references')
    has_dir = os.path.isdir(references_dir)
    has_md = False
    if has_dir:
        has_md = any(f.endswith('.md') for f in os.listdir(references_dir))
    passed = has_dir and has_md
    return CheckResult(
        id='quality_references_dir', tier='QUALITY', passed=passed,
        message='references/ directory exists with at least one .md file' if passed
                else ('references/ directory exists but contains no .md files' if has_dir else 'No references/ directory found'),
        fix_hint='Create references/ directory and add supporting .md files (e.g. worked examples or a rubric)',
    )


def check_hard_gate(ctx: ValidationContext) -> CheckResult:
    has_gate = bool(re.search(r'(?i)(HARD GATE|hard-gate|gap-analysis|skillscore.*gate|gate.*skillscore)', ctx.body))
    return CheckResult(
        id='quality_hard_gate', tier='QUALITY', passed=has_gate,
        message='HARD GATE tags or gate references present' if has_gate
                else 'No HARD GATE tags found',
        fix_hint='Add "**HARD GATE:**" markers at critical decision points, or reference gap-analysis/skillscore as automated gates',
    )


def check_numbered_stages(ctx: ValidationContext) -> CheckResult:
    has_stages = bool(re.search(r'(?im)^###\s+(Stage|Step|Phase)\s+\d+|^#+\s+Stage\s+\d+|^#+\s+Step\s+\d+', ctx.body))
    return CheckResult(
        id='quality_numbered_stages', tier='QUALITY', passed=has_stages,
        message='Process stages are clearly numbered (### Stage X or ### Step X)' if has_stages
                else 'No numbered process stages found',
        fix_hint='Structure the process as: ### Stage 0 — Name, ### Stage 1 — Name, etc.',
    )


def check_specific_alternatives(ctx: ValidationContext) -> CheckResult:
    when_not_match = re.search(r'(?i)(when not to use.*?)(?=^#+\s|\Z)', ctx.body, re.DOTALL | re.MULTILINE)
    has_specific = False
    if when_not_match:
        text = when_not_match.group(0)
        has_specific = bool(re.search(r'(`[a-z][a-z0-9-]*`|/[a-z][a-z0-9-]+|\buse\s+[a-z-]+\s+skill\b)', text, re.I))
    return CheckResult(
        id='quality_specific_alternatives', tier='QUALITY', passed=has_specific,
        message='"When NOT to use" section names specific alternative skills' if has_specific
                else '"When NOT to use" section does not name specific alternative skills',
        fix_hint='Name specific skills: e.g. "use `gap-analysis` instead" or "use `/review` for..."',
    )


def check_scripts_dir(ctx: ValidationContext) -> CheckResult:
    scripts_dir = os.path.join(ctx.skill_dir, 'scripts')
    has_scripts = os.path.isdir(scripts_dir)
    return CheckResult(
        id='arch_scripts_dir', tier='ARCHITECTURE', passed=has_scripts,
        message='scripts/ directory present' if has_scripts else 'No scripts/ directory',
        fix_hint='Add scripts/ for reusable validation utilities',
    )


# ── Intra-skill file reference walker ────────

INTRA_REF_SCAN_DIRS = ('references', 'scripts', 'hooks')
INTRA_REF_MAX_HOPS = 3
INTRA_REF_SCAN_EXTENSIONS = ('.md', '.py', '.sh', '.js', '.json', '.txt', '.yml', '.yaml')
INTRA_REF_IGNORE_DIRECTIVE = re.compile(
    r'<!--\s*sgs-skillscore:\s*ignore\s+([^\s][^>]*?)\s*-->', re.IGNORECASE
)


def _extract_file_references(content: str, base_dir: str) -> set:
    """Extract file paths referenced from content that live under base_dir.

    Looks for markdown links, bash command paths, bare relative paths, and
    quoted paths. Returns absolute paths (case-preserved on Windows)."""
    refs = set()
    base_norm = os.path.abspath(base_dir).replace('\\', '/').rstrip('/')
    # Patterns that capture plausible file references
    patterns = [
        r'\]\(([^)]+)\)',                       # markdown [text](path)
        r'`([^`\s]+\.[a-zA-Z0-9]{1,6})`',       # `file.ext`
        r'"([^"\n]+\.[a-zA-Z0-9]{1,6})"',       # "file.ext"
        r"'([^'\n]+\.[a-zA-Z0-9]{1,6})'",       # 'file.ext'
        r'(?<![a-zA-Z0-9_/])((?:references|scripts|hooks)/[^\s)`"\']+)',  # bare references/foo
    ]
    for pat in patterns:
        for m in re.finditer(pat, content):
            raw = m.group(1).strip()
            if not raw:
                continue
            # Strip fragment/query
            raw = raw.split('#', 1)[0].split('?', 1)[0]
            if not raw or raw.startswith(('http://', 'https://', 'mailto:')):
                continue
            # Resolve relative to base_dir
            if os.path.isabs(raw):
                candidate = raw
            else:
                candidate = os.path.normpath(os.path.join(base_dir, raw))
            candidate_norm = os.path.abspath(candidate).replace('\\', '/')
            if candidate_norm.startswith(base_norm + '/'):
                refs.add(candidate_norm)
    return refs


def _walk_scan_dirs(skill_dir: str) -> set:
    """Return every file under skill_dir/references, /scripts, /hooks with a
    scannable extension (absolute paths, forward slashes)."""
    skill_norm = os.path.abspath(skill_dir).replace('\\', '/')
    all_files = set()
    for sub in INTRA_REF_SCAN_DIRS:
        sub_dir = os.path.join(skill_dir, sub)
        if not os.path.isdir(sub_dir):
            continue
        for root, _, files in os.walk(sub_dir):
            for name in files:
                full = os.path.abspath(os.path.join(root, name)).replace('\\', '/')
                # Restrict to sane extensions to avoid binary noise
                if os.path.splitext(name)[1].lower() in INTRA_REF_SCAN_EXTENSIONS:
                    all_files.add(full)
    return all_files


def _collect_ignored(skill_md_content: str, skill_dir: str) -> set:
    """Collect files whitelisted via <!-- sgs-skillscore: ignore foo --> directives."""
    ignored = set()
    base_norm = os.path.abspath(skill_dir).replace('\\', '/').rstrip('/')
    for m in INTRA_REF_IGNORE_DIRECTIVE.finditer(skill_md_content):
        raw = m.group(1).strip()
        for token in raw.split():
            candidate = os.path.normpath(os.path.join(skill_dir, token))
            ignored.add(os.path.abspath(candidate).replace('\\', '/'))
            _ = base_norm  # retained for consistent naming
    return ignored


def _write_warn_snapshot(skill_name: str, skill_dir: str, unreached: list) -> None:
    """Append warn-mode findings to the daily health snapshot file.

    Silent — a snapshot write failure must never break validation."""
    if not unreached:
        return
    try:
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        snap_dir = Path.home() / '.claude' / 'gap-analysis'
        snap_dir.mkdir(parents=True, exist_ok=True)
        snap_path = snap_dir / f'intra-skill-ref-warnings-{today}.md'
        header_needed = not snap_path.exists()
        with open(snap_path, 'a', encoding='utf-8') as fh:
            if header_needed:
                fh.write(f'# Intra-skill file reference warnings — {today}\n\n')
                fh.write(
                    'Files under references/, scripts/, or hooks/ that are not '
                    'reachable from SKILL.md within '
                    f'{INTRA_REF_MAX_HOPS} hops. Warn-mode only — run with '
                    '`--strict-intra-refs` to escalate to failures.\n\n'
                )
            fh.write(f'## {skill_name}\n')
            fh.write(f'- path: `{skill_dir}`\n')
            fh.write(f'- timestamp: {datetime.now(timezone.utc).isoformat()}\n')
            fh.write(f'- unreached ({len(unreached)}):\n')
            for p in unreached:
                fh.write(f'  - `{p}`\n')
            fh.write('\n')
    except OSError:
        pass


def check_intra_skill_file_references(ctx: ValidationContext) -> CheckResult:
    """Walk the skill's references/scripts/hooks trees and report any file
    that cannot be reached from SKILL.md within 3 hops of link-following.

    Warn-mode by default: findings are reported in the check message and
    written to a daily snapshot file, but the check passes. Set
    `strict_intra_refs=True` on the context (via --strict-intra-refs) to
    escalate findings into a hard failure."""
    skill_dir = ctx.skill_dir
    if not os.path.isdir(skill_dir):
        return CheckResult(
            id='quality_intra_skill_refs', tier='QUALITY', passed=True,
            message='Skill dir not accessible — intra-ref check skipped',
        )

    all_files = _walk_scan_dirs(skill_dir)
    if not all_files:
        return CheckResult(
            id='quality_intra_skill_refs', tier='QUALITY', passed=True,
            message='No references/scripts/hooks subdirectories to scan',
        )

    ignored = _collect_ignored(ctx.raw_content, skill_dir)

    # BFS from SKILL.md with 3-hop depth cap
    visited = set()
    frontier = [(ctx.path.replace('\\', '/'), 0)]
    while frontier:
        current, depth = frontier.pop(0)
        if current in visited:
            continue
        visited.add(current)
        if depth >= INTRA_REF_MAX_HOPS:
            continue
        # Only recurse through markdown and text-like sources
        ext = os.path.splitext(current)[1].lower()
        if ext not in ('.md', '.txt', '.sh', '.py', '.js', '.json'):
            continue
        try:
            with open(current, 'r', encoding='utf-8', errors='replace') as fh:
                content = fh.read()
        except OSError:
            continue
        refs = _extract_file_references(content, skill_dir)
        for r in refs:
            if r not in visited:
                frontier.append((r, depth + 1))

    unreached = sorted(
        f for f in all_files
        if f not in visited and f not in ignored
    )

    if not unreached:
        return CheckResult(
            id='quality_intra_skill_refs', tier='QUALITY', passed=True,
            message=f'All {len(all_files)} files under references/scripts/hooks reachable from SKILL.md',
        )

    skill_name = os.path.basename(skill_dir.rstrip('/').rstrip('\\'))
    _write_warn_snapshot(skill_name, skill_dir, unreached)

    preview = ', '.join(os.path.relpath(p, skill_dir).replace('\\', '/') for p in unreached[:3])
    more = f' (+{len(unreached) - 3} more)' if len(unreached) > 3 else ''
    msg_core = f'{len(unreached)} file(s) unreachable from SKILL.md: {preview}{more}'

    if ctx.strict_intra_refs:
        return CheckResult(
            id='quality_intra_skill_refs', tier='QUALITY', passed=False,
            message=f'STRICT: {msg_core}',
            fix_hint='Reference these files from SKILL.md or delete them. '
                     'Use <!-- sgs-skillscore: ignore path/to/file --> to whitelist intentional orphans.',
        )
    return CheckResult(
        id='quality_intra_skill_refs', tier='QUALITY', passed=True,
        message=f'WARN: {msg_core} (warn-mode; pass --strict-intra-refs to fail)',
        fix_hint='Reference these files from SKILL.md. Daily snapshot logged to ~/.claude/gap-analysis/intra-skill-ref-warnings-YYYY-MM-DD.md',
    )


def check_shared_references(ctx: ValidationContext) -> CheckResult:
    has_ref = bool(re.search(r'(?i)(shared-references|shared_references)', ctx.body))
    # Also check for symlink in references/
    shared_ref_symlink = False
    references_dir = os.path.join(ctx.skill_dir, 'references')
    if os.path.isdir(references_dir):
        for item in os.listdir(references_dir):
            item_path = os.path.join(references_dir, item)
            if os.path.islink(item_path):
                target = os.readlink(item_path)
                if 'shared-references' in target or 'shared_references' in target:
                    shared_ref_symlink = True
    passed = has_ref or shared_ref_symlink
    return CheckResult(
        id='arch_shared_references', tier='ARCHITECTURE', passed=passed,
        message='References shared-references (by mention or symlink)' if passed
                else 'No reference to shared-references found',
        fix_hint='Add a symlink in references/ pointing to shared-references/, or mention it explicitly',
    )


def check_body_concise(ctx: ValidationContext) -> CheckResult:
    total = len(ctx.body_lines)
    passed = total <= 300
    return CheckResult(
        id='arch_body_concise', tier='ARCHITECTURE', passed=passed,
        message=f'Body is concise ({total} lines, under 300 working budget)' if passed
                else f'Body is {total} lines (over 300 working budget — consider progressive disclosure)',
        fix_hint='Move detailed content to references/ and keep SKILL.md as a thin orchestration layer',
    )


def check_process_summary(ctx: ValidationContext) -> CheckResult:
    has_flowchart = bool(re.search(
        r'(?i)(```dot|```mermaid|\*\*Stages:\*\*|\*\*Process:\*\*|→.*→|Stage \d+.*→)', ctx.body
    ))
    return CheckResult(
        id='arch_process_summary', tier='ARCHITECTURE', passed=has_flowchart,
        message='Process summary or flowchart present' if has_flowchart
                else 'No process summary or flowchart found',
        fix_hint='Add **Stages:** READ → PLAN → BUILD → VERIFY or a ```mermaid``` flowchart',
    )


def check_skill_type_classification(ctx: ValidationContext) -> CheckResult:
    has_type = bool(re.search(r'(?i)\b(technique|pattern|reference|discipline|pipeline|router)\b', ctx.body))
    return CheckResult(
        id='arch_skill_type', tier='ARCHITECTURE', passed=has_type,
        message='Skill type classification present' if has_type
                else 'No skill type classification found (technique/pattern/reference/discipline/pipeline/router)',
        fix_hint='Add a line: **Type:** Pipeline (or Technique, Pattern, Reference, Discipline, Router)',
    )


def check_system_effect_declared(ctx: ValidationContext) -> CheckResult:
    """Quality check: skills must document their system effect via the 6-lens check.

    Structural check only - does NOT judge lens content. That's gap-analysis's job.

    Pass condition: SKILL.md body mentions at least 4 of the 6 lens keywords, OR
    has an explicit "System Effect" / "6-Lens" / "5-Lens" section heading (5-lens
    sections remain accepted for back-compat — the new values_alignment lens is additive).

    Lens keywords (fuzzy): end-result, cross-context / cross-session / subagent / Claude Code,
    source of truth / persistence layer, hook / scheduled routine / script / cron,
    ADHD / overwhelm / cognitive load, values_alignment / USP / TA-serving / % impact.

    Exempt: non-skill artifacts + skills explicitly marked simple formatter/generator.
    Lens 6 (values_alignment) added 2026-04-18 — see
    C:/Users/Bean/.claude/memory/learning/2026-04-18-motivation-purpose-sixth-lens.md
    and the 5-lens base at 2026-04-16-skill-evaluation-5-lens-check.md.
    """
    if ctx.artifact_type != 'skill':
        return CheckResult(
            id='quality_system_effect_declared', tier='QUALITY', passed=True,
            message='N/A for non-skill artifact', fix_hint='',
        )
    # Exempt simple formatter/generator skills (same heuristic as self-orchestration)
    applicable_signals = r'(?i)\b(analyse|analyze|validate|research|audit|grade|review|lifecycle|investigate|inspect|route|orchestrate|capture|persist|sync)\b'
    body_and_desc = ctx.fm.get('description', '') + ' ' + ctx.body
    if not re.search(applicable_signals, body_and_desc):
        return CheckResult(
            id='quality_system_effect_declared', tier='QUALITY', passed=True,
            message='Skill exempt from 6-lens check (simple formatter/generator)',
            fix_hint='',
        )
    # Explicit section wins (unambiguous declaration). Accept 5-lens headings for back-compat.
    if re.search(r'(?i)^#{1,6}\s*(6[-\s]?lens|six[-\s]?lens|5[-\s]?lens|five[-\s]?lens|system\s*effect)\b', ctx.body, re.MULTILINE):
        return CheckResult(
            id='quality_system_effect_declared', tier='QUALITY', passed=True,
            message='6-lens check declared (section heading found)',
            fix_hint='',
        )
    # Otherwise require 4+ lens keyword categories mentioned (scaled with new lens count)
    lens_patterns = [
        (r'(?i)\b(cross[-\s]context|cross[-\s]session|cold\s+subagent|subagents?|both\s+surfaces|headless)\b', 'cross-context reach'),
        # The persistence lens is keyed on generic persistence vocabulary.
        (r'(?i)\b(source\s+of\s+truth|persistence\s+layer)\b', 'persistence layer'),
        (r'(?i)\b(automation[-\s]?engine|auto[-\s]?engine|scheduled\s+(?:flow|routine|task)|reconcile\s+flow|cron|hook)\b', 'automation vs remember'),
        (r'(?i)\b(adhd|overwhelm|cognitive\s+load|attention\s+tax)\b', 'ADHD / overwhelm'),
        (r'(?i)\b(end[-\s]?result|outcome\s+driven|compounds?\s+to)\b', 'end-result'),
        (r'(?i)(?:\b(values.?alignment|motivation|meaning[-\s]decay|top\s+usp|ta[-\s]serving|percent\s+impact|selling\s+point|why\s+it\s+matters|disengagement|purpose)\b|(?<![a-zA-Z])%\s*impact\b)', 'values_alignment'),
    ]
    hits = [name for pat, name in lens_patterns if re.search(pat, ctx.body)]
    if len(hits) >= 4:
        return CheckResult(
            id='quality_system_effect_declared', tier='QUALITY', passed=True,
            message=f'6-lens coverage via keywords: {", ".join(hits)}',
            fix_hint='',
        )
    missing = [name for pat, name in lens_patterns if re.search(pat, ctx.body) is None]
    return CheckResult(
        id='quality_system_effect_declared', tier='QUALITY', passed=False,
        message=f'Skill does not declare system effect (only {len(hits)}/6 lenses mentioned)',
        fix_hint=(
            'Add a "## System Effect" or "## 6-Lens Check" section that traces this skill through: '
            'end-result, cross-context reach, persistence layer, automation vs human-remember, '
            'ADHD / overwhelm, values_alignment (top USP + TA-serving next action + % impact). '
            'Structural check only - gap-analysis judges content. '
            'Missing lenses: ' + ', '.join(missing[:3])
        ),
    )


def check_skill_self_orchestration(ctx: ValidationContext) -> CheckResult:
    """Quality check (CC v2.1.108+): analytical / validation / research / lifecycle
    skills should declare which other skills they invoke mid-execution (via the Skill
    tool), or explicitly state they invoke none. Simple formatters / generators are exempt.

    Heuristic for applicability: the SKILL.md mentions analyse / validate / research /
    audit / grade / review / lifecycle in the description or body. Otherwise N/A.
    """
    if ctx.artifact_type != 'skill':
        return CheckResult(
            id='quality_self_orchestration', tier='QUALITY', passed=True,
            message='N/A for non-skill artifact', fix_hint='',
        )
    applicable_signals = r'(?i)\b(analyse|analyze|validate|research|audit|grade|review|lifecycle|investigate|inspect|route|orchestrate)\b'
    if not re.search(applicable_signals, ctx.fm.get('description', '') + ' ' + ctx.body):
        return CheckResult(
            id='quality_self_orchestration', tier='QUALITY', passed=True,
            message='Skill type exempt from self-orchestration check (simple formatter/generator)',
            fix_hint='',
        )
    invocation_signals = [
        r'invokes?\s+/',
        r'calls?\s+/',
        r'runs?\s+/',
        r'delegates?\s+to\s+/',
        r'chains?\s+/',
        r'via\s+the\s+Skill\s+tool',
        r'self[-\s]orchestrat',
        r'invokes?\s+no\s+other\s+skills',
        r'invokes?\s+none',
        r'standalone\s+(skill|only)',
        r'does\s+not\s+invoke',
    ]
    declares = any(re.search(p, ctx.body, re.IGNORECASE) for p in invocation_signals)
    if declares:
        return CheckResult(
            id='quality_self_orchestration', tier='QUALITY', passed=True,
            message='Skill declares mid-execution skill invocations (or explicit none)',
            fix_hint='',
        )
    return CheckResult(
        id='quality_self_orchestration', tier='QUALITY', passed=False,
        message='Analytical/validation/research/lifecycle skill does not declare which skills it invokes',
        fix_hint='Add a section listing invoked skills (e.g. "Invokes /research-check mid-execution when ...") '
                 'or state "Invokes no other skills" if standalone. See SSB Phase 1 design principle.',
    )


def check_no_magic_numbers(ctx: ValidationContext) -> CheckResult:
    magic_lines = []
    in_code = False
    for idx, line in enumerate(ctx.content_lines, start=1):
        stripped = line.strip()
        if stripped.startswith('```'):
            in_code = not in_code
        if not in_code:
            if re.search(r'(?<![/\.\w])\b[1-9][0-9]{2,}\b(?![%\.\w/])', line):
                if not re.search(r'(?i)(max|min|limit|line|version|v\d|%|\d+\s*(lines|files|hours|days|ms|min|sec|kb|mb|gb))', line):
                    magic_lines.append(idx)
    passed = len(magic_lines) <= 2
    return CheckResult(
        id='hygiene_no_magic_numbers', tier='HYGIENE', passed=passed,
        message='No unexplained magic numbers' if passed
                else f'Potential unexplained magic numbers on {len(magic_lines)} line(s) (first: {magic_lines[0]})',
        fix_hint='Replace bare numbers with named constants or add inline explanations',
        line_number=magic_lines[0] if magic_lines else None,
    )


def check_uk_english(ctx: ValidationContext) -> CheckResult:
    us_lines = []
    in_code = False
    for idx, line in enumerate(ctx.content_lines, start=1):
        stripped = line.strip()
        if stripped.startswith('```'):
            in_code = not in_code
        if not in_code:
            for us, uk in UK_ENGLISH_PAIRS:
                if us in CSS_PROPERTY_EXCEPTIONS:
                    continue
                pattern = r'(?<![a-zA-Z_-])' + us + r'(?![a-zA-Z_-])'
                if re.search(pattern, line, re.I):
                    us_lines.append((idx, us, uk))
                    break
    passed = len(us_lines) == 0
    return CheckResult(
        id='hygiene_uk_english', tier='HYGIENE', passed=passed,
        message='UK English throughout' if passed
                else f'US English spellings found on {len(us_lines)} line(s) '
                     f'(e.g. line {us_lines[0][0]}: "{us_lines[0][1]}" → "{us_lines[0][2]}")',
        fix_hint='Replace US spellings: colour not color, behaviour not behavior, etc. (--fix can apply)',
        line_number=us_lines[0][0] if us_lines else None,
        fixable=True,
    )


def check_bash_error_handling(ctx: ValidationContext) -> CheckResult:
    bad_blocks = []
    in_bash = False
    bash_start = 0
    bash_lines = []
    for idx, line in enumerate(ctx.content_lines, start=1):
        stripped = line.strip()
        fence = re.match(r'^```(\w*)', stripped)
        if fence:
            if not in_bash:
                lang = fence.group(1).lower()
                if lang in ('bash', 'sh', 'shell', 'zsh'):
                    in_bash = True
                    bash_start = idx
                    bash_lines = []
            else:
                if in_bash and len(bash_lines) > 2:
                    block_text = '\n'.join(bash_lines)
                    has_handling = bool(re.search(
                        r'(\|\|\s*(echo|exit|true|false)|&&\s*echo|set -e|set -o|2>&1|2>/dev|'
                        r'if\s+\[|if \[\[|\$\?|trap\s+|exit\s+[01])',
                        block_text
                    ))
                    if not has_handling:
                        bad_blocks.append(bash_start)
                in_bash = False
                bash_lines = []
        elif in_bash:
            bash_lines.append(line)
    passed = len(bad_blocks) <= 1
    return CheckResult(
        id='hygiene_bash_error_handling', tier='HYGIENE', passed=passed,
        message='Bash code blocks have error handling' if passed
                else f'{len(bad_blocks)} bash block(s) lack error handling (first at line {bad_blocks[0]})',
        fix_hint='Add: || echo "ERROR: ..." to commands, or use "set -e" at block start',
        line_number=bad_blocks[0] if bad_blocks else None,
    )


def check_no_bare_todos(ctx: ValidationContext) -> CheckResult:
    todo_lines = []
    for idx, line in enumerate(ctx.content_lines, start=1):
        # Ignore TODO/FIXME inside inline-code spans (`...`) — a doc mentioning
        # "no `TODO` placeholders" is talking ABOUT todos, not leaving one.
        line_scan = re.sub(r'`[^`]*`', '', line)
        if re.search(r'\b(TODO|FIXME)\b', line_scan):
            if not re.search(r'\b(TODO|FIXME)\b\s*[:(\[]', line_scan):
                todo_lines.append(idx)
    passed = len(todo_lines) == 0
    return CheckResult(
        id='hygiene_no_bare_todos', tier='HYGIENE', passed=passed,
        message='No bare TODO/FIXME comments' if passed
                else f'Bare TODO/FIXME found on line(s) {todo_lines[:3]} (no explanation)',
        fix_hint='Add explanation: TODO(reason): what needs doing, or remove if resolved',
        line_number=todo_lines[0] if todo_lines else None,
    )


def check_lf_endings(ctx: ValidationContext) -> CheckResult:
    has_crlf = '\r' in ctx.raw_content
    return CheckResult(
        id='hygiene_lf_endings', tier='HYGIENE', passed=not has_crlf,
        message='LF line endings throughout' if not has_crlf else 'CRLF line endings detected (Windows \\r\\n)',
        fix_hint='Convert to LF endings (--fix can apply automatically)',
        fixable=True,
    )


# ─────────────────────────────────────────────
# ── AGENT-ONLY CHECKS ────────────────────────
# ─────────────────────────────────────────────

VALID_MODELS = {'sonnet', 'opus', 'haiku', 'claude', 'claude-sonnet', 'claude-opus', 'claude-haiku'}


def check_agent_model_valid(ctx: ValidationContext) -> CheckResult:
    model = ctx.fm.get('model', '').strip().lower()
    # Accept any value containing sonnet/opus/haiku or starting with 'claude'
    passed = bool(model) and any(kw in model for kw in ('sonnet', 'opus', 'haiku', 'claude'))
    return CheckResult(
        id='agent_model_valid', tier='FATAL', passed=passed,
        message=f'model field is valid ("{model}")' if passed
                else f'model field missing or invalid ("{model}") — must be sonnet/opus/haiku',
        fix_hint='Add to frontmatter: model: sonnet (or opus or haiku)',
    )


def check_agent_tools_present(ctx: ValidationContext) -> CheckResult:
    has_tools = bool(ctx.fm.get('tools', '').strip())
    return CheckResult(
        id='agent_tools_present', tier='FATAL', passed=has_tools,
        message='tools field present in frontmatter' if has_tools else 'tools field missing from frontmatter',
        fix_hint='Add to frontmatter: tools: Read, Glob, Grep (or appropriate tools)',
    )


def check_agent_tool_bloat(ctx: ValidationContext) -> CheckResult:
    """Every tool in frontmatter should be referenced somewhere in the body."""
    tools_str = ctx.fm.get('tools', '')
    if not tools_str.strip():
        return CheckResult(id='agent_tool_bloat', tier='QUALITY', passed=True,
                           message='No tools declared — skipping tool bloat check')
    # Core tools + MCP tools are described functionally in agent bodies (e.g. "take a
    # screenshot"), never named verbatim — exempt them from the bloat check.
    CORE_TOOLS = {'read', 'write', 'edit', 'glob', 'grep', 'bash', 'task', 'skill', 'webfetch', 'websearch'}
    tools = [t.strip() for t in tools_str.split(',') if t.strip()]
    body_lower = ctx.body.lower()
    unused = [
        t for t in tools
        if t.lower() not in body_lower
        and not t.lower().startswith('mcp__')
        and t.lower() not in CORE_TOOLS
    ]
    passed = len(unused) == 0
    return CheckResult(
        id='agent_tool_bloat', tier='QUALITY', passed=passed,
        message='All declared tools referenced in body' if passed
                else f'Tools declared but not referenced in body: {unused}',
        fix_hint='Either remove unused tools from frontmatter, or add usage examples/references in body',
    )


def check_agent_phantom_skills(ctx: ValidationContext) -> CheckResult:
    """Skills/agents *invoked* in the body that don't exist on disk.

    Only invocation-form references count as a skill/agent ref: a verb of invocation
    (use / invoke / delegate to / route to / call / run / via) followed by the name
    (optionally backtick- or slash-prefixed), or a bare `/slash-command` that is not a
    path segment. Bare backticked prose words (`robots`, `hero`, `transition`) are NOT
    invocations — flagging them produced pure false-positive noise (2026-07-17 fact-check).
    """
    # verb-of-invocation followed by a *backticked* name — the only reliable ref form.
    # Requiring the backtick drops bare-word noise ("using intentionally", "use write").
    invocation_re = re.compile(
        r'(?:\buse[sd]?\b|\busing\b|\binvoke[sd]?\b|\bdelegate[sd]?\s+to\b|'
        r'\broute[sd]?\s+to\b|\bcall[sed]?\b|\bruns?\b|\bvia\b)\s+`/?([a-z][a-z0-9-]{3,})`',
        re.IGNORECASE,
    )
    # /slash-command form, but not a path segment: reject when preceded by a path char
    # (~, ., word, /, or a backtick) so home-/relative paths (~/sgs-rollback-x.tar) and
    # backtick-glued "or" tokens (`constructEvent`/signature) don't match as commands.
    slash_re = re.compile(r'(?<![\w/~.`])/([a-z][a-z0-9-]{3,})(?![\w/-])')
    referenced_names = set(m.group(1).lower() for m in invocation_re.finditer(ctx.body))
    referenced_names.update(m.group(1).lower() for m in slash_re.finditer(ctx.body))

    # Glob actual skills AND agents on disk
    home = os.path.expanduser('~')
    skill_patterns = [
        os.path.join(home, '.agents', 'skills', '*', 'SKILL.md'),
        os.path.join(home, '.claude', 'skills', '*', 'SKILL.md'),
    ]
    agent_patterns = [
        os.path.join(home, '.claude', 'agents', '*.md'),
    ]
    # Agents legitimately reference slash-commands (e.g. /sgs-db, /wp-blocks) — resolve those too.
    command_patterns = [
        os.path.join(home, '.claude', 'commands', '*.md'),
    ]
    existing_artifacts = set()
    for pat in skill_patterns:
        for p in glob.glob(pat):
            existing_artifacts.add(os.path.basename(os.path.dirname(p)))
    for pat in agent_patterns + command_patterns:
        for p in glob.glob(pat):
            existing_artifacts.add(os.path.splitext(os.path.basename(p))[0])

    # Common vocabulary that appears in backticks but are not skill/agent references.
    # Covers: infrastructure words, sub-type labels, operation names, file extensions,
    # common English words in process descriptions, and CLI tool names.
    EXCLUDED_WORDS = {
        # Shell / code / format
        'bash', 'sh', 'code', 'json', 'yaml', 'md', 'api', 'url', 'id',
        'true', 'false', 'null', 'ok', 'yes', 'no', 'grep', 'curl', 'npm',
        'python', 'node', 'sed', 'echo', 'test', 'exit',
        # Built-in tool names (referenced as `Read`/`Write` etc. — tools, not skill refs)
        'read', 'write', 'edit', 'glob', 'task', 'fetch', 'webfetch', 'websearch',
        # Artifact type labels (used in tables and classifications)
        'skill', 'agent', 'pipeline', 'router', 'skills', 'agents',
        'pipelines', 'routers', 'writer', 'optimiser', 'auditor',
        # Sub-type labels
        'knowledge', 'passive', 'workflow',
        # Operation names
        'create', 'modify', 'merge', 'grade', 'assess', 'restructure',
        'deploy', 'verify', 'debug', 'abort', 'skip', 'skipped', 'retry',
        # Infrastructure paths and files
        'references', 'shared-references', 'hooks', 'scripts',
        'sgs-skillscore', 'anthropic-standards',
        'firecrawl', 'skill-md',
        # Common prose words appearing in backtick-formatted tables
        'text', 'file', 'files', 'list', 'table', 'path', 'query',
        'name', 'type', 'anchor', 'source', 'target', 'output', 'input',
        'stage', 'stages', 'score', 'threshold', 'dimension',
    }

    # Only flag names that: are >3 chars, not in existing artifacts, and not in exclusion set
    phantom = []
    for name in referenced_names:
        if len(name) > 3 and name not in existing_artifacts and name.lower() not in EXCLUDED_WORDS:
            phantom.append(name)

    passed = len(phantom) == 0
    return CheckResult(
        id='agent_phantom_skills', tier='QUALITY', passed=passed,
        message='All referenced skills exist on disk' if passed
                else f'Phantom skills referenced (not found on disk): {phantom[:5]}',
        fix_hint='Check skill names — they must match directory names in ~/.agents/skills/ or ~/.claude/skills/',
    )


def check_agent_body_length(ctx: ValidationContext) -> CheckResult:
    total = len(ctx.body_lines)
    passed = 50 <= total <= 200
    return CheckResult(
        id='agent_body_length', tier='QUALITY', passed=passed,
        message=f'Agent body is {total} lines (within 50-200 range)' if passed
                else f'Agent body is {total} lines (should be 50-200 lines)',
        fix_hint='Agents should be concise loadouts (50-200 lines). Move detailed methodology to skills.',
    )


def check_agent_scope_creep(ctx: ValidationContext) -> CheckResult:
    desc = ctx.fm.get('description', '')
    and_count = len(re.findall(r'\band\b', desc, re.I))
    passed = and_count < 5
    return CheckResult(
        id='agent_scope_creep', tier='QUALITY', passed=passed,
        message='Description scope is focused (fewer than 5 "and" clauses)' if passed
                else f'Description has {and_count} "and" clauses — possible scope creep',
        fix_hint='Split into multiple agents or narrow scope. Agents should do one thing well.',
    )


def check_agent_methodology_dupe(ctx: ValidationContext) -> CheckResult:
    """Agents shouldn't have numbered methodology steps — those belong in skills."""
    has_steps = bool(re.search(r'(?im)^###\s+(Step|Stage)\s+\d+', ctx.body))
    return CheckResult(
        id='agent_methodology_dupe', tier='ARCHITECTURE', passed=not has_steps,
        message='No numbered methodology steps (correct — methodology belongs in skills)' if not has_steps
                else 'Agent body contains numbered methodology steps (### Step N / ### Stage N)',
        fix_hint='Move methodology into a dedicated skill. Agents are loadouts, not processes.',
    )


# ─────────────────────────────────────────────
# ── PIPELINE-ONLY CHECKS ─────────────────────
# ─────────────────────────────────────────────

def check_pipeline_type_frontmatter(ctx: ValidationContext) -> CheckResult:
    has_type = ctx.fm.get('type', '').strip().lower() == 'pipeline'
    return CheckResult(
        id='pipeline_type_frontmatter', tier='FATAL', passed=has_type,
        message='frontmatter has type: pipeline' if has_type
                else 'frontmatter missing type: pipeline',
        fix_hint='Add to frontmatter: type: pipeline',
    )


def check_pipeline_stage_defs(ctx: ValidationContext) -> CheckResult:
    """Every ### Stage should mention Input, Process/What, and Output."""
    stage_matches = list(re.finditer(r'(?im)^###\s+Stage\s+\d+', ctx.body))
    if not stage_matches:
        return CheckResult(
            id='pipeline_stage_defs', tier='QUALITY', passed=False,
            message='No ### Stage N sections found in pipeline',
            fix_hint='Add: ### Stage 1 — Name with Input:, Process:, Output: under each',
        )
    # Get text between stages
    stage_texts = []
    body_lines_list = ctx.body.split('\n')
    for i, m in enumerate(stage_matches):
        start = m.start()
        end = stage_matches[i + 1].start() if i + 1 < len(stage_matches) else len(ctx.body)
        stage_texts.append(ctx.body[start:end])

    incomplete = []
    for i, text in enumerate(stage_texts):
        has_input = bool(re.search(r'(?i)\*\*input\*\*|input:', text))
        has_process = bool(re.search(r'(?i)\*\*process\*\*|\*\*what\*\*|process:|what:', text))
        has_output = bool(re.search(r'(?i)\*\*output\*\*|output:', text))
        if not (has_input and has_process and has_output):
            incomplete.append(i + 1)

    passed = len(incomplete) == 0
    return CheckResult(
        id='pipeline_stage_defs', tier='QUALITY', passed=passed,
        message='All pipeline stages have Input/Process/Output defined' if passed
                else f'Stage(s) {incomplete} missing Input, Process, or Output definition',
        fix_hint='Add **Input:**, **Process:**, **Output:** to each ### Stage section',
    )


def check_pipeline_kill_gate(ctx: ValidationContext) -> CheckResult:
    has_gate = bool(re.search(r'(?i)(abort|kill|fail|stop|terminate|cancel).*pipeline|pipeline.*(abort|kill|fail|stop)', ctx.body))
    # Also check for "Kill Gates" section
    has_gate = has_gate or bool(re.search(r'(?im)^#+\s*Kill\s+Gate', ctx.body))
    return CheckResult(
        id='pipeline_kill_gate', tier='QUALITY', passed=has_gate,
        message='Kill/abort condition present' if has_gate
                else 'No kill/abort condition found in pipeline',
        fix_hint='Add a ## Kill Gates section with: "If [condition]: abort pipeline, report [error type]"',
    )


def check_pipeline_state_tracking(ctx: ValidationContext) -> CheckResult:
    has_state = bool(re.search(r'(?i)\b(state|checkpoint|status|tracked|tracking)\b', ctx.body))
    return CheckResult(
        id='pipeline_state_tracking', tier='QUALITY', passed=has_state,
        message='Pipeline state tracking mentioned' if has_state
                else 'No state tracking mentioned in pipeline',
        fix_hint='Add: "Pipeline state tracked in: [location]" — e.g. a JSON file or dashboard field',
    )



def check_reference_db_provenance(ctx: ValidationContext) -> CheckResult:
    """For skills with data/*.csv reference files, every CSV must carry a Provenance column,
    and at least one scripts/ingest-*.py script must exist to document where rows came from.

    Embodies the rule: ingest reference data deterministically from authoritative sources;
    never LLM-generate citable rows. Captured as pattern_key
    `ingest-dont-generate-reference-db-rows` (2026-04-15).
    """
    import csv as _csv
    data_dir = os.path.join(ctx.skill_dir, 'data')
    if not os.path.isdir(data_dir):
        return CheckResult(
            id='arch_reference_db_provenance', tier='ARCHITECTURE',
            passed=True, message='No data/ directory -- check N/A', fix_hint='',
        )
    csv_files = []
    SKIP_DIRS = {'archive', 'archived', 'backup', 'old', '_old'}
    for root, dirs, files in os.walk(data_dir):
        # Mutate dirs in-place so os.walk skips them
        dirs[:] = [d for d in dirs if d.lower() not in SKIP_DIRS and not d.startswith('_')]
        for f in files:
            if f.endswith('.csv'):
                csv_files.append(os.path.join(root, f))
    if not csv_files:
        return CheckResult(
            id='arch_reference_db_provenance', tier='ARCHITECTURE',
            passed=True, message='No CSVs in data/ -- check N/A', fix_hint='',
        )
    # Check 1: every CSV has Provenance column
    missing_prov = []
    for cf in csv_files:
        try:
            with open(cf, encoding='utf-8') as fh:
                header = next(_csv.reader(fh), [])
                if 'Provenance' not in header and 'provenance' not in header:
                    missing_prov.append(os.path.basename(cf))
        except (OSError, StopIteration):
            continue
    # Check 2: at least one ingest-*.py exists in scripts/
    scripts_dir = os.path.join(ctx.skill_dir, 'scripts')
    has_ingester = False
    if os.path.isdir(scripts_dir):
        for f in os.listdir(scripts_dir):
            if f.startswith('ingest-') and f.endswith('.py'):
                has_ingester = True
                break
    issues = []
    if missing_prov:
        issues.append(f"{len(missing_prov)} CSV(s) missing Provenance column: {', '.join(missing_prov[:3])}")
    if not has_ingester:
        issues.append('no scripts/ingest-*.py present (rows must trace to an authoritative source)')
    if not issues:
        return CheckResult(
            id='arch_reference_db_provenance', tier='ARCHITECTURE',
            passed=True,
            message=f'Reference DB OK: {len(csv_files)} CSV(s) with Provenance + at least one ingest-*.py',
            fix_hint='',
        )
    return CheckResult(
        id='arch_reference_db_provenance', tier='ARCHITECTURE',
        passed=False, message='; '.join(issues),
        fix_hint='Add a Provenance column to every data/*.csv and write scripts/ingest-<source>.py '
                 'that walks an authoritative open-source repo / standards spec / public API. '
                 'Never LLM-generate reference rows. See correction `ingest-dont-generate-reference-db-rows` (2026-04-15).',
    )


# ─────────────────────────────────────────────
# ── RULE REGISTRY ────────────────────────────
# ─────────────────────────────────────────────

REGISTRY: list[Check] = [
    # Universal FATAL (skills, agents, pipelines — NOT commands)
    Check('fatal_name_present',          'FATAL',        ['skill', 'agent', 'pipeline'], False, check_name_present),
    Check('fatal_description_present',   'FATAL',        ['skill', 'agent', 'pipeline'], False, check_description_present),
    Check('fatal_name_format',           'FATAL',        ['skill', 'agent', 'pipeline'], False, check_name_format),
    Check('fatal_desc_third_person',     'FATAL',        ['skill', 'agent', 'pipeline'], False, check_desc_third_person),
    Check('fatal_negative_routing_desc', 'FATAL',        ['skill', 'agent', 'pipeline'], False, check_negative_routing_desc),
    Check('fatal_when_not_to_use',       'FATAL',        ['skill', 'agent', 'pipeline'], False, check_when_not_to_use),
    Check('fatal_no_hardcoded_paths',    'FATAL',        ['*'], False, check_no_hardcoded_paths),
    Check('fatal_no_platforms_field',    'FATAL',        ['skill', 'agent', 'pipeline'], True,  check_no_platforms_field),
    Check('fatal_body_line_limit',       'FATAL',        ['*'], False, check_body_line_limit),
    # Universal QUALITY
    # THEATRE → FLOOR (0%·info): structural-presence checks demoted 2026-07-17. They report
    # absence but no longer score (Goodhart rebalance — see TIER_WEIGHTS note).
    Check('quality_goal_section',        'FLOOR',        ['skill', 'pipeline'], True,  check_goal_section),
    Check('quality_common_mistakes',     'FLOOR',        ['skill', 'pipeline'], True,  check_common_mistakes),
    Check('quality_imperative_voice',    'FLOOR',        ['*'], False, check_imperative_voice),
    Check('quality_references_dir',      'FLOOR',        ['skill', 'pipeline'], False, check_references_dir),
    Check('quality_hard_gate',           'FLOOR',        ['skill', 'pipeline', 'command'], False, check_hard_gate),
    Check('quality_numbered_stages',     'FLOOR',        ['skill', 'pipeline', 'command'], False, check_numbered_stages),
    Check('quality_specific_alternatives','QUALITY',     ['*'], False, check_specific_alternatives),
    Check('quality_intra_skill_refs',    'QUALITY',      ['skill'], False, check_intra_skill_file_references),
    Check('quality_self_orchestration',  'FLOOR',        ['skill'], False, check_skill_self_orchestration),
    Check('quality_system_effect',       'FLOOR',        ['skill'], False, check_system_effect_declared),
    # Universal ARCHITECTURE
    Check('arch_scripts_dir',            'FLOOR',        ['skill', 'pipeline'], False, check_scripts_dir),
    Check('arch_shared_references',      'FLOOR',        ['skill', 'pipeline'], False, check_shared_references),
    Check('arch_body_concise',           'ARCHITECTURE', ['*'], False, check_body_concise),
    Check('arch_process_summary',        'FLOOR',        ['skill', 'pipeline', 'command'], False, check_process_summary),
    Check('arch_skill_type',             'FLOOR',        ['skill'], False, check_skill_type_classification),
    Check('arch_reference_db_provenance', 'ARCHITECTURE', ['skill'], False, check_reference_db_provenance),
    # Universal HYGIENE
    Check('hygiene_no_magic_numbers',    'HYGIENE',      ['*'], False, check_no_magic_numbers),
    Check('hygiene_uk_english',          'HYGIENE',      ['*'], True,  check_uk_english),
    Check('hygiene_bash_error_handling', 'HYGIENE',      ['*'], False, check_bash_error_handling),
    Check('hygiene_no_bare_todos',       'HYGIENE',      ['*'], False, check_no_bare_todos),
    Check('hygiene_lf_endings',          'HYGIENE',      ['*'], True,  check_lf_endings),
    # Agent-only
    Check('agent_model_valid',           'FATAL',        ['agent'], False, check_agent_model_valid),
    Check('agent_tools_present',         'FATAL',        ['agent'], False, check_agent_tools_present),
    Check('agent_tool_bloat',            'QUALITY',      ['agent'], False, check_agent_tool_bloat),
    Check('agent_phantom_skills',        'QUALITY',      ['agent'], False, check_agent_phantom_skills),
    # Structural agent scanners → FLOOR (0%·info) 2026-07-17: body-length band + "and"-clause
    # scope-creep count + numbered-step grep are proxies, not quality. The reasoning-skill-judge
    # (AGENT criteria A1-A6) is now the agent quality signal. tool_bloat + phantom_skills stay
    # scored (phantom_skills = real verify-contents-not-filename check; tool_bloat = real).
    Check('agent_body_length',           'FLOOR',        ['agent'], False, check_agent_body_length),
    Check('agent_scope_creep',           'FLOOR',        ['agent'], False, check_agent_scope_creep),
    Check('agent_methodology_dupe',      'FLOOR',        ['agent'], False, check_agent_methodology_dupe),
    # Pipeline-only
    Check('pipeline_type_frontmatter',   'FATAL',        ['pipeline'], False, check_pipeline_type_frontmatter),
    Check('pipeline_stage_defs',         'QUALITY',      ['pipeline'], False, check_pipeline_stage_defs),
    Check('pipeline_kill_gate',          'QUALITY',      ['pipeline'], False, check_pipeline_kill_gate),
    Check('pipeline_state_tracking',     'QUALITY',      ['pipeline'], False, check_pipeline_state_tracking),
]


def run_checks_for_type(ctx: ValidationContext) -> list[CheckResult]:
    """Run all applicable checks for the given artifact type."""
    results = []
    for check in REGISTRY:
        if '*' in check.artifact_types or ctx.artifact_type in check.artifact_types:
            result = check.fn(ctx)
            # REGISTRY tier is authoritative — a check function may hardcode its own
            # tier, but the registry is the single point of truth for scoring (lets the
            # lean-ruler rebalance move a check to FLOOR by editing one column here).
            result.tier = check.tier
            results.append(result)
    return results


# ─────────────────────────────────────────────
# Scoring
# ─────────────────────────────────────────────
def compute_scores(results: list[CheckResult]) -> dict:
    tier_results = {}
    for tier in TIER_WEIGHTS:
        tier_checks = [r for r in results if r.tier == tier]
        passed = sum(1 for r in tier_checks if r.passed)
        total = len(tier_checks)
        pct = (passed / total * 100) if total > 0 else 100.0
        tier_results[tier] = {'passed': passed, 'total': total, 'pct': pct}

    overall = sum(
        tier_results[t]['pct'] * w
        for t, w in TIER_WEIGHTS.items()
        if t in tier_results
    )
    return {'tiers': tier_results, 'overall': overall}


# ─────────────────────────────────────────────
# Auto-fix engine
# ─────────────────────────────────────────────
def apply_fixes(content: str, results: list[CheckResult], dry_run: bool = False, artifact_type: str = 'skill') -> tuple:
    """Apply deterministic fixes. Returns (new_content, fixes_applied)."""
    original = content
    fixes_applied = []

    # fix_crlf — strip \r
    if '\r' in content:
        content = content.replace('\r', '')
        fixes_applied.append('fix_crlf: Stripped Windows \\r (CRLF → LF)')

    # fix_platforms_field — remove platforms: line from frontmatter
    if re.search(r'^platforms:.*$', content, re.MULTILINE):
        content = re.sub(r'^platforms:.*\n?', '', content, flags=re.MULTILINE)
        fixes_applied.append('fix_platforms_field: Removed platforms: field from frontmatter')

    # fix_uk_english — replace US spellings outside code blocks
    lines = content.split('\n')
    new_lines = []
    in_code = False
    uk_fixes = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('```'):
            in_code = not in_code
            new_lines.append(line)
            continue
        if in_code:
            new_lines.append(line)
            continue
        new_line = line
        for us, uk in UK_ENGLISH_PAIRS:
            if us in CSS_PROPERTY_EXCEPTIONS:
                continue
            pattern = r'(?<![a-zA-Z_-])' + us + r'(?![a-zA-Z_-])'
            if re.search(pattern, new_line, re.I):
                def replace_fn(m, us=us, uk=uk):
                    w = m.group(0)
                    if w.isupper():
                        return uk.upper()
                    elif w[0].isupper():
                        return uk.capitalize()
                    return uk
                new_line = re.sub(pattern, replace_fn, new_line, flags=re.I)
                uk_fixes.append(f'  line {i + 1}: {us} → {uk}')
        new_lines.append(new_line)
    if uk_fixes:
        content = '\n'.join(new_lines)
        fixes_applied.append('fix_uk_english: Replaced US spellings with UK equivalents:\n' + '\n'.join(uk_fixes))

    # fix_goal_section — insert ## Goal after first heading if missing
    # (agents descoped from this check 2026-07-17 — do not inject it into agents)
    goal_missing = not re.search(r'(?im)^#+\s*Goal\b', content)
    if goal_missing and artifact_type != 'agent':
        # Insert after frontmatter + first h1
        new_content = re.sub(
            r'(^#\s+.+\n)',
            r'\1\n## Goal\n\n[One-sentence user outcome — what the user gets from this skill]\n\n',
            content,
            count=1,
            flags=re.MULTILINE
        )
        if new_content != content:
            content = new_content
            fixes_applied.append('fix_goal_section: Inserted ## Goal skeleton after first heading')

    # fix_common_mistakes — append section if missing
    # (agents descoped from this check 2026-07-17 — do not inject it into agents)
    mistakes_missing = not re.search(r'(?im)^#+\s*Common Mistakes', content)
    if mistakes_missing and artifact_type != 'agent':
        if not content.endswith('\n'):
            content += '\n'
        content += '\n## Common Mistakes\n\n| Mistake | Fix |\n|---------|-----|\n| [Common mistake] | [How to fix it] |\n'
        fixes_applied.append('fix_common_mistakes: Appended ## Common Mistakes skeleton')

    # fix_when_not — insert after ## When to Use if missing
    when_not_missing = not re.search(r'(?i)when not to use', content)
    if when_not_missing:
        when_to_use_match = re.search(r'(?im)^##\s+When to Use', content)
        if when_to_use_match:
            # Find end of this section (next ## heading or end of body)
            section_end = re.search(r'(?im)^## ', content[when_to_use_match.end():])
            if section_end:
                insert_pos = when_to_use_match.end() + section_end.start()
                insert_text = '\n**When NOT to use:**\n- [Alternative] — use `[skill-name]`\n\n'
                content = content[:insert_pos] + insert_text + content[insert_pos:]
                fixes_applied.append('fix_when_not: Inserted "When NOT to use" after ## When to Use')

    if dry_run:
        if fixes_applied:
            print('\n-- DRY RUN: The following fixes WOULD be applied --')
            for fix in fixes_applied:
                print(f'  • {fix}')
            print('\n-- Diff preview --')
            diff = list(difflib.unified_diff(
                original.splitlines(keepends=True),
                content.splitlines(keepends=True),
                fromfile='original',
                tofile='fixed',
                n=3
            ))
            print(''.join(diff[:80]))  # cap at 80 lines of diff
            if len(diff) > 80:
                print(f'  ... ({len(diff) - 80} more diff lines)')
        else:
            print('\n-- DRY RUN: No fixes needed --')
        return original, []  # don't apply

    return content, fixes_applied


# ─────────────────────────────────────────────
# Output formatters
# ─────────────────────────────────────────────
TIER_LABEL_WIDTH = 16
BAR_WIDTH = 20


def format_tier_label(tier: str) -> str:
    label_map = {
        'FATAL': 'FATAL (30%)',
        'QUALITY': 'QUALITY (40%)',
        'ARCHITECTURE': 'ARCH (20%)',
        'HYGIENE': 'HYGIENE (10%)',
        'FLOOR': 'FLOOR (0%·info)',
    }
    return label_map.get(tier, tier)


def print_report(artifact_name: str, artifact_type: str, results: list[CheckResult],
                 scores: dict, verbose: bool = False, fixes_applied: list = None) -> None:
    overall = scores['overall']
    grade = score_to_grade(overall)
    threshold = TYPE_THRESHOLDS.get(artifact_type, 90)
    passed_overall = overall >= threshold

    print()
    header = f'sgs-skillscore v{VERSION} — {artifact_name} ({artifact_type})'
    print(header)
    print('═' * len(header))
    print()

    for tier in TIER_ORDER:
        if tier not in scores['tiers']:
            continue
        t = scores['tiers'][tier]
        pct = t['pct']
        bar = progress_bar(pct, BAR_WIDTH)
        label = format_tier_label(tier).ljust(TIER_LABEL_WIDTH)
        passed_str = f"[{t['passed']}/{t['total']} passed]"
        print(f'{label} {bar} {pct:5.0f}%  {passed_str}')

    print()
    print(f'OVERALL: {overall:.0f}% ({grade}) — type: {artifact_type}, threshold: {threshold}%')
    print()

    if fixes_applied:
        print(f'Fixes applied ({len(fixes_applied)}):')
        for fix in fixes_applied:
            print(f'  ✓ {fix}')
        print()

    failures = [r for r in results if not r.passed]
    passing = [r for r in results if r.passed]

    if not failures:
        print(f'{STATUS_PASS} All checks passed')
    else:
        for result in failures:
            tier = result.tier
            sym = STATUS_FAIL if tier == 'FATAL' else STATUS_WARN
            fixable_tag = ' (--fix can repair)' if result.fixable else ''
            print(f'{sym} {tier}: {result.message}{fixable_tag}')
            if result.line_number:
                print(f'  Line {result.line_number}:', end=' ')
            if result.fix_hint:
                hint_lines = result.fix_hint.split('\n')
                if result.line_number:
                    print(hint_lines[0])
                    for hl in hint_lines[1:]:
                        print(f'  {hl}')
                else:
                    print(f'  → {hint_lines[0]}')
                    for hl in hint_lines[1:]:
                        print(f'    {hl}')

    if verbose and passing:
        print()
        print('Passed checks:')
        for result in passing:
            print(f'  {STATUS_PASS} {result.tier}: {result.message}')

    print()
    print(f'Pass: {"YES" if passed_overall else "NO"} ({overall:.0f}% {">" if passed_overall else "<"} {threshold}% threshold for {artifact_type})')
    print()
    print('Grade scale: A (95-100) | A- (90-94) | B+ (85-89) | B (80-84) | B- (75-79) | C (65-74) | D (50-64) | F (<50)')
    print()


def print_json_output(artifact_name: str, artifact_type: str, artifact_dir: str,
                      results: list[CheckResult], scores: dict) -> None:
    overall = scores['overall']
    threshold = TYPE_THRESHOLDS.get(artifact_type, 90)
    output = {
        'tool': 'sgs-skillscore',
        'version': VERSION,
        'artifact': artifact_name,
        'artifact_dir': artifact_dir,
        'artifact_type': artifact_type,
        'threshold': threshold,
        'overall_pct': round(overall, 1),
        'grade': score_to_grade(overall),
        'passed': overall >= threshold,
        'tiers': {
            tier: {
                'passed': scores['tiers'][tier]['passed'],
                'total': scores['tiers'][tier]['total'],
                'pct': round(scores['tiers'][tier]['pct'], 1),
            }
            for tier in TIER_ORDER if tier in scores['tiers']
        },
        'checks': [
            {
                'id': r.id,
                'tier': r.tier,
                'passed': r.passed,
                'message': r.message,
                'fix_hint': r.fix_hint,
                'line_number': r.line_number,
                'fixable': r.fixable,
            }
            for r in results
        ],
    }
    print(json.dumps(output, indent=2, ensure_ascii=False))


# ─────────────────────────────────────────────
# Scaffold subcommand
# ─────────────────────────────────────────────
SKILL_SCAFFOLD = '''---
name: {name}
description: >-
  This skill should be used when [describe trigger conditions].
  Triggers on [list trigger phrases].
  Do NOT invoke for: [list 2-3 alternatives with skill names].
---

# {title}

[One-sentence core principle]

## Goal

[One-sentence user outcome — what the user gets from this skill]

## When to Use

- [Trigger condition 1]
- [Trigger condition 2]

**When NOT to use:**
- [Alternative 1] — use `[skill-name]`
- [Alternative 2] — use `[skill-name]`

## Process

**Stages:** [STAGE 1] → [STAGE 2] → [STAGE 3]

### Stage 0 — [Name]

[Process description]

**Input:** [what this stage receives]
**Output:** [what it produces]

### Stage 1 — [Name]

[Process description]

**Input:** [from Stage 0]
**Output:** [final deliverable]

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| [Common mistake] | [How to fix it] |
'''

AGENT_SCAFFOLD = '''---
name: {name}
description: [One sentence — what it does and when to use it. Do NOT invoke for: [alternatives].]
tools: Read, Glob, Grep
model: sonnet
---

[One sentence: specialist identity statement]

## Before Starting

[What to read/check at session start]

## Hard Rules

- [Non-negotiable 1]
- [Non-negotiable 2]

## What You Do

[Primary tasks]

## Skill Routing

| Task | Invoke Skill |
|------|-------------|
| [task type] | `[skill-name]` |

**When NOT to use this agent:**
- [Alternative scenario] — use `[other-agent]`

## Communication

- UK English throughout
- Direct, opinionated output
'''

PIPELINE_SCAFFOLD = '''---
name: {name}
description: >-
  This pipeline should be used when [trigger].
  Orchestrates [N stages] for [goal].
  Do NOT invoke for: [alternatives].
type: pipeline
---

# {title}

[One-sentence purpose]

## Goal

[One-sentence user outcome]

## When to Use

- [Trigger 1]

**When NOT to use:**
- [Alternative] — use `[skill-name]`

## Stages

**Stages:** Stage 1 → Stage 2 → Stage 3

### Stage 1 — [Name]

**Input:** [what this stage receives]
**Process:** [what it does]
**Output:** [what it produces for next stage]
**Failure:** retry / skip / abort

### Stage 2 — [Name]

**Input:** [from Stage 1]
**Process:** [what it does]
**Output:** [what it produces]
**Failure:** retry / skip / abort

## Kill Gates

- If [condition]: abort pipeline, report [error type]

## State

Pipeline state tracked in: [location]
Partial results saved to: [location] on abort

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| [Common mistake] | [How to fix it] |
'''


def cmd_scaffold(args) -> None:
    scaffold_type = args.type.lower()
    name = args.name.lower().replace(' ', '-')
    title = ' '.join(word.capitalize() for word in name.split('-'))

    if scaffold_type == 'skill':
        content = SKILL_SCAFFOLD.format(name=name, title=title)
    elif scaffold_type == 'agent':
        content = AGENT_SCAFFOLD.format(name=name, title=title)
    elif scaffold_type == 'pipeline':
        content = PIPELINE_SCAFFOLD.format(name=name, title=title)
    else:
        print(f'ERROR: Unknown type "{scaffold_type}". Use skill, agent, or pipeline.', file=sys.stderr)
        sys.exit(1)

    print(content.strip())


def load_skill_md(skill_dir: str) -> tuple:
    """Load SKILL.md from a skill directory or a direct .md file. Returns (path, raw_content)."""
    # If path is a direct .md file, read it directly
    if os.path.isfile(skill_dir) and skill_dir.endswith('.md'):
        with open(skill_dir, 'r', encoding='utf-8') as fh:
            return skill_dir, fh.read()
    skill_md_path = os.path.join(skill_dir, 'SKILL.md')
    if not os.path.isfile(skill_md_path):
        print(f'ERROR: SKILL.md not found at {skill_md_path}', file=sys.stderr)
        sys.exit(1)
    with open(skill_md_path, 'r', encoding='utf-8') as fh:
        return skill_md_path, fh.read()


def build_context(skill_dir: str, artifact_type: str) -> ValidationContext:
    skill_dir = os.path.abspath(skill_dir.replace('\\', '/'))
    skill_md_path, raw_content = load_skill_md(skill_dir)
    # If path is a direct .md file, use its parent as the skill_dir
    if os.path.isfile(skill_dir):
        skill_dir = os.path.dirname(skill_dir)
    fm, body, body_start = parse_frontmatter(raw_content)
    return ValidationContext(
        path=skill_md_path,
        artifact_type=artifact_type,
        raw_content=raw_content,
        fm=fm,
        body=body,
        body_start=body_start,
        content_lines=raw_content.split('\n'),
        body_lines=body.split('\n'),
        skill_dir=skill_dir,
    )


def cmd_validate(args) -> None:
    skill_dir = os.path.abspath(args.path.replace('\\', '/'))

    # Accept both directories and direct .md files
    if not os.path.isdir(skill_dir) and not (os.path.isfile(skill_dir) and skill_dir.endswith('.md')):
        print(f'ERROR: Path not found: {skill_dir}', file=sys.stderr)
        sys.exit(1)

    # Load to detect type
    skill_md_path, raw_content = load_skill_md(skill_dir)
    fm, body, body_start = parse_frontmatter(raw_content)

    # Determine artifact type
    if hasattr(args, 'type') and args.type:
        artifact_type = args.type.lower()
    else:
        artifact_type = detect_artifact_type(skill_dir, raw_content, fm)

    # If path is a direct .md file, use its parent as the skill_dir
    if os.path.isfile(skill_dir):
        skill_dir = os.path.dirname(skill_dir)

    # Apply fixes before validation if requested
    fixes_applied = []
    if getattr(args, 'fix', False):
        dry_run = getattr(args, 'dry_run', False)
        new_content, fixes_applied = apply_fixes(raw_content, [], dry_run=dry_run, artifact_type=artifact_type)
        if not dry_run and new_content != raw_content:
            with open(skill_md_path, 'w', encoding='utf-8', newline='\n') as fh:
                fh.write(new_content)
            # Reload after fixes
            with open(skill_md_path, 'r', encoding='utf-8') as fh:
                raw_content = fh.read()
            fm, body, body_start = parse_frontmatter(raw_content)

    ctx = ValidationContext(
        path=skill_md_path,
        artifact_type=artifact_type,
        raw_content=raw_content,
        fm=fm,
        body=body,
        body_start=body_start,
        content_lines=raw_content.split('\n'),
        body_lines=body.split('\n'),
        skill_dir=skill_dir,
        strict_intra_refs=getattr(args, 'strict_intra_refs', False),
    )

    results = run_checks_for_type(ctx)
    scores = compute_scores(results)

    artifact_name = fm.get('name', os.path.basename(skill_dir)) or os.path.basename(skill_dir)

    if getattr(args, 'json', False):
        print_json_output(artifact_name, artifact_type, skill_dir, results, scores)
    else:
        verbose = getattr(args, 'verbose', False)
        print_report(artifact_name, artifact_type, results, scores, verbose=verbose, fixes_applied=fixes_applied)

    threshold = TYPE_THRESHOLDS.get(artifact_type, 90)
    sys.exit(0 if scores['overall'] >= threshold else 1)


# ─────────────────────────────────────────────
# CLI entry point
# ─────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(
        description=f'sgs-skillscore v{VERSION} — Rule-registry-based SGS artefact evaluator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  python sgs-skillscore.py ./path/to/skill/
  python sgs-skillscore.py validate ./path/ --type skill
  python sgs-skillscore.py validate ./path/ --fix
  python sgs-skillscore.py validate ./path/ --fix --dry-run
  python sgs-skillscore.py validate ./path/ --json
  python sgs-skillscore.py scaffold --type skill --name "my-skill"
  python sgs-skillscore.py scaffold --type agent --name "my-agent"
  python sgs-skillscore.py scaffold --type pipeline --name "my-pipeline"
  python sgs-skillscore.py ledger skill

Exit code 0 if >= threshold for type, 1 if below.
Type thresholds: skill=90%, agent=85%, pipeline=85%
        '''.strip()
    )

    subparsers = parser.add_subparsers(dest='subcommand')

    # validate subcommand
    validate_parser = subparsers.add_parser('validate', help='Validate an artefact (default subcommand)')
    validate_parser.add_argument('path', help='Path to artefact directory (must contain SKILL.md)')
    validate_parser.add_argument('--type', choices=['skill', 'agent', 'pipeline'],
                                  help='Override auto-detected artefact type')
    validate_parser.add_argument('--fix', action='store_true', help='Auto-fix deterministic issues first')
    validate_parser.add_argument('--dry-run', action='store_true', help='Preview fixes without applying (requires --fix)')
    validate_parser.add_argument('--verbose', '-v', action='store_true', help='Show all checks including passed')
    validate_parser.add_argument('--json', '-j', action='store_true', help='Output as JSON')
    validate_parser.add_argument('--strict-intra-refs', action='store_true',
                                  dest='strict_intra_refs',
                                  help='Escalate intra-skill file reference warnings to failures')

    # scaffold subcommand
    scaffold_parser = subparsers.add_parser('scaffold', help='Generate a compliant skeleton file')
    scaffold_parser.add_argument('--type', required=True, choices=['skill', 'agent', 'pipeline'],
                                  help='Artefact type to scaffold')
    scaffold_parser.add_argument('--name', required=True, help='Name for the new artefact')

    # If no subcommand given and first non-flag arg looks like a path, default to validate
    raw_argv = sys.argv[1:]
    first_positional = next((a for a in raw_argv if not a.startswith('-')), None)
    known_subcommands = {'validate', 'scaffold'}
    if first_positional and first_positional not in known_subcommands:
        # Legacy invocation: treat first arg as path for validate
        validate_args = validate_parser.parse_args(raw_argv)
        validate_args.subcommand = 'validate'
        cmd_validate(validate_args)
        return

    args = parser.parse_args()

    if args.subcommand is None:
        parser.print_help()
        sys.exit(1)
    elif args.subcommand == 'validate':
        cmd_validate(args)
    elif args.subcommand == 'scaffold':
        cmd_scaffold(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
