#!/usr/bin/env python3
"""
docscore v1.0 — Doc-type-aware scorer for project .claude/ folders.

Scores project docs (CLAUDE.md, LEDGER.md, architecture.md, specs, plans) against
doc-type templates at `<script_dir>/doc-templates/<doc-type>.md`. Mirrors the
sgs-skillscore pattern: 4 tiers with weighted scoring, per-doc-type rule
registries driven by template frontmatter, human + JSON output, grade mapping.

Tiers (weights differ from skillscore — doc scoring prioritises structure):
  Structural   40%  frontmatter + required sections + heading hierarchy + line cap
  Completeness 30%  no stubs, substantive content per section
  Quality      20%  plain English, no hedging, UK English, specific over generic
  Freshness    10%  mtime within per-doc-type threshold

Usage:
    docscore.py <path>                 # auto-detect doc type from filename
    docscore.py <path> --type claude-md
    docscore.py <folder>               # score every matching doc in a .claude/ folder
    docscore.py <path> --json
    docscore.py <path> --verbose
    docscore.py --list-types           # list known doc types

Exit code: 0 if overall >= 80, 1 otherwise.
"""
from __future__ import annotations

import argparse
import fnmatch
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

sys.stdout.reconfigure(encoding='utf-8')

VERSION = '1.0'

_NOT_APPLICABLE = 'not applicable'

SCRIPT_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = SCRIPT_DIR / 'doc-templates'

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

TIER_WEIGHTS = {
    'STRUCTURAL': 0.40,
    'COMPLETENESS': 0.30,
    'QUALITY': 0.20,
    'FRESHNESS': 0.10,
}
TIER_ORDER = ['STRUCTURAL', 'COMPLETENESS', 'QUALITY', 'FRESHNESS']

DEFAULT_THRESHOLD = 80

FILENAME_TO_TYPE = {
    'CLAUDE.md': 'claude-md',
    'architecture.md': 'architecture',
    'LEDGER.md': 'ledger',
    # Lessons live in Claude Code auto memory and decisions in the doc they change, so
    # neither has a doc-type here. Other filenames get generic scoring.
}

STUB_PATTERNS = [
    r'\bTODO\b',
    r'\bTBD\b',
    r'\bFIXME\b',
    r'\bXXX\b',
    r'\[fill[- ]in\]',
    r'\[placeholder\]',
    r'\[description\]',
    r'<description>',
    r'<todo>',
    r'lorem ipsum',
    r'\.\.\.\.\.\.',  # 6+ dots
]

HEDGING_PHRASES = [
    r'\bmaybe\b',
    r'\bpossibly\b',
    r'\bperhaps\b',
    r'\bwe could try\b',
    r'\bwe could\b',
    r'\bshould probably\b',
    r'\bmight want to\b',
    r"\bit'?s possible\b",
    r'\bsort of\b',
    r'\bkind of\b',
]

US_ENGLISH_PAIRS = [
    ('color', 'colour'),
    ('behavior', 'behaviour'),
    ('organization', 'organisation'),
    ('optimize', 'optimise'),
    ('analyze', 'analyse'),
    ('center', 'centre'),
    ('canceled', 'cancelled'),
    ('specialized', 'specialised'),
    ('realize', 'realise'),
    ('favor', 'favour'),
    ('traveling', 'travelling'),
]
CSS_PROPERTY_EXCEPTIONS = {'color', 'background-color', 'border-color'}

_FM_BOOL_MAP = {'true': True, 'false': False}
_FM_NULL_SET = {'null', 'none'}


@dataclass
class CheckResult:
    id: str
    tier: str
    passed: bool
    message: str
    fix_hint: str = ''
    line_number: Optional[int] = None
    weight: int = 1


@dataclass
class Template:
    doc_type: str
    required_sections: list
    optional_sections: list
    max_lines: Optional[int]
    freshness_days: Optional[int]
    raw_path: str
    meta: dict = field(default_factory=dict)


@dataclass
class DocContext:
    path: str
    doc_type: str
    raw_content: str
    fm: dict
    body: str
    content_lines: list
    template: Template


def score_to_grade(pct: float) -> str:
    for threshold, grade in GRADE_MAP:
        if pct >= threshold:
            return grade
    return 'F'


def progress_bar(pct: float, width: int = 20) -> str:
    filled = round(pct / 100 * width)
    empty = width - filled
    return '#' * filled + '-' * empty


def _coerce_fm_scalar(value: str):
    """Convert a raw YAML scalar string to int, bool, None, or str."""
    value_lower = value.lower()
    if value_lower in _FM_NULL_SET:
        return None
    if value_lower in _FM_BOOL_MAP:
        return _FM_BOOL_MAP[value_lower]
    if value.isdigit() or (value.startswith('-') and value[1:].isdigit()):
        return int(value)
    return value.strip('"').strip("'")


def _find_fm_end(lines: list) -> Optional[int]:
    """Return index of closing '---' line, or None if not found."""
    for i, line in enumerate(lines[1:], start=1):
        if line.strip() == '---':
            return i
    return None


def parse_frontmatter(content: str) -> tuple:
    """Return (fields_dict, body_text). Supports scalar + simple list values."""
    lines = content.split('\n')
    if not lines or lines[0].strip() != '---':
        return {}, content
    end_idx = _find_fm_end(lines)
    if end_idx is None:
        return {}, content
    body = '\n'.join(lines[end_idx + 1:])
    fields: dict = {}
    current_list: Optional[list] = None
    for line in lines[1:end_idx]:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith('- ') and current_list is not None:
            current_list.append(stripped[2:].strip().strip('"').strip("'"))
            continue
        m = re.match(r'^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)', line)
        if not m:
            continue
        key, value = m.group(1), m.group(2).strip()
        if value in ('', '[]'):
            fields[key] = []
            current_list = fields[key]
        else:
            fields[key] = _coerce_fm_scalar(value)
            current_list = None
    return fields, body


def _warn_doc_type_constraint(declared: str, reason: str) -> None:
    print(
        f'[docscore] warning: frontmatter declares doc_type: {declared} '
        f'{reason} — declaration ignored',
        file=sys.stderr,
    )


def _validate_declared_doc_type(
    declared: str,
    base: str,
    parent: str,
    grandparent: str,
) -> Optional[str]:
    """Validate a frontmatter doc_type declaration against its template constraints.

    Returns the declared type if valid, or None if the declaration should be ignored.
    """
    template_path = TEMPLATES_DIR / f'{declared}.md'
    if not template_path.is_file():
        print(
            f'[docscore] warning: frontmatter declares doc_type: {declared} '
            f'but no template at {template_path} — '
            f'falling back to filename / parent-dir routing',
            file=sys.stderr,
        )
        return None
    tpl_fm, _ = parse_frontmatter(
        template_path.read_text(encoding='utf-8', errors='ignore')
    )
    fn_glob = tpl_fm.get('filename_glob')
    req_dir = tpl_fm.get('required_dir')
    req_grand = tpl_fm.get('required_grandparent_dir')
    if fn_glob and not fnmatch.fnmatch(base, str(fn_glob)):
        _warn_doc_type_constraint(
            declared, f'but filename {base!r} does not match required glob {fn_glob!r}'
        )
        return None
    if req_dir and parent != req_dir:
        _warn_doc_type_constraint(
            declared, f'but parent dir {parent!r} != required {req_dir!r}'
        )
        return None
    if req_grand and grandparent != req_grand:
        _warn_doc_type_constraint(
            declared, f'but grandparent {grandparent!r} != required {req_grand!r}'
        )
        return None
    return declared


def _detect_doc_type_from_path(base: str, parent: str, grandparent: str) -> Optional[str]:
    """Filename/dir-based fallback after frontmatter override is exhausted."""
    if base in FILENAME_TO_TYPE:
        return FILENAME_TO_TYPE[base]
    if parent in ('specs', 'spec'):
        if base.lower() == 'readme.md':
            return 'specs-readme'
        if re.match(r'^\d{2}-.*\.md$', base):
            return 'spec'
    if parent == 'archive' and grandparent == 'plans':
        return 'archived-plan'
    return None


def detect_doc_type(path: str) -> Optional[str]:
    """Detect doc type from filename. Returns None if unknown OR out of scope.

    SCORING SCOPE (Bean directive 2026-05-24): only .claude/ + specs/ + plans/.
    Out of scope (return None): memory/, scratch/, reports/, .git/.
    """
    base = os.path.basename(path)
    parent = os.path.basename(os.path.dirname(path))
    grandparent = os.path.basename(os.path.dirname(os.path.dirname(path)))
    if parent in ('memory', 'scratch', 'reports') or grandparent == 'reports':
        return None
    try:
        with open(path, 'r', encoding='utf-8', errors='ignore') as fh:
            head = fh.read(4096)
        fm_match = re.search(r'^doc_type:\s*([a-zA-Z_-]+)\s*$', head, re.MULTILINE)
        if fm_match:
            declared = fm_match.group(1).strip()
            validated = _validate_declared_doc_type(declared, base, parent, grandparent)
            if validated is not None:
                return validated
    except (IOError, OSError):
        pass
    return _detect_doc_type_from_path(base, parent, grandparent)


def load_template(doc_type: str) -> Optional[Template]:
    template_path = TEMPLATES_DIR / f'{doc_type}.md'
    if not template_path.is_file():
        return None
    content = template_path.read_text(encoding='utf-8')
    fm, _body = parse_frontmatter(content)
    return Template(
        doc_type=fm.get('doc_type', doc_type),
        required_sections=fm.get('required_sections') or [],
        optional_sections=fm.get('optional_sections') or [],
        max_lines=fm.get('max_lines'),
        freshness_days=fm.get('freshness_days'),
        raw_path=str(template_path),
        meta=fm,
    )


def list_doc_types() -> list:
    if not TEMPLATES_DIR.is_dir():
        return []
    return sorted(p.stem for p in TEMPLATES_DIR.glob('*.md'))


def get_file_mtime_days(path: str) -> Optional[float]:
    """Prefer git log last commit date; fall back to filesystem mtime."""
    try:
        result = subprocess.run(
            ['git', 'log', '-1', '--format=%ct', '--', path],
            cwd=os.path.dirname(os.path.abspath(path)) or '.',
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            ts = int(result.stdout.strip())
            age_s = datetime.now(timezone.utc).timestamp() - ts
            return age_s / 86400
    except (subprocess.SubprocessError, ValueError, OSError):
        pass
    try:
        mtime = os.path.getmtime(path)
        age_s = datetime.now(timezone.utc).timestamp() - mtime
        return age_s / 86400
    except OSError:
        return None


def extract_headings(body: str) -> list:
    """Return list of (level, text, line_idx) for all H1-H6 headings in body.
    Ignores headings inside fenced code blocks.
    """
    out = []
    in_fence = False
    for i, line in enumerate(body.split('\n')):
        stripped = line.strip()
        if stripped.startswith('```'):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        m = re.match(r'^(#{1,6})\s+(.+?)\s*#*$', line)
        if m:
            out.append((len(m.group(1)), m.group(2).strip(), i))
    return out


def section_bodies(body: str) -> dict:
    """Slice body into sections keyed by heading text."""
    out = {}
    headings = extract_headings(body)
    lines = body.split('\n')
    for idx, (level, text, line_idx) in enumerate(headings):
        end_line = len(lines)
        for next_idx in range(idx + 1, len(headings)):
            n_level, _, n_line = headings[next_idx]
            if n_level <= level:
                end_line = n_line
                break
        out[text] = '\n'.join(lines[line_idx + 1:end_line]).strip()
    return out


def strip_code_blocks(text: str) -> str:
    """Remove fenced code blocks for text-quality checks."""
    return re.sub(r'```[\s\S]*?```', '', text)


def check_frontmatter_present(ctx: DocContext) -> CheckResult:
    """No current doc type requires frontmatter; specs are checked by their own rules."""
    return CheckResult('structural_frontmatter', 'STRUCTURAL', True,
                       'Frontmatter not required for this doc type', weight=1)

def _heading_matches(req: str, headings: set) -> bool:
    """Return True if a required section heading is present (exact or prefix match)."""
    if req in headings:
        return True
    return any(
        h.startswith(req + ' (') or h.startswith(req + ' —') or h.startswith(req + ':')
        for h in headings
    )


def check_required_sections(ctx: DocContext) -> CheckResult:
    tier = 'STRUCTURAL'
    required = ctx.template.required_sections
    if not required:
        return CheckResult('structural_required_sections', tier, True,
                           'No required sections for this doc type', weight=3)
    headings = {t for _l, t, _i in extract_headings(ctx.body)}
    missing = [s for s in required if not _heading_matches(s, headings)]
    if not missing:
        return CheckResult('structural_required_sections', tier, True,
                           f'All {len(required)} required sections present',
                           weight=3)
    return CheckResult('structural_required_sections', tier, False,
                       f'{len(missing)}/{len(required)} required sections missing: {", ".join(missing[:5])}',
                       fix_hint=f'Add headings: {", ".join(missing)}',
                       weight=3)


def check_heading_hierarchy(ctx: DocContext) -> CheckResult:
    """H1 first (unless template sets require_h1: false), no skipping levels."""
    tier = 'STRUCTURAL'
    headings = extract_headings(ctx.body)
    if not headings:
        return CheckResult('structural_heading_hierarchy', tier, False,
                           'No headings at all',
                           fix_hint='Add at least one H1 title', weight=1)
    require_h1 = ctx.template.meta.get('require_h1', True) if ctx.template else True
    first_level = headings[0][0]
    if require_h1 and first_level != 1:
        return CheckResult('structural_heading_hierarchy', tier, False,
                           f'First heading is H{first_level}, expected H1',
                           fix_hint='Start with # Title', weight=1)
    prev_level = first_level
    for level, text, line_idx in headings[1:]:
        if level > prev_level + 1:
            return CheckResult('structural_heading_hierarchy', tier, False,
                               f'Heading "{text}" at line {line_idx+1} skips from H{prev_level} to H{level}',
                               fix_hint='Do not skip heading levels', weight=1)
        prev_level = level
    return CheckResult('structural_heading_hierarchy', tier, True,
                       f'{len(headings)} headings, hierarchy clean', weight=1)


def check_max_lines(ctx: DocContext) -> CheckResult:
    tier = 'STRUCTURAL'
    cap = ctx.template.max_lines
    if cap is None:
        return CheckResult('structural_max_lines', tier, True,
                           'No line cap for this doc type', weight=1)
    n = len(ctx.content_lines)
    if n <= cap:
        return CheckResult('structural_max_lines', tier, True,
                           f'{n}/{cap} lines (under cap)', weight=1)
    return CheckResult('structural_max_lines', tier, False,
                       f'{n} lines exceeds cap of {cap}',
                       fix_hint=f'Trim to under {cap} lines — move detail to architecture.md or references/', weight=1)


def check_no_stubs(ctx: DocContext) -> CheckResult:
    tier = 'COMPLETENESS'
    body = strip_code_blocks(ctx.body)
    hits = []
    for pat in STUB_PATTERNS:
        for m in re.finditer(pat, body, re.IGNORECASE):
            line_no = body[:m.start()].count('\n') + 1
            hits.append((m.group(0), line_no))
    if not hits:
        return CheckResult('completeness_no_stubs', tier, True,
                           'No stub/placeholder markers', weight=3)
    return CheckResult('completeness_no_stubs', tier, False,
                       f'{len(hits)} stub markers: {", ".join(h[0] for h in hits[:3])}',
                       fix_hint='Replace TODO/TBD/placeholders with real content or remove', weight=3)


def check_sections_substantive(ctx: DocContext) -> CheckResult:
    """Each required section must have >= 30 chars of non-whitespace content."""
    tier = 'COMPLETENESS'
    if not ctx.template.required_sections:
        return CheckResult('completeness_sections_substantive', tier, True,
                           'No required sections', weight=2)
    bodies = section_bodies(ctx.body)
    thin = [
        heading for heading in ctx.template.required_sections
        if heading in bodies and len(strip_code_blocks(bodies[heading]).strip()) < 30
    ]
    if not thin:
        return CheckResult('completeness_sections_substantive', tier, True,
                           'All required sections have substantive content', weight=2)
    return CheckResult('completeness_sections_substantive', tier, False,
                       f'{len(thin)} thin section(s): {", ".join(thin[:3])}',
                       fix_hint='Each required section needs >= 30 chars of real content', weight=2)


def check_no_lorem(ctx: DocContext) -> CheckResult:
    tier = 'COMPLETENESS'
    body_lower = ctx.body.lower()
    if 'lorem ipsum' in body_lower or 'dolor sit amet' in body_lower:
        return CheckResult('completeness_no_lorem', tier, False,
                           'Lorem ipsum / templated filler detected',
                           fix_hint='Replace with real content', weight=1)
    return CheckResult('completeness_no_lorem', tier, True,
                       'No lorem ipsum', weight=1)


def check_no_hedging(ctx: DocContext) -> CheckResult:
    """Hedging is a fail for CLAUDE.md; warn for others."""
    tier = 'QUALITY'
    body = strip_code_blocks(ctx.body)
    hits = []
    for pat in HEDGING_PHRASES:
        for m in re.finditer(pat, body, re.IGNORECASE):
            line_no = body[:m.start()].count('\n') + 1
            hits.append((m.group(0), line_no))
    strict = ctx.doc_type == 'claude-md'
    if not hits:
        return CheckResult('quality_no_hedging', tier, True,
                           'No hedging language', weight=2)
    if strict:
        return CheckResult('quality_no_hedging', tier, False,
                           f'{len(hits)} hedging phrases: {", ".join(h[0] for h in hits[:3])}',
                           fix_hint='Hedging forbidden in decisions/rules docs — commit or remove', weight=2)
    return CheckResult('quality_no_hedging', tier, False,
                       f'{len(hits)} hedging phrases found (soft fail for this doc type)',
                       fix_hint='Consider rephrasing for clarity', weight=1)


def check_uk_english(ctx: DocContext) -> CheckResult:
    tier = 'QUALITY'
    lines = ctx.content_lines
    in_code = False
    hits = []
    for i, line in enumerate(lines):
        s = line.strip()
        if s.startswith('```'):
            in_code = not in_code
            continue
        if in_code:
            continue
        prose_only = re.sub(r'`[^`]*`', '', line)
        for us, uk in US_ENGLISH_PAIRS:
            if us in CSS_PROPERTY_EXCEPTIONS:
                continue
            pattern = r'(?<![a-zA-Z_-])' + us + r'(?![a-zA-Z_-])'
            if re.search(pattern, prose_only, re.IGNORECASE):
                hits.append((us, uk, i + 1))
                break
    if not hits:
        return CheckResult('quality_uk_english', tier, True,
                           'UK English throughout', weight=1)
    samples = [f'line {h[2]}: {h[0]} -> {h[1]}' for h in hits[:3]]
    return CheckResult('quality_uk_english', tier, False,
                       f'{len(hits)} US spellings: {"; ".join(samples)}',
                       fix_hint='Use UK English (colour, behaviour, organise, ...)', weight=1)


def check_specific_over_generic(ctx: DocContext) -> CheckResult:
    """Heuristic: at least one code-span or backtick-quoted term per N chars of body."""
    tier = 'QUALITY'
    body = strip_code_blocks(ctx.body)
    body_len = len(body)
    if body_len < 200:
        return CheckResult('quality_specific_over_generic', tier, True,
                           'Doc too short to assess', weight=1)
    inline = len(re.findall(r'`[^`\n]+`', ctx.body))
    paths = len(re.findall(r'[A-Za-z]:[\\/][^\s`]+|\./[^\s`]+|~/[^\s`]+', body))
    urls = len(re.findall(r'https?://\S+', body))
    specific = inline + paths + urls
    chars_per_ref = 1500 if ctx.doc_type in ('reference', 'archived-plan') else 800
    required = max(1, body_len // chars_per_ref)
    if specific >= required:
        return CheckResult('quality_specific_over_generic', tier, True,
                           f'{specific} concrete references ({inline} inline, {paths} paths, {urls} URLs)',
                           weight=2)
    return CheckResult('quality_specific_over_generic', tier, False,
                       f'Only {specific} concrete references for {body_len} chars of prose — too generic',
                       fix_hint='Add specific file paths, commands, names in backticks', weight=2)


def check_claude_md_verification_loop(ctx: DocContext) -> CheckResult:
    """CLAUDE.md must include a verification-loop directive."""
    tier = 'QUALITY'
    if ctx.doc_type != 'claude-md':
        return CheckResult('quality_verification_loop', tier, True,
                           'N/A for this doc type', weight=0)
    body_lower = ctx.body.lower()
    signals = ['verify', 'verification', 'how you could check', 'mention how']
    hits = sum(1 for s in signals if s in body_lower)
    if hits >= 2:
        return CheckResult('quality_verification_loop', tier, True,
                           'Verification-loop directive detected', weight=3)
    return CheckResult('quality_verification_loop', tier, False,
                       'No verification-loop directive — add rule like "Before doing any work, mention how you could verify that work"',
                       fix_hint='Add a verification rule to CLAUDE.md (Boris Cherny pattern)', weight=3)


def check_claude_md_completion_rule(ctx: DocContext) -> CheckResult:
    """CLAUDE.md must include a completion / no-stubs rule."""
    tier = 'QUALITY'
    if ctx.doc_type != 'claude-md':
        return CheckResult('quality_completion_rule', tier, True,
                           'N/A for this doc type', weight=0)
    parent = os.path.basename(os.path.dirname(ctx.path))
    if parent == '.claude':
        return CheckResult('quality_completion_rule', tier, True,
                           'manifest-mode (.claude/CLAUDE.md delegates rules to <project>/CLAUDE.md)',
                           weight=0)
    body_lower = ctx.body.lower()
    signals = ['no stubs', 'no hedging', 'finish the thing', 'name the blocker',
               'complete implementations', 'no todo']
    hits = sum(1 for s in signals if s in body_lower)
    if hits >= 1:
        return CheckResult('quality_completion_rule', tier, True,
                           'Completion / no-stubs rule present', weight=3)
    return CheckResult('quality_completion_rule', tier, False,
                       'No completion rule — add "No hedging. No stubs. Finish the thing. If you can\'t, name the blocker."',
                       fix_hint='Add completion rule to CLAUDE.md', weight=3)


def check_freshness(ctx: DocContext) -> CheckResult:
    tier = 'FRESHNESS'
    days_max = ctx.template.freshness_days
    if days_max is None:
        return CheckResult('freshness_mtime', tier, True,
                           'No freshness threshold (never stale)', weight=1)
    age = get_file_mtime_days(ctx.path)
    if age is None:
        return CheckResult('freshness_mtime', tier, False,
                           'Could not determine file age',
                           fix_hint='Check file exists and git log works', weight=1)
    if age <= days_max:
        return CheckResult('freshness_mtime', tier, True,
                           f'{age:.1f}d old, threshold {days_max}d', weight=1)
    return CheckResult('freshness_mtime', tier, False,
                       f'{age:.1f}d old, exceeds {days_max}d threshold',
                       fix_hint='Update this doc to reflect current state', weight=1)


@dataclass
class Check:
    id: str
    tier: str
    fn: callable


def _resolve_link_target(target: str, doc_dir: Path) -> Optional[Path]:
    """Resolve a relative markdown link target to an absolute path, or None to skip."""
    if target.startswith(('http://', 'https://', 'mailto:', '#')):
        return None
    target = target.split('#', 1)[0].strip()
    if not target:
        return None
    if any(p in target for p in ('FILENAME', 'EXAMPLE', '<', '>')):
        return None
    candidate = str(Path(target).expanduser()) if target.startswith('~') else target
    if Path(candidate).is_absolute():
        return Path(candidate)
    return (doc_dir / candidate).resolve()


def check_no_dead_links(ctx: DocContext) -> CheckResult:
    """U5 — every relative markdown link resolves to an existing file."""
    tier = 'STRUCTURAL'
    body = strip_code_blocks(ctx.body)
    doc_dir = Path(ctx.path).parent
    broken = []
    for m in re.finditer(r'\[([^\]]*)\]\(([^)]+)\)', body):
        resolved = _resolve_link_target(m.group(2).strip(), doc_dir)
        if resolved is not None and not resolved.exists():
            broken.append(m.group(2).strip().split('#')[0].strip())
    if broken:
        sample = ', '.join(broken[:3])
        more = f' (+{len(broken)-3} more)' if len(broken) > 3 else ''
        return CheckResult('structural_no_dead_links', tier, False,
                           f'{len(broken)} broken relative links: {sample}{more}',
                           fix_hint='Update or remove dead link refs', weight=1)
    return CheckResult('structural_no_dead_links', tier, True,
                       'all relative links resolve', weight=1)


def _registry_missing_paths(raw_content: str, project_root: Path) -> list:
    """Return list of registry path entries that do not resolve to existing files."""
    missing = []
    for line in raw_content.splitlines():
        m = re.match(r'^\s*-?\s*path:\s*(.+?)\s*$', line)
        if not m:
            continue
        rel = m.group(1).strip().strip('"').strip("'")
        if rel.startswith(('http://', 'https://')):
            continue
        if any(p in rel for p in ('FILENAME', 'EXAMPLE', '<')):
            continue
        target = Path(rel) if Path(rel).is_absolute() else (project_root / rel).resolve()
        if not target.exists():
            missing.append(rel)
    return missing


def check_registry_resolves(ctx: DocContext) -> CheckResult:
    """X1 — every .claude/docs-registry.yaml `path:` entry resolves to a file."""
    tier = 'STRUCTURAL'
    if not str(ctx.path).endswith('docs-registry.yaml'):
        return CheckResult('cross_doc_registry_resolves', tier, True,
                           'not applicable to this doc', weight=0)
    project_root = Path(ctx.path).parent.parent
    missing = _registry_missing_paths(ctx.raw_content, project_root)
    if missing:
        sample = ', '.join(missing[:3])
        more = f' (+{len(missing)-3} more)' if len(missing) > 3 else ''
        return CheckResult('cross_doc_registry_resolves', tier, False,
                           f'{len(missing)} registry paths missing: {sample}{more}',
                           fix_hint='Remove or fix dead registry entries', weight=1)
    return CheckResult('cross_doc_registry_resolves', tier, True,
                       'all registry paths resolve', weight=1)


# Docs with a hard byte cap. MEMORY.md's is the Claude Code autoload limit (past it, tail
# rules are silently truncated). LEDGER.md's is the same number by convention: it holds
# status only, is replaced not appended, and the cap keeps it that way.
SIZE_CAPS = {
    'MEMORY.md': 24576,
    'LEDGER.md': 24576,
}


def check_memory_md_size(ctx: DocContext) -> CheckResult:
    """X5 — capped docs (MEMORY.md, LEDGER.md) must stay under their byte cap."""
    tier = 'STRUCTURAL'
    name = Path(ctx.path).name
    cap = SIZE_CAPS.get(name)
    if cap is None:
        return CheckResult('cross_doc_memory_md_size', tier, True,
                           'not applicable to this doc', weight=0)
    size = Path(ctx.path).stat().st_size
    if size > cap:
        if name == 'MEMORY.md':
            consequence = 'exceeds autoload cap — tail rules silently truncated'
            fix = 'Compress entries to keyword stubs or archive older lessons'
        else:
            consequence = 'exceeds the status-doc cap'
            fix = ('Delete finished items and history (git holds it); keep each front to its state, '
                   'open blockers naming their task, and a pointer to the governing plan')
        return CheckResult('cross_doc_memory_md_size', tier, False,
                           f'{size:,} bytes {consequence} (cap {cap:,})',
                           fix_hint=fix, weight=1)
    return CheckResult('cross_doc_memory_md_size', tier, True,
                       f'{size:,} bytes / {cap:,} cap ({size/cap*100:.0f}%)', weight=1)


def _is_spec_only_check_skipped(ctx: DocContext, check_id: str) -> Optional[CheckResult]:
    """Return a skip result if this spec-only check does not apply, else None."""
    tier = 'STRUCTURAL'
    if not ctx.template or ctx.template.doc_type != 'spec':
        return CheckResult(check_id, tier, True, _NOT_APPLICABLE, weight=0)
    fm_doc_type = str(ctx.fm.get('doc_type', '')).strip().lower()
    if fm_doc_type in ('reference', 'catalogue'):
        return CheckResult(check_id, tier, True,
                           f'doc_type={fm_doc_type}; spec-only check skipped', weight=0)
    return None


def check_spec_status_canonical(ctx: DocContext) -> CheckResult:
    """S2 — `status` value must be in template's allowed_status_values."""
    tier = 'STRUCTURAL'
    skip = _is_spec_only_check_skipped(ctx, 'structural_spec_status_canonical')
    if skip is not None:
        return skip
    allowed = ctx.template.meta.get('allowed_status_values') or []
    if not allowed:
        return CheckResult('structural_spec_status_canonical', tier, True,
                           'no status enum defined', weight=0)
    status = ctx.fm.get('status')
    if status is None:
        return CheckResult('structural_spec_status_canonical', tier, False,
                           'no status field in frontmatter',
                           fix_hint=f'Add status: <one of {allowed}>', weight=1)
    raw = str(status).strip().lower().split()
    status_str = raw[0] if raw else ''
    allowed_lc = [a.lower() for a in allowed]
    display = str(status)[:60] + ('...' if len(str(status)) > 60 else '')
    if status_str in allowed_lc:
        return CheckResult('structural_spec_status_canonical', tier, True,
                           f'status: {status_str}', weight=1)
    return CheckResult('structural_spec_status_canonical', tier, False,
                       f'status "{display}" not in canonical enum {allowed}',
                       fix_hint=f'Normalise to one of {allowed}', weight=1)


def check_spec_locked_has_reason(ctx: DocContext) -> CheckResult:
    """S9 — locked specs must carry lock_reason."""
    tier = 'STRUCTURAL'
    skip = _is_spec_only_check_skipped(ctx, 'structural_spec_locked_has_reason')
    if skip is not None:
        return skip
    if not ctx.template.meta.get('require_lock_reason_when_locked'):
        return CheckResult('structural_spec_locked_has_reason', tier, True,
                           'rule not enabled', weight=0)
    raw_status = str(ctx.fm.get('status', '')).strip().lower().split()
    status = raw_status[0] if raw_status else ''
    if status != 'locked':
        return CheckResult('structural_spec_locked_has_reason', tier, True,
                           f'status is {status or "<missing>"}, lock_reason not required', weight=0)
    lock_reason = ctx.fm.get('lock_reason')
    if lock_reason and str(lock_reason).strip().lower() not in ('', 'null', 'none'):
        return CheckResult('structural_spec_locked_has_reason', tier, True,
                           'lock_reason present', weight=1)
    return CheckResult('structural_spec_locked_has_reason', tier, False,
                       'status: locked but lock_reason missing or null',
                       fix_hint='Add lock_reason: "<what triggers revision review>"', weight=1)


def check_claude_md_important_count(ctx: DocContext) -> CheckResult:
    """R6 — IMPORTANT / YOU MUST marker count <= template.max_important_markers (default 5)."""
    tier = 'STRUCTURAL'
    if not ctx.template or ctx.template.doc_type != 'claude-md':
        return CheckResult('structural_claude_md_important_count', tier, True,
                           _NOT_APPLICABLE, weight=0)
    cap = ctx.template.meta.get('max_important_markers', 5)
    body = strip_code_blocks(ctx.body)
    important = len(re.findall(r'\bIMPORTANT:|\bYOU MUST\b', body))
    if important <= cap:
        return CheckResult('structural_claude_md_important_count', tier, True,
                           f'{important} IMPORTANT markers (cap {cap})', weight=1)
    return CheckResult('structural_claude_md_important_count', tier, False,
                       f'{important} IMPORTANT markers exceed cap of {cap} (R6)',
                       fix_hint='Restrained use only — overuse dilutes the signal', weight=1)


REGISTRY: list[Check] = [
    Check('structural_frontmatter', 'STRUCTURAL', check_frontmatter_present),
    Check('structural_required_sections', 'STRUCTURAL', check_required_sections),
    Check('structural_heading_hierarchy', 'STRUCTURAL', check_heading_hierarchy),
    Check('structural_max_lines', 'STRUCTURAL', check_max_lines),
    Check('structural_no_dead_links', 'STRUCTURAL', check_no_dead_links),
    Check('cross_doc_registry_resolves', 'STRUCTURAL', check_registry_resolves),
    Check('cross_doc_memory_md_size', 'STRUCTURAL', check_memory_md_size),
    Check('structural_spec_status_canonical', 'STRUCTURAL', check_spec_status_canonical),
    Check('structural_spec_locked_has_reason', 'STRUCTURAL', check_spec_locked_has_reason),
    Check('structural_claude_md_important_count', 'STRUCTURAL', check_claude_md_important_count),
    Check('completeness_no_stubs', 'COMPLETENESS', check_no_stubs),
    Check('completeness_sections_substantive', 'COMPLETENESS', check_sections_substantive),
    Check('completeness_no_lorem', 'COMPLETENESS', check_no_lorem),
    Check('quality_no_hedging', 'QUALITY', check_no_hedging),
    Check('quality_uk_english', 'QUALITY', check_uk_english),
    Check('quality_specific_over_generic', 'QUALITY', check_specific_over_generic),
    Check('quality_verification_loop', 'QUALITY', check_claude_md_verification_loop),
    Check('quality_completion_rule', 'QUALITY', check_claude_md_completion_rule),
    Check('freshness_mtime', 'FRESHNESS', check_freshness),
]


def run_checks(ctx: DocContext) -> list:
    return [c.fn(ctx) for c in REGISTRY]


def compute_scores(results: list) -> dict:
    tier_results = {}
    for tier in TIER_WEIGHTS:
        tier_checks = [r for r in results if r.tier == tier]
        if not tier_checks:
            tier_results[tier] = {'passed_weight': 0, 'total_weight': 0, 'pct': 100.0}
            continue
        passed_weight = sum(r.weight for r in tier_checks if r.passed)
        total_weight = sum(r.weight for r in tier_checks)
        pct = (passed_weight / total_weight * 100) if total_weight else 100.0
        tier_results[tier] = {
            'passed_weight': passed_weight,
            'total_weight': total_weight,
            'pct': pct,
        }
    overall = sum(tier_results[t]['pct'] * w for t, w in TIER_WEIGHTS.items())
    return {'tiers': tier_results, 'overall': overall}


def print_report(path: str, doc_type: str, results: list, scores: dict,
                 verbose: bool = False) -> None:
    grade = score_to_grade(scores['overall'])
    bar = progress_bar(scores['overall'])
    print()
    print('=' * 72)
    print(f'docscore v{VERSION} — {path}')
    print(f'Doc type: {doc_type}')
    print('=' * 72)
    print(f'Overall: {scores["overall"]:.1f}%  [{bar}]  Grade: {grade}')
    print()
    for tier in TIER_ORDER:
        t = scores['tiers'].get(tier, {'pct': 100, 'passed_weight': 0, 'total_weight': 0})
        weight_pct = int(TIER_WEIGHTS[tier] * 100)
        tier_bar = progress_bar(t['pct'], width=15)
        print(f'  {tier:<13} ({weight_pct:>2}%): {t["pct"]:>5.1f}%  [{tier_bar}]  '
              f'{t["passed_weight"]}/{t["total_weight"]} weighted')
    print()
    failures = [r for r in results if not r.passed]
    if failures:
        print(f'Failures ({len(failures)}):')
        for r in failures:
            print(f'  [{r.tier:<12}] {r.id}: {r.message}')
            if r.fix_hint:
                print(f'    -> {r.fix_hint}')
    if verbose:
        passes = [r for r in results if r.passed]
        if passes:
            print()
            print(f'Passed ({len(passes)}):')
            for r in passes:
                print(f'  [{r.tier:<12}] {r.id}: {r.message}')
    print()


def print_json(path: str, doc_type: str, results: list, scores: dict) -> None:
    data = {
        'version': VERSION,
        'path': path,
        'doc_type': doc_type,
        'overall': round(scores['overall'], 2),
        'grade': score_to_grade(scores['overall']),
        'tiers': {
            t: {
                'weight': TIER_WEIGHTS[t],
                'pct': round(scores['tiers'][t]['pct'], 2),
                'passed_weight': scores['tiers'][t]['passed_weight'],
                'total_weight': scores['tiers'][t]['total_weight'],
            }
            for t in TIER_ORDER
        },
        'checks': [
            {
                'id': r.id,
                'tier': r.tier,
                'passed': r.passed,
                'weight': r.weight,
                'message': r.message,
                'fix_hint': r.fix_hint,
            }
            for r in results
        ],
    }
    print(json.dumps(data, indent=2, ensure_ascii=False))


def _build_doc_context(path: str, doc_type: str) -> Optional[DocContext]:
    """Load a doc file and return a DocContext, or None if template not found."""
    template = load_template(doc_type)
    if template is None:
        return None
    raw = Path(path).read_text(encoding='utf-8')
    fm, body = parse_frontmatter(raw)
    return DocContext(
        path=path,
        doc_type=doc_type,
        raw_content=raw,
        fm=fm,
        body=body,
        content_lines=raw.split('\n'),
        template=template,
    )


def score_single_file(path: str, forced_type: Optional[str] = None,
                      as_json: bool = False, verbose: bool = False) -> int:
    path = os.path.abspath(path)
    if not os.path.isfile(path):
        print(f'ERROR: file not found: {path}', file=sys.stderr)
        return 2
    doc_type = forced_type or detect_doc_type(path)
    if doc_type is None:
        print(f'ERROR: cannot detect doc type from filename {os.path.basename(path)}',
              file=sys.stderr)
        print(f'Use --type <doc-type>. Known types: {", ".join(list_doc_types())}',
              file=sys.stderr)
        return 2
    ctx = _build_doc_context(path, doc_type)
    if ctx is None:
        print(f'ERROR: template not found for doc type "{doc_type}" at {TEMPLATES_DIR}/{doc_type}.md',
              file=sys.stderr)
        return 2
    results = run_checks(ctx)
    scores = compute_scores(results)
    if as_json:
        print_json(path, doc_type, results, scores)
    else:
        print_report(path, doc_type, results, scores, verbose=verbose)
    return 0 if scores['overall'] >= DEFAULT_THRESHOLD else 1


def _classify_subproject(path: str, root: str) -> str:
    """Return the subproject slug a path belongs to, or 'root' for cross-cutting docs."""
    rel = os.path.relpath(path, root).replace('\\', '/')
    if rel.startswith('subprojects/'):
        parts = rel.split('/', 2)
        if len(parts) >= 2 and parts[1]:
            return parts[1]
    return 'root'


def _collect_scored_docs(walk_root: str) -> list:
    """Walk walk_root and return all paths where detect_doc_type is not None."""
    matches = []
    for root, _dirs, files in os.walk(walk_root):
        for f in files:
            full = os.path.join(root, f)
            if detect_doc_type(full) is not None:
                matches.append(full)
    return matches


def _score_doc_to_entry(path: str, folder: str, has_subprojects: bool) -> Optional[dict]:
    """Score a single doc and return a JSON-ready entry dict, or None if no template."""
    doc_type = detect_doc_type(path)
    ctx = _build_doc_context(path, doc_type)
    if ctx is None:
        return None
    results = run_checks(ctx)
    scores = compute_scores(results)
    entry: dict = {
        'path': path,
        'doc_type': doc_type,
        'overall': round(scores['overall'], 2),
        'grade': score_to_grade(scores['overall']),
    }
    if has_subprojects:
        entry['subproject'] = _classify_subproject(path, folder)
    return entry


def _build_subproject_summary(all_results: list) -> dict:
    """Aggregate per-subproject score stats from a list of JSON entries."""
    groups: dict = {}
    for r in all_results:
        groups.setdefault(r['subproject'], []).append(r['overall'])
    return {
        slug: {
            'doc_count': len(sl),
            'mean_score': round(sum(sl) / len(sl), 2),
            'min_score': round(min(sl), 2),
        }
        for slug, sl in groups.items()
    }


def _score_folder_json(matches: list, folder: str, has_subprojects: bool) -> int:
    """Score all matched docs and emit JSON output. Returns worst exit code."""
    all_results = []
    worst_exit = 0
    for path in sorted(matches):
        entry = _score_doc_to_entry(path, folder, has_subprojects)
        if entry is None:
            continue
        all_results.append(entry)
        if entry['overall'] < DEFAULT_THRESHOLD:
            worst_exit = 1
    out: dict = {'folder': folder, 'docs': all_results}
    if has_subprojects:
        out['by_subproject'] = _build_subproject_summary(all_results)
    print(json.dumps(out, indent=2, ensure_ascii=False))
    return worst_exit


def _group_by_subproject(matches: list, folder: str) -> dict:
    """Return {slug: [path, ...]} mapping for all matched docs."""
    groups: dict = {}
    for path in sorted(matches):
        slug = _classify_subproject(path, folder)
        groups.setdefault(slug, []).append(path)
    return groups


def _score_paths_human(paths: list, verbose: bool) -> int:
    """Score a flat list of doc paths (human output). Returns 1 if any fail, else 0."""
    worst_exit = 0
    for path in paths:
        if score_single_file(path, as_json=False, verbose=verbose) == 1:
            worst_exit = 1
    return worst_exit


def _score_folder_human_subprojects(
    matches: list, folder: str, verbose: bool
) -> int:
    """Score docs grouped by subproject (human output). Returns worst exit code."""
    groups = _group_by_subproject(matches, folder)
    order = (['root'] if 'root' in groups else []) + sorted(s for s in groups if s != 'root')
    worst_exit = 0
    for slug in order:
        label = 'cross-cutting (root)' if slug == 'root' else f'subproject: {slug}'
        print(f'\n=== {label} ===')
        if _score_paths_human(groups[slug], verbose) == 1:
            worst_exit = 1
    return worst_exit


def _score_folder_human_flat(matches: list, verbose: bool) -> int:
    """Score all matched docs in flat order (human output). Returns worst exit code."""
    return _score_paths_human(sorted(matches), verbose)


def _resolve_walk_root(folder: str, subproject: Optional[str]) -> Optional[str]:
    """Return the directory to walk, or None + print error if subproject not found."""
    if not subproject:
        return folder
    candidate = os.path.join(folder, 'subprojects', subproject)
    if not os.path.isdir(candidate):
        print(f'ERROR: subproject not found at {candidate}', file=sys.stderr)
        return None
    return candidate


def score_folder(folder: str, as_json: bool = False, verbose: bool = False,
                 subproject: Optional[str] = None) -> int:
    folder = os.path.abspath(folder)
    if not os.path.isdir(folder):
        print(f'ERROR: folder not found: {folder}', file=sys.stderr)
        return 2
    walk_root = _resolve_walk_root(folder, subproject)
    if walk_root is None:
        return 2
    matches = _collect_scored_docs(walk_root)
    if not matches:
        print(f'No matching docs found under {walk_root}', file=sys.stderr)
        return 2
    has_subprojects = (subproject is None) and os.path.isdir(
        os.path.join(folder, 'subprojects')
    )
    if as_json:
        return _score_folder_json(matches, folder, has_subprojects)
    if has_subprojects:
        return _score_folder_human_subprojects(matches, folder, verbose)
    return _score_folder_human_flat(matches, verbose)


def _build_argparser() -> argparse.ArgumentParser:
    """Construct and return the CLI argument parser."""
    parser = argparse.ArgumentParser(
        description=f'docscore v{VERSION} — doc-type-aware scorer for project .claude/ folders.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='Examples:\n'
               '  docscore.py CLAUDE.md\n'
               '  docscore.py .claude/handoff.md --verbose\n'
               '  docscore.py .claude/ --json\n'
               '  docscore.py --list-types\n',
    )
    parser.add_argument('path', nargs='?', help='File or folder to score')
    parser.add_argument('--type', help='Override detected doc type')
    parser.add_argument('--json', action='store_true', help='JSON output')
    parser.add_argument('--verbose', '-v', action='store_true', help='Show passed checks too')
    parser.add_argument('--list-types', action='store_true', help='List known doc types and exit')
    parser.add_argument('--subproject', help='When scanning a project folder, restrict to subprojects/<name>/')
    return parser


def main() -> None:
    parser = _build_argparser()
    args = parser.parse_args()

    if args.list_types:
        types = list_doc_types()
        if not types:
            print(f'No templates found at {TEMPLATES_DIR}', file=sys.stderr)
            sys.exit(1)
        for t in types:
            print(t)
        sys.exit(0)

    if not args.path:
        parser.print_help()
        sys.exit(1)

    path = args.path
    if os.path.isdir(path):
        sys.exit(score_folder(path, as_json=args.json, verbose=args.verbose,
                              subproject=args.subproject))
    sys.exit(score_single_file(path, forced_type=args.type,
                               as_json=args.json, verbose=args.verbose))


if __name__ == '__main__':
    main()
